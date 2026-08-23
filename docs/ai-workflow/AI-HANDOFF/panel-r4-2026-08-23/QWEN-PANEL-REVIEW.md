# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R4-2026-08-23.md
**Tokens (Ollama):** 3812 in / 2131 out | **Wall:** 28.6s | **done_reason:** stop

---
## VERDICT
REVISE — The logic is sound and the "honest unknown" design is correct, but the `SHELL_META` regex contains a critical flaw that re-introduces the exact false-negative (silent pass) the check was designed to prevent.

## BLOCKERS
1. **P0: False Negative on Windows Paths with Backslashes**
   - **Failure Scenario:** A valid, simple hook command using a Windows absolute path with backslashes, e.g., `C:\scripts\hooks\guard.mjs`.
   - **Mechanism:** The `SHELL_META` regex is `/[;&|><`$(){}*?~!#\n]|\\\s/`. The second alternative `\\\s` matches a backslash followed by whitespace. However, in a Windows path like `C:\scripts`, the backslash is followed by `s` (a non-whitespace char). Thus, `SHELL_META.test(cmd)` returns `false`. The code proceeds to the `tokenize` branch.
   - **Consequence:** `tokenize` splits on whitespace. The token `C:\scripts\hooks\guard.mjs` is extracted. `SCRIPT_EXT` matches. `URL_SCHEME` does not match. `isAbs` checks `tok.startsWith('/')` (false) or `/^[A-Za-z]:\//` (false, because it expects a forward slash after the colon). So `isAbs` is `false`. The code executes `join(SS_PT, tok)`. `SS_PT` is likely a POSIX-style path or a relative base. `join` with a Windows-style absolute path string often results in a malformed relative path (e.g., `project/C:\scripts\...`) or simply fails to resolve to the actual file system location on a Windows host. `statSync` throws or returns `false`. The hook is reported as **MISSING**.
   - **Wait, is that a False Positive or False Negative?** It's a **False Positive** (Phantom). But the prompt asks about "Can a REAL missing hook still report clean?" and "Can a HEALTHY hook still be reported missing?". This is a Healthy hook reported as Missing.
   - **Correction on Severity:** Actually, let's look closer at `SHELL_META`. Does it catch backslashes? `\\\s` only catches backslash+space. A simple `C:\path\file.mjs` does NOT trigger `SHELL_META`. It goes to `tokenize`. `tokenize` produces `C:\path\file.mjs`. `SCRIPT_EXT` matches. `isAbs` is false (because of the forward slash check in the regex `/^[A-Za-z]:\//`). So it treats it as relative. `join(SS_PT, 'C:\path\file.mjs')`. If `SS_PT` is `/home/user/project`, `join` might produce `/home/user/project/C:\path\file.mjs` (on Linux) or `C:\path\file.mjs` (on Windows, if `SS_PT` is relative). If it's treated as relative and the file doesn't exist in that relative location, it reports MISSING. This is a **False Positive**.
   - **Is there a False Negative?** Let's look for a command that *should* be UNVERIFIED but is treated as SIMPLE.
   - **P0: False Negative on Commands with Escaped Spaces or Special Chars not in SHELL_META?**
   - Let's re-read `SHELL_META`: `/[;&|><`$(){}*?~!#\n]|\\\s/`.
   - What about a command like `node "my script.mjs"`?
     - `SHELL_META.test('node "my script.mjs"')`: The quotes `"` are NOT in the character class `[;&|><`$(){}*?~!#\n]`. The space is not matched by `\\\s` (no backslash). So `SHELL_META` is `false`.
     - It goes to `tokenize`. `tokenize` handles quotes: `node "my script.mjs"` -> tokens: `node`, `my script.mjs`.
     - `tok = 'my script.mjs'`.
     - `SCRIPT_EXT.test('my script.mjs')` -> `true`.
     - `URL_SCHEME` -> `false`.
     - `/\s/.test(tok)` -> `true` (contains space).
     - **Result:** `continue`. The token is skipped. It is NOT reported as missing, and it is NOT reported as unresolvable. It is **SILENTLY IGNORED**.
     - **Impact:** If `my script.mjs` does not exist, the check reports **CLEAN**. This is a **False Negative**. The original outage was "missing file reports clean". This case reproduces it.
     - **Evidence:** `drift-check-gate.mjs` line: `if (/\s/.test(tok)) continue;`. This skip logic is intended for `sh -c '...'` subcommands, but it also catches any simple command with a quoted path containing spaces. Since `SHELL_META` does not include `"` or `'`, quoted paths are not flagged as "complex/unverified". They are tokenized, and then silently dropped because they contain whitespace.

