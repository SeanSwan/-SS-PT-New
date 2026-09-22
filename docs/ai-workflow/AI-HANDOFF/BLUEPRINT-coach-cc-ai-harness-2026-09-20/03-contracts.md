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
  conversationRef?: string; // opaque, server-resolved conversation reference.
                            // The server reconstructs prior turns from its ADMISSION RECORD
                            // (privacy-boundary@1.2.0 §6.1a) — never the human-facing transcript.
                            // Round-6 R6-04: replaces `previousContext`.
  routeContext?: unknown;
};
```

Limits: UTF-8 message ≤16 KiB; whole JSON body ≤64 KiB; unknown top-level keys rejected for V2. These limits apply to interactive commands, not document/audio intake. `routeContext` is an untrusted hint and requires a supplied, explicit schema before V2 integration.

**Round-6 R6-04: `previousContext` is REMOVED from the request, and legacy payloads are rejected explicitly.**
Round 5 introduced a server-held admission record to replace the caller-supplied `previousContext` — and
**never updated this request contract**, so the mechanism had no V2 representation while the field it replaced
was still declared. Verified by extraction: `conversationIdAllowed=false`, `previousContextType="unknown"`.
Since unknown top-level keys are rejected for V2, a client *cannot* send `previousContext` — which is the
intended behaviour, but it must be **stated** rather than left as a side effect of the unknown-key rule:

- `conversationRef` is **opaque** and **authorisation-bound** — the server resolves it against the
  authenticated actor, and a reference to a conversation the actor does not own is a **rejection**;
- a request carrying `previousContext` is **rejected as a legacy payload**, with an explicit code — not
  silently ignored, and not coerced into `conversationRef`;
- **the request type, the caller mapping and the validation contract are updated in the same change**, or the
  three disagree — which is exactly how R6-04 arose.

Client IDs must be positive safe integers for this observed numeric client contract. An absent client is permitted only where the registry allows it. Never infer scope from a display name.

**Response vocabulary**

```ts
type HarnessErrorCode =
  | 'invalid_request' | 'unauthenticated' | 'access_denied'
  | 'lane_paused' | 'writes_paused' | 'rate_limited'
  | 'request_key_conflict' | 'request_too_old'
  | 'preview_expired' | 'preview_stale' | 'operation_not_found'
  | 'unsupported_effect' | 'outcome_unknown' | 'internal_error'
  | 'privacy_unavailable';   // HTTP 503, non-retriable — round-4 R4-04

type HarnessError = {
  type: 'error';
  error: string; // approved public copy, never raw exception text
  code: HarnessErrorCode;
  requestKey?: string;
  operationId?: string;
};
```

**`privacy_unavailable` is required, and its propagation is a chain of SEVEN sites (round-4 R4-04; extended
in round 5 by R5-03, in round 6 by R6-05, and in round 7 by R7-02).** The boundary's failure contract (`privacy-boundary@1.2.0` §5) promises
`503 PRIVACY_UNAVAILABLE`, and until this code existed the vocabulary **could not represent it** — so a
correctly detected rejection had no wire form. Correcting the classifier's `catch` alone is insufficient;
a rejection must survive **all seven**:

| # | Site | Current behaviour |
|---|---|---|
| 1 | `intentClassifier.mjs:170` | `catch` → chat fallback (`:187`) — **but `:173-184` already re-checks PHI and blocks.** This is the shipped precedent, not the exception |
| 2 | `aiChatService.mjs:2034` | provider failover `catch` → `continue` — **re-sends to the next provider** |
| 3 | `aiChatService.mjs:2301` | **R5-03:** non-timeout error on Pro → `continue` → **retries Flash, ignoring the error code entirely** |
| 4 | `commandExecutor.mjs:565` | `catch` → `ctx.error = COMMAND_PIPELINE_FAILED_MESSAGE`, the type discarded |
| 5 | `aiCommandRoutes.mjs:171` | `res.json({…})` → **HTTP 200** |
| 6 | `aiChatRoutes.mjs:823` | **R5-03:** `res.status(500).json({success:false, error:'Failed to send message'})` — **no privacy code on the wire** |
| 7 | `aiCommandRoutes.mjs:283` | **R6-05:** the route's **outer** `catch` → `res.status(500).json({success:false, error:'Internal server error processing your command'})` — **no privacy code on the wire**. Distinct from site 5: `:171` is the *returned* path, `:283` the *thrown* one. Round 6 reproduced this with a synthetic rejection and got **HTTP 500 carrying no privacy code** |
| 8 | `debate/debateOrchestrator.mjs:480` | **R7-02:** `catch` → `recordDebateFailure` → `emitProgress` → **`return null`**, letting the **asynchronous** job finish `complete`. There is no request left to fail, so this is the site where a refusal is not merely swallowed but **rendered invisible** — see `03b` §5 |

Sites 7 and 8 are the two additions that the table's own count kept not accounting for. Site 7 was found
because a *returned* rejection and a *thrown* one leave by different doors; site 8 because every earlier
sweep walked only the **synchronous** path — and an async job has no caller to propagate to. Site 8 is the
strictest case: the honest wire form for a refusal inside an async job is a **terminal job state** surfaced
by polling or SSE, never a salvaged plan (`03b` §5).

Site 3 is the worse of the two round-5 additions. Site 2 fails over to *another provider*; site 3 fails over
to *another model on the same provider* — and **both `continue` without inspecting the error's type**, so a
privacy refusal raised inside either call is indistinguishable from a network fault and is retried.

**Non-retriable means five things:** the client must not retry; the server must not fail over to another
**provider** or another **model**; the route must not flatten the refusal into a **200** or a generic **500**;
no `catch` may absorb it; and **no asynchronous job may continue past it or salvage a result from it** — a
refusal is **terminal**. See `BLUEPRINT-swan-coach-live-2026-09-20/03b-privacy-boundary.md` §5 for the
full table. Whether the live route
rejects or falls back remains an **operator decision**.

```ts
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

