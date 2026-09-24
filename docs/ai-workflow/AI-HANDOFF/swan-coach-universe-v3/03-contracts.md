# SCU-CONTRACTS — identity, API, storage, recovery

Owner: Codex. Version: 3.0. Status: proposed; not a database migration.
Supersedes: v2 cards 2.1, 2.5, 3.1, 4.2 contracts where inconsistent.

## C1 Input envelope

Extend existing execute/chat adapters; preserve existing required fields.
`schemaVersion: 1`, `requestId: UUID`, `conversationId?: existing ID`,
`message: string(1..4000)`, `inputOrigin: text|voice|mixed|ui|unknown`,
`surface: registered surface key`, `targetUserId: positive integer|null`,
`contextVersion: opaque server-issued version`, `timeZone: valid IANA name`,
`draftRevision: nonnegative integer`, `occurredAt: ISO8601 UTC`.
Authenticated actor/role comes only from session. Actor IDs in body are ignored.

Map inputOrigin to existing `inputMode`: voice/mixed → voice, text → text,
ui → ui, unknown → null. Editing dictated content retains mixed/voice provenance
until the entire draft is explicitly cleared; keyboard submit does not make it
text-originated. Never infer provenance from a final string. Legacy omitted origin
is unknown, not text. Server cannot attest microphone provenance; it can enforce
declared/unproven-channel policy. This is not a second authentication factor.

Names resolve through authorized client lookup; wire targetUserId means Users PK.
Map legacy selectedClientId/clientId explicitly at adapters. A supplied target,
entity owner, conversation binding, and current selection that disagree produce
409 TARGET_MISMATCH and a re-anchor preview; no implicit “selection wins.”
Return the minimal accessible mismatch detail; no cross-client existence leak.

## C2 Resolved action policy

Registry entry adds `scopeKind: self|client|entity|global`, `ownerResolverKey`,
`effect: read|draft|write|external|destructive`,
`reversibility: none|inverse|compensation`, `inverseCommand?: registry key`,
`capabilityVersion: integer`, `requiredDomainStates: domain[]`.
Metadata is server-owned; reject or ignore+audit client policy fields consistently.
Entity resolver returns `{entityType,entityId,ownerUserId,version}` from actual
records. Owner resolution is required even if requiresClientRef is false.
Ownerless/global actions need explicit registry classification, never null-by-error.

Authorize after resolution AND immediately before execution. Assignment revoked
after preview returns 403 ACCESS_CHANGED with zero effects. Entity version changed
returns 409 PRECONDITION_CHANGED. A refusal cannot be softened by confirmation.
Maintain existing public denial-body conventions where they prevent enumeration.

## C3 Confirmation read-back

Keep GET `/api/ai-command/pending/:operationId` and POST `/confirm`, `/cancel`.
Extend stored/read-back operation with `policyVersion`, `tier`, `reasons[]`,
`requiresPhysicalConfirm`, `reversibility`, `targetUserId`, `entityVersion`,
`expiresAt`, `displayFields[]`, `intentId`. Include all machine-significant policy
fields in the signed payload and versioned digest subject. JSON wire normalization
happens before signing; undefined is omitted consistently, dates serialize to ISO.
The digest detects payload mismatch, not whether a human actually read the screen.

Only stored fields control warning, arming delay, count, target and confirm mode.
Migration: reader accepts legacy payload version with conservative UI; new mint
uses v2 payload; old in-flight approvals expire naturally within 120 seconds.
Never reinterpret old signatures as new. Enforce new schema only after all mounted
callers emit it, with a timed rollout and measured absent-version population.
Non-owner and missing pending IDs stay indistinguishable 404s.

## C4 Durable intent schema (PROPOSED)

New `coach_intents`, matching the old planned name but replacing its unsafe states:

