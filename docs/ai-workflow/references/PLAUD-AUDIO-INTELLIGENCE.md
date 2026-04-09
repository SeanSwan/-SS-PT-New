# SwanStudios Audio Intelligence & Plaud Integration
> Reference doc extracted from master build plan PDF. Loaded on-demand, not every message.
> Read when: voice logging, Plaud NotePin, audio import, transcript parsing, session recap

---

## Mission

Record a PT session in under 30 seconds of total recording time → auto-populate the client's workout log → trigger XP → send SMS + email recap → all within 60 seconds of session end. **Zero manual data entry.**

**Why this matters for revenue:** Hands-on training experience (no notebook) → higher perceived value → justifies premium pricing at $175/session (3-month program = $8,400, 6-month = $16,800, 12-month = $33,600). Every trainer on SwanStudios gets this pipeline → platform differentiator → trainer recruitment tool.

---

## Hardware

- **Device:** Plaud NotePin (original, $101.76 after PLD20LOST + Easter sale)
- **Worn on:** left wrist during sessions
- **Recording style:** Burst recording — press on, speak exercise, press off — 10-20 sec per clip
- **Sync:** Bluetooth to Plaud app on phone
- **Export:** MP3 (audio) or TXT/JSON (transcript)

---

## Two-Phase Strategy

### Phase 1 (Now — Month 1-2): Manual Export
- Use Plaud's native app for transcription (300 min/mo FREE)
- Manually export transcripts and upload to SwanStudios
- Zero dev time required
- Learn which features matter in real daily use

### Phase 2 (Month 2-3): Full Automation
- Build SwanStudios Audio Intelligence module
- Replace Plaud's app entirely for workout logging
- Own the full pipeline end-to-end
- Background job auto-processes within 30 seconds
- Trainer time after last rep: under 30 seconds total

---

## Data Flow (12 Steps)

| Step | Action | Technology | Location |
|------|--------|-----------|----------|
| 1 | Trainer records burst clip during session | Plaud NotePin (wristband) | Gym floor |
| 2 | Audio syncs to phone via Bluetooth | Plaud App | Phone |
| 3 | Export audio (MP3) or transcript (TXT/JSON) | Plaud App Export | Phone |
| 4 | Upload to SwanStudios via mobile upload UI | React Native / Web | SwanStudios App |
| 5 | File stored temporarily in upload buffer | Node.js /api/audio/upload | Backend |
| 6 | Background job picks up file (polling or webhook) | node-cron / Plaud Webhook | Backend |
| 7 | If audio: transcribe via AssemblyAI API | AssemblyAI (free 100hr/mo) | Cloud |
| 8 | Transcript parsed into structured JSON | OpenRouter → Llama 4 Maverick (free) | Cloud |
| 9 | WorkoutSession + WorkoutExercise records created | Sequelize / PostgreSQL | Database |
| 10 | XP awarded, gamification updated | Existing Gamification Engine | Database |
| 11 | Client notified via SMS + email (if enabled) | Twilio + SendGrid | Cloud |
| 12 | Client sees session in dashboard in real time | React / Victory Charts | Browser |

---

## Backend File Structure — New Files to Create

| File Path | Type | Purpose |
|-----------|------|---------|
| `backend/routes/audioImportRoutes.mjs` | Route | Handles file upload + transcript text POST endpoints |
| `backend/services/transcriptParser.mjs` | Service | Calls OpenRouter to extract workout JSON from text |
| `backend/services/assemblyAI.mjs` | Service | Sends audio to AssemblyAI, polls for transcript result |
| `backend/services/workoutLogger.mjs` | Service | Creates WorkoutSession + WorkoutExercise DB records |
| `backend/services/sessionNotifier.mjs` | Service | Sends SMS (Twilio) + email (SendGrid) on session log |
| `backend/jobs/audioProcessor.mjs` | Cron Job | Polls upload buffer every 30s, processes pending files |
| `backend/models/AudioUpload.mjs` | Model | Tracks upload status: pending / processing / complete / error |
| `frontend/src/components/trainer/AudioUpload.jsx` | Component | Trainer-side file upload UI with client selector |
| `frontend/src/components/client/SessionRecap.jsx` | Component | Client-facing session recap view in dashboard |
| `frontend/src/pages/trainer/VoiceLog.jsx` | Page | Full trainer voice logging workflow page |

