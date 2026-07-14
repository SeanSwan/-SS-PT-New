# Knowledge Adapter — Design Knowledge → Obsidian & Graphify

- **Date:** 2026-07-12 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL as the pointer; real policy lives in `../obsidian/` and `../graphify/`
- **Merged file** (see `index.md` §3): the obsidian + graphify adapters collapsed into this thin router — both were pointers, and pointers don't deserve two files.

---

## 1. What flows where

Design work throws off durable knowledge: decision logs, concept directions, arbitration overrides, QA findings that reveal doctrine gaps. That knowledge enters one of two governed systems, with the low-trust lane chosen before promotion:

| Artifact | First lands in | Promoted to | Policy doc |
|---|---|---|---|
| Design decision log entries | vault `outputs/design-decisions/` | `wiki/` when reusable across surfaces | `../obsidian/design-decision-log-policy.md` |
| Concept direction docs (Fable §2 gate output) | vault `outputs/` (deliverable) | `wiki/` only if the direction becomes standing doctrine | `../obsidian/vault-routing.md` |
| Arbitration overrides (doctrine vs Gemini/Village) | decision log (above) | same path | `../obsidian/design-decision-log-policy.md` |
| QA receipts / run artifacts | vault `runs/` | rarely promoted; summarized into decisions instead | `../obsidian/vault-routing.md` |
| Design concepts as **graph nodes** | `graph-imports/` (quarantine) | `wiki/` **only after** the promotion checklist | `../graphify/graphify-policy.md` |

## 2. The two hard rules this adapter enforces

1. **Outputs first, wiki by promotion.** Nothing an agent produces lands directly in `wiki/` — deliverables go to `outputs/`, run logs to `runs/`, and only demonstrated-reusable knowledge is promoted, with provenance frontmatter. Direct-to-wiki writes are pollution (see anti-pollution rules in `../obsidian/vault-routing.md`).
2. **Graph output is quarantined, not trusted.** Graphify may create bounded nodes/stubs only in standalone output followed by `graph-imports/` quarantine. A node becomes citable knowledge only after the per-concept promotion checklist. No bulk ingest; flat lookups stay search jobs.

## 3. What this adapter is NOT

- Not the routing policy (→ `../obsidian/vault-routing.md`)
- Not the decision-log format (→ `../obsidian/design-decision-log-policy.md`)
- Not the quarantine/promotion mechanics (→ `../graphify/graphify-policy.md`, templates in `../graphify/templates.md`)
- Not a license to write PII anywhere: IDs/roles only, zero client names, zero secrets (rule 8) — in vault, logs, and graph alike.

## 4. Verification before done (any agent writing design knowledge)

- [ ] Artifact routed per the §1 table — nothing written directly into `wiki/`
- [ ] Decision-worthy outcomes (direction picked, override made, doctrine gap found) actually logged, not just mentioned in chat
- [ ] Provenance + date frontmatter present on anything ingested or promoted
- [ ] Zero PII / secrets in the written artifact
- [ ] Graph writes (if any) went to `graph-imports/` quarantine, never straight to promoted namespaces

## 5. World Engine entities, edges, and quarantine

**Vault identity:** "Karpathy Wiki" means the Hermes desktop vault. This repo carries contracts and read-only reference mirrors; it is not the vault. The World Engine adds a versioned graph vocabulary without changing the quarantine-first policies above.

### 5.1 Lane routing - references, outputs, runs, quarantine

| World Engine artifact | Required first lane | Promotion rule |
|---|---|---|
| `worlds.md`, `techniques.md`, `psychology.md`, `experience-mode.md`, and this adapter | `references/` mirror/link; repo path + content hash; repo wins | Never copied into `wiki/` as a shortcut and never rewritten from graph output. |
| WorldRecipe direction docs and design decisions | `outputs/` | Point-in-time output is not doctrine. A reusable finding needs a separate human-reviewed promotion. |
| WorldRun manifests, hashes, browser evidence, reviewer verdicts, `psy-receipt/v1`, and `psy-experiment/v1` | `runs/` | Append/supersede corrections; summarize into decisions rather than treating a PASS run as doctrine. |
| Graph export, import record, and one source-wired stub per kept entity | standalone output -> `graph-imports/YYYY-MM-DD-world-engine-run-slug/` | Everything stays `quarantined` and uncitable until per-entity review under `../graphify/graphify-policy.md`. |
| Promoted reusable concept | `wiki/` only after promotion | Sean or a delegated Fable promotion pass reviews one entity; the note cites repo/runs as evidence, not the graph; stub and note state update together. |

**No direct wiki writes.** No router, factory, Graphify run, builder, reviewer, or Hermes panel may write World Engine content straight into `wiki/`. Canonical Hermes panels omit quarantine or render it with an explicit QUARANTINE badge; the command-center bridge remains read-only.

### 5.2 Stable schema - `world-engine-graph/v1`

The graph is justified only for bounded chain questions such as "which licensed recipes use an effect that tests a falsified hypothesis?" Flat catalog retrieval stays a file/search job. Every export records `schema_version`, source-doc paths + hashes, catalog version, run ID, created-by, created-at, review-by, and quarantine status. Stable IDs survive prose edits; a semantic identity change creates a new ID and explicit supersession record.

