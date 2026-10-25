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
- **Status:** todo
- **Steps:**
  1. Typed API client in `src/lib/api/` from `docs/openapi.yaml` (base URL from `VITE_API_URL`, bearer token, JSON error shape, 401 handling). Use MSW to mock the API in tests.
  2. Screens S10: Sign in and Sign up (email + password, "Sign in with Google" and "Sign up with Google" buttons using `intent`), the skippable sign-up survey (display name, biggest goal, how you heard), errors `account_not_found` and `account_already_exists`, forgot and reset password pages, email verification page.
  3. Token stored with expiry; auth state in a small store; protected routes.
- **Done when:**
  - [ ] Unit and component tests with MSW pass; lint, typecheck, build pass; screenshots at 375 px
- **Files:** `src/lib/api/*`, `src/features/auth/*`

### F-016: Server repositories and "Save your plan" (guest to account)
- **Status:** todo
- **Steps:**
  1. Implement `ServerTodoRepository` and `ServerScheduleRepository` over the API client. The app picks guest or server storage by auth state, with the same UI.
  2. "Save your plan" sheet (docs/04 Flow 3): shown after 3 check-offs or the first full day, dismissible, always in Profile. On success call `POST /import`, then clear guest data; on failure keep guest data and offer retry.
  3. Tests with MSW: success, failure keeps guest data, idempotent retry.
- **Done when:**
  - [ ] Tests, lint, typecheck, build pass
- **Files:** `src/lib/storage/*`, `src/features/auth/*`, `src/features/profile/*`

### F-017: Profile for accounts, feedback and delete account
- **Status:** todo
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
