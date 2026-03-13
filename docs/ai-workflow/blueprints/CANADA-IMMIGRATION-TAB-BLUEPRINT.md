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
- [ ] Apply for Chickasaw citizenship once CDIB arrives
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
| Ontario HCP Application | Not Started / Applied / Accepted | |
| BC Tech PNP Application | Not Started / Applied / Accepted | |

### Module 4: CRS Score Calculator
**Interactive Comprehensive Ranking System calculator**
- Age input (auto-decrements with time — shows CRS impact of delay)
- Education level (both applicants)
- Language scores (IELTS CLB + TEF NCLC)
- Work experience (Canadian + foreign)
- Spouse factors (education, language, Canadian experience)
- Provincial nomination (+600)
- French bonus (+25 or +50)
- Total CRS score with breakdown
- Compare against recent draw cutoffs
- "What if" scenarios: "What if I get NCLC 7?" → shows new score

### Module 5: Study Platform
**Integrated study tools for IELTS, TEF, and AI certifications**

#### IELTS Prep
- Reading practice passages with timed exercises
- Listening comprehension (link to official practice materials)
- Writing task templates (Task 1: graph description, Task 2: essay)
- Speaking topic cards with timer
- Vocabulary flashcards (academic word list)
- Practice test score tracker with history graph

#### TEF Canada / French
- Daily French vocabulary (10 words/day with audio)
- Grammar exercises (conjugation, articles, pronouns)
- Reading comprehension passages (NCLC 5-7 level)
- Listening exercises (link to French podcasts/resources)
- Speaking prompts with recording timer
- Progress tracker: estimated NCLC level

#### AI Certification Study Guides
- IBM GenAI: Key concepts, practice questions, module progress
- AWS AI Practitioner: Service knowledge, practice questions
- Azure AI-102: Cognitive Services, Bot Framework, practice questions
- AWS ML Specialty: SageMaker, model tuning, practice questions
- Google ML Engineer: TensorFlow, MLOps, practice questions
- Each cert has: study checklist, key links, exam tips, cost/date tracker

### Module 6: Resource Hub
**All links organized by category**

#### Marriage & Legal
- OC Clerk-Recorder online marriage application
- Anaheim branch info (222 S. Harbor Blvd)
- Orange County marriage license info

#### Chickasaw Nation
- Chickasaw TGS: (580) 436-7250
- Dawes Roll search (Ancestry.com + National Archives)
- Holisso Research Center
- ETC Office: (580) 436-7259
- chickasaw.net

#### Immigration
- IRCC Express Entry portal
- CRS score tool (official)
- Ontario HCP info
- BC Tech PNP info
- IRCC Indigenous Mobility page
- Jay Treaty Border Alliance
- ECA evaluation (WES)

#### Language Tests
- IELTS registration
- TEF Canada registration
- British Council IELTS prep
- Pimsleur French
- iTalki tutoring
- Duolingo

#### AI Certifications
- IBM GenAI on Coursera
- AWS AI Practitioner exam page
- Microsoft Learn (Azure AI-102)
- AWS ML Specialty exam page
- Google Cloud ML Engineer exam page

#### Personal Training Market Research
- Toronto wealthy neighborhoods map
- Vancouver wealthy neighborhoods map
- Montreal wealthy neighborhoods map
- Canadian PT certification equivalency info

### Module 7: Timeline & Milestones
**Visual Gantt-style timeline**
- Phase 0 (Week 1) → Phase 1 (Months 1-3) → Phase 2 (Months 4-6) → Phase 3 (Months 7-12)
- Key milestones as diamond markers
- Today indicator line
- Color-coded by category (marriage=red, tribal=orange, language=blue, certs=green, immigration=purple)
- Overdue items highlighted in red
- Click milestone to jump to related checklist items

---

## Phased Build Plan

### Phase A: Foundation (Sprint 1)
- Database migrations for immigration tables
- Backend API routes (CRUD for tasks, documents, study progress)
- Admin sidebar tab with icon
- Dashboard overview component (progress ring, next actions)
- Master checklist with all items pre-seeded

### Phase B: Tracking (Sprint 2)
- Document tracker with status workflow
- CRS score calculator (interactive form)
- Timeline/milestone visualization
- Resource hub with organized links

### Phase C: Study Platform (Sprint 3)
- IELTS practice module (reading, writing prompts, score tracker)
- French study module (vocabulary, grammar exercises)
- AI certification study guides with progress
- Practice test score history with charts

### Phase D: Polish (Sprint 4)
- Mobile responsive (10-breakpoint matrix)
- Data export (PDF report of progress)
- Notification reminders for upcoming deadlines
- Final QA and security audit

---

## Tech Stack (within existing SwanStudios)
- **Frontend:** React + TypeScript + styled-components (Crystalline Swan theme)
- **Backend:** Express routes behind admin auth middleware
- **Database:** PostgreSQL via Sequelize migrations
- **No external dependencies** — self-contained within the app
- **No third-party APIs** for data — all content embedded or linked

---

## Security Checklist
- [ ] All routes use `authenticateToken` + `requireAdmin`
- [ ] All SQL via Sequelize parameterized queries or `replacements`
- [ ] No user-generated HTML rendered without sanitization
- [ ] Rate limiting on all endpoints
- [ ] No sensitive data in client-side storage
- [ ] CORS properly configured
- [ ] Input validation on all form fields
- [ ] No file upload capability (link-only approach)
