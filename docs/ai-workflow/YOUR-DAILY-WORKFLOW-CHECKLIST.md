# YOUR DAILY WORKFLOW CHECKLIST - Coach Cortex v3.1
**SwanStudios Personal Training System**
**Last Updated:** 2025-11-06
**Purpose:** Step-by-step guide for trainers working with the Coach Cortex autonomous system

---

## 🎯 QUICK START: WHAT YOU NEED TO KNOW

### The Big Picture

You now have a **zero-entry personal training system** that:
- Captures data via voice (you talk, system logs)
- Analyzes performance with 5 AIs automatically
- Alerts you to safety concerns instantly
- Updates client dashboards in real-time

**Your job**: Focus on training clients. The system handles the paperwork.

### Three Phases of Adoption

1. **Phase 0 (NOW)**: File-based system while website builds
2. **Phase 1 (Weeks 1-4)**: Basic automation (voice, database, dashboards)
3. **Phase 2 (Weeks 5-8)**: Full AI Village integration + wearables

**You are in Phase 0.** This checklist covers what to do RIGHT NOW, then what changes in each phase.

---

## 📋 PHASE 0: FILE-BASED WORKFLOW (Current)

### What You Have Right Now

✅ Complete documentation (5 comprehensive guides)
✅ Client data templates (Master Prompt JSON v3.1)
✅ File structure (`client-data/` folder)
✅ Scripts to create new clients (`create-client.bat`)
✅ TEST-CLIENT example (John Test)

### What You DON'T Have Yet

❌ Voice-to-text system (coming Phase 1)
❌ Automated dashboards (coming Phase 1)
❌ AI Village integration (coming Phase 2)
❌ Wearable sync (coming Phase 2)

**For now**: You manually update JSON files. Still WAY better than spreadsheets.

---

## 🗓️ DAILY WORKFLOW: PHASE 0 (File-Based)

### Morning Routine (5 minutes)

**Goal**: Review schedule and prepare for sessions

```
☐ Open client-data/ folder in VS Code or File Explorer
☐ Check today's schedule:
  - Client 1: [Time] - [Name/Spirit Name]
  - Client 2: [Time] - [Name/Spirit Name]
  - Client 3: [Time] - [Name/Spirit Name]
☐ Open each client's Master Prompt JSON:
  - Review injury status (health.injuries[])
  - Check recent pain logs (health.currentPain[])
  - Note any NASM CES exclusions (nasmCesExclusions{})
☐ Mental prep: What are today's focuses?
```

**Time savings**: 5 min (vs 15 min reading spreadsheets)

---

### During Each Session (60 minutes)

**Goal**: Train client, note key data mentally

#### Traditional Approach (DON'T DO THIS):
❌ Stop training to write on clipboard
❌ Interrupt flow to type on phone
❌ Forget details because you're juggling too much

#### Phase 0 Approach (DO THIS):
✅ Focus 100% on client (no interruptions)
✅ Voice memo on phone: "Silver Crane, goblet squat, 30 pounds, 3x10, form excellent, shoulder 2/10"
✅ OPTIONAL: Quick notes on paper (transfer later)

**Mental Notes to Capture**:
```
☐ Client ID/Spirit Name
☐ Exercises performed (name, weight, sets, reps)
☐ Form quality (excellent/good/needs work)
☐ Pain reports (location, intensity 1-10, timing)
☐ Energy level (1-10)
☐ Client feedback (quotes)
☐ Next session focus
```

**Time savings**: 60 min uninterrupted training (vs stopping every 5 min to write)

---

### Post-Session Data Entry (10-15 minutes)

**Goal**: Update client's Master Prompt JSON with session data

#### Step 1: Open Client's Master Prompt

```bash
# Navigate to client folder
cd client-data/[CLIENT-NAME]/

# Open Master Prompt
# Windows: double-click [CLIENT-NAME]-MASTER-PROMPT-v1.0.json
# Or open in VS Code
```

#### Step 2: Update Training History

**Location**: `training.sessionData[]` or create workout log file

**Option A**: JSON update (structured data)
```json
{
  "training": {
    "lastSession": {
      "date": "2025-11-06",
      "exercises": [
        {
          "name": "Goblet squat",
          "weight_lbs": 30,
          "sets": 3,
          "reps": 10,
          "rpe": 7,
          "form_quality": "excellent",
          "notes": "Great depth, solid bracing"
        }
      ]
    }
  }
}
```

