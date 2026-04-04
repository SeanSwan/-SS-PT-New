# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 67.6s
> **Files:** docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 2:43:41 AM

---

# Architectural Review: TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2025
**Verdict:** ⚠️ **PLAN REQUIRES SIGNIFICANT ARCHITECTURAL REVISION BEFORE IMPLEMENTATION**

---

## Executive Summary

The plan addresses a genuine product gap (shallow content) but is written as a **content strategy document masquerading as a technical plan**. It lacks component decomposition, state management design, data flow specification, and hook architecture entirely. The architectural risks identified below are inferred from what the plan *implies* will need to be built, cross-referenced against the SwanStudios stack. Several implied approaches will cause production issues if implemented naively.

---

## Finding 1: No Component Decomposition Specified

**Severity:** 🔴 CRITICAL
**File:** `frontend/src/content/teach-me/index.ts` (implied monolith)

### Issue
The plan proposes adding 15 new sections and deeply expanding 12 existing bootcamp format entries — all apparently into a single `index.ts` content file. A single TypeScript file containing 27 sections × ~9 subsections each, with coaching cues, timing breakdowns, BPM recommendations, and scaling tips, will exceed **3,000–5,000 lines**. This violates the 300-line budget catastrophically and makes the file unmaintainable, unsearchable, and a merge-conflict nightmare.

### Recommended Fix

```
frontend/src/content/teach-me/
├── index.ts                          # Re-exports only, <50 lines
├── types.ts                          # TeachMeSection, TeachMeEntry, etc.
├── bootcamp-formats/
│   ├── index.ts                      # Aggregates all 12 formats
│   ├── emom.ts                       # ~120 lines each
│   ├── amrap.ts
│   ├── tabata.ts
│   ├── circuit.ts
│   ├── ... (one file per format)
├── exercise-detail/
│   ├── index.ts
│   ├── coaching-cues.ts
│   ├── compensations.ts
│   ├── breathing-patterns.ts
├── new-sections/
│   ├── build-modes.ts
│   ├── floor-mode.ts
│   ├── rpe-scale.ts
│   ├── warm-up-protocol.ts
│   ├── cool-down-protocol.ts
│   ├── opt-phases.ts
│   ├── gamification-guide.ts
│   ├── social-features-guide.ts
│   ├── ... (one file per section)
└── contextual-registry.ts            # Maps UI context → section key
```

**Each format file should export a typed constant:**

```typescript
// frontend/src/content/teach-me/bootcamp-formats/emom.ts
import type { BootcampFormatEntry } from '../types';

export const emomFormat: BootcampFormatEntry = {
  id: 'emom',
  name: 'EMOM',
  tagline: 'Every Minute On The Minute — 60s cycles',
  howItWorks: {
    steps: [
      'Set a countdown timer for total class duration (typically 20–40 min)',
      'At the top of each minute, participants begin their assigned exercise',
      // ...
    ],
  },
  timingBreakdown: {
    workSeconds: 40,
    restSeconds: 20,
    roundsTypical: 20,
    totalMinutes: 20,
    transitionNotes: 'Rest IS the transition — no separate rotation needed',
  },
  whenToUse: {
    classGoals: ['metabolic conditioning', 'skill practice under fatigue'],
    fitnessLevels: ['intermediate', 'advanced'],
    equipmentRequired: ['minimal — single station per person'],
  },
  coachingCues: {
    start: '"3-2-1, GO! First rep NOW!"',
    transition: '"10 seconds — finish strong, get ready!"',
    stop: '"TIME! Rest, breathe, next minute starts at the top."',
  },
  rotationPattern: 'none' as const,
  commonMistakes: [
    'Starting the clock before everyone understands the movement',
    // ...
  ],
  scalingTips: {
    small: '6–8 people: individual EMOMs, coach circulates',
    large: '15–20 people: partner EMOMs, alternating work',
  },
  musicBPM: { min: 128, max: 140, rationale: 'Matches 40s work burst energy' },
} as const;
```

---

## Finding 2: Missing Type System — Content Will Be Untyped

**Severity:** 🔴 CRITICAL
**File:** `frontend/src/content/teach-me/types.ts` (does not exist in plan)

### Issue
The plan adds 9 new subsections per bootcamp format and 15 new top-level sections with no TypeScript interface design. Without a shared type contract, different developers will implement `coachingCues` as a string in one format and an object in another. The exercise Teach Me pulling from the database (Phase 2) will have a completely different shape than static content. The contextual rendering system (Phase 4) cannot be built without a discriminated union or registry type.

