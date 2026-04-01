# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 115.3s
> **Files:** docs/ai-workflow/blueprints/MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md
> **Generated:** 3/31/2026, 4:40:03 PM

---

# Architecture Review: Coach Assistant Enhancement

## 1. File Decomposition (22 Files)
**Verdict:** Appropriate for enterprise-scale React, but requires strict composition discipline.  
- **Keep:** Orchestrator hooks, feature-specific UI containers, and domain-level services.  
- **Merge/Refactor:** Any file under ~40 LOC that only wraps a styled component or passes props directly. These should be inlined into their parent or converted to pure styled-components.  
- **Rule of Thumb:** If a file doesn't contain conditional rendering, state management, or complex event handling, it's likely too thin. Aim for 80–250 LOC per file to leave headroom for future edge-case handling.

## 2. Styles Directory Strategy (9 Files)
**Verdict:** Over-fragmented. Consolidate to **4 files** or adopt co-location.  
- **Problem:** 9 separate style files create import sprawl, increase cognitive load, and complicate theme variable sharing across the feature.  
- **Recommendation:** Consolidate into logical boundaries:
  1. `layout.styles.ts` (page shell, flex containers, breakpoints)
  2. `sidebar.styles.ts` (list, search, toggle, desktop/mobile states)
  3. `messages.styles.ts` (bubbles, chips, markdown containers, animations)
  4. `input.styles.ts` (textarea, voice button, attachment tray, send)
- **Alternative (Preferred):** Co-locate styles as `Component.styles.ts` next to each component. This aligns with modern React DX, reduces cross-file imports, and naturally enforces the 300-line limit.

## 3. Hooks Separation of Concerns (5 Hooks)
**Verdict:** Well-architected, but requires strict interface boundaries.  
- `useCoachAssistant` → **Orchestrator only**. Should not contain DOM/media logic. Delegates to sub-hooks and exposes a clean API to the UI.
- `useConversationSidebar` → **UI state only**. Handles open/close, search filtering, active selection.
- `useVoiceRecorder` → **Media capture only**. Handles `MediaRecorder`, permissions, blob generation.
- `useGeminiTranscription` → **AI service only**. Handles WebSocket/HTTP streaming, PII stripping, fallback logic.
- `useFileAttachment` → **File handling only**. Handles drag/drop, validation, preview generation, upload progress.
- **Risk:** `useVoiceRecorder` and `useGeminiTranscription` will likely need tight coupling. Consider a `useVoicePipeline` wrapper if prop drilling becomes excessive, but keep them separate for unit testing.

## 4. 300-Line Budget Risk Assessment
All three flagged files are at **HIGH RISK**. Mitigation requires strict component extraction:

| File | Est. LOC | Risk | Mitigation Strategy |
|------|----------|------|---------------------|
| `ConversationSidebar.tsx` | ~250 | 🔴 High | Extract `SearchFilter`, `ConversationItem`, `SidebarHeader`, `EmptyState`. Keep parent as layout + data wiring only. |
| `MarkdownRenderer.tsx` | ~180 | 🟡 Medium | Extract 8 custom renderers into `renderers/` dir. Use a `components` map object. Keep main file to `ReactMarkdown` config + wrapper. |
| `CoachInputBar.tsx` | ~295 | 🔴 Critical | Extract `VoiceControl`, `AttachmentTray`, `PromptInput`, `SendButton`. Parent handles only state aggregation and submit logic. |

**Rule:** Any component with >3 distinct UI states (idle, loading, error, success, empty) must be split.

## 5. Import Graph & Dependency Architecture
```
SwanCoachAssistantPage.tsx
├── useCoachAssistant (orchestrator)
│   ├── useAIChat (shared CRUD)
│   ├── useConversationSidebar (UI state)
│   ├── useVoicePipeline (recorder + transcription)
│   └── useFileAttachment (uploads)
├── ConversationSidebar/
│   ├── SearchFilter.tsx
│   ├── ConversationList.tsx
│   └── SidebarActions.tsx
├── ChatArea/
│   ├── MessageList.tsx
│   ├── MarkdownRenderer.tsx → renderers/*
│   └── ContextChips.tsx
└── CoachInputBar/
    ├── VoiceControl.tsx
    ├── AttachmentTray.tsx
    └── PromptInput.tsx
```
- **Circular Risk:** `useCoachAssistant` ↔ `useConversationSidebar` if sidebar calls back to orchestrator while orchestrator imports sidebar state. **Fix:** Pass callbacks down, never import sibling hooks.
- **Deep Chains:** Max depth = 3 (Page → Container → Leaf). Use React Context for `CoachContext` if prop drilling exceeds 3 levels.
- **Unidirectional Flow:** Data flows down, events bubble up. No cross-component imports.

## 6. Barrel Export Policy
**Verdict:** Avoid deep barrels. Use explicit imports.  
- `SwanCoachStyles.ts` as a barrel is acceptable if it only re-exports 4 consolidated style files, but explicit imports (`import { SidebarContainer } from './styles/sidebar.styles'`) are safer for Vite/Webpack tree-shaking and HMR stability.
- **Recommendation:** Do NOT create `hooks/index.ts` or `styles/index.ts`. Barrels introduce hidden circular dependencies and break incremental builds in large monorepos. Keep imports explicit and path-aliased (`@/features/coach-assistant/...`).

