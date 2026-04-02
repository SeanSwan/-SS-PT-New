# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 76.1s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

# Architectural Review: Bootcamp Sprint Planner + Pain Chart + Calendar

**Reviewer:** Senior React/TypeScript Architect
**Platform:** SwanStudios (sswanstudios.com)
**Theme:** Enchanted Apex — Crystalline Swan
**Date:** 2025

---

## Executive Summary

The plan is **architecturally ambitious and largely sound** in its domain modeling, but contains **critical gaps** in frontend component decomposition, hook composition, state management strategy, and file budget discipline. Several proposed components will balloon to 600–900 lines without intervention. The hook hierarchy is underspecified, creating real risk of circular dependencies and stale closure bugs. Error boundary placement is entirely absent. The pain chart layered image system needs a concrete rendering strategy before implementation begins.

**Overall Risk Rating:** 🟡 Medium-High — Proceed with the fixes below before writing code.

---

## Finding Index

| # | Severity | Area | File/Component |
|---|----------|------|----------------|
| F-01 | 🔴 Critical | Component Decomposition | `SprintPlannerPage` |
| F-02 | 🔴 Critical | File Budget | `SprintDetailPanel` |
| F-03 | 🔴 Critical | State Management | Hook hierarchy (unspecified) |
| F-04 | 🔴 Critical | Data Flow | Sprint generation race condition |
| F-05 | 🟠 High | Component Decomposition | `BootcampCalendar` |
| F-06 | 🟠 High | Hook Design | Pain chart layer state |
| F-07 | 🟠 High | React Patterns | Calendar cell re-renders |
| F-08 | 🟠 High | Error Boundaries | Entirely absent from plan |
| F-09 | 🟠 High | Data Flow | Calendar dual-source merge |
| F-10 | 🟡 Medium | Hook Design | `useSprintGeneration` missing |
| F-11 | 🟡 Medium | File Budget | `BodyMapLayered` |
| F-12 | 🟡 Medium | State Management | Sprint wizard form state |
| F-13 | 🟡 Medium | React Patterns | `SprintDetailPanel` memo gaps |
| F-14 | 🟡 Medium | Data Flow | Pain entry staleness in AI context |
| F-15 | 🟢 Low | Hook Design | Cross-sprint exercise memory query |
| F-16 | 🟢 Low | Component Decomposition | `SprintCalendarView` / `BootcampCalendar` overlap |
| F-17 | 🟢 Low | File Budget | Sprint generation API service |

---

## F-01 🔴 Critical — Component Decomposition: `SprintPlannerPage`

**File:** `frontend/src/pages/SprintPlannerPage.tsx`

**Issue:**
The plan assigns to a single page component: sprint creation wizard, timeline view of 12 weeks, week expansion, "Generate All" trigger, and progress indicator. This is **4–5 distinct UI concerns** in one file. Estimated line count: **700–1000 lines** before styled-components. The wizard alone (duration, frequency, rotation, format, progression strategy — 5+ fields with validation) is a standalone feature.

**Recommended Fix:**

Decompose into this tree:

```
src/
  pages/
    SprintPlannerPage.tsx          ← orchestration only, ~120 lines
  features/
    sprint-planner/
      components/
        SprintCreationWizard/
          SprintCreationWizard.tsx       ← wizard shell + step router, ~150 lines
          steps/
            Step1_BasicConfig.tsx        ← duration, name, dates, ~100 lines
            Step2_FrequencyPattern.tsx   ← classes/week, day picker, ~120 lines
            Step3_FocusRotation.tsx      ← dayType rotation builder, ~130 lines
            Step4_ProgressionStrategy.tsx ← strategy selector + preview, ~100 lines
          SprintCreationWizard.types.ts  ← WizardFormData, StepProps interfaces
        SprintTimeline/
          SprintTimeline.tsx             ← 12-week accordion list, ~150 lines
          SprintWeekRow.tsx              ← one week row (collapsed), ~80 lines
          SprintWeekExpanded.tsx         ← expanded week with day cards, ~120 lines
          SprintDayCard.tsx              ← single class slot card, ~100 lines
        SprintProgressBar.tsx            ← X of Y generated/taught, ~60 lines
        SprintGenerateButton.tsx         ← "Generate All" with loading states, ~80 lines
      hooks/
        useSprintWizard.ts              ← wizard step state + validation
        useSprintTimeline.ts            ← week expand/collapse, selected slot
        useSprintGeneration.ts          ← generation trigger + SSE progress
      types/
        sprint.types.ts
```

**Rule:** `SprintPlannerPage` imports only `SprintCreationWizard`, `SprintTimeline`, `SprintProgressBar`. Zero business logic in the page file.

---

