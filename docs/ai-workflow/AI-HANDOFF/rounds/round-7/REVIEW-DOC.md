# DEBATE ROUND 7 / up to 10

(The per-seat remit + stance were delivered alongside this document. The shared rules, running state, and code packet are below.)

You are ONE seat in a MULTI-ROUND HOSTILE DEBATE (round 7 of up to 10) over the packaged SS-PT subject titled "Swan Coach Unified Brain — Panel Debate Packet" below. Your seat stance is stated in the remit above the document; hold THAT lens, do not drift to the other seats'.

RULES OF THIS DEBATE (binding):
1. Every finding needs file + line (or workflow step) evidence FROM THE PACKET. Unlocatable claims will be cut by other seats — make yours locatable.
2. A finding = CLAIM about a defect in the packaged code, severity MAJOR (breaks a correctness/safety/build contract) | MINOR | NOTE.
3. Round 2+: the RUNNING CONSENSUS is quoted. CONSENSUS = you adopt it verbatim except items you REJECT with evidence. DISPUTE = you carry at least one REJECT or a new MAJOR.
4. No hedging. No "should be fine" without a named verified path in the packet. Vague praise is discarded.
5. Builder claims in the packet header are TESTABLE assertions — if the code contradicts one, the contradiction is a finding; cite both sides.
6. Endorse the fixes the way an engineer applies them: WHAT, WHERE (file:line), HOW — no re-derivation needed.

END EVERY REPLY with EXACTLY this verdict block (the orchestrator parses it strictly; keep key lines on one line each, items separated by |):
=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: file.js L123: claim text | F2=MINOR: file.yml step-7: claim text
rebuttals: F1=REJECT: why the evidence is wrong | F3=AGREE          (round 1 may be: rebuttals: (none))
open: Q1=what other seats must decide
consensus_block: REQUIRED when status is CONSENSUS — the complete ruling: findings to fix with exact fixes, findings accepted as intentional, and residual risks. May be multi-line.
=== END-VERDICT ===

## RUNNING STATE (rounds answered: 6)
Unresolved findings: (none)

## CONSENSUS CANDIDATE — adopt it or REJECT parts with evidence

```
ADOPTED VERBATIM with one new MAJOR (F13). FIXES: F2 — probe entitlement middleware per enumerated router: /api/ai-chat (routes.mjs:626), /api/ai-command (:627), /api/coach/intake + /api/coach/proposals (mounts unexcerpted), plus /api/ai-chat/stream-spike (:625 with F5), /api/hermes (:632), /api/ai/debate (:633); any router failing probe is BLOCKED from write capability until gated. F3 — replace caller-supplied clientId (AITerminalPanel.tsx:119,133) with server-resolved permitted-clientId set; receipts bind server-resolved client_id, never client-claimed; probe no memory→domain write cycle. HOW: delete clientId argument from sendMessageWithConversation call sites at AITerminalPanel.tsx:119 and :133; collapse targetUserId (aiChatRoutes.mjs:308-344) and selectedClientId (aiCommandRoutes.mjs:111-145) into one server-issued context token; clientResolver.mjs:110-166 must existence+tenant check admins, not role-only. F4 — receipt contract {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE at storage (probe — packet has zero schema), provenance chat|command|workout-bridge, status enum}; AITerminalPanel renders success only on receipt; dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) never maps to success. HOW: add UNIQUE(idempotency_key) and CAS status machine draft→pending_confirm→applied|denied|cancelled|failed so execute/confirm/cancel cannot both succeed; do not reuse AiCommandAuditLog.mjs:24-91 as that contract. F5 — probe spike-lane auth parity; feature flag + kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F13 — wrap sendMessageWithConversation calls in AITerminalPanel.tsx:116-139 with try/catch; surface failure state per N2/N3. F7/F8/F9/F12 — probes + excerpts into final package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage. N1 — capability-token gate + payload schema validation + provenance audit + result enum on dispatcher registry (absorbs N4). N2/N3 — single explicit persistence mode in AITerminalPanel.tsx:116-139; defined failure states (now includes F13 error handling). C6 — offline queue is a separate durable store, never AiConversation.messages/status (AiConversation.mjs:24-83). ACCEPTED AS INTENTIONAL: evidence-boundary admissions behind F7/F8/F9 with probe list entering package item 2; F10/F11 STRUCK; C8 redaction trusted not verified; C7 consistency (all excerpts TS/TSX) with a11y/44px/mobile proof deferred to blueprint items 5+8 (no citable code defect). RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design — no queue/idempotency code exists in packet; (c) C8 redaction unverified; (d) F1 artifact identity — if the seeder packet was the true subject, every finding here is void; (e) until N1 lands, the client event bus remains an unauthenticated in-page capability surface; (f) AiConversation embedded messages + no version (AiConversation.mjs:24-83) is an unproven lost-update race pending write-SQL excerpt; (g) F13 error-handling gap may be partially mitigated if useAIChat already wraps the call — probe required.
```

