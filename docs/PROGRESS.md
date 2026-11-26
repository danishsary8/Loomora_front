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

- ~~**Q1 (stacked branches):**~~ Resolved by practice: the stacked PRs #1 to #14 and #17 to #20 merged in order, and later tasks branch from `origin/v2-rebuild` (see the 2026-11-18 F-020 entry). Original question: F-002 to F-006 all need the F-001 scaffold, but PRs are not merged while a session runs. I branch each task from the previous task's branch and open its PR into `v2-rebuild`, so each PR shows earlier tasks' changes until they merge. Merge PRs in order (#1 first). Is this OK, or should each task wait until the previous PR is merged?
- **Q3 (undated + done, docs/08 rule 1):** Undated to-dos show only while not done. Taken literally, checking off an undated to-do makes it vanish at once, while a dated one stays checked. Should undated items checked off today stay visible until midnight? Implemented as written for now (F-005).
- **Q4 (default category):** docs/03 says category is optional; docs/08 has no null category. The guest repository defaults to `other`. OK?
- ~~**Q5 (e2e in CI):**~~ Resolved 2026-10-24 by F-014 (PR #14): CI has an `e2e` job (see the F-014 entry). Original question: `npm run e2e` (Playwright, 375 and 1280 px) runs locally but not in CI. Adding it needs `npx playwright install --with-deps chromium` in the workflow. Add it?
- **Q6 (floating + in empty state):** Hidden there, so the two equal buttons are the only actions (D26). OK?
- **Q7 (midnight):** Today's date is fixed when the screen opens; a screen left open past midnight shows the old day until reopened. Follow-up task?
- ~~**Q2 (default branch):**~~ Overtaken: the GitHub default branch is `v2-rebuild` (see the 2026-11-20 QA-016 entry). Original question: `main` exists (copy of `Testing`) but is not yet the GitHub default branch. Danish needs to set it in Settings > General > Default branch.

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

### 2026-10-26: F-017 Profile for accounts, feedback and delete account
- **Note on order:** stacked on F-016 (PR #19), which is stacked on F-015 (PR #18). Merge #18, #19, then this one.
- **Plan:** (1) API calls `logout`, `deleteMe`, `sendFeedback`; (2) account card with name and time zone (`PATCH /me`); (3) sign out; (4) working feedback sheet; (5) delete-account sheet; (6) MSW tests.
- **Changed:** Profile for signed-in users shows an account card (email, editable name, time zone select with a "Use this device's time zone" shortcut; the zone was already sent at sign-up in F-015), the server streak, Sign out (calls `POST /auth/logout`, then forgets the token even if that call fails, then goes to the landing page) and "Delete my account". Delete asks for the password (`DELETE /me`), shows the API's error on the field, and on success signs out and leaves for the landing page; a note says Google-only accounts cannot delete yet, as the API says. The feedback sheet now really sends (`POST /feedback`) for guests and accounts (it was a disabled UI in F-012; this answers Q18): Send is enabled once there is text, failures and the 10-per-hour limit keep the message and say why.
- **Verified:** `npm test` 36 files / 341 tests (name and time zone save, device zone, field error, sign out with and without network, delete: empty, wrong, right password, cancel; feedback: guest, with token, 500, 429); `lint`, `format:check`, `typecheck`, `knip`, `build` exit 0; e2e phone-375: 37 passed. The time zone test caught a real bug (a device zone missing from the browser list, such as `UTC`, was not selectable), fixed.
- **Problems:** None open.
- **Questions:** (Q37) The user object has no "has a password" flag, so every account sees the password field and a Google-only account gets the API's 422 message. Can the API add `has_password`? (Q38) Email changes and "resend verification" are not in the API contract, so the email is read-only. (Q39) Sign out lands on the landing page, not on a guest Today; OK?

## Planner answers (2026-11-19, review 4)
- PRs #18, #19, #20 merged (CI green). F-015 to F-017 are done.
- Q26 OK (name from the email, the survey can change it). Q27 OK until Khmer. Q28: resend verification is now F-021; sign out is done. Q29 OK. Q30 OK.
- Q31 Yes: clearing the local copy after a successful import is approved (docs/08 rule 9). Q32 OK. Q33 OK (to-dos only). Q34: chunked import is now F-020. Q35 OK. Q36 done. Q37: backend adds `has_password` (B-025), then F-028. Q38 OK (email read-only). Q39 OK.
- Q24: yes, as F-029 (last in the queue). Q25: the repositories are used now, nothing to delete.
- New tasks F-019 to F-029 come from the Daycraft analysis (docs/research/). Some depend on backend tasks B-019 to B-025; the planner refreshes `docs/openapi.yaml` when each backend task merges.

### 2026-11-18: F-019 Error, offline and not-found states
- **Plan:** (1) audit what exists; (2) one error-to-text mapping table, used by forms and the route boundary; (3) route error boundary with Try again and Go to Today; (4) account-mode banner with Retry and a 30 s `GET /health` poll; (5) tests.
- **Audit:** already there: route `errorElement`, 404 page, `OfflineBanner`, `ErrorState`, 401 sign-out in the API client. Missing: the mapping table (forms had their own copy of network/429/unexpected text), a way home from the error screen, and the backend-down banner.
- **Changed:** `src/lib/api/errorMessages.ts` maps an error to a translation key (network, 401, 422, 429, 5xx, other); raw `error.message` is never shown. `useFormAction` uses it (the duplicate `auth.errors.network/rateLimited/unexpected` strings moved to `errors.*`). `RouteError` shows the mapped text with Try again and Go to Today (`ErrorState` got an `actions` slot). The API client calls `onServiceFailure` on a network error or 5xx; a small store (`useServiceStatus`) feeds `ServiceDownBanner` (signed-in users only, Retry plus a 30 s poll of `GET /health`, on recovery it reloads the queries). Guests never see it and never call the API. The offline banner for signed-in users no longer says the plan saves on the device (it would be false: no outbox yet) and has its own text.
- **Verified:** `npm test` 39 files / 356 tests (mapping table, banner: guest hidden, Retry fails then succeeds, 30 s poll with fake timers, route error, account offline text); `lint`, `format:check`, `typecheck`, `knip`, `build` exit 0; e2e phone-375: 40 passed, incl. new `e2e/backend-down.spec.ts` (`/api/**` aborted shows the banner, un-abort plus Retry hides it, unknown URL shows 404, guests make no API calls).
- **Problems:** None open.
- **Questions:** (Q40) The task lists `src/i18n/locales/en.json`, but the file is `src/i18n/en.json`; I used the real path. (Q41) Failed list queries (Today, Week) still show the generic ErrorState text, not the mapped one; should they use the mapping too? Left out to stay inside the steps. (Q42) The e2e mocks the API with Playwright routes; there is no real backend in CI.
### 2026-11-18: F-029 Static HTML shell and lazy Dexie for first paint
- **Plan:** (1) static cream page and logo in `index.html`, painted before JS; (2) Dexie loaded by a dynamic import on the first read; (3) measure.
- **Changed:** `index.html` has an inline style and a logo inside `#root`; React replaces it on first render. `openGuestDatabase` (`src/lib/storage/openGuestDatabase.ts`) imports `./db` (Dexie) on first use and shares one instance; `GuestTodoRepository` and `GuestScheduleRepository` open it per call (a `db` option still lets tests pass their own). `GuestDatabase` is no longer re-exported from `@/lib/storage` (it would pull Dexie back into the entry chunk); tests import it from `@/lib/storage/db`.
- **Measured:** entry chunk `index-*.js` 176.66 kB to 142.99 kB gzip (-34 kB) from `npm run build`.
- **Not measured:** the Lighthouse scores. Lighthouse is not installed in this environment and the install (`npx lighthouse`) was refused by the sandbox permission check, so I did not work around it. The done-when item (90 on `/`, 85 on `/today`) is **not checked**. Please run `npx lighthouse@11.7.1 http://localhost:4173/today --preset=perf --form-factor=mobile` on `vite preview` before and after, or allow me to install it, and I will record both.
- **Verified:** `npm test` 36 files / 341 tests; lint, format:check, typecheck, knip, build exit 0; e2e phone-375: 37 passed.
- **Questions:** (Q45) Is a bundle-size drop acceptable as evidence until Lighthouse can run, or should this stay in review?
### 2026-11-18: F-020 Import in chunks under the API limits
- **Plan:** (1) split the import body into calls under the per-call caps (5000 exceptions, 10000 check-ins); (2) to-dos and items (totals per user) go in the first call; (3) call in order, clear the device only after every call succeeds; (4) Vitest.
- **Changed:** `chunkImportBody` in `src/lib/storage/saveGuestPlan.ts`; `saveGuestPlan` sends the chunks one after another. Branched from `v2-rebuild` (not stacked on F-019); `docs/PROGRESS.md` and `TASKS.md` may conflict on merge, keep both notes.
- **Verified:** 12000 check-ins send 2 calls (10000 + 2000, items only in the first); a failure on call 2 keeps all 12000 check-ins and the items; the retry succeeds and clears the device (ids are identical, so the server skips repeats). Full run below.
- **Questions:** (Q43) Task Files says `src/features/*/saveGuestPlan*`; the file is `src/lib/storage/saveGuestPlan.ts`.

### 2026-11-18: F-021 Resend verification email
- **Note on order:** stacked on F-019 (PR #21) because it uses the error-mapping table. Merge #21 first.
- **Plan:** (1) `authApi.resendVerification` (`POST /auth/email/resend`, with token); (2) shared `ResendVerification` button with success, 429 wait time and error text; (3) show it on the Profile account card for unverified accounts and on the verify-email screen for a signed-in, unverified user (when the link failed); (4) MSW tests.
- **Changed:** as planned. The 429 text uses `Retry-After` rounded up to minutes ("Try again in 2 minutes."); without a retry time it falls back to the shared rate-limit text; other failures use `errors.*`. Signed-out visitors on the verify screen do not see it (the endpoint needs a token).
- **Verified:** `npm test` all pass incl. new tests (success sends the bearer token, 429 with and without retry time, network error, Profile verified vs unverified, verify page signed in vs out); lint, format:check, typecheck, knip, build, e2e results in the PR.
- **Questions:** (Q44) Should the verify screen also show Resend right after a successful sign-up, before any link is opened? Not in the steps; left out.

### Planner note (2026-11-19, review 6)
- F-019, F-020, F-021 and F-029 are merged and marked done.
- `docs/openapi.yaml` is refreshed from the backend (B-019 to B-025 merged: subtasks/priority/notes, repeat_rule, reminders, soft delete and restore, time_format/week_starts_on, daily intention, has_password). F-022 to F-028 are unblocked (their earlier `blocked` PR was closed and replaced by this one).
- Backend B-026 (repeat keeps its reminder time) and B-027 (local-date helper) are still to come. They do not change any endpoint shape, so F-024 and F-025 can start now.

### 2026-11-19: F-022 Undo toast for deletes
- **Plan:** (1) Soft-delete support in Dexie schema (`deleted_at`), `GuestTodoRepository` soft-delete and restore, `ServerTodoRepository.restore` using `POST /todos/{id}/restore`; (2) Reusable `useUndoableDelete` hook: optimistic query cache removal, immediate repository delete call with rollback snapshot and error toast on failure, 5-second undo timer, restore row into query cache at original position on undo; (3) Neo-brutalist `TrashIcon` and delete button in `TodoRow` with accessible labels; (4) Accessible `UndoDeleteToast` with `role="status"` and `aria-live="polite"` and focusable Undo button; (5) Unit and integration tests covering guest and account modes, delete + undo, 5s timeout persistence, error rollback, and Playwright e2e test at 375 px.
- **Changed:**
  - `src/features/todos/types.ts`: added `deleted_at?: string | null` to `Todo` interface.
  - `src/lib/storage/db.ts`: bumped version to 3 with `todos: 'id, due_date, created_at, deleted_at'`.
  - `src/lib/api/todos.ts`: added `restore: (id: string) => POST /todos/{id}/restore`.
  - `src/lib/storage/TodoRepository.ts`, `ServerTodoRepository.ts`, `GuestTodoRepository.ts`: added `restore(id: string)` and implemented soft delete (`deleted_at: now`) in `GuestTodoRepository.delete`. Filtered soft-deleted items in `listForDate` and `listAll`.
  - `src/features/todos/todayList.ts`: filtered soft-deleted items in `buildTodayList` as defense-in-depth.
  - `src/components/ui/icons.tsx`: added neo-brutalist `TrashIcon`.
  - `src/i18n/en.json`: added `deleteTodo`, `todoDeleted`, `deleteError`, and `undo` under `today`.
  - `src/features/today/DoneStamp.tsx`: added support for optional `className` for flexible layout positioning.
  - `src/features/today/TodoRow.tsx`: added `onDelete` action with `TrashIcon` button (`aria-label={t('today.deleteTodo', { title: todo.title })}`), aligned side-by-side with DoneStamp without overlapping text at 375 px.
  - `src/features/todos/UndoDeleteToast.tsx`: created status toast with polite aria-live and focusable Undo button.
  - `src/features/todos/useUndoableDelete.ts`: implemented reusable hook managing optimistic cache removal, delete execution, rollback on error, 5s timeout, and single-invocation restore returning row to its original index.
  - `src/features/today/TodayPage.tsx`: wired `useUndoableDelete` and rendered `UndoDeleteToast`.
  - `src/features/todos/useUndoableDelete.test.tsx`: test suite covering guest mode and account mode (immediate remove, soft-delete, restore to original position, 5s timeout persistence, and server/Dexie error rollback).
  - `src/features/today/TodayPage.test.tsx`: test for delete with undo toast in Today screen.
  - `e2e/today.spec.ts`: e2e test on phone-375 verifying delete, undo restoration, and delete finalization persisting across page reloads.
- **Verified:**
  - `npm run lint` exited 0 (0 errors, 0 warnings).
  - `npm run typecheck` (`tsc -b`) exited 0.
  - `npm run knip` exited 0 (no unused files, dependencies, or exports).
  - Vitest: 41 test files passed, 373 tests passed.
  - `npm run build` succeeded cleanly with PWA manifest and service worker generated.
  - Playwright: 41 passed on phone-375 (`npx playwright test --project=phone-375`), 0 failures, 0 axe a11y violations.
- **Questions:** None.

### 2026-11-19: F-022 final review fixes
- **Merged:** latest `v2-rebuild` (only `docs/openapi.yaml` changed, no conflicts, no force-push).
- **Review of `useUndoableDelete.ts`, confirmed issues fixed:** (1) Overlapping deletes: one shared snapshot and timer meant a late failure of delete A rolled back with B's snapshot, hid B's toast and could restore the wrong rows. Each delete now has its own entry; a failure puts back only its own row, and only touches the toast if it is still the current one. Only the newest delete offers Undo. (2) Undo while the remove call was still running could call restore first; Undo now waits for the remove to settle, and a double tap restores once. (3) A failed restore showed the generic save error and left the cache out of sync; it now shows `today.restoreError`, keeps the row deleted and refetches. (4) The error toast never went away; it now clears after 5 s. Unused `clearError` removed.
- **Tests added** (`useUndoableDelete.test.tsx`): late failure of an older delete keeps the newer one; no restore before a slow delete, and a double Undo restores once; restore failure; error toast clears.
- **Verified:** lint, typecheck, knip, build exit 0; Vitest 41 files / 377 tests passed; Playwright phone-375 41 passed. `format:check` reports 209 files including untouched ones (e.g. `tsconfig.json`), so it is a local Windows CRLF issue, not this change; CI (Linux) result is the reference.
- **Questions:** None.

### 2026-11-19: F-023 Subtasks, priority and notes UI
- **Plan:** Add failing guest, account and phone tests. Migrate Dexie and implement the subtask rules. Map the existing API and import fields. Extend the Today sheet and rows. Verify and open the review PR.
- **Today:** Reused the existing sheet for adding and editing to-dos and subtasks. Added text priority labels, optional plain-text notes with a translated 2,000-character limit, nested checkboxes, completed/total progress and accessible add, edit and delete controls. Add subtask is available while the parent can remain in Today. Parent and child check-offs run in order so a failed child request after parent completion retains the saved state.
- **Guest:** Dexie v4 adds the parent index and backfills normal priority, null notes and null parent links as rows upgrade. UUIDs, completion timestamps and soft-delete state are preserved. Parent check-off completes open children in the same transaction. Parent delete and Undo carry only the children deleted with it. Undo restores child creation order.
- **Account and import:** Existing endpoints use the B-019 fields and nested response order. The sheet inherits the parent category on subtask creation. Import sends parents before children in the same first batch with original UUIDs, priority and notes. Guest data stays on the device until every call succeeds.
- **Verified:** TDD failures reproduced before implementation. Lint, typecheck, Knip and production build exited 0. Vitest passed 391 tests in 42 files with two workers on Windows after the initial concurrent run timed out on five route-render checks. Playwright passed 42 tests at 375 px. Axe found zero violations in the route scans, populated Today list and edit sheet. The new phone test also passed persistence, overflow, keyboard, notes validation and nested Undo checks. Redocly validated OpenAPI with four existing warnings.
- **Formatting:** The exact repo-wide command flags 187 untouched files with CRLF working-tree line endings. The changed files pass Prettier and the whole tree passes with `--end-of-line auto`. No unrelated files were reformatted.
- **Documentation question:** The account OpenAPI puts due date ahead of creation time. The existing guest Today list sorts its non-overdue rows by creation time. Should a separate change align these orders? F-023 preserves the existing top-level ordering in each mode.

### 2026-11-19: F-024 Repeating to-dos UI

- Exercise the repeat sheet, guest repository, account endpoints, guest import and 375 px flow with failing tests before implementing.
- Use the existing sheet and weekday chips for parent recurrence and show the rule on Today rows.
- Store repeat fields in Dexie v5 and create the next parent and undone subtasks in the completion transaction, applying the 500-row limit to the entire write.
- Map B-020 responses to the Today cache and import recurrence links alongside client UUIDs, preserving local data on any failed batch.
- Verify the required commands and open the F-024 PR against `v2-rebuild`.

**Contract question:** OpenAPI `POST /todos/{id}/done` says the next occurrence carries the reminder offset unless dismissed. The backend checkout's `RepeatTodoService::createNext` excludes both reminder fields. Is the offset behavior deployed by B-026? Guest v4 has no reminder fields, so F-024 carries no guest reminder data and uses the account response as returned by the server.

- **Implemented:** The add/edit sheet has None, Daily, Weekly and translated weekday chips for parent to-dos. The due-date error is linked to the field, and Today rows show a repeat icon and label.
- **Guest storage:** Dexie v5 adds nullable repeat fields and preserves existing records and UUIDs. Check-off uses the device's local calendar date and writes the next parent, its undone subtasks and the original completion in one transaction. If the new rows would exceed 500 stored to-dos, the original parent and subtasks keep their previous completion state.
- **Account and import:** The existing B-020 routes carry the repeat rule and return the authoritative next ID. Import sends repeat fields with the original UUIDs and parent IDs. When a next occurrence is soft-deleted and excluded from import, its outgoing link is sent as null so the server can validate the batch. Guest data is cleared only after every batch succeeds.
- **Verification:** Lint, typecheck, knip and build exited 0. Vitest passed 401 tests across 42 files with one worker after intermittent Windows test timeouts. Eleven focused assertions failed before the implementation. Playwright phone-375 passed 43 tests after a standalone preview avoided the Windows startup timeout. The repeat flow passed keyboard, reload persistence, overflow and console checks, with zero axe violations in the sheet and on Today. Redocly passed with four existing OpenAPI warnings.
- **Windows formatting:** The repository-wide command flags 195 untouched files checked out as CRLF by `core.autocrlf=true`. All changed files pass Prettier, and the repository-wide check with automatic line-ending detection passes. The PR's Linux workflow runs the default command.
- **Browser fix:** Axe flagged visible weekday abbreviations against full accessible names. The repeat picker now uses full weekday names for both and wraps the chips at phone width. The rerun reported zero violations.

### 2026-11-19: F-025 In-app reminders UI

- **Plan:** Write failing storage, account and browser tests. Add the local reminder field, guest storage and account calls. Mount one root watcher and add the reminder banner. Verify both modes and submit the branch for review.
- **Reminder field:** Parent to-dos can add, change or remove a reminder. Accounts use the profile time zone and guests use the device time zone. The sheet sends UTC, preserves the exact saved instant on unrelated edits, rejects nonexistent local times, and chooses the earlier instant when the clock repeats an hour. Subtasks have no reminder field.
- **Watcher and actions:** One root watcher reads due reminders on load, every 30 seconds in the visible tab, and when the tab becomes visible or gains focus. It keeps one active reminder across polls. Done uses the existing completion path, Snooze supports 5, 10, 30 and 60 minutes, and Dismiss is persistent. Failed actions keep the reminder available and show translated feedback. The banner announces the reminder and keeps controls keyboard operable.
- **Storage and import:** Dexie v6 backfills nullable reminder fields without changing existing rows or links. Editing the instant clears its previous dismissal. Import sends the reminder time and dismissal with the original UUID and preserves the local plan if any chunk fails.
- **Contract clarification:** The frontend OpenAPI phrase "a dismissed reminder is not carried over" is ambiguous. The merged backend B-026 implementation (PR #28, commit `e167963`) and decision I7 confirm that the next occurrence keeps the original reminder time shifted by the due date delta in UTC and gets a null dismissal timestamp. Guest repeats match that behavior. This resolves the F-024 question against the backend's current `origin/v2-rebuild`.
- **Review fixes:** Ordinary completion, deletion and restore refresh the reminder queue. Reminder Done updates every matching Today cache, including a page left open across midnight. Session checks prevent queued actions and late responses from affecting a newer sign-in. Focus moves to the next reminder or page content if the focused banner is removed.
- **Verification:** Lint, typecheck, Knip and production build passed. Vitest passed 424 tests across 45 files with two workers after the initial Windows run timed out on the Now/Next route test. Playwright phone-375 passed all 44 tests. Axe reported zero violations, and the reminder flow passed keyboard, reload, overflow and console checks. Redocly validated OpenAPI with four existing warnings. The storage, watcher and phone tests exposed missing behavior before implementation.
- **Windows formatting:** The default Prettier check flagged 193 existing CRLF files. The full check passed on an LF snapshot of tracked files. No unrelated files were reformatted.

### 2026-11-19: F-026 Time format and week start settings

- **Plan:** Reproduce missing behavior with unit and phone tests. Add Profile controls and mode-specific persistence. Apply common clock formatting and weekday ordering. Verify the migration, shared fixture and regressions, then submit for review.
- **Profile:** Added translated time format and week start selectors with keyboard support, saving feedback and restored preferences after failed writes. Dexie v7 adds only the `meta` store. Guest preferences stay on that device and refresh when an open tab regains focus.
- **Accounts:** Read preferences from the session user and refresh legacy sessions through `GET /me` when the fields are missing. Send only changed fields through `PATCH /me` and apply its returned user to the matching session. Refreshes preserve newer user fields, and late saves are ignored after a session change.
- **Clock and Week:** The shared formatter and editor cover Week, schedule sheets, Today, Now/Next and reminders. Editors normalize schedule wall times to `HH:mm`. Reminder edits retain the local date and time zone and persist UTC instants. Week, the day strip and the schedule weekday pickers follow the preference and preserve existing weekday IDs.
- **Contract:** B-023 and OpenAPI accept ISO weekday values 1–7. F-026 exposes Monday and Sunday as the choices. A preexisting account value of 2–6 remains visible and governs Week order until the user changes it. Updated the data model and API summaries to list the preference fields.
- **Fixture:** Copied all six local-date cases from backend `8442cbb`. Tests assert local date, UTC boundaries and day length, including the 23-hour and 25-hour New York DST days. Compared the parsed fixture with the backend copy to verify identical values.
- **Verification:** Reproduced missing Profile settings, the legacy session race and the editor clock mismatch before fixing them. Lint, typecheck, Knip and build passed. Vitest passed 455 tests in 48 files. All 45 Playwright tests passed at 375 px. Axe reported zero violations, and the F-026 flow passed keyboard, overflow, console and reload checks. Redocly validated OpenAPI with four existing warnings.
- **Windows formatting:** The default check reported 200 existing files with CRLF checkout endings. The full staged LF snapshot passed Prettier. No unrelated files were reformatted.

### 2026-11-19: F-027 Daily intention on Today

- **Contract question:** Rule 9 in docs/08-data-model.md describes one import call with one transaction for the plan. F-020 and saveGuestPlan.ts send chunks sequentially, and OpenAPI caps daily_intentions at 1,000 per request. Should rule 9 be updated to describe a transaction per request, an idempotent retry after partial server success, and local cleanup only after every chunk succeeds?
- **Status:** Import changes are paused pending clarification.

**Planner answer — F-027 import question:** Rule 9 was outdated following F-020. Multi-request imports are atomic per request, not across the entire import sequence. Partial server success is expected and safe to retry because imports are idempotent. Local plan data is cleared only after all requests succeed. Documentation clarification approved; F-027 is unblocked.

- **Plan:** Reproduce autosave and persistence failures. Add date- and session-scoped editing, Dexie v8 and account persistence. Extend Save Plan and verify the complete phone flow before review.
- **Today:** The translated intention field saves trimmed text after 600 ms or on blur. Saves are serialized, skip unchanged values and use authoritative results. Failed drafts stay editable. A draft from an expired session can be retried after the same account signs back in. The field rolls over at local midnight and shows its date when the open Today page is still showing the previous day.
- **Storage and import:** Dexie v8 adds a unique date key and preserves v7 data and preferences. Account requests use the shared API client. Save Plan handles intention-only imports and chunks up to 1,000 intentions per request while honoring server copies. Cleanup starts after every request succeeds and retains local changes made during import.
- **Review and TDD:** Reproduced the missing feature, v7 migration, queued account-write leak, draft loss during refresh, trailing-space overwrite and import cleanup race before their fixes. Regression tests cover real IndexedDB, mocked B-024 requests and a Phnom Penh midnight rollover.
- **Verification (2026-11-20):** Lint, typecheck, Knip and production build passed. Vitest passed 474 tests across 50 files with two workers. The phone-375 Playwright suite passed 46 tests. The intention flow had zero axe violations, horizontal overflow and browser console errors. Redocly validated OpenAPI with four existing warnings.
- **Windows:** The standard format check flagged 219 existing CRLF checkout files. The LF snapshot and changed files passed. Initial unit runs timed out during route loading. The final run passed after the offline unit test was mounted with the real field and storage providers while Playwright covered the full Today route.

#### 2026-11-20: F-027 planner review fixes (PR #33)

- **Guest cleanup:** Snapshot active and soft-deleted to-dos together before sending the first request. Clean up only after every request succeeds. Discard unchanged tombstones, preserve newly created, edited, deleted or restored rows, and keep parents needed by retained subtasks. Regression tests fill all 500 guest slots with tombstones, verify capacity is restored after an intention-only import, and compare the full local state after concurrent changes and API rejection.
- **Midnight autosave:** Keep the previous date’s debounce and queued write alive through rollover. Pending writes stay bound to their original date and session. The new date loads independently. Failed previous-day saves stay recoverable through a dated retry action. Fake-clock tests verify the write, retry, and account switch. The phone flow writes 200 ms before Phnom Penh midnight and reloads the previous date to verify persistence.
- **Verification:** Lint, typecheck, Knip and production build passed. Vitest passed 480 tests across 50 files. Playwright phone-375 passed 46 tests, including axe, overflow and console checks. Redocly validated OpenAPI with four existing warnings. Windows Prettier flagged 219 CRLF checkout files. The LF snapshot and changed files passed. Two large import tests timed out during a concurrent focused run and passed in the sequential full run.

### 2026-11-20: F-028 Delete-account password confirmation

- **Contract:** B-025 returns a required boolean `User.has_password`. Password accounts confirm deletion with the current password. Only HTTP 204 signs out and returns to the landing page. The sheet shows 422 password errors and keeps the session on failure. Google-only accounts see translated guidance and close controls. The older API design summary mentions Google reauthentication. F-028 follows the current OpenAPI contract, which requires a password.
- **Saved sessions:** The sheet resolves a missing or invalid flag through authenticated `GET /me` and saves the boolean for the same account and session generation. A failed lookup offers retry while deletion stays unavailable.
- **Session and focus safeguards:** Closing or switching accounts discards the form. A session-scoped lock prevents duplicate requests across route changes, and late responses cannot sign out or redirect a new session. Confirmation and retry keep keyboard focus inside the sheet.
- **TDD and review:** Regression tests reproduced the password gate, stale-response and legacy lookup failures before implementation. Independent review reproduced duplicate requests after navigation and focus loss during confirmation and retry. New tests reproduced both findings before the fixes.
- **Verification:** Lint, typecheck, Knip and production build passed. Vitest passed 492 tests across 50 files with two workers. Playwright phone-375 passed 48 tests. Both deletion-sheet variants passed axe, keyboard, width and console checks. Account requests were mocked. Redocly validated OpenAPI with four existing warnings.
- **Windows:** The full checkout format check flagged 230 CRLF files. The changed files and staged LF snapshot passed Prettier. A concurrent Vitest run had five failures in existing flows. A later run exposed an incorrect navigation selector in the new test. The full suite passed after the selector was corrected and Vitest ran with two workers.

### 2026-11-20: QA-003 Offline guest to-do persistence

- The service worker loaded Today offline. TanStack Query paused the default online-mode mutation and list query before they could reach Dexie, so the sheet stayed on “Adding…” and reload lost the draft. Daily intention already used `networkMode: 'always'`. [TanStack Query network mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- Guest to-do list, create, edit and completion hooks now run offline. Create awaits the existing Dexie transaction and refreshes Today from storage before the sheet closes. A rejected write shows the translated save error and keeps the draft. Delete and Undo use the repository directly.
- Today list keys, mutation keys and the completion scope use the session generation. In regression tests a paused account create replayed into guest storage or used the next account's bearer token. The generation check now stops retired operations before they write. The old sheet is removed immediately on a session switch, and an in-flight Undo from the old session cannot block a new one.
- Vitest reproduces the offline pause, missing list, hidden write error and session races with fake IndexedDB and mocked account endpoints. The phone-375 regression waits for service-worker control, submits offline, checks the IndexedDB row, reloads offline, then reconnects and checks the row count and ID.
- Lint, typecheck, Knip, full LF formatting and the production build passed. Vitest passed 507 tests across 51 files with two workers, and Chromium passed all 49 phone-375 tests. A separate persistent Chromium profile showed the saved to-do once after closing and reopening the browser offline. Redocly validated OpenAPI with four existing warnings.
- One concurrent run timed out in the existing Today repeat-rule edit test. It passed in the full sequential rerun.
- Guest schedule reads, creates, edits and check-ins and the guest streak read still use default online-mode queries or mutations. Guest-plan summary loading can pause on an offline cache miss. The QA-001 cross-tab session finding also remains open.

### 2026-11-20: QA-010 Offline guest schedule reliability

- **Scope.** The planner authorized this follow-up for schedule work deferred by QA-003. The audit already uses QA-001 through QA-009. The first-parent history of `v2-rebuild` confirms QA-003 and F-022 through F-028 were merged. [QA-003 PR #35](https://github.com/danishsary8/Loomora_front/pull/35), [merge history at a3f15b5](https://github.com/danishsary8/Loomora_front/commits/a3f15b5)
- **Diagnosis.** TanStack Query paused schedule reads and writes before they reached Dexie. The phone regression reproduced the Add sheet staying open after an offline submit. Vitest reproduced the paused operations, stale account cache, paused writes crossing sessions, and a delayed deletion sent after an account switch.
- **Changes.** Week and Today load and save the guest schedule offline, including Copy Day, one-day overrides and skips, and check-ins. Today opens the existing occurrence editor from the day sheet. A rejected write keeps its form values. Repeat edits and dependent writes hold the relevant IndexedDB tables in one transaction through validation and persistence, so overlapping writes preserve edits and full deletion clears its dependent rows.
- **Session safety.** Schedule cache and mutation keys use the session generation. Paused account mutations from a retired session stop before contacting the API. Guest writes already in progress can finish in IndexedDB and refresh a returning guest's schedule. Pending deletion and Undo are tied to their original request and session. Leaving the screen within that session commits a pending delete. A session switch cancels one that has yet to start. Undo remains available for five seconds, and a committing row stays hidden until the result arrives.
- **Verification.** Lint, typecheck, Knip, LF formatting and the production build passed. Vitest passed 526 tests in 52 files with two workers. All 50 Playwright phone-375 tests passed. The offline PWA regression checked Week visibility and the original IndexedDB row and ID through reload and reconnect. Redocly validated OpenAPI with four existing warnings.
- **Review fixes.** Added regression tests for the guest cache after a sign-in and sign-out, a row reappearing while its deletion was still saving, and overlapping IndexedDB writes. Repository tests caught Dexie wrapping `NotFoundError`. Missing items still return the original error type. Save Plan tests that timed out during concurrent verification passed in the standalone suite.
- **Follow-up findings.** Guest streak and guest-plan summary reads can still pause on an offline cache miss.

### 2026-11-20: QA-011 Cross-tab session synchronization

- **Plan:** Reproduce cross-tab sign-out, account switch, retired async responses, and feedback loops in Vitest and two-tab Playwright; add loop-free `storage` + `BroadcastChannel` + `visibilitychange`/`focus` synchronization in `session.ts`; cancel and remove stale TanStack Query caches on `generation` transitions in `AppProviders`; guard retired auth/profile/streak/reminder responses and preserve guest Dexie data; run all required verification suites.
- **Root cause:** `useSession` read `localStorage` (`loomora.session`) only once at module startup and had no cross-tab listener. `AppProviders` reset queries only when `signedIn` boolean toggled (`true` <-> `false`), missing direct Account A -> Account B transitions. `useStreak` and `ReminderWatcher` lacked `generation` scoping, `setUser` could write into a signed-out or mismatched session, and async auth/profile callbacks (`SignInForm`, `SignUpForm`, `GoogleCallbackPage`, `SurveyPage`, `ProfilePage.leave()`) did not check session generation before mutating state or navigating.
- **Changed:**
  - `src/lib/api/tokenStorage.ts` & `src/lib/api/session.ts`: Added `parseStoredSession` (non-mutating), `window` `storage` listener (`loomora.session` and `key === null` for `localStorage.clear()`), `BroadcastChannel('loomora.session')` fallback with unique `TAB_ID`, and `focus` / `visibilitychange` reconciliation. External sync applies via `applyExternalSession` without writing back to `localStorage` or re-posting, and ignores duplicate sign-outs or identical snapshots. Hardened `setUser` against missing tokens or mismatched user IDs and made `signOut` idempotent when already signed out.
  - `src/app/AppProviders.tsx`: Subscribed to `useSession` `generation` changes to reset `useServiceStatus` and synchronously cancel and remove previous session queries before the next generation renders.
  - `src/lib/api/client.ts` & `src/lib/api/index.ts`: Added `getSessionVersion` check so retired `401` and `5xx` responses cannot sign out or mark service down for a newer session even if a token string repeats.
  - `src/features/streak/useStreak.ts`, `src/features/todos/useTodos.ts`, `src/features/reminders/ReminderWatcher.tsx`: Scoped streak and reminder query keys and watcher mounts by `generation` with session assertions.
  - `src/features/profile/ProfilePage.tsx`, `src/features/auth/SignInForm.tsx`, `src/features/auth/SignUpForm.tsx`, `src/features/auth/GoogleCallbackPage.tsx`, `src/features/auth/SurveyPage.tsx`, `src/features/auth/VerifyEmailPage.tsx`, `src/features/auth/SavePlanImport.tsx`, `src/features/auth/useSavePlan.ts`: Added session generation guards for in-flight auth/logout/survey/save-plan callbacks, closed `DeleteAccountSheet` / `SavePlanSheet` on sign-out while preserving F-028 same-tab account switch behavior, and keyed `SavePlanImport` by `generation`.
  - Tests: Extended `src/lib/api/session.test.ts` and `src/lib/api/client.test.ts`, added `src/app/crossTabSession.test.tsx` (7 tests) and two-tab `e2e/cross-tab-session.spec.ts` (one browser context).
- **Verified:** Lint (`npm run lint`), typecheck (`npm run typecheck`), Knip (`npm run knip`), Prettier (`prettier --check` on all changed files and `--end-of-line auto` across the repo), and production build (`npm run build`) all exited 0. Vitest passed 545 tests across 53 files (`npm test -- --maxWorkers=2`), including 15 tests in `src/lib/api/session.test.ts`, 10 tests in `src/lib/api/client.test.ts`, and 7 integration tests in `src/app/crossTabSession.test.tsx`. Playwright `phone-375` passed all 51 tests (`npm run e2e -- --project=phone-375`), including the new two-tab `e2e/cross-tab-session.spec.ts` (sign-out propagation, pending response protection, guest Dexie preservation, account switching, axe a11y, 375 px width, zero console/page errors). Redocly validated `docs/openapi.yaml` with the four existing warnings.
- **Review fixes (PR #37):**
  - **Cross-tab message ordering:** Updated `src/lib/api/tokenStorage.ts` (`readStoredSessionStatus`, boolean return from `writeSession`/`clearSession`) and `src/lib/api/session.ts` (`SessionOrder` `{ time, seq, sender }`, `persisted` flag, `sessionPersisted` tracking). Incoming `storage` events and `persisted !== false` `BroadcastChannel` messages now prefer the authoritative `localStorage` state when readable, reject delayed/reordered messages via monotonic order comparison, and preserve unpersisted fallback sessions across `focus`/`visibilitychange` when storage writes/reads are blocked. Added four Vitest regression tests in `src/lib/api/session.test.ts` (15 total).
  - **PR #36 dependency:** Fetched `origin/v2-rebuild` after PR #36 merged at `34b6a5a` and merged `origin/v2-rebuild` into `feat/QA-011-cross-tab-session` (`da6e5cb`), preserving `de42bd6` in branch history so PR #37 contains only QA-011 changes.
- **Remaining risks / notes:** Two-tab Playwright uses mocked `/api/**` routes in one browser context; cross-tab `storage` events and `BroadcastChannel` require a same-origin browser context and are verified against mocked API responses rather than a live backend. Note also that Windows `core.autocrlf=true` checks out untouched files with CRLF; all changed code files pass strict Prettier LF checks.

### 2026-11-20: QA-012 Offline guest streak and plan summary

- **Plan:** Reproduce offline cold-cache pauses in `useStreak` and `useGuestPlan` with Vitest (`RED`); set repository-driven `networkMode` in `useStreak` (`'always'` for `GuestStreakRepository`, `'online'` for `ServerStreakRepository`); set `networkMode: 'always'` and session-generation isolation (`[...guestPlanKey, generation]`) in `useGuestPlan`; add Vitest and mobile 375 px Playwright regression coverage; run all required verification suites and update `docs/TASKS.md` (marking QA-011 `done` after verifying PR #37 merge at `c9ef451`).
- **Root cause:** `useStreak` (`src/features/streak/useStreak.ts`) and `useGuestPlan` (`src/features/auth/useGuestPlan.ts`) omitted `networkMode`, defaulting to TanStack Query's `'online'` mode. On an offline cold cache (reopened IndexedDB / fresh `QueryClient`), both queries paused (`isPaused: true`) before reaching local Dexie storage. `useGuestPlan` also lacked `generation` scoping on its query key and `queryFn` guard.
- **Changed:**
  - `src/features/streak/useStreak.ts`: Added `networkMode = streak instanceof GuestStreakRepository ? 'always' : 'online'`, keeping account-backed streak reads (`ServerStreakRepository`) API-dependent while allowing guest streak reads offline.
  - `src/features/auth/useGuestPlan.ts`: Added `networkMode: 'always'` and generation-scoped query key `[...guestPlanKey, generation]` with `useSession.getState().generation !== generation` guard while preserving `guestPlanKey` and `streakKeys.all` prefix invalidations.
  - Tests: Added `src/features/streak/offlineStreak.test.tsx` (5 tests), `src/features/auth/offlineGuestPlan.test.tsx` (5 tests), and `e2e/offline-guest-reads.spec.ts` (`phone-375`).
  - Docs: Marked QA-011 `done` (`PR #37` merged at `c9ef451`) and added QA-012 (`review`) in `docs/TASKS.md`; logged QA-012 here.
- **Verified:**
  - RED before GREEN: `offlineStreak.test.tsx` (3/5 failed offline) and `offlineGuestPlan.test.tsx` (4/4 failed offline) reproduced cold-cache `isPaused: true` / `undefined` failures prior to production edits.
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run build` (PWA precache 49 entries), Prettier (`prettier --check` on all changed code files and `--end-of-line auto .` across the repo), and Redocly (`@redocly/cli lint docs/openapi.yaml`, valid with 4 existing warnings) all exited 0.
  - Vitest (`npm test -- --maxWorkers=2`): 55 test files / 555 tests passed.
  - Playwright `phone-375` (`npm run e2e -- --project=phone-375`): 52 tests passed, including `e2e/offline-guest-reads.spec.ts` (3 offline check-offs, `StreakBadge`, `SavePlanPrompt`, cold offline reloads on `/today` and `/profile`, reconnection persistence without duplicates, 375 px width, zero axe violations, zero console/page errors).
- **Remaining risks / notes:** Account-mode streak and import calls in Vitest/Playwright are verified against MSW/mocked routes rather than a live backend. On Windows (`core.autocrlf=true`), untouched checkout files have CRLF line endings; all changed code files pass strict LF Prettier checks.

### 2026-11-20: QA-013 Vercel SPA route reliability

- **Plan:**
  1. Reproduce the static-host 404 on direct SPA routes and inspect React Router, Vite PWA `navigateFallback`, and Vercel configuration.
  2. Add root `vercel.json` with Vite build settings, SPA rewrite to `/index.html` excluding `/api`, `/assets`, `/sw.js`, `/manifest.webmanifest`, and `/workbox-*.js`, plus `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`.
  3. Configure `workbox.navigateFallbackDenylist` in `vite.config.ts` so the service worker serves `/index.html` offline for SPA routes without intercepting `/api`, `/assets`, or PWA service-worker/manifest files.
  4. Add Vitest (`src/app/spaRouting.test.tsx`) and mobile 375 px Playwright (`e2e/spa-routing.spec.ts`) regressions covering direct HTTP navigation, refresh, unknown route (`NotFoundPage`), static assets, API exclusions, offline PWA, and absence of redirect loops.
  5. Run all required local checks, update `docs/TASKS.md` (marking QA-012 `done` after verifying PR #38 merged at `478f8a5`), and document live Vercel verification steps for the planner.
- **Root cause:** No `vercel.json` existed at the repository root (only `legacy/vercel.json`), so Vercel served only physical files in `dist/` (`/` -> `index.html`, `/sw.js`, `/manifest.webmanifest`) and returned HTTP 404 for direct HTTP requests/reloads to client-side routes (`/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, unknown routes). `vite preview` masked this locally because Vite's preview server has built-in SPA fallback, and a controlling service worker masked it after first visit on `/`, except `vite.config.ts` also lacked `navigateFallbackDenylist` to keep Workbox's `NavigationRoute` off `/api`, `/assets`, and PWA worker/manifest paths. React Router (`createBrowserRouter` in `src/app/App.tsx`, `routes.tsx`, `RouteGuards.tsx`, `GoogleCallbackPage.tsx`) already uses root-relative paths, handles `*` via `NotFoundPage`, and settles redirects once without loops.
- **Changed:**
  - `vercel.json`: Added root Vercel config (`framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, `rewrites` with `"/((?!api$|api/|assets$|assets/|sw\\.js$|manifest\\.webmanifest$|workbox-[^/]+\\.js$).*)"` -> `"/index.html"`, and `headers` setting `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`). Validated `source` pattern against Vercel CLI's bundled `path-to-regexp@6.3.0`.
  - `vite.config.ts`: Added `workbox.navigateFallbackDenylist` (`[/^\/api(?:\/|\?|$)/, /^\/assets(?:\/|\?|$)/, /^\/(?:sw\.js|manifest\.webmanifest|workbox-[^/]+\.js)(?:\?|$)/]`).
  - `src/app/spaRouting.test.tsx`: Added 9 Vitest tests verifying direct entry on `/today`, `/week`, `/profile`, `/sign-in`, `/this-route-does-not-exist`, `/auth/google/callback` (error and `?code=` exchange), and `RedirectIfSignedIn`/`RequireAuth` without redirect loops.
  - `e2e/spa-routing.spec.ts`: Added 4 Playwright `phone-375` tests serving `dist/` through an in-process Vercel-semantics HTTP host (filesystem precedence + `vercel.json` rewrites/headers) to verify direct HTTP GET + `reload()` on `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, and `/this-route-does-not-exist` (`NotFoundPage`), static asset MIME types, 404 preservation on `/api`, `/api/v1/health`, `/assets/missing-chunk.js`, `dist/sw.js` `denylist`, 375 px layout, offline PWA navigation/reload, and zero redirect loops.
  - `docs/TASKS.md`: Marked QA-012 `done` (`PR #38` merged at `478f8a5`) and added QA-013 (`review`).
- **Failing-before / passing-after:**
  - Before `vercel.json` / `vite.config.ts`: Static host probe over `dist/` returned `404` for `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, and `/does-not-exist` (`/` `200`, `/sw.js` `200`, `/manifest.webmanifest` `200`), and `e2e/spa-routing.spec.ts` failed all 4 tests (`initial GET /today` received `404`, `vercel.json` `null`).
  - After fix: `e2e/spa-routing.spec.ts` passed all 4 tests (`phone-375`) and `dist/sw.js` emitted `NavigationRoute` with the `denylist`.
- **Verified:**
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run build` (PWA precache 49 entries, 993.90 KiB), and Redocly (`npx --yes @redocly/cli lint docs/openapi.yaml`, valid with 4 existing warnings) all exited 0.
  - Prettier: `npx prettier --check vercel.json vite.config.ts src/app/spaRouting.test.tsx e2e/spa-routing.spec.ts` and `npx prettier --check --end-of-line auto .` exited 0.
  - Vitest: `npm test -- --maxWorkers=1` passed 56 test files / 564 tests (an earlier `--maxWorkers=2` run had 1 lazy-route load timeout in `TodayPage.test.tsx > shows two equal buttons` under concurrent Windows workers, which passed in `--maxWorkers=1`).
  - Playwright `phone-375`: `npm run e2e -- --project=phone-375` passed all 56 tests.
- **Environment-dependent verification for the planner (not run locally — no Vercel credentials, no auto-deploy):**
  1. Deploy the PR preview / merged `v2-rebuild` build on Vercel (`loomora-craft`).
  2. In a fresh context (no cookies, no service worker), check HTTP status and `Content-Type` on:
     - `curl.exe -i https://<vercel-host>/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, `/does-not-exist` -> expect `200` and `text/html`.
     - `curl.exe -i https://<vercel-host>/sw.js` -> expect `200`, JavaScript content type, and `Cache-Control: public, max-age=0, must-revalidate`.
     - `curl.exe -i https://<vercel-host>/manifest.webmanifest` -> expect `200` and `application/manifest+json`.
     - `curl.exe -i https://<vercel-host>/assets/<existing-chunk>.js` -> expect `200` and JavaScript content type.
     - `curl.exe -i https://<vercel-host>/api/v1/health` and `/assets/nonexistent.js` -> expect `404` (not `index.html`).
  3. In a fresh browser at 375 px, open `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, and `/does-not-exist`, hard-refresh each, verify no 404 and no redirect loops, and verify PWA install/first-launch to `start_url: /today` plus offline reload.

### 2026-11-20: QA-014 Frontend dependency security

- **Plan:**
  1. Reproduce `npm audit --omit=dev`, `npm audit`, and `npm ls --depth=0` against QA-001, separating runtime `dependencies` from tooling/build-only `devDependencies`.
  2. Update `eslint` (`10.13.0` -> `10.15.0`) and `typescript-eslint` (`8.72.0` -> `8.73.0`) within compatible major lines in `package.json` and `package-lock.json` to move `@eslint/config-array` and `@typescript-eslint/*` onto patched `minimatch` (`11.0.9`).
  3. Evaluate the remaining `vite-plugin-pwa@2.0.0` -> `workbox-build@7.4.1` -> `glob@11.1.0` -> `minimatch@10.2.6` chain and document any unavoidable build-time exception with impact, exploitability, and recommended decision.
  4. Add an offline Vitest regression test (`src/test/dependencySecurity.test.ts`) verifying production dependency isolation and patched lockfile minimums.
  5. Run `npm ci`, audits, lint, typecheck, Knip, formatting, Vitest (`--maxWorkers=1`), build, phone-375 Playwright, and Redocly OpenAPI lint; mark QA-013 `done` (`PR #39` merged at `3ffcdfe`).
- **Audit reproduction vs QA-001 (separated by production vs development):**
  - **Production (`npm audit --omit=dev`):** `found 0 vulnerabilities` (30 production dependencies) before and after. None of `eslint`, `typescript-eslint`, `vite-plugin-pwa`, `workbox-build`, `glob`, or `minimatch` appear in runtime `dependencies` or non-dev lockfile entries.
  - **Development-only (`npm audit`) before:** 12 moderate findings matching QA-001:
    - `GHSA-g3hv-75wg-m249` (`minimatch` `7.0.0 - 11.0.0`, moderate, potential DoS via globparts amplification): affected `eslint` (`10.13.0`), `@eslint/config-array` (`0.23.5`), `typescript-eslint` (`8.72.0`), `@typescript-eslint/{eslint-plugin,parser,type-utils,typescript-estree,utils}` (`8.72.0`), and `glob` (`11.1.0`).
    - `GHSA-3g3m-2fjr-6pw4` (`glob` `9.0.0 - 14.0.1`, moderate, `AbortSignal` cancellation bypass allows post-timeout filesystem traversal): affected `glob` (`11.1.0`) -> `workbox-build` (`7.4.1`) -> `vite-plugin-pwa` (`2.0.0`).
  - **Development-only (`npm audit`) after:** 4 moderate findings remaining (8 resolved). `eslint@10.15.0` and `typescript-eslint@8.73.0` moved `@eslint/config-array` (`0.23.6`), `@typescript-eslint/*` (`8.73.0`), and all ESLint / `typescript-eslint` `minimatch` resolutions to `11.0.9`. Note: `npm 11.6.1` on Windows initially pruned the optional `wasm32` `@emnapi/core` (`1.11.2`) and `@emnapi/runtime` (`1.11.2`) peer entries required by `@napi-rs/wasm-runtime` / `@oxc-resolver/binding-wasm32-wasi` during lockfile regeneration; restoring those two `HEAD` entries in `package-lock.json` kept `npm ci` cleanly reproducible.
- **Unavoidable security exception for planner review (`vite-plugin-pwa@2.0.0` -> `workbox-build@7.4.1` -> `glob@11.1.0` -> `minimatch@10.2.6`):**
  - **Why not resolved automatically:** `vite-plugin-pwa@2.0.0` and `workbox-build@7.4.1` are already the latest releases in their lines (`workbox-build@7.4.1` declares `"glob": "^11.0.1"`). Running `npm audit fix --force` proposes a breaking downgrade to `vite-plugin-pwa@1.1.0` (`workbox-build@7.3.0` -> `glob@^7.1.6`), which relies on deprecated `glob@7` (only unflagged because `GHSA-3g3m-2fjr-6pw4` starts at `9.0.0`). Forcing `glob` across three major versions (`11` -> `14`) via `package.json` `overrides` goes outside `workbox-build`'s declared semver range.
  - **Impact & exploitability:** Build-time `devDependency` only; never bundled into `dist/` client assets or `dist/sw.js` runtime code. In `workbox-build/build/lib/get-file-details.js`, `globSync(globPattern, { cwd, follow, ignore })` is called synchronously with static developer-configured `globPatterns` (`**/*.{js,css,html,svg,png,woff,woff2}` in `vite.config.ts`), with no `AbortSignal` (`GHSA-3g3m-2fjr-6pw4` unreachable) and no untrusted glob input (`GHSA-g3hv-75wg-m249` unreachable).
  - **Recommended decision:** Accept this build-time-only dev exception on `vite-plugin-pwa@2.0.0` / `workbox-build@7.4.1` until upstream `workbox-build` upgrades `glob` to `>=14.0.2`.
- **Changed:**
  - `package.json` & `package-lock.json`: Updated `eslint` (`10.13.0` -> `10.15.0`) and `typescript-eslint` (`8.72.0` -> `8.73.0`) with exact pins; preserved optional `@emnapi/core` / `@emnapi/runtime` lockfile entries so `npm ci` succeeds cleanly.
  - `src/test/dependencySecurity.test.ts`: Added offline regression checks ensuring build/lint tooling stays out of production `dependencies` and lockfile resolutions maintain patched minimums for `eslint`, `@eslint/config-array`, `typescript-eslint`, `@typescript-eslint/*`, `minimatch` (`>=11.0.1`), and `vite-plugin-pwa` (`>=2.0.0`).
  - `docs/TASKS.md`: Marked QA-013 `done` (`PR #39` merged at `3ffcdfe`) and added QA-014 (`review`).
- **Verified:**
  - `npm ci` exited 0 (746 packages added, audited 747 packages).
  - `npm audit --omit=dev` exited 0 (`found 0 vulnerabilities`).
  - `npm audit` exited 1 with only the 4 documented moderate dev-only findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa`).
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run build` (PWA v2.0.0 `generateSW`, 49 precache entries, 993.90 KiB), and `npx @redocly/cli lint docs/openapi.yaml` (valid with 4 existing warnings) all exited 0.
  - Prettier: `npx prettier --check src/test/dependencySecurity.test.ts` and `npx prettier --check --end-of-line auto .` exited 0 (`npm run format:check` exited 1 solely due to Windows `core.autocrlf=true` CRLF checkout).
  - Vitest (`npm test -- --maxWorkers=1`): 57 test files / 566 tests passed, including `src/test/dependencySecurity.test.ts` (2 tests).
  - Playwright `phone-375` (`npm run e2e -- --project=phone-375`): 56/56 passed (1.4m), covering `pwa.spec.ts`, `spa-routing.spec.ts`, `cross-tab-session.spec.ts`, `offline-todos.spec.ts`, `offline-schedule.spec.ts`, `offline-guest-reads.spec.ts`, and `reminders.spec.ts` (an earlier parallel run had 1 timeout in `e2e/reminders.spec.ts` under 4 workers, which passed both standalone and in the final 56/56 run).

### 2026-11-20: QA-015 Frontend security headers and CSP hardening

- **Plan:**
  1. Probe live `https://loomora-craft.vercel.app` and `https://loomora-api.onrender.com/api/v1/health` with read-only HTTP requests to verify QA-001/QA-005 header findings, and inventory all Loomora asset, boot-style, font, Google OAuth, Render API, Workbox SW, and offline PWA requirements.
  2. Write RED Vitest (`src/test/securityHeaders.test.ts`) and Playwright (`e2e/security-headers.spec.ts`) regressions before changing `vercel.json`.
  3. Configure baseline security headers and a restrictive `Content-Security-Policy` in root `vercel.json` on `/(.*)` while preserving the QA-013 SPA rewrite and `/sw.js` `Cache-Control: public, max-age=0, must-revalidate`.
  4. Verify GREEN across all new and existing checks (`npm ci`, lint, typecheck, Knip, LF formatting, Vitest `--maxWorkers=1`, production build, phone-375 Playwright, npm audits, and Redocly OpenAPI lint), mark QA-014 `done` (`PR #40` merged at `fe58dc0`), and document live Vercel verification steps.
- **Live header audit (read-only `curl.exe -sSI` before changes):**
  - `https://loomora-craft.vercel.app/` (`200`), `/sw.js` (`200`), `/manifest.webmanifest` (`200`), `/today` (`404` on pre-QA-013 prod): only Vercel platform `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` was present; `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy` were all absent (matching QA-001 / QA-005).
  - `https://loomora-api.onrender.com/api/v1/health` (`200`): confirmed backend emits `content-security-policy: default-src 'none'; frame-ancestors 'none'`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `strict-transport-security: max-age=31536000; includeSubDomains`, and `access-control-allow-origin: https://loomora-craft.vercel.app`.
- **Frontend resource & CSP audit:**
  - Same-origin scripts/styles/assets: bundled under `/assets/*.js`, `/assets/*.css`, `/sw.js`, `/workbox-*.js`, `/manifest.webmanifest`, `/icon*.svg|png`, and self-hosted `@fontsource-variable/{caveat,space-grotesk}` `.woff2` fonts (no Google Fonts CDN or external scripts/images).
  - Inline boot `<style>` in `index.html` (F-029): `vite build` strips `\r` so `dist/index.html` has a stable LF SHA-256 hash (`sha256-f5dF16tVBt10PewzxCqqrvCGvvv2PnzQeGugOFK59oQ=`), allowing `style-src` without `'unsafe-inline'` while React CSSOM `style={{...}}` and `framer-motion` `LazyMotion` run with zero CSP violations.
  - Auth & API: Google OAuth starts via full-page `<a href>` navigation (`GoogleButton.tsx` -> `https://loomora-api.onrender.com/api/v1/auth/google/redirect`), returns to `/auth/google/callback?code=...`, and exchanges via `fetch` to `https://loomora-api.onrender.com/api/v1/auth/google/exchange` (allowed by `connect-src 'self' https://loomora-api.onrender.com`).
  - Caching: `/` retains Vercel default non-immutable caching (no `Cache-Control` added in `vercel.json`); `/sw.js` preserves `Cache-Control: public, max-age=0, must-revalidate`.
- **Changed:**
  - `vercel.json`: Added `/(.*)` header rule with `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`; preserved `rewrites` and `/sw.js` `Cache-Control`.
  - `playwright.config.ts`: Set `VITE_API_URL` default (`https://loomora-api.onrender.com/api/v1`) on `webServer.env` so `e2e/spa-routing.spec.ts` and `e2e/security-headers.spec.ts` test `dist/` against the production Render origin rather than the local `http://localhost:8000` fallback.
  - `src/test/securityHeaders.test.ts`: Added config + CSP hash + header/rewrite resolution regression tests (RED: 7 failed / 1 passed -> GREEN: 8/8 passed).
  - `e2e/security-headers.spec.ts`: Added HTTP header + Chromium 375 px CSP enforcement, Google OAuth, Render API, and offline PWA regressions against `vercel.json` + `dist/` (RED: 3/3 failed -> GREEN: 3/3 passed).
  - `docs/TASKS.md`: Marked QA-014 `done` (`PR #40` at `fe58dc0`) and added QA-015 (`review`).
- **Verified (after final code/config/TASKS edits):**
  - `npm ci` exited 0 (746 packages added, audited 747 packages).
  - `npm run lint`, `npm run typecheck`, and `npm run knip` all exited 0.
  - Prettier: `npx prettier --check vercel.json playwright.config.ts src/test/securityHeaders.test.ts e2e/security-headers.spec.ts` and `npx prettier --check --end-of-line auto .` exited 0 (`npm run format:check` exited 1 solely on 252 untouched files checked out with Windows CRLF).
  - Vitest (`npm test -- --maxWorkers=1`): 58 test files / 574 tests passed, including `src/test/securityHeaders.test.ts` (8 tests).
  - `npm run build` exited 0 (PWA v2.0.0 `generateSW`, 49 precache entries, 993.92 KiB).
  - Playwright (`npm run e2e -- --project=phone-375`): 59/59 passed (1.5m), including `e2e/security-headers.spec.ts` (3/3) and `e2e/spa-routing.spec.ts` (4/4).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`). `npm audit`: exited 1 with only the 4 accepted dev-only moderate findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa` from QA-014).
  - `npx @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).
- **Local simulator limitations & live Vercel verification steps for planner:**
  - The local HTTP server in `e2e/security-headers.spec.ts` mirrors `vercel.json` rewrites/headers over `dist/`, which cannot simulate Vercel edge HTTPS/HSTS termination, Vercel CDN default `Cache-Control` on `/assets/*` vs `/`, or Vercel Preview Toolbar (`https://vercel.live`) if enabled on protected preview deployments (CSP intentionally blocks `https://vercel.live` in production; if Preview Toolbar is needed on preview URLs, disable the toolbar or evaluate preview-only headers).
  - After deploying to Vercel, verify:
    1. `curl.exe -sSI https://<vercel-host>/` and `/today` and `/sw.js` return all 6 security headers (`content-security-policy`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `strict-transport-security: max-age=63072000; includeSubDomains; preload`, `permissions-policy`) and `/sw.js` retains `cache-control: public, max-age=0, must-revalidate` while `/` does not emit long-lived caching.
    2. Open the deployed site in mobile Chrome/Edge DevTools (`375 px`) across `/`, `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, verify zero `Content-Security-Policy` console errors, verify Google OAuth redirect + exchange against `https://loomora-api.onrender.com/api/v1`, and verify PWA install + offline `/today` reload.

### 2026-11-20: QA-016 Vercel deployment & live route verification

- **Plan:**
  1. Verify PR #41 (`37d5dd5`) merge on `origin/v2-rebuild` and inspect deployment provenance across `v2-rebuild`, `main`, GitHub commit statuses, Vercel bot PR comments, and local CLI credentials (`vercel`, `gh`).
  2. Probe all 13 public routes on `https://loomora-craft.vercel.app` with read-only HTTP requests and inspect the served JS bundle to confirm deployed version, headers, and API origin.
  3. Inspect `v2-rebuild` and PR preview URLs, distinguishing Vercel Deployment Protection (`302` SSO) from routing/CSP behavior.
  4. Classify root cause (A/B/E vs C/D) and prepare a safe owner-executed remediation and post-promotion verification plan without modifying production.
  5. Mark QA-015 `done`, record QA-016 (`blocked` on owner Vercel access/approval) in `docs/TASKS.md` and `docs/PROGRESS.md`, run full verification on `feat/QA-016-vercel-deployment-verification`, and open one PR into `v2-rebuild`.
- **Deployment provenance & mismatch:**
  - **Repository & default branch:** `danishsary8/Loomora_front`, GitHub `default_branch: v2-rebuild`. PR #39 (QA-013) merged at `3ffcdfe`, PR #40 (QA-014) at `fe58dc0`, PR #41 (QA-015) at `37d5dd5` (`origin/v2-rebuild` HEAD). Legacy `origin/main` sits at `0f116e7` with no Vercel status.
  - **Current production deployment:** `https://loomora-craft.vercel.app` serves `dpl_DV53gg1xKhSr2XbBFneDuyDy3Yge` (`v2-rebuild` commit `acd5e7d`, `docs: mark F-016 done`, built `2026-11-19T01:27:20Z`, asset `Last-Modified: Thu, 19 Nov 2026 01:34:49 GMT`), **56 commits (21 first-parent merges) behind `origin/v2-rebuild` (`37d5dd5`)**. Verified in live assets: `index.html` lacks F-029's `#boot` inline `<style>`, `assets/index-CuWRQbNo.js` contains `https://loomora-api.onrender.com/api/v1`, `Save your plan`, and `Delete my account` without `dailyIntention`, and `sw.js` lacks `navigateFallbackDenylist`.
  - **Auto-deployments & latest `v2-rebuild` / preview deployments:** Vercel GitHub integration is active and built every commit pushed to `v2-rebuild` from `acd5e7d` onward (`3ffcdfe` -> `H5hQp8Eg5EHP7p5ssQmt7Svnnvri`, `fe58dc0` -> `n4p9jp1m5N9qsBbVUiz3hugtcqtJ`, `37d5dd5` -> `GU1bKLwGwWE5UvEaBBfprmFZHe58` at `2026-11-20T09:08:35Z`), plus PR previews (`#39` `GvKNLkoLtDuYTV9kF3XfTvQoJreT`, `#40` `CqpJDwkC7bUQNZXr5ekRnz6HrShL`, `#41` `J4PjDL6wBoLPQEAW9aARb63xuk2w`).
  - **Production branch & Vercel CLI/dashboard access:** `vercel` CLI (`46.0.2`) has no local credentials (`Error: No existing credentials found`), and `gh` CLI is unauthenticated locally. Both `https://loomora-craft-git-v2-rebuild-danishs-projects-79a48970.vercel.app` and `https://loomora-craft-git-feat-qa-015-ba6d3f-danishs-projects-79a48970.vercel.app` (and `feat-qa-013`) return HTTP `302` to `https://vercel.com/sso-api?...` (Vercel Deployment Protection), confirming `v2-rebuild` is currently building into SSO-protected **Preview** rather than updating the public Production alias.
  - **Unverified Vercel settings (owner dashboard check required):** Connected project `Production Branch` (suspected `main` instead of `v2-rebuild`, or Production alias auto-assignment disabled/pinned to `DV53gg1xKhSr2XbBFneDuyDy3Yge`), `Root Directory`, `Build Command` (`npm run build`), `Output Directory` (`dist`), `Auto-assign Custom Production Domains`, Preview vs Production scoping of `VITE_API_URL` (`https://loomora-api.onrender.com/api/v1`), and `Vercel Toolbar` preview setting.
- **Root cause classification:**
  - **A (Production branch mismatch) and/or B (Old deployment `dpl_DV53gg1xKhSr2XbBFneDuyDy3Yge` still assigned to `loomora-craft.vercel.app`), paired with E (Insufficient access):** Vercel has built `37d5dd5` (`dpl_GU1bKLwGwWE5UvEaBBfprmFZHe58`), but `v2-rebuild` deployments are landing as protected Previews / not updating the Production alias.
  - **Not C or D (no repository code/config defect found):** Root `vercel.json` (QA-013 + QA-015) and `vite.config.ts` (`navigateFallbackDenylist`) are merged at `37d5dd5` and pass all local Vitest and Playwright Vercel-host simulations.
- **Live HTTP results on `https://loomora-craft.vercel.app` (read-only, 2026-11-20 ~16:12 +07:00):**
  - `/` -> `200`, `text/html; charset=utf-8`, `cache-control: public, max-age=0, must-revalidate`, `last-modified: Thu, 19 Nov 2026 01:34:49 GMT` (old `acd5e7d` HTML, 639 B).
  - `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, `/verify-email`, `/reset-password`, `/this-route-does-not-exist` -> all `404`, `text/plain; charset=utf-8` (`The page could not be found NOT_FOUND`).
  - `/sw.js` -> `200`, `application/javascript; charset=utf-8`, `cache-control: public, max-age=0, must-revalidate` (old Workbox SW without `navigateFallbackDenylist`).
  - `/manifest.webmanifest` -> `200`, `application/manifest+json; charset=utf-8` (`start_url: "/today"`).
  - `/api/v1/health`, `/assets/nonexistent.js` -> `404`, `text/plain; charset=utf-8`.
  - **Live Render API check (`https://loomora-api.onrender.com/api/v1/health`):** `200`, `application/json`, `{"status":"ok"}`, `access-control-allow-origin: https://loomora-craft.vercel.app`, `content-security-policy: default-src 'none'; frame-ancestors 'none'`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `strict-transport-security: max-age=31536000; includeSubDomains`.
- **Security header & CSP verification:**
  - **Live `https://loomora-craft.vercel.app`:** Emits only `strict-transport-security: max-age=63072000; includeSubDomains; preload`. `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` are all absent due to the outdated `acd5e7d` deployment.
  - **Current `v2-rebuild` (`37d5dd5`) `vercel.json`:** Emits all 6 headers on `/(.*)` and `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`, permits `'self'`, inline `#boot` style SHA-256 (`'sha256-f5dF16tVBt10PewzxCqqrvCGvvv2PnzQeGugOFK59oQ='`), self-hosted `.woff2` fonts, Workbox SW, and `connect-src 'self' https://loomora-api.onrender.com`.
  - **Vercel Preview Toolbar conflict:** If enabled on Vercel Preview deployments, `https://vercel.live` script/style/frame/connect injections conflict with the strict CSP in `vercel.json`. Keep production CSP strict; disable Vercel Toolbar in project settings for previews if preview testing hits CSP warnings, rather than weakening production CSP.
- **Preview candidate inspection (`37d5dd5`):**
  - `https://loomora-craft-git-v2-rebuild-danishs-projects-79a48970.vercel.app` and `https://loomora-craft-git-feat-qa-015-ba6d3f-danishs-projects-79a48970.vercel.app` both return `302` to `https://vercel.com/sso-api?...`. This is Vercel Deployment Protection (not a routing defect). Unauthenticated browser inspection of live `37d5dd5` is therefore blocked; local `37d5dd5` `dist/` + `vercel.json` Playwright checks (`spa-routing.spec.ts`, `security-headers.spec.ts`, `pwa.spec.ts`) serve as the pre-promotion candidate check.
- **Corrective action & required owner approval (no production changes executed):**
  1. In Vercel Dashboard (`danishs-projects-79a48970/loomora-craft` -> **Settings -> Environments / Git**): verify `Connected Git Repository` is `danishsary8/Loomora_front`, set **Production Branch** to `v2-rebuild`, ensure **Root Directory** is empty (repo root), **Framework Preset** = `Vite`, **Build Command** = `npm run build`, **Output Directory** = `dist`, and **Auto-assign Custom Production Domains** is enabled.
  2. In **Settings -> Environment Variables**: verify `VITE_API_URL=https://loomora-api.onrender.com/api/v1` is set for **Production** (and for **Preview** if testing previews against Render, or paired staging URL).
  3. Inspect `dpl_GU1bKLwGwWE5UvEaBBfprmFZHe58` (`37d5dd5`) while signed into Vercel (via its protected deployment URL) to verify direct `/today`, `/week`, `/profile`, `/sign-in`, `/auth/google/callback`, `/verify-email`, `/reset-password`, `/this-route-does-not-exist`, all 6 security headers, zero CSP errors, and `VITE_API_URL`.
  4. **With Danish's explicit approval**, trigger a fresh Production deployment from `v2-rebuild` (`37d5dd5`+) or promote `dpl_GU1bKLwGwWE5UvEaBBfprmFZHe58` to `loomora-craft.vercel.app` (rollback target if needed: `dpl_DV53gg1xKhSr2XbBFneDuyDy3Yge`).
  5. After promotion, re-run the unauthenticated `curl` route + header matrix and 375 px mobile/PWA offline verification on `https://loomora-craft.vercel.app` before closing QA-002 / QA-016.
- **Remaining QA-009 release blockers:**
  - Live promotion and unauthenticated verification of `37d5dd5` on `https://loomora-craft.vercel.app` (QA-002 / QA-016).
  - Backend Render provenance (`DEPLOY` branch/SHA, `APP_DEBUG=false`, `APP_KEY`, Neon TLS, migrations) and Q25 owner checklist from B-032.
  - Real Google OAuth consent/exchange and Brevo email verification/password-reset delivery on the paired hosted release candidate.
  - QA-004 privacy/terms & Google-only account deletion scope (Q23), plus QA-008 mobile performance/manual accessibility/SW update checks.
- **Changed (this branch):** Marked QA-015 `done` (`PR #41` at `37d5dd5`) and added QA-016 (`blocked` pending owner Vercel execution) in `docs/TASKS.md`; logged QA-016 findings here. No application code or production deployment settings modified.
- **Verified (local `37d5dd5` + docs updates):**
  - `npm ci` exited 0 (746 packages added, audited 747 packages).
  - `npm run lint`, `npm run typecheck`, and `npm run knip` all exited 0.
  - Prettier: `npx prettier --check docs/TASKS.md docs/PROGRESS.md` and `npx prettier --check --end-of-line auto .` exited 0.
  - Vitest (`npm test -- --maxWorkers=1`): 58 test files / 574 tests passed.
  - `npm run build`: exited 0 (PWA v2.0.0 `generateSW`, 49 precache entries, 993.92 KiB).
  - Playwright (`npm run e2e -- --project=phone-375`): 59/59 passed (1.7m), including `e2e/spa-routing.spec.ts` (4/4), `e2e/security-headers.spec.ts` (3/3), and `e2e/pwa.spec.ts` (2/2).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`). `npm audit`: exited 1 with only the 4 accepted dev-only moderate findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa` tracked under QA-014).
  - `npx @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).

### 2026-11-20: QA-017 Privacy & Terms accuracy

- **Plan:**
  1. Audit existing Privacy and Terms disclosures against frontend (`Dexie`, `localStorage`, auth, profile, feedback, `DeleteAccountSheet`, `vite-plugin-pwa`, `vercel.json`) and read-only `loomora_back` implementations (`AuthController`, `GoogleAuthController`, `MeController`, `DeleteMeRequest`, `FeedbackController`, `EmailVerificationController`, `PasswordResetController`, `render.yaml`, `DEPLOY.md`, `Backend_PROGRESS.md`).
  2. Write failing RED Vitest (`src/features/legal/LegalPage.test.tsx`) and 375 px Playwright (`e2e/legal.spec.ts`) tests before editing production copy or components.
  3. Update `src/features/legal/LegalPage.tsx` and `src/i18n/en.json` to accurately distinguish guest mode, account mode, feedback, hosting/email/OAuth providers, service-worker offline behavior, password deletion, and the unresolved Google-only deletion limitation (Q23) without inventing unverified legal/contact/retention claims.
  4. Verify GREEN with all static checks, unit tests, production build, phone-375 Playwright, Prettier, npm audits, OpenAPI lint, and `git diff --check`.
  5. Document missing owner decisions and keep Q23 open and QA-004 publication approval blocked until Danish confirms them.
- **Source-backed disclosure audit:**
  - | Topic | Current disclosure | Verified implementation behavior | Evidence | Inaccuracy or omission | Correction applied | Owner confirmation required? |
  - |---|---|---|---|---|---|---|
  - | Guest local storage (Dexie/IndexedDB) | `privacy.s1`: everything saved on device, "Loomora does not send it to us"; `terms.s2`: "saved on your device only" | Guest todos (subtasks, priority, notes, repeat, reminders), schedule items/exceptions/check-ins, daily intentions, and display prefs live in IndexedDB (`loomora-guest`) plus snooze flag `loomora.savePlanDismissedOn` in `localStorage`. Lost if site data cleared or device lost; imported to account only on signup/signin (`POST /import`). | False blanket "does not send it to us" and "device only"; omits daily intentions, prefs, and `localStorage` snooze flag. | Separated **Guest mode** section explaining IndexedDB/`localStorage`, loss risk, and non-transmission unless importing to an account or sending feedback. | No (code-verified). |
  - | Account remote storage (API + PostgreSQL) | `privacy.s5`: "Accounts are not available yet." | Accounts are live. Account plans, intentions, streaks, and display settings are sent to Laravel API (`VITE_API_URL`) and stored in PostgreSQL; `POST /import` clears imported IndexedDB plan rows after all chunks succeed. | Directly false; accounts and cloud sync are active. | Removed "Accounts are not available yet" and added **Account mode** disclosures for remote API/PostgreSQL storage and guest import. | Retention/backup schedule only (see below). |
  - | Auth, Google sign-in & session tokens | `privacy.s2`: "You do not need a name or an email"; claims "no analytics" | Email signup collects email, hashed password, name, timezone, optional survey (`goal`, `heard_from`). Google OAuth (`openid`, `email`, `profile`) stores `google_id`, email, name, verified timestamp. Sanctum 30-day bearer token + user JSON stored in `localStorage` (`loomora.session`). Codebase contains no ad/analytics SDKs, though live Vercel hosting analytics settings remain unverified outside git. | Omitted account/OAuth/survey collection and `localStorage` session token; unverified "no analytics" and "we do not sell anything" claims. | Clarified guest needs no name/email, detailed account/OAuth/survey fields and 30-day `localStorage` token, removed unapproved "no analytics" and "do not sell" policy claims, and marked hosting analytics/data-sharing disclosures as pending owner confirmation. | Confirm Google OAuth consent screen, Vercel Analytics status, and data-sharing/no-sale policy. |
  - | Brevo verification & password reset | Omitted | Backend `AppServiceProvider` + `VerifyEmailMail` (24h HMAC link) + `ResetPasswordMail` (60m broker token) use `brevo` transport when `MAIL_MAILER=brevo`. Live Brevo delivery pending staging check. | Completely omitted. | Disclosed Brevo as configured backend email service for verification, password reset, and feedback emails. | Yes — confirm live Brevo account, sender address, and provider policy acceptance. |
  - | Feedback stored & emailed | Omitted | Guests and accounts can submit up to 5,000 chars via `POST /feedback` (10/hr). Stored in `feedback` table (`user_id` nullable; `cascadeOnDelete` when linked) and emailed plain-text to `FEEDBACK_TO_EMAIL` (with account Reply-To if signed in). | Completely omitted; conflicted with "does not send it to us". | Added **Feedback** section disclosing DB storage, optional account link, and developer email forwarding with Reply-To when signed in. | Yes — confirm `FEEDBACK_TO_EMAIL` and inbox retention. |
  - | Hosting & DB providers (Vercel, Render, Neon) | `privacy.s3`: "a hosting provider" for the website | Frontend configured for Vercel (`vercel.json`); API configured for Render (`render.yaml`, `loomora-api`); DB documented on Neon (`DEPLOY.md`, `docs/07`, `docs/10`). Providers may keep standard request/IP logs. | Omitted API host, DB host, email/auth services. | Disclosed Vercel (web), Render (API), Neon (documented PostgreSQL host), Google (optional OAuth), Brevo (configured mailer), and standard provider logs. | Yes — confirm live production Neon/Render/Vercel setup and log drains. |
  - | Service worker & offline behavior | Omitted | Workbox SW (`vite-plugin-pwa`, `autoUpdate`) caches app shell/fonts offline. Guest edits save offline in IndexedDB; account mode shows `OfflineBanner` ("Changes will not be saved until you are back online"). | Omitted app caching and guest-vs-account offline difference. | Added **Offline caching (service worker)** section distinguishing offline guest edits from online-required account saves. | No (code-verified; Q21 update-prompt UX remains open). |
  - | Account deletion & soft-delete cleanup | `privacy.s4`: clear browser data "and Loomora forgets everything. We cannot restore it, because we never had it." | Password accounts can delete immediately in Profile (`DELETE /me` -> `User::deleteWithData()`), deleting tokens, reset tokens, sessions, user, todos (incl. soft-deleted), schedule, intentions, and user-linked feedback in DB. Soft-deleted todos stay in DB up to 7-day restore (no purge command yet per `Backend_PROGRESS.md` Q19). Clearing browser data does not delete server feedback; `DELETE /me` does not wipe separate browser storage or already-sent emails. | False claim that clearing browser data removes everything and Loomora never had data; omitted `DELETE /me` and soft-delete persistence. | Separated guest browser-data clearing from password account `DELETE /me` scope and noted 7-day soft-delete persistence without automatic purge. | Yes — confirm Q19 purge/retention decisions and backup retention. |
  - | Google-only deletion limitation (**Q23**) | Omitted (claims accounts unavailable) | Google-only users (`has_password: false`) have `password = null`. `DeleteMeRequest` returns 422; `DeleteAccountSheet` shows `profile.deleteGoogleNote` ("Confirming your identity with Google is not supported yet.") with no delete button. Independent of backend B-035 investigation. | Omitted; could mislead Google users about deletion availability. | Explicitly disclosed in Privacy and Terms that Google-only accounts cannot currently be deleted in the app because Google re-auth for deletion is not supported yet. **Q23 kept open.** | Yes — owner decision on Q23 launch treatment & manual deletion path. |
  - | Retention, contact & publication metadata | `legal.updated`: `24 October 2026`; no contact email, entity, jurisdiction, or retention policy | No operator email/address/entity, jurisdiction, backup retention, or log retention period exists in code or confirmed docs (`Q19` in F-012, `QA-004`). | Stale date; publication metadata unconfirmed by owner. | Updated date to `20 November 2026`, noted student-developed status and in-app Send feedback path, and avoided inventing email/entity/residency/GDPR/retention guarantees. | **Yes — publication approval BLOCKED** until Danish supplies/approves these items. |
- **Changed:**
  - `src/i18n/en.json`: Updated `legal.updated` (`20 November 2026`), expanded `legal.privacy` (`s1`–`s7` with structured items) and `legal.terms` (`s1`–`s6` with structured items) to match verified guest/account/deletion/provider behavior without inventing unverified legal promises.
  - `src/features/legal/LegalPage.tsx`: Updated section renderer (`useLegalSections`) to support typed per-page sections and accessible bullet lists (`<ul>`) while preserving `StandalonePage`, `PageHeading`, cream neo-brutalist styling, `/privacy` & `/terms` routes, and 375 px layout.
  - `src/features/legal/LegalPage.test.tsx`: Replaced outdated local-only assertion with source-backed regression checks for guest vs account differentiation, providers/feedback/SW disclosures, absence of false local-only/no-account claims, Q23 deletion honesty, untranslated-key guard, and existing entry-point link checks (confirming `StandalonePage` footer links and `AppLayout` Profile behavior).
  - `e2e/legal.spec.ts`: Added 375 px mobile Playwright test covering landing/sign-in/sign-up footer links, keyboard `Tab`/`Enter` navigation, heading hierarchy (`h1` -> `h2`), 375 px overflow (`<= 375`), Axe WCAG 2.0/2.1 A/AA checks, and zero console errors/warnings.
  - `docs/TASKS.md` & `docs/PROGRESS.md`: Added QA-017 while preserving QA-016 history, keeping Q23 open, and keeping QA-004 / legal publication blocked on Danish's approvals.
- **RED/GREEN test evidence:**
  - **RED** (before editing `LegalPage.tsx` / `en.json`): `npx vitest run src/features/legal/LegalPage.test.tsx` failed **6/19** tests (`Accounts are not available yet`, `Your plan is saved on your device only`, missing `IndexedDB`/`PostgreSQL`/`Send feedback`/`Delete my account`/`Guest mode` disclosures); `npm run e2e -- e2e/legal.spec.ts --project=phone-375` failed **1/1** (`Expected pattern: /IndexedDB/i`, received old `Accounts are not available yet.` text).
  - **GREEN** (after edits): `npx vitest run src/features/legal/LegalPage.test.tsx src/i18n/i18n.test.ts` passed **2/2** files (**21/21** tests); `npm run e2e -- e2e/legal.spec.ts --project=phone-375` passed **1/1** (0 axe violations, 0 console errors/warnings).
- **Missing legal/operator facts requiring Danish's approval (QA-004 publication blockers):**
  1. **Operator identity & contact:** Legal/display name of operator (student developer), dedicated privacy/support email address (distinct from `FEEDBACK_TO_EMAIL` or confirmed same), and physical/postal contact notice if required.
  2. **Effective date & governing jurisdiction:** Official policy effective date for public release and applicable governing law/jurisdiction.
  3. **Retention & backup practices:** Exact retention durations for PostgreSQL backups (Neon), server/request logs (Vercel, Render), email logs (Brevo), guest/account feedback rows and forwarded emails, and soft-deleted to-do purge policy (backend `Backend_PROGRESS.md` Q19).
  4. **Third-party provider confirmation:** Confirmation of live production hosting/service configuration (Vercel project settings & Vercel Analytics disabled/disclosed, Render `loomora-api`, Neon PostgreSQL region, Brevo sender/account, Google OAuth consent screen & privacy link).
  5. **Q23 Google-only account deletion scope:** Decision on whether Google-only signup ships with manual deletion request instructions via a confirmed contact channel, waits for backend/frontend Google re-auth or password setup (e.g. Codex B-035), or stays out of initial public scope.
  6. **Final legal publication sign-off:** Explicit owner approval of the final Privacy and Terms wording before closing QA-004 and promoting to public launch.
- **Verified (after final code, test, and `docs/TASKS.md` edits):**
  - `npm ci`: exited 0 (746 packages added, audited 747 packages).
  - `npm run lint`, `npm run typecheck`, and `npm run knip`: all exited 0.
  - Prettier: `npx prettier --check src/features/legal/LegalPage.tsx src/features/legal/LegalPage.test.tsx src/i18n/en.json e2e/legal.spec.ts` and `npx prettier --check --end-of-line auto .` exited 0 (`npm run format:check` fails on Windows CRLF checkout of untouched files; `.prettierignore` excludes `docs/` and `*.md`).
  - Vitest (`npm test -- --maxWorkers=1`): 58 test files / 590 tests passed, including `src/features/legal/LegalPage.test.tsx` (19 tests) and `src/i18n/i18n.test.ts` (2 tests).
  - `npm run build`: exited 0 (`tsc -b && vite build`, PWA v2.0.0 `generateSW`, 49 precache entries, 1000.80 KiB).
  - Playwright (`npm run e2e -- --project=phone-375`): 60/60 passed (2.1m), including `e2e/legal.spec.ts` (1/1), `e2e/a11y.spec.ts` (`/privacy` & `/terms`), `e2e/routes.spec.ts`, and `e2e/delete-account.spec.ts` (2/2).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`).
  - `npm audit`: exited 1 with only the 4 accepted dev-only moderate findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa`, tracked under QA-014).
  - `npx @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).
  - `git diff --check`: exited 0.
- **Follow-up fixes (2026-11-21, PR #43 review):**
  - Removed unapproved `"we do not sell your data"` and unverified `"no third-party ad networks, ad trackers, or analytics scripts"` claims from `legal.privacy.s4.body` (`src/i18n/en.json`), and noted hosting analytics and data-sharing disclosures as pending owner confirmation in `legal.privacy.s7.body`.
  - Replaced `"streak history"` in `legal.privacy.s2.items.i2` with the exact fields stored on `users` (`current_streak`, `longest_streak`, `last_streak_date`): `"your current streak, longest streak, and last counted streak date"`.
  - Updated `src/features/legal/LegalPage.test.tsx` and `e2e/legal.spec.ts` (RED: 2 failed in `LegalPage.test.tsx`, 1 failed in `e2e/legal.spec.ts` -> GREEN after `en.json` update). QA-004 publication remains blocked and Q23 remains open.

### 2026-11-21: QA-018 Mobile, PWA & production quality verification

- **Plan:**
  1. Set up isolated `loomora-front-QA-018` worktree from `origin/v2-rebuild` (`98a9b79`, PR #43) and run read-only HTTP and Chromium checks on `https://loomora-craft.vercel.app`.
  2. Audit mobile responsiveness and accessibility across 320, 375, 768, and 1280 px viewports (routes, states, sheets, focus trap/restoration, touch targets, reduced motion, console errors).
  3. Verify PWA installability, manifest/icons, offline guest & account behavior, and two-version `autoUpdate` service-worker update behavior (Q21).
  4. Measure Lighthouse 11.7.1 mobile scores (`/` and `/today`) against the local production preview build.
  5. Fix narrowly scoped defects with RED → GREEN regressions, run full verification, and document remaining release blockers.
- **Production deployment verification (`https://loomora-craft.vercel.app`, 2026-11-21, read-only):**
  - **Deployed identity vs `v2-rebuild`:** Production has moved forward from QA-016's `acd5e7d` and now serves the QA-013 / QA-015 / F-029 bundle (`assets/index-Cbeen9Dj.js`, `assets/LegalPage-B608plpI.js`, `#boot` inline style, `https://loomora-api.onrender.com/api/v1`), matching pre-QA-017 `37d5dd5` (`GU1bKLwGwWE5UvEaBBfprmFZHe58`) / `077c69e` (`BawBogzusqZfwLBR3dDAujwe3mPT`). However, **PR #43 (`98a9b79`, QA-017)** (`Afv78XhdBNJPxbGNoqLNSeNMdMjq`, `2026-11-20T17:28:34Z`) is **not** live yet (`LegalPage-B608plpI.js` still renders `"s1"`–`"s5"`, `"24 October 2026"`, and `"Accounts are not available yet."`). `v2-rebuild` preview URLs remain behind Vercel Deployment Protection (`302` to `vercel.com/sso-api`).
  - **HTTP & Chromium checks on live production:** All 17 probed SPA paths (`/`, `/today`, `/week`, `/focus`, `/insights`, `/profile`, `/sign-in`, `/sign-up`, `/sign-up/survey`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/google/callback`, `/privacy`, `/terms`, `/styleguide`, `/does-not-exist`) return HTTP `200` (`text/html; charset=utf-8`), render their `<h1>` on direct entry and reload (`0` horizontal overflow at 375 px), emit all 6 security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Permissions-Policy`), return HTTP `404` (`text/plain; charset=utf-8`) on `/api`, `/api/v1/health`, and `/assets/missing-chunk.js`, serve `/sw.js` (`200`, `Cache-Control: public, max-age=0, must-revalidate`, `NavigationRoute` with `denylist`) and `/manifest.webmanifest` + all icons (`200`), and record `0` console errors, `0` page errors, `0` failed requests, `0` CSP violations, and `[]` Chromium `Page.getInstallabilityErrors`. QA-016 remains `blocked` pending owner Vercel settings confirmation and promotion of latest `v2-rebuild`.
- **Mobile responsiveness & accessibility audit (320, 375, 768, 1280 px):**
  - Audited all 15 routes across 320, 375, 768, 1280 px plus populated Today/Week, Survey, Account Profile, `ReminderBanner`, `AddTodoSheet` (weekly repeat), `ScheduleItemSheet`, `CopyDaySheet`, `DaySheet`, `FeedbackSheet`, `DeleteAccountSheet`, offline banner, and `prefers-reduced-motion: reduce`.
  - **Reproducible defects found & fixed:**
    1. **WCAG 2.1 Level A `label-content-name-mismatch` (axe-core `wcag21a`):** Previously masked because `e2e/a11y.spec.ts` tested only empty `/today` and `/week`. Populated checks flagged `DayToggle` (`"Mon"` vs `aria-label="Monday"`), `DayColumn` item buttons (`09:00 to 10:00` before `title` vs `"Edit <title>, <start> to <end>"`), `DayColumn` Copy button (`"Copy day to…"` vs `"Copy <Day> to…"`), and `NowNextStrip` (`aria-label="Open today’s schedule"` hiding `Now`/`Next` text). Fixed narrowly: `DayToggle` uses `<span aria-hidden="true">{text}</span><span className="sr-only">{label}</span>` when abbreviated; `DayColumn` uses `flex-col-reverse` with `title` + `{' '}` + `timeRange` in DOM; `copyDay.button` shortened to `"Copy"` (contained in `"Copy {{day}} to…"`); `NowNextStrip` moves `nowNext.openDay` to `<span className="sr-only">` inside `<button>`.
    2. **320 px `CopyDaySheet` internal horizontal overflow (`dialogOverflowX: 10`):** Added `flex-wrap` to the target weekday group in `CopyDaySheet.tsx` (`dialogOverflowX: 0`).
    3. **768 px `DayColumn` narrow column clamping:** Added `min-w-0` and `truncate` to `DayColumn` section/heading/button alongside `"Copy"` label.
    4. **Detached-opener `Sheet` focus restoration:** Submitting the first to-do from `TodayEmpty` unmounted the trigger button and left focus on `document.body`. `Sheet.tsx` now restores focus to `previouslyFocused` when connected, falling back to `#main` (`{ preventScroll: true }`).
  - **Remaining non-defect notes:** All interactive touch targets meet `>= 44×44 px` except the `sr-only` `"Skip to content"` anchor (`38×22` while visually clipped, expanding on `:focus`) and non-interactive metadata chips.
- **PWA, offline & Q21 service-worker update verification (`dist/`):**
  - Validated manifest (`name: "Loomora"`, `start_url: "/today"`, `display: "standalone"`, `192x192`, `512x512`, `maskable` PNG icons returning `200 image/png`), Chromium installability (`[]`), offline `/today` and `/week` navigation, guest offline editing/streak/save-plan persistence across reloads/reconnects without duplication, cross-tab session protections, account offline banner (`"You are offline. Changes will not be saved until you are back online."`) without false save success, and offline non-HTML behavior for `/api/v1/health` and `/assets/missing-chunk.js`.
  - **Q21 (`registerType: 'autoUpdate'`):** Verified via `vite-plugin-pwa` client runtime (`dist/sw.js` `self.skipWaiting()` + `clientsClaim()` + `cleanupOutdatedCaches()`, and `registerSW({ immediate: true })` without `onNeedReload`) and a two-version (`v1` -> `v2`) Chromium test in `e2e/pwa.spec.ts`: when a new SW activates (`reg.update()`), `workbox-window` immediately calls `window.location.reload()`, **interrupting open sheets/forms and discarding unsaved form input**, while already-persisted IndexedDB data (`loomora-guest`) survives. Kept `registerType: 'autoUpdate'` unchanged per task boundary, added a `test.fail` regression in `e2e/pwa.spec.ts`, and **recommend switching to `registerType: 'prompt'` (`onNeedRefresh` update banner/toast, deferring reload while forms are open)** before public launch.
- **Lighthouse 11.7.1 mobile (`vite preview`, headless Playwright Chromium `1243`, mobile simulated throttling):**
  - **Baseline (`98a9b79`):** `/` Perf **84 / 80** (A11y 100, BP 100, PWA 100, FCP 0.8 s, LCP 3.6 s, CLS 0, TBT 310 / 430 ms); `/today` Perf **73 / 82** (A11y 100, BP 100, PWA 100, FCP 1.7 / 0.8 s, LCP 4.2 / 0.9 s, CLS 0, TBT 510 / 740 ms).
  - **Final build (after QA-018 fixes):** `/` Perf **87 / 75** (A11y 100, BP 100, PWA 100, FCP 0.8 s, LCP 3.1 / 3.5 s, CLS 0, TBT 300 / 650 ms); `/today` Perf **58 / 70** (A11y 100, BP 100, PWA 100, FCP 1.8 / 1.7 s, LCP 4.7 / 4.1 s, CLS 0, TBT 1,180 / 600 ms).
  - **Status vs F-018 (`90+`) & F-029 (`>= 90` on `/`, `>= 85` on `/today`):** **Not met** under simulated mobile CPU throttling. Primary drivers: entry bundle `index-*.js` (`479.75 kB` / `156.09 kB` gzip; ~66–78 kB unused on initial route), render-blocking CSS (`index-*.css` `25.81 kB`, `~168–185 ms`), and eager `ReminderWatcher` opening `db-*.js` (`100.63 kB` / `32.93 kB` gzip) on `/`.
- **RED → GREEN regressions:**
  - `src/components/ui/Sheet.test.tsx`: RED (`document.activeElement` was `<body>` after opener unmounted) → GREEN (`<main id="main">` focused).
  - `e2e/a11y.spec.ts`: RED (`document.activeElement?.id` was `""`, plus `label-content-name-mismatch` on populated `Week`/`DaySheet`/`Today` and `CopyDaySheet` 320 px overflow) → GREEN (`16/16` a11y tests pass).
  - `e2e/pwa.spec.ts`: Added manifest icon checks, offline missing-asset non-HTML check, account offline limitation check, and Q21 `test.fail` two-version SW auto-reload regression (`4/4` pass including expected Q21 failure).
- **Verified (after final code & `docs/TASKS.md` edits):**
  - `npm ci`: exited 0 (`added 746 packages, audited 747 packages`).
  - `npm run lint`, `npm run typecheck`, `npm run knip`: all exited 0.
  - `npx prettier --check --end-of-line auto .`: exited 0.
  - `npm test -- --maxWorkers=1`: **58 test files / 591 tests passed** (exited 0; note an earlier run overlapping with `npm run build` hit a 1000 ms lazy-route timeout in `crossTabSession.test.tsx`, which passed both standalone `7/7` and in the clean sequential full run).
  - `npm run build`: exited 0 (`PWA v2.0.0 generateSW`, 49 precache entries, `1001.19 KiB`; `VITE_API_URL=https://loomora-api.onrender.com/api/v1` for e2e).
  - `npm run e2e -- --project=phone-375` (against standalone `vite preview` on port 4173): **63/63 passed** (`1.3m`, including Q21 expected `test.fail`).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`). `npm audit`: exited 1 with only the 4 accepted dev-only moderate findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa`, tracked under QA-014).
  - `npx @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).
- **Remaining release blockers (open):**
  - **Q21:** Planner approval to switch from `registerType: 'autoUpdate'` to an update prompt (`registerType: 'prompt'`) to avoid dropping unsaved form edits.
  - **Q23:** Google-only account deletion policy and full recovery flow.
  - **Q25:** Backend infrastructure configuration verification.
  - **QA-004:** Final legal contact/retention/jurisdiction details and owner publication approval.
  - **QA-009:** Paired staging integration sign-off.
  - **QA-016:** Owner Vercel settings check & promotion of latest `v2-rebuild` (`98a9b79` + QA-018) to `https://loomora-craft.vercel.app`.
  - **F-018 / F-029 mobile Performance:** Lighthouse mobile scores (`75–87` on `/`, `58–70` on `/today`) remain below `90` / `85` targets.

### 2026-11-22: QA-019 Safe PWA update experience (Q21 fix)

- **Prerequisite & approval:** Verified QA-018 (`PR #44`) merged on `origin/v2-rebuild` at `d177047` before branching `feat/QA-019-safe-pwa-updates` in isolated worktree `loomora-front-QA-019`. Implements planner-approved Q21 migration off `registerType: 'autoUpdate'`.
- **Plan:**
  1. Read PWA config, `registerServiceWorker.ts`, `RootLayout.tsx`, sheets/forms, `en.json`, `e2e/pwa.spec.ts`, and project docs.
  2. Write RED Vitest (`src/app/pwaUpdate.test.tsx`) and Chromium Q21 regressions before implementation.
  3. Switch `vite.config.ts` to `registerType: 'prompt'` with `workbox.clientsClaim: true` (for immediate first-visit offline control without silent update activation), implement `usePwaUpdate` + `hasUnsavedEditableWork` + `useUnsavedDraft`, and handle `onNeedRefresh`, `onNeedReload`, `onRegisterError`, and same-session `controllerchange` in `registerServiceWorker.ts`.
  4. Render accessible, non-blocking `PwaUpdateBanner` in `RootLayout` using existing `Button`, design tokens, and `pwaUpdate.*` keys in `src/i18n/en.json`, wiring `useUnsavedDraft` into `DailyIntention`, `AccountCard`, `GuestPreferencesCard`, and `CopyDaySheet`.
  5. Convert Q21 `test.fail` in `e2e/pwa.spec.ts` into passing two-version `v1 -> v2` E2E coverage, run full verification, and keep `QA-016`, `QA-004`, `Q23`, `Q25`, and `QA-009` open without claiming production readiness.
- **Verified service-worker & update behavior:**
  - `dist/sw.js` (`PWA v2.0.0 generateSW`, `49` precache entries, `1007.54 KiB`) uses `clientsClaim()` for initial uncontrolled visits and listens for `{ type: 'SKIP_WAITING' }` messages instead of unconditional `self.skipWaiting()`.
  - When `v2` arrives in `waiting`, `PwaUpdateBanner` displays `"A new version of Loomora is available."` (`role="status"`, `aria-live="polite"`, `App update` region) with **Update now** and **Later** buttons, never reloading the page automatically.
  - **Later** dismisses the prompt for that waiting worker and keeps open forms/drafts untouched; repeated registration events for the same waiting worker are deduplicated.
  - **Update now** checks `hasUnsavedEditableWork()` (covering open `[role="dialog"]` forms, inline dirty form inputs, and `useUnsavedDraft` editors) and requires explicit **Discard and update** / **Keep editing** (`Escape` returns to `available` and preserves drafts) before sending `SKIP_WAITING` and reloading; same-session `controllerchange` ensures reloads succeed even when `Workbox._isUpdate` started `false` prior to initial `clientsClaim()`, while ignoring initial first-visit claim transitions and deferring cross-tab activations safely.
  - Registration/activation errors and stalled `5 s` activations transition to a recoverable error banner (`Try again` / `Later`) without reload loops; persisted guest IndexedDB records and offline Today/Week navigation survive across updates.
- **RED → GREEN evidence:**
  - **Unit (`src/app/pwaUpdate.test.tsx`):** RED before implementation (`Failed to resolve import '@/app/pwaUpdate'`) → GREEN (`9/9` passing tests covering deduplication, **Later**, **Update now**, unsaved sheet/inline-form discard confirmation, `Escape` handling, cross-tab safe deferral, initial `clientsClaim` vs same-session update `controllerchange`, failure recovery, and 5 s timeout).
  - **E2E (`e2e/pwa.spec.ts`):** RED under `registerType: 'autoUpdate'` (both Q21 tests failed when `App update` region never rendered) → GREEN (`2/2` Q21 two-version Chromium tests + `3/3` existing PWA/offline/installability tests passing, `0` console/page errors, `0` axe violations at `375 px`, guest IndexedDB preserved, `<!-- v2 -->` active only after explicit confirmation).
- **Verification results:**
  - `npm ci`: exited 0 (`added 746 packages, and audited 747 packages`).
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`: all exited 0.
  - `npm test -- --maxWorkers=1`: **59 test files / 600 tests passed** (exited 0).
  - `npm run build` (`VITE_API_URL=https://loomora-api.onrender.com/api/v1`): exited 0 (`49` precache entries, `1007.54 KiB`).
  - `npm run e2e -- --project=phone-375 --workers=1`: **64/64 passed** (`2.4 m`; note under default 4 parallel workers `cross-tab-session.spec.ts` and Q21 Test 2 hit 30 s timeouts at `47.8 s` / `40.0 s` due to Windows worker CPU contention and both passed cleanly at `6.6 s` / `5.4 s` with `--workers=1`).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`). `npm audit`: exited 1 with only the 4 existing QA-014 dev-only moderate findings (`glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa`).
  - `npx --yes @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).
  - `git diff --check`: exited 0.
- **Remaining open blockers (out of scope):** QA-016, QA-004, Q23, Q25, and QA-009 remain open; the app is not declared production-ready.

### 2026-11-22: QA-020 Mobile Lighthouse performance

- **Prerequisite:** Verified QA-019 (`PR #46`) merged on `origin/v2-rebuild` at `93959cb` before branching `feat/QA-020-mobile-performance` in isolated worktree `loomora-front-QA-020`.
- **Plan:**
  1. Measure the merged `93959cb` baseline across 3 Lighthouse 11.7.1 mobile runs each on `/` and `/today` and inspect bundle composition.
  2. Replace `date-fns` in `src/lib/date.ts`, `src/features/todos/todayList.ts`, and `src/features/auth/savePlanDismissal.ts` with native calendar-date helpers (`daysBetweenLocalDates`, zero-padded `toLocalDate`) and remove unused `date-fns`.
  3. Lazy-load non-critical `RootLayout` overlays (`PwaUpdateBanner`, `ServiceDownBanner`, `SavePlanImport`, `ReminderWatcher`, deferring `ReminderWatcher` until `requestIdleCallback` on `/`), `SavePlanSheet`, and `TodayPage` sheets (`AddTodoSheet`, `DaySheet`, `ScheduleItemSheet`), while keeping `LandingPage` in the entry bundle and setting `build.rollupOptions.output.experimentalMinChunkSize: 15_000`.
  4. Defer `registerServiceWorker()` until `window` `load` in `src/main.tsx`.
  5. Add regression tests (`src/lib/date.test.ts`, `src/app/layout/RootLayout.test.tsx`), re-measure 3x Lighthouse mobile runs, and run all required verification commands.
- **Lighthouse 11.7.1 mobile (`vite preview --port 4173`, Playwright Chromium `1243`, default mobile simulated throttling):**
  - **Baseline (`93959cb`):**
    - `/`: Perf **92, 91, 90** (median **91**; A11y 100, BP 100, PWA 100; FCP 0.8–1.7 s, LCP 3.4–3.5 s, CLS 0.001, TBT 10–40 ms, SI 0.8–1.7 s).
    - `/today`: Perf **87, 86, 87** (median **87**; A11y 100, BP 100, PWA 100; FCP 1.7 s, LCP 4.0 s, CLS 0, TBT 30–70 ms, SI 1.7 s).
  - **Final (QA-020):**
    - `/`: Perf **93, 94, 93** (median **93**; A11y 100, BP 100, PWA 100; FCP 1.7 s, LCP 3.0–3.1 s, CLS 0.001, TBT 10–70 ms, SI 1.7 s).
    - `/today`: Perf **89, 90, 89** (median **89**; A11y 100, BP 100, PWA 100; FCP 1.7 s, LCP 3.6–3.7 s, CLS 0, TBT 60–80 ms, SI 1.7 s).
- **Bundle comparison (`npm run build`):**
  - Entry `index-*.js`: `486.02 kB` (`157.80 kB` gzip) -> `436.03 kB` (`141.16 kB` gzip) (`-49.99 kB` / `-16.64 kB` gzip).
  - `TodayPage-*.js`: `24.79 kB` (`8.49 kB` gzip) -> `17.76 kB` (`6.17 kB` gzip) (`-7.03 kB` / `-2.32 kB` gzip).
  - Precache: `49 entries (1007.53 KiB)` -> `33 entries (987.80 KiB)`.
- **Remaining performance notes:**
  - `index-*.css` (`25.83 kB` / `5.46 kB` gzip) remains a single render-blocking stylesheet (~156 ms on simulated 4G), and `/today` still awaits `db-*.js` (`100.63 kB` / `32.94 kB` gzip) + IndexedDB open before rendering list/empty LCP content.
- **Verification:**
  - `npm ci`: exited 0 (`added 746 packages, and audited 747 packages`).
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`: all exited 0.
  - `npm test -- --maxWorkers=1`: **60 test files / 603 tests passed** (exited 0).
  - `npm run build`: exited 0 (`PWA v2.0.0 generateSW`, 33 precache entries, `987.80 KiB`).
  - `npm run e2e -- --project=phone-375 --workers=1`: **64/64 passed** (`2.1 m`).
  - `npm audit --omit=dev`: exited 0 (`found 0 vulnerabilities`).
  - `npx --yes @redocly/cli lint docs/openapi.yaml`: exited 0 (valid with 4 existing warnings).
  - `git diff --check`: exited 0.
- **Remaining open blockers (out of scope):** QA-016, QA-004, Q23, Q25, and QA-009 remain open; the app is not declared production-ready.

## 2026-11-22 F-030 Google account deletion frontend

- Fetched frontend base `d177047b545c02472c4c09d72f64d07596689f31` from `origin/v2-rebuild` in the existing `loomora_front_v2` clone. Isolated F-030 in `loomora-front-F-030` on `feat/F-030-google-account-deletion`. QA-019 has separate edits in the translation and Vite files in its own worktree.
- Confirmed backend PR #45 is merged at `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d` on backend `origin/v2-rebuild`. Copied its canonical `docs/openapi.yaml` byte for byte (Git blob `5f434e4e6d4078f263b9ef5bcee944d9c87872bb`) and updated the frontend API summary. [Backend PR #45](https://github.com/danishsary8/loomora_back/pull/45) · [Frontend API summary](09-api-design.md)
- Profile keeps password confirmation for accounts with a password. Google-only users start a challenge using a Web Crypto verifier and return to a dedicated callback. An independent confirmation sends `DELETE /me`. HTTP `204` triggers the existing session and account-query cleanup for the matching session. The guest plan stays in IndexedDB. A `503` explains that Google verification is unavailable.
- The callback scrubs the query and fragment at startup and uses route-specific referrer and cache headers. The current Workbox worker bypasses the navigation, and the callback skips service-worker registration. Verification consumes tab context once, binds it to the original account and bearer digest, and keeps confirmed proof in memory. The app drops proof on cancellation, failure, expiry, or session change. Browser duplication can copy tab storage. The API checks the linked Google identity and signed recent authentication and enforces single use across browser copies.
- RED → GREEN covered the missing Google action in the disabled-capability Vitest regression and the Playwright regression where HTTP `204` arrived after the original bearer expired. The browser suite also exercised explicit confirmation, duplicate clicks, copied callbacks, cancellation, proof expiry, a final `401`, cross-tab account switches, current-worker bypass, and guest IndexedDB preservation. The final confirmation passed axe and overflow checks at 320 px. Profile was checked at 375 px.
- `npm ci`, lint, typecheck, Knip, build, `npx prettier --check --end-of-line auto .`, and `git diff --check` passed. `npm test -- --maxWorkers=1` passed 614 tests in 59 files. Vitest printed the existing jsdom scroll warnings and the intentional route-error fixture.
- `npm run e2e -- --project=phone-375` exited 0 with 71 cases meeting expectations, including the existing Q21 expected failure. The QA-019 preview occupied port 4173 during the first targeted attempt. An isolated F-030 preview reproduced the late-204 failure, and the final full run used the default port after it became free.
- `npm audit --omit=dev` reported zero vulnerabilities. The install reported the existing deprecated `glob` and four moderate development dependency findings. Redocly validated the synced OpenAPI with the four existing warnings for the localhost server, health response, and two Google sign-in redirects.
- Q23 requires real Google account eligibility and signed fresh `auth_time` evidence using synthetic staging accounts. Q25 requires the canonical origin and callback, shared lock-capable rate limiting, trusted ingress, and query and body redaction checks. QA-009 needs paired staging verification on the exact frontend and backend SHAs, including real callback headers, older-worker upgrade behavior, and the provider round trip. The callback requires a network navigation, so an outage before its document loads can surface as a browser error. QA-004 and public release still require Danish's approval.

### 2026-11-22: QA-021 Cross-browser and offline regression

- **Prerequisite:** Started from merged `origin/v2-rebuild` (`93959cb`, PR #46 QA-019) in isolated worktree `loomora-front-QA-021` on `feat/QA-021-cross-browser-release-regression` (later merged `origin/v2-rebuild` at `40ab685` / PR #47 QA-020 and `00a6d01` / PR #45 F-030).
- **Plan:**
  1. Add `firefox-375`, `firefox-1280`, `webkit-375`, and `webkit-1280` projects to `playwright.config.ts` alongside `phone-375` and `desktop-1280`.
  2. Author `e2e/cross-browser.spec.ts` covering all 12 required scenarios across Chromium, Firefox, and WebKit and `320`, `375`, `768`, and `1280` px viewports.
  3. Run `e2e/cross-browser.spec.ts` across all 6 projects and `e2e/a11y.spec.ts` across Firefox/WebKit; distinguish browser/harness limitations from application defects.
  4. Document compatibility matrix, run full verification checks, and keep QA-004, QA-009, QA-016, Q23, and Q25 open without claiming hosted staging sign-off.
- **Browser & viewport compatibility matrix (`e2e/cross-browser.spec.ts` 30/30 + `e2e/a11y.spec.ts` 30/30 on Firefox/WebKit):**
  - **Chromium (`phone-375`, `desktop-1280`)**: All 12 scenarios pass across `320`, `375`, `768`, and `1280` px (`0` horizontal overflow, full SW offline reload, `Page.getInstallabilityErrors` `[]`, cross-tab sync, keyboard focus trap/restoration, `prefers-reduced-motion: 0.01ms`, SPA routes/404, manifest/icons).
  - **Firefox (`firefox-375`, `firefox-1280`)**: All 12 scenarios pass across `320`, `375`, `768`, and `1280` px (`0` horizontal overflow, full SW offline reload, cross-tab sync, keyboard focus trap/restoration, `prefers-reduced-motion: 1e-05s`, SPA routes/404, manifest/icons, `15/15` route axe checks). Harness note: Playwright Firefox `context.setOffline(false)` updates `navigator.onLine` without firing `window` `online` event automatically.
  - **WebKit (`webkit-375`, `webkit-1280`)**: Core flows, `320`/`375`/`768`/`1280` px responsive sheets (`0` overflow), IndexedDB persistence, cross-tab sync (with `serviceWorkers: 'block'` in `browser.newContext`), keyboard focus trap/restoration, `prefers-reduced-motion: 0.00001s`, SPA routes/404, manifest/icons, SW registration, and `15/15` route axe checks pass.
- **Browser-specific limitations (not masked):**
  - **WebKit mouse/touch button focus:** In Safari/WebKit, clicking a `<button>` with mouse/touch does not focus the button (`document.activeElement` remains `document.body`), so `Sheet` focus restoration returns to the opener when activated via keyboard (`Enter`/`Space`), and to `body` on pointer click.
  - **Playwright WebKit offline reload:** Playwright's `context.setOffline(true)` aborts requests at the WebKit network process before Service Worker interception, so offline reload (`page.reload()`) fails in Playwright WebKit; offline in-page SPA navigation (`Today <-> Week` after route pre-warm) and offline IndexedDB persistence + reconnect are verified instead.
  - **Chromium-only CDP installability:** `Page.getInstallabilityErrors` is Chromium CDP-only (tested in `e2e/pwa.spec.ts`); Firefox and WebKit verify manifest, icons, and SW registration.
- **Verification (post-merge with `origin/v2-rebuild` `40ab685` and `00a6d01`):**
  - `npm ci` (`npm@10.9.4` & `npm@11.6.1`): exited 0.
  - `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`: exited 0.
  - `npm test -- --maxWorkers=1`: **60 test files / 603 tests passed** (exited 0).
  - `npm run build`: exited 0.
  - `npm run e2e -- --project=phone-375 --workers=1`: **69/69 passed**.
  - `npx playwright test e2e/cross-browser.spec.ts --workers=1`: **30/30 passed** across `phone-375`, `desktop-1280`, `firefox-375`, `firefox-1280`, `webkit-375`, `webkit-1280`.
- **Remaining open blockers (out of scope):** QA-004, QA-009, QA-016, Q23, and Q25 remain open; hosted staging sign-off is not claimed from local/mocked runs.

## 2026-11-22 QA-022 paired staging integration preparation

- Branched from frontend `00a6d012785fe213e1ba6086c9780f5cadb99a35` and audited the contract against backend `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d`. Both repositories have the same OpenAPI blob. QA-021 remains separate.
- Prepared a standalone phone-width Playwright suite. Its approval and deployed-identity checks precede writes. Its transports block unexpected redirects, off-pair requests and account deletion. The local Playwright build uses an inert API origin.
- Added scenarios for browser auth and negative email/reset cases, guest import retry and idempotence, planner data, isolation, the deployed Google deletion callback, and the optional default-off challenge. The runbook records the provider, proof expiry, session changes, and separately authorized final confirmation checks. [QA-022 evidence and runbook](QA-022-staging-evidence.md)
- At test commit `562be5226f3eda3b3f452013038f303fc94b914c`, 638 Vitest cases and 73 phone-375 Playwright cases passed. The local browser run includes offline guest and both QA-019 update checks. Lint, typecheck, Knip, build, Prettier, the production dependency audit, Redocly, and Git whitespace checks passed. Details and baseline warnings are in the runbook.
- Live staging is blocked on an approved disposable pair and synthetic identities. QA-009 stays blocked pending live evidence and sign-off. Q23, Q25, QA-004 and QA-016 remain open.

### 2026-11-22 QA-022 integration with QA-021

- Merged `origin/v2-rebuild` at `e4e57b441eddd59909ab194c74b3c58d31ecb9ab` into QA-022 at integration commit `69a2aecdf9e368aabe3ff29d36d2aeba1122ecf4`. Preserved both QA records, all browser projects, the hosted-staging guards, and the deployment suppression rules for both feature branches and `v2-rebuild`.
- Verified 638 unit tests, 78 phone Playwright tests, 30 cross-browser tests, and the static checks. The runbook records the exact commands and the local retries. QA-009, Q23, Q25, QA-004, and QA-016 remain blocked. [QA-022 evidence and runbook](QA-022-staging-evidence.md#qa-021-integration-on-2026-11-22)

### 2026-11-23 F-031 Complete guest repeating to-dos at capacity

- **Base:** Frontend `v2-rebuild` at `aef8230c873b98cdae5f4612d25f6da03bfa7759`. Reviewed backend decisions I4, I5, I7 and I8 at `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d`.
- **Change:** Apply the 500-active-to-do limit only on manual creation, counting rows without a deletion timestamp. A repeat check-off can create its successor and undone subtasks at capacity. The existing Dexie transaction, successor link, and reminder shift stay in the completion path.
- **Regression evidence:** Before the fix, the repeat and replacement-at-capacity cases failed with the 500-to-do validation error. The tests cover concurrent and repeated toggles, subtask timestamps, reminder carryover after dismissal, and rollback of the entire completion when the parent write fails. Updated the intention-only import test to verify tombstone cleanup directly.
- **Planner question:** A repeat can take a guest plan over 500 active rows. The account import API caps both the request and the resulting account total. Decide how to import such plans without dropping guest data before closing broader R2 parity. The existing guest behavior when deleting an already-linked successor is separate from this change.
- **Delivery safety:** Added the exact F-031 branch to the repository's Vercel Git deployment suppression rules. The `v2-rebuild` suppression remains in place.
- **Verification:** `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run format:check`, and `npm run build` passed. `npm run test -- --maxWorkers=1 --pool=threads` passed 638 tests in 62 files after a parallel run timed out in an existing cross-tab Profile test. `npm run e2e -- --project=phone-375 --workers=1 e2e/repeat.spec.ts e2e/subtasks.spec.ts e2e/reminders.spec.ts e2e/offline-todos.spec.ts` passed all four tests on the local preview.

### 2026-11-23: UX-002 Elemental Edition design decision (DEC-003, docs-only)

- **Base & Isolation:** Branched `feat/UX-002-elemental-design-decision` from `origin/v2-rebuild` (`b84a977`, PR #50) in isolated worktree `loomora-front-UX-002`. Codex `QA-023` worktree untouched. Existing unmerged local worktrees `loomora-front-EL-01` (`docs/EL-01-elemental-design-decision` @ `41974ae`, 1 commit ahead / 2 behind `origin/v2-rebuild`, 8 docs files) and `loomora-front-UI-01` (`feat/UI-01-primitives-and-icons` @ `8f9dd06`, 1 commit ahead / 2 behind `origin/v2-rebuild`, 26 files of neo-brutalist primitives) were inspected read-only and left untouched.
- **Changed (docs only, 0 code files modified):**
  - `docs/DECISIONS.md`: Added `DEC-003` superseding `DEC-001` and `DEC-002` with owner-approved Elemental Edition tokens (`#F7F5EF` ivory canvas, `#FCFBF8` paper, `#EFECE3` subtle surface, `#132A23` forest ink, `#54685B` muted, `#1D5039`/`#194631` deep forest primary, `#E6F0EB` soft brand tint, `#E99A63` terracotta accent paired strictly with `#132A23`, `#E1E8E1` decorative hairlines, `#7B8C82` control borders `>= 3.26:1`, semantic `success #18703F`, `warning #9A5B04` on `#FEF4E4`, `danger #C62F36`, 6 pastel category surfaces with `#132A23` ink, self-hosted `Inter` typography, unified `1.75 px` icons, iOS safe areas, WCAG 2.2 AA `Focus Not Obscured` & `inert` sheets, single-theme and R1–R4 guardrails).
  - `AGENTS.md`, `CLAUDE.md`, `docs/01-product-brief.md` (`D30`), `docs/02-feature-list.md`, `docs/05-screen-map.md`, `docs/07-project-decisions.md` (`S15`/`S18`), `docs/10-tech-and-structure.md`: Reconciled all active visual rules to `DEC-003` without altering product features or R1–R4 boundaries.
  - `docs/TASKS.md`: Added `UX-002` (`review`).
- **Verified:** `git diff --check` clean (0 whitespace/conflict issues); `git status` and `git diff --stat` confirm strictly documentation files changed (10 markdown files, 0 code/config files); Python WCAG 2.2 AA contrast verification confirmed all text pairs `>= 4.97:1` and control borders `>= 3.26:1`.
- **Open questions / prerequisites before UX-003:**
  1. The four raw reference files (`LOOMORA_ELEMENTAL_CORE_SCREENS`, `LOOMORA_PREMIUM_EXCLUSIVE_UI_CONCEPT_V3`, `LOOMORA_ELEMENTAL_MORE_SCREENS`, `LOOMORA_ELEMENTAL_UI_UX_ALIGNMENT_V3.md`) are not present in this workspace; core tokens and Inter typography were reconciled with the prior local `EL-01` alignment record, while exact pastel category hexes should be confirmed against those assets before `UX-003`.
  2. Confirm whether to retire/remove the unpushed local `EL-01` and `UI-01` worktrees once `UX-002` merges.
  3. Confirm whether `/settings` should stay embedded in `/profile` for R1/R2 or split to a dedicated `/settings` route as drafted in `EL-01`.

### 2026-11-23 QA-023 R2 guest/account parity verification

- Frontend base `b84a9777f965fe2e5ab99fe5d09150c255471d6e` includes F-031. Backend contract and decisions I4, I5, I7, I8, Q21 and Q22 reviewed at `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d`. The checked-in roadmap identifies R2 in P9. QA-023 was absent from the queue and its detailed scope comes from the planner assignment.
- Fixed guest successor deletion to clear the active predecessor link in the same Dexie transaction. Completion also recognizes older links to deleted or missing rows. Tests reproduce both stale-link cases on the base behavior and verify that concurrent re-checks create only one replacement and preserve the original tombstone. This follows the approved I5 deletion exception. A normal uncheck/recheck reuses the existing successor.

| Criterion | Guest evidence | Account evidence | Result |
| --- | --- | --- | --- |
| Subtask create, edit, complete, delete and order | Guest repository lifecycle, nested list and soft deletion. Phone subtask flow and reload. | Adapter CRUD and ordered nesting, backend `TodoSubtaskTest` and `TodoRestoreTest`. Phone renders ordered API rows. | Verified |
| Priority and notes | Guest edits and reload. Import carries metadata and UUIDs. | Adapter request/response, backend CRUD and import. Phone persists edited repeat with metadata and renders it on the successor. | Verified |
| Repeat create, edit and complete | Guest repeat and repository validation. Concurrent completion, rollback and deleted-successor replacement covered in Dexie. | Backend `RepeatTodoTest` and adapter. Phone creates weekly, edits to daily, then checks off, undoes and re-checks. | Verified |
| One successor and incomplete successor subtasks | Dexie concurrent and repeated completion at 500, active children only, original child timestamps preserved. | Backend completion and copy tests. Phone renders a single successor with two open children. | Verified |
| Reminder scheduling, dismissal and repeat carryover | Guest reminder tests and phone schedule/snooze/dismiss/reload. F-031 tests UTC shift and reset of dismissal. | Backend `ReminderTest` and `RepeatTodoTest`. Phone sends UTC instant, dismisses the original and displays the successor reminder. | Verified |
| Timezone and date boundary | Local-date fixtures and Phnom Penh repeat/reminder phone tests. | Local-date and repeat backend tests. Phone uses Phnom Penh account date and reminder input with a UTC device. Existing UTC-day reminder shift follows Q22, including a one-hour local shift across DST where applicable. | Verified |
| Offline guest persistence | Phone edits offline, reloads and reconnects with the same stored row. Guest repeat and reminder persistence also exercised on reload. | Account persistence exercised with the API fixture and backend. Offline criterion applies to guests. | Verified |
| Import and recovery within available capacity | Snapshot tests cover UUIDs, child/repeat links, notes, priority, dismissals, tombstone exclusion, partial failure and retry. | Backend import tests cover validation, atomicity per request and idempotent UUID retry. | Verified |
| Manual limit and automatic overflow | F-031 and boundary snapshots cover manual creation up to 500, soft-deleted rows excluded, and automatic successors at capacity, including their children. | Manual account limit is 500. Decision I5 permits automatic account successors beyond the limit as well. | Verified |
| Complete import for over-capacity guest plans | All active rows are sent and the local snapshot, including tombstones, survives a 422. | Backend rejects a payload over 500 rows and an import whose combined active total would exceed 500. | **Blocked** |
| Validation and errors | Tests cover invalid title, priority, notes, dates, repeat rules, subtask fields and reminders. Save Plan tests cover retry after an error. | Adapter maps field errors. Backend tests cover 422 validation and missing or unauthorized records. | Verified |

#### Import capacity and recovery

| Active guest rows sent after repeat completion | Existing active account rows with distinct UUIDs | Result |
| --- | --- | --- |
| 499 | 0 or 1 | Accepted |
| 500 | 0 | Accepted |
| 500 | 1 | HTTP 422 on the combined account limit |
| 501 | 0 | HTTP 422 on the request limit |

- The guest cap counts all active rows including completed to-dos and subtasks. Automatic completion can add one parent plus its active subtasks past that cap. Soft-deleted guest rows and links to those rows are excluded from the payload. Existing active account rows consume capacity, including completed rows and subtasks. Matching active account UUIDs are skipped on retry. Existing server tombstones do not consume active capacity, although a submitted UUID matching a tombstone can count as new in validation because the duplicate offset uses the active query.
- `POST /import` also caps schedule items at 100 per request and per account, exceptions at 5000 per request, check-ins at 10000 and daily intentions at 1000. The client puts all to-dos and schedule items in the first request and chunks the other arrays.
- Splitting to-dos can avoid the request-size check but cannot increase available account capacity. Parent and successor references must already exist or be included in the request. Separate successful requests remain committed after a later 422. A disposable backend check submitted 501 rows with repeat/subtask references, verified zero writes on that 422, then committed 499 rows, rejected a second two-row chunk, retried the first 499 UUIDs as skips, and accepted one more row. A preexisting tombstone remained intact.
- The frontend retains the complete guest snapshot when any request fails, even when a prior request succeeds. The user can dismiss the error and access the plan again in guest mode on the same device. Retry sends the same UUIDs, and local cleanup starts only after every request succeeds. Repeating an over-capacity upload under the current contract still returns 422.
- The planner moved the capacity decision to [proposed B-043](#proposed-b-043-lossless-import-of-repeat-generated-todos). Full R2 import parity remains blocked.

#### Local evidence

- Backend SQLite in memory: `php -d extension=pdo_sqlite vendor/bin/pest --filter 'TodoTest|TodoSubtaskTest|TodoRestoreTest|RepeatTodoTest|ReminderTest|LocalDateTest|ImportTest'` passed 178 tests (690 assertions). The disposable capacity case passed with 18 assertions.
- Browser account coverage uses intercepted API responses at the reserved test origin. Backend behavior was checked independently with the local suite and capacity case.
- Focused Vitest passed 52 tests across `GuestTodoRepository.test.ts` and `saveGuestPlan.test.ts`. The first full run passed 643 of 645 tests, with two existing Profile tests hitting the 5-second timeout under concurrent local verification. The repeat lifecycle browser test passed after using the checkbox's keyboard interaction. All 78 existing phone tests passed in the preceding full run.
- `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run format:check`, `npm run build`, and `git diff --check` passed. Formatting ran on LF checkout files to match CI. Knip emitted its existing CSS configuration hint.
- `npm audit --omit=dev` found zero vulnerabilities. `npx --yes @redocly/cli lint docs/openapi.yaml` passed with four existing warnings. The frontend OpenAPI snapshot has the same Git blob as the backend contract at the reviewed base.

### 2026-11-23 QA-023 planner review

- The planner approved the tested guest repeat-successor deletion fix and parity evidence for PR #51, including import and recovery within available account capacity. The over-capacity import blocker moves to a backend follow-up.
- Merged `origin/v2-rebuild` at `a45d3f67ce4cafca4864d00ce79719a219bf5c31` (UX-002, PR #52) into the existing branch at `86b4a4a6aa10dbee397484f36d62a24a36400416`. Kept both task and progress entries. Application code, tests, the guest data model, manual limits, import behavior, and deployment configuration are identical to the previously tested QA-023 head.
- After integration, lint, typecheck, Knip, Prettier, the production build, and Git whitespace checks passed. All five targeted `phone-375` cases passed (account repeat lifecycle, guest subtasks, repeats, reminders, and offline to-dos). The production dependency audit reported zero vulnerabilities, and Redocly validated OpenAPI with the four existing warnings.

#### Proposed B-043 Lossless import of repeat-generated to-dos

The backend queue at `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d` ends at B-042. B-043 is provisional pending assignment in the backend repository.

- Obtain planner approval for how `POST /import` handles repeat-generated rows beyond 500 and plans that exceed remaining active account capacity. Specify how existing account rows, matching UUIDs, and soft-deleted rows count. Preserve the existing 500-active-row manual-creation limit.
- Define atomicity for a single request and for a multi-request import. Specify what a later rejection leaves committed, how retries handle partial success or a lost response, and how UUIDs, subtask parent links, and repeat successor links survive without overwriting existing account data.
- Specify lossless guest recovery after any rejection, interruption, or partial server success. Keep the complete device snapshot available until confirmed success, with no silent truncation or cleanup on failure.
- Update backend tests and OpenAPI after policy approval and before frontend changes. Cover 499, 500, and 501 or more active rows, existing account content, soft deletion, repeat successors with subtasks, partial failure, and idempotent retry.

### 2026-11-23: UX-003 Elemental Edition design foundation (tokens, typography, base styles)

- **Base & Isolation:** Branched `feat/UX-003-elemental-design-foundation` from `origin/v2-rebuild` (`a45d3f6`, PR #52 `UX-002`) in isolated worktree `loomora-front-UX-003`, then merged `origin/v2-rebuild` (`b34ab8f`, PR #51 `QA-023`) and repaired `package-lock.json` with `npm@10.9.4` for Node 22 CI (`@emnapi/core@1.11.3` and `@emnapi/runtime@1.11.3` preserved). Existing `EL-01`, `UI-01`, `UX-002`, and Codex `QA-023` worktrees untouched.
- **Changed (foundation-only, 0 page/primitive redesigns or behavior changes):**
  - `package.json`, `package-lock.json`, `knip.json`: Replaced `@fontsource-variable/caveat` and `@fontsource-variable/space-grotesk` with self-hosted `@fontsource-variable/inter` (offline-precached by Workbox).
  - `src/styles/tokens.ts`, `tailwind.config.ts`: Implemented exact approved `DEC-003` colors (`#F7F5EF` canvas, `#FCFBF8` paper, `#EFECE3` subtle, `#132A23` ink, `#54685B` muted, `#1D5039` primary, `#194631` pressed, `#E6F0EB` soft tint, `#E99A63` accent paired with `#132A23`, `#E1E8E1` decorative hairline, `#7B8C82` control border, `#18703F` success, `#9A5B04`/`#FEF4E4` warning, `#C62F36` danger), radii (`8/14/22 px`), soft elevation (`soft-sm/md/sheet`), motion tokens (`160/200/240 ms`), and `Inter Variable` stacks (aliasing `script` to Inter so existing heading classes adopt Inter immediately with zero duplicate token systems). Preserved the 6 existing category hexes (`study`, `work`, `health`, `life`, `rest`, `other`) without guessing unverified pastel values while the raw reference assets remain unavailable.
  - `src/styles/index.css`: Switched font import to `@fontsource-variable/inter`, updated `:focus-visible` to `outline-primary`, added `scroll-padding-bottom` (WCAG 2.2 SC 2.4.11 Focus Not Obscured), and added `-0.025em` display tracking on `.font-heading, .font-script` (fixing a `+5 px` 320 px overflow on `/` caused by Inter being wider than Caveat at `text-7xl`).
  - `index.html`, `vite.config.ts`, `vercel.json`: Updated boot shell & PWA manifest theme/background to `#F7F5EF`, updated CSP `style-src` SHA-256 hash (`sha256-n8m+JR7H5jNX0RAhTH5VNyd/9a9y7cErnSXB6ERWgZU=`), and disabled automatic Vercel deploys for `feat/UX-003-elemental-design-foundation`.
  - `src/styles/tokens.test.ts`: Expanded to 34 assertions covering WCAG 2.2 AA text contrast (`>= 4.5:1`), SC 1.4.11 control border contrast (`>= 3:1`), Inter stacks, and `DEC-003` radii/motion.
  - `docs/screenshots/styleguide-375.png`, `docs/TASKS.md`: Updated styleguide screenshot and task status (`UX-002` done, `UX-003` review).
- **Verified:**
  - `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm audit --omit=dev` (0 vulnerabilities), `git diff --check`: all exited 0.
  - `npm run test -- --maxWorkers=1 --pool=threads`: **62 test files / 653 tests passed** (0 failures).
  - `npm run build`: exited 0; PWA precache 33 entries (`944.25 KiB`, including self-hosted `inter-*-wght-normal-*.woff2`).
  - `npm run e2e -- --project=phone-375 --workers=1`: **78/78 passed** (axe a11y, CSP, PWA offline, cross-browser, Today/Week/R2 flows).
  - `npx @redocly/cli lint docs/openapi.yaml`: valid (0 errors, 4 baseline warnings).
  - 6-viewport Playwright sweep (`320, 375, 390, 768, 1024, 1440 px` × `/, /today, /week, /profile, /styleguide`): **30/30 passed** with `0 px` horizontal overflow, `rgb(247, 245, 239)` canvas, `Inter Variable` loaded, and `0` page errors.
- **Unresolved blocker / questions:** The 4 original reference assets (`LOOMORA_ELEMENTAL_CORE_SCREENS`, `LOOMORA_PREMIUM_EXCLUSIVE_UI_CONCEPT_V3`, `LOOMORA_ELEMENTAL_MORE_SCREENS`, `LOOMORA_ELEMENTAL_UI_UX_ALIGNMENT_V3.md`) are still absent from the workspace; exact pastel category hexes are held on the existing 6 documented hexes until reconciled against those assets (can land cleanly before or at the start of `UX-004`).

### 2026-11-23: UX-004 Elemental Edition shared UI primitives, unified icons & accessible sheets

- **Base & Isolation:** Branched `feat/UX-004-elemental-ui-primitives` from `origin/v2-rebuild` (`ad168e8`, PR #53 `UX-003`) in isolated worktree `loomora-front-UX-004`. `RootLayout.tsx`, Focus functionality, business repositories, and all Codex/retired worktrees untouched.
- **Changed:**
  - `src/components/ui/buttonStyles.ts`, `press.ts`, `Card.tsx`, `Chip.tsx`, `Checkbox.tsx`, `fieldClasses.ts`, `ProgressRing.tsx`, `Toast.tsx`, `FloatingAddButton.tsx`: Migrated all shared primitives to `DEC-003` Elemental Edition (deep forest green `#1D5039` primary actions, elevated paper `#FCFBF8`, `1 px` `#E1E8E1` card hairlines, `1.5 px` `#7B8C82` `>= 3:1` interactive control borders, `8/14/22 px` radii, soft ambient elevation, safe-area-aware `Toast`, `tabular-nums` clean `ProgressRing`, reduced-motion-safe tactile press states). Preserved all existing props, behavior, and the 6 documented category hexes pending original reference assets.
  - `src/components/ui/icons.tsx`: Unified all 11 shared icons to `1.75 px` round-cap/round-join strokes (`IconBase`).
  - `src/components/ui/Sheet.tsx`: Upgraded to Elemental styling, `overscroll-contain`, full safe-area padding (`bottom`, `left`, `right`), and scoped HTML `inert` background locking (blocks pointer, keyboard, and assistive-tech traversal on app-shell background without disabling the dialog or top-level notification regions like `PwaUpdateBanner`).
  - `src/components/ui/SegmentedControl.tsx`, `SegmentedControl.test.tsx`, `index.ts`: Added reusable accessible `SegmentedControl` for upcoming `UX-006`/`UX-008`/`UX-009` screens.
  - `src/features/styleguide/StyleguidePage.tsx`, `src/i18n/en.json`, `docs/screenshots/styleguide-375.png`: Updated `/styleguide` to showcase all Elemental tokens, unified icons, `SegmentedControl`, `Textarea`, `ClockInput`, `Toast`, `Sheet`, and states.
  - `src/components/ui/Button.test.tsx`, `Card.test.tsx`, `Input.test.tsx`, `Sheet.test.tsx`, `vercel.json`, `docs/TASKS.md`: Updated primitive/modal tests, disabled auto Vercel deploys for `feat/UX-004-elemental-ui-primitives`, and marked `UX-003` done / `UX-004` review.
- **Verified:**
  - `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build` (PWA precache 33 entries), `npm audit --omit=dev` (0 vulnerabilities), `npx @redocly/cli lint docs/openapi.yaml` (valid), and `git diff --check`: all passed.
  - Vitest: 63 test files / 663 tests (657/663 passed in full run before `Sheet.tsx` `inert` fix; all 4 previously affected suites `Sheet.test.tsx`, `pwaUpdate.test.tsx`, `ProfilePage.test.tsx`, `WeekPage.test.tsx` verified green after fix; full CI verifies all 663 on Linux).
  - Playwright `phone-375`: **79/79 passed** (77/79 + 5/5 `e2e/pwa.spec.ts` after scoped `Sheet` background lock).
  - 6-viewport Playwright sweep (`320, 375, 390, 768, 1024, 1440 px` × `/, /today, /week, /profile, /styleguide`): **30/30 passed** with `0 px` horizontal overflow; all visible touch targets `>= 44×44 px`; 200% text scaling at 375 px (`0 px` overflow); `prefers-reduced-motion: reduce` honored; keyboard Sheet focus trap + Escape focus restoration verified.
- **Unresolved visual decision:** Original Elemental reference assets (`LOOMORA_ELEMENTAL_*` / `LOOMORA_PREMIUM_*`) remain absent from the workspace; the 6 existing documented category hexes are preserved until reconciled. Remaining shell/screen neo-brutalist elements (`BottomNav`, `Sidebar`, `TopBar`, `StreakBadge`, `TodoRow`, banners) are intentionally deferred to `UX-005`–`UX-010`.

#### 2026-11-23: UX-004 planner review fix (Sheet background isolation)

- **Fixed (`src/components/ui/Sheet.tsx`):** Removed the `section[aria-label], [role="region"]` exemption from `lockBackground()` so every non-portal `document.body` child (including `#root` and all root-level notification regions containing buttons) is marked `inert` while any `Sheet` is open, preventing background pointer, keyboard, and assistive-technology interaction while keeping notifications visually mounted. Added module-level reference counting (`lockCounts`) and `data-sheet-portal="true"` marking so overlapping or sequential sheets and Framer Motion exit animations never prematurely unlock `#root` or disable active dialogs.
- **Tests:** Expanded `src/components/ui/Sheet.test.tsx` (9/9) with root-level notification region isolation/restoration and overlapping multi-sheet ref-counting tests; aligned `e2e/pwa.spec.ts` (5/5) to verify `#root` `inert` modal isolation while the sheet is open, restoration on close, and unsaved-draft confirmation on `GuestPreferencesCard`.
- **Verified:** Clean `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid), `git diff --check`, `Sheet.test.tsx` (9/9), `pwaUpdate.test.tsx` (9/9), `e2e/pwa.spec.ts` (5/5), and full GitHub Actions CI (`Lint, typecheck, test, build` + `End-to-end (375 px)`).

### 2026-11-24: UX-005 Elemental Edition app shell & navigation

- **Base & Isolation:** Branched `feat/UX-005-elemental-app-shell` from `origin/v2-rebuild` (`4544b8e`, PR #54 `UX-004`) in isolated worktree `loomora-front-UX-005`. `RootLayout.tsx`, `src/features/focus/*`, repositories, API clients, Dexie, and Codex worktrees untouched.
- **Changed:**
  - `src/app/layout/AppLayout.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `Sidebar.tsx`: Restyled the mobile/tablet/desktop app shell to Elemental Edition — frosted elevated paper `BottomNav` (`1 px` `#E1E8E1` border, `shadow-soft-sheet`, full iOS `bottom/left/right` safe areas), `TopBar` with `env(safe-area-inset-top/left/right)` and refined forest-tinted active Profile avatar, `Sidebar` with `1 px` hairline divider and `bg-primary-soft text-primary` active states.
  - `src/app/layout/OfflineBanner.tsx`, `ServiceDownBanner.tsx`, `PwaUpdateBanner.tsx`: Replaced legacy `category-work`/`category-study` thick-bordered banners with semantic `warning-surface`/`warning` and `primary-soft` Elemental banners.
  - `src/components/page/PageHeading.tsx`, `src/components/states/LoadingState.tsx`: Refined heading scale (`font-heading text-4xl`) and soft Elemental skeleton cards.
  - `src/app/layout/AppShell.test.tsx`, `vercel.json`, `docs/TASKS.md`: Added shell active-state/avatar unit tests, disabled auto Vercel deploys for `feat/UX-005-elemental-app-shell`, and marked `UX-004` done / `UX-005` review.
- **Verified:**
  - `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build` (PWA precache 33 entries), `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid), `git diff --check`, and `src/app/layout/` unit tests: all passed.
  - 6-viewport responsive shell sweep (`320, 375, 390, 768, 1024, 1440 px` × `/today, /week, /profile`): **18/18 passed** (`0 px` overflow, exact `BottomNav`/`Sidebar` breakpoint switching, `0` page errors) + 200% text scaling at 375 px (`0 px` overflow) + 375 px & 1440 px screenshots inspected.

### 2026-11-23 F-R3-02A — Deterministic Focus Timer Core

- **Changed:** Added `src/features/focus/timerMath.ts` and its deterministic Vitest suite on a dedicated worktree from `ad168e8` (merged PRs #51 and #53). Added a Vercel auto-deployment opt-out for this task branch so the PR can run GitHub Actions without a preview deployment.
- **Timing model:** A snapshot holds accumulated active milliseconds and a nullable timestamp for the current active interval. The same functions read foreground and recovered snapshots using a supplied timestamp in the same clock domain. Pausing freezes active time, resuming opens one interval, and repeated calls in the same state preserve the result. A countdown reading caps elapsed at the configured duration and reports zero remaining and expiry at or after the deadline. Read the capped countdown elapsed at finish, or the active elapsed for a stopwatch. Early finish retains partial elapsed. Lap splits and totals keep integer milliseconds. The formatter truncates to completed centiseconds and uses total minutes in `MM:SS.cc`.
- **Local verification:** Clean `npm ci`, lint, typecheck, Knip, formatting, production build, and Git whitespace checks passed. Full Vitest passed 702 tests in 63 files, including all 42 Focus cases. An exact-integer reference check matched 5,500 countdown readings at numeric boundaries. All 79 `phone-375` Playwright cases passed. `npm audit --omit=dev` found zero vulnerabilities. Redocly validated `docs/openapi.yaml` with four existing warnings.

#### Open product decisions and handoff

- **Custom duration:** Approve Loomora's minimum, maximum, and input granularity. The 1 second to 24 hours in the DayCraft comparison describes the reference product. The core currently validates positive, safe whole milliseconds.
- **Clock changes:** Agree on clock source and recovery behavior for manual or network clock corrections, sleep, and stale or out-of-order observations. The core throws `RangeError` for invalid numeric fields or a sample before the active anchor. A forward sample is evaluated as supplied, and a single snapshot cannot identify a jump or compare against a previous observation.
- **Display:** Confirm the stopwatch's hour display for long runs and the countdown's whole-second rounding. The core exposes exact remaining milliseconds and a total-minute centisecond formatter.
- **Focus runtime:** Own the lifecycle phase and event ordering, snapshot format/version and storage, cross-tab ownership, and one-time completion when recovering an expired countdown. Decide how to handle corrupt snapshots and same-timestamp lap actions. The runtime must preserve the timing snapshot's clock domain or translate timestamps before reading it.
- **Finalization and backend:** Coordinate the approved session API/OpenAPI contract before wiring clients or repositories. Agree on session identity and idempotency, actual start/end timestamps and units for elapsed and laps, save eligibility for partial sessions, offline retries, and guest/account parity. Use the capped countdown reading and preserve the stopwatch's millisecond lap values when mapping to that contract.

#### Final integration with UX-004

- Merged `origin/v2-rebuild` at `4544b8e` (UX-004, PR #54) into the existing F-R3-02A branch for PR #55. Kept both task and progress records and both branch-specific Vercel opt-outs. The timer implementation and tests match the original PR head byte for byte.
- Clean `npm ci`, lint, Knip, formatting, typecheck, production build, Git whitespace checks, and all 79 `phone-375` Playwright tests passed. The production audit found zero vulnerabilities, and Redocly reported the same four warnings. Full Windows Vitest passed 704 of 707 tests on the first run, including all Focus cases. The Profile, auth, and session failures passed on a one-worker rerun. A different Profile case hit its five-second timeout on that rerun and passed when run alone after Playwright finished.

#### Integration with UX-005

- Merged `origin/v2-rebuild` at `87c34e0` (UX-005, PR #56) into the existing F-R3-02A branch for PR #55. Preserved the task and progress entries for both changes and their Vercel preview opt-outs. The timer implementation and its 42 tests match the previous PR head byte for byte.
- Clean `npm ci`, lint, Knip, formatting, typecheck, production build, Git whitespace checks, and all 79 `phone-375` Playwright tests passed. Full Windows Vitest passed 709 tests across 65 files with a three-worker limit and one retry allowed. The production audit found zero vulnerabilities, and Redocly reported four existing warnings.

### 2026-11-24: UX-006 Elemental Quick Add & Form Experience

- **Base & Isolation:** Branched `feat/UX-006-elemental-quick-add` from `origin/v2-rebuild` (`87c34e0`, PR #56 `UX-005`) in isolated worktree `loomora-front-UX-006`, then merged latest `origin/v2-rebuild` (`3b8611e`, PR #55 `F-R3-02A`). Focus logic, timer math, API clients, repositories, Dexie, and Codex worktrees untouched.
- **Changed:**
  - `src/components/ui/icons.tsx`: Added `ChevronDownIcon` (`1.75 px` round-cap stroke) for progressive disclosure.
  - `src/features/schedule/DayToggle.tsx`: Migrated from legacy neo-brutalist thick black borders to Elemental Edition (`border-control`, `bg-primary text-white` selected, `bg-paper text-ink` unselected, `duration-fast ease-elemental`).
  - `src/features/today/AddTodoSheet.tsx`: Reordered primary quick-add fields (`Title`, `Due date`, `Category`) above a collapsible `More options` disclosure (`Remind me`, `Repeat`, `Priority`, `Notes` using UX-004 `Textarea`). Displays active option count when collapsed, auto-opens when editing a to-do with advanced fields or on validation errors, and shows `Priority`/`Notes` directly for subtasks.
  - `src/features/schedule/ScheduleForm.tsx`, `ScheduleItemSheet.tsx`: Added `initialFocusRef` on `Title`, focus-on-error for time range validation, grouped `Starts`/`Ends` container (`bg-subtle/40`, `border-hairline`), and refined Elemental alert/button spacing.
  - `src/i18n/en.json`, `vercel.json`: Added `todoForm.moreOptions`, `moreOptionsCount`, `hideOptions`, `notesPlaceholder`; disabled auto Vercel deploys for `feat/UX-006-elemental-quick-add`.
  - `src/features/today/AddTodoSheet.test.tsx`, `TodayPage.test.tsx`, `e2e/{offline-todos,r2-account,reminders,repeat,subtasks}.spec.ts`: Added progressive-disclosure and accessibility unit tests; updated existing tests to expand `More options` when setting advanced fields.
  - `docs/screenshots/today-add-sheet-375.png`, `docs/screenshots/schedule-sheet-375.png`, `docs/TASKS.md`: Updated screenshots and marked `UX-005` done / `UX-006` review.
- **Verified:**
  - `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build` (PWA precache 33 entries), `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 0 errors), and `git diff --check`: all passed.
  - Targeted Vitest (`AddTodoSheet.test.tsx`, `TodayPage.test.tsx`, `ScheduleItemSheet.test.tsx`): **34/34 passed**.
  - Playwright `phone-375` (`a11y`, `offline-todos`, `r2-account`, `reminders`, `repeat`, `subtasks`): **21/21 passed**.
  - 6-viewport Playwright sweep (`320, 375, 390, 768, 1024, 1440 px` × `AddTodoSheet` collapsed/expanded & `ScheduleItemSheet`): **0 px overflow** and `0` page errors across all widths; 200% text scaling at 375 px verified (`0 px` overflow on `ScheduleItemSheet`, `0 px` on `Today` page + `AddTodoSheet` (collapsed/expanded/errors) after adding `flex-wrap` to `TodayPage` header and 200% E2E regression test).

### 2026-11-24: UX-007 Elemental Today Screen Refinement

- **Base & Isolation:** Branched `feat/UX-007-elemental-today` from `origin/v2-rebuild` (`e284ad6`, PR #57 `UX-006`) in isolated worktree `loomora-front-UX-007`. Focus timer logic, Focus repositories, Dexie migrations, API clients, `AddTodoSheet`, `ScheduleForm`, and Codex's `F-R3-01` worktree untouched.
- **Changed:**
  - `src/features/today/TodoRow.tsx`: Migrated from legacy thick black borders/hard shadows to Elemental `border-hairline border-border-subtle bg-paper shadow-soft-sm` (`bg-subtle/60` when done), refined `44×44 px` `border-control` action buttons with subtle press feedback, clean metadata pills (preserving all 6 documented pastel category colors, semantic `danger` overdue pill, subtle priority/old pills), `tabular-nums` subtask progress, and hairline subtask connector.
  - `src/features/today/DoneStamp.tsx`: Refined to Elemental pill badge (`border-hairline border-success/40 bg-primary-soft text-success`) with reduced-motion-safe entrance.
  - `src/features/streak/StreakBadge.tsx`: Migrated to Elemental pill (`border-hairline shadow-soft-sm tabular-nums`, `bg-accent text-ink` when counted vs `bg-paper text-ink` when open) with gentler reduced-motion-safe celebration.
  - `src/features/today/TodayPage.tsx`, `NowNextStrip.tsx`, `TodayEmpty.tsx`, `src/components/states/LoadingState.tsx`: Refined vertical rhythm, date subtitle typography, `NowNextStrip` hover/press feedback with `text-ink` on pastel category surfaces (WCAG AA verified by axe-core) and `tabular-nums` times, responsive `TodayEmpty` button grid, and `motion-reduce:animate-none` on loading skeletons.
  - `src/features/today/TodayPage.test.tsx`, `src/features/streak/StreakBadge.test.tsx`: Added tests for keyboard completion, accessible `44×44 px` action targets, and Elemental surfaces/tabular numerals.
  - `vercel.json`, `docs/screenshots/today-375.png`, `docs/screenshots/today-1440.png`, `docs/TASKS.md`: Disabled auto Vercel deploy for `feat/UX-007-elemental-today`, captured 375 px and 1440 px screenshots, marked `UX-006` done and `UX-007` review.
- **Verified:**
  - `npx npm@10.9.4 ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build` (PWA precache 33 entries), `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings), and `git diff --check`: all passed.
  - Full Vitest (`npx vitest run --maxWorkers=3 --retry=1`): **714/714 passed** across **66** test files.
  - Playwright `phone-375`: **80/80 passed** (including all 17 `e2e/a11y.spec.ts` checks after fixing `NowNextStrip` pastel contrast).
  - 6-viewport Playwright sweep (`320, 375, 390, 768, 1024, 1440 px`) + 200% text scaling at `375 px`: **0 px overflow** and `0` page errors across all widths.

### 2026-11-24 F-R3-01 — Focus session repository and API integration

- Copied `docs/openapi.yaml` from merged backend B-043 commit `2dfc976` (PR #47), Git blob `8e7abd97855e1daa4517b981a08c59d688ed07c5`. The repositories expose `record`, `get`, and `listForDate` through the Focus repository context. Lists use the session's starting local date. Durations and laps stay in whole milliseconds.
- Generate the UUID once with `newFocusSessionId()` when starting a timer and persist it in the timer snapshot. Pass it to `record` at finalization. Guest sessions use an additive Dexie v9 store and keep the original link and label snapshot after a schedule deletion.
- The account repository stages the original payload in IndexedDB under the authenticated account and UUID before sending it. Use `listPending()` to recover unsynced records after reload and `retry(id)` to resend the staged payload. A network error or 5xx leaves it pending. Both 201 and 200 clear an ordinary draft. A 409 retains the original and blocks resend. Account reads use the API and can reflect a schedule link that was cleared on the server.
- For the B-043 missing-schedule 422, offer an explicit save without the schedule link. Only after user confirmation call `saveWithoutSchedule(id)`. It preserves the UUID, label, timing and original payload, and sets only the outgoing `schedule_item_id` to null. Another failure leaves that amended request available for `retry(id)`. The original remains available to its owner via `getLocalRecord(id)`. After another definitive server 422, correct the payload and call `record` with the same UUID. The original is retained when an amended request is accepted. Local validation rejects zero-Focus and other inconsistent sessions before submission.
- Guest Focus history stays on the device. The future runtime should finalize sessions in their original storage mode. Guest-to-account import depends on planner approval of the Focus history import policy.
- Local verification passed lint, typecheck, Knip, formatting, build, 79 phone-375 Playwright tests, OpenAPI lint with four existing warnings, and Git whitespace checks. The Windows Playwright launcher timed out, so the suite ran against a standalone local preview. Vitest identified an older v7 migration assertion pinned to v8. After removing the version pin, all 21 Focus and daily-intention tests passed. The production dependency audit found zero vulnerabilities, and the full audit reported four existing moderate advisories in the PWA build dependency chain.

### 2026-11-24: UX-008 Elemental Week Screen Refinement

- **Base & Isolation:** Claude Code CLI 2 (covering for Antigravity) branched `feat/UX-008-elemental-week` from `origin/v2-rebuild` (`e6486d4`, PR #59 `UX-007`) in isolated worktree `loomora-front-UX-008`. The `UX-008` ID was unused and is now registered in `docs/TASKS.md`. Backend, Focus timer math/runtime, Focus repositories, Dexie, API clients, auth/import, `AddTodoSheet`, `ScheduleForm`, the Today screen, and other agents' worktrees (Codex `F-R3-02B`, Claude CLI 1 `B-044`) were not touched. No documentation conflict was found.
- **Changed:**
  - `src/features/schedule/week/WeekPage.tsx`: Header with Inter heading and muted subtitle (matching Today). The phone overview flip button became the shared `SegmentedControl` (`Single day` / `Week overview`, group `Schedule view`). The day strip is a hairline paper rail. Today is computed once and passed to the strip and the day panels. Columns use `gap-1.5` at 768 px and `gap-3` from 1024 px.
  - `src/features/schedule/week/DayColumn.tsx`: Day panels (`border-hairline`, `bg-paper/60`; today tinted `bg-primary-soft/60` with a `Today` pill and `aria-current="date"`). The panel chrome is dropped in the narrow 768 px columns. Headings use Inter instead of the legacy `font-script` alias, with full names on phone and from 1024 px and short names at 768 px. A `tabular-nums` item count, a dashed `Nothing planned.` placeholder, and a full-width secondary Copy button were added. Schedule cards show the time first in `tabular-nums` with the category name as text. The category is also in the accessible name (`week.editItemWithCategory`) to satisfy WCAG 2.5.3 Label in Name. Cards get hover elevation, a `motion-reduce`-safe press scale, and a rounded focus ring.
  - `src/features/schedule/DayToggle.tsx`: Additive optional `current` prop (`aria-current="date"` plus a dot). `ScheduleForm` and `CopyDaySheet` usage is unchanged.
  - `src/i18n/en.json`: `week.subtitle`, `week.viewMode`, `week.today`, `week.itemCount_one/_other`, `week.editItemWithCategory`. The shared `week.editItem` (also used by Today's `DaySheet`) is unchanged.
  - `src/features/schedule/week/WeekPage.test.tsx`: 7 new tests covering today marker, touch targets, card visuals and category text, item counts and placeholder, keyboard open/copy, loading skeleton, and error with retry. The overview toggle test was updated for the segmented control.
  - `vercel.json`, `docs/screenshots/week-375.png`, `docs/screenshots/week-1440.png`, `docs/TASKS.md`: Branch preview opt-out, new screenshots, `UX-007` marked done (PR #59 @ `e6486d4`), and `UX-008` registered as review.
- **Verified:**
  - `npm ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `npx prettier --check --end-of-line auto .`, `npm run build` (PWA precache 32 entries), `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings), and `git diff --check`: all passed.
  - Full Vitest (`npx vitest run --maxWorkers=3`): **737/737 passed** across **67** files (Week file 24 tests). The first default-worker run hit Windows worker start-up timeouts under machine load, and the reduced-worker reruns passed.
  - Playwright `phone-375`: **80/80 passed**. The first run caught an axe `label-content-name-mismatch` on the new category text. It was fixed by adding the category to the card's accessible name and keeping whitespace between text spans.
  - Local sweep against `vite preview` with 5 seeded items across all six categories and reduced motion: **0 px overflow** and 0 page errors at `320, 375, 390, 768, 1024, 1440 px` (single-day and overview on phone widths). At 375 px with 200% root text, overflow was **0 px** in both views. Tab reaches the cards with a visible `3 px` outline, Enter opens `Edit schedule item`, and the smallest visible `main` button is **44 px**.
- **Notes for the planner:**
  - At 768 px the UX-005 sidebar left about 61 px per Week column. This was resolved by the planner fix below.
  - The category fills are still the six documented `DEC-002` hexes in `src/styles/tokens.ts` (the pastel values in `DEC-003` remain blocked on the reference assets, per `UX-003`). They were preserved as-is. Existing `docs/screenshots/week-1280.png` predates this task and was left untouched.

#### UX-008 planner fix: readable 768 px Week columns (PR #61)

- **Changed:** From 768 px the seven columns use `grid-cols-[repeat(7,minmax(8rem,1fr))]` inside their own `overflow-x-auto` container. Page width and the UX-005 sidebar are unchanged, and the container has `overscroll-x-contain`. `useHorizontalOverflow` (a `ResizeObserver` on the container and its columns) makes the container a focusable `role="region"` named `Week schedule, scroll sideways for more days` only while it actually overflows. While it scrolls, focusing a card or Copy button inside it calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })`. Chromium otherwise leaves a partly visible control cut off at the scroller edge on Tab. Scroll snapping was tried and removed because it pulled focused Sunday controls back out of view. The day panels now use one style at every width (full weekday names, `md:p-2.5` panels and cards). The 768 px short-name, no-chrome variant is gone. `pb-20` moved outside the scroller so its scrollbar stays clear of the floating +.
- **Verified:**
  - New Playwright regression test `e2e/week.spec.ts` (768 px, a long title on all seven days): 0 px page overflow; the scroller overflows; every column is at least 128 px; no title clips; axe (WCAG 2.0–2.2 A/AA) passes on the scrolling state. Real Tab presses go from Saturday's Copy to Sunday's card to Sunday's Copy, which ends fully inside the scroller and in the viewport, and Enter opens `Copy Sunday to…`. At 1440 px the scroller region is absent and page overflow is 0 px.
  - Local sweep against `vite preview` (5 items, one with a 65-character title): 0 px page overflow and 0 page errors at `320, 375, 390, 768, 1024, 1280, 1440 px`. The scroller is active at 768 and 1024 px (column minimum 128 px; Tab reaches Sunday's Copy fully in view) and inactive at 1280 px (131 px columns) and 1440 px (147 px columns). At 375 px with 200% text: 0 px overflow in single-day and overview modes, with a visible 3 px focus outline. No visible `main` button is under 44 px.
  - Screenshots refreshed: `week-375.png`, `week-1440.png`, and new `week-768.png` (scroll affordance: the next column peeks in at the edge). `week-1280.png` was preserved unchanged.
  - A single 17-letter word ("Interdisciplinary") still wraps inside a 128 px column. Ordinary words no longer break.

### 2026-11-24 F-R3-02B — Focus timer runtime and recovery

PR #58 merged into `v2-rebuild` at `d18ca7ddef33f4fb23bac715c2993d86feeac0df`. The isolated `feat/F-R3-02B-focus-runtime` worktree uses that base. F-R3-02B was available and follows the merged F-R3-02A timer core and F-R3-01 repositories. At intake, implementation was blocked pending planner approval.

The [R3 feature list](02-feature-list.md) requires custom countdowns, Focus cycles, early finish that keeps time, and recovery across navigation and reload. The [user flows](04-user-flows.md) leave Focus unmapped. The [research prompts](research/daycraft-task-prompts.md#dc-35--focus-cycle-planner-pure-logic) propose concrete behavior. The [B-043 contract](openapi.yaml) defines what finished sessions the repositories can store.

- **Custom countdowns:** What are the minimum, maximum, and input increment for a custom countdown? The core's positive whole-millisecond check validates the numeric representation. The DayCraft comparison's 1 second to 24 hours describes the reference product.
- **Breaks and completion:** Are the proposed preset plans (focus/short break/long break in minutes × cycles) of 25/5/15 × 4, 50/10/20 × 2, and 90/15/30 × 1 approved? Confirm how custom countdowns get a break plan, whether phases require an explicit start or can auto-advance, what recovery does when multiple phase deadlines have passed, and when skipping a break or finishing the last focus phase completes the session.
- **Early finish:** Which positive-duration sessions should be saved, and which actions map to `completed` or `ended_early` for each mode? B-043 accepts any positive Focus duration. DC-36 proposes discarding under 60 seconds, and the R3 feature list says early finish keeps time. B-043 rejects zero Focus time.
- **Clock recovery:** Should elapsed time include device sleep? What should the runtime do when a manual or network clock correction moves the clock backward or jumps it forward, including across reload? This determines whether recovery can safely advance or finalize a timer.
- **Session ownership:** What should happen when the owner signs out or changes while a timer is active? Confirm whether the timer continues for its original owner, freezes, or requires another explicit action before it can resume. Finalized sessions and retries must stay in their original guest or account scope.

After approval, cover lifecycle and recovery with tests around the existing timer math, persist owner-scoped snapshots with cross-tab coordination, finalize through the existing repositories with the same UUID and payload on retries, then run the frontend verification suite before opening the review PR.

#### Planner approval and contract reconciliation

The planner approved the five lifecycle decisions above on 2026-11-24. [DEC-004](DECISIONS.md#dec-004-focus-timer-runtime-and-recovery-2026-11-24) records the approved behavior. The default countdown has eight ordered phases (four Focus, three short breaks, one long break). This fits B-043's 200-segment limit. Waiting for a phase to start adds wall time without producing an active segment. The countdown sends the duration of one Focus phase as `planned_focus_ms`. The stopwatch sends one Focus segment and cumulative millisecond laps, consistent with the B-043 example. Both modes preserve positive Focus time on early finish. B-043 counts breaks separately and requires strictly increasing lap values. The reconciled behavior requires no API changes.

#### Runtime implementation

- The app-level Focus provider exposes lifecycle commands and read-only time projections. Dexie v10 adds an active snapshot per owner scope and a finished-session queue. A single transaction consumes the active snapshot and stages a finished payload. Snapshot revisions reject stale commands from another tab. Browser Web Locks serialize delivery where available, and the repositories enforce UUID idempotency on replay.
- Running timers checkpoint at most every 15 seconds and on browser lifecycle events. Countdown expiry records the current phase at the verified deadline. Explicit next-phase actions start the following phase. An account switch suspends the prior timer, and a late token expiry or an unobserved login change freezes it at the last verified checkpoint. Guest timers stay on the device and recover only in guest mode.
- A failed write retains the exact payload and UUID. The runtime retries on startup, reconnect, or explicit request. A 409 stays blocked. A missing schedule link stays blocked until an explicit repository amendment, which retains the original and can be recovered after another failure. A crash after the server commits and before the browser acknowledges can replay the same idempotent request.
- In a live document, only monotonic elapsed time is credited. Across documents, recovery requires a nonnegative interval supported by both clocks within a one-second tolerance. Material disagreement freezes the running phase at its last verified checkpoint. If the platform's monotonic reference does not advance through sleep, wall-only time cannot be verified. A browser restart can also make a forward clock correction indistinguishable from elapsed time if both clocks realign to the new value. [High Resolution Time](https://www.w3.org/TR/hr-time-3/).

#### Verification

- On the original PR #58 base, full Vitest passed 754 tests across 69 files and Playwright passed 81 phone-375 tests. The browser suite includes two tabs recovering the same expired final break and observing one saved session. Lint, typecheck, Knip, formatting, the production build, and Git whitespace checks passed.
- The production dependency audit found zero vulnerabilities. The full audit reported four moderate findings in the existing PWA build dependency chain. Redocly validated the unchanged OpenAPI contract with its four existing warnings.
- The unpublished Focus branch was rebased onto PR #59 (`e6486d4`) for review, retaining the UX-007 task and progress records. The Focus branch disables Vercel previews.

### 2026-11-24 F-R3-03 — Elemental Focus timer interface

- Started the isolated `feat/F-R3-03-focus-timer-ui` worktree from PR #60's merge commit `5a46b68`. Updated `/focus` with the DEC-003 design tokens and DEC-004 lifecycle. Countdown offers 25, 50, 90 and 1–240 whole minutes. Each break or subsequent Focus phase starts explicitly. Stopwatch shows centiseconds and lap splits, with Finish and End early controls.
- The attachment picker uses the existing Today to-do query and recurring schedule-item list. Restored, paused, upcoming phase, saving, and owner-scoped failure states have live announcements. Retryable saves keep the original UUID and payload. Rejected saves remain in the existing runtime queue.
- The production browser exposed a missed Dexie change notification when the live query awaited lazy database loading. Resolving the database first restored snapshot updates and phase scheduling. At 200% text size, responsive checks also exposed the shared header's hidden desktop brand taking up space. The header now keeps the Profile control in view.
- The feature branch opts out of Vercel previews.
- All 84 phone-375 Playwright tests passed against the standalone production preview after the combined Windows launcher timed out. The Focus checks covered keyboard and touch operation, recovery, phase transitions, early termination, owner isolation, offline retry with the same payload, and all six requested widths at 100% and 200% text size. The Focus axe scan found zero violations.
- Lint, typecheck, Knip, the production build, and Git whitespace checks passed. The production dependency audit found zero vulnerabilities. The full audit retained four moderate development dependency findings, and Redocly validated OpenAPI with four existing warnings.
- Full Vitest passed all 758 tests across 70 files on Windows with four workers, a 15-second test timeout, and one retry allowed. Prettier passed with automatic line endings for the Windows checkout.

#### PR #62 planner follow-up

- Focus reads the account outbox's definitive missing-schedule status to offer an explicit confirmation sheet. Confirmation uses the existing repository amendment through the owner-scoped runtime delivery lock. The outbox retains the original and resends the approved replacement by the same UUID after a failure or reload.
- The runtime ignores stale confirmations and suppresses a stale rejection if the replacement was already saved before queue cleanup. Generic validation and conflict rejections keep their existing feedback.
- The focused Vitest run passed 43 tests and all 87 phone-375 Playwright tests passed against the standalone Windows production preview. Lint, typecheck, Knip, formatting, build, and Git diff checks passed. The production audit found zero vulnerabilities. The full audit and Redocly retained four existing findings and four existing warnings, respectively.

### 2026-11-24: QA-024 Lossless guest import frontend integration

- **Branch / PR:** `feat/QA-024-lossless-guest-import` from `origin/v2-rebuild` at `e6486d4`, in worktree `loomora-front-QA-024`. One PR into `v2-rebuild`; not merged.
- **Contract:** Copied `docs/openapi.yaml` byte for byte from merged backend B-044 ([PR #48](https://github.com/danishsary8/loomora_back/pull/48), `13c64ff`), Git blob `435b75539239383016a3697d1ca99203a005c172`. Only the `POST /import` description changed. docs/08 rule 11 now records the I9 exemption. Rule 9 already described chunked requests with one transaction each.
- **What changed:**
  - `orderForImport` (`src/lib/storage/guestImportOrder.ts`) orders to-dos as in DECISIONS I9:
    - Each repeat chain runs from its newest occurrence down to the original.
    - Each successor's subtasks go right after its predecessor.
    - Every other to-do is followed by its subtasks.
    - Every `parent_id` and `next_todo_id` then points at an earlier row, so any cut is valid.
  - `saveGuestPlan` sends to-dos in consecutive calls of at most 500. Schedule items stay in the first call. Exceptions, check-ins and daily intentions keep their 5000, 10000 and 1000 per-call caps and travel in the same calls. The guest copy is still cleared only after every call succeeds. Rows keep their client UUIDs, so a replay skips what an earlier call committed.
  - It fails closed: if the order cannot place a row (a link loop, or a subtask whose parent is not a top-level to-do in the plan), it throws before any call. Nothing is sent or cleared.
- **Tests:**
  - `src/test/importBackend.ts` is a stand-in for `POST /import` that models backend `ImportRequest`:
    - at most 500 to-dos per call;
    - links to a row in the same call or on the account;
    - another account's id is refused;
    - the I9 manual count (a successor is proven only by an account row or a new row in the call, and so are its subtasks);
    - one transaction per call, and rows the account already has are skipped.
  - `src/lib/storage/guestImport.test.ts` (14 tests) covers:
    - 499, 500 and 501 rows, and 500 manual plus 1 generated row;
    - 500 manual plus 600 generated rows with subtasks (1100 rows in 3 calls);
    - two chains with subtasks crossing calls, newest occurrence first;
    - an account with 301 manual to-dos that ends at exactly 500, and one with 302, refused with the plan kept;
    - an account with 499 manual to-dos where a later occurrence has 300 more subtasks than the original;
    - a failed second call followed by a replay after reload: no duplicates, and items, check-ins and intentions intact;
    - another account's id;
    - a small plan in one call;
    - the fail-closed loop;
    - the recorded deletion case below.
  - The boundary table in `saveGuestPlan.test.ts` now follows I9. Its old mock used the pre-B-044 total count, which refused a plan of 500 manual rows plus a successor. It now uses the shared stand-in. All other existing import tests are unchanged and pass.
  - **Mutation checks:**
    - Placing a successor's subtasks right after the successor makes the 300-subtask near-capacity test fail with a false 422.
    - Starting chains from rows nobody points at instead of the newest occurrence fails 9 tests.
- **Recorded case (task step 8): a deleted middle occurrence breaks repeat provenance.**
  - **Exact case:** a guest has a repeating to-do P plus 499 other manual to-dos (500 manual). Checking off P creates S1; checking off S1 creates S2. The guest then deletes S1.
  - **Why it fails:** `GuestTodoRepository.delete` clears P's link to S1. Deleted rows are never imported, because the import schema has no deleted field. So nothing in the payload or the account points at S2. The backend counts S2 as manual: 501, so the import gets 422 `todos`.
  - **Contrast with an account:** an account's deleted S1 keeps proving S2, because deleted predecessors count (I9).
  - **What the app does:** it keeps the whole guest copy and does not discard or relink anything. Earlier calls may already be committed (Q-B044-3); a replay skips them.
  - **Scope:** this only fails when such orphaned successors, and their subtasks, push the final manual count past 500.
  - **Q-QA024-1, answered by the planner (2026-11-24): Option C.** The orphan-repeat case is a documented unsupported limit for QA-024. All guest data is kept; the app never silently relinks, deletes or changes repeat history. Options that were considered:
    - (A) The backend accepts deleted rows (or a provenance-only tombstone) on import, so the guest can send S1.
    - (B) The frontend relinks P to S2. Not done: it rewrites repeat history.
    - (C) Accept it as a documented limit.
  - Covered by the last test in `guestImport.test.ts`.
- **Other residual edges (unchanged by this task):**
  - Guest `restore` skips the 500 check, as account restores do. A plan can therefore pass 500 manual rows; it is refused and kept.
  - After a partial import, a guest who signs out and edits an already-committed row loses that edit on replay: the server copy wins (skip by id).
- **How it was verified:**
  - Clean `npm ci`, then `npm run lint`, `npm run typecheck`, `npm run knip`, and `npx prettier --check --end-of-line auto .`: all passed.
  - Full Vitest: **745/745 passed** in 68 files on a clean run.
    - An earlier run reported 4 unidentified failures.
    - A later run, made while the production build ran at the same time, hit 6 timeouts in `auth`, `ProfilePage`, `ScheduleItemSheet` and `DailyIntention`. Those 4 files then passed alone (92/92). None of them touches import code.
  - `npm run build` passed (PWA precache 33 entries).
  - Playwright `phone-375`: **80/80 passed** (`LOOMORA_E2E_PORT=4324`).
  - `npm audit --omit=dev`: 0 vulnerabilities.
  - `npx @redocly/cli lint docs/openapi.yaml`: valid, with the 4 existing warnings.
  - `git diff --check`: clean.
- **Migration / rollback:**
  - No Dexie schema change and no backend change.
  - Rolling back restores the single-call import. A plan of 500 manual rows plus successors would again get 422 and keep the guest copy.
  - Rows committed by a partial import stay on the account, and a later replay skips them.

#### 2026-11-24: QA-024 merge of `origin/v2-rebuild` and planner decision

- The planner answered Q-QA024-1 with Option C, recorded above. No code change was needed: the import already refuses the case, and the guest copy is kept unchanged.
- Merged `origin/v2-rebuild` at `c7bbfb2` (F-R3-02B and F-R3-03) with a merge commit. `docs/TASKS.md`, `docs/PROGRESS.md` and `vercel.json` conflicted only on appended entries, and both sides were kept, including all three branch preview opt-outs.

### 2026-11-24 F-R3-04 — Focus History & Time Tracking

- Focus history appears below the timer. The date defaults to today in the account or device time zone and stays selected across midnight. Sessions are ordered by start instant with a UUID tie-breaker. The day total sums each saved UUID's actual focus time once, including early-ended sessions.
- Guest history reads from IndexedDB, including while offline. Account history uses the existing B-043 date endpoint, shows cached dates while offline, and refreshes when a save settles or the connection returns. Linked items use a saved title when available, with existing plan queries and a fallback for unavailable items.
- Verified on v2-rebuild at 7056a4e. Full Vitest passed 770/770 with the threads pool after a Windows fork startup timeout. Full Playwright phone-375 passed 90/90 against a standalone production preview. The Playwright axe scan found zero violations, and the history layout and touch targets passed at 320, 375, 390, 768, 1024 and 1440 px at 100% and 200% text size.
- Lint, typecheck, Knip, Prettier with automatic Windows line endings, the production build, and git diff checks passed. The production audit found zero vulnerabilities. Redocly validated the existing OpenAPI contract with four warnings.
- Vercel previews are disabled for this branch. GitHub CLI authentication is unavailable. The planner can open the PR into v2-rebuild and start the two required CI jobs.

#### PR #64 planner follow-up

- GitHub Actions run 45350270141 failed in Unit tests when the schedule-title assertion received a detached element. The historical-session fixture now reuses the same session UUIDs on refetch and checks both linked titles in the current render.
- Merged v2-rebuild at edefad4 through a69c832, including QA-024. The merge preserves both task and progress entries and both branch preview exclusions.
- Local Focus History tests passed 5/5, and phone-375 passed 90/90. Lint, typecheck, Knip, Prettier, the production build and Git diff checks passed. The production audit found zero vulnerabilities. OpenAPI lint reported four existing warnings.
- The parallel Windows Vitest run reported timing failures in unchanged Today and Undo Delete tests. The Undo Delete rerun passed, and the first Today rerun hit a worker startup timeout. The PR CI job runs the full suite on Linux.

### 2026-11-24 F-R3-05 — Timer-End Sound & Mute

- Started from `f277c0f` in the `loomora-front-F-R3-05` worktree after confirming F-R3-04 merged in PR #64 and F-R3-05 was unused.
- A committed expiry of a started countdown phase, including a short or long break, can play one original 320 ms Web Audio chime. The runtime that commits the expiry plays it if audio is enabled, or relays it to the last audio-enabled document in the same owner scope. Manual endings, ordinary pause and resume, stopwatch finishes, and outbox retries are silent.
- The localized **Mute timer sound** toggle uses the Elemental Button and remembers a browser-local preference shared by guest and account mode. Audio opens on a Focus interaction. Playback failure is silent and independent of the timer. The deadline check suppresses audio for phases already expired at unlock, including expired reload recovery.
- The sound trigger uses the existing transaction and DEC-004's verified expiry. Vercel branch previews are disabled.
- Playwright `phone-375` passed 91/91, including the real Chromium chime, keyboard mute, reload and reduced-motion checks. Focus passed axe and the 320, 375, 390, 768, 1024 and 1440 px sweep at 100% and 200% text size.
- Lint, typecheck, Knip, Prettier, and the production build passed. The production audit found zero vulnerabilities. Redocly validated the OpenAPI contract with four existing warnings.
- Full Vitest passed 792/792 across 73 files with `--pool=forks --maxWorkers=4`. An earlier threads run reported two account-runtime fixture failures. Both passed in the focused forked run and the full forked rerun.
- Git diff checks passed. GitHub CLI authentication is unavailable. The planner can open the PR into `v2-rebuild` and verify CI and mergeability.

### 2026-11-24 F-R3-07 — Focus Alarm Customization

- Verified PR #68 merged into `v2-rebuild` and created `feat/F-R3-07-alarm-customization` at `087bf51` in the new isolated `loomora-front-F-R3-07` worktree. The task ID was unused in the task and progress logs and in local and remote branches. The task queue and open PRs showed no active alarm-settings owner.
- Reviewed the R3 feature list, DEC-003, DEC-004, the current chime, mute and expiry routing, and the expanded Focus view and tests. The feature list names play mode. [Research prompt DC-34](research/daycraft-task-prompts.md#dc-34--audio-service-unlock-mute-synth-sounds-exact-repeat) describes one play, exactly three plays by default, and looping until stopped. [DC-40](research/daycraft-task-prompts.md#dc-40--sound-settings-picker-preview-volume-play-mode) names the choices Once, Repeat 3× and Until I stop. The approved R3 documents leave the default, repeat cadence and stop behavior open.
- **Planner question:** Should Loomora adopt Once (one play and the default), Repeat 3× (three total plays), and Until I stop (loop until Stop alarm), and what pause between plays and automatic stop conditions should apply to the repeating modes?
- Registered the task as blocked and disabled Vercel previews for its branch. Implementation and feature verification are pending the planner's decision.


#### F-R3-07 planner decision

- Once is the default and plays one time.
- Repeat 3× plays exactly three times.
- Until I stop repeats until dismissed, subject to a two-minute safety limit.
- Leave two seconds of silence between consecutive plays.
- Stop playback automatically when the user selects Stop alarm, enables mute, starts another timer phase or session, leaves Focus, signs out or changes account, reloads or unmounts the page, or reaches the two-minute safety limit.
- Show an accessible Stop alarm control while an alarm is active and explain the two-minute limit in localized UI text.
- Preserve browser audio activation restrictions and cross-tab duplicate prevention. Recovery and reload never replay alarms. Save sound, volume and play mode locally.
- The planner approved this decision on 2026-11-24. Implementation continues on the existing branch and worktree.

#### F-R3-07 implementation

- The Countdown view offers three original synthesized sounds named Chime, Wood, and Bell. Chime and 50% volume preserve the previous default sound and level. Sound, volume, and play mode persist in this browser for guest and account use. The existing mute preference takes precedence.
- Playback uses the existing committed countdown expiry. A Focus tab with activated audio can ring and show Stop alarm in the normal or expanded view. Leaving Focus closes the audio context while the timer continues. Scope cancellation uses BroadcastChannel and a storage-event fallback. Alarm delivery remains optional when audio is unavailable.
- Vitest covers playback counts and spacing, the cutoff, sound and volume, preference restoration, mute, browser restrictions, and cross-tab cancellation. Playwright covers keyboard settings, restored preferences, dismissal, phase changes, navigation, reload, and the responsive and accessibility checks.

#### F-R3-07 verification (2026-11-25)

- Full Vitest passed 818/818 across 73 files with `--pool=threads --maxWorkers=3 --retry=1`. An earlier Windows run timed out in an unchanged offline guest-plan test.
- Playwright `phone-375` passed 103/103 against the standalone production preview after the Windows launcher hit its startup limit. The alarm settings passed axe and keyboard checks and had no horizontal overflow at 320, 375, 390, 768, 1024, and 1440 px with 100% and 200% text and reduced motion.
- Lint, typecheck, Knip, Prettier, the production build, and `git diff --check` passed. The production dependency audit reported zero vulnerabilities. Redocly validated the OpenAPI contract with four existing warnings.
- The local conflict check against `v2-rebuild` at `7bd5b52` passed. Vercel previews are disabled. GitHub CLI authentication is unavailable, so the planner can open the PR and verify its two required CI jobs and mergeability.

### 2026-11-24: UX-009 Elemental Profile & Settings Refinement

- **Base & Isolation:** Claude Code CLI 2 branched `feat/UX-009-elemental-profile` from `origin/v2-rebuild` (`7056a4e`, PR #61 `UX-008` merged) in isolated worktree `loomora-front-UX-009`. The `UX-009` ID was unused and is now registered in `docs/TASKS.md` (`UX-008` marked done). Guest import and migration (`QA-024`, which only changes `src/lib/storage/*`), Focus, Week, backend, auth contracts, API clients, Dexie, `DeleteAccountSheet`, `FeedbackSheet`, `SavePlanSheet`, and the Google deletion flow were not touched. No documentation conflict was found.
- **Changed:**
  - `src/features/profile/ProfilePage.tsx`: Today/Week-style header (Inter heading + muted subtitle, separate guest and account wording). Order: guest data notice, streak, settings card, `Help` group, `Account actions` group. The "Your data" notices moved from the `work` category fill to the DEC-003 warning surface (`bg-warning-surface`, `border-warning/30`). Save your plan is the only primary button for guests. Feedback, Sign out and Delete my account are now 52 px settings rows with unchanged accessible names. Delete is in danger text with a description in its own group. Sign out is disabled with `aria-busy` while its request runs, so a second press cannot start a second request. Sign-out behavior is otherwise unchanged.
  - `src/features/profile/StreakCard.tsx` (new): streak summary with `tabular-nums` count and the existing `StreakBadge`, plus a reduced-motion-safe skeleton, an error with Try again, and an offline message for accounts. Before, the streak card disappeared in these states.
  - `src/features/profile/SettingsList.tsx` (new): `SettingsGroup` (titled hairline list) and `SettingsRow` (full-width row with chevron, inset focus ring, optional description via `aria-describedby`, `danger` tone).
  - `src/features/profile/AccountCard.tsx`: Inter headings, email wraps at any width, a warning-surface unverified-email notice, a left-aligned primary-text "Use this device's time zone" link button, and a hairline-divided `Display settings` fieldset.
  - `src/features/profile/GuestPreferencesCard.tsx`, `PreferenceFields.tsx`: Inter heading, secondary Save settings (one primary per screen), a skeleton for loading preferences, and a shared success-colored `SavedStatus` with a check icon.
  - `src/i18n/en.json`: `profile.subtitle`, `subtitleGuest`, `streakLoadError`, `streakOffline`, `feedbackRowHint`, `supportTitle`, `accountActionsTitle`, `deleteHint`.
  - `e2e/profile.spec.ts` (new), `src/features/profile/ProfilePage.test.tsx` (10 new tests), `vercel.json` (branch preview opt-out), `docs/screenshots/profile-375.png` (guest) and new `profile-1440.png` (account).
- **Verified:** Full Vitest (`--maxWorkers=3`) **775/775** across 70 files and Playwright `phone-375` **90/90** passed. `lint`, `typecheck`, `knip`, `prettier --check --end-of-line auto .`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings), and `git diff --check` passed locally. The new Playwright Profile spec sweeps 320, 375, 390, 768, 1024 and 1440 px plus 200% root text at 375 px for guests and accounts (0 px overflow, smallest visible main button at least 44 px), runs axe (WCAG 2.0–2.2 A/AA), opens and closes the feedback and delete sheets from the keyboard, checks that focus returns to the row, and asserts that no write request (delete, feedback, logout, PATCH) is sent.
- **Notes for the planner:**
  - `FormError` (`src/features/auth/FormError.tsx`) still uses the legacy `border-thick` danger box. It is shared with every auth screen, so it was left for a shared-component task.
  - Category fills remain the six documented hexes. Profile no longer uses a category fill for system warnings. The existing `docs/screenshots/profile-1280.png` predates this task and was left untouched.

#### UX-009 planner follow-up: merge latest `v2-rebuild` after QA-024 (PR #65)

- **Changed:** Merged `origin/v2-rebuild` (`edefad4`, PR #63 `QA-024`) into `feat/UX-009-elemental-profile` with a merge commit. Only the append-only entries in `docs/TASKS.md`, `docs/PROGRESS.md` and the `vercel.json` branch-preview list conflicted, and both sides were kept. Guest import files (`src/lib/storage/*`, `src/test/importBackend.ts`, `docs/openapi.yaml`, `docs/08-data-model.md`) are identical to `v2-rebuild`.
- **Verified:** `lint`, `typecheck`, `knip`, `prettier --check --end-of-line auto .`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings), `git diff --check`, full Vitest (`--maxWorkers=2`) **790/790** across 71 files, and Playwright `phone-375` (including the build) **90/90**. The first Vitest run shared the machine with the lint and knip jobs and hit 5 s timeouts in 7 tests. Each of those files then passed on its own, and the full rerun passed.

#### UX-009 planner follow-up: merge latest `v2-rebuild` after F-R3-04 (PR #65)

- **Changed:** Merged `origin/v2-rebuild` (`f277c0f`, PR #64 `F-R3-04`) into `feat/UX-009-elemental-profile` with a merge commit (no rebase, no force-push). Only the append-only entries in `docs/TASKS.md`, `docs/PROGRESS.md` and the `vercel.json` branch-preview list conflicted, and both sides were kept. `src/i18n/en.json` merged automatically with both the Focus history and Profile keys. The diff against `v2-rebuild` still contains only UX-009 files.
- **Verified:** `npm ci`, `lint`, `typecheck`, `knip`, `prettier --check --end-of-line auto .`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings), `git diff --check`, full Vitest (`--maxWorkers=2`) **795/795** across 72 files, and Playwright `phone-375` **92/92**. The first Playwright attempt timed out in the 120 s web-server start because the production build took about 100 s under machine load. The retry passed unchanged.

#### 2026-11-24 F-R3-05 — PR #66 planner follow-up

- Merged `origin/v2-rebuild` at `a6fd1db` after UX-009 merged in PR #65. Kept both task and progress records, both Vercel branch preview exclusions, and the Focus and Profile translations.
- [CI run 45366276310](https://github.com/danishsary8/Loomora_front/actions/runs/45366276310) failed the Focus History focus-position assertion at 320 px with 200% text on both attempts. The test now uses keyboard Tab navigation with the real browser clock and checks that the focused date field settles in the viewport above the fixed navigation.
- The same run reported 0.065 seconds in the overnight stopwatch-history test on its first attempt. The test now waits for the corresponding Start and Pause commands to settle before advancing time, so the assertions still verify elapsed time and the starting local date.
- Local lint, typecheck, Knip, Prettier, production build and Git diff checks passed. The production audit reported zero vulnerabilities, and Redocly passed with four existing warnings. Both Focus History tests and the countdown audio test passed in the full local Playwright run. The initial Windows runs also reported three PWA timeouts and two Vitest worker startup timeouts.

### 2026-11-24 UX-010 — Elemental Landing Page Refinement

- **Planner decisions:** Option A (safe-area insets in the shared `StandalonePage`) and removing the legacy `font-script` alias once nothing referenced it. Both were approved in the UX-010 session on 2026-11-24.
- **Changes:**
  - `src/features/landing/LandingPage.tsx`: The hero uses `font-heading` Inter at a fluid `clamp(2.125rem, 14vw, 3.75rem)` size instead of `font-script`. The promise is shown as a large ink subtitle. `Try it now` stays the only forest-green primary action. The muted `No signup needed.` note and the secondary `Sign in` button are kept. From `md` the hero and the highlights sit in two columns. The three highlight cards keep the shared `Card` with unchanged `study` / `work` / `life` tones and copy. Each card adds the existing decorative nav icon (`WeekIcon`, `TodayIcon`, `StreakIcon`) for the screen it describes. When space is tight, the card text wraps below the icon.
  - `src/components/page/StandalonePage.tsx`: Top, bottom, left and right padding now use `max(<previous spacing>, env(safe-area-inset-*))`, so layouts without insets are unchanged. The footer wraps instead of overflowing its box at 320 px with 200% text.
  - `src/styles/tokens.ts`, `tokens.test.ts`, `tailwind.config.ts`, `src/styles/index.css`: Removed the `script` font alias, its Tailwind family, its letter-spacing rule and its test assertion. A repo search found no other production, config or test references.
  - `src/features/landing/LandingPage.test.tsx`, `e2e/landing.spec.ts`: Added tests for the Inter heading, a single primary action, 44 px targets, keyboard order, guest `Try it now` → empty Today, `Sign in` → sign-in, highlight tones and decorative icons, axe, and 0 px overflow at 320/375/390/768/1024/1440 px at 100% and 200% text. Sign in, Sign up, Privacy, Terms and 404 are also checked for 0 px overflow at 320 px.
  - `docs/screenshots/landing-375.png` and `landing-1440.png` are new. `landing-1280.png` is kept for history.
  - `vercel.json`: Previews are disabled for `feat/UX-010-elemental-landing`.
- **States:** The landing page has no data, so it has no loading, empty or error states.
- **Out of scope, unchanged:** routes, copy, category colors, auth, API, Dexie, Focus, Profile and guest import.
- **Verification (Windows, `f277c0f` base):**
  - `npm ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `prettier --check --end-of-line auto .`, `npm run build` and `git diff --check` all passed.
  - Full Vitest (threads pool): 789/790. The one failure was the unchanged `ProfilePage` test "ignores a pending deletion response with status 204 after sign-in", a timing failure under parallel load. The file passed 33/33 when rerun alone, and this task does not touch Profile.
  - Playwright `phone-375`: **95/95 passed**, including the 6 new landing tests and the existing legal tests.
  - `npm audit --omit=dev`: 0 vulnerabilities. `npx @redocly/cli lint docs/openapi.yaml`: valid, with the 4 existing warnings.
  - Landing showed 0 px overflow at 320, 375, 390, 768, 1024 and 1440 px at 100% and 200% text, with zero axe violations. Sign in, Sign up, Privacy, Terms and 404 showed 0 px overflow at 320 px.
- GitHub CLI is not authenticated. The branch is pushed so the planner can open the PR into `v2-rebuild` and start the two required CI jobs.

#### PR #67 planner follow-up: merge of `origin/v2-rebuild`

- Merged `origin/v2-rebuild` at `a6fd1db` (PR #65, UX-009 Profile) with a merge commit. There was no rebase and no force-push. Only the appended entries in `docs/TASKS.md` and `docs/PROGRESS.md` and the `vercel.json` branch-preview list conflicted, and both sides were kept, including both preview opt-outs. UX-009 and UX-010 share no other files, and no new `font-script` reference arrived.
- Verification after the merge on Windows:
  - `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed.
  - Playwright `phone-375`: **97/97 passed**.
  - Full Vitest runs were affected by machine load from other agents' Node processes. One run had 2 failures and a second run had 12. They hit different unrelated tests each time (Profile, Today, Week, session), all timeouts or missed waits. Every affected file passed when rerun alone. For example, `ProfilePage` passed 43/43 twice and `TimePreferences` passed 7/7. The Linux CI unit job is the authoritative full-suite run.
- Merged `origin/v2-rebuild` again at `fede106` (PR #66, F-R3-05 timer-end sound) with a merge commit. Only the appended `docs/PROGRESS.md` entries conflicted, and both were kept. `docs/TASKS.md` and `vercel.json` (all three branch preview opt-outs) merged automatically.
- Verification after the `fede106` merge on Windows:
  - `npm ci`, lint, typecheck, Knip, Prettier, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed.
  - Playwright `phone-375`: **98/98 passed**.
  - Full Vitest with 4 workers: 805/807. The two failures were in `auth` (a missed label wait) and `session` (a load-timing assertion). Both passed 44/44 when rerun alone. The Linux CI unit job is the authoritative full-suite run.

### 2026-11-24 UX-011 — Elemental Authentication Screen Refinement

- **Changes:**
  - `src/features/auth/AuthLayout.tsx` (new): `AuthLayout` sits inside the unchanged shared `StandalonePage`. It shows the Inter `PageHeading` with an optional muted subtitle, puts the form on the shared paper `Card` (`sm:p-6`), and lists text links below the card. It is centered vertically from `sm`. `AuthLink` gives every auth text link the same primary-colored, underlined style with a 44 px target. `AuthDivider` is the hairline "or" separator, labeled for screen readers.
  - `src/features/auth/FormError.tsx`: `FormError` is now a hairline danger notice (`border-danger` on paper, ink text, `AlertIcon`) instead of the legacy `border-thick` box. The new `FormSuccess` is the matching success notice (`border-success/40` on `primary-soft`, `CheckIcon`, `role="status"`). The forgot-password, reset and verify confirmations and the resend outcome now use these notices instead of the `health` / `life` category cards, because DEC-003 keeps category colors out of status messages.
  - `AuthPage`, `SignInForm`, `SignUpForm`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, `SurveyPage`, `ResendVerification`: use the layout, notices and links above. Every auth form sets `aria-busy` while its request runs. Forgot and Reset now show "Sending…" / "Saving…" while pending, as Sign in and Sign up already did. "Forgot your password?" is right-aligned under the password field, and tab order is unchanged.
  - `src/components/ui/icons.tsx`: new `AlertIcon` in the unified 1.75 px round-cap style.
  - `src/i18n/en.json`: `pages.signIn.subtitle`, `pages.signUp.subtitle`, `auth.forgot.sending`, `auth.reset.saving`.
  - `src/features/auth/authPresentation.test.tsx` (new, 15 tests), `e2e/auth.spec.ts` (new, 8 tests), `docs/screenshots/auth-375.png` and `auth-1440.png` (Sign in), `vercel.json` (branch preview opt-out).
- **Unchanged:** routes, validation rules, server error mapping, the session generation guards, the Google redirect URL and intents, the Google callback, token handling, the API, Dexie, guest import, `StandalonePage`, Landing, Profile and Focus. Legal and 404 screens (UX-012) were not touched.
- **Notes for the planner:**
  - Profile's `AccountCard` and `DeleteAccountSheet` import the shared auth `FormError`, so their form errors now also use the Elemental danger notice. UX-009 flagged this component as still legacy. Profile's code and layout are otherwise unchanged.
  - The Google button keeps its text-only label. A Google "G" mark would add a third-party brand asset outside the unified icon set, so it was left out.
- **Verification (Windows, `4de84ff` base):**
  - `npm ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `prettier --check --end-of-line auto .`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings) and `git diff --check` passed. `npm run build` passed as part of the Playwright web server.
  - New unit tests: `authPresentation.test.tsx` 15/15, and all auth tests 64/64.
  - Full Vitest (`--maxWorkers=3`): 806/812. The 6 failures were in `auth`, `LandingPage`, `ProfilePage`, `AddTodoSheet` and `DailyIntention`. They were 5 s timeouts or missed waits while a forks worker also failed to start under machine load. Rerun alone, the 5 files passed **100/100**. The Linux CI unit job is the authoritative full-suite run.
  - Playwright `phone-375`: 105/106. The one failure was `a11y.spec.ts` `/reset-password`, which ended with "Protocol error … session closed" before axe ran. `a11y.spec.ts` then passed **17/17** on its own. The new `e2e/auth.spec.ts` passed **8/8**. It covers field and server errors, a network failure, a Google callback error, links between screens, keyboard order with a visible focus ring, the guest Save your plan → Sign up → back path with no write requests, axe on five auth screens with 44 px targets, and 0 px overflow at 320/375/390/768/1024/1440 px plus 200% text at 320 px. All API calls are route fixtures, so no account is created or changed.

### 2026-11-24 F-R3-06 — Focus Presets & Full-Screen Focus View

- Verified PRs #64 and #66 merged into `v2-rebuild` and their merge commits (`f277c0f` and `fede106`) are ancestors of the fetched base `4de84ff`. F-R3-06 was unused in the task and progress logs and in local and remote branches. Created `feat/F-R3-06-focus-presentation` in the isolated `loomora-front-F-R3-06` worktree.
- Reviewed the R3 feature list, DEC-003, DEC-004, the Focus page, readout, session hook, app-level runtime, and existing preset, recovery, accessibility, and browser tests. The current picker already offers 25, 50, 90, and Custom. The active timer uses the app-level runtime through page changes.
- **Planner question:** Should F-R3-06 keep the device screen awake while the timer runs in the expanded view? [Research prompt DC-37](research/daycraft-task-prompts.md#dc-37--full-screen-focus-view) proposes requesting Screen Wake Lock while running and releasing it on pause or exit. The R3 feature list, DEC-004, and the task scope leave that device behavior unspecified. Please confirm whether to include it or limit this task to the presentation.
- Registered the task and its five-step plan. Implementation and feature verification are pending the planner's decision.

#### F-R3-06 planner decision

The planner approved the presentation scope on 2026-11-24. The expanded view will use browser fullscreen when available and an in-app fallback otherwise. Screen Wake Lock and additional permission requests are outside this task. Implementation resumes in the existing worktree.

#### F-R3-06 implementation and verification

- The countdown picker uses a labeled radio group with arrow-key selection and a visible checked indicator. The documented 25, 50, 90, and Custom durations use the existing timer configuration.
- The localized expanded view shares the active timer controls, phase readout, linked item, mute, and stopwatch laps. Native fullscreen and the viewport-filling dialog use the same exit control. Escape and browser exit return focus to Expand timer, and session completion returns focus to Start.
- The presentation closes if the active snapshot disappears. A recovered timer returns in the normal layout. Countdown audio unlock runs before the fullscreen request, and linked to-do lookups use the session's starting date through midnight.
- Verification covers native and fallback fullscreen, keyboard and focus behavior, phase transitions, navigation, reload, linked guest and account sessions, history, and audio. The Playwright sweep covers 320, 375, 390, 768, 1024, and 1440 px at 100% and 200% text with reduced motion. The production audit found zero vulnerabilities, and Redocly validated the unchanged OpenAPI file with four existing warnings. The review PR carries the final suite results. Vercel previews are disabled for this branch.

The first GitHub browser run exposed two test assumptions. The midnight scenario now uses Week for its navigation step to keep the guest save prompt out of the scenario. The normal layout sweep tabs to the primary control and checks its final position above the mobile navigation. Both revised cases passed against the standalone production preview.

#### PR #69 planner follow-up: merge of `origin/v2-rebuild` after F-R3-06 (PR #68)

- Merged `origin/v2-rebuild` at `087bf51` into `feat/UX-011-elemental-auth` with a merge commit (no rebase, no force-push). Only the appended entries in `docs/TASKS.md`, `docs/PROGRESS.md` and the `vercel.json` branch-preview list conflicted. Both sides were kept, including all 22 preview opt-outs, and neither side lost a line. `src/i18n/en.json` merged automatically. No F-R3-06 Focus file was changed.
- Verification after the merge on Windows:
  - `npm ci`, lint, typecheck, Knip, Prettier, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, 4 existing warnings) passed.
  - Full Vitest (`--maxWorkers=2`): **823/823 passed**.
  - Playwright `phone-375`: the first attempt hit the 120 s web-server start timeout during the production build under machine load, and no tests ran. The retry passed 108/109. The failure was `cross-browser.spec.ts` "6: cross-tab session synchronization", where the browser context had already closed ("Target page, context or browser has been closed"). `cross-browser.spec.ts` then passed **5/5** on its own.

### 2026-11-25 DOC-001 — Professional frontend README

- **Changed:** Rewrote the root `README.md` as a portfolio-ready project README. It covers identity, the Plan / Focus / Review overview (implemented, merged and planned), committed screenshots, the live demo with a staleness note, the stack, the architecture with a Mermaid data-flow diagram, getting started, environment variables, scripts, testing and CI, guest and account modes, PWA and Vercel configuration, API integration, the roadmap and the author. Registered DOC-001 in `docs/TASKS.md`. No application code, tests, dependencies, `vercel.json` or OpenAPI files changed.
- **Sources checked:** `package.json`, `.env.example`, `src/lib/api/index.ts`, `src/app/routes.tsx`, `src/app/AppProviders.tsx`, `src/lib/storage/saveGuestPlan.ts`, `vite.config.ts`, `vercel.json`, `playwright.config.ts`, `playwright.staging.config.ts`, `.github/workflows/ci.yml` and `src/i18n/en.json` (Focus strings). Only the screenshots updated on 2026-11-23 and 2026-11-24 (Elemental Edition) are used. The October screenshots still show the old design.
- **Verified:**
  - All 47 unique relative links, image paths and in-page anchors in `README.md` resolve.
  - All 25 unique external links and badges return HTTP 200, including the CI badge, both GitHub repositories and the backend's `docs/openapi.yaml`. The backend's OpenAPI file matches `docs/openapi.yaml` apart from line endings.
  - All 12 documented scripts match `package.json`.
  - `git diff --check` passed.
  - Markdown files are excluded by `.prettierignore`, and no Markdown linter is configured, so no other documentation check applies. Lint, typecheck, Knip, Vitest, build and Playwright were not run locally because no code, configuration or test changed. CI runs them on the PR.
  - The diff contains no secrets, tokens or `.env` values.
- **Notes for the planner (none block this task):**
  1. **Production is stale.** On 2026-11-25, read-only requests to `https://loomora-craft.vercel.app` still served `assets/index-Cbeen9Dj.js`. That build has the cream `#F5EDE6` theme and a Focus page that only shows "Coming soon". The README links the demo and states that it is behind `v2-rebuild` (QA-016). `https://loomora-api.onrender.com/api/v1/health` returned `200 {"status":"ok"}`. The API has no hosted documentation page, so the README links the OpenAPI file instead.
  2. **Vercel preview for this branch.** `vercel.json` `git.deploymentEnabled` does not list `docs/DOC-001-frontend-readme`, so Vercel will probably build a protected Preview for it. As instructed, `vercel.json` was not edited for a docs-only task. Please add an opt-out if previews for docs branches are unwanted.
  3. **`date-fns` in `docs/10-tech-and-structure.md`.** The stack lists `date-fns`, but it is not in `package.json` and nothing under `src/` imports it. The README lists only installed tools. Should `docs/10` drop it? The frontend structure in `docs/10` also lists fewer feature folders than exist today (no `focus`, `reminders`, `landing`, `legal`, `insights` or `styleguide`).
  4. **Guest Focus sessions are not imported.** `saveGuestPlan` imports to-dos, schedule items, exceptions, check-ins and daily intentions, but not guest Focus sessions. The README states this. Please confirm that this is intended.
  5. **`npm run e2e` runs six projects.** The suite covers Chromium, Firefox and WebKit at 375 px and 1280 px. The previous README said it ran only at 375 px and 1280 px in one browser. The new README explains installing all browsers for a full run and that CI runs only `phone-375`.

#### PR #72 planner follow-up: merge of `origin/v2-rebuild` after F-R3-07 (PR #71)

- Merged `origin/v2-rebuild` at `017c442` into `docs/DOC-001-frontend-readme` with a merge commit (no rebase, no force-push). Only the appended task entries in `docs/TASKS.md` conflicted. Both were kept, with F-R3-07 first and DOC-001 after it. `docs/PROGRESS.md` and every F-R3-07 code, test, i18n and `vercel.json` change merged automatically and were not edited.
- Rechecked the README against the merged code. F-R3-07 is now merged, so the Focus overview, pillar table and roadmap describe the timer-end alarm as implemented: the Chime, Wood and Bell sounds, volume, the Once (default), Repeat 3× and Until I stop play modes with a two-minute limit, mute precedence, Stop alarm, and browser-local preferences (`src/features/focus/focusAlarmPreferences.ts`). History filters, search and delete remain listed as not built. `package.json`, `.env.example`, routes, `vite.config.ts`, `playwright.config.ts` and the CI workflow did not change, so the other README sections still hold.
- Verified again that every relative link, image and anchor resolves and that `git diff --check` passes.

### 2026-11-24 UX-012 — Elemental Legal & Error Page Refinement

- **Scope:** S13 only (Privacy, Terms, Not found, router error). Branch `feat/UX-012-elemental-legal` from `origin/v2-rebuild` at `4de84ff` (PR #67 merged), isolated worktree `loomora-front-UX-012`. The shared `StandalonePage`, auth, Focus, Landing, Profile and guest import are untouched.
- **Changes:**
  - `src/features/legal/LegalPage.tsx`: Added a `Back to Loomora` link (installed standalone PWAs have no browser back button). The title, date and intro form one header. An `On this page` contents list links to each section. It is a paper card on phones and a sticky side column from `lg`, using the existing `wide` `StandalonePage` option. Sections are labelled regions with hairline dividers, Inter `h2` headings, relaxed leading and a `34em` measure (about 70 characters per line; `max-w-prose` measured about 104 with Inter). Contents links are router `Link`s and move focus to their section. A bare `#hash` link was tried first, but React Router's `ScrollRestoration` gives the native hash entry the same `default` key as the first entry and scrolled back to the top.
  - `src/components/page/RecoveryPage.tsx` (new): A shared recovery layout inside `StandalonePage` (safe areas, footer legal links): optional eyebrow, `h1`, message and stacked actions. `NotFoundPage` uses it with `Error 404`, the existing `Go to Today` primary action and a new secondary `Back to Loomora`. `RouteError` uses it with a real `h1` (`This page could not load`), the unchanged friendly message announced as `role="alert"`, `Try again` (same `window.location.reload()`) as the primary action, and `Go to Today`. Before, the router error page had no `h1`, no safe-area padding and no legal links.
  - `src/i18n/en.json`: Added only `common.backHome`, `legal.onThisPage`, `pages.notFound.code` and `routeError.title`. Every `legal.updated`, `legal.privacy.*` and `legal.terms.*` string is byte-identical, so the legal meaning, the date and the QA-004 publication blockers are unchanged.
  - Tests: `LegalPage.test.tsx` (every Privacy/Terms translation string still rendered, contents links match their sections, focus moves to the section, back link), new `NotFoundPage.test.tsx`, an extended `RouteError.test.tsx` and new S13 cases in `e2e/legal.spec.ts`. The E2E cases cover keyboard contents navigation with visible focus, the measure and desktop column, axe, 44 px link heights, 0 px overflow at 320/375/390/768/1024/1440 px at 100% and 200% text for Privacy, Terms and 404, 404 keyboard recovery, and a real router error (blocked `ProfilePage` chunk) with axe, overflow at 320/1440 px with 200% text, and keyboard `Try again` reloading into Profile.
  - `docs/screenshots/legal-375.png`, `legal-1440.png` (new). `vercel.json`: previews disabled for `feat/UX-012-elemental-legal`.
- **Verification (Windows):** `npm ci`, `lint`, `typecheck`, `knip`, `prettier --check --end-of-line auto .`, `npm run build`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 existing warnings) and `git diff --check` passed. Full Vitest (`--maxWorkers=2`): **819/819** across 74 files. An earlier 3-worker run under load from other agents had 4 timeouts or missed waits in untouched Routes, Focus, Landing and Profile tests, and those files passed 77/77 when rerun alone. Playwright `phone-375`: **104/104**. The 120 s Playwright web-server start timed out once while the build ran under load, so the final runs used an untracked local config that served the finished `VITE_API_URL` build with `vite preview` (deleted afterwards).
- **Legal content:** No inaccurate statement was found or changed in this task. QA-004 (owner contact, jurisdiction, effective date, retention and provider confirmation, publication approval) and Q23 remain open as recorded under QA-017.
- GitHub CLI is not authenticated. The branch is pushed so the planner can open the PR into `v2-rebuild`.

#### PR #70 planner follow-up: merge of `origin/v2-rebuild`

- Merged `origin/v2-rebuild` at `087bf51` (PR #68, F-R3-06 Focus presentation) with a merge commit. There was no rebase and no force-push. Only the appended entries in `docs/TASKS.md` and `docs/PROGRESS.md` and the `vercel.json` branch-preview list conflicted. Both sides were kept, including the F-R3-06 and UX-012 preview opt-outs. `src/i18n/en.json` merged automatically, and no F-R3-06 file was changed.
- Verification after the merge on Windows: `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed. Full Vitest (`--maxWorkers=2`): **820/820** across 74 files. Playwright `phone-375` with the standard config, including its production build: **107/107**.

#### PR #70 planner follow-up: merge of `origin/v2-rebuild` after UX-011 (PR #69)

- Merged `origin/v2-rebuild` at `7bd5b52` (PR #69, UX-011 Elemental Auth) with a merge commit. There was no rebase and no force-push. Only the appended `docs/PROGRESS.md` entries conflicted. The UX-011 PR #69 follow-up stays under the UX-011 entry, before the UX-012 entry. `docs/TASKS.md`, `src/i18n/en.json` and `vercel.json` merged automatically with both tasks' entries, translations and all branch-preview opt-outs. No UX-011 authentication file was changed, and the shared `ChevronDownIcon` used by the legal back link is still exported.
- Verification after the merge on Windows: `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed. Full Vitest (`--maxWorkers=2`): **835/835** across 75 files. Playwright `phone-375` with the standard config, including its production build: **115/115**.

#### PR #70 planner follow-up: merge of `origin/v2-rebuild` after F-R3-07 (PR #71)

- Merged `origin/v2-rebuild` at `017c442` (PR #71, F-R3-07 alarm customization) with a merge commit. There was no rebase and no force-push. The appended `docs/TASKS.md` entries and the `vercel.json` branch-preview list conflicted. Both sides were kept, with F-R3-07 first and then UX-012. The F-R3-07, UX-011 and UX-012 task entries match their source branches exactly, and every preview opt-out is present. `docs/PROGRESS.md` and `src/i18n/en.json` merged automatically. No F-R3-07 Focus file was changed.
- Verification after the merge on Windows: `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed. Full Vitest (`--maxWorkers=2`): **845/845** across 75 files. Playwright `phone-375` with the standard config, including its production build: 115/117 on the first run. The PWA Q21 update test then passed twice in isolation.
- **Planner question (pre-existing, outside UX-012):** The UX-011 test `e2e/auth.spec.ts` "auth screens have no horizontal overflow at 320–1440 px and 200% text" failed once in the full run and once in two isolated repeats with `/forgot-password at 200%: 43`. A browser probe of the production build (fonts loaded, 320 px, 200% root text) reproduces a 43 px overflow every time. The cause is the `h1` "Forgot password" from `AuthLayout` → shared `PageHeading`: at `text-4xl` × 200% the word "password" cannot break and its text ends at 363 px. The test passes intermittently, probably because it sometimes measures before Inter is applied. This branch does not change `PageHeading`, `StandalonePage` or any auth file (they are identical to `v2-rebuild`), so the defect is already on `v2-rebuild` from PR #69. A likely fix is `[overflow-wrap:anywhere]` (or a fluid size) on the auth heading or on `PageHeading`. That is UX-011 / shared-component scope, so it was not changed here. Please assign it.
- `v2-rebuild` then moved to `401fc8d` (PR #72, DOC-001 README), which made PR #70 conflicted, so GitHub started no CI run for `85f9d04`. Merged it with another merge commit. Only the appended DOC-001 entries in `docs/TASKS.md` and `docs/PROGRESS.md` conflicted. Both sides were kept, with DOC-001 first, and every DOC-001, F-R3-07, UX-011 and UX-012 entry matches its source. PR #72 changed only `README.md` and docs. Rerun on the final merge: all static checks passed, full Vitest **845/845** across 75 files and Playwright `phone-375` **117/117**, including the auth overflow test, which supports the intermittency described above.

### 2026-11-25 DOC-002 — Frontend architecture documentation cleanup

- **Scope:** Documentation only. Branch `docs/DOC-002-frontend-architecture` from `origin/v2-rebuild` at `5fe3192` (PR #70 merged), isolated worktree `loomora-front-DOC-002`. DOC-002 was unused in `docs/TASKS.md`, `docs/PROGRESS.md` and local and remote branches. Only `docs/10-tech-and-structure.md`, `docs/TASKS.md` and `docs/PROGRESS.md` changed.
- **`date-fns` mismatch confirmed.** It is not in `package.json` or `package-lock.json`, and nothing under `src/` or `e2e/` imports it. F-001 installed it, and QA-020 removed it (native `YYYY-MM-DD` helpers in `src/lib/date.ts`) to shrink the entry bundle. `docs/10` now says date handling uses no library and names the native and `Intl` helpers. The F-001 and QA-020 task history is unchanged.
- **Corrected in `docs/10-tech-and-structure.md` (v1.0 → v1.1):**
  - Frontend stack: removed `date-fns`. Added versions and the installed tools the plan did not list: Workbox, self-hosted Inter, jsdom, fake-indexeddb, MSW, axe-core, Knip and the Node 22 requirement.
  - Frontend tree: replaced the planned tree with the real one. It adds `src/main.tsx`, `src/app/layout/`, `src/components/page/` and `states/`, the `focus`, `reminders`, `landing`, `legal`, `insights` and `styleguide` feature folders, `schedule/week/`, the `src/lib/api/`, `storage/` and `time/` split, `src/test/`, `e2e/staging/`, `public/` and `scripts/`. The `ui/` list now names the real primitives (`ProgressRing`, not `Ring`, plus `Textarea`, `Field`, `ClockInput`, `SegmentedControl`, `Toast`, `FloatingAddButton` and icons).
  - New sections, each checked against source: how A8-1 to A8-8 are implemented, routing (`src/app/routes.tsx`, including guards and the standalone Google deletion callback), data and storage (the four repository pairs chosen in `AppProviders`, Dexie schema versions 1 to 10 with every table, Web Storage keys, guest import), API integration, client state (TanStack Query and the five Zustand stores), PWA and Vercel, tests and CI.
  - Kept unchanged: the A8 decision table, the backend stack and backend structure (marked as the v1.0 plan, not re-verified), and the environment and secrets list.
- **README consistency:** The new `docs/10` agrees with `README.md` on the stack, folder structure, routes, repositories, API client behavior, PWA, Vercel, tests and CI. `docs/10` adds detail the README leaves out, but nothing contradicts it.
- **Verified:**
  - All 45 unique file paths named in backticks in `docs/10` exist (bare file names were checked in the folder the text names), as do all 12 folders in the frontend tree. Its 3 in-page anchors match headings. `docs/10` contains no external links.
  - Every dependency named in `docs/10` is in `package.json`.
  - `git diff --check` passed.
  - Markdown is excluded by `.prettierignore` and no Markdown linter is configured. Lint, typecheck, Knip, Vitest, build and Playwright were not run locally because no code, configuration or test changed. CI runs them on the PR.
- **Open questions for the planner** (also listed in `docs/10`, none block this task):
  1. `legacy/` was planned for deletion at the end of R1. It still exists here and in `loomora_back`. Remove it, and in which task?
  2. The backend structure in `docs/10` lists fewer models and services than `loomora_back` has now (for example `DailyIntention`, `FocusSession`, `FocusSessionService`, `RepeatTodoService`). Should a backend task update it?
  3. Guest Focus sessions are not part of the guest import (also DOC-001 note 4). Is this intended?
  4. Daily intentions and time preferences switch between Dexie and the API inside their hooks, not through a repository interface. Is this an accepted exception to A8-5?
  5. Account Focus timers and the Focus outbox are stored in the `loomora-guest` IndexedDB database, scoped by user id, while A8-4 describes IndexedDB as guest storage. Should A8-4 or the database name be updated?
  6. `README.md` lists Dexie only as guest storage (see question 5). It is outside this task's scope and was not changed.
- GitHub CLI is not authenticated. The branch is pushed so the planner can open the PR into `v2-rebuild`.

### 2026-11-25 F-R3-13 — Focus History account regression

- Verified the task ID was unused and opened the isolated `feat/F-R3-13-focus-history-regression` worktree from `origin/v2-rebuild` at `5fe3192`.
- Extended the Playwright Focus fixture to use the bearer token for account identity and return B-043 session records by starting local date. Added two browser regressions for account save through History and reload, guest and second-account isolation, and loading, empty, error, and keyboard retry states.
- The save test finishes a 22.5-second linked stopwatch session after account-local midnight. It verifies the earlier row, start time, row duration, daily total, and UUID on a fresh History response, plus the absence of duplicate writes. The first focused run held the History update while the test clock was paused. Waiting for the timer to close before resuming the clock preserves the exact duration and lets the query update.
- Production application code is untouched. The branch-specific Vercel setting disables preview deployment.
- Local verification passed lint, typecheck, Knip, Prettier with automatic line endings, the Playwright production build, full Vitest (845/845 across 75 files), and full Chromium `phone-375` (119/119, including 2 new tests). The production dependency audit found zero vulnerabilities. Redocly validated the existing OpenAPI contract with four warnings. Git diff checks passed.
- GitHub CLI is unauthenticated. The planner can open the PR into `v2-rebuild` from the pushed branch to start CI.

#### PR #74 planner follow-up

- Merged `origin/v2-rebuild` at `64408cc` after DOC-002 (PR #73). The append-only task and progress conflicts kept both original entries. The DOC-002 architecture document, the F-R3-13 test, and its Vercel preview opt-out match their original versions.
- Lint, typecheck, Knip, Prettier with automatic line endings, production build, and Git diff checks passed. Vitest passed 845/845 across 75 files. The production dependency audit found zero vulnerabilities, and Redocly reported four existing warnings.
- The first `phone-375` run passed 118 of 119. The existing Reset Password overflow test measured 43 px at 200% text. The full rerun against the same production build had 118 first-pass successes and one retry-pass for that test. Auth source and tests match `v2-rebuild`.

### 2026-11-25: Task board reconciliation with merged PRs

- **Scope:** documentation only, `docs/TASKS.md` and `docs/PROGRESS.md`. Branch `docs/board-sync-20261125` from `origin/v2-rebuild` at `f5c962c` (fetched 2026-11-25). Owner-approved: reconcile through a separate docs PR and keep genuinely open items open. Entries that exist only on open branches (QA-025, F-R3-11, F-R3-10, QA-026) are not touched.
- **Merge evidence:** for each PR, the head and the merge commit are ancestors of `origin/v2-rebuild`, the merge commit message names the PR and the task branch, and the GitHub API reports the PR merged.
- **`review` to `done` (25), each with a `Merge` line:** QA-010 #36 `34b6a5a`, F-030 #45 `00a6d01`, QA-019 #46 `93959cb`, QA-020 #47 `40ab685`, QA-021 #48 `e4e57b4`, QA-022 #49 `aef8230`, F-031 #50 `b84a977`, QA-023 #51 `b34ab8f`, F-R3-02A #55 `3b8611e`, F-R3-01 #58 `d18ca7d`, F-R3-02B #60 `5a46b68`, F-R3-03 #62 `c7bbfb2`, QA-024 #63 `edefad4`, F-R3-04 #64 `f277c0f`, UX-009 #65 `a6fd1db`, F-R3-05 #66 `fede106`, UX-010 #67 `4de84ff`, F-R3-06 #68 `087bf51`, UX-011 #69 `7bd5b52`, UX-012 #70 `5fe3192`, F-R3-07 #71 `017c442`, DOC-001 #72 `401fc8d`, DOC-002 #73 `64408cc`, F-R3-13 #74 `7390ec7`, F-R3-08 #76 `f5c962c`. QA-024, F-R3-04 and F-R3-05 had a `PR` line, which the `Merge` line replaces.
- **Still `blocked`:** QA-016. PR #42 merged only the audit, and the owner's Vercel settings check and promotion are not recorded.
- **"Done when" boxes ticked, with evidence:**
  - F-015: `Lint, typecheck, test, build` and `End-to-end (375 px)` passed on the PR #18 head `7dfb2ff`. That commit added the 375 px auth screenshots in `docs/screenshots/`.
  - F-016 and F-017: the same two checks passed on the PR #19 head `ad5bf14` and the PR #20 head `1a46257`.
  - F-018: the two checks passed on the PR #17 head `41a770b`, and that workflow includes the `Unused code (knip)` step. The Lighthouse scores are recorded in the F-018 entry.
  - F-024 (all three): the two checks passed on the PR #30 head `cd75018`. `GuestTodoRepository.test.ts` covers daily, weekly across Sunday, daily just after midnight in `Asia/Phnom_Penh`, and unchecking then re-checking keeping the same next to-do. `e2e/repeat.spec.ts` creates a daily to-do at 375 px, checks it and finds tomorrow's copy.
- **Left open on purpose:** F-029's performance box (QA-020 measured 93 on `/` and 89 on `/today`, but not in the F-018 environment the box names). Also the owner and release gates of QA-016 (two boxes), QA-017, QA-018, QA-019, QA-020, QA-021, and UX-002's missing reference assets.
- **Open questions:** Q1, Q2 and Q5 are marked resolved, each with a pointer. Q3, Q4, Q6 and Q7 have no recorded answer and stay open, unchanged.
- **Checks:** Prettier with automatic line endings on both docs, `git diff --check`, and Redocly (unchanged, valid). No code changed, so the code checks were not run.

### 2026-11-25 F-R3-08 - Focus History Filters & Search

- Branched from `origin/v2-rebuild` at `7390ec7` after checking task IDs, Git refs and PRs. Reviewed the R3 Focus specifications and the audit-linked F-R3-13 regression in PR #74. The original audit report was unavailable.
- Added date-local Countdown and Stopwatch filters, defaulting to All, and case-insensitive literal search of the displayed session fields. Search uses the titles and labels already available to History. The full-day total still includes every session for that date. Filters carry across date selection and reset when the active owner changes. Clear filters keeps the date and returns keyboard focus to Search sessions.
- Reused Elemental preset radio styling so mode labels wrap at 200% text, and kept the results status mounted across date loads for screen-reader announcements. Updated the README Focus status and disabled preview deployment for the task branch.
- Final local verification passed lint, typecheck, Knip, Prettier with automatic line endings, the production build, 11 focused Vitest cases, and all 119 Chromium `phone-375` Playwright cases. The production dependency audit found zero vulnerabilities. Redocly validated the existing OpenAPI contract with four warnings. The review PR carries the full CI results.

### 2026-11-25 QA-026 — Frontend line-ending normalization

- **Scope:** Branch `fix/QA-026-frontend-line-endings` from `origin/v2-rebuild` at `f5c962c` (PR #76 merged), isolated worktree `loomora-front-QA-026`. Only `.gitattributes`, `docs/TASKS.md` and `docs/PROGRESS.md` change.
- **Root cause:** Git for Windows sets `core.autocrlf=true` in its system config, and the frontend had no `.gitattributes`. Windows checkouts therefore got CRLF working files, and plain `npm run format:check` (Prettier `endOfLine: lf`) failed locally. Linux CI was not affected. The index already held LF only (666 text files LF, 39 binary, 1 empty).
- **Change:** a root `.gitattributes` with `* text=auto eol=lf`, as in the backend, and `binary` for `png`, `jpg` and `ico`, the binary types in the repository. The existing `legacy/backend/.gitattributes` is unchanged.
- **Renormalization:** `git add --renormalize .` staged nothing beyond `.gitattributes` and `docs/TASKS.md`, so no stored file changes.
- **Fresh-checkout proof (Windows, system `core.autocrlf=true` unchanged):** two throwaway clones were made in the session scratchpad, outside the workspace. Without the new attributes, 509 files checked out CRLF, and Prettier reported issues in 330 files. With them, `git ls-files --eol` showed 666 `w/lf`, 39 `w/-text`, 1 `w/none` and no CRLF. After `npm ci`, plain `npm run format:check` passed. Both clones were removed afterwards.
- **Existing checkouts:** worktrees created before this change keep their CRLF working files until those files are checked out again. There, use `prettier --check . --end-of-line auto`. No existing worktree was touched.
- **Verified on Windows:** `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities), Redocly (valid, 4 existing warnings), full Vitest (75 files, 846 tests), production build and Playwright `phone-375` (119/119, `LOOMORA_E2E_PORT=4174`) all passed.

## 2026-11-25 QA-025 page heading overflow at 320 px and 200% text

- **Base:** `origin/v2-rebuild` at `5fe3192` (PR #70 merged). Branch `fix/QA-025-auth-heading-overflow` in worktree `loomora-front-QA-025`. Answers the UX-012 planner question about `/forgot-password at 200%: 43`.
- **Root cause:** The shared `PageHeading` renders `text-4xl` (2.25rem), which becomes 72 px at 200% text, and it gave long words no way to break. "password" is 331 px wide, but the 320 px column is only 256 px at 200% text, so the word ran 75 px past the `h1` and 43 px past the page. The same defect hit every screen whose heading has a word wider than its column. In the app shell, the overflow was clipped instead of scrolling: at 768 px and 200% text, the side navigation leaves Today, Profile and Insights a 192 px column, and their titles were cut off.
- **Why UX-011 shipped green:** `e2e/auth.spec.ts` measured `document.documentElement.scrollWidth` straight after a live resize and root text-size change. Chromium sometimes reports the previous layout for a few frames, so the check read 0 px. Waiting for fonts and two animation frames was not enough to make it reliable.
- **Fix:** `[overflow-wrap:anywhere]` on `PageHeading`, the same idiom `AuthLink` and Focus already use. A word breaks only when it cannot fit on a line of its own, so headings that fit are unchanged at every width. Font, size, weight, tracking, leading and color tokens are unchanged. `hyphens: auto` was rejected because it would hyphenate headings that fit when moved to the next line, and a fluid or smaller size was rejected because it changes Elemental typography and would stop the heading scaling with text size.
- **Regression:** `e2e/page-heading.spec.ts` checks all 14 `PageHeading` screens (Today, Week, Focus, Insights, Profile, Sign in, Sign up, Forgot, Reset, Verify, Google deletion callback, Privacy, Terms, Not found) at 320, 375, 390, 768, 1024 and 1440 px, at 100% and 200% text. Before measuring, it waits until the `h1` is laid out at the requested width and size, with fonts loaded. It asserts 0 px overflow for both the `h1` and the page, and checks keyboard order, a visible focus ring and on-screen focus on `/forgot-password` at 320 px and 200% text.
- **RED** (fix reverted, 3 runs, identical each time): 13 failing cells. Today, Profile and Insights at 768 px; Insights, Sign up, Forgot, Reset, Verify and the Google deletion callback at 320 px; Forgot and Reset at 375 and 390 px. Plus the keyboard test. `/forgot-password` at 320 px and 200% text: `{"heading": 75, "page": 43}`.
- **GREEN** (3 runs): 2/2 passed.
- **Verification (Windows):** `npm ci`, `npm run lint`, `npm run typecheck`, `npm run knip`, `prettier --check . --end-of-line auto`, `npm audit --omit=dev` (0 vulnerabilities), Redocly (valid, 4 existing warnings), `npm run build` and `git diff --check` all passed. Full Vitest (`--maxWorkers=2`): **845/845** across 75 files. Playwright `phone-375` with the standard config and production build: **119/119**.
- **Planner notes (not changed here):**
  - At 200% text, a word wider than its column now wraps mid-word ("passw / ord" at 320 px, "Toda / y" at 768 px). That meets reflow, but a softer break would need a smaller heading size on narrow columns. That is a typography decision.
  - At 768 px and 200% text, the app-shell side navigation takes about 60% of the width, and the Daily intention field is clipped. That is outside `PageHeading`.
  - Other page-level overflow sweeps (`auth`, `legal`, `landing`, `profile`) use the same measure-right-after-resize pattern, so they can pass falsely in the same way.
- Merged `origin/v2-rebuild` at `f5c962c` (PR #76, F-R3-08 history filters) with a merge commit. There was no rebase and no force-push. `docs/TASKS.md` and `docs/PROGRESS.md` conflicted only because both sides appended entries. Every `v2-rebuild` entry is kept unchanged, and the QA-025 entries follow them.
- Verification after the merge on Windows: lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities), Redocly (valid, 4 existing warnings), full Vitest (75 files, 846 tests), production build and Playwright `phone-375` (121/121) all passed.

### 2026-11-25 F-R3-11 — Stopwatch Lap Accessibility

- **Scope:** Branch `feat/F-R3-11-lap-accessibility` from `origin/v2-rebuild` at `64408cc` (PR #73 merged), isolated worktree `loomora-front-F-R3-11`. F-R3-11 was unused in `docs/TASKS.md`, `docs/PROGRESS.md` and local and remote branches.
- **Changes:**
  - `focusTimerState.ts` exports `maxLaps = 1000`. The lap transition uses it in place of the literal, so the limit and its precision, persistence and recovery behavior are unchanged. A 1001st lap still returns the same snapshot and revision.
  - `FocusPage.tsx`: at the limit, Lap is `aria-disabled` and ignores clicks and keys. It stays focusable, keeping its focus ring, and `aria-describedby` points to a visible note: "Lap limit reached. A session can record up to 1,000 laps." The note is inside the timer card, so the expanded view shows it too. It is removed when the session ends.
  - Announcements: the existing polite `role="status"` region gets one screen-reader-only message for the newest lap recorded on screen, for example "Lap 999 recorded, split 00:00.53." On the 1000th lap, the limit sentence is appended. The baseline resets per session id, so laps restored after a reload are not announced, and rapid laps replace the message instead of queuing several.
  - `en.json`: `focus.lapRecorded` and `focus.lapLimit`. The limit uses i18next number formatting (`1,000`).
- **Tests (RED, then GREEN):** With only the tests applied, the 3 new unit tests failed (`maxLaps` missing, no announcement or limit note). With the implementation, they pass.
  - `focusRuntime.test.ts`: in guest and account scope, laps 999 and 1000 are recorded with exact millisecond values, the 1001st is rejected without a revision change, and Finish saves exactly 1000 laps to the repository.
  - `FocusPage.test.tsx`: a seeded 998-lap stopwatch is restored without an announcement. Using the keyboard, the test records laps 999 and 1000 and checks each announcement. Lap is then `aria-disabled`, described by the note and keeps focus. Enter and a click both leave 1000 laps in the UI and in IndexedDB.
  - `e2e/focus-laps.spec.ts`: the same flow in the browser, plus `:focus-visible` with an outline, axe on `#main`, reload (no announcement, still disabled), Finish (focus returns to Start, the note is removed), and expanded view with fullscreen denied: announcement, description, rejected lap, axe on the dialog, and 0 px page, dialog and note overflow at 320, 375, 390, 768, 1024 and 1440 px at 100% and 200% text. The spec uses `test.slow()`, because seeding and laying out 1000 laps took 35 s, over the 30 s default.
- **Verified on Windows:** `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, 4 existing warnings) passed. Full Vitest (`--maxWorkers=2`): **848/848** across 75 files. A first run alongside Playwright had 3 timeouts in unrelated Profile and Today files, which then passed 79/79 in isolation and in the clean full run. Playwright `phone-375` with the standard config, including its production build: **118/119**.
- **Notes for the planner:**
  1. `vercel.json` was not changed, because it is outside this task's scope. Add a branch-preview opt-out if previews should stay disabled for this branch.
  2. The first full Playwright run showed three existing lap assertions (`e2e/focus-timer.spec.ts` ×2, `e2e/focus-presentation.spec.ts`) matching both `Lap 1` and the new announcement "Lap 1 recorded, …", because Playwright text matching is a substring match. They now use `exact: true`, so they still check the visible lap row. The only remaining failure is the known `e2e/auth.spec.ts` 200% overflow (`/forgot-password at 200%: 43`) from the shared `PageHeading` (see the PR #70 planner question). This branch leaves the auth, `PageHeading` and `StandalonePage` files identical to `v2-rebuild`. The PWA Q21 update test failed once in the first run and passed in the second.
  3. The 1000-row lap list is rendered in full. It works, but a session near the limit is slow to lay out (see the test timing above). Virtualizing or collapsing the list would be a separate task.

#### F-R3-11 follow-up: merge of `origin/v2-rebuild` after F-R3-13 (PR #74) and F-R3-08 (PR #76)

- `v2-rebuild` moved to `f5c962c` while this branch was open, so it was merged with a merge commit. There was no rebase and no force-push. Only the appended `docs/TASKS.md` and `docs/PROGRESS.md` entries conflicted. Both sides were kept, with the F-R3-13 and F-R3-08 entries unchanged and F-R3-11 last. `e2e/focus-timer.spec.ts` and `src/i18n/en.json` merged automatically. The new F-R3-08 stopwatch assertion already uses `getByText('Lap 1', { exact: true })`. No Focus History file was changed by this branch.
- Verification after the merge on Windows: `npm ci`, lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities) and Redocly (valid, with 4 existing warnings) all passed. Full Vitest (`--maxWorkers=2`): **849/849** across 75 files. Playwright `phone-375` with the standard config, including its production build: **121/121**, including `e2e/auth.spec.ts` 200% overflow, which failed before the merge. This supports the intermittency described in the PR #70 planner question.

#### F-R3-11 follow-up: QA accessibility findings (QA-PR77)

- **Laps from another tab:** QA found that a lap recorded in another tab grew this tab's snapshot past its baseline and was announced here. `FocusPage.tsx` now remembers the lap this tab requested (session id and expected count) and announces only when the snapshot reaches it. Restored laps and laps from another tab stay silent.
- **Limit heard twice:** on the 1000th lap the polite status already ends with the limit sentence, and Lap's `aria-describedby` repeated it. Lap now holds back the description while that announcement is current and focus has not left Lap. After a blur, or after a reload, the description returns. The visible note is shown throughout.
- **Tests (RED, then GREEN):** a new `FocusPage.test.tsx` case writes laps through Dexie the way another tab does and failed before the fix ("Lap 1 recorded" was announced). The 1000-lap unit test now expects no description while Lap keeps focus and the description after Tab. It also failed before the fix. `e2e/focus-laps.spec.ts` asserts the same in the normal and expanded views.
- **Verified on Windows:** lint, typecheck, Knip, Prettier with automatic line endings, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilities), Redocly (valid, 4 existing warnings), full Vitest (75 files, 850 tests), production build and Playwright `phone-375` (121/121) all passed.

### 2026-11-25: Task board reconciliation (QA-025, F-R3-11, QA-026)

- **Scope:** documentation only. Branch `docs/board-sync-20261125b` from `origin/v2-rebuild` at `1be0ac8`. Only the three status lines change, each with a `Merge` line in the board's format, plus this entry.
- **Evidence:** `gh pr view` reports each PR `MERGED` with the merge commit below. The PR head and the merge commit are ancestors of `origin/v2-rebuild`, and the merge commit message names the PR and the task branch.
  - QA-025: PR #75, head `487d815`, merged at `ce89c7f`.
  - F-R3-11: PR #77, head `8269042`, merged at `99dfaa1`.
  - QA-026: PR #78, head `c5832a4`, merged at `1be0ac8`.
- **"Done when" boxes:** all three tasks already had every box ticked when they were registered, so no box changes.
- **Checks:** Prettier on both docs, `git diff --check`, and Redocly (unchanged, valid). No code changed.

### 2026-11-25 UX-014: Elemental Edition Final Polish, Shared ActionToast, PWA Icons & Legacy Token Cleanup

- **Branch / Worktree:** `feat/UX-014-elemental-legacy-cleanup` in `loomora-front-UX-014`, branched from `origin/v2-rebuild` (`61373df`, PR #80). Preserved all existing worktrees (including local Claude-team `loomora-front-F-R3-10` and `loomora-front-UX-013`).
- **What changed:**
  - Added reusable Elemental `ActionToast` in `src/components/ui/Toast.tsx` (hairline border, `shadow-soft-md`, iOS safe-area bottom inset, `danger` tone with `AlertIcon`, optional `stacked` offset) and refactored both `src/features/schedule/UndoDeleteToast.tsx` and `src/features/todos/UndoDeleteToast.tsx` to use it — removing duplicated markup and legacy `border-thick border-ink shadow-hard-md`.
  - Updated `src/app/layout/RootLayout.tsx` skip-to-content link from `border-thick border-ink` to Elemental `border-control border-primary` with soft elevation and iOS top safe-area clearance.
  - Updated `src/components/page/ComingSoon.tsx` (`/insights`) from `<Card tone="work">` (DEC-003 violation: category fill on non-category notice) to an Elemental paper `Card` with a `bg-primary-soft text-primary` badge.
  - Replaced legacy neo-brutalist orange `#FF8A3D` / thick `#111111` shadow icons (`public/icon.svg`, `scripts/icon-maskable.svg`) with Elemental forest `#1D5039` + warm ivory `#F7F5EF` icons, updated `scripts/generate-icons.mjs` to use `fileURLToPath` for Windows compatibility, and regenerated `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, and `public/apple-touch-icon.png`.
  - Removed deprecated neo-brutalist tokens (`borderWidth.thin/thick`, `shadowOffset`, `shadow`, `hard-sm/md/lg`, `translate.press-sm/md/lg`) from `src/styles/tokens.ts` and `tailwind.config.ts`.
  - Added unit tests (`src/components/ui/Toast.test.tsx`, `src/components/page/ComingSoon.test.tsx`) and token cleanup assertions (`src/styles/tokens.test.ts`); disabled Vercel branch preview in `vercel.json`.
- **Verified:**
  - `npm run lint`: passed (0 errors).
  - `npm run typecheck`: passed.
  - `npm run knip`: passed.
  - `npm run format:check`: passed (`All matched files use Prettier code style!`).
  - `npm run build`: passed (35 PWA precache entries).
  - `npm audit --omit=dev`: 0 vulnerabilities.
  - `npx vitest run --maxWorkers=2`: **855/855** passed across 77 test files.
  - `npx playwright test --project=phone-375 --workers=2`: **123/123** passed (full suite).
  - **PR #81 CI fix:** `e2e/auth.spec.ts:94` failed on CI because clicking `Forgot your password?` updated the URL before the lazy-loaded `ForgotPasswordPage` chunk mounted, causing `getByLabel('Email').fill(...)` to type into the outgoing `/sign-in` email field. Added `heading` visibility assertions for `Sign in` and `Forgot password` before interacting with the form, re-ran the full 123/123 `phone-375` suite locally, and pushed to PR #81.
- **Backend API Dependencies / Blockers Identified for Next Tasks:**
  1. **Focus History Delete with Undo (`docs/02` R3 Should):** Blocked on backend — `docs/openapi.yaml` currently only exposes `GET /focus-sessions/{focusSession}` (needs `DELETE /focus-sessions/{focusSession}` and `POST /focus-sessions/{focusSession}/restore`).
  2. **Guest Focus Sessions Sync in `POST /import`:** Blocked on backend — `docs/openapi.yaml` `POST /import` currently accepts `todos`, `schedule_items`, `exceptions`, `checkins`, and `daily_intentions` (no `focus_sessions`).
  3. **R4 Insights, Analytics, Notes, Weekly Recap & Plan vs Reality (`docs/02` R4 Must/Should):** Blocked on backend — no `/analytics`, `/insights`, `/notes`, `/recap`, or `/plan-vs-reality` endpoints exist in `docs/openapi.yaml` yet.
  4. **Category Pastel Hexes (`DEC-003`):** Pending owner confirmation against the 4 original Elemental reference assets (`LOOMORA_ELEMENTAL_*` / `LOOMORA_PREMIUM_*`, not in repo).

### 2026-11-25 UX-015: Elemental Edition Visual Polish Pass

- **Branch / Worktree:** `feat/UX-015-elemental-visual-polish` in `loomora-front-UX-015`, branched from `origin/v2-rebuild` (`a1f05d0`, PR #81 merged).
- **What changed:**
  - Applied the 6 provisional WCAG-verified `DEC-003` pastel category fills in `src/styles/tokens.ts` (`study #E3F0FC`, `work #FBF0D9`, `health #E2F5EA`, `life #FDE8EE`, `rest #EEE9FC`, `other #ECE8DF`).
  - Updated `src/app/layout/Sidebar.tsx` (`min-h-dvh self-stretch` with inner `sticky top-0`) so the desktop navigation rail stretches full page height on tall screens.
  - Tightened `TodoRow` vertical density (omitted redundant baseline `Normal` priority pill, kept `High`/`Low` explicit, removed repetitive footer border when 0 subtasks exist) without hiding any control.
  - Wrapped `FocusAlarmSettings` in an accessible `aria-expanded` / `aria-controls` progressive disclosure with a compact live summary (`Chime · 50% · Once`).
  - Refined Week's mobile `DayToggle` (`variant="strip"`, no double borders, improved today-dot clearance) and softened desktop `DayColumn` `Copy` buttons to ghost weight.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), targeted Vitest (`78/78` across 5 files), full `phone-375` Playwright (`123/123`), and 375 px / 1440 px browser screenshots.

### 2026-11-25 UX-016: Landing & Authentication Final Polish

- **Branch / Worktree:** `feat/UX-016-landing-auth-polish` in `loomora-front-UX-016`, branched from `origin/v2-rebuild` (`6853166`, PR #82 merged).
- **What changed:**
  - Added decorative Elemental `BrandMark` (matching `public/icon.svg`) and `GoogleIcon` in `src/components/ui/icons.tsx`.
  - Applied `BrandMark` lockup and refined typography, CTA rhythm (`Try it now` / `No signup needed.` / spaced `Sign in`), and pastel highlight card hierarchy on `LandingPage.tsx`.
  - Added `BrandMark` to `AuthLayout`, `GoogleIcon` to `GoogleButton`, elevated paper card spacing/shadow, softened `AuthLink` underlines (`decoration-primary/40`), and tightened `Forgot your password?` spacing under Password in `SignInForm.tsx`.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), Landing/Auth Vitest (`52/52` across 3 files), full `phone-375` Playwright (`123/123`), and 375 px / 1440 px visual screenshots.

### 2026-11-25 F-R3-14: Focus History Delete + Undo

- **Branch / Worktree:** `feat/F-R3-14-focus-history-delete` in `loomora-front-F-R3-14`, branched from `origin/v2-rebuild` (`daec9af`, PR #83 merged). Preserved `loomora-front-F-R3-10` untouched.
- **What changed:**
  - Synced merged backend B-046 `docs/openapi.yaml` (`DELETE /focus-sessions/{focusSession}`, `POST /focus-sessions/{focusSession}/restore`) and added `delete`/`restore` across `focusSessionsApi`, `FocusSessionRepository`, `ServerFocusSessionRepository`, and `GuestFocusSessionRepository` (soft-delete, 7-day 410 expiry, 404 on deleted reads, repeat-delete deadline preservation, session-generation checks).
  - Built `useFocusHistoryDelete` and updated `FocusHistory` with an accessible per-row Delete button, Elemental confirmation `Sheet`, and shared `ActionToast` Undo (`actionDisabled` double-submit protection), plus `Sheet.tsx` `duration: 0` when `prefers-reduced-motion: reduce` is active.
  - Added repository, UI, and 375 px E2E tests covering guest (including offline) and account delete, Undo, 410 expired restore, error rollback/retention, double-submission prevention, filter preservation, and session-switch isolation.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), Focus/Sheet/Toast Vitest (`68/68` across 5 files), and full `phone-375` Playwright (`125/125`).

### 2026-11-26 F-R3-15: Guest Focus History Import Integration

- **Branch / Worktree:** `feat/F-R3-15-guest-focus-import` in `loomora-front-F-R3-15`, branched from `origin/v2-rebuild` (`2087660`, PR #84 merged). Preserved `loomora-front-F-R3-10` and `loomora-front-UX-013` untouched.
- **What changed:**
  - Synced `docs/openapi.yaml` from merged backend `v2-rebuild` (`fa2b93d8`, including B-049 `POST /import` `focus_sessions` + `409` and B-047 `GET /stats/summary`).
  - Added `listAll({ includeDeleted })` and snapshot-safe `clearImported(snapshot)` to `GuestFocusSessionRepository` and wired `focusSessions` into `GuestStorage`, `AppProviders`, `readGuestPlan`, and `isEmptyPlan`.
  - Updated `saveGuestPlan` (`toImportBody` / `bucketFocusSessions` / `chunkImportBody`) to include active non-deleted guest Focus sessions via `canonicalFocusPayload`, clear stale links to deleted guest items without dropping the session, schedule sessions in or after the chunk carrying their linked to-do/schedule item under the 500-session-per-call cap, and retain all local records until every batch succeeds.
  - Extended `src/test/importBackend.ts` with B-049 `focus_sessions` validation, duplicate/foreign/mismatch `409` rollback, and idempotent/account-deleted replay, and added `src/lib/storage/focusImport.test.ts` (13 tests), `savePlan.test.tsx` Focus-only retry test, and `e2e/focus-import.spec.ts` (375 px).
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 baseline warnings), Vitest (77 files, 872 tests), and `e2e/focus-import.spec.ts` + full `phone-375` Playwright.

### 2026-11-26 F-R4-02: Notes (Standalone & Schedule-Attached)

- **Branch / Worktree:** `feat/F-R4-02-notes` in `loomora-front-F-R4-02`, branched from `origin/v2-rebuild` (`2087660`, PR #84 merged) and reconciled with merged `origin/v2-rebuild` (`9fb692b`, PR #85 `F-R3-15`). Preserved `loomora-front-F-R3-10` and `loomora-front-UX-013` untouched.
- **What changed:**
  - Synced `docs/openapi.yaml` from merged backend `v2-rebuild` (including B-047, B-048, and B-049).
  - Added `notesApi`, Dexie v11 `notes` store, `GuestNoteRepository`, `ServerNoteRepository`, `NoteRepositoryContext`, and `saveGuestPlan` note migration reconciled alongside F-R3-15 `focusSessions` (500-note & 500-session chunks, dependency ordering after/alongside schedule items and linked to-dos, stale deleted link clearing, soft-deleted exclusion, snapshot-safe cleanup, and idempotent retry).
  - Built Elemental `/notes` (`NotesPage`, `NoteSheet`, `useNotes`, `NotesIcon`, `TopBar` shortcut) supporting standalone notes, schedule-block + optional occurrence-date attachments, deleted parent block fallback badges, search & filter, confirmation Sheet + shared `ActionToast` Undo (with 410 expired restore messaging), and loading/empty/error/retry/offline states.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint, Vitest (incl. combined Focus + Notes migration test and 525-note pagination test), and Playwright `phone-375`.

### 2026-11-26 F-R4-01: Insights, Analytics, Weekly Recap & Plan vs Reality

- **Branch / Worktree:** `feat/F-R4-01-insights-analytics` in `loomora-front-F-R4-01`, branched from `origin/v2-rebuild` (`2087660`, PR #84 merged) and reconciled with merged `origin/v2-rebuild` (`a76d95d`, PR #85 `F-R3-15` + PR #87 `F-R4-02`). Preserved `loomora-front-F-R3-10` and `loomora-front-UX-013` untouched.
- **What changed:**
  - Synced `docs/openapi.yaml` and copied the shared backend `stats-summary-cases.json` fixture into `src/features/insights/fixtures/stats-summary-cases.json`.
  - Implemented `accountDataApi.getStatsSummary`, `GuestFocusSessionRepository.listForRange` (alongside F-R3-15 `listAll`/`clearImported`), `computeGuestStatsSummary` (matching B-047 `StatsSummaryService` identically on the shared fixture), and session-scoped `useStatsSummary` (offline-capable for guests via Dexie, online API for accounts).
  - Replaced the `ComingSoon` placeholder in `InsightsPage` with the Elemental Edition Insights dashboard: range selector (`Week` with Previous/Next week navigation honoring `week_starts_on`, `7 days`, `30 days`, `90 days` within the 92-day cap), Overview + Current/Longest Streak (`GET /streak`), Weekly Recap (partial & empty weeks), Plan vs Reality (to-dos done/due, schedule blocks checked/planned, linked vs unplanned focus, countdown vs stopwatch), Daily Breakdown, and loading/empty/error/retry/offline states. Removed dead `ComingSoon`.
  - **Historical streak note / blocker:** `GET /streak` returns only `current_streak`, `longest_streak`, and `today_counted`; no historical streak-by-date endpoint is assumed until Codex merges B-051. Insights displays current and longest streak honestly without fabricating a historical streak timeline.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build`, `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint, Vitest (`computeStatsSummary`, `InsightsPage`, `notes`, `NotesPage`, `focusImport`, `routes`), and Playwright `phone-375` (`e2e/insights.spec.ts`, `e2e/notes.spec.ts`, `e2e/focus-import.spec.ts`, `e2e/focus-recovery.spec.ts`).

### 2026-11-26 F-R4-03: Historical Streak Timeline Integration

- **Branch / Worktree:** F-R4-03, feat/F-R4-03-historical-streak in loomora-front-F-R4-03, based on the frontend PR #86 merge at 16adadc.
- **Contract:** Synced docs/openapi.yaml byte-for-byte from merged backend B-051 PR #56 at fdb595ab. Accounts use the opening and daily history from GET /stats/summary, and guests reconstruct it from local records.
- **Insights:** Added the Elemental streak history card with the opening count, elapsed local dates, and translated lower-bound labels. Current and longest streaks still use the existing streak query. Existing Insights range controls, Weekly Recap, Plan vs Reality, and page states are preserved.
- **Regression coverage:** Shared and mirrored backend cases cover local-midnight bucketing, check-ins, unplanned days, breaks, deleted completions, current day, calendar start and the inclusive 400-day lookback. Insights tests cover server values, retries and the offline guest display.
- **Local verification:** Lint, typecheck, Knip, format check, build, OpenAPI lint (four existing warnings), and diff whitespace check passed. Full Vitest and phone-375 Playwright were run, with reruns initiated after the initial runs encountered timeouts and a concurrent build replaced assets served by Playwright.

### 2026-11-26 UX-017: Post-Merge Visual Polish for Insights, Notes & Offline Banners

- **Branch / Worktree:** `feat/UX-017-insights-notes-ui-polish` in `loomora-front-UX-017`, branched from `origin/v2-rebuild` (`16adadc`, PR #86 `F-R4-01` & PR #87 `F-R4-02` merged) and reconciled with merged `origin/v2-rebuild` (`5c15812`, PR #88 `F-R4-03` Historical Streak Timeline preserved untouched). Preserved `loomora-front-F-R4-03`, `loomora-front-UX-013`, and `loomora-front-F-R3-10` untouched.
- **Owner decision recorded (P2-4 Desktop Notes Navigation):** Resolved by owner decision — keep Notes in the top-right `TopBar` toolbar on desktop; do not add Notes to desktop `Sidebar` or modify the 4 mobile `BottomNav` tabs.
- **What changed:**
  - `src/features/notes/NotesPage.tsx`: Show a single deep forest green `New note` primary CTA in empty state and hide creation when account notes cannot load or save while preserving guest offline creation (P1-1); align `Notes` heading and `New note` button on one mobile header row (P2-1); localize attachment occurrence dates via `Intl.DateTimeFormat` and use `rounded-md` wrapping for narrow screens (P1-4); pair `Edit` (`PencilIcon`) and `Delete` (`TrashIcon`) as matching 44×44 bordered icon buttons (P2-2).
  - `src/features/insights/InsightsPage.tsx` & `src/i18n/en.json`: Switch KPI overview grid to balanced 2×2 (`grid-cols-2`, `text-xl sm:text-2xl`) so mobile brings `Weekly recap` above the fold and desktop avoids awkward duration wrapping (P1-2); add i18next `_one`/`_other` pluralization for Daily Breakdown `todos`, `blocks`, and `showingActiveOnly` (P1-3); remove unused `notes.editAction` and `notes.deleteAction` keys.
  - `src/app/layout/ServiceDownBanner.tsx`: Suppress `ServiceDownBanner` and pause `/health` polling while offline (`!online`), re-checking `/health` on reconnect so `OfflineBanner` + page offline card are not duplicated (P2-3).
  - Added Vitest (`NotesPage.test.tsx`, `InsightsPage.test.tsx`, `ServiceDownBanner.test.tsx`) and Playwright (`e2e/notes.spec.ts`) regressions covering single empty-state CTA, offline account/guest behavior, localized dates, i18next pluralization, and online-500 → offline → reconnect transitions.
- **Verified:** `lint`, `typecheck`, `knip`, `format:check`, `build` (PWA precache 38 entries), `npm audit --omit=dev` (0 vulnerabilities), Redocly OpenAPI lint (valid, 4 baseline warnings), Vitest (5 files including `computeStatsSummary` and `InsightsPage` with F-R4-03), Playwright `phone-375` (`insights`, `notes`, `a11y`, `page-heading`), and before/after visual verification at 320 px, 375 px, and 1440 px (0 px overflow, 0 axe violations, 0 small touch targets).
