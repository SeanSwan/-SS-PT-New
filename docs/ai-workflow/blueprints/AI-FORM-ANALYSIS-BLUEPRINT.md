# AI Exercise Form Analysis - Implementation Blueprint

## Vision
A real-time and upload-based AI system that analyzes workout form from video/photos, detects muscular imbalances, compensatory patterns, and provides corrective feedback. Works standalone AND as a component within SwanStudios online virtual training.

---

## Part 1: Technology Stack Recommendations

### Pose Estimation (Core Engine)

| Tool | Type | Pros | Cons | Best For |
|------|------|------|------|----------|
| **MediaPipe Pose (Google)** | Client-side JS/Python | 33 landmarks, runs in-browser, free, fast (30fps on mobile), BlazePose architecture | Less accurate than server-side models for subtle joint angles | Real-time phone camera analysis |
| **MoveNet (TensorFlow)** | Client-side JS | Lightning/Thunder variants, 17 keypoints, very fast | Fewer landmarks than MediaPipe | Quick real-time feedback |
| **MMPose/RTMPose (OpenMMLab)** | Server-side Python | Configurable keypoints (17-133), SOTA benchmarks, RTMPose is fast on GPU | Server-only, needs GPU | Flexible server pipeline |
| **OpenPose (CMU)** | Server-side Python | 135 keypoints (body+hands+face), academic gold standard | Heavy GPU, **non-commercial license** (CMU), slow | Research only (license blocker) |
| **YOLOv8-Pose (Ultralytics)** | Server-side Python | Fast + accurate, 17 keypoints, easy to deploy | Fewer keypoints than OpenPose | Server-side batch processing |
| **ViTPose** | Server-side Python | State-of-art accuracy, transformer-based | Heavy compute, newer ecosystem | Research-grade accuracy |

### Recommended Hybrid Approach
```
Real-time (phone camera) --> MediaPipe Pose (client-side, 33 landmarks)
Upload analysis (video)  --> MediaPipe + MMPose/RTMPose (server-side, deeper analysis)
Advanced biomechanics    --> Custom angle/velocity calculations on landmark data
```

### Biomechanics Analysis Layer

| Library | Purpose |
|---------|---------|
| **Custom angle calculator** | Joint angles from landmark coordinates (knee flexion, hip hinge, shoulder rotation) |
| **scipy.signal** | Movement velocity, acceleration, jerk analysis from frame-to-frame landmark positions |
| **numpy** | Vector math for body segment alignment, center of gravity estimation |
| **OpenCV** | Video frame extraction, preprocessing, drawing overlays |

### Commercial APIs & Products (Buy vs Build Reference)

| Service | Type | Notes |
|---------|------|-------|
| **VAY Sports (vay.ai)** | SDK | 100+ exercises, real-time form feedback, rep counting, ROM analysis. Most comparable to what we'd build. Enterprise licensing |
| **Sency.ai** | SDK | Body assessment, exercise tracking, movement quality scoring. Mobile SDKs |
| **Formguru.fit API** | API | Exercise-specific form analysis, rep counting, pre-trained on gym exercises |
| **Kemtai** | Product | Browser-based real-time form analysis -- proof this works in production via browser |
| **Tempo** | Product | Pivoted from hardware to app-only (2024), using monocular pose estimation on phone |
| **Kaia Health** | Clinical | Digital therapeutics for MSK. CE-marked. Validates phone-camera approach for clinical use |
| **Formcheck.ai** | Product | Upload video, get annotated feedback. Likely MediaPipe under the hood |

**Decision: Build, not buy.** Commercial SDKs are enterprise-priced and lock you in. MediaPipe is free (Apache 2.0), runs on the client (zero marginal cost), and was literally trained on fitness/yoga poses. We build our own.

### LLM Feedback Engine (Personalized Coaching Layer)

**Why an LLM:** Instead of hardcoded strings like "Your knees are caving in", an LLM generates personalized, context-aware coaching: "Your left knee is tracking 12 degrees inward on reps 4-6, likely due to glute medius fatigue. Try banded clamshells as a warm-up next session."

**95% of the system runs with zero LLM cost.** The LLM is the cherry on top for natural language feedback.

#### LLM Comparison for This Use Case

| Feature | Claude (Anthropic) | Gemini (Google) | OpenAI |
|---------|-------------------|-----------------|--------|
| Reasoning quality | Best for nuanced biomechanics explanations | Strong, especially with structured data | Good but expensive |
| Vision/multimodal | Yes (can analyze images directly) | Yes (native, very strong) | Yes (GPT-4o) |
| Speed | Haiku is very fast + cheap | Flash is very fast + cheap | GPT-4o-mini is fast |
| Video understanding | No native video (frame-by-frame only) | **Native video input** -- can process raw video | No native video |
| Cost per analysis | Haiku: ~$0.001 | Flash: ~$0.001 | 4o-mini: ~$0.001 |
| Structured output | Excellent (tool use / JSON mode) | Good (JSON mode) | Good |
| API key available | Via Anthropic SDK | Yes (`GEMINI_API_KEY` in `.env`) | No |
| Project role | Claude = engineer | Gemini = design authority | Not in architecture |

#### Decision: Gemini Flash (primary) + Claude Haiku (premium deep analysis)

**Gemini Flash -- real-time/high-volume feedback:**
1. API key already configured in `.env`
2. Native video input -- can accept raw video as "second opinion" on form
3. Cheapest for high volume (every rep generates feedback)
4. Google made MediaPipe too -- ecosystem fits naturally
5. Fast enough for near-real-time feedback generation

**Claude Haiku -- optional "deep analysis" tier:**
1. Better at nuanced compensation chain reasoning (e.g., "ankle restriction causing knee valgus causing hip shift")
2. Better at generating trainer-quality corrective program recommendations
3. Use for detailed post-session reports, not per-rep feedback

**OpenAI -- skip entirely.** No advantage, no API key, adds vendor complexity.

#### How It Fits in the Architecture

```
Raw pose data (MediaPipe, free, local)
    |
    +--> Joint angles + compensations (our Python math, free)
    |
    +--> Real-time cues: Rule-based (free, no LLM needed)
    |        "Push knees out" / "Keep chest up"
    |
    +--> Post-set summary: Gemini Flash (~$0.001/analysis)
    |        Personalized natural language feedback
    |
    +--> Deep report: Claude Haiku (~$0.002/analysis) [optional premium]
             Corrective exercise program, muscle imbalance analysis
```

---

## Part 2: Exercise Analysis Features

### Core Analysis Capabilities

1. **Joint Angle Tracking**
   - Knee flexion/extension (squat depth, lunge angles)
   - Hip hinge angle (deadlift, RDL form)
   - Shoulder flexion/abduction (overhead press, lateral raises)
   - Spinal alignment (anterior pelvic tilt, thoracic kyphosis)
   - Ankle dorsiflexion (squat mobility indicator)

