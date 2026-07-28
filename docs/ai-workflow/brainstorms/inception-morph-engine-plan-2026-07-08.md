# The Inception Canvas / Lens Foundry — Build-Out Plan for Village Ratification

> **Purpose of this document:** This is a work-in-progress product + technical plan that got as far
> as a proven design-corpus foundation before a build session ran out of tokens. The AI Village's job
> is to **FINISH THIS PLAN**: resolve the open decisions, pressure-test the morph-engine feasibility,
> sequence the build into shippable slices, flag the fatal risks, and hand back a build-ready plan
> that a coding agent (Fable/Opus) can execute as "a straight diamond" with minimal rework.
> **Fable is the Final Decider on the synthesis** (fallback Opus 4.8 → Codex per the CLAUDE.md chain).

---

## 1. The Vision (what we are building)

An **AI Operating System shell** — a single web canvas that morphs, Inception-style, into completely
different applications without a reload. The thesis: static apps are dying; the future is intent-driven
**Generative UI** where an AI agent (Hermes today, any harness tomorrow) constructs the interface
around the user's need in the moment. The morph is not decoration — it is the act of one context
folding into another (public↔admin, chat↔app, macro↔micro).

**Positioning in the agentic web (validated against a market signal, 2026-07-07):** Google is shipping
A2A (agent-to-agent protocol), Gemini Spark (personal agents), and "knowledge catalogs" (verified
business datasets replacing websites). A2A moves *data* between agents; **nobody owns the surface where
a human sees, compares, and approves the result.** The Inception Canvas is that surface — the render +
approval layer of the agentic web.

## 2. Business architecture (compartmentalized so the core is never accidentally sold)

- **The Engine (KEEP FOREVER):** Component Registry + AI Harness (protocol adapter) + Inception Router
  (morph/state engine) + Trust Layer (effect tiers + audit). Never sold as source.
- **Lenses (SELL):** industry configurations over the Engine (Law Firm Lens, Consumer Lens, SwanStudios
  Lens). Sold as SaaS or license.
- **Marketplace (COMPOUND):** third parties (and users, via "save this as an app") author Lenses on the
  Engine; platform takes a cut. This is the multi-billion-dollar path; no single Lens sale touches the Engine.

## 3. What is ALREADY BUILT and PROVEN (do not re-litigate)

- **Project home:** `lens-foundry/` (separate from the SwanStudios repo — this is a net-new product).
- **The Morph Contract (`SPEC.md`):** the load-bearing invention. Every landing page — however visually
  unrelated — shares ONE invisible skeleton: identical 7-section semantic structure with `data-morph`
  anchors (header/hero/showcase/story/gallery/cta/footer + inner anchors like `hero-title`, `card`,
  `stat`), an identical 12-col ultra-fine grid, and a mandatory 9-token CSS custom-property system
  (`--bg-base`, `--accent-1..3`, `--font-display`, etc.). **Sites look 100% unrelated but are
  structurally isomorphic → any site can morph into any other by interpolating tokens + tweening
  matched anchors.** The design sprint IS the Engine's training corpus in disguise.
- **Corpus target:** 50 award-caliber single-file landing pages across 5 theme families (Nature 16,
  Magic/Game-cinematic 10, Luxury Materials 9, Neon/Futurist 8, Health/Fitness 7). Self-contained HTML,
  no external assets except Google Fonts, responsive 320px→4K, WCAG 4.5:1, reduced-motion safe.
- **Built & verified so far:** 1/50 — `17-night-city.html` (cyberpunk, RGB-glitch hero, 46.6KB, passed
  a hostile self-critique that caught 5 real bugs). Proves the contract + quality bar are achievable by
  parallel agents. (4 sibling builds died on a Fable subscription token limit — an ops event, not a
  design failure.)

## 4. The Morph Engine — proposed technical architecture (VILLAGE: pressure-test this)

- **Voice/intent → API orchestration → state document → render.** Spoken words route to which APIs fire;
  the API results + intent produce a **state document (JSON)**; the Canvas renders that state by
  assembling registry components onto the shared grid.
