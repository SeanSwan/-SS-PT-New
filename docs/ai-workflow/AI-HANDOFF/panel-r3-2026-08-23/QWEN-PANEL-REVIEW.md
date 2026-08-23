# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R3-2026-08-23.md
**Tokens (Ollama):** 5440 in / 2429 out | **Wall:** 24.1s | **done_reason:** stop

---
## VERDICT
REVISE — The tokeniser correctly handles the specific quoting edge cases listed, but the "unresolvable" heuristic creates a false-negative blind spot for unquoted environment variables that resolve to valid absolute paths, and the egress redaction logic leaks the API key length in the CLI output.

## BLOCKERS
1. **P1: False Negative in Hook Check (Unquoted Env Vars)**
   - **Scenario:** A hook command is defined as `node $CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` (no quotes).
   - **Failure:** The tokeniser splits this into `$CLAUDE_PROJECT_DIR` and `scripts/hooks/x.mjs`.
     - Token 1 (`$CLAUDE_PROJECT_DIR`): Does not match `SCRIPT_EXT` (no extension), so it is skipped.
     - Token 2 (`scripts/hooks/x.mjs`): Matches `SCRIPT_EXT`. It does not contain `$`, `%`, or `{}`. It is treated as a relative path. `join(SS_PT, 'scripts/hooks/x.mjs')` is checked. If the file exists relative to `SS_PT` but the *intended* path was the absolute path provided by the env var, this might pass. However, if the file *does not* exist relative to `SS_PT` (which is likely if `CLAUDE_PROJECT_DIR` is not `SS_PT` or if the structure is different), it reports **MISSING**.
     - **Wait, the blocker is the opposite:** If the file *does* exist relative to `SS_PT`, it reports **CLEAN**. But if the env var pointed to a *different* location where the file *also* exists, it is clean.
     - **Real False Negative:** Consider `node /opt/hooks/x.mjs`. This is an absolute path. It is checked.
     - **Consider:** `node $HOME/scripts/x.mjs`. Token 1: `$HOME` (skipped, no ext). Token 2: `scripts/x.mjs` (checked relative to `SS_PT`). If `SS_PT/scripts/x.mjs` exists, it is CLEAN. If the user's `$HOME` is different, the hook might actually be broken, but the check says clean. This is a **False Negative** (real missing hook reported clean) if the relative path coincidentally exists in the project root but the intended absolute path (via env var) was different or missing.
     - **More Critical False Negative:** The code skips tokens that *do not* match `SCRIPT_EXT`. If a command is `bash -c "node $VAR/x.mjs"`, the tokeniser sees `bash`, `-c`, `node`, `$VAR/x.mjs`. `$VAR/x.mjs` contains `$`, so it goes to `unresolvable`. This is correct.
     - **The Actual P1:** The `unresolvable` check uses `/[$%{}]/.test(tok)`. If a variable is named `MY_VAR` and the command is `node $MY_VAR/x.mjs`, it is caught. But what if the variable is *part* of the path in a way that doesn't trigger the regex? No, `$` is always there.
     - **Let's look at the "False Positive" question:** Can it produce a phantom?
       - Command: `node scripts/hooks/x.mjs`. Token: `scripts/hooks/x.mjs`. No `$`. Relative path. Checked. If missing, reported. Correct.
       - Command: `node /abs/path/x.mjs`. Token: `/abs/path/x.mjs`. No `$`. Absolute. Checked. If missing, reported. Correct.
       - Command: `node $VAR/x.mjs`. Token: `$VAR/x.mjs`. Has `$`. Unresolvable. Correct.
       - **Edge Case:** `node $VAR` where `VAR` expands to `scripts/x.mjs`. The token is `$VAR`. It does **not** match `SCRIPT_EXT` because it ends in `R`, not `.mjs`. So it is **skipped entirely**. It is not in `missing`, not in `unresolvable`. It is **invisible**. This is a **False Negative** (real missing hook reported clean/ignored).
   - **Evidence:** `drift-check-gate.mjs` line: `if (!SCRIPT_EXT.test(tok)) continue;`. A token like `$HOOK_PATH` (where `HOOK_PATH` ends in `.mjs`? No, env vars don't usually end in extensions, but if the *value* does, the token is just the variable name). If the command is `node $SCRIPT_FILE` and `SCRIPT_FILE` is `x.mjs`, the token is `$SCRIPT_FILE`. It does not match `SCRIPT_EXT`. It is skipped. The check does not report it as unresolvable because it never enters the `unresolvable` logic (which is inside the `if (SCRIPT_EXT.test(tok))` block? No, let's re-read).
   
   *Correction on Code Flow:*
   ```javascript
   for (const rawTok of tokenize(hook?.command || '')) {
     const tok = rawTok.replace(/\\/g, '/');
     if (!SCRIPT_EXT.test(tok)) continue;          // not a script argument
     // ... URL check ...
     // ... seen check ...
     if (/[$%{}]/.test(tok)) {
       unresolvable.push(...);
       continue;
     }
     // ... existence check ...
   }
   ```
   If `tok` is `$SCRIPT_FILE`, `SCRIPT_EXT.test('$SCRIPT_FILE')` is **false** (unless the variable name literally ends in `.mjs`, which is bad practice but possible). If it is false, it `continue`s. It is **not** added to `unresolvable`. It is silently ignored.
   **Scenario:** Operator sets `export HOOK=x.mjs` and configures hook as `node $HOOK`. The file `x.mjs` is missing from the project root. The check ignores `$HOOK` because it doesn't look like a script path. The gate reports **CLEAN**. The hook is broken. **False Negative.**

