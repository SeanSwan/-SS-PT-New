# Code Architecture (Qwen) — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 115.1s
> **Files:** AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/03-security-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/04-performance-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/05-competitive-intel.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/06-persona-alignment.md
> **Generated:** 4/6/2026, 7:48:02 PM

---

# SwanStudios Architecture Review: Documentation Analysis

**Important Note:** The provided files are documentation/validation reports (UX research, architecture design, security planning, etc.), not actual source code files. The architecture design file (02-architecture-design.md) explicitly states: *"The submitted document is a *planning/audit brief*, not an implementation specification. It contains no proposed file structures, no hook composition diagrams, no component trees, and no data flow definitions."*

Since no actual source code was provided for review, this analysis is based on the architectural concerns and gaps identified **within the documentation itself**, particularly in `02-architecture-design.md` which contains preemptive architectural findings for what would likely be implemented naively.

---

## 1. Module Dependency Graph

### Finding: Circular Dependency Risk in Coach Assistant Hooks
**Severity:** CRITICAL
**Location:** Section 5.B — Coach Assistant; Section 8 item 8 (unified AI terminal)
**Issue:**
The documentation identifies a likely naive implementation where `useCoachAssistant` composes hooks creating a circular dependency:
`useCoachAssistant` → `useAIChat` (conversation state + fetch) → `useConversationSidebar` (sidebar state)
...but `useAIChat` needs `selectedConversationId` from `useConversationSidebar`, while `useConversationSidebar` needs to call `loadConversation` from `useAIChat`.

**Refactoring Needed:**
Implement strict three-layer separation:
1. **Data layer** (`hooks/ai/useAIConversations.ts`): Pure data fetching (no UI state)
2. **UI state layer** (`hooks/ai/useAITerminalUI.ts`): UI state only (no fetching)
3. **Composition layer** (`hooks/ai/useAITerminal.ts`): Wires layers 1-2, owns side effects

### Finding: No Explicit Architecture Proposed
**Severity:** CRITICAL
**Location:** Gap Analysis table
**Issue:**
The brief contains no component tree, hook composition diagram, state management strategy, data fetching layer, or file/folder structure. Without these, AI implementation will invent inconsistent structures, making review impossible and guaranteeing architectural flaws.

**Refactoring Needed:**
Before implementation begins, define:
- Component tree for each module
- Hook composition diagrams
- Named state management strategy (e.g., Zustand vs Context vs Redux)
- Data fetching layer (React Query/SWR/raw fetch)
- Explicit file/folder structure
- Shared component library boundaries
- API contract format (OpenAPI/GraphQL schema)
- Error boundary placement strategy
- TypeScript strict-mode policy

## 2. Component Decomposition

### Finding: God Components Likely >300 Lines
**Severity:** HIGH
**Location:** Finding 4 — Exercise Rolodex Re-render Budget
**Issue:**
The documentation predicts specific files will exceed 300 lines if not explicitly split:
- `WorkoutPlannerPage.tsx` (500-800 lines): Owns builder + rolodex + saved plans + teach mode
- `CoachAssistant.tsx` (400-600 lines): Owns chat + sidebar + voice + action buttons
- `EquipmentProfilesPage.tsx` (400-500 lines): Owns scan + CRUD + location management + image upload
- `UniversalMasterSchedule.tsx` (500-700 lines): 24-hour calendar + multi-role views + booking
- `ContentStudio.tsx` (600-900 lines): 10+ tabs with significant logic
- `ClientDashboard.tsx` (400-600 lines): Pain charts + assessments + progress + messaging

**Refactoring Needed:**
Enforce 300-line hard limit with predefined split boundaries:
- **Exercise Rolodex**: Split into container (`ExerciseRolodex.tsx`), row component (`ExerciseRolodexRow.tsx`), search hook (`useExerciseSearch.ts`), and state hook (`useExerciseRolodex.ts`)
- **Workout Planner**: Separate builder panel, exercise rolodex, saved plans, and teach mode into distinct components
- **AI Terminals**: Create single reusable `AITerminal` component configured per surface (see Finding 5 below)
- **Dashboard**: Extract widgets into reusable, lazy-loaded components with clear interfaces

