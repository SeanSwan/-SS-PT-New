# Laptop Conversion Guide — SwanStudios Full AI Sync

> **Purpose:** Set up a new machine (laptop) with the EXACT same Claude Code + AI Village environment as the office desktop.
> **Last updated:** 2026-03-20
> **Source machine:** Desktop (<OPERATOR>)

---

## Quick Start Checklist

```
[ ] 1. Clone repo: git clone https://github.com/SeanSwan/-SS-PT-New.git SS-PT
[ ] 2. Copy .env from USB disk into backend/.env AND root .env
[ ] 3. Copy .gitignore from USB disk (if not already in repo)
[ ] 4. npm install in both frontend/ and backend/
[ ] 5. Install Claude Code VS Code extension
[ ] 6. Create the Claude memory directory and populate memory files (Section B below)
[ ] 7. Verify: node scripts/validation-orchestrator.mjs --files CLAUDE.md
[ ] 8. Verify: cd frontend && npm run build
[ ] 9. First conversation: tell Claude "Read CLAUDE.md and docs/LAPTOP-CONVERSION.md"
```

---

## Section A: Environment Setup

### A1. Prerequisites
```bash
# Node.js 18+ (LTS)
node -v  # Should be 18.x or 20.x

# Git
git -v

# VS Code with Claude Code extension
# Install from VS Code marketplace: "Claude Code" by Anthropic
```

### A2. Clone & Install
```bash
git clone https://github.com/SeanSwan/-SS-PT-New.git SS-PT
cd SS-PT
npm install          # root dependencies (if any)
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### A3. Environment Variables (from USB disk)
Copy these files from the USB disk:
- `backend/.env` — Contains ALL API keys:
  - `OPENROUTER_API_KEY` — Required for AI Village Phase 1 (9 validators)
  - `GEMINI_API_KEY` — Required for Phase 2+3+4 debates (Gemini 3.1 Pro)
  - `OPENAI_API_KEY` — For Whisper transcription
  - `DATABASE_URL` — PostgreSQL connection string
  - `OPERATION_SIGNING_KEY` — HMAC for destructive operations
  - All Stripe, SendGrid, R2 keys
- `.env` (root) — May have `VITE_*` build-time flags

### A4. Verify Build
```bash
cd frontend && npm run build   # Should complete in ~12s with no errors
cd ../backend && node -e "import('./server.mjs')"  # Quick import check
```

### A5. Verify AI Village
```bash
node scripts/validation-orchestrator.mjs --files CLAUDE.md
# Should show: 11-Brain Recursive Consensus System banner
# Phase 1: 9 validators launch
# Phase 2+3: Debates run
# Cost: ~$0.10-0.30 per run
```

---

## Section B: Claude Code Memory Setup (CRITICAL)

Claude Code stores memory in a per-project directory. On the office desktop this is:
```
<HOME>\.claude\projects\<SCRATCH-KEY>\memory\
```

On your laptop, the path will be different based on your username and where you cloned the repo. Claude Code auto-creates this directory structure when you first open the project. The directory name is derived from the absolute path to the repo, with path separators replaced by dashes.

**Example:** If you clone to `C:\Users\Sean\Desktop\SS-PT`, the memory path would be:
```
C:\Users\Sean\.claude\projects\c--Users-Sean-Desktop-SS-PT\memory\
```

### B1. Create Memory Directory
After your first Claude Code conversation in the project (which creates the directory structure), create a `memory/` folder inside the project directory:
```bash
# Find your project directory (run this in Claude Code terminal):
# It will be something like: ~/.claude/projects/c--Users-YOURNAME-path-to-SS-PT/

# Create the memory directory
mkdir -p ~/.claude/projects/<YOUR-PROJECT-DIR>/memory/
```

### B2. Create MEMORY.md (Index File)
Create `MEMORY.md` inside the memory directory with this exact content:

```markdown
# SwanStudios Project Memory

