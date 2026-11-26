import { notesApi } from '@/lib/api'
import { API, http, HttpResponse, server } from '@/test/apiMocks'
import { NoteConflictError } from './errors'
import { ServerNoteRepository } from './ServerNoteRepository'

const noteId = crypto.randomUUID()
const stored = {
  id: noteId,
  title: 'Server note',
  body: 'Details',
  schedule_item_id: null,
  local_date: null,
  pinned: false,
  color: null,
  tags: [],
  revision: 4,
  created_at: '2026-11-26T09:00:00.000Z',
  updated_at: '2026-11-26T09:00:00.000Z',
}
const stale = () =>
  HttpResponse.json(
    { message: 'This note changed since you loaded it. Reload it and try again.' },
    { status: 409 },
  )

function serveLatest(latest: typeof stored | null) {
  server.use(
    http.get(`${API}/notes/${noteId}`, () =>
      latest ? HttpResponse.json({ data: latest }) : HttpResponse.json({}, { status: 404 }),
    ),
  )
}

describe('ServerNoteRepository revisions (F-R4-05 / B-053)', () => {
  const repo = new ServerNoteRepository(notesApi)

  it('sends expected_revision on edit and delete', async () => {
    let patchBody: unknown
    let deleteQuery: string | null = null
    server.use(
      http.patch(`${API}/notes/${noteId}`, async ({ request }) => {
        patchBody = await request.json()
        return HttpResponse.json({ data: { ...stored, title: 'Edited', revision: 5 } })
      }),
      http.delete(`${API}/notes/${noteId}`, ({ request }) => {
        deleteQuery = new URL(request.url).searchParams.get('expected_revision')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(repo.update(noteId, { title: 'Edited' }, 4)).resolves.toMatchObject({
      revision: 5,
    })
    expect(patchBody).toEqual({ title: 'Edited', expected_revision: 4 })
    await repo.delete(noteId, 5)
    expect(deleteQuery).toBe('5')
  })

  it('omits expected_revision when the note has no revision', async () => {
    let patchBody: unknown
    let hasQuery = true
    server.use(
      http.patch(`${API}/notes/${noteId}`, async ({ request }) => {
        patchBody = await request.json()
        return HttpResponse.json({ data: stored })
      }),
      http.delete(`${API}/notes/${noteId}`, ({ request }) => {
        hasQuery = new URL(request.url).searchParams.has('expected_revision')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await repo.update(noteId, { title: 'Server note' })
    expect(patchBody).toEqual({ title: 'Server note' })
    await repo.delete(noteId)
    expect(hasQuery).toBe(false)
  })

  it('treats a stale 409 as success when the stored note already matches the edit', async () => {
    server.use(http.patch(`${API}/notes/${noteId}`, stale))
    serveLatest({ ...stored, title: 'Edited', revision: 5 })

    await expect(repo.update(noteId, { title: 'Edited' }, 4)).resolves.toMatchObject({
      title: 'Edited',
      revision: 5,
    })
  })

  it('raises NoteConflictError with the latest note when another edit won', async () => {
    const latest = { ...stored, body: 'Changed elsewhere', revision: 5 }
    server.use(http.patch(`${API}/notes/${noteId}`, stale))
    serveLatest(latest)

    const error = await repo.update(noteId, { body: 'Mine' }, 4).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NoteConflictError)
    expect((error as NoteConflictError).latest).toEqual(latest)
  })

  it('raises NoteConflictError without a note when it was deleted elsewhere', async () => {
    server.use(http.patch(`${API}/notes/${noteId}`, stale))
    serveLatest(null)

    const error = await repo.update(noteId, { body: 'Mine' }, 4).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NoteConflictError)
    expect((error as NoteConflictError).latest).toBeNull()
  })

  it('refuses a stale delete but accepts one whose note is already gone', async () => {
    server.use(http.delete(`${API}/notes/${noteId}`, stale))
    serveLatest({ ...stored, revision: 5 })
    await expect(repo.delete(noteId, 4)).rejects.toBeInstanceOf(NoteConflictError)

    serveLatest(null)
    await expect(repo.delete(noteId, 4)).resolves.toBeUndefined()
  })

  it('accepts 200 for an identical create replay', async () => {
    server.use(http.post(`${API}/notes`, () => HttpResponse.json({ data: stored })))

    await expect(
      repo.create({ id: noteId, title: 'Server note', body: 'Details' }),
    ).resolves.toEqual(stored)
  })
})
