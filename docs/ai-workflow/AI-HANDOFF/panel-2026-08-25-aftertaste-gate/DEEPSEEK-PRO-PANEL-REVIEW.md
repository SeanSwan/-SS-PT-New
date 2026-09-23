# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs/ai-workflow/brainstorms/aftertaste-branch-gate-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 4013 in / 12525 out · **Cost:** ~$0.0329 · **Wall:** 240.6s · **finish:** stop

---

## VERDICT
REVISE — this branch cannot be pushed as-is because the “gate” is still core self-attestation: the registry and manifest are mutable by the same agent, so an unreviewed/IP-violating asset would pass validation as easily as the proof fixture.

## BLOCKERS
1. P1 — Self-attesting provenance and similarity review. Concrete failure: an agent adds a manifest with `similarityReviewed: true`, `budget: {tool:"", command:"echo ok", date:"", commit:"not-a-commit"}` plus a matching entry in `assets/registry.json`; `validate-asset.mjs` accepts because it validates shape, not truth. Evidence: `validate-asset.mjs` 292 lines, §2.1 “similarityReviewed !== true” and “budget without {tool, command, date, commit}”; `assets/registry.json` (§2.1/F4).
2. P1 — `chromeLaw` declared but never enforced. Concrete failure: a future Voxel Realm asset with a `chromeLaw` conflict passes the validator and later lands on a Swan-branded surface, violating the exact Law-A/Law-B constraint that forced the P0 correction. Evidence: `assets/registry.json` §2.1 “Nine fields are declared and never read by any validator: chromeLaw…”.
3. P1 — Pre-commit guard fails open. Concrete failure: any JS error in `scripts/hooks/truncated-evidence-guard.mjs` exits success, so a staged doc containing `grep -nE "miniature|voxel" <file> | head -8` and no denominator commits, recreating the original false-absence incident. Evidence: `scripts/hooks/truncated-evidence-guard.mjs` 117 lines, §2.1 “Fail-open on its own errors”.
4. P2 — `swan_pipe.py` first run is unproven. Concrete failure: after Blender is installed, the first execution may fail in `export_scene.gltf` background mode or `uv.smart_project`; because it emits a deliberately-INVALID manifest stub, the validator cannot distinguish a successful export from a failed pipe. Evidence: `tools/blender/swan_pipe.py` 269 lines, §2.1 “UNVERIFIED” calls and “deliberately-INVALID manifest stub”.
5. P2 — Line-cap edge. Concrete failure: any fix to `validate-asset.mjs` for blockers 1 or 2 will push it from 292/300 to over 300 lines, violating the house rule. Evidence: `validate-asset.mjs` 292/300, F9.

## ATTACKS
- Correctness:
  - `swan_pipe.py` claims LOD0/1/2 but the document shows no decimation/targets, so it may export three identical meshes or three copies of the same geometry that downstream systems will treat as distinct LODs. Evidence: §2.1 “LOD0/1/2” with no LOD-generation detail.
  - `validate-asset.mjs` compression enforcement only triggers when `compression === "draco"`; `"compression": "garbage"` or `"compression": "none"` on a Draco-encoded file would pass the manifest gate even if the GLB is not what it claims. Evidence: §2.1/F6.
  - `measure-glb.mjs` is correct for single-primitive strip/fan as n−2, but the document does not show aggregation across multiple primitives or indexed strip/fan with degenerate/primitive-restart cases, so a multi-primitive GLB could be miscounted. Evidence: `measure-glb.mjs` 184 lines, §2.1.
- Security:
  - No write authorization on `assets/registry.json`; any agent/process that can edit it can also edit the manifest, so the validator is not an independent control. This is a multi-agent trust-boundary failure, not merely a code issue.
  - `budget.command` is an opaque string stored with no validation; if later tooling ever executes it, `"command": "rm -rf ..."` becomes a stored injection. The branch may not execute it now, but it is a dangerous field to carry forward. Evidence: §2.1 provenance fields.
  - `truncated-evidence-guard.mjs` is syntax-pattern-based; equivalent truncation such as `grep -q`, `find … -quit`, or Python `.splitlines()[0]` is not caught, so absence claims can still pass. Evidence: §2.1 listed tokens only.
- Data-truth / schema drift:
  - `assets/registry.json` has nine declared fields with zero readers, so schema can drift without any consumer error; the most dangerous is `chromeLaw`.
  - `worldId` resolves against a frozen list in `scripts/ai-workflow/world-engine-catalog-validation.mjs`, not `assets/registry.json`; if the world catalog changes, the registry and frozen validator list can silently diverge. Evidence: §2.1 “resolved against the frozen list”.
  - The branch uses camelCase manifest keys (`aiAssisted`, `similarityReviewed`) but no JSON schema or migration path is shown for future `swan_pipe.py`-emitted stubs, so drift between Blender output and the validator is likely.

## HIGHEST RISK
The single most dangerous item is the mutable self-attesting registry+manifest: it turns the validator into an elaborate honor system, and every later “validated” asset inherits whatever the last agent typed. The cheapest concrete de-risk before ship is to require human-approved PR/code-owner review for any diff touching `assets/registry.json`, add `git cat-file -e <commit>` to `validate-asset.mjs`, and require a real `similarityReviewed` artifact (reviewer, date, comparison list) instead of bare `true`.

## CONFIDENCE
I could not verify from the document alone: exact source-level behavior of `validate-asset.mjs`, `swan_pipe.py`, and `measure-glb.mjs` beyond the summaries; whether `swan_pipe.py` truly generates distinct LOD0/1/2; whether the pre-commit hook fails open on all error classes; whether `measure-glb.mjs` handles multi-primitive/strip indexed cases; whether the frozen world list is versioned with `assets/registry.json`; and whether `export_scene.gltf` background mode actually works in Blender 4.5 LTS. Settling evidence would be full source files, a smoke run of `swan_pipe.py` on a known two-LOD asset, a forced hook-exception test, and a diff script comparing the frozen world list to registry world IDs.
