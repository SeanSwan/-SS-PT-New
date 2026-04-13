# AI Agent Skills
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: skill management, installed skills overview
> **Last updated:** 2026-04-12 (Phase 3 quarantine move — Swan visual operating system)

---

## Strict-model discipline (MANDATORY)

- **`swan-design-router` is the ONLY default-exposed design brain.** All UI/visual work auto-routes through it (CLAUDE.md rule 40).
- **`closeout-evidence-lock` is the default closeout skill.** All substantial task closeouts auto-route through it (rule 41).
- **`requesting-code-review` is REMOVED from default use.** It depends on a missing `superpowers:code-reviewer` subagent and silently fails. Its substantive checklist is preserved inside `closeout-evidence-lock`. Do NOT dispatch to `requesting-code-review` from any new code path.
- **8 skills are quarantined from default-steering** (explicit-invocation-only): `minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`, `requesting-code-review`.

---

## Swan orchestration layer (5 skills, all default-active — Phase 1 landed 2026-04-12)

Location: `.claude/skills/`

| Skill | Role |
|---|---|
| `swan-orchestrator` | Pre-task gate. Enforces rules 15 (recursive planning), 17 (dual-pass), 26 (Canonical Surface Receipt), 32 (hygiene trigger). Dispatches to the right Swan skill for the task type. |
| `canonical-surface-audit` | Standardized execution surface for rules 26-31. Produces Canonical Surface Receipt, Surface Classification Table, Schema Cross-Check Artifact, Backend Route Ownership / Shadow Audit. |
| `repo-hygiene-scan` | Standardized execution surface for rules 32-39. Produces the Phase 1 non-destructive inventory doc. Never moves, renames, or deletes files. |
| `swan-design-router` | Only default-exposed design brain. Loads `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md`. Enforces styled-components-first, Crystalline Swan palette, Dual-Button Glow rule, 2-3 concept-direction ideation gate for net-new surfaces. |
| `closeout-evidence-lock` | End-of-task closeout gate. Enforces Claim-to-Evidence Lock (rule 28) + dual-pass hostile review (rule 17) + post-task hygiene check (rule 38) + forbidden-language filter (rule 34). Preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) from retired `requesting-code-review`. |

---

## KEEP core skills (8, default-active, unchanged)

| Skill | Purpose |
|---|---|
| `verification-before-completion` | MANDATORY before any "done" or "fixed" claim |
| `systematic-debugging` | MANDATORY for any bug investigation (root-cause-first). Highest-quality skill in the runtime set (self-scored 90.9%). |
| `test-driven-development` | Write tests before production code — feeds rule 17 dual-pass |
| `webapp-testing` | Playwright-based frontend testing |
| `agent-browser` | Browser automation for visual verification |
| `audit-website` | Comprehensive site audit (SEO, perf, security, a11y via squirrelscan) |
| `full-output-enforcement` | Anti-truncation, no `// TODO` placeholders |
| `seedance-swan-video` | Swan-specific Seedance 2.0 video prompt builder (exercise demos, hero loops, brand films) |

---

## Reference libraries loaded by `swan-design-router` (NOT default-exposed)

| Skill | Canonical location | Role in Swan layer |
|---|---|---|
| `frontend-design` | `.agents/skills/frontend-design/SKILL.md` | Implementation constraint layer — accessibility, responsiveness, `:focus-visible`, anti-generic discipline. Router borrows its language for production guardrails. |
| `ui-ux-pro-max` | `.agents/skills/ui-ux-pro-max/SKILL.md` | Idea library — 50 styles, 21 palettes, 50 font pairings, 9 stacks. Router borrows its breadth for style-space exploration; router rejects Tailwind-biased suggestions. |

These sources are **not in `.claude/skills/`**. They are **not archived** and **not quarantined**. They are loaded on-demand by the router from their `.agents/skills/` paths. Phase 3 removed their former `.claude/skills/` junction entries from the default-exposed surface on 2026-04-12.

---

## Quarantined skills — explicit-invocation-only (8)

These skills have been relocated from `.agents/skills/` to `archive/quarantined-skills/2026-04-12/` as of Phase 3 (2026-04-12). Their former `.claude/skills/` junction entries have been removed from the default-exposed surface. Invoke only when Sean explicitly names the skill by slash-command. The Phase 3 move is reversible via `git mv` back.

| Skill | Reason for quarantine |
|---|---|
| `minimalist-ui` | Narrow aesthetic (warm monochrome + flat bento + no gradients). Conflicts with Swan's dark-luxury direction. |
| `industrial-brutalist-ui` | Narrow aesthetic (Swiss typographic + military terminal). Conflicts with Swan's cinematic direction. |
| `high-end-visual-design` | Rigid "Absolute Zero" bans + opinionated "Awwwards-tier" persona. Useful occasionally, not as default. |
| `design-taste-frontend` | **Contains "THE LILA BAN" at line 58** that directly contradicts Swan's Dual-Button Glow rule (bans purple button glows and neon gradients). Hard doctrinal conflict with Swan brand. |
| `stitch-design-taste` | Niche to Google Stitch `DESIGN.md` output format. |
| `redesign-existing-projects` | Audit-focused — useful when Sean explicitly requests a redesign audit, noisy otherwise. |
| `web-design-guidelines` | Review-only — overlaps with `verification-before-completion` + CLAUDE.md rules 22-23 design dual-pass. |
| `requesting-code-review` | **Broken** — depends on missing `superpowers:code-reviewer` subagent. Substantive checklist preserved in `closeout-evidence-lock`. Do NOT dispatch to this skill. |

---

## Skill count summary (post-Phase-3, 2026-04-12)

- **Default-exposed `.claude/skills/`:** 13 (5 Swan orchestration + 8 KEEP core)
- **Reference libraries (router-loaded from `.agents/skills/`, not default-exposed):** 2 (`frontend-design`, `ui-ux-pro-max`)
- **Quarantined (relocated to `archive/quarantined-skills/2026-04-12/`, explicit-invocation-only):** 8
- **Broader installed library (`.agents/skills/`):** 26 entries remaining after Phase 3 quarantine — including 16 additional technical reference docs not mirrored into `.claude/skills/` (their default-steering behavior is not relied on here) and the 2 reference libraries loaded by `swan-design-router`

---

## Maintenance commands

`npx skills check` | `npx skills update` | `npx skills find <keyword>`

Full Swan layer documentation:
- `CLAUDE.md` rules 26-41 (mandatory discipline)
- `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md` (rules 32-39 workflow)
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` (visual source of truth, loaded by `swan-design-router`)
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` (asset + Seedance templates, loaded by `swan-design-router`)
- `ACTIVE-INDEX.md` at repo root (one-page surface/archive map)
