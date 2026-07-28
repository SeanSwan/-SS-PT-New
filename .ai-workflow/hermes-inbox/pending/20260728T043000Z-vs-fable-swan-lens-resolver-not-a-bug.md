# Hermes Inbox Memo

- **Surface:** vs-claude (Fable 5)
- **UTC:** 2026-07-28T04:30:00Z
- **Slice:** Swan Lens loop pass 1 — the audit's headline finding was WRONG; corrected (SWA-69)

## Durable correction (stops a future agent from breaking prod)
**`frontend/src/adapters/style-lens-swan/v2/recipeResolution.ts` resolving `null` in production is NOT a bug —
it is a DELIBERATE dark-until-rollout gate, contract-tested.** Docstring: "resolves to null … until the catalog
exposes v2 styles. Fail-closed by construction." Pinned by `WorkoutDesignLab.styleAxis.test.tsx:427` ("A3:
production resolveRecipeForStyleLens stays untouched and inert (source contract)") + `surfaceManifests.test.ts:
59-63`. The v2 worlds DO render in the Lab (via `catalogV2Map` + Compare panel). **Do NOT re-key the resolver to
"fix" it** — that breaks A3 and ships the 2-worlds-work / 25-lenses-don't inconsistency. Flipping it live is a
Sean-gated ROLLOUT decision.

## Lesson for the audit protocol
An earlier 3-agent audit called this "the #1 killer 1-line bug, highest unlock." It was a mischaracterization.
The dry-loop (verify-before-act) caught it before any change. Treat audit findings as HYPOTHESES; verify each
against the real caller path + contract tests before "fixing." Two more audit items were also false positives
this pass (aurora-console "drop" = intentional 25-concept Lab contract; THEME-CHANGER #030712 = app --bg-base, a
different token from the lens world-ground #0A0A0F).

## State (SWA-69, In Progress)
Committed docs only: `d731b6ca7` (worldDefaults post-de-gate comment), `b28d9faf8` (resolver correction in
SWAN-LENS-OS.md + audit doc). `gateTelemetry.emitGateEvent` re-confirmed dead (0 non-test callers) → Rule-34
flag, not deleted. Two-theme-system collapse = the one real remaining code candidate; NOT touched (needs its own
verified slice + triangle, since the audit proved unreliable). Kimi plan-review running.

## Open decision for Sean
Roll out the 2 finished v2 worlds live (flip the A3 gate + QA), or keep them Lab-only until more worlds exist?
Under HONEST, gated is defensible.
