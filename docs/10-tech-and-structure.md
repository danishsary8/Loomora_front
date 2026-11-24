# Loomora: Tech Decisions and Repo Structure (A8, v1.1)

v1.0 was the plan written before coding. v1.1 (DOC-002, 2026-11-25) updates the frontend sections to the implemented app on `v2-rebuild` at `5fe3192`. The A8 decisions are unchanged. The backend sections are the original plan and were not re-verified (see [Open questions](#open-questions)).

## Stack
**Frontend** (`Loomora_front`, hosted on Vercel): React 18, Vite 7, TypeScript (strict), Tailwind CSS 3, React Router 7, TanStack Query 5 (server data), Zustand 5 (small client state), Dexie 4 (IndexedDB for guest data), vite-plugin-pwa with Workbox, i18next and react-i18next (English now, Khmer later), Framer Motion (stamp and sheet animations), self-hosted Inter (`@fontsource-variable/inter`, DEC-003), Vitest + Testing Library + jsdom + fake-indexeddb + MSW (unit and component tests), Playwright + axe-core (end-to-end and accessibility), ESLint + Prettier + Knip (lint, format, unused code). Node 22 or newer (`engines` in `package.json`).

Date handling uses no library. `date-fns` was in the v1.0 plan and installed by F-001, then removed by QA-020 to shrink the entry bundle. Calendar dates are `YYYY-MM-DD` strings handled by native helpers in `src/lib/date.ts`. Time formatting and time zones use `Intl` in `src/lib/time/time.ts`, `src/lib/date.ts` and `src/features/reminders/reminderTime.ts`.

**Backend** (`loomora_back`, hosted on Render, Docker): Laravel 12, PHP 8.3, PostgreSQL on Neon (direct, non-pooled connection), Sanctum, Socialite (Google), Pest (tests), Laravel Pint (style), Brevo (email via API or SMTP), Sentry optional later.

**CI** (GitHub Actions, both repos): lint, type check, tests on every PR. Merging needs green checks. The frontend workflow is described under [Tests and CI](#tests-and-ci).

## Decisions (ADR short form)
| # | Decision | Why |
|---|---|---|
| A8-1 | Bearer tokens, not cookies | The frontend and API sit on different domains on free hosting |
| A8-2 | UUID primary keys | Guest data keeps ids when imported |
| A8-3 | Computed Overdue and streak, no cron | Free tier has no reliable scheduler |
| A8-4 | Guest data in IndexedDB (Dexie) | More space than localStorage and structured |
| A8-5 | Same data shapes for guest and server | One set of types and one set of UI code; a storage adapter hides where data lives |
| A8-6 | OpenAPI file in docs | Clear contract for both repos |
| A8-7 | Fixed 6 categories as a string enum | Simple, consistent colors |
| A8-8 | Client sends local date and time zone | Correct "today" for every user |

### How the frontend implements them (verified 2026-11-25)
| # | Where |
|---|---|
| A8-1 | `src/lib/api/client.ts` sends `Authorization: Bearer <token>`. The token lives in `localStorage` (`src/lib/api/tokenStorage.ts`). |
| A8-2 | `src/lib/id.ts` creates client UUIDs. Guest rows keep them through the import (`src/lib/storage/saveGuestPlan.ts`). |
| A8-3 | Overdue: `src/features/todos/todayList.ts`. Streak: `src/features/streak/streak.ts` (guest) and `GET /streak` (account). |
| A8-4 | `src/lib/storage/db.ts` (`GuestDatabase`, IndexedDB name `loomora-guest`). |
| A8-5 | The "storage adapter" is a set of repository interfaces with guest and server implementations, chosen per session in `src/app/AppProviders.tsx`. See [Data and storage](#data-and-storage). |
| A8-6 | `docs/openapi.yaml`, a copy of the backend's file. |
| A8-7 | `Category` and its colors in `src/styles/tokens.ts` (DEC-003), used by `src/features/todos/types.ts`. |
| A8-8 | Day reads send `?date=YYYY-MM-DD` (`src/lib/api/todos.ts`, `schedule.ts`, `account.ts`). Sign-up and Google sign-in send the device time zone (`src/features/auth/timezone.ts`, `src/lib/api/auth.ts`), and Profile can change it (`PATCH /me`). |

## Backend structure (loomora_back)
Original v1.0 plan, not re-verified by DOC-002.
```
app/Http/Controllers/Api/V1/   one controller per area
app/Http/Requests/             validation
app/Http/Resources/            JSON shapes
app/Models/                    User, Todo, ScheduleItem, ScheduleException, ScheduleCheckin, Feedback
app/Services/                  ScheduleService (occurrences, now/next), StreakService, ImportService
database/migrations/           one per table
routes/api.php                 /api/v1 routes
tests/Feature/ tests/Unit/     Pest tests
docs/                          planning docs, openapi.yaml
legacy/                        old code, reference only, deleted at the end of R1
```

## Frontend structure (Loomora_front)
```
src/
  main.tsx              entry: i18n, styles and App; registers the service worker after `load`
  app/                  App, AppProviders (repositories by session), routes.tsx, pages.ts (lazy pages),
                        queryClient, PWA update store and registration, NotFoundPage
    layout/             RootLayout, AppLayout, BottomNav (phone), Sidebar (wide), TopBar, banners
                        (offline, service down, PWA update), RouteError
  components/
    ui/                 Elemental primitives (DEC-003): Button, Card, Sheet, Chip, Checkbox, Input,
                        Textarea, Field, ClockInput, SegmentedControl, ProgressRing, Toast,
                        FloatingAddButton, icons
    page/               PageHeading, StandalonePage, RecoveryPage, ComingSoon
    states/             LoadingState, EmptyState, ErrorState
  features/
    today/              Today screen, Now/Next strip, day sheet, add sheet, daily intention, stamp
    todos/              to-do types, Today-list rules, repeat rules, hooks, undoable delete
    schedule/           schedule types, occurrences, item sheet, hooks
      week/             Week screen, day columns, copy day
    streak/             streak rules, badge, hook
    reminders/          in-app reminder watcher and banner
    focus/              timer math, runtime and recovery, Focus page, history, alarm sound and settings
    auth/               sign in/up, survey, password reset, email verification, Google callback,
                        route guards, guest plan import ("save your plan")
    profile/            Profile, preferences, feedback, delete account, Google deletion
    landing/            `/` landing page
    legal/              Privacy and Terms
    insights/           `/insights` placeholder (R4 not built)
    styleguide/         `/styleguide` component gallery
  lib/
    api/                typed API client, session store, endpoint modules, errors, service status
    storage/            repository interfaces, guest (Dexie) and server implementations, contexts,
                        Dexie schema, guest import
    time/               12 h / 24 h format and week start preferences
    date.ts id.ts cn.ts useOnlineStatus.ts
  i18n/                 i18next setup, en.json
  styles/               tokens.ts, index.css (Tailwind layers)
  test/                 Vitest setup, API mocks, render helpers, config guard tests
e2e/                    Playwright specs and local API fixtures (`local-api.ts`)
  staging/              approval-gated suite for a paired staging deployment
docs/                   planning docs, decisions, task queue, progress log, openapi.yaml, screenshots
public/                 PWA icons
scripts/                icon generation
legacy/                 the previous app, reference only (ignored by ESLint, Prettier and Knip)
```

Path alias: `@/` points to `src/` (`vite.config.ts`, `tsconfig.app.json`).

## Routing
Routes are in `src/app/routes.tsx`. Every page except Landing is lazy-loaded from `src/app/pages.ts`.

| Group | Paths | Notes |
|---|---|---|
| Standalone | `/auth/google/deletion/callback` | Outside `RootLayout`. Excluded from the service worker fallback and SPA rewrite |
| Public | `/`, `/privacy`, `/terms`, `/styleguide` | Inside `RootLayout` |
| App shell (`AppLayout`) | `/today`, `/week`, `/focus`, `/insights`, `/profile` | Bottom nav on phones, sidebar on wide screens. Guests and accounts both use it |
| Signed out only (`RedirectIfSignedIn`) | `/sign-in`, `/sign-up` | |
| Signed in only (`RequireAuth`) | `/sign-up/survey` | |
| Auth, no guard | `/auth/google/callback`, `/forgot-password`, `/reset-password`, `/verify-email` | |
| Fallback | `*` | Not-found page. Route errors render `RouteError` |

## Data and storage
Guest and account modes share types and UI code (A8-5). `AppProviders` gives every screen the active repositories through React contexts:

| Repository (interface) | Guest | Account |
|---|---|---|
| `TodoRepository` | `GuestTodoRepository` (Dexie) | `ServerTodoRepository` (API) |
| `ScheduleRepository` | `GuestScheduleRepository` (Dexie) | `ServerScheduleRepository` (API) |
| `StreakRepository` | `GuestStreakRepository` (computed from guest to-dos and schedule) | `ServerStreakRepository` (`GET /streak`) |
| `FocusSessionRepository` | `GuestFocusSessionRepository` (Dexie) | `ServerFocusSessionRepository` (API with a Dexie outbox) |

Daily intentions and time preferences are not behind a repository interface. Guests read and write them in Dexie (`GuestDailyIntentionRepository`, `src/lib/storage/guestPreferences.ts`). Accounts use the API (`GET`/`PUT /days/{date}/intention`, `GET`/`PATCH /me`).

Screens read and write through TanStack Query hooks (for example `useTodos`, `useSchedule`, `useStreak`). When the session generation changes, `AppProviders` cancels and removes all queries.

**IndexedDB (Dexie)** `loomora-guest`, schema versions 1 to 10 in `src/lib/storage/db.ts`. Dexie loads lazily through `openGuestDatabase.ts`.

| Table | Contents | Used by |
|---|---|---|
| `todos` | to-dos with subtasks, repeat and reminder fields | guest |
| `schedule_items`, `schedule_exceptions`, `schedule_checkins` | weekly schedule. Unique `[schedule_item_id+date]` for exceptions and check-ins | guest |
| `dailyIntentions` | one line per date | guest |
| `meta` | time preferences (`timePreferences`) | guest |
| `focus_sessions` | finished Focus sessions | guest |
| `focus_timers`, `focus_timer_pending` | running timer snapshot and finished sessions still being saved, by scope `guest` or `account:<userId>` | guest and account |
| `focus_outbox` | finished account sessions waiting to reach the API, by `[ownerId+id]` | account |

**Web Storage** (all keys start with `loomora.`):

| Key | Storage | Purpose |
|---|---|---|
| `loomora.session` | `localStorage` | Bearer token, expiry and user. Synced across tabs by `BroadcastChannel` and `storage` events (`src/lib/api/session.ts`) |
| `loomora.savePlanDismissedOn` | `localStorage` | Date the "save your plan" prompt was dismissed |
| `loomora.focus.muted`, `loomora.focus.alarm` | `localStorage` | Alarm mute, sound, volume and play mode, per browser for guests and accounts |
| `loomora.focus.audioOwner.<scope>`, `loomora.focus.audioCancelled.<scope>` | `localStorage` | One tab plays the alarm, and stopping it reaches every tab |
| `loomora.savePlanIntent` | `sessionStorage` | Import requested before sign-in or sign-up |
| `loomora.google-deletion` | `sessionStorage` | Pending Google re-confirmation for account deletion |

**Guest import ("save your plan").** `src/lib/storage/saveGuestPlan.ts` sends guest to-dos (with subtasks and repeats), schedule items, exceptions, check-ins and daily intentions to `POST /import` in chunks that stay under the API limits. Rows keep their UUIDs. Local rows are removed only after every chunk succeeds and only where they still match what was sent. Guest Focus sessions are not imported.

## API integration
- `src/lib/api/index.ts` builds one client from `VITE_API_URL` (default `http://localhost:8000/api/v1`, including `/api/v1`). It exports `authApi`, `todosApi`, `scheduleApi`, `accountDataApi` (import, streak, daily intention, feedback, delete account), `focusSessionsApi` and `healthApi`.
- `src/lib/api/client.ts` sends and expects JSON, adds the bearer token, and maps errors to `ApiError`. A `401` from the current session signs the user out. A network failure or `5xx` marks the service down (`useServiceStatus` in `health.ts`), which shows the service-down banner.
- The contract is `docs/openapi.yaml`. Design notes are in `docs/09-api-design.md`.
- The production Content Security Policy in `vercel.json` allows `connect-src` only to `'self'` and `https://loomora-api.onrender.com`.

## Client state
TanStack Query holds server and Dexie data (`src/app/queryClient.ts`). Zustand holds small client state: the session (`src/lib/api/session.ts`), service status (`src/lib/api/health.ts`), the PWA update prompt (`src/app/pwaUpdate.ts`), the save-plan intent (`src/features/auth/savePlanIntent.ts`) and pending account deletions (`src/features/profile/DeleteAccountSheet.tsx`). The running Focus timer lives in `FocusRuntimeProvider`. All UI text comes from `src/i18n/en.json` through `t()`.

## PWA and deployment
- `vite.config.ts` (vite-plugin-pwa): manifest with `start_url` `/today`, standalone, portrait, ivory `#F7F5EF`. Workbox precaches the app shell, uses `clientsClaim`, and has `registerType: 'prompt'`, so updates wait for the user. The navigation fallback is `/index.html`, except `/api`, `/assets`, the service worker files and the Google deletion callback.
- `vercel.json`: Vite preset, output `dist`, SPA rewrite with the same exclusions, security headers (CSP, HSTS, `X-Frame-Options: DENY` and others), and `git.deploymentEnabled` opt-outs for `v2-rebuild` and listed feature branches.

## Tests and CI
- **Unit and component (Vitest):** `src/**/*.test.{ts,tsx}` next to the code, jsdom, setup in `src/test/setup.ts`, `fake-indexeddb` for Dexie, MSW for the API. Configured in `vite.config.ts`.
- **End-to-end (Playwright):** `e2e/*.spec.ts`, configured in `playwright.config.ts`. It builds the app and serves it with `vite preview`. `VITE_API_URL` points to the reserved origin `https://loomora-api.e2e.invalid` (`e2e/local-api.ts`), and specs answer API calls with route fixtures, so no deployed API is used. Six projects: Chromium, Firefox and WebKit at 375 px and 1280 px. Accessibility uses `@axe-core/playwright`.
- **Staging (Playwright):** `e2e/staging/` with `playwright.staging.config.ts`, for an approved staging pair only. The default config ignores it.
- **CI** (`.github/workflows/ci.yml`, on pull requests and pushes to `main` and `v2-rebuild`, Node 22): job 1 runs `npm ci`, lint, Knip, format check, typecheck, Vitest and build. Job 2 runs Playwright `phone-375` on Chromium and uploads traces on failure.

## Environments and secrets (never in git)
Backend env: APP_KEY, APP_URL, FRONTEND_URL, DB_CONNECTION=pgsql, DB_URL (Neon direct), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, BREVO_API_KEY, MAIL_FROM_ADDRESS, FEEDBACK_TO_EMAIL.
Frontend env: VITE_API_URL.
Each has an `.env.example` with empty values.

## Open questions
Recorded by DOC-002 without an answer. Each needs a planner or owner decision.
1. **`legacy/` removal.** v1.0 says `legacy/` is deleted at the end of R1. R1 is done, and `legacy/` is still in this repository and in `loomora_back`. Should it be removed, and in which task?
2. **Backend structure.** The backend section above is the v1.0 plan. A read-only listing of `loomora_back` `origin/v2-rebuild` on 2026-11-25 showed more models (for example `DailyIntention`, `FocusSession`, `GoogleDeletionChallenge`) and services (for example `FocusSessionService`, `RepeatTodoService`) than it lists. Should a backend task update it?
3. **Guest Focus sessions and import.** Guest Focus sessions are not part of the guest import. Is this intended? (Also asked in the DOC-001 notes.)
4. **Daily intentions and time preferences outside the repository pattern.** They switch between Dexie and the API inside their hooks, not through a repository interface like to-dos and schedule. Is this an accepted exception to A8-5, or should it be aligned later?
5. **Account data in IndexedDB.** A8-4 describes IndexedDB as guest storage, but account Focus timers and the Focus outbox are also kept in the `loomora-guest` database, scoped by user id. Should A8-4 or the database name be updated to reflect this?
