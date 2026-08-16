# Swan Studios Coach Assistant — Master Blueprint

> ## ⚠️ SUPERSEDED — v1.0 (2026-03-30) is historical context, not a build spec
>
> **Superseded 2026-08-16 by:** `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-V3-UX-WIREFRAMES-2026-08-12.md`
> (as amended) + `docs/ai-workflow/AI-HANDOFF/GLM-COACH-JARVIS-REVIEW-2026-08-15.md` §E build order.
>
> **What still stands:** the mobile-first 16px input law (iOS zoom), the touch-target floor
> (44/56/64px), the landing-route decision, the performance budgets (virtualization, <100ms first
> render), the accessibility requirements, and the core instinct that **voice is the primary input
> on the gym floor**. That instinct was right and is now the whole product direction.
>
> **What is now wrong — do not build from these:**
> 1. **Off-palette fallback hex.** `#030712` and `#141419` are not Crystalline Swan tokens. Correct
>    fallbacks: `--bg-base → #0A0A0F`, elevation from the `#002060` family, `--text-primary → #E0ECF4`,
>    accents from Ice Wing `#60C0F0` / Wing Purple `#8B5CF6` only. Arctic Cyan `#50A0F0` stays
>    chart-only. No retired Galaxy-Swan values anywhere.
> 2. **"AI" appears throughout the UI copy** ("AI: Good morning", "AI response text"). Branding law:
>    it is **Swan Coach**, always. Global copy replacement required.
> 3. **750ms silence auto-send contradicts freestyle.** A freestyle session runs for minutes with no
>    send events. Auto-send survives only for short-command mode; freestyle uses explicit
>    Done / "say stop".
> 4. **The ~15-file component plan is dead.** The real surface is **210 files** under
>    `coach-assistant/`. The live consolidation targets are the six proposal cards, the three capture
>    hooks, and the six chrome components — not this doc's file list.
> 5. **The quick-actions table is subsumed** by the typed proposal system
>    (`workout_log | plan_edit | client_data_update | frontend_dispatch | …`). Retire it.
> 6. **Context-chip auto-detection** survives only as intent classification feeding the proposal
>    classifier — not as user-visible chip switching.
>
> **What was added since:** the freestyle intake pipeline, the Jarvis form-fill contract
> (`FRONTEND_DISPATCH` stays draft-only; the upgrade is visibility, not permission), and the
> voice-consolidation posture — one capture engine, with Planner/Nutrition/Bootcamp voice entry
> points migrating on next touch rather than by big-bang rewrite.
> Doctrine: `docs/ai-workflow/coach-brain/10-freestyle-intake.md` (draft).

> **Version:** 1.0 | **Author:** Claude Opus 4.6 (CEO) | **Date:** 2026-03-30
> **Status:** SUPERSEDED 2026-08-16 (was: PRE-IMPLEMENTATION — Awaiting AI Village Validation)
> **Priority:** P0 — This is the admin's primary daily-use interface

---

## 1. Executive Summary

The **Swan Studios Coach Assistant** is a dedicated, full-screen AI terminal tab that becomes the **landing page** when an admin (or trainer) logs in. It replaces the current Dashboard Overview as the default route.

**Why:** Sean (the admin/owner) trains clients on the gym floor using a small phone (320px+). He needs to:
- Quickly log workouts by voice while training
- Get instant AI responses about exercises, clients, schedules
- Not squint at tiny text or navigate through multiple tabs
- Talk to the AI and hear it respond back

**This is the #1 daily-use tool for a working personal trainer.**

---

## 2. Naming & Branding

| Element | Value |
|---------|-------|
| **Tab Name** | Swan Studios Coach Assistant |
| **Sidebar Icon** | `MessageCircle` (Lucide) or custom Swan icon |
| **Sidebar Position** | FIRST — above Dashboard (order: 0) |
| **Route** | `/dashboard/admin/coach-assistant` |
| **Default Landing** | YES — redirect `/dashboard/home` → `/dashboard/admin/coach-assistant` |
| **AI Context** | `coach_assistant` (new master context with access to ALL sub-contexts) |

