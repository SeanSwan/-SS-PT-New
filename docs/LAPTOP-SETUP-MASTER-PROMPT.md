# MASTER PROMPT: SwanStudios Laptop Setup

> Copy this ENTIRE prompt and paste it as your first message to Claude Code on your laptop.
> Before starting, make sure you have your .env file saved to a USB drive or accessible location.

---

## CONTEXT FOR CLAUDE

I need you to help me set up my SwanStudios (SS-PT) project on this laptop. This is a production personal training SaaS platform. Here's what we need to do:

### 1. INSTALL GIT & CLONE THE REPO

First, check if Git is installed. If not, help me install it:

```bash
git --version
```

If Git is not installed:
- Download from https://git-scm.com/download/win
- Install with default settings (make sure "Git from the command line" is selected)
- Restart VS Code after installation

Then configure Git:
```bash
git config --global user.name "SeanSwan"
git config --global user.email "ogpswan@yahoo.com"
```

Clone the repository:
```bash
cd ~/Desktop
git clone https://github.com/SeanSwan/-SS-PT-New.git SS-PT
cd SS-PT
```

The latest commit should be: `c325bd16` — `fix(gallery): convert RAW/large files to JPEG in legacy upload path`

### 2. INSTALL NODE.JS (if needed)

Check Node version (need v18+):
```bash
node --version
npm --version
```

If not installed, download Node.js LTS from https://nodejs.org/

### 3. INSTALL DEPENDENCIES

```bash
cd ~/Desktop/SS-PT/frontend && npm install
cd ~/Desktop/SS-PT/backend && npm install
```

### 4. SET UP ENVIRONMENT FILE

I have my .env file on a USB drive. Copy it to the project root:
```bash
cp /path/to/usb/.env ~/Desktop/SS-PT/.env
```

The .env file must contain these 34 variables:
```
# Frontend
VITE_BACKEND_URL=https://ss-pt-new.onrender.com
VITE_API_BASE_URL=https://ss-pt-new.onrender.com

# Database (production on Render - for local dev use local PG)
DATABASE_URL=<production_connection_string>
PG_DB=<local_db_name>
PG_USER=<local_pg_user>
PG_PASSWORD=<local_pg_password>
PG_HOST=localhost
PG_PORT=5432

# Auth
JWT_SECRET=<secret>
JWT_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<key>

# SendGrid
SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=<email>

# Twilio
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=<number>

# Server
BACKEND_PORT=5000
PORT=5000
NODE_ENV=development
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:3000,https://sswanstudios.com

# Admin
ADMIN_ACCESS_CODE=<code>
ADMIN_USERNAME=<username>
ADMIN_PASSWORD=<password>
ADMIN_FIRST_NAME=<name>
ADMIN_LAST_NAME=<name>
ADMIN_EMAIL=<email>

# Contact
CONTACT_EMAIL=<email>
OWNER_EMAIL=<email>
OWNER_WIFE_EMAIL=<email>
OWNER_PHONE=<phone>
OWNER_WIFE_PHONE=<phone>

# AI Village (CRITICAL for multi-AI workflow)
OPENROUTER_API_KEY=<openrouter_key>
GEMINI_API_KEY=<gemini_key>
```

### 5. SET UP AI VILLAGE

The AI Village is the multi-brain validation system. Two scripts need to work:

**A. Gemini 3.1 Pro Co-Orchestrator** (Lead Design Authority):
```bash
node scripts/consult-gemini.mjs --ask "Are you online?"
```
This should return a response from Gemini 3.1 Pro. Requires `GEMINI_API_KEY` in .env.

**B. 8-Brain Validation Orchestrator:**
```bash
node scripts/validation-orchestrator.mjs --help
```
Requires `OPENROUTER_API_KEY` and `GEMINI_API_KEY` in .env.

**Usage:**
- `node scripts/consult-gemini.mjs --plan "plan text"` — Get design review from Gemini
- `node scripts/consult-gemini.mjs --design "component description"` — Get design specs
- `node scripts/consult-gemini.mjs --review --file path/to/file.tsx` — Design review
- `node scripts/validation-orchestrator.mjs --staged` — Validate staged changes with 8 AIs

### 6. INSTALL CLAUDE CODE SKILLS

The project uses 10 AI agent skills in `.agents/skills/` (symlinked to `.claude/skills/`). Verify they exist:
```bash
ls .agents/skills/
```

You should see:
- agent-browser/
- audit-website/
- frontend-design/
- requesting-code-review/
- systematic-debugging/
- test-driven-development/
- ui-ux-pro-max/
- verification-before-completion/
- web-design-guidelines/
- webapp-testing/

If the symlink is broken, recreate it:
```bash
# On Windows (run VS Code terminal as admin)
mklink /D .claude\skills ..\agents\skills
```

### 7. VERIFY SETUP

Run these checks:
```bash
# 1. Frontend builds
cd ~/Desktop/SS-PT/frontend && npm run build

# 2. Backend starts (will fail if no local PG, that's OK for remote dev)
cd ~/Desktop/SS-PT/backend && node server.mjs

# 3. Type checking
cd ~/Desktop/SS-PT/frontend && npx tsc --noEmit

# 4. AI Village online
node scripts/consult-gemini.mjs --ask "Confirm you are Gemini 3.1 Pro"
```

### 7b. DESIGN SYSTEM VALIDATION (Gemini 3.1 Pro Directive)

**CRITICAL:** Gemini 3.1 Pro (Lead Design Authority) requires these UI validation steps on any new environment:

