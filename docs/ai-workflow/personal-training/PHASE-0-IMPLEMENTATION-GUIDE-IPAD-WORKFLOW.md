# 📱 PHASE 0 IMPLEMENTATION GUIDE - iPad Workflow
## Real-World Implementation for Personal Training on the Gym Floor

**Last Updated:** 2025-11-06
**Status:** Ready to Implement NOW
**Target User:** Sean (Trainer with iPad, VS Code, AI Village access)

---

## 🎯 YOUR ACTUAL SITUATION

### What You Have Right Now
- ✅ iPad on gym floor (for training clients)
- ✅ VS Code on computer (for documentation & AI access)
- ✅ Client data files in `client-data/` folder
- ✅ AI Village (6 AIs total - see updated list below)
- ✅ Bootcamp classes to teach (16-77 years old, 3 class types)

### What You DON'T Have Yet
- ❌ Live website/database
- ❌ Voice-to-text automation
- ❌ Real-time sync between iPad and computer
- ❌ Automated AI analysis

### What You NEED
1. **Gym Floor Workflow:** Use iPad to reference client data WITHOUT exposing files to AI
2. **Workout Creation:** Generate workouts on-demand with AI Village
3. **Bootcamp Planning:** AI-powered class design with equipment flow optimization
4. **Client Sync:** Copy client folders safely between devices
5. **Nutritionist AI:** Suggestion-only meal planning (no medical advice)
6. **Manager Pitch:** Simple explanation for partnership/funding approval

---

## 🤖 UPDATED AI VILLAGE (6 AIs)

### Your Complete AI Team

1. **Claude Code (Orchestrator & Safety)**
   - Role: Main orchestrator, architecture, security, ethics
   - Access: VS Code extension
   - Use for: Client master prompt analysis, safety checks, workout programming

2. **Roo Code (Implementation & Speed)**
   - Role: Fast backend builds, quick iterations, automation
   - Access: VS Code extension (OpenRouter)
   - Use for: Creating workout templates, file management scripts

3. **ChatGPT-5 (Recovery & Nutrition)**
   - Role: Recovery protocols, nutrition guidance, client communication
   - Access: Web interface, ChatGPT app
   - Use for: Meal planning suggestions, recovery strategies, client check-ins

4. **Gemini Code Assist (Data Analysis)**
   - Role: Performance trend analysis, statistical correlations, predictive modeling
   - Access: VS Code extension
   - Use for: Progress tracking, plateau detection, injury risk analysis

5. **MinMax v2 (Strategic UX & Coordination)**
   - Role: Multi-AI orchestration, UX optimization, consensus building
   - Access: Web interface
   - Use for: Complex decisions requiring multiple AI perspectives

6. **Kilo Code (NEW - TBD Role Assignment)**
   - Role: *To be determined - possibly MinMax v2 specialized instance?*
   - Access: TBD
   - Potential uses: Bootcamp class planning, equipment flow optimization, group training

---

## 🔒 SECURITY PROTOCOL: AI Village Access

### ⚠️ CRITICAL RULE: NEVER EXPOSE CLIENT FILES TO EXTERNAL AIs

**Problem:** You need AI help but can't expose real client data to web-based AIs.

**Solution:** Data sanitization workflow

```markdown
### Safe AI Prompting Protocol

#### STEP 1: Copy Master Prompt Structure (NO REAL DATA)
```json
{
  "client": {
    "clientId": "PT-XXXXX",
    "spiritName": "[REDACTED]",
    "age": XX,
    "gender": "[REDACTED]"
  },
  "goals": {
    "primary": "Weight loss",
    "timeline": "6 months"
  },
  "health": {
    "injuries": [
      {
        "bodyPart": "Lower back",
        "status": "Chronic - Managed",
        "limitations": ["No heavy deadlifts >225 lbs"]
      }
    ]
  }
}
```

#### STEP 2: Use Generic Example Prompt
```
I'm training a 35-year-old male client with:
- Goal: Weight loss (210 lbs → 180 lbs, 6 months)
- Injury: Lower back strain (no heavy deadlifts)
- Fitness level: Beginner
- Gym: LA Fitness (standard equipment)
- Sessions: 3x/week, 60 minutes

