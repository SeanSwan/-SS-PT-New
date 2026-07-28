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
5. `external-reference-mcp.md` — only for net-new pages, major redesigns, design-reference requests, or Mobbin/Mobbin-like connector use; mark `[MOBBIN UNAVAILABLE]` when the connector is not callable
6. `mobbin-learning-system.md` — required when external research will be retained, compared across runs, or proposed for Design Brain promotion
7. `swan-element-intelligence.md` — required when comparing external ideas with Swan existing mounted, fragmented, experimental, or unmounted capabilities
8. The relevant subfile (`design.md` always; then `motion.md` / `components.md` / `anti-patterns.md` / `qa-gates.md` / `cinematic-pages.md` / `website-archetypes.md` / an adapter as the task requires)
9. The **mounted-surface receipt** for the surface you're touching (rule 26 — no UI fix without proving the live route tree)

## 3. Enforcement contract

Every agent that builds or reviews UI agrees to this:

1. **`design.md` is canonical.** `design.html` mirrors it visually for humans. **If they disagree, `design.md` wins** — and whoever notices updates both together in the same pass.
2. **Before any frontend work, read `design.md`.** Not from memory — from disk. Tokens drift; memory drifts faster.
3. **Reuse documented tokens and components.** If a token or pattern you need exists in `design.md`/`components.md`, use it. Do not fork a near-duplicate.
4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
5. **Verify responsive + accessibility** against `qa-gates.md` Gates 1–2 before claiming done.
6. **Run visual QA** (`qa-gates.md` Gate 3 hostile critique) before claiming done, and produce the QA receipt it defines.

## 4. What this folder does NOT override

- **App security, auth, and role scoping.** Design never justifies a data flow. The T0–T4 command tiers and approval gates in `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` govern what a surface may *do*; this folder only governs how it *looks and behaves visually*.
- **Production stability.** No design refactor ships that risks the live app; rules 42/46 and the QA pipeline still gate.
- **The two source-of-truth docs.** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (visual system) and `SWAN-ASSET-STORYBOARDING.md` (asset direction) outrank everything here.
- **Real data truth.** The Design Brain never authorizes fake or decorative metrics (Product Core Loop data-truth rule; `anti-patterns.md`).
- **External references.** Mobbin/Mobbin-like references are research inputs only; they never override Swan source docs, auth/data rules, tokens, or anti-clone rules (`external-reference-mcp.md`). Retained learning must pass `mobbin-learning-system.md`; only human-adjudicated principles may reach canon.
- **The router.** `swan-design-router` (rule 40) remains the default design entry point; this folder is what it (and Fable/Hermes flows) load, not a bypass around it.

## 5. Where next

See `index.md` for the full folder map, including adapters (per-agent usage guides), the Obsidian/Graphify knowledge bridges, and the cinematic/archetype generators.
