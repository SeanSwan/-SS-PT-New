**S0 — Bind evidence and remove architectural unknowns**

Scope: nine package documents and a caller-supplied source supplement.

Decisions: no source exploration by the zero-access builder; no inferred schemas; no wholesale supersession; no new ledger until existing storage is adjudicated.

Acceptance:

- Full source/hashes for every edited file.
- Complete canonical surface receipt, including mounted JSX.
- Relevant mount order for `/api/ai-command/*`, `/api/ai-chat/*`, and proposal paths, including overlapping mounts.
- Actual selected-dispatcher models and field-drift table.
- Actual approved provider templates and privacy constraints.
- Actual auth, transaction, encryption, audit, and test interfaces.
- Current archive lookup result and review authority.
- Three representative in-repo patterns: HTTP handler, transaction/test, styled component.
- Storage decision recorded as `REUSE-CONFORMANT` or `REPLACE-WITH-SPECIFIED-LEDGER`.
- Exact source-extraction and migration paths fixed.
- **Approved per-slice implementation manifest (added after round-2 review R2-05).** For every slice
  S1–S6: the exact existing and new file paths, the exports and imports each one contributes, the
  permitted edits, the runnable command **with its working directory**, and the requirement-linked
  evidence each command produces. This closes the defect where S1 binds the builder to "the four S1
  modules" without ever naming them, and where later slices name tests but not the interfaces they
  exercise. **An unnamed entry is a named S0 blocker — STOP, do not infer a path.**
- **Explicit extraction targets for touched oversized modules.** `commandExecutor.mjs` is 885 lines
  against the 300-line cap and S3 already plans its extraction; name the destination files and the
  seam. Do the same for any other touched module over the cap.
- **Production-repair scope for the eight characterization targets** named in `09-tests.md` (S4). A
  characterization test that fails does not by itself authorize a production change; state which
  repairs are in scope for this build and which must be returned as a question.

**STOP: do not proceed to S1 until the S0 checkpoint passes.**

**S1 — Define outcomes, registry safety, and provider admission**

Scope: the four S1 modules and four unit test files in `09-tests.md`.

Decisions: registry-derived write classification; explicit-only fallback; unknown response types fail closed; provider fields are positively admitted.

Acceptance: **23 named cases**, using:

```powershell
node --test backend/tests/unit/coachHarnessRegistrySafety.test.mjs backend/tests/unit/coachHarnessProviderAdmission.test.mjs
npm --prefix frontend exec -- vitest run src/components/DashBoard/Pages/coach-assistant/harnessOutcome.test.ts src/components/DashBoard/Pages/coach-assistant/harnessContracts.test.ts
```

Expected: 10 backend cases and 13 frontend cases pass. No production import or behavior change is claimed.

**STOP: do not proceed to S2 until the S1 checkpoint passes.**

**S2 — Establish durable operation semantics**

Scope: approved storage path, operation repository/service/payload/retention, integration tests.

Decisions: five-minute previews; actor-bound request keys; current-access/version recheck; one-database transactional guarantee; terminal receipts immutable.

Acceptance: **12 named database cases**:

```powershell
node --test backend/tests/integration/coachHarnessOperations.test.mjs backend/tests/integration/coachHarnessRetention.test.mjs
```

Run against a fresh isolated PostgreSQL database using the supplied project migration tooling. Prove two concurrent connections and rollback behavior. A SQLite/in-memory substitute does not satisfy this slice.

**STOP: do not proceed to S3 until the S2 checkpoint passes.**

**S3 — Wire the command lane and recovery**

Scope: command executor extraction, command controller/routes, registry initialization, actual selected dispatchers.

Decisions: no changes to kill-switch defaults; cancellation/status remain available during write pause; legacy executable previews require new V2 preview; unsupported effects remain unavailable.

Acceptance: **12 named route cases**:

```powershell
node --test backend/tests/integration/coachHarnessCommandRoutes.test.mjs
```

