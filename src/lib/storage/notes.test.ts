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
            notes: { created: body.notes?.length ?? 0, skipped: 0, skipped_details: [] },
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

  it.each(['unchanged', 'edited', 'deleted', 'invalid final acknowledgment'])(
    'handles a 501-note partial import retry with %s using B-052 diagnostics and zero GET /notes reads',
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
      const account = new Map<
        string,
        NonNullable<ImportBody['notes']>[number] & { deleted?: boolean }
      >()
      let batches = 0
      let noteListReads = 0
      server.use(
        http.post(API + '/import', async ({ request }) => {
          const body = (await request.json()) as ImportBody
          if (++batches === 2) return HttpResponse.error()
          const rows = body.notes ?? []
          let created = 0
          const skipped_details: Array<{
            id: string
            status: 'identical' | 'different' | 'deleted'
          }> = []
          for (const note of rows) {
            const existing = account.get(note.id)
            if (existing) {
              const status = existing.deleted
                ? 'deleted'
                : existing.title === note.title &&
                    existing.body === note.body &&
                    existing.schedule_item_id === note.schedule_item_id &&
                    existing.local_date === note.local_date
                  ? 'identical'
                  : 'different'
              skipped_details.push({ id: note.id, status })
              continue
            }
            account.set(note.id, note)
            created++
          }
          return HttpResponse.json({
            data: {
              ...acknowledgeImport(body),
              notes:
                batches === 4 && retry === 'invalid final acknowledgment'
                  ? undefined
                  : { created, skipped: skipped_details.length, skipped_details },
            },
          })
        }),
        http.get(API + '/notes', () => {
          noteListReads++
          return HttpResponse.json({ data: [], links: { next: null } })
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
      } else if (retry === 'deleted') {
        account.set(original.id, { ...original, deleted: true })
        await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({
          name: 'GuestNoteImportConflict',
        })
        expect(await db.notes.count()).toBe(501)
        expect(account.get(original.id)?.deleted).toBe(true)
      } else if (retry === 'invalid final acknowledgment') {
        await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 502 })
        expect(await db.notes.count()).toBe(501)
      } else {
        await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
        expect(await db.notes.count()).toBe(0)
      }
      expect(noteListReads).toBe(0)
      expect(account.get(original.id)?.title).toBe(original.title)
    },
  )

  it('consumes B-052 identical diagnostics (case-insensitive UUIDs) without GET /notes pagination', async () => {
    const note = await notesRepo.create({ id: crypto.randomUUID(), title: 'Same note' })
    let noteListReads = 0
    server.use(
      http.post(API + '/import', async ({ request }) =>
        HttpResponse.json({
          data: {
            ...acknowledgeImport((await request.json()) as ImportBody),
            notes: {
              created: 0,
              skipped: 1,
              skipped_details: [{ id: note.id.toUpperCase(), status: 'identical' }],
            },
          },
        }),
      ),
      http.get(API + '/notes', () => {
        noteListReads++
        return HttpResponse.json({ data: [], links: { next: null } })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
    expect(noteListReads).toBe(0)
    expect(await db.notes.count()).toBe(0)
  })

  it.each([
    ['different only', ['different']],
    ['deleted only', ['deleted']],
    ['mixed identical + different', ['identical', 'different']],
    ['mixed identical + deleted', ['identical', 'deleted']],
  ] as const)(
    'raises GuestNoteImportConflict and retains all guest data for %s statuses without GET /notes or restore calls',
    async (_label, statuses) => {
      const todo = await guest.todos.create({ title: 'Keep unresolved todo' })
      const createdNotes = await Promise.all(
        statuses.map((_, index) =>
          notesRepo.create({ id: crypto.randomUUID(), title: `Guest note ${index}` }),
        ),
      )
      let noteReadsOrRestores = 0
      server.use(
        http.post(API + '/import', async ({ request }) =>
          HttpResponse.json({
            data: {
              ...acknowledgeImport((await request.json()) as ImportBody),
              notes: {
                created: 0,
                skipped: createdNotes.length,
                skipped_details: createdNotes.map((note, index) => ({
                  id: note.id,
                  status: statuses[index],
                })),
              },
            },
          }),
        ),
        http.get(API + '/notes', () => {
          noteReadsOrRestores++
          return HttpResponse.json({ data: [], links: { next: null } })
        }),
        http.post(`${API}/notes/:id/restore`, () => {
          noteReadsOrRestores++
          return HttpResponse.json({ data: createdNotes[0] })
        }),
      )

      await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({
        name: 'GuestNoteImportConflict',
      })
      expect(noteReadsOrRestores).toBe(0)
      expect(await db.notes.count()).toBe(createdNotes.length)
      expect(await guest.todos.listAll()).toContainEqual(todo)
    },
  )

  it.each([
    [
      'missing skipped_details when skipped > 0 (older backend)',
      (ids: string[]) => ({ created: 0, skipped: ids.length }),
    ],
    [
      'missing skipped_details when skipped === 0 (older backend)',
      (ids: string[]) => ({ created: ids.length, skipped: 0 }),
    ],
    [
      'non-array skipped_details',
      (ids: string[]) => ({ created: 0, skipped: ids.length, skipped_details: {} }),
    ],
    [
      'count mismatch (fewer details than skipped)',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [{ id: ids[0], status: 'identical' }],
      }),
    ],
    [
      'count mismatch (extra detail when skipped === 0)',
      (ids: string[]) => ({
        created: ids.length,
        skipped: 0,
        skipped_details: [{ id: ids[0], status: 'identical' }],
      }),
    ],
    [
      'duplicate IDs (case-insensitive)',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [
          { id: ids[0], status: 'identical' },
          { id: (ids[0] ?? '').toUpperCase(), status: 'identical' },
        ],
      }),
    ],
    [
      'foreign UUID not in submitted batch',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [
          { id: ids[0], status: 'identical' },
          { id: crypto.randomUUID(), status: 'identical' },
        ],
      }),
    ],
    [
      'invalid UUID format',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [
          { id: 'not-a-uuid', status: 'identical' },
          { id: ids[1], status: 'identical' },
        ],
      }),
    ],
    [
      'disallowed status value',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [
          { id: ids[0], status: 'identical' },
          { id: ids[1], status: 'unknown' },
        ],
      }),
    ],
    [
      'unexpected extra property on diagnostic item',
      (ids: string[]) => ({
        created: 0,
        skipped: ids.length,
        skipped_details: [
          { id: ids[0], status: 'identical', extra: true },
          { id: ids[1], status: 'identical' },
        ],
      }),
    ],
  ])(
    'fails closed (502) and retains guest data when diagnostics are %s',
    async (_label, buildNotes) => {
      const todo = await guest.todos.create({ title: 'Retain todo' })
      const noteA = await notesRepo.create({ id: crypto.randomUUID(), title: 'Note A' })
      const noteB = await notesRepo.create({ id: crypto.randomUUID(), title: 'Note B' })
      server.use(
        http.post(API + '/import', async ({ request }) =>
          HttpResponse.json({
            data: {
              ...acknowledgeImport((await request.json()) as ImportBody),
              notes: buildNotes([noteA.id, noteB.id]),
            },
          }),
        ),
      )

      await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 502 })
      expect(await notesRepo.get(noteA.id)).toEqual(noteA)
      expect(await notesRepo.get(noteB.id)).toEqual(noteB)
      expect(await guest.todos.listAll()).toContainEqual(todo)
    },
  )

  it('stops multi-chunk import when the session changes between batches and retains guest notes', async () => {
    const notes = Array.from({ length: 501 }, (_, index) => ({
      id: crypto.randomUUID(),
      title: `Session note ${index}`,
      body: null,
      schedule_item_id: null,
      local_date: null,
      created_at: new Date(nowMs).toISOString(),
      updated_at: new Date(nowMs).toISOString(),
    }))
    await db.notes.bulkAdd(notes)
    const generation = useSession.getState().generation
    let batches = 0
    server.use(
      http.post(API + '/import', async ({ request }) => {
        batches++
        const body = (await request.json()) as ImportBody
        useSession.getState().signIn(makeTokenResponse())
        return HttpResponse.json({ data: acknowledgeImport(body) })
      }),
    )

    await expect(
      saveGuestPlan(guest, accountDataApi, () => {
        if (useSession.getState().generation !== generation) throw new Error('Session changed')
      }),
    ).rejects.toThrow('Session changed')
    expect(batches).toBe(1)
    expect(await db.notes.count()).toBe(501)
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
            notes: { created: body.notes?.length ?? 0, skipped: 0, skipped_details: [] },
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

describe('GuestNoteRepository concurrency (QA-028)', () => {
  it('never resurrects a deleted note when update and delete race across two instances (both orders)', async () => {
    const sharedDbB = new GuestDatabase(db.name)
    const tabA = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
    const tabB = new GuestNoteRepository({ db: sharedDbB, now: () => new Date(nowMs + 1000) })

    try {
      // Order 1: update starts first, delete runs concurrently.
      const note1 = await tabA.create({
        id: crypto.randomUUID(),
        title: 'Original 1',
        body: 'Body 1',
      })
      const [update1, delete1] = await Promise.allSettled([
        tabA.update(note1.id, { title: 'Updated 1' }),
        tabB.delete(note1.id),
      ])

      expect(delete1.status).toBe('fulfilled')
      if (update1.status === 'rejected') {
        expect(update1.reason).toMatchObject({ status: 404 })
      }
      // Regardless of transaction order, the deleted note must NEVER remain active.
      expect(await tabA.list()).toEqual([])
      expect(await tabB.list()).toEqual([])
      await expect(tabA.get(note1.id)).rejects.toMatchObject({ status: 404 })
      const stored1 = await db.notes.get(note1.id)
      expect(stored1?.deleted_at).toBeTruthy()
      if (update1.status === 'fulfilled') {
        // Update serialized before delete -> delete preserved updated title.
        expect(stored1?.title).toBe('Updated 1')
      }

      // Order 2: delete starts first, update runs concurrently.
      const note2 = await tabA.create({
        id: crypto.randomUUID(),
        title: 'Original 2',
        body: 'Body 2',
      })
      const [delete2, update2] = await Promise.allSettled([
        tabB.delete(note2.id),
        tabA.update(note2.id, { title: 'Stale edit 2' }),
      ])

      expect(delete2.status).toBe('fulfilled')
      if (update2.status === 'rejected') {
        expect(update2.reason).toMatchObject({ status: 404 })
      }
      expect(await tabA.list()).toEqual([])
      await expect(tabB.get(note2.id)).rejects.toMatchObject({ status: 404 })
      const stored2 = await db.notes.get(note2.id)
      expect(stored2?.deleted_at).toBeTruthy()
    } finally {
      sharedDbB.close()
    }
  })

  it('keeps schedule-attached update and delete atomic so schedule lookup cannot open a resurrection window', async () => {
    const sharedDbB = new GuestDatabase(db.name)
    const tabA = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
    const tabB = new GuestNoteRepository({ db: sharedDbB, now: () => new Date(nowMs + 1000) })

    try {
      const block = await guest.schedule.create({
        title: 'Physics',
        start_time: '09:00',
        end_time: '10:00',
        days: [0],
        starts_on: '2026-11-01',
      })
      const note = await tabA.create({
        id: crypto.randomUUID(),
        title: 'Lab notes',
        body: 'Initial',
      })

      const [updateRes, deleteRes] = await Promise.allSettled([
        tabA.update(note.id, { schedule_item_id: block.id, local_date: '2026-11-26' }),
        tabB.delete(note.id),
      ])

      expect(deleteRes.status).toBe('fulfilled')
      if (updateRes.status === 'rejected') {
        expect(updateRes.reason).toMatchObject({ status: 404 })
      }
      expect(await tabA.list()).toEqual([])
      const stored = await db.notes.get(note.id)
      expect(stored?.deleted_at).toBeTruthy()
    } finally {
      sharedDbB.close()
    }
  })

  it('serializes concurrent update and restore on a deleted note in both orders', async () => {
    const sharedDbB = new GuestDatabase(db.name)
    const tabA = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
    const tabB = new GuestNoteRepository({ db: sharedDbB, now: () => new Date(nowMs + 1000) })

    try {
      // Order 1: update starts first, restore runs concurrently on a deleted note.
      const note1 = await tabA.create({ id: crypto.randomUUID(), title: 'Deleted 1' })
      await tabA.delete(note1.id)

      const [update1, restore1] = await Promise.allSettled([
        tabA.update(note1.id, { title: 'Edited 1' }),
        tabB.restore(note1.id),
      ])

      expect(restore1.status).toBe('fulfilled')
      const final1 = await tabA.get(note1.id)
      if (update1.status === 'rejected') {
        expect(update1.reason).toMatchObject({ status: 404 })
        expect(final1.title).toBe('Deleted 1')
      } else {
        expect(final1.title).toBe('Edited 1')
      }

      // Order 2: restore starts first, update runs concurrently.
      const note2 = await tabA.create({ id: crypto.randomUUID(), title: 'Deleted 2' })
      await tabA.delete(note2.id)

      const [restore2, update2] = await Promise.allSettled([
        tabB.restore(note2.id),
        tabA.update(note2.id, { title: 'Edited 2' }),
      ])

      expect(restore2.status).toBe('fulfilled')
      const final2 = await tabA.get(note2.id)
      if (update2.status === 'fulfilled') {
        expect(final2.title).toBe('Edited 2')
      } else {
        expect(update2.reason).toMatchObject({ status: 404 })
        expect(final2.title).toBe('Deleted 2')
      }
    } finally {
      sharedDbB.close()
    }
  })

  it('preserves disjoint field edits from two concurrent updates without lost updates', async () => {
    const sharedDbB = new GuestDatabase(db.name)
    const tabA = new GuestNoteRepository({ db, now: () => new Date(nowMs) })
    const tabB = new GuestNoteRepository({ db: sharedDbB, now: () => new Date(nowMs + 1000) })

    try {
      const note = await tabA.create({
        id: crypto.randomUUID(),
        title: 'Initial title',
        body: 'Initial body',
      })

      await Promise.all([
        tabA.update(note.id, { title: 'Updated title' }),
        tabB.update(note.id, { body: 'Updated body' }),
      ])

      const final = await tabA.get(note.id)
      expect(final.title).toBe('Updated title')
      expect(final.body).toBe('Updated body')
    } finally {
      sharedDbB.close()
    }
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
      pinned: false,
      color: null,
      tags: [],
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
