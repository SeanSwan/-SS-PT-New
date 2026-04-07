# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 4:12:35 PM

---

# Architectural Review: SwanStudios Comprehensive Refactor Plan

> **Reviewer Note:** This plan document is a *planning brief* (audit/discovery phase), not an implementation spec. Therefore, many findings below are **prospective** — flagging architectural risks that will emerge when implementation begins, based on the described feature set and the existing codebase patterns implied by the brief. Where the plan describes specific component/hook structures, those are reviewed directly.

---

## Executive Summary

The brief is well-structured as a discovery document but contains several architectural time-bombs that will cause significant rework if not addressed before implementation begins. The most critical risks are: (1) the implied hook composition chain for Coach Assistant has circular dependency potential, (2) the "unified AI terminal" directive will create a god-component if not properly abstracted, (3) the Rolodex pattern is described behaviorally but has no proposed state ownership, and (4) the conversation loading flow has at least two race condition vectors. The plan also systematically underestimates file sizes for the AI terminal consolidation work.

---

## Finding Matrix

---

### F-001 — Hook Composition Chain

**Severity:** 🔴 Critical

**File/Component:** `useCoachAssistant` → `useAIChat` → `useConversationSidebar` (implied by Section 5.B)

**Issue:**

The described composition direction is inverted. `useConversationSidebar` should be a *consumer* of conversation state, not a dependency that `useAIChat` calls into. As described, the chain implies:

```
useCoachAssistant
  └── useAIChat
        └── useConversationSidebar  ← WRONG DIRECTION
```

If `useConversationSidebar` manages which conversation is active AND `useAIChat` fetches messages for the active conversation AND `useCoachAssistant` orchestrates both, you get a circular read: the sidebar needs to know the current conversation to highlight it, but the current conversation is set by clicking the sidebar. If both hooks share a `conversationId` atom without a single source of truth, you will get stale closure bugs on every conversation switch.

**Recommended Fix:**

Invert the dependency graph. Lift `conversationId` state to `useCoachAssistant` (the orchestrator). Pass it down as a parameter, not a shared subscription:

```typescript
// Correct composition
const useCoachAssistant = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // useAIChat is a pure data hook — takes conversationId as input
  const chat = useAIChat(activeConversationId);
  
  // useConversationSidebar is a pure UI/list hook — receives a callback
  const sidebar = useConversationSidebar({
    onConversationSelect: setActiveConversationId,
    activeConversationId, // read-only, for highlight state
  });
  
  return { chat, sidebar, activeConversationId };
};
```

`useAIChat` and `useConversationSidebar` should have **zero knowledge of each other**.

---

### F-002 — Conversation Loading Race Condition

**Severity:** 🔴 Critical

**File/Component:** `useAIChat` → conversation load flow → message render

**Issue:**

Tracing the described flow: sidebar click → `loadConversation(id)` → messages render.

There are two race condition vectors:

**Vector A — Stale fetch:** If the user clicks conversation A, then quickly clicks conversation B before A's fetch resolves, both fetches are in-flight. If A resolves after B, the UI will display A's messages while the sidebar shows B as active.

**Vector B — Optimistic clear:** If the implementation clears `messages` state before the new fetch resolves (common pattern to avoid showing stale messages), there is a flash of empty state. If the fetch then fails, the user sees an empty conversation with no error.

The brief mentions "AI terminal overlays get stuck over prior content" (Section 5.B) — this is almost certainly a symptom of Vector A.

**Recommended Fix:**

```typescript
const useAIChat = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Cancel any in-flight request for a previous conversation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const controller = abortControllerRef.current;

    fetchConversation(conversationId, { signal: controller.signal })
      .then((data) => {
        // Guard: only update if this effect is still current
        if (!controller.signal.aborted) {
          setMessages(data.messages);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // Set error state, do NOT clear messages
          setError(err);
        }
      });

    return () => controller.abort();
  }, [conversationId]);
};
```

Add a `conversationId` key to the message list container so React fully remounts it on conversation switch, preventing stale DOM state from leaking through.

---

### F-003 — God Component Risk: Unified AI Terminal

**Severity:** 🔴 Critical

**File/Component:** Proposed unified AI terminal (Section 5.B, Section 7)

**Issue:**

The brief mandates "all AI terminals across the app should be normalized to the same experience." This is the right product direction but will produce a god component if implemented naively. The terminal needs to serve: Coach Assistant, Swan Coach Workout Builder, Boot Camp Creator, Content Studio, and potentially Equipment Scan. Each has different:

- Input modes (text, voice, file upload)
- Output modes (text, structured workout plan, equipment list, video)
- Context payloads (client profile, exercise database, equipment inventory)
- Action buttons (read-aloud, copy, load-to-builder, save-as-template)