---

## Feature Build Plan — 4 Tiers

### Tier 1 — Core Workout Logging (Build First)

**Goal:** Sean records a session → data appears in client dashboard in under 60 seconds. Nothing else gets built until Tier 1 works perfectly.

| Feature | Purpose | Tech | Priority |
|---------|---------|------|----------|
| Audio/Text Upload Endpoint | Accept MP3 or TXT from Plaud export | Node.js multipart POST | P1 |
| Transcript Parser | Extract exercise/sets/reps/weight/tempo from text | OpenRouter Llama free | P1 |
| WorkoutSession Auto-Create | Populate DB from parsed JSON | Sequelize / PostgreSQL | P1 |
| Client Selector UI | Trainer picks client before upload | React dropdown | P1 |
| Processing Status UI | Show pending/processing/complete states | React state polling | P1 |
| XP Auto-Award | Award gamification points on session log | Existing XP engine | P2 |
| SMS Notification | Text client when session is logged | Twilio (existing) | P2 |
| Email Notification | Email client session recap | SendGrid (existing) | P2 |
| Notification Toggles | Client can turn SMS/email on or off | User settings table | P2 |
| AudioUpload DB Model | Track all uploads with status + error logs | Sequelize migration | P1 |

### Tier 2 — Intelligence Layer (Differentiator)

**Goal:** AI doesn't just parse — it understands. NASM protocol awareness, progress context, professional client recaps.

| Feature | Purpose | Tech | Priority |
|---------|---------|------|----------|
| Speaker Diarization | Identify trainer voice vs client voice | AssemblyAI free tier | P2 |
| NASM Protocol Flag | Flag pain mentions, form breaks, missed corrections | OpenRouter + custom prompt | P2 |
| Progress Context Injection | AI sees last 5 sessions before parsing new one | PostgreSQL query + prompt | P2 |
| Client Recap Generator | Branded "Your Session Today" email/SMS body | OpenRouter + template | P2 |
| Session Gap Detector | AI flags items discussed but not resolved | OpenRouter analysis | P3 |
| Exercise Library Match | Match spoken name to 840+ exercise DB entries | Fuzzy match service | P2 |
| Streak Integration | Connect session log to existing streak tracking | Existing streak engine | P2 |
| Progress Chart Update | Auto-update Victory charts on new session | Existing chart system | P2 |
| Trainer Notes Field | Free-text trainer observation stored per session | DB field addition | P2 |
| Session Quality Score | AI rates session intensity 1-10 for gamification | OpenRouter scoring | P3 |

### Tier 3 — Content Creation Engine (YouTube + Marketing)

**Goal:** One recording generates multiple pieces of content — YouTube description, Instagram caption, client testimonial, blog post. Zero desk work after filming.

| Feature | Purpose | Tech | Priority |
|---------|---------|------|----------|
| Video File Upload | Accept MP4/MOV, extract audio for transcription | FFmpeg + AssemblyAI | P3 |
| YouTube Content Generator | From transcript: description + chapters + timestamps | OpenRouter Gemini 2.5 | P3 |
| Social Caption Generator | Instagram/TikTok caption from session highlights | OpenRouter + template | P3 |
| Client Testimonial Formatter | Format client quotes as shareable social content | OpenRouter + brand template | P3 |
| Blog Post Generator | Long-form article version of any session/video | OpenRouter Gemini 2.5 | P3 |
| Mind Map Generator | Visual topic breakdown from any recording | React mindmap component | P3 |
| Content Library | Store all generated content in trainer dashboard | New DB table | P3 |
| Multi-Language Support | Accept recordings in 112 languages | AssemblyAI multilingual | P4 |

