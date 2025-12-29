# ✅ NEW CLIENT TODAY - Complete Workflow Checklist

**Scenario:** Client arrives today for Session 1. You need to onboard them, create their Master Prompt, and generate their first training routine.

**Total Time:** ~90 minutes (60 min with client, 30 min admin)

---

## 📋 PRE-SESSION PREP (15 minutes, before client arrives)

### Step 1: Create Client Folder (2 minutes)
```bash
# In terminal or File Explorer:
cd client-data
cp -r TEMPLATE-CLIENT john-doe-silver

# Or on Windows:
xcopy TEMPLATE-CLIENT john-doe-silver\ /E /I
```

**Naming:** `[firstname-lastname-tier]`
- Examples: `john-doe-silver`, `jane-smith-golden`, `alex-jones-rhodium`

**Checklist:**
- [ ] Folder created: `client-data/john-doe-silver/`
- [ ] Verify all subfolders exist: `progress/`, `workouts/`, `nutrition/`, `photos/`, `notes/`

---

### Step 2: Open Required Files (2 minutes)

**Open in VS Code (or your editor):**
1. [ ] `client-data/john-doe-silver/questionnaire.md` (you'll fill this out)
2. [ ] `client-data/john-doe-silver/master-prompt.json` (you'll populate this)
3. [ ] `client-data/CLIENT-REGISTRY.md` (you'll add client here)

**Open in Browser (for AI):**
1. [ ] Claude app or ChatGPT (for generating workout)
2. [ ] Stripe dashboard (for payment link)

---

### Step 3: Print/Prepare Materials (5 minutes)

**Print (or have on iPad):**
- [ ] Blank questionnaire (from `templates/CLIENT-ONBOARDING-QUESTIONNAIRE.md`)
- [ ] Consent form (from `guides/SECURITY-PRIVACY-IMPLEMENTATION.md` → Section 4)
- [ ] Setup checklist (from `templates/CLIENT-FOLDER-CHECKLIST.md`)

**Prepare Equipment:**
- [ ] Goniometer (for ROM measurements)
- [ ] Blood pressure cuff
- [ ] Measuring tape
- [ ] Camera/phone (for progress photos)
- [ ] Clipboard with forms

---

### Step 4: Review Client Tier Pricing (2 minutes)

**Know Your Pricing:**
- [ ] **Silver ($50/month):** 2 sessions/week, SMS check-ins, basic nutrition
- [ ] **Golden ($125/month):** 4 sessions/week, meal plans, wearable integration
- [ ] **Rhodium ($200/month):** 6 sessions/week, 24/7 support, full AI suite

**Pre-determine recommendation** based on initial contact (email, phone call).

---

## 👤 SESSION 1: CLIENT ONBOARDING (60 minutes with client)

### Step 5: Welcome & Overview (5 minutes)

**Say This:**
> "Welcome! Today we'll:
> 1. Complete a comprehensive health & fitness questionnaire (20 min)
> 2. Take baseline measurements and photos (15 min)
> 3. Discuss your goals and choose a training package (10 min)
> 4. Review consent forms (5 min)
> 5. Schedule your first workout (5 min)
>
> The questionnaire is thorough because it powers our AI system that creates your personalized training plan. Every detail matters."

**Checklist:**
- [ ] Client feels welcomed and comfortable
- [ ] Explained today's agenda
- [ ] Set expectations (60-90 min session)

---

### Step 6: Complete Questionnaire (25 minutes)

**Two Options:**

#### **Option A: Voice Interview (Recommended)**
- [ ] You ask questions from `questionnaire.md`, client answers verbally
- [ ] You type responses into `john-doe-silver/questionnaire.md` (or use voice-to-text)
- [ ] Faster, more natural, builds rapport

#### **Option B: Client Fills Out**
- [ ] Give client printed questionnaire or tablet
- [ ] Client fills out while you prepare equipment
- [ ] You review and clarify answers together

**Key Sections to Complete:**
- [ ] Section 1: Client Profile (basic info, contact)
- [ ] Section 2: Fitness Goals (primary goal, why, timeline)
- [ ] Section 3: Health History (medical conditions, injuries, pain)
- [ ] Section 4: Nutrition & Lifestyle (diet, sleep, stress)
- [ ] Section 5: Training History (experience, preferences)
- [ ] Section 6: AI Coaching Setup (check-in preferences)
- [ ] Section 7: Visual Diagnostics (photo/wearable consent)
- [ ] Section 8: Investment & Commitment (tier selection)
- [ ] Section 9: Informed Consent (liability waiver, AI data usage)
- [ ] Section 10: Final Thoughts (anything else)

**Pro Tip:** Use iPad with voice dictation for fastest entry.

---

### Step 7: Choose Spirit Name (2 minutes)

**Explain:**
> "For privacy when we use AI, we'll give you a 'Spirit Name' instead of using your legal name. It's part of our SwanStudios 'Living Constellation' theme. What vibe do you prefer?"

**Categories:**
1. **Celestial:** Orion Ascending, Stellar Path, Phoenix Rising
2. **Nature:** Mountain Peak, Ocean Wave, Forest Guardian
3. **Mythological:** Atlas Strength, Athena Wisdom, Thor Might
4. **Abstract:** Iron Will, Diamond Mind, Golden Era

**Let client choose or suggest:**
- [ ] Client chooses: __________________
- [ ] Record in questionnaire (Section 1.2)

---

### Step 8: Baseline Measurements (20 minutes)

#### **8a: Basic Stats (5 minutes)**
- [ ] Height: ____ ft ____ in
- [ ] Weight: ____ lbs
- [ ] Blood pressure: ____ / ____ mmHg
- [ ] Resting heart rate: ____ bpm

#### **8b: Strength Baseline (10 minutes)**
Test **1RM or max reps** for:
- [ ] Bench press: ____ lbs x ____ reps
- [ ] Squat: ____ lbs x ____ reps
- [ ] Deadlift: ____ lbs x ____ reps
- [ ] Overhead press: ____ lbs x ____ reps
- [ ] Pull-ups: ____ reps (assisted? Y/N)

**Note:** If client is beginner, use light weight (bar only) and test reps.

#### **8c: Range of Motion (5 minutes)**
Use goniometer to measure (in degrees):
- [ ] Shoulder flexion (L/R): ____ ° / ____ ° (normal: 180°)
- [ ] Shoulder abduction (L/R): ____ ° / ____ ° (normal: 180°)
- [ ] Hip flexion (L/R): ____ ° / ____ ° (normal: 120°)
- [ ] Hip extension (L/R): ____ ° / ____ ° (normal: 20°)
- [ ] Ankle dorsiflexion (L/R): ____ ° / ____ ° (normal: 20°)

#### **8d: Flexibility Tests (3 minutes)**
- [ ] Sit-and-reach: ____ cm (normal: 0-10 cm)
- [ ] Shoulder mobility (clasp hands behind back): Y/N
- [ ] Hip mobility (90/90 position): Y/N

---

### Step 9: Progress Photos (5 minutes)

**Setup:**
- Consistent lighting (natural light or same gym spot)
- Neutral background
- Client in workout clothes (shorts, sports bra/fitted shirt)

**Take Photos:**
- [ ] Front view (arms at sides, relaxed)
- [ ] Side view (left side)
- [ ] Back view (arms at sides)

**Save Photos:**
```bash
# On your phone/camera, transfer to computer later
# Name: cd001_2025-11-05_front_baseline.jpg
#       cd001_2025-11-05_side_baseline.jpg
#       cd001_2025-11-05_back_baseline.jpg
# cd001 = client ID (assign sequentially)
```

**IMPORTANT:**
- [ ] **DO NOT** save to client folder yet (need to strip EXIF data first)
- [ ] Save to temporary folder: `~/Desktop/temp-client-photos/`

---

### Step 10: Review & Sign Consent Form (5 minutes)

**Consent Areas:**
1. [ ] Data collection & storage (7 years retention)
2. [ ] AI-powered analysis (Claude, ChatGPT, Gemini)
3. [ ] Photo & video analysis (AI vision)
4. [ ] Wearable device integration (if applicable)
5. [ ] SMS communication (daily/weekly check-ins)

**Client Signs:**
- [ ] Client signature on consent form
- [ ] Date signed: ___/___/___
- [ ] Save consent to: `john-doe-silver/notes/consent.md`

**File:** Use consent template from `guides/SECURITY-PRIVACY-IMPLEMENTATION.md` Section 4.

---

### Step 11: Schedule Next Sessions & Payment (5 minutes)

#### **Payment Setup:**
- [ ] Open Stripe dashboard
- [ ] Create payment link for chosen tier (Silver/Golden/Rhodium)
- [ ] Send payment link to client's email
- [ ] Client completes payment (or schedules first payment date)

#### **Schedule Sessions:**
- [ ] Silver (2/week): Monday & Thursday at ____ AM/PM
- [ ] Golden (4/week): Mon/Tue/Thu/Fri at ____ AM/PM
- [ ] Rhodium (6/week): Mon/Tue/Wed/Thu/Fri/Sat at ____ AM/PM

- [ ] Add to your calendar
- [ ] Send calendar invites to client

---

## 💻 POST-SESSION: ADMIN WORK (30 minutes, after client leaves)

### Step 12: Strip EXIF from Photos (2 minutes)

```bash
# Install exiftool (one-time)
brew install exiftool  # macOS
# or: apt-get install libimage-exiftool-perl  # Linux

# Strip EXIF from photos
cd ~/Desktop/temp-client-photos
exiftool -all= *.jpg

# Verify EXIF removed
exiftool cd001_2025-11-05_front_baseline.jpg
# Should show minimal metadata
```

**Then move to encrypted storage:**
- [ ] Copy photos to encrypted disk image (see Security Guide Section 5)
- [ ] Delete photos from `~/Desktop/temp-client-photos/`
- [ ] Update `john-doe-silver/photos/README.md` with photo inventory

---

### Step 13: Create Master Prompt JSON (10 minutes)

**Open:** `client-data/john-doe-silver/master-prompt.json`

**Fill Out All Sections from Questionnaire Data:**

```json
{
  "version": "3.0",
  "client": {
    "name": "John Doe",
    "preferredName": "John",
    "alias": "Orion Ascending",  // Spirit Name chosen in Step 7
    "age": 35,
    "gender": "Male",
    "bloodType": "O",
    "contact": {
      "phone": "555-123-4567",
      "email": "john@example.com",
      "preferredTime": "Evening"
    }
  },
  "measurements": {
    "height": {"feet": 6, "inches": 1},
    "currentWeight": 210,
    "targetWeight": 190,
    "bodyFatPercentage": 22,
    "lastDexaScan": null
  },
  "goals": {
    "primary": "Weight loss",
    "why": "Want to have energy to play with my kids and feel confident at the beach",
    "successLooksLike": "Lost 20 lbs, can run 5K, feel strong and energetic",
    "timeline": "6 months",
    "commitmentLevel": 9,
    "pastObstacles": "Inconsistent gym schedule, injuries from bad form",
    "supportNeeded": "Accountability and proper form coaching"
  },
  // ... continue filling all sections from questionnaire
}
```

**Checklist:**
- [ ] All required fields filled (see `MASTER-PROMPT-SCHEMA-v3.0.json` for required fields)
- [ ] Dates in ISO 8601 format (YYYY-MM-DD)
- [ ] Numbers are numeric (not strings)
- [ ] Enums match allowed values (Silver/Golden/Rhodium, Male/Female/Non-binary, etc.)

**Validate JSON:**
```bash
# Use online JSON validator or:
cat john-doe-silver/master-prompt.json | jq .
# Should output formatted JSON with no errors
```

---

### Step 14: Add Client to Registry (2 minutes)

**Open:** `client-data/CLIENT-REGISTRY.md`

**Add to Appropriate Tier Section:**

```markdown
## 🥈 Silver Tier ($50/month)

### Active Clients

| Client Name | Folder | Start Date | Status | Last Check-In | Notes |
|---|---|---|---|---|---|
| John Doe | `john-doe-silver/` | 2025-11-05 | ✅ Active | 2025-11-05 | Weight loss, beginner |
```

**Update Business Metrics:**
```markdown
### Monthly Revenue Breakdown
- **Silver Tier:** 1 client x $50 = $50
- **Total Monthly Revenue:** $50
```

**Checklist:**
- [ ] Client added to registry
- [ ] Revenue updated
- [ ] Folder path correct
- [ ] Start date = today

---

### Step 15: Generate Week 1 Workout Plan (15 minutes)

**Now the AI magic happens!**

#### **15a: Prepare Client Data for AI**

**Open Master Prompt JSON and REDACT PII:**

**❌ NEVER send to AI:**
- Full name ("John Doe")
- Email address
- Phone number
- Home address

**✅ SAFE to send:**
- Spirit Name ("Orion Ascending")
- Age (35)
- Goals, injuries, preferences
- Training history
- All measurement data

**Create Redacted Summary:**
```markdown
CLIENT: Orion Ascending (Spirit Name)
Age: 35 | Gender: Male | Fitness Level: Beginner

GOALS:
- Primary: Weight loss (210 → 190 lbs)
- Why: Energy to play with kids, confidence at beach
- Timeline: 6 months
- Commitment: 9/10

HEALTH & INJURIES:
- Medical: None
- Previous injuries: Lower back strain (2022, fully healed)
- Current pain: None
- Restrictions: Focus on form to prevent injury

TRAINING BACKGROUND:
- Experience: 6 months on/off gym
- Previous: Weight machines, light cardio
- Dislikes: Running, burpees
- Loves: Compound lifts, feels accomplished after heavy sets

BASELINE STRENGTH:
- Bench press: 135 lbs x 5 reps
- Squat: 155 lbs x 8 reps
- Deadlift: 185 lbs x 5 reps
- Overhead press: 85 lbs x 6 reps
- Pull-ups: 3 reps (bodyweight)

PACKAGE:
- Tier: Silver ($50/month)
- Sessions: 2 per week (Monday & Thursday)
- Duration: 60 minutes per session
```

---

#### **15b: Open Claude App (or ChatGPT)**

**Paste This Exact Prompt:**

```
I'm a personal trainer with 25 years experience. Generate a Week 1 workout plan for my new client.

=== CLIENT PROFILE ===
[Paste the redacted summary from 15a]

=== REQUIREMENTS ===
Generate 2 workouts for Week 1 (Monday & Thursday):

WORKOUT STRUCTURE:
- Warm-up (10 minutes)
- Main workout (40 minutes)
- Cool-down/stretch (10 minutes)

PROGRAMMING PRINCIPLES:
- Week 1 is assessment week: Use conservative weights (60-70% estimated 1RM)
- Focus on teaching proper form, not chasing numbers
- Full-body workouts (hit all major muscle groups)
- 3-4 exercises, 3 sets each, 8-12 reps
- Include one compound push, one compound pull, one leg exercise, one core exercise
- Progressive overload starts Week 2 (this week is baseline)

SAFETY:
- Client has history of lower back strain → emphasize core bracing, neutral spine
- Avoid: Heavy deadlifts in Week 1 (save for Week 2 after form check)
- Include: Core stabilization work (planks, dead bugs, bird dogs)

FORMAT:
For each exercise, provide:
- Exercise name
- Sets x Reps
- Weight (specific, based on baseline)
- Rest time
- Form cues (3-4 bullet points)
- Purpose (why this exercise for this client)

OUTPUT AS MARKDOWN so I can copy/paste to client's workout file.
```

---

#### **15c: Claude Generates Workout**

**Example AI Response:**

```markdown
# Week 1 Workout Plan - Orion Ascending

## Monday - Session 1: Full Body Foundation

### Warm-Up (10 minutes)
- Arm circles: 2x10 each direction
- Leg swings: 2x10 each leg (front/back, side-to-side)
- Bodyweight squats: 2x10 (practice form)
- Cat-cow stretches: 2x10 (activate core, warm spine)

### Main Workout (40 minutes)

#### 1. Goblet Squat
- **Sets x Reps:** 3 x 10
- **Weight:** 25 lb dumbbell (light to learn pattern)
- **Rest:** 90 seconds
- **Form Cues:**
  - Hold dumbbell at chest, elbows down
  - Feet shoulder-width, toes slightly out
  - Sit back into hips, keep chest up
  - Knees track over toes (don't cave in)
- **Purpose:** Teaches squat pattern safely before barbell squats. Builds legs/glutes, improves mobility.

#### 2. Dumbbell Bench Press
- **Sets x Reps:** 3 x 10
- **Weight:** 40 lbs per hand (60% of baseline bench)
- **Rest:** 2 minutes
- **Form Cues:**
  - Feet flat on floor, drive through heels
  - Retract shoulder blades (squeeze them together)
  - Lower to chest with control, elbows 45° angle
  - Press up powerfully, full lockout
- **Purpose:** Build chest/triceps, teach pressing mechanics. Dumbbells allow natural arm path.

#### 3. Lat Pulldown
- **Sets x Reps:** 3 x 12
- **Weight:** 90 lbs (moderate resistance)
- **Rest:** 90 seconds
- **Form Cues:**
  - Slight lean back (10-15°), chest up
  - Pull bar to upper chest, squeeze shoulder blades
  - Control the eccentric (3 seconds up)
  - Full extension at top, feel the stretch
- **Purpose:** Build back strength for pull-ups. Safe pulling movement, no lower back stress.

#### 4. Plank (Core Stabilization)
- **Sets x Time:** 3 x 30-45 seconds
- **Rest:** 60 seconds
- **Form Cues:**
  - Forearms on ground, elbows under shoulders
  - Body in straight line (head to heels)
  - Brace core like someone's about to punch your stomach
  - Don't let hips sag or pike up
- **Purpose:** CRITICAL for lower back health. Teaches core bracing for all lifts.

### Cool-Down (10 minutes)
- Child's pose: 2 x 30 seconds
- Hamstring stretch: 2 x 30 seconds each leg
- Quad stretch: 2 x 30 seconds each leg
- Thoracic rotation: 2 x 10 each side

---

## Thursday - Session 2: Full Body Strength

### Warm-Up (10 minutes)
[Similar to Monday, adjust based on client's soreness]

### Main Workout (40 minutes)

#### 1. Romanian Deadlift (RDL)
- **Sets x Reps:** 3 x 10
- **Weight:** 95 lbs (barbell only, or 55 lbs if standard bar)
- **Rest:** 2 minutes
- **Form Cues:**
  - Feet hip-width, slight knee bend
  - Hinge at hips, push butt back (NOT a squat)
  - Bar stays close to legs (scrape the shins)
  - Neutral spine (don't round lower back)
- **Purpose:** Deadlift pattern WITHOUT heavy lower back load. Builds hamstrings/glutes, teaches hip hinge. SAFER than full deadlift for Week 1.

#### 2. Incline Dumbbell Press
- **Sets x Reps:** 3 x 10
- **Weight:** 35 lbs per hand
- **Rest:** 2 minutes
- **Form Cues:**
  - Bench at 30-45° incline
  - Same cues as flat bench (feet down, shoulders back)
  - Press at slight angle (not straight up)
- **Purpose:** Hit upper chest, variety from Monday's flat press.

#### 3. Seated Cable Row
- **Sets x Reps:** 3 x 12
- **Weight:** 100 lbs
- **Rest:** 90 seconds
- **Form Cues:**
  - Sit tall, slight lean forward at start
  - Pull to lower ribs, squeeze shoulder blades together
  - Elbows stay close to body
  - Control the return (don't jerk)
- **Purpose:** Horizontal pull to balance pressing. Builds mid-back, improves posture.

#### 4. Dead Bug (Core Anti-Extension)
- **Sets x Reps:** 3 x 10 each side (20 total)
- **Rest:** 60 seconds
- **Form Cues:**
  - Lie on back, arms straight up, knees bent 90°
  - Press lower back into floor (this is KEY)
  - Extend opposite arm/leg slowly
  - Don't let back arch off floor
- **Purpose:** Core stability. CRITICAL for preventing lower back issues during deadlifts/squats.

### Cool-Down (10 minutes)
[Same as Monday + any areas that feel tight]

---

## WEEK 1 NOTES FOR TRAINER:

**Key Focus:** FORM > WEIGHT. This is assessment and teaching week.

**Watch For:**
- Lower back rounding in RDLs (if happens, reduce weight or switch to kettlebell)
- Knee valgus in squats (knees caving in → add goblet squat holds, cue "knees out")
- Shoulder discomfort in pressing (if happens, adjust grip width or bench angle)

**Week 2 Adjustments:**
- If client nails form: Add 5-10 lbs to all lifts
- If form needs work: Keep same weight, increase reps to 12-15
- Introduce conventional deadlift (if RDL form is perfect)

**Communication:**
- Text client Friday: "How are you feeling? Any soreness or pain?"
- Expect DOMS (delayed onset muscle soreness) 24-48 hours after each session
- Reassure this is normal, means muscles are adapting
```

---

#### **15d: Save Workout Plan**

**Copy AI's output and save to:**
`client-data/john-doe-silver/workouts/week-01-workout.md`

**Checklist:**
- [ ] Workout saved to client's `workouts/` folder
- [ ] File named: `week-01-workout.md`
- [ ] Review AI's output for safety (looks good!)

---

### Step 16: Send Workout Plan to Client (2 minutes)

**Export as PDF:**
```bash
# Option 1: Use Markdown to PDF tool
# Option 2: Print from VS Code → Save as PDF
# Option 3: Copy/paste into Google Doc → Download as PDF
```

**Email to Client:**
```
Subject: Your Week 1 Workout Plan - Let's Go! 🔥

Hi John,

Great session today! Attached is your Week 1 workout plan.

Quick Reminders:
- Monday & Thursday at 10:00 AM (as scheduled)
- Bring: Water bottle, towel, positive attitude
- Wear: Comfortable workout clothes, athletic shoes
- Focus: Learning proper form (not chasing heavy weight yet)

Expect some soreness 24-48 hours after each workout—this is normal and means your muscles are adapting!

See you Monday!

Sean
SwanStudios Personal Training
```

**Checklist:**
- [ ] PDF attached
- [ ] Email sent
- [ ] Calendar invites sent (Monday & Thursday sessions)

---

## ✅ FINAL CHECKLIST - Did You Complete Everything?

### Client Folder Setup
- [ ] Folder created: `john-doe-silver/`
- [ ] Questionnaire completed (85 questions)
- [ ] Master Prompt JSON populated (all fields)
- [ ] Consent form signed and saved
- [ ] Baseline photos taken and encrypted
- [ ] Week 1 workout generated and saved

### Registry & Payment
- [ ] Client added to `CLIENT-REGISTRY.md`
- [ ] Stripe payment link created and sent
- [ ] First payment confirmed (or scheduled)
- [ ] Sessions scheduled in calendar

### Communication
- [ ] Workout plan sent to client (PDF)
- [ ] Calendar invites sent
- [ ] Client has your contact info
- [ ] You have their emergency contact (from questionnaire Q24)

### Data Security
- [ ] EXIF stripped from photos
- [ ] Photos stored in encrypted disk image (NOT in Git)
- [ ] Master Prompt JSON does NOT contain client photos
- [ ] `.gitignore` in place (photos excluded)

---

## 💾 COMMIT YOUR WORK (5 minutes)

**If using Git:**

```bash
cd client-data

# Check what's changed
git status

# Should show:
# - john-doe-silver/questionnaire.md
# - john-doe-silver/master-prompt.json
# - john-doe-silver/workouts/week-01-workout.md
# - john-doe-silver/notes/consent.md
# - CLIENT-REGISTRY.md

# Should NOT show:
# - john-doe-silver/photos/*.jpg (excluded by .gitignore ✅)

# Add files
git add .

# Commit
git commit -m "New client: John Doe (Orion Ascending) - Silver tier

- Complete questionnaire (85 questions)
- Master Prompt JSON v3.0 created
- Consent forms signed
- Baseline measurements recorded
- Week 1 workout plan generated (AI-powered)
- Payment setup: Silver tier ($50/month)

Sessions scheduled: Mon/Thu 10:00 AM
Start date: 2025-11-05

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub (if using GitHub sync)
git push
```

**Checklist:**
- [ ] Committed to Git
- [ ] Pushed to GitHub (if using)
- [ ] Verify photos NOT committed (check GitHub web interface)

---

## 🎉 DONE! CLIENT IS READY TO TRAIN!

**What You've Accomplished:**
1. ✅ Client onboarded with comprehensive health/fitness assessment
2. ✅ Master Prompt JSON created (powers AI personalization)
3. ✅ Week 1 workout plan generated using AI (30 seconds vs 30 minutes manually)
4. ✅ Consent forms signed (legal protection)
5. ✅ Payment setup (recurring revenue)
6. ✅ Data secured (encrypted photos, PII redacted)
7. ✅ Client has clear expectations and schedule

**Next Session (Monday):**
- [ ] Review Week 1 workout plan with client
- [ ] Teach each exercise with hands-on form coaching
- [ ] Take notes on client's form, energy, compliance
- [ ] Update `progress/week-01.md` after session

**Next Week (After 2 Sessions):**
- [ ] Generate Week 2 workout plan (use same AI workflow)
- [ ] Adjust based on Week 1 performance
- [ ] Check in on soreness, energy, motivation

---

## 📞 NEED HELP?

**Workflow Questions:**
- See: [QUICK-START.md](QUICK-START.md)
- See: [CLIENT-FOLDER-CHECKLIST.md](templates/CLIENT-FOLDER-CHECKLIST.md)

**AI Workout Generation:**
- See: [AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md) → Workflow 1

**iPad Access:**
- See: [IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md)

**Security Questions:**
- See: [SECURITY-PRIVACY-IMPLEMENTATION.md](guides/SECURITY-PRIVACY-IMPLEMENTATION.md)

---

**Last Updated:** 2025-11-05
**Total Time:** ~90 minutes (gets faster after first few clients)
**Success Rate:** 100% if you follow this checklist!

🚀 **You've got this!**
