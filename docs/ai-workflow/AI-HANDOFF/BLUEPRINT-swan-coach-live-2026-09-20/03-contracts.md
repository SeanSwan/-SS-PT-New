---
decision: "Approval is a server-enforced single-use grant bound to actor/tenant/client/payload/version/expiry; outbound privacy is a positive allowlist that fails closed."
status: open
supersedes: none
---

# 03 — Contracts

## 1. Types (M1)

```ts
// EXISTING — [SUPPLIED] from hooks/useFreestyleSession.ts. Do not redefine.
interface FreestyleFragment { id: number; text: string; atMs: number; }
interface FreestyleSnapshot {
  fragments: readonly FreestyleFragment[]; wordCount: number;
  elapsedMs: number; accountKey: string | null;
}
type FreestylePurgeReason =
  | 'discard' | 'account-switch' | 'logout' | 'ttl' | 'unmount' | 'completed';

// NEW — [PROPOSED]
interface CaptureBinding {
  principalId: string; tenantId: string; clientId: string | null;
  conversationId: string; authGeneration: number; captureGeneration: number;
}
interface BoundSnapshot {
  snapshotId: string;            // UUID v4, minted at start()
  binding: CaptureBinding;       // captured at start()
  snapshot: FreestyleSnapshot;   // frozen at stop()
}
type HandoffOutcome =
  | { kind: 'handed-off'; snapshotId: string; wordCount: number }
  | { kind: 'rejected'; snapshotId: string; reason: RejectReason }
  | { kind: 'empty'; snapshotId: string };
type RejectReason =
  | 'stale-binding' | 'missing-target' | 'already-consumed' | 'capture-superseded';
```

### 1.1 `completed` is overloaded — split it (correction 6)

The existing union conflates three events. M1 emits them **separately**; `completed` is retired
from new code and left untouched in the existing hook.

| Event | Meaning | Emitted when |
|---|---|---|
| `DRAFT_HANDOFF` | text reached the composer | after a successful functional append |
| `BUFFER_DESTROY` | source buffer destroyed | **always**, on every terminal path |
| `AUDIT_ACK` | a durable sink acknowledged the receipt | only on sink 2xx |

**`BUFFER_DESTROY` must never be blocked by `AUDIT_ACK` failing, and a failed `AUDIT_ACK` must never
be rendered or logged as durable success.** Deletion is local and unconditional; durability is
best-effort and separately reported.

## 2. `appendDictation` — the atomic composer contract (correction 5)

Owner: `CoachConsoleDock`. Exposed to `CoachFreestyleControl` by prop.

```ts
type AppendResult =
  | { applied: true;  snapshotId: string; appendedChars: number }
  | { applied: false; snapshotId: string; reason: 'duplicate' | 'empty' | 'no-target' };

function appendDictation(snapshotId: string, text: string): AppendResult;
```

Required semantics:
1. **Functional.** Next value computed from the **current** value inside the updater
   (`setCommandText(prev => merge(prev, text))`). Never from a captured variable or a render-time ref.
2. **Idempotent.** A `snapshotId` already in the consumed set returns `{applied:false,'duplicate'}`
   and performs **no** write.
3. **Merge rule.** `prev.trimEnd()` empty → `text`; else `` `${prev.trimEnd()}\n\n${text}` ``.
   Empty `text` → `{applied:false,'empty'}`, **no separator written**.
4. **No target** (textarea unmounted) → `{applied:false,'no-target'}`; caller purges and receipts.
5. Returns synchronously; the caller must not assume the DOM has updated.

## 3. The approval boundary (correction 2)

### 3.1 Four operations, none implying the next

| # | Operation | Tier | Server-enforced gate |
|---|---|---|---|
| 1 | `COMPOSER_EDIT` | local | none — never leaves the device |
| 2 | `MESSAGE_SEND` | conversation | auth + tenant scope + privacy allowlist |
| 3 | `PROPOSAL_CREATE` | server draft | as 2; creates a **draft**, mutates no client record |
| 4 | `RECORD_MUTATE` | write | **requires a valid ApprovalGrant** |

> **Sending is not approval to write.** A `MESSAGE_SEND` — including one whose text came from
> dictation — may never be treated as consent for (4).

### 3.2 `ApprovalGrant` `[PROPOSED]`

```ts
interface ApprovalGrant {
  grantId: string;          // UUID, single use
  nonce: string;            // consumed atomically with the mutation
  actorId: string;          // the human who approved — not the model, not the session
  tenantId: string;
  clientId: string;         // exact subject
  proposalId: string;
  payloadHash: string;      // SHA-256 of canonical-JSON payload
  recordVersion: number;    // optimistic-concurrency version at approval time
  expiresAt: string;        // ISO-8601, server clock
}
```