Create a workout for today focusing on lower body.
```

#### STEP 3: Apply AI's Response to Real Client
- Take generic workout from AI
- Customize based on client's actual Master Prompt
- Save in client's workout folder

### Local-Only AI Access (VS Code Extensions)
**Safe to use with real client files:**
- ✅ Claude Code (local VS Code extension, runs on your machine)
- ✅ Roo Code (local VS Code extension)
- ✅ Gemini Code Assist (local VS Code extension)

**DO NOT expose real files to:**
- ❌ ChatGPT web interface
- ❌ MinMax v2 web interface
- ❌ Any cloud-based AI chat

---

## 📱 PHASE 0: iPad Workflow (What You Do NOW)

### Morning Routine (Before Training Sessions)

#### On Computer (VS Code)
```
1. Open client-data/ folder
2. Review today's clients:
   - PT-10001 (Golden Hawk) - 10:00 AM
   - PT-10003 (Silver Crane) - 2:00 PM
3. Export client summaries to iPad-safe format:
   - Copy Master Prompt key fields to simple text note
   - NO full JSON files on iPad (security risk)
```

#### Create iPad Reference Cards (Simple Text Files)

**File: `ipad-notes/golden-hawk-quick-ref.txt`**
```
CLIENT: Golden Hawk (PT-10001)
AGE: 35 | GENDER: Male | PACKAGE: Golden ($200/session)

GOALS:
- Weight loss: 210 → 180 lbs (6 months)
- Run 5K without stopping
- Feel confident at beach

INJURIES/LIMITATIONS:
- Lower back (2/10 chronic) - no heavy deadlifts >225 lbs
- Right ankle sprain (2020) - fully healed

EQUIPMENT PREFERENCES:
- Treadmill, dumbbells, bench
- Avoid: Burpees (too intense)

LAST SESSION (Nov 6):
- Goblet squat 30 lbs 3x10 ✅
- Shoulder 2/10 during warm-up (stable)

NEXT SESSION FOCUS:
- Lower body + core
- Monitor back pain
- Increase goblet squat to 35 lbs?
```

#### Transfer to iPad
```
Option A: AirDrop text files to iPad
Option B: Email to yourself, open on iPad
Option C: iCloud Notes (if synced)
Option D: Google Drive shared folder
```

---

### During Session (Gym Floor - iPad)

#### What to Have Open on iPad
1. **Client Quick Reference Card** (text file above)
2. **Blank workout log template** (Notes app)
3. **Timer app** (for rest periods)
4. **Camera app** (for form checks, progress photos)

#### Session Flow
```
10:00 AM - Client arrives
├─ Quick check-in: "Any pain today? Energy level 1-10?"
├─ Warm-up (5 min)
├─ Main workout (45 min)
│  └─ Mental notes OR quick voice memo:
│      "Goblet squat, 35 pounds, 3 sets of 10 reps, form excellent"
├─ Cool-down (5 min)
├─ Client feedback
└─ Schedule next session

10:05 AM - 10:50 AM: TRAIN (no iPad distraction!)
10:50 AM - 11:00 AM: Quick notes in iPad Notes app
```

#### iPad Notes Template (Copy This)
```
SESSION: Golden Hawk - Nov 8, 2025

✅ EXERCISES:
1. Goblet Squat - 35 lbs - 3x10 - RPE 7 - Form: Excellent
2. Dumbbell Row - 30 lbs - 3x10 each arm - RPE 6 - Form: Good
3. Plank Hold - 3x30 sec - RPE 8 - Struggling on 3rd set
4. Glute Bridge - 3x12 - BW - RPE 5 - Easy, ready for weight

🩹 PAIN:
- Lower back: 2/10 (same as last time, stable)
- No new pain

💬 CLIENT FEEDBACK:
"Felt strong today! Ready for more weight next time."

