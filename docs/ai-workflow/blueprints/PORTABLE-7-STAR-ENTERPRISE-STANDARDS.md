# 7-Star Enterprise Development Standards — Portable Template

> **Version:** 1.0 | **Date:** 2026-03-21
> **Purpose:** Drop this file into ANY project to enforce enterprise-grade development standards
> **Origin:** SwanStudios SS-PT project — battle-tested across 6+ AI agents
> **License:** Use freely, no attribution required

---

## How to Use This File
1. Copy this file into your project's `docs/` or root directory
2. Reference it in your project's CLAUDE.md, .cursorrules, or equivalent AI instruction file
3. Customize the project-specific sections (theme, stack, etc.)
4. Run AI Village or equivalent validation to enforce

---

## 1. Blueprint-First Protocol

### The Rule
**Every major component (>100 lines) MUST have a blueprint comment block at the very top of the file.**

### Why
Without blueprints, multiple developers (human or AI) working on the same codebase will:
- Implement the same feature differently
- Drift from intended architecture
- Create undocumented dependencies
- Make the project unmaintainable within weeks

### Blueprint Format — Main Components
```typescript
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [ComponentName]                                  ║
 * ║  PURPOSE: [One-line description]                             ║
 * ║  OWNER: [Who last modified]                                  ║
 * ║  LAST VALIDATED: [Date]                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ┌─── WIREFRAME ─────────────────────────────────────────────┐
 * │ [ASCII art showing the visual layout of this component]    │
 * └───────────────────────────────────────────────────────────┘
 *
 * ┌─── DATA FLOW ─────────────────────────────────────────────┐
 * │ Props In:  { clientId, userRole }                          │
 * │ State:     { items[], loading, error }                     │
 * │ API Calls: GET /api/items, POST /api/items                 │
 * │ Events:    onItemCreated, onItemDeleted                    │
 * │ Children:  ItemCard, ItemForm, Pagination                  │
 * └───────────────────────────────────────────────────────────┘
 *
 * ┌─── ARCHITECTURE (Mermaid) ────────────────────────────────┐
 * │ graph TD                                                   │
 * │   A[ParentComponent] --> B[ChildA]                        │
 * │   A --> C[ChildB]                                          │
 * │   B --> D[GrandchildA]                                     │
 * └───────────────────────────────────────────────────────────┘
 *
 * ┌─── SECURITY ──────────────────────────────────────────────┐
 * │ Auth: [Required role — admin, user, public]                │
 * │ Input: [Sanitization — XSS, SQL injection prevention]      │
 * │ RBAC: [What each role can/cannot do]                       │
 * └───────────────────────────────────────────────────────────┘
 */
```

### Blueprint Format — Sub-Components
```typescript
/**
 * ┌─── SUB-COMPONENT: [Name] ─────────────────────────────────┐
 * │ PARENT: [ParentComponent]                                  │
 * │ PURPOSE: [What this does]                                  │
 * │ WIREFRAME: [Simple ASCII layout]                           │
 * │ Props: { item, onUpdate, onDelete }                        │
 * │ State: Local only (editing, expanded)                      │
 * └────────────────────────────────────────────────────────────┘
 */
```

### Enforcement
- No component >100 lines without a blueprint header
- Update blueprint BEFORE modifying a component
- Sub-components reference parent's blueprint
- Automated linting checks for blueprint presence (optional)

---

## 2. 7-Star Documentation Standard

### Why
With multiple developers (especially AI agents), code without clear documentation becomes unreadable within days. This standard ensures any developer — junior or senior — can understand every file.

### Level 1: File Header (MANDATORY — all files)
```typescript
/**
 * ============================================================================
 * FILE: [FileName]
 * PURPOSE: [One clear sentence — what this file does]
 * AUTHOR: [Creator] | LAST MODIFIED: [Date]
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * [2-3 sentences in plain English. A developer who has never seen this
 *  codebase should understand this component after reading this.]
 *
 * HOW IT FITS IN THE APP:
 * Parent: [What renders this]
 * Children: [What this renders]
 * Data: [Where data comes from]
 *
 * KEY DECISIONS:
 * - [Why approach X over Y — rationale for non-obvious choices]
 */
```

### Level 2: Section Comments (MANDATORY — every logical section)
```typescript
// ─────────────────────────────────────────────────────────────
// SECTION: [Name — e.g., "State Management", "Event Handlers"]
// PURPOSE: [What this section does]
// WHY: [Non-obvious reasoning — e.g., "local state not context because..."]
// ─────────────────────────────────────────────────────────────
```

