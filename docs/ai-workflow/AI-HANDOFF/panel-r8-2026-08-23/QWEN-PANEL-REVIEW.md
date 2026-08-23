# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R8-2026-08-23.md
**Tokens (Ollama):** 4693 in / 1113 out | **Wall:** 28.7s | **done_reason:** stop

---
## VERDICT
REVISE — The round-7 fixes are sound and the invariant holds for all inputs, but the gate has a critical logic inversion that causes it to report "clean" (exit 0) even when findings exist, defeating the entire purpose of the check.

## BLOCKERS
1. **P0**: **Gate reports clean when findings exist.**
   - **Failure Scenario**: A `settings.json` registers a hook file `./guard.mjs` that does not exist. `auditHookRegistrations` correctly returns `findings: ["1 registered hook file(s) DO NOT EXIST..."]`. The gate pushes this to the local `findings` array. The emit block correctly writes the warning to stdout. **However**, the code then executes `process.exitCode = 0;`. The process exits with code 0. CI/CD pipelines, pre-commit hooks, and the harness interpret exit code 0 as "success/clean." The textual warning is emitted, but the machine-readable signal is "clean." This is the exact "silence means clean" failure mode the module was designed to prevent, but at the process-exit level.
   - **Evidence**: `scripts/hooks/drift-check-gate.mjs` (tail), last line: `process.exitCode = 0;`. The comment above it discusses `process.exit()` vs `process.exitCode` for flushing, but it hardcodes `0` regardless of `findings.length`.

2. **P1**: **`scopeNote` is dropped when findings are empty.**
   - **Failure Scenario**: A repo has valid `settings.json` with valid hooks that all exist (all OK). `audit.findings` is empty. The `if (audit.findings.length)` block is skipped. `audit.scopeNote` is never pushed to `findings`. The operator sees no output (clean). This is acceptable *if* the operator knows the scope. However, the round-7 fix explicitly stated: "scopeNote is now emitted alongside findings (was computed and dropped by the caller)." The implementation only emits it *if* there are findings. If the intent is to always communicate scope limitations, this is a regression from the stated fix. If the intent is "only warn about scope if there's a problem," the fix description is misleading. Given the house rule "vague praise is worthless" and the emphasis on "stated so 'hook-registration integrity' is never read as broader than it is," the scope note should likely be emitted unconditionally or at least when the audit ran successfully.
   - **Evidence**: `scripts/hooks/drift-check-gate.mjs` (tail), lines: `if (audit.findings.length) { findings.push(...audit.findings, `hook-registration coverage: ${audit.scopeNote}`); }`.

## ATTACKS
- **Correctness**: 
  - The `classifyCommand` function is total and correctly handles all edge cases (empty, non-string, shell meta, multiple candidates, flag operands, absolute paths, symlink escapes). The round-7 fixes (equals-form loader, root shape, containment, scopeNote) are correctly implemented in the library.
  - **Critical Flaw**: The gate's exit code logic is inverted. `process.exitCode = 0` is hardcoded. It should be `process.exitCode = findings.length > 0 ? 1 : 0;`.
  - **Minor Flaw**: `scopeNote` is conditionally emitted. If the goal is to always inform the operator of scope limitations, it should be emitted unconditionally when the audit completes successfully.

- **Security**: 
  - No injection risks in the library. The gate uses `process.stdout.write` with string concatenation, which is safe for local diagnostics.
  - No authn/authz issues. The library reads local files, which is expected.
  - No SSRF or secret handling issues.

- **Data-truth / schema drift**: 
  - The library correctly handles JSON shape drift (root type, hooks type, groups type, hooks array type).
  - The gate correctly imports the library and uses its return value.
  - No PascalCase/snake_case drift.

## HIGHEST RISK
The hardcoded `process.exitCode = 0` in the gate. This is the single most dangerous item because it defeats the entire purpose of the check. The cheapest concrete way to de-risk it before ship is to change the last line of `scripts/hooks/drift-check-gate.mjs` to:
```javascript
process.exitCode = findings.length > 0 ? 1 : 0;
```
This ensures that any finding (including hook registration issues) results in a non-zero exit code, which CI/CD and harnesses will interpret as a failure, forcing the operator to address the issue.

## CONFIDENCE
I could not verify the behavior of the harness when it receives a non-zero exit code vs. a zero exit code with a warning message. I assume standard CI/CD behavior where non-zero exit code is a failure. I could not verify if there are other checks in the gate that might set `process.exitCode` before this line, but the provided tail is complete and shows no such logic. I am confident that the library is correct and the gate's exit code logic is the primary defect.