📝 TRAINER NOTES:
- Increase goblet squat to 40 lbs next session
- Add weighted glute bridges (start with 25 lbs)
- Client asked about protein intake - refer to nutrition AI

⏭️ NEXT SESSION: Friday Nov 10, 3:00 PM
Focus: Upper body + shoulder mobility work
```

---

### After Session (Computer - VS Code)

#### Transfer Data from iPad to Client Files

**STEP 1: Copy iPad notes to computer**
```
- AirDrop notes to Mac
- OR email to yourself
- OR copy from iCloud Notes
```

**STEP 2: Create workout log in client folder**
```bash
# File location
client-data/PT-10001-GOLDEN-HAWK/workouts/2025-11-08-session-2.md
```

**STEP 3: Paste iPad notes into proper format**
```markdown
# Session 2: Golden Hawk - Lower Body + Core
**Date:** 2025-11-08
**Time:** 10:00 AM
**Duration:** 60 minutes
**Location:** LA Fitness
**Spirit Name:** Golden Hawk

---

## Exercises Completed

### Goblet Squat
- Weight: 35 lbs
- Sets: 3
- Reps: 10
- RPE: 7/10
- Form: Excellent - great depth, solid bracing
- Notes: Client ready for 40 lbs next time

### Dumbbell Row
- Weight: 30 lbs each arm
- Sets: 3
- Reps: 10
- RPE: 6/10
- Form: Good - reminded to squeeze shoulder blades

### Plank Hold
- Sets: 3
- Duration: 30 seconds each
- RPE: 8/10
- Notes: Struggling on 3rd set, form breaking down

### Glute Bridge
- Weight: Bodyweight
- Sets: 3
- Reps: 12
- RPE: 5/10
- Notes: Too easy, add 25 lbs next session

---

## Pain/Discomfort Reported
- Location: Lower back
- Intensity: 2/10
- Timing: Throughout session
- Quality: Dull ache, same as always
- Action taken: None needed, monitored

---

## Client Feedback
"Felt strong today! Ready for more weight next time."

Energy level: 8/10
Difficulty: 7/10

---

## Trainer Notes
- Progression plan: Increase goblet squat 35→40 lbs, add weight to glute bridges
- Client asked about protein intake - need nutrition AI consultation
- Form excellent on all movements, ready for increased intensity

---

## Next Session: Friday, Nov 10, 3:00 PM
Focus: Upper body + shoulder mobility work
```

**STEP 4: Update Master Prompt (if needed)**
```json
// Update last session info in Master Prompt
{
  "training": {
    "lastSessionDate": "2025-11-08",
    "lastSessionNotes": "Strong session, ready for progression"
  }
}
```

**STEP 5: Commit to Git (optional but recommended)**
```bash
git add client-data/PT-10001-GOLDEN-HAWK/
git commit -m "Update Golden Hawk - Session 2 complete (Nov 8)"
```

---

## 🏋️ CREATING WORKOUTS WITH AI VILLAGE

### Use Case 1: Individual Client Workout

#### STEP 1: Read Client Master Prompt (VS Code)
```bash
# Open in VS Code
client-data/PT-10001-GOLDEN-HAWK/PT-10001-MASTER-PROMPT-v1.0.json
```

#### STEP 2: Prompt Claude Code (Safe - Local AI)
```
I need a workout for client PT-10001:

CLIENT PROFILE:
- Age: 35, Male, Beginner
- Goal: Weight loss (210→180 lbs, 6 months)
- Injury: Lower back chronic 2/10 (no heavy deadlifts >225)
- Last session: Goblet squat 35 lbs 3x10, ready for progression
- Gym: LA Fitness (standard equipment)
- Session: 60 minutes

FOCUS: Lower body + core stability

CONSTRAINTS:
- No heavy spinal loading
- Emphasize form over weight
- Include core work for back stability

Generate workout with exercise selection, sets, reps, weights.
```

#### STEP 3: Claude Code Generates Workout
```markdown
# Workout Plan: Golden Hawk - Lower Body + Core

