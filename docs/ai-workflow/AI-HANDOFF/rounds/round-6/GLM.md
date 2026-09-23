# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-6\REVIEW-DOC.md
**Tokens:** 8215 in / 12011 out (reasoning: 9442) | total 20226
**Wall:** 150.6s

---

# ROUND 6 — GLM 5.3 — Full-Spectrum Review (correctness / security / schema truth / AC1–AC8 line-by-line)

## 1. Position on the candidate

I adopt every substantive ruling in the candidate — F2, F3, F4, F5, F6, F13, N1, N2/N3, C6, the F7/F8/F9/F12 probe dispositions, the struck F10/F11, and the C7/C8 deferrals. I carry **one REJECT**: the candidate is **silent on the packet-mandated disposition of `APP-AI-HIVE-MIND.md`**, despite the packet's evidence table stating "The next blueprint must reconcile or explicitly retire this document." That omission is a build-contract break in the deliverable, not a style complaint — the doc is classified **active reference** and prescribes a *different routing topology* (free Gemini→Qwen→Gemini consensus) for exactly the domain lanes under review (workout generation, client review, progress analysis). A builder handed the current consensus gets no instruction on it and may implement a parallel brain the owner explicitly forbids ("specialist planning should be a capability, not a parallel authority"). One verified-correct item for the record: the mount order `/api/ai-chat/stream-spike` before `/api/ai-chat` (`routes.mjs` excerpt, first two `app.use` lines) is the *required* order for prefix collision and is correct as written — no defect there.

## 2. AC1–AC8 line-by-line traceability (my remit)

| AC | Constraint (packet, Non-negotiables) | Consensus coverage | Ruling |
|---|---|---|---|
| AC1 | Least-privilege on health/training/identity/history | F2 per-router entitlement probes (aiChatRoutes.mjs:283,466,610-625; aiCommandRoutes.mjs:110-145; coachIntakeRoutes.mjs:23-25; coachProposalRoutes.mjs:15-16; hermesRoutes.mjs:43,90,127,142; aiDebateRoutes.mjs:54) + F3 clientResolver.mjs:110-166 admin tenant check | **COVERED** — severity ceilings held open as residual (a) |
| AC2 | Wrong-client mutation: scope explicit, server-validated, observable, **recoverable** | Explicit+validated = F3; observable = F4 receipts; recoverable = **partial only** — F4's status enum terminates at applied/denied/cancelled/failed with no compensating-action linkage | **COVERED WITH RIDER → F17** |
| AC3 | Memory ≠ truth; receipts are truth | F4 provenance enum `chat\|command\|workout-bridge`; N1 (aiWorkoutEvents.ts:121-128 boolean never maps to success); C6 | **COVERED** |
| AC4 | No "saved" before authoritative write | F4 render-success-only-on-receipt + F13 try/catch + N2/N3 failure states (AITerminalPanel.tsx:116-139) | **COVERED** |
| AC5 | Entitlement enforced server-side, not by shell | F2 blocked-until-gated + F3 server-issued context token collapsing targetUserId (aiChatRoutes.mjs:308-344) / selectedClientId (aiCommandRoutes.mjs:111-145). Note `UniversalDashboardLayout.routes.tsx:98,177,203` mounts one component for three roles and role derivation lives in-page (`CoachCommandCenterPage.tsx:34-43`) — exactly the shell-inference pattern AC5 forbids; server probes are the only cure, and F2/F3 are it | **COVERED** |
| AC6 | Offline story; cloud not sole write path | C6 separate durable store; residual (b) honestly admits zero queue code exists | **COVERED WITH RIDER → F16** (key-space seam) |
| AC7 | React/TS, tokens, 44px, WCAG, mobile QA | C7 deferral to package items 5+8 | **AGREED** — packet contains zero styling excerpts; no citable defect is possible this round; verification matrix must carry the 44px/WCAG/mobile gates |
| AC8 | Ox Alpha receives only redacted packet | C8 trusted-not-verified | **AGREED** — no counter-evidence in packet |

## 3. New findings