2. **Rep Detection & Counting**
   - Automatic rep counting via cyclic joint angle patterns
   - Rep quality scoring (0-100) per rep
   - Tempo analysis (eccentric vs concentric timing)
   - Range of motion percentage per rep

3. **Compensatory Pattern Detection**
   - Knee valgus (knees caving inward during squats)
   - Lateral shift (weight shifting to one side)
   - Anterior lean (excessive forward lean in squats)
   - Lumbar hyperextension (overarching during overhead movements)
   - Shoulder elevation (shrugging during presses)
   - Hip shift (asymmetric hip drop during single-leg work)

4. **Muscle Imbalance Indicators**
   - Left/right asymmetry scoring (comparing bilateral movement patterns)
   - Mobility restriction flags (e.g., limited ankle dorsiflexion causing heel rise)
   - Stability deficits (excessive sway, wobble quantification)
   - Strength imbalance inference (compensation patterns mapped to weak muscle groups)

5. **Posture Assessment (Static)**
   - Anterior/posterior head position
   - Shoulder height asymmetry
   - Pelvic tilt classification
   - Knee hyperextension
   - Foot arch assessment (from front/side view)

6. **Assessment Protocols (NASM-Aligned)**
   - Overhead Squat Assessment (feet turning out, knees caving, forward lean, arms falling)
   - Single-Leg Squat (hip drop, knee valgus, trunk lean)
   - Active Straight Leg Raise (hamstring flexibility)
   - Shoulder Mobility Screen (bilateral overhead reach comparison)

### What is NOT Reliably Detectable (Honest Limits)
- Internal vs external rotation (hard from single camera angle)
- Deep muscle activation patterns (would need EMG)
- Pain-related compensation (subtle, highly individual)
- Joint stability / ligament laxity
- Exact muscle tightness vs weakness distinction (compensation looks similar externally)
- These limits are why the system recommends trainer review, not replaces trainers

### Exercise Library (Phase 1 - 15 exercises)
- Squat (bodyweight, goblet, barbell back/front)
- Deadlift (conventional, sumo, RDL)
- Lunge (forward, reverse, walking)
- Push-up
- Overhead press
- Plank (front, side)
- Hip hinge pattern
- Row (bent-over)

---

## Part 3: Architecture

### System Overview
```
+------------------+     +-------------------+     +------------------+
|   Mobile/Web     |     |   SwanStudios     |     |   AI Analysis    |
|   Camera Feed    |---->|   Backend API     |---->|   Service        |
|   (MediaPipe)    |     |   (Express)       |     |   (Python/Fast)  |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
   Real-time                 Upload path              Deep analysis
   client-side               video/photo              server-side
   feedback                  storage (R2)             processing
        |                        |                        |
        v                        v                        v
+------------------+     +-------------------+     +------------------+
|   Instant        |     |   Analysis        |     |   Report +       |
|   Overlay +      |     |   Queue +         |     |   Recommendations|
|   Score          |     |   Results DB      |     |   + History      |
+------------------+     +-------------------+     +------------------+
```

### Multi-Device Support (Phone + Tablet + Desktop)

MediaPipe runs via WebAssembly + WebGL in any modern browser -- same code works on all devices.

| Device | Camera Use | Layout | Notes |
|--------|-----------|--------|-------|
| **Phone** (320-430px) | Rear camera for self-recording, front for selfie-view | Single column: video on top, feedback below | Primary use case for clients filming themselves |
| **Tablet** (768-1024px) | Front camera propped up during workout | Side-by-side: video left, feedback right | Ideal for real-time analysis -- prop tablet and work out in front of it |
| **Desktop** (1024px+) | Webcam or uploaded video | Split panel: video + skeleton left, detailed metrics + history right | Best for trainers reviewing client videos, annotation tools |
| **Trainer desktop** | Views client's stream | Multi-panel: client feed with overlay + workout plan + chat | During live virtual sessions |

Key responsive behaviors:
- Canvas overlay scales with video element (percentage-based landmark coordinates)
- Feedback panel collapses to bottom sheet on mobile, side panel on tablet/desktop
- Upload drag-and-drop on desktop, file picker + camera capture on mobile
- Annotation tools (draw-on-frame) optimized for touch on tablet, mouse on desktop
- 10-breakpoint matrix already in place (320/375/430/768/1024/1280/1440/1920/2560/3840)

### Component Architecture

#### A. Real-Time Analysis (Client-Side)
```
React Component: <FormAnalyzer />
  |-- useMediaPipe() hook (loads BlazePose model)
  |-- useCamera() hook (getUserMedia, front/rear camera toggle)
  |-- useBiomechanics() hook (angle calculations, pattern detection)
  |-- useResponsiveLayout() hook (device detection, layout variant)
  |-- <VideoOverlay /> (draws skeleton + angle annotations, scales to any viewport)
  |-- <FeedbackPanel /> (real-time cues -- bottom sheet on mobile, side panel on desktop)
  |-- <RepCounter /> (automatic rep detection + quality score)
  |-- <CameraToggle /> (front/rear switch on mobile/tablet)
```

#### B. Upload Analysis (Server-Side)
```
POST /api/form-analysis/upload
  |-- multer (video/image upload to R2)
  |-- Queue job (Bull/BullMQ with Redis)
  |-- Python worker:
      |-- Extract frames (OpenCV)
      |-- Run MediaPipe/YOLOv8-Pose per frame
      |-- Calculate joint angles across all frames
      |-- Detect compensatory patterns
      |-- Generate report JSON
  |-- Store results in FormAnalysis table
  |-- Notify user (WebSocket/push)

GET /api/form-analysis/:id
  |-- Return full analysis report
  |-- Joint angle graphs over time
  |-- Flagged frames with annotations
  |-- Corrective exercise recommendations
```

#### C. Virtual Training Integration
```
During live virtual training session:
  |-- Trainer sees client's camera feed + AI overlay
  |-- Real-time form scores visible to both
  |-- Trainer can pause, annotate, and save snapshots
  |-- Session recording with AI analysis baked in
  |-- Post-session report auto-generated
```

### Database Schema (New Tables)

```sql
-- Form analysis results
CREATE TABLE "FormAnalyses" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "Users"(id),
  "sessionId" UUID REFERENCES "TrainingSessions"(id) NULL,
  "exerciseName" VARCHAR(100) NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "mediaType" VARCHAR(10) NOT NULL, -- 'video' | 'image'
  "analysisStatus" VARCHAR(20) DEFAULT 'pending', -- pending | processing | complete | failed
  "overallScore" INTEGER, -- 0-100
  "repCount" INTEGER,
  "findings" JSONB, -- detailed analysis results
  "recommendations" JSONB, -- corrective exercises
  "landmarkData" JSONB, -- raw pose data (compressed)
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

-- User movement profile (aggregated over time)
CREATE TABLE "MovementProfiles" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE REFERENCES "Users"(id),
  "mobilityScores" JSONB, -- per-joint mobility ratings
  "strengthBalance" JSONB, -- left/right imbalance data
  "commonCompensations" JSONB, -- frequently detected patterns
  "improvementTrend" JSONB, -- scores over time
  "lastAssessmentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);
```

