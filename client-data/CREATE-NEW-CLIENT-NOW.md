# Create New Client Files - Quick Start Guide
**Use this until the SwanStudios website is 100% working**
**Last Updated:** 2025-11-05

---

## Location of Files

**Main folder:** `c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\`

**What's in here:**
- `templates/` - Templates you'll copy for each new client
- `guides/` - Reference guides (read when you need help)
- `TEMPLATE-CLIENT/` - Example client folder structure

---

## Quick Start: Create Your First Client (5 Minutes)

### Step 1: Copy the Template Folder

**Windows File Explorer Method:**
1. Open File Explorer
2. Navigate to: `c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\`
3. Right-click on `TEMPLATE-CLIENT` folder
4. Click "Copy"
5. Right-click in the same `client-data` folder
6. Click "Paste"
7. Rename the copied folder to your client's name (e.g., `JOHN-DOE`)

**Command Line Method (faster):**
```bash
cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
cp -r TEMPLATE-CLIENT JOHN-DOE
```

Replace `JOHN-DOE` with your actual client's name (use UPPERCASE and hyphens instead of spaces).

---

### Step 2: Fill Out the Master Prompt File

1. Open the new client folder: `client-data/JOHN-DOE/`
2. Find the file: `MASTER-PROMPT-TEMPLATE.json`
3. Rename it to: `JOHN-DOE-MASTER-PROMPT-v1.0.json`
4. Open it with a text editor (VS Code, Notepad++, or even Notepad)
5. Fill in the client's information

**What to fill in:**
- Replace `[Full Name]` with actual name
- Replace `[Preferred Name]` with what they like to be called
- Replace `0` with actual numbers (age, weight, etc.)
- Replace `[...]` placeholders with real information

**Example:**
```json
{
  "client": {
    "name": "John Doe",           // ← Replace [Full Name]
    "preferredName": "John",      // ← Replace [Preferred Name]
    "age": 35,                    // ← Replace 0
    "gender": "Male",             // ← Choose Male/Female/Non-binary
    "contact": {
      "phone": "555-0123",        // ← Real phone
      "email": "john@email.com"   // ← Real email
    }
  }
}
```

**Don't worry about filling in EVERYTHING on day 1.** Fill in what you know from the initial consultation. You can update it later.

---

### Step 3: Create Consent Folder (Important!)

1. Inside your client folder (e.g., `JOHN-DOE/`), create a folder called `consent`
2. Store all signed consent forms here as PDFs

**Files to put in the consent folder:**
- Scanned consent forms (PDF)
- `consent-summary.md` - Quick reference of what client consented to

**consent-summary.md template:**
```markdown
# Consent Summary: John Doe
**Last Updated:** 2025-11-05
**Next Review:** 2026-02-05

## Active Consents
- [x] General Training Services (signed: 2025-11-05)
- [x] Medical Information Collection (signed: 2025-11-05)
- [x] Progress Photos - Personal Use Only (signed: 2025-11-05)
- [ ] Marketing Use of Photos (DECLINED)
- [x] AI Coaching - Text check-ins (signed: 2025-11-05)

## Special Considerations
- Client prefers no marketing use of photos
- Wants AI check-ins at 8 PM via text
- Has lower back pain - monitor during workouts

## Next Actions
- [ ] Quarterly review due: 2026-02-05
```

---

### Step 4: Start Tracking Workouts

Create files in the `workouts/` folder:

**Filename format:** `YYYY-MM-DD-session-#.md`

**Example:** `workouts/2025-11-05-session-1.md`

```markdown
# Session 1: John Doe
**Date:** 2025-11-05
**Time:** 6:00 PM
**Duration:** 60 minutes
**Location:** LA Fitness

## Goals for Today
- Baseline strength testing
- Learn foundational movements
- Build confidence

## Warm-Up (10 min)
- Treadmill walk: 5 min at 3.0 mph
- Dynamic stretches: arm circles, leg swings, torso twists

## Strength Assessment
- Goblet squat: 15 lbs × 10 reps (good form)
- Push-ups: 8 reps (modified on knees)
- Dumbbell row: 20 lbs × 10 reps
- Plank hold: 30 seconds

## Workout
**Circuit - 3 rounds:**
1. Goblet squat: 15 lbs × 10 reps
2. Knee push-ups: 8 reps
3. Dumbbell row: 20 lbs × 10 reps each arm
4. Glute bridge: 12 reps
5. Rest: 90 seconds between rounds

## Cool-Down (5 min)
- Stretching: lower back, hips, shoulders

## Client Feedback
"That was hard but doable! I feel accomplished."

## Notes for Next Session
- Increase goblet squat to 20 lbs
- Work on push-up form (elbows tucking in)
- Client mentioned lower back tightness - add more core work
```

---

### Step 5: Track Progress Photos

1. Have client take baseline photos (or take them in private)
2. Save to `photos/` folder
3. **NEVER commit photos to Git!** (The .gitignore protects you)

