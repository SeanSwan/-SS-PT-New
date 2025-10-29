# New AI Collaboration File Structure Guide

**Date:** 2025-10-28
**Purpose:** Replace monolithic BRAINSTORM-CONSENSUS.md with scalable per-feature review system

---

## Problem Solved

**Old System:**
- Single BRAINSTORM-CONSENSUS.md file growing to 1500+ lines
- Hard to navigate, slow to load, difficult to find specific reviews
- Mixed active, completed, and example reviews in one file
- No clear index or status tracking

**New System:**
- One lightweight registry file (index)
- One file per feature review
- Clear separation of active, completed, and archived reviews
- Easy to find, navigate, and track progress

---

## New File Structure

```
docs/ai-workflow/
├── PHASE-0-REGISTRY.md                    ← Central index (lightweight, <200 lines)
├── reviews/                               ← Active reviews (one file per feature)
│   ├── homepage-hero-enhancement.md
│   ├── login-page-enhancement.md
│   └── admin-dashboard-metrics.md
├── templates/                             ← Templates for new reviews
│   └── PHASE-0-REVIEW-TEMPLATE.md
└── archive/                               ← Completed reviews by month
    ├── completed-2025-10.md
    └── completed-2025-11.md
```

---

## How It Works

### Starting a New Phase 0 Review

**Step 1: Create Feature Review File**
```bash
# Copy template
cp docs/ai-workflow/templates/PHASE-0-REVIEW-TEMPLATE.md \
   docs/ai-workflow/reviews/my-feature-name.md
```

**Step 2: Update Registry**
Open `PHASE-0-REGISTRY.md` and add to "Active Reviews" table:

```markdown
| Feature Name | File | Status | Approvals | Started | Owner |
|--------------|------|--------|-----------|---------|-------|
| **My Feature** | [reviews/my-feature-name.md](reviews/my-feature-name.md) | 🟡 PENDING (0/5) | None yet | 2025-10-29 | Your Name |
```

**Step 3: Fill In Design Artifacts**
Edit `reviews/my-feature-name.md`:
- Add wireframes/mockups
- Write user stories
- Define API contracts
- Document database schema
- List technical requirements

**Step 4: Share with AIs**
- Send link to all 5 AIs: `docs/ai-workflow/reviews/my-feature-name.md`
- AIs append their reviews directly to the file
- Track approvals in PHASE-0-REGISTRY.md

---

### During Review Process

**When AI Reviews Come In:**
1. AI pastes review directly into `reviews/my-feature-name.md` under their section
2. You update "Approvals" column in PHASE-0-REGISTRY.md
3. If concerns raised, document in Resolution Log
4. When 5/5 approve, move to "Consensus Reached" section in registry

**Updating Status:**
```markdown
| Feature | File | Status | Approvals | Started | Owner |
|---------|------|--------|-----------|---------|-------|
| **My Feature** | [reviews/my-feature-name.md](reviews/my-feature-name.md) | 🟡 PENDING (3/5) | Claude Code ✅, Roo ✅, ChatGPT ✅ | 2025-10-29 | You |
```

---

### After Consensus Reached

**Step 1: Update Registry**
Move from "Active Reviews" to "Consensus Reached":

```markdown
## 🟢 Consensus Reached (Ready for Implementation)

| Feature | File | Consensus Date | Implementation Status |
|---------|------|----------------|----------------------|
| **My Feature** | [reviews/my-feature-name.md](reviews/my-feature-name.md) | 2025-10-29 | 🟡 IN PROGRESS |
```

**Step 2: Create Feature Tracking File**
```bash
cp docs/ai-workflow/FEATURE-TEMPLATE.md \
   features/my-feature-name.md
```

**Step 3: Begin Phase 1-7 Implementation**
Use the 7-checkpoint pipeline with your feature review as reference.

---

### After Implementation Complete

**Step 1: Archive Review**
Move review to archive by month:

```bash
# Extract review section
cat reviews/my-feature-name.md >> archive/completed-2025-10.md

# Delete from reviews/
rm reviews/my-feature-name.md
```

**Step 2: Update Registry**
Move from "Consensus Reached" to "Completed & Implemented":

```markdown
## ✅ Completed & Implemented

| Feature | File | Completed | Deployed | Archive |
|---------|------|-----------|----------|---------|
| **My Feature** | [archive/completed-2025-10.md#my-feature](archive/completed-2025-10.md#my-feature) | 2025-10-30 | 2025-10-30 | ✅ |
```

---

## File Size Guidelines

**Keep Files Focused:**
- **PHASE-0-REGISTRY.md:** Max ~300 lines (just index tables, no details)
- **reviews/[feature].md:** Max ~800 lines per review
  - If exceeds 800 lines, split artifacts into separate docs
  - Example: `reviews/homepage-hero-wireframe.md`, `reviews/homepage-hero-api.md`
