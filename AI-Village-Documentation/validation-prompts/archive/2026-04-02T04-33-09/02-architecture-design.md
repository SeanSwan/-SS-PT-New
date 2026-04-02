# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 71.6s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

# Architectural Review: Bootcamp Creator Upgrade Plan

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-04-02
**Document:** `docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md`

---

## Executive Summary

The plan is **architecturally sound in intent but has 11 significant issues** ranging from critical race conditions to missing error boundaries. The component decomposition is good but incomplete. The hook composition section is the weakest area — the plan references `useCoachAssistant → useAIChat → useConversationSidebar` without defining them for the bootcamp context, creating an integration gap. The backend decomposition is well-reasoned. Recommend addressing SEV-1 and SEV-2 items before Phase 0 begins.

---

## Finding 1: Missing Hook Architecture for Coach Assistant Embed

**Severity:** 🔴 SEV-1 — Critical
**File:** `hooks/useBootcampGeneration.ts` + `BootcampAIInsights.tsx`

### Issue

The plan says "embed mini Coach Assistant in right pane" and leans toward Option C (`AITerminalPanel`) but never defines the hook composition for this integration. The existing `useCoachAssistant → useAIChat → useConversationSidebar` chain was designed for a standalone chat page. Embedding it inside `BootcampBuilderPage` creates:

1. **Context collision** — `useCoachAssistant` likely manages its own conversation state. When mounted inside `BootcampBuilderPage`, the bootcamp state (current class, stations, exercises) must flow *into* the chat context, but the existing hook has no injection point for external domain context.
2. **Circular dependency risk** — If `useBootcampGeneration` calls the AI and `useCoachAssistant` also calls the AI, and both share a conversation thread, you get two hooks fighting over the same conversation state.
3. **Unmount/remount thrash** — If the trainer switches tabs (Config → Preview → AI Insights), the `AITerminalPanel` may unmount and lose conversation history.

### Recommended Fix

Define a **bootcamp-scoped AI context bridge** before any implementation begins:

```typescript
// hooks/useBootcampAIContext.ts
// Responsibility: Translate bootcamp state into AI context payload
// Does NOT own conversation state — that stays in useCoachAssistant

interface BootcampAIContext {
  currentClass: BootcampTemplate | null;
  stations: BootcampStation[];
  classStyle: ClassStyle;
  equipmentProfile: EquipmentProfile | null;
  participantFlags: InjuryFlags;
}

export function useBootcampAIContext(
  bootcampState: BootcampAIContext
): { systemPrompt: string; contextPayload: Record<string, unknown> } {
  return useMemo(() => ({
    systemPrompt: buildBootcampSystemPrompt(bootcampState),
    contextPayload: serializeBootcampContext(bootcampState),
  }), [bootcampState]);
}
```