| Column | Type / invariant |
|---|---|
| id | UUID PK, server issued |
| actor_id / target_user_id | integer FK Users; target nullable only for unscoped read/draft |
| idempotency_key | UUID supplied once at intent creation; unique `(actor_id,idempotency_key)` |
| request_hash | SHA256 canonical target+command+params+contextVersion; same key/different hash → 409 |
| command_type / input_origin | registry key / C1 enum |
| conversation_id / proposal_id | nullable existing-domain references; exact SQL type follows inspected schema |
| state | drafted, awaiting_approval, executing, committed_unverified, verified, failed, unknown, cancelled, refused |
| version | integer optimistic concurrency counter, default 0 |
| policy_version / context_version | integer / opaque string |
| receipt | JSONB C5 object; never raw conversation or model response |
| reason_code | bounded enum, nullable; no user free text |
| created_at / updated_at / verified_at | timestamptz; verified_at null unless verified |

Index `(actor_id,created_at DESC)`, `(target_user_id,created_at DESC)` and partial
reconciliation index on executing/committed_unverified/unknown. No tenant field is
invented: actor scope plus current access policies are the available boundary.
If a real tenant model exists at S0, explicitly revise schema and all predicates.

Create/claim intent with insert-on-conflict and request-hash check BEFORE effect.
Tie a write intent to exactly one proposal/approved domain operation. Approval
claims and the domain mutation must share a transaction where supported. Existing
daily-form writer owns its transaction; S4 adds a receipt hook inside that SAME
transaction or an explicit transaction parameter, never a nested independent commit.
Do not modify billing decisions, credit deduction, or body schema semantics.

## C5 Result receipt

`{schemaVersion:1,intentId,operationId?,proposalId?,state,commandType,targetUserId,
committedAt?,verifiedAt?,recordRefs:[{kind,id,version}],realAffectedCount:number|null,
reversibility,undoAvailable:boolean,reasonCode?,correlationId}`.
No names, transcripts, raw provider errors, parameters, or medical free text.
Expose through PROPOSED GET `/api/ai-command/intents/:intentId`, owner plus current
target-access check. List is GET `/api/ai-command/intents?cursor=...&limit=20`;
max limit 50, opaque cursor, same authorization filter before pagination.
Replay returns original semantic receipt; do not append a volatile replay counter
to its hashed body. Transport headers may mark replay independently.

## C6 Failure truth

| Event | State / UI / permitted next action |
|---|---|
| Browser accepted an event | drafted; “Draft updated”; never “Saved” |
| Domain transaction committed, read-back pending | committed_unverified; “Saved; checking result” |
| Authorized read-back matches expected IDs/versions | verified; “Saved and checked”; link to record |
| HTTP response lost / worker crash / 60s deadline | unknown; “Checking whether it saved”; query same intent |
| Known rollback before effects | failed; explicit retry creates new approval but retains intent/idempotency key |
| Expired approval with no execution claim | awaiting_approval; fresh preview and approval required |
| Duplicate approval consumed | look up linked intent; never presume failed or re-mint automatically |
| Read-back mismatches committed result | unknown + operator reconciliation; never overwrite record to match preview |

Never auto-convert unknown into failed on age alone. Reconciliation at 15s, 60s,
5m uses the same operation/record identity and read-only domain checks. After 5m,
show operator attention with correlation ID; do not replay the domain write.
Permission revoked during reconciliation yields minimal denied status, no old data.

## C7 Undo and multi-step actions

Undo is a NEW reviewed inverse/compensating command bound to original receipt and
current record version. Never delete history or silently roll back a conversation.
For initial workout vertical slice, undo is disabled unless the existing domain
supports a tested non-billing-changing inverse. “Re-book” is compensation, not exact
undo: slot availability and credits are revalidated. External sends cannot be unsent.

Multi-step plan stores stepId, dependency IDs, target, effect, approval ID and
receipt ID. Stop dependent steps on failed/unknown; display partial completion.
Approving workout logging does not authorize sending its celebration post.

## C8 Migration and rollback

Additive migration only after schema snapshot, foreign-key/type verification,
backup restore drill, isolated PostgreSQL integration, and Sean’s migration gate.
Do not cherry-pick coach_facts blindly: its separate branch and schema must be
reconciled. Keep intent registry and fact storage distinct from conversation JSON.
Roll back by disabling new intent entry and preserving result/reconcile reads.
No down-migration that drops executed receipts; no rollback that disables safety
while continuing writes. If the ledger is unavailable, new AI writes refuse.
