# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 105.3s
> **Files:** AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/03-security-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/04-performance-planning.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/05-competitive-intel.md, AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/06-persona-alignment.md
> **Generated:** 4/6/2026, 7:48:02 PM

---

# SwanStudios Deep Architecture Review & Bug Hunt

## Executive Summary

After comprehensive review of the provided documentation files, I've identified **23 critical/high severity findings** that represent ship blockers. The documentation reveals systemic architectural gaps, security violations against stated policies, integration fractures, and production readiness failures.

---

## 1. BUG DETECTION

### Finding 1 — Race Condition: Conversation Loading Without Abort Controller

**Severity:** 🔴 CRITICAL
**File:** `02-architecture-design.md` — Preemptive Architectural Findings, Section 2
**What's Wrong:**
The architecture brief acknowledges a race condition risk in conversation loading ("Fast clicking: User clicks conversation A, then B before A resolves") but provides a solution that is **not enforced as mandatory**. The `loadConversation` pattern with AbortController is presented as a "Recommended Fix" but the plan lacks enforcement mechanisms. Any AI executor will implement the naive version first, causing:
- Stale messages appearing under wrong conversation headers
- Memory leaks from orphaned fetch operations
- State corruption when conversations resolve out of order

**Fix:**
```typescript
// MUST be codified in architecture standards before any implementation
// hooks/ai/useAIConversations.ts — enforce this pattern

export function createAbortController(): AbortController {
  return new AbortController();
}

export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Type-safe wrapper that enforces abort handling
export async function fetchWithAbort<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  controller: AbortController
): Promise<T> {
  try {
    return await fetcher(controller.signal);
  } catch (error) {
    if (isAbortError(error)) {
      // Explicitly re-throw for callers to handle
      throw error;
    }
    throw error;
  }
}
```

Add to project linting/rules:
```json
{
  "no-restricted-syntax": [
    "error",
    {
      "selector": "CallExpression[callee.name='fetch']:not(:has(Argument[properties.name='signal']))",
      "message": "All fetch calls in AI/async flows MUST include AbortController signal for race condition prevention"
    }
  ]
}
```

---

### Finding 2 — Styled-Components Runtime Crash Propagation (P0 Blocker)

**Severity:** 🔴 CRITICAL
**File:** `02-architecture-design.md` — Finding 3, Styled-Components Runtime Crash
**What's Wrong:**
The document identifies `RemotionTemplateGallery.tsx:482:51` as a crash site but the fix proposes adding error boundaries **without identifying the root cause**. The crash is described as a styled-components runtime error, which suggests one of:
1. ThemeProvider missing at render ancestry
2. Undefined prop passed to styled-component style function
3. Dynamic style computation on null value

Without root cause analysis, error boundaries will mask the bug rather than fix it.

**Fix — Root Cause Analysis First:**
```typescript
// DIAGNOSTIC: Add runtime type guards to styled-components
// Before any styled-component that crashed:

const DangerouslyDynamicText = styled.span<{ value?: string | number }>`
  font-size: ${props => {
    // CRITICAL: Validate input before computation
    if (props.value === undefined || props.value === null) {
      console.warn('DangerouslyDynamicText received null/undefined value');
      return '16px'; // Safe default
    }
    return typeof props.value === 'number'
      ? `${props.value}px`
      : props.value;
  }};
`;

// Theme validation at provider level
const ThemeProviderValidation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useContext(ThemeContext);

  useEffect(() => {
    const required = ['primary', 'secondary', 'surface', 'text', 'background'];
    const missing = required.filter(key => !(key in theme));
    if (missing.length > 0) {
      throw new Error(
        `Theme missing required keys: ${missing.join(', ')}. ` +
        `ThemeProvider must wrap RemotionTemplateGallery at: ${window.location.pathname}`
      );
    }
  }, [theme]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
```

---

### Finding 3 — PII Exposure: No Client-Side Redaction Before AI Transmission

**Severity:** 🔴 CRITICAL
**File:** `03-security-planning.md` — Finding 1, PII Exposure in AI Conversations
**What's Wrong:**
The security document identifies the risk ("ZERO PII TO LLMs policy") but the proposed mitigations are **architecture-level suggestions, not implementation code**. There is no actual redaction implementation. The gap is:

