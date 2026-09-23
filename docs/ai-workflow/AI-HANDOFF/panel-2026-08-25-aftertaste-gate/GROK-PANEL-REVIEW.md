# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs/ai-workflow/brainstorms/aftertaste-branch-gate-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 4086 in / 13464 out · **Cost:** ~$0.0888 · **Wall:** 229.9s · **finish:** stop

---

## VERDICT
REVISE — land the P0 instruments (catalog-check, path-safe validator, measure-glb, void banners); do not push this as a pipeline, do not install gltf-transform, and do not let `swan_pipe.py` be the first Blender process.

## BLOCKERS
No production-crash P0 is demonstrated in the JS validators as described (fryling plumbing can exit 0). The Owner’s actual next motion — push this branch as foundation, then install Blender 4.5 LTS + gltf-transform and run `swan_pipe.py` — has the following stop-the-hand items.

1. **P0** — First Blender invocation is uninterpretable. Inputs: `blender -b --python tools/blender/swan_pipe.py` on a fresh 4.5 install. State: script UNRUN; `export_scene.gltf` in background marked UNVERIFIED (upstream 83188); `uv.smart_project` kwargs UNVERIFIED; output manifest is *deliberately INVALID*. Wrong output: crash, empty GLB, or a validator reject that operators will misread as install failure vs known API hole vs intentional stub — the same class as “misread EXIT 2 as pass.” Evidence: §2.1 `swan_pipe.py` (269, UNRUN); F7; commit `a7a0a3801` / `8d6b36ea5`.

2. **P0** — Shared-hook push under four live agents with behavioural overlap **unchecked**. Inputs: rebase onto `origin/main` (+18 commits / 60 files, merge-base `08215328c`) then push `.githooks/pre-commit`. State: file overlap with this branch is 0 (`comm -12`), but new hook *stages* (husky/lint-staged/lefthook/`prepare`, a second pre-commit entry) were not audited; guard is fail-open. Wrong output: (a) guard throw → exit 0 → truncated-absence docs land again; or (b) fail-open short-circuits a fail-closed stage added on main. Evidence: F8; §2.1 `scripts/hooks/truncated-evidence-guard.mjs` (117) “Fail-open on its own errors.”

3. **P1** — `chromeLaw` is the P0 correction and is not a gate. Inputs: registry-listed id, namespaced zone, `similarityReviewed: true`, `budgets: null`, asset chrome that touches a Swan-branded surface. Output: `validate-asset.mjs` exit 0. The constraint that justified this branch cannot fail closed. Evidence: §2.1 `assets/registry.json` “Nine fields are declared and never read”; F1.

4. **P1** — Provenance is a string shape. Inputs: `budgets: {tool:"x", command:"echo ok", date:"no", commit:"deadbeef"}`. Output: accept. `git cat-file -e <commit>` is not done. Evidence: F3; P1 panel carried it open; `validate-asset.mjs` (292).

5. **P1** — Guard conjunction is bypassable. Inputs: added lines contain an ABSENT claim; the truncating instrument (`| head`, `grep -m`, `.slice(0,N)`, …) already exists elsewhere in the file (not in the added hunk); no `EVIDENCE-OK`. Output: commit proceeds. The morning failure class (claim far from its instrument) is only half-fixed. Evidence: §2.1 guard “**added lines, anywhere in the file**, contain an absence claim AND a truncating instrument AND no denominator.”

6. **P1** — Voxel-realm assets cannot use this pipe without being destroyed. Inputs: MagicaVoxel `.vox` (the native format of `world.miniature-play.voxel-realm`) → raise + “export .obj”; then obj → weld → limited dissolve → BEVEL → smooth-by-angle → LOD. Output: not voxels; or no output. Evidence: §2.1 “`.vox` is NOT supported”; pipe step list; zone `world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court`.

