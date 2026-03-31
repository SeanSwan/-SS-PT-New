# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 95.5s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md, frontend/src/components/Shared/AITerminalPanel.tsx, frontend/src/components/AIAssistant/AIContextSelector.tsx, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/config/dashboard-tabs.ts
> **Generated:** 3/30/2026, 5:26:33 PM

---

# Deep Code Review: SwanStudios AI Assistant Components

## Executive Summary

This review identifies **3 CRITICAL bugs**, **4 HIGH severity issues**, **5 MEDIUM issues**, and **3 LOW issues** across the provided codebase. The most critical finding is the **incomplete dashboard-tabs.ts file** which will cause runtime crashes, followed by **memory leaks in TTS** and **blueprint-to-code mismatches** that will break the mobile experience.

---

## 1. Bug Detection

### CRITICAL — Incomplete File Causes Runtime Crash

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `dashboard-tabs.ts` ~Line 85 | File is truncated mid-object: `description: 'Manage` — this will cause JSON parse errors and crash the entire dashboard on load. The `ADMIN_DASHBOARD_TABS` array is never closed. | Complete the truncated object and close all arrays properly. The file ends abruptly with no closing brackets. |

```typescript
// CURRENT (BROKEN):
description: 'Manage 

// SHOULD BE:
description: 'Manage users, roles, and permissions',
  },
];
```

### CRITICAL — Memory Leak: TTS Not Stopped on Unmount

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `AITerminalPanel.tsx` ~Lines 108-120 | The `useEffect` that auto-speaks new AI messages has no cleanup. If the component unmounts while TTS is playing, `tts.stop()` is never called, leaving the speech engine in an inconsistent state and potentially causing memory leaks. | Add cleanup function to the useEffect: |

```typescript
// Add to useEffect at line 108:
return () => {
  if (tts.speaking) {
    tts.stop();
  }
};
```

### HIGH — Race Condition in Voice Auto-Send Timer

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `DictationOrb.tsx` ~Lines 280-290 | The `autoSendTimerRef` is cleared in `startListening` and `toggleListening`, but NOT in the main `useEffect` cleanup. If the component unmounts while waiting for the 750ms auto-send delay, the timer continues running and will call `onAutoSendRef.current?.(sessionText)` on a null/unmounted component, causing runtime errors. | Add cleanup to the main useEffect that creates the recognition object: |

```typescript
// Add to the useEffect return cleanup:
if (autoSendTimerRef.current) {
  clearTimeout(autoSendTimerRef.current);
  autoSendTimerRef.current = null;
}
```

### HIGH — Stale Closure in TTS Effect

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `AITerminalPanel.tsx` ~Lines 108-120 | The effect depends on `tts` from `useTextToSpeech`. If the hook returns a new object reference on every render (common pattern), this effect runs on every render, potentially causing duplicate TTS calls. The `prevMessageCountRef` guard helps but is fragile. | Stabilize the dependency by using only the specific properties needed: |

```typescript
// Change dependency array to:
}, [messages, tts.enabled, tts.speak, tts.speaking]);
```

---

## 2. Architecture Flaws

### HIGH — God Component Exceeds Size Limit

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `AITerminalPanel.tsx` Lines 1-453 | Component is **453 lines** — exceeds the 300-line threshold noted in the component's own TODO comment. It handles panel collapse, message display, voice input, TTS, error handling, and API communication all in one file. | Extract to separate files as the TODO suggests: `AITerminalPanelStyles.ts`, `AITerminalPanelTypes.ts`, and split into sub-components (`PanelHeader`, `MessagesArea`, `InputArea`). |

### HIGH — DictationOrb Also Exceeds Size Limit

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `DictationOrb.tsx` Lines 1-387 | Component is **387 lines** with its own TODO noting this violation. Contains styled components, types, Web Speech API logic, keyboard handlers, and pointer event handlers all in one file. | Extract to `DictationOrbStyles.ts` and create a custom hook `useDictation.ts` to separate the speech recognition logic from the UI. |

### MEDIUM — Prop Drilling Without Context

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `AITerminalPanel.tsx` | The component receives `context`, `clientId`, `equipmentProfileId` as props but these could be derived from `GlobalClientContext` and `AIContext`. This creates tight coupling and makes the component harder to test in isolation. | Introduce `useAIContext` hook or context provider to eliminate prop drilling for these values. |

### MEDIUM — Missing Error Boundaries

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `AITerminalPanel.tsx`, `DictationOrb.tsx` | Neither component wraps its content in an error boundary. If the Web Speech API fails or the AI chat hook throws, the entire panel crashes without graceful degradation. | Add try-catch blocks around async operations and consider wrapping in React error boundary. |

