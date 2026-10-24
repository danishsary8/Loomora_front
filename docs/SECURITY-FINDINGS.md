# Security Findings (secret scan)

Scan date: 2026-10-24
Repo: `danishsary8/Loomora_front`, branch `v2-rebuild` (all 26 commits on all branches)
Values are never shown. Where a value is mentioned, only its first 4 characters are given.

## How the scan was run

1. **gitleaks v8.21.2**, git history: `gitleaks git --redact --log-opts="--all" .` → 26 commits scanned, **no leaks found**.
2. **gitleaks v8.21.2**, working tree: `gitleaks dir --redact legacy` → **no leaks found**.
3. **Pattern search** over `git log -p --all` and the working tree for: `client_secret`, `GOCSPX`, `password`, `APP_KEY`, `DB_URL`, `DATABASE_URL`, `api_key`, `secret`, `token`, `base64:` (Laravel keys), `AKIA` (AWS), `sk-`, `re_` (Resend), `xkeysib-` (Brevo), `SG.` (SendGrid), `postgres://user:pass@`, Google client IDs (`*.apps.googleusercontent.com`), Sentry DSNs.
4. Check for any committed `.env` file (not `.example`), key files (`.pem`, `.key`), or `.audit-seed.json`.

## Result

**No real secrets were found in the working tree or in git history.**

- No `.env` file (only `.example` files) was ever committed.
- No `.audit-seed.json` (bearer token file) was ever committed.
- No Google client secret (`GOCSPX-…`), Laravel `APP_KEY` (`base64:…`), Resend, Brevo, AWS or database URL with credentials appears anywhere in history.
- All secret keys in the example env files are empty or placeholders.
- `render.yaml` uses `sync: false` for every secret and `fromDatabase` for `DB_URL`.

## Findings (low risk, for review)

| # | Severity | File (now under `legacy/`) | What | First 4 chars | Action |
|---|---|---|---|---|---|
| F1 | Info | `backend/.env.example`, `backend/.env.production.example` | Secret keys listed with empty values: `APP_KEY`, `DB_URL`, `RESEND_API_KEY`, `DIAGNOSTIC_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENTRY_LARAVEL_DSN` | (empty) | None. Good pattern, keep it. |
| F2 | Info | `backend/.env.example` | `DB_USERNAME`, `DB_PASSWORD` placeholders | `your…` | None. Placeholder only. |
| F3 | Low | `scripts/load-test.mjs` (line 8) | Hardcoded password for disposable load-test accounts | `Loom…` | Not a real account secret. Do not reuse this in v2; read test passwords from env. |
| F4 | Low | `scripts/seed-audit-user.mjs` (line 7) | Hardcoded password for an audit test user | `Str0…` | Same as F3. If this user exists in a live database, delete it or change its password. |
| F5 | Low | `src/**/*.test.jsx`, `backend/tests/**` | Fake passwords/tokens used as test fixtures | various | None. Test data only. |
| F6 | Medium (not a secret) | `backend/app/Http/Controllers/Api/V1/MailDiagnosticController.php`, `backend/routes/api.php` (`internal/mail-diagnostic`, `internal/mail-test`) | Temporary mail test endpoints, marked "DELETE AFTER USE", protected by `DIAGNOSTIC_TOKEN` | n/a | Per decision S16, do not carry into v2. If the old backend is still deployed, unset `DIAGNOSTIC_TOKEN` or remove the routes there. |
| F7 | Info | `.b.txt`, `.m0.txt`, `.m1.txt`, `.m2.txt` (added in `97c4eac`, deleted in `476afaf`) | Build / audit logs committed by mistake. No secrets, but they show a local Windows user path | n/a | None needed. Already ignored by `.gitignore`. |

## Not covered by this scan

- The backend repo `danishsary8/loomora_back` (scan it separately).
- Secrets stored in host dashboards (Render, Vercel, Neon) and GitHub Actions secrets.
- Decision S7/S16 still applies: **rotate the Google client secret** and use new redirect URIs, even though no secret was found here. This needs Danish (Google Cloud console).
