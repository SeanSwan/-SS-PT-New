#!/usr/bin/env python3
"""Hermes post_tool_call hook: retry-loop circuit breaker.

Detects the wedge failure mode observed 2026-07-12/13: the model retries the
SAME failing tool call verbatim, forever (Memory tool looped 40+ times; the
skill_manage and memory tools each looped 3+ times on 2026-07-11).

How it works (state file + flag file, no LLM access needed here):
- Every tool ERROR is compared to the previous one. Same tool + same error
  class N times in a row -> write a flag file.
- The pre_llm_call hook (inbox-drain.py) sees the flag, injects a loud STOP
  instruction into the next model call, and clears the flag.
- Any SUCCESS or a different error resets the counter.

Fail-open: any exception exits silently; state lives under
$HERMES_HOME-adjacent hooks/state/ so nothing touches the repo.
Registered in config.yaml under hooks.post_tool_call. Installed 2026-07-13.
"""
import json
import sys
from pathlib import Path

STATE_DIR = Path("/home/bigotsmasher/hermes2/.hermes/hooks/state")
STATE = STATE_DIR / "retry-guard-state.json"
FLAG = STATE_DIR / "retry-guard.flag"
THRESHOLD = 3


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        if not isinstance(payload, dict):
            return
        extra = payload.get("extra") or {}
        tool = payload.get("tool_name") or ""
        status = extra.get("status") or ""
        if status not in ("error", "blocked"):
            # A success clears streaks ONLY for the same tool — otherwise a model
            # alternating broken-memory-call -> successful-read -> broken-memory-
            # call would never trip the breaker.
            if STATE.exists():
                try:
                    counts = json.loads(STATE.read_text(encoding="utf-8"))
                    if isinstance(counts, dict):
                        kept = {
                            k: v for k, v in counts.items()
                            if not str(k).startswith(f"{tool}|") and isinstance(v, int)
                        }
                        if kept:
                            STATE.write_text(json.dumps(kept), encoding="utf-8")
                        else:
                            STATE.unlink(missing_ok=True)
                    else:
                        STATE.unlink(missing_ok=True)
                except Exception:
                    STATE.unlink(missing_ok=True)
            return

        err_type = str(extra.get("error_type") or "")
        err_msg = str(extra.get("error_message") or "")[:120]
        signature = f"{tool}|{err_type}|{err_msg}"

        STATE_DIR.mkdir(parents=True, exist_ok=True)
        counts = {}
        if STATE.exists():
            try:
                loaded = json.loads(STATE.read_text(encoding="utf-8"))
                # dict of signature->count; tolerate the old single-entry shape
                if isinstance(loaded, dict) and "signature" in loaded:
                    counts = {loaded["signature"]: loaded.get("count", 0)}
                elif isinstance(loaded, dict):
                    counts = {k: v for k, v in loaded.items() if isinstance(v, int)}
            except Exception:
                counts = {}

        count = counts.get(signature, 0) + 1
        counts[signature] = count
        # prune: keep only the 5 highest streaks so the file can't grow unbounded
        counts = dict(sorted(counts.items(), key=lambda kv: -kv[1])[:5])
        STATE.write_text(json.dumps(counts), encoding="utf-8")

        if count >= THRESHOLD:
            FLAG.write_text(
                (
                    f"Tool `{tool}` has now failed {count} times IN A ROW with the same "
                    f"error ({err_type}: {err_msg}). STOP retrying this call verbatim. "
                    "You are in a retry loop — the same input will keep producing the "
                    "same failure. Do exactly one of: (a) re-read the tool's schema/"
                    "usage doc and change the call's parameters, (b) achieve the goal "
                    "a different way (different tool, file write, terminal), or "
                    "(c) tell Sean plainly that the tool is failing and show him the "
                    "exact error. Do NOT issue the same call again."
                ),
                encoding="utf-8",
            )
            # streak reported; clear only this signature so other streaks survive
            counts.pop(signature, None)
            if counts:
                STATE.write_text(json.dumps(counts), encoding="utf-8")
            else:
                STATE.unlink(missing_ok=True)
    except Exception:
        return  # fail-open


if __name__ == "__main__":
    main()
