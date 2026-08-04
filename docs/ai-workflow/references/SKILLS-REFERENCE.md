# AI Agent Skills
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: skill management, installed skills overview
> **Last updated:** 2026-08-02 (workflow router and deterministic inventory)

---

## Strict-model discipline (MANDATORY)

- **`AGENT-WORKFLOW-ROUTER.md` is the front door for task mode.** It selects normal execution, Wayfinder, goal contract, workspace isolation, or guided setup before project gates.
- **`swan-design-router` is the ONLY default-exposed design brain.** All UI/visual work auto-routes through it (CLAUDE.md rule 40).
- **`closeout-evidence-lock` is the default closeout skill.** All substantial task closeouts auto-route through it (rule 41).
- **`swan-oracle` is advisory only.** It creates GPT Pro / GPT-5.5-class review packets and classifies returned recommendations. It does not override `swan-design-router`, Codex/Claude review gates, tests, privacy, or repo evidence.
- **`requesting-code-review` is REMOVED from default use.** It depends on a missing `superpowers:code-reviewer` subagent and silently fails. Its substantive checklist is preserved inside `closeout-evidence-lock`. Do NOT dispatch to `requesting-code-review` from any new code path.
- **Quarantined skills are explicit-invocation-only.** Discover current entrypoints from disk and keep the archive classification below.

---

## Swan orchestration and workflow layer

Location: `.claude/skills/`

| Skill | Role |
|---|---|
| `swan-orchestrator` | Pre-task gate. Enforces rules 15 (recursive planning), 17 (dual-pass), 26 (Canonical Surface Receipt), 32 (hygiene trigger). Dispatches to the right Swan skill for the task type. |
| `wayfinder` | Situational map, fog/frontier, claims, and dependency-ordered decision tickets only when work is both multi-session and materially foggy. Exits early otherwise. |
| `goal-contract` | Measurable objective, validation, constraints, checkpoints, uncertainty, and stop conditions. Never creates a persistent goal implicitly. |
| `worktree-isolation` | Classifies read-only/shared/isolated/stale workspaces and produces a verified baseline, environment, dependency, port, service, and cleanup receipt. |
| `guided-setup` | Guides installation/auth/deployment/environment setup one verified current step at a time while preserving the remaining checklist. |
| `canonical-surface-audit` | Standardized execution surface for rules 26-31. Produces Canonical Surface Receipt, Surface Classification Table, Schema Cross-Check Artifact, Backend Route Ownership / Shadow Audit. |
| `repo-hygiene-scan` | Standardized execution surface for rules 32-39. Produces the Phase 1 non-destructive inventory doc. Never moves, renames, or deletes files. |
| `swan-design-router` | Only default-exposed design brain. Loads `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md`. Enforces styled-components-first, Crystalline Swan palette, Dual-Button Glow rule, 2-3 concept-direction ideation gate for net-new surfaces. |
| `closeout-evidence-lock` | End-of-task closeout gate. Enforces Claim-to-Evidence Lock (rule 28) + dual-pass hostile review (rule 17) + post-task hygiene check (rule 38) + forbidden-language filter (rule 34). Preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) from retired `requesting-code-review`. |
| `swan-oracle` | Advisory GPT Pro / GPT-5.5-class review packet builder. Used for deep product, UX/UI, architecture, and progress-gap review. Oracle output must be classified as `ADOPT`, `REJECT`, `DEFER`, or `NEEDS PROBE` before implementation. |

---

## KEEP core skills

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

## Quarantined skills — explicit-invocation-only

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

## Inventory truth

Do not maintain exact totals in prose. Enumerate and validate both repo-local roots from the filesystem:

```powershell
node scripts/ai-workflow/validate-skill-registry.mjs
node scripts/ai-workflow/validate-skill-registry.mjs --json
node --test scripts/ai-workflow/validate-skill-registry.test.mjs
```

The validator checks exact `SKILL.md` casing and required frontmatter, and reports runtime-specific and shared adapters. Counts may change as installed skill packs evolve; the command output is authoritative for the current checkout.

---

## Maintenance commands

`node scripts/ai-workflow/validate-skill-registry.mjs` | `npx skills check` | `npx skills update` | `npx skills find <keyword>`

Full Swan layer documentation:
- `docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md` (task mode and third-party skill intake)
- `CLAUDE.md` rules 26-41 (mandatory discipline)
- `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md` (rules 32-39 workflow)
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` (visual source of truth, loaded by `swan-design-router`)
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` (asset + Seedance templates, loaded by `swan-design-router`)
- `docs/ai-workflow/references/SWAN-ORACLE-GPT-PRO.md` (GPT Pro / GPT-5.5-class Oracle packets and response classification)
- `ACTIVE-INDEX.md` at repo root (one-page surface/archive map)
