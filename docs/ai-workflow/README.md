# AI Workflow Documentation

**SwanStudios AI Village - Documentation Hub**
**Last Updated:** 2026-01-15 - Added Business Readiness & Streamlining Master Plan

---

## 🚀 Quick Start

### **New to SwanStudios AI Village?**
1. Read the [AI Village Handbook](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md) - Complete guide to AI roles and workflows (NEW: Section 6.6 Design Workflow)
2. Review the [Master Onboarding Prompt](../../AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md) - Onboarding guide for all AIs (v2.1 - "Ask Before Coding" enforcement)
3. Check [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md) - Active project status

### **Designing New Features?**
- **Design Master Prompt v3.0:** See [DESIGN-MASTER-PROMPT-ANALYSIS.md](DESIGN-MASTER-PROMPT-ANALYSIS.md) - Consolidated design system with Build Gate enforcement

### **Ready to Implement?**
- **Personal Training System:** See [IMPLEMENTATION-READY-SUMMARY.md](IMPLEMENTATION-READY-SUMMARY.md)
- **Gamification System:** See [gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md](gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md)
- **Current Task:** Check [AI-HANDOFF/CURRENT-TASK.md](AI-HANDOFF/CURRENT-TASK.md)

---

## 📁 Clean File Structure

```
docs/ai-workflow/
├── README.md                              ← YOU ARE HERE
├── PHASE-0-REGISTRY.md                    ← Project tracking & status
├── IMPLEMENTATION-READY-SUMMARY.md        ← Ready-to-send prompts
├── AI-REVIEW-CONSOLIDATED-FEEDBACK.md     ← AI feedback compilation
├── DESIGN-MASTER-PROMPT-ANALYSIS.md       ← NEW v3.0 Design Master Prompt (PRIMARY)
├── FILE-AUDIT-CLEANUP-REPORT.md           ← File audit & cleanup report
│
├── personal-training/                     ← Personal Training System v3.0
│   ├── PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md (21,500 lines - PRIMARY)
│   ├── CLIENT-ONBOARDING-QUESTIONNAIRE.md (85 questions)
│   ├── MASTER-BLUEPRINT-V3-ENHANCEMENT-CHECKLIST.md (Gap analysis)
│   ├── PHASE-0A-IMPLEMENTATION-SPEC.md (Focused implementation guide)
│   └── SEAN-AI-POWERED-TRAINING-MASTER-VISION.md
│
├── gamification/                          ← SwanStudios Gamification
│   ├── GAMIFICATION-MASTER-PROMPT-FINAL.md
│   ├── GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md
│   ├── ROO-CODE-GAMIFICATION-IMPLEMENTATION-BLUEPRINT.md
│   ├── PROMPT-FOR-ROO-CODE-BACKEND.md
│   └── PROMPT-FOR-MINMAX-STRATEGIC-UX.md
│
├── workflows/                             ← Standard Workflows
│   ├── GIT-AUTOMATION-WORKFLOW.md         (5000-line commit threshold)
│   ├── GOOGLE-DOCS-WORKFLOW.md            (6-folder structure)
│   └── SLACK-INTEGRATION-WORKFLOW.md      (Optional mobile access)
│
├── templates/                             ← Component Documentation Templates
│   └── component-templates/               (7 required files per component)
│       ├── README.md
│       ├── component-template.mermaid.md
│       ├── component-template.wireframe.md
│       ├── component-template.flowchart.md
│       ├── component-template.api-spec.md
│       ├── component-template.test-spec.md
│       └── component-template.a11y.md
│
├── AI-HANDOFF/                            ← Current Task Tracking
│   ├── CURRENT-TASK.md                    (Active work)
│   ├── TASK-ARCHIVE/                      (Completed tasks)
│   └── ROO-CODE-STATUS.md                 (Roo Code progress)
│
├── component-docs/                        ← Component Documentation
│   ├── pilot-mui-elimination/
│   └── templates/
│
├── reviews/                               ← Design Reviews
│
└── archive/                               ← Historical Documentation
    ├── design/                            (Design versions - NEW)
    │   └── ENHANCED-DESIGN-MASTER-PROMPT-V2-GEMINI.md
    ├── phase-0/                           (Phase 0 audits)
    ├── week-reports/                      (Week 0-1 reports)
    ├── homepage-refactor/                 (Homepage v2.0)
    ├── old-versions/                      (Deprecated versions)
    ├── master-plans/                      (Historical plans)
    └── FILE-CLEANUP-PLAN-OLD.md           (Old cleanup plan)

AI-Village-Documentation/                  ← AI Village Core Docs
├── SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md
└── AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md
```

