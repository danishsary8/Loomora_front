import type { CreateTodoInput, UpdateTodoInput } from '@/features/todos/types'
import { NOTES_MAX_LENGTH, PRIORITIES, TITLE_MAX_LENGTH } from '@/features/todos/types'
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

/** OpenAPI string limits count Unicode characters. */
export function notesTooLong(notes: string): boolean {
  return Array.from(notes).length > NOTES_MAX_LENGTH
}

export function checkSubtaskFields(input: UpdateTodoInput): void {
  if (input.due_date != null)
    throw new ValidationError('due_date', 'A subtask cannot have a due date.')
  if ('repeat_rule' in input && input.repeat_rule != null)
    throw new ValidationError('repeat_rule', 'A subtask cannot repeat.')
  if ('remind_at' in input && input.remind_at != null)
    throw new ValidationError('remind_at', 'A subtask cannot have a reminder.')
}

export function checkTodoFields(input: CreateTodoInput | UpdateTodoInput): void {
  if (input.priority !== undefined && !PRIORITIES.includes(input.priority))
    throw new ValidationError('priority', 'Unknown priority.')
  if (input.notes != null && (typeof input.notes !== 'string' || notesTooLong(input.notes)))
    throw new ValidationError('notes', `Notes must be at most ${NOTES_MAX_LENGTH} characters.`)
  if (input.category !== undefined && !(CATEGORIES as readonly string[]).includes(input.category))
    throw new ValidationError('category', 'Unknown category.')
  if (input.due_date !== undefined && input.due_date !== null && !isLocalDate(input.due_date))
    throw new ValidationError('due_date', 'Due date must be YYYY-MM-DD.')
}