---

## 3. Core Requirements

### 3.1 Landing Page Behavior
- When admin logs in → lands on Swan Studios Coach Assistant (not Dashboard Overview)
- When trainer logs in → lands on Swan Studios Coach Assistant (not Training Overview)
- Dashboard Overview remains accessible as a separate tab
- Client login behavior unchanged (lands on their dashboard)

### 3.2 Mobile-First Design (320px — 430px priority)

**Font Size Requirements (CRITICAL):**

| Element | Mobile (320-430px) | Tablet (768px) | Desktop (1024px+) |
|---------|-------------------|----------------|-------------------|
| AI Response Text | 16px minimum | 15px | 14px |
| User Message Text | 16px minimum | 15px | 14px |
| Input Field | 16px (prevents iOS zoom) | 15px | 14px |
| Context Labels | 13px | 12px | 12px |
| Timestamps | 11px | 11px | 11px |

**Why 16px mobile minimum:** iOS Safari auto-zooms inputs below 16px. Also, Sean is reading this on a phone while training — readability is paramount.

**Touch Targets:**

| Element | Minimum Size |
|---------|-------------|
| Send Button | 56px × 56px (extra large for gym use) |
| Voice Orb | 64px × 64px (primary CTA on mobile) |
| Context Chips | 44px height |
| Style Toggle | 44px height |
| Quick Action Buttons | 48px height |

### 3.3 Three Response Styles

| Style | Key | Label | Emoji | Description |
|-------|-----|-------|-------|-------------|
| PhD Mode | `phd_only` | PhD Mode | 🎓 | Expert-level NASM technical detail |
| Balanced | `balanced` | Balanced | ⚖️ | Clear, complete — technical but accessible to everyone |
| Keep It 100 | `simple_only` | Keep It 100 | 💯 | Straight to the point, no jargon |

**Balanced (NEW):** This is the middle ground. It includes technical information (exercise names, muscle groups, set/rep schemes, tempo notation) but explains it in plain English. No PhD-level citations or deep biomechanics, but doesn't skip important details either. This should be the **default** style.

### 3.4 Voice Input + Voice Output

**Voice Input (Already Built — Enhance):**
- DictationOrb with Web Speech API (already exists)
- Auto-send after 750ms silence (already works)
- **Enhancement:** Make the voice orb the PRIMARY CTA on mobile (center-bottom, 64px)
- **Enhancement:** Add visual waveform feedback while listening

**Voice Output (Text-to-Speech — Enhance):**
- useTextToSpeech hook exists but is opt-in toggle
- **Enhancement:** When voice input is used, auto-enable TTS for the response
- **Enhancement:** Add a "Read Aloud" button on each AI message
- **Future (Sprint +2):** Gemini Flash voice module for natural-sounding TTS
  - Web Speech API `speechSynthesis` is the current fallback
  - Gemini Flash 2.0 has native voice generation capability
  - Requires backend proxy: `POST /api/ai-chat/voice` → Gemini voice endpoint
  - Returns audio blob for playback

### 3.5 Hive Mind — All Contexts Accessible

The Coach Assistant has a **master context** that can access ALL sub-contexts without switching tabs:

**Quick Context Chips (scrollable row at top):**
```
[🏋️ Workouts] [📋 Log Meal] [👥 Clients] [📅 Schedule] [📊 Progress] [🏆 Gamification] [💪 Exercises] [🎓 Teach Mode]
```

Tapping a chip sets the conversation context. The AI automatically knows:
- Which client is selected (from GlobalClientContext)
- What the current OPT phase is
- What equipment is available
- Recent workout history

**Context Auto-Detection:**
- If message contains food words → auto-switch to `macro_logging`
- If message mentions a client name → auto-switch to `client_review`
- If message asks "what exercises" → auto-switch to `exercise_library`
- If message says "schedule" or "book" → auto-switch to `scheduling`
- Manual override always available via chips

