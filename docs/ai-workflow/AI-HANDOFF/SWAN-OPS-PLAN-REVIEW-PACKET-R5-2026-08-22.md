# ROUND 5 — confirming pass

Rounds 1–4: 8/8 REVISE · 3/3 REVISE · 1 APPROVE 2 REVISE · 1 APPROVE 2 REVISE.
Round 4's findings are fixed. **Is the loop dry?**

**Apply this termination test, which is this project's own rule:** a hostile loop terminates on
*"nothing that changes what anyone does"*, not on *"nothing found"*. If your finding would not
change what a next agent or the owner actually does, say so and call it dry rather than filing
it. A padded finding now costs strictly more than silence.

## What round 4 changed

| R4 finding | Seat(s) | Fix |
|---|---|---|
| **The menu-loop freeze re-check had no test and was deletable with both suites green.** The startup gate fired first on the `-Market` path, so the loop copy was never reached. | GLM **and** DeepSeek, independently | **Structural, not a new test:** collapsed three call sites to **ONE choke point at runner entry**. Every route to spend passes through it, so the existing attended e2e case exercises the identical code the menu path runs. **Mutation-proven:** deleting it → `exit=0 reports=1 reason-shown=False`, FREEZE-file case fails. |
| Launcher line count contradicted itself — 299 asserted three times, 300 twice, same file same revision. Trap 9, sixth bite. | GLM | **Every number in the file map re-measured against disk** (nine files verified equal), and the launcher is now described as **AT the cap with zero headroom**, with a standing instruction that further additions must extract rather than append. |
| Test isolation was asymmetric — cleanup protected the FREEZE-file case but not the `-Yes` case before it, so an unrelated earlier failure would print FAIL on the freeze case. | GLM | Cleanup hoisted above **both** freeze cases. |
| **The mutation-evidence block was hand-abridged console output** presented under "mutation evidence, not assertions" — the `sandbox` field and `(want 4)` were missing from one line. | GLM | **Conceded.** I retyped output instead of pasting it. The transcripts below are verbatim. |
| Launcher at 300 = zero headroom is a real maintainability risk, not bookkeeping. | DeepSeek | Accepted and documented as such. |

**DISPROVED across R1–R4, deliberately NOT acted on** — re-raising any is a finding against
you: sandbox-size contradiction · "53 is really 44" · OneDrive exposure · `Freeze.ps1`
brace-unbalanced.

## Questions

1. Did the choke-point collapse introduce a defect? It **removed** two call sites.
2. Anything left that changes what a next agent or the owner would actually do?
3. **Is the loop dry?**

End with **APPROVE / REVISE / REJECT**.

---

# THE CODE
## `lib/Freeze.ps1`
```powershell
﻿<#
    Swan Ops - the operational freeze gate.

    Dot-sourced by Swan-Ops.ps1. Extracted here 2026-08-22 so the launcher stays
    under the 300-line cap its siblings cite - adding this gate inline pushed it
    to 331 and silently reopened OPEN-6, the finding the launcher had just been
    trimmed to close.

    Refuses EVERY entry point - .cmd, menu, -Market, -Yes - not just unattended.
    
    Why this exists (GLM, 2026-08-22): the handoff endorsed exactly this branch
    "if the answer to the invest/freeze question is anything other than invest
    now", AND set the default to "absent an answer, treat as retire-in-place".
    No answer has been given, so by the document's own logic the condition was
    already satisfied - and the attended half of the freeze was still prose, on a
    machine that holds three live API keys, with the egress finding (OPEN-1) open.
    The same reasoning was applied to the OPEN-2 pin and then not applied to the
    larger control.
    
    The gate is a FILE, deliberately:
    * lifting it is a visible, auditable act (delete FREEZE), not a code edit;
    * the agent cannot remove it - it lives outside the sandbox;
    * the e2e harness copies only Swan-Ops.ps1, lib/ and jobs/ into its temp
    tool, so the suite exercises the real launcher WITHOUT special-casing, and
    no test-only bypass env var exists to be set by accident.
    The hardcoded -Yes refusal below stays regardless - it is the narrower,
    permanent rule; this is the broader, temporary one.
#>

function Test-OperationalFreeze {
    <#
        Refuses EVERY entry point while the FREEZE file exists. Returns nothing;
        exits 4 directly, because there is no caller state worth preserving when
        the answer is "do not run".
    #>
    param([Parameter(Mandatory)][string]$Root)

    $FreezeFile = Join-Path $Root 'FREEZE'
    if (Test-Path -LiteralPath $FreezeFile) {
        Write-Banner
        Write-Host '  ALL RUNS REFUSED - operational freeze in force.' -ForegroundColor $script:Tk.Danger
        Write-Host ''
        Get-Content -LiteralPath $FreezeFile -ErrorAction SilentlyContinue |
            ForEach-Object { Write-Host "  $_" -ForegroundColor $script:Tk.Body }
        Write-Host ''
        Write-Host '  To lift: delete the FREEZE file in the tool root.' -ForegroundColor $script:Tk.Faint
        exit 4
    }
}
```

