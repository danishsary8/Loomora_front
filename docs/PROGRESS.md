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