## Warm-Up (5 min)
1. Treadmill walk - 5 min @ 3.0 mph, incline 2%
2. Cat-cow stretches - 10 reps
3. Glute activation - bodyweight bridges 15 reps

## Main Workout (45 min)

### A1. Goblet Squat
- Weight: 40 lbs (progression from 35)
- Sets: 4
- Reps: 8-10
- Rest: 90 seconds
- Coaching cue: "Chest up, core braced, full depth"

### A2. Dumbbell Romanian Deadlift (back-safe variation)
- Weight: 25 lbs each hand (light, perfect form)
- Sets: 3
- Reps: 12
- Rest: 90 seconds
- Coaching cue: "Hinge at hips, neutral spine, feel hamstrings"

### B1. Bulgarian Split Squat
- Weight: 20 lbs each hand
- Sets: 3
- Reps: 10 each leg
- Rest: 60 seconds
- Coaching cue: "Front knee tracking over toes, upright torso"

### B2. Plank (core stability for back)
- Duration: 3x45 seconds
- Rest: 60 seconds
- Progression: If too easy, add shoulder taps

### C1. Glute Bridge (weighted progression)
- Weight: 25 lb dumbbell on hips
- Sets: 3
- Reps: 15
- Rest: 60 seconds
- Coaching cue: "Squeeze glutes at top, hold 2 seconds"

## Cool-Down (5 min)
1. Hip flexor stretch - 30 sec each side
2. Hamstring stretch - 30 sec each side
3. Cat-cow stretches - 10 reps
4. Child's pose - 1 min

## Notes:
- Monitor back pain throughout (should stay ≤2/10)
- If pain increases, regress weights or substitute exercises
- Total volume: ~60 reps lower body, 135 sec core work
```

#### STEP 4: Save Workout as Template
```bash
# Save for reference
client-data/PT-10001-GOLDEN-HAWK/workout-templates/lower-body-progression-week-2.md
```

#### STEP 5: Print/Email for iPad Reference
```
- Print workout plan
- OR email to yourself
- OR save to iPad Notes
- Bring to gym floor for reference
```

---

### Use Case 2: Bootcamp Class Planning

#### YOUR BOOTCAMP SETUP
- **Attendees:** 16-77 years old (mixed fitness levels)
- **Class Types:**
  1. Leg Day
  2. Upper Body Day
  3. Cardio Core Day
- **Equipment:** Ankle weights, dumbbells, resistance bands, mats, boxes
- **Class Flow:** Circuit training, 30-45 min, keep everyone in sync

#### BOOTCAMP AI PROMPT (ChatGPT or Claude Code)

```
I'm teaching a bootcamp class today:

CLASS DETAILS:
- Type: Leg Day
- Duration: 45 minutes
- Attendees: 15 people, ages 16-77 (mixed levels)
- Equipment available:
  - Ankle weights (10 sets)
  - Dumbbells 5-50 lbs (limited sets)
  - Resistance bands (20)
  - Yoga mats (20)
  - Plyo boxes 12", 18", 24" (6 boxes)

CLASS FLOW REQUIREMENTS:
- Keep class in sync (minimize setup time between exercises)
- Equipment transitions must flow (e.g., keep ankle weights ON if next exercise uses them)
- Offer beginner/intermediate/advanced modifications for ALL exercises
- No one waits on equipment (group shares or uses bodyweight alternative)

STYLE:
- High energy, motivational coaching
- Circuit training (3 rounds)
- 45 seconds work, 15 seconds rest
- Minimal transitions

Generate a 45-minute Leg Day bootcamp class plan.
```

#### AI GENERATES BOOTCAMP PLAN

```markdown
# BOOTCAMP: Leg Day - Nov 8, 2025
**Duration:** 45 minutes
**Attendees:** 15 people (ages 16-77)
**Equipment:** Ankle weights, dumbbells, bands, mats, boxes

---

## WARM-UP (5 min)
*Everyone on mat, no equipment*

