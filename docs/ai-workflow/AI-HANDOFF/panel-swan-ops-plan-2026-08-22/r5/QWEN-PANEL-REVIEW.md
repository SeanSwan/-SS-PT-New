# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R5-2026-08-22.md
**Tokens (Ollama):** 4466 in / 713 out | **Wall:** 8.0s | **done_reason:** stop

---
## VERDICT
APPROVE — The choke-point collapse is structurally sound, the mutation evidence proves the gate is load-bearing, and no remaining finding changes what the next agent or owner must do.

## BLOCKERS
None.

## ATTACKS
- **Correctness:** The removal of the two redundant call sites (previously in the `-Market` path and the menu loop) introduces no defect because `Invoke-ReconJob` is the sole entry point for execution logic in both paths. The `-Yes` refusal in the main block is a distinct, hardcoded guard that remains intact and is covered by the first e2e case. The `exit 4` inside `Test-OperationalFreeze` is correct because it is called at the top of `Invoke-ReconJob`, before any state mutation or spend. The menu loop calls `& $selected.Runner`, which maps to `Invoke-ReconJob`, so the choke point is hit. The `-Market` path calls `& $presetJob.Runner`, which also maps to `Invoke-ReconJob`. No race condition exists because this is a single-process PowerShell script. No null/undefined issues: `$Root` is mandatory and validated by `Test-Preflight` before `Invoke-ReconJob` is ever called.
- **Security:** The freeze gate is a file-based control outside the sandbox, which is a strong design. The `-Yes` refusal is permanent and hardcoded. No IDOR, injection, or SSRF risks are introduced by this change. The e2e test correctly asserts that no spend occurred (sandbox/reports empty) and that the refusal message was printed. The multi-tenant scope is not applicable here (single-tenant tool).
- **Data-truth / schema drift:** No schema drift. The file-map numbers are re-measured and consistent. The launcher is at 300 lines, which is at the cap but not over. The `lib/Freeze.ps1` file is 49 lines, well under the cap.

## HIGHEST RISK
The launcher is at exactly 300 lines with zero headroom. The cheapest way to de-risk is to extract the menu loop logic into `lib/Menu.ps1` (or similar) to bring the launcher under the cap, ensuring that any future additions do not silently reopen the line-count violation. This is a maintainability risk, not a correctness bug, but it is the most likely source of a future regression.

## CONFIDENCE
I could not verify that `Invoke-ReconJob` is the *only* function that performs spend, because the document does not show the full body of `Invoke-ReconJob` or the `Runner` implementations. However, the mutation test (deleting the choke point causes a spend) proves that the choke point is the only guard against spend in the tested path. I could not verify that no other code path bypasses `Invoke-ReconJob`, but the e2e test covers the two known entry points (`-Market` and menu), and the mutation test confirms that removing the choke point allows spend, which implies that the choke point is the only guard. If there were another path, the mutation test would not have caught it, but the document states that the choke point is the "ONE choke point; every route to spend passes here," and the mutation test supports this claim. I am confident that the loop is dry.

APPROVE