---

## 3. Integration Issues

### CRITICAL — Missing "balanced" Response Style

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `AIContextSelector.tsx` ~Lines 45-50 | The blueprint (Section 3.3) specifies three response styles: `phd_only`, `balanced`, `simple_only`. The code implements `both`, `phd_only`, `simple_only`. The **"balanced" style is missing** — this is the DEFAULT style that should be used. The UI will never show "balanced" as an option. | Add the missing style: |

```typescript
export const RESPONSE_STYLES: { key: ResponseStyle; label: string; emoji: string }[] = [
  { key: 'both', label: 'Both', emoji: '🎓💯' },
  { key: 'phd_only', label: 'PhD Mode', emoji: '🎓' },
  { key: 'balanced', label: 'Balanced', emoji: '⚖️' },  // ADD THIS
  { key: 'simple_only', label: 'Keep It 100', emoji: '💯' },
];
```

### CRITICAL — Voice Orb Size Mismatch (Mobile Breakage)

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `DictationOrb.tsx` ~Lines 110-115 | Blueprint Section 3.2 specifies **64px × 64px** voice orb for mobile (320-430px). The code implements **44px × 44px**. This violates the core mobile-first requirement and will make the voice button too small for gym use with sweaty hands. | Update styled component: |

```typescript
// Change OrbButton to:
const OrbButton = styled.button<{ $listening: boolean }>`
  // ... existing styles ...
  width: 64px;    // Was: 44px
  height: 64px;   // Was: 44px
  min-width: 64px; // Was: 44px
  min-height: 64px; // Was: 44px
  
  @media (min-width: 768px) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
`;
```

### HIGH — Missing Coach Assistant Tab Configuration

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `dashboard-tabs.ts` | The blueprint specifies adding a new tab at position 0 with `id: 'coach'`, but this is completely missing from `dashboard-tabs.ts`. The routing redirect from `/dashboard/home` → `/dashboard/admin/coach-assistant` is also not implemented. | Add to the tab configuration: |

```typescript
{
  key: 'coach',
  label: 'Coach Assistant',
  icon: 'MessageCircle',
  order: 0,  // First position
  status: 'real',
  section: 'command',
  route: '/dashboard/admin/coach-assistant',
  description: 'Swan Studios Coach — AI-powered training assistant',
}
```

### MEDIUM — Font Size Violation (iOS Zoom Risk)

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `AITerminalPanel.tsx` ~Lines 350-360 | Blueprint Section 3.2 mandates **16px minimum** for input fields on mobile to prevent iOS Safari auto-zoom. The code uses `font-size: 13px` in the `ChatInput` styled component. This will cause iOS to zoom in when the input is focused, breaking the mobile experience. | Update ChatInput styled component: |

```typescript
const ChatInput = styled.textarea`
  font-size: 16px;  // Was: 13px — prevents iOS zoom
  
  @media (min-width: 768px) {
    font-size: 14px;
  }
  
  @media (min-width: 1024px) {
    font-size: 13px;
  }
`;
```

---

## 4. Dead Code & Tech Debt

### LOW — TODO Comments Indicating Known Issues

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | `AITerminalPanel.tsx` ~Line 36 | Comment states: "NOTE: 453 lines — exceeds 300-line rule. TODO: extract styled components to AITerminalPanelStyles.ts, types to shared AITypes.ts" | This is acknowledged technical debt — should be scheduled for cleanup. |
| **LOW** | `DictationOrb.tsx` ~Line 40 | Comment states: "NOTE: 387 lines — exceeds 300-line rule. TODO: extract styled components to DictationOrbStyles.ts and hook to useDictation.ts" | Same as above — acknowledged debt. |

### LOW — Unused Imports

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | `AIContextSelector.tsx` ~Lines 9-20 | Several icons imported but not used in the current implementation: `Database`, `Calendar`, `TrendingUp`, `BookOpen`, `Trophy`, `UserPlus`. These are defined in `CONTEXTS` but the component only renders pills for `availableContexts`. | Either remove unused imports or ensure all contexts are rendered. |

---

## 5. Production Readiness

### HIGH — Console.log in Production Code

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `DictationOrb.tsx` ~Line 260 | `logger.warn('Microphone permission denied — enable in browser settings')` — This will pollute production logs. While using a logger (not console.log) is better, warn-level logs should still be reviewed. | Either remove the log or wrap in environment check: |

```typescript
if (process.env.NODE_ENV === 'development') {
  logger.warn

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
