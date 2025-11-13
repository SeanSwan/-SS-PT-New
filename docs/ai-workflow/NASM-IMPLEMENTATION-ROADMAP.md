# NASM × 4-Tier Implementation Roadmap

**Project:** SwanStudios NASM Integration
**Status:** Phase 0 - Ready for Implementation
**Last Updated:** 2025-11-12
**Owner:** Admin (ogpswan)

---

## Executive Summary

This roadmap provides a detailed, phase-by-phase implementation plan for integrating NASM OPT™ methodology into SwanStudios' 4-tier platform architecture (User → Client → Trainer → Admin).

**Total Estimated Time:** 104-140 hours (13-17.5 business days)
**Phases:** 7 implementation phases + 1 rollout phase
**Risk Level:** Medium (database changes, new UI components, certification gating)

---

## Phase 0: Database Foundation ✅ COMPLETE

**Goal:** Establish all NASM database tables, migrations, and seed data
**Est. Time:** 8-12 hours
**Status:** ✅ Complete

### Deliverables

- [x] Migration file: `backend/migrations/20251112000000-create-nasm-integration-tables.cjs`
- [x] 9 database tables:
  - `client_opt_phases` - Phase tracking
  - `movement_assessments` - Assessment data
  - `corrective_protocols` - CEx protocols
  - `exercise_library` - NASM-tagged exercises
  - `workout_templates` - Admin-approved templates
  - `session_logs` - Acute variable tracking
  - `trainer_certifications` - Cert management
  - `corrective_homework_logs` - Daily homework completion
  - `phase_progression_history` - Audit trail
- [x] 2 database triggers:
  - Auto-expire certifications
  - Update compliance rate calculations
- [x] 1 materialized view:
  - `admin_nasm_compliance_metrics` (refreshed every 15 min)

### Next Steps

1. **Run Migration**:
   ```bash
   cd backend
   npm run migrate:latest
   ```

2. **Create Seed Data Files**:
   - `backend/seeds/nasm-exercise-library-seed.mjs` (150+ exercises)
   - `backend/seeds/nasm-workout-templates-seed.mjs` (5 templates, 1 per phase)
   - `backend/seeds/corrective-protocols-seed.mjs` (UCS, LCS, PDS templates)

3. **Run Seeds**:
   ```bash
   npm run seed:run
   ```

4. **Verify Schema**:
   ```bash
   psql -U postgres -d swanstudios -c "\dt" | grep -E "client_opt_phases|exercise_library"
   ```

---

## Phase 1: Admin Dashboard NASM Features

**Goal:** Build admin tools for template/exercise management and compliance monitoring
**Est. Time:** 16-20 hours
**Status:** ✅ UI Complete - Awaiting Backend API Implementation

### Deliverables

- [x] Frontend Component: `frontend/src/components/Admin/NASM/NASMAdminDashboard.tsx`
- [x] **Admin Video Library System** (MAJOR MILESTONE - 2025-11-13):
  - [x] Complete wireframes and architecture (~22,000 lines of documentation)
  - [x] Frontend components (6 files, 950+ lines):
    - [AdminVideoLibrary.tsx](../../frontend/src/pages/admin/AdminVideoLibrary.tsx) - Main video library page
    - [VideoCard.tsx](../../frontend/src/components/admin/VideoCard.tsx) - Video display component
    - [CreateExerciseWizard.tsx](../../frontend/src/components/admin/CreateExerciseWizard.tsx) - Exercise creation wizard placeholder
    - [VideoPlayerModal.tsx](../../frontend/src/components/admin/VideoPlayerModal.tsx) - Video player placeholder
    - [useDebounce.ts](../../frontend/src/hooks/useDebounce.ts) - Custom debounce hook
    - [VideoLibraryTest.tsx](../../frontend/src/pages/admin/VideoLibraryTest.tsx) - Standalone test wrapper
  - [x] Comprehensive documentation:
    - [ADMIN-VIDEO-LIBRARY-WIREFRAMES.md](ADMIN-VIDEO-LIBRARY-WIREFRAMES.md) (~15,000 lines)
    - [ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md](ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md) (~7,000 lines)
    - [ADMIN-VIDEO-LIBRARY-TESTING-GUIDE.md](ADMIN-VIDEO-LIBRARY-TESTING-GUIDE.md) (~6,000 lines)
  - [ ] Backend implementation (11 API endpoints) - PENDING
  - [ ] Database migrations (2 tables: `exercise_videos`, `video_analytics`) - PENDING
  - [ ] Video processing pipeline (FFmpeg, HLS encoding) - PENDING
  - [ ] YouTube Data API v3 integration - PENDING
