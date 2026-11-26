import { notesApi } from '@/lib/api'
import { API, http, HttpResponse, server } from '@/test/apiMocks'
import { GuestDatabase } from './db'
import { NoteConflictError, ValidationError } from './errors'
import { GuestNoteRepository } from './GuestNoteRepository'
import { ServerNoteRepository } from './ServerNoteRepository'

describe('Note pin, color and tags (F-R4-06 / B-056)', () => {
  let db: GuestDatabase
  let nowMs: number
  let repo: GuestNoteRepository

  beforeEach(() => {
    nowMs = Date.parse('2026-11-26T09:00:00.000Z')
    db = new GuestDatabase(`organize-${crypto.randomUUID()}`)
    repo = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
  })

  afterEach(() => db.delete())

  it('defaults guest notes and fills old rows without the new fields', async () => {
    const id = crypto.randomUUID()
    await db.notes.add({
      id,
      title: 'Saved before B-056',
      body: null,
      schedule_item_id: null,
      local_date: null,
      created_at: '2026-11-20T09:00:00.000Z',
      updated_at: '2026-11-20T09:00:00.000Z',
    })
    expect(await repo.get(id)).toMatchObject({ pinned: false, color: null, tags: [] })

    const created = await repo.create({ id: crypto.randomUUID(), title: 'New' })
    expect(created).toMatchObject({ pinned: false, color: null, tags: [] })
  })

  it('normalizes tags like the server and keeps untouched fields on edit', async () => {
    const note = await repo.create({
      id: crypto.randomUUID(),
      title: 'Ideas',
      pinned: true,
      color: 'study',
      tags: [' Work ', '#work', 'Ideas', '#'],
    })
    expect(note).toMatchObject({ pinned: true, color: 'study', tags: ['work', 'ideas'] })

    const edited = await repo.update(note.id, { body: 'More' })
    expect(edited).toMatchObject({ pinned: true, color: 'study', tags: ['work', 'ideas'] })
    expect(await repo.update(note.id, { tags: [], color: null })).toMatchObject({
      tags: [],
      color: null,
    })
  })

  it('rejects more than five tags or a tag over 24 characters', async () => {
    await expect(
      repo.create({ id: crypto.randomUUID(), title: 'x', tags: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      repo.create({ id: crypto.randomUUID(), title: 'x', tags: ['a'.repeat(25)] }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('lists pinned notes first, then the most recently updated', async () => {
    await repo.create({ id: crypto.randomUUID(), title: 'old pinned', pinned: true })
    nowMs += 60_000
    await repo.create({ id: crypto.randomUUID(), title: 'newer' })
    nowMs += 60_000
    await repo.create({ id: crypto.randomUUID(), title: 'newest' })

    expect((await repo.list()).map(({ title }) => title)).toEqual(['old pinned', 'newest', 'newer'])
  })

  it('treats a lost tag edit as saved but a different remote tag edit as a conflict', async () => {
    const server = new ServerNoteRepository(notesApi)
    const id = crypto.randomUUID()
    const stored = {
      id,
      title: 'Synced',
      body: null,
      schedule_item_id: null,
      local_date: null,
      pinned: false,
      color: null,
      tags: ['work'],
      revision: 3,
      created_at: '2026-11-26T09:00:00.000Z',
      updated_at: '2026-11-26T09:00:00.000Z',
    }
    mockConflictWithLatest(id, stored)

    await expect(server.update(id, { tags: ['#Work'] }, 2)).resolves.toMatchObject({ revision: 3 })
    await expect(server.update(id, { tags: ['home'] }, 2)).rejects.toBeInstanceOf(NoteConflictError)
  })
})

function mockConflictWithLatest(id: string, latest: object) {
  server.use(
    http.patch(`${API}/notes/${id}`, () =>
      HttpResponse.json({ message: 'Stale' }, { status: 409 }),
    ),
    http.get(`${API}/notes/${id}`, () => HttpResponse.json({ data: latest })),
  )
}
