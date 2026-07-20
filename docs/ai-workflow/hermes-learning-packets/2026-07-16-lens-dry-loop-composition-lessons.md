---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-16
topic: Lens dry-loop closure — composition review of parallel-lane systems; the F16 carve-out and honesty-flag patterns
surfaces: [adapters/style-lens-swan, workout-design-lab, LENS-ADD-A-STYLE.md, BLUEPRINT-lens-world-fusion-2026-07-14]
---

## What was decided/built (Fable-tier lesson)
Sean's until-dry mandate on the Lens Finish work ran 3 fresh-eyes hostile rounds against ~265
commits of parallel Wave-1 work: round 1 (1 BLOCKER + 1 HIGH + 1 MED + 2 LOW) → round 2
(2 MED + 2 nits) → round 3 DRY. Every fix shipped to main and was verified in the DEPLOYED
production bundles, not just git history.

## Why (the rationale Hermes should carry forward)
The BLOCKER was pure composition: two individually-correct systems — this chat's five-entry
ADD-A-STYLE pipeline and Wave-1's F16 registry-integrity gate — combined into a guaranteed
adapter-init crash for every future style. Neither lane broke its own tests; only a review of
the COMPOSITION found it. The fix was a principled carve-out at the seam: exempt exactly the
class the pipeline creates (dashboardChrome:false = "no chrome by design, and the UI says so"),
keep the gate's teeth for everything else, zero behavior change today, test-locked in both
directions.

## Reusable patterns Hermes should apply next time
1. **Composition review after parallel bursts:** when two lanes ship gates/pipelines touching one
   registry, hostile-review what they compose into — each lane's green suite proves nothing about
   the seam.
2. **Carve-out at the seam, not a weakened gate:** exempt a PRINCIPLED class (one the design
   already declares honest), never an id list; assert the exemption cannot widen (no-weakening
   test) and that the classifying flag matches ground truth bidirectionally (honesty gate:
   flag ⟺ allowlist reality). A boolean that drives BOTH user-facing copy AND a gate exemption
   must be asserted, not type-checked.
3. **Wording-rot lives in executable criteria:** Rule-53 sweeps must cover acceptance-criteria
   files, not prose — builders execute criteria. The worst rot direction is a stale word
   NARROWING a ban (the "six surfaces" autoplay ban vs 16 real lens-wearing surfaces).
4. **Blast-radius statements rot fastest:** build plans must carry re-enumeration COMMANDS
   (rg at build time), not counts.
5. **Deploy-verify composition in the served bundle** (grep chunk-graph markers), because parallel
   lanes redeploy constantly; and derived counts + append-tolerant ordering are what let a data
   pipeline survive parallel consumers (aurora-console #26 shipped through it with zero count
   edits — first real proof).

## Risks / guardrails
- The fusion blueprint's F3 now restyles 16 surfaces incl. public v-next pages — the F3
  checkpoint + Sean ping must see the full list.
- Crystallize sheen (z300) vs confirmation chip (z95): the future wiring slice decides layering
  deliberately (contract comment left in LabConfirmationChip).
- Roving tabindex: exactly one tab stop in the catalog; regressions fail the pinned test.

## Provenance & privacy
originating_model: claude-fable-5 (this session, review arbiter + fixer; findings from a
fresh-eyes subagent, each verified against real code before acting). Sanitizer: PASS. IDs only.