Server MUST reject unless **all** hold, checked **inside** the mutating transaction:
- `grantId` unconsumed; `nonce` consumed in the *same* transaction as the mutation (atomic replay
  protection — a check-then-act in two statements is not sufficient under concurrency);
- `actorId` == authenticated principal, and that principal is authorised for `clientId`;
- `tenantId` matches the record's tenant;
- `payloadHash` equals the hash of the payload **actually being written** — recomputed server-side,
  never trusted from the client;
- `recordVersion` equals the record's current version (else `409 STALE_RECORD`);
- `now < expiresAt`.

**Any change to target or payload invalidates the grant**, because both are covered by
`payloadHash` + `clientId` + `recordVersion`. Re-approval is required; there is no "amend".

> Round-2 **R2-07** recorded a `120s → 300s` expiry change as *unpinned*. This package pins the M1
> position: **`expiresAt` is server-issued with a default TTL of 120 s**, configurable only by
> deployment config, never by the client. Changing it is a `07-checkpoints.md` decision, not a
> code edit. `[PROPOSED]`

### 3.3 Streaming never acts

A delta frame carries **display text only**. No delta may create a proposal, consume a grant, or
mutate a record. Enforced by the event schema in §5 having no action field at all.

## 4. The privacy boundary (correction 3)

### 4.1 Reconciled facts — do not re-derive

From `2026-09-20-024101-…` `[SUPPLIED]`:
- **R2-01 (HIGH, live):** `aiCommandRoutes.mjs:121` takes `previousContext`/`routeContext` from
  `req.body`; `:166` passes them raw; `commandExecutor.mjs:190-206` scans **`ctx.sanitizedInput`
  only**; `intentClassifier.mjs:123-125` interpolates `previousContext` verbatim into the provider
  prompt. Reachable from the mounted console via `useCoachCommand.ts:120`.
- **R2-02:** `scanForPHI`/`stripPHI` use `text.match(pattern)` **without `/g`** → only the *first*
  match per pattern is enumerated; a second identifier survives while the pipeline logs success.
  And `"log a workout for Jordan T., knee felt bad"` → `hasPHI: false` — **names are not detected
  at all.**

**Consequence for this package:** dictated free text is the most name-dense input in the product,
and the existing denylist cannot see names. **Client IDs do not sanitise dictated free text.** This
is why M1 stops at the composer and why M2 is blocked.

### 4.2 Channel map — every hop audio/text can take

| # | Channel | Boundary | M1 status |
|---|---|---|---|
| C1 | Microphone → Web Speech API | **B1, may be remote** | **UNRESOLVED — PART C D-1** |
| C2 | Recogniser → fragment buffer | device | in scope |
| C3 | Buffer → composer | device | in scope |
| C4 | Composer → `message` | B2→B3 | existing; allowlist applies |
| C5 | `previousContext` | B2→B3 | **R2-01 unscanned** |
| C6a | `routeContext` — caller-controlled, structurally constrained | B2→B3 | **R2-01 unscanned — LIVE** (§4.5) |
| C6b | `selectedClientName` | B2→B3 | **inactive on this route** — the one production caller hardcodes `null` (§4.5) |
| C7 | Conversation history retrieval | B2→B3 | unmapped — PART C D-2 |
| C8 | Server logs | B2 | must never carry raw dictation |
| C9 | Telemetry / receipts | B2 | **no raw transcript** (§1.1) |
| C10 | TTS speech output | B3 | M3 only |

### 4.3 Positive admission, not redaction — moved to `03b-privacy-boundary.md`

**The gate is specified in one place: `03b-privacy-boundary.md`, contract id `privacy-boundary@1.2.0`.**
This file no longer restates it, because a gate specified in two places is specified in neither
(round-3 **R3-02**).

In one paragraph, so this section still reads on its own: the gate is an **allowlist of permitted
outbound fields**, applied to the **final serialized provider request**, at **three** points — a
pre-assembly projection that rejects inadmissible inputs, a post-assembly inspection of the assembled
body as **semantic text before transport encoding**, and a **binding** of that inspected text to the
exact bytes that cross the wire. It **fails closed**: if privacy cannot be **established** — a predicate
defined in `03c-release-predicate.md` §6, and *not* satisfied by a successful detector invocation — the
request is not sent and returns `503 PRIVACY_UNAVAILABLE`, with **zero provider calls** and **no
fallback**, **by provider or by model**.

