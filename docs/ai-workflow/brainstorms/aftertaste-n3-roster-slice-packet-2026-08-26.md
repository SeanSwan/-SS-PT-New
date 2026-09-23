---
decision: "Post-slice hostile review of N3 (rig + idle clip) and the roster slice (Ox-authored specs → 4 assets through the gate). Free seats only: Ox + GLM + me."
status: open
supersedes: none
privacy: IDs/roles only. "Owner" = the human product owner.
---

# SLICE PACKET — N3 + roster · 2026-08-26

## 0. Remit

Post-slice hostile review. **Paid credits are exhausted — this panel is Ox Alpha, GLM 5.3 and me, all free.** Two jobs: break it, and name the next slice.

Calibration: this project's recurring failure is *an instrument that did not run reports clean*. It has now recurred **ten** times across three days. Three more happened in this slice (§4). Assume an eleventh is here.

Shape: `## Verdict` · `## Blockers` (numbered, severity, file, concrete fix) · `## What the builder missed` · `## NEXT SLICE` · `## What I could not verify`.

---

## 1. N3 — the pipe rigs

`rig_and_animate()`: a 3-bone chain placed from the mesh's own bounding box (no per-asset tuning), bound by automatic weights, plus one 24-frame `idle` sway on the tip bone. Verified **in the bytes**: `lod0` has 1 skin and the `idle` clip; `lod1`/`lod2` have 0 skins, because only LOD0 animates. `export_apply` is off for the rigged tier (it bakes modifiers away and destroys the skin); the armature is dropped before the next tier so no armature modifier follows the copies.

The registry contract names five clips. **The pipe authors one, so the manifest declares one.** Adding `attack` yields `animation "attack" declared but not present in lod0.glb (clips in file: idle)`, exit 1. The four unauthored clips surface as a WARN.

`plan()` is conditional on `--skeleton`, because the run records executed stages and refuses its sentinel if the two disagree — a `rig` line in an unrigged run's plan would be a hard failure.

**My own containment rule was wrong, and rigging exposed it.** Probed: an unrigged mesh carries Blender's Y-up conversion as a node *rotation* with local vertex data; a skinned mesh has an identity node with the conversion baked into the vertices. Comparing the two **local** accessor boxes said the collision hull escaped the visual mesh by 4 units when in **world** space they are identical. A naive local-AABB rule would have blocked every rigged asset forever. `measure-glb` now exposes `worldAabb()` (node transforms composed, cycle-guarded), with fixtures proving it agrees across a node rotation vs baked vertices *and* still catches an oversized box.

## 2. The roster — a text model authoring assets

Ox Alpha cannot make meshes. It authored what actually bottlenecks the factory: **9 enemies as buildable specs** — voxel dims, cluster recipes with numeric offsets, silhouette-at-25 %-triangles, ≤4 Law-B palette slots, skeleton fit, clip intent, telegraph, counterplay tied to hydration/fiber/greens/movement, an IP row naming three nearest commercial comparisons, and a per-enemy health-language check. Roles span pressure → priority → objective with no two answering the same player question. The maître d' is a **prop with no body inside** — the force-feeding cut left an empty uniform as a capture objective.

`tools/blender/roster-to-obj.py` turns specs into blockouts and was built **against the author's own critique of my brief**: props parse with `rig=None`; an occupied-cell set equal to its own X-mirror is refused (asymmetry asserted, not trusted); and every block is judged and written independently so a truncated response yields usable assets instead of none.

That last one paid immediately: the generator **refused `enemy.grease-fly`** — its wing was authored at `(0,2,1)`, diagonal from the thorax, touching nothing, violating the author's own rule. Verified by printing each cell's 6-neighbours (the wing had zero). Moved to `(0,2,0)`, attributed in the roster beside the original. **8 of 9 survived.**

## 3. The pipe generalizes past its one calibration mesh

| asset | LOD0/1/2/collision | note |
|---|---|---|
| fryling | 292 / 146 / 60 / — | regenerated from the roster blockout, replacing the hand-made calibration shape |
| patty-larva | 417 / 177 / 96 / 24 | clean first run |
| grease-fly | 292 / 126 / 52 / 24 | clean first run |
| drip-cyst | 469 / 199 / 112 / — | `rig:none` prop path; **refused first**, see below |

`drip-cyst` refused with a diagnostic naming the exact probe to run. **I ran the probe instead of guessing** — the third time this project. It answered: un-beveled as-is 124 against a 117 ceiling, but un-beveled **+ collapse** 112. The ladder had a missing rung — rung 3 used the macro form as-is and never decimated it, so a blockout whose welded form sits just over its ceiling was refused for want of a free pass. Rung 4 added; `drip-cyst` descends 271 → 199 → 124 → 112 and passes. The other two re-ran byte-identical, so the new rung disturbs nothing that already fit.

**All four assets reproduce byte-identical** across every LOD and the collision hull, re-run into a staging dir with an exit-gated harness. Gate: **4/4 VALID**. Selftests: validator 29/29, measure 10/10.

## 4. What went wrong in this slice (attack these first)

- **B1 — The atomic swap ate four manifests.** Re-running the pipe with `--out` at a live asset directory destroys it, including the human-authored `manifest.json`. I did this to four assets at once. The validator's exit-2 "ZERO manifests" caught it. Restored from git; the pipe now refuses when `out_dir` holds a manifest and names the staging-dir workflow, with `--force` for a deliberate discard. **But the fix is a guard on one script — nothing stops the next tool from doing the same.**
- **B2 — A regression harness printed IDENTICAL for four runs that had FAILED and written nothing.** It compared before/after hashes without checking the exit code, so stale files matched themselves. Same shape as the earlier harness that printed SAME for files that did not exist. Fixed to gate on exit code first. **This is the tenth instance of the project's named failure class, and the second in this slice.**
- **B3 — A module split broke `stages.py`**: the ladder body was extracted at its original indentation. All four runs failed and it was B2's blind harness that hid it. Reverted to a smaller `textwrap.dedent`ed move.
- **B4 — I renamed an error message and my own fixture's regex still matched the old wording.** The reported FAIL was the expectation, not the rule.
- **B5 — The AABB fixtures were glTFs with meshes and NO nodes**, so a world AABB is undefined and the containment rule silently skipped: the fixture "passed" by not running. Fixtures now carry a node, and an uncomputable AABB is announced as a WARN.
- **B6 — Ratios remain priors.** `--lod-ratios / --planar-deg / --tier-table / --collision-ratio` are CLI-settable, but the defaults were probed on one mesh and four assets now depend on them.
- **B7 — Bake still does not exist.** Removed from `plan()` so it cannot lie, but `textureMB: 0` on every asset and the art law's "micro-detail becomes texture, not geometry" half is unexecuted.
- **B8 — Five roster enemies are specced and not built** (crumb-roach, pizza-husk, rot-maitre-d, rind-bulwark, glaze-decoy). Two are `rig:none` props; `rot-maitre-d` at 27 cells is the largest and untested at that scale.
- **B9 — Ox's own critique has open items I did not action:** the spawn-on-death hook for patty-larva's split has no manifest representation; `--world-portal` is orphaned in the enemy-facing palette subset; and "collision ≤ 25 %" is ambiguous between triangle count and hull volume (I enforce triangles).

## 5. Questions
1. Four assets through one pipeline — is that "generalizes", or four samples of one shape?
2. B1 and B2 are both "a tool destroyed/obscured state and only an unrelated check noticed". Is there one guard that covers the class, or is this inherently per-tool?
3. B9: which of Ox's three open items actually blocks the next slice?
4. What did 20+ pipe runs still not exercise?
