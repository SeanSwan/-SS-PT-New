# Skills Infrastructure — SwanStudios AI Workflow

**Purpose:** Canonical reference for all installed AI agent skills, their sources, when to use them, and how they integrate with the Swan operating layer and multi-AI handoff workflow.
**Last Updated:** 2026-04-12 (Phase 3 quarantine move — Swan visual operating system)
**Owner:** SwanStudios Core Team
**CLI:** `npx skills` (v1.3.9+) — https://skills.sh/

> See also: `docs/ai-workflow/references/SKILLS-REFERENCE.md` (compact reference), `CLAUDE.md` rules 40-41 (routing), `ACTIVE-INDEX.md` (surface/archive map).

---

## Strict-model discipline (MANDATORY — Phase 3 landed 2026-04-12)

- **`swan-design-router` is the ONLY default-exposed design brain.** All UI/visual work auto-routes through it (CLAUDE.md rule 40).
- **`closeout-evidence-lock` is the default closeout skill.** All substantial task closeouts auto-route through it (rule 41).
- **`requesting-code-review` is REMOVED from default use.** It depends on a missing `superpowers:code-reviewer` subagent and silently fails. Its substantive checklist is preserved inside `closeout-evidence-lock`. Do NOT dispatch to `requesting-code-review` from any new code path.
- **8 skills are quarantined from default-steering** — see "Quarantined skills" section below.

---

## Installed Skills Inventory

### File Layout (post-Phase-3, 2026-04-12)

```
.agents/skills/           ← Broader installed library (26 entries after Phase 3 quarantine)
├── swan-orchestrator/              ← Swan layer
├── canonical-surface-audit/        ← Swan layer
├── repo-hygiene-scan/              ← Swan layer
├── swan-design-router/             ← Swan layer (only default design brain)
├── closeout-evidence-lock/         ← Swan layer (default closeout)
├── systematic-debugging/           ← KEEP core
├── test-driven-development/        ← KEEP core
├── verification-before-completion/ ← KEEP core
├── webapp-testing/                 ← KEEP core
├── agent-browser/                  ← KEEP core
├── audit-website/                  ← KEEP core
├── full-output-enforcement/        ← KEEP core
├── seedance-swan-video/            ← KEEP core (Swan-specific)
├── frontend-design/                ← Reference library (router-loaded, NOT mirrored into .claude/skills)
├── ui-ux-pro-max/                  ← Reference library (router-loaded, NOT mirrored into .claude/skills)
└── [16 additional technical reference docs not mirrored to .claude/skills — default-steering behavior not relied on here]

archive/quarantined-skills/2026-04-12/   ← Phase 3 quarantine destination (8 skills relocated from .agents/skills/)
├── minimalist-ui/                  ← Narrow aesthetic
├── industrial-brutalist-ui/        ← Narrow aesthetic
├── high-end-visual-design/         ← Opinionated persona
├── design-taste-frontend/          ← LILA BAN conflict
├── stitch-design-taste/            ← Niche Google Stitch output
├── redesign-existing-projects/     ← Audit-focused, noisy as default
├── web-design-guidelines/          ← Review-only, overlaps with core
└── requesting-code-review/         ← Broken superpowers:code-reviewer dependency
                                       (code-reviewer.md template preserved alongside SKILL.md)

.claude/skills/           ← Active runtime surface (13 entries as of 2026-04-12)
└── [5 Swan orchestration + 8 KEEP core = 13]
    No reference libraries, no quarantined skills. Strict model is fully enforced.
```

---

## Skill categories

### Swan orchestration layer (5, default-active, Phase 1 landed 2026-04-12)

| # | Skill | Source | Category |
|---|---|---|---|
| 1 | `swan-orchestrator` | SS-PT-native (2026-04-12) | Pre-task gate |
| 2 | `canonical-surface-audit` | SS-PT-native (2026-04-12) | Rules 26-31 execution |
| 3 | `repo-hygiene-scan` | SS-PT-native (2026-04-12) | Rules 32-39 execution |
| 4 | `swan-design-router` | SS-PT-native (2026-04-12) | Only default design brain |
| 5 | `closeout-evidence-lock` | SS-PT-native (2026-04-12) | End-of-task evidence gate |

### KEEP core skills (8, default-active, unchanged)