7. **P1** — `SWAN_ALLOW_DEGRADED=1` can vacate the P0 zone-FK check. Inputs: absent/malformed world catalog + env set. Output: exit 2 overridden; worldId-vs-frozen-list behaviour unspecified — either every zone fails or the namespacing rule stops existing. Evidence: §2.1 `validate-asset.mjs` “Exit 2 on … absent world catalog (`SWAN_ALLOW_DEGRADED=1` to override knowingly).”

8. **P2** — House rule `<=300` is already at the wall: `validate-asset.mjs` 292/300. Next panel fix is a rule break unless split first. `swan_pipe.py` 269. Evidence: F9; §2.1.

9. **P2** — Compression policy is a no-op. Inputs: `"compression": "none"` (what the unrun pipe emits). Output: pass, because the validator only inspects compression when it is `draco`. `optimize.mjs` does not exist. Evidence: F6; §2.1 `swan_pipe.py`.

Do not install gltf-transform until something in-tree calls it. That is an install no-go, not a line-of-code bug.

## ATTACKS
- Correctness: Happy path is a hand-authored non-indexed 1-triangle GLB ×4 (`assets/runtime/enemy/fryling/`) plus 16 selftest fixtures that “need no repo assets.” That set cannot fail the ways Blender fails (indices, strips/fans, applied bevel, UV kwargs, background `export_scene.gltf`, LOD0/1/2, weld-welded normals). Container check (magic / version 2 / length==bytes) is not glTF schema validity and not a round-trip. `measure-glb.mjs`’s indexed 40k-tri fixture lives in the measurer’s own tests, not in the proof asset — the proof never exercises the unit that P1 just had wrong. Selftest vs fryling never meet; if CI only runs `validate-asset.selftest.mjs` (83, 16 fixtures), the real manifest is untested. `budgets: null` makes the budget gate opt-in; the 4 MB / 1500-tri “sanity flag” cannot reject. Builder tests encode builder assumptions: pins for `aiAssisted: null|"false"`, traversal, absolute path, `__proto__` — nothing for chromeLaw, fake commit, `compression:"none"`, 256 MB boundary, LOD, `.vox`, degraded+empty catalog, or pipe output. `swan_pipe.py` emitting a deliberately-INVALID stub means there is no green path from Blender to a validating asset without a human rewriting the manifest — an unrun honour step. Fail-open guard + `EVIDENCE-OK:` is the opposite of the lesson the three learning packets claim to have encoded (F10).

- Security: Path traversal / symlink / absolute / >256 MB-before-read were closed in `528dc1c20` and should stay closed — do not re-find. Residual: registry is a mutable root of trust (F4); any agent that can edit `assets/registry.json` + a manifest registers anything (self-attestation). No CODEOWNERS/write-control described. `similarityReviewed: true` is an honour flag with no reviewer/date/comparanda (F2) — Voxel Realm’s provenance clause names *what* to exclude; the field records that someone typed `true`. Degraded env is a local authz bypass of the catalog. Guard fail-open is a control-plane bypass. Runtime serving/authz/IDOR for these assets is not in the branch; authoring-time path containment will not protect a later CDN/tenant route. `swan_pipe.py` argv/path sanitisation is not shown (Blender Python is a code-exec surface). Installing gltf-transform with zero callers adds supply chain for no function.

- Data-truth / schema drift: Nine declared registry fields have zero readers (`chromeLaw`, `bannedLikeness`, `lawBRestriction`, `proofActionContract`, `antiCheese`, `shardFraming`, `loreParent`, `idRule`, `statusValues`) — schema is documentation. Dual world-ID sources: frozen list in `scripts/ai-workflow/world-engine-catalog-validation.mjs` vs `assets/registry.json` vs prose; this morning’s false-absence class returns the day those lists diverge. Python stub keys (`compression`, manifest shape) vs JS camelCase (`aiAssisted`, `similarityReviewed`, `budgetPriors`, `calibrationFixture`) are an untested cross-language contract; the stub is INVALID on purpose so the drift will be discovered as a mystery reject. `catalog-check.mjs` on `.md` is a superset (PRESENT weak, ABSENT strong) — residual error is now false PRESENT. License became a structured object (good) but chromeLaw/lawB never bind. Provisional unsearched maître-d’-of-rot lore is still being pushed onto `main` as foundation (§2.2) — P0 “boss re-cast unsearched” was closed with a banner, not a search. “Blender 4.5 LTS” is an API-generation claim in the same family as this morning’s “written against the 4.5 API” false row; not evidenced here.

