# CLIENT DETAIL VIEW WIRING + WORKOUTS REFACTOR + AI TERMINAL INTEGRATION
# Master Blueprint — AI Village Validation Document
# Authors: Claude Opus 4.6 (CEO) + Gemini 3.1 Pro (CTO)
# Date: 2026-03-25
# Status: PENDING AI VILLAGE VALIDATION

---

## 1. EXECUTIVE SUMMARY

This blueprint defines the complete refactoring plan for:
1. **Wiring the 4 Client Detail View tabs** (Training, Biometrics, Overview, Settings) with real components
2. **Refactoring the Workouts Workspace** — moving client-specific tools to the detail view, keeping admin/trainer tools
3. **Replacing the floating AI FAB** with an embedded AI Command Bar at the top of every dashboard section
4. **NEW: AI Postural Pain Analysis** — photo upload + AI vision analysis for pain position assessment

---

## 2. CURRENT STATE (Problems)

### 2a. Client Detail View — All Placeholder
When a client is selected from the Roster in Clients & Team, the detail view shows 4 tabs:
- **Training**: Shows "View workouts, log sessions, and access AI workout generation." (placeholder)
- **Biometrics**: Shows "Body map, movement screen, measurements, and progress charts." (placeholder)
- **Overview**: Shows "Client spending, revenue, engagement metrics, and activity feed." (placeholder)
- **Settings**: Shows "Edit client info, set profile photo, manage permissions." (placeholder)

### 2b. Workouts Workspace — Wrong Location for Client Tools
The Workouts workspace (`WorkoutsWorkspace.tsx`, 490 lines) has 8 tabs:
1. Planner (client-specific → move)
2. Session Logger (client-specific → move)
3. Assessments (client-specific → move)
4. Form Analysis (client-specific → move)
5. Body Map (client-specific → move)
6. Equipment (admin/trainer tool → keep)
7. Boot Camp (admin/trainer tool → keep)
8. Nutrition (admin/trainer tool → keep)

### 2c. Floating AI FAB — Should Be Embedded
`AIAssistantFAB.tsx` (333 lines) renders a floating button at bottom-right with Ctrl+K trigger.
Per CLAUDE.md, this should be an embedded terminal at the top of every section.
`AITerminalPanel.tsx` (503 lines) exists but is NOT integrated into any dashboard page.

### 2d. Body Map — No Photo Analysis
Current Body Map only supports SVG region clicks + pain level + notes.
No ability to capture/upload photos of pain positions for AI analysis.

---

## 3. ARCHITECTURE: CLIENT DETAIL VIEW TABS

### File: `frontend/src/components/DashBoard/workspaces/clients-team/ClientDetailView.tsx`
Currently uses render props: `renderTraining`, `renderBiometrics`, `renderOverview`, `renderSettings`
Parent `MasterDetailLayout.tsx` will provide these render functions with the selected client's ID.

### 3a. TRAINING TAB

**Layout: Vertical Sidebar (Desktop) / Horizontal Pills (Mobile)**

```
WIREFRAME (Desktop ≥1024px):
┌──────────────────────────────────────────────────────────────┐
│ [AI Command Bar: context=workout_generation, clientId=61]    │
├────────────┬─────────────────────────────────────────────────┤
│ Sidebar    │                                                 │
│ (240px)    │  [Active Content Area]                          │
│            │                                                 │
│ ◉ Program  │  WorkoutPlanBuilder / WorkoutLogger /           │
│   Architect│  WorkoutCopilotPanel / SessionHistory           │
│            │                                                 │
│ ○ Active   │  (Based on sidebar selection)                   │
│   Session  │                                                 │
│            │                                                 │
│ ○ Enchanted│                                                 │
│   AI       │                                                 │
│            │                                                 │
│ ○ Vault    │                                                 │
│   History  │                                                 │
├────────────┴─────────────────────────────────────────────────┤

WIREFRAME (Mobile <1024px):
┌──────────────────────────────────────────────────────────────┐
│ [AI Command Bar]                                             │
├──────────────────────────────────────────────────────────────┤
│ [Program Architect] [Active Session] [Enchanted AI] [Vault] │
│  ← scrollable horizontal pills →                            │
├──────────────────────────────────────────────────────────────┤
│ [Content Area - full width]                                  │
└──────────────────────────────────────────────────────────────┘
```