1. **High Knees** - 30 sec
2. **Butt Kicks** - 30 sec
3. **Lateral Lunges** - 30 sec each side
4. **Inchworms** - 30 sec
5. **Bodyweight Squats** - 1 min (coach cues: form breakdown)

**Transition:** Grab ankle weights (10 people) OR resistance band (5 people)

---

## CIRCUIT 1 (12 min - 3 rounds, 45 sec work / 15 sec rest)

### Station A: Ankle Weights (10 people)
**Exercise:** Lateral Leg Raises
- Beginner: Standing, hold wall for balance
- Intermediate: Standing, no support
- Advanced: Standing, pulse at top

### Station B: Resistance Bands (5 people)
**Exercise:** Banded Squats
- Beginner: Quarter squats, band around knees
- Intermediate: Parallel squats, band around knees
- Advanced: Below parallel, band around thighs

**🔁 Round 1:** Lateral leg raises / Banded squats
**🔁 Round 2:** Same exercises
**🔁 Round 3:** Same exercises

**Transition:** KEEP ANKLE WEIGHTS ON! (Next circuit uses them)

---

## CIRCUIT 2 (12 min - 3 rounds, 45 sec work / 15 sec rest)

### Station A: Ankle Weights STILL ON (10 people)
**Exercise:** Hip Extensions (Donkey Kicks)
- Beginner: On mat, extend leg straight back
- Intermediate: Add ankle weight resistance
- Advanced: Pulse at top, squeeze glutes

### Station B: Dumbbells (5 people)
**Exercise:** Goblet Squats
- Beginner: 10 lbs
- Intermediate: 20-30 lbs
- Advanced: 40-50 lbs

**🔁 Round 1:** Hip extensions / Goblet squats
**🔁 Round 2:** Same exercises
**🔁 Round 3:** Same exercises

**Transition:** Remove ankle weights, grab mat (everyone)

---

## CIRCUIT 3 (12 min - 3 rounds, 45 sec work / 15 sec rest)

*Everyone on mat, no equipment sharing*

### Exercise 1: Reverse Lunges
- Beginner: Bodyweight, hands on hips
- Intermediate: Hold dumbbells (10-20 lbs)
- Advanced: Hold dumbbells (30-40 lbs)
- **45 sec work (switch legs at 22 sec)**

### Exercise 2: Glute Bridges
- Beginner: Bodyweight
- Intermediate: Hold dumbbell on hips (20-30 lbs)
- Advanced: Single-leg bridges (alternating)
- **45 sec work**

### Exercise 3: Wall Sit
- Beginner: 30-45 sec hold, back against wall
- Intermediate: 45-60 sec hold
- Advanced: Hold dumbbell (20 lbs) on lap
- **45 sec work**

**🔁 Repeat 3 rounds**

---

## COOL-DOWN (4 min)
*Everyone on mat*

1. **Figure-4 Stretch** - 30 sec each leg (hip flexors)
2. **Hamstring Stretch** - 30 sec each leg (seated)
3. **Quad Stretch** - 30 sec each leg (standing or lying)
4. **Child's Pose** - 1 min (rest, breathe)

---

## COACHING CUES

**Energy Phrases:**
- "Everyone's moving at their own pace - choose YOUR level!"
- "Modifications are NOT cheating - they're smart training!"
- "Ages 16 to 77 in this room - ALL crushing it!"

**Form Cues:**
- Squats: "Chest up, knees track over toes, sit back like a chair"
- Lunges: "Front knee 90°, back knee hovering, don't slam it down"
- Glute bridges: "Squeeze glutes at top, hold 2 seconds, feel the burn!"

**Sync Tips:**
- "10 seconds! Finish your rep and get ready to switch!"
- "Don't wait for others - start your next round when timer starts!"

---

## EQUIPMENT FLOW ANALYSIS

✅ **Good flow:**
- Ankle weights stay ON for Circuit 1 → Circuit 2 (no removal/reapplication)
- Circuit 3 uses mats only (everyone has one, no sharing/waiting)

