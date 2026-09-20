**Entry points:** `CC/CoachCommandCenter.actions.ts:64`, `CC/hooks/useCoachAssistant.ts:38`, `frontend/src/hooks/useCoachCommand.ts:96`, `backend/routes/aiCommandRoutes.mjs:119,296,320`, and `backend/routes/aiChatRoutes.mjs:466`.

New file paths below are proposals. Existing files are edited only after the caller supplies their full source and ownership evidence.

**Pattern excerpts available**

Transport pattern, supplied at `useCoachCommand.ts:96-101`:

```ts
const res = await apiService.post('/api/ai-command/execute', {
  message,
  selectedClientId: opts?.selectedClientId ?? undefined,
  previousContext: opts?.previousContext ?? undefined,
  routeContext: opts?.routeContext ?? undefined,
});
```

Control pattern, supplied in `commandLaneControls.mjs`:

```js
export function isCommandLaneEnabled() {
  return process.env.AI_COMMANDS_ENABLED !== 'false';
}
```

These excerpts support transport reuse and switch semantics. They do **not** supply a styled-components example, transaction pattern, test harness, migration pattern, or registry initializer. Those are S0 inputs.

| Slice | File | Purpose; imports → exports | Budget |
|---|---|---|---:|
| S0 | Package `00`–`09` documents | Preserve decisions, add source supplement and evidence links; no runtime imports | ≤300 lines each |
| S1 | `backend/services/ai/harness/registrySafety.mjs` | Pure registry validation; no I/O → `isRegistryWrite`, `validateRegistrySafety` | 120 |
| S1 | `backend/services/ai/harness/providerAdmission.mjs` | Positive field/template validation → `admitProviderEnvelope`, `buildProviderMessages` | 220 |
| S1 | `frontend/src/components/DashBoard/Pages/coach-assistant/harnessOutcome.ts` | Parse response variants → `reduceHarnessOutcome` | 180 |
| S1 | `frontend/src/components/DashBoard/Pages/coach-assistant/harnessContracts.ts` | Shared frontend request/outcome types; type imports only | 220 |
| S2 | `backend/models/CoachHarnessOperation.mjs` | Proposed ledger model; Sequelize → `defineCoachHarnessOperation` | 150 |
| S2 | Migration path assigned at S0 | Matching additive schema/constraints/indexes; migration API → `up`, guarded `down` | 180 |
| S2 | `backend/services/ai/harness/operationRepository.mjs` | Locked database access, replay, state transitions; actual model/transaction adapter → repository factory | 260 |
| S2 | `backend/services/ai/harness/operationService.mjs` | Preview/confirm/cancel/get; repository, policy/access/effect adapters → `createOperationService` | 280 |
| S2 | `backend/services/ai/harness/operationPayload.mjs` | Canonicalization and reviewed encryption/digest adapter calls → encode/decode/hash helpers | 180 |
| S2 | `backend/services/ai/harness/operationRetention.mjs` | Expire previews and remove retained payloads/tombstones → bounded retention runner | 180 |
| S3 | `backend/services/ai/commandExecutor.mjs` | Preserve public exports; extract touched orchestration through supplied imports | ≤300 |
| S3 | `backend/services/ai/harness/commandExecution.mjs` | Resolve/classify/authorize/preview using existing registry and dispatcher | 280 |
| S3 | `backend/services/ai/harness/commandConfirmation.mjs` | Bridge existing confirmation entry point to operation service | 220 |
| S3 | `backend/routes/aiCommandRoutes.mjs` | Middleware and route declarations only; extracted handlers | ≤300 |
| S3 | `backend/controllers/aiCommandHarnessController.mjs` | HTTP mapping and recovery endpoints; command/operation services | 260 |
| S3 | `backend/services/ai/commandRegistry/index.mjs` | Run registry safety validation at initialization; preserve registry authority | ≤300 |
| S4 | `backend/services/ai/harness/providerGateway.mjs` | Admission → existing providerRouter → existing validators | 220 |
| S4 | `backend/routes/aiChatRoutes.mjs` | Extract touched chat handlers; preserve middleware/order/lifecycle semantics | ≤300 |
| S4 | `backend/controllers/aiChatMessageController.mjs` | Existing message orchestration through gateway; supplied source required | 280 |
| S4 | Additional extracted chat lifecycle controller files | One existing lifecycle responsibility per file; exact inventory fixed at S0 | ≤300 each |
| S4 | Existing proposal approval entry points | Enforce the same write pause/current access without inventing proposal schema | ≤300 each |
| S5 | `frontend/src/hooks/useCoachCommand.ts` | V2 command/recovery transport; existing `apiService`; parsed outcomes | ≤300 |
| S5 | `frontend/src/hooks/useAIChat.ts` | Extract transport/lifecycle responsibilities, retain public hook API | ≤300 |
| S5 | `frontend/src/hooks/aiChatTransport.ts` | Existing API calls and response parsing extracted from supplied source | 260 |
| S5 | `CC/hooks/useCoachAssistant.ts` | One outcome reducer; command-first boundary; no error fallback | ≤300 |
| S5 | `CC/CoachCommandCenter.actions.ts` | Request identity, frozen scope, explicit retry/recovery | ≤300 |
| S5 | `CC/CoachCommandCards.tsx` | Non-null confirmation, stale/unknown states and truthful receipts | ≤300 |
| S5 | `CC/CoachConsoleDock.tsx` | Reachable composer and disabled/status semantics | ≤300 |
| S5 | `CC/CoachHarnessStatus.tsx` | Shared accessible state presentation; styled-components example required | 180 |
| S5 | `CC/CoachHarnessStatus.styles.ts` | Exact token aliases and responsive control layout | 160 |
| S6 | Named tests in `09-tests.md` | Independent acceptance evidence; split any file approaching cap | ≤300 each |

`CC/` expands to `frontend/src/components/DashBoard/Pages/coach-assistant/`.

**Extraction constraint**

Exact extraction imports/exports cannot be reconstructed from line counts. S0 must attach the existing module graph and freeze the extraction map before S3/S4/S5. The builder may not fill unknown imports with placeholders or rewrite the module wholesale.

**Storage decision**

If the existing operation store is proven conformant, replace the proposed model/migration rows with a documented adapter to that store. Preserve the contract and tests. This is an architect checkpoint amendment, not a builder-selected fork.

**Bootability**

S1 adds unmounted pure modules. S2 adds storage without enabling new command behavior. S3 integrates command behavior only behind verified deployment readiness. S4 and S5 retain public imports during extraction. S6 removes no legacy path until compatibility and pending-preview handling are demonstrated.
