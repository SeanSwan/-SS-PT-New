# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5137 in / 4313 out · **Cost:** ~$0.0000 · **Wall:** 237.4s · **finish:** stop

---

# ROUND 6 — OX ALPHA (fresh-eyes adversarial)

## Stance application

Five rounds of findings cluster on two defect classes: **client-to-server trust smuggling** (AITerminalPanel requestContext/clientId) and **UI honesty about writes** (aiWorkoutEvents receipts). Both classes inspect *what leaves the client*. The structurally missed class is **what happens when the same intent arrives twice** — the replay/dedup seam — plus a **fail-open coercion** hiding inside a line every other seat has cited but read only for its context-smuggling property.

## New findings

**N5 (MAJOR) — No idempotency/correlation-key contract anywhere in the dispatch seam.**
Evidence: `aiWorkoutEvents.ts:121-128` — `dispatchAIWorkoutEvent(eventName: string, payload: unknown): boolean`. The contract passes opaque `payload`, returns only a handled/not-handled boolean, and defines no correlation ID, idempotency key, or dedup token in either direction. Constraint 6 explicitly requires "idempotency, duplicate prevention" for the offline/degraded story, and the consensus (residual b, F4) commits to rendering these events as *queued intents* that later reconcile against server receipts. A queued-intent architecture that replays dispatches over a bridge with no idempotency key produces duplicate workout writes on every retry/reconcile cycle — corrupting exactly the health/training records constraint 1 declares least-privilege-critical. N1's schema-validation gates *what* payloads are shaped like; it does not supply *dedup identity*. Fix: extend the N1 registry contract at `aiWorkoutEvents.ts:121-128` to require `{ idempotencyKey, issuedAt, principalScope }` in every payload, echo the key in the return value, and make the future receipt layer (F4) reject any write whose key was already settled. Acceptance criterion: replaying the same dispatched event twice yields one server write and one duplicate-suppressed receipt.

**N6 (MAJOR) — `clientId || null` is a fail-open scope erasure, distinct from F3.**
Evidence: `AITerminalPanel.tsx:119` and `:133` — both call sites coerce `clientId || null`. An empty-string or otherwise-falsy clientId (stale selection, wiped state, race with client switch) is silently converted to "no scope" and the send proceeds anyway. F3 correctly demands a server-resolved permitted clientId set, but F3 governs *validation of a presented scope*; N6 is the *presentation* defect: the panel cannot distinguish "user chose no client" from "the chosen client vanished," and it sends regardless. In a trainer session mid-client-context, that message lands ungrounded, and per packet Question 4 (pronoun/stale-tab grounding) the server's fallback anchoring is unspecified — the exact wrong-client precondition constraint 2 calls catastrophic. Fix: at `AITerminalPanel.tsx:119,133`, replace the coalescence with an explicit tri-state (no-selection | selected | invalid); invalid blocks the send and surfaces a defined failure state (this folds directly into N3's mandated failure states); no-selection is permitted only for answer-only capability classes per the action-class taxonomy (Question 5). Acceptance criterion: a falsied clientId can never reach `sendMessageWithConversation` as a silent null in a mutation-capable context.

**N7 (MINOR) — Default-deny is unevidenced in the role normalization entry point.**
Evidence: `CoachCommandCenterPage.tsx:35` — `normalizeCoachCommandRole(authUser?.role)`. The packet never excerpts this function. If its fallback for `undefined`/unknown roles resolves to anything above the least-privileged tier, every downstream role gate in the shell (`isClientMode`, tab limiting at :38-42) inherits the fail-open. Constraint 5 says entitlements are server-enforced, so this is defense-in-depth, not a bypass — hence MINOR. Fix: add to the final package probe list (item 2, alongside F8's inventory): excerpt `normalizeCoachCommandRole` and assert undefined/unknown → least-privilege tier, with a unit test pinning it.

## Consensus disposition

I adopt the running consensus verbatim. Point-by-point: F1 (frame/seeder mismatch — my own remit says "seeder code packet" while the packet is a chat-panel review; the contradiction is live), F2-F5, F6 (`CoachCommandCenterPage.tsx:38-42` sits inside the excerpted 34-43 block, locatable), F7 (`routes.mjs:629-630` show `/api/hermes` and `/api/ai/debate` mounted but absent from the AI-path evidence table), F8, F9, F12, N1-N4 — all evidence-backed, no rejects. Residual risk (e) is correct and N5 sharpens it: the bus is not only an unauthenticated capability surface, it is an *unkeyed* one.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: N5=MAJOR: aiWorkoutEvents.ts L121-128: no idempotency/correlation-key in dispatch contract; queued-intent replay (per F4/residual-b) will double-write workout records, violating constraint 6 duplicate-prevention | N6=MAJOR: AITerminalPanel.tsx L119,L133: clientId||null silently erases lost client scope and proceeds to send — fail-open grounding loss, distinct from F3 server-side validation | N7=MINOR: CoachCommandCenterPage.tsx L35: normalizeCoachCommandRole fallback for undefined role unexcerpted; default-deny unevidenced, shell gates inherit any fail-open
rebuttals: F1=AGREE: my own remit names a seeder packet; frame contradiction confirmed | F3=AGREE: server-resolved clientId set necessary but insufficient without N6 presentation fix | N1=AGREE: schema gate complements but does not replace N5 dedup identity
open: Q1=does the idempotency key originate at the dispatcher (aiWorkoutEvents.ts) or at the receipt layer — seats must pick one owner before round 9 blueprint | Q2=should falsied clientId block the send outright or downgrade to answer-only capability class
consensus_block: PROPOSED RULING: adopt full round-5 consensus unchanged; append N5 to TO FIX BEFORE BUILD as part of the N1 registry contract (require {idempotencyKey, issuedAt, principalScope} in every aiWorkoutEvents.ts:121-128 payload, echo key in return, F4 receipt layer rejects already-settled keys); append N6 to the N2/N3 unification work at AITerminalPanel.tsx:119,133 (tri-state clientId, invalid blocks send with defined failure state, no-selection restricted to answer-only classes); append N7 to the final package item 2 probe list (excerpt normalizeCoachCommandRole, assert least-privilege fallback with pinned unit test). ACCEPTED AS INTENTIONAL: unchanged from round-5 ruling. RESIDUAL RISKS: round-5 (a)-(e) stand; NEW (f) until N5 lands, any offline-reconcile design built on the current dispatch seam bakes in duplicate-write corruption that no receipt contract retroactively removes.
=== END-VERDICT ===