| # | Skill | Source | Category |
|---|---|---|---|
| 6 | `systematic-debugging` | `obra/superpowers` | Process (root-cause-first) |
| 7 | `test-driven-development` | `obra/superpowers` | Process (red-green-refactor) |
| 8 | `verification-before-completion` | `obra/superpowers` | Process (evidence gate) |
| 9 | `webapp-testing` | `anthropics/skills` | Testing (Playwright) |
| 10 | `agent-browser` | `vercel-labs/agent-browser` | Browser automation |
| 11 | `audit-website` | `squirrelscan/skills` | Site audit (SEO/perf/a11y) |
| 12 | `full-output-enforcement` | pre-installed | Anti-truncation meta-rule |
| 13 | `seedance-swan-video` | SS-PT-native | Swan-specific video prompt builder |

### Reference libraries (router-loaded from `.agents/skills/`, NOT default-exposed)

| # | Canonical path | Role |
|---|---|---|
| 14 | `.agents/skills/frontend-design/SKILL.md` | Implementation constraint layer — accessibility, responsiveness, `:focus-visible`, anti-generic discipline. Loaded by `swan-design-router`. |
| 15 | `.agents/skills/ui-ux-pro-max/SKILL.md` | Idea library — 50 styles, 21 palettes, 9 stacks. Loaded by `swan-design-router` with Tailwind bias actively rejected. |

As of Phase 3 (2026-04-12), these are **not in `.claude/skills/`**. Their former junction entries have been removed from the default-exposed surface. They are **not archived** and **not quarantined** — the sources remain in place at `.agents/skills/` and are loaded on-demand by the router.

### Quarantined skills (8, explicit-invocation-only)

As of Phase 3 (2026-04-12), these 8 skills have been relocated from `.agents/skills/` to **`archive/quarantined-skills/2026-04-12/`**. Their former `.claude/skills/` junction entries have been removed from the default-exposed surface. Invoke only when Sean explicitly names the skill by slash-command. The Phase 3 move is reversible via `git mv` back.

| Skill | Reason for quarantine |
|---|---|
| `minimalist-ui` | Narrow aesthetic — conflicts with Swan dark-luxury direction |
| `industrial-brutalist-ui` | Narrow aesthetic — conflicts with Swan cinematic direction |
| `high-end-visual-design` | Rigid "Absolute Zero" bans + opinionated persona |
| `design-taste-frontend` | "THE LILA BAN" at line 58 directly contradicts Swan's Dual-Button Glow rule |
| `stitch-design-taste` | Niche to Google Stitch `DESIGN.md` output |
| `redesign-existing-projects` | Audit-focused, noisy as default |
| `web-design-guidelines` | Review-only, overlaps with `verification-before-completion` + CLAUDE.md rules 22-23 |
| `requesting-code-review` | **Broken** — depends on missing `superpowers:code-reviewer` subagent. Substantive checklist preserved in `closeout-evidence-lock`. |

---

## When to Use Each Skill

### By Workflow Phase

| Phase | Skill(s) | Trigger |
|---|---|---|
| **Task start (non-trivial)** | `swan-orchestrator` | Any feature, bugfix, UI work, audit, refactor |
| **Route/data-truth audit** | `canonical-surface-audit` | Any UI/data-truth bug, "which dashboard is live" question |
| **Repo-structural confusion** | `repo-hygiene-scan` | Major refactors, dashboard audits, fresh cluttered sessions |
| **Bug investigation** | `systematic-debugging` | Any test failure, bug report, or unexpected behavior |
| **Feature planning** | `test-driven-development` | Before writing any production code |
| **UI implementation** | `swan-design-router` | Any UI/visual task (router loads design system + asset doc) |
| **UI review** | `swan-design-router` dual-pass critique + `verification-before-completion` | After UI changes, before claiming done |
| **Functional testing** | `webapp-testing` | After any frontend change with user-facing behavior |
| **Browser verification** | `agent-browser` | Form testing, login flows, visual verification |
| **Completion gate** | `verification-before-completion` | Before ANY claim of "done", "fixed", or "complete" |
| **End-of-task closeout** | `closeout-evidence-lock` | Every non-trivial task before declaring complete |
| **Pre-launch audit** | `audit-website` | Before production deploys, regression detection |