## Co-Orchestrator Architecture (CRITICAL)
- **Claude Opus 4.6 = CEO** — FINAL authority on ALL decisions. Overrides everyone.
- **Gemini 3.1 Pro = CTO / Lead Design Authority** — designs from its OWN vision, authoritative on aesthetics, but Opus can override
- **Claude Sonnet = VP Engineering** — runs initial AI Village debates, makes interim recommendations. Opus reviews and ratifies or overrides.
- **Flash 2.5 = supplementary scanner only** — extra eyes, never the design source
- **Chain of command:** Opus CEO > Gemini CTO > Sonnet VP > Phase 1 validators
- Consult script: `node scripts/consult-gemini.mjs --plan|--design|--review|--ask`
- Output: `AI-Village-Documentation/gemini-consults/latest.md`
- User is VERY clear: do NOT use Flash or any other model's design vision to build from
- **Gemini sometimes references RETIRED Galaxy-Swan theme** — always verify against CLAUDE.md and reject retired tokens

## AI Village Validation (11-Brain)
- Phase 1: 9 parallel tracks via OpenRouter
- Phase 2: Code Quality Debate — Gemini 3.1 Pro (CTO) vs Claude Sonnet (VP)
- Phase 3: Design Debate — Gemini 3.1 Pro (Creative Dir) vs Claude Sonnet
- Phase 4: Opus CEO Review — Opus 4.6 reviews Phase 2+3, debates Gemini directly, FINAL authority
- Script: `node scripts/validation-orchestrator.mjs --files|--staged|--since`
- Gemini API key stored in `.env` as `GEMINI_API_KEY`

## Active Theme: Enchanted Apex — Crystalline Swan (Preset F-Alt)
- **RETIRED:** Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use for new work
- **Active palette:** Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0`, Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`
- **Arctic Cyan `#50A0F0`** = primary glow/accent on ALL interactive elements
- **Wing Purple `#8B5CF6`** = secondary accent
- **Ice Wing `#60C0F0`** = gaming accent, XP bars, data highlights
- **Gilded Fern `#C6A84B`** = luxury accent, gold borders on sapphire glass
- Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming)

## Critical Feedback
- [Opus 4.6 CEO is FINAL authority](memory/feedback_opus_ceo_final_authority.md)
- [AI Village runs FIRST, every time](memory/feedback_ai_village_first.md)
- [No Gemini during badge gen](memory/feedback_no_gemini_during_badge_gen.md)
- [No yoga/meditation](memory/feedback_no_yoga_meditation.md)
- [Render is PAID Professional plan](memory/feedback_render_not_free_tier.md)

## Canada Immigration Tab (Active Project)
- [Project context](memory/project_canada_immigration_tab.md)
- [User family context](memory/user_family_immigration.md)
- [Master strategy PDF](memory/project_canada_immigration_strategy.md)

## Sean's Trainer Credentials
- [Actual certifications](memory/user_trainer_credentials.md)
- Says "utilizes NASM protocol" — do NOT overstate as continuous NASM membership

## Victory Charts (50-Chart Analytics Gallery)
- [Victory migration](memory/project_victory_charts.md)
- [Original sprint context](memory/project_nivo_charts_sprint.md)

## Mobile App Roadmap
- Sean plans to convert the web app to a native mobile app for Apple App Store and Google Play
- Victory chosen over Nivo — identical API between `victory` (web) and `victory-native` (React Native)

## Move Fitness Client Onboarding (PRIMARY USE CASE)
- [Ultimate goal + blockers](memory/project_move_fitness_onboarding.md)

## Key Patterns
- Default theme variant: `crystalline-dark` (Void Crystal)
- Photo upload: file picker + FormData + multer -> R2 (not URL prompt)
- Movement Analysis: 7-step wizard, prospect support, auto-match pattern
- Commit style: `type(scope): description`
- Always push to main for Render auto-deploy
```

### B3. Create Individual Memory Files

Create each of these files in the `memory/` directory:

---

**File: `memory/feedback_opus_ceo_final_authority.md`**
```markdown
---
name: Opus 4.6 CEO is Final Authority
description: Claude Opus 4.6 must always have final say over Claude Sonnet in AI Village debates — Phase 4 mandatory review
type: feedback
---