### Tier 4 — Global Trainer Platform (Scale)

**Goal:** Every trainer who joins SwanStudios gets this same pipeline. Their NotePin feeds their clients. SwanStudios becomes the infrastructure that powers thousands of trainers worldwide.

| Feature | Purpose | Tech | Priority |
|---------|---------|------|----------|
| Trainer Audio Namespace | Each trainer's uploads isolated by trainer ID | Route middleware | P4 |
| Per-Trainer Model Config | Each trainer sets their preferred AI parsing model | Trainer settings | P4 |
| Client Permission System | Clients consent to voice logging per trainer | Consent model + UI | P4 |
| Trainer Analytics Dashboard | Sessions logged, clients active, recap open rate | Admin dashboard tab | P4 |
| Plaud Webhook Integration | Auto-ingest when Plaud transcription completes | Plaud Developer API | P4 |
| OpenPlaud Self-Hosted Option | Bypass Plaud subscription using own API keys | OpenPlaud + Claude API | P4 |
| Group Class Logging | Log one session for multiple clients simultaneously | Batch session creator | P4 |
| Transaction Fee System | Trainer-client payments with SwanStudios ~10% fee | Stripe (existing) | P4 |

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/audio/upload | Trainer JWT | Upload MP3 or WAV file. Returns uploadId for polling. |
| POST | /api/audio/transcript | Trainer JWT | Submit raw transcript text directly (skip audio step). |
| GET | /api/audio/status/:uploadId | Trainer JWT | Poll processing status: pending/processing/complete/error |
| GET | /api/audio/result/:uploadId | Trainer JWT | Get parsed workout JSON after processing completes. |
| POST | /api/audio/confirm/:uploadId | Trainer JWT | Trainer confirms parsed data — triggers DB write + notifications. |
| GET | /api/sessions/client/:clientId | Trainer/Client JWT | Get all sessions for a specific client. |
| GET | /api/sessions/:sessionId/recap | Client JWT | Get formatted session recap for client view. |
| PUT | /api/sessions/:sessionId | Trainer JWT | Edit a session after AI parsing (corrections). |
| POST | /api/notifications/test | Trainer JWT | Send test SMS + email to verify notification setup. |
| PUT | /api/users/notification-prefs | Client JWT | Toggle SMS and email notifications on/off. |
| GET | /api/audio/history | Trainer JWT | List all past uploads with status and client attribution. |
| DELETE | /api/audio/:uploadId | Trainer JWT | Delete an upload and all associated temp files. |

---

## AI Parsing Prompt (Core Intelligence)

```
You are a NASM-certified personal training session parser for SwanStudios. Extract structured workout
data from this trainer voice note. Return ONLY valid JSON matching this schema: { "clientName": string,
"sessionDate": ISO date string or null, "trainerNotes": string, "flags":
["pain_mention"|"form_break"|"modification"], "exercises": [{ "name": string, "sets": number, "reps":
number, "weight": number, "weightUnit": "lbs"|"kg", "tempo": string or null, "nasmPhase": number or
null, "rpe": number or null, "notes": string }] }. If any field is unclear, use null. Never guess weight
or reps. Flag any mention of pain, discomfort, or form modification in the flags array.
```

---

## Database Schema

### New Table: AudioUploads

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Unique upload identifier |
| trainerId | UUID (FK → Users) | Trainer who submitted the upload |
| clientId | UUID (FK → Users) | Client the session is for |
| filePath | STRING | Temp storage path of audio/text file |
| fileType | ENUM mp3/wav/txt/json | Type of file uploaded |
| status | ENUM pending/processing/complete/error | Current processing state |
| rawTranscript | TEXT | Raw text from AssemblyAI or Plaud export |
| parsedJSON | JSONB | Structured workout data from AI parser |
| assemblyJobId | STRING (nullable) | AssemblyAI job ID for polling |
| workoutSessionId | UUID (FK → WorkoutSessions) | Created session ID after confirmation |
| errorMessage | TEXT (nullable) | Error details if processing failed |
| confirmedAt | TIMESTAMP (nullable) | When trainer confirmed the parsed data |
| createdAt | TIMESTAMP | Upload submission time |
| updatedAt | TIMESTAMP | Last status change time |

