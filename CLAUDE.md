# CLAUDE.md: Rules for Loomora

## Source of truth
- `docs/` is the source of truth.
- If code and docs disagree, stop and write the question in `docs/PROGRESS.md`.
- Never invent features outside `docs/02-feature-list.md`.

## Every session
1. Read `docs/TASKS.md` and `docs/PROGRESS.md` first.
2. Take the first task with status `todo`.
3. At the end, append a note to `docs/PROGRESS.md`.

## How to work on a task
- One task = one branch = one PR.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Before coding: write a 3 to 6 bullet plan.
- After coding: note how it was verified (tests run, output).
- If a task needs a secret, billing, or a destructive action, mark it `blocked` with a clear question and move to the next task.

## UI rules
- Mobile-first: design for 375 px wide first (checking 320–1440 px and iOS safe areas), then tablet and desktop.
- Elemental Edition on warm ivory `#F7F5EF` (`docs/DECISIONS.md` DEC-003): paper `#FCFBF8`, forest ink `#132A23`, deep forest primary `#1D5039`, subtle card hairlines `#E1E8E1`, accessible control borders `#7B8C82` (`>= 3:1`), restrained `#E99A63` accent (dark ink foreground only), pastel category colors, self-hosted Inter typography. One theme only.
- Use the `ui-ux-pro-max` skill for any UI work.
- All user-facing text goes through the translation system (English now, Khmer later). No hardcoded UI strings.

## Safety
- Never commit secrets. Keep `.env.example` up to date with empty values.
- Never force-push.
- Never delete data.

## Clean code (always)
- Remove unused code in every task: imports, variables, functions, files, dead branches, commented-out code, unused dependencies.
- Small functions with clear names, one responsibility each. No duplicated logic: extract it.
- No debug logs, no leftover TODOs. Prefer deleting code to keeping it "just in case".
- Run the linter and the unused-code check (`npm run lint` / Pint) before every PR, and say in the PR that you did.