Opus 4.6 (CEO) has FINAL authority over ALL AI Village decisions. Claude Sonnet is VP Engineering — makes interim recommendations but Opus reviews and ratifies or overrides.

**Why:** User explicitly requested this. Sonnet's debate conclusions are not final — they are recommendations. Opus must review the Phase 2+3 debate logs, then engage Gemini 3.1 Pro directly for up to 5 rounds as the actual CEO. Opus's word is law.

**How to apply:**
- After AI Village runs Phase 2+3, Opus MUST read the debate-log.md and fix-instructions.md
- Opus reviews Sonnet's decisions and identifies gaps or errors
- Opus engages Gemini directly via `node scripts/consult-gemini.mjs --ask` for max 5 rounds
- Opus enforces CLAUDE.md as source of truth (especially theme tokens — reject RETIRED Galaxy-Swan)
- Final ruling saved to `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling.md`
- This is PERMANENT protocol, not a one-time thing

**Chain of Command:**
1. Claude Opus 4.6 (CEO) — FINAL authority
2. Gemini 3.1 Pro (CTO/Creative Dir) — Lead Design Authority, Opus can override
3. Claude Sonnet (VP Engineering) — Interim decisions, Opus ratifies
4. Phase 1 validators — Surface findings only
```

---

**File: `memory/feedback_ai_village_first.md`**
```markdown
---
name: AI Village runs FIRST, every time
description: When user asks to use AI Village, ALWAYS run the full validation BEFORE doing any implementation work
type: feedback
---

When the user mentions "AI Village", "run through AI Village", or "use AI Village":
1. ALWAYS means the full 11-brain validation (`node scripts/validation-orchestrator.mjs`)
2. ALWAYS run it FIRST — before writing any code
3. NEVER substitute a single Gemini consult for the full validation
4. NEVER reuse old results or skip it

**Why:** User explicitly corrected Claude for skipping the AI Village run. Do NOT repeat this mistake.
```

---

**File: `memory/feedback_no_gemini_during_badge_gen.md`**
```markdown
---
name: No AI Village during badge generation
description: Do not run AI Village or Gemini queries while badge generation is running (shared API key rate limits)
type: feedback
---

Badge generation (~2.5 hrs for 750 images) saturates Flash 3.1's rate limits. AI Village and Gemini Pro consults use different endpoints and are OK. Only avoid Flash 3.1 image generation calls during badge gen.
```

---

**File: `memory/feedback_no_yoga_meditation.md`**
```markdown
---
name: No yoga or meditation achievements
description: App is American-based — no yoga or meditation content
type: feedback
---

Do NOT include yoga or meditation. Use "stretching" or "flexibility" instead. Sean considers these out of scope for his American-based personal training platform.
```

---

**File: `memory/feedback_render_not_free_tier.md`**
```markdown
---
name: Render is paid Professional plan
description: User pays ~$60/month for Render Professional plan — NEVER say free tier or cold starts
type: feedback
---

Render is on the Professional plan (~$55-60/month). NOT free tier. Never attribute errors to cold starts. Never suggest upgrading.
```

---

**File: `memory/user_trainer_credentials.md`**
```markdown
---
name: Sean Swan Trainer Credentials
description: Sean's actual professional certifications
type: user
---

1. NASM Certified (in-person workshop)
2. NCEP Certified
3. 24 Hour Fitness Master Trainer
4. Gold's Gym Certified Trainer
5. LA Fitness Certified Trainer

Say "utilizes NASM protocol" — do NOT overstate as "25+ years NASM certified."
```

---

**File: `memory/user_family_immigration.md`**
```markdown
---
name: Sean's Family & Immigration Context
description: Sean is planning Canada immigration with his wife
type: user
---

