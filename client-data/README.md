# 📁 SwanStudios Personal Training - Client Data Management

**Portable Client Data System for iPad, VS Code, and AI Apps**
**Version:** 1.0
**Last Updated:** 2025-11-05

---

## 🎯 What This Folder Is

This is your **PORTABLE client data management system** for SwanStudios Personal Training.

**You can:**
- ✅ Copy this entire folder to a new location
- ✅ Open it as a separate VS Code project
- ✅ Add it to Claude Desktop as a standalone project
- ✅ Sync it to your iPad via iCloud/GitHub
- ✅ Use it with VS Code on iPad or AI apps (Claude, ChatGPT)
- ✅ Move client data around easily without affecting your main SwanStudios code

**Each client gets their own folder** with questionnaires, progress tracking, Master Prompts, and all training data.

---

## 📂 Folder Structure

```
client-data/
├── README.md                          ← YOU ARE HERE (start here every time)
├── CLIENT-REGISTRY.md                 ← Master list of all clients
├── guides/
│   ├── IPAD-SETUP-GUIDE.md           ← How to access this on iPad
│   ├── SYNC-STRATEGY.md              ← How to sync across devices
│   └── AI-APPS-WORKFLOW.md           ← How to use Claude/ChatGPT with client data
├── templates/
│   ├── CLIENT-ONBOARDING-QUESTIONNAIRE.md  (85 questions)
│   ├── MASTER-PROMPT-TEMPLATE.json         (AI training prompt for client)
│   ├── PROGRESS-TRACKING-TEMPLATE.md       (Weekly check-ins)
│   └── CLIENT-FOLDER-CHECKLIST.md          (Setup checklist for new clients)
├── TEMPLATE-CLIENT/                   ← Copy this folder for each new client
│   ├── README.md                      (Client overview)
│   ├── questionnaire.md               (Completed 85-question form)
│   ├── master-prompt.json             (Client's AI training configuration)
│   ├── progress/                      (Weekly tracking)
│   ├── workouts/                      (Generated workout plans)
│   ├── nutrition/                     (Meal plans, macros)
│   ├── photos/                        (Progress photos)
│   └── notes/                         (Training notes, red flags)
└── [ACTUAL CLIENT FOLDERS]            ← Your real client data goes here
    ├── john-doe-silver/
    ├── jane-smith-golden/
    └── alex-jones-rhodium/
```

---

## 🚀 Quick Start (First Time Setup)

### Step 1: Add This Folder as a VS Code Project

**Option A: Open in New Window**
1. Right-click `client-data/` folder in File Explorer
2. Select "Open with Code"
3. Keep it open in a separate VS Code window

**Option B: Add to Workspace**
1. In VS Code: File → Add Folder to Workspace
2. Select `client-data/` folder
3. Save workspace as `SwanStudios-Clients.code-workspace`

**Option C: Claude Desktop Project**
1. Open Claude Desktop
2. Click "Add Project"
3. Select `client-data/` folder
4. Rename to "SwanStudios Clients"

### Step 2: Set Up iPad Access (Choose Your Method)

See [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) for detailed instructions.

**Quick Options:**
- **iCloud Drive:** Copy folder to iCloud → Access via Files app on iPad
- **GitHub:** Push folder to private repo → Clone on iPad via Working Copy app
- **VS Code for Web:** Use vscode.dev to access GitHub repos on iPad

### Step 3: Create Your First Client

1. Copy `TEMPLATE-CLIENT/` folder
2. Rename it: `firstname-lastname-tier/` (e.g., `john-doe-silver/`)
3. Fill out the questionnaire
4. Generate their Master Prompt JSON
5. Add them to `CLIENT-REGISTRY.md`

---

## 📝 Creating a New Client (Step-by-Step)

### 1. Copy the Template
```bash
# In terminal (or use File Explorer)
cp -r TEMPLATE-CLIENT/ john-doe-silver/
```

### 2. Fill Out the Questionnaire
1. Open `john-doe-silver/questionnaire.md`
2. Complete all 85 questions with client
3. Save the file

### 3. Generate Master Prompt JSON
1. Use the questionnaire data to fill out `master-prompt.json`
2. This file defines the client's AI training configuration
3. You can paste this JSON into Claude/ChatGPT to generate personalized workouts

### 4. Update Client Registry
1. Open `CLIENT-REGISTRY.md`
2. Add client to the appropriate tier section (Silver/Golden/Rhodium)
3. Include: Name, tier, start date, folder path

### 5. Start Training
- Add workouts to `workouts/`
- Track progress in `progress/`
- Add photos to `photos/`
- Keep notes in `notes/`

---

## 💻 How to Use on iPad

### Method 1: VS Code for Web (Recommended)
1. Go to https://vscode.dev on iPad Safari
2. Sign in with GitHub
3. Open your client-data repository
4. Edit files directly in browser
5. Changes auto-sync to GitHub

**Pros:** Full VS Code experience, free, syncs automatically
**Cons:** Requires internet connection

### Method 2: Working Copy App + AI Apps
1. Install Working Copy (Git client for iOS)
2. Clone your client-data repository
3. Use "Open In..." to send files to Claude app or ChatGPT app
4. AI apps can read the questionnaire and generate workouts
5. Copy results back to Working Copy, commit, push

**Pros:** Works offline, native AI app experience
**Cons:** Manual file transfers, $19.99 for full Working Copy