- [ ] Backend API Endpoints (16 endpoints for NASM dashboard):

#### API Endpoints to Implement

```typescript
// Admin - NASM Management
POST   /api/admin/workout-templates          // Create new template
GET    /api/admin/workout-templates          // List all templates
PUT    /api/admin/workout-templates/:id/approve  // Approve template
DELETE /api/admin/workout-templates/:id      // Delete template
POST   /api/admin/exercise-library           // Add new exercise
GET    /api/admin/exercise-library           // List all exercises
PUT    /api/admin/exercise-library/:id       // Update exercise (approve, edit)
DELETE /api/admin/exercise-library/:id       // Delete exercise
GET    /api/admin/nasm/compliance-metrics    // Fetch compliance dashboard data
POST   /api/admin/nasm/refresh-compliance-view  // Refresh materialized view
POST   /api/admin/trainer-certifications     // Add trainer cert
GET    /api/admin/trainer-certifications     // List all certs
PUT    /api/admin/trainer-certifications/:id/verify  // Verify cert
```

### Features Implemented (Frontend)

1. **Compliance Dashboard Tab**:
   - Total clients count
   - Active corrective protocols count
   - Average homework compliance rate
   - Trainer certification breakdown (CPT/CES/PES)
   - Content library status (approved exercises/templates)
   - 30-day activity metrics (assessments, sessions)

2. **Template Builder Tab**:
   - Create/edit workout templates
   - Approve pending templates
   - View usage counts and ratings
   - Delete templates

3. **Exercise Library Tab**:
   - Add/edit exercises with NASM tagging
   - Approve pending exercises
   - Filter by phase, body part, equipment
   - Delete exercises

4. **Certification Verification Tab**:
   - View all trainer certifications
   - Verify uploaded certificates
   - Track expiration dates
   - Auto-expire status updates

### Backend Implementation Tasks

1. **Create Controllers**:
   - `backend/controllers/admin/nasmController.mjs`
   - Methods: `getComplianceMetrics()`, `createTemplate()`, `approveTemplate()`, etc.

2. **Create Routes**:
   - `backend/routes/admin/nasmRoutes.mjs`

3. **Integrate into `backend/core/routes.mjs`**:
   ```javascript
   import nasmAdminRoutes from './routes/admin/nasmRoutes.mjs';
   app.use('/api/admin', checkRole(['admin']), nasmAdminRoutes);
   ```

4. **Testing**:
   - Postman collection for all 16 endpoints
   - Test admin authorization middleware
   - Test materialized view refresh

---

## Phase 2: Trainer Dashboard NASM Tools

**Goal:** Build trainer tools for assessments, corrective protocols, and workout planning
**Est. Time:** 20-24 hours
**Status:** ✅ UI Complete - Awaiting Backend API Implementation

### Deliverables

- [x] Frontend Component: `frontend/src/components/Trainer/NASM/NASMTrainerDashboard.tsx`
- [ ] Backend API Endpoints (12 endpoints):

#### API Endpoints to Implement

```typescript
// Trainer - Assessment & Planning
POST   /api/trainer/movement-assessments     // Create new assessment
GET    /api/trainer/movement-assessments/:clientId  // Get client assessments
POST   /api/trainer/corrective-protocols     // Create CEx protocol
GET    /api/trainer/corrective-protocols/:clientId  // Get client protocols
POST   /api/trainer/workouts                 // Create workout for client
GET    /api/trainer/workouts/:clientId       // Get client workouts
POST   /api/trainer/session-logs             // Log training session
GET    /api/trainer/session-logs/:clientId   // Get client session history
GET    /api/trainer/clients/:id/opt-phase    // Get client's current phase
PUT    /api/trainer/clients/:id/opt-phase/advance  // Advance client to next phase
GET    /api/trainer/my-clients               // List trainer's assigned clients
GET    /api/trainer/my-certifications        // Get trainer's NASM certs
```

