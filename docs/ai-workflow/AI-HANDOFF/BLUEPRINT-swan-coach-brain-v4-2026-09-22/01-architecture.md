# 01 — Architecture

## 1. What exists today (coach branch `70547685c`), measured

```mermaid
flowchart LR
  U[Trainer types / speaks] --> R{Browser regex<br/>aiMessageLimits.ts:23}
  R -- "starts with 1 of 30 verbs" --> CMD[POST /api/ai-command<br/>aiCommandRoutes.mjs 904 lines]
  R -- "anything else (9 of 12 probes)" --> CHAT[POST /api/ai-chat/.../messages<br/>aiChatRoutes.mjs 1343 lines]
  CMD --> CLS[intentClassifier: 1 LLM call<br/>JSON intent + 14-17K-char command list]
  CLS --> REG[(commandRegistry<br/>139 commands)]
  REG --> DISP[dispatchers/*]
  DISP -- write --> PEND[(pendingOperationStore<br/>HMAC, Redis-ready)]
  CLS -- fallback_to_chat --> CHAT
  CHAT --> BND[coachInferenceBoundary<br/>4 server-fixed readers, 1 model round]
  BND --> PRV["getAvailableProviders()[0]<br/>gemini-2.5-flash default"]
  CHAT --> PROP[coach_action_proposal JSON<br/>9 proposal types]
  PROP --> APPR[(coach*ApprovalService x6)]
  CHAT -. "6 msgs x 800 chars" .-> HIST[(history)]
  FACT[(CoachFact memory)] -. "0 production readers" .- CHAT
```

**Structural faults** (hostile review H1–H6):
- There are two lanes, two action vocabularies and two approval stores.
- Routing happens in the browser.
- The model never chooses a tool.
- There is no streaming.
- The memory is dark.
- The model is hard-coded.

## 2. Target

```mermaid
flowchart LR
  U[Trainer: text / voice / @client / slash] --> TURN[POST /api/coach/turns<br/>streamed events]
  TURN --> ASM[ContextAssembler<br/>context engine + memory + rolling summary + surface]
  ASM --> PRIV[PrivacyGate<br/>roster-alias in, alias-restore out]
  PRIV --> LOOP{{CoachTurnLoop<br/>≤4 rounds · ≤8 tools · ≤45 s}}
  LOOP <--> BR[BrainRouter<br/>capability routing + circuit breaker]
  BR --> A1[anthropic] & A2[openai] & A3[gemini] & A4[openrouter] & A5[ollama/local]
  LOOP -- tool_call --> SEL[ToolRegistry<br/>139 commands + 9 proposals = 1 vocabulary]
  SEL -- read --> EXEC[ToolExecutor → existing dispatchers<br/>RBAC + clientScope unchanged]
  SEL -- write --> LED[(ApprovalLedger<br/>= pendingOperationStore + signing)]
  LED --> EV[approval.required event]
  EXEC --> EV2[tool.result event]
  LOOP --> OUT[text.delta / turn.completed]
  OUT --> MEM[FactProposer → CoachFact queue<br/>SummaryUpdater]
  LOOP --> TRACE[(TurnTrace: tokens, cost, latency)]
```

## 3. Component ownership

| Component | New path (backend) | Reuses | Owner of truth |
|---|---|---|---|
| Turn route + SSE writer | `backend/services/coach-brain/turn/coachTurnRoute.mjs`, `turnEventWriter.mjs` | `protect`, rate limiter | Event sequence and terminal state |
| Turn loop | `coach-brain/turn/coachTurnLoop.mjs` | `circuitBreaker.mjs` | Budgets, round counting |
| Context | `coach-brain/context/contextAssembler.mjs`, `conversationSummary.mjs` | `contextEngine/coachContextEngine.mjs`, `coachFactMemoryPolicy.getMemoryForTask` | What the model sees |
| Privacy | `coach-brain/privacy/rosterAlias.mjs` | `deIdentifier.mjs`, `phiScanner.mjs` (as defence-in-depth) | Name↔alias map per turn |
| Tools | `coach-brain/tools/toolRegistry.mjs`, `toolSelector.mjs`, `toolExecutor.mjs` | `commandRegistry/*`, `commandDispatcher.mjs`, `dispatchers/*`, proposal classifiers | Tool list and schemas |
| Ledger | `coach-brain/ledger/approvalLedger.mjs` | `destructiveOperations.mjs`, `pendingOperationStore.mjs`, `operationSigning.mjs`, `approvalEvents.mjs` | Whether a write may run |
| Brains | `coach-brain/brain/brainAdapter.mjs`, `modelRegistry.mjs`, `brainRouter.mjs`, `adapters/*.mjs`, `costLedger.mjs` | `services/ai/adapters/*`, `providerCostTracker.mjs` | Which model serves a turn |
| Memory writer | `coach-brain/memory/factProposer.mjs` | `coachFactService.proposeFacts` | Proposed facts (never active without a human) |
| Trace | `coach-brain/trace/turnTrace.mjs` | `commandAudit.mjs` | Per-turn metrics |

