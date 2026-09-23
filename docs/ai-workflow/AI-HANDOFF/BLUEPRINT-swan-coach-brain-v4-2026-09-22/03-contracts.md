# 03 — Contracts

All types below are **proposed**. Existing symbols they bind to are named with their
measured path. Version: `coach-brain-contracts@4.0.0`.

## A. Turn transport — `POST /api/coach/turns` (SSE over POST)

```ts
// Request (JSON body). Auth: existing `protect` middleware (Bearer). Rate limit: existing ai limiter.
type TurnRequest = {
  clientTurnId: string;          // UUID v4 from the browser; idempotency key (24 h)
  threadId: number | null;       // null → server creates the thread, emits it in turn.started
  text: string;                  // ≤ 8,000 chars (voice transcripts included)
  clientRef?: { id: number } | null;   // from the @mention chip; never a name
  surface: 'coach' | 'planner' | 'logger' | 'schedule' | 'nutrition' | 'pain' | 'bootcamp';
  mode?: 'default' | 'hands_free';
  brainHint?: string;            // admin only; ignored for others
};

// Response: text/event-stream. Every event: `id: <seq>` + `event: <type>` + `data: <json>`.
type TurnEvent =
  | { type: 'turn.started';     seq: number; turnId: string; threadId: number; brain: BrainLabel }
  | { type: 'text.delta';       seq: number; text: string }
  | { type: 'tool.call';        seq: number; callId: string; tool: string; label: string; kind: 'read' | 'write' }
  | { type: 'tool.result';      seq: number; callId: string; ok: boolean; summary: string; rows?: number }
  | { type: 'approval.required';seq: number; approval: ApprovalView }
  | { type: 'brain.degraded';   seq: number; from: BrainLabel; to: BrainLabel; reason: string }
  | { type: 'heartbeat';        seq: number }                      // every 10 s of silence
  | { type: 'turn.completed';   seq: number; messageId: number; usage: Usage; trace: TraceRef }
  | { type: 'turn.refused';     seq: number; code: RefusalCode; message: string; next?: string }
  | { type: 'turn.failed';      seq: number; code: FailureCode; message: string; retryable: boolean };

type BrainLabel = { provider: string; model: string; tier: 'primary' | 'backup' | 'local' };
type Usage = { inputTokens: number; outputTokens: number; costUsd: number | null; toolCalls: number; rounds: number };
```

**Rules:**

- Exactly one terminal event per turn: `turn.completed`, `turn.refused` or `turn.failed`. The client treats stream end without a terminal event as `turn.failed{code:'STREAM_LOST', retryable:true}`, and that failure is **rendered** (J02).
- `seq` starts at 1 and is strictly increasing. The client drops duplicates and gaps are logged.
- `POST /api/coach/turns/:turnId/cancel` aborts the provider request through `AbortController` within 1 s (J03, J17). The partial assistant text is persisted and marked `stopped`.
- The same `clientTurnId` replayed within 24 h returns the stored terminal event. It never runs a second model call.
- Streamed text is **inert**: no event other than `approval.required` can lead to a write, and that event cannot perform one.

**Compatibility:** `/api/ai-chat/*` and `/api/ai-command/*` stay mounted and unchanged
until the P4 exit. The flag `COACH_BRAIN_V4` (server env + `featureFlagRoutes`) selects the
UI.

## B. Tool registry — one vocabulary (J04, J05, J07)

```ts
type ToolDefinition = {
  name: string;                  // === commandRegistry `type` (e.g. 'view_workout_history')
  description: string;           // from registry `description` + naturalLanguagePatterns
  kind: 'read' | 'write';        // write ⇔ registry destructive || requiresConfirmation || proposal-derived
  inputSchema: JSONSchema;       // zod-to-json-schema(registry.inputSchema)  (new dependency)
  roles: Array<'admin' | 'trainer' | 'client'>;   // registry roleRequired
  requiresClientRef: boolean;    // registry requiresClientRef
  surfaces?: TurnRequest['surface'][];            // FRONTEND_DISPATCH tools only on their surface
  reversibility?: 'reversible' | 'compensable' | 'irreversible'; // registry `reversibility` (coach branch)
};
```

- **Source.** `commandRegistry/index.mjs` `getCommandsForRole(role)` (139 commands; admin 129, trainer 99, client 13), plus the 9 proposal types in `coachActionProposalClassifier.mjs:43-53`, each mapped to a registry write command or to a new write tool with the same payload schema. After P3, a proposal is only ever a write-tool call.
- **Selection.** `toolSelector` sends the model at most **32 tools** per round. These are chosen by role, then surface, then a lexical score over the tool description against the utterance and the thread summary. The full list is sent only for `/help`. This replaces the 14–17 K-character command list sent on every classification today.
- **Classification rule (J06).** A tool whose dispatcher mutates state and whose registry entry declares neither flag is a **build error**. T-J06b enumerates dispatchers against the registry. This closes round-1 D5.

## C. Approval ledger (J06): reuse, do not rebuild

