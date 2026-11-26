import type { LocalDate } from '@/features/todos/types'
import type { Category } from '@/styles/tokens'

export const MAX_NOTE_TITLE = 120
export const MAX_NOTE_BODY = 10_000
export const MAX_NOTE_TAGS = 5
export const MAX_NOTE_TAG_LENGTH = 24

/** B-056: a note color is one of the six category pastels. */
export type NoteColor = Category

export interface NoteFields {
  title?: string | null
  body?: string | null
  schedule_item_id?: string | null
  local_date?: LocalDate | null
  pinned?: boolean
  color?: NoteColor | null
  tags?: string[] | null
}

export interface NoteInput extends NoteFields {
  id: string
}

export interface NoteImportInput extends NoteInput {
  created_at?: string | null
  updated_at?: string | null
}

export interface Note {
  id: string
  title: string | null
  body: string | null
  schedule_item_id: string | null
  local_date: LocalDate | null
  pinned: boolean
  color: NoteColor | null
  /** Normalized: lowercase, no leading "#", no duplicates (B-056). */
  tags: string[]
  /** Server-set edit counter (B-053). Guest notes have none. */
  revision?: number
  created_at: string
  updated_at: string
}

export interface NotesPageResponse {
  data: Note[]
  links: {
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    per_page: number
  }
}
