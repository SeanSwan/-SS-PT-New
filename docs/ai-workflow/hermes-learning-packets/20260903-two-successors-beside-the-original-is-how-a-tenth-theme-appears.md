---
date: 2026-09-03
originating_model: claude-fable-5
model_id: claude-fable-5-1
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider and Fable-tier by Sean's designation (Rule 68, 2026-06-10 / 2026-08-10)
title: Two successors built beside the original is how a tenth theme appears — unify from a mount-receipt inventory and a guard, never from the newest file
linear: SWA-68
commits: []
decision: Before designing "the one X", inventory every X by mount receipt (path-resolved lazy imports, multi-line JSX), count consumers per candidate, and ship a guard that fails when another appears; the newest or cleanest file is not the canonical one — the one with consumers and tests is
status: draft
supersedes: none
models_used:
  - model: claude-fable-5-1
    role: orchestrator + author + hostile reviewer
    did: scoped four read-only audits on an origin/main worktree, fused them, wrote the 676-line blueprint, ran three hostile rounds on it, verified two subagent claims by hand
    cost: subscription
  - model: explore-subagent (inherited)
    role: executor x4
    did: Victory inventory (61 files), mount receipts (25 surfaces + 7 orphans), theme/frame divergence matrix (23 single-source capabilities), data-hook + test coverage (0 mock, 6 zero-test modules)
    cost: subscription
skills_touched:
  - id: rule-30 (subagent skepticism)
    change: reinforced
    failure: a subagent ranked "client name baked into a shared PNG" as the top risk; the captured card never renders a name — verified before carrying the severity into the blueprint
  - id: rule-57 (ORIENT block)
    change: reinforced
    failure: blocked four times in one session (absent x2, over budget x2) despite the previous session's memo saying "render, don't type"
  - id: instrument-check
    change: reinforced
    failure: a mis-escaped grep reported 440 hits and a mis-escaped sed reported 0 replacements for the same 12 literal backslash-n strings; only a fixed-string grep told the truth
surfaces: [frontend/src/components/Charts, frontend/src/components/ClientProgressCharts, frontend/src/components/DashBoard/progress-proof, frontend/src/components/ui/forge, hooks/analytics, backend/routes/clientAnalyticsRoutes.mjs, backend/routes/analyticsRoutes.mjs]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# Two successors built beside the original is how a tenth theme appears

## What was decided/built (Fable-tier lesson)
SwanStudios had 61 chart-rendering files served by nine theme sources and seven frame systems. Two of those nine were *already* attempts at "the one chart": the `progress-proof` module (July, live, rich — expand modal, data table, insight strip, share studio) and the Forge `ForgeChart` + `forgeChartTheme` (August, zero-hex, the only reduced-motion-gated theme). The July module reached 2 of 15 client charts with its action bar and never reached the admin grid's palette; the August theme reached zero consumers. Each was built from the newest doc, not from an inventory of what was mounted. The blueprint written today (`CHART-SYSTEM-UNIFICATION-BLUEPRINT-2026-09-03.md`) starts from a mount-receipt inventory, names which existing file contributes each capability, and ships guards (no hex, no ungated animate, no fixed sizes, no local theme objects, path-resolved orphan sweep) that fail when the tenth dialect appears.

## Why (the rationale Hermes should carry forward)
"Make one default" fails when the author picks the cleanest file. Clean files have no consumers precisely because they are new. The canonical candidate is the one with 34 importers and the most tests, even though it has 24 raw hex literals; the zero-hex file donates its derivation, not its position. Unification is a strangler over the consumer graph, not a rewrite from the prettiest source.

## Reusable pattern / rule Hermes should apply next time
1. Inventory by **mount receipt**, resolving `React.lazy(() => import(path))` by path and matching JSX with `<Name([[:space:]/>]|$)` — a name-grep missed an aliased import (`NASMProgressCharts` → `ClientProgressCharts`) and multi-line JSX, which would have produced false "dormant" verdicts.
2. Build a **capability → source file:line** table and a **single-source list** (things that exist in exactly one file) before designing; those are what a merge loses.
3. Decide divergent values explicitly in a table (grid alpha 0.06 / 0.08 / 0.12 / 0.28 → one), and record any generic-tool rule the brand authority overrides (the dataviz lightness band) instead of silently passing or silently failing.
4. Ship guards in `warn` during migration and flip to `error` at close, so the strangler can land in slices without regressing.