# THE PACKAGED CODE UNDER REVIEW
# Swan Coach Unified Brain — Panel Debate Packet

## Review status

This is a sanitized hostile-review packet. It contains no credentials, client names, customer records, transcripts, cookies, database URLs, or production logs. The panel's blueprint will be the builder's design authority for the next implementation proposal; it does not itself authorize production writes, migrations, deployment, or feature enablement.

**Roster:** GLM 5.3, Grok 4.6, DeepSeek V4 Pro, and Ox Alpha.

**Process:** Up to ten rounds. Preserve evidence-backed dissent; never manufacture consensus.

## Owner's desired outcome

Swan Coach should become a trustworthy, Jarvis-like operating brain across admin, trainer, client, and user dashboards. It must provide role-appropriate interfaces while sharing coherent domain truth, conversation continuity, action semantics, safety, and UX quality.

The requested result is not cosmetic sameness or a generic chat widget. Deliver an implementation-ready blueprint: target architecture, workflow contracts, role wireframes, Mermaid diagrams, phased build plan, and testable acceptance criteria. The subsequent builder implements this panel plan rather than substituting an alternate product direction.

## Non-negotiable constraints

1. SwanStudios is a production personal-training SaaS. Health, training, identity, and workout history require least-privilege access.
2. Wrong-client mutation is catastrophic. Client scope must be explicit, server-validated, observable, and recoverable.
3. Conversation and AI memory are not domain truth. Verified server state and durable action receipts are truth.
4. The UI cannot say an action is saved before an authoritative write and verification justify that state.
5. Role/entitlement boundaries are enforced on the server, not inferred from a dashboard shell.
6. Preserve a degraded/offline story for active gym-floor workflow. A cloud round-trip cannot be the sole way to log core workout facts.
7. Existing implementation standards: React/TypeScript, styled-components, dark-first tokenized design, 44px controls, WCAG contrast, and desktop/mobile QA.
8. Ox Alpha retains submitted prompts; it receives only this canary-redacted packet.

## Canonical route evidence

The canonical Coach surface is `CoachCommandCenterPage`:

| Role | Canonical route | Mount evidence |
|---|---|---|
| Admin | `/dashboard/admin/coach-assistant` | `UniversalDashboardLayout.routes.tsx:98` maps `/coach-assistant` to `CoachCommandCenterPage`. |
| Trainer | `/dashboard/trainer/coach-assistant` | `UniversalDashboardLayout.routes.tsx:177` maps the same path to the same component. |
| Client/user self-service | `/dashboard/client/coach-assistant` | `UniversalDashboardLayout.routes.tsx:203` maps the same path to the same component. |

`CoachCommandCenterPage` is role-aware: it reads authenticated role, treats client mode separately, limits tabs by role, routes into workout logger/planner context, and represents itself as a talk-first review/history/tools shell with review-gated writes.

A `SwanCoachAssistantPage` remains in the codebase. Current route-mount locks say `/coach-assistant` mounts `CoachCommandCenterPage`, not this older page. Treat it as a migration/compatibility risk that needs classification, not proof of current runtime.

## Current AI-path evidence

The desired unified brain is not proven as one runtime pipeline. Current separate paths include:

| Path/surface | Responsibility | Risk to resolve |
|---|---|---|
| Shared `AITerminalPanel` | Reusable chat terminal on dashboard/workout surfaces through `useAIChat`. | Shared shell does not prove shared context, policy, tools, client scope, or action receipts. |
| `/api/ai-chat/*` | Conversation lifecycle; related transcription and text-to-speech endpoints. | Chat memory can diverge from proposed or committed domain actions. |
| `/api/ai-command/*` | Execute, confirm, cancel command operations. | Command state must share identity, context, consent, and receipt semantics with chat. |
| `/api/coach/intake/*` | Intake queue, health, retention, event trail, audio review. | Intake artifacts must connect to the same Coach context without becoming uncontrolled permanent memory. |
| `/api/coach/proposals/*` | Proposal review, clarification, approval/rejection. | Proposal state needs one authoritative action, undo, and review contract. |
| Workout-planning services | Coach-labelled generation and approval workflows. | Specialist planning should be a capability, not a parallel authority. |
| Workout Logger terminal bridge | Natural-language assistance dispatches UI events and logger work. | Browser event dispatch must never be mistaken for durable, server-authorized mutation. |