### Recommended Fix

```typescript
// frontend/src/content/teach-me/types.ts

export type TeachMeSectionKey =
  | 'bootcampFormats'
  | 'exerciseDetail'
  | 'buildModes'
  | 'floorMode'
  | 'exerciseRegressions'
  | 'painModifications'
  | 'equipmentProfile'
  | 'classPlanningStrategy'
  | 'boardOneVsTwo'
  | 'overflowPlan'
  | 'fiftyFiveMinuteRule'
  | 'rpeScale'
  | 'warmUpProtocol'
  | 'coolDownProtocol'
  | 'clientAssessment'
  | 'gamificationGuide'
  | 'socialFeaturesGuide';

export type TeachMeContentSource = 'static' | 'database' | 'hybrid';

export interface TeachMeSection {
  key: TeachMeSectionKey;
  title: string;
  source: TeachMeContentSource;
  // Static sections resolve immediately
  content?: TeachMeSectionContent;
  // Database sections need async resolution
  fetchContent?: (context: TeachMeContext) => Promise<TeachMeSectionContent>;
}

export interface TeachMeContext {
  exerciseId?: string;
  formatId?: string;
  optPhase?: OPTPhase;
  clientId?: string;
  boardNumber?: 1 | 2;
}

export type OPTPhase = 1 | 2 | 3 | 4 | 5;

export interface BootcampFormatEntry {
  id: string;
  name: string;
  tagline: string;
  howItWorks: { steps: string[] };
  timingBreakdown: TimingBreakdown;
  whenToUse: WhenToUse;
  coachingCues: CoachingCues;
  rotationPattern: RotationPattern;
  commonMistakes: string[];
  scalingTips: ScalingTips;
  musicBPM: MusicBPMRange;
}

export type RotationPattern =
  | 'none'
  | 'sequential'
  | 'random'
  | 'partner-swap'
  | 'wave';

// ... (full type definitions for each subsection shape)
```

---

## Finding 3: Phase 2 Database Pull — Race Condition & Stale State Risk

**Severity:** 🔴 CRITICAL
**File:** Implied hook (unnamed in plan) + exercise detail component

### Issue
Phase 2 states: *"Pull real descriptions from the database when available."* This implies async content fetching inside what is currently a synchronous content lookup. The plan does not specify:

- How the component handles the loading state between static fallback and database content arriving
- What happens if the user clicks a different exercise before the first fetch resolves (classic race condition)
- Whether fetched content is cached (every exercise click = network request?)
- How this interacts with the existing `useAIChat` / `useCoachAssistant` hook chain

**Concrete race condition scenario:**
1. User clicks Exercise A → fetch starts
2. User immediately clicks Exercise B → fetch starts
3. Exercise B fetch resolves first → content renders
4. Exercise A fetch resolves → **overwrites Exercise B content with stale data**

### Recommended Fix

```typescript
// frontend/src/hooks/useTeachMeContent.ts
// Separate hook — data fetching only, no UI state

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TeachMeContext, TeachMeSectionContent } from '../content/teach-me/types';

interface UseTeachMeContentState {
  content: TeachMeSectionContent | null;
  isLoading: boolean;
  error: Error | null;
  source: 'static' | 'database' | null;
}

export function useTeachMeContent(
  sectionKey: TeachMeSectionKey | null,
  context: TeachMeContext
) {
  const [state, setState] = useState<UseTeachMeContentState>({
    content: null,
    isLoading: false,
    error: null,
    source: null,
  });

  // Abort controller ref — cancels in-flight requests on context change
  const abortRef = useRef<AbortController | null>(null);

  // Stable cache ref — avoids re-fetching same exercise
  const cacheRef = useRef<Map<string, TeachMeSectionContent>>(new Map());

  const loadContent = useCallback(async () => {
    if (!sectionKey) return;

    const cacheKey = `${sectionKey}:${context.exerciseId ?? 'none'}`;

    // Return cached content immediately — no loading flash
    if (cacheRef.current.has(cacheKey)) {
      setState({
        content: cacheRef.current.get(cacheKey)!,
        isLoading: false,
        error: null,
        source: 'database',
      });
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const section = teachMeRegistry[sectionKey];

    if (section.source === 'static' && section.content) {
      // Synchronous path — no race condition possible
      setState({ content: section.content, isLoading: false, error: null, source: 'static' });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const content = await section.fetchContent!(context);
      // Guard: if aborted, this component/context has moved on
      if (!abortRef.current.signal.aborted) {
        cacheRef.current.set(cacheKey, content);
        setState({ content, isLoading: false, error: null, source: 'database' });
      }
    } catch (err) {
      if (!abortRef.current.signal.aborted) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Content load failed'),
        }));
      }
    }
  }, [sectionKey, context.exerciseId, context.formatId, context.optPhase]);

  useEffect(() => {
    loadContent();
    return () => abortRef.current?.abort();
  }, [loadContent]);

  return state;
}
```

