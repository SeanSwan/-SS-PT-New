# Continuity Bridge — Schema and Rules

> **Created:** 2026-04-22 by Phase B (`docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md`)
> **Purpose:** Cross-surface session-state bridge for the 4 agent surfaces (VS Code Claude, VS Code Codex, Hermes-Telegram Claude, Hermes-Telegram Codex).

## Files in this directory

| File | Tracked? | Purpose |
|---|---|---|
| `README.md` | ✅ tracked | This file. Schema + rules. |
| `rolling-last-done.md` | ❌ gitignored | Append-only session closeout log. 30 KB cap. Trimmed in place. |
| `append.lock` | ❌ gitignored | File lock for concurrent append protection. Auto-managed by append script. |

The curated counterpart `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` is **tracked** and lives outside this directory because it's human-curated knowledge, not runtime state.

## How to append

```bash
SWAN_AGENT_SURFACE=vs-claude node scripts/continuity-append.mjs \
  --topic "<short topic>" \
  --files "<comma,sep,file,list>" \
  --outcome "<brief outcome>" \
  --notes "<longer notes; may include <!-- PROMOTE: ... --> markers>"
```

Required env var: `SWAN_AGENT_SURFACE` ∈ `{vs-claude, vs-codex, tg-claude, tg-codex}`.

Trigger: ONLY when Sean explicitly says `"log this and close"` or `"session closeout"`. Agents do not auto-append.

## How to read

All four surfaces should read at session start:
1. `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
2. `.ai-workflow/continuity/rolling-last-done.md` (this directory)
3. `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md`
4. Run `scripts/continuity-promotions.sh --count` — if N > 0, mention the backlog.

## Promotion workflow

Agents may include `<!-- PROMOTE: <reason> -->` markers in the `notes` field. These are SUGGESTIONS — Sean reviews periodically and curates promoted entries into `CONTINUITY-GOOD-IDEAS.md`.

Promotion is human-only. No automation.

```bash
scripts/continuity-promotions.sh           # list pending PROMOTE markers
scripts/continuity-promotions.sh --count   # integer count (used by startup-read)
```

## Trim rule

When `rolling-last-done.md` exceeds 30 KB:
1. Header preserved (first ~1 KB).
2. Newest 60% of remaining content preserved.
3. Middle dropped, replaced with `--- TRIM EVENT YYYY-MM-DDTHH:MM:SSZ — dropped <N> KB middle ---`.
4. Atomic write: `.tmp` → fsync → rename.

Recently-curated PROMOTE markers should be processed BEFORE they age out via trim. The append script's success output reports pending count.

## Sanitizer (Layer 1 + Layer 2)

**Layer 1 — Secret patterns (HARD FAIL):** scan candidate via `scripts/scan-secrets.sh --stdin`. Hits print pattern name + field name only (matched content never echoed). Append refuses with non-zero exit on hit.

**Layer 2 — Path/PII scrubs (auto-transform):**
- All shapes of `<HOME>\` → `<USER_HOME>` (Windows backslash, forward slash, JSON-escaped, lowercase, WSL `/mnt/c/`, Git-Bash `/c/`, extended `\\?\C:\`)
- Standalone username `<OPERATOR>` → `<USER>`
- Hostname/IP scrubs from `scripts/continuity-config.json` (Tailscale node names, Pi hostnames, Pi IPs)

`scripts/continuity-config.json` is tracked and should keep placeholder values. Put real local infrastructure identifiers in gitignored `scripts/continuity-config.local.json`. The append script reads `.local.json` when present and falls back to the tracked template otherwise. Placeholder checks run against whichever config file was loaded.

The unredacted candidate NEVER touches disk. Sanitizer runs in-memory only.

## Lock policy (strict)

- Atomic acquire: `fs.open(lockPath, 'wx')` create-exclusive.
- On EEXIST: exponential backoff (50ms doubling, 5s total).
- Stale-lock release ONLY when same-runtime+host PID probe proves the holder is DEAD. Age alone never releases.
- Cross-namespace (different runtime or host) always fails loud — no automatic release.
- Operator override: `--force-stale-release` flag.

## Implementation reference

See `docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md` for the full architecture, Codex review chain (6 rounds → APPROVE), and decision rationale.
