# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R4-2026-08-22.md
**Tokens:** 15382 in / 18234 out (reasoning: 15828) | total 33616
**Wall:** 259.7s

---

## VERDICT
REVISE — the two round-3 headline fixes are genuinely sound (each freeze case now pins its own control, confirmed by both the strings and the mutation matrix), but the document contradicts itself on the launcher's line count — 299 asserted three times, 300 asserted twice, same file, same revision — which falsifies round 3's own "whole doc swept for stale counts" claim: trap 9, sixth bite.

## BLOCKERS

1. **P2 — Launcher line-count self-contradiction; the stale-count sweep missed its own file map.** §3 file map: "`Swan-Ops.ps1 299  orchestration ONLY — under its 300-line cap`"; §3 cap note: "the launcher is held to it and is at 299"; OPEN-6: "Launcher is 299 lines, under its cap." Against that: the round-3 fix table says "Launcher hit 302 … Fix: Trimmed to **300**" and the Part 2 header says "`Swan-Ops.ps1` — main + menu loop (300 lines total)." These are mutually exclusive claims about one artifact at one revision. The R3 table's own timeline (299 → re-check +3 → 302 → trim to 300) makes the three 299s the stale ones — meaning the round-3 fix "whole doc swept for stale counts" missed §3 twice and §7 once, in the very section declaring the measurement honest ("measured 2026-08-21, not remembered" — i.e., measured *before* this round's edits). Failure scenario: next agent reads §3/OPEN-6, believes one line of headroom exists, adds a line, silently reopens a CLOSED finding — the reopening the R3 table records has already happened twice.

2. **P2 — Test isolation is asymmetric: the cleanup protects the FREEZE-file case but not the `-Yes` case that precedes it.** The suite's final cases run in order: five publishing cases → `-Yes` freeze case → cleanup (`Remove-Item …reports`, `…sandbox`) → FREEZE-file case. The `-Yes` case asserts `$fRep.Count -eq 0` and `$fSandbox.Count -eq 0` with **no** preceding cleanup. Failure scenario: any earlier case fails *after* the shim writes a report — the exact residue mechanism the doc itself documents ("a preceding case that FAILED may have left a report behind … found while running the two deletion mutations") → the `-Yes` case prints FAIL with `exit=4 (correct) reports=1` → the operator debugs the freeze gate for a defect in an unrelated case. Round 3 fixed this exact unattributable-failure mode for case 7 and left case 6 exposed to it. Fix is two lines: hoist the two `Remove-Item`s above the `-Yes` case.

3. **P2 — The round-3 menu-loop re-check has no pinning test.** `Test-OperationalFreeze -Root $Root   # re-check: startup gate runs once (GLM R3-B4)` inside the `while ($true)` loop is deletable with both suites staying green — mutations A and B cover only the startup gate and the `-Yes` branch. By the suite's own founding comment ("the control that gates every other risk in the tool … is the last thing that should be trust-me"), the re-check is now the trust-me control — introduced by the fix round, per trap 7's recorded pattern. Cheap structural fix rather than a hard-to-write interactive test: move the gate call to a single choke point at runner entry (before the codex spend, which the `-Yes` spend-check assertion already enforces), so the attended e2e case exercises the identical code the menu path executes.

4. **P2 — The mutation-evidence block is quoted output the shown code cannot print.** The `-Yes` case's format string mandates `exit={2} (want 4)  reports={3} qua={4} sandbox={5} refusal={6}`, but mutation B's line reads `exit=0  reports=1 qua=0 refusal=False` — the `sandbox` field (which would read ≥1, since the mutated run proceeds and spends) and `(want 4)` are absent; every line is uniformly stripped of `**FAIL**`/`(want 4)`. Most parsimonious read: console output hand-abridged for the packet. Under this workstream's own rules (Rule 30; "verify every quoted string — this panel produced two false claims"), edited output presented as "Verified this round — mutation evidence, not assertions" is exactly the fabrication surface §10 warns about. Paste verbatim transcripts or attach them. (Related nit: §5 claims the freeze "verified on all four" entry points; the round-4 evidence block lists three — `.cmd` is absent from it.)

## ATTACKS

**Correctness**
- Freeze gate edge cases hold as shown: empty/unreadable FREEZE (`-ErrorAction SilentlyContinue` still exits 4), FREEZE-as-directory (Test-Path true, Get-Content fails silently, still exits 4), `exit 4` from a dot-sourced function under `powershell -File` propagates to `$LASTEXITCODE` — matches the e2e.
- Re-check ordering in the menu loop (validate job → freeze → runner) is correct. The TOCTOU window between re-check and runner is operator-paced, not attacker-paced — I considered it and dismiss it; the freeze is an operational control, not a security boundary, and §5 says so honestly.
- Menu path discards runner status (`| Out-Null`) — intentional for interactive use; exit codes are only contractual in `-Market` mode. Dismissed.
- `-AutoConfirm:$Yes` is unreachable-true on the `-Market` path (the `-Yes` branch exits first) — dead but harmless.

