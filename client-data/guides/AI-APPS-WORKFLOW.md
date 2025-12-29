# 🤖 AI Apps Workflow - SwanStudios Client Training

**Goal:** Use AI apps (Claude, ChatGPT, Gemini) on iPad/iPhone to generate workouts, meal plans, and coaching insights
**Time Saved:** 30-60 minutes per client per week

---

## 📱 Supported AI Apps

| App | Best For | Cost | File Upload? |
|---|---|---|---|
| **Claude** (Anthropic) | Workout programming, form analysis | Free (limited) or $20/mo | ❌ No (copy/paste) |
| **ChatGPT** (OpenAI) | Meal plans, progress analysis | Free or $20/mo (GPT-4) | ✅ Yes (Pro only) |
| **Gemini** (Google) | Multi-file analysis, research | Free | ✅ Yes |
| **Perplexity** | Research, latest studies | Free or $20/mo | ⚠️ Limited |

**Recommended:** Claude for workouts, ChatGPT for nutrition, Gemini for analysis

---

## 🏋️ Workflow 1: Generate Weekly Workout Plan

### Using Claude App (Recommended for Workouts)

#### Step 1: Prepare Client Data
1. Open Files app → client-data → [client-name-tier]
2. Open `questionnaire.md`
3. Copy these sections:
   - Section 2: Fitness Goals
   - Section 3: Health History (injuries, pain)
   - Section 5: Training History (experience level, preferences)
4. Open `progress/week-[last-week].md`
5. Copy workout summary and strength progress

#### Step 2: Open Claude App
1. Launch Claude app on iPad
2. Start new conversation
3. Paste this prompt:
   ```
   I'm a personal trainer creating a workout plan for my client. Here's their profile:

   === CLIENT PROFILE ===
   [Paste questionnaire sections here]

   === LAST WEEK'S PROGRESS ===
   [Paste last week's workout summary and strength numbers]

   === REQUEST ===
   Generate a detailed workout plan for Week [X] with:
   1. 3 workouts (Monday/Wednesday/Friday)
   2. Progressive overload from last week (add 5 lbs or 1-2 reps)
   3. Avoid exercises that trigger their pain areas
   4. Match their preferred training style
   5. Include warm-up and cool-down
   6. Format as markdown for easy copy/paste

   For each exercise, provide:
   - Exercise name
   - Sets x Reps
   - Weight (if applicable)
   - Rest time
   - Form cues
   - Modifications if needed
   ```

#### Step 3: Claude Generates Workout
Claude will output something like:
```markdown
# Week 3 Workout Plan - John Doe

## Monday - Upper Body Push

### Warm-Up (10 min)
- Arm circles: 2x10 each direction
- Band pull-aparts: 2x15
- Light dumbbell press: 2x10 @ 20 lbs

### Main Workout
1. **Barbell Bench Press**
   - Sets: 4 x 8 reps
   - Weight: 135 lbs (up from 130 lbs last week)
   - Rest: 2 min
   - Form cues: Keep feet flat, drive through heels, control descent
   - Modification: Use dumbbells if shoulder pain

2. **Incline Dumbbell Press**
   - Sets: 3 x 10 reps
   - Weight: 50 lbs (up from 45 lbs)
   - Rest: 90 sec
   [... continues for all exercises ...]
```

#### Step 4: Save to Client Folder
1. Copy entire workout from Claude
2. Open Working Copy or Files app
3. Navigate to: `client-data/[client]/workouts/`
4. Create new file: `2025-11-05-week-3-workout.md`
5. Paste Claude's workout
6. Save/commit

#### Step 5: Print or Send to Client
- Export as PDF (Files app → Share → Print → Save as PDF)
- Or email directly to client
- Or send via SwanStudios app (future feature)

### Advanced: Use Master Prompt JSON

**Instead of copy/pasting questionnaire, send Master Prompt JSON:**

1. Open `client-data/[client]/master-prompt.json`
2. Copy entire JSON file
3. Paste into Claude with this prompt:
   ```
   Here's my client's complete Master Prompt JSON:

   [Paste JSON]

   Generate Week 3 workout plan with progressive overload.
   ```

**Advantage:** Claude gets ALL client data in structured format (faster, more accurate)

---

## 🍽️ Workflow 2: Generate Meal Plan

### Using ChatGPT App

#### Step 1: Prepare Nutrition Data
1. Open `questionnaire.md`
2. Copy Section 4: Nutrition & Lifestyle
3. Calculate macro targets:
   - Protein: Client weight (lbs) x 1g = [X] grams/day
   - Example: 180 lbs client → 180g protein/day

