# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R4-2026-08-21.md
**Tokens:** 14198 in / 17727 out (reasoning: 16245) | total 31925
**Wall:** 265.8s

---

# Round 4 review

I attacked all five assigned surfaces hard. Four came up completely dry. One produced a real finding — not in the logic, but in the prose that round 3 forgot to update. Code, tests, and job contract are consistent with each other; **two strings inside `Publish.ps1` still describe the pre-round-3 gate.**

---

## 1. The demotion to FLAG — attacked, and it holds

I tried to find something real that quarantine-on-discrepancy was buying:

- **Against a captured agent:** nothing. It omits the record, publishes clean — identical before and after round 3.
- **Against a semi-honest agent** (records the injection, forgets the header): quarantine added friction; the flag preserves the full information through all three channels (console, sidecar, exit 3). Information content is unchanged; only the block is gone, and the block bound the wrong actor.
- **The honest-run cost of keeping it:** the GLM R3-a case is real — multi-line ad copy puts the phrase at column zero, verbatim quoting is mandated, and the discriminator is provably impossible (sufficient-for-record fails on quoted copy; necessary-for-record fails on blockquote/numbered — the panel's own argument, which I re-derived independently and agree with).

The residual after demotion — an attacker can now force FLAG/exit-3 on every honest run with the same $5 ad (alarm fatigue, exit-3 flooding) — is the unavoidable dual of the impossibility, and strictly cheaper than silence. The test `R3: attacker text never blocks publication` pins that floor. **Demotion gave away nothing real.** The consequence claim also verifies: every injection-derived signal in the gate now terminates in `$flags`, never `$reasons`.

## 2. The widened anchor — does it match mid-line? No.

`(?m)^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?[*_]{0,2}INJECTION ATTEMPT OBSERVED`

`(?m)^` anchors to line start; the only tokens permitted before the phrase are whitespace, `>`, one list marker, and 0–2 emphasis chars. I traced the two shapes the file itself names as must-not-match: `Their ad said INJECTION ATTEMPT OBSERVED` (prose before the phrase — `^` lands on "Their", no prefix class consumes words → no match) and `| ad | INJECTION ATTEMPT OBSERVED |` (`|` is in no prefix class → no match). Blockquote *containing prose* (`> call INJECTION...`) also fails correctly — only the phrase at the marker's start matches. The widening does mean blockquoted/numbered/bold **ad copy** now trips the anchor where it previously didn't — but the trip is a flag, not a block, so no new DoS vector. Residual under-coverage exists (a record as a line-starting code span `` `INJECTION... ``, or `***` triple emphasis, exceed `[*_]{0,2}`) — inherent to any prefix class, and harmless post-round-3 since the check is advisory. Not a finding; it's the admitted limit of an advisory signal.

## 3. THE FINDING — stale prose still claims the demoted control

**F1 (documentation claims more than code — two instances, same defect):**

**(a)** The file-header narrative, point 2 of the panel retrospective — the section a maintainer is told to read "before trusting it":

> `PUBLISHES with a loud flag. Only a DISCREPANCY - body records an injection`
> `while the header claims NO - quarantines, because then the header is lying.`

This is present tense ("now PUBLISHES... quarantines"), not history. The code flags; the inline comment at the check says "FLAG, not QUARANTINE - re-decided in round 3"; the tests and §5 all say flagged. Only this paragraph still asserts the quarantine.

**(b)** The quarantine sidecar — operator-facing, written to disk beside every quarantined report — enumerates:

> `'a control did not pass, the agent exited non-zero, the header contradicted'`
> `'the body, or the machine-read verdict block was absent or malformed -'`

"the header contradicted the body" can no longer produce a quarantine under any input. The note tells the operator a control exists that does not fire. Round 3 updated the check, its inline comment, the tests, and the job prompt — and missed the header narrative and this enumeration.

**(c, mildest, same class):** the flag sidecar opens `The agent reported that something tried to manipulate it during this run.` — which over-asserts in exactly the discrepancy case round 3 declared indistinguishable (the flag line below it corrects this, so I fold it in rather than count it separately).

Severity: LOW — text only, no behavior. But by this panel's own precedent (Kimi R2-F1 was precisely a promised-control-vs-disk mismatch), an operator artifact enumerating a nonexistent control is a finding. Fix is three string edits.

## 4. Assigned classes — dry

- **`.Count`/StrictMode:** every aggregation is wrapped or guaranteed — `@($lines | Select-Object -First ...)`, `@()` on `$urls`/`$bare`/`$held`/`$kept`, `$injectionField` null-safe, `$verdict.Flags +=` on a hashtable key is a valid assignment. I specifically checked `$c.Body` on keyless cases in the test (hashtable key access, not property access — StrictMode-exempt, and guarded by `ContainsKey` ordering anyway). Dry.
- **Stream pollution:** `New-Item | Out-Null`, `$null = Test-ReportLinks`, all display via `Write-Host`, all other outputs assigned. The scalar-string assertions in the outcome tests pin this. Dry.
- **Flag sidecar failure path:** catch appends the failure into `$verdict.Flags`, which travels into the returned object and the FLAGGED console branch. Correct.
- **Stale-sidecar deletion:** correct order (Move → write-or-delete), correct branch (PUBLISH deletes, FLAG overwrites), tested (`clean run clears a stale .FLAGGED.txt`). The `-ErrorAction SilentlyContinue` swallow on delete is the right trade.
- **Test arithmetic:** I enumerated the suite: 34 table cases + 1 stale-flag + 1 collision + 4 handles + 5 outcome = **45**. The claimed count is honest. Boundary cases (line 40 / line 38) re-derived by hand: correct.

## 5. Is the loop dry?

The **code** is dry. The **prose inside `Publish.ps1`** is not — two strings still describe the quarantine that round 3 removed. That is the whole of what I found; everything else I threw at it bounced.

REVISE