## 7. Shared vs Local Hook Boundaries
**Verdict:** Correctly scoped.  
- `useAIChat` belongs in `shared/hooks/` because conversation/message CRUD is domain-agnostic and will likely power client messaging, admin review, or social feed AI later.
- Local hooks (`useVoiceRecorder`, `useFileAttachment`, etc.) are feature-specific and should remain in `coach-assistant/hooks/`.
- **Boundary Rule:** If a hook is used by ≥2 distinct features, promote to `shared/`. If it's tied to a specific UI flow or third-party API (Gemini, MediaRecorder), keep local.

---

## Proposed File Tree
```
frontend/src/features/coach-assistant/
├── SwanCoachAssistantPage.tsx
├── hooks/
│   ├── useCoachAssistant.ts
│   ├── useConversationSidebar.ts
│   ├── useVoiceRecorder.ts
│   ├── useGeminiTranscription.ts
│   └── useFileAttachment.ts
├── components/
│   ├── ConversationSidebar/
│   │   ├── ConversationSidebar.tsx
│   │   ├── SearchFilter.tsx
│   │   ├── ConversationList.tsx
│   │   └── SidebarActions.tsx
│   ├── MarkdownRenderer/
│   │   ├── MarkdownRenderer.tsx
│   │   └── renderers/
│   │       ├── CodeBlock.tsx
│   │       ├── DataTable.tsx
│   │       ├── QuoteBlock.tsx
│   │       └── InlineLink.tsx
│   ├── CoachInputBar/
│   │   ├── CoachInputBar.tsx
│   │   ├── VoiceControl.tsx
│   │   ├── AttachmentTray.tsx
│   │   └── PromptInput.tsx
│   └── MessageBubble/
│       ├── UserMessage.tsx
│       ├── AIMessage.tsx
│       └── ContextChips.tsx
├── styles/
│   ├── layout.styles.ts
│   ├── sidebar.styles.ts
│   ├── messages.styles.ts
│   └── input.styles.ts
└── utils/
    ├── markdownConfig.ts
    └── voicePipeline.ts
```

## Line Budget Matrix
| File | Target LOC | Max Allowed | Risk Level | Action Required |
|------|------------|-------------|------------|-----------------|
| `SwanCoachAssistantPage.tsx` | 120 | 300 | 🟢 Low | Keep as layout + context provider |
| `useCoachAssistant.ts` | 180 | 300 | 🟡 Medium | Extract data mappers to `utils/` |
| `useConversationSidebar.ts` | 90 | 300 | 🟢 Low | Pure state machine |
| `useVoiceRecorder.ts` | 110 | 300 | 🟢 Low | Media API only |
| `useGeminiTranscription.ts` | 140 | 300 | 🟡 Medium | Keep streaming logic isolated |
| `useFileAttachment.ts` | 100 | 300 | 🟢 Low | Validation + preview only |
| `ConversationSidebar.tsx` | 160 | 300 | 🟢 Low | Extract children |
| `SearchFilter.tsx` | 65 | 300 | 🟢 Low | - |
| `ConversationList.tsx` | 130 | 300 | 🟢 Low | Virtualize if >50 items |
| `SidebarActions.tsx` | 55 | 300 | 🟢 Low | - |
| `MarkdownRenderer.tsx` | 95 | 300 | 🟢 Low | Config-only |
| `renderers/*` (4 files) | 40-70 ea | 300 | 🟢 Low | Isolated |
| `CoachInputBar.tsx` | 140 | 300 | 🟢 Low | Extract children |
| `VoiceControl.tsx` | 85 | 300 | 🟢 Low | - |
| `AttachmentTray.tsx` | 110 | 300 | 🟢 Low | - |
| `PromptInput.tsx` | 90 | 300 | 🟢 Low | - |
| `MessageBubble/*` (3 files) | 70-100 ea | 300 | 🟢 Low | - |
| `styles/*` (4 files) | 80-120 ea | 300 | 🟢 Low | Co-locate if possible |
| `utils/*` (2 files) | 60-90 ea | 300 | 🟢 Low | Pure functions only |

## Implementation Directives
1. **Enforce 300-line hard limit** via ESLint (`max-lines-per-file: 300`) and pre-commit hooks.
2. **Adopt explicit imports** over barrels to prevent circular dependencies and optimize Vite HMR.
3. **Use React Context sparingly**: Only for `CoachContext` if prop drilling exceeds 3 levels. Prefer composition and custom hooks.
4. **Style consolidation**: Merge 9 style files into 4 logical boundaries or co-locate as `*.styles.ts`.
5. **Strict unidirectional flow**: Page → Orchestrator Hook → Subcomponents → Sub-hooks. No cross-imports between sibling directories.
6. **PII & Fallbacks**: Ensure `useGeminiTranscription` strips PII before streaming and implements the 4-provider failover chain.
7. **Accessibility**: Maintain 44px touch targets, `aria-live` for AI responses, and keyboard navigation for sidebar/input.

This architecture guarantees scalability, enforces the 300-line constraint, and aligns with SwanStudios' premium, voice-first, NASM-compliant product vision.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