| Entity | Stable ID shape | Minimum source-backed fields | Hard rule |
|---|---|---|---|
| `World` | `world.` + family key + `.` + world slug; example: `world.natural-sublime.glacier-cathedral` | immutable name, Family ID, retrieval aliases, mood, palette law, licensed-surface IDs, source path/heading, catalog version | One node per catalog world; a generated page never becomes a new World. |
| `Family` | `family.` + family slug; example: `family.natural-sublime` | canonical family name, roster IDs, source path/heading, catalog version | `WorldFamily` is an accepted import alias but normalizes to `Family`; it never creates a parallel node. |
| `WorldEffect` | `effect.` + lowercase WFX ID; example: `effect.wfx-01` | WFX ID/name, maturity, dependency status, backend rungs, Full/Lean/Still fallback, source path/heading, technique version | No inferred capability. Missing dependency or maturity data blocks import. |
| `PsychologyHypothesis` | `psy.` + PSY ID; example: `psy.PSY-01` | `[HYPOTHESIS]` label, researcher/sources, evidence strength/caveat, context, Swan anchor, KPI, counter-metric, falsifier, stop, review-by | Never type as `PsychologyPrinciple`, `Fact`, or `ConversionClaim`; support/falsification is contextual. |
| `SurfaceLicense` | `license.` + surface class + `.` + ceiling; example: `license.swan-marketing.m3` | surface class, allowed motion tiers, palette law, approval owner, never-relax rules, source path/heading, license version | Derived only from `experience-mode.md`; observed use cannot expand a license. |
| `WorldRecipe` | `recipe.` + World ID + version + 8-character content hash; example: `recipe.world.natural-sublime.glacier-cathedral.v1.a1b2c3d4` | World ID, content/audience fit, scene ledger, proof/action, WFX + PSY IDs, B0-B3 ladder, performance/asset hashes, receipt paths, verdict | Point-in-time output. PASS is not production promotion or a broader license. |
| `WorldRun` | `run.` + compact UTC timestamp + run slug + seed + 8-character manifest hash; example: `run.20260712T183045Z.five-family-proof.424242.a1b2c3d4` | purpose, seed, catalog version/hash, eligible/rejected/chosen IDs, recipe IDs, tool/browser versions, QA + reviewer verdicts, receipt paths, content hashes | Run record only; no PII, secrets, production identifiers, or truth claim beyond captured evidence. |

All entities also carry `entity_version`, `source_status` (`reference`, `output`, `run`, `quarantined`, or `promoted`), `source_docs`, and `content_hash`. Unknown fields may remain namespaced metadata; unknown entity types are rejected until the schema is versioned.

### 5.3 Named edges and direction

| Edge | Allowed source -> target | Meaning and validation |
|---|---|---|
| `BELONGS_TO_FAMILY` | `World` -> `Family` | Exactly one per World; target matches the family segment of the World ID. |
| `USES_EFFECT` | `WorldRecipe` -> `WorldEffect` | WFX ID appears in the recipe manifest and source technique entry; never inferred from visual similarity. |
| `LICENSED_FOR` | `World` or `WorldRecipe` -> `SurfaceLicense` | Cites the central license table. A recipe may narrow the World license, never broaden it. |
| `FALLS_BACK_TO` | `WorldRecipe` -> `WorldRecipe` | Higher backend/quality recipe to explicit lower-rung semantic equivalent; chain terminates at a B0-complete recipe and never cycles. |
| `TESTS_HYPOTHESIS` | `WorldRecipe` -> `PsychologyHypothesis` | Requires `psy-receipt/v1`; metadata records act, KPI, counter-metric, falsifier, stop, and contextual status. It never means "proves." |
| `GENERATED_IN_RUN` | `WorldRecipe` -> `WorldRun` | Exactly one origin run per immutable recipe version; later QA/review remains receipt metadata rather than rewriting origin. |

Only these six relationship names are canonical in v1. Inferred relationships remain stub prose tagged `INFERRED` and `[HYPOTHESIS]`; they do not mint edge synonyms. Every endpoint must exist, cite source evidence, and pass type/direction validation before quarantine import.

### 5.4 Automatic quarantine rejection

Reject the import for missing source paths/hashes, unstable or duplicate IDs, unknown entity/edge types, dangling endpoints, cyclic fallbacks, a psychology fact/conversion claim, a license inferred from observed output, PII/secrets, or a recipe/run presented as production truth. Defining this schema does not authorize Graphify installation, a vault scan, a factory run, or any direct Hermes write.

### 5.5 World Engine verification

- [ ] Export declares `world-engine-graph/v1`; stable IDs/types and all six edge directions validate.
- [ ] Every `FALLS_BACK_TO` chain is acyclic and terminates at a B0-complete recipe.
- [ ] `PsychologyHypothesis` nodes remain `[HYPOTHESIS]`; `SurfaceLicense` nodes trace only to `experience-mode.md`.
- [ ] `WorldRecipe` and `WorldRun` remain point-in-time evidence, never production promotion.
- [ ] `references/`, `outputs/`, `runs/`, and `graph-imports/` remain distinct; no automated or direct `wiki/` write occurred.
