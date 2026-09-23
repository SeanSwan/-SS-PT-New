---
artifact_id: SWAN-CHART-KG1B0-VERIFICATION
owner: lead Codex independent verification; Luna test-tool implementation
version: 3.2
effective: 2026-09-04
status: KG1B0 NARROW-CLAIM-PASS; STORAGE SLICE NOW ELIGIBLE FOR DISPATCH
supersedes: unproven same-handle prerequisite in17/19; no product completion claim
---

# Actual ORM identity, rollback and replacement verified

Build root: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
Branch codex/chart-experience-v3-20260904, unchanged HEAD53120649f356c3efccee32872b530096d386642f.
No tracked application/model/migration edits at this receipt boundary. Only three authorized
KG1b0 files written by Luna; the lead wrote independent gates and planning/evidence only.

| Implementation file | Lines / current SHA-256 |
|---|---|
| backend/tests/helpers/chartUnitDbGuard.mjs |202 /45c53ec1b40168238535ee0a70928e21200ac3a80ac29b130f1d3f823ddd00bf |
| backend/tests/helpers/chartUnitTestDatabase.mjs |139 /3a05ce7c3c85d2def3391fc075684dac7cbcbff5cb5708eca974d35131ee2dab |
| backend/tests/node-runner/chartUnitTestDatabase.test.mjs |274 /458ecab1449f3553ac5d0d5f6f87a202b91bf6d4b86da1c2a22155446373c3a3 |

The KG1a guard changed only to export/reuse its existing target/environment/identity policy.
Its historical pre-export hash in17 is preserved, not rewritten as if this change never happened.
KG0's three hashes were independently rechecked unchanged. KG1a native tests/CLI unchanged.

## Evidence and exact replay

From shared doc host, define explicit paths; no default DB/environment load:

```powershell
$unitBuild = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904'
$unitPacket = 'docs/ai-workflow/AI-HANDOFF/chart-experience-v3'
$unitData = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/qa/chart-weight-db-20260904'
node "$unitPacket/kg1-same-handle.red.mjs" $unitBuild
node --test "$unitBuild/backend/tests/node-runner/chartUnitTestDatabase.test.mjs" "$unitBuild/backend/tests/node-runner/chartUnitDbGuard.test.mjs"
node "$unitPacket/kg1-db-guard.red.mjs" $unitBuild
node "$unitPacket/verify-kg1b0-runtime.mjs" $unitBuild $unitData
node "$unitPacket/verify-kg1a-runtime.mjs" $unitBuild $unitData
```

- Initial lead SH RED:0/10, all missing implementation; Luna native missing helper also RED.
- Lead SH final:10/10; native SHN:11/11. These are fake-connection/contract evidence.
- Real SH11–SH13:3/3,0skipped,~1.14s. Actual PostgreSQL17, Sequelize6.37.8, pg8.15.6.
- Regression: DG9/9 + native DG11/11 + real CLI RT5/5 after policy-export change.
- Coordinator independently reproduced native SHN11/11,0failed/0skipped,74ms; not extra cases.
- Coordinator then ran KG0 native14 + DG11 + SHN11 together:36/36,0failed/0skipped,522ms.
- Planning validator13/13 before final receipt links; approved preview hashes remain unchanged.

KG1b0 adds24 executed infrastructure cases. Do not conflate this with the packet's76
specified chart/unit domain cases; original chart M01–M12 still remain expected RED.
The combined22-file-case native invocation first failed at Windows spawn EPERM, before
either test file executed. The exact unchanged command with normal approved process
permissions passed22/22,525ms. Tests were not altered to avoid that restriction.

Lead SH gate SHA-256:8a7cc88e7a84ee7b1feba352d4d4af8f58b3be6036e53a0031ac4e05fb0726f1.
Real SH gate SHA-256:35d822bb06eba9c51f6a283d196f4200a002b66ba705fa37c2a11a444ca2d39d.

## Real proof meaning

SH11 used the returned exact ORM to inspect explicit identity/readOnly off, create a temporary
table, insert/read42 within a real transaction, roll back, and prove its table no longer exists.
SH12 destroyed/acquired physical pool connections, observed different backend PIDs, recorded
successful identity hooks for both PIDs, and proved another temporary write/rollback works.
SH13 supplied a valid-shaped but different expected data directory; actual identity rejected,
callback never ran. A separately verified handle then observed zero other owned ORM sessions.
Both real scenarios checking public observed zero permanent tables. No app data was present.

This proves the intended controlled synthetic test path. It is not a security sandbox against
malicious test callbacks, a proof of application permission checks, or evidence a migration ran.
Callback errors retain their exact identity after cleanup; if callback and cleanup both fail,
callback error takes precedence. This still rejects, never returns success. Hook/connection
failures expose fresh sanitized error codes; raw rejected connections are explicitly ended.

## Hostile-review ledger

| Round | Independent vantage / result |
|---|---|
| 1 | Installed hook API/source inspected; afterConnect failure cleanup required explicitly in19. Lead SH10/10 + DG9/9 + native22/22; exact config, policy reuse, callback failure propagation, per-connection rejection and import quarantine. CLEAN |
| 2 | Actual PG temporary DDL/rollback, physical pool replacement/PID proof, mismatch rejection and no lingering rejected sessions3/3; old readonly CLI5/5 after policy exports; scope/hash/line review. CLEAN |

DRY-LOOP: CLEAN×2 (rounds:2), KG1b0 only. No finding manufactured after evidence held.
The local narrow verdict is APPROVE as advisory input; it is not the repository's final
commit/release gate. No external GLM/Astra invocation in this slice;14's prior pair stays VOID.

## Lifecycle, hygiene and next gate

Parent started ONLY the owned stopped synthetic cluster for real proof, loopback55439;
no Windows service/global configuration changed. Temporary transaction tables were rolled
back; cluster files remain for the next storage tests. The cluster may remain running only
while the explicitly dispatched synthetic storage slice uses it; stop before session handoff.
No permanent tables or probe/ORM sessions remained at this receipt boundary.

New artifacts: two implementation/test files, exported existing helper,18–21 planning/receipts,
two lead SH scripts. All are scoped; no root temp dumps, screenshots, obsolete files removed,
memory writes, continuity closeout, external board updates, commit/push or production change.
The old chart worktree stays read-only. [21](21-kg1b1-storage.md) is now eligible for bounded
lead dispatch; its ST tests and schema/model work are not yet implemented or passed here.