Sean lives in Anaheim Hills, CA. Wife will be principal Express Entry applicant. Sean has Chickasaw Nation heritage (father/grandfather from Oklahoma). African American and Native American identity. Motivated by family safety. Target cities: Toronto, Vancouver, Montreal.
```

---

**File: `memory/project_canada_immigration_tab.md`**
```markdown
---
name: Canada Immigration Tab Project
description: Admin-only immigration tracker/study platform mini-app
type: project
---

Admin-only tab with study platform for IELTS, TEF, AI certifications. Interactive checklist tracking all 7 parts of immigration strategy. Life-critical urgency. PDF source: canada-ai-career-strategy-v2.pdf.
```

---

**File: `memory/project_canada_immigration_strategy.md`**
```markdown
---
name: Canada Immigration Master Strategy
description: 8-part immigration plan — marriage, Chickasaw, IELTS/French, wife MEd, AI certs, Self-Employed, PT market, timeline
type: project
---

8 parts: (1) Get married — courthouse, (2) Chickasaw enrollment + CDIB + Jay Treaty, (3) IELTS CLB 9 + French NCLC 7, (4) Wife MEd in Canada + spousal work permit, (5) AI certs (IBM, Azure, AWS), (6) Self-Employed Persons Program (2027), (7) PT market $175 CAD/hr Westmount Montreal, (8) Timeline: Phase 0-4 over 24 months. Sean: 46yo, 26yr PT, GED. Wife: college degree + teaching. 4 kids + grandma.
```

---

**File: `memory/project_victory_charts.md`**
```markdown
---
name: Victory Charts Migration
description: Switched from Nivo to Victory for cross-platform — React web + React Native
type: project
---

Victory chosen over Nivo because identical API between `victory` (web) and `victory-native` (React Native). Sean plans mobile app for App Store + Google Play. All 50 analytics charts use Victory.
```

---

**File: `memory/project_nivo_charts_sprint.md`**
```markdown
---
name: Nivo Charts Sprint (SUPERSEDED)
description: Original plan was Nivo — now superseded by Victory migration
type: project
---

Original sprint planned Nivo charts. Now superseded by Victory. Design references: Strong App, WHOOP, Peloton, Apple Fitness, Strava, Hevy.
```

---

**File: `memory/project_move_fitness_onboarding.md`**
```markdown
---
name: Move Fitness Client Onboarding — Ultimate Goal
description: Sean needs to onboard all Move Fitness clients into the app
type: project
---

Sean has a full roster of clients from Move Fitness gym (Anaheim Hills). This is the #1 production priority. Every fix should be evaluated against: "Does this help Sean onboard and manage his Move Fitness clients?" First client onboarded: Jackie (User ID 61, 52F, intermediate). Admin Add Client, goals, pain entries, workout logging, AI plans must all work E2E.
```

---

## Section C: Git Sync Protocol

### C1. Working from Laptop (Out of Office)
```bash
# Before starting work — always pull latest
git pull origin main

# Do your work...

# When done — commit and push
git add <files>
git commit -m "type(scope): description

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push origin main
```

### C2. Back at the Office (Desktop)
```bash
# Pull all laptop changes
git pull origin main

# Claude Code will automatically pick up:
# - CLAUDE.md changes (loaded every conversation)
# - AI Village validation reports
# - All code changes

