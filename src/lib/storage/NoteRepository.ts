import type { Note, NoteFields, NoteInput } from '@/features/notes/types'

export interface NoteRepository {
  readonly mode: 'guest' | 'account'
  list(signal?: AbortSignal): Promise<Note[]>
  get(id: string): Promise<Note>
  create(input: NoteInput): Promise<Note>
  update(id: string, fields: NoteFields): Promise<Note>
  delete(id: string): Promise<void>
  restore(id: string): Promise<Note>
}