- **archive/completed-YYYY-MM.md:** Unlimited (all completed reviews for that month)

---

## Benefits of New Structure

### For You (Human)
- ✅ **Easy to find:** One file per feature, clear index
- ✅ **Fast to load:** No more 1500-line files
- ✅ **Clear status:** Registry shows what's active, pending, completed
- ✅ **Historical record:** Archives preserve all decisions by month

### For AIs
- ✅ **Focused context:** Only load relevant feature review
- ✅ **Clear instructions:** Template enforces consistent structure
- ✅ **Easy to append:** Each AI has dedicated section
- ✅ **No confusion:** Active vs archived is obvious

---

## Migration from Old System

**Homepage Hero Enhancement (Already Done):**
- ✅ Extracted from BRAINSTORM-CONSENSUS.md lines 430-1489
- ✅ Moved to `reviews/homepage-hero-enhancement.md`
- ✅ Added to PHASE-0-REGISTRY.md as active review
- ✅ Updated all cross-references

**Old BRAINSTORM-CONSENSUS.md:**
- Keep as reference for now (deprecated)
- Add deprecation notice at top
- Eventually delete after all active reviews migrated

---

## Quick Reference Commands

**Create new review:**
```bash
cp docs/ai-workflow/templates/PHASE-0-REVIEW-TEMPLATE.md \
   docs/ai-workflow/reviews/[feature-name].md
```

**Update registry:**
```bash
# Open in editor
code docs/ai-workflow/PHASE-0-REGISTRY.md
# Add row to appropriate table
```

**Archive completed review:**
```bash
cat docs/ai-workflow/reviews/[feature-name].md >> \
    docs/ai-workflow/archive/completed-$(date +%Y-%m).md
rm docs/ai-workflow/reviews/[feature-name].md
```

**Check active reviews:**
```bash
ls docs/ai-workflow/reviews/
```

---

## Integration with AI Village Handbook

**Add this section to handbook** (under "PART III: EXECUTION PLAYBOOK"):

### 12.5 Phase 0 Design Review System

**Rule:** NO CODE BEFORE CONSENSUS

SwanStudios uses a structured Phase 0 design review process to ensure all 5 AIs agree on the design before implementation begins.

**Process:**
1. **Create Design Review:** Use `docs/ai-workflow/templates/PHASE-0-REVIEW-TEMPLATE.md`
2. **Track in Registry:** Add to `docs/ai-workflow/PHASE-0-REGISTRY.md`
3. **Get 5 AI Reviews:**
   - Claude Code (Integration)
   - Roo Code (Backend)
   - ChatGPT-5 (QA)
   - Claude Desktop (Orchestrator & Security)
   - Gemini Code Assist (Frontend)
4. **Resolve Concerns:** Document in Resolution Log
5. **Reach Consensus:** All 5 approve ✅
6. **Implement:** Begin Phase 1-7 pipeline

**Files:**
- **Registry:** `docs/ai-workflow/PHASE-0-REGISTRY.md` (start here)
- **Active Reviews:** `docs/ai-workflow/reviews/`
- **Templates:** `docs/ai-workflow/templates/`
- **Archives:** `docs/ai-workflow/archive/`
- **Process Guide:** `docs/ai-workflow/PHASE-0-DESIGN-APPROVAL.md`

**Benefits:**
- Catch design flaws before coding (saves hours)
- Ensure Galaxy-Swan theme compliance
- Validate security, performance, accessibility upfront
- All AIs aligned on implementation approach

---

## FAQ

**Q: What if a review file is getting too long (>800 lines)?**
A: Split artifacts into separate files:
- `reviews/feature-name.md` (main review with links)
- `reviews/feature-name-wireframe.md` (detailed wireframe)
- `reviews/feature-name-api.md` (API specs)

**Q: Can I skip Phase 0 for small bug fixes?**
A: Yes! Phase 0 is for new features or significant changes. Bug fixes can go straight to Phase 1-7 implementation.

**Q: What if I need to update a design after consensus?**
A: Create a new review file: `reviews/feature-name-v2.md`. Document why changes are needed and get new consensus.

**Q: How long should Phase 0 take?**
A: Typically 1-2 hours for initial design, 30-60 minutes for AI reviews, 30 minutes for resolution. Total: 2-4 hours before coding starts.

**Q: What happens to BRAINSTORM-CONSENSUS.md?**
A: It's deprecated. All new reviews use the new structure. Old file kept as reference until all active reviews migrated.

---

**Last Updated:** 2025-10-28
**Status:** Active (new system in use as of 2025-10-28)
