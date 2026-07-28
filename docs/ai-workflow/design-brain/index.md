# Design Brain — Folder Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Law of this file:** every file in `docs/ai-workflow/design-brain/` is listed here with what belongs in it, what doesn't, and its standing (canonical / temporary / quarantined). If you add a file, add its row in the same pass.

---

## What belongs in this folder

Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown (plus the single `design.html` visual mirror). Everything here ADAPTS the two source-of-truth docs — it never contradicts them.

## What does NOT belong here

Production code; component implementations; screenshots/QA dumps (those go to QA artifact locations per rule 35); secrets/PII; per-task receipts (those live in the task thread / AI-HANDOFF); anything that would fork the token system away from `SWAN-CINEMATIC-DESIGN-SYSTEM.md`.

## Folder map

### Core (this build pass — CANONICAL)

| File | Purpose |
|---|---|
| `README.md` | What the Design Brain is, load order, enforcement contract, what it does not override |
| `index.md` | This map |
| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. `design.html` mirrors it; `design.md` wins conflicts |
| `design.html` | Static, no-dev-server visual mirror of `design.md` for humans (built by a parallel agent; update together with `design.md`) |
| `motion.md` | Motion tiers, GPU-safe rules, reduced-motion gating (CSS + JS), duration/easing tokens, motion bans, signature-moment budget |
| `components.md` | Component pattern index — purpose / anatomy / states / do–don't / C1–C12 mapping for every canonical pattern |
| `anti-patterns.md` | The banned list with WHY per item |
| `qa-gates.md` | Consolidated responsive + accessibility + visual QA gates with self-applicable pass/fail checks and the QA receipt format |
| `external-reference-mcp.md` | Default Mobbin/Mobbin-like real-product UI reference gate for major UI directions and reference-backed redesigns; principles-only intake, never a source-of-truth override |
| `mobbin-learning-system.md` | Governed recursive-learning doctrine: evidence/2, identity, inspection, K1-K5 dedupe, budgets, audit, human-only adjudication/canon, and cold-mode exit criteria |
| `swan-element-intelligence.md` | Proven-current Swan capability baseline, crawler/browser/source evidence separation, Mobbin gap comparison, and USE_NOW/TRIAL/WATCH/REJECT notification loop |

### Page generators (parallel agents — CANONICAL when landed)

| File | Purpose |
|---|---|
| `cinematic-pages.md` | How to generate story-arc marketing/cinematic pages (B2.1 acts, C1–C12 sequencing, Seedance briefs) |
| `website-archetypes.md` | Archetype recipes: landing page, SaaS app, dashboard, client portal, portfolio, e-commerce, community/course page, internal operator tool |

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
| `obsidian/vault-routing.md` | Where design notes land in the vault (raw/wiki/outputs/runs lanes) |
| `obsidian/design-decision-log-policy.md` | What design decisions get logged, format, retention |

### `graphify/` — relationship-graph bridge (parallel agents)

| File | Purpose |
|---|---|
| `graphify/index.md` | Bridge map |
| `graphify/graphify-policy.md` | Import quarantine (`graph-imports/` until promoted), what design entities enter the graph |
| `graphify/templates.md` | Node/edge templates for design entities (surface, token, pattern, decision) |

## Standing key

- **CANONICAL** — obeyed by all agents; changes require a paired check against `SWAN-CINEMATIC-DESIGN-SYSTEM.md`.
- **TEMPORARY** — none currently. Anything landed as a draft must carry `Status: DRAFT` in its header and a row here.
- **QUARANTINED** — none in this folder. Quarantined *skills* (LILA-BAN-class aesthetic skills, `requesting-code-review`) live at `archive/quarantined-skills/2026-04-12/` and are never loaded by the Design Brain.

## Where next

Task is UI-shaped → `design.md`, then the subfile matching your task, then your adapter. Task is "does this look right" → `qa-gates.md`. Task is net-new page → `website-archetypes.md` / `cinematic-pages.md` after the rule-64 grill and rule-26 receipt.
