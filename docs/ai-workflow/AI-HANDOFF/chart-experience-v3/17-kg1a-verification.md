---
artifact_id: SWAN-CHART-KG1A-VERIFICATION
owner: lead Codex independent verification; Luna test-tool implementation
version: 3.2
effective: 2026-09-04
status: KG1A NARROW-CLAIM-PASS; APPLICATION MIGRATION/WRITERS UNBUILT
supersedes: pending guard execution in16; does not clear later schema/writer gates
---

# Synthetic test-target guard verified

## Outcome and exact scope

The test-only guard validates the explicitly named synthetic PostgreSQL identity and closes
its read-only connection. It does not change the application's DB singleton, model schemas,
routes, writers, chart consumers or production state. It cannot provide a writable migration
handle. No app startup, default environment-file load, seeded tables, commit, push or deployment.

Build root: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
Branch `codex/chart-experience-v3-20260904`, HEAD `53120649f356c3efccee32872b530096d386642f`.
Luna authored only these three KG1a paths:

| Relative path | SHA-256 |
|---|---|
| backend/tests/helpers/chartUnitDbGuard.mjs | dccb13aed06e30a87ab9d376d48d1f6c471418a006ea6b0c048724b146efa81f |
| backend/tests/node-runner/chartUnitDbGuard.test.mjs | 11d78bf1eda1a01412770494d09577ceda4cf26a8fd0635bd7c7da6dbc27b96c |
| backend/scripts/chart-unit-db-preflight.mjs | 7cd76f71150e7faac2d1d30d7d028f6aff9df885ba38ddf9d4a2f84b3569f059 |

Final git status listed only these three untracked files plus the three KG0 files recorded
in13. KG0 hashes were independently rechecked and unchanged. `git diff --check` exit0;
untracked file content additionally read, syntax checked and covered by exact file hashes.
Lead owns the DG/RT gates and docs only. All implementation files remain under300 lines.

## Proof and replay

From the shared doc host, with the exact owned synthetic cluster running:

```powershell
$guardBuild = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904'
$guardPacket = 'docs/ai-workflow/AI-HANDOFF/chart-experience-v3'
$guardData = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/qa/chart-weight-db-20260904'
node "$guardPacket/kg1-db-guard.red.mjs" $guardBuild
node --test "$guardBuild/backend/tests/node-runner/chartUnitDbGuard.test.mjs"
node "$guardPacket/verify-kg1a-runtime.mjs" $guardBuild $guardData
node "$guardBuild/backend/scripts/chart-unit-db-preflight.mjs" --host 127.0.0.1 --port 55439 --database chart_weight_synthetic --user chart_unit_test --data-directory $guardData
```

PROOF:9/9 lead DG assertions +11/11 native regression/CLI tests +5/5 real CLI confirmation
cases,0 skipped. Native11 cases cover DG01–DG10 (DG10 has two tests); they are NOT by
themselves DG11 real-DB proof. Parent separately proved actual stopped/live behavior.
The coordinating task independently reproduced the native11/11 after the inet-address fix:
0 failed,0 skipped,809ms. This rerun is not an additional25 tests.

Actual success stdout, exit0:
`{"status":"verified","database":"chart_weight_synthetic","user":"chart_unit_test","host":"127.0.0.1","port":55439,"timeZone":"UTC","readOnly":true}`.
Actual stopped cluster returned exit1, stable CHART_UNIT_DB_PROBE_FAILED, not a skip.
Actual wrong directory, ambient default sentinel, wrong db/port/host controls rejected.
Different cwd and Windows case-normalized expected directory both succeeded appropriately.

Lead gate current SHA-256:
`27d81d7c7e97c3af95cf5bce2ebeccb57b046286f0023342c9490c702c44f6e8`.
RT gate SHA-256:
`6b82c8cf8c89c0bd3079e2a5b4d067918ad7375306b239b1b0b7da2f1b21f593`.
The initial DG hash was d5221cbb7ab6ed632ca818007b42b7d62a18df441880d86d4cb7835eb1ae39d3;
lead strengthened malformed-directory and real inet-format regressions after reproduction.
Luna did not edit/relax the lead gates. No gate.mjs harness was used.