A single `<AITerminal>` component that conditionally renders all of these will exceed 600+ lines and become unmaintainable within two sprints.

**Recommended Fix:**

Use a **compound component + composition** pattern with a shared primitive layer:

```
packages/
  ai-terminal/
    primitives/
      AITerminalShell.tsx        # layout, z-index, overlay behavior (~80 lines)
      AITerminalInput.tsx        # text input + voice toggle (~100 lines)
      AITerminalMessageList.tsx  # message rendering + markdown (~120 lines)
      AITerminalActions.tsx      # copy, read-aloud, export (~80 lines)
    
    contexts/
      AITerminalContext.tsx      # shared state provider (~60 lines)
    
    variants/
      CoachAssistantTerminal.tsx # composes primitives + coach context (~150 lines)
      WorkoutBuilderTerminal.tsx # composes primitives + workout context (~150 lines)
      BootCampTerminal.tsx       # composes primitives + bootcamp context (~120 lines)
      EquipmentScanTerminal.tsx  # composes primitives + scan context (~100 lines)
    
    hooks/
      useAIChat.ts               # data fetching only (~120 lines)
      useVoiceInput.ts           # microphone + STT only (~100 lines)
      useTextToSpeech.ts         # TTS + read-aloud only (~80 lines)
      useAITerminalState.ts      # UI state only (~80 lines)
```

Each variant file stays under 200 lines. The primitives are reusable. New AI surfaces get a new variant file, not a new branch in a monolithic component.

---

### F-004 — Rolodex State Ownership Undefined

**Severity:** 🟠 High

**File/Component:** Exercise Rolodex (Section 5.A, 5.C)

**Issue:**

The brief describes the Rolodex as a "contained panel" showing 5–7 exercises with internal scroll, used in both the Workout Planner and Boot Camp Creator. However, it does not define who owns the Rolodex state. Specifically:

- Who owns the filter/search state? (The Rolodex panel or the parent builder?)
- Who owns the selected exercise? (Needed by the builder to add it)
- Is the exercise list fetched once and shared, or fetched per-surface?

Without this defined, two implementations will diverge: the Workout Planner Rolodex and the Boot Camp Rolodex will each fetch independently, filter independently, and manage selection independently, making the "same compact scrollable panel approach" directive impossible to enforce.

**Recommended Fix:**

Define a `useExerciseRolodex` hook that is the single source of truth:

```typescript
interface UseExerciseRolodexOptions {
  initialFilter?: ExerciseFilter;
  onExerciseSelect: (exercise: Exercise) => void; // callback to parent builder
  maxVisible?: number; // default 6
}

const useExerciseRolodex = (options: UseExerciseRolodexOptions) => {
  // Owns: search query, active filter, scroll position, loading state
  // Does NOT own: the exercise database (fetched once at app level or via React Query)
  // Does NOT own: the builder's exercise list
};
```

The `<ExerciseRolodex>` component becomes a pure controlled component. Both Workout Planner and Boot Camp Creator pass their own `onExerciseSelect` callback. The exercise database is fetched once via React Query with a shared cache key (`['exercises']`), not re-fetched per surface.

---

### F-005 — React.memo / useCallback Gaps

**Severity:** 🟠 High

**File/Component:** Message list rendering, Exercise Rolodex list items, Conversation sidebar items

**Issue:**

The brief describes several high-frequency render scenarios:

1. **Message streaming:** AI responses stream token-by-token. If the message list is not memoized, every token causes the entire list to re-render, including already-completed messages.
2. **Rolodex scroll:** 840+ exercises in the database. Even with virtualization, if list item components are not memoized, scroll performance on iPhone XR (the primary test device) will be unacceptable.
3. **Sidebar conversation list:** Each conversation item re-renders when any conversation's `lastMessage` updates (e.g., during streaming of the active conversation).

None of these are addressed in the plan.

**Recommended Fix:**

```typescript
// Message items must be memoized with stable identity
const MessageItem = React.memo(({ message }: { message: Message }) => {
  // ...
}, (prev, next) => prev.message.id === next.message.id && prev.message.content === next.message.content);

// Streaming message is the ONLY item that should re-render during stream
// Separate it from the completed message list:
const MessageList = () => {
  const { completedMessages, streamingMessage } = useAIChat(conversationId);
  
  return (
    <>
      {completedMessages.map(msg => <MessageItem key={msg.id} message={msg} />)}
      {streamingMessage && <StreamingMessageItem content={streamingMessage} />}
    </>
  );
};

// Exercise Rolodex requires virtualization — react-window or @tanstack/virtual
// 840 items × unvirtualized DOM = guaranteed jank on iPhone XR

// Sidebar items
const ConversationSidebarItem = React.memo(({ conversation, isActive, onSelect }) => {
  const handleSelect = useCallback(() => onSelect(conversation.id), [conversation.id, onSelect]);
  // ...
});
```

