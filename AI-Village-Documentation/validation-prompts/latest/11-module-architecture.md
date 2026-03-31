# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 89.3s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

# Architectural Review: Teach Mode & Coach Assistant Expansion

## 1. File Decomposition (22 Files)
**Verdict:** Appropriate granularity for a large-scale SaaS, but requires minor consolidation to avoid "component sprawl."
- **Keep:** Feature-specific containers (`ConversationSidebar`, `CoachInputBar`, `MarkdownRenderer`), hooks, and API adapters.
- **Merge:** 3-4 micro-presentational components (e.g., `PhaseBadge`, `ContextChip`, `TooltipWrapper`) should be merged into a single `CoachPrimitives.tsx` (~120 lines). Over-fragmentation increases import overhead and cognitive load.
- **Split:** Any file handling >2 distinct UI states (e.g., loading, empty, error, success) should extract state renderers into separate files.

## 2. Styles Directory (9 Files)
**Verdict:** Too fragmented for `styled-components`. Consolidate to **4 files** max.
- **Problem:** 9 style files create maintenance overhead and duplicate CSS variable declarations.
- **Solution:** 
  1. `theme.ts` — Centralized CSS variable mapping for your palette (`--midnight-sapphire: #002060`, `--ice-wing: #60C0F0`, etc.)
  2. `layout.styles.ts` — Sidebar, grid, flex containers, responsive breakpoints
  3. `components.styles.ts` — Buttons, inputs, cards, badges, primitives
  4. `teach-mode.styles.ts` — Tabbed panels, progression paths, markdown overrides
- **Rule:** Use CSS variables exclusively. No hardcoded hex values in component files.

## 3. Hooks Directory (5 Hooks)
**Verdict:** Excellent separation of concerns. Aligns with SOLID principles.
- `useCoachAssistant` → Orchestrator (state machine, context routing)
- `useConversationSidebar` → UI state (open/close, search filter, active thread)
- `useVoiceRecorder` → Media API (getUserMedia, blob handling, permission states)
- `useGeminiTranscription` → AI processing (WebSocket/REST streaming, chunking, error recovery)
- `useFileAttachment` → File I/O (validation, preview generation, upload queue)
- **Recommendation:** Keep separate. They have distinct lifecycles, error boundaries, and test surfaces. If `useVoiceRecorder` and `useGeminiTranscription` share heavy state, extract a `useAudioPipeline` utility, but keep hooks decoupled for mockability.

## 4. 300-Line Budget & Risk Mitigation
**Verdict:** High risk for 3 files. Mandatory refactoring required.

| File | Est. Lines | Risk | Mitigation Strategy |
|------|------------|------|---------------------|
| `ConversationSidebar.tsx` | ~250 | 🔴 High | Extract `SearchFilter`, `ThreadList`, `SidebarActions` into separate components. Keep sidebar as layout router only. |
| `MarkdownRenderer.tsx` | ~180 | 🟡 Medium-High | Extract 8+ renderers (`CodeBlock`, `TableRenderer`, `ExerciseCard`, `VideoEmbed`, etc.) into `renderers/` subfolder. Use a config map to register them. |
| `CoachInputBar.tsx` | ~295 | 🔴 Critical | Split into `InputField`, `AttachmentTray`, `VoiceControls`, `SendButton`. Parent handles layout + state coordination. |

**Enforcement Rule:** If a component exceeds 150 lines of JSX/logic, it violates the Single Responsibility Principle for this codebase. Extract immediately.

## 5. Import Graph & Dependency Analysis
```
src/features/coach/
├── components/
│   ├── ConversationSidebar.tsx ──┐
│   ├── CoachInputBar.tsx ────────┼──▶ hooks/useCoachAssistant.ts ──▶ hooks/useAIChat.ts (shared)
│   ├── MarkdownRenderer.tsx ─────┘
│   └── TeachModePanel.tsx ────────▶ hooks/useTeachData.ts
├── hooks/
│   ├── useConversationSidebar.ts ──▶ components/ConversationList.tsx
│   ├── useVoiceRecorder.ts ────────▶ utils/audio.ts
│   ├── useGeminiTranscription.ts ──▶ api/gemini.ts
│   └── useFileAttachment.ts ───────▶ utils/files.ts
└── styles/
    ├── theme.ts ───────────────────▶ (global CSS vars)
    └── layout.styles.ts ───────────▶ components/*
```
- **Circular Risk:** `useCoachAssistant` ↔ `useConversationSidebar`. Prevent by making `useConversationSidebar` purely UI-driven (no business logic) and passing callbacks down.
- **Deep Chains:** `CoachInputBar` → `useVoiceRecorder` → `useGeminiTranscription` → `api/gemini`. Acceptable if `useGeminiTranscription` exposes a clean `onTranscript` callback. Avoid importing `api/` directly into UI components.
- **Recommendation:** Enforce unidirectional data flow. Use React Context only for theme/global state, not for hook coordination.

## 6. Barrel Exports Strategy
- `SwanCoachStyles.ts` as a barrel is **anti-pattern** for styled-components. It forces tree-shaking failures and increases bundle size.
- **Correct Approach:**
  - `hooks/index.ts` → ✅ Safe. Re-exports hooks for clean imports.
  - `components/index.ts` → ✅ Safe. Re-exports UI primitives and containers.
  - `styles/index.ts` → ❌ Avoid. Import styles explicitly per component or use a shared `theme.ts` + CSS variables.
  - **Rule:** Barrels should only export public APIs. Never barrel internal utilities or styles.