### Method 3: iCloud Drive + Text Editor
1. Copy `client-data/` to iCloud Drive
2. Use Textastic or Pretext (markdown editors for iPad)
3. Copy client data to Claude app or ChatGPT app when needed
4. Manual sync back to iCloud

**Pros:** Simple, works offline
**Cons:** No Git version control, manual syncing

**See [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) for detailed tutorials.**

---

## 🤖 Using AI Apps with Client Data

### With Claude App (iOS/iPadOS)
1. Open client's `questionnaire.md` in Working Copy or Files app
2. Use "Share" → "Copy" to copy the markdown
3. Open Claude app
4. Start new conversation with Master Onboarding Prompt
5. Paste client questionnaire
6. Ask: "Generate a workout plan for this client based on their questionnaire"

### With ChatGPT App (iOS/iPadOS)
1. Same process as Claude
2. Use ChatGPT-5 for workout generation
3. Paste Master Prompt JSON for structured output

### With Gemini (iOS/iPadOS)
1. Gemini app has file upload feature
2. Can directly upload `master-prompt.json`
3. Ask for workout plans, nutrition advice, etc.

**See [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md) for complete AI workflow.**

---

## 🔄 Syncing Across Devices

### Recommended: GitHub Private Repository

**Setup (one-time):**
1. Create private GitHub repository: `swanstudios-client-data`
2. Push this folder to the repo
3. Clone on iPad via Working Copy app
4. Clone on desktop via Git

**Daily Workflow:**
```bash
# On desktop after making changes
git add .
git commit -m "Update John Doe progress - Week 3"
git push

# On iPad (in Working Copy app)
Pull latest changes → Edit files → Commit → Push
```

**Pros:** Version control, automatic sync, works on all devices
**Cons:** Requires GitHub account (free for private repos)

### Alternative: iCloud Drive

**Setup:**
1. Move `client-data/` to iCloud Drive folder
2. Wait for sync to complete
3. Access via Files app on iPad

**Pros:** Automatic sync, no GitHub needed
**Cons:** No version control, can have sync conflicts

**See [guides/SYNC-STRATEGY.md](guides/SYNC-STRATEGY.md) for detailed sync setup.**

---

## 🛡️ Security & Privacy

### IMPORTANT: Client Data is Sensitive

**DO:**
- ✅ Use private GitHub repository (NOT public)
- ✅ Keep this folder separate from public code
- ✅ Use strong passwords for iCloud/GitHub
- ✅ Encrypt sensitive files (photos, medical info)
- ✅ Follow HIPAA guidelines if applicable

**DON'T:**
- ❌ Push client data to public repositories
- ❌ Share client folders without permission
- ❌ Include credit card or full SSN in files
- ❌ Upload client photos to public AI tools (use SwanStudios app instead)

### Encryption Options:
- Use iOS Files app built-in encryption
- Use Working Copy's private repositories
- Use VeraCrypt for encrypted folders on desktop

---

## 📊 Client Tiers & Pricing

| Tier | Price | Features |
|---|---|---|
| **Silver** | $50/month | 2 workouts/week, SMS check-ins, iPad app access |
| **Golden** | $125/month | 4 workouts/week, SMS + video calls, nutrition plans |
| **Rhodium** | $200/month | 6 workouts/week, daily SMS, wearable integration, 24/7 support |

**Payment:** Stripe Payment Links (see [PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md](../docs/ai-workflow/personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md) for setup)

---

## 🆘 Troubleshooting

### "I can't see my client-data folder on iPad"
- Check iCloud sync status (Settings → iCloud → iCloud Drive)
- Or check GitHub repo sync in Working Copy app

### "VS Code for Web won't open my files"
- Make sure you pushed `client-data/` to a GitHub repo
- Sign in to GitHub on vscode.dev
- Click "Open Remote Repository"

### "AI apps can't read my files"
- AI apps can't directly access file systems
- You must copy/paste file contents into the AI chat
- Or use file upload feature (Gemini supports this)

### "How do I move this folder to a new computer?"
- If using GitHub: Just clone the repo
- If using iCloud: Copy from iCloud Drive folder
- Or use USB drive to physically copy the folder

---

## 📚 Reference Documents

### In This Folder:
- [CLIENT-REGISTRY.md](CLIENT-REGISTRY.md) - Master client list
- [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md) - iPad setup tutorial
- [guides/SYNC-STRATEGY.md](guides/SYNC-STRATEGY.md) - Device sync guide
- [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md) - Using AI apps with clients
- [templates/CLIENT-ONBOARDING-QUESTIONNAIRE.md](templates/CLIENT-ONBOARDING-QUESTIONNAIRE.md) - 85-question form

### In Main SwanStudios Repo:
- [Personal Training Master Blueprint v3.0](../docs/ai-workflow/personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md) - Complete system design
- [AI Village Handbook](../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md) - AI coordination
- [Master Onboarding Prompt](../AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md) - For AI sessions

---

## 🎉 You're Ready!

**Your client data is now portable, iPad-ready, and AI-friendly.**

**Next Steps:**
1. Choose your iPad sync method (GitHub or iCloud)
2. Set up iPad access following [guides/IPAD-SETUP-GUIDE.md](guides/IPAD-SETUP-GUIDE.md)
3. Create your first client using `TEMPLATE-CLIENT/`
4. Start using AI apps to generate workouts

**Questions?** See the guides/ folder or reference the Personal Training Master Blueprint.

---

**Last Updated:** 2025-11-05
**System Version:** Personal Training v3.0
**Maintained By:** SwanStudios Development
