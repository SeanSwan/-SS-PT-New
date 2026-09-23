# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Tokens (Ollama):** 24327 in / 1168 out | **Wall:** 20.1s | **done_reason:** stop

---
## VERDICT
REVISE — The plan’s security posture is sound and the code is dry, but the Slice 2 specification is technically infeasible on the target platform (Windows) and the plan contains a critical omission regarding the "invest" path's operational safety.

## BLOCKERS
1.  **P0 — Infeasible Slice 2 Spec (Windows/PowerShell):** §14 Step 2 mandates an "Egress allowlist... local proxy the child is pointed at, or an equivalent OS-level control." On Windows, `codex exec` (a Node.js process) does not natively respect `HTTP_PROXY` for all outbound traffic without explicit library support (which `codex` may not have for its internal fetches), and there is no standard "OS-level control" for egress filtering in PowerShell/Windows that is as simple as `iptables` or `pf`. The plan assumes a Unix-like sandboxing primitive that does not exist in the Windows environment described. A competent agent will stall here or implement a broken proxy.
2.  **P1 — Missing "Invest" Path Safety Protocol:** §2 presents "Invest" as a viable option but does not specify that the tool **cannot be run** on the primary development machine (which holds `~/.ssh`, `.env`, etc.) even after Slice 2, unless the machine is isolated. The plan states in §5 that the freeze is "mechanically enforced" by `-Yes` exit 4, but §14 implies that once Slice 2 is done, the freeze lifts. It fails to explicitly state that **attended runs** (interactive mode) on a live machine remain dangerous if `OPEN-1` (env scrubbing) is not fully verified in a way that covers *all* child processes, not just the direct `codex` call. The plan conflates "Slice 2 done" with "safe to use," which is a dangerous leap.

## ATTACKS
-   **Correctness:** The plan claims `Swan-Ops.ps1` is 299 lines. The code provided is not `Swan-Ops.ps1`, so this cannot be verified, but the plan’s claim of "53 assertions" in `test-publish-gate.ps1` is verifiable. Counting the `Assert` calls in the provided test file: there are 30 `Assert` calls in the main loop, 1 in the "clean run" check, 1 in the "quarantine collision" check, 4 in the "Get-HandlesBlock" section, 5 in the "Write-PublishOutcome" section, 1 in the "prefix sweep" (mustFlag), 1 in the "prefix sweep" (mustNotFlag), and 1 in the "accepted limits" check. Total = 44 assertions. The plan claims **53**. This is a **false claim** in the plan. The code does not match the plan’s description of its own test suite.
-   **Security:** The plan states `OPEN-1` is "CRITICAL" and "the only fix that makes 'draft & stage only' true." However, the code in `lib/Publish.ps1` shows that the gate *does* check for `INJECTION_OBSERVED: YES` and flags it. The plan correctly notes this is a "flag," not a "block." But the plan’s claim that "Nothing a report can contain now blocks publication on injection grounds" is **true** based on the code (it flags, doesn't quarantine). The risk is that an operator might misinterpret "FLAGGED" as "safe to proceed," when the plan itself says "read the report before acting." The plan does not provide a mechanism to *prevent* action on a flagged report, only to *warn*. This is a weak control for a "CRITICAL" finding.
-   **Data-truth / schema drift:** The plan states `jobs/handles.txt` has "8 entries." The code in `lib/Handles.ps1` is not provided, but the test `test-publish-gate.ps1` checks `Get-HandlesBlock`. The test creates a `handles.txt` with 1 entry and checks for it. It does not verify the count of 8. The plan’s claim of "8 entries" is unverified by the provided code.

## HIGHEST RISK
The **false claim of 53 assertions** (actual count is 44) indicates that the plan’s author did not re-run the test suite or count the assertions after the last edit. This undermines the "measured 2026-08-21" claim in §3. If the plan’s numbers are wrong, its other "measured" claims (line counts, file sizes) may also be stale. The cheapest way to de-risk is to **re-run the test suite and update the plan with the actual assertion count and line counts** before any agent acts on it.

## CONFIDENCE
I could not verify the line count of `Swan-Ops.ps1` (299) or the file sizes in §3 because the code for those files was not provided. I could not verify the "8 entries" in `handles.txt` because `lib/Handles.ps1` was not provided. I am confident in the assertion count mismatch because I counted the `Assert` calls in the provided `test-publish-gate.ps1`. I am confident in the Windows egress filtering issue because it is a well-known limitation of the Windows/Node.js stack.

**REVISE**