### Modified Table: WorkoutSessions — New Fields

| Field | Type | Purpose |
|-------|------|---------|
| sourceType | ENUM manual/voice/import | How session was created |
| audioUploadId | UUID (nullable FK) | Links back to originating AudioUpload |
| trainerNotes | TEXT | Free-text trainer observations from voice note |
| aiFlags | JSONB array | pain_mention / form_break / modification flags |
| clientRecapSent | BOOLEAN | Whether recap notification was sent |
| recapSentAt | TIMESTAMP | When recap was sent |

### Modified Table: Users — Notification Preferences

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| notifySessionSMS | BOOLEAN | TRUE | Receive SMS when session is logged |
| notifySessionEmail | BOOLEAN | TRUE | Receive email when session is logged |
| notifyProgressSMS | BOOLEAN | FALSE | Receive SMS for weekly progress summary |
| notifyProgressEmail | BOOLEAN | TRUE | Receive email for weekly progress summary |

---

## Technology Stack & Cost

| Service | Purpose | Free Tier | Paid Rate | Monthly Cost |
|---------|---------|-----------|-----------|-------------|
| AssemblyAI | Audio transcription + speaker diarization | 100 hrs/mo FREE | $0.37/hr | $0 (Phase 1-2) |
| OpenRouter | AI transcript parsing (Llama 4 Maverick) | FREE model | N/A | $0.00 |
| OpenRouter | Advanced parsing (Gemini 2.5 Pro) | Credits (existing) | $3.50/M tokens | ~$0.05/mo |
| Twilio | SMS notifications to clients | Trial credits | $0.0079/SMS | ~$0.25/mo (30 clients) |
| SendGrid | Email session recaps | 100 emails/day FREE | $19.95/mo paid | $0.00 (Phase 1-2) |
| Plaud NotePin | Recording hardware | One-time purchase | N/A | $101.76 (purchased) |
| Plaud App | Phase 1 transcription | 300 min/mo FREE | $17.99/mo Pro | $0.00 (Phase 1) |
| **TOTAL** | | | | **~$0.30/month** |

### Cost Scaling

| Client Load | Monthly Audio | AssemblyAI Cost | AI Parsing Cost | Total/Month |
|-------------|-------------|----------------|----------------|-------------|
| 4 clients/day (current) | ~180 min | $0 (free) | $0.05 | ~$0.30 |
| 8 clients/day (3 months) | ~360 min | $0 (free) | $0.10 | ~$0.60 |
| 20 clients/day (6 months) | ~900 min | $0 (free) | $0.25 | ~$1.50 |
| 50 trainers on platform | ~15,000 min | $55/mo | $3.00 | ~$60/mo |
| 200 trainers on platform | ~60,000 min | $185/mo | $12.00 | ~$200/mo |

---

## Environment Variables to Add

| Variable | Value / Source | Purpose |
|----------|--------------|---------|
| OPENROUTER_API_KEY | Already configured | AI transcript parsing |
| TRANSCRIPT_PARSER_MODEL | meta-llama/llama-4-maverick:free | Default free model |
| TRANSCRIPT_PARSER_MODEL_PREMIUM | google/gemini-2.5-pro | Premium model for complex sessions |
| ASSEMBLYAI_API_KEY | Get free key at assemblyai.com | Audio transcription + speaker ID |
| AUDIO_UPLOAD_DIR | ./uploads/audio | Temp storage for audio files |
| AUDIO_MAX_SIZE_MB | 50 | Max upload file size limit |
| SESSION_NOTIFY_DELAY_MS | 5000 | Delay before sending notification |

---

## Privacy, Security & Compliance