---

## 4. Wireframe

### Mobile (320-430px) — Primary Layout
```
┌─────────────────────────────────┐
│ ☰  Swan Studios Coach Assistant │  ← Hamburger + title (44px header)
├─────────────────────────────────┤
│ [🏋️] [📋] [👥] [📅] [📊] [💪]│  ← Scrollable context chips (44px)
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ AI: Good morning! Ready   │  │  ← AI message (16px, full width)
│  │ to train. What's the plan │  │
│  │ for today?                │  │
│  └───────────────────────────┘  │
│                                 │
│       ┌───────────────────┐     │
│       │ You: Chest day w/ │     │  ← User message (16px, right-aligned)
│       │ Marcus, Phase 2   │     │
│       └───────────────────┘     │
│                                 │
│  ┌───────────────────────────┐  │
│  │ AI: Here's a Phase 2     │  │
│  │ Strength Endurance chest  │  │
│  │ workout for Marcus:       │  │
│  │                           │  │
│  │ 1. Barbell Bench Press    │  │
│  │    4×10 @ 70% 1RM        │  │
│  │    Tempo: 2/0/2          │  │
│  │    Rest: 60s             │  │
│  │ ...                       │  │
│  │ [📋 Save Plan] [🔊 Read] │  │  ← Action buttons inside message
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ ⚖��� Balanced ▾                   │  ← Response style selector (44px)
├─────────────────────────────────┤
│ ┌─────────────────────┐  🎤  📤│  ← Input bar (56px min-height)
│ │ Type or tap mic...   │  ○   → │     Voice orb (64px) + Send (56px)
│ └─────────────────────┘        │
│          safe-area-inset        │  ← iOS notch padding
└─────────────────────────────────┘
```

### Desktop (1024px+)
```
┌──────────┬───���──────────────────────────────────────┐
│ Sidebar  │  Swan Studios Coach Assistant             │
│          ├──────────────────────────────────────────┤
│ 🤖 Coach │ [🏋️ Workouts] [📋 Meals] [👥 Clients]  │
│ 📊 Dash  │ [📅 Schedule] [📊 Progress] [💪 Exer]   │
│ 👥 Team  ├──────────────────────────────────────────┤
│ 🏋️ Work │                                          │
│ 📅 Sched│  AI messages area                        │
│ 🎮 Gami │  (max-width: 800px centered)              │
│ 💰 Store│                                          │
│ 🎬 Video│                                          │
│ 📊 Stats│                                          │
│ ⚙️ Sys  ├──────────────────────────────────────────┤
│          │ ⚖️ Balanced ▾  [Type message...] 🎤  📤  │
└──────────┴──────────────────────────────────────────┘
```

---

## 5. Component Architecture

### Mermaid Diagram
```
graph TD
  A[SwanCoachAssistantPage] --> B[CoachHeader]
  A --> C[ContextChipBar]
  A --> D[ChatMessageList]
  A --> E[ResponseStyleSelector]
  A --> F[CoachInputBar]

  D --> G[CoachMessage - AI]
  D --> H[CoachMessage - User]
  G --> I[MessageActions - Save/Read/Copy]

  F --> J[TextInput]
  F --> K[DictationOrb]
  F --> L[SendButton]

  C --> M[ContextChip × N]

  A -.-> N[useAIChat hook]
  A -.-> O[useTextToSpeech hook]
  A -.-> P[GlobalClientContext]
```

### File Structure
```
frontend/src/components/DashBoard/Pages/coach-assistant/
├── SwanCoachAssistantPage.tsx      (≤200 lines — orchestrator)
├── CoachHeader.tsx                  (title bar + minimize)
├── ContextChipBar.tsx               (scrollable context chips)
├── ChatMessageList.tsx              (virtualized message list)
├── CoachMessage.tsx                 (individual message bubble)
├── CoachInputBar.tsx                (text input + voice + send)
├── ResponseStyleSelector.tsx        (PhD / Balanced / Keep It 100)
├── CoachQuickActions.tsx            (in-message action buttons)
├── SwanCoachStyles.ts               (all styled components)
├── SwanCoachTypes.ts                (TypeScript interfaces)
├── SwanCoachConstants.ts            (context configs, defaults)
���── hooks/
    ├── useCoachAssistant.ts         (orchestration hook)
    └── useVoiceIO.ts               (combined voice in + voice out)
```

