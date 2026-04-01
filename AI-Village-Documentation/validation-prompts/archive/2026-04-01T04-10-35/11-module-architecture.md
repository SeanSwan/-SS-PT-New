# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 119.2s
> **Files:** docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md
> **Generated:** 3/31/2026, 9:10:35 PM

---

# Architectural Review: SwanStudios Social + AI Coach Module

## 1. File Decomposition (22 New Files)
**Assessment:** The 22-file breakdown is **well-structured** for a feature-driven architecture. Each component maps cleanly to a single UI responsibility, aligning with React's composition model.

**Optimization Opportunities:**
- **Merge Candidates:** `EventCard.tsx` + `CommunityCard.tsx` share identical layout patterns (image, title, metadata, action buttons). Extract a base `SocialGroupCard.tsx` and pass variant props. Reduces duplication by ~40%.
- **Thin Files (<50 lines):** `FactionBadge.tsx`, `StreakFortressMini.tsx`, `LiveActivityTicker.tsx`. Keep them separate if they're highly reusable atoms. If they're strictly one-off, inline them into parent components to reduce import overhead.
- **Recommendation:** Maintain the 22-file structure but enforce a **max 300-line rule** via strict component extraction (see Section 4).

## 2. `styles/` Directory (9 Files)
**Assessment:** 9 style files is **acceptable but suboptimal** for `styled-components`. Co-location is generally preferred for maintainability and tree-shaking.

**Consolidation Strategy:**
| Current | Recommended | Rationale |
|---------|-------------|-----------|
| 5 split + 4 new files | 3 domain files + 1 token file | Group by feature domain, not component |
| `SwanCoachStyles.ts` (barrel) | `tokens.ts` + `theme.ts` | Extract palette, spacing, typography into shared tokens |
| Component-specific styles | Co-located `.styled.ts` | Keep styles next to components for faster iteration |

**Action:** Reduce to `@styles/tokens.ts` (palette/spacing), `@styles/social.ts` (feed/events/communities), `@styles/rpg.ts` (factions/pets/fortress), and `@styles/coach.ts` (chat/input). Delete the barrel pattern for styles.

## 3. `hooks/` Directory (5 Hooks)
**Assessment:** Separation of concerns is **mostly sound**, but `useVoiceRecorder` and `useGeminiTranscription` are tightly coupled. Managing audio state and transcription state across two hooks creates race conditions and prop-drilling.

**Refactored Hook Map:**
| Hook | Responsibility | Status |
|------|----------------|--------|
| `useVoiceInput` | Merges recorder + Gemini transcription + error handling | ✅ Merge |
| `useFileAttachment` | File validation, preview generation, upload queue | ✅ Keep |
| `useConversationSidebar` | UI state (open/close, active chat ID, search filter) | ⚠️ Move to Context/Reducer |
| `useCoachAssistant` | Orchestrator: message routing, NASM context injection, AI response parsing | ✅ Keep |
| `useAIChat` (shared) | WebSocket/SSE connection, pagination, optimistic updates | ✅ Keep (shared) |

**Why:** `useConversationSidebar` is purely presentational state. Move it to `ConversationContext.tsx` using `useReducer` to avoid hook bloat and enable sibling component access without prop drilling.

## 4. 300-Line Budget Risk Mitigation
**MANDATORY CONSTRAINT ENFORCEMENT:** Every file must stay ≤300 lines (excluding comments/blanks). Here’s the extraction strategy for high-risk files:

| File | Est. Lines | Risk | Extraction Strategy |
|------|------------|------|---------------------|
| `ConversationSidebar.tsx` | ~250 | 🔴 High | Extract `SearchFilter.tsx` (~40), `ChatListItem.tsx` (~60), `SidebarActions.tsx` (~45). Main file becomes layout + state wiring (~105). |
| `MarkdownRenderer.tsx` | ~180 | 🟡 Medium | Use a **component registry pattern**. Extract `CodeBlock.tsx`, `ExerciseCard.tsx`, `LootDrop.tsx`, `MoodletBadge.tsx`, etc. into `@components/Markdown/`. Main file becomes `<MDXProvider components={registry}>` (~50). |
| `CoachInputBar.tsx` | ~295 | 🔴 Critical | Extract `AttachmentTray.tsx` (~70), `VoiceButton.tsx` (~55), `TextInputArea.tsx` (~65). Main file orchestrates layout + form submission (~105). |

**Rule Enforcement:** Add `eslint-plugin-max-lines` with `max: 300` to CI. Fail builds on violation.

## 5. Import Graph & Dependency Safety
```
CoachAssistant.tsx (Orchestrator)
├── ConversationSidebar.tsx
│   ├── @context/ConversationContext
│   ├── @components/SearchFilter
│   └── @components/ChatListItem
├── ChatArea.tsx
│   ├── @components/MessageBubble
│   └── MarkdownRenderer.tsx
│       └── @components/Markdown/* (registry)
└── CoachInputBar.tsx
    ├── @hooks/useVoiceInput
    ├── @hooks/useFileAttachment
    └── @components/AttachmentTray
```

