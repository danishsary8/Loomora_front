import type { LocalDate } from '@/features/todos/types'

export const MAX_NOTE_TITLE = 120
export const MAX_NOTE_BODY = 10_000

export interface NoteFields {
  title?: string | null
  body?: string | null
  schedule_item_id?: string | null
  local_date?: LocalDate | null
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
