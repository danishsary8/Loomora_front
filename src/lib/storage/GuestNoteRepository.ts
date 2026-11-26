import {
  MAX_NOTE_BODY,
  MAX_NOTE_TITLE,
  type Note,
  type NoteFields,
  type NoteInput,
} from '@/features/notes/types'
import { ApiError } from '@/lib/api/errors'
import { isLocalDate } from '@/lib/date'
import type { GuestDatabase, StoredNote } from './db'
import { ValidationError } from './errors'
import type { NoteRepository } from './NoteRepository'
import { openGuestDatabase } from './openGuestDatabase'

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const UUID_PATTERN = /^(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i

interface Options {
  db?: GuestDatabase
  now?: () => Date
}

function toPublicNote(row: StoredNote): Note {
  const { deleted_at: _deletedAt, ...note } = row
  void _deletedAt
  return note
}

function cleanText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validateNoteState(state: {
  title: string | null
  body: string | null
  schedule_item_id: string | null
  local_date: string | null
}): void {
  if (state.title !== null && [...state.title].length > MAX_NOTE_TITLE) {
    throw new ValidationError('title', `Title must be at most ${MAX_NOTE_TITLE} characters.`)
  }
  if (state.body !== null && [...state.body].length > MAX_NOTE_BODY) {
    throw new ValidationError('body', `Body must be at most ${MAX_NOTE_BODY} characters.`)
  }
  if (state.title === null && state.body === null) {
    throw new ValidationError('title', 'Enter a title or note body.')
  }
  if (state.schedule_item_id !== null && !UUID_PATTERN.test(state.schedule_item_id)) {
    throw new ValidationError('schedule_item_id', 'Use a valid schedule block.')
  }
  if (state.local_date !== null) {
    if (!state.schedule_item_id) {
      throw new ValidationError('local_date', 'Select a schedule block to attach a date.')
    }
    if (!isLocalDate(state.local_date)) {
      throw new ValidationError('local_date', 'Use a valid calendar date.')
    }
  }
}

function sortNewestFirst(a: Note, b: Note): number {
  return b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id)
}

export class GuestNoteRepository implements NoteRepository {
  readonly mode = 'guest'

  constructor(private readonly options: Options = {}) {}

  private open() {
    return this.options.db ?? openGuestDatabase()
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }

  async list(): Promise<Note[]> {
    const rows = await (await this.open()).notes.toArray()
    return rows
      .filter((row) => !row.deleted_at)
      .map(toPublicNote)
      .sort(sortNewestFirst)
  }

  async listAll({ includeDeleted = false } = {}): Promise<StoredNote[]> {
    const rows = await (await this.open()).notes.toArray()
    const filtered = includeDeleted ? rows : rows.filter((row) => !row.deleted_at)
    return filtered.sort(sortNewestFirst)
  }

  /** Clean up the import snapshot without discarding changes made concurrently. */
  async clearImported(snapshot: StoredNote[]): Promise<void> {
    if (snapshot.length === 0) return
    const db = await this.open()
    await db.transaction('rw', db.notes, async () => {
      const current = await db.notes.toArray()
      const beforeById = new Map(snapshot.map((row) => [row.id, row]))
      const remove = current
        .filter((row) => JSON.stringify(row) === JSON.stringify(beforeById.get(row.id)))
        .map(({ id }) => id)
      await db.notes.bulkDelete(remove)
    })
  }

  async get(id: string): Promise<Note> {
    const row = await (await this.open()).notes.get(id.toLowerCase())
    if (!row || row.deleted_at) throw new ApiError(404)
    return toPublicNote(row)
  }

  async create(input: NoteInput): Promise<Note> {
    if (!UUID_PATTERN.test(input.id)) {
      throw new ValidationError('id', 'Use a UUID.')
    }
    const id = input.id.toLowerCase()
    const title = cleanText(input.title)
    const body = cleanText(input.body)
    const schedule_item_id = input.schedule_item_id ? input.schedule_item_id.toLowerCase() : null
    const local_date = input.local_date ?? null
    validateNoteState({ title, body, schedule_item_id, local_date })

    const db = await this.open()
    if (schedule_item_id) {
      const block = await db.schedule_items.get(schedule_item_id)
      if (!block) throw new ValidationError('schedule_item_id', 'Schedule block not found.')
    }

    const stamp = this.now().toISOString()
    const note: Note = {
      id,
      title,
      body,
      schedule_item_id,
      local_date,
      created_at: stamp,
      updated_at: stamp,
    }
    let conflict = false
    await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(id)
      if (existing) {
        conflict = true
        return
      }
      await db.notes.add(note)
    })
    if (conflict) throw new ApiError(409, { message: 'Note UUID already exists.' })
    return note
  }

  async update(id: string, fields: NoteFields): Promise<Note> {
    const key = id.toLowerCase()
    const db = await this.open()
    const existing = await db.notes.get(key)
    if (!existing || existing.deleted_at) throw new ApiError(404)

    const title = fields.title !== undefined ? cleanText(fields.title) : existing.title
    const body = fields.body !== undefined ? cleanText(fields.body) : existing.body
    const scheduleChanged = fields.schedule_item_id !== undefined
    const schedule_item_id = scheduleChanged
      ? fields.schedule_item_id
        ? fields.schedule_item_id.toLowerCase()
        : null
      : existing.schedule_item_id

    // Per B-048: a changed or cleared block clears an omitted occurrence date.
    let local_date =
      fields.local_date !== undefined
        ? fields.local_date
        : scheduleChanged && schedule_item_id !== existing.schedule_item_id
          ? null
          : existing.local_date
    if (schedule_item_id === null && fields.local_date === undefined) {
      local_date = null
    }

    validateNoteState({ title, body, schedule_item_id, local_date })
    if (schedule_item_id && schedule_item_id !== existing.schedule_item_id) {
      const block = await db.schedule_items.get(schedule_item_id)
      if (!block) throw new ValidationError('schedule_item_id', 'Schedule block not found.')
    }

    const updated: Note = {
      ...toPublicNote(existing),
      title,
      body,
      schedule_item_id,
      local_date,
      updated_at: this.now().toISOString(),
    }
    await db.notes.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const key = id.toLowerCase()
    const db = await this.open()
    await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(key)
      if (!existing) throw new ApiError(404)
      if (existing.deleted_at) return
      await db.notes.put({ ...existing, deleted_at: this.now().toISOString() })
    })
  }

  async restore(id: string): Promise<Note> {
    const key = id.toLowerCase()
    const db = await this.open()
    const restored = await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(key)
      if (!existing) throw new ApiError(404)
      if (!existing.deleted_at) return existing
      const deletedMs = Date.parse(existing.deleted_at)
      if (!Number.isFinite(deletedMs) || this.now().getTime() - deletedMs >= RESTORE_WINDOW_MS) {
        throw new ApiError(410, { message: 'The undo window has expired.' })
      }
      const active = toPublicNote(existing)
      await db.notes.put(active)
      return active
    })
    return toPublicNote(restored)
  }
}
