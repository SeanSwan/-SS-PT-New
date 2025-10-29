# Contributing to SwanStudios Documentation

Thank you for contributing to SwanStudios documentation! This guide ensures our documentation remains clean, valuable, and maintainable over the long term.

---

## Table of Contents

1. [Documentation Philosophy](#documentation-philosophy)
2. [Directory Structure](#directory-structure)
3. [When to Add Documentation](#when-to-add-documentation)
4. [When to Archive Documentation](#when-to-archive-documentation)
5. [Documentation Standards](#documentation-standards)
6. [Maintenance Responsibilities](#maintenance-responsibilities)
7. [Link Checking](#link-checking)
8. [Review Checklist](#review-checklist)

---

## Documentation Philosophy

Our documentation follows these core principles:

1. **Current vs Historical**: Active documentation lives in `/docs/current/`, completed work moves to `/docs/archive/`
2. **Single Source of Truth**: All documentation is indexed in `/docs/index.md`
3. **Context-Aware READMEs**: Component-specific READMEs stay with their components
4. **Actionable Content**: Every document should help developers accomplish a specific goal
5. **Living Documents**: Update existing docs rather than creating duplicates

---

## Directory Structure

```
docs/
├── index.md                  # Master index - ALWAYS update when adding/moving docs
├── CONTRIBUTING.md           # This file - documentation maintenance guide
├── current/                  # Active documentation
│   ├── CURRENT_ARCHITECTURE.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── UI/UX documentation
│   ├── deployment/          # Deployment guides
│   └── guides/              # Testing & verification guides
└── archive/                 # Historical documentation
    ├── Old implementation docs
    ├── Completed migrations
    └── One-time fixes
```

**Component READMEs**: Stay in their respective directories (e.g., `frontend/src/components/Schedule/README.md`)

---

## When to Add Documentation

### Create New Documentation When:

1. **New Architecture Decision**
   - Major tech stack changes (e.g., MUI elimination)
   - New design patterns introduced (e.g., compound components)
   - Infrastructure changes (e.g., new MCP servers)
   - **Action**: Add to `/docs/current/` and update `/docs/index.md`

2. **New Feature Implementation**
   - Complex features requiring explanation (e.g., gamification system)
   - Integration guides (e.g., Stripe integration)
   - API documentation for new endpoints
   - **Action**: Add to `/docs/current/` or relevant component README

3. **Development Workflow Changes**
   - New deployment procedures
   - Updated testing strategies
   - Build process modifications
   - **Action**: Update existing `/docs/current/DEVELOPMENT_GUIDE.md`

4. **Component Documentation**
   - New reusable UI components
   - Complex component patterns
   - **Action**: Add README to component directory, reference in `/docs/index.md`

### Update Existing Documentation When:

- **Don't create duplicates!** Update the existing document instead
- Mark sections as "Updated: [Date]" to show recent changes
- If the change is significant, consider archiving the old version first

---

## When to Archive Documentation

Move documentation from `/docs/current/` to `/docs/archive/` when:

### 1. Implementation is Complete and Superseded

**Examples:**
- Migration guides after migration is done (e.g., "MUI to styled-components migration")
- One-time fix documentation (e.g., "Authentication emergency fix")
- Deprecated patterns replaced by new standards

**Action:**
```bash
mv docs/current/OLD_DOCUMENT.md docs/archive/
# Update docs/index.md to move from Current to Archived section
```

### 2. Architecture Has Changed

**Examples:**
- Old SPA deployment guides when moving to new hosting
- Legacy authentication documentation when auth system is rewritten
- Outdated API documentation when endpoints are redesigned

**Action:**
- Move old doc to archive
- Create new doc in current
- Update index.md
- Add note in archived doc: "**Status: ARCHIVED** - Replaced by [New Doc](../current/NEW_DOCUMENT.md)"

### 3. Fix/Enhancement is Applied

**Examples:**
- "Syntax fixes applied"
- "Import optimization complete"
- "Dashboard restoration complete"

**Action:**
- Move to archive (historical record)
- Extract any reusable patterns to current documentation

### ⚠️ DO NOT Archive:

- Component README files (keep with component)
- Current architecture documentation
- Active development guides
- Design system documentation
- Deployment procedures still in use

---

## Documentation Standards

### File Naming

- **Current docs**: Descriptive, present tense
  - ✅ `CURRENT_ARCHITECTURE.md`
  - ✅ `DEVELOPMENT_GUIDE.md`
  - ✅ `GALAXY-SWAN-THEME-DOCS.md`
  - ❌ `ARCHITECTURE_2024.md` (don't date-stamp current docs)
  - ❌ `temp_guide.md` (no temporary docs)

- **Archived docs**: Keep original names for historical reference
  - ✅ `AUTHENTICATION_FIXES_APPLIED.md`
  - ✅ `MUI_ELIMINATION_COMPLETE.md`

### Document Structure

Every documentation file should include:

1. **Title** (H1)
2. **Brief Description** - One sentence explaining the document's purpose
3. **Table of Contents** (for docs >200 lines)
4. **Last Updated Date** (at bottom)
5. **Links to Related Docs**

### Example Template:

```markdown
# Document Title

> **Brief Description**: One-sentence overview of what this doc covers.
> **Last Updated**: 2025-10-27

## Table of Contents
1. [Section 1](#section-1)
2. [Section 2](#section-2)

## Section 1
Content here...

## Section 2
Content here...

---

## Related Documentation
- [Related Doc 1](path/to/doc1.md)
- [Related Doc 2](path/to/doc2.md)

---

*Last Updated: 2025-10-27*
```

### Writing Style

- **Be Concise**: Developers scan documentation quickly
- **Be Actionable**: Provide clear steps and examples
- **Be Current**: Remove outdated information immediately
- **Use Code Examples**: Show, don't just tell
- **Include Context**: Explain *why*, not just *what*

---

## Maintenance Responsibilities

### Who Updates Documentation?

| Scenario | Responsible Party |
|----------|------------------|
| **New feature added** | Feature developer |
| **Architecture change** | Tech lead + developer |
| **Bug fix** | Developer (if complex/recurring) |
| **Deployment process change** | DevOps/deployment lead |
| **Component refactor** | Component developer |
| **Quarterly review** | Tech lead + team |

### When to Update `/docs/index.md`

**ALWAYS update `index.md` when you:**
- Add a new document to `/docs/current/`
- Move a document from `current/` to `archive/`
- Delete a document
- Significantly reorganize documentation

**How to update:**
1. Add link to appropriate section (Current/Archived)
2. Provide one-sentence description
3. Update "Last Updated" date at bottom
4. Ensure links are relative and correct

---

## Link Checking

### Manual Link Verification

Before committing documentation changes:

1. **Check all links in changed files**
   ```bash
   # Test links manually in changed files
   # Click each link in your markdown preview
   ```

2. **Verify relative paths**
   - Links to `/docs/current/` files: `current/FILENAME.md`
   - Links to `/docs/archive/` files: `archive/FILENAME.md`
   - Links to component READMEs: `../frontend/src/components/COMPONENT/README.md`
   - Links to backend docs: `../backend/DIRECTORY/README.md`

### Automated Link Checking (CI)

We use `markdown-link-check` in our CI pipeline to validate all documentation links.

**How it works:**
1. Runs on every push to `main`
2. Checks all `.md` files in the repository
3. Fails the build if broken links are found
4. See `.github/workflows/docs-check.yml` for configuration

**Fix broken links:**
```bash
# Run locally before pushing
npm run check-docs-links

# Output will show broken links:
# ❌ docs/index.md:42 - [Current Architecture](WRONG_PATH.md)
# ✅ Should be: [Current Architecture](current/CURRENT_ARCHITECTURE.md)
```

---

## Review Checklist

Use this checklist when adding or updating documentation:

### Before Creating New Documentation

- [ ] Does similar documentation already exist?
- [ ] Can I update existing documentation instead?
- [ ] Is this documentation still relevant in 6 months?
- [ ] Does this belong in `current/` or should it be a component README?

### When Adding New Documentation

- [ ] File named descriptively (no dates, no temp names)
- [ ] Placed in correct directory (`current/` vs component directory)
- [ ] Includes title, description, and last updated date
- [ ] All links use relative paths
- [ ] Added to `/docs/index.md` with description
- [ ] Includes "Related Documentation" section
- [ ] Code examples are tested and work
- [ ] No sensitive information (API keys, passwords)

### When Archiving Documentation

- [ ] Moved from `current/` to `archive/`
- [ ] Updated `/docs/index.md` (moved from Current to Archived section)
- [ ] Added "Status: ARCHIVED" note at top of archived document
- [ ] Linked to replacement documentation (if applicable)
- [ ] Verified no other docs link to the old location

### When Updating Existing Documentation

- [ ] Updated "Last Updated" date
- [ ] Removed outdated information
- [ ] Tested all code examples
- [ ] Verified all links still work
- [ ] Marked significant changes with date (e.g., "Updated: 2025-10-27")

### Before Committing

- [ ] Ran `npm run check-docs-links` (if available)
- [ ] Manually verified changed links
- [ ] Previewed markdown rendering
- [ ] Checked for typos and grammar
- [ ] Committed with clear message: `docs: add/update/archive [description]`

---

## Quarterly Documentation Review

**Schedule**: Every 3 months, the tech lead should review documentation.

### Review Process

1. **Audit Current Documentation**
   - Is everything in `/docs/current/` still current?
   - Are there any completed migrations that should be archived?
   - Are design system docs up to date?

2. **Check for Documentation Gaps**
   - Are new features documented?
   - Are architectural decisions recorded?
   - Are deployment procedures current?

3. **Verify Link Health**
   - Run automated link checker
   - Fix any broken links
   - Update paths if directories changed

4. **Consolidate Redundancies**
   - Are there duplicate documents?
   - Can small docs be merged into larger guides?
   - Should component READMEs be created for undocumented components?

5. **Update Index**
   - Is `/docs/index.md` accurate?
   - Are descriptions clear and helpful?
   - Is the "Quick Links" section still relevant?

---

## Examples

### Example 1: Adding New Feature Documentation

**Scenario**: You've built a new "Real-time Collaboration" feature.

**Steps:**
1. Create `docs/current/REALTIME_COLLABORATION.md`
2. Include:
   - Architecture overview
   - WebSocket integration details
   - API endpoints
   - Component usage examples
   - Testing procedures
3. Update `docs/index.md`:
   ```markdown
   ### Current Documentation
   ...
   - **[Real-time Collaboration](current/REALTIME_COLLABORATION.md)** - WebSocket-based collaboration system with live updates
   ```
4. Create component README: `frontend/src/components/Collaboration/README.md`
5. Link them together
6. Commit: `docs: add real-time collaboration feature documentation`

---

### Example 2: Archiving Completed Migration

**Scenario**: The "MUI to styled-components" migration is complete.

**Steps:**
1. Move document:
   ```bash
   mv docs/current/MUI_ELIMINATION_GUIDE.md docs/archive/
   ```
2. Add status note to archived doc:
   ```markdown
   # MUI Elimination Guide

   > **Status: ARCHIVED** (2025-10-27)
   > This migration is complete. For current styling practices, see [UI Kit Migration Guide](../current/UI-KIT-MIGRATION-GUIDE.md).
   ```
3. Update `docs/index.md`:
   - Move from "Current Documentation" to "Archived Documentation"
   - Update description to indicate it's completed
4. Commit: `docs: archive completed MUI elimination guide`

---

### Example 3: Updating Existing Documentation

**Scenario**: Deployment process changed to use GitHub Actions instead of manual deploy script.

**Steps:**
1. Update `docs/current/DEVELOPMENT_GUIDE.md`:
   - Edit deployment section
   - Update commands
   - Add CI/CD workflow explanation
2. Update last modified date:
   ```markdown
   *Last Updated: 2025-10-27*
   ```
3. Add update note if significant:
   ```markdown
   ## Deployment (Updated: 2025-10-27)

   We now use GitHub Actions for automated deployment...
   ```
4. Commit: `docs: update deployment guide with GitHub Actions workflow`

---

## Questions?

If you're unsure about documentation practices:

1. Check existing docs in `/docs/current/` for patterns
2. Ask the tech lead or senior developer
3. When in doubt, create a component README rather than a top-level doc
4. Better to have clear documentation than perfect documentation

---

## Documentation Metrics

Track these metrics to ensure documentation health:

- **Coverage**: % of components with README files
- **Freshness**: % of docs updated in last 6 months
- **Link Health**: % of links that work (should be 100%)
- **Onboarding Time**: Time for new developers to be productive (use docs feedback)

---

*This guide is a living document. If you find ways to improve documentation practices, update this file!*

*Last Updated: 2025-10-27*