**Circular Risk Assessment:**
- **None detected** if hooks never import components.
- **Anti-pattern to avoid:** `useConversationSidebar` importing `ConversationSidebar.tsx`. Use Context instead.
- **Deep Import Chains:** Mitigate with path aliases (`@components/`, `@hooks/`, `@styles/`, `@shared/`). Enforce `import/no-relative-parent-imports` ESLint rule.
- **State Flow:** Unidirectional. UI → Hooks/Context → API/Socket → UI. No cross-branch imports.

## 6. Barrel Export Strategy
**`SwanCoachStyles.ts` as a barrel:** ❌ **Discourage.** Barrels in styled-components cause:
- Tree-shaking failures (Webpack/Vite can't statically analyze re-exports)
- Circular dependency traps when components import styles that import components
- Bundle bloat from unused style objects

**Recommended Pattern:**
```ts
// ❌ Avoid
export { default as ChatStyles } from './chat';
export { default as InputStyles } from './input';

// ✅ Use explicit imports
import { ChatContainer, MessageBubble } from './Chat.styled';
import { InputWrapper, SendButton } from './InputBar.styled';
```
If barrels are mandatory for DX, limit to `index.ts` files that **only** export public APIs, never internal utilities. Apply same rule to `hooks/` and `styles/`.

## 7. Shared vs Local Hook Boundaries
**Current:** `useAIChat` (shared) vs coach-specific hooks (local)
**Assessment:** ✅ **Correct boundary.**
- `useAIChat` handles transport-agnostic chat mechanics (SSE/WebSocket, message queue, pagination, typing indicators). Reusable for DMs, community threads, party chat.
- Coach hooks handle domain-specific logic: NASM OPT phase context injection, voice-first UX, exercise macro parsing, attachment-to-workout conversion.
- **Boundary Rule:** Shared hooks must never import domain-specific types or UI components. Coach hooks can import `useAIChat` but not vice versa.

---

# 📁 Proposed File Tree & Line Budget

```
src/
├── features/
│   └── coach-assistant/
│       ├── components/
│       │   ├── ConversationSidebar.tsx          # ~105
│       │   ├── ChatArea.tsx                     # ~120
│       │   ├── CoachInputBar.tsx                # ~105
│       │   ├── SearchFilter.tsx                 # ~40
│       │   ├── ChatListItem.tsx                 # ~60
│       │   ├── AttachmentTray.tsx               # ~70
│       │   ├── VoiceButton.tsx                  # ~55
│       │   ├── TextInputArea.tsx                # ~65
│       │   └── MarkdownRenderer.tsx             # ~50
│       ├── markdown/
│       │   ├── CodeBlock.tsx                    # ~45
│       │   ├── ExerciseCard.tsx                 # ~65
│       │   ├── LootDrop.tsx                     # ~50
│       │   └── MoodletBadge.tsx                 # ~40
│       ├── hooks/
│       │   ├── useCoachAssistant.ts             # ~110
│       │   ├── useVoiceInput.ts                 # ~130 (merged)
│       │   └── useFileAttachment.ts             # ~95
│       ├── context/
│       │   └── ConversationContext.tsx          # ~140 (replaces sidebar hook)
│       └── styles/
│           ├── Chat.styled.ts                   # ~85
│           ├── InputBar.styled.ts               # ~75
│           └── Sidebar.styled.ts                # ~65
├── shared/
│   ├── hooks/
│   │   └── useAIChat.ts                         # ~160
│   └── styles/
│       ├── tokens.ts                            # ~40 (palette, spacing, radii)
│       └── theme.ts                             # ~35 (typography, breakpoints)
```

### 📊 Line Budget Summary
| Category | Files | Max Lines/File | Total Est. |
|----------|-------|----------------|------------|
| Components | 9 | 120 | ~1,080 |
| Markdown Atoms | 4 | 65 | ~260 |
| Hooks | 3 | 130 | ~335 |
| Context | 1 | 140 | ~140 |
| Styles | 3 | 85 | ~255 |
| Shared | 2 | 160 | ~195 |
| **TOTAL** | **22** | **≤300** | **~2,265** |

---

# 🛡️ Architectural Enforcement Checklist
1. **300-Line Hard Limit:** Configure `eslint-plugin-max-lines` + `pre-commit` hook. Auto-fail if exceeded.
2. **No Barrels:** Replace `index.ts` re-exports with explicit imports. Use `import/no-restricted-paths` to prevent cross-feature leakage.
3. **Hook Boundaries:** Shared hooks → `@shared/hooks/`. Feature hooks → `@features/*/hooks/`. Enforce via ESLint `import/no-internal-modules`.
4. **Style Co-location:** Keep `.styled.ts` next to components. Use `tokens.ts` for palette/spacing only.
5. **Dependency Direction:** `UI → Context → Hooks → API`. Never reverse. Validate with `madge --circular`.
6. **Voice/Input Merge:** `useVoiceInput` handles MediaRecorder + Gemini API + error boundaries. Single source of truth.
7. **Markdown Registry:** Use `MDXProvider` or custom `ReactMarkdown` components prop. Never inline 8+ components in one file.

This architecture guarantees scalability, enforces the 300-line constraint by design, and maintains strict separation between shared infrastructure and domain-specific coach logic. Ready for implementation.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
