# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-9\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7486 in / 7769 out · **Cost:** ~$0.0614 · **Wall:** 157.4s · **finish:** stop

---

Round 9 attack is on **data-truth and CI integrity**, not UX. The candidate is mostly right on F2–F6/F13/F14/N1. It is **not** adoptable verbatim: it leaves constraint #6 unbound to the only receipt key the panel has specified, and it freezes **false line numbers** into the probe list.

**F15 MAJOR — C6 is a negative constraint with no apply-once key.** Constraint #6 requires gym-floor logging without a cloud round-trip. C6 correctly forbids `AiConversation.messages/status` (`AiConversation.mjs:24-83`) as that store. F4 correctly demands `UNIQUE(idempotency_key)` + CAS `draft→pending_confirm→applied|denied|cancelled|failed` and forbids reuse of `AiCommandAuditLog.mjs:24-91` (no `action_id`, no unique key; evidence-gate receipt section). Residual (b) then admits the packet contains **zero** queue and **zero** idempotency schema. Those three statements together are a double-apply contract: an offline reconcile that cannot collide on F4’s key will re-dispatch the same workout fact. Constraint #4 (no success before verified write) and constraint #2 (wrong/duplicate client mutation) fail on replay, not only on first write. `dispatchAIWorkoutEvent` (`aiWorkoutEvents.ts:121-128`) remaining a boolean makes the false-success path worse if the logger treats a second dispatch as a second save.

Fix: queue rows are a **separate** durable store whose primary key **is** F4 `idempotency_key`. Reconcile is INSERT-or-CAS on that key; collision ⇒ `duplicate`, never a second domain apply. Schema `{idempotency_key, capability, server-resolved client_id, payload_hash, queued_at, status: queued|syncing|applied|failed|duplicate}`. UI may show `queued`/`syncing`; it may not show saved until F4 `applied`.

**F2 REJECT (lines only).** Appendix prints the five mounts at `routes.mjs:625-634`. Evidence-gate reprints the same five at `:630-634` and now locates intake/proposals at `:378-379` (`coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16`). Candidate F2 still cites `:625/:626/:627/:632/:633` and calls intake/proposals “unexcerpted”. Path list + BLOCK-until-gated stays. Line numbers are not a verified probe contract; a green check on the wrong line is a false-success.

**F14 AGREE, residual (f) REJECT.** `AiConversation.mjs:24-83` has `messages` and no `version`. OCC belongs on **memory**. Constraint #3 still says memory is not domain truth. “now addressed by F14” is false-success language for write races, offline replay, and receipt CAS. F14 also needs migrate→backfill→enforce (`version` nullable/default → backfill `1` → NOT NULL + conditional update). Packet has no migration; dual-writers in the window re-open lost updates.

Adopt the rest verbatim: F3 server-resolved `client_id` (delete `AITerminalPanel.tsx:119,133` caller `clientId`; collapse `aiChatRoutes.mjs:308-344` / `aiCommandRoutes.mjs:111-145`; `clientResolver.mjs:110-166` existence+tenant, not role-only); F4 receipt + CAS; F5 spike kill-switch; F6 tab re-coerce; F13 try/catch; F7–F9/F12 probes; N1 dispatcher gate; N2/N3 one persistence mode; F10/F11 struck; C7/C8 as written.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F15=MAJOR: constraint#6 + AiConversation.mjs:24-83 + AiCommandAuditLog.mjs:24-91 + aiWorkoutEvents.ts:121-128: C6 queue has no F4 UNIQUE(idempotency_key)/CAS bind; reconcile replays double-apply workout facts | F16=MINOR: routes.mjs appendix:625-634 vs refresh:630-634 vs F2:625/626/627/632/633: line-cite drift; intake/proposals are routes.mjs:378-379 not unexcerpted | F17=MINOR: AiConversation.mjs:24-83 F14 version column has no migrate→backfill→enforce path in packet; dual-write window reopens lost updates
rebuttals: F2=REJECT: keep path list + BLOCK-until-gated; reject frozen lines and 'unexcerpted' (refresh :378-379, :630-634) | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F13=AGREE | F14=AGREE: memory OCC only | C6=REJECT: 'never AiConversation' without F4 key is an unbound apply path | F7/F8/F9/F12=AGREE | N1=AGREE | N2/N3=AGREE | F10/F11=AGREE struck | residual(f)=REJECT: 'addressed by F14' is false-success vs constraint#3
open: Q1=other seats must accept F15 as must-fix-before-build, not residual(b) | Q2=canonical cite rule = path-primary; which line table is advisory | Q3=F14 migration slice order before any dual-writer
consensus_block: ADOPT CANDIDATE except: (1) F15 MUST-FIX — offline queue is a separate store (not AiConversation.mjs:24-83, not AiCommandAuditLog.mjs:24-91) whose idempotency_key IS F4 UNIQUE; reconcile = INSERT-or-CAS draft→pending_confirm→applied|denied|cancelled|failed|duplicate; collision does not re-apply; UI success only on F4 applied, never dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) or conversation persist. (2) F2 probes by path: /api/ai-chat, /api/ai-command, /api/coach/intake (routes.mjs:378), /api/coach/proposals (:379), /api/ai-chat/stream-spike, /api/hermes, /api/ai/debate; BLOCK writes until gated; lines advisory. (3) F14 OCC on AiConversation memory only + migrate nullable/default version → backfill 1 → NOT NULL/conditional update. Keep F3/F4/F5/F6/F13/N1/N2/N3/C6-negative/F7-F9/F12 and struck F10/F11. Residuals: (a)(c)(d)(e)(g) unchanged; (b) replaced by F15; (f) F14 does not close domain/offline races.
=== END-VERDICT ===
