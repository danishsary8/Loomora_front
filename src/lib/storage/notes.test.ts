import { accountDataApi, notesApi, useSession, type ImportBody } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { GuestDatabase } from './db'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestNoteRepository } from './GuestNoteRepository'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import { isEmptyPlan, readGuestPlan, saveGuestPlan, type GuestStorage } from './saveGuestPlan'
import { ServerNoteRepository } from './ServerNoteRepository'

let db: GuestDatabase
let nowMs: number
let guest: GuestStorage
let notesRepo: GuestNoteRepository

beforeEach(() => {
  nowMs = Date.parse('2026-11-26T09:00:00.000Z')
  db = new GuestDatabase(`notes-${crypto.randomUUID()}`)
  notesRepo = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
  guest = {
    todos: new GuestTodoRepository({ db }),
    schedule: new GuestScheduleRepository({ db }),
    intentions: new GuestDailyIntentionRepository(db),
    notes: notesRepo,
  }
  useSession.getState().signIn(makeTokenResponse())
})

afterEach(() => db.delete())

describe('GuestNoteRepository (B-048 parity)', () => {
  it('creates, updates, soft-deletes, and restores standalone and attached notes', async () => {
    const block = await guest.schedule.create({
      title: 'Chemistry',
      start_time: '09:00',
      end_time: '10:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    const created = await notesRepo.create({
      id: crypto.randomUUID(),
      title: '  Lab prep  ',
      body: 'Bring goggles',
      schedule_item_id: block.id,
      local_date: '2026-11-23',
    })
    expect(created).toMatchObject({
      title: 'Lab prep',
      body: 'Bring goggles',
      schedule_item_id: block.id,
      local_date: '2026-11-23',
    })

    // Clearing schedule_item_id clears local_date automatically.
    nowMs += 60_000
    const updated = await notesRepo.update(created.id, { schedule_item_id: null })
    expect(updated.schedule_item_id).toBeNull()
    expect(updated.local_date).toBeNull()

    // Duplicate UUID returns 409.
    await expect(notesRepo.create({ id: created.id, title: 'Duplicate' })).rejects.toMatchObject({
      status: 409,
    })

    // Soft-delete hides from list/get and repeat delete preserves original deadline.
    await notesRepo.delete(created.id)
    expect(await notesRepo.list()).toEqual([])
    await expect(notesRepo.get(created.id)).rejects.toMatchObject({ status: 404 })

    nowMs += 2 * 24 * 60 * 60 * 1000
    await notesRepo.delete(created.id)
    const restored = await notesRepo.restore(created.id)
    expect(restored.id).toBe(created.id)
    expect(await notesRepo.list()).toHaveLength(1)

    // Restore after 7 days returns 410.
    await notesRepo.delete(created.id)
    nowMs += 7 * 24 * 60 * 60 * 1000
    await expect(notesRepo.restore(created.id)).rejects.toMatchObject({ status: 410 })
  })

  it('validates empty content and local_date without a schedule block', async () => {
    await expect(
      notesRepo.create({ id: crypto.randomUUID(), title: '   ', body: '' }),
    ).rejects.toMatchObject({ field: 'title' })

    await expect(
      notesRepo.create({
        id: crypto.randomUUID(),
        title: 'Has date only',
        schedule_item_id: null,
        local_date: '2026-11-23',
      }),
    ).rejects.toMatchObject({ field: 'local_date' })
  })

  it('migrates guest notes in chunks of 500, clears stale deleted block links, and retries idempotently', async () => {
    const keptBlock = await guest.schedule.create({
      title: 'Kept block',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    const removedBlock = await guest.schedule.create({
      title: 'Removed block',
      start_time: '10:00',
      end_time: '11:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    const linked = await notesRepo.create({
      id: crypto.randomUUID(),
      title: 'Linked',
      schedule_item_id: keptBlock.id,
      local_date: '2026-11-23',
    })
    const orphaned = await notesRepo.create({
      id: crypto.randomUUID(),
      title: 'Orphaned',
      schedule_item_id: removedBlock.id,
      local_date: '2026-11-23',
    })
    const deletedNote = await notesRepo.create({
      id: crypto.randomUUID(),
      title: 'Deleted',
    })
    await notesRepo.delete(deletedNote.id)
    await guest.schedule.delete(removedBlock.id)

    // Add 499 more notes so total active = 501 (2 chunks: 500 + 1).
    await db.notes.bulkAdd(
      Array.from({ length: 499 }, (_, index) => ({
        id: crypto.randomUUID(),
        title: `Extra ${index}`,
        body: null,
        schedule_item_id: null,
        local_date: null,
        created_at: '2026-11-26T08:00:00.000Z',
        updated_at: '2026-11-26T08:00:00.000Z',
      })),
    )

    expect(isEmptyPlan(await readGuestPlan(guest))).toBe(false)
    const calls: ImportBody[] = []
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        calls.push(body)
        if (calls.length === 2) {
          return HttpResponse.json({ message: 'Boom' }, { status: 500 })
        }
        return HttpResponse.json({
          data: {
            todos: { created: 0, skipped: 0 },
            schedule_items: { created: body.schedule_items.length, skipped: 0 },
            exceptions: { created: 0, skipped: 0 },
            checkins: { created: 0, skipped: 0 },
            notes: { created: body.notes?.length ?? 0, skipped: 0 },
            daily_intentions: { created: 0, skipped: 0 },
          },
        })
      }),
    )

    // Call 2 fails -> all local guest notes retained.
    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 500 })
    expect(await db.notes.count()).toBe(502)

    // Retry succeeds -> exact same chunks sent, deleted note excluded, orphaned link cleared, DB cleared.
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
    expect(calls.map((c) => c.notes?.length ?? 0)).toEqual([500, 1, 500, 1])
    expect(calls[2]).toEqual(calls[0])
    const allSent = [...(calls[2]?.notes ?? []), ...(calls[3]?.notes ?? [])]
    expect(allSent.some((n) => n.id === deletedNote.id)).toBe(false)
    expect(allSent.find((n) => n.id === linked.id)).toMatchObject({
      schedule_item_id: keptBlock.id,
      local_date: '2026-11-23',
    })
    expect(allSent.find((n) => n.id === orphaned.id)).toMatchObject({
      schedule_item_id: null,
      local_date: null,
    })
    expect(await db.notes.count()).toBe(0)
  })
})

