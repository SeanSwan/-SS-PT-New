| Slice | Scope / entry | Executable exit criteria |
|---|---|---|
| **S0H — hardening** | Existing relocated S0/S1. Files 1–10 in build order. | POLICY, READ, HEALTH, CONTRACT, WEB and ROUTES pass; current bridge/web suites pass; typecheck/build pass; real Windows leaf/junction tests and real built-app health provenance pass. No new route. |
| **S2 — roster and drawer** | S0H checkpoint. Files 11–13. | ADD and drawer/roster WEB cases pass; slow resolver leaves status responsive; real fixture add→toggle→re-add preserves consent; desktop/375px keyboard walkthrough. |
| **S3a — query and canary** | S2 checkpoint. File group 14. | QUERY and OpsRail WEB cases pass; citations and skipped reports visible; Backup sends no request. No new route. |
| **S3b — repair** | S3a plus **JOURNAL gate**. File group 15. | OPS and cross-process tests pass; result matches actual engine record including `ok` and quarantine count; add exactly the repair route. |
| **S3c — backup** | Owner resolves private-backup exception and destination contract. | **BLOCKED.** No implementation or endpoint in this package. |
| **S4 — daily run** | S3b plus JOURNAL gate. File groups 16–17. | RUN cases pass; one child under duplicate submission; fast/failed/interrupted runs remain truthful; Windows child-survival behavior measured. |
| **S5 — constellation** | S2 accessible roster; CD3 fixed. File group 18. | SCENE passes; zero prohibited chunk fetches; numeric motion/bundle/GPU evidence; Sean sees usability result. |
| **S6 — integrated candidate** | S0H/S2/S3a/S3b/S4/S5 complete. File group 19. | LAUNCH, VISUAL, full regression and combined hostile review pass. Backup’s blocked scope is explicit; full R8 completion is not claimed. |
| **S7 — transfer** | S6 plus explicit owner go. File group 20. | TRANSFER manifest matches; receiving repo builds and verifies its adapter/trust boundary. |

**Do not proceed to a dependent slice until its checkpoint passes.**

A failing JOURNAL gate returns to the engine owner. It does not permit editing engine files or substituting a console mutex for cross-process exclusion.

Run from repository root:

```powershell
$consolePath = 'packages/creator-brains-console'
$bridgeTests = @(Get-ChildItem "$consolePath/test" -Filter '*.test.mjs' |
  Sort-Object Name | ForEach-Object FullName)
node --test @bridgeTests
npm --prefix "$consolePath/web" test
npm --prefix "$consolePath/web" run typecheck
npm --prefix "$consolePath/web" run build

$engineTests = @(Get-ChildItem 'scripts/creator-brains/test' -Filter '*.test.mjs' |
  Where-Object Name -ne 'live.test.mjs' |
  Sort-Object Name | ForEach-Object FullName)
node --test @engineTests
node scripts/creator-brains/consistency-check.mjs
```

These fixture-writing/build commands require a writable implementation session. Record actual results and per-file test identities; no fixed aggregate count is an acceptance criterion.
