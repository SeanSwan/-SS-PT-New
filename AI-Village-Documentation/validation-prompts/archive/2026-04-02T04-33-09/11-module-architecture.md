# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 145.9s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

# Architecture Review: Bootcamp Creator + Coach Assistant Integration

## 1. File Decomposition (22 New Files)
**Verdict:** Over-fragmented in UI layer, under-fragmented in logic layer.
- **Too Thin / Merge Candidates:**
  - `BootcampBoardToggle.tsx` (~40 lines): Purely presentational. Merge into `BootcampClassPreview.tsx` or `BootcampBuilderPage.tsx`.
  - `BootcampTimeline.tsx` (~60 lines): If it only renders a visual bar, merge into `BootcampClassPreview.tsx` as a sub-component. Keep separate only if it contains complex drag-and-drop or real-time sync logic.
  - `BootcampPyramidConfig.tsx` + `BootcampSupersetConfig.tsx`: Share ~70% UI structure (duration, rounds, weight drop logic). Merge into `BootcampClassStyleConfig.tsx` with a `format` prop.
- **Right-Sized:** `BootcampConfigPanel.tsx`, `BootcampAIInsights.tsx`, `BootcampStationCard.tsx`, `BootcampExerciseRow.tsx`, `BootcampStretchModule.tsx` are appropriately scoped.
- **Recommendation:** Target **14-16 frontend files** instead of 22. Consolidate thin wrappers, extract heavy logic into hooks/services.

## 2. Styles Directory (9 Files)
**Verdict:** Excessive for a single feature. `styled-components` encourages co-location or domain grouping.
- **Consolidation Strategy:**
  - Group by **layout domain**, not by component. 9 files will cause import sprawl and duplicate theme tokens.
  - Target **4 files max**:
    1. `BootcampBaseStyles.ts` — Shared tokens, wrappers, typography, responsive breakpoints
    2. `BootcampConfigStyles.ts` — Left pane, forms, toggles, sliders
    3. `BootcampPreviewStyles.ts` — Cards, rows, boards, stretch module, timeline
    4. `CoachAssistantStyles.ts` — Chat UI, input bar, markdown, voice controls
- **Constraint Compliance:** Each file will naturally stay under 300 lines if styled-components are kept declarative. Extract complex animations or responsive variants into utility hooks if needed.

## 3. Hooks Directory (5 Hooks)
**Verdict:** Good intent, but boundary lines are blurred.
- `useVoiceRecorder` + `useGeminiTranscription`: Tightly coupled pipeline. Merge into `useVoiceInput.ts` that returns `{ isRecording, audioBlob, transcript, error }`. Keeps state machine in one place.
- `useConversationSidebar`: Pure UI state (open/close, search query, active filter). Merge into `useCoachUI.ts` or lift to React Context if shared across panels.
- `useFileAttachment`: Generic file picker/upload logic. Move to `shared/hooks/`.
- `useCoachAssistant`: Core chat state, message history, AI streaming. Keep local.
- **Final Hook Set (3 local, 1 shared):** `useVoiceInput`, `useCoachAssistant`, `useCoachUI`, `useFileAttachment` (shared).

## 4. 300-Line Budget Risk Assessment
| File | Est. Lines | Risk Level | Mitigation Strategy |
|------|------------|------------|---------------------|
| `ConversationSidebar.tsx` | ~250 | 🟡 Medium | Extract `SearchFilterBar.tsx`, `ConversationList.tsx`, `SidebarActions.tsx`. Keep parent as layout orchestrator (<100 lines). |
| `MarkdownRenderer.tsx` | ~180 | 🟢 Low | Use a component registry pattern. Extract heavy custom blocks (`CodeBlock.tsx`, `DataTable.tsx`, `ExerciseList.tsx`) to separate files. |
| `CoachInputBar.tsx` | ~295 | 🔴 High | **Will exceed 300.** Extract `VoiceRecordButton.tsx`, `AttachmentTray.tsx`, `MessageInput.tsx`, `SendButton.tsx`. Parent becomes pure flex layout + event wiring (<80 lines). |

## 5. Import Graph & Dependency Analysis
```
BootcampBuilderPage.tsx
├── BootcampConfigPanel.tsx ──┐
├── BootcampClassPreview.tsx ─┼── BootcampStationCard.tsx ── BootcampExerciseRow.tsx
├── BootcampAIInsights.tsx ───┼── CoachAssistantPanel.tsx ── ConversationSidebar.tsx
└── hooks/                    └── MarkdownRenderer.tsx ── CustomBlocks/
    ├── useBootcampGeneration.ts
    ├── useCoachAssistant.ts ── useAIChat (shared)
    └── useVoiceInput.ts ───── useFileAttachment (shared)
```
- **Circular Risk:** `useCoachAssistant` ↔ `ConversationSidebar`. If the hook imports UI state from the sidebar, you'll create a cycle. **Fix:** Hooks must never import components. Lift sidebar state to `useCoachUI` or Context.
- **Deep Chain Risk:** `Page → Preview → Card → Row → Hook → API`. Depth = 5. Acceptable, but keep prop drilling to ≤3 levels. Use Context for `bootcampConfig` and `classStyle`.
- **Cross-Feature Risk:** `useAIChat` (shared) importing `BootcampContext` creates a leak. **Fix:** Pass bootcamp context as a `metadata` payload to `useAIChat`, don't import it directly.