**Cross-package privacy boundary — pinned, not restated (round-3 R3-02)**

This package **consumes** the outbound privacy contract; it does not define it.

| | |
|---|---|
| **Contract** | `privacy-boundary@1.2.0` |
| **Location (gate)** | `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-live-2026-09-20/03b-privacy-boundary.md` — the gate, its placement, failure propagation (§1–§5) and the canary assertions (§8) |
| **Location (predicate)** | `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-live-2026-09-20/03c-release-predicate.md` — the release predicate, provenance scoping and admission (§6). **Round-5 R5-08 split this out of `03b` when it reached 298 of 300 lines** |
| **Location (channels)** | `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-live-2026-09-20/03d-context-channels.md` — the context channels (§7): the C6a/C6b split and the verified seven-field emission list. **Round-6 split this out of `03c` when it reached 309 of 300 lines** |
| **Binds here** | requirement **H06** — "Enforced provider privacy boundary" (`00-README.md`) |
| **Change rule** | a change **in either file** is a **version bump plus a `07-checkpoints.md` decision**, and this package is updated in the same change — otherwise the pin is broken and the gate is unimplementable |

**Which file owns what — stated, so a reader never has to resolve a bare filename.** This package contains
`03b-contracts-proposed-artifacts.md` but **no** `03b-privacy-boundary.md`, so an unqualified `03b`/`03c`
here would be ambiguous (`03d` is unique to the other package):

- **`03b-privacy-boundary.md` owns:** what the allowlist filters, the three enforcement points, the
  dedicated-provider-request scope, failure propagation at the dispatcher across **seven** absorbers, and the
  canary assertions.
- **`03c-release-predicate.md` owns:** the release predicate and its **provenance scoping**, and the admission
  schema.
- **`03d-context-channels.md` owns:** the C6a/C6b channel split with the verified emitted-field list.
- **This package owns:** the command/response harness contracts above, replay and expiry, and the shared
  acceptance tests that exercise the boundary **through the dispatcher** (`09-tests.md`, "Privacy boundary
  tests").

**Why it is not restated here.** Round-3 **R3-02**: the two packages previously referenced a shared
defect but not each other's remedies, so no agreed relationship existed between the early scanner
expansion and the final outbound gate. One authority, pinned on both sides, or the gate drifts.

**Two facts this package must not re-derive** (measured, round 4 — `ADJUDICATION-R3.md` §4,
`BLUEPRINT-swan-coach-live-2026-09-20/03d-context-channels.md` §7.1):

- `routeContext` (**C6a**) is a **live, unscanned** channel: `buildRouteContextLine`
  (`intentClassifier.mjs:28-51` → `:116` → `:133`) emits **seven** fields, while `stepPHIScan`
  (`commandExecutor.mjs:192`) scans `ctx.sanitizedInput` only. Normalization constrains **shape**, never
  **content**.
- `selectedClientName` (**C6b**) is **inactive on this route** — the single production caller hardcodes
  `null` (`aiCommandRoutes.mjs:164`). That is a property of the **caller**, not of the field.
