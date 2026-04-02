# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 140.3s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

# 🦢 SwanStudios Architecture Review: AI Coach Assistant Module

> **Note on Scope:** The provided blueprint document covers Bootcamp/Pain Chart features, but your 7 review questions target the **AI Coach Assistant** module (`ConversationSidebar`, `CoachInputBar`, `MarkdownRenderer`, voice/transcription hooks, etc.). This review addresses the Coach Assistant architecture under your mandatory constraints.

---

## 1. 22 New Files — Decomposition Assessment
**Verdict: ✅ Appropriate, with minor consolidation opportunities.**
- 22 files is well-calibrated for a complex, voice-first AI interface. The 300-line constraint *forces* this granularity.
- **Merge candidates:** Only merge if a file is `<60 LOC` and purely presentational (e.g., `AttachmentIcon.tsx` + `AttachmentTray.tsx` → `AttachmentUI.tsx`). Keep all logic/state files separate.
- **Thin file risk:** Avoid "wrapper hell." If a component only passes props to a child, inline it or use composition instead of a dedicated file.

---

## 2. `styles/` Directory — 9 Files Total
**Verdict: ⚠️ Over-fragmented. Consolidate to 4-5.**
Styled-components benefit from co-location, but scattering 9 style files creates import overhead and theme drift.
- **Recommended consolidation:**
  - `sidebar.styles.ts` (list, search, action buttons)
  - `input.styles.ts` (textarea, mic button, attachment tray, send)
  - `markdown.styles.ts` (typography, code blocks, tables, callouts)
  - `layout.styles.ts` (grid, containers, scroll areas, responsive breakpoints)
- Use your active palette via `theme.ts` tokens (`theme.colors.midnightSapphire`, `theme.colors.iceWing`) to avoid hardcoding.

---

## 3. `hooks/` Directory — 5 Hooks
**Verdict: ✅ Excellent Separation of Concerns.**
| Hook | Responsibility | Lifecycle/State |
|------|----------------|-----------------|
| `useCoachAssistant` | Orchestrator: message routing, AI streaming, error boundaries | Complex, manages all sub-hooks |
| `useConversationSidebar` | UI state: open/close, search filter, active thread selection | Local UI state, no side effects |
| `useVoiceRecorder` | MediaStream API, permission handling, audio blob capture | Hardware-bound, cleanup-heavy |
| `useGeminiTranscription` | WebSocket/HTTP streaming, chunk processing, text normalization | Async, network-bound |
| `useFileAttachment` | Drag/drop, MIME validation, upload progress, preview URLs | File API, async |

**Boundary Rule:** Sub-hooks should never import `useCoachAssistant`. Data flows upward via callbacks or context.

---

## 4. 300-Line Budget — High-Risk Files & Mitigation
| File | Est. LOC | Risk | Mitigation Strategy |
|------|----------|------|---------------------|
| `ConversationSidebar.tsx` | 250 | 🔴 High (search + list + actions) | Extract `SearchFilter.tsx`, `ThreadList.tsx`, `SidebarActions.tsx`. Keep parent as layout router. |
| `MarkdownRenderer.tsx` | 180 | 🔴 High (8+ custom components) | Extract each block: `CodeBlock.tsx`, `DataTable.tsx`, `WarningCallout.tsx`, `ExerciseCard.tsx`. Use `react-markdown`'s `components` prop. |
| `CoachInputBar.tsx` | 295 | 🔴 Critical (voice + attachments + input) | Split into `VoiceControl.tsx`, `AttachmentTray.tsx`, `MessageInput.tsx`, `SendControl.tsx`. Parent handles layout only. |
| `MarkdownRenderer.tsx` | 180 | 🟡 Medium | Keep core renderer <150. Move custom components to `markdown/blocks/` dir. |
| `useCoachAssistant.ts` | ~220 | 🟢 Safe | Orchestrator should stay lean. Delegate streaming to `useGeminiTranscription`, UI to `useConversationSidebar`. |

**Rule of Thumb:** If a file contains >3 distinct UI sections or >2 independent state machines, extract.

---

## 5. Import Graph & Dependency Risks
```
features/coach-assistant/
├── context/CoachAssistantContext.tsx  ← State provider (messages, loading, errors)
├── hooks/
│   ├── useCoachAssistant.ts           ← Imports: context, useVoiceRecorder, useGeminiTranscription, useFileAttachment
│   ├── useConversationSidebar.ts      ← Imports: context (read-only)
│   ├── useVoiceRecorder.ts            ← Imports: shared/audio-utils, shared/error-handlers
│   ├── useGeminiTranscription.ts      ← Imports: shared/api/gemini, shared/stream-parser
│   └── useFileAttachment.ts           ← Imports: shared/upload-service, shared/mime-validator
├── components/
│   ├── ConversationSidebar.tsx        ← Imports: hooks, styles, sub-components
│   ├── CoachInputBar.tsx              ← Imports: hooks, styles, sub-components
│   ├── MarkdownRenderer.tsx           ← Imports: markdown/blocks/*, styles
│   └── ...
└── styles/
    ├── layout.styles.ts
    ├── sidebar.styles.ts
    ├── input.styles.ts
    └── markdown.styles.ts
```
**Circular Risk:** 🟢 None if unidirectional. `hooks` → `shared/utils`, `components` → `hooks`/`styles`. Never import components into hooks. Use context for cross-component state.
**Deep Chains:** Keep max depth at 3: `Component → Hook → Shared Utility`. Flatten with explicit imports.

