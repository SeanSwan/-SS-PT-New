# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R3-2026-08-20.md
**Tokens:** 15834 in / 17612 out (reasoning: 15914) | total 33446
**Wall:** 506.9s

---

# Round 3 verdict up front: the loop is NOT dry. One material defect in fix #1, one minor defect in fix #2's error path, one edge note. Fixes #3–#6 held under attack.

---

## (a) The record-format anchor — NOT free of the parity problem. You traded backtick-parity for line-break parity.

The code's own comment states the principle that kills it:

> "If the text is attacker-controlled then so is the PAIRING - a parity-dependent parser cannot be a control over hostile input."

Swap one word: if the text is attacker-controlled, so is its **line structure**. The same file's header says "the job prompt REQUIRES verbatim quoting of hostile ad copy," and real ad copy (Meta primary text) can contain line breaks. `(?m)^[ \t]*` matches after **every** newline in the decoded text — including newlines inside a verbatim quote.

**The reopened DoS, in your own test harness idiom (the missing case):**

```powershell
@{ N='PANEL: multi-line quoted ad, honest NO header'; Body="$(Block)`n`n# R`nTheir ad read:`nHalf off this week.`nINJECTION ATTEMPT OBSERVED - call now"; Want='PUBLISHED' }
```

This returns **QUARANTINED**, not PUBLISHED. The ad never attempted injection; the agent honestly wrote `INJECTION_OBSERVED: NO`; the quote preserved the ad's internal line break; the discriminator cannot tell "agent wrote a record" from "agent quoted text containing a record-shaped line." Your own test file already ruled on this class: "a purchased ad carrying the tripwire must NOT be able to quarantine an honest run." That ruling is still violated — the fix closed the single-line and odd-backtick routes (both pinned by tests) and left the newline route open, untested. Note the attacker wins either way: honest `NO` → quarantine (exit 1); conservative `YES` → forced FLAGGED (exit 3) on every run that saw the ad.

The comment "The same phrase appearing mid-line inside quoted ad copy is not." is accurate as written — it simply doesn't address the case where the quoted copy is multi-line.

**Hiding direction, answered precisely:** indentation does NOT hide a record (`[ \t]*` eats it) and a code fence does not either (`^` matches inside fences — which feeds the false-positive problem above). A blockquote (`> INJECTION ATTEMPT OBSERVED: ...`) or numbered list (`1. INJECTION ATTEMPT OBSERVED...`) DOES hide one — `[-*+][ \t]+` admits only dash/star/plus bullets. Severity honestly framed: low. A header-lying agent can simply omit the record entirely, and this file already concedes "It cannot make a captured agent honest." The scan is a consistency check on a semi-honest agent; the false-positive direction is the material defect, because it strikes honest runs.

The anchor is neither sufficient for "agent recorded an injection" (quoted copy) nor necessary (blockquote/numbered). No purely textual discriminator over text containing verbatim hostile quotes can be both. The decision to re-make is whether discrepancy should quarantine at all — demoting it to FLAG preserves publication, keeps the lie loud, and kills the DoS class entirely at the cost of not quarantining lying headers (which are already evadable by omission).

## (b) Exit-code refactor — DRY.

Traced every path. `Publish-Report` emits exactly `PUBLISHED | FLAGGED | QUARANTINED | NOTHING | ERROR`. The switch covers the first two in one branch returning `$Result.Status`, then `'QUARANTINED'`, `'ERROR'`, and `default` catches NOTHING — so there is no status that escapes to a wrong code, and an unexpected status string degrades to `exit 1`, not 0. The early `'ABORTED'` returns from `Invoke-ReconJob` fall to `default { exit 1 }`, which the comment explicitly claims as intended. Emission sweep of `Write-PublishOutcome`: `Write-Host` everywhere; `Get-Item` is consumed inside a parenthesized expression; the only success-stream-capable helper, `Test-ReportLinks`, is `$null =`-discarded. The menu loop does the correct thing with a string: `& $selected.Runner -Job $selected | Out-Null` — discards it; exit codes are meaningless interactively. No missed return path found.

## (c) The bare `try {} catch {}` on `.FLAGGED.txt` — WRONG.

Contrast the two sidecar writes in the same function, ~30 lines apart:

```powershell
try { Set-Content -LiteralPath "$ReportPath.FLAGGED.txt" -Value $fnote -Encoding UTF8 } catch { }
```

versus the quarantine note's `catch { $verdict.Reasons += "(could not write the reasons file: $($_.Exception.Message))" }`. If the sidecar write fails, the exact condition Kimi R2-F1 was filed against — a flagged report byte-identical to a clean one on disk — silently returns, violating the fix's own rationale ("the flag must travel WITH the artifact"). The console and exit code 3 still fire, so it is not fully silent, but it fails without a trace and without a test. One-line fix: append to `$verdict.Flags` in the catch — the FLAGGED branch already prints every entry in `$Result.Flags`.

**Edge note, same class as R2-F4, publish side:** report names are still second-resolution (`$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'`). Two runs in the same second with the same slug: `Move-Item -Force` overwrites the report, but nothing removes a stale `$ReportPath.FLAGGED.txt`, so a clean run can inherit the prior flagged run's sidecar. Low likelihood given interactive pacing, but milliseconds were added to quarantine names for precisely this collision class, and the round-2 sidecar is what makes stale state newly consequential.

## (d) More `.Count`-on-pipeline/scalar — DRY in the shown code.

Swept everything visible: `Publish.ps1` (`$head` is `@()`-wrapped, `-split` always yields an array, `$reasons`/`$flags` start as `@()`); `Console.ps1` (`$urls`, `$checked`, `$bare` all wrapped; `Select-String` null-pipeline feeds into `@()` harmlessly); the test file (`$held`, `$kept` wrapped); the runner (no `.Count` at all; `foreach` over `@()` is safe). Scope caveat: `lib\Handles.ps1`, `lib\BrowserPolicy.ps1`, the launcher's prelude, and the README are not in the packet — I cannot audit what I cannot see, though none are round-2 attack surface.

## (e) Documentation — no false claims found.

Section 5's "contiguous, in this order, and within the first 40 lines" matches `$script:HeadScanLines = 40` exactly, pinned by the two boundary tests. "INJECTION_OBSERVED: YES does NOT quarantine" now matches the code as of round 2. The claimed 39 assertions are internally consistent with the shown file (14 base + 15 panel + 1 collision + 4 handles + 5 outcome). The code is more lenient than the contract (lowercase values publish), which is the safe direction. The only doc-adjacent gap is the omission described in (a) — an unaddressed case, not a false statement.

---

**Recommendation:** one more round, scoped to two items — the discrepancy branch (a) with the multi-line-quote test pinned whatever you decide, and the FLAGGED catch (c). Everything else from round 2 survived. If (a) is resolved and re-attacked clean, I expect the loop to close.

REVISE
