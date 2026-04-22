# Hermes Daemon — Phase B Continuity Patch Record

> **Created:** 2026-04-22
> **Author:** Claude Opus 4.7 (CEO) + Sean executive apply
> **Purpose:** Durable record of Pi-side Hermes daemon patches for Phase B continuity bridge. These files live OUTSIDE the SwanStudios git tree (on the Hermes Pi at `~/.hermes/hermes-agent/`), so this handoff is the canonical record.
> **Parent debate:** `docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md` §4.3
> **Privacy note:** This document uses placeholder tokens for real infrastructure identifiers (Tailscale targets, hostnames, IPs, user paths). Real values live in `scripts/continuity-config.local.json` (gitignored) on the Windows side, and in `tools/remote_ai_bridge_tool.py` SSH_TARGET constant on the Pi side. Both surfaces keep their identifiers off tracked history.

---

## 1. Context

Phase B needed the Hermes-Telegram agents (tg-claude, tg-codex) to read 3 continuity files at session start and prepend them to the system prompt. The Pi cannot directly access the Windows filesystem (Chunk 3.1 smoke: WSL `/mnt/c/...` from Pi returned `exit=2 readable=1` — Path A ruled out). So the daemon uses **Path B** per debate §4.3: shell out to the existing SSH/tmux bridge to `cat` each file on the Windows WSL side.

---

## 2. Files patched (Pi-side, NOT in git tree)

### 2.1 `~/.hermes/hermes-agent/run_agent.py`

**Backup taken:** yes (during Chunk 3.2 apply; exact filename pattern: `run_agent.py.bak-continuity-<timestamp>` + later `run_agent.py.bak-continuity-log-<timestamp>` for the diagnostic log apply/remove cycle).

**What changed:**

1. **New helper:** `_build_continuity_bridge_context(self)` — reads 3 continuity files via the existing SSH bridge pattern from `tools/remote_ai_bridge_tool.py` (`SSH_TARGET` constant — Tailscale SSH from Pi to Windows side). Session-lifetime cache stored on `self._continuity_bridge_context_cache`. On read failure: single warning to daemon log, returns `""` (fail-soft per debate §4.3).

2. **Integration point:** inside `_build_system_prompt()` (called once per session, cached on `self._cached_system_prompt` per the code comment at run_agent.py:3353). The helper's output is appended to the system prompt as a final context section.

3. **Rationale for insertion point:** patching the three API-call sites (lines ~7060, 8079, 8690) would prepend repeatedly across special calls (memory flush, max-iteration summary, normal turns). The once-per-session build point at `_build_system_prompt()` matches Phase B's startup-read design.