**Option B**: Workout log file (easier for now)
```bash
# Create new workout log
client-data/[CLIENT-NAME]/workouts/2025-11-06-session-2.md
```

**Workout Log Template**:
```markdown
# Session 2: [Client Name] - [Focus]
**Date:** 2025-11-06
**Time:** 10:00 AM
**Duration:** 60 minutes
**Location:** Move Fitness
**Spirit Name:** [e.g., Silver Crane]

---

## Today's Focus
- [e.g., Lower body strength]
- [e.g., Core stability]

---

## Exercises Completed

### Goblet Squat
- Weight: 30 lbs
- Sets: 3
- Reps: 10
- RPE: 7/10
- Form: Excellent - great depth, solid bracing
- Notes: Client pushed hard, ready for 35 lbs next session

### [Exercise 2]
- Weight:
- Sets:
- Reps:
- RPE:
- Form:
- Notes:

---

## Pain/Discomfort Reported
- Location: Right shoulder
- Intensity: 2/10
- Timing: During warm-up
- Quality: Soreness, not sharp
- Action taken: None needed, monitored throughout session

---

## Client Feedback
"[Direct quote from client]"

Energy level: 8/10
Difficulty: 7/10

---

## Trainer Notes
- [Observations about client's performance]
- [Form issues to address]
- [Programming notes for next session]

---

## Next Session: [Date]
Focus: [What to work on next]
```

#### Step 3: Update Pain Logs (if applicable)

**If client reported pain >2/10**:

```json
{
  "health": {
    "currentPain": [
      {
        "bodyPart": "Right shoulder",
        "intensity": 2,
        "date": "2025-11-06",
        "timing": "During warm-up",
        "quality": "Soreness",
        "triggers": "Overhead movements",
        "relieves": "Rest, ice",
        "affectsDailyLife": false,
        "notes": "Stable, monitoring"
      }
    ]
  }
}
```

**RED FLAG**: If pain >5/10
```
☐ STOP training immediately
☐ Document details in Master Prompt
☐ Call/text client same day: "How's your [body part] feeling now?"
☐ If pain persists >3 days → require doctor clearance
☐ Update nasmCesExclusions{} with forbidden exercises
```

#### Step 4: Update Personal Records (if PR broken)

```json
{
  "training": {
    "personalRecords": {
      "squat": {
        "weight_lbs": 235,
        "reps": 1,
        "date": "2025-11-06",
        "previous_pr": 225,
        "notes": "Crushed it! 10 lbs increase"
      }
    }
  }
}
```

#### Step 5: Save & Commit (Optional)

**If using Git**:
```bash
git add client-data/[CLIENT-NAME]/
git commit -m "Update [CLIENT-NAME] - Session [#] complete"
```

**Time per client**: 10-15 min (vs 25-30 min with spreadsheets)

---

### End of Day Review (10 minutes)

**Goal**: Review all sessions, plan tomorrow

```
☐ Review all workout logs created today
☐ Check for any red flags:
  - Pain >5/10 → Follow up with client
  - Missed sessions → Send motivational text
  - Form breakdown → Plan regression for next session
☐ Review tomorrow's schedule
☐ Identify any clients who need special attention
☐ Update CLIENT-REGISTRY.md (if new clients added)
```

---

## 🔄 WEEKLY WORKFLOW: PHASE 0

### Sunday Evening Prep (30 minutes)

**Goal**: Plan the week, review progress

```
☐ Review upcoming week schedule (all clients)
☐ For each client:
  ☐ Check training frequency (meeting commitment?)
  ☐ Review last 2 weeks of sessions (progression?)
  ☐ Check pain logs (any worsening trends?)
  ☐ Note any plateaus (same weight 4+ weeks?)
☐ Create intervention list:
  - Client A: Plateau at 225 lbs squat → Plan deload + 5/3/1 transition
  - Client B: Missed 2 sessions → Send motivation check-in
  - Client C: Pain increasing → Schedule assessment call
☐ Review equipment needed for week (any special gear?)
```

---

### Every 4 Weeks: Client Progress Review

**Goal**: Comprehensive assessment and program updates