#### Step 2: Open ChatGPT App
1. Launch ChatGPT (use GPT-4 if you have Pro)
2. Start new chat
3. Paste this prompt:
   ```
   Create a 7-day meal plan for my personal training client:

   === CLIENT NUTRITION PROFILE ===
   [Paste Section 4 from questionnaire]

   === MACRO TARGETS (Daily) ===
   - Protein: [X] grams
   - Calories: [Y] (adjust based on goal: weight loss = deficit, gain = surplus)
   - Carbs: [Z] grams
   - Fats: [W] grams

   === REQUIREMENTS ===
   - Follow their dietary restrictions (listed above)
   - Use foods they love (listed above)
   - Avoid foods they hate (listed above)
   - Realistic portions (they [do/don't] cook often)
   - Meal prep friendly (if they selected "Yes" for meal prep interest)

   Format as markdown with:
   - Daily meal schedule (breakfast, lunch, dinner, snacks)
   - Macros per meal
   - Shopping list at the end
   ```

#### Step 3: ChatGPT Generates Meal Plan
Output example:
```markdown
# 7-Day Meal Plan - John Doe

## Day 1 (Monday)

### Breakfast (7:00 AM)
- Scrambled eggs: 3 whole eggs
- Oatmeal: 1 cup cooked
- Blueberries: 1/2 cup
- Black coffee

**Macros:** 450 cal | 30g protein | 50g carbs | 15g fat

### Lunch (12:00 PM)
- Grilled chicken breast: 6 oz
- Brown rice: 1 cup cooked
- Steamed broccoli: 2 cups
- Olive oil drizzle: 1 tbsp

**Macros:** 550 cal | 50g protein | 55g carbs | 12g fat

[... continues for all days ...]

## Shopping List
- **Proteins:** 3 lbs chicken breast, 2 lbs ground turkey, 18 eggs
- **Carbs:** Oatmeal (1 canister), brown rice (2 lbs), sweet potatoes (5 lbs)
[... complete list ...]
```

#### Step 4: Save & Share
1. Copy meal plan from ChatGPT
2. Save to: `client-data/[client]/nutrition/meal-plan-week-3.md`
3. Share with client (PDF, email, or app)

---

## 📊 Workflow 3: Analyze Client Progress

### Using Gemini App (File Upload Feature!)

#### Step 1: Gather Progress Reports
1. Navigate to: `client-data/[client]/progress/`
2. Select last 4 weeks: `week-01.md` through `week-04.md`

#### Step 2: Open Gemini App
1. Launch Gemini app
2. Start new conversation
3. Tap + icon → "Upload files"
4. Select all 4 progress reports
5. Paste this prompt:
   ```
   I've uploaded 4 weeks of progress reports for my personal training client.

   Analyze:
   1. Trends (weight, strength, compliance, energy, sleep)
   2. What's working well?
   3. What's not working?
   4. Red flags (pain increasing, motivation dropping, poor recovery)
   5. Recommended adjustments to their program

   Provide actionable insights I can use for Week 5 planning.
   ```

#### Step 3: Gemini Analyzes All Files
Gemini reads all 4 files and outputs:
```
=== TRENDS ANALYSIS ===

Weight Trend:
- Week 1: 180 lbs
- Week 2: 178 lbs (-2 lbs)
- Week 3: 177 lbs (-1 lb)
- Week 4: 176 lbs (-1 lb)
✅ Steady weight loss (goal achieved)

Strength Trend:
- Bench Press: 115 lbs → 130 lbs (+15 lbs) 📈
- Squat: 135 lbs → 155 lbs (+20 lbs) 📈
- Deadlift: 185 lbs → 205 lbs (+20 lbs) 📈
✅ Excellent strength gains

Compliance:
- Week 1: 100% (3/3 workouts)
- Week 2: 100% (3/3 workouts)
- Week 3: 67% (2/3 workouts - missed Friday)
- Week 4: 67% (2/3 workouts - missed Wednesday)
⚠️ Compliance dropping

Energy Levels:
- Weeks 1-2: Average 8/10
- Weeks 3-4: Average 6/10
⚠️ Energy declining

=== RED FLAGS ===
1. Lower back pain mentioned 3x in Week 4 (intensity: 4/10)
2. Sleep quality declining (7.5 hrs → 6 hrs)
3. Missed workouts due to "work stress"

=== RECOMMENDATIONS ===
1. Address lower back pain:
   - Add core stabilization exercises
   - Check deadlift form
   - Consider deload week
2. Improve recovery:
   - Prioritize 7-8 hours sleep
   - Add rest day or active recovery
3. Manage compliance:
   - Adjust workout schedule (flexible timing?)
   - Shorter workouts if time-constrained
```

#### Step 4: Use Insights for Planning
1. Copy Gemini's analysis
2. Save to: `client-data/[client]/notes/month-1-analysis.md`
3. Use recommendations to adjust Week 5 workout plan

---

## 📸 Workflow 4: Analyze Form (Photos/Videos)

