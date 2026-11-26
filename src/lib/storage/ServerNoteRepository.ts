import type { Note, NoteFields, NoteInput } from '@/features/notes/types'
import { ApiError, type NotesApi } from '@/lib/api'
import { ValidationError } from './errors'
import type { NoteRepository } from './NoteRepository'

function mapValidation(error: unknown): never {
  if (error instanceof ApiError && error.status === 422) {
    const [field, messages] = Object.entries(error.fieldErrors)[0] ?? ['title', [error.message]]
    throw new ValidationError(field, messages[0] ?? error.message)
  }
  throw error
}

export class ServerNoteRepository implements NoteRepository {
  readonly mode = 'account'

  constructor(private readonly api: NotesApi) {}

  async list(signal?: AbortSignal): Promise<Note[]> {
    const notes: Note[] = []
    let page = 1
    // Follow cursor/page links up to a reasonable safety ceiling (10 pages = 500 notes).
    while (page <= 10) {
      const response = await this.api.list(page, signal)
      notes.push(...response.data)
      if (!response.links.next) break
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

  update(id: string, fields: NoteFields): Promise<Note> {
    return this.api.update(id, fields).catch(mapValidation)
  }

  delete(id: string): Promise<void> {
    return this.api.delete(id)
  }

  restore(id: string): Promise<Note> {
    return this.api.restore(id)
  }
}
