# AI Workflow System

**SwanStudios AI Village Collaboration Framework**
**Last Updated:** 2025-10-28

---

## 🚀 Quick Start

### For Phase 0 (Design Review):
1. **Check active reviews:** [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md)
2. **Start new review:** Copy [templates/PHASE-0-REVIEW-TEMPLATE.md](templates/PHASE-0-REVIEW-TEMPLATE.md)
3. **Learn the process:** [PHASE-0-DESIGN-APPROVAL.md](PHASE-0-DESIGN-APPROVAL.md)

### For Implementation (Phase 1-7):
1. **After consensus reached:** Copy [FEATURE-TEMPLATE.md](FEATURE-TEMPLATE.md)
2. **Get AI prompts:** [AI-ROLE-PROMPTS.md](AI-ROLE-PROMPTS.md)
3. **Run checkpoints:** Follow 7-checkpoint pipeline

---

## 📁 File Structure

```
docs/ai-workflow/
├── README.md                              ← You are here
├── PHASE-0-REGISTRY.md                    ← START HERE (central index)
│
├── Phase 0 (Design Review)
│   ├── PHASE-0-DESIGN-APPROVAL.md         ← Process guide
│   ├── reviews/                           ← Active design reviews
│   │   └── homepage-hero-enhancement.md   ← One file per feature
│   ├── templates/
│   │   └── PHASE-0-REVIEW-TEMPLATE.md     ← Copy this for new reviews
│   └── archive/
│       └── completed-2025-10.md           ← Completed reviews by month
│
├── Phase 1-7 (Implementation)
│   ├── FEATURE-TEMPLATE.md                ← Track implementation progress
│   ├── AI-ROLE-PROMPTS.md                 ← Prompts for all AIs and checkpoints
│   └── (checkpoint guides coming soon)
│
├── Reference
│   ├── CURRENT-PAGES-ANALYSIS.md          ← Current state documentation
│   ├── NEW-FILE-STRUCTURE-GUIDE.md        ← How new system works
│   └── BRAINSTORM-CONSENSUS-OLD.md        ← DEPRECATED (historical only)
│
└── Guides
    ├── NEXT-STEPS-HOMEPAGE-HERO.md        ← Feature-specific guides
    ├── QUICK-REFERENCE-FINAL-REVIEWS.md
    └── PHASE-0-SUMMARY-HOMEPAGE-HERO.md
```

---

## 🎯 The Process

### Phase 0: Design Consensus (NO CODE)

**Rule:** All 5 AIs must approve design BEFORE writing any code

1. **Create Design Review**
   - Copy template from `templates/PHASE-0-REVIEW-TEMPLATE.md`
   - Save to `reviews/[feature-name].md`
   - Add to [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md)

2. **Document Design**
   - Wireframes/mockups
   - User stories with acceptance criteria
   - API specifications
   - Database schema
   - Technical requirements (including Galaxy-Swan Theme Gate)

3. **Get 5 AI Reviews**
   - Claude Code (Integration & Architecture)
   - Roo Code (Backend Implementation)
   - ChatGPT-5 (QA & Testing)
   - Claude Desktop (Orchestrator & Security)
   - Gemini Code Assist (Frontend Logic)

4. **Resolve Concerns**
   - Document in Resolution Log
   - Make necessary design changes
   - Get re-approval from concerned AIs

5. **Reach Consensus**
   - All 5 AIs approve (✅)
   - Update registry: Move to "Consensus Reached"
   - **Only then** → Proceed to Phase 1

### Phase 1-7: Implementation (CODE)

Once design consensus is reached:

1. **Create Feature Tracking File**
   - Copy `FEATURE-TEMPLATE.md` to `features/[feature-name].md`
   - Link to Phase 0 review

2. **Run 7-Checkpoint Pipeline**
   - Checkpoint #1: Code Quality Review
   - Checkpoint #2: Logic Review
   - Checkpoint #3: Security Review
   - Checkpoint #4: Testing Review
   - Checkpoint #5: Performance Review
   - Checkpoint #6: Integration Review
   - Checkpoint #7: Human Review

3. **Deploy**
   - Merge to main
   - Deploy to production
   - Archive Phase 0 review

---

## 📊 Current Status

