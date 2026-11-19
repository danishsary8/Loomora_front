# AGENTS.md: Rules for Codex, Antigravity (Gemini) and any other coding agent on Loomora (frontend)

Loomora is a mobile-first to-do list + fixed weekly schedule PWA ("Plan your day, focus on it, and see how it really went."). Read `CLAUDE.md` too: all its rules apply to you. This file adds what is specific to non-Claude agents.

## Start of every session
1. `git checkout v2-rebuild && git pull`.
2. Read `docs/TASKS.md` and `docs/PROGRESS.md`. Also read `docs/08-data-model.md`, `docs/09-api-design.md`, `docs/10-tech-and-structure.md` before touching data, API or structure.
3. Take the first `todo` task whose `Owner:` is your tool name (`codex` or `antigravity`). Never take a task owned by another tool. Set it to `doing`.
4. If a task needs a changed API and `docs/openapi.yaml` is not updated yet, set it `blocked`, write the question in `docs/PROGRESS.md`, and take your next task.

## Working rules
- One task = one branch `feat/<task-id>-short-name` = one PR into `v2-rebuild`. Never push to `v2-rebuild` directly. Never force-push. Never delete data or branches.
- Before coding: a 3 to 6 bullet plan. After coding: run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (and the e2e command if the task says so) and fix every failure. Say what you ran in the PR.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Implement exactly the task steps. Never invent features outside `docs/02-feature-list.md`.
- Clean code: no unused imports, variables, files or dependencies, no commented-out code, no debug logs, no leftover TODOs. Small functions with one job. No duplicated logic.
- Never commit secrets, `.env` files or tokens. If a task needs a secret, billing or a destructive action, set it `blocked` with a clear question and move on.
- At the end: set the task to `review`, append a note to `docs/PROGRESS.md` (what changed, how it was verified, problems, questions), commit and push on the same branch, and open the PR.

## UI rules (you cannot use the `ui-ux-pro-max` skill, so follow these)
- Neo-brutalism on cream `#F5EDE6`: thick black borders, hard offset shadows, press-down states, flat category colors. One theme only.
- Reuse the components in `src/components/ui/` and the tokens in the Tailwind config. Do not invent new colors, shadows or fonts. If a component is missing, build it in the same style next to the others.
- Design for 375 px wide first, then tablet and desktop. Every screen needs loading, empty and error states.
- All user-facing text goes through `t()` with keys in `src/i18n/locales/en.json`. No hard-coded strings.
- Guest (Dexie) and account (API) modes must behave the same and be covered by the same tests.
