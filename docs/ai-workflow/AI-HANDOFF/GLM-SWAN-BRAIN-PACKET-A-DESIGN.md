# GLM-5.3 HOSTILE REVIEW PACKET A - THE SWAN BRAIN (DESIGN)

- **Requested by:** Sean (owner, SwanStudios) - **Assembled by:** Claude Opus 5 - **Date:** 2026-08-15
- **Source of every quoted file:** `origin/main` (canonical). The assembling agent's working branch is 1,947 commits stale and its copy of the brain is missing 8 files - nothing from that stale tree is in this packet.
- **Companion:** Packet B covers the security / governance / egress runtime. This packet is DESIGN.

---

## Section 0 - YOUR REMIT (read before anything else)

You are **GLM-5.3**, acting as a **hostile reviewer**. You are not being asked to praise this, summarize it, or agree with it. You are being asked to find where it is **wrong, hollow, self-contradicting, unbuildable, or leaving value on the table** - and then to say concretely what would make it world-class.

Sean's literal ask: *"do a hostile review on the Swan Brain for design and security... so I can see how we can upgrade and enhance it and make it even better than what it is. Take it to the next level. What features should we be adding, what logic should be in it, what's missing in order to enhance it and make it better than what it is, based off my vision."*

The review has two halves and you must deliver both:

1. **DESTROY.** Where is this brain wrong, cargo-culted, unfalsifiable, contradictory, or theatre? Cite the file and the section. Rank by severity.
2. **BUILD.** What is **missing** that should exist? What features, what logic, what mechanisms? Rank by *value left on the table* - what does its absence cost Sean in output quality, money, or time? Be specific enough that an engineer could start Monday.

**Ground rules:**
- Cite evidence from the packet. "This feels weak" is worthless; "Section X says A, Section Y says not-A" is the product.
- **Absence-first is mandatory.** The most valuable finding is usually the thing nobody wrote down. Reserve real effort for it.
- Do not soften. Sean has explicitly asked for hostility and has a documented history of acting on harsh findings.
- If something is genuinely excellent, say so **in one line** and move on. Do not spend the review being agreeable.
- You may and should comment on **anything else you think needs looking at**, even if nobody asked - that is explicitly in scope.
- Where you are speculating rather than reading, mark it `[HYPOTHESIS]`. Do not claim a thing is absent from the *system* when it is merely absent from *this packet*.

---

## Section 1 - WHAT THE SWAN BRAIN IS, AND WHAT IT WAS FOR

**SwanStudios (SS-PT)** is a production personal-training SaaS (React 18 + TypeScript + styled-components frontend; Node/Express/Sequelize/PostgreSQL backend) run by Sean, a trainer with 26+ years of experience, building a trainer-led B2B2C operating system - not a generic fitness app.

The **Swan Brain** (a.k.a. the **Design Brain**) is a folder of markdown - `docs/ai-workflow/design-brain/` - that is the **callable form of the Swan visual operating system.** Its purpose: multiple different AI agents (Claude, Codex, Fable, Gemini, Hermes) build UI for the same product, and without a shared brain each invents its own tokens, patterns, motion, and taste. The brain exists so that **four different brains draw the same picture.**

It is consumed by **agents at task time**, not read by humans (except `design.html`, a visual mirror of `design.md`).

The **bar Sean has set**: every output must be defensible as a **$100,000 commissioned website / brand system** - Awwwards-tier, not template-tier.

The **taste-ceiling doctrine**: the highest Swan aesthetic tier is the **cinematic scroll-journey** - ABOVE conventional app-UI reference (e.g. Mobbin). For net-new "awe" surfaces (hero / landing / showcase / brand), the design router runs an 8-12-concept breadth pass taste-cut by Sean; at least one direction must open with an "Extreme Macro-Journey" hook (inside -> through -> across -> out); and the maximalist option is a Scroll-Bound Macro Journey where scroll drives a video playhead (gates: 60fps scrub + a tour mode). Conventional reference is the lane for *working* surfaces; the cinematic tier is the lane for *awe*.

### The product it serves (judge whether the brain actually serves it)

SwanStudios is **workout-progress-first**. Core loop: log the workout -> save the diary entry -> turn it into charts/progress proof -> help the user, trainer, and admin decide the next training action -> make milestones shareable with the community.

- **User dashboard:** workout logging, chart review, streak/progression feedback, community sharing - must feel addictive, low-click, visually rewarding.
- **Trainer dashboard:** fast client workout logging, reviewable history, progress charts from real logged data, low-friction plan adjustments.
- **Admin dashboard:** proof-of-value across clients - who trained, what changed, what is stale, what needs intervention.
- **Data-truth rule:** charts must come from real workout logs. Mock progress data is a gap, never a feature.

### Standing design constraints (project rules, abbreviated)

- **No Material-UI.** styled-components only, with CSS custom properties + dark-theme fallbacks.
- **44px minimum touch targets** on all interactive elements.
- **Dark-first.** Default theme `crystalline-dark`.
- **Max 300 lines per file.**
- **No hardcoded colors** - `var(--token, #fallback)` pattern only.
- **WCAG 4.5:1 contrast minimum.**
- **Victory only for charts** (no Recharts for new work).
- **Motion must respect `prefers-reduced-motion`** and stay GPU-safe.
- **Responsive audit matrix is explicit:** 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 / 2560x1440 / 3840x2160 / 3440 ultrawide.
- **Active palette - "Enchanted Apex: Crystalline Swan"** (dark-first; frozen enchanted forest + deep-ocean luxury vault): Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0` (charts only), Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Obsidian Black `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`.
- **Dual-Button Glow:** blue background -> purple glow; purple background -> cyan glow.
- **Typography:** Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming).
- A retired "Galaxy-Swan" theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) must never reappear.
- Language rule: never say "yoga" or "meditation" - use "stretching"/"flexibility".

### Where this brain sits in the agent pipeline

`grill-me` (extract Sean's intent) -> `chromie` (pressure-test the bet) -> `swan-orchestrator` (planning/receipt gate) -> **`swan-design-router` (loads THIS brain)** -> build -> `closeout-evidence-lock` (evidence gate). The brain is what the router loads; it is not a bypass around the router.

---

## Section 2 - THE BRAIN'S OWN STATEMENT OF PURPOSE (verbatim, origin/main)


### FILE: docs/ai-workflow/design-brain/README.md
```markdown
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

## 4. What this folder does NOT override

- **App security, auth, and role scoping.** Design never justifies a data flow. The T0–T4 command tiers and approval gates in `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` govern what a surface may *do*; this folder only governs how it *looks and behaves visually*.
- **Production stability.** No design refactor ships that risks the live app; rules 42/46 and the QA pipeline still gate.
- **The two source-of-truth docs.** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (visual system) and `SWAN-ASSET-STORYBOARDING.md` (asset direction) outrank everything here.
- **Real data truth.** The Design Brain never authorizes fake or decorative metrics (Product Core Loop data-truth rule; `anti-patterns.md`).
- **The router.** `swan-design-router` (rule 40) remains the default design entry point; this folder is what it (and Fable/Hermes flows) load, not a bypass around it.

## 5. Where next

See `index.md` for the full folder map, including adapters (per-agent usage guides), the Obsidian/Graphify knowledge bridges, and the cinematic/archetype generators.

```

### FILE: docs/ai-workflow/design-brain/index.md
```markdown
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
| `external-reference-mcp.md` | Mobbin/Mobbin-like shipped-product reference gate; principles-only intake, never a source-of-truth override |
| `worlds.md` | World Engine catalog: 18 immutable World DNA recipes, family manifest, palette laws, suitability-filtered seeded roulette |
| `techniques.md` | WFX-01–WFX-13 visual-effect contracts, render ladder, maturity/dependency truth, performance/recovery/fallback law |
| `psychology.md` | PSY-01–PSY-10 ethical `[HYPOTHESIS]` contracts, evidence posture, psychology + experiment receipts |
| `experience-mode.md` | M4 license, inheritance, product/Hermes firewall, gate ritual, adaptive-quality and backend-loss rules |

### Callable World Engine skill (manual-only)

| Skill | Purpose |
|---|---|
| `.claude/skills/swan-world-factory/SKILL.md` | Registered T1→T2 thin batch orchestrator over `adapters/cinematic-site-generator.md`; Sean-initiated ignored experiments only, never production promotion |

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

```

---

## Section 3 - THE FULL DESIGN DOCTRINE CORPUS (verbatim, origin/main)

Every design-doctrine file in the brain, in load order. Omitted: `design.html` (a 1,358-line visual mirror of `design.md` - `design.md` is canonical and wins all conflicts) and `design.md.pre-redo` (a superseded backup). `worlds.md` is structurally excerpted with an explicit note at its head.


### FILE: docs/ai-workflow/design-brain/design.md
```markdown
> **Crystalline Canon — adopted 2026-07-19 (Sean-confirmed)** from KIMI-DESIGN-BRAIN-ENHANCED,
> the decisive rewrite of the prior Design Brain (killed the hedged "OR" laws; added z/duration/
> density scales + a `canon:contrast` CI trigger + the SOLID/LIQUID canon lifecycle). Prior version
> preserved at `design.md.pre-redo`. This canon is the source of truth; `design.html` mirrors it and
> loses on any conflict. The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
> gate/flag scaffold, content-law-scans-comments, Gemini-is-author-not-gate, consult-kimi --effort
> medium, consumer-vs-emitter world-token boundary) live in the swan-design-router LAWs — canon +
> law are complementary. Validated by 7 shipped design-overhaul surfaces + their cross-cutting review.

# design.md — SwanStudios Design Brain (Crystalline Canon)

- **Crystal:** v2.0 · **Status:** CRYSTALLIZED — frozen; change only via §16 thaw · **Date:** 2026-07-04 · **Review pass:** Kimi K3
- **Supersedes:** Fable draft 2026-07-03. Survives: T0–T4 tiers, dual-glow concept, C11 chart environments, data-only Arctic Cyan, low-motion data cards, 44px discipline. Changes: everything vibes-based is now mechanized or deleted.
- **Mirror:** `design.html` is GENERATED from this file (`pnpm canon:build`). Hand edits are reverted by CI. One source, one truth.
- **Enforcement files:** `canon/tokens.json` · `canon/route-manifest.json` · `canon/signature-moments.json` · `canon/motion-caps.json` · `canon/copy-lexicon.json` · `stylelint-config-swan` · gates: `canon:check`, `canon:contrast`, `canon:build`.

## §1 How canon works — Crystallization

- Lifecycle: **LIQUID → CRYSTALLIZED → (thaw) → LIQUID.**
- LIQUID: proposal in `canon/liquid/`, experimental tokens namespaced `--x-*`, expires 14 days after opening. Expired LIQUID is deleted, not extended.
- CRYSTALLIZED: merged here + `tokens.css` regenerated, versioned, lint-enforced. Canon contains zero pending, proposed, placeholder, or pick-one markers. Undecided = not canon.
- Thaw: PR naming one law, the measured failure (numbers, not feelings), and the revert plan.
- Every law names its enforcement mechanism (lint / CI / generated / crystallization review). A law with no mechanism is deleted at review. Policy is hope; mechanism is law.

## §2 Taste Bible

North star: **a dark vault where light does the work.** Every surface is obsidian depth; every accent is light that entered crystal and came out changed — refracted, split, edged in gold. Nothing decorates; everything refracts.

Five tests, run at every crystallization review, screenshots attached to PR:

1. **Mute test** — motion off, the frame still reads premium. If it needs animation to feel expensive, it's cheap.
2. **Grayscale test** — desaturated, hierarchy survives on value alone. Color is emphasis, not structure.
3. **320 test** — designed at 320px first; nothing critical clips; nothing needs hover.
4. **Screenshot test** — a stranger names the one big idea in 3 seconds. If they list three, cut two.
5. **Jeweler's test** — would a jeweler ship this edge? Glow, border, facet, grain: crisp, deliberate, placed. Slop is a smeared edge.

Positive canon (what we steal from): cut crystal, black sapphire water, ice caustics, museum-vault lighting, watchmaker typography, ledger discipline. We admire restraint with one violent flourish per page — budgeted, registered (§8).

Copy taste: short declaratives; numerals over adjectives; ≤1 exclamation per view; banned lexicon in §14; drama = one Cormorant italic beat per **viewport**, never per component.

## §3 Optics, not creatures

- The swan is never drawn. No illustration, no mascot, no feather motif, no swan emoji, no AI-generated bird. The ONLY creature asset is the registered wordmark/logomark lockup, used 1:1, never re-rendered.
- Brand is expressed through optical physics: refraction, dispersion, caustics, internal reflection, facet edges, frost bloom, depth light. A surface that wants "more brand" gets better optics, never a bird.
- Imagery law: macro crystal / ice / water-caustic photography or physically rendered caustics; sapphire-grade duotone; grain per §9. Real training photography allowed in `mkt` world only, graded; no stock gym tropes (high-fives, avocados, pastel wellness).
- Iconography: geometric stroke icons, 1.5px stroke on a 24px grid, 20/24 sizes; no filled cartoons, no emoji-as-icon, no creature glyphs.
- Enforcement: asset CI scans filenames/alt/imports against the creature lexicon; violations fail the build; final call at crystallization review.

## §4 Dispersion law — rainbows are physics or they are nothing

Multi-hue rendering is legal ONLY as dispersion: one pale source, split by an edge. Four conditions, all mechanized:

1. **Spectral order.** Gradient stops must be monotonic in wavelength, either direction. Canon wavelengths (nm, approx): Wing Purple 420 · Swan Lavender 450 · Arctic Cyan 470 · Ice Wing 488 · Gilded Fern 580. Danger red is never part of a spectrum — alarm is not light-play.
2. **Refractive geometry.** Spectra live on facet edges (≤2px), caustic spots (≤24px), or one split band (≤64px tall). Never fills, never text, never conic border loops, never full-bleed washes.
3. **Intensity budget.** Total spectral coverage ≤2% of viewport, shared across all spectral elements; spectral opacity ≤0.6; caustic band ≤0.14.
4. **Reduced-motion → static.** Spectra never loop; hover-brighten is SNAP opacity only.

Crystallized consequences:

- **Legendary rarity** = faceted edge: 1.5px spectral fringe along the card's top facet, ordered violet→blue→cyan→gold, 0.5 alpha; hover → 0.8 at SNAP. The old cyan→purple→gold animated wash is BANNED (order reversal = physically illiterate light).
- **Ops aurora** = caustic band: off-canvas pale source top-left, refracted monotonic violet→blue→cyan with gold only as the terminal warm stop, ≤64px, ≤0.14 alpha, static. Old order banned.
- Enforcement: `swan/dispersion-order` maps every gradient stop to nearest canon wavelength and fails non-monotonic sequences; multi-hue gradients outside `.spectral-fringe` / `.caustic-band` are rejected. This is the rainbow lint.

## §5 Worlds & lenses — the `--world-` tie

- **World** = where a surface lives. Three worlds: `mkt` (marketing, storefront, onboarding) · `pro` (client/trainer/admin dashboards, Swan Coach, Coach Command Center) · `ops` (Hermes operator cockpit, Sean-only).
- **Lens** = how a world is viewed. Two lenses: `density` (comfort | compact | cockpit) and `motion` (full | calm). Permitted subsets: mkt = comfort · full · pro = comfort|compact · calm (+1 registered signature/route) · ops = compact|cockpit · calm (zero signatures, zero ambient loops).
- **The tie:** every route declares its world in `canon/route-manifest.json`; the shell sets `<body data-world data-lens-density data-lens-motion>`. Components NEVER set `data-world`; they may only narrow density within world allowance.
- **Consumer vs emitter boundary (proven across 7 shipped surfaces):** a design surface is a pure CONSUMER of `--world-*` — it READS them through a single `*.tokens.ts` bridge and re-skins for free when the world switches. It must NEVER emit or modify `--world-*` names, `SurfaceLensGate`, `makeLensFrame`, or `AppearanceProfile` — those belong to the World-Engine / Lane-A. (The design-overhaul money-path audit confirmed 0 violations of this boundary; the Living Worlds lanes EMIT the world tokens, the surfaces CONSUME them.)
- **Token mechanics:** components consume world-scoped semantics only — `--world-bg`, `--world-surface`, `--world-panel`, `--world-edge`, `--world-text`, `--world-wash`. Raw palette tokens are legal only inside `tokens.css` and the world layer:

```css
[data-world="mkt"], [data-world="pro"] {
  --world-bg:#0A0A0F; --world-surface:#141419; --world-panel:#1A1A24;
  --world-edge:rgba(96,192,240,.22); --world-text:#E0ECF4; --world-wash:none;
}
[data-world="ops"] {
  --world-bg:#0E2A1E; --world-surface:#123527; --world-panel:#1A4032;
  --world-edge:rgba(96,192,240,.22); --world-text:#E0ECF4; --world-wash:var(--caustic-band);
}
```

Ops keeps text/edge/glow identical — Cyberforest is a bg-layer swap, nothing more. Kill-switch panel, tier badges, receipts: unchanged law, rendered through the same semantics.
- **Leakage is a build error:** eslint bans `--world-ops-*`, `data-world="ops"`, and `ops/*.css` imports under `frontend/src/**`; route manifest is CI-checked against the bundle. The old "please don't" policy is deleted — replaced by mechanism.

## §6 Color, contrast & Dual-Button Glow — revalidated per surface

Palette (crystallized here in full — the brain knows, it does not point):

| Token | Hex | Role |
|---|---|---|
| `--midnight-sapphire` | `#002060` | Primary fills |
| `--royal-depth` | `#003080` | Elevated surfaces |
| `--ice-wing` | `#60C0F0` | Cyan glow, XP, focus |
| `--arctic-cyan` | `#50A0F0` | DATA ONLY (charts). Lint-blocked elsewhere |
| `--gilded-fern` | `#C6A84B` | Gold edges, rare-tier, deltas |
| `--frost-white` | `#E0ECF4` | Text primary |
| `--swan-lavender` | `#4070C0` | Badge fills/graphics — NOT text-bearing fills |
| `--swan-lavender-deep` | `#3560B0` | NEW — text-bearing lavender fills |
| `--wing-purple` | `#8B5CF6` | Glow/graphics/epic-tier — NOT text-bearing fills |
| `--wing-purple-deep` | `#6D3FD1` | NEW — text-bearing purple fills (Accent button) |
| `--lavender-text` / `--purple-text` / `--danger-text` | `#8FB2EE` / `#B49CFA` / `#F0938A` | NEW — small text on dark (the "pending" tints, now crystallized) |
| `--obsidian-black` `#0A0A0F` · `--carbon` `#141419` · `--graphite` `#1A1A24` | — | Ground layers |
| `--danger` | `#E5484D` | Destructive/T4 only; ≤1 red element per view unless erroring |

Contrast table (WCAG formula, ≈ computed; `canon:contrast` recomputes exactly on every token change and fails regressions):

| Pair | Ratio | Verdict |
|---|---|---|
| Frost White / Midnight Sapphire | ≈12.7:1 | any text |
| Frost White / Royal Depth | ≈10.1:1 | any text |
| Frost White / Swan Lavender Deep | ≈5.1:1 | any text |
| Frost White / Wing Purple Deep | ≈5.3:1 | any text |
| Frost White / Swan Lavender | ≈4.1:1 | **BANNED (text)** |
| Frost White / Wing Purple | ≈3.5:1 | **BANNED (text)** |
| Gilded Fern / Graphite | ≈7.4:1 | any text |
| Ice Wing / Obsidian | ≈9.7:1 | any text |
| lavender/purple/danger-text / Carbon | ≈8.5 / 7.9 / 8.0:1 | small text |
| Arctic Cyan / Carbon | ≈6.7:1 | data only |

Semantics: success = Ice Wing · info = lavender-text · warn = Gilded Fern · danger = `--danger`/`--danger-text`. Rarity: common lavender · rare gold · epic purple · legendary = §4 faceted edge.

**Dual-Button Glow — law stands** (blue bg → Wing Purple glow; purple bg → Ice Wing glow), **now surface-relative.** Focus/hover indication must clear 3:1 non-text contrast against the surface beneath. Crystallized matrix:

| Surface | Blue button (purple halo) | Purple button (cyan halo) |
|---|---|---|
| Obsidian page | alpha ≥0.60 (0.5 ≈ 2.8:1 — fail), blur 24px | alpha ≥0.55, blur 24px |
| Carbon card | ≥0.55, blur 20px | ≥0.50, blur 20px |
| Graphite modal | ≥0.55, blur 20px | ≥0.50, blur 20px |
| Ops forest-mid | halo fails at ALL alphas → 2px solid `--purple-text` stroke (≈5.0:1) | 2px solid Ice Wing stroke (≈5.6:1) |

Caps: ≤2 shadow layers, blur ≤32px, spread ≤8px, decorative glow ≤0.5 alpha. **Revalidation trigger:** any PR adding a surface token or placing a button on a surface not in this matrix MUST extend the matrix in the same PR; `canon:contrast` fails otherwise. Forced-colors: glows removed, 2px outlines. Danger button: no glow, ever — destruction is not celebrated.

## §7 Typography

Faces unchanged: Plus Jakarta Sans (headings/UI), Cormorant Garamond Italic (drama), Fira Code (data, tabular), Sora (micro-labels, gaming-surface UI). Scale unchanged (hero 64–120 · H1 40–56 · body 16–18 · micro 11–12 @0.08em). New law:

- Cormorant budget = **one italic beat per viewport**. The old per-section rule let dashboards accumulate six drama lines. Full-phase empty states may spend the beat; inline empties use Sora micro-label + one plain sentence.
- Numerals never in Cormorant. Body prose ≤72ch. Never Inter/Roboto/Arial/Helvetica as display.

## §8 Two-speed law — SNAP or DRIFT, nothing between

Everything that changes state does so at exactly one of two speeds. No third speed exists; there is no "medium."
Runtime quality ships as Full/Lean/Still; Reduced Motion is a separate accessibility override across every quality mode, never a fourth quality tier.

- **SNAP (response):** {120, 160, 200}ms, `--ease-snap: cubic-bezier(0.16,1,0.3,1)`. Hovers, presses, toggles, focus, toasts, tab switches.
- **DRIFT (narrative/ambient):** transitions {600, 720, 900}ms, `--ease-drift: cubic-bezier(0.4,0,0.2,1)`; ambient loop periods {4000, 6000, 8000}ms.
- Tokens only: `--speed-snap[-fast|-slow]`, `--speed-drift[-loop]`. Raw time values in transition/animation shorthand are a lint error (`swan/two-speed`). Transform + opacity only; layout-animating properties banned.

Mechanized caps (`canon/motion-caps.json`, CI-enforced):

- Signature moments: ≤1 per route, marked `data-signature`, registered in `canon/signature-moments.json` WITH its reduced-motion fallback. CI fails a route with 2 moments or a fallback-less registration.
- Ambient loops: ≤2 per viewport; opacity delta ≤0.15; transform delta ≤8px or 2%. Sheen duty cycle ≤25%.
- Ops world: ambient 0, signature 0, SNAP only.
- Reduced motion (CSS + JS gates): SNAP→0ms, DRIFT→static end-state, loops stopped. Not a degraded experience — the same design, still.
- The two speeds also govern process: UI changes move at SNAP (flagged, one-revert); canon moves at DRIFT (crystallization cycle, §16). Nothing ships at a third speed.

## §9 Space, elevation, z — recipes crystallized inline

- Spacing scale: 4 8 12 16 24 32 48 72 108 160 240 px. Section gaps 160–240 desktop / 72–108 mobile. Arbitrary values are lint errors.
- Radius: 20 cards · 12 controls · 999 pills · 24 modals.
- Elevation = glass + glow. Three recipes, now living IN the brain (the "quoted in source §C12" pointer is dead):
  1. **Sapphire glass:** `linear-gradient(160deg, rgba(0,48,128,.55), rgba(10,10,15,.75)); backdrop-filter: blur(14px); border: 1px solid rgba(96,192,240,.22); box-shadow: 0 8px 32px rgba(96,192,240,.10), inset 0 1px 0 rgba(224,236,244,.06);`
  2. **Luxury gold-edge:** sapphire glass + `border-color: rgba(198,168,75,.32); box-shadow: 0 8px 32px rgba(198,168,75,.08), inset 0 1px 0 rgba(198,168,75,.12);`
  3. **Obsidian:** `rgba(20,20,25,.72); backdrop-filter: blur(10px); border: 1px solid rgba(96,192,240,.14); box-shadow: 0 4px 16px rgba(0,0,0,.5);`
  No fourth recipe. New elevation need = LIQUID proposal.
- Grain: ≤1 layer per viewport, ≤5% opacity, static asset — no per-frame turbulence.
- z-scale (tokens; raw z-index banned by `swan/z-scale`): `--z-base 0 · --z-raised 10 · --z-sticky 100 · --z-overlay 200 · --z-modal 300 · --z-toast 400 · --z-max 500`. `translateZ(0)` parents carry position + z-index.

## §10 Layout & density

- Grid primary; flex for intra-component rows. Weighted columns always; `repeat(N,1fr)` N>2 warns, N=4 errors (equal 4-up is the generic-AI tell). Three z-stacks minimum on hero surfaces.
- Wide law (decisive — the OR is dead): add weighted columns up to 6 as width grows; content CAPS at 2240px centered; cards never stretch to fill 4K. Heroes may full-bleed; type caps at §7 max.
- Mobile: 320 first, verify 375/414; stack > squeeze; shelf scroll needs visible affordance; primary CTA in thumb zone; targets ≥44px with ≥8px gaps.
- Density lens reconciles 44px with the cockpit: comfort = 44px rows · compact = 36px · cockpit = 32px floor, `@media (pointer:fine)` only. Coarse pointers force ≥44px regardless of lens — mechanized in the density layer, not per-component.
- Dashboards: Phase-2 current state owns the area; role density (admin > trainer > client) is expressed through the density lens, never through ad-hoc squeezing.

## §11 Components

- **Cards:** SheenCard (sell/showcase, full recipe, hover motion) vs Data card (truth surfaces: low-motion, no pointer tracking, no loops, no hover-only controls, grouped facts never duplicated). Nesting depth ≤1: a card in a layout panel is legal; a card in a card is not. The chat stream is a stream, not a card — T1 DRAFT cards inside it are legal.
- **Buttons (GlowButton):** ≥44px, 12px radius. Primary = Midnight Sapphire → purple glow · Accent = `--wing-purple-deep` fill (600-weight label) → cyan halo · Luxury = Graphite + Gilded Fern · Ghost = transparent + electric border · Danger = `--danger`, no glow. States: hover (+1–2% scale at SNAP) / active 0.98 / focus-visible per §6 matrix / disabled 40% no glow / loading spinner + persistent label.
- **Inputs:** label above always; Graphite field, electric border; focus = ONE accent per form (law, not a pick); error = danger border + message + `aria-describedby`; destructive never adjacent to submit.
- **Tables:** Sora uppercase header 70% white; Carbon rows, cyan 8% separators, ≥48px rows; numerals Fira right-aligned; <768px collapse to stacked data cards.
- **Charts:** Victory + `chartTheme.ts` only; Arctic Cyan primary series; every chart in a C11 environment (headline, Cormorant insight line if budget allows, gold/purple delta, annotation, next-action footer); lazy + SafeChart.
- **Chat:** user right/Royal Depth, coach left/Graphite + Ice Wing edge; proposals = labeled T1 DRAFT cards with ≥44px approve/dismiss; streaming without layout shift; user-facing name is "Swan Coach," never "AI."
- **Modals/drawers:** Graphite obsidian glass, 24px radius; focus-trapped, ESC closes (not mid-T4), focus returns to trigger; T3 confirm names action+target+tier with a verb on the button; T4 = two-step arm + rollback line; never stacked.
- **Nav:** left rail (72px collapsed), Ice Wing active edge; mobile bottom tabs ≤5; breadcrumbs ≥3 levels only; progress/workout never buried below social/profile.
- **Tier badges T0–T4:** ice/lavender/gold/purple/red, text+color always, ambiguity rounds UP, chains show max; badge small text uses §6 text tokens.

## §12 States & onboarding

Every data component ships four states. Empty = Cormorant beat (if §7 budget available) + one CTA that creates a real thing; never "No data," never mock-filled. Loading = geometry-matched skeletons (static under reduced-motion). Error = plain words + retry, one danger accent. Success = inline confirmation; celebration is a SNAP beat, not a loop. Onboarding: one question per screen on mobile, persistent progress, role activation targets (trainer: first template + invite; trainee: first log + proof), next-best-action visible without scrolling.

## §13 Build law — build-exact / full-stack-real / reversible

1. **Build-exact.** Implement exactly the spec: this doc + route manifest + component contract. No speculative props, no might-need variants, no unused tokens. Dead-token/dead-code CI. Spec ambiguous? STOP — open a LIQUID proposal. Keyboard improvisation is how generic happens.
2. **Full-stack-real.** Every rendered value traces to a real endpoint or query. Mocks exist only with `data-mock` + visible DRAFT badge + linked ticket; production build FAILS on `data-mock`. Loading/error/empty are real states of the same query, never separate fake screens.
3. **Reversible.** Every change ships as a single revertable unit; risky UI behind a flag; destructive actions carry an undo path (T4 two-step arm + rollback note stands); schema-bound UI ships expand-contract; every canon thaw names its revert plan. If you can't undo it in one step, you may not ship it in one step.

## §14 Anti-generic bans — each with its mechanism (no mechanism, no ban)

| Ban | Mechanism |
|---|---|
| Galaxy-Swan hexes `#0A0A1A` `#00FFFF` `#7851A9` | stylelint hex ban |
| MUI / Tailwind imports | eslint import ban |
| Raw durations, raw z-index, arbitrary spacing | `swan/two-speed`, `swan/z-scale`, `swan/spacing` |
| Hand-written token fallbacks | `tokens.css` generated from `canon/tokens.json`; `swan/fallback-match` autofixes drifted hexes |
| Non-dispersion multi-hue; holographic foil text; rainbow conic borders | `swan/dispersion-order` (§4) |
| Arctic Cyan outside `chartTheme.ts` | token-usage lint |
| `repeat(4,1fr)`, equal-N grids, cards-in-cards | stylelint pattern + VR snapshot |
| Creature imagery, swan illustration, feather motifs, emoji-as-icon, ✨ glyphs | asset CI scan + crystallization review |
| Copy slop: "delve, unlock, elevate, seamless, journey, empower, supercharge," yoga/meditation lexicon, user-facing "AI," >1 "!" per view | copy CI grep (`canon/copy-lexicon.json`) |
| Placeholder-as-label, hover-only controls | jsx-a11y lint + VR |
| Lorem ipsum, fake metrics, dressed-up mocks | CI grep + `data-mock` build gate (§13) |
| Stacked modals, centered-everything, plastic gradient fills, glass off-recipe | crystallization review with a named reviewer — what isn't mechanized is judged, by name, on record |

## §15 Accessibility floor

4.5:1 text per §6 crystallized table (CI-recomputed) · 3:1 non-text for focus indication per §6 matrix · focus-visible everywhere, logical order, restoration on close · no hover-only controls · targets per §10 density law · reduced-motion per §8 · color never sole signal · forced-colors = outlines, no glows.

## §16 Crystallization protocol

1. Open LIQUID in `canon/liquid/`: law text, mechanism, `--x-*` tokens, 14-day expiry.
2. Mechanize enforcement BEFORE review. A law whose lint lands "later" is rejected.
3. Review: five taste tests with screenshots, `canon:contrast` recompute, dispersion check, manifest/registry diffs.
4. Merge = crystal version bump + tokens.css + mirror + fallback map regenerated — one commit, one revert.
5. Thaw requires measured failure (numbers) + revert plan. One thaw = one law.

## §17 Implementation notes

- React 18 + TS + styled-components. Any interpolated shared style fragment uses the `` css`` `` helper (mount crash is real — kept from the old rule 43).
- 300-line file cap; blueprint header beyond 100 lines. Performance tiers (full/lean/reduced) ship in the same file as the component.
- Victory + `chartTheme.ts` only; lazy + SafeChart; cursor pagination on feeds.
- `tokens.css` is generated, never hand-edited; component fallbacks come from the generated map.
- `1440px` width ≠ 1440p. QA matrix classes: 320/375/414 · 768 · 1440 · 2560×1440 · 3840×2160.

---

**Bottom line.** The old doc told people what Swan looks like. This one makes it mechanically difficult to ship anything else: the purple button passes contrast because the failing hex can no longer hold text; the rainbow is physics because the lint rejects reversed wavelengths; Cyberforest can't leak because the import doesn't resolve; motion has two speeds because no third duration compiles; and canon has no holes because "pending" is a build error. Taste is still human — but it now judges at crystallization, on record, with the five tests in front of it.

```

### FILE: docs/ai-workflow/design-brain/typography-grid.md
```markdown
# B7 — Typography, Grid & Spacing: the Swan substrate

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** CANONICAL (contract) — token module follows
- **Standing:** This is a **substrate, not a module.** Every other surface renders onto it. Two independent reviewers (Kimi K3, HY3) independently demanded it be built *before* any Forge/Create surface, on the grounds that UI built before it gets rebuilt after it.
- **Why it exists:** for a $100k bar, type scale and spatial rhythm determine perceived quality more than hero art. A generated plate over a weak grid still reads cheap.

---

## LAW 0 — This file is consumed, not read

B7 fails if it is only a doc. The acceptance test is mechanical:

> **If a builder cannot consume these values programmatically, B7 is not done.**

Every value below ships as a CSS custom property with a fallback (`var(--token, #fallback)`), per LAW 9. No raw hex, no magic numbers, outside the one token source.

---

## 1. Breakpoints — ✅ RESOLVED 2026-08-11

**Fix applied:** `frontend/src/styles/breakpoints.ts` gained an additive **`xsPlus: '414px'`** tier (+ `device.xsPlus`, `device.maxXsPlus`), sitting between `xs` (375) and `s` (430). `430` is retained — both are real device classes (XR/Plus 414, Pro Max 430).

**Why it was safe `[VERIFIED]`:** sibling sweep showed 8 files import `breakpoints.ts`, but `size.s` / `device.s` / `device.maxS` are referenced **only inside `breakpoints.ts` itself — zero external consumers.** Nothing could break. Proof: `tsc 5.9.3 --noEmit --skipLibCheck` on the edited file → **exit 0, zero diagnostics.**

**Canonical binding `[VERIFIED]` (rule 26 receipt):** `App.tsx:225` renders `<CosmicEleganceGlobalStyle deviceCapability={…} />` and `App.tsx:256` renders `<SwanStyleLensGlobalStyles />` — **JSX usage, the mount proof**. `App.tsx:88` carries the comment *"ImprovedGlobalStyle import removed because it was imported but never rendered."* Classification: **`CosmicEleganceGlobalStyle` + `SwanStyleLensGlobalStyles` = CANONICAL; `GlobalStyle`, `GlobalStyles`, `ImprovedGlobalStyle` = LEGACY (not mounted).** B7 tokens bind to the canonical pair only.

`breakpoints.ts` remains the single source for breakpoints. **B7 does not define its own** — it consumes them. Everything below is breakpoint-independent.

<details><summary>Original conflict record (kept for audit)</summary>

## 1a. Breakpoints — the three-way conflict as found

