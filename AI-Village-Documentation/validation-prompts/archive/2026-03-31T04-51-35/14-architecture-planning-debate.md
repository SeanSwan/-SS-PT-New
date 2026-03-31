# Architecture Planning Debate (Phase 2B) — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 ↔ qwen/qwen3.6-plus-preview:free | **Duration:** 236.0s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

# Senior Architecture Lead — Round 3 Final Adjudication

## CONSENSUS REACHED

The architecture is fully locked. Below is the complete merged specification.

---

## Dispute Resolution: Final Status

### ✅ ACCEPT — `stableArrayUpdate` Utility (Dispute 3 Resolution)

Qwen's `utils/stateGuards.ts` utility is the correct evolution of my `setState` guard pattern. Standardizing equality semantics across 5 hooks via a shared utility prevents the exact boilerplate drift I was concerned about.

One precision addition: the current implementation only checks `id` fields. For `ConversationSummary` objects, `updatedAt` timestamps also change on rename/delete without ID changes. The utility needs a second comparator parameter:

```typescript
// utils/stateGuards.ts — FINAL
export function stableArrayUpdate<T extends { id: string | number }>(
  prev: T[],
  next: T[],
  isEqual?: (a: T, b: T) => boolean
): T[] {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    const equal = isEqual
      ? isEqual(prev[i], next[i])
      : prev[i].id === next[i].id;
    if (!equal) return next;
  }
  return prev;
}

// hooks/useAIChat.ts — usage with conversation-specific equality
const refreshConversations = useCallback(async () => {
  const fresh = await listConversations();
  setConversations(prev =>
    stableArrayUpdate(
      prev,
      fresh,
      (a, b) => a.id === b.id && a.title === b.title && a.updatedAt === b.updatedAt
    )
  );
}, []);
```

**This is now locked.** `stableArrayUpdate` is the canonical pattern. Direct `setState(apiResponse)` is prohibited in all hooks.

---

### ✅ ACCEPT — Dual-Barrel Type System (Finding 6 Resolution)

Qwen's refinement is correct and I'm adopting it fully. The separation of `hooks/types.ts` (type-only) from `hooks/index.ts` (runtime + types) is the right architecture at this scale.

One addition to their ESLint rule: add the `fixStyle` option to auto-correct violations rather than just flag them:

```json
// .eslintrc.json — FINAL
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports",
        "disallowTypeAnnotations": false
      }
    ],
    "@typescript-eslint/no-import-type-side-effects": "error"
  }
}
```

The `no-import-type-side-effects` rule is the critical companion: it prevents `import type { Foo }` from being silently converted to a runtime import by bundlers that don't fully understand TypeScript's `verbatimModuleSyntax`. Belt-and-suspenders enforcement.

**Both rules are now locked.**

---

## Merged Final Specification

### Hook Architecture (Locked)

```
useCoachAssistant (orchestration only, no direct state)
  ├── useAIChat          → owns: conversations[], messages[], API calls
  ├── useConversationSidebar({ conversations }) → owns: isOpen, searchQuery, filteredConversations (derived)
  ├── useVoiceRecorder   → owns: MediaRecorder lifecycle
  ├── useGeminiTranscription → owns: upload + transcribe pipeline
  └── useFileAttachment  → owns: file selection, validation, preview URLs
```

**Invariants:**
- No child hook imports another child hook
- Cross-hook coordination lives exclusively in `useCoachAssistant`
- Every exported function wrapped in `useCallback`
- Every derived array/object wrapped in `useMemo`
- `useCoachAssistant` return value wrapped in `useMemo`
- All array state updates pass through `stableArrayUpdate`

---

### File Budget (Locked: 13 new files + 4 modified)

