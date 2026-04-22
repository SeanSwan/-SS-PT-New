# OPUS ↔ CODEX DEBATE — Credentials Hygiene Cleanup (was: rotation) + settings.local.json Cleanup

**Date:** 2026-04-21 (late-night session after Hermes bridge closeout)
**Author (Round 1):** Claude Opus 4.7 (1M context)
**Status:** AWAITING CODEX ROUND 1 REVIEW (FINAL GATE per CLAUDE.md Rule 46)

## 🔄 SCOPE UPDATE — 2026-04-21 late Round 1

Sean confirmed **all five leaked secrets in this file are already rotated.** The live DB password, Gemini key, admin password, and local PG password shown in `.claude/settings.local.json` and the tracked Playwright tests are **stale credentials, not active compromises.**

This removes the production-rotation hot path. The debate now covers:

1. **Cleanup of `.claude/settings.local.json`** — remove literal stale secrets from allow-list patterns, replace with safe wildcards.
2. **Git history scrub of the 3 Playwright test files** — commits `30ace6b86`, `402ddc871` still carry the old admin password in tracked content. Filter-repo pass to purge.
3. **Recurrence prevention** — how to stop `.claude/settings.local.json` from accumulating literal secrets again; how to stop Playwright tests from committing cleartext passwords.
4. **Sequencing** — where this work fits relative to Hermes prompt/toolset hardening and the repo hygiene inventory already produced.

**Original rotation sections preserved below as reference for how it would have been done** if any credential had been currently live. Skip to the **Cleanup plan** and **Recurrence hardening** sections for what actually needs doing.

---

## TL;DR

During planning for Codex permission config tightening, read of `.claude/settings.local.json` surfaced **live production credentials embedded in allow-list patterns** as literal shell-command strings. The file is gitignored (post-2026-04-19 remediation holds), but storing secrets on disk in allow-list patterns creates re-leak surface via backups, disk images, accidental screenshots, IDE extensions, or future `.gitignore` drift. Per CLAUDE.md Rule 44.

Sean selected **option A: full rotation tonight.** This plan covers: what to rotate, order of operations, how to update downstream consumers, settings-file cleanup, verification. Codex final-gate approval required before execution.

---

## Inventory — Secrets found in `.claude/settings.local.json`

All counts/lines reference the current file (270 lines, 257 allow entries).

| # | Secret | Value prefix | Lines | Severity |
|---|---|---|---|---|
| 1 | **Production Render PostgreSQL password** | `swanadmin:NOAkH3...` @ `dpg-cv1qga1u0jms738nc8lg-a.oregon-postgres.render.com/swanstudios` | 120, 121, 122, 161, 162 | 🔴 CRITICAL |
| 2 | **Gemini API key** | `[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]...` | 212 | 🟠 HIGH |
| 3 | **Sean's production admin password** (cleartext) | `[redacted-admin-pw-prefix]` via `TEST_PASSWORD=` arg to `npx playwright test` | 170 | 🟠 HIGH |
| 4 | **Local dev PG password** | `[REDACTED-LOCAL-PG-ROTATED-2026-04-19]` | 177, 178, 180–186 | 🟡 MEDIUM (local-only) |
| 5 | **Admin JWT tokens** (6 distinct tokens) | `[REDACTED-JWT]` | 11, 53, 110, 113, 164, 201 | 🟡 MEDIUM (time-limited) |

**Additional context:** The Gemini key at line 212 is NOT the one rotated earlier this week per session summary. It's either an older key pre-dating the April 19 incident or a third in-flight key. Either way, it needs rotation or confirmation it is already revoked.

### 🚨 AMENDMENT — leak surface wider than settings file alone

Pre-staging grep discovered Sean's admin password `[REDACTED-ADMIN-PW-ROTATED-2026-04-21]!` ALSO present in 3 tracked Playwright test files:

- `tests/playwright-claim-flow-smoke.py`
- `tests/playwright-ai-assistant-onboarding.py`
- `tests/qa-rolodex-test.py`

These files were introduced by commits `30ace6b86` (**2026-03-24**) and `402ddc871` (**2026-03-24**). Both commits still present in current `main` history. The 2026-04-19 `git-filter-repo` rewrite targeted only `.claude/settings.local.json` blobs and **did not touch these test files**.

