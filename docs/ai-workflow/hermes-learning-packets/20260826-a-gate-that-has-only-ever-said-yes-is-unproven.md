---
name: a-gate-that-has-only-ever-said-yes-is-unproven
title: The pipe ran, the asset validated, and the manifest was lying — a budget that IS the measurement cannot be failed, and an exit code the runtime does not propagate is not an exit code
originating_model: claude-fable-5
tier: fable
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10); Opus 5 / Kimi K3 designated Fable-tier 2026-08-10
date: 2026-08-26
decision: A validator is proven only when it has been seen to REJECT; a budget must be independent of the measurement it judges; a runtime's exit code is trusted only after a deliberate crash was seen to propagate; and a plan is a contract only when the code asserts it executed every stage the plan lists
status: current
reviewed_by: standing N1 panel — Ox Alpha, GLM 5.3, HY3, Fable (builder-adversary); 4/4 REVISE, converging on the same P0 before it was announced fixed
supersedes: none
surface: tools/blender (swan_pipe + stages + manifest + smoke + probe + run-blender wrapper), scripts/assets (validate-asset rules + selftest), assets/runtime/enemy/fryling
commit: 21f05838d, e1a09ecbd, + the N1-panel fix commit on claude/aftertaste-p0-20260825
models_used:
  - model: claude-fable-5
    role: builder, sixteen pipe runs, own seat, synthesizer
    did: installed Blender 4.5.13 LTS (hash-verified portable zip); ran smoke then pipe; six runs to the first clean asset, sixteen to the honest one; found the manifest lie by parsing bytes AFTER the gate had passed it; two wrong mechanism hypotheses (UV seams; planar 20deg) before probing
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (standing first seat)
    did: validator certifies content absent from bytes (P0); plan/code drift is a class, not an incident; no atomic output so stale artifacts survive failed runs; per-mesh constants hard-coded; collision never checked for manifoldness (TRUE — the committed hull had 15 open edges); --python-exit-code documented but enforced nowhere
    cost: $0
  - model: glm-5.3
    role: hostile reviewer
    did: budgets are TAUTOLOGICAL (budget := measurement), so the gate cannot fail a count and the ladder stops at the first monotone rung (103) instead of the art-law rung (52) — proven exact on the next run; bpy.ops returns CANCELLED without raising; plan() not tied to executed stages; determinism never shown; --disable-autoexec for Rigify appends. Its weld doubt was disproven by code + probe
    cost: $0
  - model: tencent/hy3
    role: hostile reviewer
    did: manifest-over-bytes trust as highest risk; plan-vs-implementation drift on bake
    cost: $0.003
skills_touched:
  - id: instrument-check
    change: reinforced (two NEW instances)
    failure: (a) Blender exits 0 on an uncaught Python exception — four pipe runs were read as "exit=0" while one had a traceback; (b) a determinism harness printed SAME for files that did not exist, because both sha256sum outputs were empty strings
  - id: test-driven-development
    change: reinforced
    failure: a validator with 24 passing fixtures had never rejected a real asset. It passed a manifest declaring a skeleton and five clips over a GLB with zero skins and zero clips. The fixtures tested the manifest's vocabulary, never the asset
  - id: rule-20 (sibling sweep)
    change: reinforced (violated twice)
    failure: fixed collision+still missing from the pipe and left bake in the same state; fixed CLI-on-import in two modules and left the third
  - id: rule-4 (300-line cap)
    change: reinforced
    failure: the pipe crossed 300 twice during fixes; split each time — but the cap is doing its job: it forced a stages module and a bpy-free manifest module that made --dry-run possible without Blender
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A gate that has only ever said yes is unproven

## What was decided/built (Fable-tier lesson)

Blender was installed, the smoke script proved the two unverified background-mode calls, and the pipe ran. Six runs to the first clean output; sixteen to an honest one. Each run found something reading had not:

- Run 1 produced three LOD files — two of them identical — and silently omitted two artifacts its own plan listed and its own stub declared.
- Run 4 crashed with a traceback **and reported exit 0**. Blender does not propagate uncaught Python exceptions to its exit code. Every "pipe exit=0" I had read before that moment was worthless. Calibrated by probe: `sys.exit(N)` propagates, an uncaught exception does not, and `--python-exit-code N` exists for exactly this.
- After the first clean run, the asset validated and was committed. Then I parsed the GLB myself: **0 skins, 0 animations**, against a manifest declaring a skeleton and five clips. The validator had checked clip *names against a registry list* and never looked in the file. The gate passed a lie, and passed its own commit.
- The panel then found what my sixteen runs had not: the budgets were **tautological** — I had defined budget as the measured number, so the gate could not fail a triangle count in principle, and the LOD ladder was picking the first rung that was merely *lower* (103, 40% of LOD0) instead of the rung that met the art law (52, 20%). With a tier table independent of the measurement, the very next run walked past 124 and 103 and landed on 52. The collision proxy I had committed was **not a closed manifold** (15 of 49 edges open); the check Ox asked for fired the moment it existed.

## Why (the rationale Hermes should carry forward)

**A validator is unproven until it has been seen to reject a real thing.** Twenty-four green fixtures proved the fixtures. The first real rejection happened only when a rule was written against the bytes rather than the manifest's words. Green in one direction is not evidence about the other direction.

**A budget must be independent of the measurement it judges.** If the declared number *is* the measured number, the comparison is an identity, and every "check" is theatre. The tier table — fractions of LOD0 fixed by policy, not by observation — is what made the ladder descend to the correct rung.

**An exit code is trusted only after a deliberate failure was seen to propagate.** I read four exit codes from a runtime that swallows Python crashes. The honest instrument was always the artifacts: does the file exist, does it measure. I had that instrument and read the exit code anyway.