> **Round-5 R5-06 corrected this paragraph.** It previously said *"at **two** points"* and *"applied to
> the final serialized provider request"*, both superseded in round 4: the points are three (P2 inspects
> semantic text, P2b binds it), and the allowlist's object is the envelope while P2's object is the
> pre-encoding text. A summary that contradicts the contract it summarises is a second specification.

`03b-privacy-boundary.md` owns: the object the allowlist filters (§2), the three enforcement points (§3),
the dedicated-provider-request scope (§4), and the mandatory canary assertions (§8).
`03f-absorber-chain.md` owns: failure propagation at the dispatcher across **eight** absorbers (§5, PART C-4).
`03c-release-predicate.md` owns: the release predicate and its **provenance scoping** (§6.0) — the U/O/P
distinction and the predicate it licenses.
`03e-admission-schema.md` owns: the admission schema P1 applies (§6.1), the transcript/admission-record
split and the record's producer contract (§6.1a), and the predicate's limits (§6.2).
`03d-context-channels.md` owns: the C6a/C6b channel split with the verified seven-field emission list (§7).

### 4.4 Canary verification — see `03b-privacy-boundary.md` §8

The mandatory assertions — dispatcher call count, the fallback path, repeated identifiers, detector
false negatives — are specified in `03b-privacy-boundary.md` §8 and scheduled in `09-tests.md` T-04.
The requirement is unchanged and still binding: a **distinct** canary per channel, asserted on the
**final serialized bytes handed to the provider adapter**, never on an intermediate object.

## 5. Streaming transport — decision (correction 7, M3)

**Chosen: SSE.** Rationale: the request is unidirectional server→client after a normal POST; SSE
reuses the existing cookie/bearer auth and survives corporate proxies; groundwork already exists at
`backend/routes/aiStreamSpikeRoutes.mjs` `[SUPPLIED]`. WebSocket is **rejected** for M3 — it adds a
second auth path and a second scaling profile for no capability M3 needs. Revisit only if
barge-in requires client→server audio streaming (PART C D-5).

### 5.1 Flow and schemas

`POST /api/ai-chat/conversations/{id}/messages` → `202 {messageId, streamToken, idempotencyKey}`
then `GET /api/ai-chat/stream?token=…` (SSE).

```
event: delta  data: {"messageId":"…","seq":1,"text":"…"}
event: done   data: {"messageId":"…","seq":42,"finalHash":"sha256:…"}
event: error  data: {"messageId":"…","code":"PROVIDER_TIMEOUT","retryable":false}
```

- `seq` is monotonic from 1. A gap ends the stream as `error`; the client does **not** interpolate.
- **Terminal states:** `done` | `error` | `cancelled` | `disconnected`. Exactly one, always emitted.
- **Limits:** ≤ 64 KiB per delta, ≤ 8 MiB per message, ≤ 120 s wall clock, client buffer bounded at
  256 KiB — on overflow the client cancels rather than growing without limit.
- **Cancellation must cancel the upstream provider request**, not merely stop reading. Round-2
  **R2-09** recorded exactly this defect on the classifier timeout; do not reproduce it.
- **Disconnect:** the server persists whatever completed and marks the message `partial`. On
  reconnect the client **refetches the authoritative message** and replaces its local text; deltas
  are never the source of truth.
- **Duplicate-send prevention:** the client sends `idempotencyKey` (UUID per user send action); the
  server returns the **same** `messageId` for a repeat. **After an ambiguous completion the client
  never auto-retries** — it reconciles by GET. Automatic retry after ambiguity is how one spoken
  sentence becomes two client messages.

## 6. Voice contracts (M3 — designed, not built)

| Phase | Scope | Status |
|---|---|---|
| M3.1 | Streaming text only | designed here |
| M3.2 | Spoken replies (TTS of final text, not of deltas) | designed here |
| M3.3 | Barge-in: speech energy over threshold for ≥ 250 ms cancels TTS and re-opens capture | designed here |
| M3.4 | Stale-audio rejection: every audio chunk carries `captureGeneration`; mismatches are dropped | designed here |
| M3.5 | Feedback prevention: capture suspended while TTS plays unless an echo-cancelling path is confirmed | designed here |
| M3.6 | Physical-device acceptance | **DEFERRED — PART C D-6** |

**Streaming text alone does not make a hands-free coach.** M3.1 without M3.2–M3.5 is a faster chat
window, and must not be described as a live coach.

**Latency budgets `[PROPOSED]`, measured on a mid-tier Android over 4G:** first delta ≤ 1.2 s p95;
inter-delta ≤ 400 ms p95; barge-in to capture-open ≤ 300 ms p95; dictation stop → draft in composer
≤ 150 ms p95. Acceptance requires a **physical device**; an emulator result is `NOT RUN`.