| Phase | New Files | Modified Files |
|---|---|---|
| Phase 0 | `CoachLayoutStyles.ts`, `CoachChatStyles.ts`, `CoachInputStyles.ts`, `CoachMarkdownStyles.ts`, `CoachVoiceStyles.ts` | `SwanCoachAssistantPage.tsx`, existing style barrel |
| Phase 1 | `ConversationSidebar.tsx`, `ConversationItem.tsx`, `useConversationSidebar.ts` | — |
| Phase 2 | `MarkdownRenderer.tsx` | — |
| Phase 3 | `ThinkingIndicator.tsx`, `SuggestedPrompts.tsx` | `CoachMessage.tsx` (inline ProviderBadge) |
| Phase 4 | `useVoiceRecorder.ts`, `useGeminiTranscription.ts`, `VoiceRecordingOverlay.tsx` | — |
| Phase 5 | `AttachmentTray.tsx`, `useFileAttachment.ts` | — |
| Cross-cutting | `hooks/types.ts`, `hooks/index.ts`, `utils/stateGuards.ts`, `components/common/ComponentErrorBoundary.tsx` | `.eslintrc.json` |

**300-line budget applies to every file. No exceptions.**

---

### Style Architecture (Locked: 5 files)

| File | Responsibility | Ceiling |
|---|---|---|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 lines |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 lines |
| `CoachInputStyles.ts` | Input bar, textarea, attachment tray, send button | ~190 lines |
| `CoachMarkdownStyles.ts` | Tables, code blocks, lists, headers, syntax highlighting (isolated from chat bubble cascade) | ~200 lines |
| `CoachVoiceStyles.ts` | Recording overlay, waveform, permission fallback (modal-layer stacking context) | ~120 lines |

---

### Virtualization (Locked)

```typescript
// ConversationSidebar.tsx — canonical implementation
{rowVirtualizer.getVirtualItems().map(virtualRow => {
  const conversation = filteredConversations[virtualRow.index];
  return (
    <div
      key={conversation.id}          // stable identity — never index
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <ConversationItem conversation={conversation} />
    </div>
  );
})}
```

**Dependency decision required before Phase 1:** Check `package.json` for `@tanstack/react-virtual`. If absent, use `content-visibility: auto` CSS fallback. Document in `docs/ai-workflow/DECISIONS.md`.

---

### Error Boundary (Locked)

```typescript
// components/common/ComponentErrorBoundary.tsx
export class ComponentErrorBoundary extends Component<Props, State> {
  // reset() method enables permission-retry flow in VoiceRecordingOverlay
  // fallback accepts (reset: () => void) => ReactNode for interactive recovery
}
```

**Placement:**
1. `<ConversationSidebar />` → static fallback
2. `<ReactMarkdown />` inside `MarkdownRenderer.tsx` → static fallback
3. `<VoiceRecordingOverlay />` → `(reset) => <PermissionDeniedBanner onRetry={reset} />` functional fallback

---

### Pre-Phase 1 Checklist (Complete & Locked)

**Infrastructure (before any Phase 0 code):**
- [ ] ESLint rules added: `consistent-type-imports` + `no-import-type-side-effects`
- [ ] `utils/stateGuards.ts` created with `stableArrayUpdate<T>` (optional comparator param)
- [ ] `components/common/ComponentErrorBoundary.tsx` created
- [ ] `hooks/types.ts` and `hooks/index.ts` created (empty barrels, populated as hooks are built)
- [ ] `@tanstack/react-virtual` presence confirmed in `package.json`; decision documented

**Per-hook implementation gates (each hook must pass before next phase):**
- [ ] All exported functions use `useCallback`
- [ ] All derived arrays/objects use `useMemo`
- [ ] All API response array updates use `stableArrayUpdate`
- [ ] Hook return object uses `useMemo`
- [ ] Interface exported to `hooks/types.ts`
- [ ] Runtime export added to `hooks/index.ts`

**Component implementation gates:**
- [ ] `key={entity.id}` on all virtualized/filtered list items (never index)
- [ ] Error boundary wrapping all three critical subtrees
- [ ] No component file exceeds 300 lines
- [ ] No style file exceeds 300 lines

---

**Architecture status: FULLY LOCKED. Phase 0 implementation may begin.**

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
