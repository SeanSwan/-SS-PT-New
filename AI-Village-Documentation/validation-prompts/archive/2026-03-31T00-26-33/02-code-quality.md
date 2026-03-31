# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 67.7s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md, frontend/src/components/Shared/AITerminalPanel.tsx, frontend/src/components/AIAssistant/AIContextSelector.tsx, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/config/dashboard-tabs.ts
> **Generated:** 3/30/2026, 5:26:33 PM

---

# Code Review: Swan Studios Coach Assistant & AI Components

## Executive Summary
**Overall Grade: B+ (83/100)**

The codebase demonstrates strong architectural vision and thoughtful UX design, but suffers from **critical technical debt** in component size, type safety, and theme integration. The blueprint is excellent, but implementation needs refactoring before production deployment.

---

## 1. TypeScript Best Practices

### ❌ CRITICAL: Unsafe `any` usage in DictationOrb.tsx
**Lines 2-6:**
```typescript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
```
**Issue:** Using `any` defeats TypeScript's purpose. Web Speech API types exist in `@types/dom-speech-recognition`.

**Fix:**
```typescript
/// <reference types="dom-speech-recognition" />
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
```

---

### 🟡 MEDIUM: Missing discriminated unions for message types
**AITerminalPanel.tsx (lines 60-70):**
```typescript
export interface AITerminalPanelProps {
  context?: AIContext;
  clientId?: number;
  equipmentProfileId?: number | null;
  // ... 8 more optional props
}
```
**Issue:** All-optional props make it unclear which combinations are valid. A message could be `role: 'user'` but have no content validation.

**Fix:**
```typescript
type MessageRole = 'user' | 'assistant' | 'system';

interface BaseMessage {
  id: string;
  timestamp: Date;
  content: string;
}

interface UserMessage extends BaseMessage {
  role: 'user';
  clientId?: number;
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  actions?: QuickAction[];
}

type ChatMessage = UserMessage | AssistantMessage;
```

---

### 🟡 MEDIUM: Weak enum types
**AIContextSelector.tsx (line 18):**
```typescript
export const CONTEXTS: Record<AIContext, ContextConfig> = {
  general: { label: 'General', icon: MessageSquare, ... },
  // ...
};
```
**Issue:** `AIContext` is a string union, but `CONTEXTS` object keys aren't validated at compile time. Adding a new context type without updating `CONTEXTS` causes runtime errors.

**Fix:**
```typescript
const CONTEXTS = {
  general: { label: 'General', icon: MessageSquare, ... },
  macro_logging: { ... },
  // ...
} as const satisfies Record<AIContext, ContextConfig>;

type AIContext = keyof typeof CONTEXTS; // Derived from source of truth
```

---

## 2. React Patterns