**B7 does NOT define breakpoints.** `frontend/src/styles/breakpoints.ts` already exists and is the canonical module. Writing a second set here would make B7 a fourth competing source — the exact drift disease this whole workstream exists to kill.

**What I found instead `[VERIFIED]` — three sources disagree:**

| Source | Phone tier | Full set |
|---|---|---|
| `frontend/src/styles/breakpoints.ts` (shipped, canonical) | **430** | 320 · 375 · **430** · 576 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840 |
| Creator Claude's landed matrix (`bd80bee13`) | **414** | 414 · 768 · 1024 |
| CLAUDE.md rule 24 responsive audit matrix | **414** | 320 · 375 · **414** · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3440 · 3840 |

**The conflict is real and load-bearing:** CLAUDE.md rule 24 *mandates* 414 (iPhone XR / Plus-class portrait). The shipped `breakpoints.ts` has **no 414 at all** — it jumps 375 → 430. So every surface built against `breakpoints.ts` has been silently skipping a viewport the house rules require testing.

`breakpoints.ts` also carries **3440** in neither direction consistently (rule 24 lists ultrawide 3440; `breakpoints.ts` does not).

**Resolution required before B7 ships tokens.** Options:
1. **Add 414 to `breakpoints.ts`** as a new tier, keep 430 (both are real device classes — XR/Plus at 414, Pro Max at 430). Additive, breaks nothing. **Recommended.**
2. Change 430 → 414. Breaks any component keyed to `size.s`.
3. Declare 430 close enough and amend rule 24. Requires Sean.

**Nothing in B7 consumes a breakpoint until this is resolved.** Everything below (type, spacing, grid, elevation) is breakpoint-independent and proceeds.

**Rule 20 sibling-sweep note:** `frontend/src/styles/` also contains **four** global-style modules plus `crystallineSwanTheme.ts` and eight CSS files defining custom properties. Canonical binding was `[UNKNOWN]` at the time of writing — **now resolved above via rule-26 receipt.**

</details>

---

## 2. Type scale — one ratio, no exceptions

**Ratio: 1.25 (major third).** Chosen over 1.333 because Swan runs dense data surfaces; a wider ratio starves the middle of the scale where tables, labels, and metrics live.

Base is **16px** and never smaller — 14px body is the most common "looks cheap" tell in dark UIs, where lower contrast already costs legibility.

| Token | rem | px @16 | Use |
|---|---:|---:|---|
| `--type-2xs` | 0.64 | 10.2 | Legal/attribution only. Never body. |
| `--type-xs` | 0.8 | 12.8 | Metadata, timestamps, chip labels |
| `--type-sm` | 0.9 | 14.4 | Secondary body, table cells |
| `--type-base` | 1.0 | 16 | **Body. The default.** |
| `--type-md` | 1.25 | 20 | Lead paragraph, card titles |
| `--type-lg` | 1.563 | 25 | Section headings |
| `--type-xl` | 1.953 | 31.3 | Page headings |
| `--type-2xl` | 2.441 | 39 | Hero secondary |
| `--type-3xl` | 3.052 | 48.8 | Hero primary (in-app ceiling) |
| `--type-display` | `clamp(3.05rem, 8vw, 7.45rem)` | — | **Public/marketing only.** Never in-app. |

### Families (from the active palette)
| Token | Stack | Job |
|---|---|---|
| `--font-heading` | Plus Jakarta Sans | Headings, UI titles |
| `--font-ui` | Sora | Controls, nav, gaming/XP surfaces |
| `--font-body` | Plus Jakarta Sans | Body copy |
| `--font-data` | Fira Code | **Numerals, metrics, code, IDs** |
| `--font-drama` | Cormorant Garamond Italic | **One** editorial moment per surface, max |

### Numerals — non-negotiable
```css
font-variant-numeric: tabular-nums;
```
on every metric, counter, timer, price, and table column. Proportional digits make numbers jitter as they update — the cheapest possible tell on a data product. This is already law for the Crystallize; B7 generalizes it.

### Line height + measure
| Token | Value | Applies to |
|---|---:|---|
| `--leading-tight` | 1.1 | `--type-2xl` and up |
| `--leading-snug` | 1.25 | `--type-lg` / `--type-xl` |
| `--leading-normal` | 1.5 | Body |
| `--leading-relaxed` | 1.65 | Long-form reading |
| `--measure` | 66ch | Max line length for body |
| `--measure-narrow` | 45ch | Cards, sidebars |

**Optical rule:** as size goes up, leading comes down and letter-spacing goes negative. `--tracking-display: -0.02em`. Headings set at body leading are the second-most-common amateur tell.

---

## 3. Spacing — 4px base, 8px rhythm

Base unit **4px**; the visual rhythm is **8px**. 4px exists for optical correction (icon nudges, border compensation), not for layout.

| Token | px | Use |
|---|---:|---|
| `--space-0` | 0 | — |
| `--space-1` | 4 | Optical correction only |
| `--space-2` | 8 | Tight pairs — icon↔label |
| `--space-3` | 12 | Inside controls |
| `--space-4` | 16 | **Default gap** |
| `--space-5` | 24 | Card padding |
| `--space-6` | 32 | Between groups |
| `--space-8` | 48 | Between sections |
| `--space-10` | 64 | Section breathing |
| `--space-12` | 96 | Public-surface section rhythm |
| `--space-16` | 128 | Hero padding, public only |

**Proximity law:** related elements sit at `--space-2`/`--space-3`; unrelated groups get `--space-6` or more. Uniform spacing everywhere is what makes a layout read as "engineer-built" — the exact failure LAW 11 names. Spacing must *encode* relationship.

---

## 4. Grid

**12 columns**, gutter `--space-5` (24px) desktop / `--space-4` (16px) handset, page margin `--space-5` → `--space-10` by breakpoint.

| Token | Value | Use |
|---|---|---|
| `--grid-cols` | 12 | Desktop/laptop |
| `--grid-cols-tablet` | 8 | 768 |
| `--grid-cols-handset` | 4 | 414 and below |
| `--content-max` | 1280px | Body content ceiling |
| `--content-max-prose` | 66ch | Long-form |
| `--content-max-wide` | 1600px | Dashboards/tables only |

At `--bp-wide` and `--bp-uhd` the **max-widths hold** and margins absorb the extra — content never stretches. HY3's asymmetric-12 proposal for the homepage is a valid *composition* on this grid, not a different grid.

---

## 5. Elevation & radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Chips, inputs |
| `--radius-md` | 10px | Buttons, small cards |
| `--radius-lg` | 16px | Cards, sheets |
| `--radius-xl` | 24px | Modals, feature panels |
| `--radius-full` | 9999px | Pills, avatars |

Elevation is **one system**: a border + a shadow, never shadow alone (invisible on dark) and never glass-on-glass (LAW 3).
`--elev-1` resting card · `--elev-2` hover/active · `--elev-3` modal/sheet.

---

## 6. Touch, focus, motion — where B7 meets the LAWs

- **44px minimum** on every interactive element: `--target-min: 44px`. Applies to the visual box *or* an expanded hit area — a 32px chip with 6px invisible padding passes; a 32px chip alone does not. (Creator Claude already lifted Chips 32→44px; this codifies it.)
- **Focus** is a token, not a default: `--focus-ring: 0 0 0 2px var(--focus-color, #8B5CF6)`, offset 2px. Never `outline: none` without a replacement.
- **Motion** on typographic surfaces obeys LAW 6: in-app durations 120–240ms, opacity + transform only. `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 320ms`, `--ease-standard: cubic-bezier(.2,0,0,1)`.
- **Reduced motion is a JS concern** (LAW 5 R1). Consumers read a `useReducedMotion()` hook and seed state to the settled frame; the CSS media query alone is a lie for JS-driven animation.

---

## 7. Contrast — the rule that outranks aesthetics

Every pairing meets **WCAG AA: 4.5:1** body, **3:1** large text (≥`--type-lg` bold or ≥`--type-xl`) and UI boundaries.

Dark-first hazard, stated plainly: `--text-secondary` on `--surface-elevated` is where AA dies in practice. Any secondary-text token must be contrast-checked against **every** surface it can land on, not just the base background. `colorScience.ts` already exists in-repo and does WCAG + OKLab audit — **reuse it; do not write a second checker.**

---

## 8. Acceptance criteria (B7 is done when all pass)

