import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { GuestScheduleRepository } from '@/lib/storage'
import { GuestNoteRepository } from '@/lib/storage/GuestNoteRepository'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

describe('NotesPage (F-R4-02)', () => {
  it('supports guest create, edit, schedule attachment, deleted parent badge, and delete + undo', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    const notesRepo = new GuestNoteRepository({ db })
    const block = await schedule.create({
      title: 'Biology',
      start_time: '09:00',
      end_time: '10:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    const removedBlock = await schedule.create({
      title: 'Old seminar',
      start_time: '11:00',
      end_time: '12:00',
      days: [0],
      starts_on: '2026-11-01',
    })
    await notesRepo.create({
      id: crypto.randomUUID(),
      title: 'Orphaned note',
      body: 'Kept even after block deletion',
      schedule_item_id: removedBlock.id,
      local_date: '2026-11-23',
    })
    await schedule.delete(removedBlock.id)

    renderRoute('/notes', repo, schedule, db)

    expect(await screen.findByText('Orphaned note')).toBeInTheDocument()
    expect(screen.getByText('Schedule block removed · Nov 23')).toBeInTheDocument()

    // Create an attached note.
    await userEvent.click(screen.getByRole('button', { name: 'New note' }))
    const sheet = await screen.findByRole('dialog', { name: 'New note' })
    await userEvent.type(within(sheet).getByLabelText('Title (optional)'), 'Exam review')
    await userEvent.type(within(sheet).getByLabelText('Note (optional)'), 'Focus on chapters 1-4')
    await userEvent.selectOptions(
      within(sheet).getByLabelText('Attach to schedule block'),
      block.id,
    )
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save note' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Exam review')).toBeInTheDocument()
    expect(screen.getByText('Attached to Biology')).toBeInTheDocument()

    // Filter to Attached & search.
    await userEvent.click(screen.getByRole('button', { name: 'Attached' }))
    expect(screen.getByText('Exam review')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Search notes'), 'chapters')
    expect(screen.getByText('Exam review')).toBeInTheDocument()
    expect(screen.queryByText('Orphaned note')).not.toBeInTheDocument()

    // Delete and Undo.
    await userEvent.click(screen.getByRole('button', { name: 'Delete note Exam review' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this note?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete note' }))
    await waitFor(() => expect(screen.queryByText('Exam review')).not.toBeInTheDocument())

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Exam review')).toBeInTheDocument()
  })

  it('loads account notes from API, handles 410 expired restore, and recovers from load error', async () => {
    const user = makeUser({ survey_done: true })
    useSession.getState().signIn(makeTokenResponse(user))
    const noteId = crypto.randomUUID()
    let shouldFail = true
    let deleted = false

    server.use(
      http.get(`${API}/reminders/due`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/notes`, () => {
        if (shouldFail) return HttpResponse.json({ message: 'Down' }, { status: 500 })
        return HttpResponse.json({
          data: deleted
            ? []
            : [
                {
                  id: noteId,
                  title: 'Account note',
                  body: 'Synced text',
                  schedule_item_id: null,
                  local_date: null,
                  created_at: '2026-11-26T09:00:00.000Z',
                  updated_at: '2026-11-26T09:00:00.000Z',
                },
              ],
          links: { prev: null, next: null },
          meta: { current_page: 1, per_page: 50 },
        })
      }),
      http.delete(`${API}/notes/${noteId}`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/notes/${noteId}/restore`, () =>
        HttpResponse.json({ message: 'Expired' }, { status: 410 }),
      ),
    )

    renderRoute('/notes')

    expect(
      await screen.findByText('Loomora is having trouble right now. Please try again in a moment.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New note' })).not.toBeInTheDocument()
    shouldFail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Account note')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit note Account note' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete note Account note' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this note?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete note' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(
      await screen.findByText('The 7-day undo window for this note has expired.'),
    ).toBeInTheDocument()
  })

  it('offers the latest version or a new note when an edit conflicts (F-R4-05)', async () => {
    const user = makeUser({ survey_done: true })
    useSession.getState().signIn(makeTokenResponse(user))
    const noteId = crypto.randomUUID()
    const base = {
      id: noteId,
      title: 'Shared note',
      body: 'Original',
      schedule_item_id: null,
      local_date: null,
      revision: 2,
      created_at: '2026-11-26T09:00:00.000Z',
      updated_at: '2026-11-26T09:00:00.000Z',
    }
    const latest = { ...base, body: 'Changed on phone', revision: 3 }
    let patchBody: unknown
    let created: unknown

    server.use(
      http.get(`${API}/reminders/due`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/notes`, () =>
        HttpResponse.json({
          data: [created ? latest : base],
          links: { prev: null, next: null },
          meta: { current_page: 1, per_page: 50 },
        }),
      ),
      http.get(`${API}/notes/${noteId}`, () => HttpResponse.json({ data: latest })),
      http.patch(`${API}/notes/${noteId}`, async ({ request }) => {
        patchBody = await request.json()
        return HttpResponse.json({ message: 'Changed' }, { status: 409 })
      }),
      http.post(`${API}/notes`, async ({ request }) => {
        created = await request.json()
        return HttpResponse.json(
          { data: { ...base, ...(created as object), revision: 1 } },
          { status: 201 },
        )
      }),
    )

    renderRoute('/notes')

    await userEvent.click(await screen.findByRole('button', { name: 'Edit note Shared note' }))
    const editor = await screen.findByRole('dialog', { name: 'Edit note' })
    const bodyField = within(editor).getByLabelText('Note (optional)')
    await userEvent.clear(bodyField)
    await userEvent.type(bodyField, 'Mine')
    await userEvent.click(within(editor).getByRole('button', { name: 'Save note' }))

    const conflict = await screen.findByRole('dialog', {
      name: 'This note changed on another device',
    })
    expect(patchBody).toMatchObject({ body: 'Mine', expected_revision: 2 })
    expect(within(conflict).getByRole('button', { name: 'Use the latest version' })).toBeVisible()
    await userEvent.click(within(conflict).getByRole('button', { name: 'Save mine as a new note' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(created).toMatchObject({ title: 'Shared note', body: 'Mine' })
    expect((created as { id: string }).id).not.toBe(noteId)
  })

  it('shows a single primary New note button when empty and hides creation for offline accounts while keeping guest offline creation', async () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      // Guest offline: single New note button in empty state remains usable.
      const { db, repo } = createTestRepository()
      const schedule = new GuestScheduleRepository({ db })
      const guestView = renderRoute('/notes', repo, schedule, db)

      expect(await screen.findByText('No notes yet')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'New note' })).toHaveLength(1)
      guestView.unmount()

      // Account offline: hides New note button and displays offline card.
      const user = makeUser({ survey_done: true })
      useSession.getState().signIn(makeTokenResponse(user))
      renderRoute('/notes')

      expect(await screen.findByText('Notes are unavailable offline')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'New note' })).not.toBeInTheDocument()
    } finally {
      onLineSpy.mockRestore()
    }
  })
})
