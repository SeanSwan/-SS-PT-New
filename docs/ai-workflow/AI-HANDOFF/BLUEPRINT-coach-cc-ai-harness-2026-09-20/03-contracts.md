> **CALLER NOTE — not Astra's text.** Astra emitted this as a single 352-line document, which
> violates the package's own ban ("No new file or touched module over 300 lines", `06-bans.md`).
> Round-2 review R2-10 flagged that the pre-existing-file qualification does not exempt a *new*
> artifact. The caller split it at the natural boundary — **this part covers contracts against the
> EXISTING surface; `03b-contracts-proposed-artifacts.md` covers proposed new artifacts.** No content
> was altered or dropped; the blank line at the split was removed.
> **Line counts deliberately live only in `MANIFEST.md`**, which the splitter regenerates. An earlier
> version of this note carried them and went stale the moment either half was edited — including when
> this very note was edited. One place, regenerated, or it drifts.
> Both parts remain **unreviewed by any seat** in their split form.

**Contract status**

Existing shapes quoted below are packet evidence. New shapes are proposed versioned contracts. Missing existing schemas are integration blockers, not permission to invent compatible responses.

**Command request**

Preserve existing fields and add negotiated harness fields:

```ts
type ExecuteRequestV2 = {
  harnessVersion: 2;
  requestKey: string;       // UUID v4, generated once per user submission
  requestIssuedAt: string;  // ISO-8601 UTC
  message: string;
  selectedClientId?: number;
  previousContext?: unknown;
  routeContext?: unknown;
};
```

Limits: UTF-8 message ≤16 KiB; whole JSON body ≤64 KiB; unknown top-level keys rejected for V2. These limits apply to interactive commands, not document/audio intake. `previousContext` and `routeContext` are untrusted hints and require supplied, explicit schemas before V2 integration.

Client IDs must be positive safe integers for this observed numeric client contract. An absent client is permitted only where the registry allows it. Never infer scope from a display name.

**Response vocabulary**

```ts
type HarnessErrorCode =
  | 'invalid_request' | 'unauthenticated' | 'access_denied'
  | 'lane_paused' | 'writes_paused' | 'rate_limited'
  | 'request_key_conflict' | 'request_too_old'
  | 'preview_expired' | 'preview_stale' | 'operation_not_found'
  | 'unsupported_effect' | 'outcome_unknown' | 'internal_error';

type HarnessError = {
  type: 'error';
  error: string; // approved public copy, never raw exception text
  code: HarnessErrorCode;
  requestKey?: string;
  operationId?: string;
};

type ConfirmationV2 = {
  type: 'confirmation_required';
  operationId: string;
  command: string;
  params: Record<string, unknown>; // sanitized display fields only
  client: { id: number } | null;
  details: Record<string, unknown>; // reviewed presenter schema
  isDestructive: boolean;
  message: string;
  harnessVersion: 2;
  requestKey: string;
  expiresAt: string;
};

type CommittedReceipt = {
  type: 'executed';
  harnessVersion: 2;
  operationId: string;
  command: string;
  client: { id: number } | null;
  result: Record<string, unknown>;
  receipt: {
    effect: 'database_commit';
    committedAt: string;
    operationId: string;
  };
};
```

The original `CommandResponse` variants remain recognizable. A normal read may return the existing `executed` variant without a mutation receipt. Only `receipt.effect === 'database_commit'` establishes a committed mutation in V2.

`frontend_dispatch` never carries that receipt. `debate_started` means a job was started, not that its result exists or an action occurred.

**Endpoint contracts**

All command endpoints use verified authentication and actor ownership. Full-lane disable applies to execution/confirmation. Recovery reads and cancellation remain available to authenticated owners during an execution pause; this is an explicit availability refinement, not an alternate execution path.

| Method/path | Request | Proposed success | Errors |
|---|---|---|---|
| `POST /api/ai-command/execute` | `ExecuteRequestV2` | 200: existing read/fallback/not-wired variants or `ConfirmationV2` | 400 invalid schema; 401 auth; 403 access; 409 key conflict; 413 limit; 429 rate; 503 lane/write pause or unavailable service |
| `POST /api/ai-command/confirm` | `{ operationId: UUID }` | 200: committed receipt, including replay of existing success | 400 malformed; 401; 404 unavailable/not owned; 409 stale/cancelled; 410 expired; 429; 503 paused/unknown |
| `POST /api/ai-command/cancel` | `{ operationId: UUID }` | 200: `{operationId,state}` where state is authoritative | 400; 401; 404; 429; 503 storage unavailable |
| `GET /api/ai-command/operations/:operationId` | No body | 200: `{operationId,state,expiresAt,receipt?}` | 400; 401; 404; 429; 503 |
| `GET /api/ai-command/requests/:requestKey` | No body | 200: same operation view | 400; 401; 404 `request_not_found`; 429; 503 |