**Sidebar Items:**
| Item | Icon (Lucide) | Component | Source File |
|------|---------------|-----------|-------------|
| Program Architect | `LayoutTemplate` | WorkoutPlanBuilder (Manual + AI toggle) | `WorkoutManagement/WorkoutPlanBuilder.tsx` (1,457 lines → decompose) |
| Active Session | `Activity` | WorkoutLogger (NASM protocol) | `WorkoutLogger/WorkoutLogger.tsx` (960 lines) |
| Enchanted AI | `Sparkles` | WorkoutCopilotPanel (AI generator + approval) | `admin-clients/components/WorkoutCopilotPanel.tsx` (~1,150 lines → decompose) |
| Vault History | `History` | Session history list + detail view | NEW component |

**Sidebar Specs:**
- Desktop ≥1280px: 240px expanded (icon + label)
- Desktop 1024-1279px: 72px collapsed (icon only, centered in 48px container)
- Mobile <1024px: Horizontal scrollable pills, 44px height, `overflow-x: auto`
- Active state: `rgba(0, 32, 96, 0.4)` bg + 3px Wing Purple left border + Ice Wing inset glow
- Hover state: `rgba(224, 236, 244, 0.05)` bg
- Typography: Sora 14px Semi-bold
- Transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`

**Sub-tab Animation (Framer Motion):**
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

### 3b. BIOMETRICS TAB

**Layout: Bento-Box Grid (12-column)**

```
WIREFRAME (Desktop ≥1024px):
┌──────────────────────────────────────────────────────────────┐
│ [AI Command Bar: context=assessment, clientId=61]            │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌──────────────────────┐        │
│ │                         │ │                      │        │
│ │  BODY MAP (8 col)       │ │ MEASUREMENTS (4 col) │        │
│ │  Interactive SVG        │ │ Weight, body fat,    │        │
│ │  + Pain Photo Capture   │ │ circumference charts │        │
│ │  + AI Postural Analysis │ │ (Victory charts)     │        │
│ │                         │ │                      │        │
│ └─────────────────────────┘ └──────────────────────┘        │
│ ┌────────────────────┐ ┌────────────────────┐               │
│ │ MOVEMENT ANALYSIS  │ │ FORM ANALYSIS      │               │
│ │ (6 col)            │ │ (6 col)            │               │
│ │ 7-step wizard      │ │ Video biomechanics │               │
│ │ entry point        │ │ recent thumbnail   │               │
│ └────────────────────┘ └────────────────────┘               │
└──────────────────────────────────────────────────────────────┘

WIREFRAME (Mobile <768px):
┌──────────────────────┐
│ [AI Command Bar]     │
├──────────────────────┤
│ [BODY MAP - full w]  │
│ + Photo Capture      │
├──────────────────────┤
│ [MEASUREMENTS]       │
├──────────────────────┤
│ [MOVEMENT ANALYSIS]  │
├──────────────────────┤
│ [FORM ANALYSIS]      │
└──────────────────────┘
```

**Bento Grid Specs:**
- Desktop: `grid-template-columns: repeat(12, 1fr); gap: 24px;`
- Tablet (768-1023px): `grid-template-columns: repeat(8, 1fr); gap: 16px;`
- Mobile (<768px): `flex-direction: column; gap: 16px;`
- Card bg: Carbon `#141419`, border-radius: 16px
- Card border: `1px solid rgba(224, 236, 244, 0.05)`
- Hover: Graphite `#1A1A24`, translateY(-2px)
- Click: Expands to full-view overlay (CSS transition, not Framer)
- Expansion easing: `cubic-bezier(0.22, 1, 0.36, 1)`

**NEW: AI Postural Pain Analysis (Body Map Enhancement)**

Workflow:
1. Trainer taps body region on SVG (e.g., right shoulder)
2. Logs pain level (0-10) + notes
3. NEW: "Capture Pain Position" camera/upload button appears
4. Trainer photographs client demonstrating the pain-causing position
5. Photo uploads → R2 storage → AI vision model analyzes
6. AI returns structured analysis:
   - Postural assessment (joint angles, compensatory patterns)
   - Likely dysfunction (e.g., upper cross syndrome)
   - Corrective exercises from 840+ exercise DB (NASM CEx protocol)
   - Severity flag (safe to train / modify / refer out)