### ❌ CRITICAL: Stale closure in DictationOrb keyboard handler
**Lines 270-281:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (!disabledRef.current && recognitionRef.current) {
        toggleListening(); // ← Captures initial toggleListening reference
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleListening]); // ← Dependency causes handler re-registration on every render
```
**Issue:** `toggleListening` is recreated on every render (no `useCallback` deps), causing the effect to re-run constantly. The comment claims "no deps that change" but `toggleListening` is in the dep array.

**Fix:**
```typescript
// Stabilize toggleListening with useCallback
const toggleListening = useCallback(() => {
  setListening(prev => {
    if (prev) {
      recognitionRef.current?.stop();
      return false;
    } else {
      recognitionRef.current?.start();
      return true;
    }
  });
}, []); // ← Now stable

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      toggleListening();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleListening]); // ← Now only runs once
```

---

### 🟠 HIGH: Missing memoization in AIContextSelector
**Lines 77-82:**
```typescript
const availableContexts = useMemo(() =>
  Object.entries(CONTEXTS)
    .filter(([, cfg]) => cfg.roles.includes(userRole))
    .map(([key]) => key as AIContext),
  [userRole]
);
```
**Good:** Memoized computation.

**But then lines 88-103:**
```typescript
{availableContexts.map(ctx => {
  const cfg = CONTEXTS[ctx]; // ← Lookup on every render
  const Icon = cfg.icon;      // ← Component reference extracted inline
  return (
    <ContextPill
      key={ctx}
      $active={selectedContext === ctx}
      onClick={() => onContextChange(ctx)} // ← Inline function creation
```
**Issue:** 
1. `onClick` creates a new function on every render for every chip
2. `Icon` component is extracted inline (minor, but adds noise)

**Fix:**
```typescript
const handleContextChange = useCallback((ctx: AIContext) => {
  onContextChange(ctx);
}, [onContextChange]);

// In render:
<ContextPill
  key={ctx}
  $active={selectedContext === ctx}
  onClick={handleContextChange.bind(null, ctx)} // ← Stable reference
```

---

### 🟡 MEDIUM: Unnecessary re-renders in AITerminalPanel
**Lines 120-126:**
```typescript
useEffect(() => {
  if (messages.length > prevMessageCountRef.current) {
    const latest = messages[messages.length - 1];
    if (latest?.role === 'assistant' && tts.enabled) {
      tts.speak(latest.content);
    }
  }
  prevMessageCountRef.current = messages.length;
}, [messages, tts]); // ← `tts` object changes on every render
```
**Issue:** `tts` from `useTextToSpeech()` is likely a new object reference on every render, causing this effect to run constantly.

**Fix:**
```typescript
// In useTextToSpeech hook:
return useMemo(() => ({
  enabled,
  speaking,
  speak,
  stop,
  toggleEnabled,
  supported,
}), [enabled, speaking, speak, stop, toggleEnabled, supported]);

// Or in AITerminalPanel:
}, [messages, tts.enabled, tts.speak]); // ← Depend on stable primitives/functions
```

---

## 3. Styled-Components & Theme Integration

### ❌ CRITICAL: Hardcoded colors violate theme system
**AITerminalPanel.tsx lines 350-450 (styled components section):**
```typescript
const PanelWrapper = styled.div`
  border: 1px solid rgba(96, 192, 240, 0.15); // ← Hardcoded Ice Wing
  background: rgba(0, 20, 60, 0.6);           // ← Hardcoded Midnight Sapphire
  backdrop-filter: blur(12px);
`;

const AiBadge = styled.div`
  background: linear-gradient(135deg, #8b5cf6 0%, #60c0f0 100%); // ← Hardcoded
  color: #002060; // ← Hardcoded
`;
```
**Issue:** Blueprint mandates CSS custom properties with fallbacks (Section 6), but implementation uses hardcoded hex/rgba values. This breaks:
- Theme switching (14 themes mentioned in blueprint)
- Dark mode support
- Accessibility (high contrast mode)

**Fix (per blueprint example):**
```typescript
const PanelWrapper = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-elevated, #141419);
  backdrop-filter: blur(12px);
`;

const AiBadge = styled.div`
  background: linear-gradient(
    135deg,
    var(--accent-secondary, #8B5CF6) 0%,
    var(--accent-gaming, #60C0F0) 100%
  );
  color: var(--text-on-accent, #002060);
`;
```

---

### 🟠 HIGH: DRY violation in message bubble styles
**AITerminalPanel.tsx lines 410-440:**
```typescript
const BubbleContent = styled.div<{ $role: string }>`
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${(p) =>
    p.$role === 'user'
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(96, 192, 240, 0.2))'
      : 'rgba(255, 255, 255, 0.06)'};
  color: ${(p) => (p.$role === 'user' ? '#f0f0ff' : '#cbd5e1')};
`;
```
**Issue:** 
1. Ternary logic for role-based styling is repeated
2. Blueprint specifies separate `MessageBubbleAI` and `MessageBubbleUser` components (Section 6)
3. Font size is 13px, but blueprint mandates **16px minimum on mobile** (Section 3.2)

**Fix:**
```typescript
const MessageBubbleBase = styled.div`
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 16px; // ← Blueprint requirement
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;

  @media (min-width: 1024px) {
    font-size: 14px;
  }
`;

const MessageBubbleUser = styled(MessageBubbleBase)`
  background: color-mix(
    in srgb,
    var(--accent-secondary, #8B5CF6) 15%,
    var(--bg-elevated, #141419)
  );
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  color: var(--text-primary, #E0ECF4);
  margin-left: auto;
`;

const MessageBubbleAI = styled(MessageBubbleBase)`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  color: var(--text-primary, #E0ECF4);
`;
```

---

### 🟡 MEDIUM: Missing responsive breakpoints
**DictationOrb.tsx lines 90-110 (OrbButton):**
```typescript
const OrbButton = styled.button<{ $listening: boolean }>`
  width: 44px;
  height: 44px;
  // ... no media queries
`;
```
**Issue:** Blueprint specifies 64px voice orb on mobile (Section 3.2), but component is hardcoded to 44px.

**Fix:**
```typescript
const OrbButton = styled.button<{ $listening: boolean }>`
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;

  @media (min-width: 768px) {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  @media (min-width: 1024px) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
`;
```

---

## 4. DRY Violations

### 🟠 HIGH: Duplicated context configuration
**AIContextSelector.tsx lines 18-32 vs. Blueprint Section 2:**

Blueprint defines context labels in a table, but code redefines them in `CONTEXTS` object. Then `AITerminalPanel.tsx` lines 75-85 has **another** `CONTEXT_LABELS` object:

```typescript
const CONTEXT_LABELS: Record<string, string> = {
  general: 'AI Assistant',
  macro_logging: 'Nutrition Assistant',
  form_tips: 'Form Coach',
  // ... duplicates AIContextSelector.CONTEXTS
};
```

**Fix:** Create a single source of truth:
```typescript
// src/config/ai-contexts.ts
export const AI_CONTEXTS = {
  general: {
    key: 'general' as const,
    label: 'AI Assistant',
    shortLabel: 'General',
    icon: MessageSquare,
    description: 'Ask me anything about fitness and wellness',
    roles: ['client', 'trainer', 'admin'],
  },
  // ...
} as const;

export type AIContext = keyof typeof AI_CONTEXTS;
```

Then import in both components.

---

### 🟡 MEDIUM: Repeated theme token definitions
**DictationOrb.tsx lines 30-45:**
```typescript
const CS = {
  wingPurple: '#8B5CF6',
  wingPurpleAlpha15: 'rgba(139, 92, 246, 0.15)',
  wingPurpleAlpha08: 'rgba(139, 92, 246, 0.08)',
  // ... 12 more hardcoded tokens
};
```

**AITerminalPanel.tsx** doesn't define tokens but uses hardcoded values inline.

**Issue:** Theme tokens should be centralized in a theme provider, not redefined per component.

**Fix:**
```typescript
// src/theme/tokens.ts
export const crystallineSwanTokens = {
  colors: {
    wingPurple: '#8B5CF6',
    midnightSapphire: '#002060',
    // ...
  },
  alpha: (color: string, opacity: number) => `${color}${Math.round(opacity * 255).toString(16)}`,
};

// In styled-components:
import { crystallineSwanTokens as tokens } from '@/theme/tokens';

const OrbButton = styled.button`
  border-color: var(--accent-secondary, ${tokens.colors.wingPurple});
`;
```

---

## 5. Error Handling

### 🟠 HIGH: Silent error swallowing in DictationOrb
**Lines 210-220:**
```typescript
recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  setListening(false);
  setInterim('');
  holdingRef.current = false;
  if (event.error === 'not-allowed' || event.error === 'audio-capture') {
    setMicBlocked(true);
    logger.warn('Microphone permission denied — enable in browser settings');
  }
  // no-speech, network, aborted, service-not-allowed — silently return to idle (no alarming UI)
};
```
**Issue:** 
1. `network` errors are silently ignored — user has no idea their dictation failed
2. `logger.warn` doesn't surface to UI
3. No retry mechanism

**Fix:**
```typescript
const [errorMessage, setErrorMessage] = useState<string | null>(null);

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  setListening(false);
  setInterim('');

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