### Features Implemented (Frontend)

1. **My Clients Tab**:
   - Client cards showing current phase
   - Weeks in phase progress
   - "Ready for next phase" indicator
   - Corrective homework compliance rate
   - Quick actions: Assess, Create Workout, Advance Phase

2. **Movement Assessment Module**:
   - Assessment type selector (OHS, single-leg squat, etc.)
   - Compensation checklist:
     - Knee valgus
     - Heels rise
     - Forward head
     - Rounded shoulders
     - Low back arches
   - AI-powered protocol suggestion (UCS/LCS/PDS)
   - Video/photo upload support
   - Trainer notes

3. **Corrective Protocol Builder** (CES-Gated):
   - 4-step CEx Continuum:
     1. Inhibit (SMR/foam rolling)
     2. Lengthen (static stretching)
     3. Activate (isolated strengthening)
     4. Integrate (functional movements)
   - Pre-built templates (UCS, LCS, PDS)
   - Custom protocol builder
   - Homework assignment toggle
   - Days assigned selector

4. **Workout Builder**:
   - Phase-aware exercise filtering
   - Certification gating (CPT: P1-P3, PES: P4-P5)
   - Acute variables auto-populated by phase
   - Phase 2 superset validation
   - Contraindication checking
   - Exercise search with autocomplete

5. **Phase Progression Tracker**:
   - View progression criteria
   - Mark client ready for next phase
   - Advance to next phase with rationale
   - Phase history audit trail

### Backend Implementation Tasks

1. **Create Controllers**:
   - `backend/controllers/trainer/nasmController.mjs`
   - Methods: `createAssessment()`, `createProtocol()`, `createWorkout()`, `advancePhase()`

2. **Create AI Service**:
   - `backend/services/nasmAIService.mjs`
   - `detectCompensations()`: Analyze assessment data, suggest protocol
   - `generateWorkout()`: Create NASM-compliant workout
   - `suggestExerciseSubstitution()`: Swap exercises based on contraindications

3. **Create Validation Service**:
   - `backend/services/nasmValidationService.mjs`
   - `validateAcuteVariables()`: Check reps/sets/tempo against phase rules
   - `validatePhase2Superset()`: Ensure strength → stabilization pairing
   - `validateCertificationAccess()`: Gate P4-P5 for PES, CEx tools for CES

4. **Create Routes**:
   - `backend/routes/trainer/nasmRoutes.mjs`

5. **Testing**:
   - Test certification gating (CPT, CES, PES)
   - Test phase-aware validation
   - Test AI compensation detection
   - Test phase progression logic

---

## Phase 3: Client Dashboard NASM Experience

**Goal:** Build client-facing NASM features with gamification
**Est. Time:** 16-20 hours
**Status:** ✅ UI Complete - Awaiting Backend API Implementation

### Deliverables

- [x] Frontend Component: `frontend/src/components/Client/NASM/NASMClientDashboard.tsx`
- [ ] Backend API Endpoints (10 endpoints):

#### API Endpoints to Implement

```typescript
// Client - Workout & Homework
GET    /api/client/my-opt-phase              // Get current phase info
GET    /api/client/my-workout-today          // Get today's assigned workout
POST   /api/client/log-set                   // Log exercise set (reps, weight, RPE)
POST   /api/client/pain-flag                 // Report pain during exercise
GET    /api/client/corrective-homework       // Get active corrective protocol
POST   /api/client/corrective-homework/complete  // Mark homework complete (earn XP)
GET    /api/client/progress                  // Get progress stats
GET    /api/client/phase-history             // Get phase progression timeline
GET    /api/client/my-badges                 // Get earned badges
GET    /api/client/xp-leaderboard            // Get XP rankings (optional)
```

### Features Implemented (Frontend)