Then `BootcampAIInsights.tsx` receives `contextPayload` as a prop and passes it to `AITerminalPanel` via an existing context injection prop (add one if it doesn't exist). The conversation state stays in `useCoachAssistant` — never duplicated.

**Hook composition should be:**
```
BootcampBuilderPage
  └── useBootcampGeneration (AI generation + class state)
  └── useBootcampFlow (timing calculations — pure, no side effects)
  └── useBootcampAIContext (derives AI context from class state — memoized)
        └── passed as prop to BootcampAIInsights
              └── AITerminalPanel (owns conversation via useCoachAssistant internally)
```

---

## Finding 2: Race Condition in AI Generation + Manual Edit Flow

**Severity:** 🔴 SEV-1 — Critical
**File:** `hooks/useBootcampGeneration.ts`

### Issue

The plan describes a 3-brain Hive Mind pipeline (Gemini Flash → Qwen → Gemini Pro) that is inherently sequential and slow (likely 8-15 seconds total). Simultaneously, the Coach Assistant can "adjust the generated class in real-time." This creates a classic race condition:

```
T=0:  Trainer clicks "Generate Class" → Hive Mind pipeline starts
T=3:  Trainer types "Make station 3 harder" → Coach AI responds, mutates class
T=8:  Gemini Pro finalizes → overwrites Coach AI's changes
```

The plan has no mechanism to prevent this. There is also no mention of an `AbortController` for in-flight requests.

### Recommended Fix

```typescript
// hooks/useBootcampGeneration.ts

type GenerationStatus = 
  | 'idle' 
  | 'generating'      // Hive Mind pipeline running
  | 'ai_editing'      // Coach Assistant making changes
  | 'ready'           // Class ready for trainer review
  | 'error';

interface GenerationState {
  status: GenerationStatus;
  lockReason: string | null;  // Human-readable lock explanation
  abortController: AbortController | null;
}

// Lock pattern: Coach Assistant checks status before mutating
function useBootcampGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    lockReason: null,
    abortController: null,
  });

  const generateClass = useCallback(async (config: BootcampConfig) => {
    // Cancel any in-flight request
    state.abortController?.abort();
    const controller = new AbortController();
    
    setState(prev => ({ 
      ...prev, 
      status: 'generating', 
      lockReason: 'AI Hive Mind is generating your class...',
      abortController: controller 
    }));

    try {
      const result = await runHiveMindPipeline(config, controller.signal);
      setState(prev => ({ ...prev, status: 'ready', lockReason: null }));
      return result;
    } catch (err) {
      if (err.name === 'AbortError') return; // Intentional cancel
      setState(prev => ({ ...prev, status: 'error' }));
    }
  }, [state.abortController]);

  // Coach Assistant must check isLocked before mutating
  const isLocked = state.status === 'generating';
  
  return { ...state, generateClass, isLocked };
}
```

The `BootcampAIInsights` component must disable the chat input and show a spinner when `isLocked === true`.

---

## Finding 3: `BootcampBuilderPage.tsx` Will Exceed 300 Lines Even After Decomposition

**Severity:** 🟠 SEV-2 — High
**File:** `BootcampBuilderPage.tsx`

### Issue

The plan calls `BootcampBuilderPage.tsx` an "orchestrator, <300 lines" but then assigns it responsibility for:
- Rendering 3 panes (Config, Preview, AI Insights)
- Managing format selection state
- Handling equipment profile selection
- Coordinating AI generation
- Managing Board 1/Board 2 toggle state
- Floor mode toggle
- PDF export trigger
- Error state display

Even with child components handling rendering, the orchestrator will have 15-20 state variables, 8-10 callbacks, and 3 pane layout logic. Realistically **400-500 lines minimum**.

### Recommended Fix

Extract a **page-level state hook** that owns all coordinated state:

```typescript
// hooks/useBootcampBuilder.ts
// Owns ALL page-level state — BootcampBuilderPage becomes a pure layout shell

export function useBootcampBuilder() {
  // Config state
  const [classStyle, setClassStyle] = useState<ClassStyle>('standard');
  const [dayType, setDayType] = useState<DayType>('full_body');
  const [selectedEquipmentProfileId, setSelectedEquipmentProfileId] = useState<number | null>(null);
  
  // Generation state (delegated)
  const generation = useBootcampGeneration();
  
  // Flow state (delegated)
  const flow = useBootcampFlow(generation.currentClass);
  
  // AI context (delegated)
  const aiContext = useBootcampAIContext({ 
    currentClass: generation.currentClass,
    stations: generation.stations,
    classStyle,
    equipmentProfile: generation.equipmentProfile,
    participantFlags: generation.participantFlags,
  });

  // UI state
  const [activeBoard, setActiveBoard] = useState<'main' | 'alternative'>('main');
  const [isFloorMode, setIsFloorMode] = useState(false);
  const [activePane, setActivePane] = useState<'config' | 'preview' | 'ai'>('config');

  return {
    // Config
    classStyle, setClassStyle,
    dayType, setDayType,
    selectedEquipmentProfileId, setSelectedEquipmentProfileId,
    // Generation
    ...generation,
    // Flow
    flowWarnings: flow.warnings,
    // AI
    aiContext,
    // UI
    activeBoard, setActiveBoard,
    isFloorMode, setIsFloorMode,
    activePane, setActivePane,
  };
}
```

`BootcampBuilderPage.tsx` then becomes:

```tsx
// BootcampBuilderPage.tsx — ~80 lines, pure layout
export default function BootcampBuilderPage() {
  const builder = useBootcampBuilder();
  
  return (
    <PageLayout isFloorMode={builder.isFloorMode}>
      <BootcampConfigPanel {...configProps(builder)} />
      <BootcampClassPreview {...previewProps(builder)} />
      <BootcampAIInsights {...aiProps(builder)} />
    </PageLayout>
  );
}
```

---

## Finding 4: `BootcampExerciseRow.tsx` Will Exceed 300 Lines

**Severity:** 🟠 SEV-2 — High
**File:** `BootcampExerciseRow.tsx`

### Issue

A single exercise row must now render:
- Exercise name + muscle group
- Setup time badge
- Board indicator (main/alternative)
- Pyramid config (start weight, drop count) — conditional
- Superset config (order, group ID) — conditional
- 5 modification fields (knee/shoulder/back/wrist/ankle)
- Board 2 alternative exercise
- Flow warning indicator
- Edit/delete controls

That is 10+ distinct UI concerns in one component. Even with sub-components, the conditional rendering logic alone will push this past 300 lines.

### Recommended Fix

Split into a **compound component pattern**:

```
BootcampExerciseRow.tsx          (~120 lines) — layout shell + shared state
├── ExerciseRowHeader.tsx        (~80 lines)  — name, muscle, setup time, board badge
├── ExerciseRowModifications.tsx (~100 lines) — 5 mod fields, collapsible
├── ExerciseRowPyramidConfig.tsx (~80 lines)  — pyramid-specific fields (conditional)
├── ExerciseRowSupersetConfig.tsx (~80 lines) — superset-specific fields (conditional)
└── ExerciseRowAlternative.tsx   (~80 lines)  — Board 2 alternative display
```

`BootcampExerciseRow` uses a render-prop or compound component pattern:

```tsx
// BootcampExerciseRow.tsx
function BootcampExerciseRow({ exercise, classStyle, isExpanded, onToggle }: Props) {
  return (
    <ExerciseRowContainer>
      <ExerciseRowHeader exercise={exercise} onToggle={onToggle} />
      {isExpanded && (
        <>
          {classStyle === 'pyramid' && <ExerciseRowPyramidConfig exercise={exercise} />}
          {classStyle === 'superset' && <ExerciseRowSupersetConfig exercise={exercise} />}
          <ExerciseRowModifications exercise={exercise} />
          {exercise.board === 'main' && <ExerciseRowAlternative exercise={exercise} />}
        </>
      )}
    </ExerciseRowContainer>
  );
}
```

---

## Finding 5: `bootcampFlowOptimizer.mjs` Algorithm Has an Unhandled Edge Case

**Severity:** 🟠 SEV-2 — High
**File:** `backend/services/bootcamp/bootcampFlowOptimizer.mjs`

### Issue

The plan's flow algorithm states:
> "If ALL exercises have high setup time → add a bodyweight 'active wait' exercise"

But the plan doesn't define what happens when:
1. The class is at a **park** (no equipment) — all exercises are instant-setup, so the pairing algorithm has nothing to pair and may produce incorrect warnings
2. The class has **only 2 exercises per station** — pairing works, but the algorithm assumes 3+ exercises
3. A **pyramid station** has 1 exercise with multiple drop sets — the "setup time" concept doesn't apply the same way (you're already at the equipment)

