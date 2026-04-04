# AI Agent Skills
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: skill management, installed skills overview

---

## AI Agent Skills (17 installed)
Skills are in `.agents/skills/` (symlinked to `.claude/skills/` and `.continue/skills/`).

### Core Process Skills (10)
- `verification-before-completion` — MANDATORY before any "done" or "fixed" claim
- `systematic-debugging` — MANDATORY for any bug investigation (root-cause-first)
- `requesting-code-review` — MANDATORY before merge to main
- `test-driven-development` — write tests before production code
- `webapp-testing` — Playwright-based frontend testing
- `web-design-guidelines` — UI accessibility/contrast audit (Vercel)
- `audit-website` — comprehensive site audit (SEO, perf, security, a11y via squirrelscan)
- `agent-browser` — browser automation for visual verification
- `frontend-design` — distinctive, production-grade frontend interfaces
- `ui-ux-pro-max` — 50 styles, 21 palettes, 50 font pairings, 9 stacks

### Design Enhancement Skills (7, from taste-skill)
- `design-taste-frontend` — anti-AI-slop design rules, 3 tunable dials (NOTE: its ban on "AI purple/blue" is OVERRIDDEN — Wing Purple + Ice Wing are our brand)
- `high-end-visual-design` — $150k agency look, spring physics
- `redesign-existing-projects` — design audit + fix priority
- `full-output-enforcement` — anti-truncation, no `// TODO` placeholders
- `minimalist-ui` — editorial clean (NOT for SwanStudios — our brand is maximalist dark-luxury)
- `industrial-brutalist-ui` — Swiss typographic + terminal (NOT for SwanStudios)
- `stitch-design-taste` — Google Stitch compatibility (only if using Stitch)

### Maintenance
`npx skills check` | `npx skills update` | `npx skills find <keyword>`


---

## Installed Skills Reference

### Core Process Skills (10)
| Skill | Purpose |
|-------|---------|
| `verification-before-completion` | MANDATORY before "done" claims |
| `systematic-debugging` | Root-cause-first bug investigation |
| `requesting-code-review` | Pre-merge review checklist |
| `test-driven-development` | Tests before production code |
| `webapp-testing` | Playwright frontend testing |
| `web-design-guidelines` | UI accessibility/contrast audit |
| `audit-website` | Comprehensive site audit |
| `agent-browser` | Browser automation |
| `frontend-design` | Distinctive production-grade UI |
| `ui-ux-pro-max` | 50 styles, 21 palettes, design DB |

### Design Enhancement Skills (from taste-skill, 7)
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `design-taste-frontend` | Anti-AI-slop design rules, 3 tunable dials | Building any new UI component |
| `high-end-visual-design` | $150k agency look, spring physics | Premium/hero sections |
| `redesign-existing-projects` | Design audit + fix priority | Reviewing existing pages |
| `full-output-enforcement` | Anti-truncation, no `// TODO` | Always active |
| `minimalist-ui` | Editorial clean interfaces | NOT for SwanStudios (our brand is maximalist dark-luxury) |
| `industrial-brutalist-ui` | Swiss typographic + terminal | NOT for SwanStudios |
| `stitch-design-taste` | Google Stitch compatibility | Only if using Stitch |

**Note:** `design-taste-frontend` bans "AI purple/blue" — this conflicts with our Crystalline Swan brand. Override: Wing Purple `#8B5CF6` and Ice Wing `#60C0F0` glows ARE our brand identity and are NOT generic AI purple/blue. Use them confidently.