**F14 = MAJOR — `docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` (as cited in packet's surface-classification table).** The doc is classified "active reference doc with runtime drift": it prescribes free Gemini/Qwen/Gemini consensus routing for workout generation, client review, and progress analysis, while the mounted runtime is six separate lanes (`routes.mjs:630-634`, intake/proposals at `:378-379`). The packet twice mandates a decision ("Decide whether it is active runtime truth, planned policy, stale documentation, or one internal capability"; "must reconcile or explicitly retire"). The consensus candidate contains no ruling — the unresolved-findings list already carries "consensus silent on mandated APP-AI-HIVE-MIND.md." **FIX — WHAT:** explicit disposition row in final package item 2. **WHERE:** consensus block + package item 2. **HOW:** classify **STALE-REFERENCE until probe proves otherwise**; add to F8's classification probe set a grep for any backend import/constant resolving hive-mind routing (gemini/qwen consensus selectors); gate the retire-vs-reconcile decision **before implementation slice 1** so no builder can treat the doc as active policy and fork a second planning brain.

**F15 = NOTE — anchor garbling inside the adopted F2 fix text.** The packet carries two line schemes for the same five mounts: excerpt header `routes.mjs:625-634` vs the evidence-gate refresh `routes.mjs:630-634` (which self-declares it "must govern the next panel run"). The candidate's F2 cites chat=`:626`, command=`:627` (excerpt-relative) alongside hermes=`:632`, debate=`:633` — and `:632` matches **neither** scheme (excerpt→628, refresh→633). **FIX:** normalize every F2 anchor to the refresh scheme — stream-spike=630, chat=631, command=632, hermes=633, debate=634, intake/proposals=378-379 — and record the fork in F12's excerpt reconciliation. Substance of F2 unchanged.

**F16 = MINOR — idempotency key-space seam between F4 and C6.** F4 mandates `UNIQUE(idempotency_key)` at storage for server actions; C6 mandates a *separate durable* offline store (residual (b): no queue code exists). Nothing in the candidate unifies them. If offline intents mint keys in a client-local space and the server contract honors a different space, reconnect replay can double-execute domain writes — violating AC6 duplicate-prevention and AC2 recoverability. **FIX — WHERE:** C6/N2 wording. **HOW:** offline queue entries MUST mint the same key format F4's storage-level UNIQUE constraint honors at replay; dedupe is enforced server-side at the constraint, never client-side.

**F17 = MINOR — AC2 "recoverable" is unauditable from the F4 receipt as written.** `AiCommandAuditLog.mjs:24-91` records outcome but no compensating linkage, and the candidate explicitly refuses to reuse it — yet the replacement contract (`{action_id, capability, client_id, actor, idempotency_key, provenance, status}`) also carries no `rollback_of`/`rolled_back_by`. Undo is mandated by packet Question 5 and the Jarvis behavior list, but with no receipt linkage, undo cannot be audited from receipts alone. **FIX — WHERE:** F4 contract. **HOW:** add nullable `rollback_of` (action_id of the action being compensated) and derive `rolled_back_by` on read; status machine unchanged.

## 4. Adopted unchanged (verification, not praise)

F3's call-site surgery is exact: delete `clientId || null` at `AITerminalPanel.tsx:119` and `:133`. F6 targets the real defect: `CoachCommandCenterPage.tsx:38-42` initializes `activeTab` once via `useState(() => coerceCoachTabForRole(initialTab, userRole))` — no re-coercion on `userRole`/`searchParams` change; the effect fix is correct. F13 wraps the two unwrapped `await sendMessageWithConversation(...)` calls at `AITerminalPanel.tsx:116-139`. Residual risks (a)–(g) all survive my full-spectrum re-scan; I add **(h) hive-mind disposition pending F14 probe**.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F14=MAJOR: APP-AI-HIVE-MIND.md L7-22: active-reference doc prescribes Gemini→Qwen→Gemini consensus for workout generation/client review/progress analysis, contradicting mounted lanes (routes.mjs L630-634, L378-379); consensus candidate carries no reconcile-or-retire ruling despite packet mandate (surface-classification row + "Documented architecture conflict") | F15=NOTE: routes.mjs excerpt L625-634 vs refresh L630-634: candidate F2 text mixes schemes — hermes cited as :632 matches neither scheme (excerpt→628, refresh→633); normalize all anchors to refresh scheme 630-634+378-379 | F16=MINOR: F4/C6 seam: offline queue replay keys never unified with F4 storage-level UNIQUE(idempotency_key); split key spaces allow duplicate domain writes on reconnect, violating AC6/AC2 | F17=MINOR: AiCommandAuditLog.mjs L24-91: outcome-only, no compensating linkage; F4 receipt contract lacks rollback_of/rolled_back_by so AC2 "recoverable" is unauditable from receipts
rebuttals: CONSENSUS-CANDIDATE=PARTIAL-REJECT: adopted in full EXCEPT silent omission of packet-mandated APP-AI-HIVE-MIND.md disposition (F14); rest verbatim | F2=AGREE (anchors normalized per F15) | F3=AGREE | F4=AGREE (extend per F17) | F5=AGREE | F6=AGREE | F13=AGREE | N1=AGREE | N2/N3=AGREE | C6=AGREE (extend per F16) | C7=AGREE | C8=AGREE | F10/F11-struck=AGREE
open: Q1=which routes.mjs anchor scheme is authoritative for final package — excerpt 625-scheme or refresh 630-634 (refresh self-declares governing; builder re-grep to close) | Q2=does any backend runtime path consult APP-AI-HIVE-MIND.md routing (grep imports/constants) — sets retire vs reconcile under F14 | Q3=does useAIChat already wrap sendMessageWithConversation in try/catch (carried residual g — bounds F13)
consensus_block: N/A this round — DISPUTE carried solely on F14 (mandated doc disposition omitted); amended block ready for round 7: candidate verbatim + F14 disposition (STALE until probed, gate before slice 1) + F15 anchor normalization to 630-634/378-379 + F16 key-space unification rider on C6 + F17 rollback-linkage rider on F4 + residual risk (h) hive-mind pending.
=== END-VERDICT ===
