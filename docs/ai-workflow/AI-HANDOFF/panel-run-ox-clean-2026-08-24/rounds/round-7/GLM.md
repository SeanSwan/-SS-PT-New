# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-7\REVIEW-DOC.md
**Tokens:** 6009 in / 12501 out (reasoning: 9052) | total 18510
**Wall:** 160.1s

---

# ROUND 7 — GLM 5.3 (Full-spectrum: correctness, security, schema truth, 8 acceptance criteria)

**Remit mapping, stated plainly:** the packet's only set of exactly 8 testable acceptance bars is the "Non-negotiable constraints" list. I review them as **C1–C8** line by line below. If another seat maps "8 criteria" elsewhere, that is a frame correction, not a content one — my findings stand on packet evidence regardless.

---

## 1. Adoption ledger — consensus candidate

| Item | Ruling | Evidence check |
|---|---|---|
| F1 (idempotency column, AiCommandAuditLog L24-91) | **ADOPT column fix; REJECT one clause** | Packet confirms "no `action_id` or unique idempotency key" at L24-91. But the fix text `commandIdemKey UUID UNIQUE column` specifies a **single-column global UNIQUE**, and "reject duplicates with the original receipt" is **unqualified**. Two defects in the fix itself: (a) global uniqueness lets any authenticated actor replay another actor's key and receive that actor's original receipt — the receipt contains resolved target client, operation ID, outcome (packet field list, L24-91) — an authorization leak plus key-squatting DoS; (b) returning the original receipt on *any* duplicate makes a terminally FAILED key permanently unretryable, which deadlocks the offline queue/reconcile that constraint 6 mandates. Correct fix: `UNIQUE(actor_id, command_idem_key)`; INSERT a PENDING row **before** execution (atomic claim — otherwise two concurrent POSTs both execute and the unique constraint fires only post-write, i.e., double mutation); on key hit, compare stored parameter hash — match + terminal outcome → replay that receipt; match + PENDING → in-progress receipt; **hash mismatch → 409 + security event, never the original receipt**. |
| F2 (buildChatParams, AITerminalPanel.tsx L124-133) | **ADOPT, amend criterion wording** | Excerpt L116-139 shows the drift: enriched branch passes `(text, context, label, clientId, 'both', null, requestContext)`; default branch passes only 4 args, so visibility/messageId fall to unverifiable hook defaults. Criterion (2) "send identical context/mode" is wrong as written — the branches must NOT be identical (requestContext exists in one). Reword: "both branches send identical context, label, clientId, and explicit visibility `'both'`; requestContext present only in the enriched branch; no positional args after refactor." |
| F3 (APP-AI-HIVE-MIND.md L7-22 → DORMANT) | **ADOPT** | Matches the classification table ("active reference doc with runtime drift") and clears the thrice-repeated unresolved finding in running state. DORMANT + removal from active architecture index (criterion 3) is the right disposition; the doc's Gemini/Qwen consensus is one possible internal capability, not runtime truth. |
| F4 (mount range L630-634) | **ADOPT** | Five `app.use` lines = five mounts; L630-634 is self-consistent, L625-634 was the wider window. Trivial. |
| F5 (admin client-scope validation) | **ADOPT intent; REJECT the blanket rule** | "Reject **any** command without a validated target client" is contradicted by the packet's own probe row: "server entitlement behavior for **every command family** is not yet proven." Actor-scoped commands (admin intake-queue reads, operator tasks) would falsely 4xx. Replace with capability-registry enforcement: each command family declares `client_scoped: true|false`; `clientResolver.mjs:110-166` + `commandExecutor.mjs:309-343` enforce validated target **iff** `client_scoped`. Keep criterion (4) and add: denial must still write an audit row (schema already has outcome/error code) — a denied attempt with a fresh idem key must not be blocked by F1's claim mechanics. |

---

## 2. The 8 acceptance criteria, line by line