**Filename format:** `YYYY-MM-DD-front.jpg`, `YYYY-MM-DD-side.jpg`, `YYYY-MM-DD-back.jpg`

**Example:**
- `photos/2025-11-05-front.jpg`
- `photos/2025-11-05-side.jpg`
- `photos/2025-11-05-back.jpg`

Take new photos every 4 weeks and compare side-by-side.

---

### Step 6: Nutrition Tracking (Optional)

If client is tracking food, create files in `nutrition/` folder:

**Weekly summary format:** `nutrition/2025-W45-nutrition-log.md`

```markdown
# Nutrition Log: Week 45 (Nov 4-10, 2025)
**Client:** John Doe
**Goal:** 2,000 cal/day, 150g protein

## Daily Averages
- Calories: 2,050 cal/day (on target!)
- Protein: 145g/day (close to goal)
- Carbs: 220g/day
- Fat: 70g/day
- Water: 80 oz/day

## Best Day
**Thursday, Nov 7:**
- Calories: 1,980
- Protein: 160g
- Felt great, high energy

## Worst Day
**Saturday, Nov 9:**
- Calories: 2,500 (birthday party)
- Protein: 100g
- Stress eating, lots of cake

## Notes
- Client is doing great during the week
- Weekends are harder (social events)
- Strategy: Plan ahead for parties, have protein shake before going out
```

---

## Your Client Folder Structure

After setup, each client folder should look like this:

```
client-data/
├── JOHN-DOE/
│   ├── JOHN-DOE-MASTER-PROMPT-v1.0.json  ← Client data (update as needed)
│   ├── consent/
│   │   ├── consent-forms-signed.pdf       ← Scanned consent forms
│   │   └── consent-summary.md             ← Quick reference
│   ├── workouts/
│   │   ├── 2025-11-05-session-1.md        ← Each workout logged
│   │   ├── 2025-11-08-session-2.md
│   │   └── 2025-11-11-session-3.md
│   ├── nutrition/
│   │   ├── 2025-W45-nutrition-log.md      ← Weekly food tracking
│   │   └── 2025-W46-nutrition-log.md
│   ├── photos/
│   │   ├── 2025-11-05-front.jpg           ← Baseline photos
│   │   ├── 2025-11-05-side.jpg
│   │   ├── 2025-11-05-back.jpg
│   │   ├── 2025-12-05-front.jpg           ← Month 1 progress
│   │   └── ...
│   ├── notes/
│   │   ├── private-notes.md               ← Your trainer notes
│   │   └── pain-tracking-log.md           ← Track injuries/pain
│   └── progress-reports/
│       ├── 2025-12-monthly-report.md      ← Monthly progress summaries
│       └── 2025-Q1-quarterly-report.md    ← Quarterly reviews
```

---

## Quick Reference: Essential Files

### For Every New Client (Must Have):
1. ✅ **Master Prompt JSON** - Client data file
2. ✅ **Consent folder** - Signed consent forms + summary
3. ✅ **Workouts folder** - Log every session
4. ✅ **Photos folder** - Progress photos (if client consents)

### Optional (Use if Needed):
5. **Nutrition folder** - If tracking food
6. **Notes folder** - Private trainer notes, injury tracking
7. **Progress reports folder** - Monthly/quarterly summaries

---

## Templates You Can Copy

### Template 1: Master Prompt JSON
**Location:** `templates/MASTER-PROMPT-TEMPLATE.json`
**Use for:** Every new client (copy and fill in)

### Template 2: Client Onboarding Questionnaire
**Location:** `templates/CLIENT-ONBOARDING-QUESTIONNAIRE.md`
**Use for:** Initial consultation (bring this to first meeting)

### Template 3: Progress Tracking Template
**Location:** `templates/PROGRESS-TRACKING-TEMPLATE.md`
**Use for:** Monthly progress reports

### Template 4: Client Folder Checklist
**Location:** `templates/CLIENT-FOLDER-CHECKLIST.md`
**Use for:** Making sure you didn't forget anything

---

## Update the Client Registry

Every time you add a new client, update `CLIENT-REGISTRY.md`:

**Location:** `client-data/CLIENT-REGISTRY.md`

Add a new row:

```markdown
| John Doe | JOHN-DOE | Active | Golden | 2025-11-05 | Mon/Wed/Fri 6pm | Weight loss |
```

This gives you a quick view of all your clients in one place.

---

## Need Help?

