# GIT AUTOMATION WORKFLOW

**Version:** 1.0
**Effective:** 2025-10-29
**Purpose:** Ensure frequent, descriptive commits for all code changes

---

## 🎯 CORE PRINCIPLE

**"Commit early, commit often, commit descriptively."**

All AIs must automatically commit code after reaching logical checkpoints to ensure:
- ✅ Granular version history
- ✅ Easy rollback to specific features
- ✅ Clear progress tracking
- ✅ Reduced risk of losing work

---

## 📏 COMMIT TRIGGERS

Commits should be made when **ANY** of these conditions are met:

### **1. Logical Component Completion**
**Definition:** A self-contained unit of functionality is complete and working.

**Examples:**
- Completed React component (e.g., `ProgressChart.tsx`)
- Completed API endpoint (e.g., `GET /api/users/:id/progress`)
- Completed database migration (e.g., `add-user-constellations-table.sql`)
- Completed test suite for a component (e.g., `ProgressChart.test.tsx`)
- Completed utility function (e.g., `formatDate.ts`)

**Why:** Logical components are easy to understand, test, and roll back if needed.

---

### **2. Line Count Threshold (5000 lines)**
**Definition:** ~5000 lines of code changed (added + modified) since last commit.

**How to Check:**
```bash
# Check lines changed since last commit
git diff --stat

# Example output:
# 45 files changed, 5234 insertions(+), 1203 deletions(-)
```

**When to Commit:**
- If total insertions + deletions > 5000 lines
- Break into multiple commits if multiple features included

**Why:** Prevents massive commits that are hard to review and roll back.

---

### **3. Before Context Switch**
**Definition:** Before starting work on a different feature or fixing a different bug.

**Examples:**
- Finished working on `ProgressChart`, about to start on `UserProfile` → Commit
- Fixed bug in `API authentication`, about to fix bug in `UI layout` → Commit

**Why:** Keeps commits focused on single features/fixes.

---

### **4. End of Work Session**
**Definition:** Before closing VS Code, ending the day, or taking a break >30 minutes.

**Why:** Prevents losing uncommitted work.

---

### **5. After Phase 0 Approval**
**Definition:** Immediately after receiving 5/5 AI approvals for Phase 0 design packet.

**Why:** Locks in approved design before implementation begins.

---

### **6. After All Tests Pass**
**Definition:** After running test suite and confirming all tests pass.

**Example:**
```bash
npm test
# ✅ All tests passed (45 passed, 0 failed)

git add .
git commit -m "✅ TESTS PASS: Add ProgressChart component with unit tests"
git push origin main
```

**Why:** Ensures only working code is committed.

---

## 🔄 GIT WORKFLOW

### **Standard Commit Sequence:**

```bash
# Step 1: Check status
git status

# Step 2: Add files
git add .

# Step 3: Commit with descriptive message
git commit -m "$(cat <<'EOF'
[Emoji] [Type]: [Short description]

[Detailed explanation of what was done and why]

Changes:
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Step 4: Push to remote
git push origin main
```

---

## 📝 COMMIT MESSAGE FORMAT

### **Format:**
```
[Emoji] [Type]: [Short description (50 chars max)]

[Detailed explanation (wrap at 72 chars)]

Changes:
- [Change 1]
- [Change 2]
- [Change 3]

[Related Issues/PRs]
[Breaking Changes]
[Documentation Updates]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### **Commit Types & Emojis:**

| Type | Emoji | When to Use | Example |
|------|-------|-------------|---------|
| **feat** | ✨ | New feature added | `✨ feat: Add ProgressChart component with Recharts` |
| **fix** | 🐛 | Bug fixed | `🐛 fix: Resolve Constellation SVG persistence issue` |
| **refactor** | ♻️ | Code refactored (no new features) | `♻️ refactor: Extract useConstellationPersistence hook` |
| **style** | 💄 | UI/styling changes (no logic) | `💄 style: Apply Galaxy-Swan theme tokens to ProgressChart` |
| **test** | ✅ | Tests added/updated | `✅ test: Add unit tests for ProgressChart component` |
| **docs** | 📝 | Documentation updated | `📝 docs: Add Component Documentation Standards to handbook` |
| **perf** | ⚡ | Performance improvement | `⚡ perf: Lazy-load ProgressChart images for faster load` |
| **build** | 🔧 | Build system/dependencies | `🔧 build: Update React to 18.3.0` |
| **ci** | 👷 | CI/CD changes | `👷 ci: Add documentation completeness checker to GitHub Actions` |
| **chore** | 🔨 | Maintenance tasks | `🔨 chore: Remove unused imports from ProgressChart` |
| **revert** | ⏪ | Revert previous commit | `⏪ revert: Revert "feat: Add ProgressChart" (caused errors)` |
| **security** | 🔒 | Security fixes | `🔒 security: Sanitize user input in ProgressChart API` |
| **i18n** | 🌐 | Internationalization | `🌐 i18n: Add Spanish translations for ProgressChart` |
| **a11y** | ♿ | Accessibility improvements | `♿ a11y: Add ARIA labels to ProgressChart for screen readers` |
| **db** | 🗄️ | Database changes | `🗄️ db: Add user_constellations table with RLS policies` |

---

### **Examples:**

#### **Example 1: New Component**
```
✨ feat: Add ProgressChart component with Recharts

