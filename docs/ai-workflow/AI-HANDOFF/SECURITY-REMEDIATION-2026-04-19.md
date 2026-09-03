# Security Remediation Session — 2026-04-19

**Incident:** `.claude/settings.local.json` tracked in public GitHub repo since 2025-10-29, exposing live production credentials for ~6 months.

**Response:** Full credential rotation + git history purge in single session. All credentials rotated, all secrets purged from git history, `.gitignore` hardened to prevent recurrence.

**Status:** COMPLETE on GitHub-side. Old history still exists in any clones made before 2026-04-19 18:30 Pacific — not reachable from GitHub anymore.

---

## Exposed Credentials (all rotated)

| Credential | Old Value (prefix only) | Rotation Status |
|---|---|---|
| Render PostgreSQL password | `[REDACTED_OLD_PG_SECRET]` | ✅ Rotated via Render dashboard. User `swanadmin` replaced with `swanadmin2`. Old credential deleted. |
| Gemini API key | `[REDACTED-GEMINI-KEY-PREFIX-ROTATED-2026-04-19]` | ✅ Revoked in Google AI Studio. New key deployed on Render env + Pi Hermes (`auth.json` + `.env` `GOOGLE_API_KEY`) |
| JWT_SECRET | (not exposed directly, but tokens were) | ✅ Regenerated on Render. All existing admin/user tokens invalidated |
| JWT_REFRESH_SECRET | (not exposed directly) | ✅ Regenerated on Render |
| Local Postgres password | `[REDACTED_OLD_SECRET]` | ✅ Rotated to random 24-char via `ALTER USER swanadmin PASSWORD ...`. Updated `backend/.env`. |
| Test user password | `[REDACTED_OLD_SECRET]` | ⚠️ Deferred — `vickievaldez` test user to be deleted from production DB in a separate pass |
| 4+ admin JWT tokens in the file | Various prefixes | ✅ Invalidated by JWT_SECRET rotation |

## Git History Purge

