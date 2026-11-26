import { accountDataApi, notesApi, useSession, type ImportBody } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { acknowledgeImport } from '@/test/importBackend'
import { GuestDatabase } from './db'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
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
    focusSessions: new GuestFocusSessionRepository({ db, timeZone: 'UTC' }),
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
            focus_sessions: { created: body.focus_sessions.length, skipped: 0 },
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

  it.each([
    ['notes', undefined],
    ['notes', { created: '1', skipped: 0 }],
    ['todos', { created: 0, skipped: 0 }],
    ['notes', { created: 1, skipped: 1 }],
  ])('retains every collection when %s has invalid acknowledgment %j', async (key, value) => {
    const todo = await guest.todos.create({ title: 'Keep the task' })
    const note = await notesRepo.create({ id: crypto.randomUUID(), title: 'Keep the note' })
    server.use(
      http.post(API + '/import', async ({ request }) => {
        const body = (await request.json()) as ImportBody
        return HttpResponse.json({ data: { ...acknowledgeImport(body), [key]: value } })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 502 })
    expect(await notesRepo.get(note.id)).toEqual(note)
    expect(await guest.todos.listAll()).toContainEqual(todo)
  })

  it.each(['unchanged', 'edited', 'invalid final acknowledgment'])(
    'handles a 501-note partial import retry with %s',
    async (retry) => {
      const notes = Array.from({ length: 501 }, (_, index) => ({
        id: crypto.randomUUID(),
        title: 'Original ' + index,
        body: null,
        schedule_item_id: null,
        local_date: null,
        created_at: new Date(nowMs).toISOString(),
        updated_at: new Date(nowMs).toISOString(),
      }))
      await db.notes.bulkAdd(notes)
      const account = new Map<string, NonNullable<ImportBody['notes']>[number]>()
      let batches = 0
      server.use(
        http.post(API + '/import', async ({ request }) => {
          const body = (await request.json()) as ImportBody
          if (++batches === 2) return HttpResponse.error()
          const rows = body.notes ?? []
          let created = 0
          for (const note of rows) {
            if (account.has(note.id)) continue
            account.set(note.id, note)
            created++
          }
          return HttpResponse.json({
            data: {
              ...acknowledgeImport(body),
              notes:
                batches === 4 && retry === 'invalid final acknowledgment'
                  ? undefined
                  : { created, skipped: rows.length - created },
            },
          })
        }),
        http.get(API + '/notes', ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
          const end = page * 50
          return HttpResponse.json({
            data: [...account.values()].slice(end - 50, end),
            links: { next: end < account.size ? API + '/notes?page=' + (page + 1) : null },
          })
        }),
      )

      await expect(saveGuestPlan(guest, accountDataApi)).rejects.toBeDefined()
      expect(await db.notes.count()).toBe(501)
      const original = [...account.values()][0]
      if (!original) throw new Error('Expected the first batch to commit')
      if (retry === 'edited') {
        nowMs += 1000
        await notesRepo.update(original.id, { title: 'Edit made after the failure' })
        await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({
          name: 'GuestNoteImportConflict',
        })
        expect((await notesRepo.get(original.id)).title).toBe('Edit made after the failure')
        expect(await db.notes.count()).toBe(501)
      } else if (retry === 'invalid final acknowledgment') {
        await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 502 })
        expect(await db.notes.count()).toBe(501)
      } else {
        await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
        expect(await db.notes.count()).toBe(0)
      }
      expect(account.get(original.id)).toEqual(original)
    },
  )

  it('stops account-note verification when the session changes between pages', async () => {
    const note = await notesRepo.create({ id: crypto.randomUUID(), title: 'Keep this' })
    const generation = useSession.getState().generation
    let reads = 0
    server.use(
      http.post(API + '/import', async ({ request }) =>
        HttpResponse.json({
          data: {
            ...acknowledgeImport((await request.json()) as ImportBody),
            notes: { created: 0, skipped: 1 },
          },
        }),
      ),
      http.get(API + '/notes', () => {
        reads++
        useSession.getState().signIn(makeTokenResponse())
        return HttpResponse.json({
          data: [note],
          links: { next: API + '/notes?page=2' },
        })
      }),
    )

    await expect(
      saveGuestPlan(guest, accountDataApi, () => {
        if (useSession.getState().generation !== generation) throw new Error('Session changed')
      }),
    ).rejects.toThrow('Session changed')
    expect(reads).toBe(1)
    expect(await notesRepo.get(note.id)).toEqual(note)
  })

  it('migrates Focus sessions and Notes together in dependency order with zero data loss on retry', async () => {
    const todo = await guest.todos.create({ title: 'Study math', due_date: '2026-11-26' })
    const block = await guest.schedule.create({
      title: 'Morning focus',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    await guest.intentions.save('2026-11-26', 'Stay calm')
    const session = await guest.focusSessions.record({
      id: crypto.randomUUID(),
      mode: 'countdown',
      started_at: '2026-11-26T08:00:00.000Z',
      ended_at: '2026-11-26T08:25:00.000Z',
      end_reason: 'completed',
      planned_focus_ms: 1_500_000,
      todo_id: todo.id,
      label: 'Study math',
      segments: [
        {
          type: 'focus',
          started_at: '2026-11-26T08:00:00.000Z',
          ended_at: '2026-11-26T08:25:00.000Z',
          active_ms: 1_500_000,
        },
      ],
    })
    const linkedNote = await notesRepo.create({
      id: crypto.randomUUID(),
      title: 'Block note',
      body: 'Summary',
      schedule_item_id: block.id,
      local_date: '2026-11-23',
    })
    await db.notes.bulkAdd(
      Array.from({ length: 500 }, (_, index) => ({
        id: crypto.randomUUID(),
        title: `Batch note ${index}`,
        body: null,
        schedule_item_id: null,
        local_date: null,
        created_at: '2026-11-26T08:00:00.000Z',
        updated_at: '2026-11-26T08:00:00.000Z',
      })),
    )

    const calls: ImportBody[] = []
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        calls.push(body)
        if (calls.length === 2) {
          return HttpResponse.json({ message: 'Transient error' }, { status: 500 })
        }
        return HttpResponse.json({
          data: {
            todos: { created: body.todos.length, skipped: 0 },
            schedule_items: { created: body.schedule_items.length, skipped: 0 },
            exceptions: { created: 0, skipped: 0 },
            checkins: { created: 0, skipped: 0 },
            focus_sessions: { created: body.focus_sessions.length, skipped: 0 },
            notes: { created: body.notes?.length ?? 0, skipped: 0 },
            daily_intentions: { created: body.daily_intentions.length, skipped: 0 },
          },
        })
      }),
    )

    // Batch 2 fails -> ALL local guest records (todos, schedule, intentions, focus, notes) retained.
    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 500 })
    expect(await guest.todos.listAll()).toHaveLength(1)
    expect(await guest.schedule.listItems()).toHaveLength(1)
    expect(await guest.intentions.list()).toHaveLength(1)
    expect(await guest.focusSessions.listAll()).toHaveLength(1)
    expect(await db.notes.count()).toBe(501)

    // Retry succeeds -> exact same chunks replayed, schedule items in chunk 0, all local data cleared.
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
    expect(calls).toHaveLength(4)
    expect(calls.slice(2, 4)).toEqual(calls.slice(0, 2))
    expect(calls[2]?.schedule_items.map(({ id }) => id)).toEqual([block.id])
    expect(calls[2]?.todos.map(({ id }) => id)).toEqual([todo.id])
    expect(calls[2]?.focus_sessions.map(({ id }) => id)).toEqual([session.id])
    expect(calls[2]?.notes?.some(({ id }) => id === linkedNote.id)).toBe(true)
    expect(calls[3]?.schedule_items).toEqual([])
    expect(calls[3]?.notes).toHaveLength(1)

    expect(await guest.todos.listAll()).toEqual([])
    expect(await guest.schedule.listItems()).toEqual([])
    expect(await guest.intentions.list()).toEqual([])
    expect(await guest.focusSessions.listAll()).toEqual([])
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

  it('loads all pages beyond 500 notes without silent truncation', async () => {
    const repo = new ServerNoteRepository(notesApi)
    const total = 525
    const perPage = 50
    const allNotes = Array.from({ length: total }, (_, index) => ({
      id: crypto.randomUUID(),
      title: `Note ${index + 1}`,
      body: null,
      schedule_item_id: null,
      local_date: null,
      created_at: '2026-11-26T09:00:00.000Z',
      updated_at: '2026-11-26T09:00:00.000Z',
    }))
    const requestedPages: number[] = []

    server.use(
      http.get(`${API}/notes`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? '1')
        requestedPages.push(page)
        const start = (page - 1) * perPage
        const slice = allNotes.slice(start, start + perPage)
        const hasNext = start + perPage < total
        return HttpResponse.json({
          data: slice,
          links: {
            prev: page > 1 ? `${API}/notes?page=${page - 1}` : null,
            next: hasNext ? `${API}/notes?page=${page + 1}` : null,
          },
          meta: { current_page: page, per_page: perPage },
        })
      }),
    )

    const loaded = await repo.list()
    expect(requestedPages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(loaded).toHaveLength(total)
    expect(loaded[0]?.title).toBe('Note 1')
    expect(loaded[500]?.title).toBe('Note 501')
    expect(loaded[524]?.title).toBe('Note 525')
  })
})
