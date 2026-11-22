# QA-022 paired staging evidence and runbook

**Hosted verification is blocked.** No approved disposable pair, staging identity attestation, synthetic inbox access, or Google-only staging session was supplied. No hosted scenario ran. No staging or production service, secret, deployment setting, or existing user record was changed during preparation.

| Source | Exact revision |
| --- | --- |
| Frontend `v2-rebuild` baseline (F-030 #45, QA-019 #46, QA-020 #47) | `00a6d012785fe213e1ba6086c9780f5cadb99a35` |
| Frontend QA-022 test code verified locally | `562be5226f3eda3b3f452013038f303fc94b914c` |
| Backend `v2-rebuild` contract baseline (B-042 #45) | `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d` |
| OpenAPI Git blob on both baselines | `5f434e4e6d4078f263b9ef5bcee944d9c87872bb` |
| Deployed frontend and API revisions | Pending owner confirmation and runtime check |

QA-021 #48 is outside this baseline. The following evidence distinguishes local checks from observations required on the approved pair.

| Area | Existing evidence | QA-022 staging expectation |
| --- | --- | --- |
| Auth and credential lifecycle | Frontend Vitest uses MSW. Backend `AuthTest` and `EmailAndPasswordTest` cover token and link behavior. | Browser register 201 and login 200 for the same UUID. Logout 204 clears the browser session and makes its bearer return 401. Invalid verification and reset links return 422. Forgot returns the same 200 acknowledgement for an existing and an unused synthetic address. |
| Guest import | Storage tests cover bounded chunks, retry and local retention. Backend `ImportTest` covers per-request atomicity and idempotence. | Interrupt the first browser import at the transport boundary. Keep the same guest UUID in IndexedDB. Retry against staging, confirm one real creation, clear the local copy, then replay the request and confirm one skip. |
| To-dos and weekly schedule | Local Playwright covers guest Today and Week. Backend `TodoTest`, `ScheduleItemTest` and `ScheduleOccurrenceTest` cover planner writes and ownership. | Create, edit, and complete a to-do. Create a recurring schedule item, check in, and verify the seven-day envelope plus the same data in the mobile UI. The second synthetic account cannot list or change the first account's records. Both forbidden edits return 403 and the owner records match the snapshots. |
| Google deletion | F-030 exercises the callback UI, tab and session binding, expiry and explicit confirmation using fixtures. B-042 uses signed synthetic OIDC fixtures and checks the default-off API. | Check the deployed callback has `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, strips the query, and makes no verify or delete request for an unsolicited callback. With the optional approved Google-only fixture, the disabled challenge returns 503 and the UI offers no final confirmation. |
| Offline guest and PWA update | Local 375 px cases cover offline to-do, schedule and guest reads. QA-019's two-version cases cover Later, draft protection, explicit update and IndexedDB persistence. | Check the deployed candidate and old-worker upgrade manually on the approved pair. Staging automation blocks service workers so every browser API request can go through its request guard. |

## Owner prerequisites

1. Approve a specific disposable frontend/API pair and a new run ID in writing. Confirm names and data storage are isolated from production. The runner requires distinct canonical HTTPS hosts, valid TLS, direct SPA routing, and no redirect or SSO interstitial on the checked endpoints. Confirm approved ingress, PostgreSQL identity and TLS, migration completion, the backend's canonical frontend origin, and debug-off behavior. Confirm that the frontend build API URL and deployed CSP `connect-src` both target the approved API. The backend must grant the exact frontend origin without credentialed CORS. Stop if any of these checks require access outside the approved scope.
2. Have the staging owner supply truthful `X-Loomora-QA-Approval` and `X-Loomora-Revision` response headers at the frontend root and API deep health. Use the approved run ID and the actual deployed Git SHA for each service. Confirm the deployed revision and database mapping independently. The probe checks both before attempting writes. The run ID marks the approved target and is public metadata.
3. Approve a controlled synthetic mailbox domain and unused addresses for `<runId>-a`, `<runId>-b`, and `<runId>-unused`. The first two addresses are registered by the suite and can trigger real staging emails. Leave the third unregistered. Use fresh addresses on every attempt. For the optional disabled-Google check, supply an active bearer from the approved `<runId>-google` Google-only account and confirm the capability is off. This check needs no Google redirect.
4. Store the owner-approved record outside Git as a `.local` file. Keep tokens and passwords out of the file, console output, shell history and case evidence. Use a fresh shell with Playwright network debugging disabled.

Example approval shape. The placeholders below must be replaced with values from the owner.

```json
{
  "authorization": "QA-022-disposable",
  "runId": "qa022-example",
  "frontend": "https://frontend.staging.example.test",
  "api": "https://api.staging.example.test/api/v1",
  "frontendSha": "<40 lowercase hex characters>",
  "backendSha": "<40 lowercase hex characters>",
  "mailboxDomain": "mail.staging.example.test",
  "googleEmail": "qa022-example-google@mail.staging.example.test"
}
```

## Commands and stopping safely

Run from the frontend QA-022 worktree. For local verification, no staging credentials or approval are required.

```powershell
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run knip
npm test -- --maxWorkers=3 --pool=threads
npm run build
npm run e2e -- --project=phone-375 --workers=1
npx prettier --check --end-of-line auto .
npm audit --omit=dev
npx --yes @redocly/cli lint docs/openapi.yaml
git diff --check
```

Set `LOOMORA_E2E_PORT` to an unused port if 4173 is occupied, for example `$env:LOOMORA_E2E_PORT = '4213'`. The local suite builds with the reserved `.invalid` API origin and starts its own preview. To repeat the offline and update cases, run `npm run e2e -- --project=phone-375 --workers=1 e2e/offline-todos.spec.ts e2e/offline-schedule.spec.ts e2e/offline-guest-reads.spec.ts e2e/pwa.spec.ts`.

Only after the owner prerequisites are met, populate the matching values in the shell. The approval file path must end in `.local`.

```powershell
$env:QA022_APPROVAL_FILE = 'C:\path\to\owner-approval.local'
$env:QA022_APPROVED_RUN = '<approved run ID>'
$env:QA022_FRONTEND_URL = '<approved frontend origin without trailing slash>'
$env:QA022_API_URL = '<approved API URL ending in /api/v1>'
npx playwright test --config=playwright.staging.config.ts --list
npx playwright test --config=playwright.staging.config.ts
```

`--list` validates the approval shape and lists three scenarios without contacting the pair. The live command runs serially with no retries and stops on the first failure. Expect two passes and one explicit skip when the disabled-Google fixture is unavailable. With the owner-approved fixture injected as `QA022_GOOGLE_FIXTURE_BEARER` through a secure environment mechanism, expect three passes. A pass supplies evidence only for the scenarios that ran. The browser and API allowlists deny off-pair traffic, unexpected redirects, and all automated DELETE requests. The browser guard checks real CORS preflights for JSON and authorization headers and verifies the raw API response before handing it back to the browser. The staging config disables traces, screenshots, and video. Use the command as shown with debug logging disabled.

On mismatch, rate limiting, unexpected mail recipient, or environment uncertainty, stop with Ctrl+C and close the runner. A request already accepted by the API may still commit. Record the last confirmed step and ask the staging owner to dispose of the isolated fixtures under their existing process. Use a newly approved run ID and fresh synthetic addresses for another attempt. End the shell or unset the approval and fixture variables when finished. No automatic cleanup or account deletion runs.

## Pending manual staging checks

- [ ] **Brevo delivery and redemption.** Confirm the staging sender, transport and controlled inbox. Register a separate synthetic account with operator-managed credentials, confirm initial unverified state and actual delivery, open the delivered canonical verification route, confirm the verified state, and check the expired or tampered link outcome. Exercise resend where appropriate. Request a reset with two active sessions, receive the delivered canonical link, change the password, confirm the old sessions and old credentials fail, and sign in with the new password. Confirm reuse and expiration are rejected. Record provider and inbox timestamps and outcomes.
- [ ] **Google provider and callback.** Confirm the dedicated callback is registered on the staging OAuth client and verify real consent, denial, and return to the exact approved frontend. With the gate off, record 503 and no deletion. Under separate staging-only approval for capability enablement, check that a stale provider session fails, deliberately refresh it, and confirm Google returns a signed `auth_time` within five minutes for the linked subject. Check installed-worker callback navigation, no-referrer/no-store, query removal, log redaction and no credential leakage. Record outcomes without codes, state, verifiers, ID tokens or raw claims.
- [ ] **Confirmed proof expiry and session changes.** On the approved capability-enabled pair, obtain real proof without clicking Delete everything. The deadline is the earliest of challenge expiry, 120 seconds after verification, five minutes after Google authentication and ID token expiry. Wait until the returned deadline and confirm the UI removes the action and the account remains accessible. Repeat with another tab signing out or switching accounts. The old proof must become unusable, a copied callback must be rejected, and the replacement account and guest data must remain available.
- [ ] **Explicit final confirmation.** First prove that consent, return, and backing out leave the designated account intact. A successful deletion requires a separate explicit authorization for that environment and a named disposable account. Only then may the operator perform final confirmation manually and confirm 204, old bearer revocation, account removal and guest data preservation. Leave this check blocked without that approval.
- [ ] **Offline and old-worker upgrade.** Use a dedicated staging browser profile with the old worker, create a guest record, open an editable draft, and observe the waiting worker on the candidate. Test Later, confirm no automatic reload, then test the explicit update prompt and draft warning. Confirm the guest record remains after update, offline reload and reconnection. Check the dedicated OAuth callback uses a network navigation.
- [ ] **Release evidence.** Record the deployed frontend/API SHAs, run ID, UTC timestamp, observed cases and failures, provider outcome, owner sign-off, and unresolved questions. Keep QA-009 blocked until real paired verification is approved. Q23, Q25, QA-004 and QA-016 remain open.

## Local verification results

| Check | Observed outcome |
| --- | --- |
| `npm ci`, `npx playwright install chromium` | Passed. Installation reported four development dependency advisories. |
| `npm run lint`, `npm run typecheck`, `npm run knip` | Passed. Knip emitted its CSS configuration hint. |
| `npm test -- --maxWorkers=3 --pool=threads` | **638 passed in 62 files**, including all 12 staging guard tests. The initial Windows runs timed out in existing lazy-route UI queries. Increasing the test-only Testing Library wait from one to three seconds resolved the failures. An alternate VM worker run stopped during setup because MSW requires `WritableStream`. The final run used regular threads. |
| `npm run build` | Passed. Vite generated the app and Workbox service worker. |
| `npm run e2e -- --project=phone-375 --workers=1` | **73 passed** through the test-owned preview on port 4213. Includes offline guest to-dos, weekly schedule and reads, both QA-019 worker update cases, local F-030 callback/deletion fixtures, and the new password entry regression. |
| Staging config and transport probes | Missing approval and matching inputs that targeted the known production API were rejected before execution. An inert example approval listed three tests without any hosted requests. A loopback Chromium probe confirmed that the browser Origin is available to the interceptor and that an upstream response can omit CORS before Playwright fulfillment. |
| `npx prettier --check --end-of-line auto .`, `git diff --check` | Passed. |
| `npm audit --omit=dev` | Passed with zero production advisories. |
| `npx --yes @redocly/cli lint docs/openapi.yaml` | Passed with four baseline warnings for the localhost server example, the health response, and two Google sign-in redirects. |
| Hosted staging, Google, Brevo, and live account deletion | **Blocked or pending manual evidence.** None was executed. |

## QA-021 integration on 2026-11-22

The verified integration merge is `69a2aecdf9e368aabe3ff29d36d2aeba1122ecf4`. Its parents are QA-022's reviewed head `09b42545f8eba6bbab6d6e9a8e2088660e3e5104` and the QA-021 merge on `v2-rebuild`, `e4e57b441eddd59909ab194c74b3c58d31ecb9ab`. The backend contract baseline remains `c9a7acf0e03a0a3ee5f60cc38198634fd0f58e3d`. These are source revisions. No deployed pair was verified.

- Preserved both task records and histories and all six Chromium, Firefox, and WebKit projects. Ordinary Playwright retains its inert API origin, test-owned preview, and hosted-staging exclusion. The separate staging config refused test discovery without approval. The unchanged staging guards still require exact frontend and API revisions and synthetic accounts, and deny production targets and every automated DELETE request.
- The resolved `vercel.json` is identical to the merged base. It preserves the headers, CSP, rewrites, and the three exact `false` rules for QA-021, QA-022, and `v2-rebuild`.
- The schedule undo test now controls its short fixture timer to remove wall-clock timing from the assertion. No application behavior changed.

| Verification | Observed result |
| --- | --- |
| `npx --yes --package=npm@10.9.4 -- npm ci` | Passed using the merged lockfile. |
| Lint, typecheck, Knip, `npx prettier --check --end-of-line auto .`, build, and `git diff --check` | Passed. |
| `npm test -- --maxWorkers=1` | Initial run had two timing failures, in the schedule undo and lazy save-plan prompt tests. The focused undo regression passed after switching it to a fake timer. The full one-worker rerun with `--pool=threads` passed all 638 tests across 62 files, including the 12 staging guard tests. |
| `npm run e2e -- --project=phone-375 --workers=1` | All 78 passed, including offline guest behavior and QA-019 service-worker updates. |
| `npx playwright test e2e/cross-browser.spec.ts --workers=1` | All 30 passed across six projects on a fresh local preview port after the initial preview startup timed out. |
| `npm audit --omit=dev` and Redocly OpenAPI lint | Zero production dependency advisories. OpenAPI valid with the four baseline warnings. |

QA-009, Q23, Q25, QA-004, and QA-016 remain blocked. Hosted staging, live provider checks, and account deletion were not executed. PR #49 remains subject to planner review and separate merge authorization.
