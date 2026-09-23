# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-n1-slice-packet-2026-08-26.md
**Seed:** (none)
**Tokens:** 2746 in / 4190 out · **Cost:** ~$0.0000 · **Wall:** 141.0s · **finish:** stop

---

## VERDICT
REVISE — the run is real and the exit-code calibration is genuinely valuable work, but the slice ships with a validator that certifies content absent from the bytes (B4) and a third unresolved instance of the plan-says/code-doesn't failure class (B3), which is precisely this project's stated failure mode.

## BLOCKERS

1. **P0 — Validator certifies manifest claims the GLB does not contain.** Scenario: engine loads `assets/runtime/enemy/fryling/fryling.glb`, calls `clipAction("attack")` against an animation list read from the manifest → no such clip in the GLB's `animations` array → undefined mixer target, enemy renders static or crashes at first attack input. The manifest declares `skeleton.creature-small.v1` and five clips; the file has no armature and no clips, and `validate-asset --all` returned VALID. Evidence: §2 manifest contents; builder's own B4 admission ("A manifest can list five animations a GLB does not contain and pass"). Fix: validator must parse the GLB JSON chunk and require every declared clip to exist in `animations[]` and the skeleton in `skins[]` — this is a few hours, not a slice.

2. **P1 — `plan()`/`run_in_blender()` drift is now a recurring class, not an incident.** Run 1 (collision/still planned, not produced), now B3 (bake listed in `plan()`, never implemented, explicitly unfixed). Scenario: anything downstream that trusts `plan()` output as the contract — dry-run previews, budget forecasting, a future seat reading the plan instead of the code — believes bake exists. Evidence: B3, §2 pipe description. Fix: either implement bake or delete the line from `plan()` until it exists; add a test asserting `plan()` stages ⊆ executed stages.

3. **P1 — No atomic output; stale artifacts survive failed runs.** Six runs wrote into what appears to be a persistent out-dir (`swan_pipe_manifest.py` owns "out-dir"). Scenario: run N crashes at the still stage after writing GLBs → run N+1 fails earlier → `still.png` from run N−1 sits in the directory, measures fine, validates fine, and is hashed into a manifest describing different geometry. Nothing in §2 indicates temp-dir-then-swap or pre-run cleanup. Evidence: §2, `swan_pipe_manifest.py` responsibilities ("plan, stub, out-dir") with no purge mentioned. Fix: write to a fresh temp dir, fsync, atomic rename on full success.

4. **P1 — Per-mesh constants and a cube-shape assumption are hard-coded into a general pipe.** Ratios 0.45 / planar 40° / pre-bevel 0.45 are empirical for one 5-cube mesh (B1), and the final ladder rung — "un-beveled macro form" — implicitly assumes the source is a union of axis-aligned cubes. Scenario: the companion stage (Law A) or any organic mesh hits a different decimate floor → refusal path fires → pipe emits fewer LODs than the stub declared, or produces a collision mesh meaningless for a non-voxel silhouette. Evidence: probe results §2, B1. Fix: parameterize ratios per-asset in the manifest, and make refusal emit a *diagnostic* (which rung floored, at what ratio) rather than just exiting.

5. **P2 — Collision mesh is counted but never checked for validity.** 38 triangles from decimating the un-beveled macro form at 0.45: nothing verifies it is watertight, manifold, convex where the physics engine requires it, or fully contained by / containing the visual mesh. Scenario: physics broadphase tunnels through a non-closed hull or the decimated hull drops a limb's volume entirely. Evidence: §2 run 6 (count only). Fix: assert closed manifold + signed-volume sanity vs. source bounds in the collision stage.

6. **P2 — `--python-exit-code 1` is documented as non-optional but nothing enforces it.** The entire B6 discovery is worthless if the next caller (a teammate, CI, pre-commit config drift) invokes `blender -b --python swan_pipe.py` without the flag and gets exit 0 on a traceback again. Evidence: §2 ("documented invocation carries…"). Fix: wrap invocation in a shell/npm script that is the only sanctioned entry point, and/or have the pipe write a success sentinel file the caller checks.

## ATTACKS