## ATTACKS
- **Correctness:**
  - **Quoted Paths with Spaces:** As identified in Blockers, `node "my hook.mjs"` is treated as a simple command (no shell meta chars), tokenized into `node` and `my hook.mjs`. The token `my hook.mjs` contains a space, so it is skipped by `if (/\s/.test(tok)) continue;`. It is neither verified nor flagged as unverified. If the file is missing, the check passes silently. This is a direct violation of the "no false clean" requirement.
  - **Windows Backslashes:** `C:\path\hook.mjs` is not flagged by `SHELL_META` (no backslash+space). It is tokenized. `isAbs` fails because the regex `/^[A-Za-z]:\//` requires a forward slash. It is treated as relative. If the file exists at `C:\path\hook.mjs` but not at `SS_PT/C:\path\hook.mjs`, it reports MISSING (False Positive). If the file is missing, it reports MISSING (Correct). But the False Positive is a defect.
  - **`SHELL_META` Incompleteness:** The regex does not include `"` or `'`. This means quoted arguments are not considered "shell syntax" for the purpose of the "complex command" branch. This is the root cause of the quoted-space false negative.

- **Security:**
  - **Path Traversal in `join`:** If a "simple" command contains `../../etc/passwd.mjs` (hypothetically), `join(SS_PT, '../../etc/passwd.mjs')` would resolve outside the project. `statSync` would check that path. This is not a security vulnerability in the *checker* (it's just checking file existence), but it could lead to unexpected behavior if the checker runs with elevated permissions. However, the main risk is the false negative/positive logic.
  - **No Injection:** The code does not execute the commands, only parses them. Low risk.

- **Data-truth / schema drift:**
  - **`SS_PT` Assumption:** The code assumes `SS_PT` is the base path for relative hooks. If `SS_PT` is not defined or is incorrect, all relative path checks will fail. The document does not specify how `SS_PT` is derived. If it's hardcoded or derived from environment, it could be wrong. However, this is a configuration issue, not a logic defect in the check itself.

## HIGHEST RISK
**The False Negative on Quoted Paths with Spaces.**
- **Why:** It directly reproduces the original outage: a missing hook file is reported as clean. The check's entire purpose is to prevent this. The `SHELL_META` regex fails to flag quoted strings as "complex", and the `tokenize` + `/\s/.test(tok)` logic silently drops them.
- **Cheapest De-risk:**
  1. Add `"` and `'` to the `SHELL_META` regex: `/[;&|><`$(){}*?~!#\n"'\\]|\\\s/`. This will cause any command with quotes to be treated as "complex" and reported as UNVERIFIED. This eliminates the false negative (it will no longer report clean; it will report "could not verify").
  2. Alternatively, in the `tokenize` branch, if a token contains a space and was originally quoted (which `tokenize` strips), do not skip it. Instead, treat it as a potential path and verify it. But since `tokenize` strips quotes, we lose the context. The safer fix is to flag quoted commands as UNVERIFIED.

## CONFIDENCE
- **Verified:** The logic for `SHELL_META`, `tokenize`, and the branching between ASSERT and UNVERIFIED.
- **Verified:** The false negative on `node "my hook.mjs"` by tracing the code path.
- **Unverified:** The value of `SS_PT`. If `SS_PT` is a Windows path with backslashes, the `join` behavior might differ. But the quoted-space issue is independent of `SS_PT`.
- **Unverified:** Whether `settings.json` is the only source of hooks. The code checks `settings.json` and `settings.local.json`. If hooks are defined elsewhere (e.g., in a global config), they are not checked. But the document implies these are the relevant files.
- **Uncertainty:** I am confident in the False Negative finding. I am less confident in the Windows backslash False Positive, as it depends on the OS and `SS_PT` implementation. But the False Negative is a clear logic flaw in the provided code.