## Hostile-review ledger

| Round | Vantage and result |
|---|---|
| Initial TDD |9 lead cases failed for missing helper; Luna also reproduced native missing-module RED |
| 1 | Source/input and CLI review found normalization-before-typecheck leaking Node path errors; strengthened DG02 went8/9. Inherited flags toString/constructor returned wrong exit class; native regression10/11. Luna corrected both |
| 2 | Parent reran9/9+11/11 and actual stopped-target rejection. CLEAN at this lower layer |
| 3 | Real pg8.15.6 against PG17 returned host127.0.0.1/32 from inet::text; all other identity fields matched. Parent psql proved host(inet_server_addr()) returns127.0.0.1; lead DG05 went8/9; Luna changed SQL only, kept strict validator |
| 4 | Fresh9/9+11/11 plus actual corrected readonly CLI success. CLEAN |
| 5 | Five real CLI tests from OS temp cwd: success, Windows path case, wrong actual directory, ambient sentinel, default/foreign target rejection. All passed with approved normal process permissions; source scope/hash and zero-table/zero-open-probe checks. CLEAN |

The first round5 invocation hit Windows spawnSync EPERM before any CLI child ran;0/5 was
an infrastructure failure, not application proof. The exact unchanged command was rerun with
normal approved process permissions and passed5/5. No control or assertion was weakened.

DRY-LOOP: CLEAN×2 (rounds: 5) — KG1a only. Earlier KG0 has its separate four-round ledger.
Substantive review: no user DOM/auth endpoints/SQL interpolation; one constant SELECT;
explicit timeout/config, immutable validated target, cleanup-on-error and sanitized failures;
bad target/ambient input rejects before driver construction. Model/route/UI tests are not
applicable to this test-only slice and remain required for the product build.

## Database lifecycle and hygiene

Owned PG17 cluster path is guardData above, loopback127.0.0.1:55439, no Windows service added.
Parent restarted that exact stopped cluster for DG11/RT proof; no production/default DB used.
Before shutdown, independent SQL observed0 public tables and0 active connections with
application_name swan-chart-unit-preflight. These tests created no tables and left no probe session.
Parent stopped the exact cluster with pg_ctl -D guardData -m fast -w -t10 stop, exit0;
files/log retained for the next separately guarded test slice. No automatic cleanup or deletion.

New artifacts: three test-tool files, lead DG/RT scripts,15–17 planning/receipts and retained
KG0 GLM QA packets/replies. Existing plan backups and approved screenshots remain unchanged.
No root-level temp dumps, new UI screenshots, memory/Hermes writes or automatic continuity closeout.
No external board mutation. The single coordinator-owned GLM pair in14 was empty/truncated;
it supplies NO review verdict and no authority to retry or send the KG1a code.

## Remaining gates / next slice

KG0+KG1a currently total52 executed test cases, plus KG0 TypeScript mode/negative controls.
This is not52 passing client-chart tests. Original chart M01–M12 remain expected RED;
KG09–KG20 product integration is still unbuilt and the approved visuals are not mounted V3.

Next: finish the16-file actual WorkoutLog caller-field cross-check from15, then lead specifies
the guarded SAME-HANDLE synthetic migration connection, selected legacy schema fixture,
additive model/migration contracts and rollback tests. A closed readonly receipt must never
be used as permission to mutate through another unverified ORM pool/default connection.
Only afterward may Luna implement that bounded schema slice, followed by writer/ingress,
preference/UI and all-chart/export adoption slices. No production migration or release authorized.

STATUS: NARROW-CLAIM-PASS — test-target prerequisite only, not application persistence.