```
☐ Take progress photos (if client consents)
  - Save to: client-data/[CLIENT-NAME]/photos/2025-11-06-front.jpg
  - Take: front, side, back
  - Compare to baseline photos
☐ Update measurements in Master Prompt:
  - Current weight
  - Body fat % (if measured)
  - Circumferences (waist, arms, etc.)
☐ Review training history (last 4 weeks):
  - Total volume (sets x reps x weight)
  - PRs broken
  - Attendance rate
  - Compliance %
☐ Create monthly progress report:
  - Save to: client-data/[CLIENT-NAME]/progress-reports/2025-11-monthly.md
☐ Schedule check-in call with client:
  - Review progress
  - Adjust goals if needed
  - Address any concerns
  - Plan next 4 weeks
```

**Monthly Progress Report Template**:
```markdown
# Monthly Progress Report: [Client Name]
**Spirit Name:** [e.g., Silver Crane]
**Report Period:** November 2025
**Sessions Completed:** [e.g., 12/12]

---

## Measurements

| Metric | Start (Oct) | Current (Nov) | Change |
|--------|-------------|---------------|--------|
| Weight | 210 lbs | 206 lbs | -4 lbs ✅ |
| Body Fat | 28% | 26% | -2% ✅ |
| Waist | 38" | 36.5" | -1.5" ✅ |

---

## Strength Progress

| Exercise | Oct PR | Nov PR | Increase |
|----------|--------|--------|----------|
| Squat | 185 lbs | 225 lbs | +40 lbs 🎉 |
| Bench | 135 lbs | 155 lbs | +20 lbs 🎉 |
| Deadlift | N/A | 205 lbs | New lift! |

---

## Attendance & Compliance
- Sessions completed: 12/12 (100%) ✅
- Missed sessions: 0
- Nutrition compliance: 80% (good!)

---

## Client Feedback
"I feel so much stronger! My clothes fit better and I have way more energy."

---

## Areas of Improvement
- ✅ Squat form: Excellent progress, hitting full depth
- ⚠️ Shoulder mobility: Still limited (165° vs target 180°)
- ✅ Core strength: Plank time increased from 20s to 45s

---

## Focus for Next Month
1. Continue strength progression (5/3/1 protocol)
2. Add dedicated shoulder mobility work (wall slides, band pull-aparts)
3. Introduce Romanian deadlifts (light, perfect form)
4. Nutrition: Increase protein to 180g/day

---

**Next Progress Check:** December 6, 2025
```

---

## 🚀 PHASE 1 WORKFLOW CHANGES (Weeks 1-4)

### What Changes in Phase 1

**NEW Capabilities**:
✅ Voice-to-text system (speak, system logs)
✅ iPad PWA app (offline session logging)
✅ Basic AI analysis (safety checks)
✅ Automated database updates (no JSON editing)
✅ Real-time dashboards (client sees progress instantly)

**Your Workflow Changes**:

#### During Session (Phase 1)

**OLD (Phase 0)**:
```
1. Train client
2. Mental notes
3. Post-session: Update JSON manually (15 min)
```

**NEW (Phase 1)**:
```
1. Train client
2. Tap microphone on iPad: "Silver Crane, goblet squat, 30 pounds, 3x10, form excellent"
3. System logs automatically → Done! (0 min manual entry)
```

**Voice Dictation Format**:
```
[Spirit Name]. [Exercise], [Weight], [Sets]x[Reps]. [Form quality]. [Optional: Pain report]

Examples:
✅ "Golden Hawk. Bench press, 155 pounds, 3 sets of 8 reps. Form excellent."
✅ "Silver Crane. Goblet squat, 30 pounds, 3x10. Form good. Client reports 2 out of 10 shoulder soreness."
✅ "Iron Wolf. Deadlift, 275 pounds, 1 rep. New PR! Previous was 265."
```

#### Post-Session (Phase 1)

**OLD (Phase 0)**:
```
☐ Edit JSON manually
☐ Save file
☐ Git commit (optional)
```

**NEW (Phase 1)**:
```
☐ Review auto-logged data on dashboard (2 min)
☐ Add any additional notes if needed
☐ Check for AI safety alerts
☐ Done!
```

**Time savings**: 15 min → 2 min per session

---

## 🤖 PHASE 2 WORKFLOW CHANGES (Weeks 5-8)

### What Changes in Phase 2

