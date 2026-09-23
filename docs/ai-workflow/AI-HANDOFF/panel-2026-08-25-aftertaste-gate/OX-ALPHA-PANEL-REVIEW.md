# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-branch-gate-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 3927 in / 4064 out · **Cost:** ~$0.0000 · **Wall:** 140.8s · **finish:** stop

---

## VERDICT
REVISE — the plumbing is genuinely solid (path containment, exit-code discipline, regression pins), but the branch's central claim ("a gate") is not yet true: the validator's enforcement point is undefined, the one producer (`swan_pipe.py`) has never executed, and the trust root (`registry.json`) is mutable self-attestation. Push the *docs and guards*; do not let anything downstream treat the asset gate as enforced until the fixes below land.

## BLOCKERS
1. **P1 — The gate is not wired to anything.** `catalog-check.mjs` and `truncated-evidence-guard.mjs` are explicitly wired into `.githooks/pre-commit`; `validate-asset.mjs` has no stated invocation point (hook? CI? manual?). Failure scenario: a contributor commits a manifest with `similarityReviewed: false`, nothing runs the validator, the branch merges, and every downstream slice inherits "validated" assets that were never validated. Evidence: §2.1 lists the hook wiring for two tools only; §2 table row `a7a0a3801`/`528dc1c20` describe the validator but name no caller. Fix: wire `validate-asset.mjs` into pre-push or CI on the same commit that lands it, with a self-test proving the hook fires.
2. **P1 — Budget-vs-geometry comparison is asserted nowhere.** The validator refuses a *malformed* budget (`{tool, command, date, commit}` missing) and `measure-glb.mjs` measures triangles — but the document never states that validation **compares the measured count against the budgeted count**. Failure scenario: manifest declares `maxTriangles: 1500` for a prop whose GLB contains 40,000; if only provenance-shape is checked, it passes. This is exactly the §1 error class: a check that looks like a check in prose. Fix: one line in the docblock stating where the comparison happens, plus a fixture where measurement exceeds budget and must exit nonzero.
3. **P1 — `swan_pipe.py` is UNRUN with two UNVERIFIED calls on the critical path** (`uv.smart_project` kwargs; `export_scene.gltf` in background mode, upstream issue 83188). Additionally, `modifier_apply` on BEVEL in headless mode commonly fails without a depsgraph/view-layer update — a third latent break the docblock audit marks "OK by documentation," which §1 just spent a page teaching us to distrust. Failure scenario: first real asset run dies at export or silently drops UVs/smoothing. Fix: the 10-line smoke script (import obj → export glb, nothing else) **before** the pipe is anyone's first execution; then run the pipe on the existing fryling fixture and diff output through `measure-glb.mjs`.
4. **P2 — Registry is a mutable root of trust with no write control (F4) and `similarityReviewed` is an honour bit (F2).** An agent editing both files attests anything into existence. Cheapest concrete fix: require `similarityReviewed` to be a structured object `{reviewer, date, comparedAgainst[]}` (same treatment budgets already got) and put `assets/registry.json` under explicit human-review-only diff policy (CODEOWNERS or equivalent) so a registry edit can never ride inside an asset commit unnoticed.
5. **P2 — `truncated-evidence-guard.mjs` fails open on its own errors.** A malformed diff, a Node crash, an encoding surprise → guard silently passes, and the team believes it ran. For a guard whose entire purpose is catching a demonstrated five-times-a-day failure class, fail-open inverts the cost asymmetry. Fix: fail closed on internal errors; keep the `EVIDENCE-OK:` escape hatch for legitimate overrides.
6. **P2 — Nine declared registry fields have zero readers (F1), including `chromeLaw`**, the constraint that motivated the whole P0 correction. Schema-drift-by-design: the registry documents constraints the validator cannot see. At minimum, add a startup assertion in `validate-asset.mjs` that enumerates registry keys and warns on unread ones — turning silent drift into visible debt.
7. **P2 — `SWAN_ALLOW_DEGRADED=1` is a sticky footgun.** Set once in a shell profile or CI env, every future exit-2 condition (missing registry, zero manifests, absent world catalog) becomes a permanent silent pass — recreating the "nine rows all read exit=0" incident structurally. Fix: make it emit a loud, greppable marker line and refuse to honor it when stdin is not a TTY (i.e., in CI).

