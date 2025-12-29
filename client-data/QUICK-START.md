# ⚡ Quick Start - SwanStudios Client Data Management

**Total Setup Time:** 5 minutes
**Goal:** Get your first client folder set up and ready for iPad access

---

## 🚀 5-Minute Setup

### Step 1: Create Your First Client (2 minutes)

```bash
# Copy the template folder
cp -r TEMPLATE-CLIENT/ john-doe-silver/

# Or on Windows:
# xcopy TEMPLATE-CLIENT john-doe-silver\ /E /I
```

**Naming Convention:** `firstname-lastname-tier`
- Examples: `john-doe-silver`, `jane-smith-golden`, `alex-jones-rhodium`

### Step 2: Fill Out Questionnaire (30 minutes with client)

1. Open: `john-doe-silver/questionnaire.md`
2. Complete all 85 questions during client intake
3. Save the file

### Step 3: Add to Registry (1 minute)

1. Open: `CLIENT-REGISTRY.md`
2. Add client to appropriate tier section (Silver/Golden/Rhodium)
3. Fill in: Name, folder, start date, status

### Step 4: Generate First Workout (2 minutes)

1. Copy questionnaire sections (Goals, Health, Training History)
2. Open Claude app or ChatGPT
3. Paste: "Generate Week 1 workout for this client: [paste questionnaire]"
4. Save AI's response to: `john-doe-silver/workouts/week-01-workout.md`

---

## 📱 iPad Setup (Pick One Method)

### Method 1: VS Code for Web (15 minutes, Free)
**Best for:** Full editing experience, no app purchase needed

1. **On Desktop:** Push client-data to GitHub (see SYNC-STRATEGY.md)
2. **On iPad:** Open Safari → vscode.dev → Sign in with GitHub → Open repository
3. **Done!** Edit files in browser, changes auto-sync

**See:** [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) → Method 1

---

### Method 2: iCloud Drive (5 minutes, Free)
**Best for:** Simplicity, automatic sync, no Git needed

1. **On Desktop:** Copy `client-data/` folder to iCloud Drive
2. **On iPad:** Open Files app → iCloud Drive → client-data
3. **Done!** Edit files, changes sync automatically

**See:** [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) → Method 3

---

### Method 3: Working Copy (20 minutes, $19.99)
**Best for:** Offline access, version control, professional use

1. **On Desktop:** Push client-data to GitHub
2. **On iPad:** Install Working Copy app → Clone repository
3. **Done!** Edit offline, commit/push when ready

**See:** [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) → Method 2

---

## 🤖 Using AI Apps on iPad

### Generate Workout Plan

1. Open client's questionnaire file
2. Copy relevant sections (Goals, Injuries, Preferences)
3. Open Claude app
4. Paste: "Generate a workout for this client: [paste]"
5. Save AI's response to client's `workouts/` folder

**See:** [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md) → Workflow 1

### Generate Meal Plan

1. Copy nutrition section from questionnaire
2. Open ChatGPT app
3. Paste: "Create a 7-day meal plan for: [paste]"
4. Save to client's `nutrition/` folder

**See:** [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md) → Workflow 2

---

## 📊 Daily Workflow

### Before Training Session
1. Open client's latest progress report
2. Review last workout and any pain notes
3. Generate today's workout using AI (if needed)

### After Training Session
1. Update progress report (what they did, how they felt)
2. Note any pain or form issues
3. Save/commit changes (if using GitHub)

### End of Week
1. Create weekly progress report (use PROGRESS-TRACKING-TEMPLATE.md)
2. Analyze trends (weight, strength, compliance)
3. Generate next week's workouts

---

## 📁 Folder Structure (Quick Reference)

```
client-data/
├── README.md                          ← Full documentation
├── QUICK-START.md                     ← YOU ARE HERE
├── CLIENT-REGISTRY.md                 ← Master client list
├── guides/
│   ├── IPAD-SETUP-GUIDE.md           ← iPad setup (3 methods)
│   ├── SYNC-STRATEGY.md              ← Syncing across devices
│   └── AI-APPS-WORKFLOW.md           ← Using AI apps
├── templates/
│   ├── CLIENT-ONBOARDING-QUESTIONNAIRE.md
│   ├── MASTER-PROMPT-TEMPLATE.json
│   ├── PROGRESS-TRACKING-TEMPLATE.md
│   └── CLIENT-FOLDER-CHECKLIST.md
├── TEMPLATE-CLIENT/                   ← Copy this for each client
│   ├── README.md
│   ├── questionnaire.md
│   ├── master-prompt.json
│   ├── progress/
│   ├── workouts/
│   ├── nutrition/
│   ├── photos/
│   └── notes/
└── [YOUR CLIENT FOLDERS]
    ├── john-doe-silver/
    ├── jane-smith-golden/
    └── alex-jones-rhodium/
```

---

## ✅ Checklist (Use This Every Time)

### New Client Setup
- [ ] Copy TEMPLATE-CLIENT/ → `firstname-lastname-tier/`
- [ ] Complete questionnaire with client (85 questions)
- [ ] Add to CLIENT-REGISTRY.md
- [ ] Take baseline photos (front, side, back)
- [ ] Generate Week 1 workout using AI
- [ ] Set up payment (Stripe link)
- [ ] Send first workout plan to client

### Weekly Workflow
- [ ] Generate this week's workouts (AI)
- [ ] Track client progress in `progress/week-XX.md`
- [ ] Review and adjust based on last week
- [ ] Take progress photos (every 2-4 weeks)
- [ ] Update CLIENT-REGISTRY.md metrics

---

## 🆘 Quick Help

### "How do I access this on iPad?"
→ See [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md)

### "How do I sync across devices?"
→ See [guides/SYNC-STRATEGY.md](guides/SYNC-STRATEGY.md)

### "How do I use AI apps to generate workouts?"
→ See [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md)

### "What files do I need for each client?"
→ See [templates/CLIENT-FOLDER-CHECKLIST.md](templates/CLIENT-FOLDER-CHECKLIST.md)

---

## 💡 Pro Tips

1. **Use AI for everything:** Don't manually write workouts or meal plans. Copy client data → Paste to AI → Save result. Saves 30-60 minutes per client.

2. **Set up iPad access first:** Even if you primarily work on desktop, having iPad access is crucial for on-the-go updates.

3. **Commit often (if using GitHub):** After every client session, commit changes. This creates a timeline of client progress.

4. **Use templates:** Copy PROGRESS-TRACKING-TEMPLATE.md for every weekly report. Don't start from scratch.

5. **Bookmark this file:** You'll reference it weekly. Add to browser bookmarks or iPhone/iPad home screen.

---

## 📞 Next Steps

**You're Ready!** Here's what to do next:

1. **Set up iPad access** (choose one method above)
2. **Create your first client folder** (Step 1)
3. **Generate their first workout using AI** (Step 4)
4. **Start training!**

**Questions?** See [README.md](README.md) for complete documentation.

---

**Last Updated:** 2025-11-05
**System Version:** Personal Training v3.0
**Time to Full Setup:** ~20 minutes (including iPad)
