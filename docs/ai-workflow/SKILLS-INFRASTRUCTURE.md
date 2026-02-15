# Skills Infrastructure — SwanStudios AI Workflow

**Purpose:** Canonical reference for all installed AI agent skills, their sources, when to use them, and how they integrate with the multi-AI handoff workflow.
**Last Updated:** 2026-02-15
**Owner:** SwanStudios Core Team
**CLI:** `npx skills` (v1.3.9+) — https://skills.sh/

---

## Installed Skills Inventory

### File Layout

```
.agents/skills/           ← Universal skill source (all agents)
├── agent-browser/
├── audit-website/
├── frontend-design/
├── requesting-code-review/
├── systematic-debugging/
├── test-driven-development/
├── ui-ux-pro-max/
├── verification-before-completion/
├── webapp-testing/
└── web-design-guidelines/

.claude/skills/           ← Claude Code symlinks (auto-created)
└── [symlinks → .agents/skills/*]
```

### Skill Registry

| # | Skill | Source Repo | Installed | Category |
|---|-------|-------------|-----------|----------|
| 1 | `webapp-testing` | `anthropics/skills` | 2026-02-15 | Testing |
| 2 | `web-design-guidelines` | `vercel-labs/agent-skills` | 2026-02-15 | UI/UX QA |
| 3 | `verification-before-completion` | `obra/superpowers` | 2026-02-15 | Process |
| 4 | `systematic-debugging` | `obra/superpowers` | 2026-02-15 | Process |
| 5 | `requesting-code-review` | `obra/superpowers` | 2026-02-15 | Review |
| 6 | `test-driven-development` | `obra/superpowers` | 2026-02-15 | Testing |
| 7 | `agent-browser` | `vercel-labs/agent-browser` | 2026-02-15 | Browser |
| 8 | `audit-website` | `squirrelscan/skills` | 2026-02-15 | Audit |
| 9 | `frontend-design` | (pre-installed) | 2026-02-08 | Design |
| 10 | `ui-ux-pro-max` | (pre-installed) | 2026-02-08 | Design |

---

## Skill Summaries

### Core Process Skills (Mandatory)

**`verification-before-completion`** — Enforces evidence-based verification before ANY completion claim. No "Done!" without fresh proof (build output, test results, screenshots). Iron law: run the verification command, read full output, then claim success.

**`systematic-debugging`** — Root-cause-first debugging. Four phases: (1) Investigate → (2) Pattern Analysis → (3) Hypothesis & Test → (4) Implement. No quick patches without understanding the root cause. After 3+ failed fixes, question the architecture.

**`requesting-code-review`** — Formalizes review handoff. After each task/feature, dispatch review with: what was implemented, plan reference, changed files, base/head SHAs. Mandatory before merge to main.

**`test-driven-development`** — Write-test-first discipline. Red-Green-Refactor cycle. No production code without a failing test first. Tests answer "What should this do?" not "What does this do?"

### Testing & QA Skills

**`webapp-testing`** — Playwright-based web app testing. Reconnaissance-then-action pattern: navigate → wait for networkidle → snapshot → identify selectors → execute. Uses `with_server.py` for server lifecycle.

**`web-design-guidelines`** — Audits UI code against 230+ Web Interface Guidelines (accessibility, contrast, readability, UX patterns). Fetches fresh rules from source before each review.

**`audit-website`** — Comprehensive site audit across 21 categories (SEO, performance, security, accessibility, content, schema, legal). Three modes: `quick` (25 pages), `surface` (100 pages), `full` (500 pages). Score targets: Grade A = 95+.

### Browser & Design Skills

**`agent-browser`** — Browser automation for AI agents. Navigate → Snapshot (get refs) → Interact using refs → Re-snapshot. Supports session persistence, parallel sessions, screenshot capture.

**`frontend-design`** — Production-grade frontend interface creation. Galaxy-Swan theme integration, distinctive design output.