---

## 🎯 Active Projects

### **1. Personal Training System v3.0**
**Status:** ✅ READY FOR IMPLEMENTATION
**Blueprint:** [personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md](personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md)

**Features:**
- Master Prompt JSON schema v3.0 with formal versioning
- Twilio SMS automation (morning + evening check-ins)
- iPad PWA with voice commands (20+ commands)
- Photo quality gates + AI analysis
- Multi-AI consensus system (Claude, MinMax, Gemini, ChatGPT)
- Wearable integration (Whoop, Oura, Garmin)
- Safety protocols + red flag escalation
- 12-week implementation roadmap
- **ROI:** 7,400% annual return, <1 week payback

**Quick Start:**
- Review: [IMPLEMENTATION-READY-SUMMARY.md](IMPLEMENTATION-READY-SUMMARY.md)
- Choose AI: Roo Code (speed), Claude Code (comprehensive), MinMax v2 (UX)
- Send ready-to-use prompt from summary doc

---

### **2. SwanStudios Gamification System**
**Status:** ✅ DESIGNED, READY FOR PARALLEL IMPLEMENTATION
**Summary:** [gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md](gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md)

**Features:**
- Embedded engagement moments (80% discovery rate)
- Sustainable point economy (1 pt = $0.001)
- Social proof features
- Achievement system
- Galaxy-Swan theme integration

**Implementation Guides:**
- Backend: [gamification/PROMPT-FOR-ROO-CODE-BACKEND.md](gamification/PROMPT-FOR-ROO-CODE-BACKEND.md)
- Frontend UX: [gamification/PROMPT-FOR-MINMAX-STRATEGIC-UX.md](gamification/PROMPT-FOR-MINMAX-STRATEGIC-UX.md)
- Complete Blueprint: [gamification/ROO-CODE-GAMIFICATION-IMPLEMENTATION-BLUEPRINT.md](gamification/ROO-CODE-GAMIFICATION-IMPLEMENTATION-BLUEPRINT.md)

---

### **3. SwanStudios v3.1 Refactor**
**Status:** Phase 0 Complete (97 components audited)
**Registry:** [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md)

**Audits Completed:**
- Admin Dashboard (47 components) - [archive/phase-0/PHASE-0-ADMIN-DASHBOARD-AUDIT.md](archive/phase-0/PHASE-0-ADMIN-DASHBOARD-AUDIT.md)
- Client Dashboard (37 components) - [archive/phase-0/PHASE-0-CLIENT-DASHBOARD-AUDIT.md](archive/phase-0/PHASE-0-CLIENT-DASHBOARD-AUDIT.md)
- UI Kit + Gamification (13 components) - [archive/phase-0/PHASE-0-UI-KIT-GAMIFICATION-AUDIT.md](archive/phase-0/PHASE-0-UI-KIT-GAMIFICATION-AUDIT.md)

**Next Phase:** M0 Foundation (Weeks 1-3) - pending 20/20 AI approvals

---

## 👥 AI Village Roles

| AI | Primary Role | Specialization |
|---|---|---|
| **Claude Code** | Main Orchestrator | Integration, architecture, security (OWASP ASVS L2) |
| **Roo Code (Grok)** | Backend Specialist | API design, database, performance, cost efficiency |
| **MinMax v2** | Strategic UX & Multi-AI Orchestrator | UX analysis, gamification, multi-AI consensus, feature discovery |
| **ChatGPT-5** | QA Engineer | Testing strategy, edge cases, product management |
| **Gemini Code Assist** | Frontend Logic | React patterns, data analysis, accessibility |