### Using Claude App (Premium Feature)

#### Step 1: Take Photo/Video
1. During training session, record client's exercise form
2. Save to: `client-data/[client]/photos/form-check-[date].jpg`

#### Step 2: Open Claude App
1. Launch Claude app
2. Start new conversation
3. Tap + icon → Upload photo
4. Paste this prompt:
   ```
   Analyze this client's exercise form.

   Exercise: [e.g., Deadlift]
   Client background: [Brief summary: experience level, known issues]

   Identify:
   1. What they're doing well
   2. What needs correction
   3. Injury risks
   4. Cues to give them
   ```

#### Step 3: Claude Analyzes Form
```
=== FORM ANALYSIS: DEADLIFT ===

✅ Good:
- Neutral spine throughout lift
- Hips and shoulders rise together
- Bar path close to body

⚠️ Needs Correction:
- Knees cave inward at bottom (knee valgus)
- Weight on toes (should be mid-foot)
- Shoulders slightly rounded at top

🚨 Injury Risks:
- Knee valgus increases ACL/MCL stress
- Forward weight shift stresses lower back

🗣️ Cues:
1. "Push knees out as you descend"
2. "Feel weight in mid-foot and heels"
3. "Chest up, shoulders back at lockout"
4. Consider cue: "Spread the floor apart with your feet"

Recommended drill: Goblet squat with pause to practice knee tracking
```

#### Step 4: Save & Adjust Program
1. Copy Claude's analysis
2. Save to: `client-data/[client]/notes/form-check-[date].md`
3. Add corrective exercises to next workout

---

## 🩺 Workflow 5: Red Flag Detection (Pain/Injury)

### Using Multiple AIs (Consensus)

**When client reports new pain:**

#### Step 1: Document Pain (Client Input)
1. Open `client-data/[client]/notes/red-flags.md`
2. Add entry:
   ```
   Date: 2025-11-05
   Body Part: Lower back
   Intensity: 6/10
   When: During deadlifts, worse when bending over
   Duration: Started 2 days ago
   ```

#### Step 2: Get AI Assessment (Claude)
1. Copy pain description
2. Paste into Claude with prompt:
   ```
   Client reported new pain:
   [Paste pain description]

   Client background:
   - Training experience: Intermediate
   - Previous injuries: None
   - Recent training: Heavy deadlifts (205 lbs, new PR)

   Questions:
   1. Is this serious? (Doctor needed?)
   2. What exercises to avoid?
   3. What exercises to add (rehab)?
   4. Expected recovery timeline?
   ```

#### Step 3: Get Second Opinion (ChatGPT)
1. Paste same info into ChatGPT
2. Compare recommendations

#### Step 4: Get Third Opinion (Gemini)
1. Paste same info into Gemini
2. Look for consensus across all 3 AIs

#### Step 5: Decide & Document
```
=== AI CONSENSUS ANALYSIS ===

Question: Is doctor needed?
- Claude: "Monitor for 3-5 days, see doctor if no improvement"
- ChatGPT: "Likely muscular strain, doctor if pain increases"
- Gemini: "Not emergency, but doctor if pain persists > 1 week"
✅ Consensus: Monitor, no immediate doctor visit

Question: Exercises to avoid?
- Claude: "Avoid: Deadlifts, bent-over rows, good mornings"
- ChatGPT: "Avoid: Heavy spinal loading (deadlifts, squats)"
- Gemini: "Avoid: Flexion under load (deadlifts, RDLs)"
✅ Consensus: Avoid heavy deadlifts and loaded flexion

Question: Rehab exercises?
- Claude: "Cat-cow stretches, bird dogs, planks"
- ChatGPT: "McGill Big 3 (curl-up, side plank, bird dog)"
- Gemini: "Core stabilization: planks, dead bugs, bridges"
✅ Consensus: Core stabilization work

=== ACTION PLAN ===
1. No deadlifts for 2 weeks
2. Add McGill Big 3 daily
3. Monitor pain (should improve in 3-5 days)
4. See doctor if no improvement by Week 2
```

Save to: `client-data/[client]/notes/injury-management-[date].md`

---

## 💬 Workflow 6: Daily Check-In Review

### Using AI to Process SMS Check-Ins

**When using Twilio SMS check-ins (future feature):**

#### Client Sends Daily SMS Response:
```
Daily Check-In - Nov 5
Workout: ✅ Done (chest + triceps)
Energy: 7/10
Sleep: 6 hours
Pain: Lower back 4/10 (better than yesterday)
Nutrition: Hit protein target
```

#### Step 1: Compile Week of Check-Ins
1. Copy all 7 daily check-ins
2. Paste into one document

