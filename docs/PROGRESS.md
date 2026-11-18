# Progress Log

Claude Code appends one entry at the end of every session or task. Newest entry at the bottom.

## Entry template

```md
### YYYY-MM-DD: T-000 Title
- **Changed:** ...
- **Verified:** (tests run, commands, output)
- **Problems:** ...
- **Questions:** ...
```

## Open questions

- **Q1 (stacked branches):** F-002 to F-006 all need the F-001 scaffold, but PRs are not merged while a session runs. I branch each task from the previous task's branch and open its PR into `v2-rebuild`, so each PR shows earlier tasks' changes until they merge. Merge PRs in order (#1 first). Is this OK, or should each task wait until the previous PR is merged?
- **Q3 (undated + done, docs/08 rule 1):** Undated to-dos show only while not done. Taken literally, checking off an undated to-do makes it vanish at once, while a dated one stays checked. Should undated items checked off today stay visible until midnight? Implemented as written for now (F-005).
- **Q4 (default category):** docs/03 says category is optional; docs/08 has no null category. The guest repository defaults to `other`. OK?
- **Q5 (e2e in CI):** `npm run e2e` (Playwright, 375 and 1280 px) runs locally but not in CI. Adding it needs `npx playwright install --with-deps chromium` in the workflow. Add it?
- **Q6 (floating + in empty state):** Hidden there, so the two equal buttons are the only actions (D26). OK?
- **Q7 (midnight):** Today's date is fixed when the screen opens; a screen left open past midnight shows the old day until reopened. Follow-up task?
- **Q2 (default branch):** `main` exists (copy of `Testing`) but is not yet the GitHub default branch. Danish needs to set it in Settings > General > Default branch.

## Log

### 2026-10-24: F-001 Scaffold Vite + React + TypeScript + Tailwind
- **Changed:** New app in repo root: React 18.3, Vite 7, TypeScript 5.9 strict, Tailwind 3.4 (`tailwind.config.ts`, PostCSS). Installed React Router 7, TanStack Query 5, Zustand 5, i18next/react-i18next, date-fns 4, Framer Motion (not wired yet). ESLint 10 flat config, Prettier (ignores `*.md`), Vitest 5 + Testing Library + jsdom with one smoke test. `.env.example` with `VITE_API_URL=`. `@/` alias to `src/`. PR: https://github.com/danishsary8/Loomora_front/pull/1
- **Verified:** `npm run lint` exit 0; `npm run typecheck` exit 0; `npm test` 1/1 passed; `npm run build` ok (JS 142.65 kB, 46 kB gzip); `npm run format:check` clean.
- **Problems:** `npm audit` shows 3 moderate advisories (`postcss-selector-parser` inside Tailwind 3, build-time only). Upgraded Vitest 3 to 5 to clear a critical `tinypool` advisory; used ESLint 10 because ESLint 9 is end-of-life.
- **Questions:** Stay on Tailwind 3 (matches `tailwind.config.ts` in F-003) or move to Tailwind 4 to clear the moderate advisory? See also Q1.

### 2026-10-24: F-002 GitHub Actions CI
- **Changed:** Added `.github/workflows/ci.yml`: runs on every pull request and on pushes to `main` and `v2-rebuild`; Node 22 with npm cache, `npm ci`, then lint, format check, typecheck, unit tests, build. Read-only permissions, 15 min timeout, cancels outdated runs. Uses `actions/checkout@v6` and `actions/setup-node@v6`. PR: https://github.com/danishsary8/Loomora_front/pull/2 (stacked on #1).
- **Verified:** Local clean install (`rm -rf node_modules && npm ci`) then all five steps exit 0. CI run on the PR: job "Lint, typecheck, test, build" **success** in 23 s (https://github.com/danishsary8/Loomora_front/actions/runs/40116880345).
- **Problems:** None.
- **Questions:** I added a `format:check` step that the task did not list. Keep it? Branch protection (merge only on green checks, docs/10) must be switched on by Danish in GitHub settings.

### 2026-10-24: F-003 Design tokens and neo-brutalism base components
- **Changed:** Style proposal (DEC-001: neo-brutalism kept over neo-skeuomorphic / retro-digital) and tokens (DEC-002) in `docs/DECISIONS.md`, written before coding. Tokens in `src/styles/tokens.ts` feed `tailwind.config.ts`. Self-hosted Caveat + Space Grotesk. Button, Card, Chip, Checkbox, Input, Sheet, ProgressRing in `src/components/ui/`. `/styleguide` route with a minimal router. Minimal i18next with `src/i18n/en.json`. Screenshots in `docs/screenshots/`. PR: https://github.com/danishsary8/Loomora_front/pull/3 (stacked on #2).
- **Verified:** lint, format:check, typecheck, build exit 0; `npm test` 9 files / 40 tests passed, incl. 17 contrast pairs (lowest: danger on cream 4.70:1). Playwright Chromium at 375x812 on `vite preview`: 0 console errors or warnings, fonts loaded, no horizontal scroll, all 17 interactive elements at least 44x44 px; same with `prefers-reduced-motion: reduce`.
- **Problems:** The Input error border showed ink instead of danger (Tailwind class order). Fixed, with a unit test. JS bundle is 440 kB (145 kB gzip).
- **Questions:** (1) Code splitting in F-004? (2) I set up i18next early because CLAUDE.md forbids hardcoded text; F-004 builds on it. (3) `/styleguide` needs a Vercel SPA rewrite when deployed.

### 2026-10-24: F-004 App shell, routing, i18n
- **Changed:** Full route map from docs/05 (`/`, `/today`, `/week`, `/focus`, `/insights`, `/profile`, `/sign-in`, `/sign-up`, `/privacy`, `/terms`, `/styleguide`, 404) with a route error boundary; all screens lazy-loaded (main JS 440 kB to 305 kB). Bottom nav on phones, sidebar from 768 px, profile avatar link, skip link. All text in `src/i18n/en.json`, `<html lang>` synced. Shared LoadingState / EmptyState / ErrorState. Playwright (`npm run e2e`) with 375 px and 1280 px projects. PR: https://github.com/danishsary8/Loomora_front/pull/4 (stacked on #3).
- **Verified:** lint, format:check, typecheck, build exit 0. `npm test`: 11 files / 67 tests passed. `npm run e2e`: 27 passed, 1 skipped (phone-only check on desktop): every route at 375 and 1280 px shows its h1, 0 console errors or warnings, no horizontal scroll, the right nav per width. Screenshots in `docs/screenshots/`.
- **Problems:** None open.
- **Questions:** (1) Add `npm run e2e` to CI (needs `npx playwright install --with-deps chromium`)? (2) Confirm the URL paths. (3) The offline state from docs/05 is left for the PWA task (P8). (4) Vercel needs an SPA rewrite for deep links.

### 2026-10-24: F-005 Storage adapter and guest to-dos
- **Changed:** `Todo` types in the API's snake_case shape (A8-5). Pure `buildTodayList` for docs/08 rules 1 and 2 (Overdue computed and first, Old after 30 days, ties broken by id). `TodoRepository` interface, `GuestTodoRepository` on Dexie (client UUIDs, rule 11 validation, injectable clock), `ServerTodoRepository` stub. `toLocalDate` / `isLocalDate` / `newId` helpers. PR: https://github.com/danishsary8/Loomora_front/pull/5 (stacked on #4).
- **Verified:** `npm test` 15 files / 105 tests passed, run 3 times in a row. 18 Today-list tests cover every rule-1/2 case, incl. month, year and DST boundaries. 15 guest repo tests on fake-indexeddb, incl. data surviving a DB reopen and the 500 cap. lint, format:check, typecheck, build exit 0; e2e 27 passed / 1 skipped.
- **Problems:** Fixed two bugs found by the tests: (1) Dexie rewraps errors named like its own (`NotFoundError`) when thrown inside a transaction, so errors are now thrown outside; (2) same-millisecond to-dos came back in random order, so ties now fall back to id.
- **Questions:** Q3 and Q4 above. Rule 3 (default due date today) is left to the Today screen (F-006).

### 2026-10-24: F-006 Today screen v1 (guest, to-dos only)
- **Changed:** Today screen: date header, progress ring, list with Overdue first (Overdue / Old badges, category chip), check-off with a spring "Done!" stamp (fade under reduced motion), floating + opening the Add sheet (title focused, due date defaults to today per rule 3, optional category, inline validation). Empty state with two equal buttons ("Add to my schedule" disabled). `AppProviders` with TanStack Query + `TodoRepository` context; optimistic check-off with rollback. `Sheet.initialFocusRef`. PR: https://github.com/danishsary8/Loomora_front/pull/6 (stacked on #5).
- **Verified:** `npm test` 16 files / 117 tests passed (11 Today tests). `npm run e2e` 33 passed / 1 skipped on phone-375 and desktop-1280, incl. `e2e/today.spec.ts` add, check off, reload, still there, with 0 console errors. lint, format:check, typecheck, build exit 0. Screenshots: `docs/screenshots/today-*.png`.
- **Problems:** The floating + covered the last row even when scrolled down. Fixed with space below the list; a new e2e check fails without the fix (700 px vs 652 px) and passes with it.
- **Questions:** Q3, Q5, Q6, Q7 above.

### 2026-10-24: Session end
- **Finished (all in `review`):** F-001 #1, F-002 #2, F-003 #3, F-004 #4, F-005 #5, F-006 #6. The PRs are stacked; merge in order #1 to #6.
- **Blocked:** none.
- **Queue:** no `todo` tasks left. The planner needs to add the next tasks.

## Planner answers (2026-10-25, review 2)
- F-001 to F-006 are merged and marked done. Good work. The Tailwind 3 choice is fine for now.
- Next: F-007 to F-014, in order.

### 2026-10-24: F-007 Schedule types, rules and guest repository
- **Changed:** `ScheduleItem`, `ScheduleException`, `ScheduleCheckin`, `Occurrence` types (snake_case like the API, times as `HH:mm`, weekday 0 = Monday). Pure `occursOn`, `occurrencesForDate` (rules 4, 5, 7; sorted by start, end, id) and `nowAndNext` (rule 6) in `src/features/schedule/occurrences.ts`. `ScheduleRepository` interface, `GuestScheduleRepository` on Dexie (Dexie schema v2 adds three stores with unique item+date indexes; client UUIDs; rule 11 validation; 100-item cap; delete removes exceptions and check-ins; check-in and exception writes are idempotent), `ServerScheduleRepository` stub.
- **Verified:** `npm test` 18 files / 183 tests passed; `npm run lint`, `format:check`, `typecheck`, `build` exit 0; `npm run e2e` 33 passed / 1 skipped (Dexie upgrade does not break Today).
- **Problems:** Fixed a missing plain `date` index found by the tests.
- **Questions:** (Q8) Overlapping items: Now is the earliest-starting one, Next is the first that starts later. OK? (Q9) Exceptions and check-ins are only accepted on dates where the item occurs; a check-in on a skipped day is still accepted. OK? (Q10) `/schedule/copy-day` and week listing are left out of the repository; F-009 adds them if needed.

### 2026-10-24: F-008 Add and edit schedule item sheet
- **Changed:** `ScheduleItemSheet` (S7): title, start, end, repeat-day toggles (several at once), category; messages through i18n. Target `create`, `item` (Week: edits all repeats) or `occurrence` (Today: first asks "Only today" / "All repeats"; "Only today" shows title and times only and writes an override). Delete asks the same choice from Today; `useUndoableDelete` + `UndoDeleteToast` give a 5-second undo (nothing is written until the delay ends; a new delete or leaving the screen commits it). `ScheduleRepositoryContext` added to `AppProviders`. A demo of the sheet is on `/styleguide`; screenshot `docs/screenshots/schedule-sheet-375.png`. Stacked on F-007 (PR #7).
- **Verified:** `npm test` 19 files / 195 tests (12 component tests: add, validation, edit from Week, edit from Today both scopes, cancel, delete from Week with and without Undo, delete from Today both scopes, second delete commits the first); lint, format:check, typecheck, build exit 0; e2e passes (one run had a load-related failure of an existing Today test that passed on re-run alone).
- **Problems:** None open. The sheet is not wired into Week and Today yet; F-009 and F-010 own those screens.
- **Questions:** (Q11) Delete is only offered when the host passes `onDelete`, and the host hides the pending item while the toast shows. OK as the pattern for F-009/F-010?

### 2026-10-24: F-009 Week screen
- **Changed:** Week screen in `src/features/schedule/week/`: phone day strip (today selected) with a Week overview toggle; from 768 px seven columns (Week page widened to `max-w-6xl` in `AppLayout`). Items sorted by start time, tap opens the F-008 sheet (edits all repeats), delete with 5-second undo, empty state, floating + (moved to `components/ui/FloatingAddButton`, shared with Today). "Copy day to..." sheet (S8): every item on the source weekday also repeats on the chosen weekdays, done with `repo.update` (no repository change). Screenshots `docs/screenshots/week-375.png`, `week-1280.png`. Stacked on F-008 (PR #8).
- **Verified:** `npm test` 21 files / 212 tests (week component tests, copy-day and grouping unit tests); lint, format:check, typecheck, build exit 0; `e2e/week.spec.ts` (Mon to Fri item visible on each day, copy day, no horizontal scroll, + clears nav) passes at 375 and 1280 px; routes e2e passes.
- **Problems:** The first full `npm run e2e` run after a build sometimes fails the first Today test on phone-375 (load related, passes alone); also noted in F-008.
- **Questions:** (Q12) Copy day copies the weekly pattern (adds weekdays to each item), not dated one-off copies, matching docs/09 `from_weekday`/`to_weekdays`. OK? (Q13) Week page is wider than other screens on desktop. OK?

### 2026-10-24: F-010 Now/Next strip and "Add to my schedule" on Today
- **Changed:** NOW / NEXT strip above the to-do list (shown when the day has schedule items; Free and Nothing more today states), refreshed every minute by `useNow`. Tapping it opens the full-day sheet (S5) listing the day in time order with check-off (`useSetScheduleCheckin`). The empty-state "Add to my schedule" button is now enabled and opens the F-008 sheet; `today.scheduleSoon` text removed. `Card` got a `compact` prop. Screenshot `docs/screenshots/today-now-next-375.png`. Stacked on F-009 (PR #9).
- **Verified:** `npm test` 23 files / 220 tests (states with a fake clock via a mocked `useNow`, minute tick in `useNow.test.ts`, day sheet check-off and undo persisted, add from empty Today); lint, format:check, typecheck, build exit 0; e2e 38 passed (today spec updated: second button enabled). The first Today e2e occasionally fails on a cold full run and passes alone (as before).
- **Problems:** Faking `Date` globally made sheet animations hang in tests, so the clock is injected by mocking `useNow` instead.
- **Questions:** (Q14) Should the day sheet also offer edit/delete of an item ("Only today" / "All repeats", built in F-008)? Not in F-010's steps, so left out. (Q15) The strip is hidden on days with no schedule items; OK?

### 2026-10-24: F-011 Streak (guest) and header badge
- **Changed:** Pure `computeStreak` (docs/08 rule 8) in `src/features/streak/streak.ts`: a day counts on any to-do or schedule check-off; a day with nothing planned (no to-do due, no occurrence after exceptions) is skipped; a planned day without a check-off breaks it; today is never judged. `done_at` is placed on a local day with a time zone (`localDateIn`, `previousDay` in `src/lib/date.ts`). `useStreak` loads the guest data. New read methods `TodoRepository.listAll`, `ScheduleRepository.listExceptions` and `listCheckins` (server stubs reject). `StreakBadge` in the Today header: flame and count, filled when today counted, small pop (none under reduced motion) on the first check-off of the day; check-offs refresh it. Screenshot `docs/screenshots/today-streak-375.png`. Stacked on F-010 (PR #10).
- **Verified:** `npm test` 25 files / 246 tests (18 streak rule tests incl. time zones and month/year boundaries, badge and Today tests); lint, format:check, typecheck, build exit 0; e2e 39 passed.
- **Problems:** None open.
- **Questions:** (Q16) A to-do counts as "planned" only on its own due date; undated and overdue to-dos do not make a day planned. OK? (Q17) Only the current streak is computed; longest streak waits for the account and Insights tasks.

### 2026-10-24: F-012 Landing page, legal pages, Profile (guest)
- **Changed:** Landing (S1): promise, Try it now, Sign in, three highlight cards, Privacy and Terms in the footer; wider layout on desktop (`StandalonePage wide`). Privacy and Terms written in plain English and limited to what the app does today (data stays on the device, no accounts, no analytics, hosting logs mentioned). Profile (S9) for guests: streak card with the badge, "Data lives on this device only.", disabled "Save your plan" with "Accounts are coming soon.", and a Send feedback sheet (S12, UI only, Send disabled). New `Textarea`; `Input` and `Textarea` share `Field` and `fieldClasses`. Screenshots `docs/screenshots/landing-375.png`, `landing-1280.png`, `profile-375.png`, `profile-1280.png`. Stacked on F-011 (PR #11).
- **Verified:** `npm test` 29 files / 259 tests (landing, legal, profile, Textarea); lint, format:check, typecheck, build exit 0; e2e 39 passed (routes at 375 and 1280 px still render).
- **Problems:** None open.
- **Questions:** (Q18) The feedback Send button is disabled because there is no API yet (docs/09 `POST /feedback`); should it instead save locally? (Q19) The legal text is plain information, not legal advice; Danish should read it and add a contact address before launch.

### 2026-10-24: F-013 PWA install and offline shell
- **Changed:** `vite-plugin-pwa` 2.0.0 (exact version, plus `workbox-window` 7.4.1): manifest (name Loomora, cream theme and background, standalone, start `/today`, 192, 512 and maskable icons), service worker that precaches the app shell (JS, CSS, fonts, icons) with an `index.html` fallback, auto-update. Icons are rendered from a neo-brutalism "L" mark (`public/icon.svg`, `scripts/icon-maskable.svg`) by `npm run icons`; favicon and apple-touch icon wired in `index.html`. `OfflineBanner` on every screen while offline (`useOnlineStatus`). New e2e `e2e/pwa.spec.ts`.
- **Verified:** `npm run build` ok (PWA precache 39 entries, ~957 KiB); `npm test` 30 files / 261 tests; lint, format:check, typecheck exit 0; e2e 42 passed incl. Chrome `Page.getInstallabilityErrors` is empty, and after one visit the app reloads offline on `/today` with the banner. **Lighthouse** 11.7.1 PWA category on `vite preview` of the build: score 1.0, with `installable-manifest`, `splash-screen`, `themed-omnibox`, `content-width`, `viewport` and `maskable-icon` all passing. (Lighthouse 12 removed the PWA category, so 11.7.1 was used.)
- **Problems:** The first Today e2e test (add, check off, reload) sometimes fails on a cold full `npm run e2e` run and passes on every re-run (seen before this task too, on phone-375 and desktop-1280); not diagnosed yet.
- **Questions:** (Q20) `vite preview` and Vercel need no extra config for the service worker, but Vercel must serve `sw.js` and `manifest.webmanifest` with the SPA rewrite excluding them; check when deploying. (Q21) Should an "Update available" prompt replace silent auto-update? Silent update can reload the page under someone typing.

### 2026-10-24: F-014 Playwright end-to-end in CI
- **Changed:** New `e2e` job in `.github/workflows/ci.yml` (Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e -- --project=phone-375`, traces uploaded when a test fails). README has a "How to run tests" section. This answers Q5.
- **Verified:** Locally the phone-375 project passes (22 tests). On PR #14 both CI jobs succeeded: "End-to-end (375 px)" in 54 s (https://github.com/danishsary8/Loomora_front/actions/runs/40142974551/job/121018390135) and "Lint, typecheck, test, build".
- **Problems:** None open.
- **Questions:** Playwright already retries once in CI. Keep that, given the occasional cold-run flake of the first Today spec?

### 2026-10-24: Flaky Today e2e fixed (root cause)
- **Found:** CI on PR #14 failed `e2e/today.spec.ts` twice (retry too). The test un-checked a to-do and reloaded at once, before the change was saved in IndexedDB, so the reload showed it still done. This was the "first Today test fails on a cold run" flake noted in F-008, F-010, F-013 and F-014; it was a race in the test, not in the app.
- **Fixed:** The spec now waits until IndexedDB shows the saved state before each reload. Verified with 18 runs in a row (3 repeats at 375 and 1280 px) and the full phone-375 project.

### 2026-10-24: Session end
- **Finished (all in `review`):** F-007 #7, F-008 #8, F-009 #9, F-010 #10, F-011 #11, F-012 #12, F-013 #13, F-014 #14. The PRs are stacked; merge in order #7 to #14.
- **Blocked:** none.
- **Queue:** no `todo` tasks left. The planner needs to add the next tasks.

## Planner review (2026-10-25)
- F-007 to F-014 reviewed and merged: lint clean, tests pass, PWA build works. PR #15 closed (obsolete). Great work.
- Next: F-015 to F-018. The backend is not deployed yet, so use MSW against `docs/openapi.yaml`.

### 2026-10-25: F-018 Accessibility, performance and cleanup pass
- **Changed:** `e2e/a11y.spec.ts` runs axe (WCAG 2.1 A and AA) on all 12 screens at 375 and 1280 px. It found one issue: `aria-label` on the streak badge `<p>` (not allowed); the badge is now `role="status"`. Knip added (`npm run knip`, `knip.json`, CI step before Format check): removed the unused `zustand` dependency (F-015 re-adds it if it needs a store), trimmed unused barrel exports in `components/ui`, `components/states`, `features/schedule`, `features/streak`, `lib/storage`; `scripts/generate-icons.mjs` imports `chromium` from `@playwright/test` (no unlisted `playwright`). Animation: `LazyMotion` + `m` components, feature bundle loaded after first paint (`src/app/motionFeatures.ts`).
- **Verified:** axe 24/24 pass; `npm run lint`, `format:check`, `typecheck`, `knip` (exit 0), `build` pass; `npm test` 30 files / 261 tests; e2e phone-375 34 passed.
- **Lighthouse 11.7.1, mobile, `vite preview` of the build (sandbox, simulated throttling):** Accessibility 100 and Best practices 100 on `/`, `/today`, `/week`, `/profile`. Performance 87 `/`, 83 `/today`, 84 `/week`, 83 `/profile` (before LazyMotion: 90, 77, 87, 83). Total Blocking Time fell from 370 ms to 110 ms on `/today`; LCP is still 3.3 to 3.7 s.
- **Problems:** The Performance target of 90+ is **not met** on the app screens. The cause is the entry script (about 160 KB gzip: React, router, i18next, TanStack Query, Dexie, Framer Motion core) that must run before anything paints; FCP is about 3 s under mobile throttling. Not fixed because the next steps change structure (see Q24).
- **Questions:** (Q24) To reach 90+ I would add a static HTML shell in `index.html` (cream background and logo painted before JS) and/or load Dexie only when the first read happens. Do you want that as its own task? Scores also move by several points between runs here, so a real-device or Vercel run is more reliable. (Q25) `ServerTodoRepository` and `ServerScheduleRepository` are only used by their stub tests until F-016 (blocked); keep them or delete them?

## Planner answers (2026-10-25, review 3)
- **Blocked F-015 to F-017:** my mistake. The API contract exists: `docs/openapi.yaml` is now copied into this repo (the backend repo owns it; when it changes, a task will refresh this copy). F-015 to F-017 are unblocked. Use MSW against it.
- F-018 merged; F-018's cleanup check stays in CI. PR #16 closed (obsolete).

### 2026-10-25: F-015 API client and auth screens
- **Plan:** (1) typed fetch client in `src/lib/api/` from `docs/openapi.yaml` (base URL, bearer token, one `ApiError` shape, 401 handling); (2) session store (zustand) with token + expiry + user in `localStorage`; (3) S10 screens: sign in, sign up, survey, Google callback, forgot, reset, verify email; (4) route guards; (5) MSW tests; (6) screenshots at 375 px.
- **Changed:** `src/lib/api/`: `createApiClient` (JSON in and out, `Authorization: Bearer`, query params, `ApiError` with `status`, `fieldErrors`, `retryAfter`, status 0 for network failure; a 401 on a request that carried a token signs the user out), `createAuthApi` (register, login, googleExchange, googleRedirectUrl, verifyEmail, forgotPassword, resetPassword, getMe, updateMe, submitSurvey), `useSession` store (token and `expires_at` saved in `localStorage` key `loomora.session`; an expired token is dropped on load). `src/features/auth/`: Sign in and Sign up (email + password; "Sign in with Google" / "Sign up with Google" are links to `/auth/google/redirect?intent=&timezone=`), skippable survey at `/sign-up/survey` (display name, goal, how you heard; Skip sends `{}`), `/auth/google/callback` (exchanges the code once; `account_not_found` goes to Sign in and `account_already_exists` to Sign up with a message), `/forgot-password`, `/reset-password?token=&email=`, `/verify-email?id=&expires=&signature=`. `RequireAuth` guards the survey; `RedirectIfSignedIn` sends signed-in visitors from Sign in/up to the survey (new account) or Today. All text is in `en.json` under `auth`. `zustand` 5.0.16 re-added (F-018 removed it, this task uses it); `msw` 3.0.3 added as a dev dependency; `.env.example` documents `VITE_API_URL`. Axe e2e now also covers the three new public pages. Screenshots `docs/screenshots/auth-sign-in-375.png`, `auth-sign-up-375.png`, `auth-survey-375.png`, `auth-forgot-375.png`.
- **Verified:** `npm test` 33 files / 300 tests passed (client: headers, body, 422, 401 with and without token, 429 Retry-After, network error; session and expiry; 27 component tests with MSW for every screen and error); `npm run lint`, `typecheck`, `knip`, `format:check`, `build` exit 0; e2e `a11y.spec.ts` + `routes.spec.ts` on phone-375: 29 passed (axe clean on the new pages).
- **Problems:** MSW 3 renamed the `onUnhandledRequest` option to `onUnhandledFrame`; the test setup uses the new name, so any API call without a handler fails the test.
- **Questions:** (Q26) The sign-up form asks only email + password (as the task says), but `POST /auth/register` requires `name`. I send the part of the email before "@" and let the survey change it with `PATCH /me`. OK, or should the form ask for a name? (Q27) Field errors from the API (for example "The email has already been taken.") are shown as the server sends them, in English; only our own messages go through i18n. Fine until Khmer, or should the client map known errors? (Q28) No sign-out button or "resend verification" yet; sign-out belongs to F-017 (Profile) and the API client has no `logout` call until then. (Q29) The session is not re-checked with `GET /me` on app start; a revoked token is found on the first API call (401 signs out). OK for F-015? (Q30) Protected routes: only the survey needs an account today; Today, Week and Profile stay open to guests (Flow 2). F-016 decides how they switch between guest and server storage.

### 2026-10-26: F-016 Server repositories and "Save your plan"
- **Note on order:** F-015 is built and open as PR #18 (still `todo` on `v2-rebuild`), so this branch is stacked on `feat/F-015-api-client-auth`. Merge #18 first.
- **Plan:** (1) typed data endpoints in `src/lib/api/` (todos, schedule, streak, import); (2) `ServerTodoRepository`, `ServerScheduleRepository`, a streak repository per storage; (3) AppProviders picks guest or server storage by sign-in state; (4) import function and "Save your plan" sheet, prompt, runner; (5) tests with MSW.
- **Changed:** Server repositories map the API shapes to the app shapes (`item_id` to `schedule_item_id`, `updated_at` = `created_at`) and turn a 422 into the same `ValidationError` guests get, so forms are unchanged. The streak needs data the API cannot list, so `listAll`, `listExceptions`, `listCheckins` left the repository interfaces (guest classes keep them) and a `StreakRepository` was added: guest computes locally, account reads `GET /streak`. AppProviders switches storage on sign-in and sign-out and reloads the queries. `saveGuestPlan` sends everything in one `POST /import`, then clears the device; on failure nothing is cleared. "Save your plan" sheet (S11) appears for guests after 3 check-offs or after a past day whose to-dos were all done, "Not now" snoozes it 3 days, and Profile always has the button. Create account sets a "save my plan" flag (sessionStorage, survives the Google redirect); once signed in a runner imports, shows "Your plan is saved", or on failure keeps the plan and offers Try again. Profile also offers the button to a signed-in user whose plan is still on the device.
- **Verified:** `npm test` 36 files / 325 tests (server repositories, import: success, failure keeps data for 500, 422 and no connection, retry sends identical ids, prompt rules, storage switching, retry flow); `lint`, `format:check`, `typecheck`, `knip`, `build` exit 0; e2e phone-375: 37 passed.
- **Problems:** A "full day" trigger on today made the sheet open on the very first check-off (broke the Today e2e and the first-use celebration), so a full day only counts when it is a past day.
- **Questions:** (Q31) Clearing the guest data after a successful import is required by docs/08 rule 9, but it is a delete: OK? (Q32) The API sends no exception id, so the app builds `<item_id>:<date>`. (Q33) A "full day" only checks to-dos, not schedule occurrences. (Q34) The import sends everything in one call; the API caps it at 5000 exceptions and 10000 check-ins, which a long-time guest could pass. (Q35) The sheet only offers Create account; people with an account reach Sign in from the Sign up page and the same flag still imports. OK? (Q36) Profile for signed-in users is otherwise F-017.
