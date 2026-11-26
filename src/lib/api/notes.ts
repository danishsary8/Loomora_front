import type { Note, NoteFields, NoteInput, NotesPageResponse } from '@/features/notes/types'
import type { ApiClient } from './client'
import { ApiError } from './errors'

export function createNotesApi(client: ApiClient) {
  const path = '/notes'

  return {
    list(page = 1, signal?: AbortSignal): Promise<NotesPageResponse> {
      return client.request<NotesPageResponse>('GET', path, {
        query: { page: String(page) },
        signal,
      })
    },
    async get(id: string): Promise<Note> {
      const { data } = await client.request<{ data: Note }>(
        'GET',
        `${path}/${encodeURIComponent(id.toLowerCase())}`,
      )
      return data
    },
    async create(input: NoteInput): Promise<Note> {
      const result = await client.request<{ data: Note }>('POST', path, {
        body: input,
        expectedStatus: [201],
      })
      const data = result?.data
      if (data?.id !== input.id.toLowerCase()) {
        throw new ApiError(502, { message: 'Unexpected Note response.' })
      }
      return data
    },
    async update(id: string, fields: NoteFields): Promise<Note> {
      const normalized = id.toLowerCase()
      const { data } = await client.request<{ data: Note }>(
        'PATCH',
        `${path}/${encodeURIComponent(normalized)}`,
        { body: fields },
      )
      return data
    },
    async delete(id: string): Promise<void> {
      await client.request<undefined>('DELETE', `${path}/${encodeURIComponent(id.toLowerCase())}`, {
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
      return data
    },
  }
}

export type NotesApi = ReturnType<typeof createNotesApi>
