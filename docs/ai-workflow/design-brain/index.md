# Design Brain — Folder Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Law of this file:** every file in `docs/ai-workflow/design-brain/` is listed here with what belongs in it, what doesn't, and its standing (canonical / temporary / quarantined). If you add a file, add its row in the same pass.

---

## What belongs in this folder

Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown only. Everything here ADAPTS the two source-of-truth docs — it never contradicts them.

## What does NOT belong here

Production code; component implementations; screenshots/QA dumps (those go to QA artifact locations per rule 35); secrets/PII; per-task receipts (those live in the task thread / AI-HANDOFF); anything that would fork the token system away from `SWAN-CINEMATIC-DESIGN-SYSTEM.md`.

## Folder map

### Core (this build pass — CANONICAL)

| File | Purpose |
|---|---|
| `README.md` | What the Design Brain is, load order, enforcement contract, what it does not override |
| `index.md` | This map |
| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. **Sole canonical copy** — the former `design.html` mirror was retired 2026-08-16, so there is no second file to reconcile. (This does **not** elevate it above `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; the brain still ADAPTS the two source-of-truth docs.) |
| `motion.md` | Motion tiers, GPU-safe rules, reduced-motion gating (CSS + JS), duration/easing tokens, motion bans, signature-moment budget |
| `components.md` | Component pattern index — purpose / anatomy / states / do–don't / C1–C12 mapping for every canonical pattern |
| `anti-patterns.md` | The banned list with WHY per item |
| `qa-gates.md` | Consolidated responsive + accessibility + visual QA gates with self-applicable pass/fail checks and the QA receipt format |
| `external-reference-mcp.md` | Mobbin/Mobbin-like shipped-product reference gate; principles-only intake, never a source-of-truth override |
| `worlds.md` | World Engine catalog: 18 immutable World DNA recipes, family manifest, palette laws, suitability-filtered seeded roulette |
| `techniques.md` | WFX-01–WFX-13 visual-effect contracts, render ladder, maturity/dependency truth, performance/recovery/fallback law |
| `psychology.md` | PSY-01–PSY-10 ethical `[HYPOTHESIS]` contracts, evidence posture, psychology + experiment receipts |
| `experience-mode.md` | M4 license, inheritance, product/Hermes firewall, gate ritual, adaptive-quality and backend-loss rules |
| `typography-grid.md` | Type scale, grid/breakpoint substrate, elevation + radius contract. **Where it states a token value that `design.md` also states, `design.md` wins** — see the conflict law in `README.md` §3 |
| `style-taxonomy.md` | Two-axis style model (aesthetic × era) and its Swan mapping. Captured third-party facet counts drift and are reference-only, never doctrine |
| `field-techniques.md` | Field-tested effect techniques and the CONVERGENCE note on producing hero creative (image-first loop, interpolation, reference ladder) |
| `forge-compiler-contract.md` | Swan Forge prompt-compiler contract — the 12-slot composer, capability gating, provider-safety classification |

### Callable World Engine skill (manual-only)

| Skill | Purpose |
|---|---|
| `.claude/skills/swan-world-factory/SKILL.md` | Registered T1→T2 thin batch orchestrator over `adapters/cinematic-site-generator.md`; Sean-initiated ignored experiments only, never production promotion |

### Page generators (parallel agents — CANONICAL when landed)

| File | Purpose |
|---|---|
| `cinematic-pages.md` | How to generate story-arc marketing/cinematic pages (B2.1 acts, C1–C12 sequencing, Seedance briefs) |
| `website-archetypes.md` | Archetype recipes: landing page, SaaS app, dashboard, client portal, portfolio, e-commerce, community/course page, internal operator tool |
| `archetypes/` (generated) | A7 recall layer: `archetypes/index.json` routing table (~4KB) + 21 per-archetype splits, GENERATED from `website-archetypes.md` by `npm run brain:archetypes`. Agents read the table, load <=3 splits; hand-edits go to the monolith only, then regenerate. Freshness: `npm run brain:archetypes:check` |

### `adapters/` — per-agent + per-surface usage guides (parallel agents)

| File | Purpose |
|---|---|
| `adapters/index.md` | Adapter map + which agent reads which |
| `adapters/builders.md` | Builder-agent adapter. **Consolidation note: the separately-spec'd claude-code + codex adapters are merged into this one file** — both builders follow identical rules (styled-components-first, rule 43 `css``` helper, lane claims per rule 67) |
| `adapters/fable.md` | Fable as design-synthesis + final-arbitration brain (per 030 spec: directions and hostile review, not unsupervised implementation) |
| `adapters/hermes.md` | Hermes operator surfaces — Crystalline Cyberforest mode scope, T0–T4 tier badges, calm-motion mandate |
| `adapters/reviewers.md` | Hostile-review adapter (Codex/Gemini/triangle) — what to attack, verdict format |
| `adapters/product-surfaces.md` | Mapping doctrine → the four dashboards, storefront, Coach Command Center, onboarding |
| `adapters/cinematic-site-generator.md` | End-to-end generator flow for net-new cinematic sites |
| `adapters/knowledge.md` | How design decisions flow into the knowledge layer (Obsidian/Graphify) |

### `obsidian/` — knowledge-vault bridge (parallel agents)

| File | Purpose |
|---|---|
| `obsidian/index.md` | Bridge map |

> **ATTICKED 2026-07 (`4d192e5ac`).** `vault-routing.md` and `design-decision-log-policy.md` moved to `docs/_attic/2026-07-wiki-mythos/obsidian/` with the rest of the wiki-mythos material. They are historical reference, not loadable doctrine. This index kept listing them for weeks after the move — the rot `scripts/design-brain/check-brain-links.mjs` now catches (D3).

### `graphify/` — relationship-graph bridge (parallel agents)

| File | Purpose |
|---|---|
| `graphify/index.md` | Bridge map |

> **ATTICKED 2026-07 (`4d192e5ac`).** `graphify-policy.md` and `templates.md` moved to `docs/_attic/2026-07-wiki-mythos/graphify/`. Historical reference only. Graphify itself is not installed (see the Swan Brain architecture decision record); nothing here is a live tool contract.

## Standing key

- **CANONICAL** — obeyed by all agents; changes require a paired check against `SWAN-CINEMATIC-DESIGN-SYSTEM.md`.
- **TEMPORARY** — none currently. Anything landed as a draft must carry `Status: DRAFT` in its header and a row here.
- **QUARANTINED** — none in this folder. Quarantined *skills* (LILA-BAN-class aesthetic skills, `requesting-code-review`) live at `archive/quarantined-skills/2026-04-12/` and are never loaded by the Design Brain.

## Where next

Task is UI-shaped → `design.md`, then the subfile matching your task, then your adapter. Task is "does this look right" → `qa-gates.md`. Task is net-new page → `website-archetypes.md` / `cinematic-pages.md` after the rule-64 grill and rule-26 receipt.
