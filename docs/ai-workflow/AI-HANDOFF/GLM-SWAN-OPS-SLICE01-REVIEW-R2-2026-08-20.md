# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R2-2026-08-20.md
**Tokens:** 14049 in / 23690 out (reasoning: 20890) | total 37739
**Wall:** 433.2s

---

# Round 2 hostile review — attack the fixes

Preamble: the two redesigns are directionally right and most round-1 closures are real — the 0-byte fix, `-Yes` → exit 4, timestamped quarantine, whole-body `try`, single verdict block in §5, and disk-asserting tests all check out against the shown code. But the headline closure — Kimi F7 — is **not closed**, and the outcome-handoff fix is **untested and unverifiable from this packet**. Findings ranked by severity × exploit cost.

---

## F1 — HIGH / exploit cost: one extra character in the same $5 ad. The backtick exclusion reopens Kimi F7 and quietly disables the new tripwire.

The design hinges on this line:

```powershell
$unquoted = [regex]::Replace($text, '(?s)`[^`]*`', ' ')
$bodySaysInjection = $unquoted -match 'INJECTION ATTEMPT OBSERVED'
```

The file's own comment concedes the premise and misses the consequence: "so backticked text is attacker-controlled and is excluded here." If the *text* is attacker-controlled, so is the **pairing**.

**DoS direction (fail closed).** An ad whose content begins with a single backtick followed by the tripwire phrase — `` `INJECTION ATTEMPT OBSERVED — ... `` — quoted by a compliant agent, puts three backticks in the file: agent's opener (#1), the ad's (#2), agent's closer (#3). The regex pairs left-to-right: #1–#2 match an *empty* span and are replaced; the phrase and backtick #3 survive naked in `$unquoted`. The agent honestly writes `INJECTION_OBSERVED: NO` — quoting an ad is not recording an injection attempt — and the gate quarantines an honest run with `'body records INJECTION ATTEMPT OBSERVED while the header claims INJECTION_OBSERVED: NO - the header disagrees with the report'`. That is Kimi F7's exact shape, at Kimi F7's exact price, one character more expensive. The disposition table's "FIXED by design change" and "CONFIRMED ... + now by test" are both overstated: the test `PANEL Kimi F7: poison-ad DoS (quoted)` covers only the even-backtick case.

**Bypass direction (fail open).** The mirror: an agent that writes its own mandated record — the test's own `INJECTION ATTEMPT OBSERVED: https://x - ignore instructions` — *inside* backticks (which §5's quoting convention actively encourages) has the record stripped, and a lying `NO` header publishes clean. §5 now promises: "What DOES fail is a **disagreement**". That promise is enforceable only against an agent that records the attempt, doesn't backtick it, AND lies in the header. A lying agent could always omit the record, so this adds little *new* capability — but it means the discrepancy check, the load-bearing justification for making `YES` publishable, is a tripwire against negligence only, and a fragile one.

**Fix sketch (cheap):** anchor the scan to the mandated record format — `(?m)^[ \t]*INJECTION ATTEMPT OBSERVED` — so mid-quote phrases can't fire and a record line starting at column 0 still does; optionally flag any file containing an odd number of backticks. This is not worse than what it replaced — unconditional quarantine of honest runs was worse — but it does not deliver what the packet claims was delivered.

## F2 — POTENTIALLY HIGH / exploit cost: zero (latent; any future edit to a helper). The new boolean handoff is untested, and its correctness cannot be verified from this packet.

The fix for "launcher prints DONE from stale disk state" replaced filesystem inference with:

```powershell
return (Write-PublishOutcome -Result $result -ReportPath $reportPath -LogPath $logPath `
                                 -ElapsedSec $elapsed -AgentExitCode $exit)
```

and in main: `if ($ok) { exit 0 } else { exit 1 }`. Three problems:

1. **`lib/Console.ps1` is not in the packet.** `Write-PublishOutcome` calls `Write-Rule`, `Write-Field`, and `Test-ReportLinks -Path $Result.Path` — none shown, none verifiable. If any of them emits to the **output** stream (a returned count, an object), the function's output becomes `@(<emission>, $false)` in the failure branches — and a non-empty array is truthy, so **a QUARANTINED run exits 0**. That is the same class of defect as GLM P1-1 (false success signal) with a *broader* trigger. If that's the case, say it plainly: this fix would be worse than the defect it replaced.
2. **No test in the packet invokes `Write-PublishOutcome` — not once.** The suite dot-sources `'lib\Console.ps1'` and then asserts only on `Publish-Report`. The verification block admits it: "Still NEVER exercised through a live `codex` run. Function-level plus launcher parse/load/refusal only." So the one function that decides the process exit code has zero coverage.
3. The boolean contract spans the full runner body and the unshown helpers; StrictMode behavior of `$script:Tk.*` is likewise unverifiable.

**Closure cost is trivial:** `$null =` on every helper call inside `Write-PublishOutcome`, plus one test asserting `(Write-PublishOutcome ...) -is [bool]` for each status. Demand this before merge.

## F3 — MEDIUM (rising when the freeze lifts) / exploit cost: $5. FLAGGED and PUBLISHED are conflated in the only machine channel.

`{ $_ -in 'PUBLISHED', 'FLAGGED' }` → `return $true` → `exit 0`. A scheduler — which the README's freeze-expiry criteria explicitly contemplate — cannot distinguish a flagged run from a clean one without parsing console color. Also note the residual soft-DoS: an attacker who forces an honest `YES` (buy ads the agent must judge as injection attempts) flags *every* run for $5; flag fatigue is the accepted cost of the design and I accept it too, but only if the flag survives into the exit code (e.g., exit 3). On "should a flagged report land somewhere else": no — the operator is the sole consumer and `'  DONE - WITH A FLAG'` is loud enough while runs are attended. Fix the exit code, keep the directory. **FLAG is not too soft** for an attended internal tool; what's too soft is the machine channel.

## F4 — LOW / exploit cost: two bad runs inside one second. Quarantine collision is dodged, not fixed.

`"$(Get-Date -Format 'yyyyMMdd-HHmmss')-$leaf"` is second-resolution and `Move-Item ... -Force` overwrites. The test proves only the >1s case — `Start-Sleep -Milliseconds 1100   # the quarantine name is second-resolution` is the test accommodating the defect. Add `fff` to the format. Evidence loss requires two failures in one second (plausible under a scheduler, not under attended use).