## Who did what
Fable 5.1 scoped four audits with required-evidence prompts, refused to carry two subagent claims without verification, and arbitrated the palette conflict (design-brain says Arctic Cyan primary; the July blueprint said Ice Wing; CLAUDE.md's "data-only" token wins). The four Explore subagents were accurate on every spot-checked citation; one over-rated a severity (PII-in-pixels) and one left a lineage `[UNVERIFIED]` that took two greps to close. No external seat was consulted; Sean asked for token economy and a stop-and-wait.

## Skills created or changed
None created. Rules 30 and 57 and the instrument-check skill were exercised against real failures (listed in frontmatter). One proposal recorded in the blueprint: a path-resolving orphan-sweep helper (guard G6) so the aliased-lazy-import trap becomes a test, not a memory.

## Mistakes I made
- ORIENT block absent on two replies and over budget on two more → the Stop gate blocked four times. **This repeats a mistake already written up in the previous Fable session's memo ("render, don't type").** MECHANISM: the orient render is the last tool call of every turn, and `--set` strings stay ≤130 chars so the renderer never wraps; the existing `orient-gate` Stop hook is the enforcement — no new hook needed.
- Put backslash-n inside mermaid node labels; mermaid ignores it. Caught by my own check, fixed to `<br/>`. MECHANISM: guard G6's sibling — add a `docs-lint` check that fails on a literal backslash-n inside a ```mermaid fence (proposed in the blueprint's T8 close).
- The first check for that defect was itself wrong: a regex grep reported 440 lines and a same-escaped sed reported 0 replacements, and a later perl with the same escaping replaced every real newline in the file (recovered from the deterministic mapping). A fixed-string grep gave the true 12. MECHANISM: any pattern containing a backslash goes through the shell as a hex escape (`\x5c`) or a fixed-string match (`grep -F`), and a count is trusted only after two independent instruments agree.
- Carried a subagent's "top risk" label into my notes before verifying; verification downgraded it to LOW. MECHANISM: Rule 30 — a subagent severity enters a blueprint only with a verification grep cited beside it; the blueprint's §3.4 shows the form.
- Packed two multi-line documents into one shell command; the shell failed to parse the quoting and nothing ran. MECHANISM: documents go through the file-write tool, one file per call; the shell is for one-liners and validators.

## Error → fix → repeat ledger
| error class | recurrences this session | written up before? | what stopped it |
|---|---|---|---|
| ORIENT absent / over budget | 4 | YES — previous session memo #1 | nothing by memory; only the hook did. Fix is procedural: render last, budget the `--set` strings |
| escaping-dependent instrument (grep/sed) | 2 (grep false-positive, sed false-negative) | yes (instrument-check skill) | cross-checking two instruments that disagreed, then a fixed-string match |
| subagent severity taken as fact | 1 | yes (Rule 30) | verification grep before writing the blueprint row |
| backslash-n in mermaid labels | 1 | no | grep after writing; now a known class |
| multi-heredoc shell command fails to parse | 1 | no | Write tool for documents; shell for one-liners |

## External-model calibration
No paid or external model. Explore subagents (inherited model, subscription): 4 runs, roughly 130k tokens each, ~10 citations spot-checked all true; 1 severity disproven; 1 unverified claim resolved by the author. Worth using for wide read-only inventories with a required-evidence prompt; not for severity ranking.

## Risks / guardrails
- The blueprint is uncommitted on a branch 2,389 commits behind main; it must be committed with an explicit pathspec (shared index, Rule 67 R6) and cherry-picked or re-created on a fresh branch off origin/main before a worker builds from it.
- Six `[SEAN]` decisions gate T1; a worker who guesses them re-creates the "successor beside the original" failure this packet is about.

## Provenance & privacy
originating_model claude-fable-5 (model_id claude-fable-5-1); `scripts/scan-secrets.sh` on the blueprint: 0 hits, CLEAN; IDs/roles only; no absolute paths.
