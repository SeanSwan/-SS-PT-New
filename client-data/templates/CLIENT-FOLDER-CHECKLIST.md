# ✅ New Client Setup Checklist

**Client Name:** _________________
**Tier:** ☐ Silver ☐ Golden ☐ Rhodium
**Setup Date:** ___/___/___

---

## 📋 Pre-Onboarding (Before First Session)

### 1. Client Folder Setup
- [ ] Copy `TEMPLATE-CLIENT/` folder
- [ ] Rename to: `[firstname-lastname-tier]/`
- [ ] Move to `client-data/` root folder

### 2. Questionnaire
- [ ] Send questionnaire to client (Google Form, email, or in-person)
- [ ] Client completes all 85 questions
- [ ] Review responses for red flags
- [ ] Save completed questionnaire to: `[client]/questionnaire.md`

### 3. Medical Clearance
- [ ] Check if doctor clearance needed (Section 3, Q25)
- [ ] If needed: Send PAR-Q+ form to client
- [ ] Receive signed clearance (if required)
- [ ] Save to: `[client]/notes/medical-clearance.pdf`

### 4. Payment Setup
- [ ] Choose tier pricing (Silver/Golden/Rhodium)
- [ ] Create Stripe Payment Link (see Master Blueprint for setup)
- [ ] Send payment link to client
- [ ] Confirm first payment received
- [ ] Set up recurring billing (monthly or per-session)

### 5. Master Prompt JSON
- [ ] Generate Master Prompt JSON from questionnaire responses
- [ ] Fill out all sections (measurements, goals, health, nutrition, training)
- [ ] Save to: `[client]/master-prompt.json`
- [ ] Test with AI (generate sample workout to verify data quality)

### 6. Client Registry
- [ ] Add client to `CLIENT-REGISTRY.md`
- [ ] Include: Name, tier, start date, folder path
- [ ] Update business metrics (monthly revenue, capacity)

---

## 🏋️ First Session Setup

### 7. Baseline Measurements
- [ ] Height (ft/in) → Update `master-prompt.json`
- [ ] Weight (lbs) → Update `master-prompt.json`
- [ ] Body fat % (if available)
- [ ] Photos (front, side, back) → Save to `[client]/photos/`

### 8. Cardiovascular Baseline
- [ ] Resting heart rate (bpm)
- [ ] Blood pressure (systolic/diastolic)
- [ ] Record in `master-prompt.json` → baseline.cardiovascular

### 9. Strength Baseline (1RM or max reps)
- [ ] Bench press: ___ lbs x ___ reps
- [ ] Squat: ___ lbs x ___ reps
- [ ] Deadlift: ___ lbs x ___ reps
- [ ] Overhead press: ___ lbs x ___ reps
- [ ] Pull-ups: ___ reps (assisted?)
- [ ] Record in `master-prompt.json` → baseline.strength

### 10. Range of Motion Assessment
- [ ] Shoulder flexion (L/R): ___° / ___°
- [ ] Shoulder abduction (L/R): ___° / ___°
- [ ] Hip flexion (L/R): ___° / ___°
- [ ] Hip extension (L/R): ___° / ___°
- [ ] Ankle dorsiflexion (L/R): ___° / ___°
- [ ] Record in `master-prompt.json` → baseline.rangeOfMotion

### 11. Flexibility Tests
- [ ] Sit-and-reach: ___ cm
- [ ] Shoulder mobility (clasp hands behind back): Yes/No
- [ ] Hip mobility (90/90 position): Yes/No
- [ ] Record in `master-prompt.json` → baseline.flexibility

### 12. Movement Screening
- [ ] Overhead squat assessment (check for compensations)
- [ ] Single-leg balance test (L/R)
- [ ] Plank hold test (seconds)
- [ ] Note any asymmetries or limitations in: `[client]/notes/movement-screening.md`

---

## 🤖 AI & Tech Setup

### 13. AI Daily Check-Ins (If Tier 2 or 3)
- [ ] Verify client's phone number for SMS
- [ ] Set preferred check-in time (from questionnaire Q65)
- [ ] Test Twilio SMS (send test message)
- [ ] Confirm client received and can respond
- [ ] Document check-in schedule in `master-prompt.json` → aiCoaching

### 14. iPad PWA Setup (Future Feature)
- [ ] Send client link to SwanStudios PWA
- [ ] Help client add to home screen
- [ ] Walk through features (workout logging, progress photos, etc.)
- [ ] Test login and data sync