**NEW Capabilities**:
✅ AI Village multi-AI consensus
✅ Wearable data sync (Whoop, Oura, Apple Watch)
✅ Automated safety triggers (pain, sleep, compliance alerts)
✅ Proactive recommendations (plateau detection)
✅ Daily SMS check-ins (clients respond via text)

**Your Workflow Changes**:

#### Morning Routine (Phase 2)

**OLD (Phase 0-1)**:
```
☐ Review client schedules manually
☐ Check Master Prompts for issues
```

**NEW (Phase 2)**:
```
☐ Open trainer dashboard
☐ Review overnight alerts:
  - 🚨 URGENT: [Client] pain >5/10 → Call immediately
  - ⚠️ WARNING: [Client] sleep <5 hrs x3 days → Recommend deload
  - 📊 INSIGHT: [Client] plateau detected → Review AI recommendation
☐ Check AI Village insights for each client:
  - Gemini: Performance trends
  - ChatGPT: Recovery status
  - Claude: Safety flags
  - MinMax: Engagement opportunities
```

#### During Session (Phase 2)

**Same as Phase 1**: Voice dictation

**NEW Additions**:
```
☐ System shows real-time safety warnings on iPad:
  - ⚠️ "Silver Crane reported 7/10 pain yesterday. Assess before starting."
  - ⚠️ "Golden Hawk HRV 40ms (RED) - recommend deload today."
☐ System suggests exercise substitutions:
  - "Overhead press contraindicated for shoulder impingement.
     Suggest: Landmine press (neutral grip)."
```

#### Post-Session (Phase 2)

**Fully Automated**:
```
☐ System automatically:
  - Logs workout to database
  - Updates personal records if PR broken
  - Triggers AI Village analysis
  - Sends client dashboard update
  - Alerts you if red flags detected
☐ You: Review AI insights (2 min), approve recommendations if needed
☐ Done!
```

**Time savings**: 15 min → 2 min, plus proactive insights you wouldn't have caught manually

---

## 🛡️ SAFETY PROTOCOL CHECKLIST

### Before Every Session

```
☐ Review client's injury history (health.injuries[])
☐ Check NASM CES exclusions (nasmCesExclusions{})
☐ Ask client: "Any new pain or discomfort since last session?"
☐ If pain >3/10 → Modify session accordingly
☐ If pain >5/10 → STOP, assess, document
```

### During Session

```
☐ Monitor client's form constantly
☐ Watch for pain indicators:
  - Wincing, grimacing
  - Favoring one side
  - Shortened range of motion
  - Verbal complaints
☐ Ask "How does that feel?" after each set
☐ If client reports pain:
  - "On a scale of 1-10, how intense?"
  - "Is it sharp or dull?"
  - "Exactly where do you feel it?"
  - If >5/10 → STOP exercise immediately
```

### Red Flag Triggers (URGENT ACTION REQUIRED)

| Symptom | Action | Timeline |
|---------|--------|----------|
| Pain >7/10 | STOP training, ice, call client tonight | Same day |
| Sharp/shooting pain | STOP training, medical evaluation | Same day |
| Numbness/tingling | STOP training, neurological concern | Same day |
| Chest pain | CALL 911 IMMEDIATELY | Immediate |
| Severe shortness of breath | CALL 911 IMMEDIATELY | Immediate |
| Dizziness/fainting | STOP training, sit down, assess | Immediate |

### Documentation Requirements

**For pain >5/10**:
```markdown
# URGENT: Pain Report - [Client Name]

**Date:** 2025-11-06
**Time:** 10:15 AM
**Spirit Name:** [e.g., Silver Crane]

## Incident Details
- **Exercise:** Overhead press
- **Pain Location:** Right shoulder
- **Intensity:** 7/10
- **Quality:** Sharp, stabbing
- **Onset:** During set 2, rep 5
- **Duration:** Ongoing (15 minutes)

## Immediate Actions Taken
☐ Stopped exercise immediately
☐ Applied ice to affected area (15 min)
☐ Assessed range of motion (limited, painful)
☐ Client able to move arm, no numbness

## Follow-Up Plan
☐ Call client tonight to check on pain
☐ If pain persists >3 days → require doctor clearance
☐ Update nasmCesExclusions: Add "overhead pressing" to forbidden
☐ Next session: Focus on pain-free movements only

## Next Session Plan
- AVOID: Overhead press, push press, handstand push-ups
- SAFE: Landmine press, cable lateral raises (light), floor press
- Monitor: Pain scale must be ≤2/10 before resuming overhead work
```

