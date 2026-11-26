# QA-009 Staging QA Matrix & Release Readiness Runbook

> **Status: QA-009 IS BLOCKED / NOT EXECUTED.**
>
> This document prepares the reproducible R1–R4 staging QA matrix, release evidence checklist, and owner sign-off gates for **QA-009** so the owner can execute paired staging verification safely once all blockers are cleared.
>
> - **No staging tests were executed** against live or staging services during this preparation.
> - **No staging infrastructure, secrets, deployment settings, or application code were modified.**
> - **The release is NOT declared ready.** Do not mark any staging case `PASS` until real paired evidence is captured on an owner-approved disposable staging pair.

This runbook extends [QA-022 paired staging evidence and runbook](QA-022-staging-evidence.md) (which covered the R1/R2 baseline at `00a6d01`) to the complete merged R1–R4 frontend baseline on `v2-rebuild`.

---

## 1. Readiness Separation: Verified vs Pending vs Blocked

### A. Automated Checks Already Verified (Local & GitHub CI — Not Staging Proof)

| Area | Baseline Commit / PR | Automated Coverage Verified |
|---|---|---|
| **Frontend `v2-rebuild` HEAD** | `2f5d56b` (PR #91 `QA-028` merged) | `eslint`, `tsc -b`, `knip`, `prettier --check`, production Vite/PWA build, `npm audit --omit=dev` (0 prod advisories), Redocly OpenAPI lint (valid, 4 baseline warnings) |
| **R1/R2 Today, Week, Auth, Legal, PWA** | `QA-013`–`QA-025`, `UX-002`–`UX-016` | Full Vitest suite (81 files), 128 Playwright `phone-375` E2E tests, cross-browser `QA-021`, `QA-019` prompt-based SW update (`Q21`), `QA-015` CSP/headers simulator |
| **R3 Focus & History Migration** | `F-R3-01`–`F-R3-15` (PR #84, #85) | Countdown/stopwatch/laps/alarm/recovery, soft-delete + 7-day Undo, 499/500/501 Focus import chunks + 409 rollback |
| **R4 Insights, Historical Streaks & Notes** | `F-R4-01` (#86), `F-R4-02` (#87), `F-R4-03` (#88), `UX-017` (#89) | Shared backend `stats-summary-cases.json` parity, 400-day historical streak reconstruction, Notes CRUD + 7-day restore + >500-note pagination, Elemental Edition 320–1440 px & 200% text |
| **Data Integrity & Import Containment** | `QA-027` (#90), `QA-028` (#91) | Fail-closed import acknowledgment validation & skipped-Note verification; atomic single-transaction Dexie CRUD + two-instance concurrency tests |

*Automated checks run against mocked APIs (MSW / Playwright route stubs) and local preview builds. They do **not** satisfy hosted staging verification (`QA-009`).*

### B. Manual & Paired Staging Checks Not Yet Run

All 9 staging matrix scenarios (`STG-01` through `STG-09`) in [Section 3](#3-reproducible-staging-qa-matrix) are **`NOT RUN`** and require execution on an owner-approved disposable staging pair before `QA-009` can close.

### C. Owner Approvals & Decisions Still Required

| Gate | Requirement | Current State |
|---|---|---|
| **Disposable Staging Pair (`QA-022`)** | Written owner approval of isolated frontend/API HTTPS hosts, run ID, `X-Loomora-QA-Approval` / `X-Loomora-Revision` headers, and synthetic mailbox domain (`<runId>-a`, `<runId>-b`, `<runId>-unused`, optional `<runId>-google`) | **OPEN / REQUIRED** |
| **`QA-016` (Vercel Settings & Promotion)** | Owner confirmation of Vercel `Production Branch` (`v2-rebuild`), `Root Directory`, `Build & Output`, `Auto-assign Custom Production Domains`, `VITE_API_URL` scoping, `Deployment Protection` / `Vercel Toolbar`, and promotion approval | **BLOCKED** |
| **`QA-004` (Privacy & Terms Publication)** | Owner confirmation of operator legal identity, privacy/support contact email/address, governing jurisdiction, policy effective date, Neon/Render/Vercel/Brevo retention & backup durations, Vercel Analytics status, and final legal sign-off | **BLOCKED** |
| **`Q23` (Google-Only Account Deletion)** | Owner decision on launch scope for Google-only account deletion (`has_password: false`) and separate explicit staging authorization before enabling `POST /me/deletion/google/*` (defaults to `503`) | **OPEN** |
| **`Q25` (Backend Infrastructure Checklist)** | Owner confirmation of Render `loomora-api` branch/SHA, `APP_DEBUG=false`, `APP_KEY`, Neon PostgreSQL TLS & region, migrations, Brevo sender/transport, and `FEEDBACK_TO_EMAIL` | **OPEN** |

### D. Blocked Tests Awaiting Backend / Frontend Fixes

| Blocker | Owner / Scope | Affected Matrix Cases |
|---|---|---|
| **`QA-029` (Streak Consistency)** | Codex (in progress on frontend; do not alter streak code here) | `STG-06` (Insights & Historical Streaks), `STG-07` (Midnight/Time-Zone Rollover) |
| **Revision-Aware Notes Reconciliation** | Backend-first contract required (recorded in `QA-027`; aggregate skip counts cannot identify a conflicting Note row or version; do not invent an API contract) | `STG-03` (Divergent Note conflict retry reconciliation beyond fail-closed local retention) |

---

## 2. Pre-Execution Safety Rules (Inherited from `QA-022`)

1. **Never target production** (`https://loomora-craft.vercel.app` or `https://loomora-api.onrender.com`) for write tests. Use only the owner-approved disposable staging pair stored in an out-of-repo `.local` approval file (`QA022_APPROVAL_FILE`).
2. **Never log or commit secrets:** Keep bearer tokens, passwords, OAuth authorization codes, PKCE verifiers, state parameters, and ID tokens out of files, screenshots, console logs, shell history, and PR comments.
3. **Stop on first anomaly:** On revision header mismatch, unexpected redirect/SSO interstitial, rate-limit surprise, or environment uncertainty, stop immediately, record the last confirmed step, and request owner fixture disposal.
4. **Fresh synthetic identities per run:** Use unused `<runId>-a@<mailboxDomain>`, `<runId>-b@<mailboxDomain>`, and `<runId>-unused@<mailboxDomain>` addresses on every attempt.

---

## 3. Reproducible Staging QA Matrix

> Every case below starts as **`NOT RUN — BLOCKED`**. Record actual UTC timestamp, deployed SHAs, and redacted evidence links during execution.

### `STG-01` — Guest & Account Today / Week Flows & Cross-Account Isolation
- **Status:** `NOT RUN — BLOCKED`
- **Prerequisites:** Approved disposable staging pair; two fresh synthetic accounts (`<runId>-a`, `<runId>-b`); clean mobile 375 px browser profile.
- **Synthetic test data:**
  - Guest & Account A to-dos: 1 normal due today, 1 high-priority with 2 subtasks + daily repeat + in-app reminder, 1 undated, 1 overdue (prior date).
  - Schedule item: `Deep Study` (`09:00`–`10:30`, Mon–Fri, category `study`); one-day override on current day; Copy Day from Monday to Saturday.
- **Execution steps:**
  1. As Guest, create/edit/complete/undo-delete to-dos, subtasks, repeat, daily intention, and weekly schedule blocks on `/today` and `/week`; reload and confirm IndexedDB persistence.
  2. Sign in as `<runId>-a`, repeat Today/Week CRUD, schedule check-in, one-day exception (`Only today` vs `All repeats`), and Copy Day; verify `Now` + `Next` strip and 7-day Week envelope.
  3. Sign in as `<runId>-b` in a second profile; attempt to list or `PATCH`/`DELETE` Account A's to-do and schedule IDs via API/network check.
- **Expected result:** Guest and Account A behave identically; reload preserves all changes; Account B receives empty lists for Account A's items and `403` on forbidden edits while Account A's snapshots stay unchanged.
- **Evidence to capture:** Redacted HTTP status log (`200`/`201`/`204`/`403`), mobile 375 px screenshots of populated `/today` and `/week` (guest + account).
- **Pass/Fail criteria:** PASS iff all CRUD, repeat, exception, Copy Day, and `403` isolation checks succeed with zero console/CSP errors; FAIL on any cross-account leak, lost write, or UI mismatch.

### `STG-02` — Authentication, Brevo Email Lifecycle & Google Sign-In / Deletion
- **Status:** `NOT RUN — BLOCKED` (requires Brevo staging transport + `Q23` owner decision for Google deletion)
- **Prerequisites:** Approved staging pair, controlled synthetic mailbox (`<runId>-a`, `<runId>-unused`), staging Google OAuth client redirect URI registered.
- **Synthetic test data:** `<runId>-a@<mailboxDomain>` (operator-managed synthetic password), `<runId>-unused@<mailboxDomain>`, optional `<runId>-google@<mailboxDomain>`.
- **Execution steps:**
  1. Register `<runId>-a` (`POST /auth/register` → `201`), confirm initial unverified state, verify Brevo delivery to controlled inbox, open canonical verification link, confirm verified state; test tampered/expired verification link (`422`).
  2. Sign in (`200`) in two tabs, request password reset (`POST /auth/password/forgot`) for both `<runId>-a` and `<runId>-unused` (verify identical `200` acknowledgement), complete reset via delivered link, verify old sessions fail with `401` and new password signs in.
  3. Sign out (`POST /auth/logout` → `204`), confirm browser session cleared and revoked bearer returns `401`.
  4. Exercise Google sign-in consent, denial, and callback; verify `/auth/google/deletion/callback` headers (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`), query stripping, and default-off `503` behavior (or manual deletion only under separate explicit `Q23` authorization).
- **Expected result:** Full credential lifecycle works end-to-end; no user enumeration on forgot-password; revoked tokens rejected (`401`); Google callback leaks no query/referrer and respects disabled gate (`503`).
- **Evidence to capture:** Redacted HTTP statuses, inbox delivery timestamps (no reset/verify tokens or passwords), response headers on `/auth/google/deletion/callback`.
- **Pass/Fail criteria:** PASS iff all auth statuses, Brevo deliveries, session revocations, and header checks match `docs/09-api-design.md` and `QA-022`; FAIL on any leaked secret, `500`, or stale token reuse.

### `STG-03` — Guest-to-Account Import, Partial Failure, Retry & `QA-027` Containment
- **Status:** `NOT RUN — BLOCKED` (divergent Note revision reconciliation additionally **BLOCKED ON BACKEND**)
- **Prerequisites:** Approved staging pair; clean Guest profile; fresh `<runId>-a` account.
- **Synthetic test data:** Guest plan containing to-dos, schedule items, exceptions, check-ins, daily intention, and **501 active Notes** (2 chunks: 500 + 1) + 1 soft-deleted Note + 1 Note attached to a deleted schedule block.
- **Execution steps:**
  1. Trigger guest-to-account migration on sign-up/sign-in; interrupt batch 2 at the transport boundary (offline/abort after batch 1 commits `200`).
  2. Confirm all 501 active + 1 soft-deleted local guest records remain intact in IndexedDB.
  3. Reconnect and retry import with unchanged local Notes: verify batch 1 skipped Notes are verified against paginated `GET /notes`, batch 2 commits, deleted Note is excluded, orphaned block link is cleared, and local guest store clears cleanly.
  4. Repeat partial-failure scenario where a Note from committed batch 1 is edited locally before retry: verify `QA-027` fail-closed containment detects the divergent copy, retains the complete local guest plan, and shows an actionable conflict notice without overwriting account data.
- **Expected result:** Zero silent data loss on partial failure; identical retry completes and cleans local DB; divergent Note retry stops fail-closed and preserves local data.
- **Evidence to capture:** Redacted `POST /import` batch counts (`created`/`skipped`), IndexedDB counts before/after failure and retry, conflict UI screenshot.
- **Pass/Fail criteria:** PASS iff all 501 active Notes + planner rows migrate without duplication on clean retry AND divergent retry retains 100% of local data; FAIL on any silent truncation or premature local wipe.

### `STG-04` — Notes CRUD, Schedule Attachments, Soft-Delete, 7-Day Restore & `QA-028` Concurrency
- **Status:** `NOT RUN — BLOCKED`
- **Prerequisites:** Approved staging pair; Guest profile and `<runId>-a` account with at least 1 schedule block.
- **Synthetic test data:** Standalone note, schedule-attached note with occurrence date (`2026-11-26`), note attached to a soon-to-be-deleted schedule block, and a >50-note paginated account dataset (verifying multi-page `GET /notes`).
- **Execution steps:**
  1. Create, edit, filter (`All`/`Standalone`/`Attached`), and search notes in both Guest and Account modes.
  2. Delete the parent schedule block and confirm attached note remains readable with `"Schedule block removed · Nov 26"` localized badge.
  3. Soft-delete a note, confirm confirmation Sheet + `ActionToast` Undo, restore within 7 days, and verify expired restore (`410`) displays the localized expiry toast.
  4. Open two Guest tabs on the same note; trigger concurrent edit in Tab A and delete in Tab B; reload both tabs.
- **Expected result:** Guest and Account Notes parity holds; localized dates render cleanly; deleted note never resurrects under concurrent edit/delete (`QA-028`).
- **Evidence to capture:** 375 px and 1440 px screenshots of `/notes` (empty single-CTA state, populated standalone/attached/detached cards, Undo toast), two-tab concurrency result log.
- **Pass/Fail criteria:** PASS iff CRUD, pagination, deleted-parent resilience, 7-day restore/410, and non-resurrection all hold; FAIL on any data resurrection, missing page, or `500`.

### `STG-05` — Focus Timer, History, Delete + Undo & Combined Focus + Notes Migration
- **Status:** `NOT RUN — BLOCKED`
- **Prerequisites:** Approved staging pair; Guest profile and `<runId>-a` account.
- **Synthetic test data:** 1 completed countdown session linked to a to-do, 1 stopwatch session with 3 laps linked to a schedule block, 1 ended-early session, 1 soft-deleted Focus session, plus active Notes in the same Guest plan.
- **Execution steps:**
  1. Run countdown (preset + custom) and stopwatch with laps; reload mid-session to confirm monotonic/wall-clock recovery (`DEC-004`).
  2. Filter Focus history, soft-delete a session, undo via `ActionToast`, and confirm daily total updates immediately while filters stay intact.
  3. Migrate combined Guest Focus sessions + Notes into `<runId>-a` via `POST /import`; verify dependency order (linked to-dos/schedule items in or before the session/note chunk), excluded soft-deleted rows, and replay idempotence.
- **Expected result:** All active Focus sessions and Notes migrate accurately with original UUIDs and timing; soft-deleted records are excluded; history delete/undo matches between Guest and Account.
- **Evidence to capture:** Redacted `POST /import` summary showing `focus_sessions` + `notes` counts, `/focus` 375 px screenshot with history & filters.
- **Pass/Fail criteria:** PASS iff timer recovery, history delete/undo, and combined migration succeed with zero dropped sessions or 409/500 errors; FAIL otherwise.

### `STG-06` — Insights, Historical Streaks, Weekly Recap & Plan vs Reality
- **Status:** `NOT RUN — BLOCKED` (**also blocked on Codex `QA-029` streak consistency**)
- **Prerequisites:** Approved staging pair with `QA-029` merged; Guest & Account `<runId>-a` seeded with identical multi-day to-dos, schedule check-ins, and linked/unplanned Focus sessions.
- **Synthetic test data:** 3 active days within the current week (1 to-do + 1 block on one day to verify singular pluralization), 1 empty prior week, and activity spanning 30 days.
- **Execution steps:**
  1. Open `/insights` at 375 px and 1440 px in Guest and Account modes.
  2. Switch across `Week` (including `Previous week` / `Next week`), `7 days`, `30 days`, and `90 days` (verifying 92-day backend cap enforcement).
  3. Compare Overview KPIs (2×2 grid), Weekly Recap (partial & empty week), Plan vs Reality (linked vs unplanned focus, countdown vs stopwatch), Daily Breakdown (`1 to-do`, `1 block`), and `F-R4-03` Historical Streak opening/daily counts between Guest and Account.
- **Expected result:** Guest Dexie calculations match `GET /stats/summary` identically; historical streak counts match `QA-029` rules; empty prior week shows `EmptyState`.
- **Evidence to capture:** Side-by-side Guest vs Account `/insights` screenshots (375 px & 1440 px) and redacted `GET /stats/summary` response summary.
- **Pass/Fail criteria:** PASS iff Guest and Account values match 100% across all presets and `QA-029` streak invariants hold; FAIL on any metric divergence or layout/pluralization regression.

### `STG-07` — Offline, Reconnect, Cross-Tab Session Switching & Midnight / Time-Zone Boundaries
- **Status:** `NOT RUN — BLOCKED` (midnight/streak portion also tracks `QA-029`)
- **Prerequisites:** Approved staging pair; two browser tabs; timezone test profiles (`UTC` and `Asia/Phnom_Penh`).
- **Synthetic test data:** Guest local plan + Accounts `<runId>-a` (`Asia/Phnom_Penh`) and `<runId>-b` (`UTC`).
- **Execution steps:**
  1. As Guest, go offline; reload `/today`, `/week`, `/focus`, `/insights`, and `/notes`; create/edit a to-do and a note; reconnect and verify zero duplication.
  2. As Account `<runId>-a`, go offline; confirm single `OfflineBanner` (no redundant `ServiceDownBanner` per `UX-017`), page-specific offline cards on `/insights` and `/notes`, and hidden note creation CTA; reconnect and verify recovery.
  3. Open `<runId>-a` in Tab A and Tab B; sign out in Tab A and verify Tab B clears account UI without reload while preserving Guest Dexie data (`QA-011`).
  4. Verify local-date rollover around midnight in `Asia/Phnom_Penh` (`UTC+7`) vs `UTC` for Today's due/overdue items, Daily Intention, and streak counting.
- **Expected result:** Guest works 100% offline; Account fails closed offline with clean recovery; cross-tab sign-out/switch leaks zero stale data; local-date boundaries match `users.timezone`.
- **Evidence to capture:** Offline/reconnect 375 px screenshots (`/insights`, `/notes`), cross-tab sign-out log, timezone date-boundary log.
- **Pass/Fail criteria:** PASS iff zero stale data leaks across accounts/tabs, zero duplicate offline banners, and accurate local-date boundaries; FAIL on any cross-account leakage or false offline save claim.

### `STG-08` — Mobile 375 px Accessibility, Responsive Layout & PWA Update (`Q21`)
- **Status:** `NOT RUN — BLOCKED`
- **Prerequisites:** Approved staging pair; Chromium mobile device emulation (320, 375, 390, 768, 1440 px); staging profile with previous service worker installed for update check.
- **Synthetic test data:** Populated Today, Week, Focus, Insights, Notes, and Profile screens.
- **Execution steps:**
  1. Sweep all app and auth routes at 320, 375, 768, and 1440 px plus 200% text scaling at 320 px; verify `scrollWidth <= clientWidth` (`0 px` overflow) and `>= 44×44 px` touch targets.
  2. Run axe-core WCAG 2.0/2.1 A/AA check and keyboard-only navigation (`Tab`, `Enter`, `Escape` on Sheets, focus restoration, `prefers-reduced-motion: reduce`).
  3. On a staging profile with an older SW, open an unsaved draft, trigger candidate SW update: test `Later` (no forced reload), then `Update now` (draft-discard confirmation, clean reload, IndexedDB preserved).
- **Expected result:** `0` axe violations, `0 px` horizontal overflow, full keyboard focus management, and non-destructive prompt-based PWA update.
- **Evidence to capture:** Axe summary output, 375 px & 1440 px screenshots, PWA manifest/installability check (`getInstallabilityErrors === []`) and SW update log.
- **Pass/Fail criteria:** PASS iff zero axe violations, zero horizontal overflow, and clean `Q21` update flow; FAIL on any overflow, focus trap failure, or silent draft loss on SW update.

### `STG-09` — Security Headers, CSP, CORS, Rate Limits, Legal & API Contract Checks
- **Status:** `NOT RUN — BLOCKED` (legal publication also **BLOCKED ON `QA-004`**)
- **Prerequisites:** Approved staging pair; `curl` / browser DevTools network panel.
- **Synthetic test data:** Unauthenticated & synthetic `<runId>-a` requests against staging endpoints.
- **Execution steps:**
  1. Probe `/`, `/today`, `/notes`, `/insights`, `/sw.js`, `/manifest.webmanifest`, `/api/v1/health`, and `/assets/missing.js` on staging frontend: verify HTTP `200` on SPA routes, `404` on `/api*` & missing assets, `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`, and all 6 security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`) with zero browser CSP violations.
  2. Verify API CORS returns exact staging `FRONTEND_URL` without `Access-Control-Allow-Credentials: true` and rejects foreign origins.
  3. Verify `GET /api/v1/health?deep=1` returns `200` (`{"status":"ok"}`) with `APP_DEBUG=false` (no stack traces on `404`/`422`/`500`).
  4. Verify auth rate limit (10/min/IP) and API rate limit (120/min/user) return `429` cleanly; verify `/privacy` and `/terms` match owner-approved `QA-004` disclosures.
  5. Confirm deployed frontend and backend OpenAPI contract blob SHAs match `docs/openapi.yaml` and pass Redocly lint.
- **Expected result:** All security headers, CSP, CORS, rate limits, debug-off errors, and OpenAPI contract checks pass; zero secrets in server or client logs.
- **Evidence to capture:** Redacted `curl -sSI` header output for frontend & API, DevTools console/CSP report (0 errors), rate-limit `429` observation, OpenAPI SHA comparison.
- **Pass/Fail criteria:** PASS iff every header/CORS/rate-limit/debug-off/contract check passes AND `QA-004` owner sign-off is recorded; FAIL on any missing security header, stack trace leak, or CORS misconfiguration.

---

## 4. Release Evidence Checklist (Owner Sign-Off Required Before Production Promotion)

All items below are **`PENDING`** until executed and signed off by the owner.

### 4.1 Deployed Provenance & Contract Parity
- [ ] **Frontend Staging SHA (40-char):** `PENDING` (verified via `X-Loomora-Revision` and Vercel deployment record)
- [ ] **Backend Staging SHA (40-char):** `PENDING` (verified via `GET /api/v1/health?deep=1` `X-Loomora-Revision` and Render deploy record)
- [ ] **OpenAPI Contract Parity:** Frontend `docs/openapi.yaml` Git blob SHA matches backend `docs/openapi.yaml` Git blob SHA (`PENDING`)
- [ ] **Run ID & UTC Timestamp:** `PENDING`

### 4.2 Staging Origin, CORS, CSP & Environment Separation
- [ ] **Distinct Canonical HTTPS Hosts:** Staging frontend and staging API use isolated HTTPS origins with valid TLS and no SSO interstitials on tested paths
- [ ] **Frontend `VITE_API_URL` & CSP `connect-src`:** Both target the exact approved staging API origin (never production during staging QA; exact production API on production promotion)
- [ ] **Backend `FRONTEND_URL` & CORS:** Exact staging frontend origin allowed; no wildcard `*`; no credentialed CORS; foreign origins denied
- [ ] **Strict Environment Separation:** Staging Neon PostgreSQL database, `APP_KEY`, Brevo sender/mailbox, and Google OAuth client/callbacks are isolated from production
- [ ] **Debug Off:** `APP_DEBUG=false` verified on Render; `404`/`422`/`500` responses contain no stack traces or SQL details

### 4.3 Database Migrations, Health & Rate Limits
- [ ] **Migrations Complete:** All backend migrations applied cleanly against staging Neon PostgreSQL with TLS enabled
- [ ] **Health Checks:** `GET /api/v1/health` and `GET /api/v1/health?deep=1` return `200` `{"status":"ok"}`
- [ ] **Rate Limits Active:** Auth endpoints enforce 10/min/IP (`429`), authenticated API endpoints enforce 120/min/user (`429`), feedback enforces 10/hr (`429`)

### 4.4 Logging Redaction & Secret Hygiene
- [ ] **Client & CI Logs Clean:** Zero bearer tokens, passwords, OAuth codes, PKCE verifiers, state params, or ID tokens in screenshots, traces, or terminal logs
- [ ] **Server Logs Redacted:** Render logs verified free of `Authorization` headers, passwords, reset/verify tokens, and raw Google ID token claims
- [ ] **Approval Record Out of Git:** Owner `.local` approval file kept outside Git and environment variables cleared after run

### 4.5 Rollback Readiness
- [ ] **Previous Production Frontend Deployment ID Recorded:** `PENDING` (Vercel instant-rollback target before promoting new `v2-rebuild`)
- [ ] **Previous Production Backend Deploy ID Recorded:** `PENDING` (Render rollback target)
- [ ] **Database Backup / PITR Confirmed:** Neon PostgreSQL branch/snapshot or PITR window confirmed before production migration
- [ ] **Rollback Dry-Run / Procedure Confirmed:** Owner confirms Vercel rollback + Render rollback steps and staging fixture disposal procedure
- [ ] **Final Owner Go / No-Go Sign-Off:** `PENDING` (requires `QA-009` executed & green, `QA-016`, `QA-004`, `Q23`, `Q25`, and `QA-029` resolved)
