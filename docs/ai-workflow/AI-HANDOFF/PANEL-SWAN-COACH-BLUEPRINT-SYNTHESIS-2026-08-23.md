# Swan Coach Unified Brain — AI Blueprint Synthesis Packet

This is a sanitized, provider-neutral synthesis packet. It contains no credentials, names, customer records, transcripts, cookies, database URLs, or production logs. The final response must be a blueprint only: no source-code edits, migrations, deployment, or feature enablement.

## Authority and scope

The corrected, packet-fingerprinted hostile debate ran 10 rounds with GLM 5.3, Grok 4.6, and DeepSeek V4 Pro. Its clean run ended honestly at `MAXROUNDS / DISPUTE`, with approximately $0.7055 tracked spend; the strongest candidate is a **FIX BEFORE BUILD / REVISE** ruling. An earlier five-seat run is supporting evidence only because it reused stale state; do not use its unresolved state or final candidate as authority.

The subject is the Swan Coach unified brain for the mounted `/coach-assistant` surfaces in Admin, Trainer, and Client dashboard role configurations, plus the surrounding AI capability lanes. The public Coach surface must remain distinct from Hermes operator tooling unless a later probe explicitly joins them.

## Verified route and surface evidence

- Canonical dashboard route: `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:98` (admin), `:177` (trainer), `:203` (client), all mounting `CoachCommandCenterPage`; lazy declaration at `UniversalDashboardLayout.routeComponents.tsx:64`.
- Mounted JSX and role context: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx:34-44,96-105,149`.
- Canonical chat consumer: `CoachCommandCenter.controller.ts:42`, `CoachCommandCenter.actions.ts:203-204`, `frontend/src/hooks/useAIChat.ts:217,425,448`.
- Backend mounts: `backend/core/routes.mjs:378-379` (`/api/coach/intake`, `/api/coach/proposals`) and `:630-634` (`/api/ai-chat/stream-spike`, `/api/ai-chat`, `/api/ai-command`, `/api/hermes`, `/api/ai/debate`).
- Chat auth/access: `backend/routes/aiChatRoutes.mjs:283,466,610-625`; conversation creation accepts `targetUserId` at `:308-344`.
- Command target path: `backend/routes/aiCommandRoutes.mjs:110-145`, `backend/services/ai/commandExecutor.mjs:309-343`, `backend/services/ai/clientResolver.mjs:110-166`.
- Intake/proposal guards: `backend/routes/coachIntakeRoutes.mjs:23-33`, `backend/routes/coachProposalRoutes.mjs:15-54`.
- Debate start path: `backend/routes/aiDebateRoutes.mjs:54-76`; it accepts/resolves client context but still needs an explicit `ensureClientAccess` probe.
- Authoritative conversation fields: `backend/models/AiConversation.mjs:24-83` (`userId`, `role`, `context`, `targetUserId`, `messages`, `status`, `metadata`, `messageCount`, `lastMessageAt`).
- Existing command audit fields: `backend/models/AiCommandAuditLog.mjs:24-91`; it has actor, role, target, operation, outcome, parameter hash/redaction, and duration, but no `action_id` or unique idempotency key.
- Browser event bridge: `frontend/src/utils/aiWorkoutEvents.ts:121-128`; it returns only a dispatcher boolean and is not proof of a durable write.
- `SwanCoachAssistantPage` is legacy-but-still-referenced; it is not mounted by the verified route tree. Do not delete it during blueprint work; define its migration/fencing path.
- `docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` describes a free Gemini/Qwen/Gemini design that conflicts with the mounted multi-lane runtime; classify it as runtime-drift documentation to reconcile or retire.

## Clean panel candidate ruling to synthesize

FIX BEFORE BUILD:

1. F1 — add a durable `action_id`, scoped unique idempotency key, idempotent executor, and authoritative receipt across the command lane; return the receipt before the UI can show verified success.
2. F3 — use one canonical server-owned `targetUserId`/user-PK identity. Client actors resolve to their own actor ID. Admin/trainer mutating or client-scoped actions require a resolved target; answer-only actions may remain target-null. Chat and command must share a server context/version and reject mismatches.
3. F2 — run capability and access checks after target resolution and immediately before execution. Denials write a denial-shaped audit/receipt and never mint success.
4. F6 — make proposal claim/apply one conditional transaction (`status='pending'`), with idempotent replay and durable applied/failed receipt.
5. F5 — bring intake/proposal auth, PII, retention, and TTL controls to parity with the chat middleware family; require a parity table before enablement.

MUST-FIX PER SLICE:

6. F4 — design a separate durable offline intent queue keyed by scoped `action_id`, with `queued`, `sending`, `verified`, `replayed`, `conflict`, and `failed` states; reconcile exactly once and never use `AiConversation.messages/status` as the offline queue.
7. F7 — inventory every method on the stream spike and prove disabled 404 behavior before any product streaming claim.
8. F10 — apply `ensureClientAccess` to the debate start path and prove trainer cross-client denial.
9. F11 — fence the legacy `SwanCoachAssistantPage`, migrate or explicitly retire its tests/locks, and do not let it compete with the canonical page.
10. F8 — cite the review-gate implementation or strike the header claim; prose is not a gate.
11. F9 — reconcile or retire the stale `APP-AI-HIVE-MIND.md` reference.
12. Add cross-lane target coherence: a conversation bound to Client A plus a command request for Client B must return `409 TARGET_MISMATCH`, write a denial receipt, and force UI re-anchor.
13. Define per-action undo/compensation. Until it exists, receipts must mark applied writes as non-recoverable.

## Non-negotiable output contract

Produce an implementation-ready, provider-neutral blueprint containing:

1. Executive ruling and dissent.
2. Canonical surface and capability classification table.
3. Target architecture and ownership boundaries.
4. At least five Mermaid diagrams: component/context, request-to-receipt sequence, role/client authorization, offline/retry/reconcile, and migration to the canonical brain.
5. Role wireframes for Admin, Trainer, Client, and User, each in desktop and mobile form, including 44px controls, keyboard/voice, loading/error/empty/conflict states, and what must not be shown.
6. State machines and contracts for context, capabilities, actions, confirmation/undo, re-anchor, memory reconciliation, receipts, and UI status.
7. Ordered PR-sized implementation slices with dependencies, exact routes/files, compatibility strategy, and explicit non-goals.
8. Verification matrix: unit, contract, integration, concurrency, authorization/IDOR, privacy/retention, offline/failure injection, responsive/accessibility, and observability.
9. Prioritized hostile findings with evidence, fix, and acceptance criterion.
10. Builder handoff: exact implementation order and acceptance gates. Do not write source code and do not invent runtime behavior that the evidence does not prove.