### Findings JSONB Structure
```json
{
  "jointAngles": {
    "kneeFlexionMax": 95,
    "hipHingeMin": 72,
    "ankledDorsiflexion": 28
  },
  "compensations": [
    {
      "type": "knee_valgus",
      "severity": "moderate",
      "frames": [45, 46, 47, 62, 63],
      "side": "left",
      "likelyWeakMuscle": "gluteus medius",
      "likelyTightMuscle": "adductors"
    }
  ],
  "repScores": [85, 82, 78, 71, 68],
  "fatigueDetected": true,
  "fatigueOnsetRep": 4,
  "symmetryScore": 0.82,
  "rangeOfMotionPercent": 88
}
```

---

## Part 4: Online Virtual Training Platform Features

### Must-Have Features for Flawless Virtual Training

#### Session Management
- [ ] 1-on-1 video call (WebRTC via Daily.co or Twilio)
- [ ] Group training sessions (up to 10 clients)
- [ ] Screen sharing (trainer shares exercise demos)
- [ ] Session scheduling with calendar integration
- [ ] Automated reminders (email + push)
- [ ] Session recording with playback
- [ ] Trainer notes per session (saved to client profile)

#### Real-Time Training Tools
- [ ] AI form overlay visible to both trainer and client
- [ ] Timer/stopwatch (intervals, AMRAP, EMOM)
- [ ] Exercise demo library (trainer queues up demos)
- [ ] Live rep counter with form score
- [ ] Whiteboard/annotation on client's video feed
- [ ] Heart rate integration (Apple Watch, Fitbit API)
- [ ] Music sync (trainer controls workout playlist)

#### Client Progress & Programs
- [ ] Workout program builder (drag-and-drop)
- [ ] Exercise library with video demos
- [ ] Progress photos with AI posture comparison over time
- [ ] Body measurements tracking
- [ ] Strength progression charts
- [ ] Movement assessment history (from FormAnalysis)
- [ ] Nutrition logging integration
- [ ] Goal setting and milestone tracking

#### Business & Scheduling
- [ ] Online booking with payment (Stripe, already integrated)
- [ ] Package management (sessions, subscriptions)
- [ ] Automated billing and invoicing
- [ ] Client onboarding questionnaire (PAR-Q, goals, injury history)
- [ ] Trainer availability calendar
- [ ] Waitlist management
- [ ] Cancellation/reschedule policies

#### Communication
- [ ] In-app messaging (already have social platform)
- [ ] Form check submissions (client uploads video, trainer reviews async)
- [ ] Push notifications for session reminders
- [ ] Automated check-in messages between sessions
- [ ] Post-session summary emails

---

## Part 4B: Competitive Landscape & Market Gap

### What Competitors Offer (and Don't)

| Platform | Type | Price | Live Video | AI Form | All-in-One |
|----------|------|-------|------------|---------|------------|
| **Trainerize** | B2B SaaS | $5-350/mo | No (Zoom link) | No | Partial (no video) |
| **TrueCoach** | B2B SaaS | $19-89/mo | No | No | No (no nutrition/scheduling) |
| **PT Distinction** | B2B SaaS | $20-55/mo | No | No | Yes but dated UI |
| **Everfit** | B2B SaaS | Free-199/mo | No | No | Partial |
| **Caliber** | B2C | $200-400/mo | No | No (manual review) | Yes |
| **Future** | B2C | $149/mo | No (async only) | No | Apple-only |
| **Tempo** | Hardware | $395+$39/mo | On-demand classes | Yes (depth camera) | Hardware-locked |

### The Gap SwanStudios Fills

**No existing platform combines all four:**
1. Integrated live video (no Zoom dependency)
2. AI-powered form analysis from any phone camera
3. Premium UX (not the dated interfaces of PT Distinction)
4. All-in-one (workouts + nutrition + video + payments + social + scheduling)

**What trainers hate about current tools:**
- Juggling 3+ apps (Zoom + workout platform + payment tool)
- No annotation/drawing tools on form check videos
- Manual review of every client video (time sink with 20+ clients)
- Bloated UIs and constant upsells (Trainerize post-acquisition)

**What clients hate:**
- Having to use multiple apps
- Too many taps to log a set
- No real-time feedback when training alone
- Generic exercise videos that don't match their equipment

### SwanStudios Differentiators
- **AI form analysis from phone camera** -- only Tempo does this, and they require $395 hardware
- **Video annotation tools** (telestrator/draw-on-frame) -- exists in sports coaching (Hudl, Dartfish) but zero PT platforms have it
- **Built-in WebRTC video** with AI skeleton overlay visible to both trainer and client
- **Galaxy-Swan premium aesthetic** vs the dated UIs in the market
- **Social platform + gamification already built** -- no competitor has a community feed with XP/challenges integrated into training

---

## Part 5: Phased Build Plan

### Phase 0: Foundation (Week 1) -- COMPLETE
**Goal:** Python analysis service scaffold + basic pose estimation

- [x] Set up Python FastAPI microservice (`services/form-analysis/`)
- [x] Install MediaPipe, OpenCV, numpy
- [x] Create endpoint: `POST /analyze-image` -- accepts image, returns 33 landmarks + basic angles
- [x] Create endpoint: `POST /analyze-video` -- accepts video, returns per-frame landmarks
- [x] Basic joint angle calculator (knee, hip, shoulder, ankle, elbow, trunk lean, bilateral diffs)
- [x] Docker container for the Python service
- [x] Health endpoints: `GET /health`, `GET /ready`
- [x] CORS, file validation (MIME whitelist, 100MB max), SIGTERM handling
- **Verified:** Service starts, model loads, health returns OK, file validation rejects bad types

### Phase 1: Core Analysis Engine + Gemini Feedback (Week 2-3)
**Goal:** Compensatory pattern detection, exercise rules, and LLM-powered feedback

- Build exercise rule engine:
  - Squat rules (depth, knee valgus, forward lean, heel rise)
  - Deadlift rules (back rounding, hip hinge angle, bar path)
  - Push-up rules (elbow flare, hip sag, head position)
- Rep detection algorithm (cyclic angle pattern detection)
- Overall form score calculation (weighted rule violations)
- Fatigue detection (score degradation across reps)
- Generate structured findings JSON
- Corrective exercise recommendation engine (pattern -> muscle -> exercise mapping)
- **Gemini Flash integration:**
  - Post-set personalized feedback generation from findings JSON
  - Prompt: system = "NASM-certified biomechanics coach", user = structured findings data
  - Returns natural language summary with specific angle data + corrective cues
  - Endpoint: `POST /generate-feedback` (accepts findings JSON, returns coaching text)
  - Cost: ~$0.001 per analysis call
- **Test:** Upload squat video, get rep count + per-rep scores + flagged compensations + Gemini-generated coaching feedback

### Phase 2: SwanStudios Backend Integration (Week 3-4)
**Goal:** API routes, database, upload flow

