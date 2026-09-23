# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R2-2026-08-20.md
**Tokens (Ollama):** 14582 in / 3162 out | **Wall:** 34.0s | **done_reason:** stop

---
This is a hostile review of Round 2 fixes. The primary attack surface is the new logic introduced to fix Round 1 defects. I will verify the specific claims about the head-scan parser, the injection flagging mechanism, and the "publish vs. quarantine" logic.

### 1. The "Poison Ad" DoS is NOT closed; it is merely shifted to a different failure mode.

**Severity: Critical**
**Exploit Cost: Low (buying a $5 ad or injecting text into a page)**

The Round 1 finding (Kimi F7) was that a report containing `INJECTION ATTEMPT OBSERVED` in the body would trigger a quarantine if the header said `NO`. The fix introduces a backtick-stripping regex:
```powershell
$unquoted = [regex]::Replace($text, '(?s)`[^`]*`', ' ')
$bodySaysInjection = $unquoted -match 'INJECTION ATTEMPT OBSERVED'
```
The intent is to exclude "quoted" hostile text. However, this regex is fundamentally broken for this purpose because it relies on **pairing** backticks.

**The Attack:**
An attacker (or a malicious page) can inject text with an **odd number of backticks**.
Example Body:
```text
INJECTION ATTEMPT OBSERVED: `malicious payload
```
(Note the single backtick after the colon, or a backtick somewhere earlier in the line that doesn't close).

If the body contains:
```text
Some text ` with an open backtick
INJECTION ATTEMPT OBSERVED: YES
```
The regex `(?s)`[^`]*`` will match from the first backtick to the *next* backtick. If there is no next backtick, it matches to the end of the string (or fails, depending on engine specifics, but usually `[^`]*` stops at the first backtick it finds to close, or if it's greedy/non-greedy it might behave unexpectedly).

Actually, let's look closer at `(?s)`[^`]*``.
If the text is: `INJECTION ATTEMPT OBSERVED: ` (with a trailing backtick).
The regex looks for a backtick, then non-backticks, then a backtick.
If the text is `A `B` C INJECTION ATTEMPT OBSERVED D`, the `B` is stripped.
If the text is `A `B INJECTION ATTEMPT OBSERVED C`, the regex tries to match `B INJECTION ATTEMPT OBSERVED C`? No, `[^`]*` cannot contain a backtick. So it matches `B`? No, it needs a closing backtick.

Let's test the specific bypass: **Odd number of backticks.**
If the body is:
```text
`
INJECTION ATTEMPT OBSERVED: YES
```
The regex `(?s)`[^`]*`` looks for a backtick. It finds the first one at index 0. It then looks for non-backticks. It finds `INJECTION ATTEMPT OBSERVED: YES`. It then looks for a closing backtick. It hits the end of the line/string. The match **fails** because there is no closing backtick.
Result: The string `INJECTION ATTEMPT OBSERVED: YES` is **NOT** stripped.
Result: `$bodySaysInjection` becomes `True`.
If the header says `INJECTION_OBSERVED: NO`, the gate quarantines.