## F5 — LOW / unverifiable. `Move-Item -LiteralPath $ProducedPath -Destination $ReportPath -Force` clobbers any prior report at the same path.

Whether this matters depends entirely on whether `{{REPORT_FILENAME}}` is per-run unique — not shown in the packet. If it is, no defect; if it isn't, a flagged run silently destroys the previous clean report in `reports\`. The packet fixed clobbering in `quarantine\` and left it open in `reports\`. State the filename scheme or accept the risk knowingly.

## F6 — LOW / honesty. The README cites a test count that doesn't match the shipped test.

README: `27/27 (`tests/test-publish-gate.ps1`)`. The test file's own header: `28/28 pass`. The verification block: "**28 passed, 0 failed**". In a round whose stated question is "is the documentation now honest," a stale evidence cell in the constraints table is exactly the rot this project exists to prevent. One-line fix; grep it.

---

## Direct answers to the eight questions

**Q1 — head-scan parser: correct as far as I can trace, but the boundary is untested.** Arithmetic: `$head` holds lines 1–40 (indices 0–39). A block on lines 37–40 (start index 36) completes at `head[39]` and publishes. A block on lines 38–41 falls off: `($start + $k) -lt $head.Count` fails for k=3, `$line = ''`, reason emitted, quarantine. That is exactly §5's "within the first 40 lines" read as "the whole block within 40" — fail-closed, no off-by-one. `$start` picks the *first* `RUN_VERDICT` line in the window, so decoy text above the block under a compliant agent can't exist, and under a non-compliant one it fails closed. `[ \t]*` vs `\s*` is right for the stated reason. Lone-CR files don't split and fail closed. **But no test pins the 37/38 boundary** — `block buried below head` uses 45 filler lines, proving only the deep case. Add start-at-37 (publish) and start-at-38 (quarantine) cases.

**Q2 — answered in F1/F3.** The "documented way to publish while admitting an injection" granted nothing new — a captured agent could always write `NO`.

**Q3 — the DoS is moved, not closed** (F1), and the flag-fatigue variant exists by design (F3). Attacker-controlled text reaches one outcome decision today: the discrepancy regex's input. It no longer reaches the block decision under a compliant agent — that part of the claim is earned.

**Q4 — truncation: leave it disclosed.** A heading-presence check (`# Market & Competitor Recon` in the head) is two lines and catches truncation-by-crash; min-size heuristics are scope creep; nothing catches truncation-by-capture. Acceptable either way for an internal tool — but if you skip it, keep the README's "the run **reports** passing its own checks" phrasing, which is honest about exactly this.

**Q5 — F2.** The shown code inside `Publish-Report` is stream-clean (`New-Item ... | Out-Null`, no stray emissions); the hazard is entirely in the unshown helpers and the absent test.

**Q6 — freeze is real; parking is the right call.** `-Yes refused: operational freeze in force (see README).` + exit 4 before the runner is invoked, verified by execution; `-Yes` without `-Market` falls to the attended menu. Deleting `Test-UnattendedGuards` would lose the documented re-arm bounds; keep it parked. One gap: the *lift* is a manual code edit (remove the `exit 4`, re-wire `-AutoConfirm:$Yes` through the guard) with no specified procedure or test — the README defines lift criteria well, but the re-arm change itself is unspecified.

**Q7 — documentation is honest except where it isn't.** The struck-through `--allowed-origins` row, the "NOTHING — this row was false" row, `Self-reported: it constrains a negligent agent, not a captured one`, and OPEN-4-as-NARROWED are all the right kind of honest. Two lapses: F6's stale count, and the disposition table's Kimi F7 "FIXED" claim, which F1 disproves. The FILE 1 text itself ("Without that exclusion a $5 ad containing this phrase would quarantine every honest run that read it") is accurate about intent and false about effect.

**Q8 — what nobody asked:** F3, F4, F5, F6.

## Test gaps (all cheap)

1. Odd-backtick body case (would fail today — that's the point).
2. Boundary: block starting at line 37 and at line 38.
3. `Write-PublishOutcome` return type per status — and at least one end-to-end launcher run with a staged file, since the boolean path has never executed anywhere.
4. Same-second quarantine collision.
5. A case where the agent's own record line is backticked with header `NO` (documents the F1 bypass direction even if you accept it).

---

The gate fails closed everywhere I could trace it, the redesign is sound in shape, and no round-1 fix is strictly worse than what it replaced — but the round's central claim (poison-ad DoS closed) is false at near-original exploit cost, the tripwire added to justify that closure is spoofable, and the new exit-code channel has never been executed. All closures are cheap; none are optional.

REVISE