- Create FormAnalysis + MovementProfile Sequelize models and migrations
- Express routes: `POST /api/form-analysis/upload`, `GET /api/form-analysis/:id`, `GET /api/form-analysis/history`
- BullMQ job queue for async video processing (requires Redis -- Upstash or Render Redis)
- R2 storage for uploaded videos/images
- Webhook from Python service back to Express on completion
- MovementProfile aggregation (update after each analysis)
- Authorization middleware: ownership check (user or their trainer)
- Database indexes on userId + analysisStatus
- Pagination on history endpoint (?page=1&limit=20)
- **Test:** Full upload -> queue -> process -> results flow

### Phase 3: Real-Time Client-Side Analysis (Week 4-5)
**Goal:** Live camera form analysis in the browser (Gemini design directives)

- React `<FormAnalyzer />` component with ErrorBoundary (fallback to upload-only)
- MediaPipe WASM/WebGL integration via `@mediapipe/tasks-vision`
- `useMediaPipe()` hook -- model loading, frame processing
- `useBiomechanics()` hook -- angle calculations from landmarks (throttled to 10fps)
- `useCamera()` hook -- getUserMedia, front/rear toggle, permission error handling
- `<VideoOverlay />` -- custom neon-wireframe HUD (Gemini Directive 1: cyan/purple/red dynamic colors, shadowBlur, vignette)
- `<FeedbackPanel />` -- AnimatePresence slide-up cues with 3s auto-dismiss
- `<RepCounter />` -- glassmorphic pulsing HUD with Framer Motion spring (Gemini Directive 2)
- `<BottomActionBar />` -- mobile thumb-zone pill controls (Gemini Directive 4)
- `<DeepScanLoader />` -- scanning laser + rotating status text for upload wait (Gemini Directive 3)
- Exercise selector as bottom sheet on mobile
- Constants file: FORM_SCORE_THRESHOLDS, getScoreColor(score, theme)
- **Test:** Open on phone, do squats, see real-time neon skeleton + form cues

### Phase 4: Standalone App + Integration (Week 5-6)
**Goal:** Standalone form check page + embed in training platform

- Standalone route: `/form-analysis` (accessible to all users)
  - Upload tab (photo/video upload with drag-and-drop on desktop, file picker on mobile)
  - Live tab (camera-based real-time analysis)
  - History tab (past analyses with trend charts)
- Dashboard widget showing latest form score + improvement trend
- Virtual training integration:
  - During live session, trainer can enable AI overlay on client feed
  - Form scores stream to trainer's view
  - Snapshot + annotate feature (telestrator draw-on-frame)
- Async form review flow:
  - Client uploads video -> AI pre-analyzes -> trainer gets notification badge
  - Trainer sees skeleton overlay + score pre-computed, scrubs to problem frame
  - Trainer annotates + voice note -> sends to client (30s instead of 3-5min)
- **Test:** End-to-end standalone flow + trainer-views-client-analysis flow

### Phase 5: Movement Profile & Intelligence (Week 6-7)
**Goal:** Long-term tracking, smart recommendations, LLM deep analysis

- MovementProfile dashboard page
  - Mobility radar chart (per-joint scores)
  - Left/right balance visualization
  - Common compensations summary
  - Improvement timeline
- Smart workout recommendations based on detected weaknesses
- Progress comparison (overlay old vs new form side-by-side -- "Form Journey")
- Trainer report generation (PDF export for client)
- **Claude Haiku deep analysis integration (premium tier):**
  - Compensation chain reasoning: "ankle restriction -> knee valgus -> hip shift -> lower back strain"
  - Generates trainer-quality corrective exercise programs from MovementProfile history
  - Detailed post-session reports with progressive overload adjustments
  - Endpoint: `POST /generate-deep-report` (accepts full MovementProfile + latest findings)
  - Cost: ~$0.002 per deep report
- **Gemini native video "second opinion":**
  - Send raw video to Gemini for holistic form review beyond landmark data
  - Catches things MediaPipe misses (grip width, breathing patterns, facial strain indicators)
  - Optional supplementary analysis, not a dependency
- **Test:** Multiple analyses over time show trend data in profile + LLM-generated corrective program

### Phase 6: Custom Exercise Builder -- "The Biomechanics Studio" (Week 8-9)
**Goal:** Allow trainers to add new exercises to the library without writing code

**AI Village Research:** Gemini 3.1 Pro (Lead Design Authority) designed the full UX spec.
See: `AI-Village-Documentation/gemini-consults/latest.md`
See: `backend/services/form-analysis/EXERCISE-LIBRARY.md` (full exercise library + custom exercise plan)

**Built-in Library (Phase 1 -- COMPLETE):**
- 81 unique exercises across 14 NASM categories
- 150+ aliases for flexible input
- Full NASM CES/PES + Squat University standards

**Custom Exercise System (Phase 6):**

- [ ] **6a: Database** -- CustomExercises Sequelize model + migration (PostgreSQL + JSONB)
  - Append-only versioning (never update, always insert new version)
  - Links to trainer, base template, analysis history
  - `mechanics_schema` JSONB column for flexible rule definitions

- [ ] **6b: DynamicRuleEngine** -- Python class that hydrates from JSONB schema
  - Supports angle_threshold and landmark_deviation rule types
  - Plugs into existing analysis pipeline seamlessly
  - Falls back to built-in registry first, then checks custom_exercises table

- [ ] **6c: REST API** -- CRUD endpoints for custom exercises
  - `POST /custom-exercises` (create)
  - `GET /custom-exercises` (list by trainer)
  - `PUT /custom-exercises/:id` (creates new version)
  - `POST /custom-exercises/:id/duplicate` (template system)
  - `POST /custom-exercises/:id/test` (sandbox validation)

- [ ] **6d: Biomechanics Studio Frontend** -- Split-pane workspace (React + styled-components)
  - Left pane: 4-step vertical accordion wizard (Metadata, Rep Mechanics, Form Rules, Review)
  - Right pane: Persistent video/webcam with live MediaPipe skeleton overlay
  - Block-based rule builder with NASM Kinetic Chain Checkpoints
  - GlassRuleBlock, ThresholdSlider, InteractiveBodyMap components
  - Galaxy-Swan theme tokens (no MUI)

- [ ] **6e: Live MediaPipe Sandbox** -- Real-time threshold visualization
  - Trainer uploads 5-sec reference video or uses webcam
  - MediaPipe runs client-side, Swan Cyan skeleton overlay
  - Angle arcs update in real-time as thresholds are adjusted
  - Rule triggers flash Cosmic Purple

- [ ] **6f: Template System** -- Duplicate + modify any built-in exercise
  - Select from 81 exercises, click "Create Variation"
  - Pre-populates all rules, trainer adjusts thresholds/adds rules
  - Saves as new custom exercise (e.g., "Pause Squat", "Tempo Squat")