## `Swan-Ops.ps1` — runner entry (the choke point) + main + menu loop
```powershell
function Invoke-ReconJob {
    param($Job, [string]$PresetMarket, [string]$PresetFocus, [switch]$AutoConfirm)

    # ONE choke point; every route to spend passes here (GLM R4-B3, DeepSeek R4-P1).
    Test-OperationalFreeze -Root $script:Root

    Write-Banner
...
# ---------------------------------------------------------------------- main

Write-Banner
if (-not (Test-Preflight)) { exit 1 }
Write-Field 'root' $Root
Write-Field 'mode' 'draft & stage only - no posting, sending, or buying' $script:Tk.Ok

if ($Market) {
    $presetJob = $Jobs | Where-Object { $_.Key -eq $Job } | Select-Object -First 1
    if (-not $presetJob) { Write-Host "  No job '$Job'." -ForegroundColor $script:Tk.Danger; exit 2 }
    # OPERATIONAL FREEZE (README): -Yes is refused until Slice 2 lands and is
    # verified by an OBSERVED egress/credential-read refusal. This file argues
    # that a guardrail is prose until code refuses; the freeze was prose.
    if ($Yes) {
        Write-Host ''
        Write-Host '  -Yes refused: operational freeze in force (see README).' -ForegroundColor $script:Tk.Danger
        Write-Host '  Unattended runs resume when the egress/env work is verified.' -ForegroundColor $script:Tk.Body
        Write-Host '  NOTE: attended runs are ALSO refused while the FREEZE file exists.' -ForegroundColor $script:Tk.Body
        exit 4
    }
    $status = & $presetJob.Runner -Job $presetJob -PresetMarket $Market -PresetFocus $Focus -AutoConfirm:$Yes
    # Honest exit code: a scheduler must be able to see a failed run - AND to tell
    # a run that was attacked from a clean one. FLAGGED used to collapse into 0,
    # so the only machine-readable channel said "fine" about a report the console
    # had just printed a warning over (GLM R2-F3).
    switch ($status) {
        'PUBLISHED'   { exit 0 }
        'FLAGGED'     { exit 3 }   # published, but something tried to manipulate the run
        default       { exit 1 }   # QUARANTINED / ERROR / NOTHING / aborted
    }
}

while ($true) {
    Show-Menu
    $choice = Read-WithDefault 'Choice' 'q'
    if ($choice -match '^(q|quit|exit)$') { Write-Host ''; Write-Host '  Bye.' -ForegroundColor $script:Tk.Body; break }

    # NOT $job - case-insensitive names make it the [string]$Job param (coerces).
    $selected = $Jobs | Where-Object { $_.Key -eq $choice } | Select-Object -First 1
    if (-not $selected) { Write-Host ''; Write-Host "  No job '$choice'." -ForegroundColor $script:Tk.Warn; continue }

    & $selected.Runner -Job $selected | Out-Null

    Write-Host ''
    Read-WithDefault 'press enter for the menu' '' | Out-Null
    Write-Banner
}
```

## `tests/test-launcher-e2e.ps1` — both freeze cases + isolation
```powershell
# Isolate BOTH freeze cases, not just the second. A preceding case that failed
# after the shim wrote a report leaves residue, and these cases assert report
# counts - so an unrelated failure would print FAIL here and send the operator
# debugging the freeze gate (GLM R4-B2: round 3 fixed this for case 7 and left
# case 6 exposed).
Remove-Item (Join-Path $Tool 'reports') -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Tool 'sandbox') -Recurse -Force -ErrorAction SilentlyContinue

$env:SHIM_MODE = 'clean'   # the shim WOULD produce a publishable report...
Push-Location $Tool
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Tool 'Swan-Ops.ps1') `
    -Market "golf fitness" -Yes *> (Join-Path $Work 'run-freeze.log')
$freezeCode = $LASTEXITCODE
Pop-Location

# ...so "no report anywhere" proves it refused BEFORE spending, not that the run failed.
$fRep = @(Get-ChildItem (Join-Path $Tool 'reports') -File -Filter '*.md' -ErrorAction SilentlyContinue)
$fQua = @(Get-ChildItem (Join-Path $Tool 'reports\quarantine') -File -Filter '*.md' -ErrorAction SilentlyContinue)
# THE SPEND CHECK. Asserting only the two PUBLISH destinations proves "no report
# was published" - not "no money was spent". A refactor that moved the -Yes check
# to AFTER the `& codex` call would let the shim write into sandbox/reports,
# publish would never fire, exit would still be 4, the log would still say
# 'freeze', and this case would PASS WHILE SPEND OCCURRED. The first version of
# this test had exactly that hole; the mutation test missed it because it only
# exercised branch-DELETION, not branch-REORDER (GLM R2-P1).
$fSandbox = @(Get-ChildItem (Join-Path $Tool (Join-Path 'sandbox' 'reports')) -File -ErrorAction SilentlyContinue)
# GATE-UNIQUE string, not just 'freeze'. BOTH refusal messages contain the word
# 'freeze', so matching it pinned only the DISJUNCTION {FREEZE gate, -Yes branch}:
# deleting the broad gate left the narrow one firing and every assertion passed
# (GLM R3-B2). '-Yes refused' appears only in the -Yes branch; the FREEZE gate
# prints 'ALL RUNS REFUSED'. Each case must pin ITS OWN control.
$refusalPrinted = (Get-Content (Join-Path $Work 'run-freeze.log') -Raw -ErrorAction SilentlyContinue) -match '-Yes refused'