#### Step 2: Ask AI to Summarize
Paste into Claude/ChatGPT/Gemini:
```
Here are my client's daily check-ins for the week:

[Paste all 7 days]

Summarize:
1. Workout compliance
2. Energy trends
3. Sleep quality
4. Pain status
5. Nutrition compliance
6. Red flags to address
7. Positive trends to reinforce

Format as bullet points for quick review.
```

#### Step 3: AI Summary
```
=== WEEKLY CHECK-IN SUMMARY ===

Workout Compliance: 6/7 days ✅ (missed Sunday)
Energy Trend: Declining (9→7→6 over week) ⚠️
Sleep Quality: Poor (avg 6 hrs, target 8 hrs) 🚨
Pain Status: Lower back improving (6→4→3) ✅
Nutrition: Excellent (hit protein 7/7 days) ✅

RED FLAGS:
- Sleep declining (work stress mentioned)
- Energy dropping (related to sleep?)

POSITIVE TRENDS:
- Lower back pain improving with rehab exercises
- 100% nutrition compliance (huge win!)

ACTION ITEMS:
1. Discuss sleep strategies (work stress management)
2. Continue lower back rehab
3. Consider deload week if energy doesn't improve
```

---

## 🚀 Pro Tips

### Tip 1: Save Prompts as Templates
Create: `client-data/templates/ai-prompts/`
- `workout-generation-prompt.md`
- `meal-plan-prompt.md`
- `progress-analysis-prompt.md`

Copy/paste these every time (saves 5 minutes per session)

### Tip 2: Use Voice Dictation
- Tap microphone icon in AI app
- Speak client data instead of typing
- Much faster on iPad!

### Tip 3: Use Split View
- AI app on left (Claude/ChatGPT)
- Files app on right (client data)
- Drag and drop text between apps

### Tip 4: Create AI "Memory" Conversations
- Start a permanent conversation per client in Claude
- All client data lives in one thread
- AI remembers previous context
- Faster than starting new chat each time

**Example:**
```
Conversation title: "John Doe Training - Ongoing"

[In this conversation, you've already pasted:]
- Client questionnaire (once)
- Master Prompt JSON (once)

[Now you just update:]
- "Here's Week 3 progress: [paste]"
- "Generate Week 4 workout"

Claude remembers all previous context!
```

### Tip 5: Use iOS Shortcuts for Automation
**Shortcut: "Generate Workout"**
1. Asks: "Which client?"
2. Opens their questionnaire file
3. Copies it to clipboard
4. Opens Claude app
5. Pastes pre-written prompt + questionnaire
6. Done in 10 seconds instead of 2 minutes!

---

## 📊 AI App Comparison

### Claude (Best for Workouts)
✅ Pros:
- Excellent at exercise programming
- Understands progressive overload
- Good form analysis
- Long context window (remembers entire conversation)

❌ Cons:
- No file upload (must copy/paste)
- Free tier limited (20 messages/day)

**Best Use:** Workout generation, form checks, training philosophy

### ChatGPT (Best for Nutrition)
✅ Pros:
- Great at meal planning
- Can upload files (Pro version)
- Good at calculating macros
- Plugin ecosystem (future integration potential)

❌ Cons:
- GPT-4 (best version) requires $20/mo
- Sometimes too verbose

**Best Use:** Meal plans, macro calculations, recipe generation

### Gemini (Best for Analysis)
✅ Pros:
- FREE file upload (no Pro needed!)
- Can analyze multiple files at once
- Great at finding patterns
- Access to Google Search (latest research)

❌ Cons:
- Sometimes less detailed than Claude/ChatGPT
- UI not as polished

**Best Use:** Progress analysis, research, multi-file comparison

---

## 🔐 Security & Privacy

### What to Share with AI Apps
✅ Safe to share:
- Questionnaire text (no credit cards)
- Progress reports
- Workout data
- Meal plans
- Anonymized health data

⚠️ Be cautious:
- Full names (use "Client A" or first name only)
- Contact info (remove phone/email before pasting)
- Specific medical diagnoses (generalize: "client with knee injury" not "John with torn ACL requiring surgery")

❌ Never share:
- Full credit card numbers
- Social Security Numbers
- Detailed medical records
- Client photos without consent
- Private messages from client

### AI Data Policies
- **Claude:** Data not used for training (if using Pro)
- **ChatGPT:** Data not used for training (if using Plus/Pro and opted out in settings)
- **Gemini:** Check Google's data policy

**Always check AI provider's privacy policy before sharing client data.**

---

## 📚 Further Reading

- [Claude App Documentation](https://www.anthropic.com/claude)
- [ChatGPT App Guide](https://openai.com/chatgpt)
- [Gemini App Help](https://gemini.google.com/help)

---

**Questions?** See [README.md](../README.md) or [IPAD-SETUP-GUIDE.md](IPAD-SETUP-GUIDE.md)

---

**Last Updated:** 2025-11-05
**System Version:** Personal Training v3.0