| # | Constraint | Packet evidence | Candidate coverage | Verdict |
|---|---|---|---|---|
| C1 | Least-privilege for health/training/identity | `aiChatRoutes.mjs:610-625` trainer gate; `aiDebateRoutes.mjs:57-76` "direct clientId path needs an explicit access probe" | F5 partial; **no criterion for the debate-lane cross-client probe the packet itself demands** | GAP → F7 |
| C2 | Wrong-client mutation catastrophic | Probe table: "confirm … a denied operation cannot mint a success receipt" | F5 partial; **that exact sentence appears nowhere in the candidate's criteria** | GAP → F7 |
| C3 | Receipts are truth, not conversation | `AiCommandAuditLog.mjs:24-91` (no key); `AiConversation.mjs:24-83` | F1 covers command receipts; nothing binds chat-side claims to receipt provenance | Partial → F7 |
| C4 | UI must not claim saved before write | `aiWorkoutEvents.ts:121-128`: returns **only a dispatcher boolean**; packet: "panel must not infer a committed workout write from this acknowledgement" | **Nothing in F1–F5 touches the workout bridge.** Residual risks mention it only vaguely | **GAP → F6 (new MAJOR)** |
| C5 | Server-enforced role boundaries | Middleware present on all lanes; per-family behavior unproven | F5 (amended to registry) | Covered after amendment |
| C6 | Offline/degraded story | Constraint text; residual-risk mention only | **No acceptance criterion at all** — offline replay idempotency is exactly where F1's failed-key poison bites | GAP → F7 + F1 amendment |
| C7 | 44px, WCAG, dark tokens, dual QA | Owner constraints; wireframes required in final package | **No criterion** | GAP → F7 |
| C8 | Ox Alpha receives only redacted packet | Process boundary | N/A to code; NOTE: blueprint must include a redaction gate before any packet expansion | NOTE |

**The candidate's acceptance suite has 4 criteria for an 8-criterion contract. That is a specification defect in the ruling itself, and C4 is the worst hole because the packet hands us the exact hazard and the candidate skips it.**

---

## 3. New findings

**F6 = MAJOR — Workout bridge has no receipt gate (violates C4).**
WHERE: `frontend/src/utils/aiWorkoutEvents.ts:121-128` (boolean return), consuming surface per packet's "Workout Logger terminal bridge" row.
WHAT: `dispatchAIWorkoutEvent` true is a browser-dispatch acknowledgement. No F1–F5 fix constrains any UI to withhold "saved/logged" until a server receipt exists. Any panel state keyed on that boolean violates C4 today by construction, since the packet proves no receipt contract exists on this path.
HOW: route every logger-bridge outcome through the existing command lane (`useCoachCommand.ts:96,170,207` → `/api/ai-command/execute|confirm|cancel`) carrying the F1 idem key; render dispatcher-ack-only as an explicit "queued locally — not saved" state with the C7 token set.
ACCEPT: integration test — `dispatchAIWorkoutEvent` returns `true`, no server receipt → UI renders pending/queued copy, never "saved"; with receipt → saved state shows receipt ID.

