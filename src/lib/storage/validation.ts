import type { CreateTodoInput, UpdateTodoInput } from '@/features/todos/types'
import { TITLE_MAX_LENGTH } from '@/features/todos/types'
import { isLocalDate } from '@/lib/date'
import { CATEGORIES } from '@/styles/tokens'
import { ValidationError } from './errors'

/** Trim and check a title: 1 to 200 characters (docs/08 rule 11). */
export function cleanTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length === 0) throw new ValidationError('title', 'Title is required.')
  if (trimmed.length > TITLE_MAX_LENGTH)
    throw new ValidationError('title', `Title must be at most ${TITLE_MAX_LENGTH} characters.`)
  return trimmed
}

export function checkTodoFields(input: CreateTodoInput | UpdateTodoInput): void {
  if (input.category !== undefined && !(CATEGORIES as readonly string[]).includes(input.category))
    throw new ValidationError('category', 'Unknown category.')
  if (input.due_date !== undefined && input.due_date !== null && !isLocalDate(input.due_date))
    throw new ValidationError('due_date', 'Due date must be YYYY-MM-DD.')
}