## F-02 🔴 Critical — File Budget: `SprintDetailPanel`

**File:** `frontend/src/features/sprint-planner/components/SprintDetailPanel.tsx` (proposed as single file)

**Issue:**
The plan describes `SprintDetailPanel` as showing: day cards with format/style/dayType, exercise preview per class, "Mark as Taught" button, edit/regenerate per class. This is a **panel that contains a list of cards, each with interactive sub-components**. Single-file implementation will reach **500–700 lines**.

**Recommended Fix:**

```
SprintDetailPanel/
  SprintDetailPanel.tsx          ← panel shell, header, list container, ~100 lines
  SprintDayCard.tsx              ← card layout (format badge, style, dayType), ~120 lines
  ExercisePreviewList.tsx        ← collapsible exercise list per station, ~100 lines
  MarkAsTaughtButton.tsx         ← button + confirmation modal trigger, ~80 lines
  RegenerateClassButton.tsx      ← regenerate single slot + optimistic update, ~80 lines
  SprintDetailPanel.hooks.ts     ← useSlotActions (mark taught, regenerate), ~100 lines
```

**Additional concern:** "Mark as Taught" requires a confirmation step (date picker for `usedDate`, participant count). This is a **modal**, not a button. Plan it as `MarkAsTaughtModal.tsx` (~120 lines) from the start.

---

## F-03 🔴 Critical — State Management: Hook Hierarchy Unspecified

**Files:** All `features/sprint-planner/hooks/`, `features/bootcamp-calendar/hooks/`, `features/pain-chart/hooks/`

**Issue:**
The plan references the existing `useCoachAssistant → useAIChat → useConversationSidebar` composition but **proposes no equivalent hook hierarchy for the three new features**. This is the most dangerous gap. Without a defined composition contract, developers will:

1. Put server state (React Query) and UI state (useState) in the same hook
2. Create circular imports between `useSprintGeneration` and `useSprintTimeline`
3. Prop-drill sprint ID through 4 component levels

**Recommended Fix — Explicit Hook Layers:**

```
Layer 1: Server State (React Query / SWR)
  useSprintQuery(sprintId)          ← GET /api/bootcamp/sprints/:id
  useSprintListQuery(trainerId)     ← GET /api/bootcamp/sprints
  useSprintMutation()               ← POST/PUT/DELETE sprints
  useSlotMutation(sprintId)         ← PUT slots, confirm, regenerate
  useCalendarQuery(month, year)     ← merged sprint + ad-hoc data
  usePainEntriesQuery(clientId)     ← active pain entries

Layer 2: Business Logic (pure computation, no React state)
  useSprintProgressionCalc(sprint)  ← compute intensity modifiers per week
  useExerciseMemoryDiff(prev, curr) ← cross-sprint exclusion set
  useCalendarMerge(sprintSlots, adhocLogs) ← merge + sort calendar data

Layer 3: UI State (useState/useReducer, no API calls)
  useSprintWizard()                 ← step index, form data, validation
  useSprintTimeline()               ← expanded weeks set, selected slot
  useCalendarNavigation()           ← current month/year, view mode
  usePainChartLayers()              ← gender, view (muscle/skeletal), labels toggle

Layer 4: Composition (combines layers 1-3, used by page components)
  useSprintPlanner(sprintId)        ← composes query + timeline + mutations
  useBootcampCalendar(month, year)  ← composes query + navigation + merge
  usePainChartEditor(clientId)      ← composes query + layer state + mutations
```

**Composition rule:** Layer 4 hooks are the **only** hooks imported by page/feature components. Layer 1–3 hooks are internal to Layer 4. This prevents circular dependencies because data always flows: API → business logic → UI state → render.

**Circular dependency risk to avoid:**

```typescript
// ❌ DANGEROUS — useSprintGeneration imports useSprintTimeline
// which imports useSprintGeneration for "regenerate" action
// This creates a circular module dependency

// ✅ CORRECT — both are imported by the Layer 4 composition hook
// useSprintPlanner.ts
export function useSprintPlanner(sprintId: string) {
  const query = useSprintQuery(sprintId);           // Layer 1
  const timeline = useSprintTimeline();              // Layer 3
  const mutation = useSprintMutation();              // Layer 1
  const generation = useSprintGeneration(sprintId); // Layer 2/3
  
  return { query, timeline, mutation, generation };
}
```

---

## F-04 🔴 Critical — Data Flow: Sprint Generation Race Condition

**Files:** `backend/services/sprintGenerationService.ts`, `frontend/src/features/sprint-planner/hooks/useSprintGeneration.ts`