7. Analysis saved to PainEntry record

Technical Implementation:
| Layer | Component | Details |
|-------|-----------|---------|
| UI | `PainPhotoCapture.tsx` (NEW) | Camera (mobile) / file upload (desktop), preview, upload |
| AI Context | `assessment` | Auto-set when in Biometrics tab |
| API | `POST /api/pain-entries/:id/photo-analysis` | Multer → R2 → AI vision |
| Backend | `aiPosturalAnalysisService.mjs` (NEW) | Photo + region + pain level → AI → structured response |
| Storage | R2 (existing infrastructure) | Same bucket as profile photos |
| Model | `PainEntry.mjs` | Add: `photoUrl` (STRING), `aiAnalysis` (JSONB), `correctiveExercises` (ARRAY of exercise IDs) |

AI Analysis Output Schema:
```json
{
  "posturalAssessment": "Shoulder internally rotated ~25° beyond neutral, scapula elevated and anteriorly tilted, compensatory cervical lateral flexion",
  "likelyDysfunction": "Upper Cross Syndrome",
  "overactiveMusles": ["Upper trapezius", "Levator scapulae", "Pectoralis major"],
  "underactiveMuscles": ["Deep cervical flexors", "Lower trapezius", "Serratus anterior"],
  "correctiveProtocol": [
    { "phase": "SMR", "exercise": "Pec minor foam roll", "exerciseId": 412 },
    { "phase": "Static Stretch", "exercise": "Doorway pec stretch", "exerciseId": 387 },
    { "phase": "Activation", "exercise": "Prone Y-raise", "exerciseId": 445 },
    { "phase": "Integration", "exercise": "Cable external rotation", "exerciseId": 203 }
  ],
  "severity": "moderate",
  "safeToTrain": true,
  "modifications": "Avoid overhead pressing, substitute with landmine press"
}
```

### 3c. OVERVIEW TAB

**Layout: Bento-Box Grid (12-column)**

```
WIREFRAME (Desktop ≥1024px):
┌──────────────────────────────────────────────────────────────┐
│ [AI Command Bar: context=data_analysis, clientId=61]         │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌──────────────────┐│
│ │ THE AI PROTOCOL (8 col, 2 rows)     │ │ READINESS SCORE  ││
│ │ "Good morning, Trainer."            │ │ (4 col)          ││
│ │ Next workout summary                │ │ 92 [SVG ring]    ││
│ │ Daily AI synthesis                  │ ├──────────────────┤│
│ │ [Start Session] CTA                 │ │ WEEKLY XP/STREAK ││
│ │                                     │ │ (4 col)          ││
│ │                                     │ │ 🔥 7-day streak  ││
│ └─────────────────────────────────────┘ └──────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ WEEKLY VOLUME CHART (12 col)                             │ │
│ │ Victory bar chart — Arctic Cyan #50A0F0 bars             │ │
│ │ Fira Code axis labels at 0.6 opacity                     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌────────────────────┐ ┌────────────────────┐ ┌───────────┐ │
│ │ REVENUE (4 col)    │ │ SESSIONS (4 col)   │ │ BADGES    │ │
│ │ Spending metrics   │ │ Completed/upcoming │ │ (4 col)   │ │
│ └────────────────────┘ └────────────────────┘ └───────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Bento Cell Specs:**
- Hero cell: Graphite `#1A1A24` bg, Cormorant Garamond italic greeting
- Metric cells: Carbon `#141419` bg
- CTA button: Midnight Sapphire `#002060` bg, Wing Purple `#8B5CF6` hover glow
- Readiness ring: Ice Wing `#60C0F0` stroke, `drop-shadow(0 0 4px rgba(96, 192, 240, 0.6))`
- Streak accent: Gilded Fern `#C6A84B` for flame icon
- Chart data: Arctic Cyan `#50A0F0` (data viz only, no glow)
- Axis labels: Fira Code, Frost White `#E0ECF4` at 60% opacity
- Mobile: collapses to single-column flex stack

### 3d. SETTINGS TAB