Additionally, the algorithm as described is O(n²) for pairing — fine for 4-5 exercises per station, but the plan also introduces `hiit_circuit` with 8+ exercises. At 8 exercises, the pairing complexity is manageable, but the algorithm needs to be explicitly defined as a **greedy sort** (not a full combinatorial search) or it will be slow.

### Recommended Fix

```typescript
// bootcampFlowOptimizer.mjs

type FlowContext = 'gym' | 'park' | 'home';

interface FlowOptimizerConfig {
  exercises: BootcampExercise[];
  context: FlowContext;
  classStyle: ClassStyle;
}

function optimizeStationFlow(config: FlowOptimizerConfig): OptimizedStation {
  const { exercises, context, classStyle } = config;

  // Edge case 1: Park/home — no setup time concerns
  if (context === 'park' || context === 'home') {
    return { exercises, warnings: [], setupPairs: [] };
  }

  // Edge case 2: Pyramid — single exercise, setup time is one-time cost
  if (classStyle === 'pyramid') {
    return optimizePyramidStation(exercises);
  }

  // Edge case 3: Fewer than 2 exercises — no pairing possible
  if (exercises.length < 2) {
    const hasHighSetup = exercises[0]?.setupTimeSec > 20;
    return {
      exercises,
      warnings: hasHighSetup 
        ? [{ type: 'solo_high_setup', exerciseId: exercises[0].id }] 
        : [],
      setupPairs: [],
    };
  }

  // Standard case: Greedy sort — O(n log n), not O(n²)
  // Sort descending by setup time, pair first with last
  const sorted = [...exercises].sort((a, b) => b.setupTimeSec - a.setupTimeSec);
  const pairs: [BootcampExercise, BootcampExercise][] = [];
  
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    pairs.push([sorted[left], sorted[right]]);
    left++;
    right--;
  }

  // Resequence: low-setup first in each pair
  const resequenced = pairs.flatMap(([high, low]) => [low, high]);
  
  // Add middle element if odd count
  if (sorted.length % 2 !== 0) {
    resequenced.push(sorted[Math.floor(sorted.length / 2)]);
  }

  const warnings = detectFlowWarnings(resequenced);
  return { exercises: resequenced, warnings, setupPairs: pairs };
}
```

---

## Finding 6: `useBootcampFlow.ts` Hook Violates Separation of Concerns

**Severity:** 🟡 SEV-3 — Medium
**File:** `hooks/useBootcampFlow.ts`

### Issue

The plan assigns `useBootcampFlow` responsibility for "flow timing calculations" but the flow optimizer algorithm (Finding 5) is business logic that belongs on the **backend**. If `useBootcampFlow` re-implements the pairing algorithm client-

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