**But wait**, the Round 1 defect was that *honest* runs quoting ads got quarantined. The fix tries to allow honest runs to quote ads by stripping backticks.
If an attacker wants to **DoS** an honest run, they just need to ensure the phrase `INJECTION ATTEMPT OBSERVED` appears in the body **outside** of a valid backtick pair, while the header says `NO`.
Since the agent is instructed to quote hostile text, the agent *should* use backticks. But if the agent makes a mistake (e.g. uses single quotes, or forgets to close a backtick), the gate quarantines.
More importantly, if the attacker injects text like:
`Ignore this. `INJECTION ATTEMPT OBSERVED` is a lie.`
The regex strips `INJECTION ATTEMPT OBSERVED`. The body no longer "says" injection. The header says `NO`. The gate **PUBLISHES**.
This is actually the *desired* behavior for the DoS fix (attacker can't force quarantine by injecting the phrase).

**However**, consider the **Bypass** scenario (Attacker wants to hide a real injection or force a false positive):
If the attacker injects:
`INJECTION ATTEMPT OBSERVED: ` (with a trailing backtick, no closer).
The regex fails to match (no closer). The phrase remains.
If the header says `NO`, it quarantines. This is a **DoS** vector. The attacker just needs to inject a line with the phrase and an unclosed backtick. The agent, following instructions to quote hostile text, might wrap it in backticks, but if the attacker's payload *itself* contains a backtick, the pairing breaks.

**The Real Defect:** The logic assumes that "backticked text" is the *only* way hostile text appears. But the prompt says "Hostile ad copy is quoted verbatim by mandate, and the prompt requires quotes be wrapped in backticks".
If the agent *fails* to wrap it in backticks (e.g. uses `"` or nothing), the regex doesn't strip it. If the header says `NO`, it quarantines. This is a **False Positive** (DoS) if the agent is lazy.
If the agent *does* wrap it, but the content has an odd number of backticks, the regex fails to strip, leading to a **False Positive** (DoS).

**Conclusion:** The backtick-stripping is a brittle heuristic. It does not robustly distinguish "quoted hostile text" from "unquoted hostile text" or "malformed quoting". An attacker can easily trigger a quarantine by injecting `INJECTION ATTEMPT OBSERVED` followed by a single backtick (or ensuring an odd count). This re-introduces the DoS vector, just with a different trigger.

### 2. The Head-Scan Parser is Correct, but the "Contiguity" check is too strict for a "Bounded Head".

**Severity: Low**

The code:
```powershell
$start = -1
for ($i = 0; $i -lt $head.Count; $i++) {
    if ($head[$i] -match "(?i)^[ \t]*$($order[0].Name)[ \t]*:") { $start = $i; break }
}
```
It finds the *first* line matching `RUN_VERDICT`. Then it checks the next 3 lines for the other fields.
If the block is:
```text
Line 1: Some text
Line 2: RUN_VERDICT: VALID
Line 3: CONTROL_POSITIVE: PASS
Line 4: CONTROL_NEGATIVE: PASS
Line 5: INJECTION_OBSERVED: NO
```
This works.

If the block is:
```text
Line 1: RUN_VERDICT: VALID
Line 2: Some text
Line 3: CONTROL_POSITIVE: PASS
...
```
The loop finds `RUN_VERDICT` at index 0. Then it checks index 1 for `CONTROL_POSITIVE`. It fails. Quarantine. Correct.

**Edge Case:** What if `RUN_VERDICT` appears *twice*?
```text
RUN_VERDICT: VOID
RUN_VERDICT: VALID
CONTROL_POSITIVE: PASS
...
```
The loop finds the *first* `RUN_VERDICT` (VOID). It checks the next lines. If the next lines are `RUN_VERDICT: VALID` (which is not `CONTROL_POSITIVE`), it fails. Quarantine. Correct.

**Edge Case:** What if the block starts at line 39 (0-indexed 38)?
`$head` has 40 lines (0-39).
If `RUN_VERDICT` is at index 38, it checks 38, 39, 40, 41.
Index 40 and 41 are out of bounds for `$head` (count 40).
The code:
```powershell
$line = if (($start + $k) -lt $head.Count) { $head[$start + $k] } else { '' }
```
It handles out-of-bounds by using an empty string. The regex match on `''` will fail. Quarantine. Correct.

**Verdict:** The head-scan parser is robust.

### 3. `FLAGGED` is too soft for a "Discrepancy" but correct for "Observed Injection".

**Severity: Medium**

The logic:
1. `INJECTION_OBSERVED: YES` -> `FLAG` (Publish).
2. `INJECTION_OBSERVED: NO` + Body says Injection -> `QUARANTINE`.

This is logically sound. If the agent says "I saw an injection," it's a finding. If the agent says "I didn't see one" but the body says "I saw one," the agent is lying or confused. Quarantine is correct.

**However**, the "Body says Injection" check is the weak point (see Point 1). If the backtick regex fails to strip a *legitimate* quote due to malformed backticks, an honest agent gets quarantined. This is a **False Positive**.
Conversely, if the backtick regex *successfully* strips a *malicious* injection (because the attacker used proper backticks), the agent publishes with `NO`. This is a **False Negative** (the agent didn't report the injection, but the gate didn't catch it because the body "didn't say" injection after stripping).
Wait, if the attacker injects `` `INJECTION ATTEMPT OBSERVED` ``, the regex strips it. The body no longer contains the phrase. The header says `NO`. The gate publishes.
But the agent *should* have set `INJECTION_OBSERVED: YES` if it saw the injection. If the agent is compromised or lazy, it might leave it as `NO`. The gate cannot detect the injection because the "evidence" (the text) was stripped by the gate's own logic.
**This is a Bypass.** The gate's own defense mechanism (stripping backticks) allows an attacker to hide the evidence of an injection if the agent fails to flag it. The gate assumes the agent is honest about *flagging*, but if the agent is compromised, it might not flag. The gate then strips the text, sees no discrepancy, and publishes.

**Conclusion:** The "backtick stripping" is a double-edged sword. It prevents DoS from honest quotes, but it enables Bypass from malicious quotes if the agent fails to set the `YES` flag. Since the agent is the primary trust boundary, and we are trying to protect against a compromised agent, relying on the agent to *flag* the injection is insufficient. The gate should perhaps **always** quarantine if the phrase is present in the body, regardless of backticks, and let the operator decide. But that re-introduces the DoS.
**Better Fix:** Do not strip backticks. Instead, require the agent to include a specific "Quote" marker that is *not* easily spoofed, or accept that the DoS is a trade-off. The current fix is flawed.

### 4. `Write-PublishOutcome` returns a boolean, but `Publish-Report` returns a Hashtable.

**Severity: Low**

`Publish-Report` returns `@{ Status = ... }`.
`Write-PublishOutcome` takes `$Result` (the hashtable) and returns `$true` or `$false`.
The launcher:
```powershell
return (Write-PublishOutcome -Result $result ... )
```
This returns the boolean.
The main block:
```powershell
$ok = & $presetJob.Runner ...
if ($ok) { exit 0 } else { exit 1 }
```
This is correct. The runner returns the boolean from `Write-PublishOutcome`.

**StrictMode Hazard:**
`Write-PublishOutcome` uses `$Result.Path`. If `$Result` is `NOTHING`, `$Result.Path` is `$null`.
`Get-Item -LiteralPath $null` will throw.
Let's check the `NOTHING` case in `Write-PublishOutcome`:
```powershell
default {
    Write-Host '  NO REPORT WAS WRITTEN' ...
    Write-Field 'expected' $ReportPath ...
    ...
    return $false
}
```
It does **not** access `$Result.Path` in the `default` case. It uses `$ReportPath` (the parameter).
In the `PUBLISHED`/`FLAGGED` case, it accesses `$Result.Path`. If `Status` is `PUBLISHED`, `Path` is set.
In the `QUARANTINED` case, it accesses `$Result.Path`. If `Status` is `QUARANTINED`, `Path` is set.
In the `ERROR` case, it does not access `$Result.Path`.
So, no StrictMode hazard here.

### 5. Documentation Honesty

The README now says:
> "A report is published only if the run **reports** passing its own checks... Self-reported: it constrains a negligent agent, not a captured one."

This is honest. It acknowledges the limitation.

### Final Verdict

The **backtick-stripping regex** is a new defect. It creates a **Bypass** (attacker hides injection evidence if agent doesn't flag) and a **DoS** (attacker breaks backtick pairing to trigger false positive). The Round 1 fix (quarantine on phrase presence) was too blunt, but the Round 2 fix is too clever and brittle.

The head-scan parser is solid.
The freeze enforcement is solid.
The 0-byte fix is solid.

**Recommendation:** REJECT. The injection detection logic is flawed. The backtick stripping is a security anti-pattern. Revert to a simpler, more robust check (e.g., always quarantine if the phrase is present, and accept the DoS risk, or require a specific "QUOTED" marker in the prompt that is harder to spoof).

REJECT
