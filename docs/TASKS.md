# Loomora: Task Queue

The queue Claude Code works from. Take the first task with status `todo`, top to bottom.
Status values: `todo` | `doing` | `review` | `done` | `blocked`

Rules:
- A task with an `Owner:` line belongs to that tool only (`claude`, `codex`, `antigravity`). Take the first `todo` task whose owner is you. If it has no owner, anyone may take it. Edit only your own task's status line in this file.
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
- **Status:** done
- **Owner:** antigravity
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
- **Status:** done
- **Owner:** antigravity
- **Steps:**
  1. The import endpoint caps exceptions at 5000 and check-ins at 10000. Split the guest payload into several `POST /import` calls under the caps (the import is idempotent by id, so repeats are safe) and clear the device data only after every call succeeds.
- **Done when:**
  - [x] Vitest: a payload with 12000 check-ins sends 2 calls; a failure on the second call keeps all local data; a retry succeeds without duplicates
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/*/saveGuestPlan*`, tests

### F-021: Resend verification email
- **Status:** done
- **Owner:** antigravity
- **Steps:**
  1. Add a Resend link on the verify-email screen and the Profile account card for unverified accounts, calling `POST /auth/email/resend`. Show success, the 429 wait time (`retryAfter`) and other errors with `t()` text.
- **Done when:**
  - [x] Vitest with MSW: success, 429 with retry time, network error
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/auth/*`, `src/features/profile/*`, `src/lib/api/*`, `src/i18n/locales/en.json`

### F-022: Undo toast for deletes
- **Status:** done
- **Owner:** antigravity
- **Steps:**
  1. Needs B-022 and a refreshed `docs/openapi.yaml`. Add `restore` to the to-do repositories (Dexie: clear `deleted_at`; server: `POST /todos/{id}/restore`).
  2. A reusable `useUndoableDelete`: remove from the cache at once, call remove, show a 5 s toast with Undo (focusable, `aria-live=polite`). Undo restores; a remove error rolls back and shows an error toast. Use it for to-dos.
- **Done when:**
  - [x] Vitest: delete then Undo calls restore once and the row returns; no Undo within 5 s keeps it gone; a remove error rolls back
  - [x] Guest and account modes both covered
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/components/*`, `src/features/todos/*`, repositories, `src/i18n/locales/en.json`

### F-023: Subtasks, priority and notes UI
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Needs B-019. Add notes (textarea), priority (low, normal, high with a text label, not only color) and subtasks (add, check, delete; one level) to the to-do sheet and rows. Show a subtask count like 2/3 on the row. Checking a parent marks its open subtasks done.
  2. Guest repository enforces the same rules (depth 1, parent check-off marks subtasks done). Bump the Dexie version with a migration and include the new fields in the import payload.
- **Done when:**
  - [x] Vitest for the rules in guest mode and for the account mapping with MSW
  - [x] Playwright (375 px): add a to-do with 2 subtasks, check one, check the parent, all done
  - [x] Lint, typecheck, test, build, axe pass
- **Files:** `src/features/todos/*`, `src/lib/db/*`, repositories, `src/i18n/locales/en.json`, `e2e/subtasks.spec.ts`

### F-024: Repeating to-dos UI
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Needs B-020. In the to-do sheet add Repeat: None, Daily, Weekly with weekday chips. It requires a due date (show the message under the field).
  2. Guest repository creates the next occurrence on the first check-off with the same rules as B-020 (use the user's time zone helper). Add a small repeat icon and label on the row. Bump Dexie if needed and include `repeat_rule` in the import payload.
- **Done when:**
  - [ ] Vitest: daily, weekly across a week boundary, and a check-off just after local midnight in `Asia/Phnom_Penh`; toggling twice creates one next to-do
  - [ ] Playwright (375 px): create a daily to-do, check it, tomorrow's copy appears
  - [ ] Lint, typecheck, test, build pass
- **Files:** `src/features/todos/*`, `src/lib/db/*`, repositories, `src/i18n/locales/en.json`, `e2e/repeat.spec.ts`

### F-025: In-app reminders UI
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Needs B-021. Add a Remind me field (date and time in the user's time zone) to the to-do sheet.
  2. A root watcher checks every 30 s and on tab focus. Accounts call `GET /reminders/due`; guests compare `remind_at` in Dexie. Show a banner or toast with the title and Done, Snooze (5, 10, 30, 60 min) and Dismiss. No sound (audio comes with Focus) and no push.
  3. Include `remind_at` in the import payload and Dexie schema.
- **Done when:**
  - [x] Vitest with fake timers: a reminder shows once, snooze moves it, dismiss hides it, a done to-do never shows
  - [x] Playwright (375 px, guest): set a reminder 1 minute ahead (use a fake clock) and see the banner
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/reminders/*`, `src/features/todos/*`, `src/lib/db/*`, `src/i18n/locales/en.json`, `e2e/reminders.spec.ts`

### F-026: Time format and week start settings
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Needs B-023. In Profile add a 12 h or 24 h toggle and a week-starts-on picker (Monday or Sunday). Guests keep them in Dexie `meta`; accounts use `PATCH /me`.
  2. Use them in every place that shows a time (schedule, Now/Next, reminders) and in the Week view column order. Add `src/lib/time` tests that read `local-date-cases.json` (copy of the backend fixture).
- **Done when:**
  - [x] Vitest: formatting in both modes, Sunday-first week order, all fixture cases
  - [x] Playwright (375 px): switching to 12 h changes the schedule times
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/profile/*`, `src/lib/time/*`, guest storage, schedule and reminder components, `src/i18n/en.json`, `e2e/time-preferences.spec.ts`

### F-027: Daily intention on Today
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Needs B-024. A one-line field under the Today header (max 200 characters, placeholder via `t()`), saved 600 ms after typing stops and on blur, with a small Saved hint. It is per local date: another day shows its own text and a new day starts empty.
  2. Guest: Dexie `dailyIntentions`; account: the API. Include it in the import payload.
- **Done when:**
  - [x] Vitest with fake timers: typing saves once, changing the date loads a different value, a save error keeps the text and shows a toast
  - [x] Lint, typecheck, test, build pass
- **Files:** `src/features/today/DailyIntention.tsx`, repositories, `src/lib/db/*`, `src/i18n/locales/en.json`

### F-028: Delete-account password field uses `has_password`
- **Status:** done
- **Owner:** codex
- **Steps:**
  1. Use the B-025 `User.has_password` flag to gate password confirmation. Resolve saved sessions with a missing flag through authenticated `GET /me`. Answers Q37.
  2. Confirm password-account deletion with `DELETE /me`. Explain the Google-only restriction and keep a close action available.
- **Done when:**
  - [x] Password accounts retain the warning and confirmation. Empty passwords are rejected locally, 422 displays the password error, and only 204 signs out and redirects.
  - [x] Google-only accounts get a translated explanation and close controls, with no deletion request.
  - [x] Older sessions resolve the flag through `GET /me`. Failed lookups offer retry and keep deletion unavailable.
  - [x] Closing or switching accounts clears form state. Pending requests are deduplicated, and stale responses cannot sign out or redirect a new session.
  - [x] Vitest and phone-375 Playwright cover the flows. Lint, typecheck, Knip, LF formatting, build and OpenAPI verification pass.
- **Files:** `src/features/profile/*`, `src/lib/api/*`, `src/i18n/en.json`, `src/test/apiMocks.ts`, `e2e/delete-account.spec.ts`

### F-029: Static HTML shell and lazy Dexie for first paint
- **Status:** done
- **Owner:** antigravity
- **Steps:**
  1. Answers Q24. Paint the cream background and logo from `index.html` before JavaScript runs, and open Dexie only on the first read. Measure Lighthouse mobile on `vite preview` before and after and write both in `docs/PROGRESS.md`.
- **Done when:**
  - [ ] (not measured, see PROGRESS) Performance is at least 90 on `/` and 85 on `/today` in the same environment as the F-018 measurements, or the note explains what is left
  - [x] Lint, typecheck, test, build, e2e pass
- **Files:** `index.html`, `src/lib/db/*`, `src/main.tsx`

### QA-003: Offline guest to-do persistence

- **Status:** done
- **Owner:** codex
- **Source:** QA-001, guest offline blocker on Today.
- **Merge:** [PR #35](https://github.com/danishsary8/Loomora_front/pull/35) at `a3f15b5`.
- **Plan:**
  1. Reproduce the offline save, offline list and session switch failures with Vitest.
  2. Let Dexie-backed to-do operations run offline and bind pending operations to their original session.
  3. Test draft retention on storage error and IndexedDB persistence through reload and reconnect at 375 px.
  4. Run the required checks, document findings and open the PR into `v2-rebuild`.
- **Done when:**
  - [x] Guest to-dos and subtasks save and load offline, with draft retention on a rejected write.
  - [x] Reload and reconnect preserve the IndexedDB row and ID. Reopening the browser profile offline shows the saved to-do.
  - [x] Account requests retain their existing network behavior. Pending operations and Today state stay tied to their original session.
  - [x] Lint, typecheck, Knip, formatting, Vitest, build, phone-375 Playwright and OpenAPI lint pass.

### QA-010: Offline guest schedule reliability

- **Status:** review
- **Owner:** codex
- **Source:** Planner-authorized schedule follow-up to QA-003, which deferred this work in PR #35. The QA-001 audit already assigns QA-002 through QA-009.
- **Plan:**
  1. Reproduce offline schedule reads, writes and session-switch failures with Vitest.
  2. Apply session-scoped queries and mutations to Week, Today and Copy Day. Bind delayed deletion and Undo to their original session and request.
  3. Verify failed draft retention, one-day edits and skips, and persistence through offline reload and reconnect at 375 px.
  4. Run the required checks, document the remaining offline reads and open one PR into `v2-rebuild`.
- **Done when:**
  - [x] Offline guests can load Week and Today, add and edit repeats, edit or skip an occurrence, check and uncheck occurrences, and copy a day.
  - [x] Write errors preserve the editable draft. The phone regression verifies Week visibility and the original IndexedDB ID after offline reload and reconnect.
  - [x] Account operations use the API. Retired sessions cannot replay paused mutations, show stale schedule data, commit delayed deletes or undo a later session's delete.
  - [x] Lint, typecheck, Knip, LF formatting, Vitest, build, phone-375 Playwright and OpenAPI lint pass.

### QA-011: Cross-tab session synchronization

- **Status:** done
- **Owner:** antigravity
- **Source:** Planner-authorized follow-up to QA-001 (cross-tab session finding QA-006), branched after QA-010.
- **Merge:** [PR #37](https://github.com/danishsary8/Loomora_front/pull/37) at `c9ef451`.
- **Plan:**
  1. Reproduce cross-tab sign-out, account switch, retired async responses, and feedback-loop risks with failing Vitest and two-tab Playwright tests.
  2. Synchronize `useSession` across tabs using `storage` events with `BroadcastChannel` and `visibilitychange` / `focus` fallbacks without write-back loops or duplicate sign-outs.
  3. Clear previous account caches on generation transitions in `AppProviders`, scope `useStreak` and `ReminderWatcher` by generation, and guard retired auth/profile requests while preserving guest Dexie data.
  4. Verify with Vitest, two-tab and full phone-375 Playwright suites, lint, typecheck, Knip, LF formatting, production build, and Redocly OpenAPI lint.
- **Done when:**
  - [x] Tab B promptly clears its authenticated session and account UI when Tab A signs out without reload.
  - [x] Direct account switches across tabs isolate cached data and close or reset stale session UI without exposing the previous account's data.
  - [x] Retired async responses (`login`, `register`, `googleExchange`, `submitSurvey`, `logout`, `streak`, `reminders`, `401`) cannot restore an old session or leak stale data.
  - [x] Guest Dexie data is preserved across sign-out; storage-event feedback loops and duplicate sign-outs are prevented.
  - [x] Delayed or reordered cross-tab messages cannot overwrite a newer session or restore a session after sign-out, and BroadcastChannel fallback works when storage is blocked.
  - [x] Lint, typecheck, Knip, LF formatting, Vitest, production build, phone-375 Playwright (including two-tab test), and Redocly OpenAPI lint pass.
- **Files:** `src/lib/api/session.ts`, `src/lib/api/tokenStorage.ts`, `src/lib/api/client.ts`, `src/lib/api/index.ts`, `src/app/AppProviders.tsx`, `src/features/streak/useStreak.ts`, `src/features/todos/useTodos.ts`, `src/features/reminders/ReminderWatcher.tsx`, `src/features/profile/ProfilePage.tsx`, `src/features/auth/*`, `src/app/crossTabSession.test.tsx`, `e2e/cross-tab-session.spec.ts`

### QA-012: Offline guest streak and plan summary

- **Status:** done
- **Owner:** antigravity
- **Source:** Planner-authorized follow-up to QA-003 and QA-010.
- **Merge:** [PR #38](https://github.com/danishsary8/Loomora_front/pull/38) at `478f8a5`.
- **Plan:**
  1. Reproduce offline cold-cache pauses in `useStreak` and `useGuestPlan` with failing Vitest tests.
  2. Set `networkMode` in `useStreak` from `GuestStreakRepository` vs `ServerStreakRepository` (`'always'` for guest, `'online'` for account).
  3. Set `networkMode: 'always'` and session-generation scoping (`[...guestPlanKey, generation]`) in `useGuestPlan` while preserving `guestPlanKey` and `streakKeys.all` prefix invalidation.
  4. Add Vitest and mobile 375 px Playwright regression tests covering offline cold-cache reads, invalidation refreshes, reload/reconnect persistence, and account/cross-tab isolation.
  5. Run lint, typecheck, Knip, formatting, full Vitest suite, production build, phone-375 Playwright, and Redocly OpenAPI lint.
- **Done when:**
  - [x] Guest streak and guest-plan summary load offline on a cold TanStack Query cache without waiting for network connectivity.
  - [x] Account-backed streak reads remain `'online'` (API-dependent) and never leak into guest or another account's view; session-generation and cross-tab protections are preserved.
  - [x] Existing invalidations (`streakKeys.all`, `guestPlanKey`, full invalidation on import) refresh the expected values; guest Dexie data persists without duplication or accidental clearing.
  - [x] New Vitest regression tests (`offlineStreak.test.tsx`, `offlineGuestPlan.test.tsx`) demonstrated RED before GREEN; mobile 375 px Playwright (`offline-guest-reads.spec.ts`) passes.
  - [x] Lint, typecheck, Knip, LF formatting, full Vitest suite, production build, phone-375 Playwright, and Redocly OpenAPI lint pass.
- **Files:** `src/features/streak/useStreak.ts`, `src/features/auth/useGuestPlan.ts`, `src/features/streak/offlineStreak.test.tsx`, `src/features/auth/offlineGuestPlan.test.tsx`, `e2e/offline-guest-reads.spec.ts`

### QA-013: Vercel SPA route reliability

- **Status:** done
- **Owner:** antigravity
- **Source:** QA-001 (QA-002 release blocker: direct HTTP navigation/refresh returns Vercel 404).
- **Merge:** [PR #39](https://github.com/danishsary8/Loomora_front/pull/39) at `3ffcdfe`.
- **Plan:**
  1. Reproduce the static-host 404 on direct SPA routes and inspect React Router, Vite PWA `navigateFallback`, and Vercel configuration.
  2. Add root `vercel.json` with Vite build settings, SPA rewrite to `/index.html` excluding `/api`, `/assets`, `/sw.js`, `/manifest.webmanifest`, and `/workbox-*.js`, plus `Cache-Control: public, max-age=0, must-revalidate` for `/sw.js`.
  3. Add Workbox `navigateFallbackDenylist` in `vite.config.ts` so the service worker preserves `/api`, `/assets`, and PWA meta/worker files while serving `/index.html` offline for SPA routes.
  4. Add Vitest (`src/app/spaRouting.test.tsx`) and mobile 375 px Playwright (`e2e/spa-routing.spec.ts`) regressions for direct HTTP navigation, refresh, unknown route (`NotFoundPage`), static assets, API exclusions, offline PWA, and zero redirect loops.
  5. Run lint, typecheck, Knip, formatting, full Vitest, build, phone-375 Playwright, and Redocly lint; document planner Vercel production verification steps.
- **Done when:**
  - [x] Direct HTTP navigation and refresh succeed (HTTP 200) on `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, and unknown routes (rendering `NotFoundPage`) without redirect loops.
  - [x] Static assets (`/sw.js`, `/manifest.webmanifest`, `/icon.svg`, `/assets/*`) and excluded paths (`/api/*`, missing `/assets/*`) preserve non-SPA responses and MIME types.
  - [x] Mobile 375 px layout and offline PWA navigation/reload work across SPA routes and unknown routes.
  - [x] Lint, typecheck, Knip, LF formatting, full Vitest, production build, phone-375 Playwright, and Redocly OpenAPI lint pass; live Vercel verification steps documented for the planner.
- **Files:** `vercel.json`, `vite.config.ts`, `src/app/spaRouting.test.tsx`, `e2e/spa-routing.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-014: Frontend dependency security

- **Status:** done
- **Owner:** antigravity
- **Source:** QA-001 / QA-005 (frontend npm dependency audit).
- **Merge:** [PR #40](https://github.com/danishsary8/Loomora_front/pull/40) at `fe58dc0`.
- **Plan:**
  1. Reproduce `npm audit --omit=dev`, `npm audit`, and `npm ls --depth=0` against QA-001, separating runtime `dependencies` from tooling/build-only `devDependencies`.
  2. Update `eslint` (`10.13.0` -> `10.15.0`) and `typescript-eslint` (`8.72.0` -> `8.73.0`) within their compatible major lines in `package.json` and `package-lock.json` to move `@eslint/config-array` and `@typescript-eslint/*` onto patched `minimatch` (`11.0.9`).
  3. Evaluate the remaining `vite-plugin-pwa@2.0.0` -> `workbox-build@7.4.1` -> `glob@11.1.0` -> `minimatch@10.2.6` chain (rejecting `npm audit fix --force` downgrade to `vite-plugin-pwa@1.1.0` / EOL `glob@7.1.6` and unverified 3-major `glob` overrides) and document the non-exploitable build-time exception for planner review.
  4. Add an offline Vitest regression test (`src/test/dependencySecurity.test.ts`) enforcing production dependency isolation and patched lockfile minimums.
  5. Run `npm ci`, audits, lint, typecheck, Knip, formatting, Vitest (`--maxWorkers=1`), build, phone-375 Playwright, and Redocly OpenAPI lint; mark QA-013 done and log QA-014 in `docs/PROGRESS.md`.
- **Done when:**
  - [x] `npm audit --omit=dev` reports 0 vulnerabilities across all production dependencies.
  - [x] Fixable ESLint and `typescript-eslint` advisories are remediated within compatible release lines and guarded by `src/test/dependencySecurity.test.ts`.
  - [x] Remaining `vite-plugin-pwa` / `workbox-build` / `glob` / `minimatch` dev-only exception is documented with impact, exploitability, and planner recommendation in `docs/PROGRESS.md`.
  - [x] `npm ci`, lint, typecheck, Knip, LF formatting (`--end-of-line auto` on Windows CRLF checkout), Vitest (`--maxWorkers=1`), production build, phone-375 Playwright, and Redocly OpenAPI lint pass.
- **Files:** `package.json`, `package-lock.json`, `src/test/dependencySecurity.test.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-015: Frontend security headers and CSP hardening

- **Status:** done
- **Owner:** antigravity
- **Source:** QA-001 / QA-005 (missing browser security headers and Content-Security-Policy on Vercel frontend).
- **Merge:** [PR #41](https://github.com/danishsary8/Loomora_front/pull/41) at `37d5dd5`.
- **Plan:**
  1. Audit live `https://loomora-craft.vercel.app` headers and inventory all Loomora asset, font, boot-style, Google OAuth, Render API, Workbox service-worker, and offline PWA requirements.
  2. Add baseline browser security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`) to root `vercel.json` on `/(.*)` while preserving the QA-013 SPA rewrite and `/sw.js` `Cache-Control: public, max-age=0, must-revalidate`.
  3. Restrict `Content-Security-Policy` to `'self'`, hash the inline boot `<style>` (`'sha256-f5dF16tVBt10PewzxCqqrvCGvvv2PnzQeGugOFK59oQ='`) instead of using `'unsafe-inline'`, and permit `https://loomora-api.onrender.com` in `connect-src`.
  4. Add RED/GREEN Vitest (`src/test/securityHeaders.test.ts`) and Playwright HTTP + Chromium (`e2e/security-headers.spec.ts`) regressions covering headers, CSP enforcement, SPA rewrites, API/missing-asset exclusions, 375 px navigation, Google OAuth, Render API calls, and offline PWA.
  5. Run full verification (`npm ci`, lint, typecheck, Knip, LF formatting, Vitest, build, phone-375 Playwright, npm audits, Redocly OpenAPI lint), mark QA-014 done, log QA-015 with live Vercel verification steps in `docs/PROGRESS.md`, and open a PR into `v2-rebuild`.
- **Done when:**
  - [x] Browser security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`) are configured in root `vercel.json`.
  - [x] CSP permits all documented Loomora functionality without `*`, `'unsafe-inline'`, or `'unsafe-eval'`, and restricts `connect-src` to `'self'` and `https://loomora-api.onrender.com`.
  - [x] Existing Vercel SPA routing, API/missing-asset 404 exclusions, `/sw.js` `Cache-Control`, mobile 375 px layout, Google OAuth flow, and offline PWA continue to work.
  - [x] Vitest (`src/test/securityHeaders.test.ts`) and Playwright (`e2e/security-headers.spec.ts`) demonstrated RED before GREEN and full verification passes; live Vercel verification steps are documented in `docs/PROGRESS.md`.
- **Files:** `vercel.json`, `playwright.config.ts`, `src/test/securityHeaders.test.ts`, `e2e/security-headers.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-016: Vercel deployment & live route verification

- **Status:** blocked
- **Owner:** antigravity
- **Source:** QA-001 / QA-002 / B-032 staging audit follow-up on `https://loomora-craft.vercel.app`.
- **Blocked on:** Owner Vercel dashboard/CLI access (`vercel` CLI has no local credentials; all preview URLs return `302` to `vercel.com/sso-api`) and explicit owner approval to update Vercel Production Branch / `VITE_API_URL` environment scoping and promote latest `v2-rebuild` (currently `98a9b79` / `Afv78XhdBNJPxbGNoqLNSeNMdMjq` + QA-018).
- **Plan:**
  1. Verify PR #41 (`37d5dd5`) merge and inspect deployment provenance across `v2-rebuild`, `main`, GitHub commit statuses, PR bot comments, and Vercel CLI/dashboard access.
  2. Probe all 13 public routes on `https://loomora-craft.vercel.app` and inspect the served JS bundle to confirm exact deployed state, missing headers, and configured API origin.
  3. Inspect `v2-rebuild` and PR preview URLs, distinguishing Vercel Deployment Protection (`302` SSO) from SPA routing or CSP behavior.
  4. Classify root cause (A/B/E vs C/D), prepare the safe owner-executed remediation and post-promotion verification plan without mutating production.
  5. Document QA-015 (`done`) and QA-016 (`blocked` pending owner execution/promotion) in `docs/TASKS.md` and `docs/PROGRESS.md`, run full verification on the isolated worktree, and open PR for planner review.
- **Done when:**
  - [x] Production deployment mismatch, exact deployed SHA (`acd5e7d` / `dpl_DV53gg1xKhSr2XbBFneDuyDy3Yge`), latest `v2-rebuild` build (`37d5dd5` / `dpl_GU1bKLwGwWE5UvEaBBfprmFZHe58`), live route HTTP results, and security header gaps are verified and documented.
  - [x] Local `37d5dd5` build, Vitest, phone-375 Playwright (`spa-routing.spec.ts`, `security-headers.spec.ts`, `pwa.spec.ts`), static checks, and audits pass.
  - [x] **2026-11-21 production verification (QA-018):** Unauthenticated HTTP and Chromium checks on `https://loomora-craft.vercel.app` confirm QA-013/QA-015/F-029 (`37d5dd5`/`077c69e` bundle: `index-Cbeen9Dj.js`, `LegalPage-B608plpI.js`) are now live — HTTP `200` on all 15+ SPA routes & reloads, all 6 security headers + CSP with zero violations, `/sw.js` `Cache-Control` + `NavigationRoute` `denylist`, `404` on `/api*` & `/assets/missing-chunk.js`, `0` console/page/installability errors. However, PR #43 (`98a9b79`, QA-017) is not live yet and Vercel project settings / SSO-protected `v2-rebuild` previews still await owner verification.
  - [ ] Owner confirms Vercel Project Settings (`Production Branch`, `Root Directory`, `Build & Output`, `Auto-assign Custom Production Domains`, `VITE_API_URL` scope, `Deployment Protection` / `Vercel Toolbar`) and approves/executes promotion of latest `v2-rebuild` (`98a9b79`+).
  - [ ] Live production verification on `https://loomora-craft.vercel.app` (and/or authenticated latest candidate) passes against the current release commit without weakening production CSP.
- **Files:** `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-017: Privacy & Terms accuracy

- **Status:** done
- **Owner:** antigravity
- **Merge:** [PR #43](https://github.com/danishsary8/Loomora_front/pull/43) at `98a9b79`.
- **Source:** QA-001 / QA-004 (outdated local-only and unavailable-account Privacy and Terms disclosures). Independent of backend B-035 (Q23 Google-only account recovery/deletion investigation).
- **Publication gate:** **BLOCKED** — Code/copy accuracy fixes are merged on `v2-rebuild`, while **QA-004** and public legal publication remain incomplete/blocked pending Danish's owner confirmations (contact details, retention/backup disclosures, live provider confirmation, effective date/jurisdiction) and Q23 resolution.
- **Plan:**
  1. Audit existing Privacy/Terms copy against frontend storage/auth/profile/feedback/PWA code and read-only `loomora_back` sources.
  2. Write failing RED Vitest (`src/features/legal/LegalPage.test.tsx`) and 375 px Playwright (`e2e/legal.spec.ts`) regression tests before changing production files.
  3. Update `src/features/legal/LegalPage.tsx` and `src/i18n/en.json` to separate Guest mode, Account mode, feedback/email/hosting/offline behavior, password deletion, and current Google-only deletion limitation without inventing unverified legal claims.
  4. Verify GREEN across static checks, Vitest, production build, phone-375 Playwright, Prettier, npm audits, OpenAPI lint, and `git diff --check`.
  5. Record the source-backed audit, RED/GREEN evidence, verification output, and remaining Q23 / QA-004 owner blockers in `docs/TASKS.md` and `docs/PROGRESS.md`.
- **Done when:**
  - [x] Verified false claims about local-only data and unavailable accounts are corrected in `src/i18n/en.json` and `src/features/legal/LegalPage.tsx`.
  - [x] Guest mode (IndexedDB/localStorage, loss risk) and account mode (API, PostgreSQL, email/Google auth, 30-day session token, guest import, feedback, Vercel/Render/Neon/Brevo, offline SW behavior) are accurately differentiated.
  - [x] Q23's current Google-only deletion restriction is stated truthfully without promising unimplemented B-035 workflows; Q23 remains open.
  - [x] RED/GREEN Vitest (`LegalPage.test.tsx`) and 375 px Playwright (`e2e/legal.spec.ts`) regressions, accessibility, i18n, and full verification checks pass.
  - [ ] **Owner / Publication blocker (QA-004):** Danish confirms operator legal name/identity, support/privacy contact email/address, governing jurisdiction, official policy effective date, server/DB/email retention & backup practices, live Vercel/Render/Neon/Brevo/Google provider disclosures, Q23 launch scope for Google-only accounts, and final legal publication approval.
- **Files:** `src/features/legal/LegalPage.tsx`, `src/i18n/en.json`, `src/features/legal/LegalPage.test.tsx`, `e2e/legal.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-018: Mobile, PWA & production quality verification

- **Status:** done
- **Owner:** antigravity
- **Merge:** [PR #44](https://github.com/danishsary8/Loomora_front/pull/44) at `d177047`.
- **Source:** QA-001 / QA-008 / F-018 / F-029 mobile responsiveness, accessibility, Lighthouse performance, PWA/offline, and live deployment verification on `v2-rebuild` (`98a9b79`).
- **Plan:**
  1. Set up isolated QA-018 worktree from `origin/v2-rebuild` (`98a9b79`, PR #43) and run read-only HTTP and Chromium checks against `https://loomora-craft.vercel.app`.
  2. Audit mobile responsiveness and accessibility across 320, 375, 768, and 1280 px viewports (screens, states, sheets, focus trap/restoration, touch targets, reduced motion, console errors).
  3. Verify PWA installability, manifest/icons, offline guest & account behavior, and two-version `autoUpdate` service-worker update behavior (Q21).
  4. Measure Lighthouse 11.7.1 mobile scores (`/` and `/today`) against the local production preview build.
  5. Fix narrowly scoped accessibility/responsiveness defects with RED → GREEN regressions, run full verification checks, and document remaining release blockers (Q21, Q23, Q25, QA-004, QA-009, QA-016).
- **Done when:**
  - [x] Live production routing, headers, CSP, SW/manifest, and deployment identity (`37d5dd5`/`077c69e` live vs `98a9b79` on `v2-rebuild`) are verified and recorded.
  - [x] Mobile responsiveness and accessibility checks at 320/375/768/1280 px complete; reproducible WCAG 2.1 Level A `label-content-name-mismatch`, 320 px `CopyDaySheet` wrap, `DayColumn` narrow column clamping, and detached-opener `Sheet` focus restoration defects fixed with RED → GREEN regressions.
  - [x] PWA installability, manifest/icons, offline guest/account behavior, and Q21 `autoUpdate` service-worker update risk verified and covered in `e2e/pwa.spec.ts` (`test.fail` for Q21 unsaved draft loss pending planner decision).
  - [x] Actual Lighthouse 11.7.1 mobile runs on `/` and `/today` recorded in `docs/PROGRESS.md` (Performance targets from F-018/F-029 remain unmet under mobile CPU throttling; documented without overclaiming).
  - [x] Lint, typecheck, Knip, LF Prettier, Vitest (`--maxWorkers=1`), build, phone-375 Playwright, npm audits, Redocly OpenAPI lint, and `git diff --check` pass.
  - [ ] **Open release blockers:** Q21 (addressed in QA-019 following planner approval), Q23 (Google-only deletion), Q25 (backend infra), QA-004 (legal owner approvals), QA-009 (paired staging integration), QA-016 (owner Vercel promotion of latest `v2-rebuild` & settings check).
- **Files:** `src/components/ui/Sheet.tsx`, `src/components/ui/Sheet.test.tsx`, `src/features/schedule/DayToggle.tsx`, `src/features/schedule/week/CopyDaySheet.tsx`, `src/features/schedule/week/DayColumn.tsx`, `src/features/today/NowNextStrip.tsx`, `src/features/today/NowNext.test.tsx`, `src/i18n/en.json`, `e2e/a11y.spec.ts`, `e2e/pwa.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-019: Safe PWA update experience

- **Status:** review
- **Owner:** antigravity
- **Source:** Planner-approved Q21 fix from QA-018 (`PR #44`, merged at `d177047`).
- **Plan:**
  1. Verify QA-018 PR #44 merge on `v2-rebuild` (`d177047`), isolate worktree `loomora-front-QA-019` on `feat/QA-019-safe-pwa-updates`, and inspect PWA config, SW registration, layouts, sheets/forms, i18n, and `e2e/pwa.spec.ts`.
  2. Write RED Vitest (`src/app/pwaUpdate.test.tsx`) and Playwright (`e2e/pwa.spec.ts`) regressions before implementing controlled updates.
  3. Switch `vite.config.ts` from `registerType: 'autoUpdate'` to `registerType: 'prompt'` and implement `usePwaUpdate` + `registerServiceWorker` (`src/app/pwaUpdate.ts`, `src/app/registerServiceWorker.ts`) with prompt deduplication, explicit-confirmation reload gating, cross-tab safe deferral, and error/timeout handling without reload loops.
  4. Build an accessible, non-blocking `PwaUpdateBanner` (`src/app/layout/PwaUpdateBanner.tsx`) in `RootLayout` using existing tokens and `en.json` i18n keys, offering **Update now** and **Later** plus explicit discard confirmation when an editable sheet or unsaved draft (`DailyIntention`, `AccountCard`, `GuestPreferencesCard`, `CopyDaySheet`, or open form) is active.
  5. Verify GREEN across Vitest, two-version Chromium `e2e/pwa.spec.ts`, full phone-375 Playwright, static checks, audits, OpenAPI lint, and `git diff --check`; update docs while keeping QA-016, QA-004, Q23, Q25, and QA-009 open.
- **Done when:**
  - [x] `vite.config.ts` uses `registerType: 'prompt'` while preserving offline precaching, `navigateFallbackDenylist`, and installability.
  - [x] New waiting SW displays a small, accessible, non-blocking i18n banner (`PwaUpdateBanner`) with **Update now** and **Later** actions and never auto-reloads open work.
  - [x] **Later** dismisses the prompt for that waiting worker and preserves open forms/drafts; **Update now** prompts for confirmation before discarding an open editable sheet or unsaved draft, and activates + reloads only after explicit user confirmation.
  - [x] Duplicate registration/update events are deduplicated, update failures/stalls transition to a recoverable error state without reload loops, and persisted guest IndexedDB + offline Today/Week flows survive.
  - [x] RED/GREEN Vitest (`src/app/pwaUpdate.test.tsx`) and two-version Chromium `e2e/pwa.spec.ts` (with Q21 `test.fail` converted to passing regression) pass alongside `npm ci`, lint, typecheck, Knip, LF Prettier, full Vitest (`--maxWorkers=1`), build, phone-375 Playwright, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check`.
  - [ ] **Remaining open blockers (out of scope):** QA-016, QA-004, Q23, Q25, QA-009.
- **Files:** `vite.config.ts`, `src/app/pwaUpdate.ts`, `src/app/pwaUpdate.test.tsx`, `src/app/registerServiceWorker.ts`, `src/app/layout/PwaUpdateBanner.tsx`, `src/app/layout/RootLayout.tsx`, `src/features/today/DailyIntention.tsx`, `src/features/profile/AccountCard.tsx`, `src/features/profile/GuestPreferencesCard.tsx`, `src/features/schedule/week/CopyDaySheet.tsx`, `src/i18n/en.json`, `e2e/pwa.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-020: Mobile Lighthouse performance

- **Status:** review
- **Owner:** antigravity
- **Source:** F-018 / F-029 mobile Lighthouse performance targets (`/` ≥ 90, `/today` ≥ 85) on `v2-rebuild` (`93959cb`).
- **Plan:**
  1. Measure the merged `origin/v2-rebuild` (`93959cb`) baseline across 3 Lighthouse 11.7.1 mobile runs each on `/` and `/today` and analyze entry bundle composition.
  2. Replace `date-fns` in `src/lib/date.ts`, `src/features/todos/todayList.ts`, and `src/features/auth/savePlanDismissal.ts` with zero-dependency local-date helpers and remove unused `date-fns`.
  3. Lazy-load `RootLayout` overlays (`PwaUpdateBanner`, `ServiceDownBanner`, `SavePlanImport`, `ReminderWatcher`, deferring `ReminderWatcher` until idle on `/`), `SavePlanSheet`, and `TodayPage` sheets (`AddTodoSheet`, `DaySheet`, `ScheduleItemSheet`), while keeping `LandingPage` in the entry bundle and consolidating tiny shared chunks via `experimentalMinChunkSize: 15_000`.
  4. Defer `registerServiceWorker()` until `window` `load` in `src/main.tsx` so Workbox registration does not compete with initial hydration.
  5. Add unit/regression tests (`src/lib/date.test.ts`, `src/app/layout/RootLayout.test.tsx`), re-measure 3x Lighthouse mobile runs on `/` and `/today`, and run full static, Vitest, Playwright `phone-375`, audit, and OpenAPI checks.
- **Done when:**
  - [x] Baseline vs final 3-run Lighthouse 11.7.1 mobile measurements recorded: `/` median **91 -> 93** (`93, 94, 93`), `/today` median **87 -> 89** (`89, 90, 89`), with A11y 100, BP 100, PWA 100 preserved.
  - [x] Entry bundle reduced from `486.02 kB` (`157.80 kB` gzip) to `436.03 kB` (`141.16 kB` gzip) and `TodayPage` chunk from `24.79 kB` (`8.49 kB` gzip) to `17.76 kB` (`6.17 kB` gzip).
  - [x] Regression tests, `npm ci`, lint, typecheck, Knip, LF Prettier, full Vitest (`--maxWorkers=1`), build, `phone-375` Playwright (`--workers=1`), `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check` pass.
  - [ ] **Remaining open blockers (out of scope):** QA-016, QA-004, Q23, Q25, QA-009.
- **Files:** `package.json`, `package-lock.json`, `vite.config.ts`, `src/main.tsx`, `src/app/pages.ts`, `src/app/routes.tsx`, `src/app/layout/RootLayout.tsx`, `src/app/layout/RootLayout.test.tsx`, `src/features/auth/SavePlanPrompt.tsx`, `src/features/auth/savePlanDismissal.ts`, `src/features/schedule/index.ts`, `src/features/today/TodayPage.tsx`, `src/features/today/NowNext.test.tsx`, `src/features/today/TodayPage.test.tsx`, `src/features/todos/todayList.ts`, `src/lib/date.ts`, `src/lib/date.test.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-021: Cross-browser and offline regression

- **Status:** review
- **Owner:** antigravity
- **Source:** Independent cross-browser, responsive (`320`/`375`/`768`/`1280` px), and offline regression verification on `origin/v2-rebuild` (`93959cb`, merged with `40ab685`).
- **Plan:**
  1. Verify `origin/v2-rebuild` (`93959cb`) in isolated worktree `loomora-front-QA-021` on `feat/QA-021-cross-browser-release-regression` without depending on QA-020.
  2. Configure `firefox-375`, `firefox-1280`, `webkit-375`, and `webkit-1280` projects in `playwright.config.ts` alongside `phone-375` and `desktop-1280`.
  3. Add `e2e/cross-browser.spec.ts` covering all 12 required scenarios across Chromium, Firefox, and WebKit and viewports `320`, `375`, `768`, and `1280` px.
  4. Run `e2e/cross-browser.spec.ts` (30/30 across 6 projects) and `e2e/a11y.spec.ts` (Firefox & WebKit route axe checks), distinguishing browser-specific capabilities/Playwright harness behavior from application defects.
  5. Document browser compatibility matrix and limitations in `docs/PROGRESS.md`, keep QA-004, QA-009, QA-016, Q23, and Q25 open, and run all required verification commands.
- **Done when:**
  - [x] `e2e/cross-browser.spec.ts` passes **30/30** across `phone-375`, `desktop-1280`, `firefox-375`, `firefox-1280`, `webkit-375`, and `webkit-1280` (`320`, `375`, `768`, `1280` px viewports).
  - [x] `e2e/a11y.spec.ts` passes **30/30** route axe-core checks across `firefox-375` and `webkit-375` (plus full `phone-375` suite).
  - [x] Browser-specific behaviors (WebKit mouse-click button focus vs keyboard focus restoration, Playwright WebKit `setOffline(true)` network-process abort before SW interception, Playwright Firefox/WebKit `online`/`offline` event dispatch) documented accurately without masking failures.
  - [x] `npm ci`, lint, typecheck, Knip, LF Prettier, Vitest (`--maxWorkers=1`), build, `phone-375` Playwright (`--workers=1`), `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check` pass.
  - [ ] **Remaining open blockers (out of scope):** QA-004, QA-009, QA-016, Q23, Q25.
- **Files:** `playwright.config.ts`, `e2e/cross-browser.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`
