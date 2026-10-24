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
- **Status:** review
- **Steps:**
  1. Create the app in the repo root (do not touch `legacy/` or `docs/`). TypeScript strict.
  2. Add Tailwind, React Router, TanStack Query, Zustand, i18next, date-fns, Framer Motion.
  3. Add ESLint, Prettier, Vitest + Testing Library. One passing smoke test.
  4. Add `.env.example` with `VITE_API_URL=`.
- **Done when:**
  - [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass
- **Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`

### F-002: GitHub Actions CI
- **Status:** review
- **Steps:**
  1. Add `.github/workflows/ci.yml`: Node 22, npm ci (cached), lint, typecheck, test, build.
  2. Run on pull requests and pushes to `main` and `v2-rebuild`.
- **Done when:**
  - [x] The workflow runs green on the PR
- **Files:** `.github/workflows/ci.yml`

### F-003: Design tokens and neo-brutalism base components
- **Status:** doing
- **Steps:**
  1. Use the `ui-ux-pro-max` skill. Before coding, write a short style proposal in `docs/DECISIONS.md` comparing neo-brutalism with a neo-skeuomorphic / retro-digital variant; implement neo-brutalism on cream #F5EDE6 unless it clearly fails (note from docs/07, S18).
  2. Define tokens in Tailwind: colors (cream, black, 6 category colors, success, danger), border width, hard offset shadows, radii, spacing scale, a script heading font and a clean body font, press-down states.
  3. Build Button, Card, Chip, Checkbox, Input, Sheet (bottom sheet), ProgressRing in `src/components/ui/`.
  4. Add a `/styleguide` route showing every component and state at 375 px.
  5. Check contrast (4.5:1 for text), 44 px touch targets, `prefers-reduced-motion`.
- **Done when:**
  - [ ] `/styleguide` renders all components with no console errors
  - [ ] Component unit tests pass; lint, typecheck, build pass
  - [ ] A screenshot of `/styleguide` at 375 px is saved to `docs/screenshots/`
- **Files:** `tailwind.config.ts`, `src/components/ui/*`, `src/styles/*`, `src/features/styleguide/*`

### F-004: App shell, routing, i18n
- **Status:** todo
- **Steps:**
  1. Router with routes from docs/05-screen-map.md: Landing, Today, Week, Focus (coming soon), Insights (coming soon), Profile, Sign in/up, legal, 404.
  2. Bottom nav on phones (Today, Week, Focus, Insights) and sidebar on wide screens.
  3. i18n set up with `src/i18n/en.json`; no hard-coded UI text.
  4. Loading, empty, error states as shared components.
- **Done when:**
  - [ ] Every route renders at 375 px and 1280 px
  - [ ] Tests, lint, typecheck, build pass
- **Files:** `src/app/*`, `src/i18n/en.json`

### F-005: Storage adapter and guest to-dos
- **Status:** todo
- **Steps:**
  1. Define a `TodoRepository` interface (list for date, create, update, setDone, delete) and the types from docs/08.
  2. Implement `GuestTodoRepository` with Dexie (IndexedDB), UUIDs generated on the client. Implement the Today list rules (due today, undated, overdue) in a pure function with unit tests.
  3. Leave a `ServerTodoRepository` stub for later.
- **Done when:**
  - [ ] Unit tests cover every Today-list rule and pass
- **Files:** `src/lib/storage/*`, `src/features/todos/*`

### F-006: Today screen v1 (guest, to-dos only)
- **Status:** todo
- **Steps:**
  1. Build Today per docs/04-user-flows.md: header with date, to-do list (Overdue first), floating + opening a bottom sheet to add a to-do, check-off with a stamp animation, progress ring, empty state with two equal buttons ("Add a to-do", "Add to my schedule" disabled for now).
  2. Use the guest repository. Persist across reloads.
  3. Playwright test: add a to-do, check it off, reload, it is still there.
- **Done when:**
  - [ ] Playwright test passes at 375 px
  - [ ] Lint, typecheck, unit tests, build pass; screenshot saved to `docs/screenshots/`
- **Files:** `src/features/today/*`, `e2e/today.spec.ts`

## Done

_None yet._
