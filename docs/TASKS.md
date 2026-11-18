# Loomora: Task Queue

The queue Claude Code works from. Take the first task with status `todo`, top to bottom.
Status values: `todo` | `doing` | `review` | `done` | `blocked`

Rules:
- One task is about 1 to 2 hours of work and touches one concern.
- One task = one branch (`feat/<id>-short-name`) = one PR into `v2-rebuild`. Tests must pass before the PR.
- A `blocked` task must state a clear question. Then move on to the next task.
- "Done when" items must be checkable by running something.
- Read docs/08-data-model.md, 09-api-design.md and 10-tech-and-structure.md before any task that touches data, API or structure.

## Queue

### F-001: Scaffold Vite + React + TypeScript + Tailwind
- **Status:** done
- **Steps:**
  1. Create the app in the repo root (do not touch `legacy/` or `docs/`). TypeScript strict.
  2. Add Tailwind, React Router, TanStack Query, Zustand, i18next, date-fns, Framer Motion.
  3. Add ESLint, Prettier, Vitest + Testing Library. One passing smoke test.
  4. Add `.env.example` with `VITE_API_URL=`.
- **Done when:**
  - [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass
- **Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`

### F-002: GitHub Actions CI
- **Status:** done
- **Steps:**
  1. Add `.github/workflows/ci.yml`: Node 22, npm ci (cached), lint, typecheck, test, build.
  2. Run on pull requests and pushes to `main` and `v2-rebuild`.
- **Done when:**
  - [x] The workflow runs green on the PR
- **Files:** `.github/workflows/ci.yml`

### F-003: Design tokens and neo-brutalism base components
- **Status:** done
- **Steps:**
  1. Use the `ui-ux-pro-max` skill. Before coding, write a short style proposal in `docs/DECISIONS.md` comparing neo-brutalism with a neo-skeuomorphic / retro-digital variant; implement neo-brutalism on cream #F5EDE6 unless it clearly fails (note from docs/07, S18).
  2. Define tokens in Tailwind: colors (cream, black, 6 category colors, success, danger), border width, hard offset shadows, radii, spacing scale, a script heading font and a clean body font, press-down states.
  3. Build Button, Card, Chip, Checkbox, Input, Sheet (bottom sheet), ProgressRing in `src/components/ui/`.
  4. Add a `/styleguide` route showing every component and state at 375 px.
  5. Check contrast (4.5:1 for text), 44 px touch targets, `prefers-reduced-motion`.
- **Done when:**
  - [x] `/styleguide` renders all components with no console errors
  - [x] Component unit tests pass; lint, typecheck, build pass
  - [x] A screenshot of `/styleguide` at 375 px is saved to `docs/screenshots/`
- **Files:** `tailwind.config.ts`, `src/components/ui/*`, `src/styles/*`, `src/features/styleguide/*`

### F-004: App shell, routing, i18n
- **Status:** done
- **Steps:**
  1. Router with routes from docs/05-screen-map.md: Landing, Today, Week, Focus (coming soon), Insights (coming soon), Profile, Sign in/up, legal, 404.
  2. Bottom nav on phones (Today, Week, Focus, Insights) and sidebar on wide screens.
  3. i18n set up with `src/i18n/en.json`; no hard-coded UI text.
  4. Loading, empty, error states as shared components.
- **Done when:**
  - [x] Every route renders at 375 px and 1280 px
  - [x] Tests, lint, typecheck, build pass
- **Files:** `src/app/*`, `src/i18n/en.json`

### F-005: Storage adapter and guest to-dos
- **Status:** done
- **Steps:**
  1. Define a `TodoRepository` interface (list for date, create, update, setDone, delete) and the types from docs/08.
  2. Implement `GuestTodoRepository` with Dexie (IndexedDB), UUIDs generated on the client. Implement the Today list rules (due today, undated, overdue) in a pure function with unit tests.
  3. Leave a `ServerTodoRepository` stub for later.
- **Done when:**
  - [x] Unit tests cover every Today-list rule and pass
- **Files:** `src/lib/storage/*`, `src/features/todos/*`

### F-006: Today screen v1 (guest, to-dos only)
- **Status:** done
- **Steps:**
  1. Build Today per docs/04-user-flows.md: header with date, to-do list (Overdue first), floating + opening a bottom sheet to add a to-do, check-off with a stamp animation, progress ring, empty state with two equal buttons ("Add a to-do", "Add to my schedule" disabled for now).
  2. Use the guest repository. Persist across reloads.
  3. Playwright test: add a to-do, check it off, reload, it is still there.
- **Done when:**
  - [x] Playwright test passes at 375 px
  - [x] Lint, typecheck, unit tests, build pass; screenshot saved to `docs/screenshots/`
- **Files:** `src/features/today/*`, `e2e/today.spec.ts`

### F-007: Schedule types, rules and guest repository
- **Status:** done
- **Steps:**
  1. Types from docs/08 (ScheduleItem, Exception, Checkin). Pure functions with unit tests: occurrences for a date (docs/08 rule 4), skip/override, Now/Next (rule 6).
  2. `ScheduleRepository` interface and `GuestScheduleRepository` (Dexie, client UUIDs, validation per rule 11). Server version is a stub.
- **Done when:**
  - [x] Unit tests cover every rule; lint, typecheck, test, build pass
- **Files:** `src/features/schedule/*`, `src/lib/storage/*`

### F-008: Add and edit schedule item sheet
- **Status:** done
- **Steps:**
  1. Bottom sheet: title, start, end, repeat days (Mon to Sun chips, several at once), category. Validation messages through i18n.
  2. Edit from Week (all repeats) and from Today (choose "Only today" or "All repeats"); delete with the same choice and 5-second undo.
  3. Component tests for each path.
- **Done when:**
  - [x] Tests, lint, typecheck, build pass; screenshot at 375 px in `docs/screenshots/`
- **Files:** `src/features/schedule/*`

### F-009: Week screen
- **Status:** done
- **Steps:**
  1. Phone: day strip (Mon to Sun) with one day at a time and a week overview toggle. 768 px and up: 7 columns (docs/04 Flow 4, D8).
  2. + button opens the sheet from F-008; "Copy day to..." sheet. Empty state.
  3. Playwright test: add an item for Mon to Fri, see it on each day.
- **Done when:**
  - [x] Tests pass at 375 and 1280 px; screenshots saved
- **Files:** `src/features/schedule/week/*`, `e2e/week.spec.ts`

### F-010: Now/Next strip and "Add to my schedule" on Today
- **Status:** done
- **Steps:**
  1. Strip above the to-do list: NOW and NEXT cards (Free / Nothing more today states), updates every minute; tapping opens the full-day sheet (S5).
  2. Enable the second empty-state button to open the schedule sheet. Check-off of schedule items from the day sheet.
  3. Tests for each state with a fake clock.
- **Done when:**
  - [x] Tests, lint, typecheck, build pass; screenshot saved
- **Files:** `src/features/today/*`

### F-011: Streak (guest) and header badge
- **Status:** done
- **Steps:**
  1. Compute the streak locally from guest data with the same rules as docs/08 rule 8 (pure function, unit tests, time zone aware).
  2. Header badge with count and a "today counted" state; small celebration on the first check-off of the day.
- **Done when:**
  - [x] Unit tests for every rule; lint, typecheck, test, build pass
- **Files:** `src/features/streak/*`

### F-012: Landing page, legal pages, Profile (guest)
- **Status:** done
- **Steps:**
  1. Landing (S1): promise, "Try it now", Sign in, 3 feature highlights, neo-brutalism style, footer with Privacy and Terms.
  2. Write simple Privacy and Terms pages (plain English, no legal claims beyond what the app really does).
  3. Profile (S9) for guests: streak, "Data lives on this device only", "Save your plan" button (disabled until auth), feedback sheet UI.
- **Done when:**
  - [x] Tests, lint, typecheck, build pass; screenshots at 375 and 1280 px
- **Files:** `src/features/landing/*`, `src/features/profile/*`, `src/i18n/en.json`

### F-013: PWA install and offline shell
- **Status:** done
- **Steps:**
  1. vite-plugin-pwa: manifest (name Loomora, cream background, icons generated from a simple neo-brutalism "L" mark), service worker caching the app shell, offline banner.
  2. Lighthouse PWA check documented in `docs/PROGRESS.md`.
- **Done when:**
  - [x] Build passes; Lighthouse installable check passes; the app opens offline after one visit
- **Files:** `vite.config.ts`, `public/*`, `src/app/*`

### F-014: Playwright end-to-end in CI
- **Status:** done
- **Steps:**
  1. Run Playwright specs (today, week) in CI at a 375 px viewport.
  2. Add a short "How to run tests" section to README.
- **Done when:**
  - [x] CI runs the e2e job green
- **Files:** `.github/workflows/ci.yml`, `e2e/*`, `README.md`

### F-015: API client and auth screens (against the OpenAPI contract)
- **Status:** done
- **Steps:**
  1. Typed API client in `src/lib/api/` from `docs/openapi.yaml` (base URL from `VITE_API_URL`, bearer token, JSON error shape, 401 handling). Use MSW to mock the API in tests.
  2. Screens S10: Sign in and Sign up (email + password, "Sign in with Google" and "Sign up with Google" buttons using `intent`), the skippable sign-up survey (display name, biggest goal, how you heard), errors `account_not_found` and `account_already_exists`, forgot and reset password pages, email verification page.
  3. Token stored with expiry; auth state in a small store; protected routes.
- **Done when:**
  - [ ] Unit and component tests with MSW pass; lint, typecheck, build pass; screenshots at 375 px
- **Files:** `src/lib/api/*`, `src/features/auth/*`

### F-016: Server repositories and "Save your plan" (guest to account)
- **Status:** done
- **Steps:**
  1. Implement `ServerTodoRepository` and `ServerScheduleRepository` over the API client. The app picks guest or server storage by auth state, with the same UI.
  2. "Save your plan" sheet (docs/04 Flow 3): shown after 3 check-offs or the first full day, dismissible, always in Profile. On success call `POST /import`, then clear guest data; on failure keep guest data and offer retry.
  3. Tests with MSW: success, failure keeps guest data, idempotent retry.
- **Done when:**
  - [ ] Tests, lint, typecheck, build pass
- **Files:** `src/lib/storage/*`, `src/features/auth/*`, `src/features/profile/*`

### F-017: Profile for accounts, feedback and delete account
- **Status:** done
- **Steps:**
  1. Profile (S9) for signed-in users: name, streak, sign out, feedback sheet (POST /feedback), delete account with confirmation (password or Google re-auth message).
  2. Time zone detection sent at sign-up and editable.
- **Done when:**
  - [ ] Tests, lint, typecheck, build pass
- **Files:** `src/features/profile/*`

### F-018: Accessibility, performance and cleanup pass
- **Status:** done
- **Steps:**
  1. Run axe checks (jest-axe or Playwright axe) on every screen; fix issues. Check focus order, contrast, touch targets.
  2. Run Lighthouse (mobile) and record scores in `docs/PROGRESS.md`; target 90+ for Performance, Accessibility, Best practices.
  3. Add a knip (or similar) unused-code check, fix everything it reports, and add it to CI.
- **Done when:**
  - [ ] CI green with the unused-code check; scores recorded
- **Files:** `package.json`, `.github/workflows/ci.yml`, various

## Done

_None yet._

## R1 leftovers and R2 (added 2026-11-19 from the Daycraft analysis)
Source: `docs/research/daycraft-gap-analysis.md` and `docs/research/daycraft-task-prompts.md` (behaviour reference only; never copy Daycraft code or visuals). Every new to-do field must work the same for guests (Dexie) and accounts, with the same rules and the same tests. Tasks that need a changed API wait for the planner to refresh `docs/openapi.yaml` from the backend repo; if it is not refreshed yet, mark the task `blocked` and move on.

### F-019: Error, offline and not-found states
- **Status:** review
- **Steps:**
  1. Audit what exists (route error boundary, 404 page, offline banner, error mapping). Add only what is missing.
  2. Route-level error boundary with `t()` text, Try again and Go to Today. Map API errors to user text (network, 401 sign out, 422 field errors, 429, 5xx); never show raw `error.message`.
  3. Account mode only: when a request fails with a network error or 5xx show a top banner with Retry and poll `GET /health` every 30 s until it recovers. The banner text must not promise offline sync (no outbox yet). Guest mode never calls the API.
- **Done when:**
  - [x] Playwright: with `/api/**` aborted in account mode the banner appears, and after un-abort plus Retry it disappears; an unknown URL shows the 404 page
  - [x] Vitest covers the error mapping table
  - [x] `npm run lint`, `typecheck`, `test`, `build` and the cleanup check pass
- **Files:** `src/app/*`, `src/lib/api/*`, `src/components/*`, `src/i18n/locales/en.json`, `e2e/backend-down.spec.ts`

### F-020: Import in chunks under the API limits
- **Status:** todo
- **Steps:**
  1. The import endpoint caps exceptions at 5000 and check-ins at 10000. Split the guest payload into several `POST /import` calls under the caps (the import is idempotent by id, so repeats are safe) and clear the device data only after every call succeeds.
- **Done when:**
  - [ ] Vitest: a payload with 12000 check-ins sends 2 calls; a failure on the second call keeps all local data; a retry succeeds without duplicates
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/*/saveGuestPlan*`, tests

### F-021: Resend verification email
- **Status:** review
- **Steps:**
  1. Add a Resend link on the verify-email screen and the Profile account card for unverified accounts, calling `POST /auth/email/resend`. Show success, the 429 wait time (`retryAfter`) and other errors with `t()` text.
- **Done when:**
  - [x] Vitest with MSW: success, 429 with retry time, network error
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/auth/*`, `src/features/profile/*`, `src/lib/api/*`, `src/i18n/locales/en.json`

### F-022: Undo toast for deletes
- **Status:** todo
- **Steps:**
  1. Needs B-022 and a refreshed `docs/openapi.yaml`. Add `restore` to the to-do repositories (Dexie: clear `deleted_at`; server: `POST /todos/{id}/restore`).
  2. A reusable `useUndoableDelete`: remove from the cache at once, call remove, show a 5 s toast with Undo (focusable, `aria-live=polite`). Undo restores; a remove error rolls back and shows an error toast. Use it for to-dos.
- **Done when:**
  - [ ] Vitest: delete then Undo calls restore once and the row returns; no Undo within 5 s keeps it gone; a remove error rolls back
  - [ ] Guest and account modes both covered
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/components/*`, `src/features/todos/*`, repositories, `src/i18n/locales/en.json`

### F-023: Subtasks, priority and notes UI
- **Status:** todo
- **Steps:**
  1. Needs B-019. Add notes (textarea), priority (low, normal, high with a text label, not only color) and subtasks (add, check, delete; one level) to the to-do sheet and rows. Show a subtask count like 2/3 on the row. Checking a parent marks its open subtasks done.
  2. Guest repository enforces the same rules (depth 1, parent check-off marks subtasks done). Bump the Dexie version with a migration and include the new fields in the import payload.
- **Done when:**
  - [ ] Vitest for the rules in guest mode and for the account mapping with MSW
  - [ ] Playwright (375 px): add a to-do with 2 subtasks, check one, check the parent, all done
  - [ ] Lint, typecheck, test, build, axe pass
- **Files:** `src/features/todos/*`, `src/lib/db/*`, repositories, `src/i18n/locales/en.json`, `e2e/subtasks.spec.ts`

### F-024: Repeating to-dos UI
- **Status:** todo
- **Steps:**
  1. Needs B-020. In the to-do sheet add Repeat: None, Daily, Weekly with weekday chips. It requires a due date (show the message under the field).
  2. Guest repository creates the next occurrence on the first check-off with the same rules as B-020 (use the user's time zone helper). Add a small repeat icon and label on the row. Bump Dexie if needed and include `repeat_rule` in the import payload.
- **Done when:**
  - [ ] Vitest: daily, weekly across a week boundary, and a check-off just after local midnight in `Asia/Phnom_Penh`; toggling twice creates one next to-do
  - [ ] Playwright (375 px): create a daily to-do, check it, tomorrow's copy appears
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/todos/*`, `src/lib/db/*`, repositories, `src/i18n/locales/en.json`, `e2e/repeat.spec.ts`

### F-025: In-app reminders UI
- **Status:** todo
- **Steps:**
  1. Needs B-021. Add a Remind me field (date and time in the user's time zone) to the to-do sheet.
  2. A root watcher checks every 30 s and on tab focus. Accounts call `GET /reminders/due`; guests compare `remind_at` in Dexie. Show a banner or toast with the title and Done, Snooze (5, 10, 30, 60 min) and Dismiss. No sound (audio comes with Focus) and no push.
  3. Include `remind_at` in the import payload and Dexie schema.
- **Done when:**
  - [ ] Vitest with fake timers: a reminder shows once, snooze moves it, dismiss hides it, a done to-do never shows
  - [ ] Playwright (375 px, guest): set a reminder 1 minute ahead (use a fake clock) and see the banner
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/reminders/*`, `src/features/todos/*`, `src/lib/db/*`, `src/i18n/locales/en.json`, `e2e/reminders.spec.ts`

### F-026: Time format and week start settings
- **Status:** todo
- **Steps:**
  1. Needs B-023. In Profile add a 12 h or 24 h toggle and a week-starts-on picker (Monday or Sunday). Guests keep them in Dexie `meta`; accounts use `PATCH /me`.
  2. Use them in every place that shows a time (schedule, Now/Next, reminders) and in the Week view column order. Add `src/lib/time` tests that read `local-date-cases.json` (copy of the backend fixture).
- **Done when:**
  - [ ] Vitest: formatting in both modes, Sunday-first week order, all fixture cases
  - [ ] Playwright (375 px): switching to 12 h changes the schedule times
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/profile/*`, `src/lib/time/*`, schedule and week components, `src/i18n/locales/en.json`

### F-027: Daily intention on Today
- **Status:** todo
- **Steps:**
  1. Needs B-024. A one-line field under the Today header (max 200 characters, placeholder via `t()`), saved 600 ms after typing stops and on blur, with a small Saved hint. It is per local date: another day shows its own text and a new day starts empty.
  2. Guest: Dexie `dailyIntentions`; account: the API. Include it in the import payload.
- **Done when:**
  - [ ] Vitest with fake timers: typing saves once, changing the date loads a different value, a save error keeps the text and shows a toast
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/today/DailyIntention.tsx`, repositories, `src/lib/db/*`, `src/i18n/locales/en.json`

### F-028: Delete-account password field uses `has_password`
- **Status:** todo
- **Steps:**
  1. Needs B-025. In the delete-account sheet, hide the password field for accounts where `has_password` is false and explain the confirmation step the API requires (read the contract). Answers Q37.
- **Done when:**
  - [ ] Vitest: password account shows the field, Google-only account does not
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/profile/*`, `src/lib/api/*`

### F-029: Static HTML shell and lazy Dexie for first paint
- **Status:** todo
- **Steps:**
  1. Answers Q24. Paint the cream background and logo from `index.html` before JavaScript runs, and open Dexie only on the first read. Measure Lighthouse mobile on `vite preview` before and after and write both in `docs/PROGRESS.md`.
- **Done when:**
  - [ ] Performance is at least 90 on `/` and 85 on `/today` in the same environment as the F-018 measurements, or the note explains what is left
  - [ ] Lint, typecheck, test, build, e2e pass
- **Files:** `index.html`, `src/lib/db/*`, `src/main.tsx`
