# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R2-2026-08-20.md
**Seed:** (none)
**Tokens:** 14006 in / 17925 out | **Cost:** ~$0.3109 | **Wall:** 336.9s | **finish_reason:** stop

---

# ROUND 2 — hostile review of the fixes

Method note: every quote below is copied from the packet. Where a claim cannot be verified from the packet alone, I say so and mark it **needs execution** rather than asserting it.

---

## Finding 1 — NEW DEFECT in the Kimi F7 fix: the FLAG is never persisted. A flagged report is indistinguishable from a clean one on disk.

**Severity: high (it guts the headline design change). Exploit cost: n/a — this is a mitigation failure, not an exploit.**

Trace the FLAGGED path. `Publish-Report` does `Move-Item` to `$ReportPath` and returns `@{ Status = $status; Path = $ReportPath; Reasons = @(); Flags = $verdict.Flags }`. `Write-PublishOutcome` prints `DONE - WITH A FLAG` and the flag text `agent reported an injection attempt - read the report before acting on it` — **to the console only**. Nothing is written next to the report. No sibling file, no rename, no prepended banner, no separate directory.

The file's own authorial principle, applied to quarantine, is quoted verbatim:

> "The reason is worthless if it only ever existed in a console scrollback the operator did not watch - so it goes next to the file."