$freezeOk = ($freezeCode -eq 4) -and ($fRep.Count -eq 0) -and ($fQua.Count -eq 0) `
            -and ($fSandbox.Count -eq 0) -and $refusalPrinted
if ($freezeOk) { $pass++ } else { $fail++ }
Write-Host ("{0,-9} {1,-32} exit={2} (want 4)  reports={3} qua={4} sandbox={5} refusal={6}" -f `
    $(if ($freezeOk) { 'PASS' } else { '**FAIL**' }), 'FREEZE: -Yes refused, no spend',
    $freezeCode, $fRep.Count, $fQua.Count, $fSandbox.Count, $refusalPrinted)

# --- THE FREEZE FILE. Distinct control from the -Yes branch above: that one is
# --- hardcoded and narrow (unattended only); this one is presence-based and
# --- total (every entry point). The suite covered the narrow one and not the
# --- broad one - the exact coverage gap that had existed for -Yes itself until
# --- this round. Surfaced by DeepSeek V4 Flash in R3, from a wrong premise (it
# --- read the -Yes case as if it were this one) that happened to point at a real
# --- hole. Tested on the ATTENDED path, because that is what the FREEZE file
# --- adds over -Yes.
# Isolate: a preceding case that FAILED may have left a report behind, and this
# case asserts report counts. Without this, one broken control makes two cases go
# red and the second failure is unattributable (found while running the two
# deletion mutations GLM R3-B2 asked for).
Remove-Item (Join-Path $Tool 'reports') -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Tool 'sandbox') -Recurse -Force -ErrorAction SilentlyContinue

$freezeFileTool = Join-Path $Tool 'FREEZE'
Set-Content -LiteralPath $freezeFileTool -Value 'TEST FREEZE - placed by the e2e suite.' -Encoding UTF8
$env:SHIM_MODE = 'clean'
Push-Location $Tool
'y' | & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Tool 'Swan-Ops.ps1') `
         -Market "golf fitness" *> (Join-Path $Work 'run-freezefile.log')
$ffCode = $LASTEXITCODE
Pop-Location

$ffRep = @(Get-ChildItem (Join-Path $Tool 'reports') -File -Filter '*.md' -ErrorAction SilentlyContinue)
$ffSb  = @(Get-ChildItem (Join-Path $Tool (Join-Path 'sandbox' 'reports')) -File -ErrorAction SilentlyContinue)
$ffLog = Get-Content (Join-Path $Work 'run-freezefile.log') -Raw -ErrorAction SilentlyContinue
# The reason text from the FREEZE file must reach the operator, not just an exit code.
$ffReason = $ffLog -match 'TEST FREEZE'

$ffOk = ($ffCode -eq 4) -and ($ffRep.Count -eq 0) -and ($ffSb.Count -eq 0) -and $ffReason
if ($ffOk) { $pass++ } else { $fail++ }
Write-Host ("{0,-9} {1,-32} exit={2} (want 4)  reports={3} sandbox={4} reason-shown={5}" -f `
    $(if ($ffOk) { 'PASS' } else { '**FAIL**' }), 'FREEZE FILE: attended run refused',
    $ffCode, $ffRep.Count, $ffSb.Count, $ffReason)

Remove-Item -LiteralPath $freezeFileTool -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host "E2E RESULT: $pass passed, $fail failed"
Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
if ($fail -gt 0) { exit 1 }
```

# VERBATIM transcripts (GLM R4-B4: no hand-abridging this time)

Baseline:
```
RESULT: 53 passed, 0 failed
E2E RESULT: 7 passed, 0 failed
all 8 parse OK
  -Market x        exit 4
  -Market x -Yes   exit 4
  menu(1)          gate-hit=1
  reports intact: 2
```

Choke-point deletion mutation:
```
=== MUTATION: delete the choke point ===
**FAIL**  FREEZE FILE: attended run refused exit=0 (want 4)  reports=1 sandbox=0 reason-shown=False
E2E RESULT: 6 passed, 1 failed
```

File-map numbers re-measured against disk this round:
```
  OK    Swan-Ops.ps1 = 300          OK    lib/Handles.ps1 = 57
  OK    README.md = 242             OK    lib/Freeze.ps1 = 49
  OK    lib/Console.ps1 = 165       OK    jobs/market-recon.md = 306
  OK    lib/BrowserPolicy.ps1 = 142 OK    tests/test-publish-gate.ps1 = 301
  OK    lib/Publish.ps1 = 510       e2e   disk=188
```

Is the loop dry? APPROVE / REVISE / REJECT.
