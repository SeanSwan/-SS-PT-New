# Swan Coach Assistant — Professional Upgrade Plan

## Executive Summary

Upgrade the Swan Coach Assistant from a basic chat interface to a professional-grade AI coaching experience that matches the quality of Claude.ai, ChatGPT, and Google Gemini while adding fitness-specific capabilities that none of the general AI platforms offer.

**Current state:** Basic text chat with Web Speech API voice input, no conversation history sidebar, no markdown rendering, no thinking indicators, no file attachments.

**Target state:** Full-featured AI coaching interface with conversation management, rich message formatting, real-time voice via Gemini transcription, file/image attachments, and fitness-specific structured output.

---

## 1. Current State Analysis

### Frontend (1,421 lines across 9 files)

| File | Lines | Purpose | Issues |
|------|-------|---------|--------|
| `SwanCoachAssistantPage.tsx` | 165 | Main orchestrator | No sidebar, no markdown |
| `CoachInputBar.tsx` | 212 | Text + voice input | Web Speech API only, no server transcription |
| `CoachMessage.tsx` | 81 | Message bubble | Plain text only, no markdown |
| `ContextChipBar.tsx` | 48 | Context switcher | Working fine |
| `ResponseStyleSelector.tsx` | 41 | Style toggle | Working fine |
| `SwanCoachStyles.ts` | 584 | All styles | **Over 300-line limit**, needs split |
| `SwanCoachTypes.ts` | 81 | Types | Fine |
| `SwanCoachConstants.ts` | 81 | Constants | Fine |
| `hooks/useCoachAssistant.ts` | 128 | Orchestration hook | **BUG: calls setActiveConversation which doesn't exist** |

### Backend (fully built, underutilized)

| Endpoint | Status | Frontend Integration |
|----------|--------|---------------------|
| `POST /api/ai-chat/conversations` | Working | Used |
| `GET /api/ai-chat/conversations` | Working | **NOT used** (no history sidebar) |
| `GET /api/ai-chat/conversations/:id` | Working | **NOT used** (no load conversation) |
| `PATCH /api/ai-chat/conversations/:id` | Working | **NOT used** (no rename/archive) |
| `DELETE /api/ai-chat/conversations/:id` | Working | **NOT used** (no delete) |
| `POST /api/ai-chat/transcribe` | Working | **NOT used** (using browser Web Speech instead) |

### useAIChat Hook (376 lines, fully built)

Already exports: `createConversation`, `listConversations`, `loadConversation`, `sendMessage`, `sendMessageWithConversation`, `deleteConversation`, `newChat`, `clearError`

**Missing exports needed:** `renameConversation` (PATCH title), `archiveConversation` (PATCH status)

### Critical Bug

`hooks/useCoachAssistant.ts` lines 103, 110 call `chat.setActiveConversation(null)` which is not exported from `useAIChat`. This causes a runtime TypeError when switching contexts or clearing conversations.

---

## 2. Competitive Analysis

### What Claude/ChatGPT/Gemini All Have (Table Stakes)

| Feature | Claude | ChatGPT | Gemini | SwanStudios |
|---------|--------|---------|--------|-------------|
| Conversation history sidebar | Yes | Yes | Yes | **Missing** |
| Markdown rendering (bold, lists, tables, code) | Yes | Yes | Yes | **Missing** |
| Thinking/reasoning indicator | Yes | Yes | Yes | **Missing** (only "..." dots) |
| Suggested follow-up prompts | No | Yes | Yes | **Missing** |
| Voice input | Basic | Advanced | Gemini Live | Web Speech only |
| File/image upload | Yes | Yes | Yes | **Missing** |
| Keyboard shortcuts (Cmd+Enter) | Yes | Yes | Yes | **Missing** |
| Copy message button | Yes | Yes | Yes | Partial (exists) |
| Auto-resize input | Yes | Yes | Yes | Partial |
| Mobile-optimized | Yes | Yes | Yes | Partial |

### What Fitness Apps Have (Domain-Specific)