### Skill chains (common sequences)

```
Bug Fix Flow:
  swan-orchestrator (pre-task gate)
    → systematic-debugging
    → test-driven-development
    → verification-before-completion
    → closeout-evidence-lock

UI Feature Flow:
  swan-orchestrator (pre-task gate)
    → canonical-surface-audit (if touching existing surface)
    → swan-design-router (with 2-3 concept-direction ideation gate for net-new surfaces)
    → test-driven-development (for any non-trivial logic)
    → webapp-testing
    → verification-before-completion
    → closeout-evidence-lock

Repo / Architecture Audit Flow:
  swan-orchestrator (pre-task gate)
    → repo-hygiene-scan
    → canonical-surface-audit (if competing surfaces exist)
    → closeout-evidence-lock

Pre-Deploy Flow:
  audit-website
    → systematic-debugging (per issue)
    → verification-before-completion
    → closeout-evidence-lock
```

---

## Multi-AI Integration

### Required skills per role

| Role | Required skills | Optional |
|---|---|---|
| **Implementer** | `swan-orchestrator`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `closeout-evidence-lock` | `swan-design-router` (for UI), `canonical-surface-audit` (for audits) |
| **Reviewer A (correctness/security)** | `closeout-evidence-lock`, `verification-before-completion` | `audit-website`, `canonical-surface-audit` |
| **Reviewer B (UX/data)** | `swan-design-router` dual-pass critique, `webapp-testing` | `agent-browser` |
| **Tie-break Reviewer** | `verification-before-completion`, `closeout-evidence-lock` | All others as needed |

### Handoff evidence requirements (Swan-enhanced)

When handing off work, the Implementer must provide:

1. **Build/test summary** — Use `verification-before-completion`
2. **Changed files list** — Standard git diff
3. **Behavior verification** — Use `webapp-testing` or `agent-browser` for UI changes
4. **Canonical Surface Receipt** — From `canonical-surface-audit` if the task touched an existing UI/data-truth surface
5. **Closeout report** — Use `closeout-evidence-lock` for every substantial task. Report must include Claim-to-Evidence Lock, dual-pass hostile review, and the 5-category substantive code-review checklist.

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
ls .claude/skills/
```

---

## Best Practices

### Do

- Run `swan-orchestrator` as the first step of any non-trivial task
- Run `verification-before-completion` before every commit message that says "fix" or "complete"
- Run `closeout-evidence-lock` at the end of every substantial task
- Route UI work through `swan-design-router` — do NOT bypass to `frontend-design`, `ui-ux-pro-max`, `high-end-visual-design`, or any other design skill as a default path
- Use `systematic-debugging` when a fix attempt fails — never guess twice
- Chain `webapp-testing` → `verification-before-completion` → `closeout-evidence-lock` after UI features
- Produce a Canonical Surface Receipt before touching any UI/data-truth bug

### Do Not

- Skip `verification-before-completion` because "it's a small change"
- Dispatch to `requesting-code-review` — it is broken (missing `superpowers:code-reviewer` dependency) and its intent is preserved in `closeout-evidence-lock`
- Auto-load quarantined design skills (`minimalist-ui`, `industrial-brutalist-ui`, etc.) — they are explicit-invocation-only
- Let `design-taste-frontend`'s LILA BAN override Swan's Dual-Button Glow rule (the router explicitly rejects LILA BAN when invoked)
- Use `agent-browser` for tasks that `webapp-testing` handles better (framework-level testing)
- Run `audit-website` in `full` mode on every deploy — use `quick` for iterative work
- Claim a fix without `systematic-debugging` Phase 1 (root cause) completed
- Claim "end-to-end fixed" or "live surface patched" without a Canonical Surface Receipt in the same report (CLAUDE.md rule 28)

---

## Canonical References

- Skills CLI docs: https://skills.sh/docs
- Skills CLI commands: https://skills.sh/docs/cli
- Compact skills reference: `docs/ai-workflow/references/SKILLS-REFERENCE.md`
- Swan visual source of truth: `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
- Swan asset + Seedance templates: `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`
- Repo hygiene protocol: `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`
- Active index: `ACTIVE-INDEX.md` at repo root
- Handoff protocol: `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- Master handbook: `docs/MASTER-HANDBOOK.md`
- This file: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