**Layout: Standard Form (2-column grid desktop, 1-column mobile)**

```
WIREFRAME:
┌──────────────────────────────────────────────────────────────┐
│ [AI Command Bar: context=client_review, clientId=61]         │
├──────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌────────────────────────────┐ │
│ │ PERSONAL INFO             │ │ PROFILE PHOTO              │ │
│ │ First/Last Name           │ │ [Upload/Camera]            │ │
│ │ Email, Phone              │ │ Current photo preview      │ │
│ │ DOB, Gender               │ │                            │ │
│ │ Emergency Contact         │ │                            │ │
│ └───────────────────────────┘ └────────────────────────────┘ │
│ ┌───────────────────────────┐ ┌────────────────────────────┐ │
│ │ TRAINING CONFIG           │ │ PRIVACY & PERMISSIONS      │ │
│ │ Equipment Profile         │ │ Chart visibility toggles   │ │
│ │ OPT Phase (current)       │ │ Social profile visibility  │ │
│ │ Training frequency        │ │ DM permissions             │ │
│ │ Injury notes              │ │ RBAC role assignment       │ │
│ └───────────────────────────┘ └────────────────────────────┘ │
│ [Save Changes] [Reset]                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. AI COMMAND BAR (Replaces Floating FAB)

### Component: `AICommandBar.tsx` (NEW)

```
WIREFRAME:
Collapsed (default, 44px):
┌──────────────────────────────────────────────────────────────┐
│ 🦢  Ask about this client's training...           ⌘K  ▾     │
└──────────────────────────────────────────────────────────────┘

Expanded (on focus/click, max-height 400px):
┌──────────────────────────────────────────────────────────────┐
│ 🦢  Type your question...                         ⌘K  ▴     │
├──────────────────────────────────────────────────────────────┤
│ [Context: workout_generation] [Client: Jackie]  [Style: 🎓💯]│
├──────────────────────────────────────────────────────────────┤
│ Quick Actions: [Generate Workout] [Check Progress] [Form Tip]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ AI: Based on Jackie's current OPT Phase 2 and her 7 logged  │
│ workouts, I recommend progressing to strength endurance...   │
│                                                              │
│ User: What exercises should I add for her shoulder issue?    │
│                                                              │
│ AI: Given the right shoulder pain entry from 3/20 with       │
│ moderate severity...                                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Type a message...]                              [Send ▶]    │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: Graphite `#1A1A24`
- Border: 1px solid Royal Depth `#003080`
- Border-radius: 12px
- Focus state: `box-shadow: 0 0 0 1px #8B5CF6, 0 0 16px rgba(139,92,246,0.35), inset 0 0 12px rgba(139,92,246,0.15)`
- Input font: Fira Code 14px
- Button font: Sora 13px
- Desktop: inline expansion (pushes content down)
- Mobile: full-screen takeover with `backdrop-filter: blur(12px)`
- Collapsible by default, expands on click or Ctrl+K
- Passes `clientId` when in client detail view
- Auto-sets context per section

**Context Mapping:**
| Section | AI Context | Placeholder Text |
|---------|-----------|-----------------|
| Training tab | `workout_generation` | "Ask about workout plans, exercises, NASM protocol..." |
| Biometrics tab | `assessment` | "Ask about pain analysis, measurements, movement patterns..." |
| Overview tab | `data_analysis` | "Ask about progress trends, charts, performance metrics..." |
| Settings tab | `client_review` | "Ask about client history, permissions, training config..." |

**Keeps Full Versatility:**
The AI terminal knows its primary purpose by context but can answer ANY question.
It's a full AI secretary/assistant that happens to be contextually aware.

---

## 5. WORKOUTS WORKSPACE REFACTOR → "GLOBAL STUDIO LIBRARY"

### Current: 8 tabs (WorkoutsWorkspace.tsx, 490 lines)
### Target: 4 tabs (admin/trainer tools only)

**What Moves to Client Detail View:**
| Component | From (Workouts Tab) | To (Detail View Tab) |
|-----------|--------------------|-----------------------|
| WorkoutPlanBuilder | Planner tab | Training → Program Architect |
| WorkoutLogger | Session Logger tab | Training → Active Session |
| WorkoutCopilotPanel | (AI mode in Planner) | Training → Enchanted AI |
| BodyMap | Body Map tab | Biometrics → Body Map cell |
| MovementAnalysisWizard | Assessments tab | Biometrics → Movement Analysis cell |
| FormAnalysisPage | Form Analysis tab | Biometrics → Form Analysis cell |

