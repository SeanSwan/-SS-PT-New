# SwanStudios Enhancement Master Prompt — Post-Brainstorm Build Brief
## For Claude Code (Opus 4.6) — Primary Builder

**Generated:** 2026-03-04
**Source:** Voice brainstorm session covering competitive features, parallel validation architecture, modular prompt restructuring, and NASM pipeline enhancements
**Context:** This prompt supplements the existing AI Village Master Onboarding Prompt v5.0 and the NASM AI Workout Generation System Blueprint

---

## STATUS UPDATE (2026-03-05)

- **Workstream A (Validation Orchestrator):** COMPLETE — `scripts/validation-orchestrator.mjs` v7.0
  - 7 AI validators via OpenRouter (6 free + MiniMax M2.5)
  - Split output to `AI-Village-Documentation/validation-prompts/latest/`
  - 20-run archive rotation
  - ONBOARDING.md for terminal onboarding
- **Workstream B (10 NASM Features):** NOT STARTED — priority order below
- **Workstream C (Modular Prompts):** PARTIALLY DONE — validation prompts split, broader module system pending

---

## WORKSTREAM B: ADVANCED NASM FEATURE ENHANCEMENTS

### Implementation Priority Order:
1. Real-Time Workout Transcription & Client Messaging (core workflow enhancement)
2. Video Form Analysis Hook (promised to clients — highest urgency)
3. Injury Prevention Forecasting (safety-critical)
4. Pain Entry Safety Check Before AI Generation (quick win, liability protection)
5. Progressive Overload Intelligence (core training value)
6. Fatigue & Readiness Scoring (client engagement)
7. Micro-Progression Tracking (coaching depth)
8. AI-Summarized Coach Notes (post-session automation)
9. Client Engagement Scoring (retention)
10. Integrated Nutrition Coaching Prompts (holistic approach)

---

### Feature 1: Real-Time Workout Transcription & Client Messaging

**What it does:** During a training session, Sean speaks into his phone/tablet. The AI transcribes what happened, compares it against the pre-generated workout plan, identifies variances, and generates a polished client-facing summary message.

**Integration point:** New component in the Trainer Dashboard, connected to existing WorkoutSession and WorkoutPlan models.

**Database additions:**
```
SessionTranscript
├── id (UUID PK)
├── sessionId (FK → WorkoutSession)
├── rawTranscription (TEXT)
├── structuredData (JSONB)
├── planVariances (JSONB)
├── coachNotes (TEXT)
├── clientMessage (TEXT)
├── clientMessageSentAt (DATETIME)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

**API endpoints:**
```
POST   /api/sessions/:sessionId/transcribe
GET    /api/sessions/:sessionId/transcript
POST   /api/sessions/:sessionId/send-summary
PUT    /api/sessions/:sessionId/transcript
```

**Frontend:**
- Speech-to-text input (Web Speech API or Whisper API)
- Real-time transcript display with edit capability
- Side-by-side view: planned workout vs. actual performance
- One-tap "Send to Client" button

---

### Feature 2: Video Form Analysis Hook

**What it does:** Clients upload short video clips (10-30 seconds) of exercises. AI uses computer vision to analyze movement quality, flag form breakdowns, and suggest corrections.

**Database additions:**
```
FormAnalysis
├── id (UUID PK)
├── userId (FK → Users)
├── sessionId (FK → WorkoutSession, nullable)
├── exerciseId (FK → Exercise)
├── videoUrl (STRING)
├── analysisResult (JSONB)
│   ├── overallScore (1-10)
│   ├── jointAngles (JSONB)
│   ├── deviations []
│   ├── rangeOfMotion (JSONB)
│   └── tempoAnalysis (JSONB)
├── aiProvider (STRING)
├── processingStatus (ENUM)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

**Architecture:**
- Video upload → queue (BullMQ) → process asynchronously
- Use OpenAI Vision API, Google Video Intelligence, or MediaPipe
- Store videos on S3 or Cloudflare R2
- Analysis results feed back into AI workout generation context

---

### Feature 3: Injury Prevention Forecasting

**What it does:** AI analyzes pain entries, exercise selection, load progression, and form analysis to predict injuries before they happen.