### Data Handling Rules
- **Never store raw audio permanently.** Delete MP3/WAV files immediately after transcription completes. Retain only text transcript and parsed JSON.
- **Transcripts are PHI-adjacent.** Client names + health observations (pain flags, modifications) = sensitive data. Store encrypted at rest.
- **OpenRouter ZDR.** Add `zdr: true` to all OpenRouter API calls. Forces routing only to zero-data-retention providers.
- **AssemblyAI data retention.** Set `delete_after_seconds: 300` — auto-deletes audio from their servers after 5 minutes.
- **Client consent.** Add "Voice session logging" checkbox to client onboarding flow. No sessions logged without explicit consent toggle ON.
- **Trainer agreement.** Add voice logging acknowledgment to trainer signup — confirms they have informed client consent before recording.

### Plaud Device Privacy Protocol
- Power OFF completely between client sessions (not sleep mode)
- Store in Faraday pouch in gym bag when not recording
- Never wear device during confidential non-session conversations
- Prompt logging must be OFF in OpenRouter account settings
- Do NOT enable the 1% discount for prompt logging in OpenRouter — it grants irrevocable commercial rights to your data
- Plaud app: do not enable cloud sync for client sessions — use local export only
- Phase 2: migrate to OpenPlaud self-hosted to eliminate Plaud cloud dependency entirely

---

## Sean's Daily Workflow

### Phase 1 (Starting Today)

| Step | Action | Time |
|------|--------|------|
| 1 | Arrive at gym. Put NotePin wristband on left wrist. | 5 sec |
| 2 | Client arrives. Say client name: "Starting session — Ronnie." | 3 sec |
| 3 | After each exercise: press, speak, press. "Barbell squat, 185 lbs, 4 sets of 8, tempo 2-0-2, NASM phase 2." | 10-15 sec |
| 4 | Repeat for each exercise. Average 6-8 clips per session. | ~90 sec total |
| 5 | Session ends. Open Plaud app. Tap to generate transcript. | 20 sec |
| 6 | Export transcript as TXT. | 10 sec |
| 7 | Open SwanStudios trainer dashboard on phone. Paste transcript into import field. | 30 sec |
| 8 | AI parses automatically. Review parsed exercises. Confirm. | 20 sec |
| 9 | Client receives SMS + email recap within 60 seconds of confirmation. | Automatic |
| **TOTAL** | **From last rep to client notification** | **< 3 minutes** |

### Phase 2 (After Build — Fully Automated)

Steps 5-8 become completely automatic. NotePin syncs via Plaud webhook, or trainer uploads audio directly from SwanStudios mobile app. Background job picks it up within 30 seconds, transcribes with AssemblyAI, parses with OpenRouter, creates session records, awards XP, and fires notifications — all without the trainer opening a second app. **Total trainer time after last rep: under 30 seconds.**

---

## Implementation Roadmap

| Week | Milestone | Outcome |
|------|-----------|---------|
| Week 1 | Phase 1 — Manual workflow. Buy NotePin, install Plaud app, record first session, export TXT, paste manually. | Validated workflow |
| Week 2-3 | Tier 1 Part A — Upload infrastructure. AudioUpload model + migration + POST endpoint. | Can upload files |
| Week 3-4 | Tier 1 Part B — Parser + DB writer. transcriptParser.mjs + workoutLogger.mjs. | Transcript → workout log |
| Week 4-5 | Tier 1 Part C — Notifications + UI. Twilio SMS, SendGrid email, client toggles, trainer upload UI. | Full end-to-end flow |
| Week 5-6 | Tier 1 Polish — Testing, edge cases, error states, manual override for corrections. | Production-ready |
| Month 2 | Tier 2 Part A — AssemblyAI integration, speaker diarization, NASM flags, progress context. | AI-powered insights |
| Month 2-3 | Tier 2 Part B — Branded recap generator, session quality scoring, Victory chart auto-update. | Premium client experience |
| Month 3+ | Tier 3 — YouTube/social generators, video upload, blog post output. | Marketing automation |
| Month 4+ | Tier 4 — Multi-trainer support, Plaud webhook, OpenPlaud self-hosted, group class logging. | Global trainer platform |

