# Smart Workout Logger — Phase 0 Appendices

**Parent doc:** `docs/qa/SMART-WORKOUT-LOGGER-BASELINE-AUDIT.md`
**Date:** 2026-02-24

---

## Appendix A: Database Models Summary

### A1. Existing Models (Workout/AI/Privacy Related)

| Model | Table | Key Fields | Status |
|-------|-------|-----------|--------|
| `User` | `users` | `masterPromptJson`, `spiritName`, `isOnboardingComplete` | Active |
| `WorkoutSession` | `workout_sessions` | `userId`, `title`, `date`, `duration`, `intensity`, `status`, `experiencePoints` | Active |
| `WorkoutLog` | `workout_logs` | `sessionId`, `exerciseName`, `setNumber`, `reps`, `weight`, `tempo`, `rest`, `rpe` | Active |
| `WorkoutPlan` | `workout_plans` | `userId`, `title`, `durationWeeks`, `status`, `difficulty`, `isTemplate` | Active |
| `WorkoutPlanDay` | `WorkoutPlanDays` | Links plan to day configs | Active |
| `WorkoutPlanDayExercise` | junction | `orderInWorkout`, `setScheme`, `repGoal`, `restPeriod`, `tempo` | Active |
| `Exercise` | `Exercises` | `name`, `exerciseType` (ENUM), `primaryMuscles`, `difficulty`, `coachingCues` | Active |
| `Set` | — | Individual set records (weight, reps, RPE) | Active |
| `DailyWorkoutForm` | `daily_workout_forms` | `formData` (JSONB), `mcpProcessed`, `totalPointsEarned` | Active |
| `ClientBaselineMeasurements` | `client_baseline_measurements` | PAR-Q+, OHSA, postural, strength, NASM score, CES strategy | Active |
| `ClientOnboardingQuestionnaire` | `client_onboarding_questionnaires` | 85 responses, `questionnaireVersion`, `primaryGoal`, `healthRisk` | Active |
| `ClientProgress` | — | Progress tracking data | Active |
| `BodyMeasurement` | — | Body measurements over time | Active |
| `WorkoutTemplate` | — | Reusable workout templates | Active |
| `WorkoutExercise` | — | Individual exercise entries in a session | Active |
| `MuscleGroup` | — | Muscle group reference data | Active |
| `ExerciseMuscleGroup` | — | Exercise ↔ muscle group junction | Active |
| `ExerciseEquipment` | — | Exercise ↔ equipment junction | Active |
| `Equipment` | — | Equipment reference data | Active |
| `ClientNutritionPlan` | — | Nutrition plans (some PII references) | Active |
| `clients_pii` | `clients_pii` | `real_name`, `spirit_name`, `privacy_level` | Raw SQL only |

### A2. New Models Needed

| Model | Purpose | Phase |
|-------|---------|-------|
| `AiPrivacyProfile` / `AiConsentProfile` | Per-user consent state (granular AI feature toggles, consent dates, withdrawal) | Phase 1 |
| `AiInteractionLog` / `AiGenerationRequest` | Audit trail: what was sent to which provider, consent state at time of call | Phase 1 |
| `ClientsPii` (Sequelize) | Proper ORM model for existing `clients_pii` table | Phase 1 |
| `DeIdentifiedContext` / `DeidentificationMap` | Cached de-identified version of masterPromptJson / reversible token mapping | Phase 2 |
| `AiProviderConfig` | Provider settings, BAA status, rate limits, feature flags | Phase 2 |
| `WorkoutAiSession` | Real-time session mode state (in-progress workout with AI coaching) | Phase 3 |
| `NasmTemplateRegistry` | Versioned workout templates per OPT phase | Phase 2 |

---

## Appendix B: File Reference for Phase 1

### Key Files to Modify

| File | What Changes |
|------|-------------|
| `backend/controllers/aiWorkoutController.mjs` | Insert de-identification before `buildPrompt()` |
| `backend/controllers/onboardingController.mjs` | Wire consent check into onboarding flow |
| `backend/services/privacy/PIIManager.mjs` | Extend to handle masterPromptJson structure |
| `backend/models/User.mjs` | Add `aiConsentStatus` field or FK to AiPrivacyProfile |
| `backend/routes/aiRoutes.mjs` | Add consent check middleware |
| `backend/routes/onboardingRoutes.mjs` | Add consent collection step |

### Files to Create

| File | Purpose |
|------|---------|
| `backend/models/AiPrivacyProfile.mjs` | Consent data model |
| `backend/models/AiInteractionLog.mjs` | AI audit trail |
| `backend/models/ClientsPii.mjs` | Sequelize model for clients_pii table |
| `backend/middleware/deIdentify.mjs` | De-identification middleware |
| `backend/middleware/aiConsent.mjs` | Consent verification middleware |
| `backend/services/deIdentificationService.mjs` | PII stripping + spiritName substitution |
| `frontend/src/components/ConsentFlow/AiConsentScreen.tsx` | Client consent UI |

---

## Appendix C: RBAC / Auth Stack

| Component | Location | Purpose |
|-----------|----------|---------|
| Auth Middleware | `authMiddleware.mjs` | JWT verification |
| Role Check | `requireRole()` | Decorator pattern for route-level RBAC |
| Trainer Permissions | `trainerPermissionMiddleware.mjs` | 6 permission types with expiration |
| Client Access | `clientAccess.mjs` | Admin bypass, trainer assignment check |
| Spirit Names | `Users.spiritName` + `clients_pii` | Privacy-preserving alias system |