**Frontend** (`frontend/src/components/DashBoard/Pages/coach-workspace/`):

| Component | Responsibility |
|---|---|
| `useCoachTurn.ts` | Opens the stream (fetch + `ReadableStream`), reduces events, handles cancel and resume |
| `CoachWorkspace.tsx` | Layout: sidebar · conversation · inspector; responsive shell |
| `ThreadSidebar.tsx` | Threads grouped by client and today; search |
| `ConversationColumn.tsx`, `TurnView.tsx` | Messages, markdown, streaming caret |
| `ActivityTimeline.tsx` | Collapsible "Coach looked at …" tool steps (Claude Code style) |
| `ApprovalCard.tsx` | Before → after diff, with Approve / Edit / Reject and expiry |
| `Composer.tsx`, `ClientMentionChip.tsx`, `SlashMenu.tsx` | The only input: `@client`, `/log /plan /schedule /review`, attach, mic |
| `InspectorPanel.tsx` | Client card, pending approvals, today brief (G10) |

The existing `coach-assistant/` tree stays mounted behind the flag until P4 exit, then retires. Its result cards are reused inside `TurnView` where they fit (`CoachExecutionResultCard`, `CoachPreparedDraftResultCard`).

## 4. A turn, end to end

```mermaid
sequenceDiagram
  participant UI as Composer/useCoachTurn
  participant API as /api/coach/turns
  participant L as TurnLoop
  participant B as BrainRouter
  participant T as ToolExecutor
  participant G as ApprovalLedger
  UI->>API: POST {threadId?, text, clientRef?, surface, clientTurnId}
  API-->>UI: event turn.started {turnId, seq:1}
  API->>L: assemble context (aliased)
  L->>B: round 1 (tools, stream)
  B-->>L: text deltas + tool_call(view_workout_history)
  L-->>UI: text.delta… tool.call {id,name,args}
  L->>T: execute read (RBAC, scope)
  T-->>L: result (bounded, quoted data)
  L-->>UI: tool.result {id, summary}
  L->>B: round 2 (+result)
  B-->>L: tool_call(log_workout {…})
  L->>G: prepare(actor, client, payloadHash, version, ttl)
  G-->>L: approvalId + signed preview
  L-->>UI: approval.required {approvalId, before, after, expiresAt}
  L->>B: round 3 (tool result = "awaiting approval")
  B-->>L: final text
  L-->>UI: text.delta… turn.completed {messageId, usage, cost}
  UI->>API: POST /api/coach/approvals/:id {decision:"approve", payloadHash}
  API->>G: consume once → dispatcher write → receipt
  API-->>UI: approval.resolved {committed:true, receipt}
```

## 5. Approval state machine

```mermaid
stateDiagram-v2
  [*] --> requested: write tool call
  requested --> approved: human approve + hash match + not expired
  requested --> rejected: human reject
  requested --> expired: ttl elapsed
  requested --> invalidated: target/version/actor changed
  approved --> committed: dispatcher success (single consumption)
  approved --> failed: dispatcher error (no partial success claim)
  committed --> [*]
  rejected --> [*]
  expired --> [*]
  invalidated --> [*]
  failed --> [*]
```

## 6. Lineage consolidation (P0)

```mermaid
gitGraph
  commit id: "main 53f93854b"
  branch coach
  commit id: "coach 70547685c (159 ahead)"
  commit id: "vs-claude R7 closure (3)"
  commit id: "S83 backend delta (to land)"
  commit id: "C2 fix: self-scope snapshot"
  checkout main
  merge coach id: "P0 merge via PR"
  commit id: "port freestyle from fork (P6, by slice)"
```

Candidate order (decision D1): coach branch → land C3 → fix C2 → merge `origin/main` into it → PR to `main`. The fork is **not** merged; the fork-only assets (freestyle trio, the privacy lessons) are ported by slice.

## 7. Trade-offs chosen

- **SSE over POST, not WebSocket.** It is one-directional, which matches a turn. It works through the existing Express stack and auth header, and cancel is a separate POST. Socket.IO exists but would couple turns to connection state.
- **Tool calling, not classify-then-dispatch.** The classifier is kept only as a *fallback brain* for providers without tool support (capability flag), not as the router.
- **Reuse the ledger, not rebuild it.** The coach branch's signed, async, atomically consumed store is the strongest code in the system.
- **Dictionary aliasing, not regex admission.** A roster substitution is deterministic and testable to zero. A regex over clinical prose is not (H7).
