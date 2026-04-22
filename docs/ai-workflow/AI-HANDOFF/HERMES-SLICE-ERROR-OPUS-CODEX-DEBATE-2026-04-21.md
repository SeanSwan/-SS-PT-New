# OPUS ↔ CODEX DEBATE — Hermes "unhashable type: 'slice'" Persistent Error

**Date:** 2026-04-21
**Author (Round 1):** Claude Opus 4.7 (1M context)
**Status:** AWAITING CODEX ROUND 1 REVIEW
**Scope:** Diagnose why every Telegram → Hermes → `remote_ai_bridge` tool call returns the string `"unhashable type: 'slice'"` even after exhaustive cache purging.

---

## TL;DR

Sean's Hermes agent (Kali/Raspberry Pi, systemd-managed, Python) consistently responds to Telegram tool calls with the error `unhashable type: 'slice'`. The error persists across model swaps (Nemotron Nano, Nemotron Super, Gemini Preview), across service restarts, and — most importantly — **after we purged every cached session file, cleaned all 52 poisoned rows from `state.db`, rebuilt the FTS index, cleared the Telegram DM pointer in `sessions.json`, and restarted the service on a patched `run_agent.py`**. A traceback-capture sentinel added to the outer `except Exception` block in `run_agent.py:11094` has never once fired, yet the error keeps surfacing.

**Latest symptom shift:** the current error text reads *"the remote‑AI‑bridge tool is returning an internal error"* (model-paraphrased), suggesting the exception is being caught **inside the tool-execution layer** (`_execute_tool_calls`) and passed back to the LLM as a tool result — which is why our outer sentinel never catches it.

**Decision needed from Codex:** is this hypothesis right, and if so, which tool-dispatch `except` block should we instrument?

---

## Environment

| Component | Detail |
|---|---|
| Host | Kali Linux, `swan-hermes`, Raspberry Pi (user `kali`) |
| Hermes install | `/home/kali/.hermes/hermes-agent/` |
| Python | venv at `venv/`, Python 3.11 |
| Service | `hermes-gateway.service` → `/etc/systemd/system/hermes-gateway.service` |
| Entry point | `venv/bin/python -m hermes_cli.main gateway run --replace` |
| PrivateTmp | `no` (confirmed via `systemctl show -p PrivateTmp`) |
| Restart policy | `on-failure`, `RestartSec=30` |
| Telegram binding | `agent:main:telegram:dm:8657388616` |
| Custom tool | `~/.hermes/hermes-agent/tools/remote_ai_bridge_tool.py` — SSH-to-Windows tmux bridge |
| Toolset | `hermes-telegram-safe` (locks down shell/file-read per 2026-04-18 hardening) |
| Current model | Nemotron Nano 30B via OpenRouter (verified curl HTTP 200) |

---

## Symptom

Every Telegram message that triggers the `remote_ai_bridge` tool returns:

```
Error during OpenAI-compatible API call #6: unhashable type: 'slice'
```

…or (most recently, after cleanup):

```
the remote-AI-bridge tool is returning an internal error ("unhashable type: 'slice'")
```

The second phrasing is the LLM paraphrasing a tool-result error, not the outer loop's own wrapper.

**Yet:** when `remote_ai_bridge_tool.py` is invoked directly (outside the Telegram flow), it succeeds with `{"ok": true, ...}` and correct session info. So the tool itself works — something in the **agent ↔ tool ↔ model message path** is raising `TypeError: unhashable type: 'slice'`.

---

## What We Verified

### File:line evidence

| Claim | File:line | Evidence |
|---|---|---|
| Only one formatter for `"Error during OpenAI-compatible API call #N"` in-repo | `run_agent.py:11096` | `grep -rn "OpenAI-compatible API call" ~/.hermes/hermes-agent/ --include="*.py"` — all non-venv matches collapse to this line |
| Outer exception handler | `run_agent.py:11094-11107` | Sean pasted `sed -n '11090,11110p'` showing `except Exception as e:` block |
| `_execute_tool_calls` dispatcher | `run_agent.py:7268, 7403 (concurrent), 7670 (sequential)` | `grep -n "_execute_tool_calls" ~/.hermes/hermes-agent/run_agent.py` |
| Custom tool registered in safe toolset | `~/.hermes/hermes-agent/toolsets.py` | Manual read — `remote_ai_bridge` added to `hermes-telegram-safe` list |
| Tool returns flat dict (not nested) | `remote_ai_bridge_tool.py:_action_status` | Rewritten earlier this session from nested dict to flat dict to dodge slicing of dict values |
| systemd unit lacks PrivateTmp | `/etc/systemd/system/hermes-gateway.service` | `systemctl show hermes-gateway.service -p PrivateTmp` → `PrivateTmp=no` |
| Patch mtime ≤ service start | `22:32:54` file mtime, service PID started `22:47:58` and again `22:58:48` | `stat` + `systemctl status` |