---

## 📊 CLIENT PROGRESS TRACKING

### Key Metrics to Track

#### Training Metrics
```
☐ Volume (sets x reps x weight) per week
☐ Intensity (avg weight / max weight)
☐ Frequency (sessions per week)
☐ Compliance (attended / scheduled)
☐ Personal records (date + exercise + weight/reps)
```

#### Health Metrics
```
☐ Pain logs (intensity trends)
☐ Sleep (hours per night - Phase 2)
☐ Stress level (1-10 self-report)
☐ Energy level (1-10 per session)
☐ Recovery score (wearable data - Phase 2)
```

#### Body Composition
```
☐ Weight (weekly)
☐ Body fat % (monthly)
☐ Circumferences (monthly)
  - Waist
  - Hips
  - Arms
  - Thighs
☐ Progress photos (every 4 weeks)
```

### Plateau Detection

**Red flags for plateaus**:
```
☐ Same weight for 4+ consecutive weeks
☐ Volume increasing but intensity flat
☐ Client reports "workouts feel easy"
☐ No PRs in 6+ weeks
☐ Motivation/compliance dropping
```

**Action plan when plateau detected**:
```
☐ Run AI Village analysis (Phase 2) OR manual analysis (Phase 0-1):
  - Review training history (volume, intensity, frequency)
  - Check recovery markers (sleep, stress, HRV if available)
  - Identify weak links (form issues, mobility limitations)
☐ Common solutions:
  - Deload week (50% intensity, maintain volume)
  - Program change (linear → 5/3/1, volume → intensity focus)
  - Recovery intervention (sleep optimization, stress management)
  - Nutrition check (protein intake, calorie targets)
☐ Document plan in client notes
☐ Communicate with client: "Here's why you're stuck and how we fix it"
```

---

## 🎯 WEEKLY PLANNING TEMPLATE

### Week Planning Worksheet

**Week of:** [Date]

#### Monday
- **9:00 AM** - Golden Hawk (PT-10001)
  - Focus: Lower body strength
  - Notes: Plateau at 225 squat, trying 5/3/1 this week
- **11:00 AM** - Silver Crane (PT-10003)
  - Focus: Upper body (avoid overhead pressing)
  - Notes: Shoulder improving, monitor pain
- **3:00 PM** - Iron Wolf (PT-10005)
  - Focus: Deadlift progression
  - Notes: Check form on heavy pulls

#### Tuesday
- ...

#### Red Flags to Watch This Week
```
☐ Golden Hawk: Sleep average 6.5 hrs (needs 8) - recommend sleep protocol
☐ Silver Crane: Shoulder pain trending up (2→3→4/10 last 3 weeks) - assess thoroughly
☐ Iron Wolf: Missed last 2 Friday sessions - send motivation text Thursday
```

#### Equipment Needs
```
☐ Landmine attachment (for Silver Crane shoulder-safe pressing)
☐ Resistance bands (corrective work for multiple clients)
☐ Foam roller (recovery work)
```

#### Follow-Up Tasks
```
☐ Call Golden Hawk Monday night - discuss sleep optimization
☐ Text Silver Crane Sunday - "How's shoulder feeling? Rate 1-10"
☐ Check in with Iron Wolf Thursday - "Still good for Friday 3 PM?"
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Common Issues in Phase 0

#### Issue: "I can't find the client's Master Prompt file"

**Solution**:
```
1. Navigate to: client-data/[CLIENT-NAME]/
2. Look for: [CLIENT-NAME]-MASTER-PROMPT-v1.0.json
3. If missing: Client wasn't created properly
   - Run: create-client.bat "[CLIENT-NAME]"
   - Copy data from templates/MASTER-PROMPT-TEMPLATE.json
```

#### Issue: "JSON file won't open / shows errors"

**Solution**:
```
1. Open in VS Code (better error messages)
2. Look for common JSON errors:
   - Missing comma
   - Extra comma at end of array/object
   - Unmatched brackets { } [ ]
   - Unescaped quotes in strings
3. Use VS Code's "Format Document" (Shift+Alt+F)
4. If stuck: Copy data, use templates/MASTER-PROMPT-TEMPLATE.json as base
```

#### Issue: "I forgot to log a session from 2 days ago"

**Solution**:
```
1. Create workout log file with correct date:
   workouts/2025-11-04-session-3.md