A 404 recovery response means no matching retained operation was found. It is **not** universal proof that no business effect ever happened. The UI must not automatically resubmit from it.

For cancellation, a completed operation returns `state: 'SUCCEEDED'`; the UI renders “This action was already completed.” A cancelled operation replays `CANCELLED`.

Generic safe error example:

```json
{
  "type": "error",
  "error": "This preview has expired. Create a new preview.",
  "code": "preview_expired"
}
```

**Preserved API inventory**

These endpoints are observed in the packet, but their complete contracts are absent. They are preserved, not reverse-engineered from names.

| Endpoint family | Supplied evidence | Required before modification |
|---|---|---|
| `GET /api/ai-command/commands`, `/health` | `aiCommandRoutes.mjs:352,380` | Auth, response schema, exposure restrictions |
| `POST /api/ai-chat/conversations` | `useAIChat.ts:217,425` | `{context,title,responseStyle,targetUserId?}` validation and complete response |
| `GET /api/ai-chat/conversations` | `useAIChat.ts:249` | Pagination, status, authorization and list schema |
| `GET /api/ai-chat/conversations/:id` | `useAIChat.ts:273` | Ownership and message schema |
| `POST /api/ai-chat/conversations/:id/messages` | `useAIChat.ts:323,447`; `aiChatRoutes.mjs:466` | Exact request-context schemas and complete success/error envelopes |
| `PATCH /api/ai-chat/conversations/:id` | `useAIChat.ts:509,527` | Allowed fields, concurrency, response |
| `DELETE /api/ai-chat/conversations/:id` | `useAIChat.ts:382` | Deletion semantics and response |
| `GET /api/coach/proposals/:id` | `coachProposalRoutes.mjs:21` | Detail and access schema |
| `POST /api/coach/proposals/:id/approve` | `:30` | Approval request, state transitions, transaction and replay |
| `POST /api/coach/proposals/:id/clarification-answer` | `:39` | Answer schema, allowed transitions |
| `POST /api/coach/proposals/:id/reject` | `:52` | Rejection schema and terminal behavior |

The observed chat-message response names are `success`, `userMessage`, `assistantMessage`, `messageCount`, `frontendActions`, `coachActionProposals`, `coachActionProposalError`, `clientCreateResult`, and `workoutImportResults`. Their existence does not prove nested schemas or safe execution. In particular, any legacy direct-write metadata requires caller tracing before V2 enablement.

`/transcribe`, `/tts`, `/diagnostics`, `/api/coach/intake/*`, `/api/clients/onboard`, stream-spike, debate, and admin BFF internals are unchanged. No new access to them is introduced. Any one that supplies an alternate in-scope model or mutation path becomes an explicit integration dependency.

**Registry policy**

```ts
type RegistrySafetyEntry = {
  name: string;
  destructive: boolean;
  requiresConfirmation: boolean;
};

function isRegistryWrite(entry: RegistrySafetyEntry): boolean;
function validateRegistrySafety(
  entries: readonly RegistrySafetyEntry[]
): { ok: true } | { ok: false; errors: readonly string[] };
```

`isRegistryWrite` returns exactly `entry.destructive || entry.requiresConfirmation`. Missing/non-boolean flags and duplicate names fail registry validation.

Every V2 write requires a server preview. Handler support is a capability check, not a competing determination of whether the command is dangerous.

**Operation execution**

1. Authenticate and normalize the actor through a server-only identity adapter.
2. Resolve and authorize the target independently of client hints.
3. Validate command parameters with the registry schema.
4. Create a five-minute preview using database time.
5. Store immutable parameters, scope, relevant data-version fingerprints, and registry version.
6. On confirmation, begin a transaction and lock the owned operation.
7. Return the existing terminal outcome on replay.
8. Recheck expiration, current permissions, kill switches, registry version, and relevant domain versions.
9. Invoke the reviewed dispatcher with the **same transaction**.
10. Persist domain effect, success audit, and receipt atomically.
11. Commit, then return the receipt.

A supported dispatcher may not perform network calls, browser effects, or nontransactional writes inside this guarantee. Such commands return `not_wired`/`unsupported_effect` until a separate effect adapter is specified and approved.

An exception rolls the transaction back. A lost connection around commit produces an unknown client outcome and requires reconciliation. Do not assert rollback solely because the response failed.

**Replay and expiry**

- Unique `(actor_key, request_key)`.
- The same key and canonical request hash returns the existing preview/outcome.
- The same key with different bytes after canonical normalization returns 409.
- Accept request timestamps no more than 24 hours old or two minutes in the future.
- One explicit user submission receives one key; transport recovery retains it.
- A user-requested new preview receives a new key and requires confirmation.
- Actor, client, command, parameter, and policy changes never silently reuse a preview.
- Do not claim permanent, global exactly-once behavior.