**Complete Documentation:** [AI Village Handbook](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md)

---

## 📚 Key Documents

### **Start Here:**
- [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md) - Project status & tracking
- [IMPLEMENTATION-READY-SUMMARY.md](IMPLEMENTATION-READY-SUMMARY.md) - Ready-to-send prompts
- [AI Village Handbook](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md) - Complete AI roles guide (NEW: Section 6.6 Design Workflow)

### **Design System (NEW - Nov 5, 2025):**
- [DESIGN-MASTER-PROMPT-ANALYSIS.md](DESIGN-MASTER-PROMPT-ANALYSIS.md) - **v3.0 Design Master Prompt (PRIMARY)**
  - Consolidates feedback from ChatGPT-5, Roo Code, MinMax v2, Gemini
  - "Ask Before Coding" enforcement + Build Gate process
  - 28-point Engineering Handoff Checklist
  - SwanStudios Galaxy-Swan theme DNA
  - Progressive enhancement (Luxe → Standard → Lite → Text)
  - See AI Village Handbook Section 6.6 for full workflow

### **Major Blueprints:**
- [Personal Training Master Blueprint v3.0](personal-training/PERSONAL-TRAINING-MASTER-BLUEPRINT-V3.0.md) (21,500 lines)
- [Gamification Master Prompt](gamification/GAMIFICATION-MASTER-PROMPT-FINAL.md)
- [Gamification Implementation Summary](gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md)

### **Standard Workflows:**
- [Git Automation](workflows/GIT-AUTOMATION-WORKFLOW.md) - Commit after 5000 lines
- [Google Docs](workflows/GOOGLE-DOCS-WORKFLOW.md) - 6-folder structure
- [Slack Integration](workflows/SLACK-INTEGRATION-WORKFLOW.md) - Optional mobile access

### **Component Documentation Standards:**
See [templates/component-templates/](templates/component-templates/) for 7 required template files:
1. README.md - AI assignment matrix
2. component-template.mermaid.md - Technical diagrams
3. component-template.wireframe.md - Visual design
4. component-template.flowchart.md - Business logic
5. component-template.api-spec.md - API contracts
6. component-template.test-spec.md - Test scenarios
7. component-template.a11y.md - Accessibility compliance

---

## 🔄 Standard Workflows

### **Git Workflow (Automated):**
- Commit after logical component OR 5000 lines
- NEVER skip hooks (--no-verify)
- Include co-author: Claude <noreply@anthropic.com>
- See: [workflows/GIT-AUTOMATION-WORKFLOW.md](workflows/GIT-AUTOMATION-WORKFLOW.md)

### **Google Docs Workflow (Long-form documentation):**
6-folder structure for documentation >6000 lines:
1. Master Index
2. Component Audits
3. Implementation Blueprints
4. Testing & QA
5. Architecture & Design
6. Historical Archive

See: [workflows/GOOGLE-DOCS-WORKFLOW.md](workflows/GOOGLE-DOCS-WORKFLOW.md)

### **Phase 0 Approval Gates (NO CODE without approval):**
- All design work requires 5/5 AI approvals BEFORE coding
- Component documentation standards enforced (7 files required)
- Testing strategy defined upfront
- Live site safety: feature flags, canary rollouts, quick rollback

---

## 🎨 Galaxy-Swan Theme Compliance

All SwanStudios features must follow the Galaxy-Swan Theme:

**Visual Requirements:**
- Galaxy core gradient + starfield background
- Glass surfaces with gradient borders
- Cosmic micro-interactions (120-180ms scale pulse)
- Display serif for H1/H2 headings
- Swan motifs (crest, wing dividers, constellation patterns)
- No generic template visuals

**Technical Requirements:**
- styled-components with TypeScript
- Framer Motion for animations
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design

**See:** `docs/current/GALAXY-SWAN-THEME-DOCS.md` for complete specifications

---

## 📊 By The Numbers (Week 0 Complete)

**Documentation Created:**
- Total Files: 17 new documentation files
- Total Lines: ~21,000 lines of planning
- Components Audited: 97 components
- Critical Issues Found: 2 (Constellation persistence, Quest backend)