- [ ] **6g: Validation Gate** -- Exercise cannot be published until tested
  - Rep-counter must fire at least once in sandbox
  - At least one form rule must trigger
  - Prevents broken custom exercises from entering production

- [ ] **6h: Multi-Device Responsive**
  - Desktop (1024px+): Full split-pane Biomechanics Studio
  - Tablet (768-1023px): Left pane full-width + floating PiP video
  - Mobile (320-767px): Read-only / Quick Tweak mode only (no creation from scratch)

- **Test:** Trainer creates "Tempo Back Squat" from squat template, tests in sandbox, publishes, client analyzes video using it

### Phase 7: Equipment Profile Manager (Week 10-11)
**Goal:** Location-based equipment inventories with AI photo recognition
**Design Authority:** Gemini 3.1 Pro (see `AI-Village-Documentation/gemini-consults/latest.md`)
**AI Village:** 8/8 PASS (see `docs/ai-workflow/blueprints/EQUIPMENT-VARIATION-ENGINE-DESIGN.md`)

**Default Profiles (Built-in, cannot delete):**
1. **Move Fitness** -- Sean's primary gym (full commercial equipment)
2. **Park / Outdoor** -- Minimal/no equipment (bodyweight-focused by default)
3. **Home Gym** -- Basic home setup (dumbbells, bands, bench, pull-up bar)
4. **Client Home** -- Varies per client (assessed on first visit)
5. Custom profiles: trainers create unlimited (e.g., "John's Home Gym", "Hotel Gym")

**Equipment Photo Upload + AI Recognition:**
- Trainer photographs equipment at location
- Gemini Flash Vision API identifies: name, category, exercises it supports, bounding box
- Trainer approves/edits/rejects AI suggestion
- Approved label becomes canonical name
- Equipment auto-mapped to exercises it can be used for

- [ ] **7a: Database** -- Sequelize models + migrations
  - `equipment_profiles` (location inventories with default/custom profiles)
  - `equipment_items` (individual pieces with AI scan data, approval status)
  - `equipment_exercise_map` (what exercises each piece supports)
  - Soft-delete for profiles (`is_active` flag)
  - UNIQUE constraint on `(profile_id, name)` to prevent duplicates
  - Input validation on AI bounding box coordinates (0-1 range)

- [ ] **7b: Seed Default Profiles** -- Move Fitness, Park, Home Gym, Client Home
  - Park profile pre-populated with bodyweight exercises
  - Home Gym pre-populated with common home equipment

- [ ] **7c: Gemini Flash Vision Integration** -- AI equipment scanning
  - `POST /api/equipment-profiles/:id/scan` endpoint
  - Rate limiting: 10 scans/hour per trainer (AI Village security finding)
  - JSON schema validation on AI responses (Zod)
  - Fallback error handling (AI unavailable / invalid image / analysis failed)
  - Cost: ~$0.001 per scan

- [ ] **7d: REST API** -- Full CRUD with RBAC
  - All endpoints require JWT authentication
  - Role-based: trainers own their profiles, admins see all
  - Parameterized queries via Sequelize (SQL injection prevention)
  - Pagination on equipment list endpoints (AI Village finding)
  - UUID validation on all path/query parameters

- [ ] **7e: Admin Dashboard Widget** -- "Equipment Intelligence"
  - Pending approvals count with pulsing badge
  - Per-profile equipment counts
  - Recent activity feed (scans, approvals, form analyses, video uploads)
  - Quick-action buttons for pending approvals

- [ ] **7f: Mobile-First Camera UI** -- Custom viewfinder
  - 56px FAB button (Swan Cyan gradient)
  - Custom camera overlay with framing guide reticle
  - "Cosmic Scanning" animation (cyan line sweep, 1.5s)
  - Haptic feedback on capture and approval (`navigator.vibrate()`)

