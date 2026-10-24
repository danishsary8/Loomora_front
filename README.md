# Loomora

> Plan your day, focus on it, and see how it really went.

**Status:** Planning phase

Loomora is a mobile-first to-do list plus fixed weekly schedule web app (PWA). This repo is the frontend (React + Vite + TypeScript + Tailwind). The old code lives in [`legacy/`](legacy/) for reference.

## Docs

- [Product brief](docs/01-product-brief.md)
- [Feature list](docs/02-feature-list.md)
- [User stories (R1)](docs/03-user-stories-r1.md)
- [User flows](docs/04-user-flows.md)
- [Screen map](docs/05-screen-map.md)
- [Roadmap and automation](docs/06-roadmap-and-automation.md)
- [Project decisions](docs/07-project-decisions.md)
- [Tasks](docs/TASKS.md)
- [Progress](docs/PROGRESS.md)
- [Decisions log](docs/DECISIONS.md)
- [Security findings](docs/SECURITY-FINDINGS.md)

## How to run tests

```bash
npm ci                      # install once
npm run lint                # ESLint (also finds unused code)
npm run typecheck           # TypeScript
npm test                    # unit and component tests (Vitest)
npx playwright install chromium   # once, downloads the test browser
npm run e2e                 # end-to-end tests (Playwright) at 375 px and 1280 px
npm run e2e -- --project=phone-375   # only the phone size, as CI does
npm run e2e -- e2e/week.spec.ts      # one spec
```

`npm run e2e` builds the app and serves it with `vite preview`, so it needs no running dev server. CI runs the same phone-size e2e job on every pull request; if it fails, the traces are attached to the run.

Rules for contributors and Claude Code: [CLAUDE.md](CLAUDE.md)
