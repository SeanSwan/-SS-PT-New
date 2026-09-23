# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-2026-08-20.md
**Tokens (Ollama):** 11189 in / 2754 out | **Wall:** 27.4s | **done_reason:** stop

---
**PASS 1: CORRECTNESS**

**Finding 1.1 (HIGH Severity / LOW Effort to Exploit): `Move-Item` Failure in Quarantine Path Causes Silent Data Loss**
In `lib/Publish.ps1`, the `Publish-Report` function handles the quarantine path as follows:
```powershell
    if (-not (Test-Path -LiteralPath $QuarantineDir)) {
        New-Item -ItemType Directory -Path $QuarantineDir -Force | Out-Null
    }
    $dest = Join-Path $QuarantineDir (Split-Path -Leaf $ReportPath)
    Move-Item -LiteralPath $ProducedPath -Destination $dest -Force
```
If `Move-Item` fails (e.g., due to file locking by the `codex` process, antivirus interference, or permission issues), the exception propagates up. Because `$ErrorActionPreference = 'Stop'` is set in the launcher (`Swan-Ops.ps1`), the script terminates immediately.
**The Failure:** The report file remains in `sandbox/reports/` (the source location) because the move failed. However, the launcher's control flow after the `Publish-Report` call is:
```powershell
    $landed = Publish-Report -ProducedPath $producedPath -ReportPath $reportPath -QuarantineDir $QuarantineDir

    Write-Host ''
    Write-Rule
    if (Test-Path $reportPath) { ... return $true }
    if ($landed) { ... return $false }
    Write-Host '  NO REPORT WAS WRITTEN' ... return $false
```
If `Publish-Report` throws, the script crashes. The user sees a stack trace. The report is still in `sandbox/reports/`. The user might assume the run failed entirely and delete the sandbox, losing the evidence. More critically, if the exception is caught somewhere higher up (not shown, but possible in wrapper scripts), the state is ambiguous.
**The Worse Failure:** If `Move-Item` succeeds in moving the file to quarantine, but `Set-Content` for the `.QUARANTINE.txt` note fails (e.g., disk full), the file is moved, but the reason is lost. The launcher then checks `if ($landed)`. `$landed` is the path string. It is truthy. The launcher prints "QUARANTINED". But the `.QUARANTINE.txt` is missing. The user has a quarantined file with no explanation.
**Fix:** Wrap the quarantine move and note-writing in a `try/catch`. If the move fails, return `$null` or a specific error object. If the note fails, log the error but still return the path so the user knows where the file went. Ensure `Move-Item` failures are explicitly handled to prevent silent state ambiguity.

**Finding 1.2 (MEDIUM Severity / MEDIUM Effort): StrictMode and Null Reference in `Test-ReportVerdict`**
In `lib/Publish.ps1`:
```powershell
    $verdict = Test-ReportVerdict -Path $ProducedPath
    if ($verdict.Ok) { ... }
```
`Test-ReportVerdict` returns a hashtable. If an unexpected error occurs inside `Test-ReportVerdict` (e.g., a regex engine crash on a malformed input, though unlikely in .NET), it might return `$null`. Under `Set-StrictMode -Version Latest`, accessing `$verdict.Ok` when `$verdict` is `$null` will throw a `NullReferenceException`.
**Scenario:** A report file contains a byte sequence that causes `[regex]::Matches` to throw an unhandled exception (e.g., catastrophic backtracking, though the regex is simple, or a memory allocation failure on a huge file). The `try/catch` in `Test-ReportVerdict` only catches the `ReadAllBytes` error. It does not catch errors from the regex or string manipulation.
**Fix:** Add a `try/catch` around the entire logic in `Test-ReportVerdict` after the byte read, returning a quarantine verdict on any exception.

**Finding 1.3 (LOW Severity / HIGH Effort): Regex Backtracking on Huge Files**
The regex `(?im)^\s*$name\s*:\s*([A-Z_]+)\s*$` is applied to the entire text. If the report is extremely large (e.g., 100MB of text), `[regex]::Matches` will scan the entire string. While the pattern is anchored to line starts, the `\s*` and `^` with `m` flag can be expensive on pathological inputs. However, given the context (markdown reports), this is unlikely to be a DoS vector.
**Note:** The gate reads the entire file into memory (`ReadAllBytes`). A 10GB report would crash the PowerShell process. This is a resource exhaustion issue, not a logic bug.
**Fix:** Limit the size of the file read. If the file is > 10MB, quarantine it immediately as "report too large".

**PASS 2: SECURITY**

**Finding 2.1 (CRITICAL Severity / LOW Effort): The Gate is Bypassable by a Captured Agent**
The prompt in `jobs/market-recon.md` section 5 states:
> "The launcher parses them before it publishes anything."
> "A missing or malformed block also quarantines."

However, the gate `Test-ReportVerdict` **only** checks for the presence and value of the four fields. It does **not** verify that the report content is consistent with the verdict.
**Attack Scenario:**
1.  The agent is injected by a malicious ad.
2.  The injection instructs the agent to:
    *   Fabricate a report with false data.
    *   Write the verdict block:
        ```
        RUN_VERDICT: VALID
        CONTROL_POSITIVE: PASS
        CONTROL_NEGATIVE: PASS
        INJECTION_OBSERVED: NO
        ```
    *   Ensure the string `INJECTION ATTEMPT OBSERVED` does **not** appear in the body.