---

## Competitive Advantage

**No other personal training platform in the world has a voice-to-workout-log pipeline built natively into a health-first community ecosystem with gamification, progress tracking, NASM protocol awareness, and a global trainer marketplace. This is not a feature — it is a category.**

| Capability | Mindbody | Trainerize | Generic PT Apps | SwanStudios |
|-----------|----------|-----------|----------------|-------------|
| Voice → Workout Log | No | No | No | **Native** |
| NASM Protocol Parsing | No | No | No | **Built-in** |
| Speaker Diarization | No | No | No | **AssemblyAI** |
| Real-Time Client Notification | Manual | Manual | No | **Automatic** |
| Gamification + XP | No | No | Basic | **Full RPG system** |
| Community + Social | No | No | No | **Full ecosystem** |
| Content Creation Tools | No | No | No | **YouTube + social** |
| Global Trainer Marketplace | $129-349/mo | $19-99/mo | $10-30/mo | **~10% of sessions** |
| Client Data Ownership | Locked in | Locked in | No | **Client owns data** |

---

## Hermes + Telegram Integration (Unified Voice Pipeline)

### Two Voice Input Methods — One Pipeline

| Input Method | When To Use | How It Works |
|-------------|------------|-------------|
| **Plaud NotePin** | **DURING sessions** — phone stays in pocket/bag, looks professional. Wristband only. | Burst record per exercise → Bluetooth sync after session → forward to Hermes in Telegram |
| **Telegram Voice Messages** | **BETWEEN clients** — before/after sessions, walking to car, driving, at home, on break | Hold mic button in Telegram → speak → Hermes processes immediately |

**CRITICAL:** Phone NEVER comes out during active client training — that looks unprofessional. That's the entire reason for the Plaud NotePin wristband. Plaud records silently on your wrist. After the session ends and the client leaves, THEN you open Telegram to forward the recording or add post-session notes.

### During Active Training (Plaud Only — Phone Stays Away)

| Workflow | Voice Input | What Hermes Does (After Session) |
|----------|-----------|-----------------|
| **Exercise logging** | Plaud burst clips: press, speak "bench press 225x8 RPE 7", press off. Repeat per exercise. | After session: forward recording to Telegram → Hermes parses, logs workout, awards XP, sends client recap |
| **Mid-session observations** | Plaud: "Client showed left shoulder impingement on overhead press, switched to landmine press" | Saved to client profile + wiki for injury pattern knowledge |
| **Pain/form flags** | Plaud: "Right knee discomfort on deep squat, modified to box squat at parallel" | AI flags pain_mention + modification in the session record |
| **PR capture** | Plaud: "New PR — deadlift 315 for 3 reps, form was clean" | Awards 100 XP bonus, triggers badge check, included in client recap |

### After Session Ends / Between Clients (Telegram — Phone Is Fine Now)

| Workflow | Voice Input | What Hermes Does |
|----------|-----------|-----------------|
| **Forward Plaud recording** | Open Telegram, forward Plaud audio export to Hermes | Parses full session, logs all exercises, awards XP, sends SMS + email recap to client |
| **Post-session recap** | Walk to car, Telegram voice: "Great session with Client #47 today, energy was high, increase weight next week" | Adds trainer notes, generates branded recap email |
| **Batch notes** | After 4 morning clients: dictate all notes in one stream referencing each client ID | Routes each note to correct client profile |
| **Exercise substitution prep** | "Client #48 has knee issues, what are the best Phase 2 alternatives for squats and lunges for next session?" | Searches wiki + 840 exercise DB → ready for next session |
| **Quick client check** | "When's the last time Client #32 trained?" or "What's Client #47's 1RM on bench?" | Queries DB, responds instantly |

### Client Onboarding Voice Workflows (Plaud During Consult, Telegram After)

During the initial consultation/assessment with a new client, use Plaud to capture everything hands-free. After the client leaves, forward the recording to Hermes for processing.