1. No PII detection library integrated
2. No redaction middleware in the API layer
3. No frontend guard before `fetch()` to AI endpoints
4. No test suite verifying PII is stripped

This is a policy violation that creates regulatory liability (HIPAA/GDPR).

**Fix — Immediate Implementation Required:**
```typescript
// libs/pii/pii-redactor.ts
// MUST exist before any AI terminal implementation

import { PIIDetector } from './detector';

const REDACTION_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  SSN: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
  DATE: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  NAME: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // Simple pattern, needs NER for accuracy
  ADDRESS: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/gi,
} as const;

export interface RedactionResult {
  sanitized: string;
  entitiesFound: PIIEntity[];
  confidence: number;
}

export interface PIIEntity {
  type: keyof typeof REDACTION_PATTERNS;
  value: string;
  startIndex: number;
  endIndex: number;
}

export function redactPII(input: string): RedactionResult {
  const entitiesFound: PIIEntity[] = [];
  let sanitized = input;

  for (const [type, pattern] of Object.entries(REDACTION_PATTERNS)) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(input)) !== null) {
      entitiesFound.push({
        type: type as PIIEntity['type'],
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      sanitized = sanitized.replace(match[0], `[${type}]`);
    }
  }

  return {
    sanitized,
    entitiesFound,
    confidence: entitiesFound.length > 0 ? 0.95 : 0.0,
  };
}

// API middleware that MUST be applied to all AI endpoints
export function createPIIGuardMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const messageContent = body.messages?.map((m: { content: string }) => m.content).join(' ') || '';

    const redaction = redactPII(messageContent);

    if (redaction.confidence > 0.5) {
      // Log the attempt with redaction metadata
      logger.warn('PII detected in AI request', {
        userId: req.user?.id,
        entitiesFound: redaction.entitiesFound,
        endpoint: req.path,
      });

      return res.status(400).json({
        error: 'PII_DETECTED',
        message: 'Please remove personal identifiers from your request.',
        sanitizedHint: redaction.sanitized.substring(0, 100) + '...',
      });
    }

    // Replace original content with sanitized
    if (redaction.sanitized !== messageContent) {
      req.body = {
        ...body,
        messages: body.messages.map((m: { content: string }) => ({
          ...m,
          content: m.content.replace(messageContent, redaction.sanitized),
        })),
        _piiSanitized: true,
        _piiEntitiesFound: redaction.entitiesFound,
      };
    }

    next();
  };
}
```

---

### Finding 4 — Missing Loading States for Async Operations

**Severity:** 🟠 HIGH
**File:** `06-persona-alignment.md` — Throughout
**What's Wrong:**
The persona alignment document identifies missing functionality (session history, upcoming endpoints returning 404, non-clickable saved plans) but the **root cause** is likely missing loading/error state handling in React. When these API calls fail or return null, the UI has no fallback, causing:
- White screens while loading
- Unhandled promise rejections
- Confusing "nothing happened" UX

**Fix:**
```typescript
// hooks/useAsyncResource.ts — Required for ALL API hooks
// MUST be used for every data fetch

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
    refetch: () => {},
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null, refetch: fetch });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        refetch: fetch,
      });
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return state;
}

// Enforce usage with lint rule:
// no-sync-fetches: prevent any fetch() outside of useAsyncResource or React Query
```

---

### Finding 5 — Null/Undefined Access in Session Duration Configuration

**Severity:** 🟠 HIGH
**File:** `01-ux-research.md` — Section 2, Scheduling and Calendar
**What's Wrong:**
The document states: "Lack of 30/45-minute session support" as a missing feature. This implies the current implementation hardcodes session durations. The bug is likely:

```typescript
// Current (broken) pattern
const SESSION_DURATIONS = [60]; // Only 60 minutes supported

// Or worse, inline in component
<div>{session.duration === 60 ? '1 hour' : session.duration}</div>
// When duration is 30 or 45, renders "30" or "45" (raw number)
```

**Fix:**
```typescript
// constants/sessionDurations.ts
export const SESSION_DURATIONS = [30, 45, 60, 90] as const;
export type SessionDuration = typeof SESSION_DURATIONS[number];

export const SESSION_DURATION_LABELS: Record<SessionDuration, string> = {
  30: '30 min',
  45: '45 min',
  60: '1 hour',
  90: '1.5 hours',
} as const;

// Component usage
<span>{SESSION_DURATION_LABELS[session.duration as SessionDuration] ?? `${session.duration} min`}</span>
```

