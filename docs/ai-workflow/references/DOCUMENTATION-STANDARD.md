# 7-Star Documentation Standard (MANDATORY)
> Reference doc extracted from CLAUDE.md — loaded on-demand, not every message.
> Read this doc when working on: writing or reviewing documentation, creating new files, or auditing code quality.

---

## 7-Star Documentation Standard (MANDATORY)

Every file in the codebase MUST follow this documentation pattern. Junior developers must understand every component without asking anyone.

### Level 1: File Header (ALL files)
```typescript
/**
 * ============================================================================
 * FILE: ComponentName.tsx
 * PURPOSE: [One clear sentence]
 * AUTHOR: [Creator] | LAST MODIFIED: [Date]
 * AI VILLAGE VALIDATED: [Date]
 * ============================================================================
 *
 * WHAT THIS FILE DOES: [2-3 sentences in plain English]
 * HOW IT FITS IN THE APP: Parent → Children → Data flow
 * KEY DECISIONS: [Why approach X over Y]
 * NASM PROTOCOL CONTEXT: [OPT phase relevance, if any]
 */
```

### Level 2: Section Comments (every logical section)
```typescript
// ─────────────────────────────────────────────────────────────
// SECTION: [Name]
// PURPOSE: [What this section does]
// WHY: [Non-obvious architectural reasoning]
// ─────────────────────────────────────────────────────────────
```

### Level 3: Inline Comments (non-obvious logic only)
```typescript
// Brzycki formula: estimated1RM = weight / (1.0278 - 0.0278 × reps)
// More accurate than Epley for 1-10 rep range (NASM standard)
```

### Level 4: Function Docs (all exported functions)
```typescript
/**
 * [Description]. [WHY this approach]. @param / @returns / @example
 */
```

### Level 5: Blueprint Header (components >100 lines)
See Blueprint-First Protocol above.

---

## No-Monolith File Rule (MANDATORY)

**No single file may exceed 300 lines of code (excluding comments and blank lines).**

### Why
- Monolith files cause merge conflicts in multi-AI development
- Files >300 lines exceed reasonable context window reasoning
- Smaller files = faster AI Village validation

### Decomposition Strategy
When a component approaches 300 lines:
1. **Extract sub-components** — JSX inside `.map()` → own file
2. **Extract hooks** — Data fetching, state machines → `use[Feature].ts`
3. **Extract utils** — Pure functions → `utils/[feature].ts`
4. **Extract types** — Shared interfaces → `[Feature]Types.ts`
5. **Extract constants** — Config, defaults → `[Feature]Constants.ts`
6. **Extract styled components** — When >5 styled components → `[Feature]Styles.ts`

### Exceptions
- Migration/seed data files (sequential SQL / large datasets)
- Type definition files (many interfaces)
- Test files (test suites can be long)