**A plan is a contract only if the code asserts it executed every planned stage.** Plan/code drift hid two missing artifacts on run 1 and would have hidden the missing bake stage indefinitely. Now the run records each stage and refuses to write its success sentinel if any planned stage did not execute.

**Asserted mechanisms are not diagnoses.** I explained the LOD floor twice from reasoning (UV seams; planar 20°) and was wrong twice. The probe — decimate the actual mesh at six ratios in three modes — answered in one run. Probe before hypothesising, when a probe is cheap.

## Reusable pattern / rule Hermes should apply next time

1. Before calling a gate "the gate", make it reject something real. A red test on the actual asset, not on a fixture shaped like the asset.
2. Budgets, ceilings, thresholds: never derived from the thing they judge. Store policy separately from measurement; the validator compares the two.
3. First act after installing any runtime: crash it on purpose and read the exit code. If 0, wrap it (the pipe now catches everything and `sys.exit(1)`s; the sanctioned wrapper forces `--python-exit-code 1` and checks a success sentinel — a 0 with no sentinel is a failure).
4. Every stage in the plan writes to a ledger; the run refuses success if the ledger is short.
5. Output to a temp dir; atomic swap only on full success; cleanup on any failure. Stale artifacts from a failed run must never be where `--all` can find them.
6. Determinism is proven by two runs and a hash compare — with a harness that cannot say SAME when a file is missing.
7. Rule 20 is a same-commit discipline: when a defect class is fixed in one place, grep for every sibling before committing.

## Who did what

**Ox Alpha** gave the most fixes per finding again (six blockers, five adopted, all proven by control; its collision-manifold call was true of the committed asset). **GLM 5.3** found the deepest one — the tautological budget — and its prediction of the ladder's behaviour under a real ceiling was exact on the next run; its `bpy.ops` CANCELLED channel and `--disable-autoexec` were adopted. **HY3** independently named the manifest-over-bytes trust as the highest risk for $0.003. All three chose the validator-first slice, which I had already committed on my own seat's probe before their verdicts arrived — a convergence, recorded as such. **I** ran sixteen pipe executions, read four lying exit codes, hypothesised two wrong mechanisms, committed a non-manifold hull and a lying manifest, and found the manifest lie myself only by parsing the bytes after the gate had blessed it.

## Skills created or changed

- `scripts/assets/run-blender.mjs` — the only sanctioned way to run a Blender script: locates the portable install, forces `--disable-autoexec --python-exit-code 1`, refuses success without the sentinel.
- `tools/blender/probe-decimate.py` — promoted from scratch to tool: decimation behaviour at N ratios × 3 modes on a real mesh. Run before choosing ratios for a new asset class.
- `swan_pipe` — tier-table ladder with refusal, stage ledger, atomic output, `{'FINISHED'}` + artifact asserts, per-stage triangle logging, CLI ratios, convex-hull collision with a manifold check.
- `validate-asset.rules` — skins/clips presence from the bytes, tier-table enforcement, collision-AABB containment. 29 fixtures, several built on real minimal GLBs.

## Mistakes I made

- Committed a manifest declaring a rig and five clips over an unrigged GLB, and a collision proxy with 15 open edges — both stamped VALID by my own gate.
- Read "exit=0" from a runtime that does not propagate Python crashes, four times.
- Asserted two mechanisms for the LOD floor without testing either; both wrong.
- Wrote a determinism harness that printed SAME for files that did not exist.
- Defined budgets as measurements and called the comparison a check.
- Left `bake` in `plan()` after fixing the identical drift for two other stages; left the third CLI-on-import module after fixing two.
- Wrote an edit script whose first anchor did not match and whose heredoc swallowed the rest — nothing applied, and I nearly read the *old* file's test results as the new file's.

## Error → fix → repeat ledger

| Error class | Times (this slice) | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Instrument reports clean without measuring the thing** | **3** (Blender exit 0 ×4 reads; SAME-on-missing-file; tests run against un-edited files) | yes — five packets in two days | The wrapper + sentinel (tool); artifact checks instead of exit codes; harness guards `[ -f ]` |
| Gate validates vocabulary, not the artifact | 2 (clips/skins; tautological budgets) | no | Rules that read the bytes; policy stored apart from measurement |
| Mechanism asserted without a probe | 2 (UV seams; planar 20°) | no | `probe-decimate.py` — run it first |
| Plan/code drift | 2 (collision+still; bake) | first instance written up in the same slice | Stage ledger + refusal to write the sentinel |
| Sibling not swept | 2 | rule 20 exists | grep before commit; not yet mechanised |

## External-model calibration

Ox 6 findings / 5 adopted / 1 disproven (negative triangles, already clamped) / $0 — its collision call was true of the committed artifact. GLM 7 / 6 adopted / 1 disproven (weld exists; probe confirms 52 post-weld) / $0 — the tautology finding is the single highest-value review item of the slice. HY3 2 / 2 / $0.003. **Every seat found the P0 that my sixteen runs, five dry-loop rounds and a green 24-fixture suite did not**, because all of those exercised the manifest and none exercised the bytes.

## Risks / guardrails

- The pipe is proven on ONE mesh. Ratios and fractions are priors for this asset class; a second class must be probed first.
- `bake` is out of the plan until it exists in the code; the asset has no textures (`textureMB: 0`).
- The asset is unrigged — the manifest now says so. A rigged asset cannot pass the gate until the pipe can produce one; that is the next slice.
- Branch pushed, PR #84 open, `main` untouched.

## Provenance & privacy

originating_model claude-fable-5 · tier gate PASS · secret scan clean · IDs/roles only.