---

## 6. Barrel Exports Strategy
**Verdict: ❌ Avoid internal barrels. Use explicit imports.**
- `SwanCoachStyles.ts` as a barrel creates a monolithic import that breaks tree-shaking and increases bundle size.
- **Recommendation:**
  - `hooks/` and `styles/`: **No `index.ts`**. Import explicitly: `import { useVoiceRecorder } from './hooks/useVoiceRecorder'`
  - Feature root: `features/coach-assistant/index.ts` → Export only public API (`CoachAssistantProvider`, `CoachAssistantPage`)
  - Benefits: Faster cold starts, clearer dependency tracking, safer refactoring, aligns with Vite/Webpack best practices.

---

## 7. Shared vs Local Hook Boundary
**Verdict: ✅ Correct.**
- `useAIChat` (shared): Handles generic chat protocol (message queue, streaming parser, retry logic, pagination). Reusable across `CoachAssistant`, `ClientMessaging`, `AdminSupport`.
- Local hooks: Domain-specific to the AI Coach (voice capture, transcription pipeline, sidebar UI state, file attachment UX).
- **Boundary Rule:** If a hook references `SwanStudios`-specific business logic (NASM phases, Octalysis scoring, pain chart data, bootcamp sprints), it stays local. If it handles transport, streaming, or generic state, it moves to `shared/`.

---

## 📁 Proposed File Tree (Coach Assistant Feature)
```
src/features/coach-assistant/
├── context/
│   └── CoachAssistantContext.tsx          (~120)
├── hooks/
│   ├── useCoachAssistant.ts               (~210)
│   ├── useConversationSidebar.ts          (~95)
│   ├── useVoiceRecorder.ts                (~140)
│   ├── useGeminiTranscription.ts          (~160)
│   └── useFileAttachment.ts               (~110)
├── components/
│   ├── CoachAssistantPage.tsx             (~85)
│   ├── ConversationSidebar/
│   │   ├── index.tsx                      (~60)
│   │   ├── SearchFilter.tsx               (~75)
│   │   ├── ThreadList.tsx                 (~110)
│   │   └── SidebarActions.tsx             (~65)
│   ├── CoachInputBar/
│   │   ├── index.tsx                      (~70)
│   │   ├── VoiceControl.tsx               (~85)
│   │   ├── AttachmentTray.tsx             (~90)
│   │   └── MessageInput.tsx               (~100)
│   ├── MarkdownRenderer/
│   │   ├── index.tsx                      (~95)
│   │   └── blocks/
│   │       ├── CodeBlock.tsx              (~70)
│   │       ├── DataTable.tsx              (~80)
│   │       ├── WarningCallout.tsx         (~60)
│   │       └── ExerciseCard.tsx           (~95)
│   └── LoadingSkeleton.tsx                (~55)
├── styles/
│   ├── layout.styles.ts                   (~85)
│   ├── sidebar.styles.ts                  (~110)
│   ├── input.styles.ts                    (~100)
│   └── markdown.styles.ts                 (~130)
├── utils/
│   ├── audioProcessor.ts                  (~90)
│   └── markdownTransformers.ts            (~110)
└── index.ts                               (~15) [Public API only]
```

---

## 📊 Line Budget & Compliance Table
| Category | Files | Est. LOC | Max Allowed | Status |
|----------|-------|----------|-------------|--------|
| Context | 1 | 120 | 300 | ✅ |
| Hooks | 5 | 715 | 1500 (300 each) | ✅ |
| Components | 14 | 1245 | 4200 (300 each) | ✅ |
| Styles | 4 | 425 | 1200 (300 each) | ✅ |
| Utils | 2 | 200 | 600 (300 each) | ✅ |
| **Total** | **26** | **~2705** | **7800** | ✅ **All files <300** |

> **Note:** Excludes comments/blanks per constraint. All files designed with single-responsibility to guarantee compliance.

---

## 🛡️ Architectural Guardrails for SwanStudios
1. **Strict 300-Line Enforcement:** CI/CD should run `cloc --exclude-dir=node_modules,dist --by-file --csv` and fail if any `.tsx`/`.ts` exceeds 300 LOC.
2. **Theme Tokenization:** Replace all hex values with `theme.colors.*` from your Crystalline Swan palette. Create `src/theme/swanTheme.ts` with typed CSS variables.
3. **Voice Pipeline Isolation:** `useVoiceRecorder` and `useGeminiTranscription` must not share mutable state. Pass blobs/streams via callbacks to avoid race conditions.
4. **Markdown Security:** Sanitize all AI output with `DOMPurify` before rendering. Custom blocks should accept `className` for theme overrides.
5. **Performance:** Memoize `MarkdownRenderer` and `ThreadList` with `React.memo`. Use `useCallback` for hook callbacks. Virtualize long conversation lists.

This architecture scales cleanly into your NASM OPT periodization, Octalytics gamification, and pain-aware workout generation pipelines while strictly honoring the 300-line constraint. Ready for sprint breakdown.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