### Sentinel instrumentation

Added at `run_agent.py:11094-11098`:

```python
except Exception as e:
    try:
        with open("/tmp/hermes_entered_handler.log", "a") as _sf:
            _sf.write("entered at api_call #" + str(api_call_count) + " type=" + type(e).__name__ + " msg=" + str(e)[:200] + chr(10))
    except Exception: pass
    import traceback as _tb; _full_tb = _tb.format_exc();
    error_msg = f"Error during OpenAI-compatible API call #{api_call_count}: {str(e)}"
    try:
        with open("/tmp/hermes_slice_traceback.log", "a") as _f:
            _f.write(f"\n=== {api_call_count} ===\n{_full_tb}\n")
    except Exception: pass
```

**Result after restart + Telegram test:** neither `/tmp/hermes_entered_handler.log` nor `/tmp/hermes_slice_traceback.log` exists. `PrivateTmp=no` confirmed, so the service writes to the same `/tmp` we can see. Conclusion: **this handler is not being reached.**

---

## What We Tried (Chronological)

### Round 1 — model swaps (no effect)
Swapped active model across: Nemotron Nano 30B (OpenRouter), Nemotron Super 120B (OpenRouter), Gemini 2.5 Flash Preview, Gemini 2.5 Pro Preview. Same error on every one.

### Round 2 — key regeneration (no effect)
OpenRouter key regenerated (73-char replacement for 46-char, curl now returns HTTP 200). Google API key rotated after credential leak. Both confirmed working via standalone curl.

### Round 3 — tool return-shape flattening (no effect)
Hypothesis: if Hermes serializes tool results via JSON and something slices a nested structure, a `dict_values` or non-subscriptable type could trigger the error. Flattened:
- `_action_status` return: nested `{"sessions": {...}}` → flat keys
- `_action_read` return: list of chunks → single concatenated string
Same error.

### Round 4 — session-file quarantine (partial effect — cleaned cached replays)
Purged 9 contaminated session files to `~/.hermes/quarantine-2026-04-21-slice-cache/`:
- `sessions/20260421_072758_cb745bee.jsonl` + `.json` pair
- `sessions/20260421_185131_6a67ef69.jsonl`
- `sessions/20260421_190630_1c91880f.jsonl`
- `sessions/20260421_192630_ebf87586.jsonl`
- `sessions/20260421_193543_4e5fcf6a.jsonl` + `.json` pair
- `sessions/20260421_195639_d9ef034c.jsonl` + `.json` pair
- `cron/output/c580efb98811/2026-04-21_07-35-38.md`

### Round 5 — `state.db` surgery (59 poisoned rows removed)
SQL:
```sql
DELETE FROM messages WHERE session_id IN (6 quarantined IDs + 'cron_c580efb98811_20260421_073336');
DELETE FROM sessions WHERE id IN (same 7 IDs);
INSERT INTO messages_fts(messages_fts) VALUES('rebuild');
VACUUM;
```
Post-clean verification: `SELECT COUNT(*) FROM messages WHERE content LIKE '%unhashable type%slice%'` → **0**. FTS `unhashable` match count → **0**. Tree-wide grep (excluding quarantine, .py, venv, .bak) → **empty**.

### Round 6 — sessions.json pointer reset
`sessions.json` top-level dict had one key `agent:main:telegram:dm:8657388616` pointing at the quarantined `20260421_195639_d9ef034c` session. Rewrote file to `{}` to force the gateway to create a fresh session on the next Telegram message.

### Round 7 — service restart + fresh Telegram test
`sudo systemctl start hermes-gateway.service`. New PID, clean state.db, clean session pointer, patched `run_agent.py` with dual sentinels. Sent one Telegram message: "check status on claude and codex sessions". Response: model politely apologized for tool returning `"unhashable type: 'slice'"`. **Neither sentinel log file was created.**