**What Stays (Renamed "Global Studio Library"):**
| Tab | Icon | Who Uses | Purpose |
|-----|------|----------|---------|
| Boot Camp Builder | `Users` | Admin + Trainers | Group class programming, multi-client workouts |
| Equipment Manager | `Wrench` | Admin + Trainers | Equipment inventory, availability, profiles |
| Nutrition | `Utensils` | Admin + Trainers | Nutrition plans, macro templates, meal planning |
| Global Session Calendar (NEW) | `CalendarDays` | Admin + Trainers | Bird's-eye view of ALL client sessions |

---

## 6. MONOLITH DECOMPOSITION (Phase 1)

### WorkoutPlanBuilder.tsx (1,457 lines → 5-6 files)
```
WorkoutPlanBuilder/
├── index.tsx              (Container, state management, ~200 lines)
├── PlanHeader.tsx          (Plan name, client info, OPT phase, ~100 lines)
├── DayPlanCard.tsx         (Single day's exercises, ~150 lines)
├── DraggableExerciseList.tsx (DnD within a day, ~200 lines)
├── ExerciseConfigPanel.tsx  (Sets/reps/weight/tempo/rest, ~150 lines)
├── PlanActions.tsx          (Save, export, AI toggle, ~100 lines)
└── WorkoutPlanBuilderTypes.ts (Interfaces, ~50 lines)
```

### WorkoutCopilotPanel.tsx (~1,150 lines → 4-5 files)
```
WorkoutCopilot/
├── index.tsx               (State machine, ~200 lines)
├── PainCheckStep.tsx        (Pre-generation pain check, ~150 lines)
├── DraftReviewPanel.tsx     (AI draft review + NASM compliance, ~200 lines)
├── ApprovalFlow.tsx         (Approve/reject/modify, ~150 lines)
├── CopilotHeader.tsx        (Context info, client stats, ~100 lines)
└── WorkoutCopilotTypes.ts   (Interfaces, state machine types, ~50 lines)
```

### AITerminalPanel.tsx (503 lines → refactor into AICommandBar)
```
AICommandBar/
├── AICommandBar.tsx         (Main component, ~200 lines)
├── AICommandBarInput.tsx    (Input + send + Ctrl+K, ~100 lines)
├── AICommandBarMessages.tsx  (Message list, ~100 lines)
├── AICommandBarStyles.ts     (Styled components, ~100 lines)
└── useAICommandBar.ts        (Hook: expand/collapse, context, ~80 lines)
```

---

## 7. EXECUTION PHASES

### Phase 0: Blueprint (THIS DOCUMENT)
- [x] Create comprehensive blueprint with wireframes
- [ ] AI Village 11-brain validation
- [ ] CEO final approval

### Phase 1: Decompose Monoliths
- [ ] Break WorkoutPlanBuilder.tsx into 5-6 files
- [ ] Break WorkoutCopilotPanel.tsx into 4-5 files
- [ ] Verify WorkoutLogger sub-components are all <300 lines
- [ ] Create new directory structure under `features/` or existing dirs
- [ ] Ensure all decomposed files pass `npx tsc --noEmit`

### Phase 2: Build AI Command Bar
- [ ] Create AICommandBar component (replaces AITerminalPanel)
- [ ] Implement context auto-setting per section
- [ ] Wire Ctrl+K keyboard shortcut
- [ ] Desktop: inline expansion
- [ ] Mobile: full-screen takeover
- [ ] Test with all 11 AI contexts
- [ ] Remove AIAssistantFAB from dashboard pages (keep for non-admin pages)

### Phase 3: Wire Client Detail View Tabs
- [ ] Training tab: Build vertical sidebar + wire 4 sub-views
- [ ] Biometrics tab: Build bento grid + wire 4 cells
- [ ] Biometrics: Build PainPhotoCapture + AI postural analysis
- [ ] Biometrics: Create backend API for photo analysis
- [ ] Biometrics: Update PainEntry model with photoUrl + aiAnalysis
- [ ] Overview tab: Build bento grid + wire Victory charts + gamification stats
- [ ] Settings tab: Build form layout + wire client editing
- [ ] Fix quick actions: Weigh-In → auto-select Biometrics tab
- [ ] Fix: Reset to Training tab on client switch
- [ ] Implement filter dropdown (status, tier, engagement)