**Time Investment:**
- Week 0 Planning: ~16-18 hours
- ROI: Prevents 200+ hours of rework

**Testing Strategy:**
- Baseline: 70% coverage
- Target: 90% coverage (gradual increase)
- Types: Unit, integration, E2E, visual, a11y, performance

**Zero-Error Implementation Standards:**
- Phase 0 approval gates enforced
- Component documentation required (7 files)
- Git automation (5000-line threshold)
- Live site safety protocols

---

## 🔄 Recent Changes

**2026-01-15: Business Readiness & Streamlining Master Plan**
- ✅ Added Section 9.8 to Handbook
- ✅ Defined Admin Dashboard Data Entry Protocol
- ✅ Established Mock Data Elimination Framework
- ✅ Consolidated Dashboards

**2026-01-11: Client Data Database Integration**
- ✅ Added Section 9.7 to Handbook
- ✅ Created Client Data Integration Prompt

**2025-11-05: Design Master Prompt v3.0 + Workflow Integration**
- ✅ Created DESIGN-MASTER-PROMPT-ANALYSIS.md (v3.0 consolidates all AI feedback)
- ✅ Added AI Village Handbook Section 6.6: Design Workflow & Build Gate Process
- ✅ Updated Master Onboarding Prompt v2.1 with "Ask Before Coding" enforcement
- ✅ Archived 3 duplicate/outdated files to preserve history
- ✅ Created FILE-AUDIT-CLEANUP-REPORT.md (comprehensive file audit)
- ✅ Updated README.md to reflect v3.0 design workflow

**2025-11-03: Major File Cleanup & Organization**
- ✅ Organized 60+ files into clean folder structure
- ✅ Archived 22 completed/old files to preserve history
- ✅ Reduced root files from 40 → 6 for easy navigation
- ✅ Created logical folders: personal-training, gamification, workflows, templates, archive
- ✅ Updated all file references to new paths
- ✅ Completed Personal Training Master Blueprint v3.0 (21,500 lines)
- ✅ Added MinMax v2 to AI Village Handbook (Section 6.5)
- ✅ Updated Master AI Prompt with MinMax v2 onboarding

**Previous Updates:**
- **2025-10-28:** Migrated to per-feature review system
- **Week 0:** Complete Phase 0 audits (97 components)
- **AI Village:** 5-AI coordination system established

---

## 📞 Need Help?

**Design Questions:**
- Design workflow: See [AI Village Handbook Section 6.6](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md)
- Design Master Prompt v3.0: See [DESIGN-MASTER-PROMPT-ANALYSIS.md](DESIGN-MASTER-PROMPT-ANALYSIS.md)
- Build Gate process: See Handbook Section 6.6 or Design Analysis doc
- Theme compliance: See Design Master Prompt v3.0 → "SwanStudios Design DNA"

**AI Village Questions:**
- Roles & responsibilities: See [AI Village Handbook](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md)
- AI onboarding: See [Master Onboarding Prompt v2.1](../../AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md)
- MinMax v2 role: See Handbook Section 6.5

**Project-Specific Questions:**
- Personal Training: See [IMPLEMENTATION-READY-SUMMARY.md](IMPLEMENTATION-READY-SUMMARY.md)
- Gamification: See [gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md](gamification/GAMIFICATION-PARALLEL-IMPLEMENTATION-SUMMARY.md)
- Current task: See [AI-HANDOFF/CURRENT-TASK.md](AI-HANDOFF/CURRENT-TASK.md)

**File Structure Questions:**
- See [FILE-AUDIT-CLEANUP-REPORT.md](FILE-AUDIT-CLEANUP-REPORT.md) - Complete file audit
- See this README's "Clean File Structure" section above

---

**Last Updated:** 2025-11-05
**System Version:** 3.1 (Design Master Prompt v3.0 + Build Gate workflow)
**Total Documentation:** ~50,000+ lines (including design system)
**Latest Addition:** Design-first workflow with "Ask Before Coding" enforcement