### Quick Answers:
- **"How do I onboard a new client?"** → Read `NEW-CLIENT-TODAY-WORKFLOW.md`
- **"What consent forms do I need?"** → Read `guides/CONSENT-MANAGEMENT-FRAMEWORK.md`
- **"How do I protect client data?"** → Read `guides/SECURITY-PRIVACY-IMPLEMENTATION.md`
- **"Can I see a real example?"** → Read `guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md` (Sarah's story)

### Full System Overview:
Read `SYSTEM-COMPLETE-OVERVIEW.md` for everything.

---

## Tips for Success

### Tip 1: Start Simple
Don't try to fill in every field in the Master Prompt on day 1. Start with:
- Name, age, contact info
- Primary goal
- Health conditions (if any)
- Package tier

Add more details as you learn about the client.

### Tip 2: Use a Text Editor You Like
Recommended:
- **VS Code** (free, powerful, syntax highlighting)
- **Notepad++** (free, simple, good for JSON)
- **Sublime Text** (fast, lightweight)

Avoid: Regular Notepad (no syntax highlighting, hard to read JSON)

### Tip 3: Back Up Your Client Data!
Every week, copy the entire `client-data/` folder to:
- External hard drive
- Cloud storage (Google Drive, Dropbox) - but encrypt first!
- See `guides/SECURITY-PRIVACY-IMPLEMENTATION.md` for backup strategies

### Tip 4: Take Photos Every 4 Weeks
Consistency is key:
- Same location, same lighting
- Same clothing
- Same poses (front, side, back)
- Same time of day (morning is best - less water retention)

### Tip 5: Log EVERY Session
Even if it's just:
```markdown
# Session 5: John Doe
**Date:** 2025-11-20
**Workout:** Upper body - same as last week, all weights +5 lbs
**Client feedback:** "Felt strong today!"
```

These notes are GOLD for tracking progress and remembering details.

---

## Common Mistakes to Avoid

### ❌ Don't commit photos to Git
The `.gitignore` file protects you, but double-check before committing.

### ❌ Don't skip consent forms
Always get signed consent BEFORE taking photos or collecting health data.

### ❌ Don't store data unencrypted
Follow the security guide to encrypt your `client-data/` folder.

### ❌ Don't forget to back up
Losing client data is a DISASTER. Back up weekly!

### ❌ Don't share Master Prompt files publicly
These contain sensitive client information. Never email, post online, or share without encryption.

---

## Step-by-Step Example: Create "Sarah Mitchell"

Let's walk through creating a real client file:

**Step 1: Copy template folder**
```bash
cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
cp -r TEMPLATE-CLIENT SARAH-MITCHELL
```

**Step 2: Rename Master Prompt**
```bash
cd SARAH-MITCHELL
mv MASTER-PROMPT-TEMPLATE.json SARAH-MITCHELL-MASTER-PROMPT-v1.0.json
```

**Step 3: Edit Master Prompt (in VS Code or text editor)**
Fill in Sarah's data from consultation:
- Name: Sarah Mitchell
- Age: 34
- Goal: Weight loss (30 lbs in 6 months)
- Current weight: 195 lbs
- Target weight: 165 lbs
- Tier: Golden ($200/month, 3 sessions/week)

**Step 4: Create consent folder and summary**
```bash
mkdir consent
```

Create `consent/consent-summary.md`:
```markdown
# Consent Summary: Sarah Mitchell
**Last Updated:** 2025-11-05
**Next Review:** 2026-02-05

## Active Consents
- [x] General Training Services (signed: 2025-11-05)
- [x] Medical Information Collection (signed: 2025-11-05)
- [x] Progress Photos - Personal Use Only (signed: 2025-11-05)
- [ ] Marketing Use of Photos (DECLINED - revisit in 3 months)
- [x] AI Coaching - Text check-ins at 8 PM (signed: 2025-11-05)

## Special Considerations
- Client is self-conscious about photos - NO marketing use until ready
- Wedding motivation (July 15, 2026)
- Prefers warm, compassionate communication style
```

**Step 5: Log first session**
Create `workouts/2025-11-05-session-1.md` with baseline data.

**Step 6: Add to registry**
Update `client-data/CLIENT-REGISTRY.md`:
```markdown
| Sarah Mitchell | SARAH-MITCHELL | Active | Golden | 2025-11-05 | Mon/Wed/Fri 6pm | Weight loss |
```

**Done!** Sarah's file is ready to use.

---

## When the Website is Ready

Once the SwanStudios website/UI is 100% working:

1. Your Master Prompt JSON files will feed directly into the client dashboards
2. Clients will see their progress, workouts, nutrition in a beautiful UI
3. AI check-ins will be automated
4. You'll still keep these files as the "source of truth"

But until then, this manual system works perfectly!

---

## Next Steps

1. **Read this guide** ✅ (you're doing it!)
2. **Create your first client folder** (copy TEMPLATE-CLIENT)
3. **Fill in the Master Prompt** (basic info is enough to start)
4. **Get consent forms signed** (see CONSENT-MANAGEMENT-FRAMEWORK.md)
5. **Log your first session** (create a workout markdown file)
6. **Take baseline photos** (if client consents)
7. **Repeat for each new client!**

---

## Questions?

Check these files:
- **Onboarding workflow:** `NEW-CLIENT-TODAY-WORKFLOW.md`
- **Real examples:** `guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md`
- **Full system overview:** `SYSTEM-COMPLETE-OVERVIEW.md`

---

**You've got this! 💪 Let's build amazing client files and transform lives!**