**Implication:** Sean's production admin password has been in tracked git content since 2026-03-24. If the repo was public at any time between then and now (public as of the 2025-10-29 incident; visibility since 2026-04-19 repo→private is a listed deferred follow-up — verify), the password must be treated as **compromised**. This elevates Step 3 (admin password rotation) from "hygiene" to CRITICAL, same tier as Step 1.

Second `git-filter-repo` rewrite is warranted to purge these commits, OR at minimum the specific password string. This is out of tonight's hot rotation path but must be scheduled.

**Other passwords/keys in git history:** Recommended additional greps before committing tonight:

- `git log -S '[redacted-admin-pw-prefix]' --all --oneline` — how many commits touched this string
- `git log -S '[REDACTED-PROD-PG-ROTATED-2026-04-21]' --all --oneline` — whether prod DB password ever leaked to tests/docs too
- `git log -S '[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]' --all --oneline` — whether this Gemini key leaked to tracked files too
- `git log -S '[REDACTED-LOCAL-PG-ROTATED-2026-04-19]' --all --oneline` — whether local dev PG password leaked to tracked files too

---

## Proposed rotation sequence

Order chosen by: (a) blast radius, (b) downstream updates required, (c) restart complexity.

### Step 1 — Production Render PostgreSQL password (CRITICAL)

**What breaks during rotation:** Live production API briefly 500s while Render propagates the new `DATABASE_URL` env var. Expect 30-90 seconds of 5xx from `sswanstudios.com` during the deploy.

**Rotate via Render dashboard:**
1. Log in to Render → `swanstudios` Postgres instance → "Info" or "Access" tab → "Rotate password" (Render exposes this natively).
2. Copy the new `External Database URL` shown.
3. In the **`ss-pt-new`** web service → Environment → Update `DATABASE_URL` → Save → triggers auto-deploy.
4. Watch Render build log; verify migrations/startup succeed.
5. Curl `https://sswanstudios.com/api/health` — expect 200.