---

## 6. Theme Integration (MANDATORY)

ALL styled components use CSS custom properties with dark-first fallbacks:

```typescript
// SwanCoachStyles.ts pattern
export const CoachPage = styled.div`
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const MessageBubbleAI = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px 16px 16px 4px;
  padding: 16px;
  color: var(--text-primary, #E0ECF4);
  font-size: 16px;  /* Mobile-first: never smaller than 16px */
  line-height: 1.6;

  @media (min-width: 1024px) {
    font-size: 14px;
    line-height: 1.5;
  }
`;

export const MessageBubbleUser = styled.div`
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  border-radius: 16px 16px 4px 16px;
  padding: 16px;
  color: var(--text-primary, #E0ECF4);
  font-size: 16px;
  line-height: 1.6;
  margin-left: auto;
  max-width: 85%;

  @media (min-width: 1024px) {
    font-size: 14px;
    max-width: 70%;
  }
`;
```

---

## 7. Responsive Breakpoint Matrix

| Breakpoint | Layout Changes |
|-----------|----------------|
| 320px | Single column, 16px text, 64px voice orb, chips scroll horizontally, full-width messages |
| 375px | Same as 320 with slightly more breathing room |
| 430px | Same as 375, chips may fit 5 visible |
| 768px | Tablet: messages get max-width 85%, input bar has more padding |
| 1024px | Desktop: sidebar visible, messages centered (max-width 800px), font drops to 14px |
| 1280px+ | Same as 1024 with wider message area |
| 1440px+ | Messages max-width 900px |
| 1920px+ | Ultra-wide: content stays centered, generous whitespace |

---

## 8. Backend Changes

### 8.1 New Response Style: "balanced"
Add to `aiChatService.mjs` system prompts:

```
BALANCED MODE: Provide complete, accurate information including exercise names, muscle groups,
set/rep schemes, tempo notation, and NASM protocol references. Explain everything in clear
language that anyone can understand — no unexplained jargon. Include the technical details
but make them accessible. Don't cite research papers or use PhD-level biomechanics terminology
unless specifically asked.
```

### 8.2 New Context: "coach_assistant"
Master context that has access to ALL sub-contexts. The system prompt includes:
- Full NASM OPT protocol reference
- Client data access patterns
- Schedule awareness
- Exercise database query capability
- Macro/nutrition logging
- Gamification point awareness

### 8.3 Voice TTS Endpoint (Sprint +2)
```
POST /api/ai-chat/voice/synthesize
Body: { text: string, voice?: string }
Response: audio/mpeg blob
```
Uses Gemini Flash for natural voice. Falls back to Web Speech API.

---

## 9. Quick Actions (In-Message Buttons)

When the AI generates actionable content, inline buttons appear:

| Action | When | What It Does |
|--------|------|-------------|
| 📋 Save Plan | AI generates a workout | Saves to client's workout plans |
| 🔊 Read Aloud | Any AI response | TTS reads the message |
| 📤 Share | Any AI response | Copies or shares to client |
| ✏️ Edit | AI generates a workout | Opens workout builder with pre-filled data |
| 📊 Show Chart | AI mentions progress | Opens relevant Victory chart |
| 📅 Book Session | AI mentions scheduling | Opens schedule modal |

---

## 10. Implementation Phases

### Phase 1: Core Terminal (This Sprint)
- [ ] Create SwanCoachAssistantPage + all sub-components
- [ ] Wire to existing useAIChat hook
- [ ] Add "balanced" response style
- [ ] Add "coach_assistant" master context
- [ ] Mobile-first 16px text, 64px voice orb
- [ ] Theme-connected CSS variables throughout
- [ ] Make it the landing tab (update routes)
- [ ] Context chip bar with all contexts
- [ ] Response style selector (PhD / Balanced / Keep It 100)

### Phase 2: Voice Enhancement (Sprint +1)
- [ ] Auto-enable TTS when voice input is used
- [ ] "Read Aloud" button on each AI message
- [ ] Visual waveform during voice input
- [ ] Better silence detection (VAD)

### Phase 3: Gemini Voice (Sprint +2)
- [ ] Backend voice synthesis endpoint
- [ ] Gemini Flash 2.0 voice integration
- [ ] Natural voice output replacing Web Speech API
- [ ] Voice activity detection improvements

### Phase 4: Trainer + Client Versions
- [ ] Trainer Coach Assistant (same layout, trainer-scoped contexts)
- [ ] Client Coach Assistant (limited contexts: general, meals, form, workouts)
- [ ] User Coach Assistant (basic: general, form tips)

---

## 11. Accessibility Requirements

- `role="log"` on message list for screen reader announcements
- `aria-live="polite"` on new messages
- `aria-label` on all buttons (voice, send, context chips)
- Focus management: auto-focus input after AI responds
- Escape key closes any open modals/drawers
- High contrast text: 4.5:1 minimum (Frost White on dark bg = guaranteed)
- `env(safe-area-inset-bottom)` for iOS notch
- `prefers-reduced-motion` disables animations

---

## 12. Performance Requirements

- **First message render:** <100ms (no heavy components on initial load)
- **Voice recognition start:** <500ms after tap
- **AI response display:** Stream tokens as they arrive (SSE or chunked)
- **Message list:** Virtualized for conversations >50 messages
- **Lazy load:** Charts, workout builder, and heavy components only when triggered by quick actions
- **Bundle size:** Coach Assistant chunk <50KB (excluding shared deps)

---

## 13. Data Flow

```
User speaks → DictationOrb (Web Speech API) → transcript text
  → useCoachAssistant.sendMessage(text, context, style)
    → POST /api/ai-chat/conversations/:id/messages
      → AI provider (Gemini → OpenAI → Anthropic fallback)
    → Response streamed back
  → ChatMessageList renders new message
  → If voice was used → auto-TTS reads response
  → If frontendActions returned → render Quick Action buttons
```

---

## 14. Migration & Routing Changes

### dashboard-tabs.ts
Add new workspace at position 0:
```typescript
{
  id: 'coach',
  label: 'Coach Assistant',
  icon: 'MessageCircle',
  prefix: '/dashboard/admin/coach-assistant',
  description: 'Swan Studios Coach — AI-powered training assistant'
}
```

### UnifiedAdminRoutes.tsx
Change default redirect:
```typescript
// Before:
<Route path="/" element={<Navigate to="/dashboard/home" replace />} />

// After:
<Route path="/" element={<Navigate to="/dashboard/admin/coach-assistant" replace />} />
```

### Trainer Dashboard
Same pattern — add Coach Assistant as first tab, make it the landing page.

---

## 15. Testing Requirements

- [ ] Mobile 320px: All text ≥16px, voice orb 64px, no horizontal scroll
- [ ] Mobile 375px: Same as 320, verify chip scroll works
- [ ] Tablet 768px: Messages have proper max-width
- [ ] Desktop 1024px: Sidebar + centered chat, font 14px
- [ ] Theme toggle: Switch all 14 themes, verify contrast on each
- [ ] Voice input: Tap mic, speak, verify auto-send
- [ ] TTS: AI response is read aloud when voice mode active
- [ ] Context switching: Tap chip, verify AI context changes
- [ ] Response styles: Toggle PhD/Balanced/Simple, verify output differs
- [ ] Keyboard: Tab navigation, Escape to close, Enter to send
- [ ] iOS Safari: No input zoom, safe-area padding works
- [ ] Long conversation: 100+ messages, no lag (virtualization)
