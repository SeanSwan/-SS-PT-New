---
decision: "Post-slice hostile review of P1 (validate-asset gate + Blender pipe + reject→accept proof) — and: what should the NEXT slice be?"
status: open
supersedes: none
privacy: IDs/roles only. "Owner" = the human product owner.
---

# SLICE PACKET — P1 (Project Aftertaste) · 2026-08-25

## 0. Your remit

Post-slice hostile review. The slice is committed locally. Two jobs:

1. **Break it.** What is wrong, weak, or fake about this slice.
2. **Pick the next slice.** The Owner explicitly wants the next slice chosen *from your reviews*, not from the plan's default ordering. Name ONE next slice, say why it beats the alternatives, and say what you would cut.

**Context that should shape your suspicion:** the builder shipped a false grounded fact to a paid panel earlier today (§1). Assume that class of error survives somewhere in this slice.

Answer in this shape: `## Verdict` (APPROVE / REVISE / REJECT) · `## Blockers` (numbered, severity-tagged, exact file/§ + concrete fix) · `## What the builder's own dry-loop missed` · `## NEXT SLICE` (one recommendation + why it beats the others + what to cut) · `## What I could not verify`.

---

## 1. Standing context (the error this project is calibrated against)

A prior review packet asserted as grounded fact that `world.miniature-play.voxel-realm` did not exist and that the plan citing it had hallucinated a repo anchor. **It exists** — `docs/ai-workflow/design-brain/worlds.md` entry 16 of 18, carried in the frozen expected-ID list in `scripts/ai-workflow/world-engine-catalog-validation.mjs`. The verifying command was `grep -nE "miniature|voxel" <file> | head -8`; entries 14 and 15 filled the cap. Five paid seats received the false row; four made it a P0 blocker; one seat's REJECT rested on it. The same truncation failure class had been written into this repo's learning corpus hours earlier and recurred anyway.

P0 corrected it and built a guard. **P1 is the first slice that produces working code.**

---

## 2. What P1 shipped (commit `a7a0a3801`)

Branch `claude/aftertaste-p0-20260825`, worktree off `origin/main`. **Still not pushed** — `origin/main` lacks all of it. Nothing installed (no Blender, MagicaVoxel, gltf-transform, R3F): installs await the Owner.

### 2.1 `scripts/assets/validate-asset.mjs` (~300 lines)
The gate the registry lacked. Enforces the registry as the asset namespace, and carries forward the provenance doctrine already in Voxel Realm rather than inventing a parallel one.

Refuses: an id absent from `assets/registry.json` · a flat zone id that cannot join the frozen world catalog · a clip outside the skeleton's declared set · **a bare budget number with no `{tool, command, date, commit}` measurement provenance** · Draco on a rigged/morph-target asset · a free-text or delimited license (must be structured `{kind, modelName, modelVersion, licenseId, receiptPath}`) · `aiAssisted` that is not a real boolean · `similarityReviewed !== true` · a missing runtime file · a `sha256` mismatch.

**Exit codes:** 0 valid · 1 invalid · **2 instrument failure** (missing/malformed registry, unreadable manifest, zero manifests found). Zero manifests validated is never a pass.

Selftest: `--selftest` runs 11 rule fixtures with no repo assets. **11/11.**

### 2.2 `tools/blender/swan_pipe.py` (~230 lines)
`voxel source → weld → limited dissolve → BEVEL → auto-smooth → UV → bake normal/AO/roughness → LOD0/1/2 + collision proxy → GLB`. This is the translation the inherited art law requires: voxel is the authoring dialect, never the draw dialect.

**STATUS: UNRUN.** Blender is not installed. Every `bpy` call is written against the 4.5 LTS API and has **not executed**. `--dry-run` prints the pipeline plan and emits a manifest stub without Blender — that is the only path exercised.

The stub it emits is **deliberately invalid** (provenance empty). Rationale: a pipeline that pre-fills provenance launders it.

### 2.3 The proof
A genuine single-triangle **glTF 2.0 binary** was generated (not a stub): container verified — magic `glTF`, version 2, declared length == actual length (428 bytes). Then:

- **STEP 1** — pipe stub through the validator → **INVALID, 9 errors**
- **STEP 2** — completed manifest → **VALID**

The budget in the accepted manifest is **measured from the file itself** — accessor count read out of the GLB's JSON chunk — carrying `tool/command/date/commit`. It is the first non-fabricated number in the repo. (Its value is 1 triangle, because the fixture is one triangle.)