**Files read by the helper (via SSH/cat):**
- `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
- `.ai-workflow/continuity/rolling-last-done.md`
- `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md`

**All paths relative to the SwanStudios repo on the Windows WSL side** (`<SWAN_REPO_WSL_PATH>` placeholder; real path lives in `tools/remote_ai_bridge_tool.py` and per-shell environment). The helper prepends a short framing string: `"SwanStudios continuity bridge context. Use this as recent cross-surface state, but do not quote or expose it unless Sean asks."` to avoid the agent leaking the continuity log verbatim in unrelated responses.

### 2.2 `~/.codex/AGENTS.md` (Windows side, but tracked separately)

**Backup:** `~/.codex/AGENTS.md.bak-sentinel-20260422-102636` (empty-pre-state preserved)

**Applied content:** real Phase B `vs-codex` startup directive. Current content in file as of 2026-04-22 10:34 AM local.

---

## 3. Verification path

### 3.1 Path B file-access smoke (Chunk 3.1)

Direct WSL-mount probe from the Pi:

```bash
# Generic shape — substitute real <SWAN_REPO_WSL_PATH> per local config
ls -la <SWAN_REPO_WSL_PATH>/CLAUDE.md       # exit=2, "No such file or directory" → Path A ruled out
test -r <SWAN_REPO_WSL_PATH>/.ai-workflow/continuity/README.md   # readable=1 (fail) → Path A confirmed unavailable
```

Path B SSH/cat confirmed working during later direct-read smoke (retrieved `rolling-last-done.md` rc=0 + `SENTINEL_FOUND` match through the existing `remote_ai_bridge_tool.py` SSH path).

### 3.2 Daemon integration smoke (Chunk 3.3)

After patch + `sudo systemctl restart hermes-gateway.service`:

1. Append a sentinel entry to rolling log from a VS Code surface (`HERMES_PREPEND_WORKS_2026_04_22` instruction in `--notes`).
2. Reset Telegram session pointer: delete keys matching `telegram` + `dm` from `/home/<pi-user>/.hermes/sessions/sessions.json`.
3. Restart `hermes-gateway.service`.
4. Send prompt via Telegram: `"Without using tools, answer exactly the sentinel phrase from your startup continuity context."`
5. **PASS:** Hermes returns `HERMES_PREPEND_WORKS_2026_04_22` with no tool calls.

**Result 2026-04-22 20:28 UTC:** PASS.

### 3.3 Four-surface end-to-end smoke (Chunk 4.3)

After real Phase B closeouts seeded from both VS Code surfaces:

1. Reset Telegram session pointer + restart service (cache-bust).
2. Send: `"Without using tools, summarize the two most recent continuity entries from your startup context."`
3. **PASS:** Hermes cites both vs-claude and vs-codex Phase B closeouts with correct timestamps, surfaces, topics, outcomes, and follow-ups. No tool calls.

**Result 2026-04-22 ~20:40 UTC:** PASS.

**Note:** tg-claude and tg-codex share `_build_system_prompt()` code path, so one surface's pass = daemon code path verified. Per Sean's call, this is sufficient for Phase B closeout — marked as "Hermes daemon code path verified" rather than "two independent Telegram model surfaces verified."

---

## 4. Rollback procedure

If continuity prepend misbehaves:

```bash
# On Pi
cd ~/.hermes/hermes-agent
# Find the most recent pre-continuity backup
ls -t run_agent.py.bak-continuity-* | head -1
# Restore
cp run_agent.py.bak-continuity-<timestamp> run_agent.py
python3 -m py_compile run_agent.py && echo "SYNTAX OK"
sudo systemctl restart hermes-gateway.service
```

Backup files live alongside `run_agent.py` in `~/.hermes/hermes-agent/`. No git history on the Pi for these patches; backups are the only rollback surface.

---

## 5. Known trade-offs

1. **Session-lifetime cache** — debate §4.3 accepted. New appends from other surfaces aren't visible in existing Hermes Telegram sessions until the session ends / is reset. Accepted because per-turn SSH re-reads would add latency + network-blip failure surface.

2. **Pi has no git tree for these patches** — any future change to `run_agent.py` or `~/.codex/AGENTS.md` needs manual re-apply. This handoff doc is the canonical spec. Consider turning these into a versioned deploy script if the pattern extends.

3. **`SSH_TARGET` lives in `tools/remote_ai_bridge_tool.py`, not in a config file** — single source of truth on the Pi. If the Windows Tailscale endpoint changes, one file to update on the Pi side. Not duplicated into this handoff to keep tracked-history identifier-free.

4. **Service restart needed** to pick up code changes. `reload` doesn't suffice for Python module re-import. Standard `sudo systemctl restart hermes-gateway.service` + 5s wait.

---

## 6. Dependencies

- Existing `~/.hermes/hermes-agent/tools/remote_ai_bridge_tool.py` infrastructure (SSH key-based auth from Pi to Windows WSL via `<WINDOWS_TAILSCALE_SSH_TARGET>` — real value in that script, not here)
- Windows Tailscale running + reachable from Pi
- WSL running on Windows side with SwanStudios repo at `<SWAN_REPO_WSL_PATH>` (real path in environment + `tools/remote_ai_bridge_tool.py`)
- `scripts/continuity-config.local.json` on Windows side filled with real Tailscale/Pi identifiers (gitignored)

If any of these break, the Hermes prepend fails soft (single warning) and sessions proceed without continuity context.

---

## 7. Placeholder vocabulary

For consistency across this doc and future Pi-side handoffs:

| Placeholder | Real value lives in | Meaning |
|---|---|---|
| `<WINDOWS_TAILSCALE_SSH_TARGET>` | `~/.hermes/hermes-agent/tools/remote_ai_bridge_tool.py` `SSH_TARGET` constant | `user@tailscale-ip` for Pi → Windows SSH |
| `<WINDOWS_TAILSCALE_IP>` | same | the bare IP without user prefix |
| `<SWAN_REPO_WSL_PATH>` | shell environment + same SSH target's WSL filesystem | absolute WSL path to SwanStudios repo |
| `<HERMES_PI_HOST>` | Pi `/etc/hostname` | Hermes Pi hostname |
| `<USER_HOME>` | Windows `%USERPROFILE%` / Linux `$HOME` | user home dir on whichever surface |
| `<USER>` | Windows username / Linux `$USER` | account name |

These match the Layer-2 sanitizer scrubs in `scripts/continuity-append.mjs` so anything that survives an append's redaction won't reintroduce real identifiers when Hermes-Telegram cites continuity entries verbatim in chat.
