# WHERE ARE MY FILES? - Visual Map
**Quick reference to find everything in the client-data folder**

---

## 📍 Main Location

**Full path:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\
```

**Quick navigation (Command Prompt/PowerShell):**
```bash
cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
```

**Quick navigation (File Explorer):**
1. Press `Windows + E` to open File Explorer
2. Copy-paste this in the address bar: `c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data`
3. Press Enter

---

## 🗂️ Complete File Structure

```
client-data/                                    ← YOU ARE HERE
│
├── 📄 README.md                                ← Start here! System introduction
├── 📄 QUICK-START.md                           ← Quick start guide
├── 📄 SYSTEM-COMPLETE-OVERVIEW.md              ← Complete system documentation
├── 📄 NEW-CLIENT-TODAY-WORKFLOW.md             ← How to onboard new clients
├── 📄 CREATE-NEW-CLIENT-NOW.md                 ← How to create client files (READ THIS!)
├── 📄 QUICK-REFERENCE-CARD.md                  ← Print this! Keep on desk
├── 📄 CLIENT-REGISTRY.md                       ← Master list of all clients
├── 📄 .gitignore                               ← Privacy protection (keeps photos out of Git)
│
├── 🔧 create-client.sh                         ← Script: Create new client (Mac/Linux)
├── 🔧 create-client.bat                        ← Script: Create new client (Windows) ⭐ USE THIS
│
├── 📁 templates/                               ← Templates you'll copy for each client
│   ├── MASTER-PROMPT-TEMPLATE.json             ← Copy this for each new client
│   ├── MASTER-PROMPT-SCHEMA-v3.0.json          ← Validation schema (don't edit)
│   ├── CLIENT-ONBOARDING-QUESTIONNAIRE.md      ← Use during initial consultation
│   ├── PROGRESS-TRACKING-TEMPLATE.md           ← Monthly progress report template
│   └── CLIENT-FOLDER-CHECKLIST.md              ← Checklist for new client setup
│
├── 📁 guides/                                  ← Reference guides (read when you need help)
│   ├── REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md     ← 5 realistic client examples ⭐ READ THIS
│   ├── CONSENT-MANAGEMENT-FRAMEWORK.md         ← Legal consent handling (important!)
│   ├── SECURITY-PRIVACY-IMPLEMENTATION.md      ← How to encrypt and protect data
│   ├── DESIGN-VARIANTS-MASTER-GUIDE.md         ← UI/UX design specs for dashboards
│   ├── AI-APPS-WORKFLOW.md                     ← AI coaching setup
│   ├── IPAD-SETUP-GUIDE.md                     ← Mobile access setup
│   └── SYNC-STRATEGY.md                        ← How to sync data across devices
│
├── 📁 TEMPLATE-CLIENT/                         ← Copy this folder for each new client
│   ├── README.md                               ← Client folder overview
│   ├── master-prompt.json                      ← Template (rename to CLIENT-NAME-MASTER-PROMPT-v1.0.json)
│   ├── questionnaire.md                        ← Initial questionnaire
│   ├── 📁 workouts/                            ← Workout logs go here
│   ├── 📁 nutrition/                           ← Food logs go here
│   ├── 📁 photos/                              ← Progress photos go here
│   ├── 📁 notes/                               ← Private trainer notes go here
│   └── 📁 progress/                            ← Progress reports go here
│
└── 📁 [YOUR-CLIENT-FOLDERS]/                   ← Create one folder per client
    ├── JOHN-DOE/                               ← Example client 1
    ├── SARAH-MITCHELL/                         ← Example client 2
    └── [CLIENT-NAME]/                          ← Your clients go here

```

---

## 🚀 How to Use These Files

### 1️⃣ **First Time Setup** (Do this once)

**Read these files in order:**
1. [README.md](README.md) - System introduction
2. [CREATE-NEW-CLIENT-NOW.md](CREATE-NEW-CLIENT-NOW.md) - How to create client files
3. [REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md](guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md) - See Sarah's example

**Print this:**
- [QUICK-REFERENCE-CARD.md](QUICK-REFERENCE-CARD.md) - Keep on your desk!

---

### 2️⃣ **For Each New Client** (Repeat this process)

**Step 1: Create client folder**

**Option A: Automated (Recommended) ⭐**
1. Open Command Prompt or PowerShell
2. Run:
   ```bash
   cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
   create-client.bat "JOHN-DOE"
   ```
3. Done! Folder created automatically.

**Option B: Manual**
1. Copy [TEMPLATE-CLIENT](TEMPLATE-CLIENT) folder
2. Rename to `JOHN-DOE` (your client's name)
3. Rename `master-prompt.json` to `JOHN-DOE-MASTER-PROMPT-v1.0.json`

---

**Step 2: Fill in client data**
1. Open `JOHN-DOE/JOHN-DOE-MASTER-PROMPT-v1.0.json`
2. Use [templates/MASTER-PROMPT-TEMPLATE.json](templates/MASTER-PROMPT-TEMPLATE.json) as reference
3. Fill in what you know (don't worry about filling in everything day 1)

---

**Step 3: Get consent forms signed**
- Use [guides/CONSENT-MANAGEMENT-FRAMEWORK.md](guides/CONSENT-MANAGEMENT-FRAMEWORK.md) for consent templates
- Store signed PDFs in `JOHN-DOE/consent/`
- Create `consent-summary.md` to track what client consented to

---

**Step 4: Log first session**
1. Create file: `JOHN-DOE/workouts/2025-11-05-session-1.md`
2. Log baseline measurements, workout, client feedback

---

**Step 5: Add to registry**
- Update [CLIENT-REGISTRY.md](CLIENT-REGISTRY.md) with new client row

---

### 3️⃣ **Daily/Weekly Operations**

**After every session:**
- Log workout in `[CLIENT-NAME]/workouts/YYYY-MM-DD-session-#.md`

**Every 4 weeks:**
- Take progress photos → save in `[CLIENT-NAME]/photos/`
- Update measurements in Master Prompt JSON
- Create monthly report in `[CLIENT-NAME]/progress-reports/`

**Every week (Sunday evening):**
- Back up entire `client-data/` folder to external drive

---

## 📂 Where Specific Things Are Located

### Want to create a new client?
**Use:** [create-client.bat](create-client.bat)
**How:** Double-click the file, or run from command line

### Need consent form templates?
**Location:** [guides/CONSENT-MANAGEMENT-FRAMEWORK.md](guides/CONSENT-MANAGEMENT-FRAMEWORK.md)
**Section:** "Templates & Forms"

### Want to see a real example?
**Location:** [guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md](guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md)
**Read:** Sarah's weight loss journey (starts on line 1)

### Need the Master Prompt template?
**Location:** [templates/MASTER-PROMPT-TEMPLATE.json](templates/MASTER-PROMPT-TEMPLATE.json)
**Copy this for each new client**

### How do I onboard a client?
**Location:** [NEW-CLIENT-TODAY-WORKFLOW.md](NEW-CLIENT-TODAY-WORKFLOW.md)
**Step-by-step guide from first contact to first session**

### How do I protect client data?
**Location:** [guides/SECURITY-PRIVACY-IMPLEMENTATION.md](guides/SECURITY-PRIVACY-IMPLEMENTATION.md)
**Covers:** Encryption, backups, HIPAA compliance

### How do I set up AI coaching?
**Location:** [guides/AI-APPS-WORKFLOW.md](guides/AI-APPS-WORKFLOW.md)
**Covers:** Daily check-ins, communication styles

### What's the complete system overview?
**Location:** [SYSTEM-COMPLETE-OVERVIEW.md](SYSTEM-COMPLETE-OVERVIEW.md)
**Complete documentation of everything**

---

## 🔍 Find Files Quickly

### Windows File Explorer Search:
1. Navigate to `client-data/` folder
2. Use search box (top-right)
3. Search for:
   - Client name: `JOHN-DOE`
   - File type: `*.json` or `*.md`
   - Date: `2025-11-05`

### VS Code Search:
1. Open VS Code
2. Open folder: `client-data/`
3. Press `Ctrl+Shift+F` (Find in Files)
4. Search for anything across all files

---

## 🎯 Quick Actions

### I need to...

**Create a new client**
→ Run `create-client.bat "CLIENT-NAME"`

**Fill in client data**
→ Edit `[CLIENT-NAME]/[CLIENT-NAME]-MASTER-PROMPT-v1.0.json`

**Log a workout**
→ Create `[CLIENT-NAME]/workouts/YYYY-MM-DD-session-#.md`

**Track nutrition**
→ Create `[CLIENT-NAME]/nutrition/YYYY-W##-nutrition-log.md`

**Store progress photos**
→ Save to `[CLIENT-NAME]/photos/YYYY-MM-DD-front.jpg`

**Write trainer notes**
→ Edit `[CLIENT-NAME]/notes/private-notes.md`

**Get consent templates**
→ Read `guides/CONSENT-MANAGEMENT-FRAMEWORK.md`

**See a real example**
→ Read `guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md`

**Back up client data**
→ Copy entire `client-data/` folder to external drive

---

## 📋 Essential Files to Know

| File | What It Is | When to Use |
|------|-----------|-------------|
| `create-client.bat` | Script to create new client folders | Every new client |
| `CREATE-NEW-CLIENT-NOW.md` | How to create client files | Read first! |
| `QUICK-REFERENCE-CARD.md` | Cheat sheet | Print and keep on desk |
| `CLIENT-REGISTRY.md` | Master list of all clients | Update after each new client |
| `templates/MASTER-PROMPT-TEMPLATE.json` | Client data template | Copy for each client |
| `guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md` | Realistic scenarios | Learn by example |
| `guides/CONSENT-MANAGEMENT-FRAMEWORK.md` | Legal consent handling | Before collecting any client data |
| `TEMPLATE-CLIENT/` | Example folder structure | Copy for each new client |

---

## 🆘 Common Questions

### Q: Where do I put client photos?
**A:** `client-data/[CLIENT-NAME]/photos/`

Photos are automatically protected by `.gitignore` (won't be committed to Git).

---

### Q: Where do I store signed consent forms?
**A:** `client-data/[CLIENT-NAME]/consent/consent-forms-signed.pdf`

Scan all signed forms to one PDF and store here.

---

### Q: Where do I write my private trainer notes?
**A:** `client-data/[CLIENT-NAME]/notes/private-notes.md`

This is protected from Git commits (stays local).

---

### Q: How do I create a new client folder?
**A:** Run `create-client.bat "CLIENT-NAME"` from the `client-data/` folder.

Or manually copy `TEMPLATE-CLIENT/` and rename.

---

### Q: Where's the template for the Master Prompt?
**A:** `client-data/templates/MASTER-PROMPT-TEMPLATE.json`

Copy this file into each client folder and rename it.

---

### Q: Where do I find consent form templates?
**A:** `client-data/guides/CONSENT-MANAGEMENT-FRAMEWORK.md`

Scroll to section: "Templates & Forms"

---

### Q: I want to see a real example of a client file. Where?
**A:** `client-data/guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md`

Read Sarah's story (Example 1) - shows complete lifecycle from consultation to wedding day.

---

## 🖨️ Files to Print

Print these and keep them handy:

1. **[QUICK-REFERENCE-CARD.md](QUICK-REFERENCE-CARD.md)** - Daily reference
2. **[templates/CLIENT-FOLDER-CHECKLIST.md](templates/CLIENT-FOLDER-CHECKLIST.md)** - New client setup
3. **Consent forms** from [guides/CONSENT-MANAGEMENT-FRAMEWORK.md](guides/CONSENT-MANAGEMENT-FRAMEWORK.md)

---

## 🔗 Open Important Folders in File Explorer

**Copy-paste these into File Explorer address bar:**

**Main client-data folder:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
```

**Templates folder:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\templates
```

**Guides folder:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\guides
```

**Your client folders:**
```
c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data\[CLIENT-NAME]
```
(Replace `[CLIENT-NAME]` with actual name like `JOHN-DOE`)

---

## 🎬 Next Steps

**Right now, do this:**

1. ✅ **Bookmark this file** - You'll refer to it often
2. ✅ **Print [QUICK-REFERENCE-CARD.md](QUICK-REFERENCE-CARD.md)** - Keep on desk
3. ✅ **Read [CREATE-NEW-CLIENT-NOW.md](CREATE-NEW-CLIENT-NOW.md)** - Learn how to create client files
4. ✅ **Read [guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md](guides/REAL-CLIENT-EXAMPLE-WALKTHROUGHS.md)** - See Sarah's example
5. ✅ **Create your first test client:**
   ```bash
   cd c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\client-data
   create-client.bat "TEST-CLIENT"
   ```
6. ✅ **Practice filling in the Master Prompt** for your test client
7. ✅ **When ready, create your first real client!**

---

**You've got everything you need! 💪 Let's get started!**

**Questions?** Check [SYSTEM-COMPLETE-OVERVIEW.md](SYSTEM-COMPLETE-OVERVIEW.md) for complete documentation.
