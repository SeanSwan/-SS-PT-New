# SwanStudios AI Onboarding Prompt

> Paste this into Claude Code, Gemini Code Assist, or any AI terminal.
> The AI will know your workflow, where to find everything, and what to do.

---

## Who You Are

You are working on **SwanStudios** (SS-PT) — a production personal training SaaS platform.

- **Live site:** sswanstudios.com (deployed on Render from `main` branch)
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Galaxy-Swan (dark cosmic aesthetic — `#0a0a1a` bg, `#00FFFF` cyan, `#7851A9` purple)
- **Owner:** Sean Swan, NASM-certified trainer with 25+ years experience

---

## Your Workflow

### Step 1: Check for Validation Reports (BEFORE you start coding)

7 AI validators have already reviewed the latest code changes. Their reports are split by specialty:

```
AI-Village-Documentation/validation-prompts/latest/
  summary.md                  ← READ THIS FIRST — prioritized findings
  01-ux-accessibility.md      ← UX & WCAG 2.1 AA compliance
  02-code-quality.md          ← TypeScript, React patterns, DRY
  03-security.md              ← OWASP Top 10, auth, RBAC
  04-performance.md           ← Bundle size, renders, memory leaks
  05-competitive-intel.md     ← Feature gaps vs Trainerize/TrueCoach
  06-user-research.md         ← Persona alignment, onboarding friction
  07-architecture-bugs.md     ← Real bugs, arch flaws, tech debt
```

**Read only the reports relevant to your current task:**
- Doing UI work? → Read `01-ux-accessibility.md` + `06-user-research.md`
- Fixing bugs? → Read `07-architecture-bugs.md` + `02-code-quality.md`
- Security audit? → Read `03-security.md`
- Performance work? → Read `04-performance.md`
- Strategy/features? → Read `05-competitive-intel.md`

### Step 2: Read Project Rules

```
CLAUDE.md                     ← Project conventions, build commands, key directories
```

Key rules from CLAUDE.md:
- **No Material-UI** — all UI uses styled-components with Galaxy-Swan theme tokens
- **44px minimum touch targets** on all interactive elements
- **10-breakpoint responsive matrix** (320px → 3840px)
- **Commit style:** `type(scope): description`
- **Build:** `cd frontend && npm run build`
- **Tests:** `cd frontend && npx vitest run --reporter verbose`

### Step 3: Check Feature Roadmap (if building new features)

The 10-feature NASM enhancement roadmap and modular prompt architecture plan:
```
AI-Village-Documentation/ENHANCEMENT-MASTER-PROMPT.md
```

If doing UI/UX redesign work, check the active plan file referenced in your session, or:
```
docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
```

### Step 4: Do the Work

Fix issues found in the validation reports, or implement the requested feature/fix.

### Step 5: Run the Validator (AFTER you finish coding)

```bash
node scripts/validation-orchestrator.mjs --since 2h
```

This fires 7 AI validators in parallel (~$0.005/run) and writes fresh reports to `AI-Village-Documentation/validation-prompts/latest/`. Review the summary to confirm your changes didn't introduce new issues.

---

## Key Files Quick Reference

| What | Where |
|------|-------|
| Project rules | `CLAUDE.md` |
| Validation reports | `AI-Village-Documentation/validation-prompts/latest/` |
| Past validation runs | `AI-Village-Documentation/validation-prompts/archive/` (max 20) |
| AI Village docs | `AI-Village-Documentation/` |
| AI handoff status | `docs/ai-workflow/AI-HANDOFF/` |
| Frontend components | `frontend/src/components/` |
| Frontend pages | `frontend/src/pages/` |
| Backend routes | `backend/routes/` |
| Backend models | `backend/models/` |
| Theme system | `frontend/src/styles/theme/` |
| Validation script | `scripts/validation-orchestrator.mjs` |
| Image generator | `scripts/generate-image.mjs` |

---

## Important Constraints

1. **Budget:** Use subscription terminals (Claude Pro, Gemini Code Assist) for heavy lifting. The orchestrator uses OpenRouter free-tier models for validation scans.
2. **No ChatGPT/OpenAI** — not part of the workflow.
3. **Galaxy-Swan identity must be preserved** — dark cosmic aesthetic, cyan accents, glass surfaces.
4. **Monetization flows are sacred** — checkout, booking, store pages get extra care.
5. **Always build before deploying:** `cd frontend && npm run build` must pass with zero errors.

---

*SwanStudios AI Village — 7-Brain Validation System v7.0*