**`ui-ux-pro-max`** — 50 design styles, 21 palettes, 50 font pairings. Actions: plan, build, review, fix, improve. Styles: glassmorphism, dark mode, responsive.

---

## When to Use Each Skill

### By Workflow Phase

| Phase | Skill(s) | Trigger |
|-------|----------|---------|
| **Bug Report** | `systematic-debugging` | Any test failure, bug report, or unexpected behavior |
| **Feature Planning** | `test-driven-development` | Before writing any production code |
| **UI Implementation** | `frontend-design`, `ui-ux-pro-max` | Building new components or pages |
| **UI Review** | `web-design-guidelines` | After UI changes, before claiming done |
| **Functional Testing** | `webapp-testing` | After any frontend change with user-facing behavior |
| **Browser Verification** | `agent-browser` | Form testing, login flows, visual verification |
| **Completion Gate** | `verification-before-completion` | Before ANY claim of "done", "fixed", or "complete" |
| **Code Review** | `requesting-code-review` | After task completion, before merge |
| **Pre-Launch Audit** | `audit-website` | Before production deploys, regression detection |

### Skill Chains (Common Sequences)

```
Bug Fix Flow:
  systematic-debugging → test-driven-development → verification-before-completion → requesting-code-review

UI Feature Flow:
  frontend-design / ui-ux-pro-max → webapp-testing → web-design-guidelines → verification-before-completion

Pre-Deploy Flow:
  audit-website → systematic-debugging (for each issue) → verification-before-completion

Review Cycle:
  requesting-code-review → systematic-debugging (if issues found) → verification-before-completion
```

---

## Multi-AI Integration

### Required Skills Per Role

| Role | Required Skills | Optional |
|------|----------------|----------|
| **Implementer** | `systematic-debugging`, `test-driven-development`, `verification-before-completion` | `frontend-design`, `ui-ux-pro-max` |
| **Reviewer A (correctness/security)** | `requesting-code-review`, `verification-before-completion` | `audit-website` |
| **Reviewer B (UX/data)** | `web-design-guidelines`, `webapp-testing` | `agent-browser` |
| **Tie-break Reviewer** | `verification-before-completion` | All others as needed |

### Handoff Evidence Requirements (Skills-Enhanced)

When handing off work, the Implementer must provide:

1. **Build/test summary** — Use `verification-before-completion` to verify claims
2. **Changed files list** — Standard git diff
3. **Behavior verification** — Use `webapp-testing` or `agent-browser` for UI changes
4. **Design compliance** — Use `web-design-guidelines` for any UI work
5. **Review request** — Use `requesting-code-review` before merge

---

## Maintenance Commands

```bash
# Check for updates to all installed skills
npx skills check

# Update all skills to latest
npx skills update

# Search for new skills
npx skills find <keyword>

# Add a new skill
npx skills add <repo-url> --skill <skill-name> -y

# List installed skills (manual)
ls .agents/skills/
```

---

## Best Practices

### Do

- Run `verification-before-completion` before every commit message that says "fix" or "complete"
- Run `web-design-guidelines` after any styled-component change
- Use `systematic-debugging` when a fix attempt fails — never guess twice
- Chain `webapp-testing` → `verification-before-completion` after UI features
- Run `audit-website` with `--format llm` for token-efficient output

### Do Not

- Skip `verification-before-completion` because "it's a small change"
- Use `agent-browser` for tasks that `webapp-testing` handles better (framework-level testing)
- Run `audit-website` in `full` mode on every deploy — use `quick` for iterative work
- Bypass `requesting-code-review` for "simple" changes
- Claim a fix without `systematic-debugging` Phase 1 (root cause) completed

---

## Canonical References

- Skills CLI docs: https://skills.sh/docs
- Skills CLI commands: https://skills.sh/docs/cli
- This file: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- Handoff protocol: `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- Master handbook: `docs/MASTER-HANDBOOK.md`