- **Rendering stack (proposed, confirm):** React + Framer Motion (shared-layout `layoutId` morphs) +
  the View Transitions API for cross-DOM interpolation. Morph budget **600–900ms**, spring/expo easing,
  4K-crisp throughout ("patience is slow — it must feel natural and fast").
- **The Generation Ladder (how "the app builds itself" without chaos):** (a) *Assemble* registry blocks
  deterministically (90% of requests), (b) *Compose* novel layouts from existing blocks, (c) *Generate*
  new components in a sandbox, promoted into the registry only after review.
- **Lens = "generate once, replay forever, regenerate on demand":** first generation is AI-built, then
  snapshotted to a named deterministic JSON Lens document that loads instantly thereafter. Kills
  generative-UI flakiness; makes the Lens the sellable/versionable unit; app still works when the AI is down.
- **Morph Grammar (motion as language):** zoom = deeper, flip = role/perspective change, fold = put away,
  crystallize = become a different app. Consistent, learnable, and a design asset competitors can't clone.
- **The Totem:** one persistent anchor element (command bar/orb) survives every morph — spatial
  continuity so users don't get lost, plus brand story.
- **URLs survive the morph:** each saved Lens state is addressable (`/lens/<name>`); back-button rewinds.
- **Open-protocol harness:** render from an MCP-UI / AG-UI-compatible payload so ANY agent drives it and
  the existing MCP-server ecosystem becomes the integration library for free. (VILLAGE: verify current
  spec maturity of MCP-UI / MCP Apps / AG-UI before committing.)
- **Trust Layer (port Hermes T0–T4):** every generated component carries an effect tier; reads render
  freely; T3/T4 actions (send/file/pay) render as approval-gated controls with audit receipts. This is
  the enterprise/compliance moat, especially for legal.

## 5. OPEN DECISIONS the Village must resolve to finish the plan

1. **V1 lane:** (a) law-firm-shaped demo hybrid (tech demo == sales demo, warm first customer),
   (b) consumer one-app canvas, (c) SwanStudios as Lens #1, (d) pure two-state tech demo. Recommend a
   pick + justification.
2. **Business model:** "agency wedge funds the Engine" (sell agent-ready packages now — knowledge
   catalog + content + booking + a v1 Lens — law firm first) vs pure product from day one. Trade-offs?
3. **Rendering-stack commitment:** React+Framer+View-Transitions vs a more novel/custom morph engine.
   Feasibility of 600–900ms 4K-crisp morphs of 30–60 DOM nodes on mid-range hardware — real or fantasy?
4. **State model:** who owns the schema of the "state document" / Lens JSON? Versioning, migration,
   determinism guarantees.
5. **The Data Spine:** local-first + encrypted personal graph vs cloud. Privacy, ownership, sync.
6. **Corpus completion strategy:** finish all 50 sites now (mass parallel build) vs build 10 diverse
   ones + start the Engine. What's the minimum corpus that proves cross-theme morphing?
7. **Moat honesty:** the morph animation is copyable public tech (View Transitions API). What are the
   *actually* defensible assets, ranked? (registry quality, protocol+trust layer, Lens marketplace,
   first customers, data spine ownership.)
8. **Biggest single risk that kills this** — name it, and the cheapest experiment to de-risk it.

## 6. What "finished plan" must contain (Village deliverable spec)

- A ratified V1 scope + the ONE slice to build first (smallest thing that proves the core).
- A sequenced slice list (each shippable, each with a success criterion), Karpathy-style "straight diamond."
- The defensibility ranking + the single de-risking experiment to run before heavy investment.
- A go/no-go on the rendering stack with a feasibility verdict on the morph performance budget.
- The business-model call (wedge vs pure product) with the reasoning.
- Fatal-risk list with mitigations.
- Fable's Final-Decider synthesis: consensus / contradictions / unique insights / blind spots / fused recommendation.
