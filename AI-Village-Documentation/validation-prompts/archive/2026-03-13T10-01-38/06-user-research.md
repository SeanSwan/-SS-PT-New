# User Research & Persona Alignment — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 38.9s
> **Files:** docs/ai-workflow/blueprints/CANADA-IMMIGRATION-TAB-BLUEPRINT.md
> **Generated:** 3/13/2026, 3:01:38 AM

---

#

### docs/ai-workflow/blueprints/CANADA-IMMIGRATION-TAB-BLUEPRINT.md
```md
# Canada Immigration Tab — Master Blueprint

## Executive Summary
A secure, admin-only mini-application embedded within the SwanStudios admin dashboard that serves as a comprehensive immigration tracker, study platform, and action checklist for Sean & his wife's Canada immigration journey. Based on the 16-page "Canada Immigration AI Career & Personal Training Master Strategy" document.

**Priority:** LIFE-CRITICAL — Family safety motivation
**Target:** Apply as soon as possible, November 2026 midterm milestone
**Security:** Admin-only, RBAC-enforced, no public access whatsoever

---

## Architecture Overview

### Tab Location
- Admin Dashboard sidebar → "Canada Immigration" tab (maple leaf icon)
- Only visible to users with `role === 'admin'`
- No API endpoints exposed without admin JWT verification

### Data Storage
- New PostgreSQL table: `immigration_tasks` — tracks checklist items, completion status, notes, due dates
- New PostgreSQL table: `immigration_documents` — tracks document gathering (birth certs, CDIB, etc.)
- New PostgreSQL table: `study_progress` — tracks quiz scores, study sessions, practice test results
- All tables have `user_id` FK to admin user, encrypted sensitive fields

### Security Requirements
- All routes behind `authenticateToken` + `requireAdmin` middleware
- No sensitive data in localStorage — session-only
- Rate limiting on all endpoints
- Input sanitization (parameterized queries only — NO string interpolation)
- No document upload (just tracking status) to minimize attack surface

---

## Feature Breakdown — 7 Modules

### Module 1: Dashboard Overview
**The Command Center — shows progress at a glance**
- Overall progress percentage (tasks completed / total)
- Phase indicator (Phase 0/1/2/3) with current phase highlighted
- Next 5 priority action items
- Days until key milestones (IELTS test, TEF test, Express Entry submission)
- Motivational progress ring with Crystalline Swan styling

### Module 2: Master Checklist (Interactive)
**The core tracker — every action item from the 16-page plan**

#### Phase 0: IMMEDIATE (This Week)
- [ ] Complete online marriage application at ocweddings.ocrecorder.com
- [ ] Search Dawes Rolls on Ancestry.com for grandfather/father's name + roll number
- [ ] Get married at Anaheim OC Clerk-Recorder (222 S. Harbor Blvd)
- [ ] Get 3+ certified marriage certificate copies ($17 each)
- [ ] Call Chickasaw TGS: (580) 436-7250 — request CDIB application
- [ ] Order long-form birth certificates (yours + father's)
- [ ] Order father's death certificate (if applicable)
- [ ] Take free IELTS practice test at takeielts.britishcouncil.org
- [ ] Start Duolingo French + Pimsleur French (30 min each daily)

#### Phase 1: Foundation (Months 1-3)
- [ ] Submit CDIB application + all vital records to Chickasaw Nation
- [ ] Book IELTS tests for both
- [ ] Start IBM GenAI Engineering Certificate on Coursera ($49/mo)
- [ ] Take IELTS test
- [ ] Get GED
- [ ] Submit wife's ECA for college degree
- [ ] Take AWS AI Practitioner exam ($100)
- [ ] Complete IBM GenAI cert
- [ ] Wife submits Express Entry as principal applicant

#### Phase 2: Momentum (Months 4-6)
- [ ] Start Azure AI-102 prep (free Microsoft Learn)
- [ ] Apply Ontario HCP + BC Tech PNP
- [ ] Add iTalki French tutoring 2-3x/week
- [ ] Apply Chickasaw citizenship once CDIB arrives
- [ ] Take Azure AI-102 exam ($165)
- [ ] Schedule ETC interview if citizenship card received

#### Phase 3: Advanced (Months 7-12)
- [ ] AWS ML Specialty prep + exam
- [ ] Intensive French practice
- [ ] Monitor IRCC Indigenous mobility updates
- [ ] Book TEF Canada test
- [ ] Take French practice exams
- [ ] Take TEF Canada
- [ ] Update Express Entry with French scores (+50 CRS)
- [ ] Evaluate Indigenous pathway status

Each item has:
- Checkbox (done/not done)
- Due date (absolute)
- Priority (P0/P1/P2)
- Notes field
- Link to relevant resource
- Owner (Sean / Wife / Both)
- Cost tracking

### Module 3: Document Tracker
**Track the status of every required document**

| Document | Status | Notes |
|----------|--------|-------|
| Sean's long-form birth certificate | Not Started / Ordered / Received | |
| Father's long-form birth certificate | Not Started / Ordered / Received | |
| Father's death certificate | Not Started / Ordered / Received | |
| Grandfather's birth/death certificates | Not Started / Ordered / Received | |
| Marriage certificate (3 copies) | Not Started / Ordered / Received | |
| CDIB Card | Not Started / Applied / Received | |
| Chickasaw Citizenship Card | Not Started / Applied / Received | |
| Enhanced Tribal Citizenship ID (ETC) | Not Started / Interview Scheduled / Received | |
| IELTS Results (Sean) | Not Started / Scheduled / Completed | Score: ___ |
| IELTS Results (Wife) | Not Started / Scheduled / Completed | Score: ___ |
| TEF Canada Results (Sean) | Not Started / Scheduled / Completed | NCLC: ___ |
| TEF Canada Results (Wife) | Not Started / Scheduled / Completed | NCLC: ___ |
| Wife's ECA (degree evaluation) | Not Started / Applied / Received | |
| Sean's GED | Not Started / Scheduled / Completed | |
| IBM GenAI Certificate | Not Started / In Progress / Completed | |
| AWS AI Practitioner | Not Started / Scheduled / Passed | |
| Azure AI-102 | Not Started / Studying / Passed | |
| AWS ML Specialty | Not Started / Studying / Passed | |
| Google Professional ML Engineer | Not Started / Studying / Passed | |
| Express Entry Profile | Not Created / Active / ITA Received | CRS: ___ |
| Ontario HCP | Not Started / Applied / Accepted | |
| BC Tech PNP | Not Started / Applied / Accepted | |

### Module 4: CRS Calculator
**Interactive Comprehensive Ranking System calculator**
- Age input with auto-decrement (shows CRS loss over time)
- Education dropdown (High school, Bachelor's, Master's, PhD)
- Language test score inputs (IELTS: L/R/W/S, TEF: NCLC)
- Work experience sliders (Canadian + foreign)
- Spouse factors (education, language, Canadian experience)
- Provincial nomination toggle (+600 CRS)
- Job offer toggle (+200 CRS)
- French bonus toggle (+50 CRS)
- Indigenous mobility toggle (if applicable)
- Real-time CRS score display
- Compare to latest Express Entry cut-off
- "What if" scenarios (e.g., "What if I get NCLC 7?")

### Module 5: Study Platform
**Integrated learning environment for language + AI certs**

#### IELTS Prep
- Practice test scoring (Listening, Reading, Writing, Speaking)
- Writing task 1/2 templates
- Speaking question bank
- Vocabulary builder

#### French (TEF Canada)
- NCLC level tracker
- Grammar drills
- Listening comprehension exercises
- Speaking practice log

#### AI Certifications
- IBM GenAI Engineering Certificate progress
- AWS AI Practitioner study notes
- Azure AI-102 study plan
- AWS ML Specialty flashcards

### Module 6: Cost Tracker
**Monitor all immigration-related expenses**
- IELTS test fees ($245 each)
- TEF Canada fees ($380 each)
- ECA fee ($220)
- GED test fees ($30 each)
- Coursera subscription ($49/mo)
- AWS exam fees ($100-$300)
- Azure exam fees ($165)
- Document ordering fees ($17-$30 each)
- iTalki tutoring costs
- Express Entry submission fee ($850)
- Right of Permanent Residence Fee ($515)
- Total spent vs budget

### Module 7: Timeline Visualizer
**Gantt-style view of all phases + deadlines**
- Phase 0 (red)
- Phase 1 (blue)
- Phase 2 (green)
- Phase 3 (purple)
- Milestone markers (IELTS, TEF, EE submission)
- Today line
- Zoom in/out
- Print view

---

## UI/UX Requirements

### Visual Design
- **Crystalline Swan theme** — use active palette, typography
- **Maple leaf icon** (Lucide React: <MapleLeaf />) for tab
- **Progress rings** with Ice Wing (#60C0F0) for completed, Arctic Cyan (#50A0F0) for remaining
- **Priority badges** — P0 (red), P1 (orange), P2 (yellow)
- **Phase cards** with distinct colors (Phase 0: red, Phase 1: blue, Phase 2: green, Phase 3: purple)
- **Status indicators** — Not Started (gray), In Progress (blue), Completed (green), Blocked (red)
- **Motivational quotes** — "Every step forward is a step toward safety"

### Interaction Design
- **Checklist items** — click to expand details, edit notes, mark complete
- **Document tracker** — click status to cycle through states (Not Started → Ordered → Received)
- **CRS calculator** — real-time updates as inputs change
- **Study platform** — interactive quizzes, score tracking
- **Cost tracker** — add expenses inline, see running total
- **Timeline** — drag-and-drop to reschedule (with validation)

### Responsive Behavior
- Desktop: Full dashboard with all modules visible
- Tablet: Stacked modules, timeline scrollable
- Mobile: Single-column, tabbed navigation between modules

---

## Implementation Notes

### Frontend Components
- `<ImmigrationDashboard />` — main container
- `<ProgressRing />` — animated SVG with gradient
- `<PhaseCard />` — collapsible checklist per phase
- `<DocumentTracker />` — table with clickable status cells
- `<CRSCalculator />` — form with live updates
- `<StudyPlatform />` — tabbed study modules
- `<CostTracker />` — expense list + budget bar
- `<TimelineVisualizer />` — Gantt chart with D3.js

### Backend Routes
- `GET /api/admin/immigration/dashboard` — progress stats
- `GET /api/admin/immigration/tasks` — all checklist items
- `PUT /api/admin/immigration/tasks/:id` — update task status/notes
- `GET /api/admin/immigration/documents` — all document statuses
- `PUT /api/admin/immigration/documents/:id` — update document status
- `GET /api/admin/immigration/study-progress` — study stats
- `POST /api/admin/immigration/study-session` — log study session
- `GET /api/admin/immigration/costs` — expense list
- `POST /api/admin/immigration/costs` — add expense
- `GET /api/admin/immigration/timeline` — timeline data
- `PUT /api/admin/immigration/timeline` — update timeline

### Styling
- Use styled-components with theme variables
- Progress rings: `linear-gradient(135deg, #60C0F0, #8B5CF6)`
- Priority badges: use `$priority-color` mapping
- Phase cards: distinct background colors with 20% opacity

---

## Success Metrics
- All Phase 0 tasks completed within 7 days
- IELTS tests booked within 30 days
- CDIB application submitted within 45 days
- CRS score > 500 within 6 months
- Express Entry profile created within 9 months
- ITA received within 12 months

---

## Risk Mitigation
- **Data loss** — daily encrypted backups to S3
- **Security breach** — no uploads, admin-only, rate limiting
- **Scope creep** — only immigration tracking, no document storage
- **Time constraints** — MVP with just checklist + document tracker

---

## Next Steps
1. **Database** — create migration for 3 new tables
2. **Backend** — implement routes with admin middleware
3. **Frontend** — build components with Crystalline Swan styling
4. **Testing** — admin-only access, data integrity
5. **Deployment** — to production (sswanstudios.com)

---

## Appendix: Color Mapping
- Phase 0: #FF6B6B (red)
- Phase 1: #4D96FF (blue)
- Phase 2: #6BCF7F (green)
- Phase 3: #9D4EDD (purple)
- Priority P0: #FF6B6B
- Priority P1: #FFA500
- Priority P2: #FFD93D
- Status Not Started: #A0AEC0
- Status In Progress: #60C0F0
- Status Completed: #6BCF7F
- Status Blocked: #FF6B6B

---

## Changelog
- **2025-04-01** — Initial blueprint created
- **2025-04-02** — Added security requirements, clarified no uploads
- **2025-04-03** — Added cost tracker module, refined checklist items
- **2025-04-04** — Added timeline visualizer, refined color mapping

---

## Footer
**SwanStudios — Admin Immigration Tracker**
*Version 1.0.0 — Blueprint*
*Last Updated: 2025-04-04*
*Owner: Sean Swan*
*Security Level: MAXIMUM — Family Safety*
```

---

*Part of SwanStudios 7-Brain Validation System*
