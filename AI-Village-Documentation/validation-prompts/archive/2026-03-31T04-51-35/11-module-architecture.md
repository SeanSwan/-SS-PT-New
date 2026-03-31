# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 60.5s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

# Swan Coach Assistant — Architecture Review & Optimization

## Executive Assessment
The plan is functionally comprehensive and aligns well with competitive parity goals. However, the proposed 22-file decomposition is **over-fragmented** for a single feature module, creating maintenance overhead and increasing the risk of violating the 300-line constraint through prop-drilling and boilerplate. Below is a precise architectural review with enforced optimizations.

---

## 1. File Decomposition (22 → ~18)
**Verdict:** Slightly over-decomposed. Several files are too thin (<80 lines) and tightly coupled, which increases import overhead without improving reusability.

**Recommended Merges:**
| Original Files | Merged Into | Rationale |
|----------------|-------------|-----------|
| `FileAttachmentButton.tsx` + `AttachmentPreview.tsx` | `AttachmentTray.tsx` | Both handle the same lifecycle (select → validate → preview → remove). ~160 lines combined. |
| `ProviderBadge.tsx` | `CoachMessage.tsx` | Admin-only metadata badge. Inline component keeps it under 40 lines and avoids unnecessary abstraction. |
| `SidebarHeader` + `SidebarFooter` (implied) | `ConversationSidebar.tsx` | Keep sidebar self-contained. Extract only if reused elsewhere (it isn't). |

**Result:** 18 new/modified files. Tighter cohesion, fewer cross-file dependencies, easier to enforce the 300-line limit.

---

## 2. Styles Directory (9 → 4)
**Verdict:** 9 style files is excessive. Splitting by phase rather than by component cluster creates import sprawl and makes theme overrides harder to audit.

**Consolidation Strategy:**
| New File | Contains | Est. Lines |
|----------|----------|------------|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 |
| `CoachInputStyles.ts` | Input bar, auto-grow textarea, voice orb, attachment tray, send button | ~190 |
| `CoachMarkdownStyles.ts` | Tables, code blocks, lists, links, typography overrides | ~150 |

**Why this works:** Each file maps to a distinct visual layer. All stay well under 300 lines. `SwanCoachStyles.ts` becomes a single barrel re-exporting these 4 files, maintaining backward compatibility while enforcing modularity.

---

## 3. Hooks Directory (5 → 4)
**Verdict:** Separation of concerns is conceptually sound, but `useVoiceRecorder` and `useGeminiTranscription` are tightly coupled state machines. Splitting them forces prop-drilling of `audioBlob`, `isRecording`, and `transcribing`.

**Optimization:**
- Merge into **`useVoiceTranscription.ts`** (~140 lines). Handles `MediaRecorder` lifecycle, `AnalyserNode` levels, blob creation, upload to `/transcribe`, rate-limit tracking, and fallback logic.
- Keep `useConversationSidebar.ts` (~70 lines) for UI state only.
- Keep `useFileAttachment.ts` (~110 lines) for validation, preview generation, and R2 upload prep.
- Keep `useCoachAssistant.ts` as the orchestrator.

**Result:** 4 hooks. Unidirectional data flow: `useVoiceTranscription` → `CoachInputBar` → `useCoachAssistant`.

---

## 4. 300-Line Budget Risk Mitigation
Three files are flagged as high-risk. Here’s how to guarantee compliance:

| File | Risk | Mitigation Strategy |
|------|------|---------------------|
| `ConversationSidebar.tsx` (~250) | Inline editing, search, hover actions, mobile overlay logic will push it over. | Extract `SearchInput` and `ConversationList` as presentational subcomponents. Move inline rename logic to `useConversationSidebar`. Keep orchestrator at ~180 lines. |
| `MarkdownRenderer.tsx` (~180) | 8+ custom overrides + GFM plugins can bloat. | Keep overrides inline but use concise styled-components. Extract only `CodeBlock.tsx` if syntax highlighting config exceeds 50 lines. Target: ~160 lines. |
| `CoachInputBar.tsx` (~295) | **Critical.** Voice, attachments, char count, keyboard shortcuts, auto-grow. | Split into `InputTextArea.tsx` (auto-grow + keyboard + char count), `VoiceControl.tsx`, `AttachmentTray.tsx`. `CoachInputBar` becomes a 120-line layout orchestrator. |

**Rule Enforcement:** Any component approaching 250 lines must extract presentational logic or move state to a hook. No exceptions.

---

## 5. Import Graph & Dependency Safety
```
SwanCoachAssistantPage.tsx
├── ConversationSidebar.tsx
│   ├── useConversationSidebar.ts
│   └── useAIChat (shared)
├── CoachMainPanel.tsx
│   ├── ContextChipBar.tsx
│   ├── ResponseStyleSelector.tsx
│   ├── MessagesArea.tsx
│   │   ├── CoachMessage.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   └── ThinkingIndicator.tsx
│   │   └── SuggestedPrompts.tsx
│   └── CoachInputBar.tsx
│       ├── InputTextArea.tsx
│       ├── VoiceControl.tsx → useVoiceTranscription.ts
│       └── AttachmentTray.tsx → useFileAttachment.ts
```

**Circular Risk Assessment:**
- **Risk Level:** Low if strict unidirectional flow is enforced.
- **Prevention Rules:**
  1. Hooks never import components.
  2. Components never import other components' hooks.
  3. `useAIChat` remains pure API/state logic (no UI imports).
  4. Use `@/features/coach-assistant/...` path aliases to prevent `../../../` deep chains.
  5. Run `eslint-plugin-import` with `no-cycle` rule during CI.

---

## 6. Barrel Export Strategy
**Verdict:** `SwanCoachStyles.ts` as a barrel is acceptable. **Do not create barrels for `hooks/` or `components/`.**

**Why:**
- Modern bundlers (Vite/Webpack 5) tree-shake better with explicit imports.
- Barrels in hooks/components frequently cause circular dependency warnings in large React apps.
- Explicit imports improve IDE navigation and make dependency graphs transparent.

**Recommendation:**
```typescript
// ✅ Good
import { useVoiceTranscription } from '@/features/coach-assistant/hooks/useVoiceTranscription';
import { CoachLayoutStyles } from '@/features/coach-assistant/styles/CoachLayoutStyles';

// ❌ Avoid
import { useVoiceTranscription, useFileAttachment } from '@/features/coach-assistant/hooks';
```

---

## 7. Shared vs Local Boundary
**Verdict:** Correct. `useAIChat` belongs in shared/hooks (or `@/features/ai-chat/` if reused elsewhere). New hooks are feature-specific and should remain local.

**Refinement:**
- If `useAIChat` is only consumed by the Coach Assistant, move it to `@/features/coach-assistant/hooks/useAIChat.ts` to avoid false sharing.
- If it powers other chat interfaces (e.g., client messaging, admin support), keep it in `@/shared/hooks/` but ensure it exports only generic functions (`sendMessage`, `listConversations`, etc.). UI-specific logic (sidebar state, voice, attachments) stays local.

---

## Proposed Optimized File Tree
```
src/features/coach-assistant/
├── components/
│   ├── layout/
│   │   ├── ConversationSidebar.tsx
│   │   └── ConversationItem.tsx
│   ├── chat/
│   │   ├── CoachMessage.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── ThinkingIndicator.tsx
│   │   └── SuggestedPrompts.tsx
│   ├── input/
│   │   ├── CoachInputBar.tsx
│   │   ├── InputTextArea.tsx
│   │   ├── VoiceControl.tsx
│   │   └── AttachmentTray.tsx
│   └── shared/
│       ├── ContextChipBar.tsx
│       └── ResponseStyleSelector.tsx
├── hooks/
│   ├── useCoachAssistant.ts
│   ├── useConversationSidebar.ts
│   ├── useVoiceTranscription.ts      # Merged recorder + transcription
│   └── useFileAttachment.ts
├── styles/
│   ├── CoachLayoutStyles.ts
│   ├── CoachChatStyles.ts
│   ├── CoachInputStyles.ts
│   └── CoachMarkdownStyles.ts
├── types.ts
├── constants.ts
├── SwanCoachStyles.ts                # Barrel re-exporting styles/
└── SwanCoachAssistantPage.tsx        # Root orchestrator
```

---

## Strict Line Budget Table
| File | Target Lines | Max Allowed | Status |
|------|--------------|-------------|--------|
| `SwanCoachAssistantPage.tsx` | 140 | 300 | ✅ Safe |
| `ConversationSidebar.tsx` | 180 | 300 | ✅ Safe (after extraction) |
| `ConversationItem.tsx` | 110 | 300 | ✅ Safe |
| `CoachMessage.tsx` | 130 | 300 | ✅ Safe |
| `MarkdownRenderer.tsx` | 160 | 300 | ✅ Safe |
| `ThinkingIndicator.tsx` | 75 | 300 | ✅ Safe |
| `SuggestedPrompts.tsx` | 100 | 300 | ✅ Safe |
| `CoachInputBar.tsx` | 120 | 300 | ✅ Safe (after split) |
| `InputTextArea.tsx` | 140 | 300 | ✅ Safe |
| `VoiceControl.tsx` | 95 | 300 | ✅ Safe |
| `AttachmentTray.tsx` | 150 | 300 | ✅ Safe |
| `useCoachAssistant.ts` | 140 | 300 | ✅ Safe |
| `useConversationSidebar.ts` | 70 | 300 | ✅ Safe |
| `useVoiceTranscription.ts` | 140 | 300 | ✅ Safe |
| `useFileAttachment.ts` | 110 | 300 | ✅ Safe |
| `CoachLayoutStyles.ts` | 180 | 300 | ✅ Safe |
| `CoachChatStyles.ts` | 160 | 300 | ✅ Safe |
| `CoachInputStyles.ts` | 190 | 300 | ✅ Safe |
| `CoachMarkdownStyles.ts` | 150 | 300 | ✅ Safe |
| **TOTAL NEW/MODIFIED** | **~2,430** | **<300/file** | **✅ COMPLIANT** |

---

## Final Implementation Directives
1. **Enforce the 300-line rule at the linter level:** Add `"max-lines": ["error", 300]` to ESLint with `ignoreComments: true, ignoreBlankLines: true`.
2. **Extract before you write:** If a component's JSX exceeds 150 lines, split into presentational subcomponents immediately.
3. **Voice fallback chain:** `MediaRecorder` → `Web Speech API` → `Manual typing prompt`. Handle gracefully in `useVoiceTranscription`.
4. **Theme compliance:** All new styled-components must use `var(--bg-*)`, `var(--text-*)`, `var(--accent-*)` with your Crystalline Swan palette as fallbacks. No hardcoded hex values.
5. **CI Gate:** Add a pre-commit hook that runs `wc -l` on modified `.tsx/.ts` files and blocks if any exceed 300 (excluding blanks/comments).

This architecture maintains competitive feature parity while strictly adhering to your line budget, ensuring long-term maintainability for a high-end SaaS targeting affluent professionals.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