## 6. Barrel Exports
- `SwanCoachStyles.ts` as a barrel is fine, but prefer `styles/index.ts` for consistency.
- **Recommendation:** Add `index.ts` to `hooks/`, `styles/`, and `components/BootcampBuilder/`.
- **Tree-Shaking Note:** Modern bundlers (Vite/Webpack 5) handle barrel exports efficiently. Ensure `package.json` has `"sideEffects": false` or mark style files as side-effectful if needed.

## 7. Shared vs Local Boundary
- `useAIChat` in `shared/` is **correct**. It's feature-agnostic (handles streaming, message formatting, retry logic).
- New hooks (`useCoachAssistant`, `useVoiceInput`, `useCoachUI`) are **correctly local**. They bind AI chat to Bootcamp-specific state, UI toggles, and voice workflows.
- **Boundary Rule:** 
  - `shared/` = Generic utilities, API clients, formatters, reusable UI logic.
  - `local/` = Feature-specific state machines, domain adapters, tightly coupled UI controllers.
- **Adjustment:** Move `useFileAttachment` to `shared/`. Keep `useVoiceInput` local unless app-wide voice is planned.

---

# Proposed File Tree & Line Budget

```
frontend/src/
├── components/
│   ├── BootcampBuilder/
│   │   ├── index.ts                          # Barrel
│   │   ├── BootcampBuilderPage.tsx           # 180 lines (orchestrator + context provider)
│   │   ├── BootcampConfigPanel.tsx           # 240 lines (format, duration, equipment)
│   │   ├── BootcampClassPreview.tsx          # 260 lines (boards, timeline, stretch)
│   │   ├── BootcampStationCard.tsx           # 190 lines
│   │   ├── BootcampExerciseRow.tsx           # 210 lines (mods, board toggle)
│   │   ├── BootcampClassStyleConfig.tsx      # 230 lines (merged pyramid/superset/custom)
│   │   ├── BootcampStretchModule.tsx         # 170 lines
│   │   ├── CoachAssistantPanel.tsx           # 220 lines (right pane wrapper)
│   │   ├── ConversationSidebar.tsx           # 240 lines (extracted search/list)
│   │   ├── MarkdownRenderer.tsx              # 160 lines (registry + 8 custom blocks)
│   │   ├── CoachInputBar.tsx                 # 180 lines (layout + wiring)
│   │   ├── VoiceRecordButton.tsx             # 110 lines
│   │   ├── AttachmentTray.tsx                # 130 lines
│   │   └── styles/
│   │       ├── index.ts                      # Barrel
│   │       ├── BootcampBaseStyles.ts         # 210 lines
│   │       ├── BootcampConfigStyles.ts       # 190 lines
│   │       ├── BootcampPreviewStyles.ts      # 240 lines
│   │       └── CoachAssistantStyles.ts       # 220 lines
│   └── Shared/
│       └── EquipmentProfilePicker.tsx        # (existing, refactored to <300)
├── hooks/
│   ├── bootcamp/
│   │   ├── index.ts                          # Barrel
│   │   ├── useBootcampGeneration.ts          # 260 lines (AI hive mind + flow)
│   │   ├── useBootcampFlow.ts                # 180 lines (setup time calc)
│   │   ├── useCoachAssistant.ts              # 240 lines (chat state + AI wiring)
│   │   ├── useVoiceInput.ts                  # 190 lines (recorder + transcription)
│   │   └── useCoachUI.ts                     # 140 lines (sidebar, filters, toggles)
│   └── shared/
│       ├── useAIChat.ts                      # (existing)
│       └── useFileAttachment.ts              # 160 lines (moved from local)
└── backend/services/bootcamp/
    ├── index.mjs                             # Barrel
    ├── bootcampGenerator.mjs                 # 280 lines (orchestrates hive mind)
    ├── bootcampPyramidEngine.mjs             # 210 lines
    ├── bootcampSupersetEngine.mjs            # 220 lines
    ├── bootcampFlowOptimizer.mjs             # 240 lines
    ├── bootcampStretchGenerator.mjs          # 180 lines
    └── bootcampExerciseSelector.mjs          # 260 lines (freshness + mods + setup time)
```

## Line Budget Enforcement Matrix
| Directory | Max Lines/File | Strategy to Enforce |
|-----------|----------------|---------------------|
| Components | ≤260 | Extract sub-components at 150 lines. Use composition over inheritance. |
| Hooks | ≤260 | Split state machines from side effects. Extract API calls to `services/`. |
| Styles | ≤240 | Group by layout domain. Use theme tokens instead of inline overrides. |
| Backend Services | ≤280 | Extract pure functions to `utils/`. Use strategy pattern for formats. |

## Critical Guardrails for Implementation
1. **Strict 300-Line Rule:** Run `cloc --exclude-dir=node_modules,dist --by-file src/` in CI. Fail build if any `.tsx`/`.ts`/`.mjs` exceeds 300 logical lines.
2. **No Circular Dependencies:** Enable `eslint-plugin-import` with `no-cycle`. Hooks must never import components. Components must never import other components' hooks directly.
3. **Context over Prop Drilling:** Wrap `BootcampBuilderPage` in `BootcampContext` (config, classStyle, boards, flowData). Pass to children via `useContext`.
4. **Voice Pipeline Isolation:** `useVoiceInput` must handle Web Audio API + MediaRecorder + Gemini transcription in one state machine. Expose only `{ status, transcript, error, start, stop }`.
5. **AI Hive Mind Orchestration:** Keep `bootcampGenerator.mjs` under 300 by using a pipeline pattern: `Flash → Qwen → Pro` as sequential async steps with a shared `generationContext` object.

This architecture guarantees strict compliance with your 300-line constraint while maintaining clean separation of concerns, scalable state management, and zero circular dependencies. Ready for Phase 0 decomposition.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