1. Every value above exists as a CSS custom property with a fallback; **zero raw hex or magic numbers** outside the token source.
2. A contract test asserts token *names* match the canonical Crystalline source — or the palettes fork silently (Fable's ruling #10, same failure class).
3. A contrast test runs every text token against every surface token it can pair with, via `colorScience.ts`, and fails the build on AA violation.
4. `--target-min` is consumed by at least one shipped control; not aspirational.
5. Breakpoints are byte-identical to creator Claude's landed 414/768/1024.
6. Every file under the 300-line cap.
7. A builder can construct a Forge/Create surface **without inventing a single spacing, size, or type value.** That is the real test.

---

## 9. Non-goals

Not a component library (`components.md` owns that) · not colors (`design.md` owns the palette; B7 governs *relationships*) · not motion choreography (`motion.md`) · not the world/lens token contract (LAW 8, Lane-A owns emission — B7 is a pure consumer).

```

### FILE: docs/ai-workflow/design-brain/motion.md
```markdown
# motion.md — Swan Motion Doctrine (Design Brain core)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Extends:** `design.md` §25 · **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §A (motion tools, Full/Lean/Still runtime quality, Reduced Motion override), §B (motion bans), §C1–C12 (per-pattern fallbacks). That doc wins conflicts.

---

## 1. Motion tiers

Every animation in Swan belongs to exactly one tier. If you can't name the tier, the animation has no job — cut it (source §B ban 9: "no motion for motion's sake").

| Tier | Job | Duration token | Easing token | Examples |
|---|---|---|---|---|
| **Ambient** | Set atmosphere; user did nothing | `--motion-ambient: 6000–20000ms` loops | `linear` or `ease-in-out`, seamless | hero video loop, aurora drift, skeleton shimmer, legendary-rarity gradient, grain |
| **Response** | Answer a user action within one perceptual beat | `--motion-response-fast: 120ms` (press/toggle) · `--motion-response: 200ms` (hover/focus/reveal) · `--motion-response-slow: 320ms` (modal/drawer enter) | `--ease-out-quint: cubic-bezier(0.16, 1, 0.3, 1)` enter · `--ease-in-quad: cubic-bezier(0.55, 0.085, 0.68, 0.53)` exit | button glow intensify, card lift, modal open, toast in, tab underline |
| **Narrative** | Tell the page's story as the user scrolls/progresses | `--motion-narrative: 400–900ms` per beat; scroll-scrubbed beats are position-tied, not time-tied | `--ease-out-quint` for reveals; C6 flip uses `cubic-bezier(0.16, 1, 0.3, 1)` at 700ms (source §C6) | C2 parallax, C3 sticky cross-fade, C9 count-up (2s, source §C9), C10 divider reveal |

Rules across tiers:
- Response motion never exceeds 320ms — a dashboard that makes the user wait for chrome is broken.
- Ambient loops never demand attention: ≤5% opacity for texture layers, no hard cuts, no flashing (never >3 flashes/sec — seizure threshold).
- Narrative motion fires **once** per visit (IntersectionObserver `once`), never re-triggers on every scroll pass.

**Licensed M4 pointer.** `experience-mode.md` defines an M4 Experience budget for eligible non-product/approved-marketing surfaces. It changes none of this file's M0–M3, product, calm-zone, reduced-motion, or earned-motion rules. Full/Lean/Still remain runtime quality modes; M4 still ships all three.

## 2. GPU-safe properties only

Animate **`transform` and `opacity`. Nothing else** without an explicit exception in review.

- Banned from animation: `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` (animate a pre-rendered glow layer's `opacity` instead), `filter: blur()` on large surfaces, `background-position` on big images.
- Glow-on-hover recipe: stack a pseudo-element carrying the full glow `box-shadow`, animate its `opacity 0 → 1`. Same look, compositor-only.
- `will-change: transform` only while animating; remove after. Standing `will-change` on dozens of cards eats VRAM.
- `translateZ(0)` creates stacking contexts — give the parent `position: relative; z-index` (design.md §28 / gotchas).

## 3. Reduced motion — MANDATORY dual gating

**One gate is a half-fix. Every animated component ships BOTH:**

1. **CSS gate** — `@media (prefers-reduced-motion: reduce)` inside the styled-component: kill nonessential keyframes, transitions, and scroll effects; keep the complete authored Still composition intact per source §A.
2. **JS gate** — framer-motion `useReducedMotion()` (or `<MotionConfig reducedMotion="user">` at the surface root) disabling variants, springs, `useMotionValue` count-ups, and rAF loops.

**The CSS media query does NOT govern JS-driven entrances.** Lesson of 2026-06-20: a surface shipped with the CSS query in place and framer springs still animating for reduced-motion users — CSS `@media` cannot stop what framer applies as inline styles from JS. Reviewers reject any slice that gates only one layer (see `adapters/builders.md` §"Reduced motion, both layers", `adapters/reviewers.md` §4).

- Reduced Motion means **reduced, not gutted**: content, layout, and tokens all remain through the authored Still composition (source §A). A blank hero is a failure; a static poster is the spec.
- Video/canvas under reduced motion: show the poster frame; do not autoplay.
- Count-up numbers: render the final value immediately.

## 4. Where motion is banned — calm zones

Data-dense operator and work surfaces stay **calm**: response-tier only, no ambient loops, no narrative beats, no signature moments.

- **Hermes operator surfaces (Cyberforest):** ambient banned, response ≤200ms (design.md §19 — "a cockpit, not a brand page").
- **Coach Command Center** approval queue / receipt ledger (design.md §18): response-tier only.
- **Data cards** (client/trainer/admin/biometrics/program/workout-log): no pointer tracking, no animation loops, no hover-only actions (Swan Card/Button Standard; design.md §9).
- Tables, forms mid-entry, and anything a trainer uses live in a session (low-tap flows, design.md §17): motion must never delay the next tap.

SheenCard sell/showcase surfaces are the licensed exception (design.md §9) — and even they honor §3.

## 5. Signature-moment budget

**One deliberate motion beat per page** (design.md principle 5; source §B: one memorable visual per *section*, one page-level signature). Budget rules:

- Marketing pages: the signature lands in **Act 1** (source §B2.1). Everything after earns attention with composition, not competing spectacle.
- Dashboards: Phase 1 may carry a small momentum beat (XP tick, streak pulse); Phases 2–3 stay calm; Phase 4's CTA may glow, not dance.
- If two candidate moments compete, cut the weaker one. Two signatures = zero signatures.

## 6. Loop integrity (hero video / canvas loops)

- Loops must be **seamless**: last frame flows into first — no visible cut, no luma pop. Seedance briefs must request loop closure (`SWAN-ASSET-STORYBOARDING.md`).
- Header loops 4–8s; scroll-scrubbed sequences 10–20s (source §E).
- `<video autoplay muted loop playsinline>` + poster; pause when off-viewport (IntersectionObserver) and on `document.hidden`.
- Canvas/rAF loops: cap to display refresh, stop entirely off-viewport, tear down on unmount. A hidden ticking loop is a battery bug.
- Audio is opt-in only (source §C1 audio toggle) — never autoplay sound.

## 7. Scroll-choreography restraint

- **Max 2 simultaneously animated properties per element**, and ≤3 elements animating at once in any viewport. More = noise, jank, or both.
- Parallax multiplier 0.2–0.4, ceiling 0.6 (source §C2). Hover tilt ceiling 6–10° (source §C7).
- Scroll scenes (C3 sticky panels): one viewport-height per panel, 3–5 panels max; sticky must release at the section boundary (source §C3 anti-pattern).
- Scroll listeners: `requestAnimationFrame`-tied, never raw `onScroll` work (source §A). Reveals via IntersectionObserver, threshold-based, fire-once.
- Stagger: ≤80ms between siblings, ≤5 staggered children per group. A 12-item cascade is a loading screen pretending to be design.

## 8. The "motion must be earned" test

Before shipping any animation, it must pass all four — otherwise delete it:

1. **Job:** name which it does — reveal information / cue hierarchy / transition state / reward interaction (source §B ban 9). "Looks nice" is not a job.
2. **Tier:** name its tier (§1) and stay inside that tier's duration/easing tokens.
3. **Absence check:** if removed, does the user lose understanding or feedback? If nothing is lost, it was decoration.
4. **Calm-zone check:** is this a §4 surface? Then only response-tier survives.

## 9. Implementation guardrails (styled-components)

- **Rule 43 (CLAUDE.md):** any shared animation/mixin fragment containing `${}` interpolation that composes into a styled component **MUST** be wrapped in the `` css`` `` tagged helper. A plain JS template string calls `toString()` on `keyframes` objects and crashes at mount with styled-components error #12 — build passes, types pass, prod dies (2026-04-12 `AdminOverviewPanel` incident). If a template literal interpolates a styled-components primitive, it is `` css`` ``.
- `keyframes` defined once at module scope, composed via `` css`` `` fragments — never re-declared per render.
- Framer for enter/exit/hover/layout; GSAP only for genuinely long pinned timelines; R3F only when 3D is the point (source §A). All three sit behind the §3 dual gate and ship Full/Lean/Still modes in the same surface; Reduced Motion overrides nonessential movement across all three.

## 10. Motion QA hooks

Verified per `qa-gates.md` Gate 2 (reduced-motion checks) and Gate 3 (dead/noisy-motion critique). The QA receipt must state: signature moment (or "none — calm surface"), tiers used, and dual-gate verification for BOTH CSS and JS paths.

```

### FILE: docs/ai-workflow/design-brain/components.md
```markdown
# components.md — Swan Component Pattern Index (Design Brain core)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Extends:** `design.md` §§9–22 (tokens, surfaces, tiers). **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C1–C12 — pattern recipes live there; this file maps components onto them and fixes anatomy/states/do-don't.
- Universal: every interactive element ≥44px (rule 2); `var(--token, #fallback)` only (rule 6); dark-first (rule 3); all data-bearing components ship empty/loading/error/success states (design.md §22); motion per `motion.md`.

---

## 1. GlowButton

- **Purpose:** every CTA and action trigger. Variants per design.md §10 (Primary / Accent / Luxury / Ghost / Danger).
- **Anatomy:** 44px+ height, 12px radius, label (Plus Jakarta Sans; Sora on gaming surfaces), optional leading icon, glow layer as pseudo-element (opacity-animated, `motion.md` §2).
- **Dual-Button Glow (both directions, mandatory — design.md §5):** blue bg (Midnight Sapphire/Royal Depth) → **Wing Purple** glow + focus ring; purple bg (Wing Purple) → **Ice Wing** glow + focus ring. Conflicting library advice (LILA BAN class) is rejected, not adapted.
- **States:** default / hover (glow up + 1–2% scale) / active (0.98) / focus-visible (2px glow-color ring, 2px offset) / disabled (40% opacity, no glow) / loading (inline spinner, label persists).
- **Do:** one Primary per view region; Danger gets `--danger` bg and NO glow (destruction isn't celebrated).
- **Don't:** Arctic Cyan anywhere on a button (data-only token); icon-only button without `aria-label`; two primaries side-by-side.

## 2. SheenCard vs low-motion data card (design.md §9)

- **SheenCard (sell/showcase):** C12 sapphire or luxury-gold glass + chrome edge + metallic sheen + glints + hover motion (C7 tilt allowed). For storefront/feature/ascension — anything meant to SELL. Family: C5/C6/C7.
- **Data card (client/trainer/admin/biometrics/program/workout-log):** same geometry and C12 chrome, dark-blue gradient surface, **low-motion**: no pointer tracking, no loops, no hover-only actions, no hidden controls. Compact grouped facts — never the same fact twice on one card; 44px icon buttons; wrap/stack at phone width.
- **Anatomy (both):** C12 baseline (one of the three recipes — never a fourth), 20px radius, title row, fact groups, action row.
- **Don't:** SheenCard treatment on operator/data surfaces; cards nested inside cards (`anti-patterns.md`).

## 3. Metric pill

- **Purpose:** one compact labeled fact (streak, tier, count, status) on cards/rows/headers.
- **Anatomy:** 999px radius pill; Sora uppercase 11–12px label + Fira Code value; 12% token-tint bg + matching 1px border; text+color never color alone.
- **States:** static by default; delta variant colors value Gilded Fern (positive/attention) or Wing Purple.
- **Don't:** pills as buttons unless 44px hit area and focusable; more than ~4 pills per card row before wrapping.

## 4. Stat ticker

- **Purpose:** live/rolling momentum numbers (user dashboard header, admin business health). Family: C9.
- **Anatomy:** Fira Code value (28–48px in dashboards), Sora micro-label, optional media/sparkline anchor per C9 (a bare number row is the banned AI-template KPI row — source §C9 anti-pattern).
- **States:** loading skeleton matching final width (no layout shift); count-up = narrative beat, 2s, fire-once, reduced-motion → final value instantly; error → last-known value + stale badge, never a fake number.
- **Don't:** tick continuously (ambient noise in a calm zone); present mock values as real (data-truth rule).

## 5. Chart panel (C11 — mandatory environment)

- **Purpose:** every Victory chart (rule 10 — Victory only), in every dashboard.
- **Anatomy per source §C11:** chart 60–70% width + narrative column 30–40%: headline, insight line (Cormorant italic), delta (Gilded Fern/Wing Purple), annotation on the moment that matters, next-action CTA footer. Series: **Arctic Cyan `#50A0F0`** primary; Wing Purple/Gilded Fern secondary; theme from `chartTheme.ts`.
- **States:** empty = Cormorant italic sentence explaining why + CTA (never "No data"); loading = geometry-matched skeleton; error = plain words + retry. Lazy via `React.lazy()` + SafeChart boundary.
- **Don't:** bordered box + title + chart (the banned admin template); Recharts; charts fed mock data styled as truth.

## 6. Drill-down modal

- **Purpose:** expand a chart point / row / KPI into detail without navigation.
- **Anatomy:** design.md §20 modal chrome (Graphite C12-obsidian glass, 24px radius, blurred overlay); header names the exact entity drilled into; body = C11 mini-environment or data-card facts; footer = next-action CTA.
- **States:** focus-trapped; ESC closes; **focus returns to the trigger element on close** (WCAG 2.4.3); loading skeleton inside, never a blank modal.
- **Don't:** modal-over-modal (drill again → replace content with breadcrumb back); hover-only drill affordance.

## 7. Command dock

- **Purpose:** operator command entry (Coach Command Center, Hermes surfaces).
- **Anatomy:** docked bar/panel, Graphite surface, input (§11 field spec), command list rows each carrying exactly one T0–T4 tier badge (design.md §15), keyboard-first (↑/↓/Enter, visible focus).
- **States:** idle / typing (filtered list) / armed (T3+ selection shows confirm affordance inline) / executing (row-level spinner, dock stays interactive) / result (links to receipt row, §9).
- **Don't:** execute T3/T4 straight from the dock — route through confirm (§17) or two-step arm (§18); ambient motion (calm zone, `motion.md` §4).

## 8. Coach proposal card

- **Purpose:** Swan Coach / dictation / PLAUD draft output awaiting human approval (design.md §§14, 18).
- **Anatomy:** T1 data card; **"DRAFT" badge** (Swan Lavender pill, top-left, text+color); proposed content diff-style (what will be written, for whom); approve + dismiss buttons ≥44px; provenance line (source: dictation/PLAUD/chat).
- **States:** draft / approving (button loading) / approved (morphs to receipt link) / dismissed (undo toast window) / error (why + retry).
- **Do:** writes land only through approval-gated endpoints (operator bridge §3) — the card is UI over that gate, never a bypass.
- **Don't:** auto-approve on tap-through; hide the dismiss action; render a draft without the DRAFT badge.

## 9. Approval-queue row + receipt ledger row

- **Approval-queue row (Coach Command Center / operator):** anatomy — tier badge (T0–T4 colors, design.md §15) + action summary + target entity + requester/source + age + approve/reject 44px targets; ≥48px row height; keyboard operable. States: pending / selected (detail panel opens) / processing / done. Don't: color-only tier signal; hover-revealed actions.
- **Receipt ledger row:** immutable record of an executed command. Anatomy — timestamp + actor + tier badge + action + target + outcome, values in **Fira Code** (tabular figures, right-aligned numerics per §12 tables); links to rollback note where T4. States: success / failed (single `--danger` accent) / rolled-back. Don't: editable receipts; truncating the target entity on mobile (stack, don't clip).

## 10. Navigation rail (design.md §21)

- **Anatomy:** left rail, icons + labels, collapsible to 72px icon rail; active item = Ice Wing edge + tint; 44px targets. Mobile: bottom tab bar ≤5 items, active = glow dot; Progress/workout never buried below social/profile (Product Core Loop).
- **States:** active / inactive / hover wash / focus-visible ring / collapsed (tooltip labels).
- **Don't:** hover-only flyouts as the sole path; unlabeled icon rail without accessible names.

## 11. Tab system

- **Anatomy:** Sora labels, active = Ice Wing underline/edge + Frost White (inactive 70%); 44px targets; ARIA `tablist/tab/tabpanel` with arrow-key traversal.
- **States:** active / inactive / focus-visible / disabled (rare — prefer hiding); overflow at phone width → horizontally scrollable with visible affordance, never wrapping into two cramped rows.
- **Don't:** tabs that navigate to new routes styled identically to in-page tabs; more than ~6 tabs (regroup instead).

## 12. Form field set (design.md §11)

- **Anatomy:** label above (never placeholder-as-label); field Graphite bg, electric border, Frost White text, 44px min, 12px radius; helper/error 13px below; related fields grouped on one glass panel; one primary action per form.
- **States:** default / focus (Ice Wing border + soft ring — or Wing Purple, one accent per form) / error (`--danger` border + message + `aria-describedby`) / disabled / success (inline check).
- **Don't:** destructive action adjacent to submit; error color as the only error signal; clearing user input on failed submit.

## 13. Empty state (design.md §22)

- **Anatomy:** Cormorant Garamond Italic explanation (why it's empty), one CTA to create the first real thing, optional on-brand still.
- **Don't:** bare "No data"; mock-filled chart as placeholder; multiple competing CTAs.

## 14. Skeleton / loading (design.md §22)

- **Anatomy:** skeleton blocks matching final geometry (no shift on swap); shimmer = ambient tier, reduced-motion → static blocks. Spinners only for sub-400ms or inline-button loads.
- **Don't:** full-page spinner for panel loads; skeletons that don't match the layout they resolve into.

## 15. Toast / banner

- **Toast:** transient confirmation/notice; Graphite C12-obsidian glass; semantic edge (success Ice Wing / info Swan Lavender / warn Gilded Fern / danger `--danger`); auto-dismiss 4–6s **plus** manual dismiss; response-tier enter/exit; `role="status"` (or `alert` for danger); pauses timer on hover/focus.
- **Banner:** persistent surface-level condition (stale data, kill switch armed); sticks until resolved/dismissed; never auto-dismisses a security state.
- **Don't:** toasts for errors requiring action (use inline error); stacking >3 (collapse to count); toast as the only record of a T2+ write (receipt row is the record, §9).

## 16. Confirm modal (T3)

- **Purpose:** gate external-visible actions (design.md §§15, 20).
- **Anatomy:** modal chrome per §6; names **exact action + target** ("Send reminder SMS to client #482"); Wing Purple T3 tier badge; confirm button carries the action verb — never "OK"; cancel is the safe default focus.
- **States:** open (focus-trapped) / confirming (loading) / result. Focus returns to trigger on close.
- **Don't:** generic copy ("Are you sure?"); confirm as the initially-focused element; ESC disabled (allowed to cancel — this is T3, not T4 mid-flow).

## 17. Two-step arm modal (T4)

- **Purpose:** destructive/irreversible actions (design.md §§15, 20).
- **Anatomy:** step 1 **arm** — typed target name or explicit toggle; step 2 **execute** — danger button (`--danger` bg, no glow) enabled only after arming; Danger `#E5484D` T4 badge; **rollback plan line** visible before execution.
- **States:** unarmed (execute disabled) / armed / executing / done (links receipt + rollback note) / failed. ESC allowed before execution, not mid-execution.
- **Don't:** pre-filled arm input; single-click destructive paths anywhere in Swan; hiding the rollback line to save space.

---

## C-family quick map

| C pattern | Components here |
|---|---|
| C5 shelf / C6 flip / C7 tilt | SheenCard (§2) — sell surfaces only |
| C9 media-first KPI | Stat ticker (§4) |
| C11 chart environment | Chart panel (§5), drill-down modal (§6) |
| C12 glass panel system | Every card/modal/drawer surface above — one of the three baseline recipes, never a fourth |

```

### FILE: docs/ai-workflow/design-brain/anti-patterns.md
```markdown
# anti-patterns.md — The Banned List (with WHY)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (expands `design.md` §27; bans inherited from `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B "explicit bans" win all conflicts)
- A PR that reintroduces any item below fails visual QA regardless of how good it looks.

---

## Stack & token bans

| Ban | Why |
|---|---|
| **Material UI** (rule 1) | Foreign design language + bundle weight; has broken production before. styled-components only |
| **Tailwind/shadcn for new Swan UI** | Utility-class drift erodes the token system; components stop reading as Swan |
| **Retired Galaxy-Swan tokens** `#0a0a1a` `#00FFFF` `#7851A9` | Retired brand. Gemini sometimes still proposes them — reject on sight |
| **Hardcoded hex without `var(--token, #fallback)`** (rule 6) | Kills theming and drift detection; the fallback IS the contract |
| **Arctic Cyan `#50A0F0` on buttons/glow** | It is the DATA color; on controls it collapses the chart-vs-action distinction |
| **Cyberforest tokens on client-facing surfaces** | Operator mode is Sean-only (design.md §3); leakage blurs the product/operator boundary |
| **The quarantined "LILA BAN"** (design-taste-frontend's purple-glow ban) | Directly contradicts the Dual-Button Glow rule. Swan doctrine wins; the skill stays quarantined |

## Layout & composition bans

| Ban | Why |
|---|---|
| **Generic SaaS template feel** (centered hero → 3-up features → logo row → CTA) | The #1 AI tell; Swan pages follow a named B2 arc with editorial asymmetry |
| **`repeat(4, 1fr)` equal card grids as default** | Equal weight says nothing is important; use weighted `minmax` columns (design.md §8) |
| **Center-everything symmetry** | Kills hierarchy and rhythm; source §B mandates asymmetry and negative space |
| **Cards inside cards** | Double chrome, wasted padding, muddy elevation story; flatten to sections within one panel |
| **Hero-style dashboards** | Dashboards are Phase 1–4 working surfaces, not brand pages; decorative banners bury the data |
| **Stretched cards filling 4K** | Wide monitors get MORE columns, not bigger cards (design.md §24) |
| **Identical card grids with no hierarchy** | If everything is a medium card, nothing is the next best action |

## Truth & content bans

| Ban | Why |
|---|---|
| **Fake/mock metrics presented as real** | Violates the Data-truth rule; mock data is a labeled gap, never dressed as proof |
| **Lorem ipsum shipping** | Placeholder copy in production is an integrity failure; write real SwanStudios-voice copy or a designed empty state |
| **Bare "No data" empty states** | Empty states are onboarding moments: Cormorant italic explanation + a CTA to create the first real thing (design.md §22) |
| **Yoga/meditation language** (rule 9) | Brand rule — use "stretching"/"flexibility" |
| **"NASM-certified" claims** | Credentials rule: "26+ years training experience," "NASM workshop-trained," "NASM-protocol" |
| **Calling Swan Coach "AI" user-facing** | Product naming rule (design.md §14) |

## Interaction bans

| Ban | Why |
|---|---|
| **Hover-only controls** | Touch devices never see them; keyboard users can't reach them |
| **Sub-44px touch targets** (rule 2) | 44px + 8px gaps is the floor, not the goal |
| **Color as the only signal** | Tier badges, states, deltas always pair color with text/icon (a11y; design.md §15) |
| **Hidden controls on data cards** | Swan Card Standard: client/trainer/admin cards expose their actions; discovery-by-hover is a desktop myth |
| **Emoji glyphs as control icons** | Repo standard is lucide-react (the 2026-07-03 cart slice replaced emoji with lucide); emoji render inconsistently across platforms and can't be sized/labeled reliably |
| **Two stacked modals** | Decision-on-decision; use drawer + modal or sequence the flow (design.md §20) |
| **Destructive action adjacent to submit** | One mis-tap from data loss; separate spatially and by variant (Danger has no glow — destruction isn't celebrated) |

## Motion & atmosphere bans

| Ban | Why |
|---|---|
| **Motion without purpose / dead decorative loops** | Fails the earned-motion test (`motion.md`); burns GPU and attention |
| **Neon overload / chaotic glow** | Glow is a discipline system with recipes (C12); more glow = less premium |
| **Ambient motion in calm zones** | Operator panels, data cards, forms — the data is the show (`motion.md` calm zones) |
| **Flat gray shadows** | Swan elevation is glass + tinted glow (design.md §7); gray drop-shadows read as 2015 Bootstrap |
| **Flat depthless backgrounds on hero/marketing** | Source §B atmospheric rules require layered atmosphere; add gradient depth + 2–5% grain |
| **Ungated animation (missing reduced-motion)** | Accessibility failure AND a rule-25 violation; DUAL gating (CSS + JS) per `motion.md` |

## Process bans

| Ban | Why |
|---|---|
| **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1.7); silent invention = drift |
| **Updating design.html without design.md (or vice versa)** | They ship together; divergence makes the mirror a liar (README enforcement contract) |
| **Skipping the mounted-surface receipt before a UI fix** | Rule 26 — you may be styling a dormant component |
| **"Looks good" as a QA verdict** | qa-gates.md verdicts are binary gates with receipts, not vibes (rule 19) |

## Pass/fail gate

PASS = zero hits from this list in the diff, checked against BOTH the rendered surface and the source. One hit = FAIL — fix, or get Sean's explicit written exception logged per `obsidian/design-decision-log-policy.md`.

```

### FILE: docs/ai-workflow/design-brain/qa-gates.md
```markdown
# qa-gates.md — Responsive · Accessibility · Visual QA Gates

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL
- **Consolidation note:** this file deliberately merges the originally-planned `responsive-qa.md` + `accessibility-qa.md` + `visual-qa.md` into one three-gate document — one read before any "done" claim, recorded in `index.md`.
- Every UI slice passes ALL THREE gates before closeout (rule 41). Each gate ends in a binary pass/fail an agent can self-apply.

---

## Gate 1 — RESPONSIVE

The full matrix (CLAUDE.md Premium Design Critique Loop §5). Check every row that can render the surface:

| Viewport | Class | What to check |
|---|---|---|
| `320px` | Minimum handset | Nothing overlaps/clips; stack > squeeze; CTA reachable without horizontal scroll |
| `375px` | Small iPhone | Type ≥16px body; thumb-zone CTA placement; 44px + 8px gap targets |
| `414px` | iPhone XR / Plus portrait | The Swan Card Standard width: cards, tabs, biometrics, action rows must not overlap, clip, or require hover |
| `768px` | Tablet portrait | Grid transitions (1→2 col); tables may remain tables above this only |
| `1024px` | Tablet landscape / small laptop | Nav rail behavior; drawer vs modal choices |
| `1280px` | Laptop | Baseline desktop composition |
| `1440px` | Desktop browser width | ⚠ `1440px` width ≠ 1440p — this is just a browser width |
| `1920px` | 1080p desktop | Section gaps at full scale; hero media crop |
| `2560×1440` | **1440p/QHD monitor class (Sean's)** | Density scales by MORE columns, not bigger cards (design.md §24); no stretched cards |
| `3840×2160` | 4K monitor class | Same; prose capped ~72ch; dashboards cap ~1920px centered or add columns |
| `3440px` | Ultrawide | Full-bleed only for cinematic media; content never ribbon-stretches |

If the QA tool accepts width only: use `2560px`/`3840px` widths and state the tested height separately. **1440p means the 2560×1440 viewport class.**

**PASS =** every applicable row checked and listed in the receipt with findings; zero overlap/clip/hover-dependence at ≤414px; wide-monitor rows show added columns, not stretched cards. Anything unchecked = say so explicitly (`[UNVERIFIED]`), which fails the gate for phone widths and merely flags for monitor widths.

## Gate 2 — ACCESSIBILITY

1. **Contrast:** 4.5:1 minimum for text (rule 7), checked against the ACTUAL rendered background (glass panels: check against the darkest AND lightest blur state; media: brightest frame per `cinematic-pages.md`). Known trap: raw `--swan-lavender` (#4070C0) text on dark surfaces computes ~4.0:1 — use it for borders/fills, or use lightened text tints.
2. **Focus:** `:focus-visible` ring on every interactive element (glow-color, 2px, offset 2px per design.md §10); logical tab order; **focus restoration to trigger on modal/drawer close** (WCAG 2.4.3 — a repeat offender in this repo, now source-locked in several suites).
3. **Keyboard paths:** every pointer path has a keyboard path; no hover-only reveals (anti-patterns); ESC closes non-destructive overlays.
4. **Touch:** ≥44px targets, ≥8px between adjacent targets; no nested interactive elements (invalid DOM + trap).
5. **Reduced motion:** DUAL gating verified — CSS `@media (prefers-reduced-motion)` AND `useReducedMotion()` for framer-motion/JS (`motion.md` §4; the 2026-06-20 lesson).
6. **Color-independence:** state/tier/delta never color-alone — always paired text/icon (design.md §15).
7. **Forced-colors:** headline gradients and glow chrome degrade to `CanvasText`-sane output (pattern: H1 forced-colors fallback, SESSION-H fix).
8. **ARIA:** labels on icon-only buttons; `aria-describedby` for field errors; live regions for async state changes; loading regions accessible (labeled skeleton region pattern).

**PASS =** all eight lines verified on the touched surface with evidence (test, axe pass, or explicit manual check named in the receipt). Hand-computed contrast is acceptable but must be labeled `[hand-computed]`; instrument-measured preferred.

## Gate 3 — VISUAL QA (the hostile design critique)

Run AFTER building, in hostile-reviewer mode (rule 23): actively try to prove the design is generic, tacky, flat, crowded, or inconsistent — then fix the weakest area before claiming done.

**The checklist (from the Premium Design Critique Loop, mapped to Design Brain docs):**
- Generic/template feel? (anti-patterns §layout — is there a named B2 arc and editorial asymmetry?)
- Weak hierarchy or unclear CTA? (one primary action per view; the biggest thing = the biggest idea)
- Inconsistent spacing rhythm? (every gap on the design.md §7 scale?)
- Cheap shadows/borders/icons? (glass + tinted glow only; lucide icons, no emoji controls)
- Flat, depthless backgrounds? (atmosphere layers + grain on large dark surfaces)
- Unreadable density / mobile squeeze? (Gate 1 evidence)
- Motion dead, noisy, or excessive? (`motion.md` §9 earned-motion test; calm zones clean)
- Weak contrast / muddy dark-mode? (Gate 2 evidence; "dark room lit by glowing objects," not gray-on-gray)
- Acceptable-but-not-premium components? (does the surface have its one signature moment?)
- Signature moment present and singular? (zero = template; two+ = noise)

**Tooling:** screenshot-diff loop per `docs/ai-workflow/references/VISUAL-DIFF-LOOP.md`; supervised Browser Harness sessions per `adapters/reviewers.md` (read-only, receipt-producing); Brave for Playwright QA (standing preference).

**Receipt format (required output of every QA pass):**

```
QA RECEIPT — <surface> — <date>
Viewports checked: <list with pass/fail each>
Accessibility: <8-line status w/ evidence class per line>
Critique findings: <ranked weakest-first>
Fixed this pass: <list>
Residual (disclosed): <list + why acceptable or deferred>
Verdict: PASS | FAIL (binary — no "looks good")
```

**PASS =** every checklist line answered with evidence, the weakest finding FIXED (not just noted), and the receipt written. A pass with an empty "Fixed this pass" section is suspicious — hostile review that finds nothing usually didn't look (rule 17).

---

## One-line summary for builders

Gate 1 proves it works everywhere, Gate 2 proves it works for everyone, Gate 3 proves it's worth shipping — receipts for all three, or it isn't done.

```

### FILE: docs/ai-workflow/design-brain/style-taxonomy.md
```markdown
# Style Taxonomy — the Image Forge's two-axis style vocabulary

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** CANONICAL (captured data) + DRAFT (Swan mapping)
- **Source:** `midlibrary.io/art-styles`, captured 2026-08-11 via rendered DOM. `[VERIFIED]` — counts are the site's own filter counts, read from the live page. WebFetch could not read this page (client-side rendered); Playwright could.
- **Why this exists:** Sean's ask — "all the choices that Midjourney has, I want those to be the options." This file is that option set, in a form the Image Forge can select from.

---

## The structural finding

Midlibrary is **not a flat list of styles.** It is a **two-axis matrix**, and that is the whole reason it works as a creative tool:

- **AXIS 1 — SOURCE**: *who or what made it.* 15 categories. Answers "whose hand is this?"
- **AXIS 2 — QUALITY**: *what it feels like.* 51 cross-cutting facets. Answers "what should it do to the viewer?"

Any style sits at an intersection. You navigate by **quality** when you know the feeling you want, and by **source** when you know the hand you want. Every entry ships a copy-ready prompt fragment.

**This is the architecture the Swan Image Forge must adopt.** The current generator has neither axis — it has one hardcoded 3-line string. Selecting on two axes is what turns "make a hero background" into a directed brief.

---

## AXIS 1 — SOURCE categories (15) · ~5,525 styles total

| Category | Count | Slug | Swan use |
|---|---:|---|---|
| Painters | 1,546 | `/categories/painters` | Substrates, atmosphere, color relationships |
| Illustrators | 919 | `/categories/illustrators` | Iconography, editorial spot art |
| Photographers | 686 | `/categories/photographers` | **Primary for Swan** — realism-as-substrate (LAW 1) |
| Techniques | 393 | `/categories/techniques` | Material/process language — surfaces, print, craft |
| Genres | 312 | `/categories/genres-art-movements` | Art movements — era anchoring |
| Various | 309 | `/categories/various-artists` | Cross-discipline, conceptual |
| Titles | 301 | `/categories/titles` | Named works/franchises |
| Sculptors | 236 | `/categories/sculpture-installation` | Form, mass, dimensional language → 3D/WebGL |
| General | 175 | `/categories/general-modifiers` | GenMods — light, color, texture, composition |
| Designers | 165 | `/categories/designers` | Graphic/industrial systems |
| Fashion Designers | 135 | `/categories/fashion-designers` | Couture — the reference class product design ignores |
| Filmmakers | 118 | — | **Cinematic grammar** — directly feeds C13 scroll-journey |
| Architects | 107 | — | Space, structure, light — feeds parallax depth + 3D |
| Street Artists | 60 | — | Scale, boldness, texture |
| Printmakers | 43 | — | Tileable/repeatable → Super-Tiling backgrounds |

---

## AXIS 2 — QUALITY facets (51) · the "options for the eyes"

Counts = how many styles carry that quality. High counts are broad levers; low counts are precision instruments.

**Tonal / mood**
`Vivid 2303` · `Detailed 2067` · `Moody 1483` · `Subdued 1329` · `Dark 652` · `Dreamy 476` · `Expressive 465` · `Epic 194` · `Cute 177` · `Madness 155` · `Funny 98`

**Subject / content**
`Portraits 1646` · `Characters 911` · `Landscapes 989` · `Scenes 974` · `Urban 742` · `Floral 610` · `Animals 472` · `Still Life 115` · `Letters 62` · `Religious 48` · `Erotic 54` · `LGBTQ+ 38`

**Mark-making / technique** ← *the precision layer most people never touch*
`Fine lines 715` · `Broad brushstrokes 497` · `Painterly 393` · `Fine brushtrokes 151` · `Bold lines 81` · `Drawing 74`

**Form / structure** ← *the layer that matters most for abstract backgrounds*
`Geometric 550` · `Patterns 423` · `Abstract 483` · `Minimalist 131`

**Rendering register**
`Illustrative 506` · `Classical 478` · `Realistic 405` · `Surreal 683` · `Comics 158` · `Documentary 120`

**Color / light**
`BW 662` · `Pastel 197` · `Psychedelic 100` · `Bold 92` · `Light 59`

**Era / genre**
`Fantasy 258` · `Sci-fi 192` · `Cinematic 182` · `Motion 197` · `Retro 147` · `Baroque 91` · `Ethnic 274`

---

## Swan mapping — which facets are ON-LAW and which are BANNED

The taxonomy is a vocabulary, **not a license.** Router LAWS 1–4 still govern every selection.

### Preferred for Swan (serve LAW 1 "realism as substrate")
`Subdued` · `Moody` · `Dark` · `Fine lines` · `Geometric` · `Patterns` · `Abstract` · `Minimalist` · `BW` · `Cinematic` · `Realistic` · `Detailed`

Source categories: **Photographers** (substrate), **Architects** (depth/structure), **Printmakers** (tileability), **Filmmakers** (scroll-journey grammar), **Sculptors** (3D form).

### Requires justification
`Vivid` · `Epic` · `Surreal` · `Dreamy` — each can tip a surface from "one impossible phenomenon" into AI-slop. Allowed only when the facet **is** the one phenomenon.

### BANNED outright (LAW 3 kill-list / LAW 4 optics-not-creatures)
- `Psychedelic` — this is the iridescent-unicorn-gradient failure mode by another name.
- `Animals` / `Characters` as *rendered subject* — LAW 4 forbids literal creature form. Permitted only as a **dark occluder** in a light field (the shipped About-page pattern), never a drawn silhouette.
- `Fantasy` when it reads as "AI fantasy wallpaper" — the named kill-list item.
- `Cute` · `Funny` · `Madness` — off-brand for a luxury training instrument.

---

## How the Forge selects (the two-axis pick)

```
1. Pick the JOB          → what this image does on the page
2. Pick 1-3 QUALITY facets → the feeling (Axis 2). Check against the ban list above.
3. Pick 1 SOURCE category  → whose hand (Axis 1)
4. Name the artist + THEIR MEDIUM  → personification formula:
      "[Artist]'s [their actual medium] depicting [subject]"
      NOT "[subject] by [Artist]" — the weak form.
5. Fill remaining slots     → optics, light, palette, material, abstraction, negative, output
```

Cross-reference: the 12-slot prompt architecture and the full craft vocabulary (lenses, film stocks, lighting, `--chaos` semantics, SREF weighting, Super-Tiling) live in the Image Forge spec. This file supplies **slots 4 and 5** — style anchor and composition register.

---

## Honest limits

- Counts and category names are `[VERIFIED]` from the live page on 2026-08-11. They will drift as the library grows.
- Individual style *names* are NOT captured here — ~5,525 entries is a corpus, not a doc. The Forge should query by axis and only pull specific names when a direction is chosen.
- Midlibrary is a **Midjourney** library. Style-name transfer to another image provider is `[HYPOTHESIS]` — artist/movement names generally transfer; MJ-specific parameters (`--sref`, `--tile`, `--chaos`, `--stylize`) do NOT and must be re-expressed as provider-native controls or as Swan Style Tokens.
- Nothing here overrides the router. On conflict: router LAWS > this vocabulary.

```

### FILE: docs/ai-workflow/design-brain/psychology.md
```markdown
# World Engine Psychology - Ethical, Testable Experience Hypotheses

- **Date:** 2026-07-12 - **Author:** Fable via builder agent, per `SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md` - **Status:** CANONICAL hypothesis schema; no conversion claim is canonical
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` sections B2/C + `design.md` + `motion.md` > this file. `experience-mode.md` controls surface licensing; psychology never grants a license.
- **Review by:** 2026-10-10, or earlier when a cited source is materially challenged or a Swan experiment contradicts an entry.

---

## 1. Evidence law - inspiration is not proof

Every PSY entry is a `PsychologyHypothesis`, not a persuasion guarantee. The cited work was conducted in memory, affect, judgment, task, or choice contexts, not in Swan World Engine pages. Until a preregistered Swan experiment produces a reproducible result for the named audience and surface, every predicted outcome remains visibly tagged **`[HYPOTHESIS]`**.

| Evidence label | Meaning here |
|---|---|
| **Moderate / indirect** | Repeated or field evidence supports the mechanism in its original domain; transfer to a themed web experience is unproved. |
| **Low-moderate / indirect** | A credible foundational experiment or theory exists, but context, sample, measurement, or generalization leaves a material gap. |
| **Low / contested** | Replication is mixed, the average effect is weak or heterogeneous, or the World Engine use is several inferential steps from the research. |

No entry earns **strong/direct** status from the current bibliography. A metric win does not erase accessibility, honesty, task-success, performance, or user-control guardrails. A hypothesis that wins once stays contextual; it is not promoted into universal doctrine.

## 2. The ten hypotheses

### PSY-01 - Awe `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Keltner and Haidt describe awe through perceived vastness plus a need for accommodation, an experience that exceeds the viewer's current frame ([R01]). |
| Evidence strength / caveat | **Low-moderate / indirect.** The source is a prototype model and literature synthesis, not a web-conversion experiment. Awe may be positive, threatening, tiring, or irrelevant; spectacle duration is not value. |
| Audience / context | Voluntary brand-film, cultural, launch, or exploratory visitors with time and interest. Wrong for urgent tasks, checkout, onboarding, dashboards, Coach, or Hermes Operations Center. |
| Swan anchor | B2.1 Act 1 Hook/awe; C1 cinematic hero, C2 parallax story, or C4 embedded-media letterform; one page-level signature moment under `motion.md` section 3. |
| World Engine use | Natural Sublime and Cosmic may open with one comprehensible scale contrast: a human-scale anchor against glacier, peak, nebula, or alien horizon, then move promptly to Act 2 proof. |
| Accessibility + ethical failure | Failure is forced camera motion, scale without a DOM equivalent, fear/shock, sensory overload, or treating reduced-motion users as second-class. The Still story must retain the scale relation, copy, proof, and CTA. |
| Target KPI / counter-metric | Target: voluntary Act-1-to-Act-2 reach **+5% relative**. Counter: median time to first proof/CTA, Pause/Skip use, early exits, and task-completion time. |
| Falsifier | At the powered endpoint, the upper 95% confidence bound is below **+3% relative** Act-2 reach, or the intended audience reports no lift in perceived scale/relevance. |
| Stop | Stop immediately for a critical/serious a11y defect, involuntary motion, distress reports, or **>=5% relative** degradation in task completion/time-to-proof. |

### PSY-02 - Curiosity Gap `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Loewenstein's information-gap account frames curiosity as attention to a perceived gap between what is known and what someone wants to know ([R02]). |
| Evidence strength / caveat | **Low-moderate / indirect.** The source is a review and theory paper; "tease causes conversion" is not established. Curiosity can become frustration, avoidance, or disappointment. |
| Audience / context | Exploratory visitors when the next scene supplies relevant information quickly. Never use on pricing, consent, navigation, credentials, proof, availability, terms, or the primary CTA. |
| Swan anchor | B2.1 Act 1-to-2; C3 sticky foreground/changing background, C6 detail reveal, and C10 act divider; narrative motion only. |
| World Engine use | Reveal one bounded question in the hero, show a meaningful partial clue, and resolve it in the immediately following act. Cosmic, Constructed Tech, and Miniature & Play may vary the clue, not the truth. |
| Accessibility + ethical failure | Failure is ambiguous controls, hover-only disclosure, inaccessible hidden copy, bait-and-switch, or making a screen-reader user traverse decorative suspense to reach facts. |
| Target KPI / counter-metric | Target: next-act continuation **+5% relative**. Counter: time to pricing/proof/CTA, backtracks, rage clicks, search use, and "could not find" feedback. |
| Falsifier | Upper 95% confidence bound below **+3% relative** continuation at the planned endpoint, or comprehension of the resolved fact is lower than control. |
| Stop | Stop if time to required facts worsens **>=10%**, backtracks rise **>=5% relative**, any required fact is concealed, or the open question is not resolved in the same story. |

### PSY-03 - Von Restorff Isolation `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Von Restorff's isolation paradigm found a memory advantage for an item made distinct within an otherwise coherent set ([R03]). |
| Evidence strength / caveat | **Moderate for controlled memory; low-moderate / indirect for web action.** Better recall of an isolated list item does not prove more qualified action or justify visual shouting. |
| Audience / context | Any eligible experience with one real priority. It does not fit a surface with several equally important tasks. |
| Swan anchor | C1/C4 focal hero; C7 final-offer card; B2.1 Act 4; `design.md` and `motion.md` one-signature-moment discipline. |
| World Engine use | Give one CTA or one signature beat a contrast role that no peer repeats. Repeated neon, glow, scale, tilt, or particles destroy isolation by making everything exceptional. |
| Accessibility + ethical failure | Failure is color-only distinction, low contrast, flashing, reordered focus, enlarged deceptive CTA, or visually suppressing comparison/decline paths. Distinction must survive monochrome, keyboard, zoom, and Still mode. |
| Target KPI / counter-metric | Target: qualified primary-action activation **+4% relative**. Counter: misclicks, backtracks, secondary-path discovery, and unaided identification of what the action does. |
| Falsifier | Upper 95% confidence bound below **+2% relative** qualified activation, or action-purpose comprehension does not improve. |
| Stop | Stop for any focus/contrast/order failure, **+2 percentage-point** misclick increase, loss of an escape/comparison path, or more than one competing "isolated" element. |

### PSY-04 - Peak-End `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Fredrickson and Kahneman found retrospective evaluations of affective episodes were shaped by selected snapshots and showed duration neglect; the peak/end formulation is a bounded memory heuristic, not a command to maximize emotion ([R04]). |
| Evidence strength / caveat | **Moderate / indirect.** The experiments used short pleasant and aversive film clips, not interactive websites; task success and total friction remain independently important. |
| Audience / context | Narrative marketing or brand experiences with a clear Act 3-to-4 transition and calm close. Never manufacture pressure in purchase, consent, health, or account workflows. |
| Swan anchor | B2.1 Act 3 Transformation - Act 4 Conversion; C10 narrative divider; `cinematic-pages.md` CTA at the 3-to-4 boundary and page end. |
| World Engine use | Make the peak the clearest proof/transformation reveal, then end with quiet orientation: what happened, what the next action does, and an unpressured exit. |
| Accessibility + ethical failure | Failure is a loud ending that traps focus, hides terms, accelerates a countdown, withholds pause/skip, or makes the reduced-motion ending emotionally or informationally incomplete. |
| Target KPI / counter-metric | Target: completed visitors' return/recommend intent or seven-day voluntary return **+3% relative**. Counter: Act-4 completion, CTA comprehension, abandonment, and reported pressure. |
| Falsifier | Upper 95% confidence bound below **+2% relative** on the preregistered primary measure, or Act-4 comprehension is no better than control. |
| Stop | Stop if Act-4 abandonment or reported pressure rises **>=5% relative**, the ending adds friction, or any conversion fact appears only at the peak. |

### PSY-05 - Aesthetic-Usability `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Tractinsky, Katz, and Ikar experimentally linked interface aesthetics to perceived usability in an ATM-like system ([R05]). |
| Evidence strength / caveat | **Moderate for perceived usability; indirect for actual usability and conversion.** Beauty can change judgment while errors, time, accessibility, and completion remain poor. Perception is not proof of function. |
| Audience / context | All audiences, provided the same content, controls, semantics, and task path exist in Full, Lean, Still, and B0. |
| Swan anchor | C12 glass-panel coherence; B2.2 task phases for objective usability; response motion only for controls; QA Gates remain authoritative. |
| World Engine use | Use material, light, typography, and spatial coherence to make hierarchy feel intentional; verify the exact task separately. Beauty frames truth; it never substitutes for proof or operation. |
| Accessibility + ethical failure | Failure is masking a broken control with polish, low-contrast luxury type, canvas-owned copy, slow ornamental input response, or dismissing a user's error because the screen looks premium. |
| Target KPI / counter-metric | Target: perceived-ease score **+0.3 on a 7-point scale** while objective completion is non-inferior. Counter: completion, errors, time-on-task, INP, and support requests. |
| Falsifier | Perceived ease improves less than **0.2/7**, or objective completion's confidence interval crosses a **-3% relative** non-inferiority margin. |
| Stop | Stop for any critical/serious a11y issue, **+2 percentage-point** task-error rise, p75 INP above 200ms, or design that makes an unavailable function appear available. |

### PSY-06 - Processing Fluency / Strategic Disfluency `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Reber, Winkielman, and Schwarz found perceptual fluency affected liking judgments ([R06]). Alter and colleagues reported disfluency-triggered analytic reasoning ([R07]), but a pooled replication found disfluent fonts slowed responses without improving problem solving ([R08]). |
| Evidence strength / caveat | **Moderate / indirect for fluency; low / contested for strategic disfluency.** The World Engine may test atmospheric ambiguity, never hard-to-read text as a cognitive "hack." |
| Audience / context | Fluency governs navigation, forms, pricing, consent, proof, CTA, error recovery, and readable copy. Optional disfluency is confined to decorative atmosphere for voluntary exploratory audiences. |
| Swan anchor | B2.1 Act 2 proof clarity; B2.2 all task phases; C3/C6 disclosure and C12 hierarchy; response motion must make state change legible. |
| World Engine use | Keep the semantic layer plain and predictable. Constructed Tech or Miniature & Play may place mist, occlusion, grain, or unusual topology behind it only when the B0/Still layer remains immediately intelligible. |
| Accessibility + ethical failure | Failure is low contrast, distorted type, confusing labels, hidden affordances, cognitive load sold as sophistication, or asking dyslexic/low-vision users to work harder for the same facts. |
| Target KPI / counter-metric | Target: proof comprehension or correct next-action choice **+5% relative**. Counter: reading time, errors, abandonment, zoom use, and reported effort. |
| Falsifier | Upper 95% confidence bound below **+3% relative** comprehension, or the treatment only increases time/effort. |
| Stop | Stop for any copy/control disfluency, **>=5% relative** time-on-task increase, **+2 percentage-point** error increase, or readability/contrast failure. |

### PSY-07 - Goal Gradient `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Kivetz, Urminsky, and Zheng found increased effort near a reward goal across field, behavioral, and experimental settings ([R09]). |
| Evidence strength / caveat | **Moderate / indirect.** Loyalty and rating tasks differ from narrative scroll. Their "illusionary progress" result is evidence about behavior, not permission to fabricate progress. |
| Audience / context | Finite, user-chosen stories or honest multi-step experiences where start, remaining effort, completion, and reward are real. |
| Swan anchor | B2.2 Phase 3 Progress - Phase 4 Next best action; C9 progress metric, C11 chart narrative, and M1 response acknowledgment. |
| World Engine use | Miniature & Play and campaign journeys may show truthful act/scene progress and a visible exit. Progress reflects completed content or action, never scroll theater, fake head starts, or irreversible commitment. |
| Accessibility + ethical failure | Failure is false percentages, completion pressure, inaccessible progress semantics, motion-only acknowledgment, or treating pause/exit as failure. Use text and `aria-current`/equivalent semantics. |
| Target KPI / counter-metric | Target: completion of the chosen finite sequence **+5% relative**. Counter: step abandonment, skips, reported pressure, return-to-previous-step success, and completion quality. |
| Falsifier | Upper 95% confidence bound below **+3% relative** completion, or completion rises while the quality/accuracy measure falls. |
| Stop | Stop for invented progress, **+3 percentage-point** abandonment, reduced back/exit success, or any coercive reward/penalty framing. |

### PSY-08 - Zeigarnik / Open Loops `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Zeigarnik reported better recall for interrupted tasks ([R10]); a 2025 meta-analysis found no general memory advantage for unfinished tasks, while task resumption was more consistent ([R11]). |
| Evidence strength / caveat | **Low / contested.** "Unfinished is memorable" is not dependable. Context, involvement, interruption, and measurement matter; web cliffhangers add another untested leap. |
| Audience / context | At most one low-stakes narrative question for voluntary exploratory visitors, resolved in the immediately following scene. Not for pricing, consent, proof, task state, notifications, or return pressure. |
| Swan anchor | B2.1 Act 1-to-2; C3 reveal sequence and C10 transition. No operator/product notification loop and no persistent ambient reminder. |
| World Engine use | Pocket Worlds or Voxel Realm within Miniature & Play may show a visibly incomplete harmless pattern whose next scene completes it. The resolved static frame must exist in Still mode and direct navigation must bypass the tease. |
| Accessibility + ethical failure | Failure is anxiety, repeated cliffhangers, fake incompleteness, lost task state, screen-reader ambiguity, or motion required to perceive resolution. |
| Target KPI / counter-metric | Target: next-scene continuation **+3% relative**. Counter: frustration, backtracks, exits, unresolved-question reports, and recall accuracy. |
| Falsifier | Upper 95% confidence bound below **+1% relative** continuation, no improvement in resolution recall, or any subgroup shows material frustration. |
| Stop | Stop for one unresolved loop, **+2 percentage-point** backtrack/exit increase, anxiety complaints, or a second simultaneous open loop. |

### PSY-09 - Social Proof + Authority `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Muchnik, Aral, and Taylor's randomized field experiment showed prior ratings can bias later ratings ([R12]); Hovland and Weiss experimentally examined how source credibility changes acceptance of a message ([R13]). |
| Evidence strength / caveat | **Moderate / indirect.** Influence exists, but can amplify bias and misinformation. Credibility is contextual; neither popularity nor credentials prove a specific outcome. |
| Audience / context | B2.1 Act 2 when real, current, consented, and relevant proof exists. If provenance is absent, omit the proof block rather than simulate it. |
| Swan anchor | C6 method/detail card, C9 media-anchored impact numbers, C11 real-data proof, and B2.1 Act 2 Capability/trust/proof. |
| World Engine use | Every family may frame proof in-world, but the proof remains real DOM content with source, date, denominator, scope, and consent. Visual spectacle recedes around evidence. |
| Accessibility + ethical failure | Failure is fake counts, composite testimonials, borrowed logos, outdated credentials, cherry-picked metrics, inaccessible carousels, undisclosed sponsorship, or social pressure against decline. |
| Target KPI / counter-metric | Target: qualified proof-viewer activation **+5% relative**. Counter: proof-source opens, skepticism reports, complaint rate, consent withdrawals, refunds/cancellations, and comprehension. |
| Falsifier | Upper 95% confidence bound below **+3% relative** qualified activation, or visitors cannot correctly state what the evidence does and does not establish. |
| Stop | Stop on missing provenance/consent, one inaccurate claim, one inaccessible proof item, increased complaints, or **+2 percentage-point** refund/cancellation rise. |

### PSY-10 - Paradox of Choice `[HYPOTHESIS]`

| Field | Contract |
|---|---|
| Definition - researcher - source | Iyengar and Lepper reported demotivation under some extensive-choice conditions ([R14]); Scheibehenne, Greifeneder, and Todd's meta-analysis found a virtually zero mean effect with substantial heterogeneity ([R15]). |
| Evidence strength / caveat | **Low / context-dependent.** "Fewer choices convert" is not a general law. Preference clarity, option structure, decision goal, and comparison quality may matter more than count. |
| Audience / context | Act 4 offers or paths where grouping and progressive disclosure can reduce simultaneous comparison without deleting meaningful alternatives or escape paths. |
| Swan anchor | B2.1 Act 4 and B2.2 Phase 4; C5 shelf/editions and C7 final offer card; response motion only. |
| World Engine use | Present one recommended next action plus a plainly labeled compare-all path. Group worlds or offers by decision-relevant difference; do not hide a cheaper, safer, or no-action option. |
| Accessibility + ethical failure | Failure is preselection without notice, roach-motel navigation, hidden comparison, inaccessible menus, urgency, or simplifying by withholding material terms. |
| Target KPI / counter-metric | Target: informed decision completion **+5% relative**. Counter: compare-all access, choice reversals, support questions, refunds/cancellations, and decision-confidence accuracy. |
| Falsifier | Upper 95% confidence bound below **+3% relative** completion, or completion improves while reversals/support contacts materially worsen. |
| Stop | Stop if compare/escape discovery falls **>=5% relative**, refunds/cancellations rise **+2 percentage points**, or any material alternative/term becomes harder to reach. |

## 3. Psychology receipt - `psy-receipt/v1`

Every World Engine direction records one receipt before implementation. Each act lists **2-3 PSY IDs**, but only one may be the primary mechanism; secondary IDs are independent, observable hypotheses or guardrails, not adjective padding. The receipt remains `[HYPOTHESIS]` and cannot authorize M4, Law B, an asset, or a production surface.

| Required field | Enforceable content |
|---|---|
| Identity | Receipt version, World ID, catalog version/hash, target surface, SurfaceLicense verdict, audience/intent, author, date, and review-by date. |
| Act 1-4 rows | Exactly 2-3 PSY IDs; one marked primary; mechanism; scene/DOM implementation; B2/C/motion anchor; audience/context; accessibility exclusion; target KPI; counter-metric; falsifier; stop condition. |
| Isolation | Copy, proof, offer, navigation, consent, and CTA parity across Full/Lean/Still and B0-B3; no canvas-owned meaning. |
| Confounds | Content, proof, CTA wording/order, offer, and audience held constant unless explicitly part of the experiment. WFX and asset version/hash recorded. |
| Status | `untested`, `running`, `supported-in-context`, `inconclusive`, `falsified-in-context`, or `stopped-for-harm`; never `proven`. |

Receipt rejection conditions: missing primary mechanism; IDs used without a measurable implementation; conversion language without `[HYPOTHESIS]`; a falsifier that cannot fail; guardrails weaker than the target KPI; accessibility framed as a segment to exclude; or a claim that psychology overrides licensing, source doctrine, or user control.

## 4. Experiment receipt - `psy-experiment/v1`

An experiment receipt is preregistered before exposure and completed without rewriting its decision rule. It contains all fields below; a run with an unfilled field is blocked, not "completed later."

| Required field | Enforceable content |
|---|---|
| Identity and ownership | Stable experiment/run ID, PSY IDs, World/recipe/catalog versions and hashes, eligible surface/license, owner, independent reviewer, start/end dates, and rollback owner. |
| Population | Audience intent, device/assistive-tech coverage, eligibility/exclusion rules, allocation unit, randomization method, and exposure-integrity checks. No PII enters the receipt. |
| Variants | Control and treatment described precisely; content/proof/CTA/offer parity stated; Full/Lean/Still and B0 fallback parity evidenced; screenshots and build hashes attached. |
| One primary metric | One named metric, unit, event definition, baseline window, minimum practical effect, power-derived planned sample, and fixed exposure window. Both sample and time rules are set before launch. |
| Guardrails | Task completion and time; bounce/early exit; error/misclick/backtrack; p75 LCP <=2.5s, INP <=200ms, CLS <=0.1; zero critical/serious automated or manual a11y defects; Pause/Skip/mute/opt-out success; complaints; and principle-specific counter-metrics. |
| Analysis | Intent-to-treat primary analysis, confidence interval, missing-data rule, repeated-exposure rule, segment checks chosen before launch, and no post-hoc metric substitution. |
| Decision rule | **Adopt in context** only when the primary meets the preregistered practical threshold and every guardrail passes. **Reject/falsify in context** when the powered upper bound is below the practical threshold. **Inconclusive** otherwise. **Stop** immediately on any entry's harm/performance/a11y threshold. |
| Outcome | Exposure counts, integrity failures, estimate + interval, every guardrail, segment cautions, decision, rollback/promotion action, and new review-by date. Null and negative outcomes are retained. |

No cherry-picking: one metric win cannot offset harm; no peeking-driven early "winner"; no merging audiences after the fact; no re-labeling a falsified mechanism. Repeated results may support a narrower audience/surface claim, never "psychology proves this world converts."

## 5. Bibliography

- **[R01]** Keltner, D., & Haidt, J. (2003). [Approaching awe, a moral, spiritual, and aesthetic emotion](https://doi.org/10.1080/02699930302297). *Cognition and Emotion, 17*(2), 297-314.
- **[R02]** Loewenstein, G. (1994). [The psychology of curiosity: A review and reinterpretation](https://doi.org/10.1037/0033-2909.116.1.75). *Psychological Bulletin, 116*(1), 75-98.
- **[R03]** von Restorff, H. (1933). [Uber die Wirkung von Bereichsbildungen im Spurenfeld](https://doi.org/10.1007/BF02409636). *Psychologische Forschung, 18*, 299-342.
- **[R04]** Fredrickson, B. L., & Kahneman, D. (1993). [Duration neglect in retrospective evaluations of affective episodes](https://doi.org/10.1037/0022-3514.65.1.45). *Journal of Personality and Social Psychology, 65*(1), 45-55.
- **[R05]** Tractinsky, N., Katz, A. S., & Ikar, D. (2000). [What is beautiful is usable](https://doi.org/10.1016/S0953-5438(00)00031-X). *Interacting with Computers, 13*(2), 127-145.
- **[R06]** Reber, R., Winkielman, P., & Schwarz, N. (1998). [Effects of perceptual fluency on affective judgments](https://doi.org/10.1111/1467-9280.00008). *Psychological Science, 9*(1), 45-48.
- **[R07]** Alter, A. L., Oppenheimer, D. M., Epley, N., & Eyre, R. N. (2007). [Overcoming intuition: Metacognitive difficulty activates analytic reasoning](https://doi.org/10.1037/0096-3445.136.4.569). *Journal of Experimental Psychology: General, 136*(4), 569-576.
- **[R08]** Meyer, A., et al. (2015). [Disfluent fonts don't help people solve math problems](https://doi.org/10.1037/xge0000049). *Journal of Experimental Psychology: General, 144*(2), e16-e30.
- **[R09]** Kivetz, R., Urminsky, O., & Zheng, Y. (2006). [The goal-gradient hypothesis resurrected](https://doi.org/10.1509/jmkr.43.1.39). *Journal of Marketing Research, 43*(1), 39-58.
- **[R10]** Zeigarnik, B. (1927). [Das Behalten erledigter und unerledigter Handlungen](https://doi.org/10.1007/BF02409755). *Psychologische Forschung, 9*, 1-85.
- **[R11]** Ghibellini, R., & Meier, B. (2025). [Interruption, recall and resumption: A meta-analysis of the Zeigarnik and Ovsiankina effects](https://www.nature.com/articles/s41599-025-05000-w). *Humanities and Social Sciences Communications, 12*, 962.
- **[R12]** Muchnik, L., Aral, S., & Taylor, S. J. (2013). [Social influence bias: A randomized experiment](https://doi.org/10.1126/science.1240466). *Science, 341*(6146), 647-651.
- **[R13]** Hovland, C. I., & Weiss, W. (1951). [The influence of source credibility on communication effectiveness](https://doi.org/10.1086/266350). *Public Opinion Quarterly, 15*(4), 635-650.
- **[R14]** Iyengar, S. S., & Lepper, M. R. (2000). [When choice is demotivating: Can one desire too much of a good thing?](https://doi.org/10.1037/0022-3514.79.6.995). *Journal of Personality and Social Psychology, 79*(6), 995-1006.
- **[R15]** Scheibehenne, B., Greifeneder, R., & Todd, P. M. (2010). [Can there ever be too many options? A meta-analytic review of choice overload](https://doi.org/10.1086/651235). *Journal of Consumer Research, 37*(3), 409-425.

## 6. Verification before use

- [ ] Every claimed mechanism is tagged `[HYPOTHESIS]` and cites a PSY ID; no "proven to convert" language.
- [ ] Receipt has 2-3 IDs per act, one primary mechanism, Swan anchors, accessibility exclusion, KPI, counter-metric, falsifier, and stop.
- [ ] Required facts and actions remain fluent, DOM-owned, and identical in meaning across Full/Lean/Still and B0-B3.
- [ ] Experiment was preregistered; one primary metric; power/exposure and decision rules fixed before launch; null/negative results retained.
- [ ] No fake scarcity, proof, progress, authority, interruption, default, or choice suppression; no psychology rationale overrides consent or truthful comparison.
- [ ] Any graph/export treats these as `PsychologyHypothesis` entities and follows `adapters/knowledge.md` quarantine; never direct-to-wiki promotion.

```

### FILE: docs/ai-workflow/design-brain/techniques.md
```markdown
# techniques.md — World Effects Arsenal

- **Date:** 2026-07-12 · **Author:** Fable via builder agent, per `SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md` · **Status:** CANONICAL within Design Brain scope
- **Authority:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` > `design.md` > `experience-mode.md` > this file. A technique narrows those sources; it never grants a surface license.
- **Purpose:** define WFX-01–WFX-13 as reproducible effects with explicit maturity, backend, performance, loss, accessibility, and subtraction rules.

---

## 1. Namespaces, maturity, and dependency truth

- `WFX-*` identifies a visual technique. `M0–M4` is the experience budget in `experience-mode.md`; `Full / Lean / Still` is runtime quality; `B0–B3` is the render ladder; Hermes `T0–T4` is command-effect safety. Never reuse one namespace for another.
- **AVAILABLE:** browser-native or installed with a working repository pattern. **PROGRESSIVE:** browser-native behind feature detection with a complete fallback. **DEPENDENCY-GATED:** absent from the repo; requires an approved version/architecture spike. **RESEARCH-ONLY:** lab/factory lane; never a required delivery path.
- Repository check on 2026-07-12: React `^18.2.0`, Framer Motion `^10.16.5`, and Victory `^37.3.6` are installed. View Transitions and Web Audio have working repo patterns. Three.js, R3F, Drei, GSAP, and TypeGPU are not dependencies. If R3F is later approved while React remains 18, use R3F 8; R3F 9 pairs with React 19.
- Maturity is rung-specific. A B1 fallback may be AVAILABLE while a B2 centerpiece is DEPENDENCY-GATED and its B3 version is RESEARCH-ONLY.

## 2. Runtime render ladder and selection law

| Rung | Contract | Promotion evidence | Immediate loss action |
|---|---|---|---|
| **B0 Semantic Poster** | Real DOM heading, copy, navigation, proof, CTA, legal/form state, and a world-native still. Complete with JavaScript disabled | Unconditional first paint | Remains mounted through every upgrade or failure |
| **B1 Cinematic Media** | CSS/SVG, responsive stills, poster-first video, and native canvas where justified | Asset decode succeeds; B0 is stable; motion preference permits | Freeze to poster/static CSS; preserve DOM and focus |
| **B2 Production Spatial** | Three.js WebGL2, directly or through an approved React-18 adapter | Dependency spike, first render, forced WebGL-loss test, budgets, disposal, B1/B0 parity | Dispose and fall to B1 without reload |
| **B3 Frontier Spatial** | Isolated Three WebGPURenderer, TypeGPU, or raw WebGPU | Adapter/device/pipeline creation, compilation/error scopes, first render, `device.lost`, budgets, and B2/B1/B0 parity | Destroy/release resources and fall to B2, then B1 |

Selection is `reduced-motion → Still/B0`, otherwise initialize one rung at a time from the lowest already-good story. Capability checks start an experiment; successful initialization plus observed performance decides whether it stays. No user-agent device classes, no single `navigator.gpu` verdict, and no visible quality oscillation. After warm-up, each Full window contains exactly 120 eligible presentations. Downgrade after **three consecutive 120-frame Full windows with active deadline/cap breaches**; a missed presentation or active authored-work/pixel/draw/memory overage breaches that window, while any animation-related task over 50ms downgrades immediately. Recover only after ten clean seconds below 80% of every active cap. Allow at most one automatic upgrade per session, never above the user’s session choice. A failure may change decoration, never meaning, route, CTA, form state, price, or focus order.

## 3. Page-wide performance envelope

- B0 poster, heading, and CTA load with zero 3D/WebGPU engine bytes. Experience code lazy-loads after B0 is stable; Act 2+ assets start one viewport ahead.
- Field targets at p75: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Canonical trace: no animation-related main-thread task >50ms.
- The **Full authored render/main-thread work budget is ≤16.7ms** after warm-up. Aggregate work proxies and trace-derived distributions are separate evidence and must retain their true names. Full also stays ≤3.7MP, ≤300 draw calls, and ≤192MiB. Lean authored work is ≤33.3ms, ≤2.1MP, ≤150 draws, and ≤96MiB. Still/reduced has no continuous effect loop.
- Per-effect limits below are allocations inside this page envelope, not additive entitlements. When effects compete, keep the story-bearing one and subtract the rest.
- Pause off-viewport and on `document.hidden`; coalesce worker messages; cancel callbacks; remove observers/listeners; pause media/audio; close or suspend audio graphs; dispose geometries, materials, textures, buffers, pipelines, workers, and contexts on unmount.

### Canonical frame-measurement law

- **Presentation cadence:** **rAF callback-to-callback p95 is presentation cadence, not authored work** because rAF generally follows display refresh and its timestamp marks the animation timeline/callback boundary ([MDN rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). A direct rAF-p95 Full gate is forbidden. Capture 120 raw visible-page intervals in the same page’s authored Still state under identical conditions. The **Still-mode 120-frame cadence median identifies the refresh quantum** only; Full requires a **60Hz-or-faster** environment. A **missed presentation is any interval ≥1.5x the refresh quantum**. Raw intervals stay raw with **no fixed millisecond tolerance** and no baseline subtraction.
- **Authored work:** record **Chrome Performance task/style/layout/script deltas plus Long Animation Frame and Long Task evidence** for the same acts/windows. CDP aggregate metric deltas may report aggregate Chrome work-proxy ms/presentation by dividing attributable scripting/style/layout/render/paint work by eligible presentations. The aggregate is not per-frame data and must never be labeled p95. Keep a saved trace authoritative when LoAF is unavailable ([MDN LoAF](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing); [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/reference)).
- **Rung gate:** **B1 qualification requires zero missed presentations, no LoAF/long task, and aggregate Chrome work-proxy ms/presentation under 16.7ms** in the declared windows. **A saved DevTools/renderer trace is required to claim p95 and for B2/B3 production promotion**, with GPU/renderer timing, draw/pixel/memory evidence, forced-loss recovery, and bottleneck attribution; B1 aggregate evidence cannot promote a spatial renderer or claim a distribution.
- A **raw measurement receipt** keeps ordered raw rAF timestamps/intervals, Still median/refresh quantum, missed flags, raw trace/work deltas, LoAF/Long Task entries, route/build, viewport/DPR/display cadence, browser/device class, visibility, quality/rung, caps, and hysteresis decisions. Derived cadence/work summaries remain beside the raw evidence; never replace, trim, baseline-correct, or substitute one channel for the other.
- Field telemetry remains **raw unnormalized production RUM**. Preserve raw observed intervals and work signals plus declared window/mode/context metadata before aggregation. Never subtract Still calibration, refresh cadence, or lab/device baseline from production values.

## WFX-01 — Shader Surface

| Field | Contract |
|---|---|
| Job / payoff | Put light, refraction, fluid color, weather, or procedural material into one bounded surface; creates awe or tactility without making copy unreadable |
| Budget / maturity | M4 centerpiece; M3 only as the existing surgical accent. B1 encoded/CSS = PROGRESSIVE; raw WebGL2 or Three B2 = DEPENDENCY-GATED for this repo; WGSL/WebGPU B3 = RESEARCH-ONLY |
| Backend rungs | B0 authored still/gradient; B1 encoded media or CSS/SVG = PROGRESSIVE; B2 WebGL2/Three = DEPENDENCY-GATED; B3 WGSL/WebGPU = RESEARCH-ONLY. Every higher rung falls in place to the next verified rung. |
| Inputs / determinism | Versioned shader ID, seed, normalized time, pointer/audio inputs only after consent, quality/backend override, color-space and resolution manifest. No `Date.now()` or unbounded independent clock in render truth |
| Full / Lean / Still | Full: one shader surface inside the page envelope, ≤3.7MP. Lean: ≤2.1MP, half-rate or simplified pass, then encoded media. Still: authored frame/gradient, zero loop |
| Recovery | Timeout adapter/device/pipeline/first render; inspect WebGPU compilation/error scopes; handle `device.lost`, `uncapturederror`, and WebGL context loss; tear down then B3→B2→B1→B0 in place |
| A11y / static | Decorative canvas `aria-hidden`; informative output gets DOM text/table. Pause Effects freezes time. Reduced motion renders the selected authored still, not frame zero by accident |
| Implementation | Uniform updates are bounded; no per-frame React state; precompile off the critical path; cap DPR by drawing-buffer pixels; label GPU resources; large blur/filter animation is rejected |
| Wrong tool | The effect could be a graded still/video, exists only behind copy, needs unique information in pixels, or cannot recover from context loss without a blank page |

## WFX-02 — Particle Field / Swarm

| Field | Contract |
|---|---|
| Job / payoff | Show scale, wind, stars, rain, pollen, crystals, or collective motion; creates depth, aliveness, and wonder |
| Budget / maturity | M3 for ≤200 subtle particles; M4 for GPU swarms. CSS/SVG/canvas = PROGRESSIVE; instanced B2 = DEPENDENCY-GATED; compute B3 = RESEARCH-ONLY |
| Backend rungs | B0 composition with zero particles; B1 CSS/SVG/native-canvas particles = PROGRESSIVE; B2 instanced WebGL2 = DEPENDENCY-GATED; B3 compute swarm = RESEARCH-ONLY. |
| Inputs / determinism | Catalog version, fixed seed, spawn volume, forces, lifetime, density, scene time, quality override. Replays must match from the same manifest |
| Full / Lean / Still | Full: instanced swarm capped by the page frame/draw/memory limits; initial design ceiling 25k points pending measurement. Lean: ≤200 low-opacity elements or encoded layer. Still: zero particles; composition survives |
| Recovery | Density governor drops update rate/count before rung; failed worker/GPU path returns to B1 media/static. Stop spawn first, then simulation, then canvas |
| A11y / static | Particles never carry status, direction, proof, or CTA. No flashes >3/second; avoid rapid looming toward camera; Pause Effects and reduced motion remove them |
| Implementation | Instance repeats; pool objects; spatially bound overdraw; offscreen/hidden pause; no DOM node per GPU particle; deterministic sampling for snapshots |
| Wrong tool | Fewer than ~20 meaningful objects need labels/interaction, particles obscure reading, or density is being used to disguise a flat composition |

## WFX-03 — Procedural Generation

| Field | Contract |
|---|---|
| Job / payoff | Generate cities, terrain, starfields, flora, or voxel topology that feels explorable and never exactly generic |
| Budget / maturity | M4 · DEPENDENCY-GATED for live spatial generation; B1 pre-baked output is the fallback; B3 compute is RESEARCH-ONLY |
| Backend rungs | B0 authored overview; B1 pre-baked generated media = AVAILABLE fallback; B2 live WebGL2 generation = DEPENDENCY-GATED; B3 compute generation = RESEARCH-ONLY. |
| Inputs / determinism | Fixed generator/catalog version + seed + scene time + quality/backend override + asset hashes. No bare `Math.random()`, `Date.now()`, locale-dependent ordering, or render-thread clock |
| Full / Lean / Still | Full: incremental/worker generation, each main-thread slice <12ms and no task >50ms. Lean: lower topology/LOD or pre-baked media. Still: deterministic authored overview frame |
| Recovery | Invalid seed/schema, worker failure, timeout, memory breach, or non-finite geometry aborts that generator and loads a known-good manifest; never retry-loop visibly |
| A11y / static | Generated paths are decorative unless mirrored by DOM navigation. Randomness cannot reorder focus, prices, proof, choices, or reading order |
| Implementation | Validate ranges; hash the manifest; cache by version+seed; bound recursion, object count, topology, transfer size, and generation time; instance repeats and add LOD |
| Wrong tool | Hand-authored composition would be more legible, exact art direction matters more than variation, or reproducibility/provenance cannot be recorded |

## WFX-04 — Spatial Scene

| Field | Contract |
|---|---|
| Job / payoff | Make one object/world spatially present: orbit, approach, depth reveal, or flythrough; creates agency and embodied awe |
| Budget / maturity | M4 scaffolding only on licensed non-product/approved-marketing hosts; M3 retains one surgical accent. B2 DEPENDENCY-GATED; B3 RESEARCH-ONLY |
| Backend rungs | B0 art-directed frame; B1 turntable/video/layered media = PROGRESSIVE; B2 Three/WebGL2 scene = DEPENDENCY-GATED; B3 WebGPU scene = RESEARCH-ONLY. |
| Dependency truth | Three.js is the production B2 target after a spike. R3F is an adapter, not architecture; R3F 8 only while React is 18. One canvas default |
| Full / Lean / Still | Full: page envelope, reuse/instancing/LOD, demand render when restable. Lean: B1 turntable/video or simplified non-pinned scene. Still: art-directed 2D frame |
| Recovery | `<Suspense>` covers asset wait, not runtime loss. Failed import/model/context/device drops to B1/B0; retain camera-independent DOM story and action |
| A11y / static | Canvas cannot own navigation or unique copy. Interactive spatial targets have DOM controls/descriptions and logical keyboard order; no forced pointer lock/fullscreen |
| Implementation | Progressive model/texture loading, explicit dimensions, resource cache+dispose contract, bounded camera, no per-frame React state, offscreen stop |
| Wrong tool | 3D is not the point, the same idea works as 2D parallax, it makes a task slower, or the canvas becomes page scaffolding on a prohibited surface |

## WFX-05 — Scroll-Scrubbed Frame Sequence

| Field | Contract |
|---|---|
| Job / payoff | Tie a transformation or reveal to deliberate scroll progress; creates control, anticipation, and film-like causality |
| Budget / maturity | M3 · PROGRESSIVE using images/canvas/rAF; no new library required. Follow `cinematic-pages.md` §8 economics |
| Backend rungs | B0 composed poster; B1 responsive frame sequence/native canvas = PROGRESSIVE; B2 is INELIGIBLE because spatial rendering adds no sequence value; B3 is INELIGIBLE. Failed B1 remains B0. |
| Full / Lean / Still | Full: 60–120 responsive frames, ≤4–6MB desktop and ≤2MB mobile, draw only when index changes. Lean: ≤30 key frames or poster+CSS parallax. Still: composed poster |
| Recovery | First frame is truth; failed decode/network/canvas keeps poster. Abort preloads outside the scene; never block LCP or wait on the full set |
| A11y / static | Sequence conveys no copy that is absent from DOM; skip scene is keyboard-visible; reduced motion renders the chosen legible frame; no keyboard scroll hijack |
| Implementation | Priority first frame, lazy one viewport ahead, responsive `<picture>`/frame sets, decode in scroll direction, rAF-coalesced progress, explicit size prevents CLS |
| Wrong tool | The change is not understandable in static start/end frames, source cannot be compressed within budget, or scroll becomes a video seek bar with no story |

## WFX-06 — Variable-Font Animation

| Field | Contract |
|---|---|
| Job / payoff | Let one display word compress, thaw, widen, or gain grade as a narrative beat; creates tactile typographic transformation |
| Budget / maturity | M2+ · PROGRESSIVE. Browser support exists, but each font file’s axes, web license, subset, loading, and fallback metrics require verification |
| Backend rungs | B0 final static text; B1 variable-font CSS = PROGRESSIVE after font/license verification; B2 is INELIGIBLE; B3 is INELIGIBLE. Font failure preserves B0 text. |
| Safe exception | Exception to transform/opacity-only for one contained display line, never body, CTA, navigation, proof, pricing, legal, or data. Prefer registered `font-weight`/`font-stretch`; low-level axes only when needed |
| Full / Lean / Still | Full: one line, one axis (two only if measured), ≤900ms or scroll-bound, reserved box, CLS=0. Lean: static midpoint/final or opacity reveal. Still: final readable setting |
| Recovery | Font timeout/FOUT or unsupported axis uses metric-compatible static fallback; never hide text while fonts load; axis parse failure renders the final semantic text |
| A11y / static | DOM text never changes or duplicates; final reading is immediate to assistive tech; forced-colors remains plain text; reduced motion sets final axis with no transition |
| Implementation | Inspect `@font-face` ranges; subset WOFF2; use `font-display`; test every axis extreme for clipping, wrap, paint cost, and brightest-frame contrast |
| Wrong tool | The line wraps across states, the font is not licensed/variable, the beat delays reading, or transform/opacity delivers the same meaning more cheaply |

## WFX-07 — Kinetic / Generated Typography

| Field | Contract |
|---|---|
| Job / payoff | Stage an identity claim, signage build, count, mask, or controlled scramble; creates emphasis and curiosity while keeping language primary |
| Budget / maturity | M2+ · AVAILABLE with CSS/Framer; View Transitions/scroll timelines are PROGRESSIVE enhancements |
| Backend rungs | B0 final semantic phrase; B1 CSS/Framer/View-Transition enhancement = AVAILABLE/PROGRESSIVE; B2 is INELIGIBLE; B3 is INELIGIBLE. |
| Full / Lean / Still | Full: final text visible/settled ≤900ms, stagger ≤80ms and ≤5 units; max one short display phrase. Lean: word-level opacity/translate. Still: final typeset line immediately |
| Recovery | JS or feature failure leaves source-order final text. Cancel on navigation/unmount; animation cannot reset endlessly on scroll |
| A11y / static | One accessible text node exposes the final phrase; animated glyph clones are `aria-hidden`; no character-by-character live-region spam; comprehension never waits |
| Implementation | Transform/opacity default; deterministic tokens; `document.startViewTransition` only for navigation-level continuity and only through the existing feature-detected pattern |
| Wrong tool | Body copy, instructions, errors, consent, prices, or CTA clarity would be delayed; a flourish is compensating for weak words |

## WFX-08 — Scroll Film

| Field | Contract |
|---|---|
| Job / payoff | Orchestrate the four-act story as flowing and pinned scenes with earned cuts and a calm close; creates momentum and a memorable peak-end shape |
| Budget / maturity | M4 orchestration. Native sticky/IO/rAF + installed Framer are AVAILABLE; CSS timelines are PROGRESSIVE; GSAP is DEPENDENCY-GATED and earns import only for a measured long timeline |
| Backend rungs | B0 complete four-act storyboard; B1 sticky/IO/rAF/Framer orchestration = AVAILABLE/PROGRESSIVE; B2 may host only a separately licensed subordinate WFX-04 scene and is otherwise INELIGIBLE; B3 follows that subordinate scene only and never owns orchestration. |
| Full / Lean / Still | Full M4: scene ledger, total ≤20vh, ≤4 justified pins, ≤5 concurrent moving elements, ≤2 properties each. Lean: no pins, vertical scenes/posters. Still: complete static storyboard in act order |
| Recovery | Any pin/timeline/import failure releases normal document flow; progress and CTA remain reachable; deep links and browser scroll restoration remain native |
| A11y / static | Visible Skip-to-Content/scene; linear tab order; no wheel/touch/keyboard hijack or focus capture; Pause Effects freezes continuous atmosphere without hiding content |
| Implementation | One scroll owner; pins release at boundaries; temperature/light shifts at act cuts; CTA repeats only at Act 3→4 and page end; cleanup every timeline/context |
| Wrong tool | The logline or ledger is missing, content is task-first, total travel is filler, or a long page is being mistaken for a story |

## WFX-09 — Audio-Reactive Atmosphere

| Field | Contract |
|---|---|
| Job / payoff | Let user-started sound influence light, particles, or type; creates intimacy and responsive presence |
| Budget / maturity | M4 · AVAILABLE Web Audio primitives and repo patterns; PROGRESSIVE because activation, media, and device support vary. No added audio library by default |
| Backend rungs | B0 complete silent visual story; B1 Web Audio plus DOM/CSS media response = PROGRESSIVE; B2 spatial visual response = DEPENDENCY-GATED and optional; B3 compute response = RESEARCH-ONLY. |
| Full / Lean / Still | Full: analyser FFT ≤1024, visual updates ≤30Hz, batched off React render. Lean: ≤10Hz / 3-band envelope or non-reactive playback. Still: static atmosphere; user-started audio may continue with controls |
| Recovery | Audio unavailable/blocked/ended/suspended leaves the full visual story. Resume only inside user action; suspend on hidden tab; disconnect nodes and release media on exit |
| A11y / privacy | No autoplay. Visible 44px Play, Mute, and Stop with states; informational audio gets transcript/captions. Microphone input is a separate permissioned product decision, not implied by this effect |
| Implementation | Prefer existing `AudioContext` patterns; clamp/smooth analyser data; never expose raw audio or derived identity data; honor Pause Effects separately from Mute/Stop |
| Wrong tool | Sound is decorative but compulsory, the experience weakens when muted, input requires surprise microphone access, or reactive motion harms readability |

## WFX-10 — Playable Moment

| Field | Contract |
|---|---|
| Job / payoff | Offer a short optional interaction—assemble, steer, reveal, catch, or build—that expresses the world; creates agency and delight |
| Budget / maturity | M4. DOM/React/Canvas basics = AVAILABLE; physics/spatial engines = DEPENDENCY-GATED; XR version = RESEARCH-ONLY |
| Backend rungs | B0 Skip/Continue story path; B1 DOM/React/2D canvas = AVAILABLE; B2 spatial/physics moment = DEPENDENCY-GATED; B3/WebXR moment = RESEARCH-ONLY. No rung gates content or conversion. |
| Full / Lean / Still | Full: one bounded scene, ≤30s intended round, page frame envelope. Lean: simplified 2D/single-step version. Still: Skip continues to the same story/action with no penalty |
| Recovery | Load/input/game-loop failure shows an honest unavailable state plus Continue; state is ephemeral unless an explicit local save contract exists |
| A11y / ethics | Keyboard + touch + single-pointer alternative; instructions and status in DOM; pause/exit always visible; no content/conversion gate, forced fullscreen/pointer lock, fake reward, streak pressure, or pay-to-skip |
| Implementation | Deterministic seed for QA; bounded loop with stop condition; prevent accidental page-scroll capture only while focused and provide clear escape; no PII or production writes |
| Wrong tool | The “game” is a disguised form/CTA, requires motor precision without an alternative, or contributes no understanding of the offer/world |

## WFX-11 — 3D Product Orbit

| Field | Contract |
|---|---|
| Job / payoff | Let visitors inspect a meaningful object/model from controlled angles; creates trust, tactility, and ownership |
| Budget / maturity | M3 surgical / M4 centerpiece · B2 DEPENDENCY-GATED; B3 RESEARCH-ONLY. B1 turntable video is PROGRESSIVE |
| Backend rungs | B0 best three-quarter still + DOM description; B1 pausable turntable video/still set = PROGRESSIVE; B2 Three/WebGL2 orbit = DEPENDENCY-GATED; B3 WebGPU orbit = RESEARCH-ONLY. |
| Full / Lean / Still | Full: one model/canvas inside page envelope, bounded camera, LOD and compressed textures. Lean: pausable turntable video or limited angle still set. Still: best 3/4 hero frame + DOM description |
| Recovery | Model/decoder/context failure swaps to turntable/still without layout shift. Disposal releases controls, buffers, textures, and observers |
| A11y / static | Drag has 44px Rotate left/right/reset buttons and keyboard keys; current view announced only on committed steps; product facts and actions remain DOM-owned |
| Implementation | Optimize GLTF/Draco only after approved dependency/tooling spike; cap zoom/rotation; progressive texture load; demand render at rest; explicit dimensions |
| Wrong tool | The reverse side carries no useful information, photography is clearer, the asset provenance is uncertain, or orbit blocks purchase/task flow |

## WFX-12 — Atmospheric System

| Field | Contract |
|---|---|
| Job / payoff | Coordinate fog, rain, steam, god rays, grain, aurora, light shafts, or depth haze into one coherent weather/light system; creates place and emotional continuity |
| Budget / maturity | M3 ≤2 restrained layers; M4 remains budget-bounded. CSS/Framer = AVAILABLE; media/canvas = PROGRESSIVE; GPU atmosphere = DEPENDENCY-GATED/RESEARCH-ONLY by rung |
| Backend rungs | B0 composed static light/fog/grain; B1 CSS/Framer/media atmosphere = AVAILABLE/PROGRESSIVE; B2 WebGL2 atmosphere = DEPENDENCY-GATED; B3 compute atmosphere = RESEARCH-ONLY. |
| Full / Lean / Still | Full M4: ≤3 atmospheric layers and still within the page cap of 5 concurrent moving elements. Lean: one motion layer + static grain/depth. Still: composed static light/fog/grain |
| Recovery | Each layer can fail independently; remove the most expensive foreground/weather layer first, then encoded media, while scrims and B0 remain |
| A11y / static | Atmosphere never lowers 4.5:1 at the brightest frame, hides focus, simulates flashes, or crosses copy aggressively; Pause Effects freezes all continuous layers |
| Implementation | Transform/opacity layers; animate pre-rendered glow opacity, not large box-shadow/filter/blur; coherent light direction; pause/decode/dispose lifecycle per §3 |
| Wrong tool | “Premium” means piling on glow/fog, layers have no world-DNA job, or a single art-directed still carries the atmosphere better |

## WFX-13 — Living Data

| Field | Contract |
|---|---|
| Job / payoff | Let real values drive supplemental form, light, density, or motion so evidence feels alive; creates relevance and trustworthy momentum |
| Budget / maturity | M2+ · Victory/table authority = AVAILABLE; supplemental SVG/canvas mapping = PROGRESSIVE; GPU sculpture = DEPENDENCY-GATED and M4-only |
| Backend rungs | B0 timestamped accessible table/summary; B1 Victory/SVG supplemental form = AVAILABLE/PROGRESSIVE; B2 WebGL2 sculpture = DEPENDENCY-GATED and supplemental; B3 GPU sculpture = RESEARCH-ONLY. Data truth remains B0/B1. |
| Safe exception | Product/product-adjacent surfaces retain a canonical Victory chart or accessible table. Generative art is supplemental and may not alter scale, baseline, certainty, comparison, missingness, or meaning |
| Full / Lean / Still | Full: batch visual updates ≤2Hz unless the real source is slower; no task >50ms. Lean: ≤0.2Hz or on committed samples. Still: timestamped snapshot + authoritative chart/table |
| Recovery | Stale/disconnected/error states are explicit with last-updated time; never invent, interpolate as fact, or hold the last value as “live.” Supplemental art may disappear without losing evidence |
| A11y / truth | DOM table/summary names units, time range, source, missing values, and uncertainty; live regions announce only meaningful committed changes, throttled; color/motion never sole encoding |
| Implementation | Version and test the data→visual mapping; clamp domains transparently; preserve zero/negative/outlier semantics; pause offscreen; use Victory for every product chart |
| Wrong tool | Data is mock, decoration would imply false precision, the mapping cannot be explained in one sentence, or spectacle competes with the decision the data supports |

## 4. Frontier annex — experiments, not inherited permission

| Lane | Research contract | Required fallback |
|---|---|---|
| **F1 WebGPU compute worlds** | Large swarms, procedural terrain/cities, fluid/SDF effects; B3 only after error scopes, `device.lost`, deterministic seed, budgets, and repeatable snapshots | B2 simulation → B1 encoded result → B0 still |
| **F2 Browser-native continuity** | View Transitions for navigation-level continuity; CSS scroll/view timelines behind feature detection; never essential to interruption, cancellation, or reading | Final DOM state immediately |
| **F3 Worker rendering** | OffscreenCanvas/module worker only when profiling proves main-thread relief; bounded/coalesced messages, explicit worker/context teardown | Main-thread Lean renderer or B1 |
| **F4 Photoreal spatial capture** | Gaussian-splat portals for authorized environments only; consent, location/likeness review, progressive LOD, transfer/memory manifest | Pausable video → licensed still |
| **F5 Frame-synchronous media** | `requestVideoFrameCallback()` for decoded-frame sync; WebCodecs only for real low-level transformation, never ordinary playback | Standard `<video>`/frame sequence → poster |
| **F6 WebXR portal** | Sean-approved campaign/installation only; explicit Enter XR, secure-context permission/capability checks, privacy/comfort review, visible exit; no conversion gate | Conventional web experience at B2/B1/B0 |

## 5. Official research anchors (verified 2026-07-12)

- GPU/device loss/error scopes: [W3C WebGPU](https://gpuweb.github.io/gpuweb/) and [WGSL](https://gpuweb.github.io/gpuweb/wgsl/).
- Production/frontier renderers: [Three.js WebGPURenderer guide](https://threejs.org/manual/en/webgpurenderer), [R3F React pairing](https://r3f.docs.pmnd.rs/getting-started/introduction), [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), and [TypeGPU](https://docs.swmansion.com/TypeGPU/).
- Browser-native motion/media: [View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [scroll-driven timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API), and [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- Type/audio/accessibility: [variable fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts/Variable_fonts), [Web Audio usage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API), [autoplay policy](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- Frontier/QA: [W3C WebXR](https://www.w3.org/TR/webxr/), [Inria 3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/), [Playwright Clock](https://playwright.dev/docs/clock), [reduced-motion emulation](https://playwright.dev/docs/api/class-page#page-emulate-media), and [visual comparisons](https://playwright.dev/docs/test-snapshots).

These sources guide a spike; they do not certify Swan compatibility. Promotion still requires the license ritual, dependency review, deterministic manifest, forced-loss tests, browser QA, and zero unresolved P0/P1 findings.

```

### FILE: docs/ai-workflow/design-brain/field-techniques.md
```markdown
# Field Techniques — harvested production pipelines

- **Status:** DRAFT — accumulating. Sean supplied 6–7 source transcripts on 2026-08-11; synthesis deferred until all are captured.
- **Purpose:** concrete, costed, end-to-end asset pipelines that the Swan Brain can execute. These are *techniques*, not doctrine. Router LAWS still govern whether a technique is permitted on a given surface.
- **Law-split note:** several techniques here are ON-LAW for general client work and OFF-LAW for SwanStudios. That distinction is the whole reason the universal-vs-Swan law split (B5) matters. Do not auto-apply.

---

## T1 — Animated Dithered Hero (frame-stepped procedural background)

**What it produces:** a full-bleed animated background with a lo-fi black/white dot (dither) treatment, deliberately stepping between frames rather than playing smooth, plus pointer-reactive effects. Reads as if every pixel is computed live. It is not.

### The pipeline

| # | Step | Settings that matter |
|---|---|---|
| 1 | **Generate a still** (GPT-Image-2 / Nano Banana / Nano Banana Pro, via an aggregator) | **Widescreen, NOT 1:1** — non-negotiable, the whole effect is a wide plate. **1K, not 2K** (2K is an upsell; dithering destroys the extra detail). **Batch 2+** — never judge from one generation. |
| 2 | **Still → video** (image-to-video model; transcript's "Cense 2.0" ≈ **Seedance 2.0** `[HYPOTHESIS]`) | **4 seconds** is enough (cost control — duration is the main cost driver). 16:9. 1080p; 720p acceptable; **480p is not**. |
| 3 | **Video → frame sequence**, replayed at **~11 fps** | The staccato frame-jump **is the aesthetic**, not a defect. Smooth playback kills it. |
| 4 | **Apply dithering** | Ordered/error-diffusion dot matrix — the technique old displays used to fake tonal detail. |
| 5 | **Mount as background** + pointer-reactive layer | The pointer effect is what sells "live render." Without it the plate reads as a video. |
| 6 | **Deploy static** (Vercel/Netlify) | Static hosting is free; no server needed for any of this. |

### Why image-first (the load-bearing economic insight)

> Generate ~20 stills cheaply, pick the best ONE, then spend video budget only on the winner.

Image-to-video output **conforms to the input image's composition far more reliably** than text-to-video. Stills are cents; video is dollars. This inverts the naive "just generate video" approach and is the single most transferable idea in T1.

**This directly validates B2's convergence loop** — and answers Kimi's "no cost model" objection with a real one: converge on cheap stills, commit expensively only once.

### The performance cheat (highest-value finding for Swan)

Frame-stepping + dithering produces a **cinematic, apparently-procedural surface at near-zero GPU cost** — no WebGL, no per-pixel shader, no physics sim. It is a pre-rendered sprite sequence wearing a costume.

Relevance to LAW 6 (two-speed motion) and the in-app distraction caps: this is a rare technique that delivers high visual payload while staying trivially cheap and easy to pause offscreen. Worth keeping in the toolkit specifically *because* it is fake.

### Style findings

- **Grand/Renaissance/fresco subjects work best** — grandiosity pairs well with subtle motion. Gothic rose windows, colossal architecture, armadas, falling ash.
- **Warm pastel palettes** read well under dithering.
- Slow zoom / slow drift / falling particulate are the motions that survive frame-stepping. Fast action does not.
- Moderation filters trip on anatomical/musculature language even for animals — reword rather than fight it.

### Swan doctrine check — READ BEFORE USING

| Check | Verdict |
|---|---|
| LAW 1 (realism as substrate) | **CONFLICT.** Dithering is an overt stylization layer, not physics-honest light. |
| LAW 3 (kill-list) | Not a listed violation, but lo-fi retro-VHS sits against the crystalline-luxury brand. |
| LAW 6 (motion budget) | **Strongly compatible** — cheap, pausable, GPU-light. |

**Ruling: OFF-LAW for SwanStudios product surfaces. ON-LAW for general/client work.** File under the portable/universal half of the law split. Do not apply to Swan surfaces without Sean's explicit direction.

### Swan-native adaptation `[HYPOTHESIS]`
The frame-step + procedural-overlay *mechanism* is separable from the dither *look*. A Swan-legal variant would keep step-frame economics and pointer reactivity but swap the dot matrix for an on-law optical treatment (caustics, refraction, dispersion per LAW 4). Untested.

---

## T2 — Scroll-Bound Macro Journey (the C13 build recipe)

**This is not new doctrine.** CLAUDE.md rule 40 already names the Extreme Macro-Journey + **C13 Scroll-Bound Macro Journey** as Swan's taste ceiling *above* Mobbin, adopted 2026-07-22 from a Kimi-K3 scroll-film transcript. T2 is the **missing implementation contract** for law Sean already holds.

### What the brain ALREADY has `[VERIFIED]`
- `worlds.md:45` — **WFX-05 Scroll-Scrubbed Frame Sequence — PROGRESSIVE**; B0 poster / B1 CSS-SVG-video / B2 optional WebGL2 depth planes.
- `adapters/cinematic-site-generator.md:35` — "Scroll-scrubbed video uses the extracted-frames + `<canvas>` + rAF technique; frames are an asset-plan line item, not an afterthought."
- `:51` — best single frame becomes the tier-2 poster **and** the scroll-scrub source.
- `:40` — "loops 4–8s for headers, 10–20s scroll-scrubbed."

### THE GAP `[VERIFIED]` — frame interpolation is absent
Grep across all of `docs/ai-workflow/` returns **zero** hits for motion-domain interpolation. Every "interpolation" hit is styled-components string interpolation (rule 43). Rule 40 mandates a **60fps scrub gate** but the brain never says *how to reach it*.

**The answer T2 supplies:** video models output **30fps**. At 30fps a scroll-scrub shows every discrete frame — visibly choppy, and the #1 reason these sites feel amateur. Fix: **AI frame interpolation 30 → 60fps** (transcript used ByteDance AIGC) *before* frame extraction. Doubling frames makes "the vast majority of scrolling issues disappear."

> This is the single highest-value line in the transcript. It is a one-step post-process that separates a $100k scroll site from a janky one, and the Swan Brain currently does not mention it.

### The pipeline

| # | Step | Detail |
|---|---|---|
| 1 | **Ideate broadly** | Ask for **10 radically different** scroll-driven concepts. AI is cheap at ideation; the human contributes *taste* by picking. Matches rule 40's 8–12 breadth pass. |
| 2 | **Concept → video prompt** (2-stage) | Feed the chosen concept + **a worked example of the detail level wanted**. Few-shot on prompt *style*, not just content. |
| 3 | **Generate the journey** | Single continuous **8-second extreme macro journey**. 16:9 desktop / 9:16 mobile. 1080p. **Batch 3 simultaneously** — satisfaction with any single AI output is only ~30–50%. |
| 4 | **Interpolate 30 → 60fps** | ← the missing step. Non-optional for scrub quality. |
| 5 | **Extract frames → bind to scroll** | Scroll position drives the playhead. Up = forward, down = back. |
| 6 | **Add tour mode** | An autoplay/"flow tour" control so users can progress without scrubbing. Rule 40 already requires this gate. |
| 7 | **Deploy static** | Free hosting. |

### The C13 principle, confirmed by a practitioner
> "Despite the fact that this website seems like there's a lot of motion going on… it's actually just the video in the background. **The creative is really the heavy lifter of this site.**"

That is rule 40's "the creative IS the page," independently arrived at. The interaction layer is comparatively trivial; **budget accordingly** — spend on the 8 seconds of creative, not on the scaffolding.

### Swan doctrine check
| Check | Verdict |
|---|---|
| LAW 1 | **ON-LAW** — macro-real footage is physics-honest substrate; the journey is the one impossible phenomenon. |
| Rule 40 | **This IS the mandated taste ceiling.** Fully aligned. |
| LAW 6 | Public/marketing surface only. Never under in-app data surfaces. |
| Reduced motion | **Gap to close:** needs a designed static frame + tour-mode fallback (LAW 5 R1 — the CSS-only guard is a lie for JS scroll animation). |

**Ruling: ON-LAW and highest priority.** This is the technique that answers "my homepage is weak."

---

## T3 — Mobbin MCP depth + the PRD-first sequencing

Directly addresses Sean's complaint and names the Claude Design benchmark.

### The three tools = three distinct research modes `[VERIFIED against tool schemas]`

| Tool | Returns | Use it for | Hard limit |
|---|---|---|---|
| `search_screens` | Full screenshots | Whole design directions, competitor surfaces | **30/call**, `mode: deep`, `exclude_screen_ids` to page deeper |
| `search_sections` | Website sections | Named page regions — pricing, hero, footer | **30/call**, `page` param paginates |
| `search_flows` | Multi-step journeys | Onboarding, checkout — *pull a named app's flow* | **10/call**, up to `page: 20` |

**Corpus:** ~500k+ screens. Pro plan ≈ $45/mo — Sean is already paying.

**So 50+ references is trivially reachable**: two `search_screens` calls hit 60. The Six-Facet Sweep (~120–180) is well inside the API's capability. **The constraint was never the tool — it was P-mode's one-query doctrine.**

### The practitioner's three uses, which validate the Six-Facet Sweep
1. **Directions** — "three different *fundamental directions* for the same app. These aren't different versions of screens — these are different design directions." → the Ideation Gate.
2. **Named-flow adoption** — find a specific app's onboarding you admire, pull *that* flow, adapt its question order and structure (not its aesthetics).
3. **Component atoms** — "select a time picker component that's highly rated and use it to mock a feeding schedule." → facet 6.

### Cross-industry transfer (validates facet 4)
> "All of this was built out based on inspiration of a design from a **completely different industry**."

The adjacent-excellence facet is the anti-generic lever, confirmed in practice.

### The PRD-first sequencing law — the biggest process finding
```
PRD (what it does)
  → Requirements (jobs the user must accomplish)
    → UX DIRECTION (forum? chat? proactive vs reactive?)   ← most-skipped step
      → screen prompts
        → design tool, iterate for hours (empty states, affordances)
          → pull designs BACK into the PRD so schema/data-models/backend reference them
```
> "A lot of people skip that step and then are very unhappy with having an app that doesn't feel like it does the thing they intended. **That is always going to happen if you skip past the product decisions and hop straight into designing.**"

This maps onto Swan's existing chain — `grill-me` (rule 64) → `chromie` (rule 65) → design router — and supplies the missing **round-trip**: designs must flow *back* into the data contract. Swan's BUILD-EXACT already demands "every datum traces to a named API + model"; T3 says decide that *with* the design, not after.

### Honest caveat that matters for Swan `[VERIFIED — practitioner statement]`
> "Their **website** section — I don't think it's super good. They don't have a lot of web app examples. But if you are building a **mobile** app, this is a really nice place."

**Mobbin is mobile-strong and web-weak.** SwanStudios is web-first. Implication: for web surfaces, `platform: "web"` results will be thinner, and the Six-Facet Sweep must lean harder on `search_sections` and on cross-platform transfer (mobile interaction patterns → web) rather than expecting rich web-screen coverage. This tempers the expected ROI and should be said out loud rather than discovered later.

### Claude Design connection
MCP connectors added in **Claude Desktop** become available in **Claude Design on web** via *manage connectors*. That is the integration path for Sean's "integrate the Claude Design like I was dreaming."

---
## T4 — *(awaiting transcript)*
## T4 — The Recursive Variant Tournament

> "Scaffold structure **A**. Have AI turn that into **A, B, C, D**. Use your intuitive feel on which UX is best. Take the winner, turn *that* into variants. Winner again, variants again. **Do this two or three times.** It's just **trading tokens for quality**."

**Why this matters:** it independently confirms Kimi K3's hostile-review call to **cap the convergence loop at ~3 rounds**. My plan said "loop forever until Sean says stop"; Kimi called that "an invoice generator"; a working practitioner independently says 2–3. **Two independent sources, same number → adopt a 3-round default**, escalating to Sean with two finalists at round 3.

Shape matters: it is a **tournament** (branch → judge → branch from winner), not linear revision. AI supplies breadth; human taste is the judge function.

---

## T5 — Claude Design: the native interrogation loop + the portable brand kit

Sean: *"We can integrate the Claude Design like I was dreaming."* This is that path.

### Sean's "ask questions until it gets it right" ALREADY EXISTS natively
Give Claude Design a vague prompt and **it returns a questionnaire** — what is this page for, what is the primary CTA, etc. Answers append to the prompt as the spec, then it designs.

**Implication:** do NOT rebuild the interrogation in B2 Round 0. Route through Claude Design's native questionnaire, supplementing with `grill-me` depth only where it is too shallow. Removes an entire module from the build.

### Reference input ladder
| Input | Fidelity |
|---|---|
| Pasted screenshot (Pinterest) | Gets the *vibe*; fonts and tokens drift |
| **Figma file** (`File → Save local copy` → upload `.fig`) | **Near 1:1 — carries real design tokens** |

Keep one consistent style per Figma project or the style read gets muddied.

### Three edit modalities — use the cheapest that works
1. **`edit`** — direct manual property change (border → 0). Surgical, zero tokens.
2. **`comments`** — select a div, describe the change in words.
3. **`tweaks`** — page-level directives ("make the page mobile responsive").
Plus **image-driven tweaks**: paste a reference footer → "make the footer look more like this."

### Style-transfer by named designer — BYQ MCP (`byq.supply`)
Component library **plus named creator styles**. Redesign in a named style while explicitly listing what to **KEEP** (hover shadow, badge position, grid, footer layout). The keep-list is what stops style transfer from destroying working structure.

### Mobbin inside the design loop
Circle/annotate a section → *"use the Mobbin MCP to find three other variants for this section"* → pick → *"make it look more like this in terms of **spacing and layout**."*

Note the discipline: borrow **spacing and layout, not aesthetics.** That is exactly the principles-only intake Fable's D4 permits.

### MagicPath (`magicpath.ai`) — side-by-side variant visualization
"Figma for Claude Code." Render N variants **simultaneously**, pick one, push the winner back. Solves T4's judging problem: you cannot judge variants you cannot see at once.

### THE FINALE — the portable brand kit (`design.md` + `PRD.md`)
> "Create a **design.md** and a **PRD.md** of this design so I can open any new project and it uses the exact same design style — include the image style too."

New project → drop in the two files → *"create a portfolio page for a horror writer"* → same components, fonts, sections, image style.

**Swan is already ahead here, and this validates the architecture.** `design-brain/design.md` IS this file and is already canonical. What T5 adds is the **portability pattern**: a droppable universal skeleton + swappable brand layer. That is exactly Sean's "versatile, not just one thing" ask and the concrete form of the **law-split** both Kimi and HY3 demanded. **Best-evidenced module in the plan.**

Also: model picker exposes **Fable 5 / Opus 5 / Sonnet / Haiku + an effort slider** (matches rule 71 routing). Export via `share → more formats → send to Claude Code`, which calls the Claude Design MCP to import into a repo.

---

## T6 — Codex as art director: Three.js, shaders, and the reference ladder

### THE REFERENCE QUALITY LADDER — most transferable idea across all six transcripts
> "The most important thing is **the references**."

| Tier | Reference supplied | Result |
|---|---|---|
| **S** | **URL + GitHub repo + original prompt + live demo + tech stack** | Agent reads real source; near-exact reproduction |
| A | URL of the target | Agent inspects the live thing |
| B | Screen recording | Motion captured, structure inferred |
| C | Screenshot only | Static — **this is where vector-slop begins** |
| D | Hand-written prompt, no reference | Worst |

**Adopt as a Gate-0 requirement:** every net-new surface declares its reference tier; below B on an *awe* surface needs justification. Cheap, mechanical, and it explains why screenshot-only prompting yields generic output.

### Recreate → then REINTERPRET (the anti-plagiarism law)
> "You have to create **something new out of something previously created**… make sure the new thing is **very different**."

Reproduce to understand the *mechanism*, then deliberately diverge. Aligns with Fable D4 and LAW 11.

### Image-first, then animate — THIRD independent confirmation
Static backgrounds → approve art direction → *only then* spend on video.
**Cost ladder:** generate at **480p first (~$0.10–0.50)** → approve → **upscale to 1080p**. Finished video ≈ **$1–2**. Never generate full-res while exploring.

### Anti-AI-slop rule: transparent PNG, never vector
> "AI likes to create really bad illustrations in **vector** formats. Instead use a **transparent PNG** — it can sit on top of anything: giant typography, or a video background."

Concrete, testable → add to the kill-list. Screenshot-only references trigger the vector failure mode.

### Single-file HTML discipline
Prototype in ONE HTML file — "very manageable, drag and drop into any project." **Swan caveat: prototyping only.** Production still obeys LAW 9 (styled-components, 300-line cap). Ideal for B2's throwaway convergence artifacts.

### Effects libraries worth registering
- **Canvas UI (`canvasui.dev`)** — renders HTML *in canvas*, enabling shader effects over live HTML (water droplets, cloth). "Ultra-modern" without a full Three.js scene.
- **`shaders.com`** — MCP or copy-paste prompt.
- **Higgsfield MCP as art director** — picks the model per task so you stop chasing model churn; confirms credit cost before each spend.

### Swan doctrine check
| Check | Verdict |
|---|---|
| Reference ladder | **ADOPT** — universal, free, mechanical |
| Image-first → video | **ADOPT** — triple-confirmed |
| Transparent PNG over vector | **ADOPT** into kill-list |
| Shader overlays | **Conditional** — water/refraction is on-law (LAW 4 optics); cloth is decorative, needs justification |
| Single-file HTML | **Prototype only**, never production |

---

## CONVERGENCE — what independent sources agree on

Highest-confidence findings, because they were reached separately:

1. **Image-first, then video.** (T1, T2, T6 — three sources.) Stills are cents, video is dollars; image-to-video conforms far better than text-to-video. **Settled.**
2. **Batch and select; never judge from one output.** (T1 batch 2, T2 batch 3, T4 tournament, T5 MagicPath.) Per-generation satisfaction is ~30–50%.
3. **2–3 tournament rounds, then stop.** (T4 practitioner + Kimi K3 hostile review, independently.) **Overrules my original "loop forever."**
4. **The creative is the heavy lifter.** (T2, T6.) Budget the 8 seconds of hero creative, not the scaffolding.
5. **Reference quality determines output quality.** (T3 cross-industry, T5 Figma>screenshot, T6 explicit ladder.) Weak reference → generic output, every time.
6. **Scroll drives a video playhead.** (T1, T2, T6.) Already Swan law as C13 / WFX-05.

---

## THE ANSWER TO "MY SITES LOOK NOTHING LIKE THIS"

Sean's own diagnosis, resolved against evidence. The gap is **not** taste, and **not** missing doctrine — Swan already holds C13, WFX-05, the Enchantment Ratio, and the taste ceiling as law. The gap is **four missing mechanisms**:

1. **No custom creative.** Every site in these transcripts is carried by a bespoke 8-second generated hero. Swan generates almost none — `generate-image.mjs` is a 3-line style string, and there is no video-gen in the design loop. *The creative is the heavy lifter, and Swan isn't lifting it.*
2. **No frame interpolation.** WFX-05 scroll-scrub exists in doctrine; the 30→60fps step that makes it smooth does not. Without it, scrub is visibly choppy — the exact "weak" feeling.
3. **No reference depth.** P-mode's one-query cap starves every surface of the references that determine output quality (finding #5 above).
4. **No convergence in pixels.** Swan converges in React, which is ~100× more expensive per iteration, so iteration stops early and the first mediocre draft ships.

All four are mechanism gaps, all four are cheap to close, and none require changing a single LAW.


```

### FILE: docs/ai-workflow/design-brain/experience-mode.md
```markdown
# experience-mode.md — M4 Licensed Experience Lane

- **Date:** 2026-07-12 · **Author:** Fable via builder agent, per `SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md` · **Status:** CANONICAL within Design Brain scope
- **Authority:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` > `design.md` > this file. `techniques.md`, world recipes, adapters, routers, and builders are subordinate.
- **One law:** M4 is a licensed lane beside Swan’s restraint system. It does not loosen that system, inherit into product work, or turn spectacle into a default.

---

## 1. Authority reconciliation and namespace firewall

M4 exists only because both authoritative visual source documents contain narrow delegation pointers to this file. Those pointers permit a larger cinematic budget on eligible non-product experiences and Sean-approved Swan marketing/brand work. They do **not** change M0–M3, product surfaces, calm zones, Crystalline Swan tokens, Dual-Button Glow, data truth, accessibility, performance, privacy, or approval law. If this file conflicts with either source, the source wins and the M4 proposal fails closed.

| Namespace | Meaning | Never confuse with |
|---|---|---|
| `M0–M4` | Motion/experience budget | Device capability or Hermes effect tier |
| `Full / Lean / Still` | Runtime quality mode; reduced-motion forces Still | Surface license |
| `B0–B3` | Rendering rung from semantic poster to frontier spatial | Design approval |
| `WFX-*` | Visual technique ID from `techniques.md` | Permission to use it |
| Hermes `T0–T4` | Command-effect/safety tier | Visual intensity |

## 2. Experience budgets

| Budget | Intent | Ceiling |
|---|---|---|
| **M0 Static** | Authored composition without nonessential motion | B0 story, still media, standard focus/response state |
| **M1 Calm** | Operational feedback only | Response motion ≤200ms on Hermes/calm surfaces; no ambient/narrative effects |
| **M2 Editorial** | Restrained reveal/media continuity | Installed/browser-native effects; no spatial scaffolding; task clarity remains dominant |
| **M3 Cinematic** | Source-document cinema with restraint | Existing caps: one surgical spatial accent, ≤2 pins, 8–14vh, ≤3 concurrent moving elements |
| **M4 Experience** | A page behaves as a deliberately authored world | Only after the license ritual; expanded caps in §6; never “unrestricted” |

M4 is not “more effects.” It is a complete B2 story, world recipe, psychology receipt, backend-loss plan, and control/QA contract where every effect has a narrative, information, or emotional job. A proposal that only wants extra glow, particles, or scroll length remains M3 and subtracts the excess.

## 3. Surface licensing table

**Firewall invariant: LIVE M4 NEVER on product, checkout, onboarding, Swan Coach, authentication, Hermes Operations Center, or any live operator/command surface.** Only the flattened B0/M2 alternatives named below may cross those boundaries.

| Host surface | Live M4 | Palette law | What is allowed instead | Approval |
|---|---|---|---|---|
| Product dashboards, client/trainer/admin workspaces, progress/logging surfaces | **NEVER** | Law A | Inert B0 artifact poster; a specific gallery may use user-started, pausable prerecorded M2 preview | Normal product doctrine |
| Storefront, cart, checkout, billing, package purchase | **NEVER** | Law A | Product imagery/poster and ordinary M2 media only; price, terms, and purchase controls stay calm DOM | Normal money-path gates |
| Swan Coach and Coach Command Center | **NEVER** | Law A | B0 poster/thumbnail only when evidence/content requires it; no World Engine chrome | Product/auth/approval doctrine |
| Onboarding, forms, consent, authentication | **NEVER** | Law A | M0–M2 task feedback; no cinematic pin, reactive atmosphere, or live spatial module | Normal product doctrine |
| Hermes Operations Center and all live operator/command surfaces | **NEVER** | Cyberforest M1 only | Neutral receipt thumbnail or inert B0 evidence poster; no World Engine styling, ambient loop, or prerecorded spectacle | Hermes bridge + adapter |
| Swan marketing/landing page | Eligible per page | **Law A only** | M2–M3 default; M4 only for the approved page | Sean’s explicit per-page approval |
| Swan brand film or campaign experience | Eligible | **Law A only** | M0–M3 if ritual or budgets fail | Sean’s explicit campaign approval |
| Non-Swan campaign microsite or client/agency demo | Eligible | Law B allowed; Law A when contract requires | M0–M3 fallback | Named owner/client approval plus asset rights |
| Local ignored World Factory output | Eligible for proof | Law A or B per manifest | No production promotion | Sean initiates run; proof boundary only |

Law A keeps all UI chrome, text, buttons, focus, panels, and glow on Crystalline Swan tokens while the world supplies setting and atmosphere. Law B uses a curated native palette only on licensed non-Swan outputs. A Law-B world requested for Swan is translated through Law A; there is no exception. The retired Galaxy-Swan hexes remain banned as positive assignments.

## 4. Host inheritance and non-inheritance

License follows the **live host**, not the import name or size of a module.

1. A live M4 module on an eligible non-product host promotes the entire host to M4 for license, palette, performance, accessibility, provenance, approval, QA, rollback, and incident handling. A footer-sized WebGPU canvas still promotes the host.
2. A product, checkout, Coach, onboarding, authentication, or operator host refuses a live M4 module at the boundary. It cannot “inherit just the effect,” sandbox it inside a card, iframe it as live decoration, or claim the rest of the page remains M2.
3. A flattened B0 poster does not promote the host because it contains no live M4 machinery. A product gallery’s prerecorded M2 preview also does not promote when it is an ordinary responsive media element, poster-first, user-started, pausable, muted unless audio is separately started, and contains no live WFX, scroll orchestration, tracking, or conversion logic.
4. Embedding an eligible M4 experience in an iframe does not erase the child’s M4 obligations. The child remains M4 and the parent may link to it only where the parent’s license allows; prohibited hosts do not auto-run it.
5. World Engine styling never inherits into navigation, consent, pricing, legal, error recovery, or shared product components. Promotion of a proof into any real host starts a new router/license/approval/QA cycle.

## 5. Eligibility decision — fail closed

An M4 request proceeds only if all answers pass in order:

1. **Surface:** the exact host is in an eligible §3 row. If prohibited, refuse M4 and offer M3 or a B0/M2 preview.
2. **Purpose:** the experience has one logline, one visitor transformation, one proof spine, and one unique conversion action. Spectacle alone fails.
3. **World/palette:** stable World ID, catalog version, suitability receipt, and Law A/B verdict are recorded.
4. **Story:** the B2 four-act arc and complete scene ledger exist, including static frames and the Act 3→4 peak/end.
5. **Ethics/truth:** psychology hypotheses, proof rights, data truth, and accessibility exclusions pass. No dark pattern, strategic disfluency in task-critical content, or conversion guarantee.
6. **Technology:** WFX maturity/dependency manifest and B0–B3 ladder show a complete story at every eligible rung. A research lane is never the only path.
7. **Operations:** asset provenance, performance plan, controls, QA owner, approval evidence, rollback, and expiry-on-material-change are complete.

Missing, ambiguous, or stale evidence means **M4 NOT LICENSED**. Do not silently downgrade the paperwork while leaving the effects.

## 6. Eligible relaxation table

These are ceilings, not targets. The scene ledger must justify every increase and the Full trace must pass before it is kept.

| Constraint | M0–M3 source rule | M4 licensed ceiling | Required justification |
|---|---|---|---|
| Spatial role | One short/surgical 3D accent; never page scaffolding | One spatial canvas may scaffold an eligible experience | B1/B0 parity, one-canvas plan, dependency/loss/disposal evidence |
| Page-level signature | One signature moment | One page-level crescendo plus one subordinate focal beat per act | Each subordinate beat serves that act and cannot compete with the crescendo |
| Pinned scenes | ≤2 | ≤4 | Each pin keeps foreground context while background proves something; release point named |
| Total scroll travel | 8–14vh | ≤20vh | Every additional vh maps to a ledger beat; no filler travel |
| Parallax | Recommended 0.2–0.4; hard ceiling 0.6 | **Unchanged: hard ceiling 0.6** | Motion comfort and reduced path pass |
| Concurrent moving elements | ≤3 per viewport | ≤5 | Attention map and frame trace pass; each element has a named job |
| Properties per element | ≤2; transform/opacity default | **Unchanged: ≤2** | Any exception follows the narrow WFX-06 or WFX-13 law |
| Atmospheric layers | M3 ≤2 restrained layers | M4 ≤3 moving atmospheric layers within the 5-element cap | Brightest-frame contrast, overdraw, and Pause Effects pass |
| WFX-12 intensity | Restrained | Budget-bounded | “Unlimited atmosphere” is invalid wording and an automatic REVISE |

If the Full mode needs more than a ceiling, redesign or cut. Sean’s taste approval does not waive performance, accessibility, or product licensing.

## 7. Never-relax law

Every M4 host retains all of the following:

- Complete B0 semantic story and first-frame poster; real DOM owns heading, copy, navigation, proof, CTA, pricing/legal/form state, and one unique conversion action. The same action may repeat only at Act 3→4 and page end.
- Full/Lean/Still modes; `prefers-reduced-motion: reduce` forces the complete Still story on first paint; video/canvas do not autoplay there.
- WCAG 4.5:1 text contrast at the brightest moving frame; visible 2px focus; logical source/tab order; 44px touch targets with usable spacing; color and motion never sole signals.
- No autoplay audio; no more than three flashes in any one-second period; no focus capture, keyboard trap, scroll hijack, forced pointer lock/fullscreen, or conversion/content gate.
- Visible Pause Effects and Skip controls wherever §10 requires them; when audio is included, visible user-started Play/Mute/Stop controls and meaningful media alternatives. Silence-first hosts do not add fake audio controls.
- Poster-first p75 targets LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; observed adaptive quality; off-viewport/hidden-tab pause; complete teardown.
- Licensed/consented asset provenance, likeness/location review, privacy, no PII/secrets in prompts or manifests, real-data truth, rollback, and no automatic production promotion.
- Swan/React hosts remain styled-components-first and retain rule 43's `css`` ` helper for interpolated shared fragments. Licensed non-Swan or non-React hosts stay existing-stack-first with CSS custom-property/token discipline; Crystalline Swan precedence still governs every Swan host.

## 8. License ritual and durable receipt

Before implementation, one receipt records all of these as evidence, not aspiration:

1. Exact host/surface and §3 license verdict; owner; audience; production/experiment boundary.
2. World ID, catalog version, roulette seed/eligibility rejects when used, palette law, and one-sentence logline.
3. B2 acts, scene ledger, one proof spine, one unique action, Act 3→4 peak, and static storyboard.
4. Psychology receipt: hypothesis IDs, audience/context, KPI, counter-metric, falsifier, stop condition, accessibility exclusion.
5. WFX IDs with maturity and dependency truth; explicit wrong-tool/subtraction decisions.
6. B0–B3 ladder, initial rung, forced quality overrides, loss matrix, and no-canvas ownership check.
7. Asset/provenance manifest: source/generator and version, prompt/source, rights/consent/likeness/location status, timestamp, hash, responsive derivatives, poster.
8. Full/Lean/Still budgets; LCP/INP/CLS plan; pixel/draw/memory/frame allocations; lazy boundaries; pause/teardown owner.
9. Pause, Skip, audio, keyboard, screen-reader, forced-colors, contrast, and reduced-motion plans.
10. Sean approval line where §3 requires it; named QA/review owner; rollback commit/artifact; license invalidation triggers.

Approval is scoped to that host, catalog/recipe version, palette law, asset set, WFX manifest, and action. It expires on material change: new host, live effect, dependency/backend, data source, asset rights, interaction, conversion action, or budget overage. A copy to a new URL is a new license decision.

## 9. Runtime quality and adaptive-performance law

Selection precedence is: reduced-motion → Still; explicit user Still/Lean/Full choice → upper bound; capability initialization → eligible rung; observed performance with hysteresis → retain or downgrade. Save-Data/slow-network starts at Lean or Still. A user’s Full choice blocks automatic quality promotion above Full but cannot override reduced motion, initialization failure, thermal/battery safety, or a sustained budget breach. After warm-up, each Full window contains exactly 120 consecutive eligible animation presentations. Downgrade after **three consecutive 120-frame Full windows with active deadline/cap breaches**; a window breaches when it records a missed presentation or exceeds the active authored-work/pixel/draw/memory cap. Any animation-related task over 50ms still downgrades immediately. Recover only after ten consecutive clean seconds below 80% of every active cap; allow at most one automatic upgrade per session. The user-selected mode remains the upper bound, and no transition changes meaning.

The `techniques.md` page envelope is binding: B0/CTA use zero 3D/WebGPU bytes. The **Full authored render/main-thread work budget is ≤16.7ms** after warm-up; aggregate work proxies and trace-derived distributions are separate evidence and must retain their true names. Full also stays ≤3.7MP, ≤300 draws, and ≤192MiB. Lean authored work is ≤33.3ms, ≤2.1MP, ≤150 draws, and ≤96MiB. Still has no continuous effect loop. Worlds may set lower ceilings. Quality UI is persistent, keyboard-operable, session-scoped, and describes the current state without shaming the device.

**Channel 1 — presentation cadence.** **rAF callback-to-callback p95 is presentation cadence, not authored work.** MDN documents that rAF generally follows display refresh and its timestamp represents the animation timeline/callback boundary; it does not measure the duration of the authored callback, style, layout, paint, or renderer work ([MDN rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). A numeric Full pass/fail threshold on that cadence distribution is forbidden.

Before a Full trace, collect 120 visible-page rAF intervals while the exact same page is in its authored Still state under the same viewport, browser, build, display, and power conditions. The **Still-mode 120-frame cadence median identifies the refresh quantum** only. The environment must prove **60Hz-or-faster** presentation eligibility for Full. A **missed presentation is any interval ≥1.5x the refresh quantum**. Raw intervals remain raw; there is **no fixed millisecond tolerance**, no baseline subtraction, and no conversion of cadence into authored work. Hidden/unstable calibration invalidates the trace and requires a rerun.

**Channel 2 — authored work.** Capture **Chrome Performance task/style/layout/script deltas plus Long Animation Frame and Long Task evidence** across the same acts and windows. CDP aggregate metric deltas may report aggregate Chrome work-proxy ms/presentation by dividing attributable main-thread scripting/style/layout/render/paint work by eligible presentations. That aggregate is not a per-frame sample and must never be labeled p95. LoAF entries separate script/render/style-layout contributions when supported, while the saved browser trace remains authoritative ([MDN LoAF](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing); [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/reference)).

**B1 qualification requires zero missed presentations, no LoAF/long task, and aggregate Chrome work-proxy ms/presentation under 16.7ms** in the declared proof windows. **A saved DevTools/renderer trace is required to claim p95 and for B2/B3 production promotion**, with GPU/renderer timing, draw/pixel/memory evidence, forced-loss recovery, and renderer-specific bottleneck attribution. B1 aggregate evidence alone never promotes a spatial rung or claims a distribution.

The **raw measurement receipt** preserves ordered raw rAF timestamps/intervals, the Still median/refresh quantum, missed-presentation flags, raw Chrome trace/work deltas, LoAF/Long Task entries, build/route, viewport/DPR/display cadence, browser/device class, visibility, quality/rung, active caps, and every hysteresis decision. Derived cadence and authored-work summaries are stored beside—not instead of—the raw samples; no post-hoc deletion, tolerance, baseline correction, or cross-channel substitution is allowed.

Production monitoring uses **raw unnormalized production RUM**: retain raw observed frame intervals and the declared window/mode/context metadata before aggregation. Never subtract the Still calibration, refresh cadence, or a lab/device baseline from production observations, and never relabel adjusted values as frame time. Calibration is an authoring/QA diagnostic, not a production normalizer.

## 10. Pause, skip, audio, and user control

- **Pause Effects:** required whenever nonessential movement auto-starts, lasts >5 seconds, or runs alongside content. It is visible without hover, 44px, keyboard-operable, and stateful. Pause freezes video, particles, shader time, atmospheric loops, scroll-scrub playback, continuous type, rAF/timers, and generated motion; response feedback may remain ≤200ms. Resume continues coherently, not from a random state.
- **Skip-to-Content / Skip Scene:** the first focusable control before a long/pinned sequence and persistently reachable on touch. It moves focus to the next semantic act/primary content or CTA anchor, releases pins, updates scroll without smooth animation under reduced motion, and never loses history/form state. Each >2vh scene has a scene-level skip or is covered by the global skip.
- **Audio:** only an intentional user action creates/resumes playback or `AudioContext`. Play, Mute, and Stop are separate visible 44px controls with accessible names/states. Hidden tab pauses/suspends; informational sound has transcript/captions; the experience remains complete when audio fails or is muted.
- **Reduced motion:** Still is the authored four-act storyboard, not a blank page or accidental first frame. The runtime does not offer an in-page override that defeats the active OS preference.

## 11. Backend-loss and recovery matrix

| Failure | Required in-place outcome | Forbidden outcome |
|---|---|---|
| B3 adapter/device/pipeline/first-render failure or timeout | Keep B0; attempt approved B2 once, otherwise B1; record rung/reason without device fingerprinting | Blank canvas, reload, repeated prompt, hidden CTA |
| B3 `device.lost`, error-scope, or uncaptured error | Freeze to poster/B1, destroy old resources, fall to B2/B1; recovery only through a fresh bounded init | Infinite reacquire loop, parsing device messages for identity |
| B2 import/model/WebGL context loss | B1 poster/video immediately; dispose/release; optional single controlled restore test outside critical interaction | Copy/navigation/action inside lost canvas |
| Worker/OffscreenCanvas failure | Terminate worker; main-thread Lean path if measured, otherwise B1 | Unbounded message replay or duplicate loops |
| B1 image/video/decode/network failure | B0 still/gradient with stable dimensions | Broken-media icon, layout collapse, LCP wait |
| Performance breach | Full→Lean→Still with hysteresis; preserve act/CTA/focus and announce only if user-facing quality state changes | UA sniffing, oscillation, disabling content |
| Pause, hidden tab, off-viewport, unmount | Stop/suspend appropriate work; on unmount remove and dispose everything | Hidden ticking loops, orphan audio, workers, observers, GPU resources |
| JavaScript unavailable | Complete B0 story and working essential links/forms where server behavior permits | “Enable JavaScript to understand this page” |

Loss QA forces each reachable row. Simulation that a tool cannot perform is named `[UNVERIFIED]` and blocks promotion of that rung; it does not block the lower verified experience.

## 12. Accessibility, truth, and provenance gates

- Canvas/SVG/video used decoratively is hidden from assistive tech; informative visuals have a concise DOM summary plus table/transcript/controls. Screen readers encounter final text and committed state, not animation frames.
- Brightest-frame contrast, focus through every pin/act, 200% zoom, forced colors, keyboard-only, touch, screen-reader, reduced-motion, required Pause/Skip, audio Play/Mute/Stop when included, and JS-disabled B0 are all release evidence.
- Living Data follows WFX-13: real source, units, range, last-updated/stale/error truth, Victory/table authority on product-adjacent output, no aesthetic remapping of certainty or scale.
- Asset manifests record source/generator version, prompt/source, license, consent, likeness/location rights, timestamp, hash, derivatives, and fallback. Unproven rights or protected interface/logo/character use blocks the asset.
- No production API, client health/payment data, private identifier, secret, or private screenshot enters a world proof. Microphone/camera/XR/environment access is a separate explicit permission and purpose decision.

## 13. M4 QA, review, and rollback

An M4 host cannot receive APPROVE until it has:

- License receipt and source-authority check; Law-B-under-Swan and any prohibited live embed are automatic REVISE.
- Browser matrix at 375, 414, 768, 1440, and 2560×1440; full QA Gates 1–3 for finalists; 320, 1024, 1280, 1920, 3440, and 3840×2160 where the host can render them.
- Act-boundary and brightest-frame captures; Full/Lean/Still; reduced motion; keyboard/screen reader; required Pause/Skip; audio Play/Mute/Stop when included; overflow; console/network; lazy-load; JS-disabled B0.
- Forced B3 unavailable/failure, B2 unavailable/context-loss where simulatable, B1 decode failure, and quality downgrade without blank output, reload, lost action, or uncaught error.
- Measured LCP/INP/CLS, frame/task/pixel/draw/memory evidence, offscreen/hidden pause, and teardown. Estimates are labeled until instrumented.
- Three repair passes: story/world/anti-cheese; accessibility/performance/loss; originality/differentiation/subtraction. Independent hostile review ends with zero P0/P1.

Rollback removes the live module and returns the same host to its last approved B0/M2/M3 form without changing URL, core copy, action, data, or consent state. A kill switch may flatten M4 to B0/B1, but it may not silently route users to a different offer. Promotion, deploy, or reuse is never automatic.

## 14. Automatic refusal conditions

Reviewers issue **REVISE** immediately for: unlicensed host; live M4 on product/Hermes; Law B under Swan; missing B0/static storyboard; canvas-owned meaning; missing required Pause/Skip, or missing Play/Mute/Stop when audio is included; autoplay sound; reduced-motion motion; no forced-loss fallback; UA sniffing; unbounded WFX-12; rights/provenance gap; false data/psychology claim; performance target replaced by “device dependent”; or approval copied from another host/version.

The refusal response offers the closest lawful alternative: M3 under source caps, a flattened B0 poster, a user-started pausable M2 preview, or an isolated ignored factory proof. It never solves a license failure by weakening the label.

```

### FILE: docs/ai-workflow/design-brain/cinematic-pages.md
```markdown
# Cinematic Pages — The Scroll-Film Doctrine

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within Design Brain scope)
- **Scope:** the craft behind archetype #2 (cinematic 3D scroll site) in `website-archetypes.md`, AND any M3 cinematic act embedded inside another archetype (a luxury hero, a SaaS Act-1 moment). One M3 section on a page pulls this whole doctrine in.
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (§A stack + tiers, §B grammar + bans, §B2 arcs, §C patterns) > `design.md` > this doc. Assets route through `SWAN-ASSET-STORYBOARDING.md` + the two Seedance skills. This doc APPLIES the system to the scroll-film problem; it overrides nothing.

---

## 1. Inspiration intake protocol

- **Mood words first.** Every cinematic brief starts with 3–5 mood words (e.g., "glacial, patient, bioluminescent, vast"). Mood words are the contract — every later decision (palette temperature, scene length, easing) is checked against them.
- **References are DECONSTRUCTED, never cloned.** When Sean supplies a reference site/film/frame, extract *principles*, not surfaces: what is the pacing trick? where does the eye rest? what is the depth model? how does it earn the scroll? Write the extracted principles into the brief; then close the reference and design from the principles + Swan grammar.
- **Forbidden framing:** "make it like [designer/site X]" never appears in a brief or an implementation prompt. The correct form: "reference X taught us [principle]; we apply that principle with Swan tokens and our own story." Inspiration language must never instruct reproducing another designer's work.
- **Deconstruction output (required fields):** pacing principle · depth principle · one transition principle · one restraint the reference exercised · what the reference does that Swan must NOT do.

## 2. Brand/story premise — the logline

- Every cinematic page gets a **one-sentence movie logline** before any scene is sketched: *"A [protagonist/user] discovers [world/capability] and leaves wanting [the CTA action]."*
- The logline names: protagonist (always the visitor, not the brand), the transformation, the single conversion action.
- Test: if two scenes can't be justified by the logline, cut one. If the logline can't be written, the page isn't ready for cinematic treatment — build it as a standard archetype instead.

## 3. Visual worldbuilding

- **Atmosphere layers (minimum three z-stacks per scene, per §B):** background world (media/parallax), midground objects (glass panels, product), foreground voice (typography + CTA). Add a fourth *particle/grain* layer (2–5% noise, ice-crystal particles at ~0.03 opacity) on hero scenes only.
- **Palette temperature arc across scroll.** The page's color temperature moves with the story: e.g., Act 1 cold (Obsidian + Ice Wing), Act 2 deepening (Midnight Sapphire/Royal Depth dominance), Act 3 warming (Gilded Fern accents rising), Act 4 intimate (Graphite surfaces, warm gold + Wing Purple CTA glow). Write the arc as four temperature keyframes in the brief. All colors remain Crystalline Swan tokens — temperature is achieved by *ratio and lighting*, never new hexes.
- **Light source discipline:** each scene declares where its light comes from (rim, glow object, horizon). Consistent light direction inside an act; light shifts happen AT act boundaries as story beats.

## 4. Section sequencing against the B2 4-act arc

- The scene list maps 1:1 onto B2.1: **Act 1 Hook/awe → Act 2 Capability/proof → Act 3 Transformation/momentum → Act 4 Conversion/belonging.** Acts progress in order; each act = one or more scenes.
- **C10 dividers live between acts** — on cinematic pages these are the "cuts": video-cut, color-wash (the temperature keyframe change), or crystalline motif. Within an act, scenes flow; between acts, scenes CUT.
- Act emotional targets are single: one primary emotion per act; a scene may not contradict its act's target.
- CTA appears at the Act 3→4 boundary (emotional peak) and again at page end. Never earlier than the story earns it, never requiring scroll-back.

## 5. Scroll choreography

- **Scene lengths in viewport-heights (vh):** hook scene 1–2vh of scroll; pinned explanation scenes 3–5vh (one vh per sub-beat, per C3); flowing story scenes 1–1.5vh; conversion scene ≤1vh. Total page: 8–14vh of scroll travel. Longer = fatigue, not cinema.
- **Pinned vs flowing:** pin (position: sticky / ScrollTrigger pin) only when the foreground must persist while the background narrates (C3). Maximum 2 pinned scenes per page. Everything else flows.
- **Choreography restraint (hard caps):**
  - Max **2 simultaneously animated properties** per element; max **3 concurrently animating elements** per viewport.
  - Animate only `transform` and `opacity` on scroll-linked work (compositor-only). Layout properties never animate with scroll.
  - Parallax multipliers 0.2–0.4, never above 0.6 (§C2).
  - **One page-level signature moment** — the single beat someone would screenshot/describe; when present it belongs in Act 1 (§B2 guidance). Each section still carries its own quieter memorable visual per system §B ("a section without a signature moment is filler") — the page-level signature is simply the loudest of them. Two competing page-level moments = zero. Candidates: C4 letterform reveal, a scroll-scrubbed hero sequence, one R3F object.
- Scroll input is read via `requestAnimationFrame` + passive listeners or IntersectionObserver thresholds — never raw undebounced `onScroll` work (§A).

### 5.1 Scene ledger (required pre-build artifact)

Before implementation, the approved direction is written as a **scene ledger** — one row per scene. This is the cinematic equivalent of the B2 arc-in-thread requirement; `swan-design-router` treats a missing ledger as a missing arc.

| Field | What it pins down |
|---|---|
| Scene name | short handle used in code, QA receipts, and asset briefs |
| Act | 1–4 (B2.1 mapping) |
| Scroll length | vh of travel (per §5 length rules) |
| Pinned / flowing | pin only if C3-justified; max 2 pins per page |
| Emotional target | the act's primary emotion this scene serves |
| Animated properties | the ≤2 properties per element that move, named explicitly |
| Assets | Seedance brief handle(s) + poster/fallback still |
| Copy job | headline + ≤2 support lines, act-level job (§13) |
| Static frame | which composed frame represents this scene at M0/reduced tier |

Ledger rules:
- A scene with an empty "static frame" cell is not designed yet — the reduced-motion story (§10) is authored in this ledger, not retrofitted.
- The signature moment is marked on exactly one row.
- Total vh across rows must land in the 8–14vh page budget; if it doesn't, cut scenes here, not in code review.

### 5.2 Worked example (illustrative shape, not a spec)

A SwanStudios brand-film page, logline: *"A committed athlete steps into a frozen-forest vault and leaves wanting to book their first session."*

| Scene | Act | vh | Mode | Signature | Assets |
|---|---|---|---|---|---|
| ice-threshold (C4 letterform reveal) | 1 | 2 | flowing | ★ | hero loop 6s + poster |
| the-method (C3 capability walk, 3 beats) | 2 | 3 | pinned | — | 3 UI-truth stills |
| proof-in-numbers (C9 anchored counters) | 2 | 1 | flowing | — | 2 anchor loops |
| becoming (C2 parallax transformation) | 3 | 1.5 | flowing | — | 1 parallax still |
| the-invitation (CTA, calm) | 4 | 1 | flowing | — | gradient + grain only |

Total: 8.5vh · 1 pin · 1 signature moment · temperature arc cold → sapphire → gold-rising → intimate. Every scene has a named static frame before any motion code is written.

## 6. Video/image asset plan

- **Route every asset through `SWAN-ASSET-STORYBOARDING.md`** (emotional job → archetype → fallback → motion, its four questions) and generate briefs via the unified `seedance-swan-video` skill, selecting cinematic mode for hero/brand/b-roll/icon motion or workout mode for exercise/training footage.
- **Asset archetypes per act (default casting):**
  - Act 1: one hero video loop (4–8s, seamless) OR a scroll-scrubbed sequence (10–20s source) — the signature moment's raw material.
  - Act 2: stills + short UI-truth loops (product proof), letterform-embedded media if C4 is in play.
  - Act 3: one parallax still (C2) + KPI anchor loops/stills (C9).
  - Act 4: calm — a single still or pure gradient + grain; the CTA needs quiet.
- Every video asset ships with: poster frame (tier-2), and a described fallback still in the Seedance brief (system §E). No asset enters the build without its brief on record.

## 7. 3D / GSAP / Three.js usage rules

- **Progressive enhancement, always.** The page must be complete without 3D; R3F is a surgical accent (hero object, geode, particle field) behind `<Suspense>` with a 2D fallback — never page scaffolding (§A).
- **GSAP earns its import** only for long ScrollTrigger sequences, pins, or multi-step timelines; a fade-in is Framer/IO territory. One GSAP context per page, killed on unmount.
- **Perf/battery budget:**
  - one R3F canvas per page maximum
  - target <3ms/frame GPU on mid-tier hardware
  - `frameloop="demand"` when the scene is idle or off-screen
  - DPR clamped to ≤2 regardless of device
- **Device-class gates (system §A tiers):**
  - Full cinema (desktop / capable mobile, no reduced-motion) → everything in the ledger
  - Lean cinema (low-power, save-data, slow network) → no R3F, no pins, CSS-only parallax, posters for video
  - Reduced motion → §10 below
- **Mobile static-frame fallback:** below 768px (or on lean tier), pinned/3D scenes render as composed static frames — art-directed stills in story order, not a broken half-animation. The ledger's static-frame column is the source of those frames.

## 8. Generated-video frame usage (scroll-scrubbed sequences)

- **Pipeline:** extract frames from the (Seedance-generated) video → map frame index to scroll progress within the scene's vh-range → paint via `<canvas>` + `requestAnimationFrame` (draw only when the computed frame index changes).
- **Frame economics:** 60–120 frames per scene is the sweet spot; WebP frames sized to display resolution ×DPR (≤2); target total sequence payload ≤4–6MB desktop, ≤2MB mobile (or fall back to poster on lean tier).
- **Preload strategy:** first frame is part of the LCP-critical path (inline/priority); the rest lazy-load when the scene is one viewport away (IntersectionObserver `rootMargin: '100%'`); decode ahead of scroll direction; never block first paint on a frame set.
- **Fallbacks:** tier-2 = poster frame + subtle CSS parallax; tier-3 = poster frame static. The scrub is enhancement, the poster is the contract.

## 9. Static image usage

- Stills are not the budget option — they are the *composition* option. Use a still whenever motion has no narrative job (§B ban 9): parallax backgrounds, KPI anchors, Act-4 calm, all lean-tier renders.
- Requirements: art-directed crops per breakpoint (`<picture>`/`srcset`), on-brand Seedance-generated (never stock, §B ban 8), grain overlay on large dark stills to kill the plastic-gradient look, explicit `width`/`height` to prevent CLS.

## 10. Motion restraint + reduced-motion narrative fallback

- **The story must survive with zero motion.** The reduced-motion tier is not a degraded page — it is the same four-act story told in static frames: same scene order, same copy, same palette temperature arc, same composed frames (each scene's most legible frame becomes its still).
- `prefers-reduced-motion: reduce` disables: scroll-scrubbing, parallax, pins-with-animation, count-ups (render final values), video autoplay (posters), R3F (2D fallback). It preserves: layout, tokens, dividers-as-composition, all content, all CTAs.
- Authoring rule: design the static storyboard FIRST, then add motion to it — motion added to a working story stays restrained; story bolted onto motion never does.

## 11. Performance rules

- **LCP ≤2.5s** on the hero (poster/first-frame paints first; video/sequence upgrades after). No cinematic asset may be the LCP blocker.
- **Chunking:** GSAP, R3F, and frame-sequence machinery load in lazy chunks behind route- or viewport-level boundaries — never in the entry bundle. Charts stay `React.lazy` + SafeChart per house rules.
- **Lazy boundaries per act:** Act 1 assets eager (poster-first), Act 2+ assets load one viewport ahead. Below-fold scenes must not delay above-fold interactivity.
- Poster frames for every video; `preload="none"` on below-fold video; `content-visibility: auto` on far-below-fold scenes; no layout thrash from scroll handlers (transform/opacity only, §5).

## 12. Accessibility on cinematic pages

- **Contrast against moving backgrounds:** text over media sits on a vignette/scrim layer that guarantees 4.5:1 at the media's brightest frame — audit against the brightest frame, not the average.
- **Focus visibility:** focus rings (Wing Purple per Dual-Button Glow) must remain visible over every scene background; test keyboard traversal at multiple scroll positions, including mid-pin.
- **No keyboard traps:** keyboard users are never trapped in a pinned scene — pins must not hijack keyboard scroll; tab order stays linear through the act sequence.
- **Skip affordance** ("skip intro" / skip-to-CTA link) on any scene >2vh, visible on focus even if visually quiet otherwise.
- **Autoplaying media:** muted, `playsinline`, pausable; no flashing above 3Hz.
- **Dynamic text effects:** count-ups, scramble/typewriter effects have static equivalents and never gate comprehension — a screen reader announces the final value, not the animation frames.

## 13. Copywriting rules

- **Act-level copy jobs:** Act 1 = identity claim (≤8 words, display scale); Act 2 = proof statements (specifics, numbers, capability verbs); Act 3 = transformation language (second person, present tense — "you," becoming); Act 4 = invitation + next step (imperative, low-pressure, one action).
- Copy is scored against the mood words (§1) — a "glacial, patient" page doesn't shout "BLAZING FAST!!".
- **Conversion-critical copy (hero claim, CTA, pricing/ascension language) routes through the `copy-tournament` skill** — variants → judge panel → merged winner — before it's locked into the build. Credentials rule and no-yoga/meditation language apply to every string.
- Less copy per scene than feels safe: cinematic scenes carry 1 headline + ≤2 supporting lines. Paragraphs belong to standard archetypes.

## 14. First-frame / social-preview rule

- **The first painted frame must sell the page alone.** Whatever paints before any motion begins — the hero poster + headline + CTA — is judged as a standalone poster. If the static first frame is weak, the page is weak; motion may not rescue it.
- **`og:image` gets the same treatment:** a composed still (usually the signature moment's best frame + wordmark), designed, not screenshotted-by-accident. Verify the preview renders correctly at share-card crops (1200×630 class).
- This is also the QA cheapest test: screenshot at scroll=0 with JS disabled-equivalent (reduced tier) — would you click it?

## 15. Browser Harness visual QA hooks

Supervised, read-only (Operator Bridge §6: navigate/scroll/read/screenshot/console/network; T0 default). Required capture set per cinematic page:

1. Screenshot at **scroll = 0** (first-frame rule check) and at **each act boundary** scroll position (4-act pages → 5 captures minimum), at 320px, 375px, 414px, 768px, 1440px, 2560×1440 (full matrix reference: `qa-gates.md` Gate 1).
2. Same capture set with **reduced-motion emulated** — verify the static storyboard tells the full story.
3. Console capture across a full slow scroll — zero errors, no dropped-frame warnings spam.
4. Network capture — verify lazy boundaries (Act 2+ assets don't load at scroll=0) and total payload against §8/§11 budgets.
5. Screenshot the signature moment mid-beat; screenshot every text-over-media scene at its brightest frame for contrast audit.
6. Output: QA receipt per `qa-gates.md` (captures + budgets measured + failures listed).

## 15.1 Hard caps at a glance (QA cross-reference)

| Cap | Value | Source |
|---|---|---|
| Total scroll travel | 8–14vh | §5 |
| Pinned scenes per page | ≤2 | §5 |
| Page-level signature moments | exactly 1 (the loudest beat, Act 1); per-section memorable visuals still required by system §B | §5 / system §B |
| Animated properties per element | ≤2 (transform/opacity only) | §5 |
| Concurrently animating elements per viewport | ≤3 | §5 |
| Parallax multiplier | 0.2–0.4 (hard ceiling 0.6) | §5 / system §C2 |
| Hero loop duration | 4–8s seamless | §6 |
| Scrub sequence frames | 60–120 per scene | §8 |
| Sequence payload | ≤4–6MB desktop / ≤2MB mobile | §8 |
| LCP | ≤2.5s (poster/first-frame path) | §11 |
| R3F canvases | ≤1, DPR ≤2, <3ms/frame | §7 |
| Text-over-media contrast | 4.5:1 at brightest frame | §12 |
| M4 extended caps + product prohibition | `experience-mode.md` §§2–5; live M4 never embeds on product/Hermes surfaces | licensed exception |

A build that exceeds any cap either cuts scope in the scene ledger or gets Sean's explicit written exception in the task thread — never a silent overage.

**M4 loss-matrix pointer:** an eligible M4 experience must also prove B3 failure → B2, B2 failure → B1/B0, context/device loss, Full/Lean/Still, and JavaScript-disabled semantic poster behavior per `experience-mode.md`. Canvas/video may not own unique copy, navigation, CTA, legal text, or form state.

## 16. Handoff prompt templates

**TO Fable (direction):**
> Cinematic page: [surface]. Logline: [one sentence]. Mood words: [3–5]. Deconstructed principles from intake: [list — principles only, no clone instruction]. Constraints: Swan tokens only, B2.1 arc, one signature moment, M3 budget, three perf tiers. Deliver 2–3 directions, each with: scene list (vh lengths, pinned/flowing), act mapping + emotional targets, palette temperature keyframes, signature-moment candidate, asset archetype casting per act, and what you'd CUT if the budget halves.

**TO Codex/Claude (implementation):**
> Implement approved direction [n] for [surface]. Read first: design.md, SWAN-CINEMATIC-DESIGN-SYSTEM.md §A/§B2/§C, this doc, the approved scene list. Rules: styled-components only (css`` helper for shared fragments — rule 43); rAF + IO for scroll (no raw onScroll); GSAP only for the listed pins; transform/opacity only; three tiers in the same files; posters before video; Seedance briefs filed for every asset before assuming media; rule 26 receipt on the mounted route; Harness capture set (§15) before claiming done. Slice it: static storyboard first, then motion pass, then perf pass.

## 17. Deployment checklist (placeholder — gated on Sean)

Deployment of any cinematic page is **explicitly gated on Sean's approval — no auto-deploy.** The checklist below is a placeholder to be finalized with the first shipped cinematic page:

- [ ] §15 Harness QA receipt complete (all captures, budgets, reduced-motion storyboard verified)
- [ ] copy-tournament winner locked for conversion copy; credentials/yoga-language grep clean
- [ ] LCP ≤2.5s verified on lean tier; payload budgets met
- [ ] Rule 26 canonical surface receipt + rule 42 backend audit (if any backend touched)
- [ ] og:image + first-frame approved by Sean as standalone posters
- [ ] **Sean's explicit "ship it"** recorded — then normal main-branch deploy flow (rules 46/50), never a bypass

```

### FILE: docs/ai-workflow/design-brain/website-archetypes.md
```markdown
# Website Archetypes — The Generation Factory Codex

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within Design Brain scope)
- **Consolidation note:** this ONE codex deliberately consolidates the 20 planned per-archetype docs into a single dense file. One file an agent reads in minutes beats 20 files nobody loads. If an archetype later needs depth this file can't hold, split THAT archetype out and leave a pointer here.
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (§B2 arcs, §C patterns, generic-pattern bans) > `design.md` > this codex. Archetypes APPLY the system; they never override it. Tokens/components are cited by name from `components.md`. Operator tiers and the design boundary come from `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (T0–T4, §10).

---

## How to pick an archetype

1. **Name the job of the page in one sentence.** "Sell training packages" → #4/#10. "Prove we can build" → #6/#14. "Run the business" → #8/#18/#19.
2. **Marketing surface or working surface?** Marketing → B2.1 4-act arc (Hook → Proof → Momentum → Conversion). Working surface (dashboard, portal, assistant) → B2.2 4-phase arc (Orientation → Current state → Progress → Next best action). Every archetype below declares its arc; no page ships without one written down first.
3. **Archetypes compose.** A pricing page (#10) is usually Act 4 of a SaaS landing (#1) before it is a standalone page. An onboarding funnel (#11) begins where #1/#4 converts. A case study (#14) is Act 2 ammunition for #6. Waitlist (#13) is #1 with Acts 2–3 compressed. When composing, the HOST page's arc governs; the embedded archetype becomes an act/phase module and inherits the host's motion budget.
4. **Every archetype obeys the same grammar:** B2 arc + C1–C12 patterns + the source doc's bans — §B generic-pattern bans (no equal 4-up grids, no centered-heading-plus-two-buttons hero, no motion without a job) and the §C9/§C10 rules (no naked KPI rows, no bare `<hr>` dividers).

### Motion budgets (referenced throughout)

| Budget | Ceiling | Contents |
|---|---|---|
| **M0** | static | tokens, layout, zero animation (also = every archetype's reduced-motion tier) |
| **M1** | working-surface | scroll-in reveals, hover states, state transitions; no parallax, no pinning, no video heroes |
| **M2** | marketing | M1 + one C1 video hero OR C2 parallax + count-ups + one signature moment per page |
| **M3** | cinematic | M2 + pinned C3 scenes, scroll-scrubbed sequences, surgical R3F accent — governed by `cinematic-pages.md` |
| **M4** | licensed experience | Eligible non-product/approved-marketing pages only; one spatial canvas may scaffold, with B0–B3 fallbacks and `experience-mode.md` gate. Never live on product or Hermes/operator surfaces |

All budgets ship Full / Lean / Still runtime-quality modes from design-system §A. Reduced Motion is a separate accessibility override that applies across all three. Chains inherit the max: one M3 section makes it an M3 page and pulls in the full `cinematic-pages.md` doctrine.

### Comparison matrix

| # | Archetype | Conversion goal | Arc | Hero pattern | Motion |
|---|---|---|---|---|---|
| 1 | Premium SaaS landing | trial / demo signup | Mkt 4-act | C1 video hero | M2 |
| 2 | Cinematic 3D scroll site | brand awe → one CTA | Mkt 4-act stretched | C4 letterform or C1+R3F | M3 |
| 3 | Luxury product site | purchase / inquiry | Mkt 4-act | C1 + C5 shelf | M2–M3 |
| 4 | Fitness/coaching site | consult booked / package bought | Mkt 4-act | C1 training-footage hero | M2 |
| 5 | Personal portfolio | contact / hire | Mkt 4-act | C4 letterform | M2 |
| 6 | Agency site | qualified lead / call | Mkt 4-act | C3 sticky showcase | M2 |
| 7 | AI app site | signup / waitlist | Mkt 4-act | C1 + live-demo panel | M2 |
| 8 | Internal operator dashboard | task speed, zero hunting | Dash 4-phase | Phase-1 orientation band | M1 |
| 9 | Client portal | workout logged / next action taken | Dash 4-phase | C9 momentum card | M1 |
| 10 | Pricing page | plan selected | Mkt Act-4 module | C5 tier shelf | M1 |
| 11 | Onboarding funnel | activation completed | Compressed act per step | single focused panel | M1 |
| 12 | E-commerce / product page | add-to-cart | Mkt 4-act | C5/C1 product stage | M2 |
| 13 | Waitlist page | email captured | Mkt 4-act compressed | C1 or C4 | M2 |
| 14 | Case study page | belief → pricing/contact CTA | Mkt 4-act | C2 parallax opening | M1–M2 |
| 15 | Docs / knowledge base | answer found fast | Orientation-first (dash-style) | search-first header | M0–M1 |
| 16 | Community / course landing | join / enroll | Mkt 4-act | C1 community-loop hero | M2 |
| 17 | Mobile app marketing site | store install | Mkt 4-act | device-frame C3 | M2 |
| 18 | Hermes command center (Sean-only) | operator decision speed | Dash 4-phase, Cyberforest mode | status-horizon band | M1 |
| 19 | Coach Command Center | client logged/reviewed in fewest taps | Dash 4-phase | roster + next-best-action | M1 |
| 20 | Swan Coach surface | proposal approved / action logged | Dash 4-phase, conversational | chat + proposal cards | M1 |
| 21 | Experience / World Showcase | brand awe → one unique CTA | Mkt 4-act stretched | world-native semantic poster → licensed enhancement | M4 |

---

## 1. Premium SaaS landing page

- **Use when:** selling the SwanStudios platform (or any SaaS) to cold traffic; the page must earn trust and a signup in one scroll.
- **Feel:** dark-room-lit-by-glowing-objects; confident, product-forward, zero clip-art.
- **Arc:** Mkt 4-act. **Hero:** C1 video hero (product-in-motion footage, not stock office). **Motion:** M2.
- **Sections in order:** C1 hero (product truth + CTA pair) → C10 divider → Act 2: C3 sticky feature walk (3–5 features) + C6 flip cards for proof detail → C10 → Act 3: C9 media-anchored impact numbers + C2 parallax story beat → C10 → Act 4: embedded #10 pricing module + final GlowButton CTA + short FAQ.
- **Conversion goal:** trial/demo signup. **Trust:** real product screenshots/loops, named client outcomes (IDs/consented), security posture line, "26+ years training experience" where the founder story appears — never "NASM-certified" (say "NASM workshop-trained" / "NASM-protocol").
- **Mobile:** hero video → poster (lean tier); C3 collapses to stacked panels; CTA pair stacks full-width at 44px+.
- **A11y:** text over video needs the vignette layer to hold 4.5:1; focus order follows the arc; skip-to-pricing link.
- **Components:** `GlowButton` (Dual-Button Glow), `GlassPanel` (C12 base), `SheenCard` for feature/sell cards, `NarrativeDivider`, `ChartEnvironment` if a proof chart appears.
- **Anti-patterns:** centered-hero-two-buttons-blob; equal 4-up feature grid; testimonial-carousel-with-avatars template; pricing hidden behind a "contact us" wall.
- **Fable brief:** "SaaS landing for [product]. Audience: [who]. One-sentence promise: [X]. Give 2–3 concept directions: name each act's emotional beat, hero treatment, signature moment, and the Act-2 proof strategy. Palette stays Crystalline Swan."
- **Builder brief:** "Implement direction [n]. B2.1 arc written in-thread first. styled-components only, tokens from design.md, C1 hero with tier-2 poster + tier-3 static in the same file, pricing module reuses #10. Rule 26 receipt before touching any mounted route."
- **Harness QA:**
  - [ ] hero paints < 2.5s with poster-first
  - [ ] CTA visible without scroll at 375px
  - [ ] reduced-motion kills video + parallax
  - [ ] all CTAs ≥44px
  - [ ] Act-4 CTA reachable without scroll-back
- **Village questions:**
  - Does Act 2 prove capability with product truth or with adjectives?
  - Would a competitor's logo swap survive here (if yes, it's generic)?
  - Is the signup path ≤2 clicks from hero?

## 2. Cinematic 3D scroll website

- **Use when:** the page's job is awe — brand statement, launch moment, flagship story. The scroll IS the product.
- **Feel:** a film you scrub with your thumb; every viewport a composed frame.
- **Arc:** Mkt 4-act stretched over 8–14 viewport-heights. **Hero:** C4 embedded-media letterform or C1 + surgical R3F accent. **Motion:** M3 — the full `cinematic-pages.md` doctrine governs this archetype; this entry is the summary.
- **Sections in order:** per the cinematic doc: logline-driven scene list, pinned C3 scenes for Act 2, C2 parallax for Act 3, one — exactly one — signature moment, C10 video-cut or color-wash dividers between acts.
- **Conversion goal:** a single CTA, delivered at emotional peak (end of Act 3 / start of Act 4). One. Not a nav bar of ten.
- **Trust:** the craft is the trust signal; add one hard-proof line (clients, years, outcomes) in Act 2 so the beauty has a spine.
- **Mobile:** static-frame storyboard fallback — the story must read as a sequence of stills; no pinning under 768px unless proven 60fps on mid-tier devices.
- **A11y:** reduced-motion tier tells the SAME story in static frames (non-negotiable); focus visible against moving backgrounds; skip-scene affordance.
- **Components:** `GlassPanel`, `NarrativeDivider`, `GlowButton`; scene scaffolding per `cinematic-pages.md`; R3F only behind `<Suspense>` with 2D fallback.
- **Anti-patterns:** motion for motion's sake; >2 simultaneously animated properties per scene; 3D scaffolding where 2D tells it; seasick parallax (>0.4 multiplier).
- **Fable brief:** "Cinematic scroll page. Logline: [one sentence]. Mood words: [3–5]. Deconstructed inspiration principles: [list — principles, never a site to clone]. Deliver: scene list with vh-lengths, act mapping, signature-moment candidates (pick one), palette temperature arc."
- **Builder brief:** "Implement the approved scene list. GSAP/ScrollTrigger allowed for pins; rAF for scrubbing; three perf tiers in-file; asset briefs routed through SWAN-ASSET-STORYBOARDING.md before any media is assumed."
- **Harness QA:**
  - [ ] screenshot at each act boundary scroll position
  - [ ] fps trace on the pinned scene
  - [ ] reduced-motion renders full story statically
  - [ ] first painted frame sells the page alone
  - [ ] battery/CPU sanity on lean tier
- **Village questions:**
  - Does the story survive with zero motion?
  - Is the ONE signature moment actually singular?
  - What is the LCP with the hero asset cold?

## 3. Luxury product website

- **Use when:** a high-ticket object/offer (flagship package, premium tier, physical product) needs desire, not feature lists.
- **Feel:** deep-ocean vault; gold on sapphire; slow, deliberate, expensive.
- **Arc:** Mkt 4-act. **Hero:** C1 with macro product footage + Gilded Fern rim light; C5 shelf later for the lineup. **Motion:** M2, may earn M3 for one Act-1 moment.
- **Sections in order:** C1 macro hero → C10 crystalline divider → Act 2: C3 material/detail walk + C6 flip (front: beauty, back: specification) → Act 3: C5 editions shelf (the lineup as objects) + provenance/story C2 beat → Act 4: single luxury-variant `GlassPanel` offer card + inquiry CTA.
- **Conversion goal:** purchase or white-glove inquiry. **Trust:** materials/method specifics, guarantee terms, scarcity stated honestly (never fake counters).
- **Mobile:** shelf → swipeable single-card rail; macro footage → high-res poster; generous spacing preserved (luxury dies when cramped).
- **A11y:** Gilded Fern on dark passes contrast only at sufficient size — verify 4.5:1; hover-revealed detail must have tap equivalent.
- **Components:** `SheenCard` (full sell treatment allowed — this is a showcase surface), `GlassPanel` luxury variant (gold border), `GlowButton`, `NarrativeDivider` crystalline.
- **Anti-patterns:** discount-brand urgency banners; dense spec tables in Act 1; stock lifestyle photography; more than one gold-bordered surface per viewport (gold inflation cheapens).
- **Fable brief:** "Luxury page for [offer, price point]. Desire driver: [craft/scarcity/status/transformation]. 2–3 directions: hero macro subject, shelf treatment, the one luxury signature moment, gold-usage discipline."
- **Builder brief:** "Direction [n]. C12 luxury variant only where specified; SheenCard full treatment on sell cards only; reduced-motion keeps the vignette + composition. Seedance brief for macro hero via storyboarding doc."
- **Harness QA:**
  - [ ] gold-on-dark contrast measured
  - [ ] shelf swipe works by touch at 375px
  - [ ] no hover-only reveals
  - [ ] poster fallback present
  - [ ] single CTA focus in Act 4
- **Village questions:**
  - Does this feel expensive at 320px?
  - Is scarcity/pricing claim verifiable?
  - Where does desire peak, and is the CTA there?

## 4. Fitness / coaching website

- **Use when:** SwanStudios' own marketing front door, or any trainer-led coaching business surface. The wedge: trainer-led coaching + real progress proof.
- **Feel:** athletic power inside the frozen-forest luxury vault; real bodies doing real work, cinematically shot.
- **Arc:** Mkt 4-act. **Hero:** C1 with real training footage (Seedance/owned — never stock gym). **Motion:** M2.
- **Sections in order:** C1 hero (identity: "who you become here") → Act 2: coach credibility block + C6 method cards + REAL progress charts in `ChartEnvironment` (data-truth rule: real logs or clearly-labeled illustrative, never fake client data) → Act 3: C9 impact numbers with media anchors + transformation C2 story → Act 4: package shelf (#10 module) + booking CTA + location/logistics.
- **Conversion goal:** consult booked or package purchased. **Trust — credentials rule is HARD here:** "26+ years training experience", "NASM workshop-trained" / "NASM-protocol", cert badges (NCEP, 24 Hour Fitness Master Trainer, Gold's, LA Fitness) — NEVER "NASM-certified". No yoga/meditation language — "stretching"/"flexibility" only.
- **Mobile:** booking CTA sticky-visible; class/package cards stack without clipping; 44px everywhere (sweaty thumbs).
- **A11y:** motion-heavy training footage needs reduced-motion posters; charts get text summaries.
- **Components:** `GlowButton`, `SheenCard` for packages, `ChartEnvironment` + `SafeChart` + `chartTheme` for proof charts (Victory only), `NarrativeDivider`.
- **Anti-patterns:** before/after photos without consent framing; fake testimonial-count inflation; "transformation guaranteed" claims; burying price (this audience bounces on hidden pricing).
- **Fable brief:** "Coaching site for [audience — e.g., golf-athlete lead, all-sport reality]. Promise: [X]. Directions must include: hero footage concept, Act-2 proof strategy using real progress data, credential presentation obeying the credentials rule."
- **Builder brief:** "Direction [n]. Charts from real workout-log data or labeled placeholder flagged as a gap; credentials copy verbatim from the approved strings; packages module reuses #10; booking path verified end-to-end (rule 26)."
- **Harness QA:**
  - [ ] booking CTA ≤1 tap from any scroll depth on mobile
  - [ ] credential strings grep-clean of "NASM-certified" and yoga/meditation terms
  - [ ] charts render loading/empty/error
  - [ ] hero poster tier works
- **Village questions:**
  - Would a wealthy golf client feel this is for them?
  - Is every progress visual backed by real data truth?
  - Is the next action unmistakable at each act boundary?

## 5. Personal portfolio

- **Use when:** one human's work must sell them — Sean's dev/trainer identity, a trainer's public profile, a builder's showcase.
- **Feel:** editorial monograph; the person as protagonist; restrained, confident.
- **Arc:** Mkt 4-act. **Hero:** C4 letterform (the NAME with embedded work/footage) — the signature moment lives here. **Motion:** M2.
- **Sections in order:** C4 name hero → Act 2: selected work as C5 poster wall or C7 tilt gallery (3–6 pieces max, each with one-line role + outcome) → Act 3: story/approach beat (Cormorant italic editorial moment, C2 optional) → Act 4: contact panel + one CTA + links.
- **Conversion goal:** contact/hire. **Trust:** shipped-work specifics with outcomes; real credentials framed accurately (dev: Redwood Code Academy 2017 + MIT CS online — not "self-taught"); no logo-soup of tools.
- **Mobile:** letterform scales via `clamp()`; must stay legible at 320px or fall to solid letterform tier-3; gallery becomes vertical stack.
- **A11y:** embedded-media letterform needs an accessible name; gallery tilt has no informational job — safe to drop at M0.
- **Components:** `GlassPanel`, `GlowButton`, C4 letterform scaffold, `SheenCard` low-motion variant for work cards.
- **Anti-patterns:** skill-percentage bars; wall-of-everything galleries; third-person bio voice; template "Hi, I'm X 👋" hero.
- **Fable brief:** "Portfolio for [person, positioning]. The one thing a visitor must remember: [X]. Directions: letterform media concept, which 3–6 works make the cut and why, editorial voice sample."
- **Builder brief:** "Direction [n]. C4 with clip-path/mask + tier fallbacks in-file; work cards from a data array (no copy-paste sections); contact CTA is a real verified path."
- **Harness QA:**
  - [ ] letterform legible at 320/375/768
  - [ ] media-in-letterform lazy-loads
  - [ ] contact CTA works
  - [ ] reduced-motion shows solid letterform gracefully
- **Village questions:**
  - Does the page read in 15 seconds?
  - Is the curation ruthless enough?
  - Does the letterform serve the name or eat it?

## 6. Agency website

- **Use when:** a team sells outcomes-as-a-service (SwanStudios-as-studio, Sentinel-style client work, any services shop).
- **Feel:** "we make things like THIS" — the site is exhibit A; polished, kinetic, but grown-up.
- **Arc:** Mkt 4-act. **Hero:** C3 sticky showcase (client work cross-fading behind a fixed claim) or C1. **Motion:** M2.
- **Sections in order:** hero claim + showcase → Act 2: case-study rail (C5 shelf of #14 covers) + capability walk (C3) + process in 3–4 honest steps → Act 3: results C9 (media-anchored: shipped product loops) + team/values beat → Act 4: qualification-friendly lead form (short) + call CTA.
- **Conversion goal:** qualified lead / discovery call. **Trust:** named case studies with metrics, process transparency, real team (no stock faces).
- **Mobile:** case rail swipes; form ≤5 fields; sticky showcase falls to stacked cards.
- **A11y:** cross-fading backgrounds must not strand text below 4.5:1 at any frame; form errors announced.
- **Components:** `SheenCard` for case covers, `GlassPanel`, `GlowButton`, `NarrativeDivider`; case pages themselves are archetype #14.
- **Anti-patterns:** logo-wall-as-Act-2 (logos without stories prove nothing); "we're passionate about innovation" copy; portfolio grid of identical rectangles; 12-field contact forms.
- **Fable brief:** "Agency site for [services, ICP]. Flagship proof: [best 2–3 cases]. Directions: hero claim + showcase mechanics, case-rail treatment, how Act 3 differentiates from every other agency."
- **Builder brief:** "Direction [n]. Case covers link to #14 pages; showcase C3 with stacked-panel tier-2; lead form validates inline and posts to a verified endpoint (rule 26)."
- **Harness QA:**
  - [ ] form submit round-trip verified
  - [ ] case rail keyboard-navigable
  - [ ] showcase text contrast at every background frame
  - [ ] mobile form completable in <60s
- **Village questions:**
  - Could a rival paste their cases in unchanged (too generic)?
  - Does Act 2 prove or just claim?
  - Is the lead form qualifying or repelling?

## 7. AI app website

- **Use when:** marketing an AI-powered product (Swan Coach as a public capability, an AI tool launch). Danger zone: every AI site looks identical in 2026.
- **Feel:** intelligence you can SEE working — show the product thinking, not orbs and sparkle emojis.
- **Arc:** Mkt 4-act. **Hero:** C1 + a live-demo panel (real or faithfully-scripted product interaction as co-lead). **Motion:** M2.
- **Sections in order:** hero + demo panel → Act 2: capability walk (C3) where each capability shows an actual in/out exchange + honest-limits line + privacy/trust block (zero-PII posture is a FEATURE — state it) → Act 3: workflow-transformation story (before/after time saved, C9 with media) → Act 4: tier gating (`FrostedPaywall` / `CrystallineLockOverlay` semantics if tiered) + signup CTA.
- **Conversion goal:** signup/waitlist. **Trust:** real product transcripts, privacy posture ("client data as IDs only"), what it does NOT do, human-in-the-loop framing (proposals, approval gates).
- **Mobile:** demo panel becomes a scripted autoplay-on-scroll (poster fallback); exchanges readable at 320px.
- **A11y:** simulated typing effects respect reduced-motion (show final state instantly); demo content is real text, not images of text.
- **Components:** `GlassPanel`, `GlowButton`, chat/proposal-card patterns from `components.md` (same family as #20 so marketing matches product truth), `FrostedPaywall` for tier boundaries.
- **Anti-patterns:** floating gradient orbs; sparkles/✨ iconography; "powered by AI" as the value prop; fake typing animations over fake answers; overpromising autonomy the T-tier model forbids.
- **Fable brief:** "AI app page for [capability]. The demo moment that sells it: [X]. Directions: demo-panel mechanics, honesty/limits framing, how Act 2 avoids the generic-AI-site look."
- **Builder brief:** "Direction [n]. Demo content sourced from real product transcripts (scrubbed to IDs/roles); reuse #20 conversational components so marketing == product; tier gates reuse existing paywall components."
- **Harness QA:**
  - [ ] demo panel plays + falls back to poster
  - [ ] no PII in any demo string
  - [ ] reduced-motion shows complete demo state
  - [ ] signup path ≤2 clicks
  - [ ] lighthouse-class perf on demo section
- **Village questions:**
  - Does the demo show a REAL differentiated capability?
  - Is the privacy story load-bearing or decorative?
  - Would this page survive the "every AI landing page looks the same" screenshot lineup?

## 8. Internal operator dashboard

- **Use when:** staff/admin working surfaces — SwanStudios admin dashboard family. Users arrive with a goal; the page's job is speed and truth.
- **Feel:** mission console, dense but premium; C11 discipline everywhere; zero landing-page decoration.
- **Arc:** Dash 4-phase. **Hero:** none — Phase-1 orientation band (who am I, business health, what changed since last visit). **Motion:** M1.
- **Sections in order:** Phase 1 orientation band (identity + health indicators + alerts count) → Phase 2 current state (the real numbers/tables/sessions — largest surface area) → Phase 3 progress/insight (`ChartEnvironment` with narrative columns, deltas, annotations) → Phase 4 next best action (intervention queue: who's stale, what needs approval, one primary CTA).
- **Conversion goal:** operator completes the day's decisions without hunting; stale-client/exception visibility (admin priority per Product Core Loop).
- **Trust:** data truth — real logs only; empty states explain WHY (Cormorant italic line), never bare "no data"; timestamps on freshness-sensitive data.
- **Mobile:** tables → stacked fact cards; no hover-only actions; 44px icon buttons; phone-width check mandatory before completion.
- **A11y:** keyboard-first table nav; charts carry text deltas; alert colors paired with icons/labels (not color-only).
- **Components:** `ChartEnvironment` + `SafeChart` + `chartTheme` (Victory, lazy via `React.lazy`), `GlassPanel` obsidian variant, client/data-card low-motion `SheenCard` geometry, `GlowButton` for the Phase-4 CTA.
- **Anti-patterns:** SaaS-hero styling on a working surface; naked KPI rows (§B ban 3); cards-inside-cards; duplicated facts across cards; decorative metrics; Phase 4 missing (a dashboard that never answers "what now?").
- **Fable brief:** "Operator dashboard for [role]. Phase-1 question: [what health signal matters most]. Directions: orientation-band composition, Phase-2 density strategy, the Phase-4 intervention queue design."
- **Builder brief:** "Direction [n]. B2.2 phases written in-thread; real endpoints only (rule 26 receipt + rule 58 schema-drift check on every model touched); loading/empty/error states for every data region."
- **Harness QA:**
  - [ ] phone-width no-overlap sweep
  - [ ] loading/empty/error visible per region
  - [ ] chart lazy-boundaries hold (no eager gallery)
  - [ ] Phase-4 action executes round-trip
  - [ ] no hover-only controls
- **Village questions:**
  - Can the operator find the one client needing intervention in <10s?
  - Is anything decorative wearing a data costume?
  - Does every number trace to a real table?

## 9. Client portal

- **Use when:** the logged-in client/trainee surface — home, progress, workouts. The Product Core Loop lives here: log → diary → charts → next action → share.
- **Feel:** personal momentum machine; gaming-warm (Ice Wing XP accents) without being a casino.
- **Arc:** Dash 4-phase. **Hero:** C9 momentum card (streak, XP, level, next session) as Phase 1. **Motion:** M1 (earned micro-celebrations on milestones allowed).
- **Sections in order:** Phase 1 momentum/identity → Phase 2 today's truth (next workout, quick-log entry ≤2 taps away, recent diary) → Phase 3 progress proof (`ChartEnvironment` from REAL logs; streak/PR annotations) → Phase 4 next best action (start workout / book session / share milestone).
- **Conversion goal:** workout logged; progress reviewed; milestone shared. Logging is the sacred path — fewest taps wins.
- **Trust:** their own real data, always fresh; mock progress data is a flagged gap, never silently shipped.
- **Mobile:** THIS IS A MOBILE-FIRST SURFACE. Log flow one-thumb; Progress never buried below social/profile; sticky quick-log affordance.
- **A11y:** 44px targets; XP/rarity colors (Common=Swan Lavender … Legendary=gradient) never the sole signal; reduced-motion swaps celebration animation for static badge state.
- **Components:** `ChartEnvironment` + `SafeChart`, `GlowButton`, low-motion `SheenCard` data cards, `CrystallineLockOverlay` on tier-locked features, gamification header patterns from `components.md`.
- **Anti-patterns:** burying Progress; feed-noise above workout truth; celebration confetti on trivial events (devalues milestones); duplicate facts across momentum card and stats row.
- **Fable brief:** "Client portal home. Primary loop moment: [log/review/share]. Directions: Phase-1 momentum treatment, quick-log placement, how Phase 3 makes progress feel addictive without dark patterns."
- **Builder brief:** "Direction [n]. Log path tap-count measured before/after; charts from real workout logs (data-truth); tier gates via existing lock components; rule 26 receipt on the mounted home route."
- **Harness QA:**
  - [ ] log-workout ≤2 taps from load
  - [ ] 320/375/414px sweep
  - [ ] charts loading/empty/error
  - [ ] streak/XP render from real API
  - [ ] share action produces the expected artifact
- **Village questions:**
  - Does the home screen make today's workout unavoidable?
  - Is any progress visual mock data?
  - What brings this user back tomorrow?

## 10. Pricing page

- **Use when:** standalone /pricing or the Act-4 module inside #1/#4/#16. Composition note: build once, mount both places.
- **Feel:** calm clarity at the moment of money; luxury without pressure.
- **Arc:** Mkt Act-4 module (standalone version gets a compressed 4-act: brief value re-hook → tiers → proof → FAQ/CTA). **Hero:** C5 tier shelf — plans as objects, recommended tier physically forward. **Motion:** M1.
- **Sections in order:** one-line value re-anchor → C5 tier shelf (3–5 tiers; recommended visually elevated, not just badged) → per-tier `SheenCard` with price, cadence, what's-included truth → comparison expander (not a wall) → guarantee/terms plainly → FAQ → final CTA.
- **Conversion goal:** plan selected. **Trust:** real prices visible (SwanStudios: $175/session, packages at true totals — no fake strikethroughs), Guardian donation semantics stated honestly, cancellation terms upfront.
- **Mobile:** shelf → vertical stack with recommended tier FIRST; sticky selected-tier CTA.
- **A11y:** price differences readable by screen reader (full sentences, not grid-position implication); toggle (monthly/annual) keyboard-operable.
- **Components:** `SheenCard` (sell treatment allowed), `GlowButton` per tier obeying Dual-Button Glow, `GlassPanel` luxury variant on the flagship tier only, `FrostedPaywall` semantics for locked-feature previews.
- **Anti-patterns:** fake anchor pricing; 40-row comparison tables above the fold; "most popular" on the most expensive tier without data; hiding the free tier; countdown timers.
- **Fable brief:** "Pricing for [tiers + real prices]. Business intent: [which tier should win]. Directions: shelf composition, recommended-tier elevation, how the donation/Guardian mechanic reads honestly."
- **Builder brief:** "Direction [n]. Tier data from a single source array (matches backend storefront truth — verify against seeded packages, rule 58); checkout CTA path verified end-to-end incl. `/api/cart/add`."
- **Harness QA:**
  - [ ] every tier CTA reaches checkout
  - [ ] prices match backend seed data
  - [ ] mobile stack order correct
  - [ ] toggle states persist
  - [ ] no dead "contact sales" links
- **Village questions:**
  - Is the recommended tier the right business call?
  - Does anything here erode trust for a $2,800/month client?
  - Price-to-value story airtight?

## 11. Onboarding funnel

- **Use when:** post-conversion activation — account setup, role-specific first-run (trainer: first template + first client invite; trainee: first workout logged + first coach touch within 7 days).
- **Feel:** guided, generous, momentum-building; one decision per screen.
- **Arc:** compressed act PER STEP: micro-hook (why this step) → action → progress acknowledgment. Whole funnel = Act 3→4 of the parent surface. **Hero:** none — single focused `GlassPanel` per step. **Motion:** M1 (step transitions + progress indicator only).
- **Sections in order (per step):** progress indicator → step promise (one line) → the ONE input/action → skip/back affordances → forward CTA. Funnel order: identity → role fork → the role's activation action → first-win celebration → land on portal Phase 1.
- **Conversion goal:** activation completion — measured by the role-specific first win, not screens viewed.
- **Trust:** say why each datum is needed at ask-time; consent explicit for health-adjacent data (sensitive-by-design rule); skippable everything except essentials.
- **Mobile:** the primary funnel IS mobile; keyboard-type-aware inputs; one thumb; progress persists across abandonment.
- **A11y:** focus moves to step heading on transition; errors inline + announced; no time limits.
- **Components:** `GlassPanel`, `GlowButton`, form patterns from `components.md`, milestone badge on first win.
- **Anti-patterns:** 12-field first screen; asking for data the product won't use this week; forced tour before first win; celebration before anything was actually accomplished.
- **Fable brief:** "Onboarding for [role]. Activation definition: [first win]. Directions: step count + order, what gets deferred to later, the first-win moment design."
- **Builder brief:** "Direction [n]. Steps as a data-driven state machine (no page-per-step copies); resume-on-return; each write hits verified endpoints; consent copy exact."
- **Harness QA:**
  - [ ] full funnel completable on 375px
  - [ ] abandon-and-resume works
  - [ ] back doesn't lose data
  - [ ] first-win state lands on portal correctly
  - [ ] skip paths don't dead-end
- **Village questions:**
  - What's the minimum steps to the role's first win?
  - Which asks can move to post-activation?
  - Where will real users bail?

## 12. E-commerce / product page

- **Use when:** the storefront package detail / any buyable object page. Composes with #10 (pricing truth) and #3 (luxury treatment for flagship SKUs).
- **Feel:** product-as-protagonist on a lit stage; everything else supporting cast.
- **Arc:** Mkt 4-act compressed to one screen + supporting scroll. **Hero:** product stage — C1 loop or C5-style object presentation with C7 tilt on the product card. **Motion:** M2.
- **Sections in order:** stage (media + name + price + primary `GlowButton` add-to-cart, all above fold) → Act 2: what's-included truth + C6 flip for details/terms → Act 3: social/usage proof (real outcomes) + related items C5 rail → Act 4: sticky add-to-cart reprise + guarantee.
- **Conversion goal:** add-to-cart → checkout. **Trust:** total price honesty (sessions × rate math shown), included-vs-not clarity, refund/transfer terms.
- **Mobile:** sticky add-to-cart bar; gallery swipes; price never scrolls out of view.
- **A11y:** price + variant changes announced; gallery keyboard-navigable; 44px quantity/variant controls.
- **Components:** `SheenCard` full sell treatment on the stage, `GlowButton`, `GlassPanel`, cart interactions verified against the live cart API (the historical `/api/cart/add` 404 makes this archetype's QA non-optional).
- **Anti-patterns:** carousel-of-everything heroes; shipping/terms surprises at checkout; fake "3 people are viewing this"; related-items rail longer than the product story.
- **Fable brief:** "Product page for [SKU, price]. The desire angle: [X]. Directions: stage treatment, included-truth presentation, Act-3 proof choice."
- **Builder brief:** "Direction [n]. Product data from storefront model (schema-drift check, rule 58); add-to-cart round-trip verified in-session; sticky bar coexists with mobile nav."
- **Harness QA:**
  - [ ] add-to-cart 200-path verified + error state visible on failure
  - [ ] price math matches backend
  - [ ] sticky bar at 375px doesn't cover content
  - [ ] gallery poster fallbacks
- **Village questions:**
  - Is the full cost honest at first glance?
  - Does Act 2 answer the real pre-purchase objections?
  - Cart failure mode graceful?

## 13. Waitlist page

- **Use when:** pre-launch capture — a feature/product exists as promise only. Highest craft-per-square-inch archetype: one screen must do everything.
- **Feel:** invitation to something already inevitable; scarcity of access, not scarcity theater.
- **Arc:** Mkt 4-act compressed into 2–3 viewports: Act 1 hook + Act 2 micro-proof merge; Act 3 = "what you'll get"; Act 4 = the field. **Hero:** C1 (teaser loop) or C4 letterform. **Motion:** M2 with the budget spent almost entirely on the hero.
- **Sections in order:** hero with the promise + email field visible immediately → 3-beat "what's coming" (C6 or simple glass triptych — asymmetric, not equal-3-up) → who's-building-this trust line → field reprise + expectation ("we email once, at launch").
- **Conversion goal:** email captured. Secondary: share.
- **Trust:** real builder identity, honest timeline language, privacy one-liner at the field ("no spam — cadence promise").
- **Mobile:** field + CTA in first viewport; keyboard doesn't hide the submit.
- **A11y:** email field labeled, error announced, success state focus-managed; hero motion reduced-motion-safe.
- **Components:** `GlowButton`, `GlassPanel`, single input pattern from `components.md`; confirmation state designed (not an alert()).
- **Anti-patterns:** asking more than email; fake signup counters; "launching soon" with no substance about WHAT; three viewports of scroll before the field.
- **Fable brief:** "Waitlist for [thing]. The one-sentence promise: [X]. Directions: hero teaser concept, the 3 proof beats, success-state moment."
- **Builder brief:** "Direction [n]. Email endpoint verified + double-submit guarded; success state in-page; og:image/first-frame sells alone (cinematic first-frame rule)."
- **Harness QA:**
  - [ ] submit round-trip + duplicate handling
  - [ ] field visible with keyboard open at 375px
  - [ ] success state reachable + screenshot
  - [ ] social preview renders
- **Village questions:**
  - Would YOU give this page your email?
  - Is the promise specific enough to filter the right list?
  - What does day-1 of launch email these people?

## 14. Case study page

- **Use when:** proving one engagement/transformation in depth — agency work (#6's ammunition) or a client transformation story (consented, IDs/roles per privacy rules).
- **Feel:** documentary, not brochure; the reader should feel the before-state viscerally.
- **Arc:** Mkt 4-act as narrative: Act 1 = the stakes (before-state), Act 2 = the approach, Act 3 = the turn + results, Act 4 = "this could be you" CTA. **Hero:** C2 parallax opening (the before-world) or bold editorial title block. **Motion:** M1–M2.
- **Sections in order:** stakes hero → context block (client class, constraints — anonymized per rule 8) → approach walk (numbered, honest, including what didn't work) → results: C9 with REAL metrics + `ChartEnvironment` before/after where data exists → pull-quote (Cormorant italic) → CTA to #10/#6 contact.
- **Conversion goal:** belief transfer → pricing/contact click. **Trust:** specific numbers with timeframes, methodology honesty, consent framing on any client story.
- **Mobile:** long-read comfort — 16–18px body, generous line-height, images full-bleed-to-gutter.
- **A11y:** charts carry text conclusions; pull-quotes are real `<blockquote>`; reading order linear.
- **Components:** `ChartEnvironment`, `GlassPanel`, `NarrativeDivider` typographic variant, `GlowButton` final CTA.
- **Anti-patterns:** results without timeframe; adjectives where numbers should be; PII leakage in "anonymized" stories; burying the outcome below 5 viewports of process.
- **Fable brief:** "Case study: [engagement, one-line outcome]. The dramatic arc: [before → turn → after]. Directions: stakes-hero concept, which 2–3 metrics carry the proof, pull-quote candidates."
- **Builder brief:** "Direction [n]. Metrics from real data (or explicitly labeled ranges); privacy scrub verified (IDs/roles only); template-izable structure — next case study is data, not new code."
- **Harness QA:**
  - [ ] privacy grep (no names/PII)
  - [ ] charts render with real data
  - [ ] reading flow at 375px
  - [ ] CTA click-through verified
  - [ ] print/reader-mode sane
- **Village questions:**
  - Does the before-state create tension?
  - Would the metrics survive skeptical due diligence?
  - Is consent documented for the story?

## 15. Documentation / knowledge-base site

- **Use when:** product docs, help center, internal runbooks surfaced to users. The anti-cinematic archetype: speed of answer IS the design.
- **Feel:** quiet precision; the Fira Code archetype; dark-first library.
- **Arc:** orientation-first (dash-style): Phase 1 = search + top intents; Phase 2 = the answer; Phase 3 = related/deeper; Phase 4 = "did this help" + escalation path. **Hero:** search-first header — search field IS the hero. **Motion:** M0–M1 (affordance transitions only).
- **Sections in order:** search + 4–6 top-intent links (asymmetric weighting by usage, not equal grid) → category tree (left rail desktop / collapsible mobile) → article layout: title, updated-date, TOC, body, code blocks (Fira Code), callouts → footer: helpful?-widget + support escalation.
- **Conversion goal:** answer found fast; deflection from support with satisfaction, not frustration.
- **Trust:** updated-timestamps on every article; honest "this doesn't cover X yet"; versioned accuracy.
- **Mobile:** search sticky; TOC collapses; code blocks scroll horizontally in-container (never page-wide overflow).
- **A11y:** the flagship a11y archetype — full keyboard nav, landmark structure, skip links, heading hierarchy strict, contrast everywhere; this page family should pass audits with zero findings.
- **Components:** `GlassPanel` obsidian variant, search pattern + callout/code-block patterns from `components.md`; NO `SheenCard` sell treatment anywhere.
- **Anti-patterns:** marketing motion in docs; centered narrow-column article text at desktop widths wasting the rail; screenshot-only answers; dead-end 404s without search.
- **Fable brief:** "Docs surface for [product area]. Top 6 user intents: [list]. Directions: search-header composition, category IA, article-template density."
- **Builder brief:** "Direction [n]. Article layout as one template component; search verified against real content index; code blocks with copy buttons; 404 routes to search."
- **Harness QA:**
  - [ ] search returns results
  - [ ] keyboard-only journey to an answer
  - [ ] code block overflow contained at 320px
  - [ ] heading-structure audit
  - [ ] helpful-widget posts
- **Village questions:**
  - Time-to-answer for the top intent?
  - Does IA match how users ask (not how the org is structured)?
  - Stale-content strategy?

## 16. Community / course landing page

- **Use when:** selling belonging + curriculum — SwanStudios community tier, challenges, cohorts, a course. Wedge rule: community reinforces coaching (adherence/retention), never generic-social noise.
- **Feel:** warm belonging inside the vault — people-forward, but premium (no cork-board clutter).
- **Arc:** Mkt 4-act. **Hero:** C1 with community-in-motion loop (real members/sessions, consented). **Motion:** M2.
- **Sections in order:** hero (identity: "your people") → Act 2: what happens inside (C3 walk: challenges, cohorts, events, badges — REAL screenshots) + host credibility (credentials rule applies) → Act 3: member transformation stories (mini-#14s) + rhythm calendar ("what a week looks like") → Act 4: join CTA + tier context (#10 module) + guarantee.
- **Conversion goal:** join/enroll. **Trust:** real member activity (never fabricated engagement), host credentials accurate, clear cadence expectations.
- **Mobile:** event/rhythm calendar → vertical agenda; join CTA sticky.
- **A11y:** member imagery has meaningful alt; badge rarity colors not sole differentiator.
- **Components:** `SheenCard` for challenge/cohort cards, `GlowButton`, `GlassPanel`, badge/rarity patterns from `components.md` (Common=Swan Lavender → Legendary=gradient).
- **Anti-patterns:** fake member counts; "join 10,000+ others" without truth; generic-social-feed screenshots as proof; FOMO countdowns; yoga/meditation language in wellness copy (stretching/flexibility only).
- **Fable brief:** "Community landing for [offer]. The belonging promise: [X]. The weekly reason-to-return: [Y]. Directions: hero loop concept, inside-look strategy, how Act 3 proves retention not just joining."
- **Builder brief:** "Direction [n]. Inside-look media from real product surfaces (scrubbed); join path verified through checkout/tier grant; calendar from real event data where live."
- **Harness QA:**
  - [ ] join → correct tier grant verified
  - [ ] no fabricated numbers in copy
  - [ ] hero poster tier
  - [ ] calendar renders empty-state honestly
  - [ ] 375px sweep
- **Village questions:**
  - What's the week-2 retention hook shown on the page?
  - Is every social proof element real?
  - Does this strengthen coaching or drift toward generic social?

## 17. Mobile app marketing site

- **Use when:** driving App Store / Google Play installs (the Victory-native roadmap surface). The product screen is the protagonist.
- **Feel:** the app in your hand — device-framed truth, thumb-scale reality.
- **Arc:** Mkt 4-act. **Hero:** device-frame C3 — phone frame sticky while app screens cross-fade through the core loop (log → chart → share). **Motion:** M2.
- **Sections in order:** hero device + store badges above fold → Act 2: core-loop walk (each C3 panel = one loop step with REAL app screens) → Act 3: outcomes C9 + ratings/reviews (real) → Act 4: store badges reprise + QR at desktop widths + SMS-link option.
- **Conversion goal:** store install. **Trust:** real screenshots (current build, not concept art), real ratings, platform availability honesty.
- **Mobile (the irony rule):** most visitors are ON the target device — the store badge is the hero CTA, one tap, instantly visible; don't make a phone user watch a desktop-oriented device-frame ballet.
- **A11y:** app screens are images — pair every panel with real text describing the step; badges have accessible names.
- **Components:** device-frame pattern from `components.md`, `GlowButton`, `GlassPanel`, C9 counters.
- **Anti-patterns:** concept-art screens that oversell; auto-playing app video with sound; desktop-first composition for a mobile-intent audience; fake review counts.
- **Fable brief:** "App marketing site for [app]. Core-loop moment that sells: [X]. Directions: device-frame choreography, which 3–4 screens make the walk, desktop-vs-mobile CTA strategy."
- **Builder brief:** "Direction [n]. Screens exported from the real app at correct DPR; C3 with stacked tier-2; store links/QR verified; on-device visitors get badge-first layout."
- **Harness QA:**
  - [ ] store badges resolve
  - [ ] mobile visitor sees CTA in first viewport
  - [ ] device-frame degrades to stacked screens
  - [ ] screen images sharp at 2x/3x DPR
  - [ ] QR scannable from a 1440p screenshot
- **Village questions:**
  - Do the screens shown match the shipped app?
  - Is the mobile-visitor path one tap?
  - What convinces at the decisive moment — screens or numbers?

## 18. Hermes Agentic OS command center (Cyberforest mode — Sean-only)

- **Use when:** Sean's private operator surface — approval queue, kill switches, receipts, agent status. NOT a product surface; governed by the Operator Bridge (T0–T4, §10 design boundary).
- **Feel:** Crystalline Cyberforest — the same token system in operator dress: darker, denser, bioluminescent-circuit accents; a night-forest ops room. Operator aesthetics NEVER leak into client-facing UI.
- **Arc:** Dash 4-phase. **Hero:** status-horizon band — runtime health, active agents, pending approvals count, master kill-switch state, all in one glance. **Motion:** M1 hard cap (an ops surface must never animate away trust; status changes pulse once, then rest).
- **Sections in order:** Phase 1 status horizon → Phase 2 approval queue (each entry: actor · command · tier · target · expiry; T3/T4 visually loud — Wing Purple for T3, Danger red + two-step confirm for T4 (badge ladder per design.md §15)) → Phase 3 receipts stream (append-only, filterable) + agent activity → Phase 4 next decision (oldest pending approval or "all clear").
- **Conversion goal:** operator decision speed — approve/deny with full context in minimum taps; kill switch reachable in ≤2 interactions from anywhere.
- **Trust:** receipts are the truth surface ("no receipt → it didn't happen correctly"); kill switches first-class panel, never buried; ambiguity rounds UP visually (uncertain tier renders as the higher tier).
- **Mobile:** Telegram is the mobile lane — this surface optimizes desktop/1440p+; still no hover-only controls (product rules apply to operator UI too: 44px, dark-first, reduced-motion, 4.5:1).
- **A11y:** tier distinctions never color-only (T-badge text always); approval actions keyboard-operable; focus trap on T4 two-step confirm.
- **Components:** `GlassPanel` obsidian variant, `GlowButton` (T4 confirm gets the two-step pattern from `components.md`), receipt/queue-row patterns; Cyberforest accent tokens per `design.md` — proposed tokens go through the token-proposal process, never hardcoded.
- **Anti-patterns:** marketing polish that obscures state; auto-refresh that moves a row as Sean reaches to click it; celebratory animation on destructive actions; any affordance implying an unregistered command is runnable (unregistered = blocked, not T0).
- **Fable brief:** "Hermes command center [panel]. The operator question it answers: [X]. Directions: status-horizon composition, tier-visual language, T4 confirm choreography. Cyberforest mode, M1 cap."
- **Builder brief:** "Direction [n]. Every action wired to the registry tier (no improvised tiers); kill-switch state fail-closed in UI (unknown = shown as OFF/blocked); receipts append-only; no direct DB reads — API layer only."
- **Harness QA (supervised, T0 read-only per Bridge §6):**
  - [ ] tier badges match registry entries
  - [ ] T4 requires two distinct interactions
  - [ ] kill-switch panel reachable ≤2 clicks
  - [ ] stale `Updated:` timestamps visibly flagged
  - [ ] no PII in any rendered receipt
- **Village questions:**
  - Can a tired Sean at 1am mis-approve a T4?
  - Does the UI ever imply more authority than the registry grants?
  - What does the surface look like when the daemon is down?

## 19. Coach Command Center (trainer product surface)

- **Use when:** the trainer's daily working surface — client roster, live-session logging, PLAUD review, proposal approvals. Product surface: multi-tenant, role-scoped via app auth (T2 within the signed-in trainer's scope — this is product authorization, not Hermes authority).
- **Feel:** the trainer's clipboard elevated to a cockpit — fast, glove-friendly, gym-floor real.
- **Arc:** Dash 4-phase. **Hero:** roster + next-best-action band — today's sessions, who needs attention, one-tap start-session. **Motion:** M1.
- **Sections in order:** Phase 1 today band (sessions, alerts: stale clients, pending PLAUD drafts) → Phase 2 live tools (find client ≤2 taps → start session → dictate/manual log → save) → Phase 3 client progress review (`ChartEnvironment` from real logs, plan-adjustment affordances) → Phase 4 queue (approve workout-log drafts, respond, plan next).
- **Conversion goal:** client workout logged/reviewed in fewest taps; the coaching loop (log → history → charts → plan adjustment) friction-free. Live-session flow is the sacred path.
- **Trust:** drafts vs committed logs visually distinct (T1 proposal vs saved truth); PLAUD-parsed artifacts arrive ONLY through approval-gated review (redaction-first per Bridge §6); credentials copy anywhere on-surface obeys the credentials rule.
- **Mobile:** gym-floor mobile is primary for live tools — one-thumb logging, big targets, interruptible flows that survive lock-screen; desktop for review/planning phases.
- **A11y:** dictation flows have full manual equivalents; timer/set counters readable at arm's length; no hover-dependent controls.
- **Components:** low-motion `SheenCard` client cards (geometry + chrome, no pointer-tracking), `GlowButton`, `ChartEnvironment` + `SafeChart`, approval-gate/draft-badge patterns from `components.md`, `GlassPanel`.
- **Anti-patterns:** burying start-session below analytics; duplicate client facts across roster card and detail; requiring desktop for anything live-session; auto-committing drafts without trainer approval.
- **Fable brief:** "Coach Command Center [slice]. The live-session moment: [X]. Directions: today-band composition, log-flow tap choreography (count the taps), draft-vs-truth visual language."
- **Builder brief:** "Direction [n]. Role scoping via app auth verified (rule 26 + trainer-role path); log write path end-to-end tested; PLAUD drafts render only post-redaction; tap counts measured before/after."
- **Harness QA:**
  - [ ] find-client→start-session→log→save ≤N taps (state N)
  - [ ] draft badge distinct from committed at a glance
  - [ ] 375px + 414px live-tool sweep
  - [ ] chart loading/empty/error
  - [ ] role isolation (trainer A cannot render trainer B's client)
- **Village questions:**
  - Can a trainer log a set mid-conversation without looking twice?
  - Is the draft/committed boundary abuse-proof?
  - What breaks when connectivity drops mid-session?

## 20. Swan Coach product surface (client-facing assistant)

- **Use when:** the in-app coaching assistant clients talk to — chat, workout-log drafts, proposals. Public product feature, governed by subscription tiers + approval gates (T1 ceiling: drafts/proposals; writes only through approval-gated endpoints). Never raw Hermes; never marketed as "AI" first — it's "Swan Coach".
- **Feel:** a knowledgeable coach in the room — warm precision, glass-panel calm; assistant presence without mascot cuteness.
- **Arc:** Dash 4-phase, conversational: Phase 1 = greeting with context ("since last time…"), Phase 2 = the conversation + capability affordances, Phase 3 = proposal cards (drafted workout logs, plan suggestions) with clear DRAFT labeling, Phase 4 = approve/edit/dismiss actions. **Hero:** chat surface + suggestion chips. **Motion:** M1 (message entrance, typing indicator honest to actual latency, reduced-motion shows instant final state).
- **Sections in order:** context greeting → conversation stream (user right / coach left, `GlassPanel` bubbles) → inline proposal cards (structured: exercises, sets, reps — editable before approval) → capability chips (what Coach can do at the user's tier) → tier boundary via `FrostedPaywall`/`CrystallineLockOverlay` when a locked capability is invoked.
- **Conversion goal:** proposal approved / action logged through the assistant; secondary: tier upgrade at genuine capability boundaries (never nagware).
- **Trust:** every write is a visible proposal the user approves (T1 → approval-gated endpoint); zero-PII posture (IDs client-side mapped); honest failure states ("I can't do that on your plan" / "that didn't save — retry"); no fake confidence.
- **Mobile:** chat is inherently mobile-first; input above keyboard; proposal cards approve-able one-thumb; 44px chips.
- **A11y:** stream is a proper log (aria-live polite); proposal cards fully keyboard-operable; typing indicator not the only progress signal; no yoga/meditation language in any Coach copy — stretching/flexibility.
- **Components:** chat bubble + proposal-card + suggestion-chip patterns from `components.md`, `GlowButton` on approve (Dual-Button Glow), `FrostedPaywall`, `CrystallineLockOverlay`, `GlassPanel`.
- **Anti-patterns:** sparkle-emoji AI branding; fake typing theater; silent writes without approval; burying the edit affordance on proposals; tier-gating mid-conversation without a graceful path back.
- **Fable brief:** "Swan Coach [surface/slice]. The assist moment: [X, e.g., post-workout log draft]. Directions: proposal-card anatomy, tier-boundary choreography, how trust is visible in the UI."
- **Builder brief:** "Direction [n]. All writes through approval-gated product endpoints (verify the command-lane registry — 20 live commands as of v14); tier gates reuse existing paywall components; conversation state survives refresh; rule 26 receipt on the mounted Coach route."
- **Harness QA:**
  - [ ] proposal → approve → verified backend write → rendered confirmation
  - [ ] locked capability shows the gate gracefully
  - [ ] refresh mid-conversation preserves stream
  - [ ] keyboard-open input visible at 375px
  - [ ] PII grep on rendered payloads
- **Village questions:**
  - Is the approval gate legible to a non-technical client?
  - Does the tier boundary feel like a door or a wall?
  - What happens on a hallucinated/unregistered command (must render as "can't do that", never a fake success)?

## 21. Experience / World Showcase site

- **Use when:** the page itself must become a memorable place: a world-factory showcase, non-Swan campaign microsite, client/agency experience demo, or Sean-approved Swan brand statement. It is never a dashboard, checkout, onboarding flow, Coach surface, or Hermes Operations Center.
- **Feel:** selected from one immutable World DNA recipe in `worlds.md`; spectacle with a proof spine. The visitor remembers the place, understands the offer, and can still act if every effect fails.
- **Arc:** Mkt 4-act stretched up to the justified M4 ceiling. **Hero:** B0 world-native poster with live B1/B2/B3 progressive enhancement. **Motion:** M4 only after the full `experience-mode.md` ritual.
- **Selection:** suitability-filtered seeded roulette: surface/license → audience/content fit → capability fit → recent-use diversity → family-balanced draw. The receipt records catalog version, seed, eligible/rejected worlds, chosen World ID, palette law, WFX/PSY set, and restrained comparison.
- **Sections in order:** Act 1 threshold (world declaration + one page-level crescendo) → Act 2 proof expedition (C3/C9/C11 as appropriate; spectacle never replaces real evidence) → Act 3 transformation/participation (one optional WFX-10 moment that is always skippable) → Act 4 calm invitation (one unique conversion action, repeated at the peak and page end).
- **Inheritance law:** live M4 on an eligible non-product host promotes the entire host to M4 for licensing, performance, accessibility, approval, and QA. A product or Hermes/operator host rejects the live module; it may display only an inert B0 poster or pausable prerecorded M2 preview. There is no “embed it to avoid the gate” loophole.
- **Palette:** Swan-branded work always Law A. Law B is external/non-Swan only. M4 approval never grants a palette exception.
- **Conversion goal:** one unique action (inquire, register, view collection, request demo). The same action may appear at Act 3→4 and the page end; no competing CTA wall.
- **Trust/proof:** one hard proof spine in Act 2—real product capture, sourced metrics, accurate credentials, documented process, or consented case evidence. Psychology entries are `[HYPOTHESIS]`, never conversion guarantees.
- **Runtime contract:** B0 semantic DOM + still is unconditional; B1 media broad path; B2 WebGL2 production spatial after dependency approval; B3 WebGPU research enhancement. A failed rung falls without reload, blank canvas, lost copy, or changed CTA. Canvas never owns unique navigation, form state, pricing, legal text, or meaning.
- **Performance:** §M4 targets in `experience-mode.md`; visible Full/Lean/Still override; Pause Effects and Skip-to-Content/scene; offscreen/hidden pause; bounded drawing pixels/draw calls/memory; deterministic seed/time/backend in QA.
- **Mobile:** below 768px defaults to the art-directed B0/B1 storyboard unless a real device trace proves the higher rung. CTA, pause, skip, mute, and any playable control remain 44px+, one-thumb, and outside canvas hit-testing.
- **A11y:** reduced-motion tells the full four-act story; qualifying continuous motion has Pause/Stop; no >3 flashes in one second; keyboard never trapped in a pin/scene; informative visuals have DOM equivalents; audio begins intentionally and is never required.
- **Components:** standard semantic DOM, `GlowButton`, `GlassPanel`, `NarrativeDivider`; optional graphics sit behind the render ladder. Product charts remain Victory-backed even if WFX-13 adds supplemental art.
- **Anti-patterns:** WebGPU-only blankness; “every section is a signature”; 20vh scroll for a 5vh story; purple-pink cyber wallpaper; protected brand/film/game cloning; M4 as a product-surface Trojan horse; psychology used as a dark-pattern excuse.
- **Fable brief:** "Experience site. Target/audience/action: [X]. Eligible worlds from seeded receipt: [IDs]. Deliver 2–3 directions from different families, including one restrained option. Each: World DNA, Law, 4-act scene ledger, proof spine, one crescendo, WFX maturity, PSY hypotheses, B0–B3, performance cut list, why it could be wrong."
- **Builder brief:** "Implement Sean-approved direction [name]. Load only the chosen world/WFX/PSY sections plus experience-mode. Build B0 first, then B1, then approved B2/B3. No new dependency without its spike. Verify failure downgrade, Full/Lean/Still, reduced motion, Pause/Skip, provenance, and one unique action."
- **Harness QA:**
  - [ ] scroll=0 and all act-boundary captures at required viewports; first frame sells with JS disabled
  - [ ] forced B3 failure, forced B2, B2 unavailable, B1/B0, context/device loss where simulatable
  - [ ] 375/414/768/1440/2560×1440 smoke; finalists full Gate 1–3 matrix
  - [ ] brightest-frame contrast, keyboard/focus, pause/skip/mute, no canvas-owned meaning
  - [ ] frame/pixel/draw-call/memory/lazy-load/offscreen/disposal evidence
  - [ ] manifest records catalog/seed/world/WFX/PSY/provenance/hashes/browser versions/verdict
- **Village questions:**
  - Does the proof spine survive if every effect is removed?
  - Is the page one coherent world or a demo reel of unrelated tricks?
  - What does Lean cut first, and does Lean remain a beautiful M2 page?
  - Is any product/operator surface receiving live M4? If yes, REJECT.

---

## Closing rules

1. **Arc before pixels.** No archetype ships without its B2 arc (acts or phases) written in the task thread first — `swan-design-router` enforces it.
2. **Composition inherits.** Embedded archetypes take the host's arc position and motion budget; chains inherit the max budget AND the max command tier. Live M4 on an eligible non-product host promotes the whole host to M4; product/Hermes hosts reject it and may show only flattened B0/M2 previews.
3. **This codex applies the system.** Any conflict with `SWAN-CINEMATIC-DESIGN-SYSTEM.md` or `design.md` is a bug in THIS file — fix here, not there.
4. **Maintenance:** a new page type that doesn't map to these 20 → propose a new entry (matrix row + section) rather than freelancing; a repeated deviation inside an archetype → update that section in the same pass as the work that revealed it.

```

### FILE: docs/ai-workflow/design-brain/worlds.md  *(structurally excerpted - see note inside)*
```markdown
# World Engine — Themed World Catalog

- **Date:** 2026-07-12 · **Author:** Fable via builder agent, per SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12 · **Status:** CANONICAL within Design Brain scope
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > `design.md` > this file. A subordinate recipe may narrow this catalog; it may not broaden its palette, accessibility, performance, or surface license.
- **Catalog version:** `world-catalog.2026-07-12.v2`. The 18 names, five families, and `world.*` IDs are immutable; prose, evidence, and implementation maturity may improve under a new catalog version.
- **Purpose:** select a complete visual world, not a wallpaper. Every recipe carries setting, content fit, palette law, World DNA, story proof, one action, loss-safe rendering, ethical hypotheses, provenance, and the precise failure mode that turns it into cheese.

## Palette laws
- **Law A — Swan-Tinted World.** The world supplies the *setting* (imagery, atmosphere, media, particles); all UI chrome — buttons, text, glow, focus rings, panels — stays on Crystalline Swan tokens. Dual-Button Glow intact. **Required for anything on a SwanStudios-brand surface** (sswanstudios.com marketing pages, brand films, Content Studio outputs published under the Swan name).
- **Law B — Licensed Departure.** The world runs its own curated native palette (5–8 named colors with roles). Allowed only for non-Swan factory outputs, non-Swan campaign microsites, client/agency demos, and internal experiments. Still dark-first by default, WCAG 4.5:1, and `var(--world-*, #fallback)` disciplined. Sean's M4 approval controls intensity, not palette law: Law B never ships under Swan chrome; adapt the world through Law A instead.
- **Galaxy-Swan clarification:** electric cyan/purple remain legitimate hues in Law-B worlds, but the exact retired Galaxy-Swan hex values may appear only in an explicit ban/negative prompt, never as a positive palette assignment. Swan-branded surfaces always remain Law A.

## Universal runtime and license contract
- **B0 is unconditional:** a semantic DOM poster owns the headline, proof, navigation, one action, legal/consent copy, and any form state. Canvas/media is enhancement and `aria-hidden` when decorative; no higher backend may own unique meaning.
- **Quality modes:** Full, Lean, and Still are visible session choices. `prefers-reduced-motion` forces the authored static story; video does not autoplay, loops stop, final values render immediately, and every action remains available.
- **Loss behavior:** B3 failure falls to B2, then B1, then B0 in place—no reload, blank frame, uncaught error, altered proof, or changed action. Pause off-viewport/hidden-tab and dispose media, workers, listeners, WebGL/WebGPU resources on unmount.
- **Non-negotiables:** poster-first LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75; 4.5:1 text contrast at the brightest frame; 44px targets; no autoplay audio; no more than three flashes in one second; visible Pause Effects and Skip-to-Content/scene controls when movement qualifies.
- **Surface boundary:** product dashboards, storefront/checkout, Coach, onboarding, and live operator/command surfaces never host live M4. Product surfaces may show only an inert B0 poster or pausable prerecorded M2 preview. Hermes Operations Center remains M1 calm Cyberforest and never inherits a World Engine world.

## Maturity vocabulary
`AVAILABLE` means browser-native or installed with a working repo pattern; `PROGRESSIVE` means feature-detected with complete fallback; `DEPENDENCY-GATED` means absent today and blocked on a separate approved compatibility spike; `RESEARCH-ONLY` means factory/lab evidence only. Hybrid labels state the maturity of different rungs rather than pretending a frontier path is production-ready.



> **[PACKET NOTE — EXCERPTED]** `worlds.md` is 105 KB / 18 full World DNA recipes. To keep this packet inside a reliable context budget it includes the **laws, the runtime/license contract, the maturity vocabulary, BOTH gold exemplars verbatim, the full 18-world manifest by name, and the deterministic roulette algorithm** — and omits the interior of the other 16 recipes, which are structurally identical to the two exemplars shown. **Do not claim a world or a field is 'missing' on the basis of this excerpt.** If your critique needs a specific omitted recipe, name it and it will be supplied.


## Family 1 — Natural Sublime
*Awe through vastness and intricate detail; the family closest to Swan's frozen-forest DNA.*
### 1. Glacier Cathedral — Gold exemplar 1 of 2
- **Name + family · Stable ID + retrieval keys · Mood words:** Glacier Cathedral · Natural Sublime · `world.natural-sublime.glacier-cathedral` · `glacier`, `ice-cave`, `aurora`, `crevasse`, `frozen-cathedral`, `patient-awe` · glacial, vast, luminous, patient, sacred.
- **World DNA:** material = pressure-polished blue ice and sparse mineral inclusions; light = below-horizon sapphire transmission with one Act-3→4 gold shift; weather = suspended ice dust, no blizzard; camera = slow dolly and one downward crevasse reveal; depth = translucent strata plus fog only on distant masses; topology = nave → proof chambers → descent → sunlit threshold; interaction = deliberate scroll and one calm action; sonic-silence = silence-first, opt-in low ice resonance only; primary gene = internal light through mass; opt-in accent world = none.
- **Audience + content fit:** premium transformation, expedition, science, architecture, stretching/flexibility-centered wellness language, and disciplined brand stories for visitors who respond to majesty and patience; disqualify urgent utility, dense comparison, cheerful family retail, or any task where atmosphere delays a decision.
- **Palette law + world palette:** A-on-Swan/B-in-non-Swan-factory. Law A ratios: Obsidian Black 50% → Midnight Sapphire/Royal Depth 30% → Ice Wing 15% as crevasse/aurora light → Frost White 4% type → Gilded Fern 1% at one warm beat; Arctic Cyan is data-only. Critical pair: Frost White on Obsidian/Carbon with a measured media scrim. Law B native set: `--world-abyss #07111D` ground, `--world-pressure-blue #123C67` ice mass, `--world-crevasse #62CBE8` transmitted light, `--world-frost #EEF8FA` type, `--world-aurora #7F79D9` sky accent, `--world-low-sun #D4A85A` one warm cue; critical pair is Frost on Abyss/Pressure Blue.
- **Atmosphere recipe:** BG = aurora band plus ice-mass poster at 0.25 parallax; MID = sparse cut-ice planes/C12 sapphire panels under Law A; FG = high-contrast headline, proof, and action; WEATHER = crystals at ≤0.03 opacity plus 3% grain. Light rises from below-left, shifts gold only at the final boundary, and distant fog never crosses copy. Static topology preserves the nave, proof strata, crevasse, and threshold in that order.
- **Motion language + typography lean:** nothing hurries: 12–20s aurora drift, 700–900ms narrative reveals, one WFX-08 crevasse descent, and luma-through-white “ice flare” act cuts; Still holds the deepest readable crevasse frame. Law A uses Plus Jakarta Sans display at −2% tracking, Cormorant Garamond Italic for one sacred beat, and Fira Code for sourced measurements; Law B uses a rights-cleared restrained neo-grotesk plus high-contrast editorial italic.
- **Signature WFX + backend ladder:** WFX-08 Scroll Film — PROGRESSIVE via rAF/IO, DEPENDENCY-GATED only for a GSAP adapter; WFX-02 Particle Field — AVAILABLE at restrained B1, DEPENDENCY-GATED for GPU swarm; WFX-12 Atmospheric System — AVAILABLE with installed CSS/Framer; WFX-06 Variable-Font Animation — PROGRESSIVE. Eligible B0 semantic poster, B1 layered media/CSS/SVG, B2 WebGL2 spatial ice after dependency approval, B3 refractive-ice research only. B2/B3 own no copy, proof, or action.
- **Seedance seed brief:** Scene/subject = slow dolly through a vast glacial ice cave with sapphire internal luminosity, pale cyan ceiling shafts, drifting crystal motes, and aurora beyond the mouth; Style = photoreal cinematic nature documentary with restrained fantasy; Palette = selected Law A grade or Law B set above; Motion = seamless slow dolly and almost-static aurora; Duration = 8s; Aspect = 21:9 master plus 16:9/9:16 crops; Output = MP4 H.264 + AVIF/WebP poster; Fallback still = crevasse shaft crossing the headline-safe negative space; Emotional job = awe; Section = C1 hero/C2 descent; Negative = people, text, watermarks, green cast, warm interior light, cartoon ice, lens-flare kitsch, frosted-glass-UI look, or retired-brand cyan `#00FFFF` saturation.
- **Asset provenance:** the run manifest must record exact generator and model version, this prompt verbatim plus seed/settings, UTC creation time, SHA-256 of master and derivatives, rights/license terms, and “no person/likeness requested”; any external ice reference needs creator/source and reuse terms. Required derivatives: 3840/2560/1920/1280/768 AVIF/WebP posters, 21:9/16:9/9:16 encoded loops, and a 1200×630 social still.
- **Psychology hypotheses:** PSY-01 Awe `[moderate, theory-backed/context-sensitive]` targets voluntary Act-2 reach; counter-metric = time-to-primary-action; falsify/stop if reach fails to improve ≥5% or action latency worsens >10% across two runs. PSY-04 Peak-End `[moderate, retrospective-judgment evidence]` targets qualified action recall; counter = CTA comprehension; stop if the gold shift does not improve recall or obscures the action. PSY-05 Aesthetic-Usability `[moderate, perception evidence]` targets perceived craft; counter = task success/INP; stop on any usability or performance regression.
- **Proof + action contract · Licensed surfaces:** Act 2 exposes three sourced proof strata—method, artifact, verified outcome—with captions outside canvas; the only conversion action is **“Enter the Expedition”**, first earned at Act 3→4 and repeated unchanged at page end. Licensed subset: Sean-approved Swan marketing/landing and Swan brand films/campaigns under Law A; non-Swan campaign microsites, client/agency demos, and factory experiments under Law B.
- **Reduced-motion still · Anti-cheese line:** zero-motion poster = one crevasse light shaft on sapphire ice, proof strata visible below, headline set in the light, final action in the quiet threshold. **Anti-cheese:** it goes tacky the moment ice becomes frosted-glass UI decoration everywhere—the world is the cathedral, not a blur filter.

### 11. Neon Meridian — Gold exemplar 2 of 2
- **Name + family · Stable ID + retrieval keys · Mood words:** Neon Meridian · Constructed Tech · `world.constructed-tech.neon-meridian` · `cyberpunk`, `rain-city`, `hologram`, `signage-canyon`, `wet-street`, `amber-humanity` · electric, rain-slick, dense, alive, midnight.
- **World DNA:** material = wet asphalt, dark steel, glass, steam; light = signage from above plus reflected street light below; weather = rain at two depths and slow steam; camera = reader-height forward dolly, no chase sequence; depth = sign bokeh → façade planes → reflected ground; topology = street mouth → proof storefronts → meridian crossing → warm doorway/action; interaction = crisp foreground response while the city remains background; sonic-silence = silent default, opt-in rain bed only; primary gene = every light repeats on the ground plane; opt-in accent world = Chrome Sovereign for one warm penthouse window.
- **Audience + content fit:** entertainment, fashion, nightlife, games, creative-tech, music, and culture-forward campaigns; disqualify Swan chrome unless fully translated to Law A, regulated services, calm utilities, older audiences needing low density, or any brand whose proof would disappear inside atmosphere.
- **Palette law + world palette:** Law B. `--world-nm-void #060608` ground, `--world-nm-signal-magenta #FF2E88` signage/action, `--world-nm-current-cyan #23D5E8` holograms/data, `--world-nm-sodium-amber #FFB13D` street warmth/humanizing 5%, `--world-nm-hologram-violet #9B5CFF` depth accent, `--world-nm-wet-steel #1A1F2E` surfaces, `--world-nm-rain-white #E8F0F8` type. Rain White on Void/Wet Steel is critical; Void large text on Signal Magenta is the action pair. Magenta OR cyan dominates a scene, never parity; amber appears in every act.
- **Atmosphere recipe:** BG = signage-canyon parallax; MID = wet-steel panels, steam, and reflection plane; FG = Rain White copy and single Magenta action; WEATHER = rainfall at two depths plus ≤2 glitch beats/page and 2% grain. Signage glows from above and asphalt reflects from below; a dark reader lane keeps 4.5:1 at the brightest frame. Static topology retains canyon, proof storefronts, meridian, and amber doorway.
- **Motion language + typography lean:** the city never sleeps but the reader's lane is calm: background rain/neon drift, foreground 120–200ms response, signature “hologram re-materialize” scanline+opacity act cut; glitch ≤2/page. Still freezes rain and signage bokeh with amber window intact. Rights-safe extended geometric sans for display, condensed mono for data/HUD, plain readable grotesk for body; no chrome novelty font.
- **Signature WFX + backend ladder:** WFX-01 — DEPENDENCY-GATED B2/RESEARCH-ONLY B3 with encoded/CSS fallback; WFX-04 — DEPENDENCY-GATED and M4 only; WFX-07 — AVAILABLE/PROGRESSIVE; WFX-12 — AVAILABLE. Eligible B0/B1/B2 and B3 refraction research only; a failed shader leaves the identical rain-frozen poster, proof, and action.
- **Seedance seed brief:** Scene/subject = rain-soaked neon metropolis street canyon, towering abstract holographic signage, amber street-level light, wet asphalt mirror reflections, steam vents, no foreground people; Style = cinematic urban realism, deep optical layering; Palette = exact Law B roles; Motion = slow forward dolly, rain, subtle sign drift, seamless; Duration = 8s; Aspect = 21:9 plus 9:16; Output = H.264 + AVIF/WebP; Fallback still = rain-frozen canyon with amber window and left dark copy lane; Emotional job = curiosity/aspiration; Section = C1/C3; Negative = daylight, pink-purple wallpaper gradient soup, cartoon/anime, readable real-brand text, trademarked logos, chrome “CYBER” title, foreground likeness, flashing, watermark, retired Galaxy-Swan tones.
- **Asset provenance:** record generator/model/version, exact prompt/seed/settings, UTC timestamp, SHA-256, commercial terms, and every architecture/signage reference; require no real brand, private identity, protected character/interface, or recognizable person. Store loop/poster derivatives, signage-similarity review, brightest-frame contrast sample, font licenses, and alt descriptions.
- **Psychology hypotheses:** PSY-02 `[moderate/context-dependent]` targets intentional Act-2 continuation; counter = proof find time; stop if density/occlusion hides proof, pricing, consent, navigation, or action. PSY-06 `[moderate-to-strong/contextual]` targets perceived depth while fluent foreground copy preserves comprehension; counter = comprehension; stop if comprehension drops >5%. PSY-03 `[moderate-to-strong for isolation memory]` targets the single Magenta action's recall; counter = action misclicks; stop if other magenta signs compete.
- **Proof + action contract · Licensed surfaces:** Act 2 converts three “storefronts” into clearly sourced case artifacts, outcome, and attribution; the only action is **“Cross the Meridian”**, repeated at Act 3→4 and page end. Licensed subset: non-Swan campaign microsites, client/agency demos, Content Studio experiments not published under Swan, and factory experiments. A Swan use must be re-authored under Law A, never excepted.
- **Reduced-motion still · Anti-cheese line:** zero-motion frame = rain frozen, signage bokeh, amber window, three readable proof storefronts, headline in Rain White, and one Magenta action. **Anti-cheese:** it dies the moment it becomes a flat purple-pink gradient with “CYBER” in a chrome font—the world is wet, layered, amber-warmed density, not a synthwave poster.


#### Full 18-world manifest (families + world names, in order)
## Family 1 — Natural Sublime
### 1. Glacier Cathedral — Gold exemplar 1 of 2
### 2. Evergreen Dominion
### 3. Emerald Canopy
### 4. Cascade Vault
### 5. Prairie Horizon
### 6. Alpine Apex
## Family 2 — Cosmic
### 7. Webb Deep Field
### 8. Nebula Drift
### 9. Exo Eden
## Family 3 — Constructed Tech
### 10. Grid Runner
### 11. Neon Meridian — Gold exemplar 2 of 2
### 12. Chrome Sovereign
### 13. Signal City
## Family 4 — Miniature & Play
### 14. Tiny Metropolis
### 15. Pocket Worlds
### 16. Voxel Realm
## Family 5 — Cinematic Real
### 17. Film Frame
### 18. Archive Editorial
### Selection receipt
### Stable roulette algorithm v1 (`world-roulette.v1`)

## Deterministic world roulette
Roulette is a deterministic, suitability-filtered draw: `surface/license → audience/content fit → capability fit → recent-use diversity → seeded family-balanced draw`. Record catalog version, seed, eligible set, rejected worlds/reasons, recent-use history, final draw, and restrained comparison. For 2–3 directions, choose families uniformly before choosing a world so the six-world Natural family does not dominate. For a five-site proof, choose exactly one per family. Random never bypasses the B2 arc, scene ledger, approval, palette law, or M4 gate.

### Selection receipt
1. **Inputs:** target surface, Swan/non-Swan ownership, audience, content job, proof available, desired motion budget, B0–B3 capability ceiling, accessibility needs, catalog version, recent-use window, and explicit seed.
2. **License filter:** reject Law B under Swan chrome; reject live M4 on product/checkout/Coach/onboarding/operator surfaces; reject every World Engine world for Hermes Operations Center. Offer Law-A translation or inert B0/pausable M2 preview where the central license permits it.
3. **Suitability filter:** apply each entry's mismatch sentence. A visually attractive world with the wrong audience, task, evidence, seriousness, or device budget is rejected with the exact reason.
4. **Capability filter:** preserve candidates whose authored B0/B1 result meets the job; higher-rung availability may rank but never rescue a weak poster. Any required unavailable dependency rejects that implementation rung, not the world when its lower rung remains strong.
5. **Diversity and draw:** exclude recent repeats unless Sean explicitly overrides; select family with a seeded uniform draw, then select uniformly among eligible worlds inside that family. Never weight by family size.
6. **Output:** emit seed, catalog version, eligible IDs, rejected IDs/reasons, chosen ID, palette law, surface-license verdict, one logline, proof/action contract, PSY IDs, WFX/maturity manifest, B0–B3 plan, and the nearest restrained alternate from a different family.

### Stable roulette algorithm v1 (`world-roulette.v1`)
1. **Eligibility always runs first.** Evaluate the central surface license, this entry's audience/content mismatch, required B0 quality, capability ceiling, and current dependency maturity before any hash or draw. Emit every accepted ID and every rejected ID with one stable reason code. Candidate/world IDs and rejection codes use lowercase ASCII alphanumeric segments separated only by one `.`, `-`, or `_`; family IDs use the same segments with single `-` separators only. Leading, trailing, repeated, mixed-adjacent, non-string, and duplicate IDs or codes fail closed before selection. Sort both lists by raw ASCII ID.
2. **Normalize and frame the seed.** Interpret the supplied seed as a Unicode string, normalize it with NFC, then encode it as UTF-8 without a BOM. Do not trim, case-fold, or apply locale rules. If no seed is supplied, generate one 128-bit cryptographic seed once as lowercase hexadecimal, record `seedGenerated: true`, and record it before selection; an explicit seed records `seedGenerated: false`, and every replay uses the recorded seed. Define `frame(x) = uint32_be(byteLength(x)) || x`, where `x` is UTF-8 bytes.
3. **Create deterministic draw bytes.** For each selection step, start `counter = 0` and compute `digest = SHA-256(frame("world-roulette.v1") || frame(catalogVersion) || frame(seedNFC) || frame(stepId) || uint32_be(counter))`. Read the digest's first eight bytes as unsigned `uint64_be x`. For a sorted pool of size `m`, set `limit = floor(2^64 / m) * m`; reject `x >= limit`, increment the counter, and hash again. Otherwise select index `x mod m`. This rejection sampling prevents modulo bias.
4. **Apply recent-use exclusion deterministically.** The receipt supplies recent-use IDs as an array of unique, syntactically valid stable string world IDs in most-recent-first order. A non-array, non-string or malformed ID, or duplicate fails closed before seed generation or selection. Remove valid recent-use IDs after eligibility and before selection. If that would empty an otherwise eligible family, restore only its least-recently-used eligible member; an equal recency tie resolves by raw ASCII ID. Record every exclusion and restoration. Recent use never restores a license-, audience-, evidence-, accessibility-, or capability-rejected world.
5. **Balance families before worlds.** Sort eligible family IDs and each family's world IDs by raw ASCII byte order, never locale collation or object iteration order. For two or three directions, draw families without replacement with step IDs `family:0`, `family:1`, and `family:2`, then draw one world from each selected family with `world:<family-id>:<slot>`. For a five-family proof, use all five canonical families once in ASCII order and draw one world per family; if any family has no eligible world after permitted recent-use restoration, fail closed. A batch larger than five begins a new family cycle only after every eligible family appeared in the prior cycle; selected world IDs remain without replacement while candidates remain.
   Multi-cycle detail: the first complete cycle uses ASCII family order. Every later full or partial cycle draws still-active families without replacement with `family-cycle:<cycle>:<slot>`; a family drops from a later cycle only after its post-diversity candidate pool is exhausted. A request beyond all available post-diversity candidates fails closed rather than repeating a world.
6. **Tie-break and replay law.** Any unresolved equal score, equal recency, duplicate digest interpretation, or restored-candidate tie resolves to the lowest raw ASCII world ID. Implementations must use the exact big-endian widths and NFC/UTF-8 rules above; substituting platform PRNGs, locale sort, floating-point hashes, or bare modulo creates a different algorithm and is forbidden under v1. Counter overflow fails closed.
7. **Record the replay receipt.** Persist algorithm ID/version, catalog version, original seed representation, `seedGenerated`, normalized seed, seed SHA-256, eligibility-rules version, ASCII-sorted eligible/rejected sets, stable rejection codes, ordered recent-use input, exclusions/restorations, every step ID/counter/digest/pool/index, selected families/worlds, and final restrained alternate. A replay that differs with the same receipt is a verification failure.
   Restrained-alternate detail: the suitability pass may assign each eligible candidate a non-negative integer `restraintRank` (default `100`; lower is more restrained). The receipt prefers the lowest-ranked unselected candidate from a family different from the first direction, then uses a selected different-family fallback only when every such candidate was already selected; equal rank resolves by ASCII world ID.
The roulette result is a direction proposal, not permission to build or promote. Real surfaces still pass Sean's concept choice, canonical surface receipt, experience-mode ritual, asset provenance, accessibility/performance gates, and independent hostile review.

```

---

## Section 4 - PRIOR HOSTILE REVIEWS (do not merely repeat these)

Two other frontier models have already reviewed an earlier upgrade plan for this brain. Their strongest surviving findings are listed so you do not spend your review rediscovering them. **Treat these as taken. Your value is in what they missed.** You may overturn any of them if you think they are wrong - say so explicitly.

**Kimi K3 found:**
1. A proposed "150 references minimum" research floor was cargo-cult rigor - reference *volume* is not taste, it is latency and context burn. The gate should be facet coverage with justification, not call count.
2. A proposed "Taste Ledger" that strips images, URLs, screen IDs and app names is a **write-only corpus** - it accumulates confident, unfalsifiable principles that drift into doctrine by repetition. Either allow some citation or admit it is a vibes journal and stop gating on it.
3. A proposed human-in-the-loop convergence loop with "no round cap" is an invoice generator with the founder as a synchronous bottleneck. Cap it and measure it.
4. A proposed "Swan Style Token" was described as a translation of Midjourney's SREF. It is not - SREF is a latent-space style embedding, a saved text preset is a prompt template. Calling it a translation is the exact cargo-culting the plan warned about.
5. **No measurement plan anywhere.** The "$100k bar" is asserted everywhere and operationalized nowhere. Scored by whom, with what rubric, at what cadence? Without a repeatable scoring instrument the whole upgrade's ROI is unverifiable. Kimi ranked this the single largest gap.
6. **No failure/rollback path** - no kill criteria, no A/B against current output, no revert plan.
7. **No agent-behavior spec** - the brain is consumed by agents with finite context windows, and no token budget per phase is ever stated. "The doc designs a museum, not a machine."
8. At the time of that review, **nothing on typography, grid, or layout systems** - "pixels of hero art over a weak grid still reads cheap." (NOTE: `typography-grid.md` now exists on `origin/main` and is included in this packet. Judge whether it actually closed the gap.)

**HY3 raised** overlapping concerns on medium-scope creep (web + audio-reactive + video + brand in one folder) and on unverified provider capabilities being designed around.

---

## Section 5 - WHAT SEAN IS ACTUALLY ASKING YOU TO ANSWER

Answer these directly and in order. Do not pad. Where a question is unanswerable from the packet, say so and say what evidence would answer it.

**Q1 - Does this brain actually produce $100k-tier work, or does it produce a well-organized average?**
Reading the doctrine as an agent would at task time: what will an agent actually output? Where does the doctrine give real taste, and where does it give vocabulary that *sounds* like taste but constrains nothing?

**Q2 - The measurement gap.** Kimi called this the largest hole. Is it still open? Design the instrument: what is the rubric, who scores, at what cadence, and what is the pass line? Make it concrete enough to implement.

**Q3 - The agent-consumption problem.** This brain is ~5,300 lines across 30 files. An agent has a finite context window and a task to do. Is this loadable? What is the correct retrieval/loading architecture - full load, router-selected subsets, a compiled index, progressive disclosure? What should the per-phase token budget be? This is arguably the difference between a museum and a machine.

**Q4 - Contradictions.** Find every place two files in this corpus tell an agent different things. Historically a router/protocol contradiction (one doc naming a mode another doc hard-refuses) was the single largest cause of shallow output, because an agent resolving a conflict safely does the *minimum*. Hunt for more of these.

**Q5 - Coverage.** The brain is website-shaped. Sean also needs: audio-reactive visualizers, motion graphics / video / workout animation, 3D / WebGL / Three.js, scroll-driven animation and parallax systems, generative and abstract art as first-class media, and native mobile. Which of these genuinely need a contract in this brain, which are scope creep, and for the ones that stay - what does the contract need to contain?

**Q6 - The one thing.** If Sean could only change ONE thing about this brain in the next week, what is it, and what is the expected delta in output quality? Justify why it beats the runner-up.

**Q7 - ABSENCE-FIRST (spend real effort here).** What *should* exist in a world-class design brain that is completely absent here - not weak, absent? Rank by value left on the table. For each: what it is, why its absence costs, and the smallest version that would capture most of the value. Consider at minimum, and go beyond: taste/quality scoring; design critique automation; a component/pattern registry bound to real code; visual regression and screenshot diffing; a design-decision memory with retrievable rationale; accessibility beyond contrast ratios; performance budgets as design constraints; content and copy as design surface; empty/loading/error state doctrine; internationalization and long-string resilience; data-density and information-architecture doctrine; onboarding and first-run design; personalization and theming architecture; a feedback loop from shipped-surface analytics back into doctrine.

**Q8 - Anything else.** Explicitly invited. What did nobody ask about that matters?

---

## Section 6 - OUTPUT FORMAT

Markdown. Lead with a **one-paragraph verdict** - your honest overall read, stated bluntly. Then:

1. **Severity-ranked defects** (table: rank / finding / file+section / severity / why it costs).
2. **Contradictions found** (table: file A says X / file B says Y / what an agent does when it hits this).
3. **Absence-first gap ranking** (table: rank / what is missing / value left on the table / smallest version that captures most of it).
4. **Answers to Q1-Q8**, in order, headed.
5. **The 90-day build order** - what to do first, second, third, with the reasoning for the sequence.
6. **What you would kill** - what in this brain should be deleted or retired, and why keeping it costs more than removing it.

Do not hedge to be safe. A wrong-but-specific call Sean can test is worth more than a correct-but-vague one he cannot.
