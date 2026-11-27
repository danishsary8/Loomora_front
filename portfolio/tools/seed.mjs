// Made-up demo data for the portfolio screenshots: a student's week (classes, internship deep
// work, gym, reading) with about five weeks of history. Runs in the browser, in guest mode,
// against the Vite dev server so it can import the app's own Dexie database class.
// No real user data is used.

export async function seedGuestDemo() {
  const { GuestDatabase } = await import('/src/lib/storage/db.ts')
  const db = new GuestDatabase()
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))

  const TODAY = '2026-11-27'
  const START = '2026-10-19'
  const OFFSET_H = 7 // Asia/Phnom_Penh
  let seq = 0
  const uuid = () => {
    seq += 1
    const hex = seq.toString(16).padStart(12, '0')
    return `0e5d7a1c-4b2f-4c3a-9d1e-${hex}`
  }
  const iso = (date, time) => {
    const [h, m] = time.split(':').map(Number)
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCMinutes(h * 60 + m - OFFSET_H * 60)
    return d.toISOString()
  }
  const addDays = (date, n) => {
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
  }
  const weekday = (date) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  const dates = []
  for (let d = START; d <= TODAY; d = addDays(d, 1)) dates.push(d)
  // Deterministic "random" so every run gives the same week.
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  const created = iso(START, '08:00')
  const block = (title, category, start_time, end_time, days) => ({
    id: uuid(),
    title,
    category,
    start_time,
    end_time,
    days,
    starts_on: START,
    ends_on: null,
    created_at: created,
    updated_at: created,
  })
  const items = [
    block('Database systems class', 'study', '08:00', '09:30', [0, 2, 4]),
    block('Algorithms lecture', 'study', '08:30', '10:00', [1, 3]),
    block('Deep work · internship', 'work', '10:00', '12:30', [0, 1, 2, 3, 4]),
    block('Lunch & recharge', 'rest', '12:30', '13:30', [0, 1, 2, 3, 4, 5, 6]),
    block('Group project sync', 'work', '14:00', '15:00', [1, 3]),
    block('Gym session', 'health', '17:00', '18:00', [0, 2, 4]),
    block('Long run', 'health', '07:00', '08:00', [5]),
    block('Reading hour', 'life', '20:30', '21:30', [0, 1, 2, 3, 4, 5, 6]),
  ]
  await db.schedule_items.bulkPut(items)

  const checkins = []
  for (const date of dates) {
    for (const item of items) {
      if (!item.days.includes(weekday(date))) continue
      const isToday = date === TODAY
      if (isToday ? item.end_time > '10:40' : rand() > 0.84) continue
      checkins.push({
        id: uuid(),
        schedule_item_id: item.id,
        date,
        done_at: iso(date, item.end_time),
      })
    }
  }
  await db.schedule_checkins.bulkPut(checkins)

  const todo = (title, category, due_date, extra = {}) => ({
    id: uuid(),
    title,
    category,
    priority: 'normal',
    notes: null,
    parent_id: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    remind_dismissed_at: null,
    due_date,
    done_at: null,
    deleted_at: null,
    created_at: iso(due_date ?? TODAY, '07:30'),
    updated_at: iso(due_date ?? TODAY, '07:30'),
    ...extra,
  })
  const history = [
    ['Review lecture notes', 'study'],
    ['Reply to mentor email', 'work'],
    ['Stretch for 10 minutes', 'health'],
    ['Buy groceries', 'life'],
    ['Problem set questions 1–4', 'study'],
    ['Push the feature branch', 'work'],
    ['Call home', 'life'],
    ['Plan tomorrow', 'other'],
  ]
  const todos = []
  for (const date of dates) {
    if (date === TODAY) continue
    const count = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < count; i += 1) {
      const [title, category] = history[Math.floor(rand() * history.length)]
      const done = rand() < 0.86
      todos.push(
        todo(title, category, date, {
          done_at: done ? iso(date, `${String(9 + i * 3).padStart(2, '0')}:15`) : null,
          deleted_at: done ? null : iso(date, '23:00'),
        }),
      )
    }
  }
  const checkPr = todo('Check the PR review comments', 'work', TODAY, {
    done_at: iso(TODAY, '09:10'),
  })
  const apiReview = todo('Finish the API review', 'work', TODAY, {
    priority: 'high',
    notes: 'Error messages first, then the pagination edge cases.',
  })
  todos.push(
    checkPr,
    apiReview,
    todo('Error responses', 'work', TODAY, { parent_id: apiReview.id }),
    todo('Pagination edge cases', 'work', TODAY, { parent_id: apiReview.id }),
    todo('Write the algorithms report', 'study', '2026-11-25', { priority: 'high' }),
    todo('Revise chapter 6 flashcards', 'study', TODAY, {
      done_at: iso(TODAY, '08:55'),
    }),
    todo('Upper-body workout', 'health', TODAY, {
      repeat_rule: { type: 'weekly', days: [0, 2, 4] },
    }),
    todo('Book the dentist', 'life', TODAY, { remind_at: iso(TODAY, '16:00') }),
    todo('Water the plants', 'life', TODAY, { repeat_rule: { type: 'daily' } }),
    todo('Return library books', 'other', null),
  )
  await db.todos.bulkPut(todos)

  const sessions = []
  const focusLabels = ['Deep work · internship', 'Problem set', 'Algorithms report', 'Reading']
  for (const date of dates) {
    const wd = weekday(date)
    if (wd === 6 || date === TODAY) continue
    const n = wd === 5 ? 1 : 1 + Math.floor(rand() * 2)
    for (let i = 0; i < n; i += 1) {
      const minutes = [25, 50, 50, 90][Math.floor(rand() * 4)]
      const startTime = i === 0 ? '10:05' : '15:10'
      const started = iso(date, startTime)
      const ended = new Date(Date.parse(started) + minutes * 60_000).toISOString()
      const ms = minutes * 60_000
      sessions.push({
        id: uuid(),
        mode: 'countdown',
        started_at: started,
        ended_at: ended,
        end_reason: 'completed',
        planned_focus_ms: ms,
        todo_id: null,
        schedule_item_id: i === 0 ? items[2].id : null,
        label: focusLabels[Math.floor(rand() * focusLabels.length)],
        segments: [{ type: 'focus', started_at: started, ended_at: ended, active_ms: ms }],
        laps: null,
        local_date: date,
        focus_ms: ms,
        break_ms: 0,
        paused_ms: 0,
        created_at: ended,
        deleted_at: null,
      })
    }
  }
  const morning = iso(TODAY, '10:00')
  sessions.push({
    id: uuid(),
    mode: 'countdown',
    started_at: morning,
    ended_at: iso(TODAY, '10:25'),
    end_reason: 'completed',
    planned_focus_ms: 25 * 60_000,
    todo_id: apiReview.id,
    schedule_item_id: items[2].id,
    label: null,
    segments: [
      { type: 'focus', started_at: morning, ended_at: iso(TODAY, '10:25'), active_ms: 25 * 60_000 },
    ],
    laps: null,
    local_date: TODAY,
    focus_ms: 25 * 60_000,
    break_ms: 0,
    paused_ms: 0,
    created_at: iso(TODAY, '10:25'),
    deleted_at: null,
  })
  await db.focus_sessions.bulkPut(sessions)

  const note = (title, body, color, tags, pinned, at, extra = {}) => ({
    id: uuid(),
    title,
    body,
    schedule_item_id: null,
    local_date: null,
    pinned,
    color,
    tags,
    created_at: at,
    updated_at: at,
    deleted_at: null,
    ...extra,
  })
  await db.notes.bulkPut([
    note(
      'Ideas for the API design',
      'Better error messages, cleaner endpoints, and a calmer way to page through results.',
      'study',
      ['work', 'ideas'],
      true,
      iso('2026-11-24', '18:20'),
    ),
    note(
      'What I learned today',
      'Small improvements compound. Keep the momentum without rushing it.',
      'work',
      ['reflection'],
      false,
      iso(TODAY, '10:30'),
    ),
    note(
      'Reading highlights',
      'A thought about attention, energy, and the value of a slower morning.',
      'life',
      ['books'],
      false,
      iso('2026-11-26', '21:15'),
    ),
    note(
      'Gym plan',
      'Push day: bench 4×8, overhead press 3×10, dips. Stretch after.',
      'health',
      ['training'],
      false,
      iso('2026-11-25', '18:05'),
      { schedule_item_id: items[5].id },
    ),
    note(
      'Exam week checklist',
      'Past papers for Databases, sleep before 23:00, pack snacks.',
      'rest',
      ['study'],
      true,
      iso('2026-11-23', '20:00'),
    ),
  ])

  await db.dailyIntentions.put({
    date: TODAY,
    text: 'Finish the API review and push the update.',
  })
  db.close()
  localStorage.setItem('loomora.savePlanDismissedOn', TODAY)
}
