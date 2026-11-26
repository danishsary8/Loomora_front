import type { Note, NoteFields, NoteInput, NotesPageResponse } from '@/features/notes/types'
import { normalizeTags } from '@/features/notes/tags'
import type { ApiClient } from './client'
import { ApiError } from './errors'

/** Fills B-056 fields a server without them (or an older cached response) leaves out. */
function withOrganization(note: Note): Note {
  return {
    ...note,
    pinned: note.pinned ?? false,
    color: note.color ?? null,
    tags: normalizeTags(note.tags),
  }
}

export function createNotesApi(client: ApiClient) {
  const path = '/notes'

  return {
    async list(page = 1, signal?: AbortSignal): Promise<NotesPageResponse> {
      const response = await client.request<NotesPageResponse>('GET', path, {
        query: { page: String(page) },
        signal,
      })
      return { ...response, data: response.data.map(withOrganization) }
    },
    async get(id: string): Promise<Note> {
      const { data } = await client.request<{ data: Note }>(
        'GET',
        `${path}/${encodeURIComponent(id.toLowerCase())}`,
      )
      return withOrganization(data)
    },
    async create(input: NoteInput): Promise<Note> {
      const result = await client.request<{ data: Note }>('POST', path, {
        body: input,
        // 200 is an identical replay of an active note (B-053).
        expectedStatus: [200, 201],
      })
      const data = result?.data
      if (data?.id !== input.id.toLowerCase()) {
        throw new ApiError(502, { message: 'Unexpected Note response.' })
      }
      return withOrganization(data)
    },
    async update(id: string, fields: NoteFields, expectedRevision?: number): Promise<Note> {
      const normalized = id.toLowerCase()
      const body =
        expectedRevision === undefined ? fields : { ...fields, expected_revision: expectedRevision }
      const { data } = await client.request<{ data: Note }>(
        'PATCH',
        `${path}/${encodeURIComponent(normalized)}`,
        { body },
      )
      return withOrganization(data)
    },
    async delete(id: string, expectedRevision?: number): Promise<void> {
      await client.request<undefined>('DELETE', `${path}/${encodeURIComponent(id.toLowerCase())}`, {
        query: { expected_revision: expectedRevision?.toString() },
        expectedStatus: [204],
      })
    },
    async restore(id: string): Promise<Note> {
      const normalized = id.toLowerCase()
      const result = await client.request<{ data: Note }>(
        'POST',
        `${path}/${encodeURIComponent(normalized)}/restore`,
        { expectedStatus: [200] },
      )
      const data = result?.data
      if (data?.id !== normalized) {
        throw new ApiError(502, { message: 'Unexpected Note response.' })
      }
      return withOrganization(data)
    },
  }
}

export type NotesApi = ReturnType<typeof createNotesApi>