Backend mounts `/api/ai-chat/stream-spike` before `/api/ai-chat`, then mounts `/api/ai-command`. `/api/coach/intake` and `/api/coach/proposals` are separate routes. Resolve action ownership and overlap deliberately.

## Documented architecture conflict

An older reference titled "App AI Hive Mind" specifies a free consensus system: simple questions use a Gemini Flash response; complex tasks use Gemini -> Qwen free -> Gemini Pro. It labels workout generation, client review, and progress analysis as complex.

This is in tension with, or incomplete relative to, the current multi-route architecture above. Decide whether it is active runtime truth, planned policy, stale documentation, or one internal capability. Do not assume it already unifies all dashboard brains.

## Jarvis-like behavior to design

- Know active role, task, client scope, session, and uncertainty without silently crossing scopes.
- Answer, propose, prepare, navigate, and execute only allowed typed capabilities.
- Distinguish observed facts, inferred suggestions, prepared proposals, queued/offline intents, confirmed writes, and failed/cancelled actions.
- Explain evidence, uncertainty, consequence, and undo/correction paths.
- Make voice/gym-floor logging faster than manual alternatives without unsafe silent writes.
- Be intentional on desktop and mobile; role UX cannot be a reskinned generic chatbot.

## Evidence appendix — source excerpts

The following code excerpts back the runtime assertions above. They are included for review evidence, not as a request to preserve implementation details unchanged.

### Role-aware mounted page

`CoachCommandCenterPage.tsx:34-43` derives role from the authenticated user, passes role into its controller, detects client mode, and derives role-specific route/tab state:

```ts
const { user: authUser } = useAuth();
const userRole = normalizeCoachCommandRole(authUser?.role);
const commandCenter = useCoachCommandCenterController({ userRole });
const isClientMode = isClientCoachRole(userRole);
const routeForcedTab = routeForcedTabForRole(searchParams, userRole);
const initialTab = routeForcedTab || 'talk';
const [activeTab, setActiveTab] = useState<CoachTab>(
  () => coerceCoachTabForRole(initialTab, userRole),
);
```

### Backend action-route mount order

`backend/core/routes.mjs:625-634` mounts the stream spike before chat, then the command lane. This is the applicable narrow ownership order for this packet:

```js
app.use('/api/ai-chat/stream-spike', aiStreamSpikeRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/ai-command', aiCommandRoutes);
app.use('/api/hermes', hermesRoutes);
app.use('/api/ai/debate', aiDebateRoutes);
```

### Shared terminal sends chat with explicit context and client identifier

`AITerminalPanel.tsx:116-139` passes a context, client identifier, and optional request context through `sendMessageWithConversation`:

```ts
if (requestContext) {
  await sendMessageWithConversation(
    text, context, `${displayLabel} — ${context}`,
    clientId || null, 'both', null, requestContext,
  );
  return;
}
await sendMessageWithConversation(
  text, context, `${displayLabel} — ${context}`, clientId || null,
);
```

### Workout UI-event bridge is not a durable-write proof

`aiWorkoutEvents.ts:121-128` labels browser dispatch as a frontend command mechanism and returns only whether a named dispatcher handled the event:

```ts
export function dispatchAIWorkoutEvent(eventName: string, payload: unknown): boolean {
  const dispatch = dispatchers[eventName];
  if (!dispatch) return false;
  return dispatch(payload as AIEventPayload);
}
```

The panel must not infer a committed workout write from this event acknowledgement; it should require a server-side receipt/verification contract.

## Evidence gate refresh — 2026-08-23

This refresh corrects the earlier debate-frame identity problem and records the route/handler evidence that must govern the next panel run. These are static source findings; they are not claims that a live authenticated request has already been exercised.

### Canonical surface receipt