- [ ] **7g: Equipment Approval Flow** -- Glassmorphic bottom sheet
  - AI bounding box overlay on photo (Swan Cyan #00FFFF)
  - Pre-filled equipment name + category (editable)
  - Trainer label field (custom name if different from AI suggestion)
  - Description of what it does (AI pre-fills, trainer edits)
  - "Edit" (ghost) + "Confirm" (gradient) buttons (48px min height)

- [ ] **7h: Equipment-to-Exercise Auto-Mapping**
  - AI suggests exercises per equipment, trainer confirms
  - Maps to 81-exercise registry + custom exercises
  - Resistance type tagging (bodyweight, dumbbell, barbell, cable, band, machine)

- **AI Village Security Fixes (incorporated):**
  - Rate limiting on AI scan endpoint
  - JSON schema validation on all AI responses
  - RBAC on all admin/approval endpoints
  - File upload validation (jpg/png/webp only, 10MB max)
  - Soft-delete instead of hard delete for profiles
  - No PII in error messages/logs

- **Test:** Sean photographs 5 pieces of equipment at Move Fitness, AI identifies them, he approves/edits names, exercises auto-map, Park profile works with bodyweight only

### Phase 8: Workout Variation Engine -- NASM-Aligned Periodization (Week 12-13)
**Goal:** Smart exercise rotation that keeps workouts fresh while maintaining progressive overload
**Design Authority:** Gemini 3.1 Pro
**AI Village:** 8/8 PASS
**Training Philosophy:** Sean Swan's 20+ years experience

**The 2-Week Rotation Principle:**
```
Pattern: BUILD -> BUILD -> SWITCH -> BUILD -> BUILD -> SWITCH...

BUILD workouts: Same exercises (progressive overload, strength building)
SWITCH workouts: Different exercises targeting SAME muscles (shock the system, keep interest)
```

**NASM Priority Protocol:**
1. NASM CES is PRIMARY authority for exercise selection
2. Squat University is secondary reference
3. SWITCH exercises must target same muscle groups
4. Corrective continuum stays consistent even when exercises rotate
5. If client has compensations, ALL variations must still address them
6. Equipment-aware: only suggest what's available at training location

- [ ] **8a: Database** -- Sequelize models + migrations
  - `workout_templates` (planned workout with body parts, NASM phase)
  - `workout_exercises` (individual exercises with sets/reps/tempo, BUILD flag)
  - `workout_variation_log` (tracks rotation: BUILD vs SWITCH per session)
  - `exercise_muscle_map` (which muscles each of 81 exercises targets)
  - Optimistic locking on suggestions (5-min expiry, AI Village finding)

- [ ] **8b: Seed Exercise-Muscle Mapping** -- All 81 exercises
  - Primary/secondary/stabilizer roles per NASM taxonomy
  - Covers: quads, hamstrings, glutes (max/med), adductors, hip flexors, calves,
    pecs, delts (ant/lat/post), lats, traps, rhomboids, serratus anterior,
    biceps, triceps, rotator cuff, rectus abdominis, TVA, obliques, erector spinae

- [ ] **8c: Variation Engine Core Logic**
  - Input: original exercise, client's location profile, compensations, history
  - Step 1: Find exercises targeting same muscles
  - Step 2: Filter by equipment available at location
  - Step 3: Exclude exercises conflicting with client's compensations
  - Step 4: Exclude recently used (last 2 sessions)
  - Step 5: Match NASM progression level
  - Step 6: Rank by novelty + muscle match quality
  - Return with NASM confidence badge

- [ ] **8d: REST API** -- Variation endpoints
  - `POST /api/variation/suggest` (generate SWITCH workout)
  - `POST /api/variation/accept` (confirm and log)
  - `GET /api/variation/history` (rotation log for client)
  - `GET /api/variation/timeline` (2-week visual data)
  - Response contract: `{ suggested_swaps: [{ exercise_name, nasm_phase, nasm_confidence }] }`

- [ ] **8e: 2-Week Rotation Timeline Component**
  - 3-node horizontal timeline: BUILD (purple) -> BUILD (purple) -> SWITCH (cyan glow)
  - Current position highlighted with pulse animation
  - Shows where client is in their microcycle

- [ ] **8f: SwapCard + NASM Confidence Badge**
  - Side-by-side on desktop (>768px), stacked on mobile
  - Original exercise (muted 0.6 opacity) -> Suggested exercise (cyan border glow)
  - NASM pill badge: "Matches: Pectoral / Phase 2"
  - Framer Motion cross-fade animation on swap

- [ ] **8g: Equipment Profile Integration**
  - Variation suggestions filtered by client's training location
  - Park profile -> bodyweight/calisthenics heavy
  - Move Fitness -> full range of equipment options
  - Client Home -> depends on their equipment profile

- [ ] **8h: Form Analysis Feedback Loop**
  - Compensation data from form analysis feeds into variation engine
  - Requires trainer approval before auto-updating (AI Village finding)
  - Audit trail for compensation-driven exercise changes

- [ ] **8i: Configurable Rotation Patterns**
  - Standard: 2:1 (BUILD-BUILD-SWITCH) -- default
  - Aggressive: 1:1 (BUILD-SWITCH-BUILD-SWITCH)
  - Conservative: 3:1 (BUILD-BUILD-BUILD-SWITCH)
  - Trainer selects per client/template

- **AI Village Competitive Intel (incorporated):**
  - NASM-aligned clinical logic is a key differentiator vs Trainerize/TrueCoach
  - AI Vision for equipment is a "wow" factor (competitors require manual entry)
  - Consider: NASM certification partnership for "SwanStudios powered by NASM" CEUs
  - Consider: Free "Gym Audit" lead magnet (AI scans home gym, suggests setup)

- **Test:** Sean creates "Chest Day" template for client at Move Fitness. After 2 BUILD sessions, system auto-generates SWITCH workout using different chest exercises available at the gym. Client's knee valgus compensation is still addressed in all variations. When client trains at Park, suggestions shift to bodyweight alternatives.

---

## Part 6: Minimal-Clicks UX Flow

### For Clients (Standalone Form Check)
```
1. Tap "Check My Form" button (homepage or dashboard)
2. Choose: [Camera] or [Upload]
3. If Camera: Select exercise from dropdown -> Start -> Do reps -> Stop
4. If Upload: Drop video/photo -> Select exercise -> Analyze
5. See results: Score, rep breakdown, flagged issues, corrective exercises
Total: 3-4 taps from dashboard to results
```

### For Trainers (During Virtual Session)
```
1. Start virtual training session (already in call)
2. Tap "AI Form Check" toggle in trainer toolbar
3. Client's feed shows skeleton overlay + live scores
4. Tap any rep to see detailed breakdown
5. Tap "Save Snapshot" to annotate and save to client profile
Total: 2 taps to enable, 1 tap per interaction
```

### For Async Form Reviews (Biggest Market Gap)
```
1. Client: Tap "Submit Form Check" -> record or upload -> send to trainer
2. Trainer: Gets notification badge ("3 new form videos")
3. Trainer: Taps video -- auto-plays with AI skeleton overlay + form score pre-computed
4. Trainer: Scrubs to problem frame, taps "Annotate" -- draws line showing correct angle
5. Trainer: Records 15-sec voice note: "Drive your hips back more at the bottom"
6. Trainer: Taps "Send" -- client gets annotated video + voice note
Total: 30 seconds per review instead of 3-5 minutes (current industry standard)
```

### Form Journey (Progress Over Time)
```
1. Client opens "Form Journey" for a specific exercise (e.g., squat)
2. Side-by-side video: Week 1 vs Week 8 with skeleton overlays on both
3. Score graph showing improvement over time
4. Specific metrics: "Knee valgus: severe -> minimal", "Squat depth: 72deg -> 95deg"
Total: 1 tap to see progress
```

---

## Part 7: File Structure

```
backend/
  services/form-analysis/         # Python FastAPI microservice
    main.py                       # FastAPI app
    analyzers/
      pose_estimator.py           # MediaPipe/YOLOv8 pose detection
      angle_calculator.py         # Joint angle math
      pattern_detector.py         # Compensatory pattern rules
      rep_counter.py              # Rep detection algorithm
      exercise_rules/
        squat.py
        deadlift.py
        pushup.py
        overhead_press.py
        lunge.py
        plank.py
    feedback/
      gemini_feedback.py          # Gemini Flash: post-set personalized coaching
      claude_deep_report.py       # Claude Haiku: deep analysis + corrective programs
      prompts.py                  # System prompts for both LLMs
    models.py                     # Pydantic models for API request/response
    config.py                     # Settings from env vars
    Dockerfile
    requirements.txt

  models/
    FormAnalysis.mjs              # Sequelize model
    MovementProfile.mjs           # Sequelize model

  routes/
    formAnalysis.mjs              # Express API routes

  workers/
    formAnalysisWorker.mjs        # BullMQ worker

frontend/
  src/components/FormAnalysis/
    FormAnalyzer.tsx              # Main component (camera + upload)
    VideoOverlay.tsx              # Skeleton drawing canvas
    FeedbackPanel.tsx             # Real-time form cues
    RepCounter.tsx                # Rep count + quality
    AnalysisResults.tsx           # Full report view
    ExerciseSelector.tsx          # Exercise picker
    MovementProfile.tsx           # Long-term tracking dashboard

  src/hooks/
    useMediaPipe.ts               # MediaPipe model loading + inference
    useBiomechanics.ts            # Angle calculations
    useFormAnalysis.ts            # API calls for upload/results
```

---

## Part 8: Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time engine | MediaPipe (client-side) | Runs on phone browsers at 30fps, no server cost for live analysis |
| Server analysis | MediaPipe + YOLOv8-Pose | Deeper analysis with more compute, handles uploaded videos |
| Microservice language | Python (FastAPI) | Best ML/CV ecosystem (MediaPipe, OpenCV, numpy all native Python) |
| Communication | REST + BullMQ | Video analysis takes 10-60s, async queue is essential |
| Video storage | Cloudflare R2 | Already used for media in SwanStudios |
| Landmark format | MediaPipe 33-point | Industry standard, good balance of detail vs performance |
| Browser package | `@mediapipe/tasks-vision` | Official MediaPipe JS SDK (WASM+WebGL) |
| Landmark smoothing | One Euro Filter | Standard for jitter reduction on raw landmarks |
| Exercise rules | Pattern-based (not ML) | Interpretable, no training data needed, easy to add exercises |
| Video calling | Daily.co or existing WebRTC | Low-latency, supports custom video processing pipelines |

---

## Summary

This system combines **client-side real-time pose estimation** (MediaPipe in the browser) with **server-side deep analysis** (Python FastAPI microservice) to deliver both instant feedback during workouts and detailed reports from uploaded videos. The architecture is designed as a **standalone component** that integrates cleanly into SwanStudios' existing React + Express + PostgreSQL stack.

The minimal-clicks UX ensures clients can get form feedback in 3-4 taps, trainers can enable AI overlay in 2 taps during live sessions, and async form reviews require just 2 taps per person.

---

## Part 9: AI Village Validation Feedback (8/8 PASS)

Validated 2026-03-06. All 8 brains passed. Key implementation requirements captured below.

### P0 -- Must Address During Build

**Security (DeepSeek V3.2):**
- File upload validation: whitelist MIME types + magic bytes, 100MB max, no executables
- Authorization on `/api/form-analysis/:id` -- ownership check (user or their trainer)
- Rate limiting: 10 uploads/min, 100/day per user
- Pre-signed R2 URLs with 15-min expiry (never expose direct URLs)
- CORS locked to `https://sswanstudios.com` on Python service
- CSP directives for WASM (`'wasm-unsafe-eval'`), blob workers, R2 media

**Architecture (MiniMax M2.5):**
- Redis required for BullMQ -- provision on Render or use Upstash
- Database indexes: `CREATE INDEX idx_form_analyses_user_status ON "FormAnalyses"("userId", "analysisStatus")`
- `landmarkData` compressed or stored in R2 with reference URL (not inline JSONB for large videos)
- BullMQ job TTL (120s), dead letter queue, max 3 retries with exponential backoff
- Python service health endpoints: `GET /health`, `GET /ready`
- Graceful shutdown: handle SIGTERM, finish current frame, drain queue
- Pagination on history endpoint: `?page=1&limit=20`

**Code Quality (Claude Sonnet):**
- TypeScript interfaces for all JSONB fields (FormAnalysisFindings, Compensation, LandmarkFrame)
- Throttle `useBiomechanics()` to 10fps (not 30fps) to prevent battery drain
- Error boundaries wrapping `<FormAnalyzer />` with fallback to upload-only mode
- Constants file: `FORM_SCORE_THRESHOLDS`, `COMPENSATION_SEVERITY`, `ANALYSIS_STATUS`
- Theme token integration: `getScoreColor(score, theme)` not hardcoded colors
- `useCamera()` hook: proper cleanup in effect, permission error handling, front/rear toggle
- Canvas: ResizeObserver + devicePixelRatio handling for sharp rendering on Retina

### P1 -- Design Directives (Gemini 3.1 Pro, Lead Design Authority)

**Directive 1: Biomechanics HUD (VideoOverlay)**
- Custom neon-wireframe skeleton, NOT default MediaPipe stick figures
- `ctx.shadowBlur = 12`, `ctx.lineWidth = 4`
- Dynamic joint colors: Cyan (#00FFFF) > 85 score, Purple (#7851A9) > 60, Red (#FF3366) < 60
- Inner vignette on video container: `box-shadow: inset 0 0 100px rgba(10, 10, 26, 0.8)`
- Canvas draws via `useRef` in `onResults` callback -- NO React state updates per frame

**Directive 2: Rep Counter + Feedback**
- Glassmorphic floating RepHUD with `backdrop-filter: blur(16px)`
- Framer Motion spring pulse on rep increment (`scale: 1.5 -> 1, stiffness: 300, damping: 15`)
- Feedback cues: `AnimatePresence` slide-up with 3-second auto-dismiss
- Monospace font (`Space Mono`) for data readouts

**Directive 3: Deep Scan Loading State**
- SVG human silhouette with scanning laser line (purple glow, infinite top-to-bottom)
- Rotating technical status text every 4 seconds: "Extracting biomechanical frames...", "Mapping 33-point spatial landmarks...", etc.
- Monospace 14px, `rgba(255,255,255,0.7)`

**Directive 4: Mobile Thumb-Zone Controls**
- Floating pill-shaped `BottomActionBar` at `bottom: calc(24px + env(safe-area-inset-bottom))`
- 64px circular record button (cyan border, transitions to red square when recording)
- Exercise selector opens as bottom sheet (Framer Motion `drag="y"`), not dropdown
- No controls in top 30% of screen on mobile

**Directive 5: Movement Profile Visualizations**
- Radar chart: dark grid (`rgba(255,255,255,0.05)`), cyan data polygon with gradient fill
- `filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.2))` on chart container
- Symmetry score: typographic + glowing horizontal balance bar (cyan left, purple right)

### Z-Index Scale
- video: 0, canvas: 10, vignette: 20, hud-elements: 30, modals: 100

### Strict Rules
- Never hardcode colors outside Galaxy-Swan palette
- Use alpha over `#0a0a1a` for grays: `rgba(255,255,255,0.1)` etc.
- All scoring thresholds in constants, not magic numbers

---

## Phase 9: Cross-Component Intelligence Layer

**Design Document:** `docs/ai-workflow/blueprints/CROSS-COMPONENT-INTELLIGENCE-LAYER.md`

### Overview
The nervous system connecting all 9 SwanStudios subsystems: Pain Management, Movement Analysis, Workout Plans, Session Packages, Daily Workout Form, Admin Command Center, AI Form Analysis, Equipment Profiles, and Workout Variation Engine.

### Sub-phases

#### 9a: ClientIntelligenceService (Backend Foundation)
- [ ] Create `backend/services/clientIntelligenceService.mjs`
- [ ] Implement `getClientContext()` — parallel queries to all 7 subsystems
- [ ] Pain exclusion logic (72h auto-exclude for severity >= 7, warn for 4-6)
- [ ] Compensation trend analysis (improving/stable/worsening)
- [ ] Package-to-plan horizon mapping (10-24 pack = 3mo, 6mo, 12mo)
- [ ] REGION_TO_MUSCLE_MAP (49 body regions → NASM muscle taxonomy)
- [ ] CES_MAP (8 compensation types → Inhibit/Lengthen/Activate/Integrate)
- [ ] REST API: `GET /api/client-intelligence/:clientId`

#### 9b: Intelligent Workout Builder (Backend)
- [ ] Create `backend/services/workoutBuilderService.mjs`
- [ ] Single workout generation algorithm (7-step: constraints → rotation → warmup → exercises → params → cooldown → explanations)
- [ ] Long-term plan generation (5-step: periodization → phases → mesocycles → overload → document)
- [ ] NASM OPT phase parameter tables (sets/reps/rest/tempo per phase)
- [ ] AI explanation generation (why each exercise was selected/excluded)
- [ ] REST API: `POST /api/workout-builder/generate`, `POST /api/workout-builder/regenerate`

#### 9c: Admin Intelligence Widgets (Frontend)
- [ ] "The Pulse" — Pain & compensation alerts (severity >= 7 auto-lock, trend arrows)
- [ ] Form Analysis Queue — video processing stats, circular progress SVG, flagged exercises
- [ ] NASM Adherence Radar — custom SVG radar chart (6 axes, neon glow)
- [ ] Equipment Intelligence — profile status, pending approvals
- [ ] Plan Adherence — session completion bars per client
- [ ] Session Utilization — package burn rate, depletion alerts
- [ ] 12-column CSS Grid layout in Admin Command Center
- [ ] REST API: `GET /api/admin/intelligence/overview`

#### 9d: Intelligent Workout Builder (Frontend)
- [ ] 3-pane layout: Context Sidebar (300px) | Workout Canvas (fluid) | AI Insights (350px)
- [ ] AI-optimized exercise card (cyan glow border, "AI Optimized" badge)
- [ ] Zustand store for WorkoutBuilderState
- [ ] Framer Motion swap animations (AnimatePresence, spring transitions)
- [ ] Mobile responsive (chips + floating ? button for AI insights)
- [ ] Wire to workout builder API

#### 9e: Event Bus + Cross-Component Wiring
- [ ] Create `backend/services/eventBus.mjs` (Node EventEmitter)
- [ ] Wire pain.created → workout builder exclusions
- [ ] Wire compensation.detected → variation engine
- [ ] Wire workout.completed → rotation position update
- [ ] Wire equipment.approved → exercise availability update
- [ ] Wire package.purchased → plan horizon suggestion

### Integration Points
- Pain Management ↔ Workout Builder (exercise exclusion/modification)
- Form Analysis ↔ Variation Engine (compensation-aware substitution)
- Equipment Profiles ↔ Workout Builder (location-aware exercise selection)
- Session Packages ↔ Plan Generator (package duration → plan horizon)
- Movement Analysis ↔ NASM Phase (assessment findings → OPT phase recommendation)
- DailyWorkoutForm ↔ Progressive Overload (RPE/form scores → load adjustment)

### Gemini 3.1 Pro Design Directives
- 3-pane Intelligent Workout Builder (Context / Canvas / AI Insights)
- Progressive Disclosure — AI does heavy lifting silently, surfaces decisions via tooltips
- "Swan AI" persona — cyan glow border + sparkle icon for AI-modified exercises
- NASM OPT Phase color coding: Phase 1 = Cyan, Phase 2-4 = Purple, Phase 5 = Pink
- Custom SVG radar/sparkline charts with neon glow (no chart libraries)
- Framer Motion for all layout animations (spring: stiffness 300, damping 30)
- Zustand for WorkoutBuilderState management
- Optimistic UI for equipment approvals
- "Cosmic Scanning" skeleton loaders for AI processing states

---

## Phase 10: Boot Camp Class Builder

**Design Document:** `docs/ai-workflow/blueprints/BOOTCAMP-CLASS-BUILDER-DESIGN.md`

### Overview
AI-powered group fitness boot camp class generation for Move Fitness. Handles space-aware planning, time-constrained station design, variable class sizes, exercise difficulty tiers, pain modifications, workout rotation, and trend research.

### Key Features
- **4 class formats**: Stations (4x, 3x5, 2x7) + Full Group (15 exercises x 2 rounds)
- **Space-aware**: Gemini Flash Vision analyzes gym 360 video/photos for station placement
- **Time-aware**: 50 min total (5 demo + 45 workout + 5 clear), precise timing per exercise
- **Overflow planning**: Auto-generates backup plans when class exceeds station capacity (lap rotations)
- **4 difficulty tiers**: Easy/Medium/Hard/Modified per exercise
- **Pain modifications**: Knee/shoulder/ankle/wrist/back alternatives per exercise
- **Low-impact advanced**: Isolation, isometric holds, slow tempo for joint-friendly advanced training
- **Exercise rotation**: 2-week freshness tracking, prevents class staleness
- **Trend research**: AI searches YouTube/Reddit for trending exercises, rates against NASM protocol
- **Existing workout logging**: Trainer logs current programs, AI analyzes patterns and suggests improvements
- **Printable class sheet**: Quick-reference sheet for gym floor use

### Sub-phases

#### 10a: Database Models + Migrations
- [ ] BootcampTemplate, BootcampStation, BootcampExercise models
- [ ] BootcampOverflowPlan, BootcampClassLog models
- [ ] BootcampSpaceProfile, ExerciseTrend models
- [ ] Migration for all 7 tables
- [ ] Register in associations.mjs and index.mjs

#### 10b: Space Analysis Service
- [ ] Space photo/video upload to R2
- [ ] Gemini Flash Vision integration for space analysis
- [ ] Space profile CRUD service + REST API

#### 10c: Boot Camp Generation Engine
- [ ] Station-based class generation (4 formats)
- [ ] Full group workout generation (15 exercises x 2 rounds)
- [ ] Overflow plan auto-generation (lap rotation strategy)
- [ ] Difficulty tier + pain modification auto-generation
- [ ] Time calculation and validation engine
- [ ] Exercise rotation freshness tracking
- [ ] REST API: POST /api/bootcamp/generate

#### 10d: Trend Research Engine
- [ ] Gemini-powered trend search (YouTube transcripts, Reddit communities)
- [ ] Diverse fitness community coverage (Black fitness culture, all demographics)
- [ ] NASM protocol rating system (approved/caveats/not-recommended/dangerous)
- [ ] Impact level classification (low/medium/high/plyometric)
- [ ] Admin approval queue for discovered exercises

#### 10e: Existing Workout Logger
- [ ] CRUD for current boot camp workouts (Lower Body, Upper Body, Cardio, Full Body)
- [ ] AI analysis of workout patterns and gap detection
- [ ] Rotation suggestions based on logged history

#### 10f: Boot Camp Frontend
- [ ] Boot Camp Dashboard (command center, weekly schedule)
- [ ] Class Builder (3-pane layout: Config / Station Canvas / AI Insights)
- [ ] Station card components with difficulty tiers and pain mods
- [ ] Space profile management UI with 360 video upload
- [ ] Printable class sheet generator
- [ ] Trend discovery feed with approve/reject
- [ ] Exercise rotation calendar visualization
- [ ] Tablet-first responsive design (iPad Pro primary device on gym floor)

#### 10g: Integration Wiring
- [ ] Equipment Profiles (Phase 7) — same equipment system
- [ ] Variation Engine (Phase 8) — 2-week rotation logic
- [ ] Pain Management — class-wide pain modification sheet
- [ ] Form Analysis — compensation trends influence exercise selection
- [ ] Admin Dashboard (Phase 9) — boot camp widgets
- [ ] Event bus: bootcamp.classCompleted, bootcamp.trendDiscovered