**Database additions:**
```
InjuryForecast
├── id (UUID PK)
├── userId (FK → Users)
├── predictedRegion (STRING)
├── predictedIssue (STRING)
├── riskScore (FLOAT, 0-1)
├── forecastWindowWeeks (INT)
├── contributingFactors (JSONB)
├── recommendedActions (JSONB)
├── status (ENUM) — active/acknowledged/resolved/expired
├── acknowledgedBy (FK → Users)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

---

### Feature 4: Pain Entry Safety Check Before AI Generation

**Quick win — ~1 day build. Critical safety gap.**

```
User clicks "Generate Workout Plan"
  → Check active pain entries + injury forecasts
  → IF exists: Show warning modal with Review/Generate Anyway/Cancel
  → Log acknowledgment for audit trail
```

---

### Feature 5: Progressive Overload Intelligence

**Database additions:**
```
ProgressionRecommendation
├── id (UUID PK)
├── userId (FK → Users)
├── exerciseId (FK → Exercise)
├── recommendationType (ENUM)
├── currentLoad (JSONB)
├── recommendedLoad (JSONB)
├── reasoning (TEXT)
├── confidenceScore (FLOAT)
├── contributingData (JSONB)
├── status (ENUM)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

---

### Feature 6: Fatigue & Readiness Scoring

**Database additions:**
```
ReadinessCheckIn
├── id (UUID PK)
├── userId (FK → Users)
├── date (DATE)
├── sleepQuality (INT, 1-5)
├── sleepHours (FLOAT)
├── muscleStiffness (INT, 1-5)
├── energyLevel (INT, 1-5)
├── stressLevel (INT, 1-5)
├── overallMood (INT, 1-5)
├── specificSoreness (JSONB)
├── readinessScore (FLOAT, 0-100)
├── recommendation (ENUM)
├── modificationNotes (TEXT)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

---

### Feature 7: Micro-Progression Tracking

Additional fields on WorkoutLog:
```
repQualityScore (FLOAT, 1-10)
tempoAdherence (FLOAT, 0-1)
romScore (FLOAT, 0-1)
restTimeActual (INT)
rpeActual (INT, 1-10)
trainerFormNotes (TEXT)
```

---

### Feature 8: AI-Summarized Coach Notes

Post-processing step after transcription. Auto-generates:
- Client-facing summary (warm, encouraging tone)
- Trainer debrief (follow-ups, progression notes, client mood)

---

### Feature 9: Client Engagement Scoring

**Database additions:**
```
ClientEngagementScore
├── id (UUID PK)
├── userId (FK → Users)
├── date (DATE)
├── overallScore (FLOAT, 0-100)
├── components (JSONB)
├── riskLevel (ENUM)
├── trend (ENUM)
├── suggestedIntervention (TEXT)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)
```

---

### Feature 10: Integrated Nutrition Coaching Prompts

Phase-appropriate nutrition guidance based on NASM OPT model phase.

```
GET /api/nutrition-guidance/:userId
```

---

## WORKSTREAM C: MODULAR PROMPT ARCHITECTURE

### Target Structure:
```
AI-Village-Documentation/
├── CORE-PROMPT.md                          # ~500 lines max, loaded every time
├── modules/
│   ├── CINEMATIC-DESIGN-MODULE.md
│   ├── NASM-PIPELINE-MODULE.md
│   ├── GAMIFICATION-MODULE.md
│   ├── SOCIAL-MODULE.md
│   ├── SECURITY-MODULE.md
│   ├── VALIDATION-ORCHESTRATOR-MODULE.md
│   └── ENHANCEMENT-FEATURES-MODULE.md
├── prompts/
│   ├── frontend-task.md
│   ├── backend-task.md
│   ├── gamification-task.md
│   ├── social-task.md
│   ├── security-review.md
│   ├── full-feature-build.md
│   └── bug-fix.md
└── validation-prompts/                     # DONE — orchestrator output
    ├── ONBOARDING.md
    ├── latest/
    └── archive/
```

### Module Loading Rules:
```
Bug fix           → CORE only
Backend API       → CORE + NASM-PIPELINE + SECURITY
Frontend UI       → CORE + CINEMATIC-DESIGN
Gamification      → CORE + GAMIFICATION + NASM-PIPELINE
Social feature    → CORE + SOCIAL + GAMIFICATION
New NASM feature  → CORE + NASM-PIPELINE + ENHANCEMENT-FEATURES
Full feature      → CORE + all relevant modules
Security review   → CORE + SECURITY
Post-build QA     → CORE + VALIDATION-ORCHESTRATOR
```

---

## CODE PHILOSOPHY

- No file over 300 lines (components) / 400 lines (services)
- Shortest path to working code
- One job per module
- Mobile-first (320px → up)
- Security-first (health data is sensitive)
- Test after build