## 7. Shared vs Local Boundary
- `useAIChat` in `shared/hooks/` is **correct**. It handles generic LLM streaming, message normalization, rate limiting, and error boundaries.
- Local hooks (`useVoiceRecorder`, `useFileAttachment`, etc.) are **correct** as feature adapters. They translate domain-specific inputs into the `useAIChat` contract.
- **Boundary Enforcement:** 
  - `useAIChat` accepts `Message[]`, `streamConfig`, and `onError`.
  - Local hooks never mutate `useAIChat` internals. They only dispatch formatted payloads.
  - If a local hook needs to override AI behavior, pass a `transformPayload` function rather than importing AI internals.

---

## Proposed File Tree (Strictly ≤300 Lines/File)
```
src/features/coach-assistant/
├── components/
│   ├── ConversationSidebar.tsx          # Layout + search state routing
│   ├── ConversationList.tsx             # Thread rendering + virtualization
│   ├── CoachInputBar.tsx                # Flex container + state coordination
│   ├── InputField.tsx                   # Textarea + auto-resize
│   ├── AttachmentTray.tsx               # File previews + remove/upload
│   ├── VoiceControls.tsx                # Mic toggle + waveform + timer
│   ├── MarkdownRenderer.tsx            # Config map + renderer dispatcher
│   ├── renderers/                       # 8+ files, each <60 lines
│   │   ├── CodeBlock.tsx
│   │   ├── TableRenderer.tsx
│   │   ├── ExerciseCard.tsx
│   │   └── ...
│   └── TeachModePanel.tsx              # 3-tab layout + lazy content loader
├── hooks/
│   ├── useCoachAssistant.ts            # Orchestrator + context routing
│   ├── useConversationSidebar.ts       # UI state + search filter
│   ├── useVoiceRecorder.ts             # MediaStream API wrapper
│   ├── useGeminiTranscription.ts       # AI streaming + chunk parser
│   └── useFileAttachment.ts            # Validation + preview + upload
├── styles/
│   ├── theme.ts                        # CSS var mapping for palette
│   ├── layout.styles.ts                # Grid/flex containers
│   ├── components.styles.ts            # Buttons, inputs, cards
│   └── teach-mode.styles.ts            # Tabs, progression paths, accordions
├── utils/
│   ├── audio.ts                        # Blob conversion, permission checks
│   └── markdown.ts                     # Parser config, sanitizer
├── api/
│   └── coach.ts                        # REST/WS endpoints
└── index.ts                            # Public barrel (components + hooks)
```

## Line Budget Matrix
| Module | File | Target Lines | Compliance Strategy |
|--------|------|--------------|---------------------|
| UI Containers | `ConversationSidebar.tsx` | ≤180 | Extract list/search/actions |
| UI Containers | `CoachInputBar.tsx` | ≤150 | Extract sub-components |
| UI Containers | `MarkdownRenderer.tsx` | ≤120 | Config map + lazy renderers |
| UI Containers | `TeachModePanel.tsx` | ≤200 | Tab router + lazy `React.Suspense` |
| Hooks | `useCoachAssistant.ts` | ≤220 | State machine only, no JSX |
| Hooks | `useConversationSidebar.ts` | ≤140 | Pure UI state |
| Hooks | `useVoiceRecorder.ts` | ≤160 | Media API only |
| Hooks | `useGeminiTranscription.ts` | ≤190 | Stream parser only |
| Hooks | `useFileAttachment.ts` | ≤150 | Validation/preview only |
| Styles | `theme.ts` | ≤80 | CSS var declarations only |
| Styles | `layout.styles.ts` | ≤120 | Container mixins only |
| Styles | `components.styles.ts` | ≤180 | Primitive styles only |
| **Total** | **~22 files** | **All ≤300** | Enforced via ESLint + pre-commit |

## Final Recommendations
1. **Enforce the 300-line rule at the linter level:** Add `max-lines-per-file: 300` to ESLint with `ignoreComments: true, ignoreBlankLines: true`.
2. **Adopt CSS Variables Early:** Map your palette (`#002060`, `#60C0F0`, `#C6A84B`, etc.) to `:root` variables. Use `var(--midnight-sapphire)` everywhere. Eliminates style duplication.
3. **Lazy-Load Teach Data:** Use `React.lazy` + `Suspense` for `TeachModePanel` tabs. Fetch deep exercise data only when Tab 1/2/3 is clicked.
4. **Voice Pipeline Isolation:** Keep `useVoiceRecorder` and `useGeminiTranscription` decoupled. Pass raw audio blobs via a shared `AudioContext` or event emitter, not direct hook imports.
5. **Progressive Disclosure:** Implement a `TeachModeDifficulty` context (`beginner | intermediate | expert`) to toggle section visibility. Matches your target demographic (30-55 professionals) who prefer scannable, role-adaptive UI.

This architecture guarantees scalability, strict line compliance, and clean separation between AI orchestration, UI presentation, and domain-specific teaching logic.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
