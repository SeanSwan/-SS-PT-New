# Voice Memo Workout Log Blueprint

## Problem Statement

Trainers need to quickly log client workouts during or after sessions. Currently, workout logging requires manual text entry through the WorkoutLogger UI. Trainers often use iPhone voice memos to capture session notes on the fly ("Client did 3 sets of 10 bench press at 135, form was good, complained about left shoulder on overhead press..."). These voice memos and other file uploads (text notes, CSV exports) need to be parsed into structured workout log entries automatically.

## Feature Scope

### Phase 1: File Upload + AI Parsing (MVP)

**Backend: Voice/File Upload Endpoint**
- New route: `POST /api/workout-logs/upload`
- Accept: audio/* (voice memos), text/plain, text/csv, application/pdf
- Multer config: 50MB limit, stored in R2 (same pattern as formAnalysisRoutes)
- Auth: admin, trainer only (RBAC)

**Backend: Transcription Service**
- New service: `backend/services/voiceTranscriptionService.mjs`
- For audio files: Call OpenAI Whisper API (`/v1/audio/transcriptions`)
- For text/CSV/PDF files: Extract text directly
- Return raw transcript text

**Backend: Workout Log Parser Service**
- New service: `backend/services/workoutLogParserService.mjs`
- Takes: raw transcript + clientId
- Calls AI (via existing providerRouter) with structured prompt:
  - "Parse this trainer voice memo into a structured workout log"
  - Include client context from ClientIntelligenceService (active pain entries, recent history)
  - Output: JSON matching DailyWorkoutForm.formData schema
- Validates output against DailyWorkoutForm structure
- Returns parsed workout for trainer review before saving

**Backend: Integration with Existing Models**
- Parsed output maps directly to `DailyWorkoutForm.formData`:
  ```json
  {
    "exercises": [
      {
        "exerciseName": "Bench Press",
        "sets": [
          { "setNumber": 1, "weight": 135, "reps": 10, "rpe": 7, "formQuality": 4 }
        ],
        "formRating": 4,
        "painLevel": 0,
        "performanceNotes": "Good form throughout"
      }
    ],
    "sessionNotes": "Client mentioned left shoulder discomfort on overhead movements",
    "overallIntensity": 7
  }
  ```
- Pain mentions auto-flag for PainEntryPanel follow-up
- Session deduction flows through existing DailyWorkoutForm pipeline

**Frontend: Upload Component**
- New component: `frontend/src/components/WorkoutLogger/VoiceMemoUpload.tsx`
- Location: Tab within existing WorkoutLogger or standalone panel in TrainerDashboard
- UI:
  - Drag-drop zone for files (audio, text, CSV)
  - Client selector dropdown (trainer's assigned clients)
  - Date picker (defaults to today)
  - Upload button -> shows transcription progress
  - Review screen: parsed workout displayed in editable form
  - Confirm button -> saves as DailyWorkoutForm
- Mobile-first: 44px touch targets, Galaxy-Swan theme

### Phase 2: In-Browser Recording (Future)

- MediaRecorder API for in-browser voice capture
- Real-time streaming transcription
- Live preview of parsed exercises as trainer speaks

## Data Flow

```
[Voice Memo / File]
       |
       v
[Upload Endpoint] -> [R2 Storage]
       |
       v
[Transcription Service]
  - Audio -> Whisper API -> text
  - Text/CSV -> direct extract
       |
       v
[Workout Log Parser Service]
  - Raw text + ClientIntelligenceService context
  - AI prompt: "Parse into DailyWorkoutForm schema"
  - Pain mention detection
       |
       v
[Trainer Review Screen]
  - Editable parsed workout
  - Pain flags highlighted
  - Confirm / Edit / Reject
       |
       v
[DailyWorkoutForm.create()]
  - Existing pipeline: session deduction, MCP processing, gamification
  - Pain mentions -> prompt trainer to create PainEntry
```

## Integration Points

| System | How Voice Memo Connects |
|--------|------------------------|
| ClientIntelligenceService | Provides client context to AI parser (pain history, recent exercises, equipment) |
| DailyWorkoutForm | Parsed output saves as standard workout form |
| ClientPainEntry | Pain mentions in transcript flagged for follow-up |
| WorkoutSession | Links to booked session if applicable |
| Gamification (MCP) | Triggers points/XP after form saved |
| AI Workout Generation | Future workouts see logged history from voice memos |

## API Contract

### POST /api/workout-logs/upload

**Request:** multipart/form-data
- `file`: audio/*, text/*, application/pdf (required)
- `clientId`: number (required)
- `date`: ISO date string (optional, defaults to today)
- `sessionId`: number (optional, link to booked session)

**Response (200):**
```json
{
  "success": true,
  "transcript": "Client did 3 sets of 10 bench press at 135...",
  "parsedWorkout": {
    "exercises": [...],
    "sessionNotes": "...",
    "overallIntensity": 7,
    "painFlags": [
      { "bodyRegion": "shoulder", "side": "left", "mention": "complained about left shoulder on overhead press" }
    ]
  },
  "confidence": 0.87
}
```

Trainer then confirms via: `POST /api/workout-forms` (existing endpoint)

## Files to Create

| File | Purpose |
|------|---------|
| `backend/services/voiceTranscriptionService.mjs` | Whisper API transcription + text extraction |
| `backend/services/workoutLogParserService.mjs` | AI parsing of transcript into DailyWorkoutForm schema |
| `backend/routes/workoutLogUploadRoutes.mjs` | Upload endpoint with multer config |
| `frontend/src/components/WorkoutLogger/VoiceMemoUpload.tsx` | Upload UI + review screen |

## Files to Modify

| File | Change |
|------|--------|
| `backend/core/startup.mjs` | Register new routes |
| `backend/routes/index.mjs` or `server.mjs` | Mount `/api/workout-logs` |
| `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` | Add "Upload Voice Memo" tab/button |
| `frontend/src/components/TrainerDashboard/` | Add voice upload access point |

## Environment Variables

- `OPENAI_API_KEY` - For Whisper transcription (already exists for AI workout generation)
- No new env vars needed if OpenAI key is already configured

## Security

- RBAC: admin + trainer only (clients cannot upload workout logs)
- File validation: MIME type + magic bytes check
- Size limit: 50MB (matches existing patterns)
- R2 storage: private bucket, signed URLs for playback
- Rate limit: 10 uploads per 15 minutes per trainer
- Transcription content sanitized before AI prompt injection

## Acceptance Criteria

1. Trainer can upload iPhone voice memo (.m4a) from TrainerDashboard
2. System transcribes audio and displays structured workout
3. Trainer can review, edit, and confirm parsed workout
4. Confirmed workout saves as DailyWorkoutForm (existing pipeline)
5. Pain mentions are flagged with body region + side
6. Uploaded workout appears in client's workout history
7. AI workout generator can see voice-memo-logged workouts in future plans
8. Text and CSV files also parse correctly
9. Mobile-optimized upload flow (44px touch targets)
10. Zero breaking changes to existing WorkoutLogger
