import type { Note, NoteFields, NoteInput } from '@/features/notes/types'
import { ApiError, type NotesApi } from '@/lib/api'
import { NoteConflictError, ValidationError } from './errors'
import type { NoteRepository } from './NoteRepository'

function mapValidation(error: unknown): never {
  if (error instanceof ApiError && error.status === 422) {
    const [field, messages] = Object.entries(error.fieldErrors)[0] ?? ['title', [error.message]]
    throw new ValidationError(field, messages[0] ?? error.message)
  }
  throw error
}

function isRevisionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

function sameId(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null)?.toLowerCase() === (b ?? null)?.toLowerCase()
}

/** True when the stored note already shows every field this edit set. */
function hasFields(note: Note, fields: NoteFields): boolean {
  return (
    (fields.title === undefined || note.title === fields.title) &&
    (fields.body === undefined || note.body === fields.body) &&
    (fields.schedule_item_id === undefined ||
      sameId(note.schedule_item_id, fields.schedule_item_id)) &&
    (fields.local_date === undefined || note.local_date === fields.local_date)
  )
}

export class ServerNoteRepository implements NoteRepository {
  readonly mode = 'account'

  constructor(private readonly api: NotesApi) {}

  async list(signal?: AbortSignal, beforePage?: () => void): Promise<Note[]> {
    const notes: Note[] = []
    const seenIds = new Set<string>()
    const seenNextLinks = new Set<string>()
    let page = 1
    while (true) {
      beforePage?.()
      const response = await this.api.list(page, signal)
      for (const note of response.data) {
        if (!seenIds.has(note.id)) {
          seenIds.add(note.id)
          notes.push(note)
        }
      }
      const next = response.links.next
      if (!next || response.data.length === 0 || seenNextLinks.has(next)) break
      seenNextLinks.add(next)
      page += 1
    }
    return notes
  }

  get(id: string): Promise<Note> {
    return this.api.get(id)
  }

  create(input: NoteInput): Promise<Note> {
    return this.api.create(input).catch(mapValidation)
  }

  async update(id: string, fields: NoteFields, expectedRevision?: number): Promise<Note> {
    try {
      return await this.api.update(id, fields, expectedRevision)
    } catch (error) {
      if (!isRevisionConflict(error)) return mapValidation(error)
      const latest = await this.readLatest(id)
      // A lost response to our own write also comes back as 409: matching content is success.
      if (latest && hasFields(latest, fields)) return latest
      throw new NoteConflictError(latest)
    }
  }

  async delete(id: string, expectedRevision?: number): Promise<void> {
    try {
      await this.api.delete(id, expectedRevision)
    } catch (error) {
      if (!isRevisionConflict(error)) throw error
      const latest = await this.readLatest(id)
      if (latest) throw new NoteConflictError(latest)
    }
  }

  /** The current note, or null once it is deleted or gone. */
  private async readLatest(id: string): Promise<Note | null> {
    try {
      return await this.api.get(id)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return null
      throw error
    }
  }

  restore(id: string): Promise<Note> {
    return this.api.restore(id)
  }
}