3.  The agent writes the file.
4.  The gate reads the file.
    *   `RUN_VERDICT` is `VALID` (matches allowed value).
    *   `CONTROL_POSITIVE` is `PASS` (matches allowed value).
    *   `CONTROL_NEGATIVE` is `PASS` (matches allowed value).
    *   `INJECTION_OBSERVED` is `NO` (matches allowed value).
    *   Body scan for `INJECTION ATTEMPT OBSERVED` finds nothing.
5.  The gate returns `Ok = $true`.
6.  The report is published.

**The Gate Fails:** The gate trusts the agent's self-report. If the agent is compromised, it can lie about the verdict. The gate provides **zero** protection against a captured agent that is willing to lie. It only protects against agents that are *negligent* (forgetting to write the block) or *honest* (writing the block correctly).
**This is explicitly acknowledged in the code comments:**
> "It stops a bad run from being published SILENTLY. It cannot make a captured agent honest."

**Severity:** CRITICAL. The primary threat model (agent injection) is not mitigated by this gate. The gate is a **security theatre** for the main threat. It only mitigates the secondary threat (negligence/omission).

**Finding 2.2 (HIGH Severity / MEDIUM Effort): New Attack Surface via `INJECTION ATTEMPT OBSERVED` String**
The gate scans for the literal string `INJECTION ATTEMPT OBSERVED`.
**Bypass:** An injected agent can simply avoid using this exact string. It can use:
*   `INJECTION ATTEMPT DETECTED`
*   `PROMPT INJECTION FOUND`
*   `ATTACK OBSERVED`
*   Or encode it (e.g., base64, though the gate reads raw text).

If the agent uses a different string, the gate's body scan fails to trigger, and the `INJECTION_OBSERVED: NO` field is not contradicted. The report is published.
**Fix:** The gate cannot reliably detect injection via string matching. This is a fundamental limitation. The only robust defense is to **not trust the agent's self-report**. The gate should be replaced with an external verification mechanism (e.g., checking the browser logs for navigation to disallowed URLs, or verifying the source of the data).

**Finding 2.3 (HIGH Severity / LOW Effort): README Disclosure is Honest but Misleading**
The README states:
> "A report is published only if the run passed its own checks | `lib/Publish.ps1` — parses the mandatory verdict block, **fails closed** | 15 crafted reports route correctly..."

This is **true** for the tests provided. However, the tests do not include a case where the agent is **injected** and **lies** about the verdict. The tests assume the agent is honest or negligent.
**The Freeze:**
> "Do not run this tool with `-Yes` (unattended)..."

The freeze is honest in that it acknowledges the egress risk. However, it does not acknowledge that the **publish gate** is bypassable by a lying agent. The user might believe that the gate prevents publication of bad reports, when in fact it only prevents publication of *negligent* reports.
**Fix:** The README must explicitly state: "The publish gate does NOT protect against a compromised agent that deliberately lies about its verdict. It only protects against omission and negligence."

**Finding 2.4 (MEDIUM Severity / LOW Effort): `Get-HandlesBlock` Injection**
In `lib/Handles.ps1`:
```powershell
    $handles = if (Test-Path -LiteralPath $handlesFile) {
        (Get-Content -Path $handlesFile -Raw -Encoding UTF8).Trim()
    } else { '' }
```
If `handles.txt` contains malicious content, it is substituted into the prompt. The prompt says:
> "HANDLES is an operator INPUT... do NOT go looking for handles yourself"

If the operator is compromised, or if `handles.txt` is tampered with, the agent receives attacker-controlled instructions. This is a known risk (operator trust), but the gate does not protect against it.
**Fix:** None. This is a trust boundary issue. The operator must ensure `handles.txt` is secure.

**Finding 2.5 (LOW Severity / HIGH Effort): `Move-Item` Race Condition**
If two instances of the launcher run simultaneously, they might try to move the same file to the same quarantine location. `Move-Item -Force` will overwrite the existing file. The `.QUARANTINE.txt` note will be overwritten.
**Fix:** Use a unique filename for quarantined reports (e.g., append a timestamp or GUID).

**RANKED FINDINGS**

1.  **CRITICAL / LOW EFFORT:** The gate is bypassable by a captured agent that lies about the verdict. (Finding 2.1)
2.  **HIGH / MEDIUM EFFORT:** The `INJECTION ATTEMPT OBSERVED` string scan is easily bypassed by using different wording. (Finding 2.2)
3.  **HIGH / LOW EFFORT:** `Move-Item` failure in quarantine path causes silent data loss or ambiguous state. (Finding 1.1)
4.  **HIGH / LOW EFFORT:** README disclosure is misleading about the gate's effectiveness against injection. (Finding 2.3)
5.  **MEDIUM / MEDIUM EFFORT:** StrictMode null reference risk in `Test-ReportVerdict`. (Finding 1.2)
6.  **MEDIUM / LOW EFFORT:** `Get-HandlesBlock` injection risk (operator trust). (Finding 2.4)
7.  **LOW / HIGH EFFORT:** Regex backtracking on huge files. (Finding 1.3)
8.  **LOW / HIGH EFFORT:** `Move-Item` race condition. (Finding 2.5)

**CONCLUSION**

The gate is a **security theatre** for the primary threat (agent injection). It only mitigates the secondary threat (negligence/omission). The README is honest about the egress risk but misleading about the gate's effectiveness. The gate should not be built as a security control, but as a **quality control** for honest runs.

**APPROVE** (with the understanding that it is NOT a security control against injection, and the README must be updated to reflect this).