✅ **Minimal transitions:**
- Warm-up → Circuit 1: 30 sec (grab ankle weights/bands)
- Circuit 1 → Circuit 2: 15 sec (keep weights on!)
- Circuit 2 → Circuit 3: 30 sec (remove weights, grab mat)
- Circuit 3 → Cool-down: 0 sec (already on mat)

✅ **No bottlenecks:**
- 10 people ankle weights, 5 people bands (no one waits)
- Circuit 2: Dumbbells limited, but only 5 people need them
- Circuit 3: Everyone has their own mat (bodyweight dominant)

---

## TOTAL TIME: 45 minutes
- Warm-up: 5 min
- Circuit 1: 12 min
- Circuit 2: 12 min
- Circuit 3: 12 min
- Cool-down: 4 min

**Ready to crush Leg Day! 💪**
```

#### STEP 5: Save Bootcamp Plan
```bash
# Save for future reference
docs/ai-workflow/bootcamp-classes/leg-day-2025-11-08.md
```

#### STEP 6: Print or Load on iPad
```
- Print plan, bring to gym
- OR load in iPad Notes for reference during class
```

---

## 🍽️ NUTRITIONIST AI (Suggestion-Only)

### Legal Disclaimer Setup

**⚠️ CRITICAL: Nutrition AI CANNOT provide medical advice**

#### Create Nutritionist AI Prompt

**File: `docs/ai-workflow/personal-training/NUTRITIONIST-AI-PROMPT.md`**

```markdown
# NUTRITIONIST AI - Suggestion-Only Meal Planning

## YOUR ROLE
You are an AI assistant providing **general nutrition suggestions** based on publicly available nutrition science. You are NOT a licensed nutritionist or dietitian.

## LEGAL DISCLAIMER (ALWAYS INCLUDE IN RESPONSES)
```
⚠️ DISCLAIMER: This is NOT medical or nutritional advice. I am an AI providing general suggestions based on nutrition science research. For personalized nutrition plans, consult a licensed Registered Dietitian (RD) or nutritionist. Always consult your doctor before making major dietary changes.
```

## WHAT YOU CAN DO ✅
- Suggest general meal ideas based on goals (weight loss, muscle gain, etc.)
- Provide macro estimates (protein, carbs, fats) based on body weight
- Recommend whole food sources for nutrients
- Explain nutrition concepts (protein timing, calorie deficits, etc.)
- Suggest grocery lists for meal prep

## WHAT YOU CANNOT DO ❌
- Diagnose nutritional deficiencies
- Prescribe supplements or medications
- Override a doctor's or RD's recommendations
- Provide advice for eating disorders or serious medical conditions
- Claim to replace professional nutrition counseling

## EXAMPLE SAFE PROMPTS

### GOOD ✅
"My client wants to lose weight. They're 210 lbs, male, 35 years old. Suggest a general macro target (protein, carbs, fats) and a sample meal plan for weight loss."

### BAD ❌
"My client has Type 2 diabetes. What should they eat?"
→ RESPONSE: "I cannot provide dietary advice for medical conditions. Please refer your client to their doctor and a Registered Dietitian who specializes in diabetes management."

---

## CLIENT CONTEXT TEMPLATE

When asking for nutrition suggestions, provide:
```
CLIENT PROFILE:
- Goal: [Weight loss / Muscle gain / Maintain]
- Current weight: [lbs]
- Target weight: [lbs]
- Age: [years]
- Gender: [Male/Female]
- Activity level: [Sedentary / Moderate / Very active]
- Training frequency: [X sessions per week]
- Dietary preferences: [Vegetarian / Paleo / No restrictions / etc.]
- Allergies: [List]
- Foods to avoid: [List]

REQUEST:
Suggest a sample meal plan with macro targets.
```

---

## EXAMPLE NUTRITION AI CONSULTATION