| Feature | Trainerize | TrueCoach | JEFIT | SwanStudios |
|---------|-----------|-----------|-------|-------------|
| Workout plan as structured card | Yes | Yes | Yes | **Missing** |
| Exercise autocomplete in chat | No | No | Partial | **Missing** (but have 840-exercise DB) |
| Progress chart embedding | No | No | Partial | **Missing** (but have 50 Victory charts) |
| Form check photo analysis | No | Yes | No | **Missing** |
| Client context awareness | Partial | Partial | No | **Already built** (context chips) |
| NASM periodization | No | No | No | **Already built** (OPT model) |

### SwanStudios Unique Advantages (Already Built)

1. **Context-aware AI per dashboard tab** — none of the competitors do this
2. **840-exercise NASM database** — richer than any fitness AI
3. **21 parallel data source enrichment** — backend already pulls client progress, workouts, goals, etc.
4. **Multi-provider failover** — Gemini -> OpenAI -> Anthropic -> Venice
5. **Identity-blind AI** — PII never reaches LLMs (ahead of industry)
6. **Gamification integration** — coaching actions trigger XP/badges

---

## 3. Proposed 5-Phase Upgrade

### Phase 0: Infrastructure Prep (Fix Bugs + Split Files)

**Goal:** Clean foundation before adding features.

**Tasks:**
1. Split `SwanCoachStyles.ts` (584 lines) into barrel + sub-files:
   - `styles/index.ts` (barrel re-exports)
   - `styles/CoachLayoutStyles.ts` (page layout, container, header)
   - `styles/CoachMessageStyles.ts` (message bubbles, timestamps, actions)
   - `styles/CoachInputStyles.ts` (input bar, voice orb, send button)
   - `styles/CoachChipStyles.ts` (context chips, style buttons)
   - `styles/CoachAnimations.ts` (keyframes, typing indicator)

2. Fix `useCoachAssistant.ts` bug:
   - Replace `chat.setActiveConversation(null)` with `chat.newChat()` on lines 103 and 110

3. Add missing functions to `useAIChat.ts`:
   - `renameConversation(id: number, title: string)` — calls `PATCH /api/ai-chat/conversations/:id`
   - `archiveConversation(id: number)` — calls `PATCH /api/ai-chat/conversations/:id` with `status: 'archived'`

**New files:** 6 (styles split) | **Modified files:** 2 (useCoachAssistant, useAIChat)

---

### Phase 1: Conversation History Sidebar (CRITICAL)

**Goal:** Users can see, load, search, rename, and delete past conversations.

**Backend work:** Zero — all APIs already exist and work.

**New files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `ConversationSidebar.tsx` | Sidebar container with search, new chat, conversation list | ~200 |
| `ConversationItem.tsx` | Single conversation row (title, date, context badge, actions) | ~120 |
| `styles/CoachSidebarStyles.ts` | Sidebar-specific styled components | ~150 |
| `hooks/useConversationSidebar.ts` | Sidebar state: open/close, search filter, active item | ~80 |

**Layout change:** `SwanCoachAssistantPage.tsx` wraps in a flex container:
```
┌──────────────────────────────────────────────────────────┐
│ [=] Conversations          Swan Coach Assistant           │
├────────────┬─────────────────────────────────────────────┤
│ [+ New]    │                                             │
│ [Search..] │    Messages Area                            │
│            │                                             │
│ Today      │    [AI]: Welcome! I'm your coach...         │
│  > Leg Day │    [You]: Plan my leg day                   │
│  > Diet Q  │    [AI]: Here's a leg day plan...           │
│            │                                             │
│ Yesterday  │                                             │
│  > Form    │    ┌───────────────────────────────────┐    │
│  > Cardio  │    │ [Context Chips] [Style Selector]  │    │
│            │    │ [Input Bar + Voice + Send]         │    │
│            │    └───────────────────────────────────┘    │
└────────────┴─────────────────────────────────────────────┘
```

**Mobile behavior:** Sidebar slides in as overlay (hamburger toggle), 280px width.

**Conversation item features:**
- Title (editable inline on double-click)
- Context badge (color-coded chip matching ContextChipBar)
- Relative timestamp ("2h ago", "Yesterday")
- Hover actions: rename (pencil), delete (trash), archive (box)
- Active state: highlighted with Wing Purple border-left

**Search:** Client-side filter on conversation titles (no API needed).