### Finding: No Shared Component Library Boundary Defined
**Severity:** HIGH
**Location:** Gap Analysis table
**Issue:**
Without explicit boundaries, UI primitives will be duplicated across modules, leading to inconsistent implementations and maintenance overhead.

**Refactoring Needed:**
Define and enforce:
- Shared component library (`/components/shared/`) for primitives (buttons, inputs, modals, etc.)
- Module-specific components (`/components/[module]/`)
- Clear import rules (e.g., no module importing from another module's internal components)
- Storybook or similar for visual regression testing of shared components

## 3. State Management Patterns

### Finding: No State Management Strategy Named
**Severity:** CRITICAL
**Location:** Gap Analysis table
**Issue:**
The brief doesn't specify whether to use Zustand, Context, Redux, or another solution. This guarantees inconsistent state management across AI implementation passes, leading to fragmented state and difficult debugging.

**Refactoring Needed:**
Explicitly define and document:
- Global state solution (e.g., Zustand for app-wide state like auth/user)
- Server state solution (e.g., React Query for API data)
- UI state guidelines (when to use Context vs local state)
- Migration path for existing state if applicable
- Performance considerations (e.g., avoiding unnecessary re-renders)

### Finding: Unified AI Terminal State Fragmentation
**Severity:** HIGH
**Location:** Finding 5 — Unified AI Terminal State Fragmentation
**Issue:**
The risk is that "normalization" will be implemented as copy-paste of the Coach Assistant component into each location with slight variations, creating N diverging implementations that must be maintained separately.

**Refactoring Needed:**
Define and enforce a single AI terminal contract:
```typescript
interface AITerminalConfig {
  terminalId: string;           // namespaces all state for this instance
  systemPrompt: string;         // role/context for this terminal
  suggestedPrompts?: string[];  // quick-action chips
  voiceEnabled?: boolean;       // microphone + TTS
  sidebarEnabled?: boolean;     // conversation history sidebar
  onHandoff?: (intent: AIIntent) => void; // structured intents for parent to handle
}
// Usage: <AITerminal config={coachAssistantConfig} />
```
This prevents fragmented implementations and ensures consistent behavior across all AI-driven surfaces.

## 4. API Contract Consistency

### Finding: No API Contract Format Specified
**Severity:** HIGH
**Location:** Gap Analysis table
**Issue:**
Without explicit API contracts (OpenAPI/GraphQL schema), frontend assumptions about response shapes will diverge from backend implementations, causing runtime errors and fragile integrations.

**Refactoring Needed:**
Establish:
- API contract format (OpenAPI 3.0/3.1 recommended for REST)
- Contract-first development approach (define contracts before implementation)
- Automated contract testing (e.g., Pact, Dredd)
- Type generation from contracts (e.g., `openapi-typescript` for frontend types)
- Versioning strategy for evolving contracts

### Finding: Mock Data Contamination Risk
**Severity:** HIGH
**Location:** Finding 6 — Mock Data Contamination Risk
**Issue:**
Mock data fallbacks are silent — they produce no console warning, no visual indicator, and no test failure. Playwright tests cannot verify "real data vs mock data" without explicit detection mechanism.

**Refactoring Needed:**
Implement mock data detection pattern:
```typescript
// utils/data/mockDataGuard.ts
const IS_PRODUCTION = import.meta.env.PROD;
const MOCK_DATA_ALLOWED = import.meta.env.VITE_ALLOW_MOCK_DATA === 'true';

export function guardMockData<T>(data: T, source: string): T {
  if (IS_PRODUCTION && !MOCK_DATA_ALLOWED && isMockData(data)) {
    console.error(`Mock data detected in production from ${source}`);
    // Optionally: throw error or show UI warning in development
  }
  return data;
}

// Helper to detect common mock data patterns
function isMockData(data: unknown): boolean {
  // Implementation-specific (e.g., check for placeholder IDs, fake timestamps)
  return false;
}
```

## 5. Type Safety Gaps

### Finding: No TypeScript Strict-Mode Policy Stated
**Severity:** MEDIUM
**Location:** Gap Analysis table
**Issue:**
Without explicit TypeScript strictness rules, `any` types will accumulate across AI-generated files, eroding type safety and increasing runtime error risk.

**Refactoring Needed:**
Define and enforce via `tsconfig.json`:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "useUnknownInCatchVariables": true,
  "alwaysStrict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "allowUnreachableCode": false,
  "allowUnusedLabels": false
}
```
Additionally:
- Ban `any` via ESLint rule (`@typescript-eslint/no-explicit-any`)
- Require explicit return types for exported functions
- Use `unknown` instead of `any` when type is truly unknown
- Prefer type inference over explicit types where possible

## 6. Code Reuse Opportunities

### Finding: No Shared Component Library Boundary Defined
**Severity:** HIGH
**Location:** Gap Analysis table (also impacts Component Decomposition)
**Issue:**
As noted above, lack of shared component boundaries guarantees duplication of UI primitives.

**Refactoring Needed:**
Create structured shared library:
```
/components/shared/
  /ui/          // Presentational primitives (Button, Input, Modal, etc.)
  /layout/      // Layout components (Container, Stack, Grid, etc.)
  /forms/       // Form-specific components (Field, Form, ValidationMessage)
  /navigation/  // Navigation components (Link, Menu, Breadcrumb)
  /feedback/    // Feedback components (Toast, Alert, LoadingSpinner)
  /icons/       // Icon components
  /utils/       // Shared UI utilities (useClickOutside, usePortal, etc.)