---

## 3. The builder's dry-loop (attack these, and find what they missed)

| Round | Vantage | Found |
|---|---|---|
| R1 | Run the validator on real pipe output | **2 defects.** `aiAssisted: null` slipped the check (`null !== undefined`) — and the pipe stub emits exactly that, so the single most important provenance question was skippable *by the tool that generates manifests*. And `--all` pointed at a central `assets/manifests/` dir while runtime paths are manifest-relative, so it could never resolve its own files. Both fixed. |
| R2 | Syntax after edit | **1 defect, self-inflicted.** A glob written into the JS docblock contained a star-slash, which closed the comment block and broke the module. A `sed -i` did it. Repaired. |
| R3 | Tamper / deletion / empty-tree controls | **Test was faulty, code was right.** A byte flip at offset 400 appeared NOT to be caught — because offset 400 is BIN-chunk zero padding and the write was a no-op. Re-tested on a genuinely different byte and on a length change: both caught. |
| R4 | Different cwd · degraded mode · malformed registry · missing registry · unregistered id on real files | 0 new. Degraded mode warns rather than silently passing; malformed and missing registry both exit 2; unregistered id refused. |
| R5 | Real `git commit` path + full battery replay | 0 new. |

`DRY-LOOP: CLEAN×2 (rounds: 5)`

### Builder's own residual doubts (attack these first)
- **B1 — The proof may be too easy.** One triangle, no rig, no textures, no compression, hand-authored bytes. It proves the *validator's* plumbing. It proves nothing about Blender, about bevel/bake quality, about LOD behaviour, or about whether a real voxel mesh survives the pipe. Is "reject→accept on a synthetic fixture" a legitimate P1 exit, or a green light bought cheaply?
- **B2 — The pipe script is UNRUN code.** ~230 lines of `bpy` written from API knowledge, never executed. Historically this repo's worst failures are exactly "looks right, never ran." Should unrun code be committed at all, or held until Blender exists?
- **B3 — `swan_pipe.py` can't read `.vox`,** the actual authoring format. It raises with a workaround message (export `.obj`, or route through Goxel for glTF). So the "voxel → runtime" pipe does not currently start at voxels.
- **B4 — No `optimize.mjs`.** The blueprint's tool #2 (gltf-transform: prune/dedup/KTX2/meshopt) is absent, so nothing produces compressed runtime output. The validator checks `compression` but nothing sets it.
- **B5 — The validator is ~300 lines** and the repo cap is 300. It is at the line.
- **B6 — Still unpushed.** Every guard and gate built in P0 and P1 is branch-local; the shared tree where the original error happened has none of it.
- **B7 — Measured budget of "1 triangle" is true but useless.** It proves the mechanism, and it also means the first entry in the budget ledger is a number no real asset will ever resemble. Does that poison the ledger the same way a fabricated number would?

---

## 4. The next-slice question (the Owner's actual ask)

Candidates on the table:

- **N1 — Install Blender + gltf-transform + MagicaVoxel and run one REAL asset through the pipe.** Turns B1/B2/B3 from unknowns into facts. Requires the Owner to approve installs.
- **N2 — Push the branch / open the PR.** Resolves B6; makes every guard live in the tree where the error happened; unblocks any other agent. Requires the Owner.
- **N3 — Build `optimize.mjs` (gltf-transform) + the perf-lab harness.** Completes the pipeline's back half; needs an install to actually run.
- **N4 — P1.5 grey-box fun probe** (48h, primitives in a standalone Vite app, no art). Answers "is the loop fun" before any art spend. Needs no installs — R3F resolves clean (verified: React 18.2 + three 0.169 + fiber 8.18 + drei 9.122, 82 packages, zero peer conflicts).
- **N5 — Harden what exists**: split the validator under the line cap, add `.vox` support, write the manifest schema doc.

**Answer with ONE.** Say why it beats the others given: the business gate is DEFER (production integration waits for ~50 weekly-active users + truthful chart data), installs need the Owner, and the Owner's stated priority is a repeatable asset factory that also feeds app assets (badges, companions) while the game itself stays deferred.

---

## 5. Questions
1. Is the reject→accept proof legitimate, or does B1 make it theatre?
2. Should unrun `bpy` code (B2) have been committed?
3. Does the 1-triangle measured budget (B7) poison the ledger?
4. What did the dry-loop's five rounds not look for at all?
5. Is anything in this slice downstream of a claim the builder has not actually verified?