**Update downstream (Sean's laptop / local dev):**
- `backend/.env` → update `DATABASE_URL` (CLAUDE.md says local dev uses production DB via this URL)
- Root `.env` if it also defines `DATABASE_URL` — grep first

**NOT to update:** Anything in the SwanStudios git repo — `DATABASE_URL` must NEVER be committed. Only `.env` files (gitignored) and Render env dashboard.

### Step 2 — Gemini API key (HIGH)

**Rotate via Google AI Studio / Google Cloud:**
1. `https://aistudio.google.com/app/apikey` → find current key(s) → **revoke** `[REDACTED-GEMINI-KEY-ROTATED-2026-04-19]` (if it still appears)
2. Create new key if needed.
3. Update `.env` files: root `.env`, `backend/.env`, `~/.hermes/.env` (Pi side), `~/.hermes/auth.json` credential_pool.

**Verification:** `node scripts/consult-gemini.mjs --ask "ping"` — expect real response, not 401/403.

### Step 3 — Sean's production admin password (HIGH)

**Rotate via the live app:**
1. Log in to `sswanstudios.com` as admin.
2. Account settings → change password → generate strong replacement via password manager.
3. Alternate path if admin UI lacks self-change: direct DB query by trusted script only (`backend/scripts/*reset-admin*`). Not via bare SQL from the command line — that just re-creates the literal-cleartext leak pattern.

**Do NOT:** add the new password anywhere in allow-list patterns or Playwright test env args — that's what created this problem.

### Step 4 — Local dev PG password (MEDIUM)

Optional tonight. Low-urgency hygiene. Rotate via:
```sql
ALTER USER swanadmin WITH PASSWORD '<new>';
```
Update `backend/.env` `DATABASE_URL` (local variant) if set, and local `pg_hba.conf` if it was pinning the old.

### Step 5 — JWT tokens (MEDIUM)

JWTs in the allow-list expire on their own (`exp` claim ~a few hours from issue). Most are probably already invalid. No action unless grep of Render env vars shows `JWT_SECRET` is the pre-April-19 value, in which case rotate `JWT_SECRET` (invalidates ALL live sessions — everyone gets logged out, acceptable).

---

## settings.local.json cleanup plan

### What gets removed (literal-secret entries)

Delete the following entries entirely:
- Any entry containing `[REDACTED-PROD-PG-ROTATED-2026-04-19]`
- Any entry containing `[REDACTED-LOCAL-PG-ROTATED-2026-04-19]`
- Any entry containing `[REDACTED-GEMINI-KEY-ROTATED-2026-04-19]`
- Any entry containing `[REDACTED-ADMIN-PW-ROTATED-2026-04-21]!`
- Any entry with a JWT body (regex: `[REDACTED-JWT][A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+`)

### What gets added (wildcards that keep ergonomics)

- `Bash(DATABASE_URL=* node:*)` — allows `DATABASE_URL=... node script.mjs` patterns
- `Bash(DATABASE_URL=* node backend/scripts/:*)` — narrower variant for backend scripts
- `Bash(PGPASSWORD=* psql:*)`
- `Bash(PGPASSWORD=* pg_dump:*)`
- `Bash(GEMINI_API_KEY=* node:*)`
- `Bash(TOKEN=* )` — bare env-var decl with no command is harmless
- `Bash(BASE_URL=* TEST_EMAIL=* TEST_PASSWORD=* npx playwright test:*)` — Playwright test env pattern without the literal password

### How the cleanup runs

Idempotent Python migration script (separate from rotations; runs locally; no network):
1. Load `.claude/settings.local.json` as JSON.
2. Filter `permissions.allow` — keep entries that don't match any of the 5 leak-fingerprints above.
3. Dedupe.
4. Append the wildcard entries if not already present.
5. Back up original to `.claude/settings.local.json.bak-2026-04-21-leak-cleanup` (gitignored, same directory).
6. Write cleaned file.
7. Print before/after counts + confirm wildcards present.

---

## Verification after everything

1. Production: `curl -s -o /dev/null -w "%{http_code}" https://sswanstudios.com/api/health` → `200`.
2. Production login: log in as admin, confirm new password works, 2FA if enabled.
3. Local dev: `npm run dev` from repo root → frontend loads, backend connects to new `DATABASE_URL`.
4. Gemini: `node scripts/consult-gemini.mjs --ask "ping"` → real response.
5. Hermes (Pi): Telegram "check status on claude and codex sessions" → real tmux data, not auth error.
6. `.claude/settings.local.json`: `grep -cE '[fingerprints-via-scan-secrets.sh]' .claude/settings.local.json` → `0`.

---

## Risks

- **Production outage window:** Step 1 causes 30-90s of 5xx. Acceptable tonight (low US traffic 11pm+).
- **Missed downstream:** If a script or env file still references the old password, that consumer 500s silently. Mitigation: grep for old password fragment after rotation, update remaining hits.
- **Settings cleanup false-positive:** The wildcard patterns change ergonomics — Claude Code will ask once per new DATABASE_URL-containing command until Sean approves the wildcard pattern; this is a one-time cost per pattern.
- **Old Gemini key still used somewhere:** If `[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]...` is active in production (backend calling Gemini directly), revoking it mid-request kills in-flight calls. Mitigate by updating all env vars FIRST then revoking.

---

## Questions for Codex (Round 1 Final Gate)

1. **APPROVE / REVISE / REJECT** the rotation sequence and order?
2. Is the Render dashboard password-rotation path correct, or does Render require a CLI/API call for `swanstudios` specifically given it's an existing Postgres instance?
3. **JWT_SECRET:** should tonight's scope include forced `JWT_SECRET` rotation (which invalidates all live admin sessions immediately) or defer that to a scheduled window?
4. The wildcard replacement entries I propose — are any of them too permissive? Specifically: does `Bash(DATABASE_URL=* node:*)` create an exploitable surface where an attacker who already has shell could smuggle a malicious node script? (My view: allow-list only protects Sean from Claude Code's own suggestions; not an attacker-present threat model, so acceptable.)
5. Should I grep the git history for old `settings.local.json` blobs to confirm none of these specific secret strings are pre-April-19-filter-repo leftover? (Per the post-incident remediation, 2179 commits were rewritten, but independent verification is cheap.)
6. **Hermes `~/.hermes/.env` + `~/.hermes/auth.json` on Pi:** the Gemini key is stored there. Should the rotation plan also touch those files tonight, or is that out of scope given Hermes is already on the rotated key per this week's work?
7. Any secret type I missed in the file? (I scanned for DB URLs, JWTs, `AIza...`, known-rotated fingerprints. Did not scan for `sk-`, `pat_`, `ghp_`, PEM bodies — quick grep confirms those patterns don't appear in the file.)

---

**End of Round 1. Codex: please read this file only. Do not load earlier debate archives or Hermes handoffs.**

---

## Recurrence hardening — NEW Round 1 section per scope update

### Root-cause patterns that need prevention

1. **`.claude/settings.local.json` collects literal secrets in allow-list patterns.** Claude Code stores every approved Bash command verbatim. When Sean runs `DATABASE_URL="postgresql://..." node script.mjs` once and approves, the literal URL becomes an allow-list entry.
2. **Playwright test files hardcode admin password for convenience.** Sean wrote tests with `TEST_PASSWORD="[redacted-admin-pw-prefix]"` inline and committed them. Tests ran, they worked, they stayed.

### Proposed hardening

**For settings.local.json:**

- One-time: cleanup script that strips literal secrets (see "Cleanup plan" above), replaces with wildcards that approve the *command shape* without embedding values.
- Ongoing: an optional lightweight pre-save scanner — could be a Claude Code hook or an external systemd/cron job that scans `.claude/settings.local.json` for the 5 fingerprint patterns weekly and alerts.

**For test files:**

- Add a git pre-commit hook that scans staged blobs for credential patterns (already have `scripts/scan-secrets.sh` per this week's work — extend it to also scan `tests/**/*.py` for cleartext admin passwords via a length-and-shape heuristic).
- Test-side fix: all Playwright tests that need auth should read `TEST_PASSWORD` from env, not from file content. Patch the 3 existing files to `os.environ['TEST_PASSWORD']` + add `tests/.env.example` showing the pattern.
- Document the pattern in `docs/ai-workflow/references/TESTING-STANDARDS.md` or equivalent (create if absent).

**For git history:**

- Schedule a second `git-filter-repo` pass targeting the literal password string `[REDACTED-ADMIN-PW-ROTATED-2026-04-21]!` across all tracked files.
- After filter-repo: force-push, verify via `git log -S '[redacted-admin-pw-prefix]' --all` returns nothing.
- Listed as a deferred follow-up in the 2026-04-19 security remediation handoff; this amendment makes it concrete.

### Sequencing

Proposed order for tonight (pending Codex final-gate approval):

| Step | Action | Estimate | Can Run In Parallel With |
|---|---|---|---|
| 1 | Apply settings.local.json cleanup script (strip literal secrets, add wildcards) | 2 min | Nothing — it's the paper-trail-free win |
| 2 | Patch 3 Playwright test files to read `TEST_PASSWORD` from env | 5 min | Step 1 |
| 3 | Commit the Playwright patch (NOT the settings.local.json cleanup — that file is gitignored) | 1 min | — |
| 4 | Schedule (not execute tonight) git-filter-repo pass for `[REDACTED-ADMIN-PW-ROTATED-2026-04-21]!` purge | — | — |
| 5 | Schedule (not execute tonight) Hermes Nemotron hallucination hardening | — | — |
| 6 | Schedule (not execute tonight) repo hygiene Phase 2 (from REPO-HYGIENE-INVENTORY-2026-04-21.md) | — | — |

No production deployment required. No user impact. Low-risk cleanup + recurrence prevention.

---

## Updated questions for Codex (given scope shift)

Replace the original 7 questions with these (still numbered 1-7 to match Sean's prompt structure):

1. **APPROVE / REVISE / REJECT** the cleanup-only sequence above (secrets are already rotated, so this is hygiene, not incident response)?
2. Is removing the 3 cleartext password entries from `tests/playwright-*.py` files SUFFICIENT tonight, or should we also remove the file references from any CI workflow that might still feed them into test runs?
3. For the settings.local.json wildcards — any that are too permissive? Specifically `Bash(DATABASE_URL=* node:*)` and `Bash(PGPASSWORD=* psql:*)`.
4. Should tonight's scope also run a repo-wide grep for the OTHER already-rotated passwords (`[REDACTED-LOCAL-PG-ROTATED-2026-04-19]`, `[REDACTED-PROD-PG-ROTATED-2026-04-21]...`, `[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]...`) across `tests/`, `scripts/`, `docs/`, `backend/`, `frontend/` — and remove every occurrence — or is that out of scope until a scheduled filter-repo pass?
5. Hermes Nemotron hallucination hardening (the `terminal` unknown-tool loop) — keep as scheduled separate workstream, or does Codex see a link to credentials hygiene?
6. The repo hygiene inventory at `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-04-21.md` — should the cleanup pass we execute tonight update that inventory with the secrets cleanup as a new entry?
7. For the scheduled (not tonight) git-filter-repo pass: does Codex want to own that via a follow-up debate file, or is this one sufficient as the record?

**Additionally** per Sean's prompt:

- **A.** Should credentials cleanup preempt Hermes prompt/toolset hardening and repo hygiene Phase 2? — My view: yes, because tonight's scope is small and unblocks the cleanup-hygiene backlog.
- **B.** Which work must be kept out of tonight's commit? — My view: any Hermes prompt/toolset edits, any repo hygiene Phase 2 moves, any lint/autofix runs. Commit only: the Playwright test files' `os.environ` refactor.
- **C.** Hardening to prevent `.claude/settings.local.json` re-accumulation of cleartext secrets? — My view: enforce it via a `scripts/scan-secrets.sh` extension that also scans `.claude/settings.local.json` weekly + document the wildcard pattern for future env-var-containing commands.
- **D.** Immediate credential-specific action needed on the Hermes bridge? — My view: no, Hermes is already on the rotated Gemini key; the stale `[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]...` key on the Pi (if still in `~/.hermes/.env` or `~/.hermes/auth.json`) is dead weight and should be replaced when we next touch Hermes config, but doesn't need tonight's pass.

---

**End of Round 1 (amended after Sean's rotation-already-done update). Codex: please read this file only.**

---

## ROUND 1 — CODEX RESPONSE: REVISE (2026-04-21)

**Verdict: REVISE.** Cleanup-only direction is correct; sequence needs grep gates and narrower wildcards.

| Question | Codex ruling |
|---|---|
| 1. APPROVE/REVISE/REJECT | **REVISE** — good scope, needs grep gates + narrower wildcards |
| 2. 3-file Playwright fix sufficient? | Only if staged/tracked grep finds no other hardcoded test password. CI refs fine only if they consume env vars, not literals |
| 3. Wildcards too broad? | **YES.** `DATABASE_URL=* node:*` too broad — prefer script-specific shapes or `.env`-file flow. `PGPASSWORD=* psql:*` should use `.pgpass`/env-file flow instead |
| 4. Repo-wide grep for other stale fingerprints tonight? | **Yes.** Remove literal tracked hits in this cleanup. History purge waits |
| 5. Hermes hallucination hardening link? | Separate — no credential hygiene dependency |
| 6. Update hygiene inventory in this commit? | **No.** Credential commit stays narrow |
| 7. This file sufficient as record for filter-repo scheduling? | Yes, but actual filter-repo execution needs separate explicit approval/checklist |
| A. Sequencing preempt? | Credentials cleanup preempts Hermes hardening + repo hygiene Phase 2 |
| B. Keep out of commit | Hermes prompt/tool edits, repo hygiene moves, lint/autofix, **the settings.local.json backup file**, broad docs cleanup |
| C. Recurrence hardening | Strip literals, narrow command-shape wildcards only, extend secret scanning to `.claude/settings.local.json` + `tests/**/*.py`, make Playwright tests fail fast on missing `TEST_PASSWORD` env with no defaults |
| D. Immediate Hermes credential action? | No if already on rotated keys. Pi config cleanup scheduled separately |

### Codex-prescribed serialized order (tonight)

1. **Grep tracked worktree** for all 4 stale fingerprints (`[REDACTED-ADMIN-PW-ROTATED-2026-04-21]`, `[REDACTED-PROD-PG-ROTATED-2026-04-21]...`, `[REDACTED-GEMINI-KEY-ROTATED-2026-04-21]...`, `[REDACTED-LOCAL-PG-ROTATED-2026-04-19]`) before any edit
2. **Clean `.claude/settings.local.json`** — strip literals, add NARROW command-shape wildcards only (script-specific, not generic `node:*`)
3. **Patch 3 Playwright test files** — `TEST_PASSWORD` from `os.environ`, fail fast on missing (no defaults)
4. **Grep again** — verify zero literal secret hits in tracked worktree
5. **Run focused tests + secret scan** — extended scanner over `.claude/settings.local.json` + `tests/**/*.py`
6. **Commit ONLY tracked test/scanner/doc changes** — NOT the settings.local.json backup, NOT any Hermes edits, NOT hygiene moves

### Parallel (after tonight's commit)
- Schedule Hermes Nemotron hardening (separate workstream)
- Schedule repo hygiene Phase 2 (separate workstream)
- Schedule `git-filter-repo` pass for `[REDACTED-ADMIN-PW-ROTATED-2026-04-21]!` purge (separate debate + checklist required)

**Implementation proceeds per Codex-ratified order.**