```
Enforce via:
- Module-level barrel exports (`/components/shared/index.ts`)
- ESLint import rules (`no-restricted-paths`)
- Code ownership documentation in CONTRIBUTING.md

### Finding: Exercise Rolodex Should Be Split
**Severity:** HIGH
**Location:** Finding 4 — Exercise Rolodex Re-render Budget
**Issue:**
As noted in Component Decomposition, the Rolodex combines virtualization, search/filter, category tabs, row rendering, and drag-to-add logic in one component, causing performance issues and exceeding line limits.

**Refactoring Needed:**
Split into focused components:
- `ExerciseRolodex.tsx`: Container handling layout and virtualization (uses `@tanstack/react-virtual`)
- `ExerciseRolodexRow.tsx`: Memoized row component (`React.memo()`)
- `useExerciseSearch.ts`: Hook managing search/filter state with debouncing
- `useExerciseRolodex.ts`: Hook managing selected exercises and reordering
- `ExerciseCategoryTabs.tsx`: Separate component for category filtering

## 7. File Organization

### Finding: No File/Folder Structure Proposed
**Severity:** HIGH
**Location:** Gap Analysis table
**Issue:**
Without explicit structure, AI implementation will create inconsistent directory layouts across passes, making navigation difficult and increasing cognitive load.

**Refactoring Needed:**
Define and enforce explicit structure:
```
/src/
  /components/
    /shared/        // Reusable UI primitives (see Code Reuse above)
    /[module]/      // Module-specific components
      /[Component].tsx
      /[Component].styles.ts
      /[Component].test.tsx
  /hooks/
    /[domain]/      // Custom hooks grouped by concern (ai, workout, equipment, etc.)
  /utils/
    /[domain]/      // Domain-specific utilities
    /types/         // Shared TypeScript types/interfaces
  /api/
    /endpoints/     // API service clients
    /types/         // API request/response types
  /store/           // State management (if using Redux/Zustand)
    /slices/        // Redux slices or Zustand stores
  /routes/          // Route definitions and lazy loading
  /assets/          // Static assets (images, icons, fonts)
  /styles/          // Global styles, themes, CSS variables
  /constants/       // Application constants
  /config/          // Configuration files
  /tests/           // Test utilities and mocks
  /docs/            // Internal documentation
```
Enforce via:
- Module-level README files explaining purpose and boundaries
- Architecture decision records (ADRs) for structural choices
- Automated checks in CI (e.g., `madge` for dependency circularity, custom scripts for file placement)

---

## Summary of Critical Findings Requiring Immediate Attention

| Finding | Severity | Primary Risk | Recommended Action |
|---------|----------|--------------|---------------------|
| Circular Dependency in Coach Assistant Hooks | CRITICAL | Infinite renders, stale data, unfl

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
