# Swan Coach V1 Implementation Roadmap
> Build roadmap for turning Swan Coach into the voice-first operating layer of SwanStudios.
> Use when: planning implementation phases, assigning files, or deciding what to build next for Swan Coach.

## Why This Exists
Swan Coach already has meaningful pieces in the codebase, but the experience is still fragmented.
Today there are multiple surfaces and pathways:
- full Coach Assistant page
- floating or drawer assistant surfaces
- chat conversation routes
- command execution routes
- voice transcription support
- role-aware contexts

The problem is not "missing AI."
The problem is that the command model, dictation flow, and product positioning are not yet unified into one believable operating system.

This roadmap fixes that in the right order.

## Current Reality
### Frontend
Existing coach surface and building blocks already live in:
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/VoiceRecordingOverlay.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/ContextChipBar.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachConstants.ts`
- `frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanel.tsx`
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`
- `frontend/src/components/Shared/AICommandBar/AICommandBar.tsx`

### Backend
Existing backend paths already live in:
- `backend/routes/aiChatRoutes.mjs`
- `backend/routes/aiCommandRoutes.mjs`
- `backend/services/aiChatService.mjs`
- `backend/services/aiDataWriteService.mjs`
- `backend/services/ai/contextBuilder.mjs`
- `backend/services/voiceTranscriptionService.mjs`
- `backend/services/ai/commandExecutor.mjs`
- `backend/services/ai/commandRegistry/index.mjs`

### Existing Strengths
- role-aware context permissions already exist
- conversation persistence already exists
- command execution endpoints already exist
- confirmation route already exists
- voice upload/transcription support already exists
- privacy proxy and PII stripping rules already exist

### Existing Gaps
- chat path and command path are not productized as one clear UX
- dictation is present, but not yet the primary control path
- Coach Assistant still behaves too much like a smart chat tab instead of an operator
- multiple assistant shells risk duplicated behavior and inconsistent UX
- current large files signal a refactor need before this grows further

## V1 Product Goal
Ship Swan Coach as:
- the public-facing differentiator on core funnel pages
- the logged-in navigation and action copilot
- the trainer/admin dictation-first operations layer
- a safe execution layer with explicit confirmations

Do not try to ship full internal builder autonomy in the same pass.

## Architecture Decision
Use a dual-lane model:

### Lane 1: Conversational Guidance
Purpose:
- explain
- guide
- answer
- recommend

Primary backend:
- `aiChatRoutes.mjs`
- `aiChatService.mjs`
- `contextBuilder.mjs`

### Lane 2: Structured Action Execution
Purpose:
- navigate
- create
- update
- delete
- hand off
- escalate

Primary backend:
- `aiCommandRoutes.mjs`
- `commandExecutor.mjs`
- `commandRegistry`
- `aiDataWriteService.mjs`

### Frontend Rule
The user should not have to choose the lane manually.
Swan Coach should decide:
- answer in chat
- propose an action
- request confirmation
- execute and report the result

## Phase Plan
### Phase 0: Surface consolidation and guardrails
Goal:
- stop Swan Coach from feeling fragmented before new behavior is added

Work:
- define the primary Swan Coach surface of truth
- keep the full Coach Assistant page as the main admin/trainer surface
- treat drawer, FAB, persistent panel, and command bar as alternate launch shells, not separate products
- normalize shared context, response style, and command routing behavior

Files:
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`
- `frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanel.tsx`
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`
- `frontend/src/components/Shared/AICommandBar/AICommandBar.tsx`

Acceptance criteria:
- one clear Swan Coach behavior model across all shells
- no conflicting labels, contexts, or command semantics
- shared entry points route into the same logic path

### Phase 1: Command router in the real UI
Goal:
- make command execution real from the Coach Assistant surface

Work:
- integrate `aiCommandRoutes` into the main Coach Assistant flow
- detect when a user request should route to command execution instead of plain chat
- render clear confirmation states and execution results in the conversation stream
- keep conversational fallback when command confidence is low