| Receipt item | Evidence | Classification |
|---|---|---|
| Dashboard route mounts | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:98` (admin), `:177` (trainer), `:203` (client) all mount `CoachCommandCenterPage`; lazy declaration is `UniversalDashboardLayout.routeComponents.tsx:64`. | **canonical** |
| Mounted JSX page | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx:34-44` owns auth role, route context, and controller; JSX shell begins at `:149`. | **canonical** |
| Consumer hook/service | `CoachCommandCenter.controller.ts:42` calls `useAIChat`; `CoachCommandCenter.actions.ts:203-204` calls `sendMessageWithConversation`; `frontend/src/hooks/useAIChat.ts:217,425,448` creates the conversation and posts messages. | **canonical** |
| Frontend API literals | `useAIChat.ts:217,425,448`: `/api/ai-chat/conversations` and `/api/ai-chat/conversations/${convId}/messages`; `useCoachCommand.ts:96,170,207`: `/api/ai-command/execute|confirm|cancel`. | **canonical** |
| Backend route ownership | `backend/core/routes.mjs:630-634` mounts stream-spike, chat, command, Hermes, and debate in that order; intake/proposals are mounted at `:378-379`. | **canonical** |
| Authoritative conversation fields | `backend/models/AiConversation.mjs:24-83`: `userId`, `role`, `context`, `targetUserId`, `messages`, `status`, `metadata`, `messageCount`, `lastMessageAt`. | **authoritative model** |

### Route and middleware ownership probes

| Mounted path | Handler evidence | Current static result | Required live probe |
|---|---|---|---|
| `/api/ai-chat` | `backend/routes/aiChatRoutes.mjs:283` applies `protect`; `:466` applies subscription, rate-limit, and PII middleware; `:610-625` checks trainer target-client access. | Auth and trainer access gates are present; conversation creation accepts `targetUserId` for admin/trainer at `:308-344`. | Admin/trainer/client target switching, consent, cross-client read/write, and failure-state contract. |
| `/api/ai-command` | `backend/routes/aiCommandRoutes.mjs:110` applies `protect`, lane kill switch, and rate limit; `:111-145` accepts `selectedClientId`; `commandExecutor.mjs:309-343` resolves selected IDs; `clientResolver.mjs:110-166` scopes trainers but not admins beyond role. | Caller-supplied IDs are normalized and resolved, but server entitlement behavior for every command family is not yet proven. | Cross-client read and write matrix by role; confirm that every dispatcher re-checks access and that a denied operation cannot mint a success receipt. |
| `/api/coach/intake` | Mount `routes.mjs:378`; `coachIntakeRoutes.mjs:23-25` applies `protect`, admin/trainer authorization, and JSON limit; handlers begin at `:27-33`. | Admin/trainer-only intake queue with multiple read/write subpaths. | Retention/purge, audio confirmation, intake-to-proposal identity, and error/status receipts. |
| `/api/coach/proposals` | Mount `routes.mjs:379`; `coachProposalRoutes.mjs:15-16` applies `protect` and admin/trainer authorization; approval handlers at `:30-54`. | Review-gated proposal surface; approval service calls `ensureClientAccess` and claims pending rows before apply. | Replay/concurrency, review-token binding, cross-client proposal denial, and durable applied/failed receipt. |
| `/api/ai-chat/stream-spike` | Mount `routes.mjs:630`; `aiStreamSpikeRoutes.mjs` uses fail-closed `spikeEnabled`, then `protect` and `adminOnly` on `GET /`. | Synthetic, kill-switched SSE probe; no user data or DB write. | Confirm disabled 404, admin-only behavior, and proxy cadence before any product streaming claim. |
| `/api/hermes` | `hermesRoutes.mjs:43,90,127,142` each applies `protect` plus admin/trainer ownership guard. | Separate operator task queue, not proven to be the public Coach brain. | Classify as canonical/legacy/dormant/competing and verify no public dashboard can reach operator-only semantics. |
| `/api/ai/debate` | `aiDebateRoutes.mjs:54` applies `protect` and trainer/admin guard; `:57-76` accepts/resolves client context; status/result/stream use ownership middleware. | Separate async debate engine; direct `clientId` path needs an explicit access probe. | Trainer cross-client start denial, job ownership, de-identification, and result retention. |

### Surface classification

| Surface or document | Classification | Evidence and consequence |
|---|---|---|
| `CoachCommandCenterPage` | **canonical** | Mounted for all three dashboard role configurations at the route lines above. This is the surface the blueprint must target first. |
| `SwanCoachAssistantPage` | **legacy but still referenced** | No route-tree mount or lazy export was found; it remains referenced by its own tests, child comments, and historical hooks. Do not delete or modify it during this evidence pass; the blueprint must decide migration/retirement. |
| `/api/ai-chat`, `/api/ai-command`, `/api/coach/intake`, `/api/coach/proposals` | **competing/shared capability lanes** | All are reachable from the mounted Coach experience or its review flows, but their context, authorization, and receipt contracts differ. They cannot be called “one brain” until a shared boundary is proven. |
| `/api/hermes`, `/api/ai/debate` | **separate capability lanes; classification pending** | They are mounted and authenticated, but their relationship to public Swan Coach is not established by the current route tree. |
| `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` | **active reference doc with runtime drift** | Its lines `7-22` describe a free Gemini/Qwen/Gemini consensus, while the mounted runtime above contains additional chat, command, intake, proposal, Hermes, and debate lanes. The next blueprint must reconcile or explicitly retire this document. |