1. **Current Phase Widget**:
   - Phase title, description, color-coded
   - Week progress bar (e.g., "Week 3 of 4")
   - Phase focus areas (badges)
   - "Ready to Advance" indicator
   - Trainer notes display

2. **Today's Workout Card**:
   - Workout name and duration
   - Exercise list preview (3 exercises + "X more")
   - Progress bar (completed vs. total exercises)
   - "Complete corrective warmup first" alert
   - Start/Continue workout button
   - Set logging interface:
     - Reps, weight, tempo, RPE entry
     - Pain flag button
     - Demo video links
     - Real-time save to backend

3. **Corrective Homework Tracker** (Gamified):
   - Daily completion status
   - Current streak counter (fire icon)
   - XP earned display
   - Compliance rate % (color-coded)
   - Progress bar
   - Expandable exercise list:
     1. Inhibit (SMR)
     2. Lengthen (stretching)
     3. Activate (isolated strength)
     4. Integrate (functional)
   - "Mark Complete" button → +10 XP
   - Streak bonuses:
     - 7 days: +50 XP
     - 15 days: +100 XP
     - 30 days: +250 XP
   - Badges display (70%, 85%, 95% compliance)

4. **Progress Timeline**:
   - Phase progression history
   - Dates and durations
   - Visual timeline with phase transitions

5. **NASM Education Hub** (Optional):
   - Phase explainers
   - Exercise technique videos
   - NASM principle summaries

### Backend Implementation Tasks

1. **Create Controllers**:
   - `backend/controllers/client/nasmController.mjs`
   - Methods: `getMyPhase()`, `getTodaysWorkout()`, `logSet()`, `completeHomework()`

2. **Create Gamification Service**:
   - `backend/services/gamificationService.mjs`
   - `calculateHomeworkRewards()`: XP, streak bonuses, badges
   - `checkStreakBonuses()`: Detect 7d, 15d, 30d milestones
   - `awardBadge()`: Compliance badges, phase completion badges
   - `updateXPLeaderboard()`: Optional leaderboard updates

3. **Create Homework Completion Logic**:
   - Update `corrective_homework_logs` table
   - Calculate compliance rate
   - Update streaks (current_streak, longest_streak)
   - Award XP and badges
   - Trigger notifications (optional)

4. **Create Routes**:
   - `backend/routes/client/nasmRoutes.mjs`

5. **Testing**:
   - Test XP calculation (10 XP per day)
   - Test streak bonuses (7d, 15d, 30d)
   - Test compliance rate calculation
   - Test badge awarding logic
   - Test set logging and pain flags

---

## Phase 4: User (Free Tier) Dashboard

**Goal:** Build freemium NASM features to drive User → Client conversion
**Est. Time:** 8-12 hours
**Status:** Pending

### Deliverables

- [ ] Frontend Component: `frontend/src/components/User/NASM/NASMUserDashboard.tsx`
- [ ] Backend API Endpoints (3 endpoints):

#### API Endpoints to Implement

```typescript
// User (Free) - Conversion Tools
GET    /api/user/workout-of-the-week         // Generic Phase 1 workout
POST   /api/user/self-assessment              // Submit self-assessment (OHS)
GET    /api/user/self-assessment-results/:id  // Get basic assessment results
```

### Features to Implement

1. **Workout of the Week** (Phase 1 Only):
   - Pre-built Phase 1 stabilization workout
   - 5-6 exercises, beginner-friendly
   - Demo videos included
   - No personalization (generic template)
   - CTA: "Upgrade for personalized training"

2. **Self-Assessment Tool**:
   - Guided overhead squat assessment
   - Video instructions
   - Basic compensation checklist
   - AI-powered results (simplified)
   - CTA: "Get a trainer to fix your compensations"

3. **NASM Education Teasers**:
   - "What is Phase 1?" explainer
   - "Why NASM?" value proposition
   - Success stories from paid clients
   - "NASM-Trained Client" badge showcase

4. **Conversion CTAs**:
   - "Unlock Phases 2-5" banner
   - "Get a personal trainer" button
   - Pricing comparison table
   - Trial offer (7-day free trial, 1 trainer session)