Files:
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx`
- `frontend/src/hooks/useAIChat.ts`
- `backend/routes/aiCommandRoutes.mjs`
- `backend/services/ai/commandExecutor.mjs`

Acceptance criteria:
- a supported command can be issued from the main Coach Assistant UI
- confirmation-required actions render clearly
- execution result is shown in-line, not hidden in console or logs
- unsupported or ambiguous commands fall back gracefully to conversational guidance

### Phase 2: Dictation-first command flow
Goal:
- make voice the primary UX for high-friction workflows

Work:
- upgrade the current voice path so dictation can feed command execution, not just text chat
- show transcript preview and structured confirmation before writes
- keep forms as fallback when confidence is low

Files:
- `frontend/src/components/DashBoard/Pages/coach-assistant/VoiceRecordingOverlay.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/VoiceSettingsBar.tsx`
- `backend/routes/aiChatRoutes.mjs`
- `backend/services/voiceTranscriptionService.mjs`
- `backend/routes/aiCommandRoutes.mjs`

Acceptance criteria:
- voice input can drive a supported action end-to-end
- user sees transcript plus confirmation before save/update/delete
- low-confidence speech falls back to correction or form flow instead of bad writes

### Phase 3: First safe CRUD set
Goal:
- ship the smallest believable set of high-value Swan Coach actions

V1 action pack:
- log workout
- log meal
- create client onboarding pre-fill
- create or update workout draft
- navigate to schedule or planner with context

Files:
- `backend/services/aiDataWriteService.mjs`
- `backend/routes/aiChatRoutes.mjs`
- `backend/routes/aiCommandRoutes.mjs`
- `backend/services/ai/commandRegistry/index.mjs`
- `backend/services/ai/contextBuilder.mjs`
- corresponding frontend client-aware surfaces in coach assistant and onboarding

Acceptance criteria:
- each action has role checks
- each action has explicit confirmation behavior
- each action reports what changed
- each action respects PII and consent boundaries

### Phase 4: Cross-dashboard context and handoff
Goal:
- make Swan Coach feel aware of where the user is and who they are acting on

Work:
- strengthen route-aware context
- carry selected-client context between client surfaces and Coach Assistant
- ensure "Ask Swan Coach" from nutrition, workouts, clients, and onboarding opens with the right context

Files:
- `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx`
- `frontend/src/hooks/useNutritionCoach.ts`
- `frontend/src/components/AIAssistant/ClientPicker.tsx`
- `backend/services/ai/contextBuilder.mjs`

Acceptance criteria:
- users do not have to reselect the same client in multiple places
- cross-surface handoffs preserve meaningful context
- Swan Coach answers are visibly aware of the active workflow

### Phase 5: Hermes escalation lane
Goal:
- let Swan Coach hand off higher-trust or long-running work to Hermes without pretending the in-app layer can do everything

Work:
- define a separate escalation payload for Sean-only or admin-only operator tasks
- route long-running tasks, memory-backed tasks, and internal build requests to Hermes
- keep user-facing Swan Coach distinct from internal operator mode

Files:
- new bridge layer to be defined under backend AI integration services
- `docs/ai-workflow/references/HERMES-WIKI-MYTHOS-MASTER-PLAN.md`
- Swan Coach frontend action rendering for escalated tasks

Acceptance criteria:
- Swan Coach can create a persistent task for Hermes
- the UI distinguishes "executed here" from "escalated to Hermes"
- no false promise of direct production code changes from public in-app chat

## Recommended Refactor Work
These files are too large to comfortably keep growing:
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
- `backend/routes/aiChatRoutes.mjs`
- `backend/services/aiChatService.mjs`

Before or during Phase 1-2, split toward:
- presentation shell
- action renderer
- conversation transport adapter
- dictation adapter
- command adapter
- context resolver

## Non-Goals For V1
Do not treat these as V1 blockers:
- autonomous code editing from in-app chat
- full site-building by voice
- broad multi-step admin automation without approval gates
- full Sims-like gamification execution through Swan Coach
- perfect universal agent behavior on every tab before the main funnel and trainer workflows are stable

## First Sprint Recommendation
Start here:

### Sprint A
- Phase 0 plus Phase 1

Build:
- a single command-aware Coach Assistant flow in the main page
- confirmation UI in conversation
- execution results in-line
- graceful fallback to standard chat

Reason:
- this gives Swan Coach a believable operating core fast
- it makes later dictation work actually matter
- it avoids investing in voice UX before the action lane is real

## Ship Standard
Swan Coach is ready for broader rollout when:
- it can answer and act from one coherent UX
- the first command pack works safely
- dictation can drive at least one real action end-to-end
- public users can understand why Swan Coach is worth joining for
- trainers can save time with it on real workflows