Authenticated smoke fixtures are created by the isolated test harness, never copied from production:

```powershell
curl.exe --silent --show-error --request POST "$env:HARNESS_TEST_ORIGIN/api/ai-command/confirm" --header "Content-Type: application/json" --header "Authorization: Bearer $env:HARNESS_TEST_ACTOR_TOKEN" --data-binary "@backend/tests/fixtures/coach-harness/expired-confirm.json"
```

Expected status: `410`. Expected body, ignoring no fields because this error has no dynamic data:

```json
{"type":"error","error":"This preview has expired. Create a new preview.","code":"preview_expired"}
```

Fixture creation and endpoint evidence must prove zero domain writes. Tokens remain environment-only and must not enter logs or reports.

**STOP: do not proceed to S4 until the S3 checkpoint passes.**

**S4 — Wire provider admission and proposal safety**

Scope: final outbound provider gateway; mounted chat message path; classifier/model paths in scope; proposal write boundary.

Decisions: no raw-text provider escape; generated content cannot invoke commands; no silent provider retries; existing subscription guard retained; no approval bypass through chat metadata.

Acceptance: **10 boundary cases**, plus **24 characterization/behavior cases** for the eight previously untested modules:

```powershell
node --test backend/tests/integration/coachHarnessProviderBoundary.test.mjs backend/tests/integration/coachHarnessProposalBoundary.test.mjs
node --test backend/tests/unit/coachHarnessInputSanitizer.test.mjs backend/tests/unit/coachHarnessDeIdentifier.test.mjs backend/tests/unit/coachHarnessPhiScanner.test.mjs backend/tests/unit/coachHarnessManualOnlyPolicy.test.mjs backend/tests/unit/coachHarnessDeterministicIntent.test.mjs backend/tests/unit/coachHarnessModelSelector.test.mjs backend/tests/unit/coachHarnessErrorLoop.test.mjs backend/tests/unit/coachHarnessMeasurementContext.test.mjs
```

The provider boundary uses a recording adapter on the real route path. No paid/live-provider call is required by this slice. Real provider behavior remains separately unproven.

**STOP: do not proceed to S5 until the S4 checkpoint passes.**

**S5 — Wire the mounted floor workflow**

Scope: transport extraction, mounted arbiter/actions, cards, dock, and status component.

Decisions: preserve tabs/routes; explicit retry; no optimistic mutation success; client/thread changes cannot attach a late response to the wrong scope.

Acceptance: **12 named frontend integration cases** and **8 browser scenarios**:

```powershell
npm --prefix frontend exec -- vitest run src/components/DashBoard/Pages/coach-assistant/CoachHarnessFlow.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachConsoleDock.harness.test.tsx
npm --prefix frontend exec -- playwright test tests/e2e/coach-harness.spec.ts
```

S0 must confirm the installed runners and configure the isolated application fixture. Named commands above are target commands, not evidence that the current repository already supports them.

Verify all specified viewport sizes, virtual-keyboard behavior, 200% text zoom, and reduced motion. The long-conversation composer stays reachable without scrolling the page thousands of pixels.

**STOP: do not proceed to S6 until the S5 checkpoint passes.**

**S6 — Combined evidence and release decision**

Scope: combined diff, preserved regression suites, migration/rollback rehearsal, final review packet.

Acceptance:

- Run the required project build/type-check/regression commands supplied at S0.
- Rerun impacted harness suites after the combined integration changes.
- Demonstrate response loss after commit and successful status reconciliation.
- Demonstrate revoked access and write pause through command **and proposal** mutation paths.
- Demonstrate old pending-preview handling across a rolling deployment.
- File hostile review, obtain Final Decider verdict, and preserve unresolved findings.
- Secret scan and ≤300-line checks cover new/touched files.
- Production rollout remains unexecuted until explicitly authorized.

**STOP: do not commit, push, or deploy on the strength of this package alone.**