### Receipt and idempotency boundary

`backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target client, operation ID, outcome, error code, parameter hash/redaction, and duration. It has no `action_id` or unique idempotency key. `frontend/src/utils/aiWorkoutEvents.ts:121-128` returns only a browser dispatcher boolean. Therefore the required authoritative action receipt and retry/idempotency contract remain **unproven and must be designed by the panel before implementation**; this packet does not claim that contract already exists.

## Questions every seat must answer

1. Define the canonical single-brain boundary: server-owned context, capability registry, policy/entitlement gate, domain projections, receipts/events, and UI adapters.
2. Separate shared infrastructure from bounded specialist capabilities. Avoid both duplicate brains and an unreliable monolith.
3. Specify reconciliation between conversation memory, source-of-truth domain data, and pending/failed intents: freshness, invalidation, attribution, cross-device behavior.
4. Specify role/client/session grounding for pronouns, rapid switches, stale tabs, impersonation, client self-service, and concurrency.
5. Define action classes: answer-only, draft, reversible low-risk, confirmation-required, privileged, async, denied. Include confirmation, undo, cancel, and receipts.
6. Define foundation-grade offline/degraded behavior: latency target, queue/reconcile, idempotency, duplicate prevention, and honest UI states.
7. Specify the convergence design for admin command work, trainer active-client coaching, client self-service, user launchers, voice, keyboard, ambiguity repair, and accessible mobile/desktop interactions.
8. Identify security, privacy, tenancy, consent, retention, audit, observability, and kill-switch controls required before any UI modification or app action.
9. Classify current paths/components/docs as canonical, legacy, dormant, competing, or requiring a targeted probe; state missing evidence plainly.

## Ten-round debate protocol

**Rounds 1–2:** independent hostile findings—missing contracts, unsafe assumptions, product gaps, UX failures, and architecture traps. Cite packet evidence; no generic praise.

**Rounds 3–8:** challenge each other's findings. Convert vague ideas into exact contracts, ownership, diagrams, and verification gates. Preserve unresolved alternatives when an experiment—not opinion—should decide.

**Round 9:** draft one integrated implementation-authority blueprint, retaining explicit disputes.

**Round 10:** attack the draft for false unification, duplicate pipelines, wrong-client writes, stale context, silent mutation, privilege bypass, offline/retry duplicates, mobile failure, misleading copy, inaccessible interactions, and unverifiable success claims.

## Required final package

1. Executive ruling: APPROVE WITH BLUEPRINT / REVISE / BLOCK, including dissent.
2. Canonical surface classification table and required probes.
3. Target architecture: boundaries, truth sources, context keys, capability registry, policy gates, receipts/events, offline reconciliation, retention, telemetry, and kill switches.
4. Mermaid diagrams: component/context map; request-to-action/receipt sequence; role/client authorization flow; offline/retry/reconcile lifecycle; migration to canonical brain.
5. Role wireframes for admin, trainer, client, and user, each desktop and mobile: hierarchy, interactions, 44px affordances, voice/keyboard behavior, focus/error/empty/loading states, and what not to show.
6. State machines/contracts: context lifecycle; capability/action lifecycle; confirmation/undo; re-anchor; memory reconciliation; server-response and UI-state vocabulary.
7. Ordered PR-sized implementation slices with dependencies, exact routes/services to probe/change, compatibility/migration strategy, and non-goals. No big-bang rewrite.
8. Verification matrix: unit, contract, integration, concurrency, authorization, privacy/retention, offline, browser responsive/accessibility, failure injection, and production observability.
9. Prioritized hostile findings: must-fix before build, must-fix per slice, should-improve, defer; every item needs severity, evidence, fix, and acceptance criterion.
10. Builder handoff: unambiguous implementation order and acceptance criteria. Do not write source code.

## Evidence boundary

This packet does not claim every existing AI consumer is mapped. It provides verified starting evidence and asks the panel to identify needed probes. Every later implementation remains subject to local route, model, contract, and test verification.