describe('ServerNoteRepository', () => {
  it('lists paginated notes, creates, updates, deletes, and restores via API', async () => {
    const repo = new ServerNoteRepository(notesApi)
    const noteId = crypto.randomUUID()
    const note = {
      id: noteId,
      title: 'Server note',
      body: 'Details',
      schedule_item_id: null,
      local_date: null,
      created_at: '2026-11-26T09:00:00.000Z',
      updated_at: '2026-11-26T09:00:00.000Z',
    }
    server.use(
      http.get(`${API}/notes`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page')
        if (page === '1') {
          return HttpResponse.json({
            data: [note],
            links: { prev: null, next: `${API}/notes?page=2` },
            meta: { current_page: 1, per_page: 50 },
          })
        }
        return HttpResponse.json({
          data: [],
          links: { prev: `${API}/notes?page=1`, next: null },
          meta: { current_page: 2, per_page: 50 },
        })
      }),
      http.post(`${API}/notes`, () => HttpResponse.json({ data: note }, { status: 201 })),
      http.patch(`${API}/notes/${noteId}`, () =>
        HttpResponse.json({ data: { ...note, title: 'Updated' } }),
      ),
      http.delete(`${API}/notes/${noteId}`, () => new HttpResponse(null, { status: 204 })),
      http.post(`${API}/notes/${noteId}/restore`, () => HttpResponse.json({ data: note })),
    )

    expect(await repo.list()).toEqual([note])
    expect(await repo.create({ id: noteId, title: 'Server note', body: 'Details' })).toEqual(note)
    expect(await repo.update(noteId, { title: 'Updated' })).toMatchObject({ title: 'Updated' })
    await expect(repo.delete(noteId)).resolves.toBeUndefined()
    expect(await repo.restore(noteId)).toEqual(note)
  })
})
