# SwanStudios Client Management - Quick Reference Card
**Print this and keep it on your desk!**

---

## 📍 File Locations

**Main folder:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\
```

**Your clients:**
```
client-data/JOHN-DOE/
client-data/SARAH-MITCHELL/
client-data/[CLIENT-NAME]/
```

---

## ⚡ Quick Actions

### Create New Client (Windows)
**Option 1: Double-click**
```
create-client.bat
```
Then type: `JOHN-DOE`

**Option 2: Command line**
```bash
cd client-data
create-client.bat "JOHN-DOE"
```

**Option 3: Manual copy**
1. Copy `TEMPLATE-CLIENT` folder
2. Rename to `JOHN-DOE`
3. Fill in Master Prompt JSON

---

### Log a Workout
1. Go to: `client-data/JOHN-DOE/workouts/`
2. Create file: `2025-11-05-session-1.md`
3. Copy template from `templates/workout-template.md`
4. Fill in workout details

---

### Take Progress Photos
1. Go to: `client-data/JOHN-DOE/photos/`
2. Save as: `2025-11-05-front.jpg`
3. Take: front, side, back
4. **Never commit to Git!** (photos are auto-ignored)

---

### Update Client Data
1. Open: `client-data/JOHN-DOE/JOHN-DOE-MASTER-PROMPT-v1.0.json`
2. Edit with VS Code or text editor
3. Update weight, measurements, progress
4. Save

---

## 📋 Every New Client Checklist

- [ ] **Copy TEMPLATE-CLIENT folder** → rename to CLIENT-NAME
- [ ] **Fill Master Prompt JSON** (basic info at minimum)
- [ ] **Get consent forms signed** (see guides/CONSENT-MANAGEMENT-FRAMEWORK.md)
- [ ] **Create consent/consent-summary.md** (track what they consented to)
- [ ] **Take baseline photos** (if client consents)
- [ ] **Log first session** in workouts/ folder
- [ ] **Add to CLIENT-REGISTRY.md** (master list of all clients)

---

## 📅 Regular Tasks

### After Every Session
- [ ] Log workout in `workouts/YYYY-MM-DD-session-#.md`
- [ ] Note client feedback
- [ ] Update private notes if needed

### Every 4 Weeks
- [ ] Take progress photos (compare to baseline)
- [ ] Update weight and measurements in Master Prompt
- [ ] Create monthly progress report

### Every 3 Months
- [ ] Review consent preferences with client
- [ ] Update consent-summary.md if anything changed

### Every Week (Recommended)
- [ ] Back up entire client-data/ folder
- [ ] External hard drive or cloud storage (encrypted!)

---

## 🔒 PRIVACY RULES

### ✅ SAFE to commit to Git:
- Master Prompt JSON files
- Workout logs (markdown files)
- Progress reports (markdown files)
- Consent summaries (markdown files)
- Templates and guides

### ❌ NEVER commit to Git:
- Photos (*.jpg, *.png)
- Videos (*.mp4, *.mov)
- Signed consent forms PDFs
- Medical clearance PDFs
- Anything with client's full name in filename

**The .gitignore protects you, but always double-check!**

---

## 📱 Access on iPad/Phone

### Setup (one-time)
1. Install Working Copy app (iOS)
2. Clone the repo to iPad
3. Edit files on the go
4. Sync back to desktop

**Full guide:** `guides/IPAD-SETUP-GUIDE.md`

---

## 🆘 Need Help?

| Question | Read This File |
|----------|---------------|
| How do I onboard a new client? | `NEW-CLIENT-TODAY-WORKFLOW.md` |
| What consent forms do I need? | `guides/CONSENT-MANAGEMENT-FRAMEWORK.md` |
| How do I protect client data? | `guides/SECURITY-PRIVACY-IMPLEMENTATION.md` |
| Can I see a real example? | `guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md` |
| How do I create client files? | `CREATE-NEW-CLIENT-NOW.md` |
| What's the full system? | `SYSTEM-COMPLETE-OVERVIEW.md` |

---

## 🎯 Client Folder Structure (Every Client)

```
CLIENT-NAME/
├── CLIENT-NAME-MASTER-PROMPT-v1.0.json  ← All client data
├── README.md                            ← Quick reference for this client
│
├── consent/
│   ├── consent-forms-signed.pdf         ← Scanned forms
│   └── consent-summary.md               ← What they consented to
│
├── workouts/
│   ├── 2025-11-05-session-1.md          ← Every workout logged
│   ├── 2025-11-08-session-2.md
│   └── ...
│
├── nutrition/
│   ├── 2025-W45-nutrition-log.md        ← Weekly food logs
│   └── ...
│
├── photos/
│   ├── 2025-11-05-front.jpg             ← Progress photos
│   ├── 2025-11-05-side.jpg
│   └── ...
│
├── notes/
│   ├── private-notes.md                 ← Your trainer notes
│   └── pain-tracking-log.md             ← Injury/pain tracking
│
└── progress-reports/
    ├── 2025-12-monthly-report.md        ← Monthly summaries
    └── ...
```