---

## 2. ARCHITECTURE FLAWS

### Finding 6 — No State Management Strategy Defined (Critical Gap)

**Severity:** 🔴 CRITICAL
**File:** `02-architecture-design.md` — Plan Gap Analysis Table
**What's Wrong:**
The gap analysis correctly identifies: "No state management strategy named (Zustand? Context? Redux?)" This is listed as 🔴 Critical. The consequence is **each AI pass will make different choices**, leading to:
- Mixed Redux + Context + local state across components
- Inconsistent patterns for server state vs. UI state
- No shared state persistence strategy

**Fix — Must Be Decided Before Implementation:**
```markdown
# Architecture Decision: State Management

## Chosen Strategy: TanStack Query (React Query) + Zustand + React Context

### TanStack Query (Server State)
- All API data fetching
- Caching, background refetching, optimistic updates
- Standardized for: sessions, clients, workouts, plans, conversations

### Zustand (Client UI State)
- Global UI state: sidebar open, modals, theme
- NOT for server data
- Lightweight, no boilerplate

### React Context (Infrequently Changing Data)
- User/auth context (changes on login/logout only)
- Theme context (changes rarely)
- Feature flags

## Prohibited Patterns
❌ Redux for any new code
❌ useState for server data
❌ Multiple competing state libraries
```

---

### Finding 7 — No Data Fetching Layer Defined (Race Conditions Guaranteed)

**Severity:** 🔴 CRITICAL
**File:** `02-architecture-design.md` — Plan Gap Analysis Table
**What's Wrong:**
"No data fetching layer defined (React Query? SWR? raw fetch?)" is marked 🔴 Critical. Without a standardized fetching layer:
- Raw `fetch()` calls scattered across components
- No centralized error handling
- No caching strategy
- No request deduplication
- Race conditions as documented in Finding 1

**Fix:**
```typescript
// lib/api/client.ts
// Centralized API client with React Query integration

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        logger.error('Mutation error:', error);
        // Centralized error toast notification
      },
    },
  },
});

// All API calls MUST go through this
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new APIError(error.message, response.status, endpoint);
  }

  return response.json();
}

// Enforce with ESLint:
// @typescript-eslint/no-restricted-imports: prevent direct fetch, require apiFetch
```

---

### Finding 8 — Circular Dependency Risk in AI Terminal Hooks

**Severity:** 🔴 CRITICAL
**File:** `02-architecture-design.md` — Finding 1, Hook Composition
**What's Wrong:**
The document describes the circular dependency risk:
```
useCoachAssistant
  └── useAIChat (conversation state + fetch)
        └── useConversationSidebar (sidebar open/close + selected conversation)
```

But the recommended fix is **not implemented in the codebase**. The architecture plan contains no code to enforce the three-layer separation it recommends.

**Fix — Architecture Enforcement:**
```typescript
// .github/architecture-rules/hook-composition.md
# AI Hook Composition Rules

## Forbidden Patterns
❌ useAIChat importing useConversationSidebar
❌ useConversationSidebar importing useAIChat
❌ useCoachAssistant importing any hook that imports another

## Required Pattern
✅ Layer 1: `hooks/ai/useAIConversations.ts` — Pure data, no UI state
✅ Layer 2: `hooks/ai/useAITerminalUI.ts` — UI state only, no data
✅ Layer 3: `hooks/ai/useAITerminal.ts` — Composes L1 + L2

## Dependency Direction
```
useAITerminal
    ├── imports useAIConversations (L1)
    └── imports useAITerminalUI (L2)

L1 ──► L2 (L1 does NOT import L2)
L2 ──X L1 (NO back-reference)
```

## Enforcement
- Add to ESLint: no-circular-imports for hooks directory
- Add pre-commit hook: verify hook dependency graph
```

---

### Finding 9 — God Components Exceeding 300 Lines (No Enforcement)

**Severity:** 🟠 HIGH
**File:** `02-architecture-design.md` — Finding 4, File Budget Violations Table
**What's Wrong:**
The document correctly identifies files that will exceed 300 lines:
- `WorkoutPlannerPage.tsx` — 500-800 lines
- `CoachAssistant.tsx` — 400-600 lines
- `ContentStudio.tsx` —

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