### Level 3: Inline Comments (MANDATORY — non-obvious logic)
```typescript
// Formula: BMI = weight_kg / height_m² — standard WHO calculation
// We round to 1 decimal per medical convention
const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
```

### Level 4: Function Documentation (MANDATORY — exported functions)
```typescript
/**
 * Calculates [what].
 *
 * WHY [this approach]: [Rationale — e.g., "Brzycki over Epley for 1-10 rep accuracy"]
 *
 * @param weight - Weight in pounds (must be > 0)
 * @param reps - Reps completed (2-10 for accuracy)
 * @returns Estimated value, rounded to nearest 5
 *
 * @example
 * calculate(135, 10) // Returns 180
 */
```

### Level 5: Blueprint Header (components >100 lines)
See Blueprint-First Protocol above.

---

## 3. No-Monolith File Rule

### The Rule
**No single file may exceed 300 lines of code (excluding comments and blank lines).**

### Why
- Monolith files are the #1 cause of merge conflicts in multi-developer teams
- Files >300 lines exceed comfortable reasoning (both human and AI)
- Decomposition forces better separation of concerns
- Smaller files = faster code review and validation

### Decomposition Strategy
When a file approaches 300 lines:

| Extract | Pattern | Example |
|---------|---------|---------|
| Sub-components | JSX inside `.map()` → own file | `ItemCard.tsx` from `ItemList.tsx` |
| Hooks | Data fetching, state machines | `useItems.ts` from `ItemList.tsx` |
| Utils | Pure functions, calculations | `utils/calculate.ts` |
| Types | Shared interfaces | `ItemTypes.ts` |
| Constants | Config, defaults, enums | `ItemConstants.ts` |
| Styles | Styled components (>5) | `ItemStyles.ts` |

### Exceptions
- Migration/seed data files
- Type definition files with many interfaces
- Test files

---

## 4. Build Hardening Checklist

### Frontend Rules
- **No portals inside `.map()` loops** — Memory leak. ONE portal outside, driven by state.
- **Every button has an `onClick`** — Dead buttons are a recurring bug.
- **`useMemo` on expensive parsing** — `parse*()`, `JSON.parse()`, regex in render.
- **`React.memo` on list items** — Components inside `.map()` over data arrays.
- **Lazy-load heavy components** — `React.lazy()` for 3D, AI, charts, >30KB.
- **No hardcoded colors** — Use theme tokens with fallbacks.
- **44px minimum touch targets** — All interactive elements.
- **WCAG 4.5:1 contrast** — Test text against its background.
- **Focus trap on modals** — `role="dialog" aria-modal="true"`, Escape to close.
- **Error boundaries on async UI** — Error state + retry, not silent failure.

### Backend Rules
- **Non-fatal dependency creation** — Optional child records don't kill transactions.
- **Soft-delete with audit trail** — Never hard-delete user data.
- **Destructive endpoints require confirmation** — Not a boolean, use email matching.
- **Try/catch on all async callbacks** — Set error state on failure.
- **Verify FK references exist** — Before adding FKs to models.

### Pre-Commit Checklist
1. Every new button has an `onClick` handler
2. No portals/heavy components inside `.map()`
3. All colors use theme tokens
4. Backend creates handle missing tables gracefully
5. All model FKs reference existing tables
6. Error states exist for every data fetch
7. No file exceeds 300 lines (excluding comments)
8. 7-star documentation present on all new/modified files

---

## 5. Multi-AI Coordination (Optional)

If your project uses multiple AI agents:

### Chain of Command
Define a clear hierarchy:
1. **CEO AI** — Final authority on all decisions
2. **CTO AI** — Technical architecture authority
3. **VP AI** — Runs initial reviews, makes recommendations
4. **Staff AI** — Surface findings, no decision authority

### Validation Pipeline
Run automated multi-model validation before deploys:
- Phase 1: Parallel validators (multiple models scan independently)
- Phase 2: Recursive debate (two models discuss until consensus)
- Phase 3: CEO review (final authority reviews consensus)

### Handoff Protocol
- Every AI session starts by reading project docs
- Every AI session ends with a status update
- Changes must be validated before merge

---

## 6. Customization Guide

Replace these project-specific values:

| Placeholder | Replace With |
|-------------|-------------|
| `[ProjectName]` | Your project name |
| `[ThemeName]` | Your design system name |
| Color tokens | Your project's color palette |
| Touch target size | Your accessibility requirements |
| Line limit (300) | Your team's preferred limit |
| AI agent names | Your AI tools (Claude, Cursor, Copilot, etc.) |

---

*"Measure twice, code once. Every component tells its own story."*
*7-Star Enterprise Standards v1.0 — Portable Template*
