# SwanStudios Design Brain

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Scope:** compact, callable design bundle for every agent (Fable, Claude, Codex, Hermes) that touches UI.
- **Spec origin:** `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/030-design-brain-spec.md`

---

## 1. What this is

The Design Brain is the **callable form** of the Swan visual operating system. It does not replace the design system — it ADAPTS `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` into a folder an agent can read in minutes before a UI slice, and a human can inspect visually (`design.html`).

It exists to make four brains draw the same picture: same tokens, same patterns, same bans, same QA gates — whether the surface is a landing page, a SaaS dashboard, a client portal, a cinematic brand page, or a Sean-only Hermes operator tool.

**Where the Design Brain and a source-of-truth doc would conflict, `SWAN-CINEMATIC-DESIGN-SYSTEM.md` wins and this folder must be rewritten to match.** File a fix, don't improvise.

## 2. Load order (read in this order, stop when you have what you need)

1. `CLAUDE.md` / `AGENTS.md` — operating rules (rules 1–10, 22–25, 40, 43)
2. `ACTIVE-INDEX.md` — where things live
3. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` — the two source-of-truth docs
4. `docs/ai-workflow/design-brain/README.md` — this file
5. The relevant subfile (`design.md` always; then `motion.md` / `components.md` / `anti-patterns.md` / `qa-gates.md` / `cinematic-pages.md` / `website-archetypes.md` / an adapter as the task requires)
6. The **mounted-surface receipt** for the surface you're touching (rule 26 — no UI fix without proving the live route tree)

## 3. Enforcement contract

Every agent that builds or reviews UI agrees to this:

1. **`design.md` is canonical.** `design.html` mirrors it visually for humans. **If they disagree, `design.md` wins** — and whoever notices updates both together in the same pass.
2. **Before any frontend work, read `design.md`.** Not from memory — from disk. Tokens drift; memory drifts faster.
3. **Reuse documented tokens and components.** If a token or pattern you need exists in `design.md`/`components.md`, use it. Do not fork a near-duplicate.
4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
5. **Verify responsive + accessibility** against `qa-gates.md` Gates 1–2 before claiming done.
6. **Run visual QA** (`qa-gates.md` Gate 3 hostile critique) before claiming done, and produce the QA receipt it defines.
7. **Conflict law — when two files in this folder disagree.** Precedence is **`design.md` (canon) > satellite (`motion.md`, `components.md`, `typography-grid.md`, …) > adapter**. But precedence is how you *read*, not a licence to proceed quietly: if a satellite states a token VALUE that canon also states and they differ, **STOP, do not pick one, and surface it** — the divergence is a defect in the corpus, and silently choosing means two agents ship two different products. Name the conflict in your task thread and in the QA receipt.
   - **Open conflict, as of 2026-08-16 — spacing / radius / easing / duration.** `design.md` §8/§9 and `typography-grid.md` §3/§5/§6 state different scales (e.g. canon radius `20` cards · `12` controls; `typography-grid.md` `6/10/16/24/9999`, with buttons at `10`). **Neither is mechanically enforced:** canon says arbitrary values are `swan/spacing` lint errors, but no `swan/*` rule exists in the repo — `scripts/ci/check-token-discipline.mjs` enforces raw-hex discipline only. Until Sean rules on which scale wins, treat **canon as the read-precedence default** and flag any surface where the choice would be visible. Tracked in SWA-163.

**Structural integrity of this folder is gated, not trusted.** `scripts/design-brain/check-brain-links.mjs` (`npm run brain:links`, and pre-commit on any `design-brain/` change) fails the build on a reference to a canon section that does not exist, a file missing from `index.md`, or an `index.md` row pointing at nothing. Run `npm run brain:links:titles` to audit the class it cannot judge: references that *resolve* but point at the wrong section.

## 4. What this folder does NOT override

- **App security, auth, and role scoping.** Design never justifies a data flow. The T0–T4 command tiers and approval gates in `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` govern what a surface may *do*; this folder only governs how it *looks and behaves visually*.
- **Production stability.** No design refactor ships that risks the live app; rules 42/46 and the QA pipeline still gate.
- **The two source-of-truth docs.** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (visual system) and `SWAN-ASSET-STORYBOARDING.md` (asset direction) outrank everything here.
- **Real data truth.** The Design Brain never authorizes fake or decorative metrics (Product Core Loop data-truth rule; `anti-patterns.md`).
- **The router.** `swan-design-router` (rule 40) remains the default design entry point; this folder is what it (and Fable/Hermes flows) load, not a bypass around it.

## 5. Where next

See `index.md` for the full folder map, including adapters (per-agent usage guides), the Obsidian/Graphify knowledge bridges, and the cinematic/archetype generators.