Fable F1–F4, F6–F9 are real and correctly ranked as foundation rot. Attack F5: commit-msg scope is fair; Linear/chat is theatre. Attack F10: the fourth tool is not another learning packet — it is fail-closed CI on the guard, `git cat-file -e` on provenance, and a chromeLaw reader in a **new** file (do not touch 292). What three panels missed is the *shape*: a mesh-bevel-smooth pipeline for a voxel world; a gate that does not enforce the law the gate exists for; unrun code listed as a peer of running tools; unused gltf-transform as “install progress”; four copies of the same triangle as diversity; SaaS PT product surface (styled-components, Victory, 44px, WCAG, Dual-Button Glow) untouched while Swanverse assets become `main`’s foundation with no runtime tenant story.

## HIGHEST RISK
Honour-system registry + unrun pipe will be treated by every later slice as “the validator said OK.” Cheapest de-risk before any ship/install: (1) freeze other agents, fetch, audit **all** hook entrypoints (`core.hooksPath`, husky, lint-staged, lefthook, `prepare`), rebase, run the guard in a fail-closed CI job against the rebased diff, then push; (2) do **not** run `swan_pipe.py` first — a ≤10-line smoke (`wm.obj_import` → `export_scene.gltf` one cube, assert a GLB exists) on the real 4.5 binary, isolate 83188; (3) defer gltf-transform until `optimize.mjs` exists; (4) add `CODEOWNERS` on `assets/registry.json` and a new <100-line reader that fail-closes missing `chromeLaw` and `git cat-file -e` on provenance commits — do not add lines to `validate-asset.mjs`.

## CONFIDENCE
I do not have the tree. I could not run `grep`, `comm -12`, `git cat-file`, the selftest, or Blender. Unverified from the packet alone, and what would settle it:

- Whether `.githooks/pre-commit` is what git actually invokes (`git config core.hooksPath`, husky/`prepare` present or not). A hook file that never runs is this morning’s “fixtures where Node could not see them → nine exit=0.”
- Exact selftest matrix (the 16 names), whether CI calls `validate-asset.mjs` on `assets/runtime/enemy/fryling/` or only `validate-asset.selftest.mjs`.
- Whether `budgets: null` is treated as “no budget” (pass) or “budget without provenance” (refuse).
- Degraded-mode control flow when the frozen world list is empty.
- Manifest key strings emitted by `swan_pipe.py` vs keys `validate-asset.mjs` reads.
- That `comm -12` was on the right path lists; that none of the 18 main commits changed hook *composition*.
- Whether Blender 4.5 is in fact LTS on 2026-08-25, and whether 83188 still bites `-b --python`.
- Line counts 292/269/184/121/117/83 — house-rule compliance is asserted, not shown.
- That the four fryling binaries are four distinct exercises rather than one triangle copied.
- No UI in this branch: styled-components / Victory / Dual-Button Glow / 44px / dark-first / WCAG 4.5:1 / no MUI/Recharts / no “yoga” / no “NASM-certified” appear N/A — I cannot confirm a stray import.

A failing command log (hook dry-run on the rebased diff, selftest file list, `validate-asset.mjs` on fryling, `git cat-file -e` on every provenance commit, `blender -b` smoke on one cube) would move this from REVISE to a real SHIP/HOLD.