### 15. Wearable Integration (If Tier 3)
- [ ] Identify wearable device (Apple Watch, Fitbit, Garmin, Oura, Whoop)
- [ ] Connect to SwanStudios app (future feature)
- [ ] Verify data sync (HRV, sleep, heart rate)
- [ ] Set recovery thresholds for workout adjustments

---

## 📊 Week 1 Planning

### 16. Generate First Workout Plan
- [ ] Use AI (Claude) to generate Week 1 workouts
- [ ] Include: Master Prompt JSON + baseline measurements
- [ ] Review AI output for safety (avoid injury areas)
- [ ] Adjust for beginner/intermediate/advanced level
- [ ] Save to: `[client]/workouts/week-01-workout.md`

### 17. Nutrition Plan (If Tier 2 or 3)
- [ ] Calculate macro targets (protein, carbs, fats)
- [ ] Use AI (ChatGPT) to generate Week 1 meal plan
- [ ] Match dietary preferences (questionnaire Section 4)
- [ ] Save to: `[client]/nutrition/meal-plan-week-01.md`
- [ ] Generate shopping list

### 18. Set Week 1 Goals
- [ ] Establish specific, measurable goals (e.g., "Complete 3 workouts", "Hit protein target 5/7 days")
- [ ] Discuss expectations (what to expect in Week 1)
- [ ] Document in: `[client]/progress/week-01.md`

---

## 📞 Communication Setup

### 19. Preferred Contact Method
- [ ] Confirm: SMS, email, or phone call (from questionnaire Q8)
- [ ] Save contact info in phone (with client's tier in name)
- [ ] Add to calendar: Recurring workout sessions
- [ ] Set reminders for check-ins (weekly or bi-weekly)

### 20. Emergency Protocol
- [ ] Explain when to contact you (injury, severe pain, health emergency)
- [ ] Provide emergency contact info (your phone, backup contact)
- [ ] Document in: `[client]/notes/emergency-protocol.md`

### 21. Expectation Setting
- [ ] Discuss realistic timeline for goals
- [ ] Explain AI check-in system (how it works, what to expect)
- [ ] Set boundaries (response times, off-hours)
- [ ] Get client agreement (verbal or written)

---

## 📁 Documentation

### 22. Client README
- [ ] Update `[client]/README.md` with client-specific info
- [ ] Fill in: Name, tier, start date, primary goal
- [ ] Add current stats (weight, body fat %)
- [ ] List any medical concerns or restrictions

### 23. Training Notes
- [ ] Create: `[client]/notes/training-notes.md`
- [ ] Document first impressions (movement quality, motivation, etc.)
- [ ] Note any form issues observed
- [ ] List exercises to emphasize or avoid

### 24. Red Flags File
- [ ] Create: `[client]/notes/red-flags.md`
- [ ] Document any health concerns (from questionnaire Section 3)
- [ ] List current injuries or pain (from questionnaire Section 3.4)
- [ ] Set up monitoring protocol (check-in frequency for pain)

---

## 🎯 Post-Session 1

### 25. Follow-Up
- [ ] Send follow-up text/email (thank client, recap goals)
- [ ] Share Week 1 workout plan (PDF or link)
- [ ] Send nutrition plan (if Tier 2 or 3)
- [ ] Remind about next session (day/time)

### 26. Sync Data
- [ ] Commit all client files to Git (if using GitHub)
- [ ] Or sync to iCloud (if using iCloud method)
- [ ] Verify sync on iPad (check Files app or Working Copy)
- [ ] Test accessing client data on mobile

### 27. Review & Adjust
- [ ] Review this checklist - did you miss anything?
- [ ] Note any setup challenges for next client
- [ ] Update this checklist if needed (add steps that were helpful)

---

## 🎉 Setup Complete!

**Checklist Completion:** ___/27 items

**Client is ready to start training!**

**Next Steps:**
1. Week 1 workouts → Track in `progress/week-01.md`
2. Daily AI check-ins (if enabled)
3. Progress photos every 2-4 weeks
4. Review progress after Week 4

---

## 📝 Notes & Observations

**Client's readiness level (1-10):** ___/10
**Client's motivation level (1-10):** ___/10
**Anticipated challenges:**
-
-
-

**Key focus areas for first month:**
-
-
-

---

**Setup Completed By:** _________________
**Date:** ___/___/___
**Time to Complete:** ___ minutes

**Save this checklist to:** `[client]/notes/setup-checklist-completed.md`
