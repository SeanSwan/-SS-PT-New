# G11 build evidence — 2026-09-11

## Changes
1. backend/models/associations.mjs: CoachFact wired into the model registry
   exactly as the adopted S1 commit intended (import, instantiation, both
   registry return literals, five association declarations) — closes the
   model-registry drift the G09 adoption left open.
2. docs/.../45-g11-release-readiness.md: the executed/not-executed release
   matrix with per-slice rollback commands.

## Hostile review findings fixed in-slice
- F1 the G09 adoption was incomplete without the associations wiring (drift
  tripwire caught it) — replicated the S1 commit's 5 hunks.
- F2 an unresolved stash-pop conflict in root package.json (pre-existing
  working-tree debris, committed nowhere) silently blocked frontend config
  loads — resolved to HEAD.

## Disclosure
Real-DB/Redis/browser/eval acceptance is environment-gated and NOT claimed.
The candidate is clean relative to its baseline; baseline carries 20
pre-existing failures (15 BE + 5 FE), all proven at 0c96142f2.
