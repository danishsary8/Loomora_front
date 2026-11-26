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
  - [x] Unit and component tests with MSW pass; lint, typecheck, build pass; screenshots at 375 px
- **Files:** `src/lib/api/*`, `src/features/auth/*`

### F-016: Server repositories and "Save your plan" (guest to account)
- **Status:** done
- **Steps:**
  1. Implement `ServerTodoRepository` and `ServerScheduleRepository` over the API client. The app picks guest or server storage by auth state, with the same UI.
  2. "Save your plan" sheet (docs/04 Flow 3): shown after 3 check-offs or the first full day, dismissible, always in Profile. On success call `POST /import`, then clear guest data; on failure keep guest data and offer retry.
  3. Tests with MSW: success, failure keeps guest data, idempotent retry.
- **Done when:**
  - [x] Tests, lint, typecheck, build pass
- **Files:** `src/lib/storage/*`, `src/features/auth/*`, `src/features/profile/*`

### F-017: Profile for accounts, feedback and delete account
- **Status:** done
- **Steps:**
  1. Profile (S9) for signed-in users: name, streak, sign out, feedback sheet (POST /feedback), delete account with confirmation (password or Google re-auth message).
  2. Time zone detection sent at sign-up and editable.
- **Done when:**
  - [x] Tests, lint, typecheck, build pass
- **Files:** `src/features/profile/*`

### F-018: Accessibility, performance and cleanup pass
- **Status:** done
- **Steps:**
  1. Run axe checks (jest-axe or Playwright axe) on every screen; fix issues. Check focus order, contrast, touch targets.
  2. Run Lighthouse (mobile) and record scores in `docs/PROGRESS.md`; target 90+ for Performance, Accessibility, Best practices.
  3. Add a knip (or similar) unused-code check, fix everything it reports, and add it to CI.
- **Done when:**
  - [x] CI green with the unused-code check; scores recorded
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
  - [x] Vitest: daily, weekly across a week boundary, and a check-off just after local midnight in `Asia/Phnom_Penh`; toggling twice creates one next to-do
  - [x] Playwright (375 px): create a daily to-do, check it, tomorrow's copy appears
  - [x] Lint, typecheck, test, build pass
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

