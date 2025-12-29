# Real Client Example Walkthroughs
**SwanStudios Personal Training System v3.0**
**Purpose:** Step-by-step walkthroughs using realistic client scenarios
**Last Updated:** 2025-11-05
**Version:** 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Example 1: Sarah - Weight Loss Journey](#example-1-sarah-weight-loss-journey)
3. [Example 2: Marcus - Strength & Muscle Gain](#example-2-marcus-strength-muscle-gain)
4. [Example 3: Linda - Post-Injury Rehabilitation](#example-3-linda-post-injury-rehabilitation)
5. [Example 4: Tyler - Teen Athlete (Minor)](#example-4-tyler-teen-athlete-minor)
6. [Example 5: Emma - Busy Professional (AI-Heavy)](#example-5-emma-busy-professional-ai-heavy)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

This guide provides **complete, realistic client scenarios** that demonstrate every aspect of the SwanStudios Personal Training System v3.0. Each example walks through:

- Initial consultation and questionnaire
- Consent management
- Master Prompt creation
- Training program design
- Progress tracking
- AI coaching integration
- UI dashboard visualization
- Real-world challenges and solutions

**Use these examples to:**
- Understand the full client lifecycle
- Train new trainers or assistants
- Troubleshoot common issues
- Demonstrate the system to potential clients

---

## Example 1: Sarah - Weight Loss Journey

### Client Profile
- **Name:** Sarah Mitchell
- **Age:** 34
- **Gender:** Female
- **Primary Goal:** Weight loss (lose 30 lbs in 6 months)
- **Fitness Level:** Beginner
- **Occupation:** Marketing Manager (desk job)
- **Motivation:** Wedding in 6 months, wants to feel confident in dress
- **Challenges:** Stress eating, inconsistent gym attendance, past yo-yo dieting

### Day 1: Initial Consultation

**1. Pre-Consultation Prep**
- Sarah found SwanStudios via Instagram ad
- Filled out online contact form
- Received welcome email with consultation scheduler link

**2. Consultation Session (60 minutes)**

**Minutes 0-15: Introduction & Rapport Building**
- Trainer: "Tell me about your fitness journey so far."
- Sarah shares past diet attempts (Weight Watchers, keto, intermittent fasting)
- Notes failed attempts due to: too restrictive, couldn't sustain, regained weight
- Trainer asks: "What would make THIS time different?"
- Sarah: "I need accountability and someone to customize it to my life."

**Minutes 15-30: Goals & Motivation Deep Dive**
- Trainer uses questionnaire as conversation guide
- Key insights:
  - Primary goal: 30 lb weight loss (195 lbs → 165 lbs)
  - Why it matters: "I want to walk down the aisle feeling beautiful, not self-conscious"
  - Success vision: "Fitting into a size 8 dress, having energy all day, not hating photos"
  - Timeline: 6 months (wedding date: July 15, 2025)
  - Commitment level: 8/10 ("Wedding is great motivation, but I want this for me long-term")

**Minutes 30-45: Health & Medical Screening**
- Medical conditions: None
- Medications: Birth control pill
- Injuries: None currently, history of ankle sprain (fully healed)
- Current pain: Lower back stiffness from desk work (3/10 intensity)
- Doctor cleared: Yes (recent physical, all labs normal)
- Sleep: 6-7 hours/night (poor quality, wakes up tired)
- Stress: 7/10 (work deadlines, wedding planning)

**Minutes 45-60: Lifestyle & Logistics**
- Current activity: Walks occasionally, no structured exercise
- Gym: Has gym membership (rarely uses it)
- Availability: 3x/week sessions (Mon/Wed/Fri at 6pm preferred)
- Nutrition: "I eat okay during the week, but weekends are bad. Wine and takeout."
- Tracking: Willing to try food tracking (never done it before)
- Budget: Can afford Golden tier ($200/month, 3 sessions/week)

**3. Consent Forms (15 minutes after consultation)**
- Trainer provides Consent Information Packet
- Reviews each form:
  - ✅ General Training Services Consent (signed)
  - ✅ Medical Information Consent (signed)
  - ✅ Progress Photos - Personal Use Only (signed)
  - ✅ AI Coaching Consent - Text check-ins only (signed)
  - ❌ Marketing Use of Photos (Sarah DECLINES - "I'm self-conscious now, ask me in 3 months")
- Trainer: "Perfect! We can revisit the marketing photos later if you feel more comfortable."

**4. First Session Scheduled**
- Booked: Monday, Jan 20, 2025 at 6:00 PM
- Homework before first session:
  - Download MyFitnessPal, track food for 3 days
  - Take baseline progress photos at home (private)
  - Wear athletic clothes and bring water bottle

---

### Day 2: Creating Sarah's Master Prompt

**Trainer's Workflow:**

**Step 1: Create Client Folder**
```bash
cd client-data
mkdir SARAH-MITCHELL
cd SARAH-MITCHELL
mkdir workouts nutrition photos notes consent progress-reports
```

**Step 2: Copy and Fill Master Prompt Template**
- Copy `templates/MASTER-PROMPT-TEMPLATE.json`
- Rename to `SARAH-MITCHELL-MASTER-PROMPT-v1.0.json`
- Fill in all data from consultation

**Completed Master Prompt (Excerpt):**
```json
{
  "version": "3.0",
  "client": {
    "name": "Sarah Mitchell",
    "preferredName": "Sarah",
    "age": 34,
    "gender": "Female",
    "bloodType": "O+",
    "contact": {
      "phone": "555-0198",
      "email": "sarah.mitchell@email.com",
      "preferredTime": "Evening"
    }
  },
  "measurements": {
    "height": { "feet": 5, "inches": 6 },
    "currentWeight": 195,
    "targetWeight": 165,
    "bodyFatPercentage": 32,
    "lastDexaScan": null
  },
  "goals": {
    "primary": "Weight loss",
    "why": "Wedding in 6 months - want to feel confident and beautiful in my dress, not self-conscious in photos",
    "successLooksLike": "Fitting into a size 8 dress, having energy all day, feeling strong and proud of my body",
    "timeline": "6 months",
    "commitmentLevel": 8,
    "pastObstacles": "Restrictive diets (keto, IF) were unsustainable. No accountability. Stress eating on weekends. Regained weight after every diet.",
    "supportNeeded": "Accountability, customized plan that fits my lifestyle, help with stress eating, consistent check-ins"
  },
  "health": {
    "medicalConditions": [],
    "underDoctorCare": false,
    "doctorCleared": true,
    "medications": [
      { "name": "Birth control pill", "dosage": "30mcg", "frequency": "Daily" }
    ],
    "supplements": [],
    "injuries": [
      {
        "year": 2022,
        "bodyPart": "Left ankle",
        "type": "Sprain (grade 2)",
        "status": "Fully healed"
      }
    ],
    "surgeries": [],
    "currentPain": [
      {
        "bodyPart": "Lower back",
        "intensity": 3,
        "duration": "6 months (chronic)",
        "triggers": "Sitting at desk all day, poor posture",
        "relieves": "Stretching, walking",
        "affectsDailyLife": false
      }
    ]
  },
  "nutrition": {
    "currentDiet": "Average",
    "tracksFood": false,
    "trackingApp": null,
    "dailyProtein": 60,
    "targetProtein": 130,
    "waterIntake": 40,
    "eatingSchedule": {
      "breakfast": "7:00 AM (coffee, maybe toast)",
      "lunch": "12:30 PM (salad or sandwich)",
      "dinner": "7:30 PM (varies - healthy weekdays, takeout weekends)",
      "snacks": 2
    },
    "bloodTypeDiet": false,
    "dietaryPreferences": ["Flexible"],
    "allergies": [],
    "lovesFood": ["Sushi", "Greek food", "Dark chocolate", "Coffee"],
    "hatesFood": ["Mushrooms", "Olives"],
    "cooksAtHome": "Sometimes",
    "mealPrepInterest": true
  },
  "lifestyle": {
    "sleepHours": 6.5,
    "sleepQuality": "Fair",
    "stressLevel": 7,
    "stressSources": "Work deadlines, wedding planning, family expectations",
    "occupation": "Marketing Manager",
    "workActivityLevel": "Sedentary",
    "smokes": false,
    "alcoholConsumption": "Moderate (2-3 glasses wine on weekends)"
  },
  "training": {
    "fitnessLevel": "Beginner",
    "currentlyWorkingOut": false,
    "workoutsPerWeek": 0,
    "workoutTypes": "Occasional walks",
    "pastExperience": ["Gym machines (years ago)", "Group fitness classes (tried once)"],
    "previousTrainer": false,
    "previousTrainerExperience": null,
    "gymLocation": "LA Fitness (5 min from home)",
    "favoriteExercises": ["Walking", "Yoga (tried once, loved it)"],
    "dislikedExercises": ["Running (knee pain)", "Burpees (too hard)"],
    "preferredStyle": ["Moderate weights", "Functional"],
    "sessionFrequency": 3,
    "sessionDuration": "60 min"
  },
  "baseline": {
    "cardiovascular": {
      "restingHeartRate": 76,
      "bloodPressure": { "systolic": 118, "diastolic": 75 }
    },
    "strength": {
      "benchPress": { "weight": 0, "reps": 0 },
      "squat": { "weight": 0, "reps": 0 },
      "deadlift": { "weight": 0, "reps": 0 },
      "overheadPress": { "weight": 0, "reps": 0 },
      "pullUps": { "reps": 0, "assisted": true }
    },
    "rangeOfMotion": {
      "shoulderFlexion": { "left": 170, "right": 165, "normal": 180 },
      "shoulderAbduction": { "left": 170, "right": 170, "normal": 180 },
      "hipFlexion": { "left": 100, "right": 100, "normal": 120 },
      "hipExtension": { "left": 15, "right": 15, "normal": 20 },
      "ankleDorsiflexion": { "left": 20, "right": 18, "normal": 20 }
    },
    "flexibility": {
      "sitAndReach": 12,
      "shoulderMobility": false,
      "hipMobility": false
    }
  },
  "aiCoaching": {
    "dailyCheckIns": true,
    "checkInTime": "8:00 PM",
    "checkInMethod": "Text",
    "aiHelp": [
      "Daily accountability",
      "Nutrition tracking reminders",
      "Stress eating check-ins",
      "Workout reminders",
      "Weekend support (high-risk time)"
    ],
    "communicationStyle": "Warm",
    "motivationStyle": "Compassion",
    "progressReportFrequency": "Weekly"
  },
  "visualDiagnostics": {
    "comfortableWithPhotos": true,
    "painPhotos": false,
    "wearable": "Apple Watch",
    "wearableIntegration": true
  },
  "package": {
    "tier": "Golden",
    "price": 200,
    "sessionsPerWeek": 3,
    "commitment": "6-month",
    "paymentMethod": "Monthly"
  },
  "notes": {
    "anythingElse": "Self-conscious about body. Needs gentle encouragement, not drill-sergeant approach. Very analytical (marketing background), responds well to data and progress tracking.",
    "mostExcitedAbout": "Having a plan that actually works, seeing real progress, feeling confident at the wedding",
    "nervousAbout": "Failing again, not being able to stick with it, being judged at the gym",
    "questionsForTrainer": "How fast can I realistically lose 30 lbs? Will I have loose skin? Can I still have wine on weekends?"
  },
  "trainerAssessment": {
    "healthRisk": "Low",
    "doctorClearanceNeeded": false,
    "priorityAreas": "Build workout habit first (adherence), address lower back pain with core work, teach sustainable nutrition (not restrictive), weekend stress eating strategy",
    "recommendedFrequency": 3,
    "recommendedTier": "Golden"
  },
  "metadata": {
    "intakeDate": "2025-01-15",
    "firstSessionDate": "2025-01-20",
    "createdBy": "SwanStudios Personal Training System v3.0",
    "lastUpdated": "2025-01-15"
  }
}
```

**Step 3: Validate Master Prompt**
```bash
# Validate against schema
node scripts/validate-master-prompt.js SARAH-MITCHELL/SARAH-MITCHELL-MASTER-PROMPT-v1.0.json

# Output:
✅ Master Prompt is valid!
✅ All required fields present
✅ Data types correct
✅ Commitment level in range (8/10)
```

**Step 4: Generate Consent Summary**
Create `SARAH-MITCHELL/consent/consent-summary.md`:
```markdown
# Consent Summary: Sarah Mitchell
**Last Updated:** 2025-01-15
**Next Review:** 2025-04-15

## Active Consents
- [x] General Training Services (signed: 2025-01-15)
- [x] Medical Information Collection (signed: 2025-01-15)
- [x] Progress Photos - Personal Use Only (signed: 2025-01-15)
- [x] AI Coaching - Text check-ins at 8 PM (signed: 2025-01-15)
- [x] Apple Health Integration (signed: 2025-01-15)
- [ ] Marketing Use of Photos (DECLINED - revisit in 3 months)

## Special Considerations
- Client is self-conscious about photos - NO marketing use until she feels ready
- Prefers "warm, compassionate" communication style (not drill-sergeant)
- Wedding motivation is strong but wants sustainable long-term change
- High risk for weekend stress eating - AI should check in Fri/Sat/Sun evenings

## Next Actions
- [ ] Quarterly review due: 2025-04-15
- [ ] Revisit marketing consent around Month 3 (April 2025)
- [ ] Annual renewal due: 2026-01-15
```

---

### Week 1: First Session & Baseline Testing

**Session 1 (Jan 20, 2025):**

**Warm-Up (10 min):**
- Treadmill walk: 5 min at 3.0 mph
- Dynamic stretches: Arm circles, leg swings, torso twists

**Baseline Assessments (20 min):**
- Resting heart rate: 76 bpm
- Blood pressure: 118/75 (normal)
- Body measurements:
  - Weight: 195 lbs
  - Waist: 36 inches
  - Hips: 44 inches
  - Chest: 40 inches
  - Thigh: 26 inches
- Photos: Front, side, back (Sarah takes her own in private changing room)
- Strength tests (modified for beginner):
  - Goblet squat: 15 lbs × 10 reps (good form)
  - Dumbbell chest press: 10 lbs × 8 reps
  - Assisted pull-up machine: 120 lbs assistance × 3 reps
  - Plank hold: 25 seconds

**Training Intro (25 min):**
- Teach foundational movements:
  - Bodyweight squat (focus on form)
  - Push-up (modified on knees)
  - Dumbbell row
  - Glute bridge (for lower back pain)
- Circuit format (3 rounds):
  - Goblet squat: 15 lbs × 10 reps
  - Knee push-ups: 8 reps
  - Dumbbell row: 15 lbs × 10 reps each arm
  - Glute bridge: 12 reps
  - Rest: 90 seconds between rounds
- Sarah's feedback: "That was hard but doable! I feel accomplished."

**Cool-Down & Education (5 min):**
- Stretching: Lower back, hips, shoulders
- Trainer explains the plan:
  - "We'll do 3 sessions/week. Focus first 4 weeks: building the HABIT of showing up."
  - "Nutrition: Start by hitting 130g protein/day. Don't restrict calories yet—let's build awareness first."
  - "AI check-ins: You'll get a text at 8 PM asking about your day, food, energy. Be honest!"

**Post-Session:**
- Trainer logs session in `workouts/2025-01-20-session-1.md`
- Updates baseline data in Master Prompt
- Sets up AI check-in automation

---

### Week 1-4: Habit Formation Phase

**Training Focus:**
- Build gym attendance habit (3x/week consistency)
- Learn fundamental movement patterns
- Address lower back pain with core work
- Gradually increase workout intensity

**Nutrition Focus:**
- Track food 5 days/week (MyFitnessPal)
- Hit 130g protein daily
- Drink 80 oz water daily
- NO calorie restriction yet (build habits first)

**AI Check-In Example (Jan 21, 8:00 PM):**
```
AI: Hey Sarah! How was your day? Did you hit your protein goal today? 💪

Sarah: Good! Got to 125g protein. Close!

AI: Awesome job! That's so close to 130g. What did you eat today?

Sarah: Breakfast: Greek yogurt. Lunch: chicken salad. Dinner: salmon and veggies. Snack: protein shake.

AI: Nice! Love the salmon. How's your energy level today (1-10)?

Sarah: 7/10. Feel good after yesterday's workout!

AI: That's great! Your body is responding well. Any soreness?

Sarah: Legs a little sore but in a good way.

AI: Perfect! That's normal. Make sure to stretch tonight. See you Wednesday at the gym! 🎯

Sarah: Thanks! 😊
```

**Week 4 Results:**
- Sessions attended: 12/12 (100% adherence!)
- Avg protein: 128g/day (goal: 130g) ✅
- Water intake: 70 oz/day (goal: 80 oz) - Still improving
- Weight: 192 lbs (-3 lbs from baseline)
- Energy: Improved from 6/10 to 8/10
- Lower back pain: Down from 3/10 to 1/10 (core work helping!)

**Trainer Notes:**
- Sarah is CRUSHING adherence. Build on this momentum.
- Ready to add calorie tracking in Week 5.
- Strength improving—can increase weights next week.

---

### Month 2: Calorie Deficit Introduction

**Nutrition Adjustment (Week 5):**
- Calculate Sarah's calorie needs:
  - BMR: ~1,550 cal/day
  - TDEE (sedentary + 3x workouts): ~2,100 cal/day
  - Target: 1,600 cal/day (500 cal deficit = ~1 lb/week loss)
- New targets: 1,600 cal, 130g protein, 180g carbs, 50g fat

**Training Progression:**
- Increase weights by 5-10 lbs on major lifts
- Add HIIT cardio finisher (10 min) after strength work
- Introduce supersets to increase intensity

**Challenge: Weekend Stress Eating (Week 6):**
- Sarah texts AI on Saturday night: "Had a rough day. Ate a whole pizza and wine. Feel terrible."
- AI response:
  ```
  AI: Thanks for being honest, Sarah. Rough days happen! 💙

  Let's learn from it: What triggered the pizza and wine?

  Sarah: Wedding planning fight with my fiancé. Stressed and emotional.

  AI: That makes sense. Emotions are tough. Next time you feel that way,
  what's ONE thing you could do BEFORE reaching for food? (Call a friend,
  go for a walk, journal?)

  Sarah: Maybe go for a walk or call my sister.

  AI: Perfect. Let's try that next time. Remember: ONE bad day doesn't undo
  all your progress. You're down 6 lbs and killing it at the gym. Tomorrow is
  a new day. ❤️

  Sarah: Thank you. I needed that.
  ```

**Month 2 Results:**
- Weight: 186 lbs (-9 lbs total)
- Body fat: 30% (down from 32%)
- Adherence: 11/12 sessions (missed one due to work trip)
- Calorie average: 1,650 cal/day (on target!)
- Strength gains:
  - Goblet squat: 30 lbs × 12 reps (was 15 lbs × 10)
  - Chest press: 20 lbs × 10 reps (was 10 lbs × 8)
  - Plank: 60 seconds (was 25 seconds)

---

### Month 3: Mid-Point Check & Consent Revisit

**Progress Review (April 15, 2025):**
- Weight: 180 lbs (-15 lbs total, halfway to goal!)
- Photos: Side-by-side comparison shows visible difference
- Measurements:
  - Waist: 33 inches (was 36, -3 inches!)
  - Hips: 41 inches (was 44, -3 inches)
  - Thigh: 24 inches (was 26, -2 inches)
- Dress fitting: Went from size 12 → size 10 (goal: size 8)

**Sarah's Reaction:**
"Oh my god! I can actually SEE the difference! I'm so proud of myself!"

**Trainer:** "You should be! You've been so consistent. Remember when you said you were nervous about failing again? You've CRUSHED that fear. Want to revisit the marketing consent? Your transformation is inspiring!"

**Sarah:** "You know what? Yes. I want to help other women who feel how I used to feel. You can use my photos."

**Updated Consent:**
- ✅ Marketing Use of Photos (signed: 2025-04-15)
- Approved uses: Instagram, website testimonials
- Sarah requests: "Please mention the wedding context—it's relatable!"

**File:** `consent/marketing-consent-history.md`
```markdown
## Marketing Consent Changes

**2025-04-15: Marketing Consent GRANTED**
- Client initially declined on 2025-01-15 (self-conscious)
- After 3 months and 15 lbs lost, client felt confident and consented
- Approved uses: Instagram before/after posts, website testimonial
- Special request: Mention wedding motivation in caption
```

---

### Months 4-6: Final Push to Wedding

**Challenges:**
- **Plateau (Month 4):** Weight stuck at 178 lbs for 2 weeks
  - Solution: Refeed day (2,200 calories) once per week, increase NEAT (steps)
  - Result: Weight started dropping again
- **Stress (Month 5):** Wedding planning intensified
  - Solution: Extra AI check-ins, focus on "maintenance not perfection"
- **Taper (Month 6):** Week before wedding, reduce intensity to avoid soreness
  - Light cardio, stretching, recovery-focused

**Final Results (July 10, 2025 - 5 days before wedding):**
- Weight: 167 lbs (-28 lbs total, 2 lbs from goal)
- Body fat: 26% (down from 32%)
- Dress size: 8 (GOAL ACHIEVED!)
- Energy: 9/10 (up from 6/10)
- Lower back pain: 0/10 (RESOLVED!)
- Strength gains:
  - Goblet squat: 50 lbs × 15 reps
  - Chest press: 30 lbs × 12 reps
  - Pull-ups: 3 unassisted (was 0!)
  - Plank: 2 minutes

**Sarah's Testimonial (posted on Instagram):**
> "6 months ago I started training with @SwanStudios because I wanted to feel confident at my wedding. I lost 28 lbs, but I gained so much more: strength, energy, discipline, and self-love. I used to be terrified of the gym. Now I LOVE it. Thank you for believing in me when I didn't believe in myself. If you're on the fence about starting, DO IT. You deserve to feel this good. 💪❤️"

**Wedding Day (July 15, 2025):**
- Sarah sends trainer a photo in her dress: "I FEEL AMAZING! Thank you for everything!"

**Post-Wedding Plan:**
- Transition to maintenance phase (2,000 cal/day)
- Continue 3x/week training (focus: strength building, muscle gain)
- New goal: First pull-up unassisted (already achieved!), now goal: 10 pull-ups

---

## Example 2: Marcus - Strength & Muscle Gain

### Client Profile
- **Name:** Marcus Johnson
- **Age:** 28
- **Gender:** Male
- **Primary Goal:** Build muscle and increase strength
- **Fitness Level:** Intermediate
- **Occupation:** Software Engineer
- **Motivation:** "Tired of being the skinny guy. Want to feel strong and look athletic."
- **Challenges:** Struggles to eat enough calories (fast metabolism), inconsistent gym routine

### Master Prompt Highlights (Abbreviated)
```json
{
  "client": {
    "name": "Marcus Johnson",
    "preferredName": "Marcus",
    "age": 28,
    "gender": "Male"
  },
  "measurements": {
    "height": { "feet": 6, "inches": 1 },
    "currentWeight": 165,
    "targetWeight": 185,
    "bodyFatPercentage": 12
  },
  "goals": {
    "primary": "Muscle gain",
    "why": "Want to feel confident, look athletic, and be the strong guy",
    "successLooksLike": "Gain 20 lbs of muscle, bench press 225 lbs, look good in a T-shirt",
    "timeline": "1 year",
    "commitmentLevel": 9
  },
  "nutrition": {
    "currentDiet": "Poor (skips meals, not enough protein)",
    "dailyProtein": 80,
    "targetProtein": 180,
    "cooksAtHome": "Rarely",
    "mealPrepInterest": false
  },
  "training": {
    "fitnessLevel": "Intermediate",
    "currentlyWorkingOut": true,
    "workoutsPerWeek": 4,
    "pastExperience": ["Weight training (3 years, inconsistent)", "Basketball (high school)"],
    "favoriteExercises": ["Bench press", "Deadlift", "Pull-ups"],
    "preferredStyle": ["Heavy weights", "Strength"]
  },
  "baseline": {
    "strength": {
      "benchPress": { "weight": 135, "reps": 8 },
      "squat": { "weight": 185, "reps": 6 },
      "deadlift": { "weight": 225, "reps": 5 }
    }
  },
  "aiCoaching": {
    "dailyCheckIns": true,
    "checkInTime": "9:00 PM",
    "checkInMethod": "Text",
    "aiHelp": ["Calorie tracking reminders", "Meal prep motivation", "Protein intake tracking"],
    "communicationStyle": "Direct",
    "motivationStyle": "Show data"
  },
  "package": {
    "tier": "Rhodium",
    "price": 400,
    "sessionsPerWeek": 5,
    "commitment": "1-year"
  }
}
```

### Training Approach

**Program: Classic Bodybuilding Split**
- Monday: Chest + Triceps
- Tuesday: Back + Biceps
- Wednesday: Rest
- Thursday: Shoulders + Abs
- Friday: Legs
- Saturday: Rest or optional cardio
- Sunday: Rest

**Nutrition Strategy:**
- Calorie surplus: 3,200 cal/day (+500 over maintenance)
- Macros: 180g protein, 400g carbs, 90g fat
- Challenge: Marcus forgets to eat
- Solution: AI sends meal reminders at breakfast, lunch, dinner times

**AI Check-In Example:**
```
AI (12:00 PM): Marcus! Lunchtime. Did you eat yet?

Marcus: Not yet, working on a bug.

AI: Code can wait. Your gains can't. 💪 What's the plan for lunch?

Marcus: I'll grab Chipotle.

AI: Perfect. Get a bowl: double chicken, rice, beans, guac. That's 70g protein right there. GO.

Marcus (12:45 PM): Done. Double chicken bowl. 👍

AI: LEGEND. That's 70g down, 110g to go today. Dinner: another 60g. Snacks: 50g. You got this.
```

### 6-Month Results
- Weight: 165 lbs → 182 lbs (+17 lbs)
- Body fat: 12% → 14% (minimal fat gain, mostly muscle)
- Bench press: 135 lbs × 8 → 205 lbs × 5 (goal: 225 lbs)
- Squat: 185 lbs × 6 → 275 lbs × 5
- Deadlift: 225 lbs × 5 → 315 lbs × 5
- Pull-ups: 8 → 15

---

## Example 3: Linda - Post-Injury Rehabilitation

### Client Profile
- **Name:** Linda Chen
- **Age:** 52
- **Gender:** Female
- **Primary Goal:** Pain relief and functional strength post-knee surgery
- **Fitness Level:** Beginner-Intermediate (was active before injury)
- **Occupation:** School Teacher
- **Medical:** ACL reconstruction (right knee) 6 months ago, cleared by orthopedic surgeon
- **Motivation:** "I want to hike with my grandkids again without pain."

### Special Considerations

**Doctor Clearance:**
- Required before starting training
- Received detailed clearance letter from Dr. Sarah Patel, MD (orthopedic surgeon)
- Restrictions:
  - No impact activities (running, jumping) for 3 more months
  - Avoid deep knee flexion beyond 90 degrees for 1 month
  - Progress quad strengthening gradually
- Clearance letter stored in `notes/medical-clearance.pdf`

**Consent Management:**
- Extra consent form: "Post-Surgical Training Acknowledgment"
- Trainer consulted with Linda's physical therapist (with Linda's written consent)
- Coordination documented in `consent/third-party-sharing-log.md`:
  ```markdown
  ## Medical Provider Coordination
  - **Dr. Sarah Patel, MD (Orthopedic Surgeon):** Received training plan on 2025-02-15
    - HIPAA authorization signed: 2025-02-15
    - Purpose: Ensure training aligns with post-surgical protocol
  - **John Lee, PT (Physical Therapist):** Weekly coordination calls
    - HIPAA authorization signed: 2025-02-15
    - Purpose: Smooth transition from PT to strength training
  ```

### Training Approach

**Phase 1 (Months 1-2): Foundation & Pain-Free Movement**
- Focus: Quad strengthening, range of motion, balance
- Exercises: Leg press (limited ROM), step-ups, glute bridges, wall sits
- Frequency: 2x/week with trainer, 3x/week home exercises

**Phase 2 (Months 3-4): Progressive Overload**
- Add: Goblet squats (to 90 degrees), Romanian deadlifts, single-leg work
- Frequency: 3x/week

**Phase 3 (Months 5-6): Return to Function**
- Add: Walking lunges, step-downs, light plyometrics (surgeon approved)
- Goal: Hike 5 miles with grandkids by Month 6

**Pain Tracking:**
- Linda uses AI check-ins to report knee pain daily
- AI asks: "How's your knee today? (0-10 pain scale)"
- Data tracked in `notes/pain-tracking-log.md`
- If pain >3/10, trainer adjusts next workout

### 6-Month Results
- Knee pain: 6/10 → 1/10 (hiking only)
- Quad strength: Right leg 60% of left → 90% of left
- Balance: Single-leg stance 10 seconds → 45 seconds
- Functional goal: Completed 5-mile hike with grandkids (NO pain!)
- Linda: "I feel like myself again. Thank you!"

---

## Example 4: Tyler - Teen Athlete (Minor)

### Client Profile
- **Name:** Tyler Williams
- **Age:** 16
- **Gender:** Male
- **Primary Goal:** Improve basketball performance (vertical jump, speed)
- **Fitness Level:** Intermediate (plays varsity basketball)
- **Parent/Guardian:** Karen Williams (mom)
- **Motivation:** "Want to get a basketball scholarship. Need to train like the pros."

### Minor Client Workflow

**Step 1: Parental Consent**
- Both parent AND teen attend initial consultation
- Parent signs:
  - Minor Parental Consent Form
  - General Training Services Consent
  - Medical Information Consent (parent provides medical history)
- Teen signs:
  - Minor Acknowledgment Form ("I agree to follow my trainer's instructions")

**Step 2: Doctor Clearance**
- Required for all minors starting athletic training
- Tyler's pediatrician provides clearance: "Tyler is healthy and cleared for athletic training. No restrictions."

**Step 3: Parental Involvement**
- Mom receives weekly progress reports via email
- Mom has access to all training data
- AI check-ins CC mom on key messages
- Special note in Master Prompt:
  ```json
  "notes": {
    "anythingElse": "Minor client - parent (Karen) receives all progress reports. Mom is very supportive but wants to ensure safety. Tyler is motivated but needs guidance on recovery and avoiding overtraining."
  }
  ```

**Step 4: Age-Appropriate Training**
- Focus on movement quality, not max strength
- Limit heavy lifting (no 1-rep maxes)
- Emphasize recovery, sleep, nutrition education
- Teach proper warm-up and injury prevention

### Training Program

**Athletic Performance Focus:**
- Speed work: Sprint mechanics, agility drills
- Power development: Box jumps, med ball throws, Olympic lift variations (teaching phase)
- Strength: Bodyweight + moderate weights (bodyweight squats, push-ups, pull-ups, lunges)
- Vertical jump training: Depth jumps, single-leg plyometrics

**Nutrition Education:**
- Tyler learns: How to fuel for performance (pre-game meals, post-workout nutrition)
- Mom learns: How to support Tyler's nutrition at home
- AI check-ins focus on: Hydration, sleep, recovery

### 4-Month Results (Basketball Season)
- Vertical jump: 24 inches → 29 inches (+5 inches!)
- 40-yard dash: 5.2 seconds → 4.9 seconds
- On-court performance: Averaging 18 points/game (up from 12)
- College scouts noticed Tyler's improvement
- Tyler received scholarship offer from Division II school!

**Mom's Testimonial:**
> "SwanStudios didn't just train Tyler, they educated both of us. Tyler learned discipline, proper nutrition, and how to train smart, not just hard. I'm so grateful for the professional, safe environment. Highly recommend for teen athletes!"

---

## Example 5: Emma - Busy Professional (AI-Heavy)

### Client Profile
- **Name:** Emma Rodriguez
- **Age:** 41
- **Gender:** Female
- **Primary Goal:** General health and stress management
- **Fitness Level:** Beginner-Intermediate
- **Occupation:** Corporate Lawyer (80-hour work weeks)
- **Motivation:** "I'm burned out. I need to take care of myself or I'll crash."
- **Challenges:** Extremely limited time, unpredictable schedule, high stress

### AI-Heavy Approach

**Problem:** Emma can't commit to fixed training times
**Solution:** Hybrid model with heavy AI support

**Training Structure:**
- In-person sessions: 1x/week (flex scheduling, she books 24 hours in advance)
- At-home workouts: 2x/week (AI-guided via text)
- Daily AI check-ins: Stress, sleep, movement, nutrition

**AI-Guided Home Workout Example:**
```
AI (6:00 AM): Good morning, Emma! Ready for today's workout? 💪

Emma: Yes, but only have 20 minutes.

AI: Perfect. Here's your 20-min circuit. Do 3 rounds:
1. Bodyweight squats × 15
2. Push-ups (knees OK) × 10
3. Plank × 30 seconds
4. Glute bridges × 15
5. Mountain climbers × 20

Rest 60 seconds between rounds. Start when ready, I'll time you!

Emma: Starting now.

AI (6:20 AM): Time's up! How'd it go?

Emma: Done! All 3 rounds. Sweaty!

AI: AMAZING! You crushed it. How's your energy? (1-10)

Emma: 7/10. Feel good!

AI: Awesome. Don't forget: protein shake within 30 min. See you tomorrow for your check-in! 🌟
```

**Stress Management AI Feature:**
```
AI (8:00 PM): Hey Emma, stress check. How are you feeling today? (1-10, 10 = super stressed)

Emma: 9/10. Awful day. Client yelled at me. Worked until 9 PM.

AI: I'm sorry, that sounds really hard. 💙 Did you move your body today at all?

Emma: No. Too stressed.

AI: Totally understand. Can you do just 5 minutes of stretching or a walk before bed? Even 5 min helps stress.

Emma: OK. I'll walk around the block.

AI (8:35 PM): How was the walk?

Emma: Actually helped. Feel a bit calmer.

AI: I'm so glad. You showed up for yourself even on a rough day. That takes strength. Sleep well. ❤️
```

### 3-Month Results
- Stress level: 9/10 → 6/10 (still high, but improving)
- Sleep: 5 hours → 6.5 hours (huge win for Emma)
- Workout adherence: 80% (impressive given her schedule)
- Weight: Maintained (not the goal, health was the goal)
- Energy: 4/10 → 7/10
- Emma: "I don't know what I'd do without the AI check-ins. They keep me accountable when I have zero time for anything. This is the first fitness program I've ever stuck with."

---

## Common Workflows

### Workflow 1: Onboarding New Client (Full Checklist)

```markdown
## New Client Onboarding Checklist

### Pre-Consultation
- [ ] Client submits online contact form
- [ ] Send welcome email with consultation scheduler link
- [ ] Send pre-consultation questionnaire (optional, can do in-person)

### Initial Consultation (60-90 min)
- [ ] Introduction & rapport building (15 min)
- [ ] Goals & motivation discussion (15 min)
- [ ] Health & medical screening (15 min)
- [ ] Lifestyle & logistics (15 min)
- [ ] Consent forms review & signing (15 min)
- [ ] Schedule first session (5 min)

### Post-Consultation Admin (30-60 min)
- [ ] Create client folder structure
- [ ] Fill out Master Prompt JSON
- [ ] Validate Master Prompt against schema
- [ ] Create consent summary
- [ ] Scan and store signed consent forms (encrypted)
- [ ] Add client to CLIENT-REGISTRY.md
- [ ] Set up AI check-in automation (if applicable)
- [ ] Connect wearable device (if applicable)
- [ ] Send welcome packet email with:
  - First session details
  - What to bring
  - Parking/gym access info
  - Pre-session homework (food tracking, baseline photos)

### First Session (60-90 min)
- [ ] Baseline assessments (weight, measurements, photos, strength tests)
- [ ] Movement screen (check for imbalances, pain, limitations)
- [ ] Teach foundational exercises
- [ ] First workout (moderate intensity, focus on form)
- [ ] Post-workout discussion (explain the plan, answer questions)
- [ ] Schedule next 2-3 sessions

### Week 1 Follow-Up
- [ ] Log first session in client file
- [ ] Update baseline data in Master Prompt
- [ ] Send "Great first session!" encouragement text
- [ ] Confirm AI check-ins are working
- [ ] Review food tracking (if applicable)
```

---

### Workflow 2: Monthly Progress Review

```markdown
## Monthly Progress Review Checklist

### Data Collection (Before Review Session)
- [ ] Weight & body measurements
- [ ] Progress photos (compare to baseline)
- [ ] Strength tests (re-test baseline lifts)
- [ ] Review AI check-in data (adherence, trends)
- [ ] Review nutrition logs (avg calories, protein, adherence)
- [ ] Client completes "Progress Reflection Survey":
  - Energy level (1-10)
  - Sleep quality (1-10)
  - Stress level (1-10)
  - How do you FEEL compared to last month?
  - What's working? What's not?

### Progress Review Session (30 min)
- [ ] Celebrate wins (even small ones!)
- [ ] Show data visuals (graphs, before/after photos)
- [ ] Discuss challenges and solutions
- [ ] Adjust training program (if needed)
- [ ] Adjust nutrition targets (if needed)
- [ ] Set goals for next month
- [ ] Update Master Prompt with new data

### Post-Review Admin
- [ ] Generate monthly progress report (PDF)
- [ ] Update `progress-reports/YYYY-MM-monthly-report.md`
- [ ] Email progress report to client
- [ ] Update client dashboard (if using UI)
- [ ] Log review notes in `notes/progress-notes.md`
```

---

### Workflow 3: Handling Client Withdrawal/Deletion Request

```markdown
## Client Data Deletion Workflow

### Step 1: Verify Request
- [ ] Confirm client identity (verbal or written)
- [ ] Understand reason for deletion (feedback opportunity)
- [ ] Explain what will be deleted and consequences
- [ ] Offer option to download data first (GDPR right to data portability)

### Step 2: Prepare Data Export (Optional)
- [ ] Generate PDF of all progress reports
- [ ] Export workout history to CSV
- [ ] Compile photos into ZIP file
- [ ] Create "Client Data Package" and provide via secure method (Google Drive link, password-protected)

### Step 3: Delete Client Data
- [ ] Delete all files in `client-data/[CLIENT-NAME]/`
- [ ] Remove client from `CLIENT-REGISTRY.md`
- [ ] Delete from AI coaching database
- [ ] Disconnect wearable integrations
- [ ] Remove from email lists
- [ ] Delete cloud backups (if applicable)

### Step 4: Retain Legal Records (7 years)
- [ ] Create folder: `client-data/LEGAL-ARCHIVE/[CLIENT-NAME]/`
- [ ] Retain ONLY: signed consent forms, liability waivers, payment records
- [ ] Label: "Deleted Account - Retain Until [DATE + 7 years]"

### Step 5: Confirm Deletion
- [ ] Send written confirmation email:
  ```
  Subject: Data Deletion Confirmation

  Hi [Client Name],

  This confirms that all your training data has been deleted from the
  SwanStudios system as of [Date]. The following data was removed:
  - Workout history
  - Progress photos
  - Nutrition logs
  - AI check-in history
  - Body measurements

  Per legal requirements, I am retaining only:
  - Signed consent forms
  - Liability waivers
  - Payment records
  These will be securely stored for 7 years and then permanently deleted.

  Thank you for training with SwanStudios. I wish you all the best!

  Best,
  [Trainer Name]
  ```
- [ ] Document completion in `client-data/DELETION-LOG.md`
```

---

## Troubleshooting Guide

### Issue 1: Client Not Responding to AI Check-Ins

**Symptoms:**
- AI sends daily check-ins, client doesn't respond for 3+ days

**Diagnosis:**
- Check: Are texts being delivered? (Send manual test text)
- Check: Is client overwhelmed by frequency?
- Check: Is communication style not resonating?

**Solutions:**
1. **Reduce frequency:** Change from daily to 3x/week (Mon/Wed/Fri)
2. **Change timing:** Ask client: "Is 8 PM a bad time? When's better?"
3. **Change method:** Switch from text to app notifications or email
4. **Simplify messages:** Make check-ins shorter (1 question vs 3-4)
5. **Human touch:** Trainer sends personal text: "Hey, noticed you haven't been responding to AI check-ins. Everything OK? Want to adjust how we check in?"

---

### Issue 2: Client Plateaus (No Progress for 3+ Weeks)

**Symptoms:**
- Weight not changing
- Strength not improving
- Client frustrated

**Diagnosis Checklist:**
- [ ] Is client tracking nutrition accurately? (Most common issue)
- [ ] Is client actually adhering to training program? (Check attendance)
- [ ] Is client getting enough sleep? (Recovery issue)
- [ ] Is client under high stress? (Cortisol can stall progress)
- [ ] Has client adapted to training stimulus? (Need new program)
- [ ] Is client's NEAT (non-exercise activity) decreasing as they diet? (Metabolic adaptation)

**Solutions by Root Cause:**
1. **Nutrition tracking inaccurate:**
   - Review food logs together
   - Teach proper portion sizes (use food scale)
   - Look for "hidden calories" (dressings, cooking oils, alcohol)

2. **Poor adherence:**
   - Discuss barriers: "What's making it hard to stick to the plan?"
   - Adjust plan to fit lifestyle better
   - Increase accountability (more frequent check-ins)

3. **Sleep/stress:**
   - Prioritize recovery (reduce training volume temporarily)
   - Add stress management (meditation, walks, journaling)
   - Referral to therapist if needed

4. **Training adaptation:**
   - Change program (new exercises, rep ranges, splits)
   - Add intensity techniques (drop sets, supersets, tempo work)

5. **Metabolic adaptation:**
   - Implement refeed days (1-2x/week at maintenance calories)
   - Increase NEAT (step goal, take stairs, park far away)
   - Consider diet break (1-2 weeks at maintenance)

---

### Issue 3: Client Experiences Pain During Exercise

**Symptoms:**
- Client reports pain during or after specific exercise

**STOP IMMEDIATELY. Do NOT continue exercise if painful.**

**Assessment:**
- **Pain type:** Sharp, stabbing pain? (RED FLAG, stop all exercise, refer to doctor)
- **Pain type:** Dull, aching muscle soreness? (Normal DOMS, safe to continue)
- **Pain location:** Joint pain? (RED FLAG, modify exercise)
- **Pain location:** Muscle belly? (Likely safe)

**Actions:**
1. **Stop the painful exercise immediately**
2. **Assess:** Ask client: "On a scale of 1-10, how painful?"
   - 1-3/10: Mild discomfort, likely OK to modify
   - 4-6/10: Moderate pain, stop exercise, try alternative
   - 7-10/10: Severe pain, stop all training, ice, refer to doctor
3. **Document:** Log the incident in `notes/pain-injury-log.md`
4. **Modify or substitute:** Find pain-free alternative exercise
5. **Monitor:** Check in 24-48 hours later: "How's the [body part] feeling?"
6. **Refer if needed:** If pain persists >3 days, refer to doctor or physical therapist

**Example Documentation:**
```markdown
## Pain/Injury Log: Sarah Mitchell

### 2025-03-15: Right Shoulder Discomfort During Overhead Press
- **Exercise:** Dumbbell overhead press (20 lbs)
- **Pain:** Sharp pain in right shoulder (front deltoid area)
- **Pain level:** 6/10
- **Action taken:**
  - Stopped exercise immediately
  - Assessed ROM: Limited overhead flexion (150 degrees vs 180 normal)
  - Substituted: Lateral raises (no pain)
- **Follow-up:** Texted Sarah on 3/17 - shoulder feeling better (2/10)
- **Plan:** Avoid overhead pressing for 1 week, re-assess. Consider PT referral if persists.
```

---

## Version History
- **v1.0 (2025-11-05):** Initial release with 5 comprehensive client walkthroughs
- Future: Add more scenarios (pregnancy, seniors, athletic performance, medical conditions)

---

**End of Real Client Example Walkthroughs**