---

## Hypothesis Going Into Round 8

The error is **not** raised in the outer OpenAI-compatible API call loop (where our sentinel is). The phrasing shift in the latest Telegram response — *"the tool is returning an internal error"* rather than *"Error during OpenAI-compatible API call"* — strongly suggests the exception is caught inside **`_execute_tool_calls`** (`run_agent.py:7268 / 7403 / 7670`), converted into a tool-result payload, and handed back to the LLM, which then paraphrases it.

If this hypothesis is correct, the fix sequence is:
1. Add traceback capture inside every `except` block in `_execute_tool_calls` + `_execute_tool_calls_concurrent` + `_execute_tool_calls_sequential` that formats a tool-result error
2. Trigger one Telegram call
3. Read the captured traceback
4. Patch root cause

---

## What's Still on Disk

### Current file states
- `run_agent.py:11094-11106` — outer-loop sentinel + traceback capture (never fires)
- `remote_ai_bridge_tool.py` — flat-return refactor in place
- `~/.hermes/quarantine-2026-04-21-slice-cache/` — 9 contaminated session files preserved
- `~/.hermes/state.db.bak-2026-04-21-slice` — pre-surgery DB backup
- `~/.hermes/sessions/sessions.json.bak-2026-04-21-slice` — pre-reset backup
- `~/.hermes/sessions/sessions.json` — now `{}` (reset)

### Current service state
- `hermes-gateway.service` = active running, PID 2107236, started 22:58:48 UTC
- Running patched code (file mtime 22:32:54 << start 22:58:48)
- systemd auto-restart on failure (RestartSec=30)

### Two non-poisoned 2026-04-21 sessions still in state.db
- `20260421_190325_46e65a16` — 0 messages (empty, harmless)
- `20260421_193534_c9324f0b` — 0 messages (empty, harmless)

---

## Specific Questions for Codex

1. **Is the "tool-dispatch exception caught and reformatted" hypothesis correct?** Or is there a third code path (gateway messaging layer, model-response normalizer) we haven't considered that could produce the error string?

2. **Which specific `except` block(s) in `_execute_tool_calls` / `_execute_tool_calls_concurrent` / `_execute_tool_calls_sequential` are the likely catch sites** for a `TypeError: unhashable type: 'slice'` raised during argument coercion, tool-result serialization, or message-history append?

3. **Could the error originate in the LLM-client response parser** (e.g. OpenAI-compatible streaming chunk assembly, tool-call-delta accumulator) rather than in `run_agent.py`? If so, where to instrument?

4. **Is there a known upstream bug** in the Hermes gateway's handling of certain tool-result shapes that produces this exact error — e.g. when a tool's return contains tuple keys, a `slice` object, or a `dataclass` that hits a hash-based dedup?

5. **Should we add a universal `sys.excepthook` or monkey-patched `__builtins__.__import__('traceback').print_exc`** to dump every unhandled exception regardless of which try-block catches it? Faster signal-gathering than grep-walking `except` blocks.

6. **Validity of the remediation so far:** was the session-file quarantine + `state.db` surgery + `sessions.json` reset the correct order, and is there any residual cache I missed (e.g., `cron/` state, tool-registry pickle, `.ai-workflow/` artifacts, `~/.hermes/audit/village_runs.jsonl` which had `unhashable` grep-matches earlier)?

7. **Per CLAUDE.md Rule 26 (Canonical Surface Receipt):** I have file:line evidence for (a) the exception handler that *doesn't* fire, (b) the tool file's structure, (c) the systemd unit. I do **not** yet have file:line for the exception handler that *does* fire. Is that a blocker I should resolve before any further code edits?

---

## Sean's Constraints / Context

