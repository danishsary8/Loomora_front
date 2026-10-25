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

### 2026-10-25: F-007 Schedule types, rules and guest repository
- **Changed:** `ScheduleItem`, `ScheduleException`, `ScheduleCheckin`, `Occurrence`, `NowNext` types (snake_case, as docs/08). Pure `occurrencesForDate` (rule 4: starts_on/ends_on, weekday, skip, override, check-in) and `nowAndNext` (rule 6; an item is over at its end time). `ScheduleRepository` interface, `GuestScheduleRepository` on Dexie (DB version 2, client UUIDs, one exception and one check-in per item and date via unique indexes, rule 11 validation incl. 100-item cap, "all repeats" edit, delete with exceptions and check-ins, "only today" override/skip/restore, idempotent check-in), `ServerScheduleRepository` stub. Date helpers `weekdayOf` (0 = Monday), `isTime`, `toLocalTime`.
- **Verified:** `npm test` 18 files / 173 tests passed (run twice): 20 rule tests plus 29 repository tests on fake-indexeddb, incl. month/year-end weeks and data surviving a DB reopen. lint, format:check, typecheck, build exit 0 (unused-code check = lint, clean). The tests caught a missing `date` index and a sync throw in `listForWeek`; both fixed.
- **Problems:** None open.
- **Questions:** (Q8) `copy-day` (docs/09) is not in F-007; I left it for F-009 where the "Copy day to..." sheet needs it. (Q9) If several items overlap at the same time, Now shows the earliest-starting one; docs/08 rule 6 does not say. OK? (Q10) `starts_on` defaults to today when an item is created, so a Mon-Fri item added on Wednesday does not show on earlier days (rule 4 as written). OK?