1. **Theme Token Check:** Verify the active theme is Enchanted Apex Crystalline Swan (NOT Galaxy-Swan):
   - Search for `#002060` (Midnight Sapphire) in the styled theme files
   - Search for `#8B5CF6` (Wing Purple) — must be the primary glow accent
   - If you find `#0a0a1a` or `#00FFFF` or `#7851A9` as PRIMARY tokens, those are RETIRED Galaxy-Swan tokens
   ```bash
   cd ~/Desktop/SS-PT && grep -r "#002060" frontend/src/ --include="*.ts" --include="*.tsx" -l
   cd ~/Desktop/SS-PT && grep -r "#8B5CF6" frontend/src/ --include="*.ts" --include="*.tsx" -l
   ```

2. **UI Dependency Audit:** Confirm critical UI libraries are installed:
   ```bash
   cd ~/Desktop/SS-PT/frontend && npm ls styled-components framer-motion lucide-react
   ```
   All three must be present. NO Material-UI (`@mui/*`) should appear.

3. **Asset Pipeline Check:** Verify fonts and logo:
   ```bash
   ls ~/Desktop/SS-PT/frontend/public/Logo.png
   ```
   Fonts (Plus Jakarta Sans, Cormorant Garamond, Fira Code, Sora) load from Google Fonts CDN.

4. **Anti-Slop Directive:** Under NO circumstances should any AI suggest or implement:
   - Generic CSS gradients or Bootstrap-like layouts
   - Material-UI or any generic component library
   - Galaxy-Swan tokens (`#0a0a1a`, `#00FFFF`, `#7851A9`) for new work
   - All UI must be bespoke styled-components with Crystalline Swan tokens

### 8. DEVELOPMENT WORKFLOW

This is a production app deployed on Render (sswanstudios.com). The workflow is:
1. **Edit code locally** in VS Code
2. **Build frontend:** `cd frontend && npm run build`
3. **Commit:** `git add <files> && git commit -m "type(scope): description"`
4. **Push:** `git push origin main` — triggers Render auto-deploy (2-5 min)
5. **Verify:** Check sswanstudios.com after deploy

**CRITICAL RULES:**
- **NO Material-UI** — All UI uses styled-components with Crystalline Swan theme
- **44px minimum touch targets** on all interactive elements
- **Gemini 3.1 Pro is Lead Design Authority** — consult before major UI changes
- **Wing Purple `#8B5CF6`** is the primary glow/accent color on ALL interactive elements
- **Midnight Sapphire `#002060`** is the primary background color
- **Commit style:** `type(scope): description` (e.g., `fix(gallery): convert RAW to JPEG`)

### 9. CURRENT STATE OF THE PROJECT

**Active issues being worked on:**
- R2 CORS still blocking direct browser uploads (workaround: server proxy upload works)
- Gallery access gate 500 error — `ip_address` column missing from GalleryVisitor table (migration not run)
- Need to run migration `20260311000100-add-geo-to-gallery-visitors.cjs` on production

**Recent completed work:**
- Photo detail modal with two-tier request system (free download + paid enhancement)
- Photo voting/feedback system (PhotoVote model)
- Watermark improvements (smaller logo, centered text)
- Browser back button closes photo modal without losing auth
- RAW file (.arw) support for Sony A7R4 uploads
- Visitor geography widget on admin dashboard overview
- AI rate limits increased to 60/hr per user

**Key files recently modified:**
- `backend/routes/adminGalleryRoutes.mjs` — Gallery upload, RAW conversion, vote endpoints
- `frontend/src/pages/GalleryPage.tsx` — Photo modal integration, history state
- `frontend/src/pages/gallery/PhotoDetailModal.tsx` — New split-view photo modal
- `backend/models/PhotoVote.mjs` — Vote tracking model
- `backend/services/watermarkService.mjs` — Watermark sizing fixes
- `backend/services/geoIpService.mjs` — IP geolocation lookup
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.tsx` — Geo widget

---

## PROJECT ARCHITECTURE SUMMARY

```
SS-PT/
├── frontend/           # React 18 + TypeScript + Vite + styled-components
│   └── src/
│       ├── components/ # All UI components (styled-components, NO MUI)
│       ├── pages/      # Route pages
│       ├── redux/      # Redux Toolkit store
│       └── utils/      # Utilities
├── backend/            # Node.js + Express + Sequelize + PostgreSQL
│   ├── routes/         # API endpoints
│   ├── models/         # Sequelize models
│   ├── migrations/     # Database migrations (.cjs files)
│   ├── services/       # Business logic services
│   └── core/           # Core middleware and route setup
├── scripts/            # AI Village scripts (consult-gemini, validation-orchestrator)
├── .agents/skills/     # 10 Claude Code skills
├── .claude/            # Claude Code config (mcp.json, settings, skills symlink)
├── docs/               # Architecture docs, blueprints, handoff protocols
└── CLAUDE.md           # Project intelligence file (READ THIS FIRST)
```

**Theme: Enchanted Apex — Crystalline Swan**
- Frozen enchanted forest + deep-ocean luxury vault + competitive arena
- Active Palette: Midnight Sapphire, Royal Depth, Ice Wing, Arctic Cyan, Gilded Fern, Frost White, Swan Lavender, Wing Purple
- Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming)

**Co-Orchestrator Model:**
- Gemini 3.1 Pro = Lead Design Authority (designs from own vision)
- Claude = Lead Software Engineer (implements Gemini's design direction)
- They are EQUALS — Claude consults Gemini before executing major UI/UX work

---

Please start by checking what's already installed on this machine (git, node, npm) and guide me through the setup step by step.
