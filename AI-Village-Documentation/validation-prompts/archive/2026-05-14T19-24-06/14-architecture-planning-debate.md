# Architecture Planning Debate (Phase 2B) — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 246.8s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

CONSENSUS REACHED

The Senior Architecture Lead's review is accepted in full. All four findings are valid and the recommended fixes are sound. No disputes are raised.

**Summary of Agreed Points:**

1. **Hook Composition Circular Dependency**
   - **Files:** `frontend/src/hooks/useCoachAssistant.ts`, `frontend/src/hooks/useAIChat.ts`, `frontend/src/hooks/useConversationSidebar.ts`
   - **Fix:** Invert ownership via `CoachCommandProvider` as single source of truth. Hooks become pure selectors/action dispatchers.
   - **Implementation:**
     - Create `CoachCommandProvider.tsx` (context) owning `useAIChat` and state.
     - Refactor `useCoachAssistant.ts` to action-only dispatcher (~80 lines).
     - Refactor `useConversationSidebar.ts` to derived selector (~60 lines).

2. **Duplicated Truth in State Management**
   - **Files:** `CoachCommandCenterPage.tsx`, `useCoachAssistant.ts`, `useAIChat.ts`, `PlaudMergeWorkspace.tsx`
   - **Fix:** Define explicit ownership boundaries:
     - **Server State:** `conversations[]`, `intakeQueue[]` (owned by React Query hooks).
     - **URL State:** `conversationId`, `panel`, `mergeRequestId` (synced to context on mount).
     - **Ephemeral UI State:** `sidebarOpen`, `composerDraft`, `searchQuery` (local `useState`).
     - **Cross-Domain State:** `selectedClientId`, `activePanel` (owned by `CoachCommandProvider`).
   - **Implementation:**
     - Pass `selectedClientId` as prop to `PlaudMergeWorkspace` (no re-derivation from URL).
     - Sync URL params to context in `CoachCommandCenterPage.tsx` on mount.

3. **File Budget Overruns**
   - **Files at Risk:** `CoachCommandCenterPage.tsx` (480–600 lines), `useCoachAssistant.ts` (350–420 lines), `CoachInputBar.tsx` (295–380 lines), `PlaudMergeWorkspace.tsx` (310–400 lines), `CoachIntakePanel.tsx` (280–340 lines).
   - **Fix:** Apply component decomposition per Finding 4 to enforce <300 lines/file.
   - **Under-Engineered Files to Delete:**
     - `CoachCommandCenter.data.ts` (~40 lines) → replace with real data from `useAIChat`.
     - `CoachPanelHeader.tsx` (~35 lines) → inline into `CoachCommandShell.tsx`.
     - `CoachEmptyState.tsx` (~25 lines) → use existing `EmptyState` component.

4. **Component Decomposition (Three-Layer Rule)**
   - **File Tree & Responsibilities:**
     ```
     frontend/src/components/DashBoard/Pages/coach-assistant/
     │
     ├── CoachCommandCenterPage.tsx          [~80 lines]
     │   - Route shell: parse query params, mount provider/shell/error boundary.
     │
     ├── CoachCommandShell.tsx               [~140 lines]
     │   - Layout: desktop sidebar/grid, mobile dock, panel switching, animations.
     │
     ├── panels/
     │   ├── CoachConversationPanel.tsx      [~160 lines]
     │   │   - Conversation list + active thread layout.
     │   │
     │   ├── CoachIntakePanel.tsx            [~180 lines]
     │   │   - Intake queue: status filters, item list, auto-advance.
     │   │
     │   └── CoachMergePanel.tsx             [~80 lines]
     │       - Thin wrapper for `PlaudMergeWorkspace` (pass `selectedClientId`, `mergeRequestId`).
     │
     ├── components/
     │   ├── CoachThreadView.tsx             [~200 lines]
     │   │   - Message list (virtualized), streaming tokens, input bar.
     │   │
     │   ├── CoachInputBar.tsx               [~180 lines]
     │   │   - Text area (auto-resize), submit, client badge, char count, mobile padding.
     │   │
     │   ├── VoiceRecordButton.tsx           [~90 lines]
     │   │   - MediaRecorder lifecycle, recording state.
     │   │
     │   ├── AttachmentButton.tsx            [~70 lines]
     │   │   - File input trigger, MIME/size validation, upload hook.
     │   │
     │   ├── IntakeItemCard.tsx              [~110 lines]
     │   │   - Single item render: status badge, action buttons.
     │   │
     │   ├── IntakeStatusFilter.tsx          [~70 lines]
     │   │   - Tab/pill filter for intake statuses.
     │   │
     │   └── MobileCommandDock.tsx           [~

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