- **Status:** done
- **Merge:** [PR #36](https://github.com/danishsary8/Loomora_front/pull/36) at `34b6a5a`.
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

- **Status:** done
- **Merge:** [PR #46](https://github.com/danishsary8/Loomora_front/pull/46) at `93959cb`.
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

- **Status:** done
- **Merge:** [PR #47](https://github.com/danishsary8/Loomora_front/pull/47) at `40ab685`.
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

### F-030: Google account deletion frontend

- **Status:** done
- **Merge:** [PR #45](https://github.com/danishsary8/Loomora_front/pull/45) at `00a6d01`.
- **Owner:** codex
- **Source:** Backend B-042, [PR #45](https://github.com/danishsary8/loomora_back/pull/45).
- **Scope:** Offer Google verification in Profile for Google-only accounts, require an explicit final confirmation, and clear the matching account session after HTTP 204. Preserve password deletion and guest data.
- **Verification:** See the [F-030 progress entry](PROGRESS.md#2026-11-22-f-030-google-account-deletion-frontend) for the backend contract, regression evidence, and staging checks.
- **Release gates:** Q23, Q25, QA-004, QA-009, and production approval remain open. The backend Google deletion capability defaults to disabled.

### QA-021: Cross-browser and offline regression

- **Status:** done
- **Merge:** [PR #48](https://github.com/danishsary8/Loomora_front/pull/48) at `e4e57b4`.
- **Owner:** antigravity
- **Source:** Independent cross-browser, responsive (`320`/`375`/`768`/`1280` px), and offline regression verification on `origin/v2-rebuild` (`93959cb`, merged with `00a6d01`).
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

### QA-022: Paired staging integration preparation

- **Status:** done
- **Merge:** [PR #49](https://github.com/danishsary8/Loomora_front/pull/49) at `aef8230`.
- **Owner:** codex
- **Scope:** Prepare a guarded Playwright suite for the exact frontend and API candidates. Cover auth, guest import, planner data, account isolation, and Google deletion's disabled and callback behavior. Record provider and deletion steps for an approved manual run.
- **Evidence:** [QA-022 staging evidence and runbook](QA-022-staging-evidence.md).
- **Release gates:** Live staging and provider verification are blocked pending owner approval of the disposable pair and synthetic identities. QA-009 stays blocked pending paired execution and sign-off. Q23, Q25, QA-004, and QA-016 remain open.

### F-031: Complete guest repeating to-dos at capacity

- **Status:** done
- **Merge:** [PR #50](https://github.com/danishsary8/Loomora_front/pull/50) at `b84a977`.
- **Owner:** codex
- **Scope:** Match backend decisions I4, I5, I7 and I8. Allow repeat completion to create one successor with undone subtasks in the same transaction. Keep the 500-active-item limit for manual creation and exclude soft-deleted rows.
- **Verification:** Repeat at capacity, toggle idempotence, reminder carryover, manual creation after soft deletion, and rollback on a failed write. Run the frontend static checks, unit suite, build, and phone Playwright coverage for repeats, subtasks, and reminders.
- **Evidence:** [F-031 progress and verification](PROGRESS.md#2026-11-23-f-031-complete-guest-repeating-to-dos-at-capacity).

### UX-002: Elemental Edition design decision (DEC-003, docs-only)

- **Status:** done
- **Owner:** antigravity
- **Source:** Owner approval (2026-11-23) following read-only `UX-001` Elemental Edition UI/UX audit.
- **Merge:** [PR #52](https://github.com/danishsary8/Loomora_front/pull/52) at `a45d3f6`.
- **Plan:**
  1. Fetch `origin/v2-rebuild` (`b84a977`), inspect existing unmerged local `EL-01` and `UI-01` worktrees read-only without modifying or reusing them, and branch `feat/UX-002-elemental-design-decision` in isolated worktree `loomora-front-UX-002`.
  2. Record `DEC-003` in `docs/DECISIONS.md` superseding `DEC-001`/`DEC-002` with WCAG 2.2 AA-verified Elemental Edition tokens reconciled with the `EL-01` alignment record, self-hosted Inter typography, 6 pastel category colors, safe-area rules, and single-theme / R1–R4 guardrails.
  3. Reconcile `AGENTS.md`, `CLAUDE.md`, `docs/01-product-brief.md` (`D30`), `docs/02-feature-list.md`, `docs/05-screen-map.md`, `docs/07-project-decisions.md` (`S15`/`S18`), and `docs/10-tech-and-structure.md`.
  4. Record `UX-002` in `docs/TASKS.md` and `docs/PROGRESS.md`, verify strictly docs-only diff (`git diff --check`, zero code files touched), and open a docs-only PR targeting `v2-rebuild`.
- **Done when:**
  - [x] `DEC-003` explicitly supersedes `DEC-001` and `DEC-002` with WCAG 2.2 AA contrast-verified tokens, single-theme rule, self-hosted Inter typography, iOS safe areas, and R1–R4 feature boundaries.
  - [x] `AGENTS.md`, `CLAUDE.md`, `docs/01-product-brief.md`, `docs/02-feature-list.md`, `docs/05-screen-map.md`, `docs/07-project-decisions.md`, and `docs/10-tech-and-structure.md` align with `DEC-003`.
  - [x] Existing local `EL-01` and `UI-01` worktrees inspected read-only and reported without modification; zero application code changed; `git diff --check` passes.
  - [ ] Owner shares missing raw reference assets (`LOOMORA_ELEMENTAL_*` / `LOOMORA_PREMIUM_*`) to confirm exact pastel category hexes before `UX-003`.
- **Files:** `AGENTS.md`, `CLAUDE.md`, `docs/01-product-brief.md`, `docs/02-feature-list.md`, `docs/05-screen-map.md`, `docs/07-project-decisions.md`, `docs/10-tech-and-structure.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-023: R2 guest/account parity verification

- **Status:** done
- **Merge:** [PR #51](https://github.com/danishsary8/Loomora_front/pull/51) at `b34ab8f`.
- **Owner:** codex
- **Planner-approved scope:** R2 subtasks, priority, notes, repeats, reminders, date boundaries, offline guest persistence, validation, and import and recovery within available account capacity. Includes the tested guest repeat-successor deletion fix and the 499, 500, and 501 active-row boundary cases.
- **Outstanding R2 import blocker:** Full-plan import remains blocked when repeat-generated rows exceed the request limit or available account capacity. The planner separated this work from PR #51. The existing 500-active-row manual-creation limit and failed-import recovery are preserved.
- **Backend follow-up:** [Proposed B-043](PROGRESS.md#proposed-b-043-lossless-import-of-repeat-generated-todos) covers capacity, atomicity, UUID references, retries, and lossless guest recovery. The ID is provisional pending backend assignment.
- **Evidence:** [QA-023 parity matrix](PROGRESS.md#2026-11-23-qa-023-r2-guestaccount-parity-verification) and [planner review](PROGRESS.md#2026-11-23-qa-023-planner-review).

### UX-003: Elemental Edition design foundation (tokens, typography, base styles)

- **Status:** done
- **Owner:** antigravity
- **Source:** Approved `DEC-003` (`UX-002`, PR #52 @ `a45d3f6`).
- **Merge:** [PR #53](https://github.com/danishsary8/Loomora_front/pull/53) at `ad168e8`.
- **Plan:**
  1. Branch `feat/UX-003-elemental-design-foundation` from `origin/v2-rebuild` (`a45d3f6`) in isolated worktree `loomora-front-UX-003` without touching `EL-01`, `UI-01`, `UX-002`, or Codex `QA-023`.
  2. Replace `@fontsource-variable/caveat` and `@fontsource-variable/space-grotesk` with self-hosted `@fontsource-variable/inter` (updating `knip.json`).
  3. Update `src/styles/tokens.ts`, `tailwind.config.ts`, `src/styles/index.css`, `index.html`, `vite.config.ts`, and `vercel.json` (CSP boot-style SHA-256 hash) with approved `DEC-003` colors, borders, radii, elevation, motion tokens, `scroll-padding-bottom`, and `-0.025em` display heading tracking (fixing 320 px `/` overflow), while preserving the 6 documented category hexes pending reconciliation against missing reference assets.
  4. Expand `src/styles/tokens.test.ts` for WCAG 2.2 AA text (`>= 4.5:1`) and non-text control border (`>= 3:1`) contrast, run all required checks + 320–1440 px viewport verification, and update `docs/TASKS.md`, `docs/PROGRESS.md`, and `docs/screenshots/styleguide-375.png`.
- **Done when:**
  - [x] Approved `DEC-003` palette, borders, radii, elevation, motion tokens, and self-hosted Inter variable font wired cleanly with zero duplicate token systems.
  - [x] Offline font precaching, PWA manifest theme/background (`#F7F5EF`), and `vercel.json` CSP inline boot-style SHA-256 hash verified.
  - [x] 6 documented category identities preserved without guessing unverified pastel hexes (blocker recorded pending original reference assets).
  - [x] `lint`, `typecheck`, `knip`, `format:check` (`--end-of-line auto`), full Vitest suite, `build`, `phone-375` Playwright (78/78), Redocly OpenAPI lint, `git diff --check`, and 320–1440 px zero-overflow verification pass.
- **Files:** `package.json`, `package-lock.json`, `knip.json`, `src/styles/tokens.ts`, `src/styles/tokens.test.ts`, `tailwind.config.ts`, `src/styles/index.css`, `index.html`, `vite.config.ts`, `vercel.json`, `docs/screenshots/styleguide-375.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-004: Elemental Edition shared UI primitives, unified icons & accessible sheets

- **Status:** done
- **Owner:** antigravity
- **Source:** Approved `DEC-003` (`UX-002`, PR #52) and `UX-003` foundation (PR #53 @ `ad168e8`).
- **Merge:** [PR #54](https://github.com/danishsary8/Loomora_front/pull/54) at `4544b8e`.
- **Plan:**
  1. Branch `feat/UX-004-elemental-ui-primitives` from `origin/v2-rebuild` (`ad168e8`) in isolated worktree `loomora-front-UX-004` without touching `RootLayout.tsx`, Focus logic, repositories, or Codex/retired worktrees.
  2. Migrate shared primitives (`Button`/`buttonStyles`, `Card`, `Chip`, `Checkbox`, `fieldClasses`, `Input`, `Textarea`, `ClockInput`, `ProgressRing`, `Toast`, `FloatingAddButton`, `press.ts`) to Elemental Edition (`#1D5039` forest primary, `#FCFBF8` elevated paper, `#E1E8E1` hairlines, `#7B8C82` control borders, `8/14/22 px` radii, soft elevation) while preserving all existing props, translations, behavior, and the 6 documented category hexes pending original reference assets.
  3. Unify all shared icons in `src/components/ui/icons.tsx` to `1.75 px` round-cap/round-join strokes, add reusable `SegmentedControl`, and upgrade `Sheet.tsx` with safe-area padding, `overscroll-contain`, and scoped `inert`/`aria-hidden` background locking (keeping `#root` top-level notification regions like `PwaUpdateBanner` accessible).
  4. Update `/styleguide`, primitive unit tests (`Button`, `Card`, `Input`, `Sheet`, `SegmentedControl`), `docs/screenshots/styleguide-375.png`, `docs/TASKS.md`, and `docs/PROGRESS.md`; verify all CI checks, 320–1440 px viewports, 200% text scaling, reduced motion, and touch targets.
- **Done when:**
  - [x] All shared primitives in `src/components/ui/` follow `DEC-003` with zero duplicate components or behavior changes.
  - [x] Unified `1.75 px` round-cap icons replace inconsistent icon strokes; reusable `SegmentedControl` added and tested.
  - [x] `Sheet` enforces focus trap/restoration, `aria-modal`, safe-area padding, and scoped `inert`/`aria-hidden` background blocking without interfering with `PwaUpdateBanner`.
  - [x] Clean `npm ci`, `lint`, `typecheck`, `knip`, `format:check`, full Vitest, `build`, `phone-375` Playwright (79/79), 320–1440 px sweep, 200% text scaling, reduced motion, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check` pass.
- **Files:** `src/components/ui/*`, `src/features/styleguide/StyleguidePage.tsx`, `src/i18n/en.json`, `vercel.json`, `docs/screenshots/styleguide-375.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-005: Elemental Edition app shell & navigation

- **Status:** done
- **Owner:** antigravity
- **Source:** Approved `DEC-003` (`UX-002`, PR #52), `UX-003` (PR #53), and `UX-004` (PR #54 @ `4544b8e`).
- **Merge:** [PR #56](https://github.com/danishsary8/Loomora_front/pull/56) at `87c34e0`.
- **Plan:**
  1. Branch `feat/UX-005-elemental-app-shell` from `origin/v2-rebuild` (`4544b8e`) in isolated worktree `loomora-front-UX-005` without touching `RootLayout.tsx`, `src/features/focus/*`, repositories, API clients, Dexie, or Codex worktrees.
  2. Restyle `AppLayout`, `TopBar`, `BottomNav`, `Sidebar`, `OfflineBanner`, `ServiceDownBanner`, `PwaUpdateBanner`, `PageHeading`, and `LoadingState` to Elemental Edition (frosted paper bottom nav with `1 px` `#E1E8E1` border & soft sheet shadow, `bg-primary-soft text-primary` active navigation states, semantic `warning-surface`/`warning` status banners, full iOS top/bottom/side safe areas).
  3. Add `src/app/layout/AppShell.test.tsx`, verify 320–1440 px responsive navigation, 200% text scaling, reduced motion, 375 px & 1440 px screenshots, static/security/OpenAPI checks, and full GitHub Actions CI.
- **Done when:**
  - [x] `TopBar`, `BottomNav`, `Sidebar`, `AppLayout`, status banners, `PageHeading`, and `LoadingState` follow `DEC-003` with zero behavior or route regressions.
  - [x] Full iOS safe areas (`top`, `bottom`, `left`, `right`), 320–1440 px responsive nav switching, 44 px touch targets, and 200% text scaling verified.
  - [x] Clean `npm ci`, `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, `git diff --check`, layout unit tests, and 18/18 viewport checks pass.
- **Files:** `src/app/layout/AppLayout.tsx`, `src/app/layout/TopBar.tsx`, `src/app/layout/BottomNav.tsx`, `src/app/layout/Sidebar.tsx`, `src/app/layout/OfflineBanner.tsx`, `src/app/layout/ServiceDownBanner.tsx`, `src/app/layout/PwaUpdateBanner.tsx`, `src/app/layout/AppShell.test.tsx`, `src/components/page/PageHeading.tsx`, `src/components/states/LoadingState.tsx`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-02A — Deterministic Focus Timer Core

- **Status:** done
- **Merge:** [PR #55](https://github.com/danishsary8/Loomora_front/pull/55) at `3b8611e`.
- **Owner:** codex
- **Scope:** Pure TypeScript calculations for 25/50/90-minute presets, positive whole-millisecond custom durations, countdown and stopwatch readings, pause/resume, early finish, lap splits and cumulative times, and reconstruction from supplied timing snapshots.
- **Acceptance tests:** `npm test -- src/features/focus/timerMath.test.ts` exercises the presets, numeric validation, repeated pauses and resumes, early finish, exact and missed deadlines, foreground and recovered readings, invalid and backward timestamps, and centisecond boundaries.
- **Follow-up:** Focus runtime owns lifecycle, persisted snapshots, cross-tab coordination, and finalization. Session API work follows the approved backend contract. See the [progress entry](PROGRESS.md#2026-11-23-f-r3-02a--deterministic-focus-timer-core) for open decisions.

### UX-006: Elemental Quick Add & Form Experience

- **Status:** done
- **Owner:** antigravity
- **Source:** Approved `DEC-003` (`UX-002`, PR #52), `UX-004` (PR #54), and `UX-005` (PR #56 @ `87c34e0`).
- **Plan:**
  1. Branch `feat/UX-006-elemental-quick-add` from `origin/v2-rebuild` (`87c34e0`) in isolated worktree `loomora-front-UX-006` without touching Focus logic, repositories, API clients, Dexie, or Codex worktrees.
  2. Refine `AddTodoSheet` with progressive disclosure (`More options` / active count / smart auto-open on edit and validation errors) using UX-004 shared primitives (`Input`, `Textarea`, `Chip`, `Button`, `Sheet`, `ChevronDownIcon`) while preserving subtasks, priority, notes, repeats, reminders, and translations.
  3. Refine `ScheduleForm`, `ScheduleItemSheet`, and `DayToggle` to Elemental Edition (`#1D5039` selected day pills, grouped time-range surface, initial focus on `Title`, focus-on-error for time validation).
  4. Add `AddTodoSheet.test.tsx`, update affected unit/E2E tests for progressive disclosure, verify 320–1440 px viewports and 200% text scaling, update screenshots (`today-add-sheet-375.png`, `schedule-sheet-375.png`), and open one PR targeting `v2-rebuild`.
- **Done when:**
  - [x] `AddTodoSheet`, `ScheduleForm`, `ScheduleItemSheet`, and `DayToggle` follow `DEC-003` with progressive disclosure for advanced to-do options and zero feature regressions.
  - [x] `AddTodoSheet.test.tsx` added; unit and Playwright `phone-375` E2E suites pass; 320–1440 px (`0 px` overflow) and 200% text scaling verified.
  - [x] Clean `npm ci`, `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check` pass.
- **Files:** `src/components/ui/icons.tsx`, `src/features/schedule/DayToggle.tsx`, `src/features/schedule/ScheduleForm.tsx`, `src/features/schedule/ScheduleItemSheet.tsx`, `src/features/today/AddTodoSheet.tsx`, `src/features/today/AddTodoSheet.test.tsx`, `src/features/today/TodayPage.tsx`, `src/features/today/TodayPage.test.tsx`, `src/i18n/en.json`, `e2e/a11y.spec.ts`, `e2e/offline-todos.spec.ts`, `e2e/r2-account.spec.ts`, `e2e/reminders.spec.ts`, `e2e/repeat.spec.ts`, `e2e/subtasks.spec.ts`, `vercel.json`, `docs/screenshots/today-add-sheet-375.png`, `docs/screenshots/schedule-sheet-375.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-01 — Focus session repository and API integration

- **Status:** done
- **Merge:** [PR #58](https://github.com/danishsary8/Loomora_front/pull/58) at `d18ca7d`.
- **Owner:** codex
- **Source:** Merged B-043 contract from backend PR #47 and frontend base including PR #55.
- **Acceptance:** Guest and account repositories record finished sessions, retrieve one by UUID, and list by starting local date. Millisecond precision, owner-scoped retries, and all existing guest data survive reload and schema upgrade.
- **Follow-up:** Focus runtime will allocate and persist the UUID at timer start and call the repository on finalization. Transferring guest Focus history requires an approved import policy.

### UX-007: Elemental Today Screen Refinement

- **Status:** done
- **Owner:** antigravity
- **Source:** Approved `DEC-003` (`UX-002`, PR #52), `UX-003`, `UX-004` (PR #54), `UX-005` (PR #56), and `UX-006` (PR #57 @ `e284ad6`).
- **Merge:** [PR #59](https://github.com/danishsary8/Loomora_front/pull/59) at `e6486d4`.
- **Plan:**
  1. Branch `feat/UX-007-elemental-today` from `origin/v2-rebuild` (`e284ad6`) in isolated worktree `loomora-front-UX-007` without touching Focus logic, repositories, Dexie migrations, API clients, AddTodoSheet, ScheduleForm, or Codex worktrees.
  2. Refine `TodoRow`, `DoneStamp`, and `StreakBadge` from legacy neo-brutalist thick black borders/hard shadows to Elemental Edition (`border-hairline border-border-subtle`, soft ambient elevation, `44×44 px` `border-control` action buttons, muted completed surface, semantic `danger` overdue pill, `tabular-nums`, and reduced-motion-safe celebrations).
  3. Refine `TodayPage`, `NowNextStrip`, `TodayEmpty`, and `LoadingState` visual hierarchy, spacing, typography, touch feedback, contrast on pastel category surfaces, and `motion-reduce:animate-none` skeleton behavior.
  4. Add unit tests for keyboard completion, accessible touch targets, and Elemental surfaces; verify full Vitest, Playwright `phone-375`, 6-viewport sweep (`320–1440 px`), and 200% text scaling at `375 px`; capture `today-375.png` and `today-1440.png` screenshots.
- **Done when:**
  - [x] `TodayPage`, `TodoRow`, `DoneStamp`, `StreakBadge`, `NowNextStrip`, `TodayEmpty`, and `LoadingState` follow `DEC-003` with zero feature regressions.
  - [x] Full Vitest (**714/714** across 66 files) and Playwright `phone-375` (**80/80**) pass; 320–1440 px (`0 px` overflow) and 200% text scaling at 375 px (`0 px` overflow) verified.
  - [x] Clean `npm ci`, `lint`, `typecheck`, `knip`, `prettier --check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check` pass.
- **Files:** `src/features/today/TodayPage.tsx`, `src/features/today/TodoRow.tsx`, `src/features/today/DoneStamp.tsx`, `src/features/today/NowNextStrip.tsx`, `src/features/today/TodayEmpty.tsx`, `src/features/streak/StreakBadge.tsx`, `src/components/states/LoadingState.tsx`, `src/features/today/TodayPage.test.tsx`, `src/features/streak/StreakBadge.test.tsx`, `vercel.json`, `docs/screenshots/today-375.png`, `docs/screenshots/today-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-008: Elemental Week Screen Refinement

- **Status:** done
- **Owner:** claude (CLI 2, covering for antigravity)
- **Source:** Approved `DEC-003` (`UX-002`, PR #52), `UX-004` (PR #54), `UX-005` (PR #56), `UX-006` (PR #57), and `UX-007` (PR #59 @ `e6486d4`). Planner-proposed 2026-11-24; ID confirmed unused in `docs/TASKS.md` and `docs/PROGRESS.md`.
- **Merge:** [PR #61](https://github.com/danishsary8/Loomora_front/pull/61) at `7056a4e`.
- **Scope:** Visual refinement of S6 Week only, matching the merged Elemental Today screen. Keep the mobile day strip with week overview toggle and the tablet/desktop 7-column layout (`docs/04` Flow 4, `docs/05` S6). Keep the six category meanings, every Week interaction (select day, add, edit, delete with undo, repeat weekdays, Copy day, one-day exceptions from Today), guest/account parity, offline guest behavior, and loading/empty/error states. No domain, data contract, Dexie, API, Focus, auth/import, `AddTodoSheet`, or `ScheduleForm` changes.
- **Plan:**
  1. Branch `feat/UX-008-elemental-week` from `origin/v2-rebuild` (`e6486d4`) in isolated worktree `loomora-front-UX-008` without touching other agents' worktrees.
  2. Refine the Week header (Inter heading + muted subtitle), replace the phone overview flip button with the shared `SegmentedControl` (Single day / Week overview), and present the day strip as a hairline paper rail with an `aria-current="date"` marker for today (additive optional `current` prop on `DayToggle`).
  3. Restyle `DayColumn` as Elemental day panels (Inter heading, `tabular-nums` item count, tinted today panel with a "Today" pill, dashed free-day placeholder, full-width Copy) and the schedule cards (time first in `tabular-nums`, category name in text and in the accessible name, hover elevation, reduced-motion-safe press, focus ring following the card radius).
  4. Add Week unit tests for states, keyboard use, today marker, touch targets and card visuals; run all required checks, a 6-width sweep with 200% text at 375 px, and capture `week-375.png` / `week-1440.png`.
- **Done when:**
  - [x] Week header, day strip, overview toggle, day panels, and schedule cards follow `DEC-003` with zero behavior or data changes.
  - [x] Unit tests cover loading, error + retry, empty, keyboard open/copy, today marker, touch targets, `tabular-nums` times and category text; existing Week, Copy day, edit and delete tests still pass.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check`; 320–1440 px and 200% text at 375 px show `0 px` overflow.
  - [x] Planner fix (PR #61): from 768 px the seven columns keep a `8rem` minimum and scroll inside their own focusable `Week schedule` region when the screen is narrower (768 and 1024 px); all seven fit without scrolling at 1280 and 1440 px; sidebar unchanged; regression test at 768 px with long titles.
- **Files:** `src/features/schedule/DayToggle.tsx`, `src/features/schedule/week/WeekPage.tsx`, `src/features/schedule/week/DayColumn.tsx`, `src/features/schedule/week/useHorizontalOverflow.ts`, `src/features/schedule/week/WeekPage.test.tsx`, `e2e/week.spec.ts`, `src/i18n/en.json`, `vercel.json`, `docs/screenshots/week-375.png`, `docs/screenshots/week-768.png`, `docs/screenshots/week-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-02B — Focus timer runtime and recovery

- **Status:** done
- **Merge:** [PR #60](https://github.com/danishsary8/Loomora_front/pull/60) at `5a46b68`.
- **Owner:** codex
- **Prerequisites:** F-R3-02A timer math and F-R3-01 Focus repositories are merged. B-043 supplies the finished-session API contract.
- **Scope:** Implement countdown and stopwatch lifecycle, durable recovery, cross-tab and account isolation, and idempotent finalization through the existing Focus repositories.
- **Approved behavior:** [DEC-004](DECISIONS.md#dec-004-focus-timer-runtime-and-recovery-2026-11-24).

### F-R3-03 — Elemental Focus timer interface

- **Status:** done
- **Merge:** [PR #62](https://github.com/danishsary8/Loomora_front/pull/62) at `c7bbfb2`.
- **Owner:** codex
- **Prerequisite:** F-R3-02B merged in PR #60 (5a46b68).
- **Scope:** Elemental countdown, stopwatch, phase controls and optional plan links on `/focus`. Follow DEC-003 and DEC-004.
- **Acceptance:**
  - Use the owner-scoped runtime and repositories for timer commands, recovery, finalization and retries.
  - Cover the timer controls, phase changes, end-early preservation, reloads, guest and account isolation, and offline save failures.
  - Verify 320, 375, 390, 768, 1024 and 1440 px at normal and 200% text size.
  - Offer confirmation before saving without a schedule link only when the account outbox records a definitive missing schedule. Retain the original and retry the approved replacement by UUID.
  - Run the full frontend checks and disable branch previews before opening the PR for planner review.

### QA-024: Lossless guest import frontend integration

- **Status:** done
- **Owner:** claude
- **Source:** Merged backend B-044 ([PR #48](https://github.com/danishsary8/loomora_back/pull/48) at `13c64ff`), DECISIONS I9, and the `POST /import` chunk-order contract in `docs/openapi.yaml`.
- **Scope:** Send guest to-dos in `POST /import` calls of at most 500, in the I9 order. Each repeat chain runs from its newest occurrence down to the original, and each successor's subtasks go right after its predecessor. Other to-dos are each followed by their subtasks. Schedule items, exceptions, check-ins and daily intentions keep their documented caps and dependencies. The whole guest copy stays on the device until every call succeeds.
- **Verification:** Run a fake `/import` backend that models `ImportRequest`. Cover 499/500/501 rows, 500 manual plus generated rows, multiple chains with subtasks, cross-call links, partial success then failure, replay after reload, near-capacity accounts, ownership, and unchanged small imports. Then run lint, typecheck, Knip, formatting, full Vitest, build, `phone-375` Playwright, the production audit, Redocly and `git diff --check`.
- **Decision Q-QA024-1 (planner, 2026-11-24):** Option C. A guest plan whose deleted middle occurrence leaves a successor counted as manual is a documented unsupported case. The import is refused, and all guest data is kept. Nothing is silently relinked, deleted, or changed in repeat history. See [PROGRESS](PROGRESS.md#2026-11-24-qa-024-lossless-guest-import-frontend-integration).
- **Merge:** [PR #63](https://github.com/danishsary8/Loomora_front/pull/63) at `edefad4`.
- **Files:** `src/lib/storage/guestImportOrder.ts`, `src/lib/storage/saveGuestPlan.ts`, `src/lib/storage/saveGuestPlan.test.ts`, `src/lib/storage/guestImport.test.ts`, `docs/openapi.yaml`, `docs/08-data-model.md`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-04 — Focus History & Time Tracking

- **Status:** done
- **Owner:** codex
- **Source:** F-R3-03 (PR #62), the B-043 Focus session contract, and DEC-003.
- **Merge:** [PR #64](https://github.com/danishsary8/Loomora_front/pull/64) at `f277c0f`.
- **Plan:**
  1. Add tests for the starting local date, chronological order, both modes and outcomes, and totals from unique saved records.
  2. Add a dated History section below the timer using owner-scoped repository reads, account reconnection, and refresh after saves.
  3. Use Elemental components and localized content for the total, session details, links, and loading, empty, offline, and retry states.
  4. Verify the guest and account flows, accessibility, six viewport widths and 200% text size, then run the full checks and open the review PR.

### F-R3-05 — Timer-End Sound & Mute

- **Status:** done
- **Owner:** codex
- **Source:** R3 feature list, DEC-003 and DEC-004. F-R3-04 merged in PR #64 at `f277c0f`. Task ID was unused at registration.
- **Merge:** [PR #66](https://github.com/danishsary8/Loomora_front/pull/66) at `fede106`.
- **Plan:**
  1. Test the committed expiry signal for each started countdown phase, including the long-break finalization, command races and repeat reconciliation.
  2. Route each committed expiry to the Focus tab that enabled audio. Use a short original Web Audio chime, unlocked by Focus interactions, and skip deadlines already elapsed at unlock.
  3. Add a keyboard-accessible Elemental mute toggle with an i18next label and a device-local preference.
  4. Verify audio, silent paths, browser restrictions and cross-tab delivery with automated tests. Run all required checks and the six-width and reduced-motion sweep before handing off the PR.

### UX-009: Elemental Profile & Settings Refinement

- **Status:** done
- **Merge:** [PR #65](https://github.com/danishsary8/Loomora_front/pull/65) at `a6fd1db`.
- **Owner:** claude (CLI 2)
- **Source:** Approved `DEC-003`, `UX-004` (PR #54), `UX-005` (PR #56), `UX-007` (PR #59), and `UX-008` (PR #61 @ `7056a4e`). Planner-proposed 2026-11-24; ID confirmed unused in `docs/TASKS.md` and `docs/PROGRESS.md`.
- **Scope:** Visual refinement of S9 Profile & Settings only, matching the merged Elemental Today and Week screens. Keep name, time zone and display settings editing, the streak, guest Save your plan, sign out, delete account (password and Google confirmation), feedback, and guest/account parity. No domain, data contract, Dexie, API, auth, guest import (`QA-024`), Focus, or Week changes.
- **Plan:**
  1. Branch `feat/UX-009-elemental-profile` from `origin/v2-rebuild` (`7056a4e`) in isolated worktree `loomora-front-UX-009` without touching other agents' worktrees.
  2. Add a Today/Week-style header (Inter heading + muted subtitle for guests and accounts) and order the screen as data notice, streak, settings, then grouped action rows.
  3. Give the streak its own card with loading skeleton, error + retry and offline states; move the guest "Your data" notices from the `work` category fill to the semantic warning surface.
  4. Restyle `AccountCard` and `GuestPreferencesCard` (Inter headings, wrapped email, warning-surface unverified notice, hairline-divided Display settings group, success-colored Saved status) and turn feedback, sign out and delete into 52 px Elemental settings rows (delete in danger text in its own group; sign out disabled while it runs).
  5. Add Profile unit tests for states, rows, touch targets and keyboard use, plus a Playwright Profile regression for guests and accounts (no real deletion); run all required checks, a 6-width sweep with 200% text at 375 px, and capture `profile-375.png` / `profile-1440.png`.
- **Done when:**
  - [x] Profile header, guest data notice, streak, account and display settings cards, and grouped Help / Account actions rows follow `DEC-003` with no behavior, API or data changes (Sign out is only disabled while its request runs).
  - [x] Streak loading, error + retry and offline states, and the preferences loading skeleton are covered by unit tests, together with rows, touch targets, keyboard delete-sheet access without deletion, and the one-primary-action rule. Existing Profile, deletion, feedback and time-preference tests still pass.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest (775/775), `build`, Playwright `phone-375` (90/90), `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check`. The new `e2e/profile.spec.ts` shows 0 px overflow at 320–1440 px and at 200% text, with every visible main button at least 44 px and no write requests.
- **Files:** `src/features/profile/ProfilePage.tsx`, `src/features/profile/StreakCard.tsx`, `src/features/profile/SettingsList.tsx`, `src/features/profile/AccountCard.tsx`, `src/features/profile/GuestPreferencesCard.tsx`, `src/features/profile/PreferenceFields.tsx`, `src/features/profile/ProfilePage.test.tsx`, `e2e/profile.spec.ts`, `src/i18n/en.json`, `vercel.json`, `docs/screenshots/profile-375.png`, `docs/screenshots/profile-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-010: Elemental Landing Page Refinement

- **Status:** done
- **Merge:** [PR #67](https://github.com/danishsary8/Loomora_front/pull/67) at `4de84ff`.
- **Owner:** claude (CLI 1)
- **Source:** Approved `DEC-003` (`UX-002`, PR #52) and the merged Elemental Today (`UX-007`, PR #59) and Week (`UX-008`, PR #61) screens. Planner-assigned 2026-11-24; ID confirmed unused in `docs/TASKS.md`, `docs/PROGRESS.md` and remote branches. Planner approved Option A (safe-area insets in the shared `StandalonePage`) and removing the legacy `font-script` alias once nothing references it.
- **Scope:** Visual refinement of S1 Landing only (`docs/05` S1). Keep the tagline, all existing copy, the `Try it now` → `/today` guest entry, `Sign in` → `/sign-in`, the three highlights and their category tones. No auth, API, Dexie, Focus, Profile, or guest-import changes. Landing has no data, so it has no loading, empty or error states.
- **Plan:**
  1. Branch `feat/UX-010-elemental-landing` from `origin/v2-rebuild` (`f277c0f`) in isolated worktree `loomora-front-UX-010`, and disable Vercel previews for it.
  2. Add top/bottom/left/right safe-area insets to the shared `StandalonePage` using the existing spacing scale, then check Landing, Sign in/up, Privacy, Terms and 404 for regressions.
  3. Restyle the Landing hero with `font-heading` Inter (fluid size, tight tracking), the muted no-signup note, one forest-green primary action plus a secondary Sign in, and a two-column hero/highlights composition from `md`.
  4. Refine the three highlight cards with the shared `Card` (category tones unchanged), Inter headings and the existing decorative nav icons (Week, Today, Streak) for the screens each highlight describes; then remove the unused `font-script` alias from `tokens.ts`, `tailwind.config.ts`, `index.css` and `tokens.test.ts`.
  5. Update `LandingPage` unit tests (structure, touch targets, no `font-script`) and add a Playwright landing spec (guest and sign-in routing, 0 px overflow at 320–1440 px and 200% text, axe), then run every required check and capture `landing-375.png` / `landing-1440.png`.
- **Done when:**
  - [x] Landing follows `DEC-003` with zero behavior or route changes; `font-script` is gone from source, config and tests.
  - [x] Standalone pages respect all four safe-area insets with no visual regression at normal insets.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check`; 320–1440 px and 200% text show `0 px` overflow.
- **Files:** `src/features/landing/LandingPage.tsx`, `src/features/landing/LandingPage.test.tsx`, `src/components/page/StandalonePage.tsx`, `src/styles/tokens.ts`, `src/styles/tokens.test.ts`, `src/styles/index.css`, `tailwind.config.ts`, `e2e/landing.spec.ts`, `src/i18n/en.json`, `vercel.json`, `docs/screenshots/landing-375.png`, `docs/screenshots/landing-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-011: Elemental Authentication Screen Refinement

- **Status:** done
- **Merge:** [PR #69](https://github.com/danishsary8/Loomora_front/pull/69) at `7bd5b52`.
- **Owner:** claude (CLI 1)
- **Source:** Approved `DEC-003` and the merged Elemental Profile (`UX-009`, PR #65) and Landing (`UX-010`, PR #67 @ `4de84ff`) screens. Planner-assigned 2026-11-24; ID confirmed unused in `docs/TASKS.md`, `docs/PROGRESS.md` and remote branches.
- **Scope:** Visual refinement of S10 Sign in / Sign up and the related auth screens (forgot password, reset password, verify email, the sign-up survey and the Google callback). Keep email and Google sign-in/up, password validation, verification, reset, server errors, pending states and the guest Save your plan → Sign up route. No auth contract, token, Google OAuth, API, Dexie, guest import, Focus, Landing, Profile or shared `StandalonePage` changes, and no legal/404 changes (`UX-012`).
- **Plan:**
  1. Branch `feat/UX-011-elemental-auth` from `origin/v2-rebuild` (`4de84ff`) in isolated worktree `loomora-front-UX-011`, and disable Vercel previews for it.
  2. Add an auth-only `AuthLayout` inside the unchanged `StandalonePage`: Inter heading, muted subtitle, the form on an Elemental paper `Card`, and primary-colored text links below it.
  3. Restyle `FormError` as a hairline danger notice with a new 1.75 px `AlertIcon`, and add a matching `FormSuccess`. They replace the `health` / `life` category cards used for status today, because DEC-003 keeps category colors out of status messages.
  4. Refine Sign in / Sign up (hairline "or" divider, subtitle, `aria-busy` while a request runs), then apply the layout to Forgot, Reset, Verify, Survey and the resend outcome, with pending labels on Forgot and Reset.
  5. Add unit tests and `e2e/auth.spec.ts` (mocked API: errors, navigation, keyboard, guest Save your plan → Sign up, axe, 0 px overflow at 320–1440 px and 200% text), run every required check, and capture `auth-375.png` / `auth-1440.png`.
- **Done when:**
  - [x] Auth screens follow `DEC-003` with no behavior, route, API or data changes.
  - [x] Loading, disabled, error and success states look the same across the auth screens and are covered by unit tests.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint, and `git diff --check`; 320–1440 px and 200% text show `0 px` overflow.
- **Files:** `src/features/auth/AuthLayout.tsx`, `AuthPage.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `SurveyPage.tsx`, `ResendVerification.tsx`, `FormError.tsx`, `authPresentation.test.tsx`, `src/components/ui/icons.tsx`, `src/i18n/en.json`, `e2e/auth.spec.ts`, `vercel.json`, `docs/screenshots/auth-375.png`, `docs/screenshots/auth-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-06 — Focus Presets & Full-Screen Focus View

- **Status:** done
- **Merge:** [PR #68](https://github.com/danishsary8/Loomora_front/pull/68) at `087bf51`.
- **Owner:** codex
- **Source:** R3 feature list, DEC-003, DEC-004, and merged PRs #64 and #66. Registered from `origin/v2-rebuild` at `4de84ff` after verifying the task ID was unused.
- **Planner decision:** Browser fullscreen with an in-app fallback. Screen Wake Lock is out of scope. See [PROGRESS](PROGRESS.md#2026-11-24-f-r3-06--focus-presets--full-screen-focus-view).
- **Plan:**
  1. Confirm the full-screen presentation contract with the planner and record the decision.
  2. Refine the 25, 50, 90, and Custom countdown selection using the existing configuration, Elemental styles, and i18next.
  3. Present the existing timer and essential controls in an accessible expanded view. Support browser fullscreen, in-app fallback, keyboard exit, and focus restoration.
  4. Add tests for preset selection, supported and unsupported fullscreen, exit, keyboard focus, navigation, and timer continuity through phase changes and recovery.
  5. Run the required frontend checks and verify 320, 375, 390, 768, 1024, and 1440 px widths at 100% and 200% text with reduced motion and zero horizontal page overflow.

### F-R3-07 — Focus Alarm Customization

- **Status:** done
- **Merge:** [PR #71](https://github.com/danishsary8/Loomora_front/pull/71) at `017c442`.
- **Owner:** codex
- **Source:** R3 feature list, DEC-003, DEC-004, and PR #68 merged at `087bf51`.
- **Planner decision:** Once, Repeat 3×, and Until I stop, with two seconds between plays and a two-minute cutoff. See [PROGRESS](PROGRESS.md#f-r3-07-planner-decision).
- **Plan:**
  1. Confirm the play modes, default, repeat cadence and stop behavior with the planner. Record the approved contract in PROGRESS.
  2. Add original synthesized sound choices, including the current chime, and save the selected sound, volume and play mode in browser-local preferences alongside the existing mute preference.
  3. Add keyboard-accessible Elemental controls with i18next labels and preserve access to alarm controls in expanded Focus.
  4. Apply the preferences to the existing committed-expiry audio path. Test preference persistence, mute precedence, volume, sound choices, playback counts and cancellation, browser activation, unsupported audio, recovery and cross-tab deduplication.
  5. Run the required frontend checks and verify 320, 375, 390, 768, 1024 and 1440 px at 100% and 200% text size, keyboard navigation and reduced motion.

### DOC-001 — Professional frontend README

- **Status:** done
- **Merge:** [PR #72](https://github.com/danishsary8/Loomora_front/pull/72) at `401fc8d`.
- **Owner:** claude
- **Source:** Planner prompt DOC-001. Registered from `origin/v2-rebuild` at `7bd5b52` (PR #69 merged) after verifying the task ID was unused in both task documents and in remote branches.
- **Scope:** Documentation only. Rewrite the root `README.md` and record the task here and in `docs/PROGRESS.md`. No application code, tests, dependencies, `vercel.json`, OpenAPI or legal changes.
- **Plan:**
  1. Verify the base, then read the rules, task queue, progress log, feature list, decisions and tech docs, `package.json`, routes, storage, API client, PWA, Vercel and CI configuration.
  2. Rewrite `README.md` from verified facts only: implemented versus planned features, committed Elemental Edition screenshots, the stack, the architecture, setup, environment, scripts, tests, guest and account modes, PWA and deployment, API links, roadmap and author.
  3. Describe the live deployment honestly, including that production is behind `v2-rebuild` (QA-016).
  4. Check every link, image path, script name and environment variable, run `git diff --check`, and record the planner notes in `docs/PROGRESS.md`.
- **Done when:**
  - [x] Every relative link and image in `README.md` resolves, and every external link returns HTTP 200
  - [x] Every documented script exists in `package.json`, and `VITE_API_URL` matches `.env.example` and `src/lib/api/index.ts`
  - [x] `git diff --check` passes
- **Files:** `README.md`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-012: Elemental Legal & Error Page Refinement

- **Status:** done
- **Merge:** [PR #70](https://github.com/danishsary8/Loomora_front/pull/70) at `5fe3192`.
- **Owner:** claude (CLI 2)
- **Source:** Approved `DEC-003` and the merged Elemental Landing (`UX-010`, PR #67 @ `4de84ff`). Planner-assigned 2026-11-24; ID confirmed unused in `docs/TASKS.md`, `docs/PROGRESS.md`, local and remote branches.
- **Scope:** Visual and navigation refinement of S13 only (`docs/05` S13): Privacy, Terms, Not found and the router error screen. Privacy and Terms copy stays word-for-word (no `legal.*` translation changes; QA-004 publication blockers stay open). Routes, retry behavior and data are unchanged. No auth (`UX-011`), Focus, Landing, Profile, guest-import, API or shared `StandalonePage` changes.
- **Plan:**
  1. Branch `feat/UX-012-elemental-legal` from `origin/v2-rebuild` (`4de84ff`) in isolated worktree `loomora-front-UX-012`, and disable Vercel previews for it.
  2. Legal pages: a back link to Loomora (standalone PWAs have no browser back button), the existing heading, date and intro as a header, an "On this page" contents list with in-page links, and hairline-separated sections at a ~65-character measure with relaxed leading. From `lg`, the contents list becomes a sticky side column using the existing `wide` StandalonePage option.
  3. Not found and router error: one shared Elemental recovery layout inside `StandalonePage` (safe areas, footer legal links) with a real `h1`. Not found keeps `Go to Today` and adds `Back to Loomora`; the router error keeps the friendly message (role `alert`), `Try again` (reload) as the primary action and `Go to Today`.
  4. Unit tests: every Privacy/Terms translation string is still rendered, contents links match section ids, and heading levels, actions and touch targets are correct for Not found and router error. Playwright: contents navigation and focus, back links, 404 and error recovery, 0 px overflow at 320–1440 px and 200% text, and axe.
  5. Run every required check, capture `legal-375.png` / `legal-1440.png`, and record verification in `docs/PROGRESS.md`.
- **Done when:**
  - [x] Privacy, Terms, Not found and router error follow `DEC-003` with zero route, retry, data or legal-copy changes.
  - [x] Unit and Playwright regressions cover the copy, navigation, recovery actions, accessibility, overflow and 200% text.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint and `git diff --check`.
- **Files:** `src/features/legal/LegalPage.tsx`, `src/features/legal/LegalPage.test.tsx`, `src/components/page/RecoveryPage.tsx`, `src/components/page/index.ts`, `src/app/NotFoundPage.tsx`, `src/app/NotFoundPage.test.tsx`, `src/app/layout/RouteError.tsx`, `src/app/layout/RouteError.test.tsx`, `e2e/legal.spec.ts`, `src/i18n/en.json`, `vercel.json`, `docs/screenshots/legal-375.png`, `docs/screenshots/legal-1440.png`, `docs/TASKS.md`, `docs/PROGRESS.md`

### DOC-002 — Frontend architecture documentation cleanup

- **Status:** done
- **Merge:** [PR #73](https://github.com/danishsary8/Loomora_front/pull/73) at `64408cc`.
- **Owner:** claude
- **Source:** Planner prompt DOC-002, following DOC-001 planner note 3 (`date-fns` and missing feature folders in `docs/10`). Registered from `origin/v2-rebuild` at `5fe3192` (PR #70 merged) after verifying the task ID was unused in both task documents and in local and remote branches.
- **Scope:** Documentation only: `docs/10-tech-and-structure.md`, `docs/TASKS.md` and `docs/PROGRESS.md`. No application code, tests, dependencies, backend, README or `vercel.json` changes.
- **Plan:**
  1. Branch `docs/DOC-002-frontend-architecture` from `origin/v2-rebuild` (`5fe3192`) in isolated worktree `loomora-front-DOC-002`.
  2. Verify the `date-fns` mismatch against `package.json`, `package-lock.json` and `src/`, and trace when it was removed.
  3. Update the frontend stack and folder tree in `docs/10`, and add verified sections for routing, guest and account storage, API integration, client state, PWA, tests and CI that agree with `README.md`.
  4. Keep the A8 decision table and the backend plan unchanged. Add how each A8 decision is implemented, and record unresolved questions without answering them.
  5. Check every path and anchor in `docs/10`, run `git diff --check`, and record the result in `docs/PROGRESS.md`.
- **Done when:**
  - [x] Every file path and in-page anchor in `docs/10-tech-and-structure.md` resolves in the repository
  - [x] `docs/10-tech-and-structure.md` lists no dependency that is not in `package.json`
  - [x] `git diff --check` passes
- **Files:** `docs/10-tech-and-structure.md`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-13 — Focus History account regression

- **Status:** done
- **Merge:** [PR #74](https://github.com/danishsary8/Loomora_front/pull/74) at `7390ec7`.
- **Owner:** codex
- **Source:** R3 Focus completion audit, F-R3-04, DEC-004, and the B-043 contract in `docs/openapi.yaml`. ID verified unused before branching from `origin/v2-rebuild` at `5fe3192`.
- **Plan:**
  1. Extend the existing Playwright account fixture with token-scoped Focus reads and writes.
  2. Save a stopwatch through the browser. Check the starting date, elapsed time, order, total and session identity before and after reload.
  3. Switch between the guest and two signed-in accounts in the same browser and verify each history remains separate.
  4. Control the history responses to check loading, empty, error and keyboard retry states.
  5. Run the requested verification and disable previews for this branch.

### F-R3-08 — Focus History Filters & Search

- **Status:** done
- **Merge:** [PR #76](https://github.com/danishsary8/Loomora_front/pull/76) at `f5c962c`.
- **Owner:** codex
- **Source:** Planner task brief, R3 feature list, F-R3-04, F-R3-13 and DEC-003. ID verified unused before branching from `7390ec7`.
- **Plan:**
  1. Add unit and Playwright regressions for modes, search, combined filters, empty results, offline guests, and account changes.
  2. Filter the selected day's existing display text and add localized Elemental controls and a keyboard-accessible reset. Keep the full-day total and date selection independent of the filters.
  3. Run the required checks and the full phone-375 suite, record verification, and open the review PR.

### QA-026: Frontend line-ending normalization

- **Status:** done
- **Merge:** [PR #78](https://github.com/danishsary8/Loomora_front/pull/78) at `1be0ac8`.
- **Owner:** claude
- **Source:** Windows checkouts get CRLF from the Git for Windows system setting `core.autocrlf=true`, because the frontend has no `.gitattributes` (the backend has `* text=auto eol=lf`). `npm run format:check` then fails locally on about 327 files, while Linux CI passes. The index already stores LF only. ID verified unused in both task documents, branches and GitHub.
- **Scope:** A root `.gitattributes`, `docs/TASKS.md` and `docs/PROGRESS.md` only. No source, Prettier config, global or system Git config changes, and no renormalization of existing files.
- **Plan:**
  1. Branch `fix/QA-026-frontend-line-endings` from `origin/v2-rebuild` (`f5c962c`) in isolated worktree `loomora-front-QA-026`.
  2. Add `.gitattributes` with `* text=auto eol=lf`, and mark the repository's binary types (`png`, `jpg`, `ico`) as `binary`.
  3. Confirm `git add --renormalize .` changes nothing beyond `.gitattributes` and the docs.
  4. In a fresh clone outside the workspace, with the system `core.autocrlf=true` still in effect, confirm the files check out as LF and plain `npm run format:check` passes.
  5. Run the required checks and record the evidence in `docs/PROGRESS.md`.
- **Done when:**
  - [x] A fresh Windows checkout has LF working files and plain `npm run format:check` passes.
  - [x] `git add --renormalize .` stages no file other than `.gitattributes` and the docs.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint and `git diff --check`.
- **Files:** `.gitattributes`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-025: Page heading overflow at 320 px and 200% text

- **Status:** done
- **Merge:** [PR #75](https://github.com/danishsary8/Loomora_front/pull/75) at `ce89c7f`.
- **Owner:** claude
- **Source:** UX-011 regression reported in `docs/PROGRESS.md` (UX-012 planner question): `/forgot-password` overflows by 43 px at 320 px and 200% text. Registered from `origin/v2-rebuild` at `5fe3192` (PR #70 merged) after verifying the task ID was unused in `docs/TASKS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md` and remote branches.
- **Scope:** The shared `PageHeading` and the overflow regressions only. No API, auth behavior, routing, data, copy or design-token changes.
- **Plan:**
  1. Branch `fix/QA-025-auth-heading-overflow` from `origin/v2-rebuild` (`5fe3192`) in isolated worktree `loomora-front-QA-025`.
  2. RED: `e2e/page-heading.spec.ts` checks every `PageHeading` screen at 320, 375, 390, 768, 1024 and 1440 px, at 100% and 200% text, after fonts load and layout settles: the `h1` fits its box and the page has 0 px horizontal overflow. It also checks keyboard focus on `/forgot-password` at 320 px and 200% text.
  3. Measure only after the `h1` is laid out at the requested width and text size. Chromium can report the previous layout for a few frames after a live resize and root text-size change, which is why the UX-011 page-level sweep passed intermittently.
  4. GREEN: let long words in `PageHeading` wrap with `[overflow-wrap:anywhere]`. Size, weight, tracking and font stay the same.
  5. Run every required check and record the evidence in `docs/PROGRESS.md`.
- **Done when:**
  - [x] No `PageHeading` screen overflows at 320–1440 px at 100% or 200% text after fonts load.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint and `git diff --check`.
- **Files:** `src/components/page/PageHeading.tsx`, `e2e/page-heading.spec.ts`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-11 — Stopwatch Lap Accessibility

- **Status:** done
- **Merge:** [PR #77](https://github.com/danishsary8/Loomora_front/pull/77) at `99dfaa1`.
- **Owner:** claude
- **Source:** R3 audit findings for the stopwatch (`docs/02` "Stopwatch with laps (1/100 s)"), DEC-003, DEC-004 and the B-043 limit of 1000 laps. Registered from `origin/v2-rebuild` at `64408cc` (PR #73 merged) after verifying the task ID was unused in both task documents and in local and remote branches.
- **Scope:** Focus stopwatch UI, lap tests, English translations, `docs/TASKS.md` and `docs/PROGRESS.md`. No Focus History tests, shared `PageHeading`, backend contract or unrelated feature changes.
- **Plan:**
  1. Share one `maxLaps` (1000) constant between the timer state and the UI, so the existing limit stays the single source.
  2. Mark Lap `aria-disabled` at the limit (it stays focusable with its visible focus ring), ignore further activation and describe it with a visible, localized limit note in both the normal and expanded views.
  3. Announce only the newest lap recorded in this tab through the existing polite status region, with the limit appended on the 1000th lap. Restored laps and laps recorded in another tab are not announced. While the 1000th-lap announcement is current, Lap omits its limit description until focus leaves it.
  4. Cover laps 999, 1000 and a rejected 1001st in runtime tests (guest and account scopes), FocusPage tests and Playwright (keyboard, reload, expanded view, axe, 320–1440 px at 100% and 200% text).
  5. Run the required frontend checks and record the result in `docs/PROGRESS.md`.
- **Done when:**
  - [x] Lap is disabled with an accessible, localized explanation at 1000 laps, and a 1001st attempt changes nothing.
  - [x] New laps are announced once, without announcing restored laps.
  - [x] Clean `lint`, `typecheck`, `knip`, `prettier --check`, full Vitest, `build`, Playwright `phone-375`, `npm audit --omit=dev`, Redocly OpenAPI lint and `git diff --check`.
- **Files:** `src/features/focus/FocusPage.tsx`, `src/features/focus/focusTimerState.ts`, `src/features/focus/FocusPage.test.tsx`, `src/features/focus/focusRuntime.test.ts`, `e2e/focus-laps.spec.ts`, `e2e/focus-timer.spec.ts`, `e2e/focus-presentation.spec.ts`, `src/i18n/en.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-014: Elemental Edition Final Polish, Shared ActionToast, PWA Icons & Legacy Token Cleanup

- **Status:** done
- **Merge:** [PR #81](https://github.com/danishsary8/Loomora_front/pull/81) at `a1f05d0`.
- **Owner:** antigravity
- **Source:** Full DEC-003 Elemental Edition audit on `origin/v2-rebuild` (`61373df`, PR #80). ID verified unused in `docs/TASKS.md`, `docs/PROGRESS.md`, and local/remote branches (`UX-013` is reserved for `docs/UX-013-insights-mockups`).
- **Scope:** Remove the remaining neo-brutalist UI remnants (`UndoDeleteToast`, `RootLayout` skip link, `ComingSoon` category-fill misuse, neo-brutalist orange PWA/boot icons) and delete deprecated neo-brutalist tokens (`borderWidth.thin/thick`, `shadowOffset`, `shadow`, `hard-*`, `press-*`) from `tokens.ts` and `tailwind.config.ts`. Preserves all R1–R3 behavior, guest/account parity, and `F-R3-10` worktree isolation.
- **Plan:**
  1. Branch `feat/UX-014-elemental-legacy-cleanup` from `origin/v2-rebuild` (`61373df`) in isolated worktree `loomora-front-UX-014`.
  2. Extract shared Elemental `ActionToast` in `src/components/ui/Toast.tsx` (hairline border, soft elevation, iOS safe-area bottom inset, danger tone with `AlertIcon`) and refactor both `schedule/UndoDeleteToast.tsx` and `todos/UndoDeleteToast.tsx` to use it.
  3. Migrate `RootLayout` skip-to-content link and `ComingSoon` (`/insights` placeholder) from legacy `border-thick`/`tone="work"` to Elemental Edition (`border-control border-primary`, paper `Card` + `bg-primary-soft text-primary` badge).
  4. Replace legacy neo-brutalist `#FF8A3D`/`#111111` `public/icon.svg` and `scripts/icon-maskable.svg` with Elemental forest `#1D5039` + warm ivory `#F7F5EF` icons, fix Windows `fileURLToPath` in `scripts/generate-icons.mjs`, and regenerate all 4 PNG icons via `npm run icons`.
  5. Remove deprecated `borderWidth.thin/thick`, `shadowOffset`, `shadow`, `hard-*`, and `translate.press-*` from `src/styles/tokens.ts` and `tailwind.config.ts`; add unit tests (`Toast.test.tsx`, `ComingSoon.test.tsx`, `tokens.test.ts`); run full static, Vitest, build, audit, and Playwright checks.
- **Done when:**
  - [x] Zero legacy `border-thick`, `border-thin`, `shadow-hard-*`, or neo-brutalist icon remnants remain in `src/` or `public/`.
  - [x] `ActionToast` unifies schedule and to-do undo toasts with safe-area clearance and Elemental styling; `ComingSoon` no longer uses `tone="work"`.
  - [x] `npm run lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), full Vitest (**855/855** across 77 files), and Playwright `phone-375` (`a11y`, `today`, `week`, `pwa`, `page-heading`: **32/32**) pass.
- **Files:** `src/components/ui/Toast.tsx`, `src/components/ui/Toast.test.tsx`, `src/components/ui/index.ts`, `src/features/schedule/UndoDeleteToast.tsx`, `src/features/todos/UndoDeleteToast.tsx`, `src/app/layout/RootLayout.tsx`, `src/components/page/ComingSoon.tsx`, `src/components/page/ComingSoon.test.tsx`, `src/styles/tokens.ts`, `src/styles/tokens.test.ts`, `tailwind.config.ts`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `scripts/icon-maskable.svg`, `scripts/generate-icons.mjs`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-015: Elemental Edition Visual Polish Pass

- **Status:** done
- **Merge:** [PR #82](https://github.com/danishsary8/Loomora_front/pull/82) at `6853166`.
- **Owner:** antigravity
- **Source:** Owner-approved visual audit follow-up to PR #81 (`UX-014`, merged at `a1f05d0`).
- **Scope:** Apply provisional `DEC-003` pastel category colors, stretch the desktop sidebar full page height while keeping nav sticky, tighten Today `TodoRow` density without hiding functionality, add accessible progressive disclosure for Focus alarm settings, and refine Week mobile day strip and desktop `Copy` action weight.
- **Done when:**
  - [x] Provisional `DEC-003` pastel category colors (`#E3F0FC`, `#FBF0D9`, `#E2F5EA`, `#FDE8EE`, `#EEE9FC`, `#ECE8DF`) applied in `src/styles/tokens.ts` and verified for WCAG AA contrast.
  - [x] Desktop `Sidebar` stretches full page height (`min-h-dvh self-stretch`) with sticky inner navigation.
  - [x] `TodoRow` omits redundant `Normal` baseline priority badges and tightens empty subtask affordance while keeping full touch targets and functionality.
  - [x] `FocusAlarmSettings` uses accessible `aria-expanded`/`aria-controls` progressive disclosure with collapsed summary.
  - [x] `WeekPage`/`DayToggle` strip mode removes double borders and `DayColumn` softens `Copy` to ghost weight.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Vitest, and full `phone-375` Playwright (**123/123**) pass.
- **Files:** `src/styles/tokens.ts`, `src/app/layout/Sidebar.tsx`, `src/features/today/TodoRow.tsx`, `src/features/focus/FocusAlarmSettings.tsx`, `src/features/focus/FocusPage.test.tsx`, `src/features/schedule/DayToggle.tsx`, `src/features/schedule/week/WeekPage.tsx`, `src/features/schedule/week/DayColumn.tsx`, `src/i18n/en.json`, `e2e/focus-alarm.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### UX-016: Landing & Authentication Final Polish

- **Status:** done
- **Merge:** [PR #83](https://github.com/danishsary8/Loomora_front/pull/83) at `daec9af`.
- **Owner:** antigravity
- **Source:** Owner-approved follow-up after PR #82 (`UX-015`, merged at `6853166`).
- **Scope:** Apply the Elemental forest brand mark consistently to Landing and Auth headers, refine Landing typography/spacing/CTA hierarchy, add a decorative Google "G" mark to `GoogleButton`, and refine Auth card elevation, divider, and link hierarchy while preserving all auth flows and accessibility.
- **Done when:**
  - [x] Elemental forest `BrandMark` and `GoogleIcon` added in `src/components/ui/icons.tsx` and applied to `LandingPage`, `AuthLayout`, and `GoogleButton`.
  - [x] Landing and Auth typography, spacing, CTA rhythm, and link underline weight refined with zero auth behavior changes.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Vitest, full `phone-375` Playwright (**123/123**), and 375 px / 1440 px visual checks pass.
- **Files:** `src/components/ui/icons.tsx`, `src/features/landing/LandingPage.tsx`, `src/features/landing/LandingPage.test.tsx`, `src/features/auth/AuthLayout.tsx`, `src/features/auth/GoogleButton.tsx`, `src/features/auth/SignInForm.tsx`, `src/features/auth/authPresentation.test.tsx`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-14: Focus History Delete + Undo

- **Status:** done
- **Merge:** [PR #84](https://github.com/danishsary8/Loomora_front/pull/84) at `2087660`.
- **Owner:** antigravity
- **Source:** Merged backend B-046 (`DELETE /focus-sessions/{focusSession}`, `POST /focus-sessions/{focusSession}/restore`, backend PR #54 @ `6a8fb15`) and `DEC-003` Elemental Edition.
- **Scope:** Sync B-046 into `docs/openapi.yaml`, implement Focus session soft-delete and 7-day restore parity in `focusSessionsApi`, `GuestFocusSessionRepository`, and `ServerFocusSessionRepository`, add an accessible per-row Delete action with Elemental confirmation `Sheet` and shared `ActionToast` Undo, and cover deletion, Undo, expired 410 restoration, errors, double submissions, auth boundaries, and guest/account parity.
- **Done when:**
  - [x] `docs/openapi.yaml` synced with merged B-046 contract (`DELETE /focus-sessions/{focusSession}` and `POST /focus-sessions/{focusSession}/restore`).
  - [x] Guest and account repositories share identical soft-delete, 7-day restore deadline (`410`), `404` on deleted reads, repeat-delete deadline retention, and session-generation boundary rules.
  - [x] `FocusHistory` deletes after 204/Dexie confirmation, updates daily total immediately while preserving active filters, and restores via shared `ActionToast` Undo.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Vitest, and full `phone-375` Playwright (**125/125**) pass.
- **Files:** `docs/openapi.yaml`, `src/lib/api/focusSessions.ts`, `src/lib/storage/FocusSessionRepository.ts`, `src/lib/storage/GuestFocusSessionRepository.ts`, `src/lib/storage/ServerFocusSessionRepository.ts`, `src/lib/storage/db.ts`, `src/lib/storage/focusSessions.test.ts`, `src/components/ui/Toast.tsx`, `src/components/ui/Sheet.tsx`, `src/features/focus/useFocusHistory.ts`, `src/features/focus/useFocusHistoryDelete.ts`, `src/features/focus/FocusHistory.tsx`, `src/features/focus/FocusHistory.test.tsx`, `src/features/focus/focusRuntime.test.ts`, `src/i18n/en.json`, `e2e/focus-history.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R3-15: Guest Focus History Import Integration

- **Status:** done
- **Merge:** [PR #85](https://github.com/danishsary8/Loomora_front/pull/85) at `9fb692b`.
- **Owner:** antigravity
- **Source:** Merged backend B-049 (`POST /import` `focus_sessions`, backend PR #53) and merged frontend PR #84 (`F-R3-14` at `2087660`). Task ID verified unused before registration.
- **Scope:** Sync merged backend `docs/openapi.yaml` (B-049 + B-047), extend `GuestFocusSessionRepository`, `GuestStorage`, `ImportBody`, and `saveGuestPlan` to migrate active non-deleted guest Focus sessions in dependency-ordered batches of up to 500 sessions while preserving canonical payloads, original UUIDs, idempotent retries, concurrent-edit protection, and account isolation.
- **Done when:**
  - [x] `docs/openapi.yaml` synced from merged backend `v2-rebuild` (B-049 `POST /import` `focus_sessions` + `409`, B-047 `GET /stats/summary`).
  - [x] Eligible non-deleted guest Focus sessions are imported in dependency order (after or alongside their linked to-do / schedule item) in batches of at most 500 sessions using `canonicalFocusPayload`.
  - [x] Local guest Focus sessions (and all other guest records) are retained until every import batch succeeds; soft-deleted sessions are excluded from import and cleaned up only after full success; stale links to deleted guest items are cleared without dropping the session.
  - [x] Unit/integration tests cover 499/500/501 boundaries, cross-chunk linked to-dos, schedule links, stopwatch laps, deleted sessions, 409 conflicts, failed later batches + reload replay, concurrent edits, and session-switch isolation; Playwright `phone-375` covers guest-to-account migration with retry.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, Vitest, and full `phone-375` Playwright pass.
- **Files:** `docs/openapi.yaml`, `src/lib/api/types.ts`, `src/lib/storage/GuestFocusSessionRepository.ts`, `src/lib/storage/saveGuestPlan.ts`, `src/app/AppProviders.tsx`, `src/test/importBackend.ts`, `src/lib/storage/focusImport.test.ts`, `src/lib/storage/saveGuestPlan.test.ts`, `src/lib/storage/guestImport.test.ts`, `src/lib/storage/dailyIntentionStorage.test.ts`, `src/features/auth/savePlan.test.tsx`, `e2e/focus-import.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R4-02: Notes (Standalone & Schedule-Attached)

- **Status:** done
- **Merge:** [PR #87](https://github.com/danishsary8/Loomora_front/pull/87) at `a76d95d`.
- **Owner:** antigravity
- **Source:** Merged backend B-048 (`/notes`, `/notes/{note}`, `/notes/{note}/restore`, `POST /import` `notes`, backend PR #52) and `DEC-003` Elemental Edition. Task ID verified unused before registration.
- **Scope:** Sync merged backend `docs/openapi.yaml`, implement `notesApi`, Dexie v11 `notes` store, `GuestNoteRepository` & `ServerNoteRepository` (B-048 validation, 7-day soft-delete/restore with 410 expiry, 409 conflict, occurrence-date clearing), guest-to-account migration in `saveGuestPlan` (500-note chunks alongside F-R3-15 Focus sessions, stale deleted schedule-block link clearing, idempotent retry), Elemental `/notes` page (`NotesPage`, `NoteSheet`, `TopBar` shortcut, search/filter, deleted parent badge, confirmation Sheet + `ActionToast` Undo, loading/empty/error/retry/offline states).
- **Done when:**
  - [x] Guest and account repositories share identical validation, standalone and schedule-block (+ optional occurrence date) attachment, soft-delete, 7-day restore (`410`), and deleted-parent resilience.
  - [x] `saveGuestPlan` migrates active guest notes in 500-note batches after/alongside schedule items and alongside F-R3-15 Focus sessions, clears stale links to deleted guest blocks, excludes soft-deleted notes, and retains local data on failure.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, Vitest, and full Playwright `phone-375` pass.
- **Files:** `docs/openapi.yaml`, `src/features/notes/*`, `src/lib/api/notes.ts`, `src/lib/api/types.ts`, `src/lib/api/index.ts`, `src/lib/storage/db.ts`, `src/lib/storage/NoteRepository.ts`, `src/lib/storage/GuestNoteRepository.ts`, `src/lib/storage/ServerNoteRepository.ts`, `src/lib/storage/noteContext.ts`, `src/lib/storage/saveGuestPlan.ts`, `src/lib/storage/notes.test.ts`, `src/app/AppProviders.tsx`, `src/app/pages.ts`, `src/app/routes.tsx`, `src/app/layout/TopBar.tsx`, `src/components/ui/icons.tsx`, `src/i18n/en.json`, `e2e/notes.spec.ts`, `e2e/focus-recovery.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R4-01: Insights, Analytics, Weekly Recap & Plan vs Reality

- **Status:** done
- **Merge:** [PR #86](https://github.com/danishsary8/Loomora_front/pull/86) at `16adadc`.
- **Owner:** antigravity
- **Source:** Merged backend B-047 (`GET /stats/summary`, backend PR #51) and `DEC-003` Elemental Edition. Task ID verified unused before registration.
- **Scope:** Sync merged backend `docs/openapi.yaml` and shared `stats-summary-cases.json` fixture, implement guest/account parity for B-047 analytics (`useStatsSummary` + `computeGuestStatsSummary` + `GuestFocusSessionRepository.listForRange`), build the Elemental `/insights` dashboard with range selector (Week with Previous/Next navigation respecting `week_starts_on`, 7d, 30d, 90d within the 92-day cap), Overview & Streak summary (using `GET /streak` without fabricating historical streak timelines), Weekly Recap (partial/empty weeks), Plan vs Reality (to-dos, schedule, linked vs unplanned focus, countdown vs stopwatch), Daily Breakdown, and loading/empty/error/retry/offline states. Remove unused `ComingSoon`.
- **Done when:**
  - [x] `computeGuestStatsSummary` matches the shared backend `stats-summary-cases.json` fixture identically, enforces the 92-day limit, excludes deleted records, and applies timezone rules for `done_at`.
  - [x] `/insights` renders Overview, Weekly Recap, Plan vs Reality, and Daily Breakdown in Elemental Edition with full i18next localization, guest/account parity, and loading/empty/error/retry/offline states.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, Vitest, and Playwright `phone-375` (including `e2e/insights.spec.ts`, axe, 320–1440 px, and 200% text) pass.
- **Files:** `docs/openapi.yaml`, `src/features/insights/fixtures/stats-summary-cases.json`, `src/features/insights/computeStatsSummary.ts`, `src/features/insights/computeStatsSummary.test.ts`, `src/features/insights/useStatsSummary.ts`, `src/features/insights/InsightsPage.tsx`, `src/features/insights/InsightsPage.test.tsx`, `src/lib/api/types.ts`, `src/lib/api/account.ts`, `src/lib/api/index.ts`, `src/lib/storage/GuestFocusSessionRepository.ts`, `src/lib/storage/ServerStreakRepository.ts`, `src/features/streak/streak.ts`, `src/components/page/index.ts`, `src/app/routes.test.tsx`, `src/i18n/en.json`, `e2e/insights.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### F-R4-03: Historical Streak Timeline Integration

- **Status:** done
- **Merge:** [PR #88](https://github.com/danishsary8/Loomora_front/pull/88) at `5c15812`.
- **Owner:** codex
- **Source:** Frontend PR #86 and backend B-051 PR #56, both merged into their respective v2-rebuild branches.
- **Scope:** Sync B-051 OpenAPI, reconstruct historical streaks for guests, and display the opening and daily values in Elemental Insights.
- **Done when:**
  - [x] Guests and accounts show opening and daily streaks with the same local-date, check-in, planning, deletion, current-day, and 400-day lookback semantics.
  - [x] Positive lower bounds have explicit translated labels, exact values display their count, and existing Insights states and current/longest streak metrics are preserved.
  - [x] Regression tests cover guest/account parity and the history UI, including offline guest reads.

### UX-017: Post-Merge Visual Polish for Insights, Notes & Offline Banners

- **Status:** done
- **Merge:** [PR #89](https://github.com/danishsary8/Loomora_front/pull/89) at `1c4e850`.
- **Owner:** antigravity
- **Source:** Post-merge visual QA audit of `F-R4-01` (PR #86, `16adadc`) and `F-R4-02` (PR #87, `a76d95d`); reconciled with merged `F-R4-03` (PR #88, `5c15812`). Task ID verified unused across `docs/` and branches (`F-R4-03` remains Codex's historical streak task).
- **Owner decisions recorded:**
  - **P2-4 (Desktop Notes Navigation) — Resolved by owner decision:** Keep Notes in the top-right `TopBar` toolbar on desktop; do not add Notes to desktop `Sidebar` or change the 4 mobile `BottomNav` tabs.
  - **Explicit exclusions:** No historical streak changes (Codex `F-R4-03` preserved untouched), no break-time metrics on Insights, no new features.
- **Scope:**
  - **P1-1 (`/notes`):** Show a single deep forest green `New note` primary CTA in empty state; hide creation when account notes cannot load or save while preserving guest offline creation.
  - **P1-2 (`/insights`):** Use a balanced 2×2 KPI overview grid (`grid-cols-2`) across 375 px mobile and desktop so `Weekly recap` sits above the fold on mobile and durations (`1 hr 45 min`) stay single-line on desktop.
  - **P1-3 (`/insights`):** Use i18next pluralization (`_one`/`_other`) for Daily Breakdown `to-do`/`to-dos`, `block`/`blocks`, and `showingActiveOnly`.
  - **P1-4 (`/notes`):** Localize occurrence dates in attachment badges via `Intl.DateTimeFormat` and use `rounded-md` wrapping for narrow screens.
  - **P2-1 & P2-2 (`/notes`):** Align mobile `Notes` heading and `New note` button on one row; pair `Edit` (`PencilIcon`) and `Delete` (`TrashIcon`) as matching 44×44 bordered icon buttons.
  - **P2-3 (Shell):** Hide `ServiceDownBanner` and pause `/health` polling while offline (`!online`), re-checking `/health` on reconnect.
- **Done when:**
  - [x] P1-1..P1-4 and P2-1..P2-3 implemented with zero changes to historical streak or desktop Sidebar/BottomNav navigation.
  - [x] Vitest (`InsightsPage`, `computeStatsSummary`, `NotesPage`, `ServiceDownBanner`, `i18n`) and Playwright `phone-375` (`insights`, `notes`, `a11y`, `page-heading`) pass with 0 axe violations and 0 px overflow at 320–1440 px and 200% text.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, and before/after 375 px & 1440 px visual checks pass.
- **Files:** `src/features/notes/NotesPage.tsx`, `src/features/notes/NotesPage.test.tsx`, `src/features/insights/InsightsPage.tsx`, `src/features/insights/InsightsPage.test.tsx`, `src/app/layout/ServiceDownBanner.tsx`, `src/app/layout/ServiceDownBanner.test.tsx`, `src/i18n/en.json`, `e2e/notes.spec.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-027: Fail-Closed Guest Import Containment

- **Status:** done
- **Merge:** [PR #90](https://github.com/danishsary8/Loomora_front/pull/90) at `a546794`.
- **Owner:** codex
- **Priority:** P1
- **Scope:** Validate all import batch acknowledgments and retain the complete guest plan when a response is invalid or a skipped Note cannot be verified against the account copy.
- **Verified behavior:** Acknowledged imports and matching Note retries can finish. Partial failure and subsequent divergent Notes, missing or invalid counts, failed requests, and session changes leave local records intact.
- **Open backend-first follow-up:** Revision-aware Notes reconciliation remains blocked. Existing aggregate skip counts do not identify a row or its version. This task only verifies the Note content and attachment from existing account reads and leaves divergent copies in place.

### QA-028: Atomic Guest Notes Mutations

- **Status:** done
- **Merge:** [PR #91](https://github.com/danishsary8/Loomora_front/pull/91) at `2f5d56b`.
- **Owner:** antigravity
- **Source:** Codex R1–R4 integration audit P1 finding (concurrent update + delete on a guest note could both succeed and resurrect the deleted note because `GuestNoteRepository.update()` read and wrote in separate IndexedDB transactions); reconciled with merged `QA-027` (PR #90, `a546794`). Task ID verified unused across `docs/` and branches (`QA-027` remains Codex's guest import containment task).
- **Scope:** Notes CRUD transaction atomicity in `GuestNoteRepository.ts` (`create`, `update`, preserving `delete` and `restore` atomicity; leaving `clearImported()` and `saveGuestPlan.ts` untouched for `QA-027`) and deterministic two-instance concurrency regression tests in `src/lib/storage/notes.test.ts`.
- **Done when:**
  - [x] `GuestNoteRepository.update()` and `create()` run read, validation, deletion/conflict check, schedule-block lookup, and write within a single Dexie `'rw'` transaction over `db.notes` and `db.schedule_items` with zero non-IDB async calls inside the transaction.
  - [x] Updating a deleted note returns 404; repeated delete preserves original 7-day deadline; expired restore returns 410; stale concurrent updates can never resurrect a deleted note.
  - [x] Deterministic two-instance concurrency tests cover update/delete (both orders, standalone and schedule-attached), update/restore (both orders), and disjoint concurrent updates (no lost updates).
  - [x] `lint`, `typecheck`, `knip`, `format:check`, full `npm test`, `npm run build`, full Playwright `phone-375`, Redocly OpenAPI lint, and `git diff --check` pass.
- **Files:** `src/lib/storage/GuestNoteRepository.ts`, `src/lib/storage/notes.test.ts`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-009-PREP: Staging QA Matrix & Release Readiness Preparation (docs-only)

- **Status:** done
- **Merge:** [PR #92](https://github.com/danishsary8/Loomora_front/pull/92) at `756f584`.
- **Owner:** antigravity
- **Parent gate (`QA-009`):** **BLOCKED / NOT EXECUTED** — no staging tests have been run, no live services touched, and the release is NOT declared ready.
- **Scope:** Documentation-only preparation extending [QA-022 paired staging evidence and runbook](QA-022-staging-evidence.md) to the full merged R1–R4 baseline (`2f5d56b`, including `QA-027` and `QA-028`) with a reproducible 9-scenario staging QA matrix (`STG-01`–`STG-09`), release evidence & rollback readiness checklist, and explicit separation of automated local/CI checks, pending manual staging checks, owner gates (`QA-016`, `QA-004`, `Q23`, `Q25`, `QA-022` disposable pair), and active blockers (`QA-029` streak consistency — now resolved in PR #93 — and backend revision-aware Notes reconciliation).
- **Done when:**
  - [x] Reproducible staging QA matrix (`docs/QA-009-staging-matrix.md`) defines prerequisites, synthetic data, execution steps, expected results, redacted evidence, and pass/fail criteria for all R1–R4 flows.
  - [x] Release evidence checklist covers deployed frontend/backend SHAs, OpenAPI parity, staging origin/CORS/CSP, environment separation, migrations, health checks, rate limits, log redaction, and rollback readiness.
  - [x] `QA-009` remains explicitly **blocked / not executed** with zero staging cases falsely marked passed.
  - [x] Strictly docs-only diff; links, formatting, and `git diff --check` pass.
- **Files:** `docs/QA-009-staging-matrix.md`, `docs/TASKS.md`, `docs/PROGRESS.md`

### QA-029: Guest Current Streak Consistency

- **Status:** done
- **Merge:** [PR #93](https://github.com/danishsary8/Loomora_front/pull/93) at `257938f`.
- **Owner:** codex (handed off to claude for verification)
- **Priority:** P2
- **Scope:** Match B-051's inclusive 400-preceding-local-day window using one evaluator for guest current and historical streak values.
- **Regression coverage:** Audit reproduction, inclusive cutoff, local-midnight completion bucketing, today and historical parity, deleted records, and existing planned-day and schedule-exception rules.

### F-R4-04: Notes Import Diagnostics Integration (B-052)

- **Status:** done
- **Merge:** [PR #95](https://github.com/danishsary8/Loomora_front/pull/95) at `6f4ba00`.
- **Owner:** antigravity
- **Source:** Merged backend B-052 (`POST /import` `notes.skipped_details`, backend PR #57 at `259cf90`). Task ID verified unused before registration (`F-030` was already assigned to Google account deletion frontend, PR #45).
- **Scope:** Sync merged backend `docs/openapi.yaml` (`259cf90`), type and strictly validate `notes.skipped_details` in `createAccountDataApi.importGuestData` and `saveGuestPlan` (exact skipped count, valid UUIDs, case-insensitive uniqueness, membership in submitted batch, allowed statuses `identical | different | deleted`, no unexpected properties), remove the legacy paginated `GET /notes` verification walk, accept explicit `identical` skipped Notes, fail closed (`502`) on missing/malformed/inconsistent diagnostics (including older servers), and raise `GuestNoteImportConflict` while retaining the complete guest plan for `different`, `deleted`, or mixed statuses without overwriting or restoring account Notes.
- **Done when:**
  - [x] `docs/openapi.yaml` synced byte-for-byte from merged backend B-052 (`259cf90`) and passes Redocly lint.
  - [x] `notes.skipped_details` is validated against the submitted batch; missing, malformed, duplicate, foreign, or count-mismatched diagnostics fail closed (`502`) and retain the full guest plan.
  - [x] `identical` skipped Notes succeed without calling `GET /notes`; `different`, `deleted`, and mixed statuses raise `GuestNoteImportConflict` and retain all guest data without overwriting or restoring account Notes.
  - [x] Unit/integration tests cover all statuses, mixed statuses, malformed/missing/duplicate/foreign/count-mismatch diagnostics, multi-chunk partial failures, and zero unnecessary `GET /notes` calls.
  - [x] `lint`, `typecheck`, `knip`, `format:check`, Vitest, `build`, `npm audit --omit=dev`, Redocly OpenAPI lint, Playwright `phone-375`, and `git diff --check` pass.
- **Files:** `docs/openapi.yaml`, `src/lib/api/types.ts`, `src/lib/api/account.ts`, `src/lib/storage/saveGuestPlan.ts`, `src/test/importBackend.ts`, `src/lib/storage/notes.test.ts`, `src/features/auth/savePlan.test.tsx`, `vercel.json`, `docs/TASKS.md`, `docs/PROGRESS.md`
