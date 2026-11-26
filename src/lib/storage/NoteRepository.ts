import type { Note, NoteFields, NoteInput } from '@/features/notes/types'

export interface NoteRepository {
  readonly mode: 'guest' | 'account'
  list(signal?: AbortSignal): Promise<Note[]>
  get(id: string): Promise<Note>
  create(input: NoteInput): Promise<Note>
  /** `expectedRevision` guards account notes against stale writes; guest notes ignore it. */
  update(id: string, fields: NoteFields, expectedRevision?: number): Promise<Note>
  delete(id: string, expectedRevision?: number): Promise<void>
  restore(id: string): Promise<Note>
}