---

### Phase 2: Markdown Rendering

**Goal:** AI responses render formatted text (bold, lists, tables, code blocks, headers).

**Dependencies:** `react-markdown`, `remark-gfm`, `rehype-highlight`

**New files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `MarkdownRenderer.tsx` | Wraps react-markdown with custom component overrides | ~150 |
| `styles/CoachMarkdownStyles.ts` | Styled components for markdown elements (tables, code, lists) | ~200 |

**Custom component overrides:**
- **Tables:** Crystalline Swan styled with Wing Purple headers, rounded corners
- **Code blocks:** Carbon `#141419` background, Fira Code font, copy button
- **Inline code:** Graphite `#1A1A24` background, monospace
- **Lists:** Custom bullet styling with Ice Wing `#60C0F0` markers
- **Headers:** Plus Jakarta Sans, sized down from page headers (h3 max in chat)
- **Links:** Ice Wing `#60C0F0` with underline on hover
- **Bold/italic:** Frost White `#E0ECF4` for bold emphasis

**Security:** react-markdown is safe by default (no dangerouslySetInnerHTML). Rehype-highlight only highlights code syntax, no script execution.

**Integration:** Replace `{message.content}` in `CoachMessage.tsx` with `<MarkdownRenderer content={message.content} />` for AI messages only. User messages stay plain text.

---

### Phase 3: Enhanced Input + Thinking Indicator + UI Polish

**Goal:** Professional input experience with thinking transparency and suggested prompts.

**New files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `ThinkingIndicator.tsx` | Animated "Analyzing your workout data..." with progress dots | ~80 |
| `ProviderBadge.tsx` | Small badge showing which AI model responded (Gemini/Claude/etc.) | ~60 |
| `SuggestedPrompts.tsx` | Context-aware prompt chips below messages or on empty state | ~120 |
| `styles/CoachUIPolishStyles.ts` | Styles for thinking indicator, badges, suggestions | ~100 |

**ThinkingIndicator features:**
- Context-aware text: "Analyzing your workout history...", "Building your meal plan...", "Reviewing your form..."
- Animated dots (3-dot cascade, not just "...")
- Shows elapsed time after 3 seconds ("Still thinking... 5s")
- Wing Purple accent color with subtle pulse animation