---

## Finding 4: Hook Composition — useCoachAssistant Scope Creep Risk

**Severity:** 🟠 HIGH
**File:** `useCoachAssistant` (existing hook, implied expansion)

### Issue
Phase 2 and Phase 4 imply that Teach Me content will be contextually triggered — meaning the AI coach assistant will need to know *what the trainer is looking at* to surface the right Teach Me section. If this context awareness is added to `useCoachAssistant`, that hook will own: AI chat state, conversation history, Teach Me section selection, exercise context, format context, OPT phase context, and UI panel state. This violates single-responsibility and will cause the hook to re-render its entire consumer tree whenever any piece of context changes.

The plan's implied hook chain `useCoachAssistant → useAIChat → useConversationSidebar` does not include a Teach Me layer, meaning Teach Me context will either be:
- **Prop-drilled** from a parent that owns both workout builder state and Teach Me state (deep prop drilling)
- **Stuffed into useCoachAssistant** (scope creep, re-render cascade)
- **Left disconnected** (Phase 4 contextual wiring never actually happens)

### Recommended Fix

Introduce a dedicated context layer for Teach Me, separate from the AI coach hook chain:

```typescript
// frontend/src/contexts/TeachMeContext.tsx
// UI state only — which section is active, what context triggered it

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { TeachMeSectionKey, TeachMeContext as ContentContext } from '../content/teach-me/types';

interface TeachMeUIState {
  activeSectionKey: TeachMeSectionKey | null;
  contentContext: ContentContext;
  isPanelOpen: boolean;
  triggerSource: 'exercise-click' | 'format-select' | 'phase-select' | 'manual' | null;
}

type TeachMeAction =
  | { type: 'OPEN_FOR_EXERCISE'; exerciseId: string }
  | { type: 'OPEN_FOR_FORMAT'; formatId: string }
  | { type: 'OPEN_FOR_PHASE'; optPhase: OPTPhase }
  | { type: 'OPEN_SECTION'; sectionKey: TeachMeSectionKey }
  | { type: 'CLOSE_PANEL' };

// Reducer keeps state transitions explicit and testable
function teachMeReducer(state: TeachMeUIState, action: TeachMeAction): TeachMeUIState {
  switch (action.type) {
    case 'OPEN_FOR_EXERCISE':
      return {
        ...state,
        activeSectionKey: 'exerciseDetail',
        contentContext: { exerciseId: action.exerciseId },
        isPanelOpen: true,
        triggerSource: 'exercise-click',
      };
    case 'OPEN_FOR_FORMAT':
      return {
        ...state,
        activeSectionKey: 'bootcampFormats',
        contentContext: { formatId: action.formatId },
        isPanelOpen: true,
        triggerSource: 'format-select',
      };
    // ... other cases
    case 'CLOSE_PANEL':
      return { ...state, isPanelOpen: false, triggerSource: null };
    default:
      return state;
  }
}

const TeachMeStateContext = createContext<TeachMeUIState | null>(null);
const TeachMeDispatchContext = createContext<React.Dispatch<TeachMeAction> | null>(null);

export function TeachMeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(teachMeReducer, {
    activeSectionKey: null,
    contentContext: {},
    isPanelOpen: false,
    triggerSource: null,
  });

  return (
    <TeachMeStateContext.Provider value={state}>
      <TeachMeDispatchContext.Provider value={dispatch}>
        {children}
      </TeachMeDispatchContext.Provider>
    </TeachMeStateContext.Provider>
  );
}

// Split contexts prevent re-renders in dispatch-only consumers
export const useTeachMeState = () => {
  const ctx = useContext(TeachMeStateContext);
  if (!ctx) throw new Error('useTeachMeState must be inside TeachMeProvider');
  return ctx;
};

export const useTeachMeDispatch = () => {

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
