# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R5-2026-08-22.md
**Tokens:** 4313 in / 16082 out (reasoning: 14278) | total 20395
**Wall:** 238.1s

---

## VERDICT
REVISE — the choke-point collapse itself is sound and mutation-proven, but the loop is not dry: three cheap, action-changing items survive, one of them the exact Trap-9 species this project has bitten on six times.

## BLOCKERS

1. **P2 — The two freeze cases still assert asymmetrically: the FREEZE-file case checks `reports/`, `sandbox/reports/`, but NOT `reports\quarantine/` — the same defect class as R4-B2, in the sibling it fixed.**
   Failure scenario: the test's own comment declares branch-REORDER as its threat model. Reorder the gate to fire after the publish step instead of after `& codex`, with the shim output routed FLAGGED→quarantine: spend occurs, the report moves out of `sandbox/reports` into `reports\quarantine`, exit is still 4, `TEST FREEZE` still prints, `ffRep=0` (top-level `reports/` only, no `-Recurse`), `ffSb=0` → **case passes while spend occurred**. The `-Yes` case catches this via `$fQua`; the freeze-file case has no equivalent. Evidence: `tests/test-launcher-e2e.ps1`, the `$ffOk = ($ffCode -eq 4) -and ($ffRep.Count -eq 0) -and ($ffSb.Count -eq 0) -and $ffReason` line vs. the `-Yes` case's four-destination assertion two dozen lines above it. Fix is one mirrored assertion line; the file has headroom (disk=188).

2. **P2 — House-rule flag (`<=300 lines per file`): the round's own re-measured file map marks 301, 510, and 306 as "OK" with no stated scope exemption.**
   Evidence — the "File-map numbers re-measured against disk" transcript: `tests/test-publish-gate.ps1 = 301`, `lib/Publish.ps1 = 510`, `jobs/market-recon.md = 306`, each prefixed `OK`. If "OK" means *matches disk*, fine as measurement — but then the map is silent on the fact that three files sit over the cap the launcher was just trimmed to honor, while the same document narrates "AT the cap with zero headroom" for 300. If "OK" means *within cap*, then 301 ≤ 300 is arithmetically false. Either the rule is launcher-scoped (then the README must say so, or round 6 re-bites Trap 9 for the seventh time) or two `.ps1` files breach it. Action changes either way: state the scope where the map lives, or extract one line from the test file. I flag it because my charter says flag any violation; severity is P2 only because the likely truth is launcher-scoped and undocumented, not breached.

3. **P2 (conditional) — the choke point fires AFTER `Test-Preflight`, so code runs before the freeze refuses.**
   Failure scenario, *if* preflight reads env/credentials or touches network: FREEZE present, operator runs any entry → preflight executes (credential read / egress attempt on a machine with three live API keys and OPEN-1 open) → only then exit 4. The test proves "no report anywhere," i.e. no *spend artifact* — it does not prove nothing executed before the gate. The freeze's own rationale ("the operational freeze gate… on a machine that holds three live API keys") makes pre-gate side effects in-scope for its promise. Evidence: `Swan-Ops.ps1` main — `if (-not (Test-Preflight)) { exit 1 }` precedes every route into `Invoke-ReconJob`, whose first line is the gate. If preflight is pure-local path/tool checks, this finding is dry — one look settles it (see CONFIDENCE). Fix if real: hoist `Test-OperationalFreeze` above preflight in main, one line.

## ATTACKS
- **Correctness:** Q1 answer — no, the collapse introduced no defect. Both removed call sites were upstream of the same single `Runner` (one job exists; `-Market` and menu both dispatch through `Invoke-ReconJob`), and the baseline probes (`-Market x → 4`, `-Market x -Yes → 4`, `menu(1) gate-hit=1`) plus the deletion mutation corroborate. Residual deltas are cosmetic and fail-closed: during freeze the menu now renders and refuses on job *selection* rather than at loop entry; `-Market <bad-key> -Yes` exits 2 at the job lookup before any freeze check — no path to spend, so "refuses EVERY entry point" is imprecise but not unsafe. Filing either would be padding; both are dry.
- **Security:** gate internals are clean — `Join-Path` + `-LiteralPath` throughout (wildcard-safe), FREEZE contents echoed via `Write-Host` not evaluated, Test-Path→Get-Content race fails closed (no output, still exit 4). The load-bearing *assertion* I cannot check: that the tool root is genuinely outside the agent's write scope — the entire control rests on the agent being unable to delete FREEZE (see CONFIDENCE). No injection/IDOR surface in shown code; exit-code channel (0/1/3/4) is honest per R2-F3.
- **Data-truth / schema drift:** N/A — no DB in scope. I cross-checked the "verbatim" transcripts against the `Write-Host` format strings (field order, `{0,-9}`+space producing the double space after `**FAIL**`, the restored `sandbox=` and `(want 4)`) — they are format-consistent, which is the strongest authenticity check available without the raw console. House-rule sweep: styled-components/Victory/palette/dual-button/44px/dark-first/WCAG are N/A for a PowerShell CLI; no PII flows to the LLM (market terms only); no yoga/meditation language; no credential-phrasing violations in the shown document. The one house-rule contact point is Blocker 2.

## HIGHEST RISK
Blocker 3 — it is the only remaining item with production semantics rather than test/process hygiene: five rounds were spent proving the gate covers every *route*, and nobody asked what code runs *before* the gate on every route. Cheapest de-risk: paste `Test-Preflight`'s body (or `grep` it for `env:`, `Invoke-Web*`, `Get-Credential`, any `&` invocation) — a two-minute read. If impure, move one line. If pure, close it as dry in the README so round 6 doesn't re-derive it.

## CONFIDENCE
I could NOT verify from the document: (1) `Test-Preflight`'s body — settles Blocker 3 outright; (2) `lib/Publish.ps1` and `tests/test-publish-gate.ps1` contents plus the README's actual cap language — settles whether Blocker 2 is a breach or a scope-ambiguity; (3) whether `SHIM_MODE clean` can ever produce a FLAGGED/quarantined report — determines Blocker 1's reachability vs. pure defense-in-depth (the asymmetry with the `-Yes` case stands either way, and this loop's own R4-B2 precedent treats that class as actionable); (4) the `$Jobs` construction — the "every route to spend" totality claim rests on all Runners being `Invoke-ReconJob`, plausible with one job file but not shown; (5) the sandbox boundary that keeps the agent from deleting FREEZE — asserted, never evidenced in five rounds; (6) the ~250 unseen lines of `Swan-Ops.ps1` — my review covers entry/main/loop only. I did not re-run the mutations; I trust the transcripts to the extent their internal format-consistency supports, which is meaningfully stronger than R4's retyped output but is not a re-execution.

**Q3:** Not dry — three findings that would change what the next agent or the owner does (add one assertion, state one scope sentence or trim one line, read one function and possibly hoist one line). All are single-line-or-single-sentence fixes; I predict the loop terminates next round if they land.

REVISE