### Active Phase 0 Reviews:
- **Homepage Hero Enhancement** (3/5 approvals)
  - File: [reviews/homepage-hero-enhancement.md](reviews/homepage-hero-enhancement.md)
  - Status: Awaiting Claude Desktop + Gemini reviews
  - All critical issues resolved

### Consensus Reached:
- _(None yet - first feature in progress)_

### In Implementation:
- _(None yet - waiting for Phase 0 consensus)_

**See [PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md) for real-time status**

---

## 🎨 Galaxy-Swan Theme Compliance

All Phase 0 reviews must include the **Galaxy-Swan Theme Gate** checklist to prevent generic template designs.

**Requirements:**
- Galaxy core gradient + starfield background
- Glass surfaces with gradient borders
- Cosmic micro-interactions (120-180ms scale pulse)
- Display serif for H1/H2 headings
- Swan motifs (crest, wing dividers, constellation patterns)
- No generic template visuals

**See:** `docs/current/GALAXY-SWAN-THEME-DOCS.md` for complete specifications

---

## 👥 AI Roles

| AI | Primary Role | Secondary Role | Focus Areas |
|----|--------------|----------------|-------------|
| **Claude Code** | Integration Specialist | Architecture Review | System fit, breaking changes, dependencies |
| **Roo Code (Grok)** | Backend Implementation | Database Design | API design, schema, performance, RLS |
| **ChatGPT-5** | QA Engineer | Product Management | Testability, edge cases, user acceptance |
| **Claude Desktop** | Orchestrator | Security Expert | System coherence, OWASP ASVS L2, multi-tenant |
| **Gemini Code Assist** | Frontend Logic | React Specialist | Component patterns, accessibility, performance |

---

## 📚 Key Documents

### Start Here:
- **[PHASE-0-REGISTRY.md](PHASE-0-REGISTRY.md)** - Central index of all reviews

### Process Guides:
- **[PHASE-0-DESIGN-APPROVAL.md](PHASE-0-DESIGN-APPROVAL.md)** - How Phase 0 works
- **[NEW-FILE-STRUCTURE-GUIDE.md](NEW-FILE-STRUCTURE-GUIDE.md)** - How new system works
- **[AI-ROLE-PROMPTS.md](AI-ROLE-PROMPTS.md)** - Copy-paste prompts for all AIs

### Templates:
- **[templates/PHASE-0-REVIEW-TEMPLATE.md](templates/PHASE-0-REVIEW-TEMPLATE.md)** - For new design reviews
- **[FEATURE-TEMPLATE.md](FEATURE-TEMPLATE.md)** - For implementation tracking

---

## ⚡ Quick Commands

**Create new Phase 0 review:**
```bash
cp docs/ai-workflow/templates/PHASE-0-REVIEW-TEMPLATE.md \
   docs/ai-workflow/reviews/my-feature-name.md
```

**Check active reviews:**
```bash
cat docs/ai-workflow/PHASE-0-REGISTRY.md
```

**Archive completed review:**
```bash
cat docs/ai-workflow/reviews/my-feature.md >> \
    docs/ai-workflow/archive/completed-$(date +%Y-%m).md
rm docs/ai-workflow/reviews/my-feature.md
```

---

## 🔄 Recent Changes

**2025-10-28:** Major System Update
- ✅ Replaced monolithic BRAINSTORM-CONSENSUS.md with per-feature review system
- ✅ Created PHASE-0-REGISTRY.md as central index
- ✅ Migrated Homepage Hero Enhancement to new structure
- ✅ Created templates for new reviews
- ✅ Deprecated old BRAINSTORM-CONSENSUS.md file

---

## 📞 Need Help?

- **File structure questions:** See [NEW-FILE-STRUCTURE-GUIDE.md](NEW-FILE-STRUCTURE-GUIDE.md)
- **Phase 0 process:** See [PHASE-0-DESIGN-APPROVAL.md](PHASE-0-DESIGN-APPROVAL.md)
- **Theme compliance:** See `docs/current/GALAXY-SWAN-THEME-DOCS.md`
- **Current state reference:** See [CURRENT-PAGES-ANALYSIS.md](CURRENT-PAGES-ANALYSIS.md)

---

**Last Updated:** 2025-10-28
**System Version:** 2.0 (Per-feature review system)