# Claude Code memory is machine-local but MEMORY.md + individual files
# are in the machine-local .claude directory. If you made memory changes
# on the laptop, update the desktop memory manually (or tell Claude
# "sync my memory from docs/LAPTOP-CONVERSION.md")
```

### C3. Keeping Memory in Sync
Claude Code memory is stored LOCALLY on each machine (not in git). To keep them in sync:

1. **CLAUDE.md is the source of truth** — it's in git, auto-loaded every conversation
2. **Memory files contain preferences/feedback** — these need manual sync between machines
3. **This file (LAPTOP-CONVERSION.md)** contains ALL memory file contents — Claude can rebuild memory from it

**To sync memory on a new machine, tell Claude:**
> "Read docs/LAPTOP-CONVERSION.md Section B and create all the memory files on this machine"

Claude will read this file and create all the memory files in the correct local directory.

---

## Section D: What Lives Where

| Thing | Location | In Git? | Syncs Automatically? |
|-------|----------|---------|---------------------|
| CLAUDE.md | `SS-PT/CLAUDE.md` | Yes | Yes (git pull) |
| Code | `SS-PT/frontend/` + `SS-PT/backend/` | Yes | Yes (git pull) |
| AI Village scripts | `SS-PT/scripts/` | Yes | Yes (git pull) |
| AI Village reports | `SS-PT/AI-Village-Documentation/` | Yes | Yes (git pull) |
| .env (API keys) | `SS-PT/backend/.env` | NO | USB disk transfer |
| .gitignore | `SS-PT/.gitignore` | Yes | Yes (git pull) |
| Claude memory | `~/.claude/projects/<dir>/memory/` | NO | Manual (this file) |
| VS Code settings | `.vscode/` | Partial | Yes if committed |
| node_modules | `*/node_modules/` | NO | `npm install` |

---

## Section E: API Keys Required (from USB .env)

| Key | Purpose | Required For |
|-----|---------|-------------|
| `OPENROUTER_API_KEY` | AI Village Phase 1 (9 validators) | Validation |
| `GEMINI_API_KEY` | Phase 2+3+4 debates, Gemini consults | Validation + Design |
| `OPENAI_API_KEY` | Whisper transcription, AI provider fallback | Voice features |
| `DATABASE_URL` | PostgreSQL connection | Backend |
| `STRIPE_SECRET_KEY` | Payment processing | Store |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Payments |
| `SENDGRID_API_KEY` | Email | Notifications |
| `R2_*` keys | Cloudflare R2 storage | File uploads |
| `JWT_SECRET` | Auth tokens | Authentication |
| `OPERATION_SIGNING_KEY` | HMAC for destructive ops | AI safety |

---

## Section F: First Conversation on New Machine

After setup, start a Claude Code conversation and say:

> "Read CLAUDE.md and docs/LAPTOP-CONVERSION.md. This is a new machine setup. Create all memory files from Section B of LAPTOP-CONVERSION.md. Then verify the AI Village works by running: node scripts/validation-orchestrator.mjs --files CLAUDE.md"

This will:
1. Load all project intelligence from CLAUDE.md
2. Create all 12 memory files from this document
3. Verify the AI Village 11-Brain system works with your API keys
4. Establish the chain of command (Opus CEO > Gemini CTO > Sonnet VP)

---

## Section G: Troubleshooting

### "AI Village shows 0 validators"
- Check `OPENROUTER_API_KEY` in `.env`
- Run: `node -e "require('dotenv').config({path:'backend/.env'}); console.log(process.env.OPENROUTER_API_KEY?.slice(0,8))"`

### "Phase 2+3 debates don't run"
- Check `GEMINI_API_KEY` in `.env`
- Gemini 3.1 Pro requires a valid Google AI API key

### "Build fails"
- `cd frontend && npm install && npm run build`
- Check Node version: `node -v` (needs 18+)

### "Claude doesn't know about the project"
- Tell Claude: "Read CLAUDE.md" — this is loaded automatically but worth confirming
- Check that memory files exist: look in `~/.claude/projects/` for your project directory

### "Claude uses retired Galaxy-Swan theme"
- This means memory wasn't set up. Tell Claude: "The Galaxy-Swan theme (#0a0a1a, #00FFFF, #7851A9) is RETIRED. Read CLAUDE.md for the active Crystalline Swan palette."

---

*Generated by Claude Opus 4.6 — SwanStudios CEO*
*Last sync: 2026-03-20*
