# SLICE PACKET — N1 (Project Aftertaste) · 2026-08-26 — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/aftertaste-n1-slice-packet-2026-08-26.md
**Seed:** (none)
**Tokens:** 2677 in / 4996 out | **Cost:** ~$0.0030 | **Wall:** 108.0s | **finish_reason:** stop

---

## VERDICT
REVISE — the slice proved the pipe can execute once, but plan/code drift (B3) and a validator that trusts manifest over bytes (B4) mean “VALID” is not yet trustworthy for the asset factory.

## BLOCKERS
1. P1 — Manifest/asset drift causing false-positive validation: manifest declares `skeleton: skeleton.creature-small.v1` and `animations: [idle, move, attack, hit, death]` while the GLB contains no armature or clips (inputs: declared animation names + empty GLB → output: `validate-asset --all` returns VALID). File:line evidence: document §3 B4 references `swan_pipe_manifest.py` (67 lines) and `validate-asset` but supplies no line numbers.
2. P1 — Plan-vs-implementation drift for bake stage: `plan()` lists “bake normal + AO + roughness” but `run_in_blender()` never bakes (inputs: any source mesh → output: asset with `textureMB: 0` and art law unexecuted). File:line evidence: document §3 B3 names `swan_pipe.py` (260 lines) / `swan_pipe_manifest.py` plan (67 lines) without line numbers.

(No house-rule violations: document contains no styled-components/Victory/charts, all listed Python files ≤300 lines, zero PII, no yoga/meditation language — compliant.)

## ATTACKS
- Correctness: happy-path-only logic — decimation ratios (0.45 / planar 40° / 0.45-on-prebevel) are hard-coded from a single 5-cube mesh (B1); input of a 200-voxel character will floor elsewhere → wrong LOD tris or spurious refusal. Stale plan state — `plan()` includes stages not in code (run1 missing collision/still, B3 missing bake). Unhandled error paths — Blender’s default exit 0 on uncaught Python exception masked 4 runs (B6); mitigated by `--python-exit-code 1` but document provides no proof every exception path calls `sys.exit(1)`. Null/undefined — manifest declares skeleton/animations absent from bytes (B4). Race conditions / off-by-one: none observed.
- Security: no authn/authz, IDOR, injection, SSRF, secret handling, replay/idempotency, multi-tenant scope, or rate-limit surfaces in this local pipeline. Privacy rule (IDs/roles only) respected.
- Data-truth / schema drift: plan-vs-caller drift — `plan()` lists bake stage not implemented (B3). Manifest-vs-bytes drift — `textureMB:0`, declared `skeleton` and `animations` not present in GLB; validator checks clip names against registry, not file presence (B4), equivalent to frontend response-shape drift where consumer expects clips that don’t exist. PascalCase-vs-snake_case table drift / FK target drift: not observed.

## HIGHEST RISK
The validator’s false trust in manifest declarations (B4) is the most dangerous: it will silently pass assets lacking required skeletal animation, breaking runtime and invalidating every future gate. Cheapest de-risk before ship: patch `validate-asset` to parse the GLB for `skins` and `animations` and assert declared clip names exist in the bytes (the validator portion of N3), plus a negative test with a manifest lying about clips — a small gltf-parse addition.

## CONFIDENCE
I could NOT verify from the document alone: actual source of `swan_pipe.py`, `swan_pipe_manifest.py`, `validate-asset`, or the manifest schema; line-level evidence for the claimed exception handling or hardcoded ratios; that CI/pre-commit enforces `--python-exit-code 1`; that no other `plan()` stages are missing. The text is a narrative post-mortem, not code. Evidence to settle: checkout commit after `283f20c9f`, run `validate-asset --all` against a tampered manifest (fake animation entries), grep `swan_pipe.py` for ratio literals and try/except coverage, and confirm the hook invokes Blender with `--python-exit-code 1`. I am explicitly uncertain whether B4 remains fully open and whether the “instrument lie” calibration is complete across all future invocations.