### Phase 4: Refactor Workouts Workspace → Global Studio Library
- [ ] Remove client-specific tabs from WorkoutsWorkspace
- [ ] Keep: Boot Camp, Equipment, Nutrition
- [ ] Add: Global Session Calendar
- [ ] Update workspace name/icon/routing
- [ ] Update UnifiedAdminRoutes.tsx

---

## 8. DESIGN TOKENS (LOCKED — Gemini + Opus Consensus)

| Token | Hex | Usage |
|-------|-----|-------|
| Obsidian Black | `#0A0A0F` | Main background |
| Carbon | `#141419` | Card/panel backgrounds, sidebar bg |
| Graphite | `#1A1A24` | Elevated surfaces, AI terminal bg |
| Midnight Sapphire | `#002060` | Active states (40% opacity), CTA buttons |
| Royal Depth | `#003080` | AI terminal border, elevated card borders |
| Wing Purple | `#8B5CF6` | Active border, focus ring, purple button bg |
| Ice Wing | `#60C0F0` | Inner glow, gaming accents, XP bars |
| Arctic Cyan | `#50A0F0` | Data visualization ONLY (charts, metrics) |
| Gilded Fern | `#C6A84B` | Streak accent, luxury gold, achievement |
| Frost White | `#E0ECF4` | Text, subtle borders (5% opacity) |
| Crimson Frost | `#C92A54` | Error/injury indicators (border only) |

**Typography:**
| Font | Usage |
|------|-------|
| Plus Jakarta Sans | Headings |
| Cormorant Garamond Italic | Drama/greeting text |
| Fira Code | AI terminal, data, code |
| Sora | UI buttons, gaming elements |

**Focus Ring (Global):**
```css
box-shadow: 0 0 0 1px #8B5CF6, 0 0 16px rgba(139,92,246,0.35), inset 0 0 12px rgba(139,92,246,0.15);
transition: box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
```

**Dual-Button Glow System:**
- Blue buttons (`#002060` bg) → Wing Purple `#8B5CF6` glow on hover
- Purple buttons (`#8B5CF6` bg) → Ice Wing `#60C0F0` glow on hover

---

## 9. RISK ASSESSMENT

| Risk | Mitigation |
|------|-----------|
| Tab-ception (tabs within tabs) | Vertical sidebar for Training eliminates nested horizontal tabs |
| Layout breaking with large components | Fixed height detail view, scrollable content area only |
| Bundle size increase from heavy components | React.lazy() for WorkoutPlanBuilder, WorkoutLogger, WorkoutCopilot, FormAnalysis |
| AI photo analysis privacy | Photos stored in R2 with user-scoped access, auto-delete after 90 days configurable |
| Mobile usability with complex tools | Full-screen overlay for sub-views, horizontal pill nav, 48px+ touch targets |
| WorkoutLogger state loss on tab switch | Preserve state in React context or sessionStorage |
| AI terminal context conflicts | Each section gets its own conversation, context is read-only (auto-set) |

---

## 10. SUCCESS CRITERIA

- [ ] All 4 detail tabs render real components (no placeholders)
- [ ] Training tab sidebar navigates between 4 sub-views without page reload
- [ ] Biometrics bento grid shows all 4 tools with expand-to-full-view
- [ ] AI photo analysis captures photo, sends to AI, returns corrective protocol
- [ ] AI Command Bar auto-sets context per section and passes clientId
- [ ] Floating FAB removed from dashboard (kept on non-admin pages)
- [ ] Workouts workspace shows only Boot Camp, Equipment, Nutrition, Calendar
- [ ] All decomposed files are <300 lines
- [ ] Theme compatibility: all components work with UniversalThemeContext
- [ ] Mobile responsive: tested at 375px, 430px, 768px, 1024px, 1440px
- [ ] No console errors on any tab switch or component load
- [ ] Gamification triggers on workout save and assessment completion