**YOUR PROMPT TO ChatGPT:**
```
CLIENT PROFILE:
- Goal: Weight loss
- Current weight: 210 lbs
- Target weight: 180 lbs (6 months)
- Age: 35
- Gender: Male
- Activity level: Moderate (training 3x/week)
- Training frequency: 3 sessions per week (strength training)
- Dietary preferences: No sugar, low sodium, organic priority
- Allergies: None
- Foods to avoid: Processed foods, added sugars

REQUEST:
Suggest a sample meal plan (1 day) with macro targets for weight loss. Include breakfast, lunch, dinner, and snacks.
```

**ChatGPT RESPONSE:**
```
⚠️ DISCLAIMER: This is NOT medical or nutritional advice. I am an AI providing general suggestions based on nutrition science research. For personalized nutrition plans, consult a licensed Registered Dietitian (RD) or nutritionist.

---

## MACRO TARGETS (Based on 210 lbs, weight loss goal)

**Daily Calorie Target:** ~2,200 calories (moderate deficit)
**Protein:** 180g (1g per lb bodyweight - supports muscle during fat loss)
**Carbs:** 200g (moderate carbs for training energy)
**Fats:** 80g (healthy fats for hormones)

---

## SAMPLE MEAL PLAN (1 Day)

### BREAKFAST (7:00 AM)
**Veggie Omelet with Avocado**
- 3 whole eggs
- 1 cup spinach, mushrooms, bell peppers
- 1/2 avocado
- 1 slice whole grain toast

**Macros:** 400 cal | 28g protein | 30g carbs | 20g fat

---

### SNACK (10:00 AM)
**Greek Yogurt with Berries**
- 1 cup plain Greek yogurt (non-fat)
- 1/2 cup mixed berries
- 1 tbsp chia seeds

**Macros:** 200 cal | 20g protein | 25g carbs | 5g fat

---

### LUNCH (1:00 PM)
**Grilled Chicken Quinoa Bowl**
- 6 oz grilled chicken breast
- 1 cup cooked quinoa
- 2 cups mixed greens, cherry tomatoes, cucumbers
- 1 tbsp olive oil + lemon dressing

**Macros:** 550 cal | 50g protein | 50g carbs | 15g fat

---

### PRE-WORKOUT SNACK (4:30 PM - if training at 5 PM)
**Apple with Almond Butter**
- 1 medium apple
- 2 tbsp almond butter

**Macros:** 280 cal | 7g protein | 30g carbs | 16g fat

---

### DINNER (7:00 PM)
**Baked Salmon with Sweet Potato & Broccoli**
- 6 oz wild-caught salmon
- 1 medium sweet potato (baked)
- 2 cups steamed broccoli
- 1 tsp butter on sweet potato

**Macros:** 600 cal | 50g protein | 55g carbs | 20g fat

---

### EVENING SNACK (Optional - if hungry)
**Protein Shake**
- 1 scoop whey isolate
- 1 cup unsweetened almond milk
- Ice

**Macros:** 150 cal | 25g protein | 5g carbs | 3g fat

---

## DAILY TOTALS
- **Calories:** ~2,180 cal
- **Protein:** 180g ✅
- **Carbs:** 195g ✅
- **Fats:** 79g ✅

---

## GROCERY LIST FOR MEAL PREP

**Proteins:**
- Eggs (18 count)
- Chicken breast (3 lbs)
- Wild-caught salmon (1.5 lbs)
- Greek yogurt (32 oz container)
- Whey protein isolate (1 tub)

**Carbs:**
- Quinoa (1 box)
- Sweet potatoes (5 medium)
- Whole grain bread (1 loaf)
- Mixed berries (1 bag frozen)
- Apples (5)

**Fats:**
- Avocados (3)
- Almond butter (1 jar)
- Olive oil (1 bottle)
- Chia seeds (1 bag)

**Vegetables:**
- Spinach (1 container)
- Broccoli (2 heads)
- Mixed greens (1 container)
- Cherry tomatoes (1 pint)
- Bell peppers (2)
- Mushrooms (8 oz)

**Pantry:**
- Unsweetened almond milk (1 carton)
- Spices: garlic powder, paprika, lemon juice

---

## NOTES FOR TRAINER
- This plan prioritizes whole foods, no added sugars, low sodium
- Protein is HIGH (1g per lb) to preserve muscle during fat loss
- Carbs are MODERATE (timed around training for energy)
- Fats are HEALTHY (avocado, olive oil, salmon, nuts)
- Client can repeat meals throughout the week (meal prep friendly)

**Meal Prep Tips:**
- Grill 3 lbs chicken on Sunday → use for 5 lunches
- Bake 5 sweet potatoes on Sunday → reheat for dinners
- Pre-chop veggies → store in containers

---

⚠️ REMINDER: This is a SUGGESTION. Adjust based on client's hunger, energy levels, and progress. If weight loss stalls after 2 weeks, reduce calories by 10% (200 cal). If client is too hungry or fatigued, increase calories slightly.

For professional nutrition counseling, refer client to a Registered Dietitian.
```