---

## 💡 Pro Tips

### Tip 1: Name Clients Consistently
**Use:** `JOHN-DOE`, `SARAH-MITCHELL` (UPPERCASE, hyphens)
**Not:** `john doe`, `Sarah_Mitchell`, `JohnDoe`

Why? Makes sorting and finding easier.

---

### Tip 2: Date Files Consistently
**Use:** `2025-11-05-session-1.md`
**Format:** `YYYY-MM-DD-description.md`

Why? Files auto-sort chronologically.

---

### Tip 3: Back Up Weekly
**Set a reminder:** Every Sunday at 8 PM
**Action:** Copy entire `client-data/` folder to external drive

**Backup locations:**
1. External hard drive (at home)
2. Cloud storage (Google Drive, encrypted)
3. Second external drive (at office or friend's house)

---

### Tip 4: Use VS Code
**Why?** Best text editor for editing JSON and markdown files.

**Download:** https://code.visualstudio.com/

**Install extensions:**
- JSON Language Features (built-in)
- Markdown All in One
- File Utils (easier file operations)

---

### Tip 5: Review Privacy Weekly
Ask yourself:
- [ ] Are all client photos in the right folders?
- [ ] Did I accidentally save anything in the wrong place?
- [ ] Are consent forms up to date?
- [ ] Have I backed up this week?

---

## ⌨️ Keyboard Shortcuts (VS Code)

| Action | Windows | Mac |
|--------|---------|-----|
| Open file | `Ctrl+O` | `Cmd+O` |
| Save file | `Ctrl+S` | `Cmd+S` |
| Find in file | `Ctrl+F` | `Cmd+F` |
| Find in folder | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| New file | `Ctrl+N` | `Cmd+N` |
| Format JSON | `Shift+Alt+F` | `Shift+Opt+F` |

---

## 📊 Master Prompt - Most Important Fields

Don't stress about filling in ALL 247 fields. Start with these essentials:

### Client Info
- `client.name`
- `client.preferredName`
- `client.age`
- `client.contact.phone`
- `client.contact.email`

### Goals
- `goals.primary` (Weight loss, Muscle gain, etc.)
- `goals.why` (Their motivation)
- `goals.timeline`

### Health (Critical for Safety)
- `health.medicalConditions` (list any)
- `health.doctorCleared` (true/false)
- `health.currentPain` (any pain/injuries)

### Measurements (Baseline)
- `measurements.currentWeight`
- `measurements.targetWeight`

### Package
- `package.tier` (Silver/Golden/Rhodium)
- `package.sessionsPerWeek`

**Everything else can be filled in over time!**

---

## 📞 Emergency: Client Wants Data Deleted

### Do This Immediately (Within 48 Hours):

1. **Stop all training** (if relationship is ending)
2. **Ask clarification:**
   - "Do you want ALL data deleted, or just marketing photos?"
   - "Would you like a copy of your progress first?"
3. **Follow deletion workflow:**
   - See `guides/CONSENT-MANAGEMENT-FRAMEWORK.md` → "Data Deletion Workflow"
4. **Keep legal records for 7 years:**
   - Consent forms
   - Liability waivers
   - Payment records
5. **Confirm in writing:**
   - Email client: "Your data has been deleted as of [date]"

---

## 🚨 Red Flags - When to Stop Training

**STOP immediately and refer to doctor if client experiences:**
- Sharp, stabbing pain during exercise (7-10/10)
- Chest pain, shortness of breath, dizziness
- Joint pain that doesn't improve with modification
- Symptoms of serious medical condition

**Log in:** `notes/pain-injury-log.md`
**Action:** "I care about your safety. Let's have your doctor check this out before we continue."

---

## 🎉 Quick Wins to Celebrate with Clients

Track these milestones in Master Prompt or progress reports:
- First week of perfect attendance
- First 5 lbs lost
- First personal record (PR) in any exercise
- First full push-up (if modified before)
- First month completed
- First progress photo comparison where they SEE the difference
- First time they say "I feel amazing!"

**Take a photo, post on social (with consent), celebrate!**

---

**Print this card and keep it visible at your desk!**
**You've got this! 💪**

---

## Quick Start Command (Copy-Paste)

**Create a new client right now:**

```bash
cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
create-client.bat "JOHN-DOE"
```

Replace `JOHN-DOE` with your actual client's name.

**Done! Now open the folder and fill in the Master Prompt.**

---

**Last Updated:** 2025-11-05
**Version:** 3.0