## ATTACKS
**Correctness**
- `measure-glb.mjs`: STRIP/FAN formula `n−2` goes **negative** for degenerate strips (n=1 or 2 vertices). A corrupt or adversarial GLB yields a negative triangle count, which likely passes any `< maxTriangles` budget check. Clamp at 0 and flag.
- Multi-primitive GLBs: summing across primitives is implied but unstated; a GLB with one valid primitive and one malformed accessor could partially parse.
- Exit-code contract drift across the toolchain: `catalog-check` uses 1=absent/2=instrument-failure; `validate-asset` uses 2=degraded; the guard fails open. Any shell wrapper doing `|| true` or checking generic nonzero can conflate "absent" with "crashed." Define one shared exit-code module.
- `catalog-check` exit 1 licenses an absence claim — but a script *crash* also produces nonzero. Callers must match specifically on 1, not "not 0."

**Security**
- Path containment "refused before any read" is good, but the symlink check is TOCTOU-prone; acceptable for a local pre-commit threat model, but say so explicitly rather than implying filesystem-hardening.
- `__proto__` fixture exists (good) — but pollution only matters if manifests are ever merged into defaults. Confirm the validator never spread-merges parsed JSON.
- Supply chain: installing Blender + gltf-transform with **nothing calling gltf-transform** (F6) adds unpinned attack surface for zero function. If installed, pin exact versions and record hashes; otherwise defer until `optimize.mjs` exists.
- Provenance strings are injection-shaped: `{tool, command}` are opaque and eventually human-read; at minimum `git cat-file -e <commit>` (F3's own suggestion) is one subprocess call that converts a lie into a detectable lie.

**Data-truth / schema drift**
- Nine-field dead schema (F1) is textbook column-vs-reader drift, self-inflicted.
- Manifest stub from `swan_pipe.py` is *deliberately invalid* — a standing artifact in the repo that fails the validator. Nothing described prevents it from being committed and confusing the next agent into "fixing" it by loosening the validator. Emit it outside the manifest directory or name it `*.stub`.
- `calibrationFixture: true` on the fryling manifest: no reader for that flag is described either — a third drift instance unless it gates something (e.g., exempting fixtures from budget tightening).

## HIGHEST RISK
**The gate-that-does-not-run (Blockers 1+2 combined):** an elaborate honour system wearing a gate's clothes. Every downstream slice will cite "validator passed" as ground truth; if the validator is uninvoked or compares paperwork instead of geometry, the entire branch's value proposition is a false anchor — precisely the incident class §1 exists to prevent. Cheapest de-risk before ship: (a) wire `validate-asset.mjs` into CI/pre-push with a red-team fixture proving it fires and rejects, (b) add the measured-vs-budget comparison with a violating fixture, (c) run the smoke script. All three together are well under a day.

## CONFIDENCE
I could **not** verify from the document alone:
- Whether `validate-asset.mjs` actually measures triangles against budgets, or only validates budget provenance. (Blocker 2 is written as a conditional for this reason.) Evidence that settles it: the relevant ~10 lines of `validate-asset.mjs`.
- Whether the validator is invoked anywhere. Settled by: `grep -rn "validate-asset" .githooks .github package.json` output.
- Whether `measure-glb.mjs` clamps degenerate strips or sums multi-primitive meshes safely. Settled by reading its primitive-mode dispatch.
- Whether the guard's fail-open path is reachable in practice (depends on how it parses diffs). Settled by reading its error handling.
- Whether `comm -12` overlap of 0 really implies behavioural independence of the hook (F8's own caveat) — I cannot check the 18 upstream commits from here. Settled by: `git log --oneline 08215328c..origin/main -- .githooks/` plus a post-rebase dry-run of the hook in a clean worktree.

On house rules: line caps are compliant but `validate-asset.mjs` at 292/300 is one panel-fix from violation — split it now along the refusal-rules seam while the split is boring. Styled-components/Victory/palette/touch-target rules don't bind this branch (no UI shipped); zero-PII is honored (IDs/roles only); no forbidden terminology appears.