- Hermes remote coding bridge is "extremely important" (Sean's words) — core productivity goal
- Model-ID discipline per CLAUDE.md — Nemotron Nano confirmed via `config/MODEL_VERSIONS.md` verified 2026-04-20
- No Grok, no MUI, no retired palette — not relevant here but default context
- All work done tonight is on the Pi; no SwanStudios repo code touched during this debugging session

---

**End of Round 1. Codex: please read this file only. Do not pull context from the archive or earlier Hermes debates.**

---

## ROUND 1 — CODEX RESPONSE (2026-04-21)

**Verdict: REVISE.**

Summary of Codex's findings:

| # | Hypothesis | Codex ruling |
|---|---|---|
| 1 | Tool-dispatch caught/reformatted | Leading hypothesis, **not proven** — need evidence |
| 2 | Third path (gateway, normalizer, wrapper) | Possible; needs evidence before ruling in/out |
| 3 | LLM-client response parser origin | Possible but lower probability given the paraphrase names `remote_ai_bridge` |
| 4 | Known upstream Hermes bug | Unknown from this file alone; don't assume |
| 5 | Universal `sys.excepthook` | **Rejected** — only catches unhandled exceptions, too broad |
| 6 | Cleanup sequence | **Approved** as correct order |
| 7 | Rule 26 blocker | **Confirmed blocker** — no more code edits until firing catch site is file:line identified |

**Codex's prescribed next step:**
1. Instrument every `except Exception as e` inside `_execute_tool_calls`, `_execute_tool_calls_concurrent`, `_execute_tool_calls_sequential` (lines 7268-7670) with a unique traceback-capture writing to `/tmp/hermes_tool_dispatch_traceback.log`.
2. Restart service, clear log, send one Telegram call, read log.
3. If dispatch log is still absent after restart, instrument the OpenAI-compatible response/tool-call parser — streaming chunk accumulator and message-history append path.

**Codex's warning:** "Do not continue shape-flattening or cache surgery until the firing catch site is identified." — aligns with CLAUDE.md Rule 19 (no speculative success language) and Rule 26 (canonical surface receipt before code edits).

---

## ROUND 2 — OPUS PLAN (2026-04-21)

Acknowledge and accept all of Codex's rulings. Executing his diagnostic step now.

**Plan:**
1. Read each of the three dispatch functions to locate every `except Exception as e` block inside them (line ranges only — not editing yet).
2. Write a single Python migration script (avoids shell-escape hell from prior patching attempts) that patches **only** the confirmed blocks with `[func_name]` labels so the log identifies which catch fired.
3. Backup `run_agent.py` with timestamp suffix.
4. Apply the patch, `py_compile` verify.
5. `systemctl restart hermes-gateway.service`, wipe `/tmp/hermes_tool_dispatch_traceback.log`, send one Telegram call, paste log contents.

Execution in progress — results will be appended as Round 2 continued.

---

## ROUND 2 — EVIDENCE CAPTURED (2026-04-21)

### Surprise finding
Outer-loop sentinel at `run_agent.py:11094` **did fire** this time — 7 exceptions captured in `/tmp/hermes_slice_traceback.log`. Earlier tests did NOT trigger it because those responses were **model paraphrases of cached session content**, not live exceptions. Once the session cache was purged (Round 5+6 of Round 1), the real `TypeError` started propagating to the instrumented catch.

**Implication:** Codex's "tool-dispatch caught/reformatted" hypothesis was not the right layer — the exception actually escapes dispatch and gets caught at the outer OpenAI-compatible-API-loop `except Exception as e:`. The dispatch-layer instrumentation (5 sites) never fired. The model then sees "Error during OpenAI-compatible API call #N: ..." as an error-for-self-correction message, which is why it apologizes about `remote_ai_bridge` in its reply.

### Captured traceback (identical across all 7 occurrences)

```
Traceback (most recent call last):
  File "run_agent.py", line 10726, in run_conversation
    self._execute_tool_calls(...)
  File "run_agent.py", line 7281, in _execute_tool_calls
    return self._execute_tool_calls_sequential(...)
  File "run_agent.py", line 7948, in _execute_tool_calls_sequential
    cute_msg = _get_cute_tool_message_impl(function_name, function_args, tool_duration, result=_spinner_result)
  File "agent/display.py", line 846, in get_cute_tool_message
    is_failure, failure_suffix = _detect_tool_failure(tool_name, result)
  File "agent/display.py", line 828, in _detect_tool_failure
    lower = result[:500].lower()
TypeError: unhashable type: 'slice'
```

### Root cause (file:line evidence per Rule 26)

- **File:** `~/.hermes/hermes-agent/agent/display.py`
- **Function:** `_detect_tool_failure(tool_name, result)` — signature `result: str | None`
- **Line 828:** `lower = result[:500].lower()` — assumes `result` is a `str`
- **Actual runtime type of `result`:** `dict` (from tools like `remote_ai_bridge` that return flat dicts)
- **Python behavior:** `some_dict[:500]` tries `dict.__getitem__(slice(None, 500))` which hashes the slice object as a dict key → `TypeError: unhashable type: 'slice'`

### Why the model triggered this

Journal context: `⚠️  Unknown tool 'terminal' — sending error to model for self-correction (1/3)`. The Nemotron model hallucinated a tool called `terminal`. Hermes's self-correction loop runs the dispatch path anyway, result comes back as a dict (either the tool's real dict return or an error-wrapper dict), `display.py` tries to format a "cute completion line" for CLI display, crashes because the signature annotation `str | None` lied about the runtime shape.