**Issue:**
The plan describes generating **all classes for a sprint** sequentially, where each class's exercise keys are added to `exerciseMemory` before the next class is generated. If this is implemented as parallel API calls or if the frontend polls while the backend is mid-generation, there are two race conditions:

**Race Condition A — Parallel generation requests:**
```
Week 1 Class 1 generates → exerciseMemory = [squat, lunge]
Week 1 Class 2 generates → exerciseMemory = [squat, lunge]  ← stale read!
Both classes use same exercises because Class 2 read before Class 1 wrote
```

**Race Condition B — Frontend stale state:**
```
User clicks "Generate All" → request fires
User clicks "Regenerate Class 3" → second request fires
Class 3 regenerates with OLD exerciseMemory (before generation completed)
exerciseMemory is now inconsistent
```

**Recommended Fix:**

**Backend:** Generation MUST be a single atomic job, not per-class API calls:

```typescript
// backend/services/sprintGenerationService.ts
export class SprintGenerationService {
  async generateAllClasses(sprintId: string): Promise<void> {
    const sprint = await BootcampSprint.findByPk(sprintId);
    
    // Lock the sprint during generation
    await sprint.update({ status: 'generating' });
    
    const slots = await SprintClassSlot.findAll({
      where: { sprintId },
      order: [['scheduledDate', 'ASC']], // MUST be sequential
    });
    
    // Accumulate memory in-process, not via DB reads between iterations
    const sessionMemory = new Set<string>(sprint.exerciseMemory ?? []);
    
    for (const slot of slots) {  // Sequential, not Promise.all
      const template = await this.generateSingleClass(slot, sessionMemory);
      const exerciseKeys = extractExerciseKeys(template);
      
      exerciseKeys.forEach(k => sessionMemory.add(k));
      
      // Single write per slot, memory written atomically at end
      await slot.update({ 
        templateId: template.id, 
        exerciseKeys,
        status: 'generated' 
      });
    }
    
    // Single atomic write of final memory state
    await sprint.update({ 
      exerciseMemory: Array.from(sessionMemory),
      status: 'active'
    });
  }
}
```

**Frontend:** Use SSE (Server-Sent Events) for progress, not polling:

```typescript
// useSprintGeneration.ts
export function useSprintGeneration(sprintId: string) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const startGeneration = useCallback(async () => {
    setIsGenerating(true);
    
    // Trigger generation job
    await api.post(`/api/bootcamp/sprints/${sprintId}/generate`);
    
    // Subscribe to progress stream
    const es = new EventSource(
      `/api/bootcamp/sprints/${sprintId}/generation-progress`
    );
    eventSourceRef.current = es;
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as GenerationProgressEvent;
      setProgress(data);
      
      if (data.status === 'complete' || data.status === 'error') {
        es.close();
        setIsGenerating(false);
        // Invalidate query to refetch fresh sprint data
        queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] });
      }
    };
    
    es.onerror = () => {
      es.close();
      setIsGenerating(false);
    };
  }, [sprintId, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  // Prevent regeneration while generating
  const canRegenerate = !isGenerating;

  return { startGeneration, progress, isGenerating, canRegenerate };
}
```

**Additional guard:** The "Regenerate Single Class" endpoint must check `sprint.status !== 'generating'` and return 409 Conflict if locked.

---

## F-05 🟠 High — Component Decomposition: `BootcampCalendar`

**File:** `frontend/src/features/bootcamp-calendar/components/BootcampCalendar.tsx` (proposed as single component)

**Issue:**
The plan shows `BootcampCalendar` handling: month view grid, week view, list view, day detail slide-out panel, "Was this taught?" toggle, participant count entry, energy level, rating, and quick-add. This is **a full application feature** described as one component. Estimated: **800–1200 lines**.

**Recommended Fix:**

```
features/
  bootcamp-calendar/
    components/
      BootcampCalendar.tsx              ← view router + navigation header, ~100 lines
      CalendarHeader.tsx                ← month/year nav, view mode toggle, ~80 lines
      views/
        MonthView/
          MonthView.tsx                 ← 7-col grid, ~100 lines
          MonthDayCell.tsx              ← single day cell with badge, ~80 lines
          ClassBadge.tsx                ← colored dot + abbreviations, ~60 lines
        WeekView/
          WeekView.tsx                  ← 7-col expanded, ~100 lines
          WeekDayColumn.tsx             ← one day's class cards, ~100 lines
        ListView/
          ListView.tsx                  ← chronological list, ~80 lines
          ListClassRow.tsx              ← one class row, ~80 lines
      panels/
        DayDetailPanel.tsx              ← slide-out shell, ~100 lines
        ClassDetailCard.tsx             ← class info display, ~120 lines
        TeachConfirmForm.tsx            ← wasUsed toggle +

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