**ProviderBadge features:**
- Tiny pill below AI messages: "Gemini 3.1 Pro" or "Claude Sonnet"
- Only visible in admin/trainer mode (clients don't need to see this)
- Color-coded per provider

**SuggestedPrompts features:**
- Context-aware chips that change based on selected context:
  - `general`: "What should I eat today?", "Review my week", "Motivate me"
  - `workout_generation`: "Plan my leg day", "Full body HIIT", "Deload week"
  - `progress_analysis`: "How's my strength trending?", "Body comp update", "Where am I weakest?"
  - `exercise_library`: "Alternatives to bench press", "Core exercises with bands", "Shoulder rehab"
- Disappear after first message in a conversation
- Reappear on new chat

**Enhanced CoachInputBar upgrades:**
- Character count (show at 500+ chars, warn at 2000)
- Cmd/Ctrl+Enter to send (Enter for newline on desktop)
- Shift+Enter for newline
- Attachment button placeholder (Phase 5)
- Auto-grow up to 200px (currently 120px)

---

### Phase 4: Voice Upgrade

**Goal:** Replace browser Web Speech API with server-side Gemini transcription for accuracy + cross-browser support.

**Current:** `window.SpeechRecognition` (Chrome/Edge only, poor accuracy, no Brave/Firefox)

**Target:** MediaRecorder -> audio blob -> POST `/api/ai-chat/transcribe` -> Gemini Flash multimodal

**New files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `hooks/useVoiceRecorder.ts` | MediaRecorder wrapper: start/stop/blob management | ~100 |
| `hooks/useGeminiTranscription.ts` | Upload audio blob to transcribe endpoint, handle rate limits | ~80 |
| `VoiceRecordingOverlay.tsx` | Full-screen recording UI with waveform visualization | ~150 |
| `styles/CoachVoiceStyles.ts` | Voice overlay, waveform, recording indicator styles | ~100 |

**Recording flow:**
1. User taps mic button -> `VoiceRecordingOverlay` appears (full-width overlay above input)
2. MediaRecorder captures audio (webm/opus format)
3. Visual waveform shows audio levels (CSS bars, not canvas)
4. User taps stop (or 3s silence auto-stop)
5. Audio blob uploaded to `POST /api/ai-chat/transcribe`
6. Transcribed text inserted into input bar
7. User can edit before sending (not auto-send like current Web Speech)

**Waveform visualization:**
- 20 CSS bars with `transform: scaleY()` driven by `AnalyserNode.getByteFrequencyData()`
- Wing Purple `#8B5CF6` bars on Graphite `#1A1A24` background
- No canvas, pure CSS transforms (GPU-composited)

**Fallback:** If MediaRecorder unavailable (rare), fall back to Web Speech API.

**Rate limit handling:** Show "X transcriptions remaining this hour" in overlay. Graceful degradation when limit hit (suggest typing instead).

---

### Phase 5: File/Image Attachments

**Goal:** Users can attach images (form check photos, progress pics, meal photos) and documents for AI analysis.

**New files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `FileAttachmentButton.tsx` | Attachment button with file type options | ~80 |
| `AttachmentPreview.tsx` | Thumbnail preview of attached files before send | ~100 |
| `hooks/useFileAttachment.ts` | File selection, validation, upload to R2, inline data for Gemini | ~120 |
| `styles/CoachAttachmentStyles.ts` | Attachment UI styles | ~80 |

**Supported file types:**
- Images: JPEG, PNG, WebP (max 10MB) — Gemini multimodal vision analysis
- Documents: PDF, TXT, CSV (max 20MB) — text extraction via voiceTranscriptionService
- Audio: MP3, WAV, WebM (max 25MB) — transcription via same service

**Upload flow:**
1. User clicks attachment icon -> file picker opens
2. Selected file shows as thumbnail preview above input bar
3. User types optional message + sends
4. Image: encoded as base64 inline data for Gemini multimodal
5. Document: text extracted server-side, added to AI context
6. Both: stored in R2 for conversation history

**Fitness-specific use cases:**
- "Check my squat form" + photo/video frame
- "Log this meal" + food photo
- "What exercises are in this PDF?" + training program document
- Progress photo comparison (AI analyzes visible changes)

---

## 4. Component Architecture

```
SwanCoachAssistantPage (upgraded)
├── ConversationSidebar
│   ├── SidebarHeader (new chat button, search)
│   ├── ConversationList
│   │   └── ConversationItem[] (title, date, context badge, actions)
│   └── SidebarFooter (settings, help)
├── CoachMainPanel
│   ├── CoachHeader (title, context, model info)
│   ├── ContextChipBar (existing)
│   ├── MessagesArea
│   │   ├── SuggestedPrompts (on empty state)
│   │   ├── CoachMessage[] (upgraded with MarkdownRenderer)
│   │   │   ├── MarkdownRenderer (for AI messages)
│   │   │   ├── ProviderBadge (admin/trainer only)
│   │   │   └── MessageActions (copy, read aloud, regenerate)
│   │   └── ThinkingIndicator (replaces "..." dots)
│   ├── AttachmentPreview (when file selected)
│   ├── ResponseStyleSelector (existing)
│   └── CoachInputBar (upgraded)
│       ├── FileAttachmentButton
│       ├── TextInput (auto-grow, char count)
│       ├── VoiceRecordingOverlay (replaces Web Speech orb)
│       └── SendButton
```

---

## 5. Voice Architecture Decision

### Option A: MediaRecorder + Server Transcription (RECOMMENDED)

**Flow:** MediaRecorder (browser) -> audio blob -> POST /api/ai-chat/transcribe -> Gemini Flash multimodal -> text

**Pros:**
- Works in ALL browsers (Brave, Firefox, Safari, Chrome)
- Gemini Flash multimodal transcription is highly accurate
- Backend already has the transcription service and endpoint built
- User can edit text before sending
- Rate limited (10/hr) to prevent abuse

**Cons:**
- 1-3s upload+transcribe latency (vs real-time Web Speech)
- Requires network connection for voice

### Option B: Gemini Multimodal Live API (Real-Time Voice)

**Flow:** WebSocket -> Gemini Live API -> real-time streaming voice response

**Pros:**
- Real-time conversational voice (like ChatGPT Advanced Voice)
- Sub-second latency
- Gemini can respond WITH voice

**Cons:**
- Requires new WebSocket infrastructure
- Complex state management (duplex audio streams)
- Higher API costs (streaming tokens)
- Not in current Google GenAI SDK v0.24.1 (would need upgrade)
- Overkill for current use case (text-first coach)

### Decision: Option A for Phase 4, Option B as future Phase 6

Start with MediaRecorder + server transcription. It uses existing infrastructure, works everywhere, and provides a professional experience. Real-time voice conversation can be a future premium feature.

---

## 6. File Budget

### New Files (22 total)

| Phase | Files | Total Lines |
|-------|-------|-------------|
| Phase 0 | 6 (style splits) + 2 modified | ~600 |
| Phase 1 | 4 (sidebar + hook) | ~550 |
| Phase 2 | 2 (markdown renderer + styles) | ~350 |
| Phase 3 | 4 (thinking + badges + prompts + styles) | ~360 |
| Phase 4 | 4 (recorder + transcription + overlay + styles) | ~430 |
| Phase 5 | 4 (attachment + preview + hook + styles) | ~380 |
| **TOTAL** | **22 new + 4 modified** | **~2,670** |

All files under 300-line limit per CLAUDE.md.

---

## 7. Data Flow

### Conversation Lifecycle
```
User opens Coach Assistant
  → listConversations() → GET /api/ai-chat/conversations
  → Sidebar populated with history

User clicks conversation
  → loadConversation(id) → GET /api/ai-chat/conversations/:id
  → Messages rendered with MarkdownRenderer

User sends message
  → sendMessage(text) → POST /api/ai-chat/conversations/:id/messages
  → ThinkingIndicator shown
  → AI response streamed/returned
  → MarkdownRenderer renders formatted response
  → SuggestedPrompts hidden

User records voice
  → MediaRecorder captures audio blob
  → POST /api/ai-chat/transcribe (multipart/form-data)
  → Transcribed text inserted into input
  → User edits + sends as normal text message

User attaches image
  → File selected + validated (type, size)
  → Preview shown above input
  → On send: base64 encoded + sent as part of message
  → AI processes multimodal input (text + image)
```

### State Management
```
useAIChat (existing, extended)
  ├── conversations: ConversationSummary[]
  ├── activeConversation: Conversation | null
  ├── messages: Message[]
  ├── loading, sending, error
  ├── renameConversation(id, title)  ← NEW
  └── archiveConversation(id)  ← NEW

useConversationSidebar (new)
  ├── isOpen: boolean
  ├── searchQuery: string
  ├── filteredConversations: ConversationSummary[]
  └── toggle(), close(), setSearch()

useVoiceRecorder (new)
  ├── isRecording: boolean
  ├── audioBlob: Blob | null
  ├── audioLevel: number (0-1)
  └── start(), stop(), reset()

useGeminiTranscription (new)
  ├── transcribing: boolean
  ├── transcribedText: string | null
  ├── remaining: number (rate limit)
  └── transcribe(blob)

useFileAttachment (new)
  ├── file: File | null
  ├── preview: string | null (thumbnail URL)
  ├── uploading: boolean
  └── select(), remove(), upload()
```

---

## 8. Mobile Considerations

### Sidebar Behavior
- Mobile (<768px): Hidden by default, slides in as overlay from left
- Tablet (768-1024px): Collapsible, can be pinned
- Desktop (>1024px): Always visible, resizable

### Touch Targets (per CLAUDE.md: 44px minimum)
- All sidebar items: 48px height
- All buttons: 44px minimum
- Voice recording overlay: full-width, large stop button (64px)
- Attachment button: 44px

### Virtual Keyboard Handling
- Input bar sticks above keyboard (not behind it)
- Messages area shrinks when keyboard open
- Attachment preview doesn't push input off-screen

---

## 9. Accessibility

- Sidebar: `role="navigation"`, `aria-label="Conversation history"`
- Messages: `role="log"`, `aria-live="polite"` (already exists)
- Thinking indicator: `role="status"`, `aria-live="assertive"`
- Voice recording: `aria-label="Recording audio"`, visual + audio feedback
- Keyboard navigation: Tab through sidebar items, Enter to select, Escape to close
- Focus trap on mobile sidebar overlay
- Screen reader announcements for: new message, thinking started, thinking complete, voice recording started/stopped

---

## 10. Theme Compatibility

All new components MUST use CSS custom properties per CLAUDE.md:

```typescript
// Example pattern for new styled components
const SidebarContainer = styled.div`
  background: var(--bg-elevated, #1A1A24);
  border-right: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  color: var(--text-primary, #E0ECF4);
`;

const ConversationItemActive = styled.div`
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-left: 3px solid var(--accent-secondary, #8B5CF6);
`;
```

---

## 11. Dependencies to Install

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `react-markdown` | ^9.x | Markdown rendering | ~25KB gzipped |
| `remark-gfm` | ^4.x | GitHub-flavored markdown (tables, strikethrough) | ~5KB |
| `rehype-highlight` | ^7.x | Syntax highlighting in code blocks | ~15KB |

**Total bundle impact:** ~45KB gzipped (lazy-loaded with the Coach Assistant page).

No other new dependencies. Voice recording uses native MediaRecorder API. File handling uses native File API.

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MediaRecorder not available in old browsers | Low | Medium | Fallback to Web Speech API |
| Gemini transcription rate limit (10/hr) hit | Medium | Low | Show remaining count, suggest typing |
| Large markdown responses cause layout issues | Medium | Medium | Max-width constraints, overflow handling |
| Mobile sidebar + keyboard interactions | Medium | High | Test on iOS Safari, Android Chrome specifically |
| R2 not configured locally for file uploads | Low | Low | Already known issue, works in production |
| react-markdown XSS | Very Low | High | react-markdown sanitizes by default, no dangerouslySetInnerHTML |

---

## 13. Success Metrics

After implementation, the Coach Assistant should:

1. **Conversation continuity** — User can pick up any past conversation where they left off
2. **Visual parity** — Message formatting matches Claude.ai/ChatGPT quality (bold, lists, tables, code)
3. **Voice works everywhere** — Brave, Firefox, Safari, Chrome (not just Chrome/Edge)
4. **Sub-5-second voice** — Record -> transcribe -> text appears in under 5 seconds
5. **Mobile-first** — Full functionality on 375px screens with 44px+ touch targets
6. **Theme-safe** — Works correctly across all 14 theme variants
7. **Zero PII leaks** — File attachments processed through same privacy proxy as text

---

## 14. Implementation Order

```
Phase 0 (Infrastructure) ─── 1-2 hours
  │
  ├── Split SwanCoachStyles.ts
  ├── Fix useCoachAssistant bug
  └── Add rename/archive to useAIChat
  │
Phase 1 (Sidebar) ─── 2-3 hours
  │
  ├── ConversationSidebar + ConversationItem
  ├── useConversationSidebar hook
  ├── Layout restructure (flex with sidebar)
  └── Mobile overlay behavior
  │
Phase 2 (Markdown) ─── 1-2 hours
  │
  ├── Install react-markdown + plugins
  ├── MarkdownRenderer component
  ├── Crystalline Swan styled overrides
  └── Integration into CoachMessage
  │
Phase 3 (UI Polish) ─── 2-3 hours
  │
  ├── ThinkingIndicator
  ├── SuggestedPrompts (context-aware)
  ├── ProviderBadge
  ├── Enhanced input (Cmd+Enter, char count)
  └── Empty state design
  │
Phase 4 (Voice) ─── 2-3 hours
  │
  ├── useVoiceRecorder (MediaRecorder)
  ├── useGeminiTranscription (upload + transcribe)
  ├── VoiceRecordingOverlay (waveform UI)
  └── Replace Web Speech in CoachInputBar
  │
Phase 5 (Attachments) ─── 2-3 hours
  │
  ├── FileAttachmentButton
  ├── AttachmentPreview
  ├── useFileAttachment hook
  └── Multimodal message sending
```

**Total estimated effort:** 10-16 hours across 5 phases.