**Correctness**
- **LOD0 inflation unexamined:** source is 30 quads = 60 tris; LOD0 is 260 tris — a 4.3× increase, presumably from the bevel step. Budgets were *measured*, so it passed, but nobody asked whether beveling LOD0 is intended or whether LOD0 should be the welded source. Off-by-design, not off-by-one.
- **Run-2 guard scope:** "a tier not strictly lower than the previous is refused" — verified for adjacent pairs only by the narrative. Does it catch lod2 == lod0 when lod1 differs? Probably, but untested in the document.
- **Determinism untested:** six runs produced four distinct hashes across tiers, but the document never shows the *same* inputs run twice producing identical hashes. Non-deterministic decimation would break the manifest-hash-as-provenance story silently.
- **"Structured similarity review"** in the provenance block names no metric, threshold, or tool. It is a claim-shaped string, not a measurement.

**Security**
- Attack surface is small (local build tool, no network, no secrets) — no authn/IDOR/injection findings. One supply-chain note: SHA-256 matched against the *mirror's own* `.sha256` is transfer-integrity (TOFU), not authenticity. Acceptable risk for a dev dependency; worth one line in the doc acknowledging it.
- gltf-transform correctly HELD while uncalled — good discipline, no finding.

**Data-truth / schema drift**
- This is where the document bleeds. Three distinct drift channels are live simultaneously: (a) manifest-vs-bytes (B4, blocker 1); (b) plan-vs-code (B3/run 1, blocker 2); (c) stub-declared-artifacts-vs-produced-artifacts, which run 1 exposed and which is only prevented by the run-2 refusal guard for LODs — there is no equivalent guard for missing `collision.glb`/`still.png` beyond "someone noticed." `textureMB: 0` passing VALID is the same lie in a numeric costume: the validator enforces budgets as ceilings but never as floors for slots the art law requires.

House rules: no violations found applicable to this slice — line counts compliant (max 260), no PII leaves the repo (IDs/roles only), no banned terminology, credentials phrasing not invoked. Frontend rules (palette, buttons, touch targets) have no surface here yet; flagging that N6/grey-box will be the first place they bind.

## HIGHEST RISK
The validator is a lying instrument (blocker 1). This project's own calibration statement names "an instrument that did not run reports clean" as its recurring failure class — seven times yesterday — and the slice's proudest line, "`validate-asset --all` → VALID," is currently produced by an instrument that checks clip *names* against a registry but not clip *existence* in the file. Every future asset inherits this lie automatically. Cheapest de-risk: before any new stage is built, spend half a day extending the validator to parse the GLB JSON chunk and fail on any manifest declaration (clips, skins, textures) absent from the bytes — then re-run it against fryling and watch it correctly FAIL, which converts B4 from an open secret into a red test. This also argues the next slice is **N3 with Rigify cut**: ship the byte-level presence validation now, defer the actual rigging pass. N2 (bake) on top of a lying validator just gives the liar more to mis-certify.

## CONFIDENCE
Could not verify from the document alone:
- Whether the pre-commit hook actually invokes the calibrated `--python-exit-code 1` invocation or a bare `blender -b` — the document says the invocation is "documented," not that the hook uses it. Evidence: the pre-commit config diff.
- Whether the out-dir is cleaned between runs — I am inferring staleness risk from absence of mention, not from shown code. Evidence: `swan_pipe_manifest.py` out-dir handling.
- Whether the run-2 refusal guard compares all tier pairs or only adjacent ones. Evidence: the guard's code in `swan_pipe.py`.
- Whether LOD0 beveling is intentional art direction or an accident that survived because budgets were measured rather than reviewed. Evidence: the design intent for LOD0, or a side-by-side render.
- Whether "structured similarity review" has any implementation behind it. Evidence: the module/function named in provenance.
- I have not seen `swan_pipe.py`, `swan_pipe_stages.py`, or the validator source; my blocker scenarios are constructed from the document's own admissions plus standard failure modes for this toolchain. Where the document is honest (and it is unusually honest — B1–B7 are self-inflicted wounds reported accurately), I trust its self-report; where it is silent (cleanup, guard scope, enforcement), I have assumed the worse case and flagged it as such.