2. Fill in what you remember (check voice memos if recorded)
3. Add note: "Logged retroactively on 2025-11-06"
4. Don't stress - better late than never
```

#### Issue: "Client wants to see their progress but website isn't ready"

**Solution**:
```
1. Create manual progress report (see monthly template above)
2. Export to PDF
3. Email to client
4. OR: Show them on your device during session
5. Phase 1+: They'll have real-time dashboard access
```

---

## 📱 CLIENT COMMUNICATION PROTOCOLS

### Weekly Check-Ins (Recommended)

**Purpose**: Maintain accountability, catch issues early

**Sunday Evening Text Template**:
```
Hey [Client Name]! Quick check-in for the week:

1. How's your energy level? (1-10)
2. Any pain or soreness? (location + 1-10)
3. How's nutrition going? (1-10)
4. Looking forward to [day]'s session!

Reply when you can. See you soon! 💪
```

### Motivation Interventions

**When to send**:
```
☐ Client missed 2+ sessions in a row
☐ Compliance drops below 75%
☐ Client expresses frustration/doubt
☐ Plateau lasting >6 weeks
```

**Motivation Text Template**:
```
Hey [Client Name], I noticed you missed [sessions] this week.
Everything okay?

Remember why you started: [client's original 'why' from goals.why]

You've made incredible progress ([specific achievement]).
Don't let a tough week derail months of hard work.

Let's get you back on track. When can you come in this week?
```

### Celebration Messages

**When to send**:
```
☐ PR broken
☐ Weight loss milestone (every 5 lbs)
☐ Perfect attendance month
☐ Form breakthrough (e.g., first full push-up)
```

**Celebration Text Template**:
```
🎉 HUGE WIN, [Client Name]!

You just hit [achievement]!

[Specific detail: e.g., "That's 40 lbs on your squat in 8 weeks!"]

This is the result of showing up consistently and pushing hard.
You should be incredibly proud.

Keep it up! Can't wait to see what you accomplish next! 💪🔥
```

---

## 📈 SUCCESS METRICS: HOW TO KNOW IT'S WORKING

### Monthly Review Metrics

**Client Retention** (Target: >90% at 6 months)
```
☐ Active clients this month: [#]
☐ Active clients last month: [#]
☐ New clients added: [#]
☐ Clients lost: [#]
☐ Retention rate: [%]
```

**Session Compliance** (Target: >85%)
```
☐ Total sessions scheduled: [#]
☐ Total sessions completed: [#]
☐ Compliance rate: [%]
☐ Top reason for missed sessions: [reason]
```

**Progress Metrics** (Target: 80% of clients progressing)
```
☐ Clients who broke PRs this month: [#] ([%])
☐ Clients who lost weight (if goal): [#] ([%])
☐ Clients who gained muscle (if goal): [#] ([%])
☐ Clients reporting increased energy: [#] ([%])
```

**Safety Metrics** (Target: Zero serious injuries)
```
☐ Pain reports >5/10: [#]
☐ Training pauses for safety: [#]
☐ Medical referrals: [#]
☐ Injuries during training: [#] (TARGET: 0)
```

**Time Efficiency** (Target: <15 min admin per session)
```
☐ Avg time spent on data entry per session: [min]
☐ Total admin time per week: [hours]
☐ Admin time as % of billable hours: [%]
```

---

## ✅ DAILY CHECKLIST (PRINTABLE)

### Morning (5 min)
```
☐ Review today's schedule (all clients)
☐ Check each client's Master Prompt (injuries, pain)
☐ Note any special focuses for today
☐ Prepare equipment if needed
```

### Each Session (60 min)
```
☐ Pre-session check-in with client (pain, energy)
☐ Train client (100% focus, no interruptions)
☐ Voice memo key data OR mental notes
☐ Post-session: Update workout log (10 min)
```

### End of Day (10 min)
```
☐ Review all sessions logged
☐ Check for red flags (pain >5/10)
☐ Follow up with clients if needed
☐ Preview tomorrow's schedule
```

### Weekly (30 min - Sunday)
```
☐ Plan upcoming week (all clients)
☐ Review progress (last 2 weeks)
☐ Create intervention list (plateaus, missed sessions)
☐ Send weekly check-in texts
```

### Monthly (1 hour)
```
☐ Progress reviews (photos, measurements, reports)
☐ Update all Master Prompts with current data
☐ Schedule check-in calls with clients
☐ Review business metrics (retention, compliance)
```

---

## 🎓 LEARNING RESOURCES

### Documentation to Reference

**Read these in order**:

1. **Start here**: [WHERE-ARE-MY-FILES.md](../../client-data/WHERE-ARE-MY-FILES.md)
   - Visual map of all files and folders
   - Quick navigation guide

2. **Client management**: [CREATE-NEW-CLIENT-NOW.md](../../client-data/CREATE-NEW-CLIENT-NOW.md)
   - Step-by-step client creation
   - Master Prompt explanation

3. **Real examples**: [REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md](../../client-data/guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md)
   - 5 detailed client scenarios
   - Learn by example

4. **System overview**: [PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.1.md](../personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.1.md)
   - Complete system architecture
   - Future capabilities (Phase 1-2)

5. **AI workflows**: [COACH-CORTEX-V3.0-ULTIMATE.md](../COACH-CORTEX-V3.0-ULTIMATE.md)
   - How the AI system works
   - Multi-AI consensus protocols

### Quick References

**Keep these bookmarked**:
- [QUICK-REFERENCE-CARD.md](../../client-data/QUICK-REFERENCE-CARD.md) - Print and keep on desk
- [CLIENT-REGISTRY.md](../../client-data/CLIENT-REGISTRY.md) - Master list of all clients
- [MASTER-PROMPT-TEMPLATE.json](../../client-data/templates/MASTER-PROMPT-TEMPLATE.json) - Copy for new clients

---

## 🚀 NEXT STEPS

### This Week

```
☐ Read WHERE-ARE-MY-FILES.md (5 min)
☐ Print QUICK-REFERENCE-CARD.md (keep on desk)
☐ Create your first real client:
  bash create-client.bat "[CLIENT-NAME]"
☐ Fill in Master Prompt (start with basics only)
☐ Log your first session (use workout template)
☐ Review this checklist daily until it's second nature
```

### This Month

```
☐ Get comfortable with file-based workflow
☐ Create all current clients in system
☐ Log at least 4 weeks of data consistently
☐ Start seeing patterns (who's progressing, who's stuck)
☐ Prepare for Phase 1 implementation (voice system)
```

### This Quarter

```
☐ Phase 1 complete (voice, dashboards, automation)
☐ Phase 2 begins (AI Village, wearables)
☐ Zero manual data entry achieved
☐ Clients love their real-time dashboards
☐ You're training 30% more clients in same time
```

---

## 🆘 NEED HELP?

### Quick Troubleshooting

1. **Can't find something?** → Check WHERE-ARE-MY-FILES.md
2. **JSON errors?** → Open in VS Code, use "Format Document"
3. **Forgot how to create client?** → Run create-client.bat without arguments for help
4. **Client safety concern?** → Review Safety Protocol Checklist above
5. **Plateau/stuck client?** → Review AI Village Consensus examples in COACH-CORTEX-V3.0-ULTIMATE.md

### Documentation Index

All documentation is in:
```
docs/ai-workflow/
├── COACH-CORTEX-V3.0-ULTIMATE.md
├── personal-training/
│   └── PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.1.md
├── workflows/
│   ├── AUTONOMOUS-COACHING-LOOP-WORKFLOW.md
│   ├── AI-VILLAGE-COORDINATION-PROTOCOL.md
│   └── YOUR-DAILY-WORKFLOW-CHECKLIST.md (THIS FILE)
└── ...

client-data/
├── WHERE-ARE-MY-FILES.md (START HERE)
├── QUICK-REFERENCE-CARD.md (PRINT THIS)
├── CREATE-NEW-CLIENT-NOW.md
├── templates/
│   └── MASTER-PROMPT-TEMPLATE.json
└── guides/
    ├── REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md
    └── ...
```

---

**You've got this! 💪**

**Remember**: Start simple (Phase 0), build habits, then let automation amplify your impact (Phase 1-2).

The system is designed to make you 10x more efficient. Trust the process!

---

**Last Updated:** 2025-11-06
**Version:** 3.1
**Status:** ✅ Ready to use NOW (Phase 0)
