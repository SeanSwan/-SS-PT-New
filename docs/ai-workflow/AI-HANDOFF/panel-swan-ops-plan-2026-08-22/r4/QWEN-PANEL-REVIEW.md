# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R4-2026-08-22.md
**Tokens (Ollama):** 15910 in / 659 out | **Wall:** 11.3s | **done_reason:** stop

---
## VERDICT
APPROVE — The round-3 fixes are mechanically sound, the mutation evidence proves the controls are distinct and effective, and the remaining risks are explicitly documented as open items rather than hidden defects.

## BLOCKERS
None.

## ATTACKS
- **Correctness:** The `Test-OperationalFreeze` function uses `exit 4` inside a function. In PowerShell, `exit` within a script/function terminates the entire process, which is the intended behavior here (hard stop). The re-check in the menu loop (`Swan-Ops.ps1` line ~285) correctly calls `Test-OperationalFreeze -Root $Root` again. If the FREEZE file appears during a session, the next menu iteration will trigger the exit. This is correct. The `-Yes` branch in the `-Market` path is redundant if the FREEZE file exists (since `Test-OperationalFreeze` runs first), but it serves as a defense-in-depth measure for the specific unattended case if the FREEZE file is somehow bypassed or if the code path is refactored. The mutation tests confirm both paths work independently.
- **Security:** The `FREEZE` file is a simple text file. If an attacker can write to the tool root, they can delete it. However, the document explicitly states that the agent's writable root is `sandbox/`, and the FREEZE file is in the tool root. The document also explicitly flags `OPEN-10` (sandbox strength unverified) as a risk that protects two claims. This is a known, documented risk, not a hidden defect. The `OPEN-11` fix (disabling liveness checks by default) is verified by the local listener test. The `OPEN-2` pinning of `@playwright/mcp` is narrowed but not closed, which is correctly documented.
- **Data-truth / schema drift:** The document is consistent in its claims about the freeze mechanism. The mutation tests provide concrete evidence that the two freeze cases pin their own controls. The line count of `Swan-Ops.ps1` is 300, which is at the cap but not over it. The document explicitly states this is a deliberate scope call.

## HIGHEST RISK
The highest risk is `OPEN-10`: the Windows `workspace-write` sandbox strength is unverified. If the sandbox is advisory, an injected agent could delete the `FREEZE` file and rewrite `jobs/market-recon.md`. The cheapest way to de-risk this is to run the empirical test described in `OPEN-10` (Slice 9) before lifting the freeze or allowing any attended runs.

## CONFIDENCE
I cannot verify the actual behavior of the Windows `workspace-write` sandbox from the document alone. The document explicitly states this is unverified (`OPEN-10`). The mutation tests prove the code logic is correct, but they do not prove the sandbox enforcement. I am confident in the code logic and the mutation evidence, but I am uncertain about the sandbox strength. The document is honest about this uncertainty, which is a good sign.

APPROVE