- **Tool:** `git-filter-repo` v2.47.0 (pip-installed to `%APPDATA%\Roaming\Python\Python312\`)
- **Commits processed:** 2,179
- **Runtime:** 8.43 seconds
- **Operations:**
  - `--path .claude/settings.local.json --invert-paths` — removed file from every commit
  - `--replace-text /c/tmp/purge-credentials.txt` — replaced each exposed credential string with `***REDACTED-*...***` across all blobs and branches
- **Pre-purge HEAD:** `ab8bee0f` (last good commit before the security work)
- **Pre-push commit (added .gitignore + untrack):** `4336abb4`
- **Post-purge HEAD:** `302c6fa3` (same commit, new SHA because history rewritten)
- **Force push:** `git push origin main --force` + `git push origin --force --tags`
- **Origin remote:** had to be re-added manually (git-filter-repo removes it for safety)

## Verification (all returned zero results)

```bash
git log --all -p -S "[REDACTED_SECRET]" --all    # empty
git log --all -p -S "[REDACTED_SECRET]" --all    # empty
git log --all -p -S "[REDACTED_SECRET]" --all    # empty
git log --all -p -S "[REDACTED_SECRET]" --all    # empty
git log --all --full-history -- .claude/settings.local.json    # empty
```

## Hermes Pi Cleanup

- **Session dump purge:** 9 `request_dump_*.json` files deleted from `~/.hermes/sessions/` (all contained old Gemini key in `Authorization` header + conversation body)
- **Session state files:** 17 `session_*.json` files LEFT IN PLACE — grep confirmed they do NOT contain the old key prefix `[REDACTED-GEMINI-KEY-PREFIX-ROTATED-2026-04-19]`. They hold Hermes conversation memory, valuable. PII audit deferred.
- **Hermes auth.json:** `gemini` credential was auto-pruned by Hermes when the old key failed. Rebuilt from scratch with new key + fresh ID.
- **`.env` cleanup:** Orphan `AIza` line removed, duplicate `EXA_API_KEY` deduplicated, `GOOGLE_API_KEY` now set correctly.

## `.gitignore` Hardening

Added comprehensive credential protection block (bottom of file, under "CREDENTIAL PROTECTION — added 2026-04-19 after settings.local.json leak"). Covers:

- `.claude/settings.local.json` (the leak source) + `.claude/projects/`, `.claude/memory/`, `.claude/todos/`
- More thorough `.env.*` patterns with allowlist for `.env.example`
- SSH keys: `id_rsa*`, `id_ed25519*`, `*.pem`, `*.key`, `*.pfx`, etc.
- Cloud credentials: `.aws/`, `.azure/`, `.gcloud/`, `service-account*.json`
- API key configs: `.npmrc`, `mcp.json`, `claude_desktop_config.json`
- Infrastructure: `*.tfstate`, `terraform.tfvars`, `*.vault`, K8s secret YAML
- Token dumps: `*.token`, `admin-token.json`, `*.jwt`, `bearer-token.*`

## WIP Stash State (for future session recovery)

Before the history rewrite, a stash was created to preserve Sean's uncommitted work:

- **Stash message:** `security-remediation-2026-04-19-pre-filter-repo`
- **Stashed files:** ~548 (81 modified, 349 deleted, 106+ untracked)
- **Stash status:** POPPED successfully after history rewrite. No merge conflicts.
- **Older stash still present:** `stash@{0}: WIP on main: 26ea77a5 fix: Resolve theme variable naming conflict in header` (untouched, likely months old)

## Backup Location

Sean created a full folder-level backup BEFORE the history rewrite at:

```
<HOME>\Videos\SS-PT
```

Contains pre-purge state including the old `settings.local.json` if needed for any reason (which it should not be — all creds rotated).

## Remaining Follow-up Items

**Sean tasks (GitHub UI):**
1. Make the repo private (Settings → General → Danger Zone → Change visibility → Private)
2. Enable GitHub Secret Scanning + Push Protection (Settings → Code security and analysis)

**Production DB cleanup (deferred, separate pass):**
3. Delete `vickievaldez` test user from production Postgres (was the test account with exposed `[REDACTED_OLD_SECRET]` password)

**Hermes hardening (nice-to-have, deferred):**
4. Patch `run_agent.py` to redact `Authorization` header before writing `request_dump_*.json` files (prevents future key leaks if Hermes errors out mid-request)

**Going forward:**
5. Sean will use Bitwarden for password management
6. Never paste secrets into chat (teaching incident from this session — a briefly-used random password was accidentally pasted and had to be re-rotated)

## Lessons for CLAUDE.md

1. **Allow-lists in `.claude/settings.local.json` accumulate credentials** because Bash commands with passwords/tokens pasted as one-offs get auto-added when user clicks "Allow". Rule of thumb: NEVER paste a secret into a shell command, always use env vars (`$VAR`) or interactive prompts (`read -s`, `getpass`).
2. **Windows has two PowerShell contexts** (elevated vs non-elevated) that each see different network drives. SMB mounts from elevated PowerShell don't appear in Explorer.
3. **`.env` files often have multiple variable names for the same value** (`GEMINI_API_KEY` was commented "alias for GOOGLE_API_KEY" — the ACTIVE name is what matters).
4. **zsh `read -p` syntax differs from bash.** Cross-shell scripts should use Python's `getpass` module instead for prompts.
5. **git-filter-repo needs `echo Y |` prefix** when rerun on a previously-rewritten repo to bypass the "already ran" prompt in non-interactive contexts.
6. **After git-filter-repo, `origin` remote is auto-removed** for safety. Must re-add before force push.

---

*Compiled during active remediation session. Claude Opus 4.7 orchestrating. Future sessions: if any file/reference is unclear, start with this doc before digging into git history.*
