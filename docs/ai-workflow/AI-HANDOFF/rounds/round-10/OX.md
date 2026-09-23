# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-10\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7312 in / 5043 out · **Cost:** ~$0.0000 · **Wall:** 186.0s · **finish:** stop

---

# Round 10 — Ox Alpha, fresh-eyes adversarial

Holding the remit: I attack the draft ruling itself for the defect class the nine prior rounds structurally missed. Three such classes exist. All are locatable.

## New findings

**R1 — The consensus's own receipt contract leaks cross-actor data via its idempotency design.**
The F4/C6 binding specifies `idempotency_key UNIQUE` and "duplicate key → read-back existing receipt flagged replayed=true, never re-execute." Nowhere is the uniqueness *scoped*. The packet's receipt-boundary section (`backend/models/AiCommandAuditLog.mjs:24-91`) establishes that no idempotency key exists today — the panel is designing this contract from zero, so the defect is in the ruling, not legacy code. A globally UNIQUE key minted client-side at enqueue (C6) means: any actor whose minted key collides (maliciously or via weak entropy) receives, as `replayed=true`, the *existing* receipt — which per F4 contains `server-resolved client_id`, `actor`, `capability`, `status`. That is a cross-actor/cross-client metadata disclosure sitting directly on top of constraint #2 ("wrong-client mutation is catastrophic" — wrong-client *read* of action truth is the same class). Fix: composite unique `(actor_id, idempotency_key)` or `(tenant_id, actor_id, idempotency_key)`; duplicate handling reads back only within the caller's own scope; foreign-scope collision returns a fresh key-rejection error, never another actor's receipt. Severity: MAJOR — the fix as written violates the packet's own tenancy contract.

**R2 — F3 is forward-only; legacy conversations keep poisoned `targetUserId` rows.**
F3 deletes client-supplied clientId args going forward (`AITerminalPanel.tsx:119,133`; collapse of `targetUserId` at `aiChatRoutes.mjs:308-344`, `selectedClientId` at `aiCommandRoutes.mjs:111-145`, debate `clientId` at `aiDebateRoutes.mjs:57-76`). But `backend/models/AiConversation.mjs:24-83` is declared the **authoritative model** and persistently stores `targetUserId`. Every conversation already created under the accept-client-supplied-ID regime at `aiChatRoutes.mjs:308-344` remains readable, resumable, and continuable after the fix — a trainer/admin opening history can land in a conversation whose stored `targetUserId` was spoofed or stale at creation time. The consensus contains no backfill, no validation sweep, no "legacy row quarantine" slice in package item 7. This is the classic forward-only-fix trap: the vulnerability survives the patch in the truth store. Fix: add a migration/probe slice — enumerate `AiConversation` rows where `targetUserId` is set, re-run `clientResolver.mjs:110-166` existence+tenant checks server-side, null out or flag failures, and gate conversation resume on passing that check. Severity: MAJOR (constraint #2, persistent across the fix).

**R3 — The `'both'` literal is undefined and falsifies the "all 8 constraints closed on paper" claim.**
`AITerminalPanel.tsx:116-139` passes the positional literal `'both'` into `sendMessageWithConversation(...)` in both branches. No packet document defines this parameter. N2/N3's ruling is "single explicit persistence mode + defined failure states," and the CONSTRAINT AUDIT declares all eight non-negotiables "closed on paper." These cannot both be true: if `'both'` denotes dual-write (e.g., local optimistic store + server conversation), then F13's try/catch around exactly this call (`AITerminalPanel.tsx:116-139`) has an undefined mid-failure state — local side written, server side thrown, UI told "failure" while a local artifact exists — precisely the misleading-state class constraint #4 forbids. The audit's closure claim is false until `'both'` is named, probed (`useAIChat.ts:217,425,448` call chain), and either eliminated or contracted. Severity: MINOR on the parameter, but it voids the audit's completeness claim — treat as must-resolve before build.

## Rebuttal against the consensus candidate

- **REJECT the clause "build probe confirms"** inside the F2 line-pinning (`routes.mjs:631-634`). The packet carries two conflicting maps — the mount-order excerpt labeled `:625-634` and the refresh table labeled `:630-634` — and the RUNNING STATE still lists `backend/core/routes.mjs L625-634 vs L630-634` as unresolved. No probe artifact exists anywhere in the packet. Asserting "probe confirms" converts an open risk (already logged as residual risk (i)) into a false closed claim, which rule 4 forbids. The middleware-per-router *design* stands; the line numbers must remain marked probe-required, not confirmed.
- AGREE: F4 CAS lane, F5 spike parity, F6 tab re-coercion, F14+C10 compound UPDATE direction, C6 separate-durable-store binding, MOUNT-ORDER RULING (narrow-first is correct given router-level middleware at `aiChatRoutes.mjs:283/:466` would intercept fall-through spike traffic), F10/F11 strike, C11 retirement disposition.

## Residual additions to the risk register

(j) R1 idempotency scope must be settled before any queue code is written — it changes the receipt schema; (k) R2 backfill slice must enter package item 7 ordering before the F3 slice ships, else the fix window is a live exposure; (l) `'both'` semantics probe added to package item 8 alongside the F13 wrapper test.

=== VERDICT ===
status: DISPUTE
confidence: 86
findings: R1=MAJOR: consensus F4/C6 receipt spec anchored to Packet "Receipt and idempotency boundary" §AiCommandAuditLog.mjs:24-91: globally UNIQUE idempotency_key enables cross-actor read-back of receipts containing server-resolved client_id/actor — must be composite-unique per (actor, capability) or (tenant, actor, key) | R2=MAJOR: backend/models/AiConversation.mjs:24-83 + backend/routes/aiChatRoutes.mjs:308-344: F3 is forward-only; historical conversations persist client-supplied targetUserId with no backfill/re-validation/quarantine slice — wrong-client history access survives the fix | R3=MINOR: AITerminalPanel.tsx:116-139: undefined 'both' positional arg contradicts N2/N3 single-persistence-mode ruling; CONSTRAINT AUDIT "all 8 closed on paper" is false until 'both' is probed and contracted
rebuttals: F2-linepin=REJECT: "build probe confirms" is unevidenced — packet carries two conflicting maps (excerpt :625-634 vs refresh :630-634) and RUNNING STATE still lists the discrepancy unresolved; line pins stay probe-required | R1=AGREE-self | R2=AGREE-self | R3=AGREE-self
open: Q1=idempotency uniqueness scope (composite key columns) must be ruled before receipt schema freezes | Q2=which seat owns the legacy targetUserId backfill slice and its package-item-7 position relative to F3 | Q3=does 'both' denote dual persistence, and if so is it deleted or contracted with defined mid-failure states
=== END-VERDICT ===