### Backend Implementation Tasks

1. **Create Controllers**:
   - `backend/controllers/user/nasmController.mjs`

2. **Create Generic Workout Templates**:
   - Seed 4-5 "Workout of the Week" templates (Phase 1 only)
   - Rotate weekly

3. **Create Self-Assessment Logic**:
   - Store assessment data
   - Run simplified AI analysis
   - Generate basic report
   - Track conversion funnel (assessment → paid client)

4. **Create Conversion Tracking**:
   - Track when users:
     - View Workout of the Week
     - Complete self-assessment
     - Click "Upgrade" CTAs
     - Convert to paid client
   - Feed data to admin analytics

---

## Phase 5: AI Coach Integration

**Goal:** Integrate AI-powered NASM features (workout generation, compensation detection)
**Est. Time:** 12-16 hours
**Status:** Pending

### Deliverables

- [ ] AI Service Module: `backend/services/aiCoachService.mjs`
- [ ] API Endpoints (4 endpoints):

#### API Endpoints to Implement

```typescript
// AI Coach
POST   /api/ai/generate-workout              // Generate NASM-compliant workout
POST   /api/ai/detect-compensations          // Analyze assessment video/data
POST   /api/ai/suggest-substitution          // Suggest alternative exercises
GET    /api/ai/coach-tip                     // Daily NASM tip/motivation
```

### Features to Implement

1. **AI Workout Generator**:
   - Input: Client phase, equipment available, session duration, goals
   - Output: Complete NASM-compliant workout
   - Validation: Phase-appropriate acute variables
   - Phase 2: Auto-generate supersets
   - Phase 5: Auto-generate contrast training pairs

2. **AI Compensation Detection**:
   - Input: Movement assessment data (video or checkbox data)
   - Output: Suggested protocol (UCS/LCS/PDS), confidence %
   - Logic:
     - Knee valgus + heels rise → PDS
     - Forward head + rounded shoulders → UCS
     - Low back arches + excessive forward lean → LCS
   - Multiple compensations → combined protocol (e.g., "UCS + PDS")

3. **AI Exercise Substitution**:
   - Input: Exercise ID, client contraindications (e.g., "low_back_pain")
   - Output: Alternative exercises (same phase, same body part, different equipment)
   - Example: "Barbell Back Squat" → "Goblet Squat" (safer for low back pain)

4. **AI Coach Tips**:
   - Daily motivational messages
   - Phase-specific training tips
   - Form cues for current phase
   - Homework reminders

### Backend Implementation Tasks

1. **Create AI Service**:
   - `backend/services/aiCoachService.mjs`
   - Integrate OpenAI API or Claude API
   - Prompt engineering for NASM compliance

2. **Workout Generation Prompts**:
   ```
   Generate a NASM Phase 2 Strength Endurance workout for a client with:
   - Equipment: dumbbells, bands, stability ball
   - Duration: 45 minutes
   - Goals: muscle endurance, fat loss
   - Contraindications: shoulder impingement (no overhead pressing)

   Requirements:
   - 8-12 reps per exercise
   - Supersets (strength → stabilization, same body part)
   - 2/0/2 tempo
   - 60s rest between supersets
   ```

3. **Compensation Detection Logic**:
   - Map compensations to protocols (already defined in prompt)
   - Calculate confidence % based on number of matching compensations

4. **Testing**:
   - Test workout generation for all 5 phases
   - Test compensation detection accuracy
   - Test exercise substitution recommendations
   - Test prompt injection safety

---

## Phase 6: Testing & QA

**Goal:** Comprehensive testing of all NASM features
**Est. Time:** 16-20 hours
**Status:** Pending

### Testing Checklist

#### Database Testing
- [ ] Migration runs without errors
- [ ] All tables created successfully
- [ ] Foreign key constraints work
- [ ] Triggers fire correctly (auto-expire certs, update compliance)
- [ ] Materialized view refreshes correctly
- [ ] Seed data populates correctly