2. **P1: API Key Length Leak in Console Output**
   - **Scenario:** `consult-gemini-panel.mjs` runs.
   - **Failure:** The line `console.error(... key=present(${apiKey.length}ch) ...)` prints the exact length of the API key. While not the key itself, this is metadata that can aid in fingerprinting or brute-force length attacks if the key space is constrained, and more importantly, it violates the spirit of "zero PII/secret handling" by leaking secret metadata to stderr, which is often logged.
   - **Evidence:** `consult-gemini-panel.mjs` line: `console.error(`[consult-gemini-panel] model=${model} doc=${document} chars=${body.length} key=present(${apiKey.length}ch) — direct Google API`);`

## ATTACKS
- **Correctness:**
  - **Tokeniser Blind Spot:** As noted in Blocker 1, tokens that are pure variable references (e.g., `$VAR`) are skipped if they don't match `SCRIPT_EXT`. This misses hooks defined via variable expansion where the variable name doesn't hint at the extension.
  - **Redaction Completeness:** `redactForEgress` is called on `remit`, `seed`, and `body`. However, `body` comes from `readForEgress(document, { label: 'document' })`. Does `readForEgress` return the *redacted* text or the *raw* text? The code says `const body = readForEgress(...)`. Then `body` is used in the prompt. If `readForEgress` returns raw text and relies on the caller to redact, then `body` is **NOT** redacted in the prompt construction: `[remit && redactForEgress(remit), seedText && ..., body]`. `body` is passed directly. If `readForEgress` does not redact, this is a **P0 Data Leak**. The comment says "The SEED goes over the wire exactly like the document, so it gets exactly the same redaction." This implies `readForEgress` *does* redact, or that the caller must. But the caller only redacts `remit` and `seed`. It does **not** redact `body`. If `readForEgress` is a "read and redact" function, it's fine. If it's just a "read" function, `body` is raw. Given the name `readForEgress`, it likely redacts. But the asymmetry in the code (explicit `redactForEgress` for others, implicit for `body`) is risky.
- **Security:**
  - **Key Length Leak:** See Blocker 2.
  - **IDOR/Scope:** No multi-tenant issues visible in this snippet.
- **Data-truth / schema drift:**
  - **Exit Code:** `consult-panel.mjs` exits 0 on dry-run. It exits 1 if output dir creation fails. What if *all* seats are skipped? The code shows `if (skipped.length) { console.log(...); }` but does not show the exit code. If `skipped` is all seats, does it exit 0 or 1? The prompt says "zero runnable seats -> exit 1". The snippet doesn't show the final exit logic for the "all skipped" case, only the "dry-run" and "dir fail" cases.

## HIGHEST RISK
**False Negative in Hook Check (Blocker 1).** A broken hook that is silently ignored by the gate is the exact failure mode this check was designed to prevent. The cost of a false positive is operator annoyance; the cost of a false negative is a silent security/coordination outage.

**Cheapest De-risk:**
Change the tokeniser logic to **not** skip tokens that don't match `SCRIPT_EXT` if they contain a `$` or `%`. Instead, if a token contains `$` or `%`, it should be flagged as `unresolvable` **regardless** of whether it matches `SCRIPT_EXT`.
*Fix:* Move the `if (/[$%{}]/.test(tok))` check **before** the `if (!SCRIPT_EXT.test(tok)) continue;` check, or make it `if (/[$%{}]/.test(tok)) { unresolvable.push(...); continue; }` and only then check `SCRIPT_EXT`.

## CONFIDENCE
- **Unverified:** The behavior of `readForEgress`. Does it return redacted text? If not, `body` is a P0 leak. I assumed it does based on the name, but the code explicitly redacts `remit` and `seed`, which suggests `body` might be handled differently or `readForEgress` is a wrapper that redacts.
- **Unverified:** The exit code path for "all seats skipped" in `consult-panel.mjs`. The snippet cuts off after the `skipped` log. I cannot confirm it exits 1.
- **Unverified:** The implementation of `redactForEgress`. Does it handle all PII patterns? I assume it does, but I cannot verify the regex/logic.