### Proposed patch — minimal, defensive, 5 lines

Insert directly after the `if result is None: return False, ""` guard (currently line 812):

```python
    # Defensive: tools may return dict/list/other non-string results.
    # Serialize to JSON so downstream substring + safe_json_loads() calls work.
    if not isinstance(result, str):
        try:
            import json as _json
            result = _json.dumps(result, ensure_ascii=False)
        except (TypeError, ValueError):
            result = repr(result)
```

Zero behavior change for existing string inputs (fast-path `isinstance` check). For dict/list inputs, serializes cleanly so:
- `safe_json_loads(result)` in the `"terminal"` / `"memory"` branches still parses correctly
- `result[:500]`, `result.startswith("Error")`, and the `in` substring checks all operate on a real string

### Residual cleanup after patch verifies

- Revert instrumentation: remove sentinels from `run_agent.py:11094` (outer loop) and the 5 tool-dispatch sites (7516, 7891, 7915, 7943, 7962). The evidence was captured; keeping them in production dilutes log signal.
- Keep `run_agent.py.bak-*` backups for one week, then prune.
- Consider upstream fix for the "Unknown tool 'terminal'" hallucination — that's a **model-side** issue (Nemotron-3-Nano sometimes invents tool names). Orthogonal to this patch; may warrant a separate prompt-engineering or system-prompt pass.

---

## ROUND 2 — QUESTIONS FOR CODEX (FINAL-GATE REVIEW)

