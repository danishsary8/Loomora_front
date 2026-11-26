import type { Note } from '@/features/notes/types'

/** A write was rejected by the docs/08 rule 11 limits. `field` matches the API error shape. */
export class ValidationError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class GuestNoteImportConflict extends Error {
  constructor() {
    super('An existing account note could not be matched to its guest copy.')
    this.name = 'GuestNoteImportConflict'
  }
}

/** An account note changed on another device since it was loaded (B-053 revision 409). */
export class NoteConflictError extends Error {
  readonly latest: Note | null

  constructor(latest: Note | null) {
    super('This note changed since it was loaded.')
    this.name = 'NoteConflictError'
    this.latest = latest
  }
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} ${id} not found`)
    this.name = 'NotFoundError'
  }
}