---

## STEP 7: Save Nutrition Plan in Client Folder
```bash
# Save for reference
client-data/PT-10001-GOLDEN-HAWK/nutrition/meal-plan-week-1.md
```

---

## 📂 CLIENT DATA SYNC WORKFLOW

### Problem: You need client files accessible on iPad + Computer

### Solution: Cloud Sync with Security

#### Option A: iCloud Drive (Mac users)
```bash
# Move client-data to iCloud Drive
mv client-data ~/Library/Mobile\ Documents/com~apple~CloudDocs/client-data

# Symlink back to project folder
ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/client-data client-data

# Access on iPad: Files app → iCloud Drive → client-data
```

#### Option B: Google Drive
```bash
# Move client-data to Google Drive
mv client-data ~/Google\ Drive/SwanStudios/client-data

# Symlink back
ln -s ~/Google\ Drive/SwanStudios/client-data client-data

# Access on iPad: Google Drive app → SwanStudios → client-data
```

#### Option C: Manual Copy (Most Secure)
```bash
# Before leaving for gym:
# 1. Export client quick-ref cards to iPad Notes
# 2. NO full Master Prompt files on iPad
# 3. After training: Copy iPad notes back to computer manually
```

**RECOMMENDATION:** Option C (Manual Copy) for maximum security until website is live.

---

## 🎯 DAILY WORKFLOW SUMMARY

### Morning (Computer - VS Code)
1. Review today's clients (Master Prompts)
2. Create workout with AI Village (Claude Code)
3. Export client quick-ref cards to iPad Notes
4. Sync to iPad (AirDrop or email)

### Gym Floor (iPad)
1. Reference client quick-ref card (NO full Master Prompt on iPad)
2. Train client (100% focus, minimal tech)
3. Quick notes in iPad Notes after session
4. Take progress photos if needed

### Evening (Computer - VS Code)
1. Transfer iPad notes to client workout logs
2. Update Master Prompt if needed
3. Generate next workout with AI Village
4. Commit changes to Git (optional)

---

## 📊 PROGRESS TRACKING

### Weekly Review (Sunday Evening)
```bash
# Open all clients' recent workouts
client-data/PT-10001-GOLDEN-HAWK/workouts/*.md

# Check for:
# - PRs broken?
# - Pain increasing?
# - Plateaus (same weight 4+ weeks)?
# - Missed sessions?

# Flag for AI analysis (Claude Code or Gemini)
```

### Monthly Progress Report
```bash
# Generate with AI Village
# Input: Last 4 weeks of workout logs
# Output: Progress summary, recommendations, next phase plan
```

---

## 🎤 MANAGER PITCH DOCUMENT

*This will be created in the next step - a separate document for your manager*

---

## ✅ NEXT STEPS

1. **Update AI Village documentation** (add Roo Code + Kilo Code)
2. **Create Nutritionist AI prompt** (legal disclaimer + safe guidelines)
3. **Test iPad workflow** (export 1 client, train session, transfer back)
4. **Generate bootcamp class plan** (test AI-powered class design)
5. **Create manager pitch** (simple explanation, no secret sauce)

---

**Ready to implement! Let me know which part you want to start with.**