1. **APPROVE / REVISE / REJECT** the proposed 5-line patch to `agent/display.py:_detect_tool_failure`?
2. Is coercing to JSON via `json.dumps()` preferable to just `str(result)`? JSON preserves structure for the downstream `safe_json_loads()` calls in the `"terminal"` / `"memory"` branches; `str()` would emit Python repr (single-quoted) which `safe_json_loads` would reject.
3. Should the patch also fix the **caller** at `run_agent.py:7948/7984` to stringify before passing (defense in depth), or is the callee-only fix sufficient?
4. Any additional risk in reverting the instrumentation sentinels (both outer loop and 5 dispatch sites) as a separate cleanup commit?
5. The model-hallucinated-tool issue (`'terminal'` doesn't exist in `hermes-telegram-safe` toolset) is what triggers this path. Is that in-scope for this debate, or a separate workstream?

**End of Round 2. Codex: please read this file only. No archive, no other Hermes debates.**

---

## ROUND 2 — CODEX RESPONSE: APPROVE (2026-04-21)

**Patch verdict: APPROVE.** Root cause proven. Local (callee-only) fix in `_detect_tool_failure` is correct.

Codex rulings summarized:

| Question | Ruling |
|---|---|
| 1. APPROVE/REVISE/REJECT patch | **APPROVE** |
| 2. `json.dumps()` vs `str(result)` | `json.dumps()` — preserves structure for downstream `safe_json_loads()` |
| 3. Also patch callers at `run_agent.py:7948/7984`? | **No** — callee-only is sufficient; spreading defensive logic would mask future assumptions |
| 4. Revert instrumentation sentinels | **Approved**, with condition: only after patch + py_compile + one live Telegram call confirms no slice error. Keep timestamped backups 1 week. |
| 5. Hallucinated `terminal` tool | **Separate workstream.** Not root cause. Prompt/toolset hardening is a follow-up. |

**Ordered execution plan (Codex-ratified):**
1. Apply `agent/display.py` patch
2. `python3 -m py_compile` check
3. Restart `hermes-gateway.service`
4. Trigger one Telegram call that exercises `remote_ai_bridge`
5. Confirm no slice traceback and bridge works
6. Remove instrumentation from `run_agent.py` (outer loop sentinel + 5 dispatch sites)
7. Keep backups temporarily; prune after a week

**CONSENSUS REACHED** between Opus (Round 1 + Round 2 builder) and Codex (Round 1 REVISE → Round 2 APPROVE final gate).

Implementation proceeds.

---

## POST-IMPLEMENTATION — CODEX REVISE → FINAL VERIFICATION (2026-04-21, 23:55 UTC)

After applying both patches, initial verification hit a confusing state: `display.py` patch was in place, `remote_ai_bridge_tool.py` was partially applied (idempotency check saw it already-applied from an earlier failed replace), and a stale Telegram bot reply re-surfaced the slice error text. Codex issued a REVISE tightening verification:

1. Use `systemctl show -p MainPID` (not `pgrep`) to identify the running process.
2. Place the time marker **after** the restart so the journal grep is scoped to only the fresh test.
3. Compile both patched files in one invocation.
4. Add a fallback command that resolves import path of `agent.display` to distinguish "patch not imported" from "new slice path" if the error ever returns.

Sean ran the tightened Codex-approved script:

| Check | Result |
|---|---|
| `display.py` defensive coercion | ✓ line 812 — "patch already present" |
| `remote_ai_bridge_tool.py` json.dumps | ✓ line 153 |
| `python3 -m py_compile` both files | ✓ SYNTAX OK |
| Telegram session pointer | cleared |
| Service restart | active since 23:54:43 UTC, MainPID 2108208 |
| `display.py` mtime | 23:30:46 (before start) ✓ |
| `remote_ai_bridge_tool.py` mtime | 23:48:32 (before start) ✓ |

### Final live Telegram test — 23:55 UTC

Message sent: `check status on claude and codex sessions`

Bot reply (real, live, from Nemotron Nano through Hermes):

> **Remote AI Sessions Status**
>
> - **Claude Code:** Alive — Session: claude-session: 1 windows (created Mon Apr 20 23:40:54 2026)
> - **Codex CLI:** Alive — Session: codex-session: 1 windows (created Mon Apr 20 23:40:54 2026)
>
> Both agents are running and ready to accept instructions. Let me know if you'd like to read their latest output, send a new command, or check anything else.

Zero errors in journal. Zero sentinel files created. Zero HTTP 400. Natural-language reply with real data pulled from Windows 5090 via Tailscale SSH → WSL tmux.

### Consensus

- **Opus:** Implementation complete. Evidence captured (rule 26), root cause fixed at correct layer, instrumentation reverted cleanly (rule 38 hygiene).
- **Codex (final gate per Rule 46):** APPROVED display.py patch, REVISE → tightened verification, live test passed.

**DEBATE CLOSED. CONSENSUS REACHED.**

### Out-of-scope follow-ups surfaced during this debate

1. **Nemotron hallucinates tool `terminal`** — model invents non-existent tool names mid-conversation. Prompt/toolset hardening warranted as separate workstream.
2. **Other Hermes tools may return dicts** — tree-wide audit of `~/.hermes/hermes-agent/tools/*.py` recommended; any that don't `json.dumps()` their return could hit the same HTTP 400 path. `display.py` defensive coercion covers the CLI formatter layer, not the LLM-API content serialization.
3. **`remote_ai_bridge_tool.py` JSON wrap could be reverted** now that `display.py` defends. Codex's guidance: "the robust fix should make either shape safe." Both in place currently = belt-and-braces; fine to leave.

### Artifacts preserved on Pi

- `/home/kali/.hermes/quarantine-2026-04-21-slice-cache/` — 9 quarantined session files
- `~/.hermes/state.db.bak-2026-04-21-slice` — pre-surgery SQLite backup
- `~/.hermes/sessions/sessions.json.bak-2026-04-21-slice` — pre-reset session index backup
- `~/.hermes/hermes-agent/agent/display.py.bak-pre-slice-fix-*` — pre-patch display backup
- `~/.hermes/hermes-agent/agent/display.py.bak-slice-fix-*` — pre-Codex-rerun display backup
- `~/.hermes/hermes-agent/tools/remote_ai_bridge_tool.py.bak-pre-jsonize-*` — pre-patch tool backup
- `~/.hermes/hermes-agent/run_agent.py.bak-pre-dispatch-instr-*` — pre-instrumentation backup
- `~/.hermes/hermes-agent/run_agent.py.bak-pre-sentinel-revert-*` — pre-revert backup

Backups kept 1 week per Codex recommendation, then prune.