| Workflow | When | Voice Input | What Hermes Does |
|----------|------|-----------|-----------------|
| **Full intake capture** | During consult (Plaud) | Speak client info as you discuss: "Age 52, golfer 3 handicap, rotator cuff repair 2019 right shoulder, goals: driving distance, lose 15 lbs..." | Parses into structured intake form → creates user profile → assigns trainer → generates waiver |
| **Health assessment** | During assessment (Plaud) | "Resting HR 72, BP 128/82, body fat 24%, weight 205, height 6'1, ACL repair left knee 2015" | Populates baseline measurements table |
| **Movement screening** | During assessment (Plaud) | "Overhead squat: knees cave, arms fall forward. Single-leg squat: left hip drop. Hurdle step: adequate." | Records movement analysis, flags corrective exercise needs |
| **Goal setting notes** | After consult (Telegram) | "Client #48 goals: primary golf performance 20 more yards. Secondary weight loss to 190. 4x/week, 3-month program at $8,400." | Creates SMART goals, links to package purchase |

### Between-Client Productivity (All Telegram — Phone Is Out, No Client Present)

| Workflow | Voice Input | What Hermes Does |
|----------|-----------|-----------------|
| **Client check-in** | "When's the last time Client #32 trained?" | Queries DB, responds instantly via Telegram |
| **Voice programming** | "Generate 4-week golf program for Client #48. Phase 1 stabilization. Rotational power, core, shoulder mobility. No deep lunges (ACL). 4x/week, 45 min." | Generates full program using wiki + 840 exercise DB |
| **Follow-up reminders** | "Remind me to follow up with Client #32 about missed session" | Creates task/reminder |
| **Quick calculations** | "What's Client #47's estimated 1RM based on 245x5 on bench?" | Calculates and responds (Epley formula: ~276 lbs) |
| **Next session prep** | "What should I focus on with Client #47 tomorrow based on last 3 sessions?" | Reviews recent sessions, suggests programming |

### Content Creation Voice Workflows

| Workflow | Voice Input | What Hermes Does |
|----------|-----------|-----------------|
| **Session-to-content** | Forward Plaud recording: "Generate a YouTube script about fixing overhead press form for golfers from this session" | Swan Content creates full video script |
| **Voice blog dictation** | 3-minute voice note on a training topic while driving home | Generates SEO-optimized blog post draft for approval |
| **Client testimonial** | Plaud captures client's quote after a PR | Formats as branded Instagram post + SwanStudios social feed post |
| **Content ideas** | "What are the top trending golf fitness topics this week?" | Swan Content queries Swan Oracle (SerpAPI) and responds |

### Nutrition Voice Workflows

| Workflow | Voice Input | What Hermes Does |
|----------|-----------|-----------------|
| **Voice meal logging** | "Client #47 lunch: grilled chicken 8oz, brown rice 1 cup, broccoli 2 cups, water 16oz" | Logs macros to client's nutrition dashboard |
| **Supplement check** | "Is creatine safe for Client #48 given kidney history?" | Checks wiki nutrition knowledge, flags concerns |
| **Meal plan request** | "Generate a 2000 cal meal plan for Client #47, high protein, no dairy" | Creates plan using wiki + nutrition ecosystem |

### Platform Management Voice Workflows

| Workflow | Voice Input | What Hermes Does |
|----------|-----------|-----------------|
| **Content moderation** | "Flag post from user #223 for review, looks like spam" | Flags in admin dashboard |
| **Marketing draft** | "Draft email about summer golf package, target Guardian subscribers, $8,400 3-month program, premium tone" | Swan Marketer drafts, sends for approval |
| **Analytics check** | "How many signups this week? Guardian to Crystalline conversion rate?" | Queries Stripe + DB, responds with stats |
| **Badge award** | "Award Client #47 the Iron Forge badge for 315 deadlift PR" | Triggers badge + XP + client notification |
| **Challenge creation** | "Create 30-day squat challenge, starts Monday, 100 bodyweight squats daily, 500 XP on completion" | Creates challenge in social platform |