**F7 = MAJOR — Acceptance suite incomplete vs C1, C2, C4, C6, C7.**
WHERE: consensus candidate "Acceptance criteria (1)–(4)".
HOW — add criteria, each with a named probe:
(5) Cross-client matrix by role across **all five lanes** (chat `:610-625`, command, intake `:23-25`, proposals `:15-16`, **debate `:57-76` direct-clientId path**): trainer→other-client start/write = 4xx + audit row.
(6) A denied operation **cannot mint a success receipt** (packet's own probe wording) — denied paths must leave outcome=denied audit rows only.
(7) Offline replay: queued intent with one idem key, replayed N times after reconnect, produces exactly one applied row; retry after terminal failure with rotated key executes exactly once.
(8) UI "saved" copy appears only in receipt-verified states (subsumes F6 test).
(9) Canonical `CoachCommandCenterPage` passes automated 44px-target and WCAG-AA contrast gates on desktop+mobile profiles per slice.

**F8 = MINOR — No canonical cross-lane client identity key (schema truth).**
WHERE: `AiConversation.mjs:24-83` (`targetUserId`) vs `aiCommandRoutes.mjs:111-145` (`selectedClientId`) vs `aiDebateRoutes.mjs:57-76` (`clientId`).
WHAT: three lanes, three client identifiers, no packet evidence of a join. Audit attribution and context continuity across chat→command→debate cannot be reconstructed reliably.
HOW: blueprint defines one `ClientRef` (id + display + scope token) used by all lanes and by `AiCommandAuditLog`'s resolved-target column; migration slice adds the view/join and deprecates bare fields.

**F9 = MINOR — F1 fix mechanics underspecified.**
WHERE: candidate F1 text; `AiCommandAuditLog.mjs:24-91`.
WHAT/HOW: as detailed in the adoption ledger — `(actor_id, command_idem_key)` composite unique; claim-before-execute PENDING insert; parameter-hash equality on key hit with 409 on mismatch; defined pending/success/failure key lifecycle. Without this, criterion (1) as written **passes** while poisoning retries and enabling cross-actor receipt reads.

**F10 = NOTE — SwanCoachAssistantPage retirement undecided.**
The candidate is silent on the packet's explicit "blueprint must decide migration/retirement" for a page still referenced by its own tests. Slice plan must include test-suite handling or the build breaks on deletion.

---

## 4. Open questions for other seats

Q1: Replace F5's blanket "any command" with registry `client_scoped` enforcement — yes/no?
Q2: Adopt the split idempotency criteria (success/pending/failure/replay) in place of monolithic criterion (1)?
Q3: Who owns the debate (`:57-76`) and Hermes lane probes in the slice order — security slice or lane-classification slice?
Q4: Confirm no runtime consumer parses APP-AI-HIVE-MIND.md before DORMANT marking (else F3 needs a code probe, not just doc governance).
Q5: SwanCoachAssistantPage — retire-with-test-plan or compat-mount in slice 1?

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no unique idempotency key (adopt column fix, mechanics amended per F9) | F2=MINOR: frontend/src/components/DashBoard/AITerminalPanel.tsx L124-133: divergent sendMessageWithConversation call shapes (adopt helper-object fix) | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: active doc with runtime drift (adopt DORMANT + index removal) | F4=NOTE: backend/core/routes.mjs L630-634: authoritative mount range (adopt) | F5=MAJOR: backend/routes/../clientResolver.mjs L110-166: admins scoped by role only (adopt via capability-registry client_scoped flag) | F6=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: dispatcher boolean has no receipt gate; UI can claim saved pre-write, violating constraint 4; gate on /api/ai-command receipts via useCoachCommand.ts L96,170,207 | F7=MAJOR: consensus acceptance criteria (1)-(4): suite omits tests for constraints C1,C2,C4,C6,C7 incl. debate-lane cross-client probe and denied-op-cannot-mint-receipt | F8=MINOR: AiConversation.mjs L24-83 targetUserId vs selectedClientId vs aiDebateRoutes.mjs L57-76 clientId: no canonical cross-lane client key for audit joins | F9=MINOR: F1 fix mechanics: require UNIQUE(actor_id,key), claim-before-execute PENDING insert, param-hash equality with 409 on mismatch, failure-key retry lifecycle | F10=NOTE: SwanCoachAssistantPage retirement undecided; still referenced by own tests, deletion without test-plan slice breaks build
rebuttals: F1=REJECT clause: 'commandIdemKey UUID UNIQUE column' as single-column global unique + unqualified 'reject duplicates with original receipt' enables cross-actor receipt reads and permanently poisons failed keys against constraint-6 retries; keep column, apply F9 mechanics | F2=AGREE: reword criterion (2) to 'identical context/label/clientId/explicit visibility both branches; requestContext only in enriched branch' | F3=AGREE | F4=AGREE | F5=REJECT blanket rule: 'reject ANY command without validated target client' contradicts packet probe row 'entitlement for every command family not yet proven'; actor-scoped admin commands would falsely 4xx; enforce per capability registry client_scoped flag, denial writes audit row | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE
open: Q1=adopt registry-driven client_scoped check replacing blanket F5? | Q2=adopt split idempotency criteria (success/pending/failure/replay) replacing monolithic criterion (1)? | Q3=which slice owns debate (aiDebateRoutes.mjs L57-76) and hermes lane probes? | Q4=confirm no runtime consumer parses APP-AI-HIVE-MIND.md before DORMANT marking? | Q5=SwanCoachAssistantPage retire-with-test-plan or compat-mount in slice 1?
consensus_block: Amended ruling for round 8 adoption: KEEP F1 column fix with F9 mechanics — UNIQUE(actor_id, command_idem_key), PENDING row inserted before execution as atomic claim, duplicate hit compares parameter hash (match+terminal=replay receipt, match+PENDING=in-progress, mismatch=409+security event), failed keys retryable via rotated key. KEEP F2 with reworded criterion: both AITerminalPanel.tsx L124-133 branches send identical context/label/clientId/explicit 'both' via buildChatParams; requestContext only in enriched branch. KEEP F3 DORMANT + removal from active architecture index. KEEP F4 L630-634. REPLACE F5 blanket rule with capability-registry client_scoped enforcement in clientResolver.mjs L110-166 and commandExecutor.mjs L309-343; denials write outcome=denied audit rows. ADD F6 workout-bridge receipt gate (aiWorkoutEvents.ts L121-128 outcomes rendered 'queued locally' until /api/ai-command receipt). ADD F7 criteria (5)-(9): five-lane cross-client matrix incl. debate direct-clientId path; denied-op-cannot-mint-success-receipt; offline replay exactly-once with key rotation after failure; saved-copy only on receipt; 44px/WCAG-AA automated gates on CoachCommandCenterPage per slice. ADD F8 canonical ClientRef across AiConversation.targetUserId/command selectedClientId/debate clientId. Residual risks: panel action/receipt lifecycle and offline reconciliation design; retry/queue audit for idem keys; explicit typing of useAIChat signature; hermes+debate lane classification; SwanCoachAssistantPage retirement slice with test-plan.
=== END-VERDICT ===