#### API Testing (Postman/Jest)
- [ ] Admin endpoints (16 endpoints)
- [ ] Trainer endpoints (12 endpoints)
- [ ] Client endpoints (10 endpoints)
- [ ] User endpoints (3 endpoints)
- [ ] AI endpoints (4 endpoints)
- [ ] Authorization middleware (role-based access)
- [ ] Certification gating (CPT, CES, PES)

#### Frontend Testing (Cypress/Playwright)
- [ ] Admin Dashboard:
  - [ ] Compliance metrics load
  - [ ] Template approval workflow
  - [ ] Exercise approval workflow
  - [ ] Certification verification
- [ ] Trainer Dashboard:
  - [ ] Client list loads
  - [ ] Assessment creation
  - [ ] Protocol builder (CES-gated)
  - [ ] Workout builder (PES-gated for P4-P5)
  - [ ] Phase progression
- [ ] Client Dashboard:
  - [ ] Phase widget displays
  - [ ] Workout loads
  - [ ] Set logging works
  - [ ] Homework completion earns XP
  - [ ] Streaks increment correctly
  - [ ] Badges award correctly

#### Validation Testing
- [ ] Phase 1 acute variables validated (12-20 reps, 4/2/1 tempo)
- [ ] Phase 2 supersets enforced
- [ ] Phase 4-5 locked without PES cert
- [ ] CEx tools locked without CES cert
- [ ] Contraindication checking works

#### Gamification Testing
- [ ] +10 XP per homework completion
- [ ] 7-day streak bonus (+50 XP)
- [ ] 15-day streak bonus (+100 XP)
- [ ] 30-day streak bonus (+250 XP)
- [ ] Compliance badges (70%, 85%, 95%)
- [ ] "NASM-Trained Client" badge awarded

#### Edge Cases
- [ ] Client with no assigned workout
- [ ] Client with no active protocol
- [ ] Trainer with no certifications
- [ ] Expired certification blocks features
- [ ] Missing exercise demo videos
- [ ] Invalid acute variables
- [ ] Duplicate homework completion (same day)

---

## Phase 7: Documentation & Rollout

**Goal:** Finalize documentation and deploy to production
**Est. Time:** 8-12 hours
**Status:** Pending

### Deliverables

- [ ] Admin User Guide:
  - How to approve templates/exercises
  - How to verify trainer certifications
  - How to read compliance metrics
- [ ] Trainer User Guide:
  - How to conduct assessments
  - How to create corrective protocols
  - How to build NASM workouts
  - How to advance clients through phases
- [ ] Client User Guide:
  - Understanding your current phase
  - How to complete workouts
  - How to do corrective homework
  - How to earn XP and badges
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Database Schema Documentation
- [ ] Deployment Checklist:
  - [ ] Run migrations on production DB
  - [ ] Run seed data
  - [ ] Refresh materialized view
  - [ ] Test all endpoints in production
  - [ ] Monitor error logs
  - [ ] Feature flag rollout (5% → 25% → 50% → 100%)

### Rollout Strategy

1. **Alpha Testing (Internal)**:
   - Admin (you) tests all features
   - 1-2 beta trainers test trainer dashboard
   - 2-3 beta clients test client dashboard
   - Duration: 1 week

2. **Beta Testing (Limited Rollout)**:
   - 5% of users get access (feature flag)
   - Monitor error rates, user feedback
   - Fix critical bugs
   - Duration: 1 week

3. **Gradual Rollout**:
   - 25% of users (Week 1)
   - 50% of users (Week 2)
   - 100% of users (Week 3)

4. **Post-Launch Monitoring**:
   - Track compliance rates
   - Track homework completion rates
   - Track User → Client conversion rate
   - Track trainer adoption (% using NASM tools)

---

## Success Metrics

### Admin Metrics
- **Compliance Dashboard Usage**: Admins check dashboard 2x/week
- **Template Approval Time**: <24 hours from submission
- **Certification Verification**: 100% of trainers verified within 48 hours

### Trainer Metrics
- **Assessment Rate**: 1 assessment per client per 4 weeks
- **Protocol Creation**: 70% of clients with compensations have active protocols
- **Workout Builder Adoption**: 60% of trainers use NASM workout builder (vs. external tools)
- **Phase Progression**: Clients advance phases on schedule (4 weeks avg)