That principle is honored for QUARANTINED (`.QUARANTINE.txt`) and violated for FLAGGED. Three days later, an operator browsing `reports\` cannot tell the report that observed an injection from a clean one. Worse, the launcher returns `$true` for FLAGGED, so `if ($ok) { exit 0 } else { exit 1 }` — a scheduler also sees an unqualified success.

This also makes the job prompt's contract **false**. Section 5 states:

> "the report lands normally, carrying a flag that tells the operator to read it before acting on it"

The report carries nothing. The flag exists only in scrollback at publish time. So the answer to "is FLAGGED too soft?" is: the *status* is defensible, the *implementation* is not — the flag does not travel with the artifact, which was the entire point of the design change. Cheap fix: write `$ReportPath.FLAGGED.txt` (same pattern as the quarantine note), or publish flagged reports to `reports\flagged\`. This is the round-1 fix introducing a new defect of exactly the class the project rule predicts.

## Finding 2 — The new exit-code contract is unverified, and `Write-PublishOutcome` has a real stream-pollution hazard.

**Severity: potentially high (failed run exits 0). Exploit cost: n/a. Needs execution — cannot be confirmed from the packet.**

The launcher now does:

> `return (Write-PublishOutcome -Result $result -ReportPath $reportPath -LogPath $logPath ``

and the caller does `if ($ok) { exit 0 } else { exit 1 }` under the comment `# Honest exit code: a scheduler must be able to see a failed run.`

`Write-PublishOutcome`'s success stream contains whatever `Write-Rule`, `Write-Field`, and `Test-ReportLinks -Path $Result.Path` emit, plus the explicit `return $true`/`return $false`. None of those three helpers is shown in the packet. If **any** of them writes to the success stream (a stray `Write-Output`, an un-`Out-Null`ed `New-Item`, a `Test-ReportLinks` that emits link results — the name suggests it might), then on a QUARANTINED run `$ok` becomes a multi-element array containing `$false`, and **any non-empty array is truthy in PowerShell** — the launcher exits 0 on a failed run, silently defeating the exact thing the comment promises. `return $false` does not retract earlier emissions.

Two aggravating facts, both verifiable from the packet:

1. The 28-test suite exercises `Publish-Report` and `Get-HandlesBlock` only. `Write-PublishOutcome` — the function whose return drives the exit code — has **zero** coverage.
2. The "Verified this round" list measures `-Yes` → exit 4 and menu → exit 0, but never a quarantined run's exit code end-to-end.

Also: `Test-ReportLinks` runs *after* the `Move-Item` succeeded, with `$ErrorActionPreference = 'Stop'` in force and no try/catch around the `Write-PublishOutcome` call. If it throws, the report is published but the launcher crashes non-zero with a stack trace — a success reported as a failure, the mirror image of the above.

This is not asserted as a defect; it is asserted as an **unverified load-bearing contract with a known-failure-mode shape**. One execution test (`$ok` on a quarantine case, assert `-is [bool]` and exit 1) settles it. Until then the "honest exit code" claim is prose — the thing this file exists to argue against.

## Finding 3 — The poison-ad DoS is moved, not closed: it is now contingent on agent quoting compliance, and the backtick heuristic is parity-shiftable.

**Severity: medium-low. Exploit cost: still ~$5, but now also requires agent non-compliance or crafted parity.**

The exclusion is `'(?s)`[^`]*`'` over the **whole document**. Two residuals:

**(a) Compliance-contingent.** The DoS is closed only if the agent wraps hostile copy in backticks. The same tripwire phrase quoted in a fenced code block, a `>` blockquote, or plain quotes — all natural ways to quote ad copy — leaves `INJECTION ATTEMPT OBSERVED` visible in `$unquoted`, and with header `NO` the run quarantines. The DoS no longer fires on a *compliant* honest run, but the attacker can still buy the ad; the outcome now hinges on the agent's formatting. That is a strict improvement over "quarantines every honest run forever," and removing the agent's motive to hide injections is real — but the disposition table's "FIXED by design change" overstates it. It is *mitigated*, contingent on a prompt-level behavior, on input that is attacker-controlled by design — the same category this project rates as its #1 risk elsewhere.

**(b) Parity shift.** The regex pairs backticks left-to-right. An attacker who plants an **odd number of backticks** in ad copy (which the agent then quotes verbatim, adding its own wrapping pair — odd + even = odd) shifts every subsequent pairing, so a *later* legitimately backticked span containing the tripwire can fall **outside** a pair and become visible to the scan. Direction of impact: it can force `$bodySaysInjection` true (→ quarantine, the DoS direction) — it cannot hide a discrepancy that a *compliant* agent would have caught, because a compliant agent that recorded an injection sets `YES` and publishes flagged anyway. So the odd-backtick abuse is real but only re-arms the DoS, and only when the agent also set `NO`. The claimed closure — "This closes Sol P1-2 and removes the attacker's text from the verdict's input" — is true of the verdict block but not of the discrepancy scan, which still reads attacker-influenced text and can still be pushed toward quarantine by it.

Suggested hardening, cheap: count backticks; an odd count is itself a flag. And add a test with the tripwire in a fenced block so the contingency is pinned rather than discovered.

## Finding 4 — The quarantine-collision fix is second-resolution; the test sleeps to dodge the defect it claims to close.

**Severity: low operationally (runs are minutes apart), but the claim is overstated and the test encodes the workaround.**

The comment claims: "Timestamped so a second bad run cannot destroy the first one's evidence." The format is `yyyyMMdd-HHmmss` — one-second resolution, `Move-Item -Force`. Two quarantines of the same report name within one second still overwrite. And the test knows it:

> `Start-Sleep -Milliseconds 1100   # the quarantine name is second-resolution`

The test accommodates the residual defect instead of the fix eliminating it. One-line fix: append `-fff` or a short GUID. As shipped, "cannot destroy" should read "cannot destroy unless within the same second."

## Finding 5 — Documentation drift.

**Severity: low.**

- README evidence column: "27/27 (`tests/test-publish-gate.ps1`)". The packet's own verified line: "28 passed, 0 failed", and the test file's title says "28/28 pass". The README undercounts by one — stale, in the file that was rewritten *for honesty*.
- The prompt's "carrying a flag" claim is false per Finding 1 — this is the more substantive honesty issue.
- Everything else I checked is honest: the OVERSTATED strikethrough, OPEN-4 re-marked NARROWED, "the run **reports** passing its own checks", and the header's "It cannot make a captured agent honest" are all accurate against the code.

## Finding 6 — The launcher still uses `-Path` where the fix file's own comment says `-Path` is wrong.

**Severity: low.**

`Handles.ps1` now carries the lesson: "-LiteralPath on the read too: -Path globs, and an install directory containing [ ] would not resolve." The launcher, same packet, still has:

> `Get-Content -Path $promptPath -Raw -Encoding UTF8 | & codex @codexArgs *> $logPath`

An install root containing `[` or `]` breaks the prompt read. The fix preached the rule and the launcher wasn't swept for it.

## Finding 7 — The head-scan parser is **correct** at the boundary, but the boundary is untested.

I traced the off-by-one explicitly. `$start` is the first index matching `^[ \t]*RUN_VERDICT[ \t]*:`; the strict per-line match then requires all four lines at `$start..$start+3` with `($start + $k) -lt $head.Count`, else `''` → no match → quarantine. So the latest valid start is index 36 (lines 37–40, 1-indexed); a block starting at line 38, 39, or 40 fails closed. That matches the contract: "The four lines must be **contiguous, in this order, and within the first 40 lines of the file**." No off-by-one. `[ \t]*` vs `\s*` is deliberate and correct. The `@()` scalar guard is correct. First-match-wins on a duplicate `RUN_VERDICT` line in the head fails closed unless an attacker lands a full four-line fake block *above* the real one — which requires captured-agent-adjacent control and is disclosed under OPEN-4.

But: the tests cover block-at-line-3 ('disclosure line above block') and block-at-line-46 ('block buried below head'). Nothing pins lines 37/38/40 — the exact boundary the question asks about. Add three cases; they cost nothing.

## Finding 8 — Answers to the remaining questions.

- **Q4 (truncation hole):** A zero-exit run writing only the four passing lines is the captured-agent minimal fabrication; any completion marker or required heading is equally forgeable by that agent. A byte floor or requiring `## Sources` catches only the crash-with-exit-0 accident. Worth one cheap check, but document it as constraining negligence, not capture — do not let it read as a second wall. Not a blocker.
- **Q6 (parked guard):** Keeping `Test-UnattendedGuards` parked is the right call — it parses, it's documented as parked, and the refusal precedes it. Note two things: `-AutoConfirm:$Yes` in `$ok = & $presetJob.Runner -Job $presetJob -PresetMarket $Market -PresetFocus $Focus -AutoConfirm:$Yes` is now dead (always `$false`, since `exit 4` fires first) — harmless but worth a comment; and the freeze check runs *after* `Test-Preflight`, so "exits 4 before any spend" holds only if preflight spends nothing — preflight is not in the packet. **Needs execution** to confirm the ordering claim.
- **Stale-source residual:** the GLM P1-1 fix moved inference off the destination, but the gate still trusts that `$producedPath` was written by *this* run. Whether a stale file in `sandbox\reports\` can be re-published depends on filename generation and pre-run cleanup, neither shown. One line of launcher hygiene (delete/verify before the run) closes it; flagging as unverifiable, not as a defect.
- **Is any fix worse than its defect?** No. The FLAG design even with Finding 1 is better than a permanent $5 DoS plus a motive to hide injections. The head-scan is strictly better. The exit-code routing is better *if* Finding 2 tests clean.

---

## Ranking

| # | Finding | Severity | Exploit cost | New in the fix? |
|---|---|---|---|---|
| 1 | FLAG never persisted; flagged report indistinguishable on disk; prompt's "carrying a flag" false | High | n/a (mitigation failure) | **Yes — Kimi F7 fix** |
| 2 | Exit-code path unverified; pollution in `Write-Rule`/`Write-Field`/`Test-ReportLinks` would make failed runs exit 0; zero coverage of `Write-PublishOutcome` | High if present | n/a | **Yes — GLM P1-1 fix** (needs execution) |
| 3 | DoS contingent on backtick compliance; odd-backtick parity shift re-arms it | Medium-low | ~$5 + agent non-compliance | Reshaped, not closed |
| 4 | Quarantine names second-resolution; test sleeps around it | Low | n/a | Incomplete fix |
| 5 | README "27/27" vs verified "28 passed, 0 failed" | Low | n/a | Doc drift |
| 6 | Launcher still `-Path` where the fix file says `-LiteralPath` | Low | n/a | Missed sweep |
| 7 | Parser boundary correct but untested (lines 37–40) | Informational | — | Coverage gap |

The gate is materially better than round 1 and nothing here is worse than what it replaced — but Finding 1 undermines the round's headline design change and contradicts the shipped contract text, and Finding 2 leaves the new exit-code promise unverified in exactly the truthiness shape PowerShell punishes. Both are cheap to fix and cheap to test.

REVISE