```ts
type ApprovalRequest = {          // stored via pendingOperationStore (in-process | Redis)
  approvalId: string;             // existing operationId format
  actorId: number; actorRole: string;
  tenantScope: { trainerId: number | null };
  clientId: number | null;
  tool: string; params: unknown;  // deep-copied at mint (existing behaviour)
  payloadHash: string;            // sha256(stableStringify({tool, params, clientId, recordVersion}))
  recordVersion: string | null;   // updatedAt/version of the target row at mint
  preview: { before: Record<string, unknown>; after: Record<string, unknown>; description: string };
  expiresAt: string;              // default 5 min (existing 120 s → decision D4)
  signature: string;              // operationSigning.signOperation (existing)
};
type ApprovalView = Omit<ApprovalRequest, 'signature' | 'params' | 'actorId'>;

// POST /api/coach/approvals/:approvalId  { decision: 'approve'|'reject', payloadHash, edits? }
// - approve: verifyAndRetrieveOperation (existing) → recheck clientScope + recordVersion → dispatcher
// - hash mismatch, version drift, actor change, expiry → 409 {code:'INVALIDATED'|'EXPIRED'}; no write
// - edits: server re-mints a NEW approval (new hash); the old one is invalidated
```

Single consumption stays the existing `delete()`-return rule
(`pendingOperationStore.mjs:23-35`). In production, `APPROVAL_STORE=redis` is required
before P3 exits (decision D5, U3).

## D. Brain harness (J09, J17, J19)

```ts
interface BrainAdapter {
  id: 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'ollama' | string;
  capabilities(model: string): { tools: boolean; streaming: boolean; vision: boolean; maxContext: number; jsonMode: boolean };
  stream(req: BrainRequest, signal: AbortSignal): AsyncIterable<BrainChunk>;   // text | tool_call | usage | stop
}
type BrainRequest = { model: string; system: string; messages: BrainMessage[]; tools: ToolDefinition[]; maxOutputTokens: number; temperature: number };
type ModelRegistryEntry = {        // table `coach_brain_models` or config/coach-brains.json (decision D2)
  key: string; adapter: string; model: string;            // e.g. 'claude-primary','anthropic','<model id>'
  roles: ('coach_chat' | 'fast' | 'summary' | 'eval')[];
  privacyClass: 'deidentified_clinical' | 'general';      // §P
  costPer1k: { input: number; output: number };
  enabled: boolean; order: number;
};
```

- Model IDs live **only** in the registry. A hard-coded model string in `coach-brain/**` fails T-J09.
- `brainRouter` picks the first enabled entry with the needed role, a compatible privacy class and the needed capabilities. Circuit breaking uses the existing `circuitBreaker.mjs`. A fallback is announced by a `brain.degraded` event.
- The cost of every round is written by `costLedger` (wires `providerCostTracker.mjs`) to the turn trace. When a per-trainer daily budget (D2) is exhausted, the turn returns `turn.refused{code:'BUDGET'}`.
- The existing SDKs in `backend/package.json` are used: `@anthropic-ai/sdk ^0.78`, `openai ^6.16`, `@google/generative-ai ^0.24`. OpenRouter goes through the OpenAI adapter (base URL), and Ollama through its HTTP API.

## E. Context bundle (J08)

```ts
type ContextBundle = {
  scope: 'self' | 'roster' | 'client';
  client?: CoachContextEngineOutput;       // contextEngine/coachContextEngine.mjs (de-identified)
  facts?: ActiveFact[];                    // coachFactMemoryPolicy.getMemoryForTask (cap 20)
  summary?: string;                        // rolling thread summary ≤ 1,200 chars
  recent: BrainMessage[];                  // last 12 messages, 2,000 chars each
  surface?: SurfaceContext;                // existing routeContext tokens, server-validated
};
```

After each completed client-bound turn, `factProposer` calls `proposeFactsFromTask` with
statements from the turn. The rows are `status:'proposed'`, and only a human approval in
the inspector activates them. This is the existing invariant in `CoachFact.mjs`.

## §P. Privacy boundary (replaces the regex-admission contract; decision D3)

1. **At source.** The context engine output is already de-identified: IDs and aliases only.
2. **Roster aliasing.** For each turn, `rosterAlias` builds a map `{legal name, first name, nickname} → "Client C<id>"` from the **actor's authorised roster** (`checkClientAccess`). It applies the map to the user text, the summary and any tool result *before* the brain, and inverts it on the way out for display only. Matching is exact and case-insensitive, and word-boundary normalised: deterministic, and testable to zero.
3. **Structured over free text.** Tools return typed rows. The free-text fields in tool results are capped and aliased.
4. **Defence in depth.** `phiScanner.stripPHI` still runs on the final payload. It is **not** the admission gate. A regex false positive is logged; it never refuses the turn (ends the R5-02 and R6-01 availability class).
5. **Provider allowlist.** Only models with `privacyClass:'deidentified_clinical'` receive client-bound turns. Which providers qualify (retention and BAA terms) is Sean's call (D3).
6. **Canary proof.** T-J11 plants synthetic roster names in the text, history, facts and tool rows, then asserts that none of them appears in the captured, final serialized provider request.

## F. Codes

- `RefusalCode = 'NO_ACCESS' | 'CLIENT_REQUIRED' | 'BUDGET' | 'PAUSED_WRITES' | 'TOO_LONG' | 'PLAN_LIMIT'`
- `FailureCode = 'PROVIDER_UNAVAILABLE' | 'TIMEOUT' | 'STREAM_LOST' | 'INTERNAL'`

Each code has a user sentence and a next step in `coach-brain/turn/turnMessages.mjs`. None
of them may render as silence.
