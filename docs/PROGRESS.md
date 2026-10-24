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