---

### F-006 — File Budget Violations (Projected)

**Severity:** 🟠 High

**File/Component:** Multiple

**Issue:**

Based on the feature scope described, the following files will almost certainly exceed 300 lines if implemented as implied:

| File (implied) | Projected Lines | Reason |
|---|---|---|
| `CoachAssistant.tsx` | 500–700 | Sidebar + chat + voice + actions + markdown rendering + overlay management |
| `WorkoutPlannerPage.tsx` | 600–900 | Rolodex + builder + saved plans + client selector + teach mode |
| `EquipmentProfilesPage.tsx` | 500–700 | Scan flow + batch upload + CRUD table + location management + AI identification |
| `UniversalMasterSchedule.tsx` | 400–600 | 24hr calendar + multi-user + permission scoping + 30/45/60 min slots |
| `ContentStudioPage.tsx` | 700–1000 | 10+ tabs + video upload + exercise metadata + badge creator + calendar |
| `useCoachAssistant.ts` | 350–500 | Orchestrating chat + voice + sidebar + streaming + error handling |

**Recommended Fix:**

Enforce the following decomposition rules before implementation begins:

```
WorkoutPlannerPage.tsx (~150 lines — layout and composition only)
  ├── ExerciseRolodex/
  │     ├── ExerciseRolodex.tsx (~120 lines)
  │     ├── ExerciseRolodexItem.tsx (~60 lines)
  │     └── useExerciseRolodex.ts (~100 lines)
  ├── WorkoutBuilder/
  │     ├── WorkoutBuilder.tsx (~150 lines)
  │     ├── WorkoutBuilderExerciseRow.tsx (~80 lines)
  │     └── useWorkoutBuilder.ts (~120 lines)
  ├── SavedPlans/
  │     ├── SavedPlansList.tsx (~100 lines)
  │     ├── SavedPlanCard.tsx (~80 lines)
  │     ├── SavedPlanDetailModal.tsx (~120 lines)
  │     └── useSavedPlans.ts (~100 lines)
  └── ClientSelector/
        └── ClientSelector.tsx (~80 lines)
```

The page component becomes a layout shell. No business logic lives in it.

---

### F-007 — Error Boundary Placement

**Severity:** 🟠 High

**File/Component:** Multiple surfaces

**Issue:**

The brief documents a `styled-components` runtime error in `RemotionTemplateGallery.tsx:482:51` that "breaks navigation expectations" and dumps the user somewhere unrelated. This is a missing error boundary. The brief also describes AI terminal overlays getting stuck — another error boundary gap. Currently, a single component crash propagates up to the nearest React error boundary, which is likely the root, causing full-page crashes.

**Recommended Fix:**

Place error boundaries at these specific boundaries:

```typescript
// 1. Each major workspace tab — prevents tab crash from killing the whole workspace
<ErrorBoundary fallback={<WorkspaceTabError tabName="Motion Templates" />}>
  <RemotionTemplateGallery />
</ErrorBoundary>

// 2. Each AI terminal variant — prevents AI crash from killing the parent page
<ErrorBoundary fallback={<AITerminalError onRetry={resetTerminal} />}>
  <CoachAssistantTerminal />
</ErrorBoundary>

// 3. The Rolodex — exercise database fetch failure should not kill the builder
<ErrorBoundary fallback={<RolodexError onRetry={refetchExercises} />}>
  <ExerciseRolodex />
</ErrorBoundary>

// 4. Each dashboard widget — widget crash should not kill the dashboard
<ErrorBoundary fallback={<WidgetError widgetName={widget.name} />}>
  <DashboardWidget config={widget} />
</ErrorBoundary>

// 5. Equipment scan flow — camera/upload failure should not kill the profile page
<ErrorBoundary fallback={<ScanError onFallbackToManual={switchToManualEntry} />}>
  <EquipmentScanFlow />
</ErrorBoundary>
```

The `RemotionTemplateGallery` crash specifically needs a boundary that (a) catches the styled-components error, (b) renders a fallback within the Content Studio tab, and (c) does NOT navigate away. The current behavior of "dumps the user somewhere unrelated" means the error is propagating past a router-level boundary that triggers a redirect.

---

### F-008 — Hook Separation Violations

**Severity:** 🟠 High

**File/Component:** `useCoachAssistant` (implied monolith)

**Issue:**

The brief implies `useCoachAssistant` handles: conversation management, message streaming, voice input, text-

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
