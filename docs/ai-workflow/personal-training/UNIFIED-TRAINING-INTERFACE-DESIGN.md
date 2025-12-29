# 🎯 UNIFIED TRAINING INTERFACE DESIGN SPECIFICATION
## SwanStudios Admin Dashboard - Personal Training + Boot Camp Classes (Single Page)

**Last Updated:** 2025-11-06
**Version:** 1.0 - Initial Specification
**Purpose:** Design spec for unified training interface in SwanStudios admin dashboard
**Target:** Coach Cortex v3.1 - Personal Training + Group Fitness Boot Camps

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [User Interface Layout](#user-interface-layout)
4. [Personal Training Mode](#personal-training-mode)
5. [Boot Camp Mode](#boot-camp-mode)
6. [Navigation & Toggle System](#navigation--toggle-system)
7. [Responsive Design](#responsive-design)
8. [Galaxy-Swan Theme Integration](#galaxy-swan-theme-integration)
9. [Data Flow & API Integration](#data-flow--api-integration)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 📚 OVERVIEW

### What Is This?

The **Unified Training Interface** is a single-page component within the SwanStudios admin dashboard that allows Sean to manage BOTH personal training clients AND boot camp classes from one location. No separate apps, no context switching.

### Why a Unified Interface?

**Problem:**
- Trainers juggle multiple tools (personal training app, class planning app, spreadsheets)
- Context switching wastes time and creates data silos
- Participants may do both personal training AND boot camps (need unified view)

**Solution:**
- Single page with toggle: Personal Training ↔ Boot Camp Classes
- Shared data (clients who also attend boot camps show in both modes)
- Unified voice dictation system (same iPad workflow for both)
- Consistent Galaxy-Swan theme and UX patterns

### Key Features

**Personal Training Mode:**
- Client roster with active/inactive status
- Voice-to-text workout logging (OpenAI Whisper API)
- Master Prompt JSON viewer/editor
- Safety alerts and pain monitoring
- Progress tracking and plateau detection
- AI Village consensus recommendations

**Boot Camp Mode:**
- Class schedule calendar (upcoming classes)
- Flexible board class generator with AI assistance (typically 4-5 boards, 2-6 exercises per board)
- Participant roster management (8-16 participants per class)
- Adaptive difficulty system (Easy/Hard versions)
- Equipment flow optimizer
- Preferred workout library learning (AI learns Sean's style)
- Rest timing display (10 sec between exercises, 60 sec after board)

---

## 🎨 DESIGN PRINCIPLES

### 1. Progressive Disclosure

**Show only what's needed:**
- Default view: High-level overview (client list OR class schedule)
- Click client/class → expand to detailed view (workout history, safety alerts, board layouts)
- AI insights hidden until requested (click "Ask AI Village" button)

### 2. Unified But Distinct

**Same layout, different content:**
- Toggle switch at top (Personal Training ↔ Boot Camp)
- Layout remains consistent (left sidebar, main content area, right panel for AI insights)
- Color coding: Personal Training = blue accents, Boot Camp = green accents

### 3. Mobile-First for iPad

**Optimized for gym floor:**
- Large touch targets (min 44x44 px)
- Voice dictation button prominently placed
- Offline-first (works without WiFi, syncs later)
- Quick actions accessible within 2 taps

### 4. AI Transparency

**Show AI confidence:**
- AI recommendations include confidence scores (e.g., "85% confidence")
- Multi-AI consensus visible (show which AIs agreed/disagreed)
- Human override always available ("Override AI" button)

---

## 🖥️ USER INTERFACE LAYOUT

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: SwanStudios Admin Dashboard                            │
│ [ Personal Training | Boot Camp Classes ]  ← Toggle Switch     │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┬────────────────────────────────┬─────────────────┐
│ LEFT SIDEBAR │      MAIN CONTENT AREA         │  RIGHT PANEL    │
│              │                                 │  (AI Insights)  │
│ - Client List│  Personal Training Mode:        │                 │
│   OR         │  - Client details               │  - Safety Alert │
│ - Class List │  - Workout logger               │  - AI Consensus │
│              │  - Progress graphs              │  - Quick Actions│
│              │                                 │                 │
│ - Quick      │  Boot Camp Mode:                │                 │
│   Actions    │  - Class schedule               │                 │
│ - Filters    │  - Flexible board generator     │                 │
│              │  - Participant roster           │                 │
│              │  - Equipment optimizer          │                 │
└──────────────┴────────────────────────────────┴─────────────────┘
```

### Responsive Breakpoints

- **Desktop (1440px+)**: 3-column layout (sidebar, main, AI panel)
- **Tablet (768-1439px)**: 2-column layout (sidebar collapses to drawer, main + AI panel)
- **Mobile (< 768px)**: 1-column layout (full-screen main content, sidebar/AI panel as modals)

---

## 🧑‍🏫 PERSONAL TRAINING MODE

### Left Sidebar: Client List

**Components:**
```tsx
<ClientList>
  <SearchBar placeholder="Search clients (ID, Name, Spirit Name)" />
  <FilterTabs>
    <Tab>All Clients (47)</Tab>
    <Tab>Active (32)</Tab>
    <Tab>Inactive (15)</Tab>
    <Tab>Needs Review (3) 🔴</Tab>
  </FilterTabs>
  <ClientCards>
    {clients.map(client => (
      <ClientCard
        id={client.id}
        spiritName={client.spiritName}
        realName={client.realName} // Only shown to Sean
        status={client.status} // active, inactive, needs_review
        lastSession={client.lastSessionDate}
        alerts={client.alerts} // pain, sleep, compliance
        onClick={() => selectClient(client.id)}
      />
    ))}
  </ClientCards>
</ClientList>
```

**Visual Example:**
```
┌─────────────────────────┐
│ 🔍 Search clients...    │
├─────────────────────────┤
│ All (47) | Active (32)  │
│ Inactive (15) | ⚠️ (3)  │
├─────────────────────────┤
│ PT-10001 Golden Hawk    │
│ Alexandra M.            │
│ Last: 2 days ago        │
│ 🟢 No alerts            │
├─────────────────────────┤
│ PT-10003 Silver Crane   │
│ Marcus T.               │
│ Last: 5 days ago        │
│ 🔴 Pain: 7/10 shoulder  │
├─────────────────────────┤
│ PT-10005 Iron Wolf      │
│ Samantha K.             │
│ Last: 1 week ago        │
│ 🟡 Sleep <5hrs (3 days) │
└─────────────────────────┘
```

### Main Content Area: Client Details

**When a client is selected, show:**

```tsx
<ClientDetailsView>
  <ClientHeader>
    <Avatar spiritName="Golden Hawk" />
    <h1>{client.spiritName}</h1>
    <Badge status={client.status} />
    <QuickActions>
      <Button icon="microphone">Log Workout (Voice)</Button>
      <Button icon="edit">Edit Master Prompt</Button>
      <Button icon="chart">View Progress</Button>
    </QuickActions>
  </ClientHeader>

  <TabNavigation>
    <Tab>Today's Session</Tab>
    <Tab>Workout History</Tab>
    <Tab>Progress Graphs</Tab>
    <Tab>Master Prompt JSON</Tab>
    <Tab>Safety Alerts</Tab>
  </TabNavigation>

  <TabContent>
    {activeTab === 'todaysSession' && <WorkoutLogger />}
    {activeTab === 'workoutHistory' && <WorkoutHistoryTable />}
    {activeTab === 'progressGraphs' && <ProgressCharts />}
    {activeTab === 'masterPrompt' && <MasterPromptEditor />}
    {activeTab === 'safetyAlerts' && <SafetyAlertsPanel />}
  </TabContent>
</ClientDetailsView>
```

### Right Panel: AI Insights

**Shows context-aware AI recommendations:**

```tsx
<AiInsightsPanel>
  <SafetyAlerts>
    {client.alerts.map(alert => (
      <Alert severity={alert.severity}>
        {alert.message}
        <Button>View Details</Button>
      </Alert>
    ))}
  </SafetyAlerts>

  <AiRecommendations>
    <h3>AI Village Consensus</h3>
    <ConsensusCard confidence={0.86}>
      <p>Recommend deload week + sleep optimization</p>
      <AiVotes>
        <Vote ai="Gemini" confidence={0.89}>Agree (CNS fatigue)</Vote>
        <Vote ai="ChatGPT-5" confidence={0.88}>Agree (sleep debt)</Vote>
        <Vote ai="Claude Code" confidence={0.85}>Agree (injury prevention)</Vote>
        <Vote ai="MinMax v2" confidence={0.82}>Agree (client morale)</Vote>
      </AiVotes>
      <Button>Apply Recommendation</Button>
      <Button variant="text">Override AI</Button>
    </ConsensusCard>
  </AiRecommendations>

  <QuickActions>
    <Button icon="message">Send Check-In Message</Button>
    <Button icon="calendar">Schedule Next Session</Button>
    <Button icon="brain">Ask AI Village</Button>
  </QuickActions>
</AiInsightsPanel>
```

---

## 🏋️ BOOT CAMP MODE

### Left Sidebar: Class List

**Components:**
```tsx
<ClassList>
  <CalendarView mode="week" />
  <FilterTabs>
    <Tab>Upcoming (8)</Tab>
    <Tab>Past (42)</Tab>
    <Tab>Drafts (2)</Tab>
  </FilterTabs>
  <ClassCards>
    {classes.map(classItem => (
      <ClassCard
        id={classItem.id}
        dateTime={classItem.dateTime}
        participants={classItem.participantCount}
        status={classItem.status} // scheduled, completed, draft
        focusArea={classItem.focusArea} // upper, lower, full, HIIT
        onClick={() => selectClass(classItem.id)}
      />
    ))}
  </ClassCards>
  <Button icon="plus">Create New Class</Button>
</ClassList>
```

**Visual Example:**
```
┌─────────────────────────┐
│ 📅 Week of Nov 6, 2025  │
│ Mon Tue Wed Thu Fri Sat │
│  6   7   8   9  10  11  │
│  -   🟢  -   🟢  -   🟢 │
├─────────────────────────┤
│ Upcoming (8) | Past (42)│
├─────────────────────────┤
│ Tue 6pm - Lower Body    │
│ 12 participants         │
│ 🟢 Boards ready         │
├─────────────────────────┤
│ Thu 6pm - Full Body     │
│ 8 participants          │
│ 🟡 Draft (not finalized)│
├─────────────────────────┤
│ Sat 9am - HIIT          │
│ 16 participants (max!)  │
│ 🟢 Boards ready         │
├─────────────────────────┤
│ + Create New Class      │
└─────────────────────────┘
```

### Main Content Area: Class Details

**When a class is selected, show:**

```tsx
<ClassDetailsView>
  <ClassHeader>
    <h1>{classItem.dateTime} - {classItem.focusArea}</h1>
    <ParticipantCount>{classItem.participantCount}/16</ParticipantCount>
    <QuickActions>
      <Button icon="brain">AI Generate Class</Button>
      <Button icon="edit">Edit Boards Manually</Button>
      <Button icon="users">Manage Roster</Button>
    </QuickActions>
  </ClassHeader>

  <TabNavigation>
    <Tab>Board Layout (8 Boards)</Tab>
    <Tab>Participant Roster</Tab>
    <Tab>Equipment List</Tab>
    <Tab>Timing Schedule</Tab>
  </TabNavigation>

  <TabContent>
    {activeTab === 'boardLayout' && <BoardLayoutGenerator />}
    {activeTab === 'participantRoster' && <ParticipantRosterTable />}
    {activeTab === 'equipmentList' && <EquipmentChecklist />}
    {activeTab === 'timingSchedule' && <ClassTimeline />}
  </TabContent>
</ClassDetailsView>
```

### Board Layout Generator

**Flexible Board System Visual Display:**

```tsx
<BoardLayoutGenerator>
  <AiGeneratorButton>
    <Button icon="brain" size="large">
      Generate Class with AI Village
    </Button>
    <FormDialog>
      <Select label="Focus Area" options={['Upper Body', 'Lower Body', 'Full Body', 'HIIT']} />
      <Input label="Participants" type="number" min={8} max={16} default={12} />
      <Input label="Age Range" default="22-63" />
      <Select label="Board Configuration" options={[
        '4 boards × 4-6 exercises (most common)',
        '5 boards × 3-4 exercises',
        '6 boards × 2-3 exercises',
        '8 boards × 2 exercises (rare)'
      ]} default="4 boards × 4-6 exercises" />
      <Checkbox label="Use signature exercises (TRX rows, kettlebell swings)" checked />
      <Button>Generate</Button>
    </FormDialog>
  </AiGeneratorButton>

  <BoardGrid>
    {[1, 2, 3, 4, 5, 6, 7, 8].map(boardNum => (
      <BoardCard
        boardNumber={boardNum}
        isActive={boardNum <= classData.boardCount} // Flexible: 4-8 boards
        exercises={boardNum <= classData.boardCount ? classData.boards[boardNum] : null}
      >
        {boardNum <= classData.boardCount ? (
          <>
            <h3>BOARD {boardNum}: {board.title}</h3>
            <ExerciseList>
              {board.exercises.map(ex => (
                <Exercise>
                  <span>{ex.name}</span>
                  <span>{ex.weight} lbs - {ex.sets}x{ex.reps}</span>
                </Exercise>
              ))}
            </ExerciseList>
            <DifficultyVersions>
              <div>EASY: {board.easyModification}</div>
              <div>HARD: {board.hardModification}</div>
            </DifficultyVersions>
            <Timing>
              <span>Work: {board.workTime} sec</span>
              <span>Rest between exercises: 10 sec</span>
              <span>Rest after board: 60 sec</span>
            </Timing>
          </>
        ) : (
          <EmptyState>Board not used this class</EmptyState>
        )}
      </BoardCard>
    ))}
  </BoardGrid>
</BoardLayoutGenerator>
```

**Visual Example:**
```
┌────────────────────────────────────────────────────────────────┐
│ 🧠 Generate Class with AI Village                             │
│ Focus: Lower Body | Participants: 12 | Ages: 22-63            │
└────────────────────────────────────────────────────────────────┘

BOARD 1: LOWER BODY POWER          BOARD 2: CORE STABILITY
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ A1: Goblet Squat - 30 lbs   │    │ A1: Plank - 60 sec          │
│     3x12                     │    │ A2: Russian Twists - 20 lbs │
│ A2: Kettlebell Swings - 25  │    │     3x20                    │
│     lbs - 3x15               │    │ A3: Dead Bug - 3x10 each    │
│ A3: Jump Squats - BW - 3x10 │    │ A4: Mountain Climbers - 30s │
│ A4: Walking Lunges - 20 lbs │    │                             │
│     3x12                     │    │ EASY: Knees plank, no twist │
│                              │    │ HARD: Weighted plank +30sec │
│ EASY: 20 lbs squat, no jump │    │                             │
│ HARD: 50 lbs squat + pulse  │    │ Time: 45 sec work, 10 rest  │
│                              │    │ Rest: 60 sec after board    │
│ Time: 45 sec work, 10 rest  │    └─────────────────────────────┘
│ Rest: 60 sec after board    │
└─────────────────────────────┘

BOARD 3: CARDIO BREAK              BOARD 4: UPPER BODY PUSH
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ CHOOSE ONE:                 │    │ A1: Push-Ups - 3x12         │
│ - Lap Running (1 lap)       │    │ A2: Battle Ropes - 30 sec   │
│ - Air Bike (3 min)          │    │ A3: Med Ball Slams - 20 lbs │
│ - Spin Bike (3 min)         │    │     3x15                    │
│ - Rowing Machine (3 min)    │    │                             │
│                              │    │ EASY: Knees push-ups, 10sec │
│ Rest: 90 sec after cardio   │    │      ropes                  │
└─────────────────────────────┘    │ HARD: Deficit push-ups, 45  │
                                    │       sec ropes             │
BOARD 5: TRX SIGNATURE             │                             │
┌─────────────────────────────┐    │ Time: 45 sec work, 15 rest  │
│ A1: TRX Rows - 3x15         │    └─────────────────────────────┘
│ A2: TRX Pistol Squats - 3x8│
│ A3: TRX Chest Press - 3x12 │    BOARD 6-8: NOT USED THIS CLASS
│                              │    ┌─────────────────────────────┐
│ EASY: Higher angle rows     │    │ (Empty)                     │
│ HARD: Single-arm rows       │    │                             │
│                              │    │                             │
│ Time: 45 sec work, 15 rest  │    │                             │
│ ⭐ Coach's Signature Move!  │    │                             │
└─────────────────────────────┘    └─────────────────────────────┘
```

### Right Panel: AI Insights (Boot Camp Mode)

```tsx
<AiInsightsPanel>
  <EquipmentOptimizer>
    <h3>Equipment Flow Analysis</h3>
    <Suggestion>
      ✅ Ankle weights: Keep on from Board 1 → Board 2 (saves 45 sec)
    </Suggestion>
    <Suggestion>
      ⚠️ Cardio Break: 6 participants, only 3 air bikes available.
         Recommend: 3 air bike + 3 spin bike rotation.
    </Suggestion>
  </EquipmentOptimizer>

  <PreferredWorkoutLibrary>
    <h3>Signature Exercise Usage</h3>
    <Progress value={60} label="60% signature exercises (target: 60%+)" />
    <ExerciseList>
      <li>✅ TRX Rows - Board 5 (used in 9/10 recent classes)</li>
      <li>✅ Kettlebell Swings - Board 1 (used in 8/10)</li>
      <li>❌ Battle Ropes missing (usually in 8/10 classes)</li>
    </ExerciseList>
    <Button>Auto-Adjust to Signature Style</Button>
  </PreferredWorkoutLibrary>

  <SafetyChecks>
    <h3>Class Safety Review</h3>
    <Alert severity="info">
      ✅ Claude Code: Age range 22-63, all exercises have Easy versions
    </Alert>
    <Alert severity="warning">
      ⚠️ 3 participants >60 yrs. Board 1 Jump Squats may need step-up alternative.
    </Alert>
  </SafetyChecks>
</AiInsightsPanel>
```

---

## 🔀 NAVIGATION & TOGGLE SYSTEM

### Toggle Switch (Top Center)

**Component:**
```tsx
<ModeToggle>
  <ToggleButton
    value="personal-training"
    active={mode === 'personal-training'}
    onClick={() => setMode('personal-training')}
  >
    <Icon name="user" />
    Personal Training
  </ToggleButton>
  <ToggleButton
    value="boot-camp"
    active={mode === 'boot-camp'}
    onClick={() => setMode('boot-camp')}
  >
    <Icon name="users" />
    Boot Camp Classes
  </ToggleButton>
</ModeToggle>
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│ SwanStudios Admin Dashboard - Unified Training Interface        │
│                                                                  │
│         [ 👤 Personal Training | 👥 Boot Camp Classes ]         │
│            ^^^^^^^^^^^^^^^^^^^^^^^^                              │
│            Active mode (blue underline)                          │
└─────────────────────────────────────────────────────────────────┘
```

### State Persistence

**User's mode selection persists across sessions:**
```tsx
// Save mode to localStorage
useEffect(() => {
  localStorage.setItem('trainingMode', mode);
}, [mode]);

// Restore mode on page load
useEffect(() => {
  const savedMode = localStorage.getItem('trainingMode');
  if (savedMode) setMode(savedMode);
}, []);
```

---

## 📱 RESPONSIVE DESIGN

### Desktop (1440px+)

```
┌──────────────┬────────────────────────────────┬─────────────────┐
│ LEFT SIDEBAR │      MAIN CONTENT AREA         │  RIGHT PANEL    │
│ (20% width)  │      (55% width)               │  (25% width)    │
│              │                                 │                 │
│ Client List  │  Client Details / Class Details│  AI Insights    │
│ OR           │  - Tabs for different views    │  - Safety Alerts│
│ Class List   │  - Workout logger / Board gen  │  - AI Consensus │
│              │  - Progress / Roster           │  - Quick Actions│
└──────────────┴────────────────────────────────┴─────────────────┘
```

### Tablet (768-1439px)

```
┌─────────────────────────────────────────┬─────────────────┐
│      MAIN CONTENT AREA (70%)            │  RIGHT PANEL    │
│                                          │  (30% width)    │
│ [≡] Drawer Toggle (left sidebar)        │                 │
│                                          │  AI Insights    │
│ Client Details / Class Details          │  - Safety Alert │
│ - Tabs for different views              │  - AI Consensus │
│ - Workout logger / Board generator      │  - Quick Actions│
└─────────────────────────────────────────┴─────────────────┘

SIDEBAR (slides in from left when [≡] clicked):
┌──────────────┐
│ Client List  │
│ OR           │
│ Class List   │
│              │
│ [X] Close    │
└──────────────┘
```

### Mobile (< 768px)

```
┌─────────────────────────────────────────┐
│ [≡] SwanStudios Training Interface      │
│ [ Personal Training | Boot Camp ]       │
└─────────────────────────────────────────┘
│                                          │
│      MAIN CONTENT AREA (full width)     │
│                                          │
│ Client Details / Class Details          │
│ - Tabs for different views              │
│ - Workout logger / Board generator      │
│                                          │
│ [🧠 AI Insights] (opens modal)          │
└─────────────────────────────────────────┘

MODALS (full-screen on mobile):
- Sidebar (client/class list)
- AI Insights Panel
- Workout Logger (voice dictation)
```

---

## 🎨 GALAXY-SWAN THEME INTEGRATION

### Color Coding by Mode

**Personal Training Mode:**
- Primary accent: `--color-primary` (Galaxy Blue)
- Secondary: `--color-secondary` (Cosmic Purple)
- Success: `--color-success` (Emerald Green)
- Danger: `--color-danger` (Nebula Red)

**Boot Camp Mode:**
- Primary accent: `--color-boot-camp` (Stellar Green)
- Secondary: `--color-boot-camp-secondary` (Aurora Teal)
- Energy: `--color-boot-camp-energy` (Solar Orange)

### Typography

**Headings:**
- Font: `Orbitron` (Galaxy-Swan theme standard)
- Sizes: H1 (32px), H2 (24px), H3 (18px)

**Body:**
- Font: `Inter` (readable, modern)
- Sizes: Body (16px), Small (14px), Caption (12px)

### Spacing

**Consistent padding/margins:**
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px

---

## 🔄 DATA FLOW & API INTEGRATION

### API Endpoints

**Personal Training:**
```typescript
// Fetch client list
GET /api/training/clients
Response: { clients: Client[] }

// Get client details
GET /api/training/clients/:clientId
Response: { client: Client, masterPrompt: MasterPromptJSON }

// Log workout (voice dictation)
POST /api/training/clients/:clientId/workouts
Body: { audioBlob: File, duration: number }
Response: { transcription: string, parsedData: WorkoutData }

// Get AI consensus
POST /api/training/clients/:clientId/ai-consensus
Body: { query: string }
Response: { consensus: AiConsensus, confidence: number }
```

**Boot Camp Classes:**
```typescript
// Fetch class list
GET /api/boot-camp/classes
Response: { classes: Class[] }

// Get class details
GET /api/boot-camp/classes/:classId
Response: { class: Class, boards: Board[], participants: Participant[] }

// Generate class with AI
POST /api/boot-camp/classes/generate
Body: { focusArea: string, participants: number, ageRange: string }
Response: { classId: string, boards: Board[], equipment: Equipment[] }

// Update board layout
PUT /api/boot-camp/classes/:classId/boards
Body: { boards: Board[] }
Response: { success: boolean }

// Preferred workout library
GET /api/boot-camp/preferred-workouts
Response: { exercises: ExerciseUsage[], signaturePercentage: number }
```

### Real-Time Updates (WebSocket)

**Use WebSocket for live updates:**
```typescript
// Connect to WebSocket
const ws = new WebSocket('wss://api.swanstudios.com/training/ws');

// Subscribe to client updates (Personal Training)
ws.send({ type: 'subscribe', channel: 'client-updates', clientId: 'PT-10001' });

// Subscribe to class updates (Boot Camp)
ws.send({ type: 'subscribe', channel: 'class-updates', classId: 'BC-2025-11-06-1800' });

// Receive real-time updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'ai-consensus-ready') {
    // Update UI with AI recommendations
  }
  if (data.type === 'safety-alert') {
    // Show urgent alert banner
  }
};
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Create page structure (toggle, sidebar, main, AI panel)
- Implement responsive layout (desktop, tablet, mobile)
- Apply Galaxy-Swan theme
- Set up API endpoints (mock data initially)

**Deliverables:**
- [ ] `UnifiedTrainingInterface.tsx` component
- [ ] `PersonalTrainingMode.tsx` component
- [ ] `BootCampMode.tsx` component
- [ ] `AiInsightsPanel.tsx` component
- [ ] Responsive layout working on all devices

### Phase 2: Personal Training Mode (Week 3-4)

**Goals:**
- Client list with search/filter
- Client details with tabs (workout logger, history, progress, master prompt, alerts)
- Voice dictation integration (OpenAI Whisper API)
- AI Village consensus UI

**Deliverables:**
- [ ] Client roster management
- [ ] Workout logger (voice + manual)
- [ ] Master Prompt JSON editor
- [ ] Safety alerts panel
- [ ] AI consensus recommendations

### Phase 3: Boot Camp Mode (Week 5-6)

**Goals:**
- Class schedule calendar
- 8-board layout generator
- AI-powered class generation
- Participant roster management
- Equipment flow optimizer

**Deliverables:**
- [ ] Class list with calendar view
- [ ] Board layout generator (manual + AI)
- [ ] Preferred workout library tracker
- [ ] Equipment checklist
- [ ] Participant roster

### Phase 4: AI Integration (Week 7-8)

**Goals:**
- Multi-AI consensus (Claude, Roo, ChatGPT, Gemini, MinMax, Kilo)
- Confidence scoring
- Preferred workout library learning
- Equipment flow optimization
- Safety review automation

**Deliverables:**
- [ ] Multi-AI orchestration backend
- [ ] Confidence score display
- [ ] AI learning algorithm (track exercise usage)
- [ ] Safety check automation

### Phase 5: Testing & Refinement (Week 9-10)

**Goals:**
- End-to-end testing (unit, integration, E2E)
- Performance optimization (lazy loading, caching)
- Accessibility compliance (WCAG 2.1 AA)
- User acceptance testing with Sean

**Deliverables:**
- [ ] Test coverage >90%
- [ ] Performance: <2s page load, <200ms interactions
- [ ] A11y audit passing
- [ ] Sean's approval for production launch

---

## 📋 ACCEPTANCE CRITERIA

### Must-Have (Launch Blockers)

1. **Toggle Switch Works:** User can switch between Personal Training ↔ Boot Camp without data loss
2. **Responsive Layout:** Works on desktop, tablet, mobile (especially iPad for gym floor)
3. **Personal Training:** Client list, workout logger (voice), safety alerts
4. **Boot Camp:** Class schedule, 8-board generator (manual), participant roster
5. **Galaxy-Swan Theme:** Consistent colors, typography, spacing
6. **Performance:** <2s page load, <200ms interactions

### Should-Have (Post-Launch)

1. **AI Village Integration:** Multi-AI consensus, confidence scoring
2. **Preferred Workout Library:** AI learns Sean's signature exercises over time
3. **Equipment Flow Optimizer:** Minimize transitions between exercises
4. **WebSocket Updates:** Real-time AI recommendations and safety alerts
5. **Offline Mode:** Works without WiFi, syncs later

### Nice-to-Have (Future Enhancements)

1. **Gamification:** XP rewards for completing workouts/classes
2. **Social Sharing:** Clients share PRs, boot camp participants share class photos
3. **Wearable Integration:** Auto-import HRV, sleep, heart rate data
4. **Video Library:** Exercise demonstration videos linked to board exercises
5. **Multi-Trainer Support:** Multiple trainers using the same system

---

## 🎯 SUCCESS METRICS

**Usage Metrics:**
- Time spent in Personal Training Mode vs Boot Camp Mode
- Number of workouts logged per week (voice vs manual)
- Number of boot camp classes generated per week
- AI recommendation acceptance rate (applied vs overridden)

**Performance Metrics:**
- Page load time: <2 seconds
- Interaction response time: <200ms
- Mobile network performance: works on 3G
- Offline mode success rate: >95% sync success

**User Satisfaction:**
- Sean's feedback: "This saves me X hours per week"
- Net Promoter Score (if licensed to other trainers): >50
- Bug reports: <5 critical bugs in first month

---

## 📞 CONTACT & SUPPORT

**Questions about this spec?**
- Read: `docs/ai-workflow/COACH-CORTEX-V3.0-ULTIMATE.md` (complete AI system)
- Read: `docs/ai-workflow/personal-training/COACH-CORTEX-BOOT-CAMP-SYSTEM.md` (boot camp details)
- Ask: AI Village (Claude Code, Roo Code, MinMax v2 for multi-AI consensus)

**Implementation Lead:** TBD (Roo Code, Claude Code, or MinMax v2)

**Version History:**
- v1.0 (2025-11-06): Initial specification

---

**This unified interface is the future of AI-powered training. Let's build it! 🚀**