Implemented client dashboard progress chart showing workout completion
over last 30 days. Uses Recharts for responsive, accessible visualization.

Changes:
- Created ProgressChart.tsx with Galaxy-Swan theme integration
- Added useProgressData hook for API data fetching
- Implemented responsive breakpoints (mobile, tablet, desktop)
- Added loading, empty, and error states
- Integrated with /api/users/:id/progress endpoint

Related: PHASE-0-CLIENT-DASHBOARD-AUDIT.md (Component #2)
Tests: 15 unit tests added (ProgressChart.test.tsx)
Coverage: 92% on ProgressChart component

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### **Example 2: Bug Fix**
```
🐛 fix: Resolve Constellation SVG persistence issue

Fixed critical bug where constellation stars were generated randomly
on each page load instead of being persisted to database. Users now
see consistent progress visualization.

Changes:
- Added user_constellations PostgreSQL table
- Created POST /api/users/:id/constellation endpoint
- Implemented useConstellationPersistence hook
- Added automatic save on workout completion
- Migrated existing users to persisted constellations

Breaking Changes: None (backward compatible)
Migration: 20251029_add_user_constellations.sql

Related: PHASE-0-CLIENT-DASHBOARD-AUDIT.md (Critical Issue #1)
Tests: 12 integration tests added
Verified: Tested with 5 real users on staging

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### **Example 3: Refactoring**
```
♻️ refactor: Extract useConstellationPersistence hook

Extracted constellation persistence logic from GalaxySections.tsx
into reusable hook for better separation of concerns.

Changes:
- Created hooks/useConstellationPersistence.ts
- Moved API calls, state management, and save logic to hook
- Updated GalaxySections.tsx to use new hook
- No behavior changes (refactor only)

Before: 450 lines in GalaxySections.tsx
After: 280 lines in GalaxySections.tsx + 100 lines in hook

Tests: All existing tests still pass (no new tests needed)
Coverage: Maintained 92% coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 WHEN NOT TO COMMIT

**Don't commit when:**
- ❌ Code doesn't compile/run
- ❌ Tests are failing
- ❌ Incomplete feature (unless using feature flags)
- ❌ Breaking changes without migration plan
- ❌ Sensitive data (API keys, passwords) included
- ❌ Debugging code (console.logs, debugger statements)

**Solution:** Fix issues, then commit.

---

## 🔐 SAFETY PROTOCOLS

### **Before Committing:**

```bash
# 1. Check for sensitive data
git diff | grep -i "password\|api_key\|secret\|token"

# 2. Run linter
npm run lint

# 3. Run type checker
npm run typecheck

# 4. Run tests
npm test

# 5. Check for console.logs
git diff | grep "console.log"

# 6. If all pass, commit
git add .
git commit -m "..."
git push origin main
```

---

## 📊 COMMIT FREQUENCY TARGETS

**Target:** Commit every 1-2 hours of active coding

**Frequency by Task Type:**

| Task Type | Commit Frequency | Lines/Commit | Example |
|-----------|------------------|--------------|---------|
| **New Component** | After component complete + tests | 200-500 | ProgressChart.tsx + tests |
| **API Endpoint** | After endpoint + tests | 100-300 | POST /api/constellation |
| **Bug Fix** | After fix + tests | 10-100 | Fix SVG persistence bug |
| **Refactoring** | After logical refactor | 100-500 | Extract hook |
| **Styling** | After theme integration | 50-200 | Apply Galaxy-Swan tokens |
| **Tests** | After test suite complete | 100-300 | Add 15 unit tests |
| **Documentation** | After section complete | 100-500 | Add Component Docs Standards |

---

## 🎯 COMMIT QUALITY CHECKLIST

**Before committing, verify:**

- [ ] Code compiles without errors
- [ ] All tests pass (unit, integration, E2E)
- [ ] Linter passes (no warnings)
- [ ] Type checker passes (no TypeScript errors)
- [ ] No console.logs or debugger statements
- [ ] No sensitive data (API keys, passwords)
- [ ] Commit message is descriptive and follows format
- [ ] Related files are all included (component + tests + docs)
- [ ] No unrelated changes included (use `git add <specific-files>` if needed)

---

## 🔄 GIT BEST PRACTICES

### **1. Use Descriptive Branch Names (if branching):**
```bash
# Feature branch
git checkout -b feat/progress-chart

# Bug fix branch
git checkout -b fix/constellation-persistence

# Refactor branch
git checkout -b refactor/extract-hooks
```

### **2. Commit Atomic Changes:**
- One commit = one logical change
- Don't mix features in single commit
- Don't commit unrelated changes together

### **3. Write for Future You:**
- Explain WHY, not just WHAT
- Include context (related issues, design decisions)
- Future maintainers will thank you

### **4. Use `git log` to Review History:**
```bash
# View recent commits
git log --oneline -10

# View commits by author
git log --author="Claude"

# View commits for specific file
git log --follow ProgressChart.tsx
```

---

## 🚀 AUTOMATION SCRIPTS

### **Quick Commit Script (for frequent commits):**

Create `.git-hooks/quick-commit.sh`:
```bash
#!/bin/bash

# Quick commit script for logical component completion

TYPE=$1
MESSAGE=$2

if [ -z "$TYPE" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./quick-commit.sh <type> <message>"
  echo "Example: ./quick-commit.sh feat 'Add ProgressChart component'"
  exit 1
fi

# Map type to emoji
case $TYPE in
  feat) EMOJI="✨" ;;
  fix) EMOJI="🐛" ;;
  refactor) EMOJI="♻️" ;;
  style) EMOJI="💄" ;;
  test) EMOJI="✅" ;;
  docs) EMOJI="📝" ;;
  *) EMOJI="🔨" ;;
esac

# Run checks
echo "Running checks..."
npm run lint && npm run typecheck && npm test

if [ $? -ne 0 ]; then
  echo "❌ Checks failed. Fix issues before committing."
  exit 1
fi

# Commit
git add .
git commit -m "$EMOJI $TYPE: $MESSAGE

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push
git push origin main

echo "✅ Committed and pushed: $EMOJI $TYPE: $MESSAGE"
```

**Usage:**
```bash
chmod +x .git-hooks/quick-commit.sh
./git-hooks/quick-commit.sh feat "Add ProgressChart component"
```

---

## 📈 SUCCESS METRICS

**Track these metrics to measure commit quality:**

- **Commit Frequency:** 5-10 commits per day (active coding)
- **Average Commit Size:** 200-500 lines changed
- **Revert Rate:** <5% of commits (high quality = low reverts)
- **Time to Rollback:** <5 minutes (granular commits = easy rollback)

---

## 🔧 TROUBLESHOOTING

### **"Git push rejected (remote has changes)"**
```bash
# Pull remote changes first
git pull origin main

# Resolve conflicts if any
# Then push
git push origin main
```

### **"Accidentally committed sensitive data"**
```bash
# Remove from history immediately
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch <file-with-secrets>" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous - use with caution)
git push origin --force --all
```

### **"Need to undo last commit (not pushed yet)"**
```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Undo commit and discard changes (DANGEROUS)
git reset --hard HEAD~1
```

### **"Committed to wrong branch"**
```bash
# Move last commit to new branch
git branch new-branch-name
git reset --hard HEAD~1
git checkout new-branch-name
```

---

## 📚 RELATED DOCUMENTATION

- [AI Village Handbook - Git Workflow](../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md)
- [Component Documentation Standards](../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md#126-component-documentation-standards)
- [Phase 0 Design Review System](./PHASE-0-DESIGN-APPROVAL.md)

---

**Version History:**
- **1.0** (2025-10-29): Initial git automation workflow with 5000-line threshold and logical component triggers
