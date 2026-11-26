import { MAX_NOTE_TAG_LENGTH, MAX_NOTE_TAGS } from './types'

/** Same rule as the server (B-056): trim, drop a leading "#", lowercase, no blanks or duplicates. */
export function normalizeTags(tags: readonly string[] | null | undefined): string[] {
  const clean = (tags ?? []).map((tag) => tag.trim().replace(/^#+/, '').trim().toLowerCase())
  return [...new Set(clean.filter((tag) => tag.length > 0))]
}

/** Splits the comma-separated tag field into normalized tags. */
export function parseTagInput(text: string): string[] {
  return normalizeTags(text.split(','))
}

/** The field and message for the first broken tag rule, or null when the tags are valid. */
export function tagProblem(tags: readonly string[]): 'tooMany' | 'tooLong' | null {
  if (tags.length > MAX_NOTE_TAGS) return 'tooMany'
  if (tags.some((tag) => [...tag].length > MAX_NOTE_TAG_LENGTH)) return 'tooLong'
  return null
}

export function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}