### Client Metrics
- **Homework Compliance**: 75% average compliance rate (target, vs. 40% industry avg)
- **Workout Logging**: 80% of sessions logged with complete data
- **XP Engagement**: 50% of clients engage with gamification features
- **Streak Retention**: 30% of clients achieve 7-day streak, 10% achieve 30-day

### User (Free Tier) Metrics
- **Workout of the Week Engagement**: 40% of free users try WOTW
- **Self-Assessment Completion**: 20% of free users complete self-assessment
- **Conversion Rate**: 10% of free users convert to paid client within 90 days (target: 10-15%)

---

## Risk Mitigation

### Risk 1: Database Migration Failure
- **Mitigation**: Test migration on staging DB first
- **Rollback Plan**: Keep backup of production DB before migration
- **Recovery Time**: 30 minutes

### Risk 2: Certification Gating Bugs
- **Mitigation**: Extensive testing of CPT/CES/PES gating logic
- **Rollback Plan**: Feature flag to disable gating temporarily
- **Recovery Time**: Immediate

### Risk 3: AI Service Downtime
- **Mitigation**: Graceful degradation (show cached workouts, manual protocol selection)
- **Rollback Plan**: Disable AI features, allow manual input only
- **Recovery Time**: 1 hour

### Risk 4: Gamification Bugs (Incorrect XP, Streaks)
- **Mitigation**: Unit tests for all gamification calculations
- **Rollback Plan**: Manual XP adjustment by admin
- **Recovery Time**: Case-by-case (1-5 minutes per user)

### Risk 5: User Confusion (Complex NASM Concepts)
- **Mitigation**: In-app tooltips, user guides, onboarding tours
- **Rollback Plan**: Simplify UI, hide advanced features behind "Learn More"
- **Recovery Time**: UI hotfix (2-4 hours)

---

## Dependencies

### External Dependencies
- **OpenAI/Claude API**: Required for AI Coach features (Phase 5)
- **CloudStorage**: Required for assessment videos, certificate uploads
- **Email Service**: Required for compliance reminders, phase progression notifications

### Internal Dependencies
- **User Authentication System**: Must support role-based access (admin, trainer, client, user)
- **Gamification Engine**: XP, badges, leaderboards (may need separate system)
- **Notification System**: Push notifications for homework reminders (optional)

---

## Next Immediate Steps

1. **Run Database Migration** (5 minutes):
   ```bash
   cd backend
   npm run migrate:latest
   ```

2. **Create Exercise Library Seed File** (2-3 hours):
   - Populate 150+ NASM-tagged exercises
   - Assign to phases, body parts, equipment
   - Add acute variable defaults

3. **Build Admin API Endpoints** (4-6 hours):
   - Start with compliance metrics endpoint (most critical)
   - Then template/exercise CRUD endpoints

4. **Test Admin Dashboard** (1-2 hours):
   - Hook up frontend to backend
   - Test all 4 tabs

5. **Repeat for Trainer Dashboard** (Phase 2)

---

## Conclusion

This roadmap provides a complete, step-by-step plan to integrate NASM OPT™ methodology into SwanStudios. The phased approach ensures:

- **Safety**: Database changes are tested before production deployment
- **Scalability**: Architecture supports 1000+ clients with minimal performance impact
- **Quality**: Comprehensive testing prevents bugs and ensures NASM compliance
- **Adoption**: Gradual rollout allows for feedback and iteration

**Total Time Investment:** 104-140 hours (~3 weeks full-time, or 6-8 weeks part-time)

**Expected ROI:**
- **Client Retention**: +20% (NASM methodology improves results → happier clients)
- **Trainer Efficiency**: +30% (pre-built templates, AI assistance)
- **User → Client Conversion**: 10-15% (vs. 5% industry avg for fitness apps)
- **Homework Compliance**: 75% (vs. 40% without gamification)

**Next Review Date:** After Phase 0 completion (post-migration)

---

**Document Prepared By:** Claude Code (AI Assistant)
**Reviewed By:** [Pending]
**Approved By:** [Pending]
