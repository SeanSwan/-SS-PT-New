# Client Onboarding UI Wireframes (Part 1)
**Version:** 1.0
**Created:** 2026-01-15
**Phase:** Phase 1.1 - Client Onboarding Blueprint
**Purpose:** Define UI/UX for questionnaire, movement screen, onboarding progress, and admin interfaces
**Part:** 1 of 2
**Scope:** Questionnaire UI and onboarding progress component

---

## Table of Contents
1. [85-Question Questionnaire UI](#85-question-questionnaire-ui)
2. [Onboarding Progress Component](#onboarding-progress-component)

---

## 85-Question Questionnaire UI

### Multi-Step Wizard Layout

**Design Pattern:** Progressive disclosure with section-based navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SwanStudios Logo                        [Profile] [Logout]     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Complete Your Onboarding Questionnaire             │
│                                                                 │
│  ┌──────────────────────── Progress Bar ─────────────────────┐ │
│  │ [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 35% Complete  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Section Navigation (13 Sections)                           ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  ✅ 1. Personal Info      ⏸️ 8. Injury History            ││
│  │  ✅ 2. Goals & Package    ⏸️ 9. Movement Limitations      ││
│  │  ✅ 3. Health History     ⏸️ 10. Training Preferences     ││
│  │  ✅ 4. Medications        ⏸️ 11. Accountability           ││
│  │  🔵 5. Nutrition (Active) ⏸️ 12. Success Metrics          ││
│  │  ⏸️ 6. Lifestyle          ⏸️ 13. Additional Notes         ││
│  │  ⏸️ 7. Fitness Experience                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Section 5: Nutrition Preferences (7 questions)             ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  1. Do you have any dietary restrictions?                  ││
│  │     ☑ Vegetarian  ☐ Vegan  ☐ Pescatarian  ☐ None          ││
│  │                                                             ││
│  │  2. Do you have food allergies?                            ││
│  │     ☐ Dairy  ☐ Gluten  ☐ Nuts  ☑ Shellfish  ☐ None        ││
│  │                                                             ││
│  │  3. How many meals do you currently eat per day?           ││
│  │     ○ 1-2  ● 3  ○ 4-5  ○ 6+                                ││
│  │                                                             ││
│  │  4. Do you currently track your food intake?               ││
│  │     ● Yes, with an app (MyFitnessPal, etc.)                ││
│  │     ○ Yes, manually (journal)                              ││
│  │     ○ No, but willing to start                             ││
│  │     ○ No, not interested                                   ││
│  │                                                             ││
│  │  5. How would you rate your current nutrition knowledge?   ││
│  │     ┌───────────────────────────────────────┐              ││
│  │     │ ●───────────────────────────────────  │ 7/10         ││
│  │     └───────────────────────────────────────┘              ││
│  │     Beginner ←─────────────────────→ Expert                ││
│  │                                                             ││
│  │  6. Are you willing to meal prep?                          ││
│  │     ● Yes, 1-2 days ahead                                  ││
│  │     ○ Yes, full week                                       ││
│  │     ○ Maybe, need guidance                                 ││
│  │     ○ No, prefer daily cooking                             ││
│  │                                                             ││
│  │  7. Additional nutrition notes (optional):                 ││
│  │     ┌───────────────────────────────────────────────────┐  ││
│  │     │ I'm lactose intolerant but can do whey isolate.  │  ││
│  │     │ Prefer high-protein meals. Hate broccoli.        │  ││
│  │     │                                                   │  ││
│  │     └───────────────────────────────────────────────────┘  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [< Previous: Medications]      [Next: Lifestyle >]         ││
│  │                      [Save Draft]                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
✅ = Section complete
🔵 = Current section (in progress)
⏸️ = Section pending
```

### Section 2: Goals & Package (Critical Indexed Fields)

```
┌─────────────────────────────────────────────────────────────────┐
│  Section 2: Goals & Package (8 questions)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. What is your PRIMARY fitness goal? *Required               │
│     ● Weight loss                                              │
│     ○ Muscle gain                                              │
│     ○ Athletic performance                                     │
│     ○ General health & wellness                                │
│     ○ Injury rehabilitation                                    │
│     ○ Postpartum recovery                                      │
│                                                                 │
│  2. Which training package did you purchase? *Required         │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ ● Signature 60 - AI Data Package ($200/session)        ││
│     │   ✓ 60-minute sessions                                 ││
│     │   ✓ 85-question onboarding                             ││
│     │   ✓ Movement screen assessment                         ││
│     │   ✓ AI-powered workout plans                           ││
│     │   ✓ Nutrition tracking & guidance                      ││
│     │   ✓ Progress photos & measurements                     ││
│     └─────────────────────────────────────────────────────────┘│
│     ○ Signature 60 - Standard ($175/session)                   │
│     ○ Express 30 ($110/session)                                │
│     ○ Transformation Pack ($1,600/10 sessions)                 │
│                                                                 │
│  3. How committed are you to achieving your goal? *Required   │
│     ┌───────────────────────────────────────┐                  │
│     │ Very High ●───────────○─────────────  │ High             │
│     └───────────────────────────────────────┘                  │
│     Low ←─────────────────────────────→ Very High              │
│                                                                 │
│     Auto-extracted as "commitmentLevel": "high"                │
│                                                                 │
│  4. Target weight loss/gain (if applicable):                   │
│     ┌──────┐ lbs  ○ Loss  ● Gain                              │
│     │  15  │                                                   │
│     └──────┘                                                   │
│                                                                 │
│  5. Ideal timeline to reach your goal:                         │
│     ○ 1-3 months                                               │
│     ● 3-6 months                                               │
│     ○ 6-12 months                                              │
│     ○ 12+ months                                               │
│                                                                 │
│  6. What motivates you most? (Select all that apply)           │
│     ☑ Improved energy levels                                   │
│     ☑ Looking better in clothes                                │
│     ☑ Health/longevity                                         │
│     ☐ Athletic performance                                     │
│     ☐ Confidence boost                                         │
│     ☐ Setting example for family                               │
│                                                                 │
│  7. Biggest obstacle to achieving your goal?                   │
│     ┌───────────────────────────────────────────────────────┐  │
│     │ Time constraints - busy work schedule & kids.        │  │
│     └───────────────────────────────────────────────────────┘  │
│                                                                 │
│  8. Have you worked with a personal trainer before?            │
│     ○ Yes, multiple times                                      │
│     ● Yes, once                                                │
│     ○ No, this is my first time                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Auto-Extracted Indexed Fields:
- primaryGoal: "weight_loss"
- trainingTier: "signature_60_ai"
- commitmentLevel: "high"
```

### Final Submission Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              🎉 You're Almost Done!                             │
│                                                                 │
│  ┌──────────────────────── Progress Bar ─────────────────────┐ │
│  │ [███████████████████████████████████████████] 100% Complete│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Review Your Responses:                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✅ Section 1: Personal Info (7 questions)                 ││
│  │  ✅ Section 2: Goals & Package (8 questions)               ││
│  │  ✅ Section 3: Health History (9 questions)                ││
│  │  ✅ Section 4: Medications (4 questions)                   ││
│  │  ✅ Section 5: Nutrition Preferences (7 questions)         ││
│  │  ✅ Section 6: Lifestyle & Schedule (6 questions)          ││
│  │  ✅ Section 7: Fitness Experience (8 questions)            ││
│  │  ✅ Section 8: Injury History (9 questions)                ││
│  │  ✅ Section 9: Movement Limitations (5 questions)          ││
│  │  ✅ Section 10: Training Preferences (8 questions)         ││
│  │  ✅ Section 11: Accountability (6 questions)               ││
│  │  ✅ Section 12: Success Metrics (6 questions)              ││
│  │  ✅ Section 13: Additional Notes (2 questions)             ││
│  │                                                             ││
│  │  Total: 85 questions answered                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  By submitting, you agree to share this information with        │
│  your assigned trainer for personalized programming.            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │         [< Back to Review]    [Submit Questionnaire]        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

On Submit:
→ POST /api/onboarding/:userId/questionnaire
→ Auto-extract: primaryGoal, trainingTier, commitmentLevel, healthRisk, nutritionPrefs
→ Set status: "submitted"
→ Redirect to: /dashboard with success message
```

---


## Onboarding Progress Component

### Client Dashboard Banner (Incomplete Onboarding)

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Dashboard - Welcome, John!                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ⚠️  Complete Your Onboarding Profile                      ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  You're 50% done! Complete the remaining steps to unlock   ││
│  │  your personalized AI-powered training plan.               ││
│  │                                                             ││
│  │  ┌──────────────────── Progress Bar ─────────────────────┐ ││
│  │  │ [████████████████████░░░░░░░░░░░░░░░░░] 50% Complete  │ ││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                             ││
│  │  ✅ Step 1: Onboarding Questionnaire (Completed)           ││
│  │     Submitted on Jan 15, 2026                              ││
│  │                                                             ││
│  │  ⏸️ Step 2: Movement Screen Assessment (Pending)           ││
│  │     📅 [Schedule Your Movement Screen]                     ││
│  │     Takes 10 minutes with your trainer                     ││
│  │                                                             ││
│  │  ⏸️ Step 3: Personalized AI Workout Plan (Locked)          ││
│  │     Unlocks after movement screen completion               ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Client Dashboard (100% Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Dashboard - Welcome, John!                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✅ Onboarding Complete!                                    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  Your profile is 100% complete. Your AI-powered training   ││
│  │  plan is ready to go!                                      ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │  Primary Goal: Weight Loss                          │   ││
│  │  │  Training Package: Signature 60 AI Data             │   ││
│  │  │  Movement Score: 7.5/10 (Good mobility)             │   ││
│  │  │  Commitment Level: High                             │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  [View Full Onboarding Profile] [Start First Workout]      ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Onboarding Progress Component (Compact Widget)

```
┌─────────────────────────────────────────────────────────────────┐
│  Onboarding Progress                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────── Progress Bar ─────────────────────────┐  │
│  │ [████████████████████████████████████████] 100% Complete  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Section Completion Badges (13 sections):                       │
│                                                                 │
│  ✅ Personal Info       ✅ Injury History                       │
│  ✅ Goals & Package     ✅ Movement Limitations                 │
│  ✅ Health History      ✅ Training Preferences                 │
│  ✅ Medications          ✅ Accountability                       │
│  ✅ Nutrition           ✅ Success Metrics                       │
│  ✅ Lifestyle           ✅ Additional Notes                      │
│  ✅ Fitness Experience                                          │
│                                                                 │
│  ✅ Movement Screen: 7.5/10 (Completed Jan 15, 2026)            │
│                                                                 │
│  [View Questionnaire Responses] [Edit Profile]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