**Security**
- No secrets, no PII in shown code; e2e FREEZE-file creation/deletion happens in the temp tool and cannot leave the real tool frozen or unfrozen. `SHIM_MODE` is a shim selector, not a freeze bypass — §5's "no test-only bypass flag" claim survives scrutiny.
- The real residual risks (OPEN-1 egress, OPEN-10 sandbox strength) are correctly held open and gated by the freeze; §5's conditional rewrite of the "agent cannot remove it" claim is now honest, and its warning that OPEN-10's single test now protects two claims is the right framing.
- House rules: no frontend surface exists here, so styled-components/Victory/palette/glow/44px are N/A with no violations; zero-PII-to-LLMs is complied with (§10 secret-scan, OPEN-9's "never paste these logs"); no yoga/meditation language; credentials phrasing ("NASM-protocol", "26+ years") respected in §12.

**Data-truth / schema drift** (no DB — doc-truth equivalents)
- Blocker 1 is the schema drift of this artifact: §3/§7 vs R3-table/Part-2 disagree on the same column (`Swan-Ops.ps1` line count) — caller-vs-model drift in documentary form.
- §3 suite counts (53/53, 7/7) are internally consistent with the R3 changes; §14 now says "all nine" and lists nine; the 30-second verify snippet's counts match. The §5 harness-copy claim ("only `Swan-Ops.ps1`, `lib/` and `jobs/`") is consistent with the FREEZE-file case creating its own FREEZE rather than inheriting the real one — which is also what makes the gate-unique assertions work.

**On Question 2 specifically — do the two cases each pin their own control? Yes.** Verified three ways: `'-Yes refused'` appears only in the narrow branch and `'ALL RUNS REFUSED'`/the file contents only in the broad gate; the harness copies no FREEZE file, so the `-Yes` case cannot reach the broad gate; and the mutation matrix (A: -Yes PASS / FREEZE-file FAIL; B: the mirror) is exactly what this structure predicts. The gate-unique fix is real.

## HIGHEST RISK
Blocker 1. Not because 299-vs-300 matters intrinsically, but because the document is this workstream's only product — §3 stakes its credibility on "measured, not remembered," and this round's flagship hygiene fix ("swept for stale counts") demonstrably missed the most-quoted number in the doc. Cheapest de-risk, one command plus one assertion: re-measure `(Get-Content .\Swan-Ops.ps1).Count`, correct all five sites in a single edit, and add an e2e assertion `(Get-Content Swan-Ops.ps1).Count -le 300`. That converts the ≤300 cap from prose to enforced code — the same move this round's own freeze case made — and permanently ends 299-vs-300 disputes, including the zero-headroom question (Question 3): at exactly 300 the cap is bookkeeping *today* and a silently-reopened CLOSED finding the moment anyone adds a line, which this workstream has already proven happens twice without anyone watching.

## CONFIDENCE
Could not verify from the document alone: (a) the actual current line count — one command settles it, and it determines which of the two doc clusters is stale; (b) e2e cases 1–5 — whether they clean up on *success* would narrow blocker 2's blast radius to failed-prior-case residue only, but the doc's own residue narrative makes the exposure real either way; (c) the shim's behavior (does clean mode write `sandbox/reports`?) and the harness copy list — asserted, not shown; (d) `Write-Banner`/`$script:Tk` definitions and dot-source order in the launcher's unseen first ~250 lines — if `lib/Console.ps1` were sourced after the first `Test-OperationalFreeze` call the gate would crash, but the green attended FREEZE-file run disproves that for the `-Market` path; (e) whether `Swan-Ops.cmd` pauses before exit — if not, a double-click refusal flashes and closes before the reason is readable, defeating "print the reason and exit 4" for the human operator (13-line file not shown); (f) the mutation-output lines are hand-abridged (blocker 4) — verbatim transcripts would settle whether anything else was dropped. One deliberate non-re-raise: the `Freeze.ps1` snippet as rendered shows two closing braces for three opens, but the disproved-claims note (3/3, parses clean, ForEach closes on its own line) plus this round's "all 8 .ps1 parse OK" tell me that is packet slicing dropping a line, not a file defect — I am flagging the packet's fidelity, not reopening the finding.

The loop is **not dry**: round 4 has four real findings (all P2, none manufactured), and per the dry-loop rule it could not have ended this round regardless — round 3 had findings, and dry requires two consecutive clean rounds.

**REVISE**
