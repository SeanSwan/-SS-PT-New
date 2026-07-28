# Swan Design Brain — Aesthetic/World Upgrade Master Prompt (2026-07-18)

- **Status:** ✅ **BUILD-AUTHORITATIVE** (2026-07-18). Delivery = Hybrid. Full review trail complete:
  - **Kimi rounds 1+2+3** (authority) → `AI-Village-Documentation/kimi-consults/design-brain-upgrade-round{1,2,3}.md`. R1+2 = converged spec (Two-World Doctrine + Scale-Reveal + 12 archetypes + eras-via-styleLensId + taste ledger + two-mode generator + Lane-A 14-var map + amendments ledger). R3 = build-authoritative delta (dispositions all Fable+Village findings; authors license law + credit manifest, [EXISTING]/[TO BUILD] tags, Three.js→sandbox-only, quantified perf budget, era-token namespacing, Pinterest struck, state aesthetics, escalation path, cost cap, version/rollback; **phased build order A/B/C/D**).
  - **Sean's 9 answers** (§7.5) · **Fable RATIFY-WITH-NOTES** (§7.6) · **AI Village 12/12 PASS** (§7.7).
  - **NEXT = BUILD Phase 1** (brain content slice, zero runtime code) in Kimi's view — see round-3 §C. Then Phase 2 (Lane A runtime), Phase 3 (first surface / Scale-Reveal). Deferred behind feasibility spikes: era content, procedural 3D, Three.js prod, MCP server, `design-authority` skill.
  - **Total paid consults this workstream: ~$1.90** (Kimi ×3 ≈ $0.72 + Fable $0.47 + Village $0.69).
- **Owner:** Sean (CEO/orchestrator)
- **DESIGN AUTHORITY + FINAL DECIDER (this workstream — Sean's override 2026-07-18):** **Kimi K3.** Looped as many rounds as needed to converge. The final brain content AND any code produced from it are authored **in Kimi's view / the way Kimi would build it — NOT Opus's or any other agent's.** Everyone else supplies ideas; Kimi arbitrates.
- **Builder (faithful to Kimi's spec):** Claude/Opus — gathers references, assembles packets, and implements Kimi's decisions without imposing its own taste. Architect = Kimi; builder = Claude.
- **Final ratification pass (inputs to Kimi, run ONCE at the end):** Fable ×1 + full AI Village ×1. They feed Kimi; they do not override Kimi for this workstream.
- **Goal:** take the existing Swan Design Brain — already comprehensive — and add the missing **aesthetic/world soul layer** so it becomes the "ultimate" callable design brain for Sean's AI agents, reusable across multiple websites, not just SwanStudios.
- **Privacy:** IDs/roles only. No client PII, no secrets, no committed Mobbin screenshots (principles only — external-reference-mcp §7).

> **Governance note (Sean 2026-07-18):** This overrides the standing "Fable = final decider on everything" default for the DESIGN-BRAIN aesthetic workstream only. Kimi K3 is the SwanStudios front-end design guru and is elevated to final design authority here. Rationale: this is a pure design-vision task and Sean wants a single, coherent authored voice. CLAUDE.md hard rules (token system, no retired theme, a11y, no PII) still bind everyone including Kimi — Kimi's authority is over aesthetic/structure, not over the safety/rule floor.

---

## 1. Compact site summary (the "only what it needs" briefing for Kimi/Fable)

**SwanStudios** is a trainer-led personal-training SaaS + community platform (production, `sswanstudios.com`, on Render).

- **Core product loop:** log the workout → save the diary entry → turn it into charts/progress proof → decide the next training action (user/trainer/admin) → make milestones shareable with the community.
- **Four surfaces:** user/client dashboard, trainer dashboard, admin dashboard, and **Swan Coach** (assistant; never called "AI" to users). All workout/progress-first.
- **Business model:** B2B2C — trainers run their business on it (clients, programs, payments, payouts). Wedge = coach workflow depth + first-party workout/progress data + paid accountability/community. NOT a generic fitness social feed.
- **Audience:** personal-training clients (incl. a wealthy golf/all-sports lead angle), trainers, gym/business operators.
- **Stack:** React 18 + TypeScript + styled-components (NO MUI, NO Tailwind for new Swan UI) · Node/Express/Sequelize/PostgreSQL · Victory charts · Render.
- **Theme:** Enchanted Apex: **Crystalline Swan** — dark-first, "dark room lit by glowing objects." Sapphire depths, ice-glow cyan, gilded gold, wing-purple glow, obsidian ground. (RETIRED Galaxy-Swan `#0a0a1a/#00FFFF/#7851A9` is banned.)
- **What THIS work is:** add a reusable **atmosphere + living-world aesthetic layer** on top of Crystalline Swan, themed to personal training + business, and make the whole design brain portable across Sean's projects.

---

## 2. Design Brain refresher (what already exists — so we ENHANCE, not rebuild)

The brain lives at `docs/ai-workflow/design-brain/` — **24 markdown files**, canonical within their scope, subordinate to two source-of-truth refs.

**Source of truth (above the brain):**
- `references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` — stack truth, page narrative arc (B2), C1–C12 pattern library, generic-pattern bans. Wins all conflicts.
- `references/SWAN-ASSET-STORYBOARDING.md` — asset archetypes, emotional jobs, per-section rules, Seedance 2.0 prompt templates. **Already contains Sean's nature/cosmic taste (§D1).**

**The brain (`design-brain/`):**
- `design.md` (canonical system) + `design.html` (visual mirror) — tokens, two modes (Crystalline Swan + operator-only Cyberforest), typography, spacing, every component spec, charts, states, mobile/wide rules, motion + a11y summaries.
- `motion.md` · `components.md` (C1–C12) · `anti-patterns.md` · `qa-gates.md`.
- Generators: `cinematic-pages.md` (story-arc pages) · `website-archetypes.md` (landing/SaaS/dashboard/portal/portfolio/e-comm/community/operator recipes).
- `adapters/` — per-agent guides (builders, fable, hermes, reviewers, product-surfaces, cinematic-site-generator, knowledge).
- `obsidian/` + `graphify/` — knowledge-vault + relationship-graph bridges.
- `external-reference-mcp.md` — the Mobbin reference gate (now LIVE + verified 2026-07-18).

**Verdict: the brain is STRONG on structure** (tokens, patterns, motion, a11y, components, QA). **It is THIN on the aesthetic soul** — the "what does the world FEEL/LOOK like" layer lives only as brief templates in asset-storyboarding, not as a first-class, reusable **World & Atmosphere system**. That thin spot is exactly this upgrade.

---

## 3. What's already in flight (do NOT duplicate — absorb)

- Sean's atmospheric taste is **already documented**: `SWAN-ASSET-STORYBOARDING.md §D1` — glaciers, ice caves, mountains at dawn, waterfalls, botanical macro, **nebulae / James Webb / aurora / star fields**, Caribbean water. Palette line even names "cosmic nebula + wing purple."
- A **Living World Generator** already shipped 2026-07-17: `AI-HANDOFF/SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT-2026-07-17.md` + `KIMI-WORLD-GENERATOR-MASTER-PROMPT-FINAL-2026-07-17.md` (+ Kimi blueprint set). This is the seed of the micro-world pillar.

**Implication:** this upgrade is the **umbrella** that (a) promotes the scattered atmospheric taste into a first-class World & Atmosphere system, (b) adds the genuinely-new **living micro-world** pillar, and (c) folds in the 2026-07-17 Living World Generator instead of forking it.

---

## 4. The aesthetic vision — three pillars (the upgrade target)

### Pillar A — Atmospheric realism (promote existing taste to a quality BAR)
National-Geographic-grade + **Microsoft-Spotlight/Windows-lockscreen-grade** professional photography as the quality standard. Subjects: cosmos (nebulae, James Webb, aurora, star fields), snow-capped mountains, glaciers/ice caves, waterfalls, aerial landscapes, US environments (California, Texas, New York, Florida, Montana, Seattle) + Canada, botanical macro. **Named standard:** "shot by a National Geographic / Windows Spotlight photographer" = the fidelity bar for any hero/atmosphere asset.

### Pillar B — Living micro-worlds (the NEW pillar)
Ultra-realistic **tilt-shift miniature dioramas** — tiny, hyper-detailed worlds you peer INTO, with tiny **diverse people (all ethnicities, ages, body types)** living real life: driving, working, and **training**. "The Sims, but photoreal." Themed to personal training + business: a miniature gym, a running track through a tiny city, a neighborhood of movement — the "living world of SwanStudios." Absorbs the 2026-07-17 Living World Generator. Technical vocabulary to standardize: tilt-shift, miniature/diorama, isometric peer-in framing, macro depth-of-field.

### Pillar C — Fused with Crystalline Swan (never forks the system)
The atmospheric/world imagery sits UNDERNEATH the sapphire/ice/gold/obsidian glass-and-glow system. Dark-first "dark room lit by glowing objects." The aesthetic layer NEVER forks the token system (rule 6), never reintroduces retired Galaxy-Swan, always ships 2D/reduced-motion/perf fallbacks (rule 25 + LCP budget), always passes contrast/a11y gates.

### Reusability (Sean's cross-site goal)
Define the layer as a **portable "World & Atmosphere system"**: named archetypes + generation briefs + a subject-swap protocol, so other Sean sites adopt the same soul with different subject matter (a different business = different tiny world + different atmosphere, same discipline).

---

## 4.5 Extensible taste context + era style-packs (Sean 2026-07-18)

**(a) Living taste profile — extensible by Sean.** Sean's aesthetic taste is captured as a GROWABLE context, not a fixed list. It seeds with what he has named and he keeps appending references/subjects/moods/styles over time. The system must make adding taste trivial — a defined place + format Sean drops new directions into, that all downstream generation reads. Home: a `taste-profile.md` (or an append-only "Sean's taste ledger" section in the World & Atmosphere file). **Design it to grow.**
Seed captured so far: NatGeo + Windows-Spotlight atmospheric realism (cosmos/nebulae/James Webb/aurora, snow-capped mountains, glaciers/ice caves, waterfalls, aerial US states CA/TX/NY/FL/Montana/Seattle + Canada, botanical macro); living tilt-shift micro-worlds (diverse people of all ethnicities/ages/sizes living + training, photoreal-Sims); fused with Crystalline Swan dark-luxury glass/glow.

**(b) Era style-packs — a mixable dimension.** Decade aesthetics as selectable, mixable accents layered over the base system (never replacing the Crystalline Swan token floor). Extensible — more eras/sub-styles can be added:
- **60s** — mod, psychedelic, op-art, retro-futurism, Saul-Bass geometry, bold flat color.
- **70s** — earth tones, groovy/disco, warm film grain, funk typography, sunburst motifs.
- **80s** — synthwave, neon grid, chrome, Memphis geometry, sunset gradients.
- **90s** — early-web/grunge, bold primary blocks, pixel, VHS grain.
- **2000s (Y2K)** — frutiger aero, glossy aqua, translucency, bubble.
- **2010s** — flat/material, long-shadow, minimal, big photography.
- **2020s** — glassmorphism, spatial depth, bento grids, cinematic dark (where Swan already lives).

**The engine's full layer model (all swappable/mixable, Sean-extensible):**
`identity (tokens/type/brand) + subject (atmosphere / micro-world) + style-pack (era) + system (universal patterns, motion tiers, a11y/perf gates)`.
Only the system layer is fixed; the other three are configuration. A new brand/site/campaign = pick an identity + subject + era mix, same universal system.

## 4.6 Autonomous authorship + generation stack — "get out of the model's way" (Sean 2026-07-18)

Source: the Fable-5 infinite-websites method. Core lesson: **design the PROMPT that designs the sites, not the site.** Give the authority model (Kimi/Fable) creative freedom + tools + a goal + a way to verify its own work, then let it run autonomously and iterate. The model's taste can exceed ours — don't impose a rigid top-down framework; get out of its way. This is the operating philosophy behind "build in Kimi's view."

**Reconciliation — adopt the freedom, keep Swan's floor (two modes):**
- **Freedom sandbox (EXPLORE):** standalone concept sites / cinematic worlds with full creative license — single-file Three.js/R3F, shaders, particle swarms, generative fonts, audio-reactive, **procedural 3D micro-worlds** (a procedurally-generated tiny living city IS the micro-world pillar). Kimi/Fable go nuts; N parallel variations; self-verified. This is where taste is discovered. Lane B's cinematic marketing worlds already live here.
- **Production translation (SHIP):** winning concepts are translated into Swan's disciplined React + styled-components + token + a11y + perf system for the real app. The freedom lane feeds production through a translation gate — never ship a single-file shader demo as a product surface without the discipline pass (rules 1/4/6/25 + qa-gates).

**Generation + verification stack (give the authority tools, then step back):**
- **Reference:** Mobbin (LIVE) for UI. GAP: a Pinterest/image-inspiration + photo-library (Unsplash/NatGeo-style) MCP for the atmosphere subjects — candidate to add (like we just added Mobbin).
- **Asset gen:** NanoBanana/key.ai + GPT-image (stills); **Seedance 2.0** (video/motion — our standard); candidate: a Higgsfield-style animation MCP for more pipelines.
- **Experience tech:** Three.js / R3F for 3D/shaders/particles (already sanctioned for "small surgical moments" — the sandbox extends this).
- **Self-verification:** Playwright MCP (LIVE) + `agent-browser` + `webapp-testing` — the authority opens its own output, screenshots, critiques it.
- **Parallelization:** the Workflow tool / sub-agents spin up many concept variations at once (eras × subjects × brands).
- **Iteration:** **≥3 self-critique passes** per concept (find problems, complexify/improve) — folds into Swan design dual-pass (rules 22–23).

**Direction:** static scroll → **experiences** (living 3D universes, audio-reactive, procedural worlds). That IS the micro-world pillar + Swan cinematic system given autonomy + tools. Feeds Kimi round 2 and is a core requirement of the `design-authority` skill.

## 5. Delivery form — how the brain reaches the agents (Sean asked for ideas)

| Option | What it is | Pro | Con |
|---|---|---|---|
| **A. Markdown brain (current)** | Agents read `design-brain/*.md` from the repo | Zero infra, already canonical, git-versioned, free, human-editable | Only agents that can read THIS repo get it; not portable to other tools/projects without copy-paste |
| **B. Design-Brain MCP server ("NPC on the side")** | Wrap the brain as an MCP server like Mobbin — tools e.g. `get_swan_tokens`, `search_patterns`, `get_asset_brief`, `check_against_rules` | Portable to ANY MCP tool (Claude, Codex, Cursor, other projects/websites) — same as how Mobbin works; queryable on demand | Infra to build + maintain; content still lives somewhere (MCP just serves it); overkill if only used in-repo |
| **C. Hybrid — markdown-first, MCP-wrap later (RECOMMENDED)** | Markdown stays the single source of truth; a thin MCP server later SERVES that same content to other tools/projects | One source of truth + portable delivery; mirrors Mobbin (content + access layer); phase the infra only once content is worth exposing | Two-step; MCP is a later slice |

**Recommendation: C.** Perfect the CONTENT (this aesthetic upgrade) in the markdown brain now — that's what Kimi/Fable opine on and what actually raises quality. Wrap it in an MCP server as a **separate later infra slice** once you want cross-project reuse. Don't build the server before the content is upgraded — the server is only as good as the brain it serves.

---

## 6. Mobbin usage discipline (Sean's "use it fully, don't look like scraping")

- **What Mobbin is FOR here:** structural/UX best-practice for the **fitness dashboards + progress charts + streak/gamified UIs** Sean asked about. Real shipped apps → real patterns.
- **What Mobbin is NOT for:** the atmospheric/micro-world art direction (that's generative imagery + Kimi/Fable creative direction + the asset system). Mobbin = flat production UI screens, not National-Geographic art.
- **Limits (as exposed):** the MCP schema caps `search_screens`/`search_sections` at ≤30 results/call and `search_flows` at ≤10; no published rate limit. Pulling reference sets for real design work **is the product's intended use** — that is fair use of a paid membership, not scraping.
- **Scraping vs. fair use:** scraping = automated bulk enumeration to REPRODUCE/redistribute their library. We do the opposite — **targeted, purposeful pulls tied to a real surface, extract PRINCIPLES not pixels, never commit their screenshots** (external-reference-mcp §7 already mandates this). Discipline: research in focused bursts, cite `mobbin_url`s for Sean to verify, stop when the pattern is clear. That both respects them and is how you actually get value from the membership.

---

## 6b. PORTABILITY MANDATE (Sean 2026-07-18) — brand-agnostic by design

The upgraded brain is a **reusable engine, not a SwanStudios-only artifact.** SwanStudios is the FIRST instantiation, not the boundary. Every pattern, archetype, and generation brief must be authored so a DIFFERENT brand adopts it by swapping only two layers:
- **Identity layer** (swappable): color tokens, typography faces, logo/wordmark, brand voice, the specific atmospheric subjects + micro-world theme.
- **System layer** (universal, never rewritten per brand): the pattern grammar, motion tiers, a11y/perf gates, the World & Atmosphere discipline, the hero-metric/streak/milestone/chart-environment structures, the fallback rules.

Write the brain so "Crystalline Swan" is a *config*, not a *hardcode*. A second brand = new identity config + new subject matter, same system. This is a first-class success criterion, checked at closeout.

## 6c. Mobbin research round 1 — distilled principles (NEVER cloned; translated + made brand-swappable)

24 screens pulled (web + ios; apps cited for Sean's verification only, never reproduced). Each principle below ships as a Swan pattern in our own tokens/copy/motion, authored brand-agnostically:

1. **Hero metric first** — the single most important number is the biggest element, top of surface (Tonal "109 WEEK STREAK", Nike "Run Level 49.5"). → Swan B2.2 Phase-2 gets the most real estate.
2. **Streak as a VISUAL, not a number** — dot-grid / calendar / flame celebrating consistency (Tonal dot-grid, Duolingo calendar, Strava, Streaks). → Ice Wing rings + reduced-motion static fallback.
3. **Progress-to-next-milestone always shown** — the gap to the next level ("43.04 mi to 1st milestone", Ladder "28/50"). → ties gamification to the Product Core Loop next-best-action.
4. **Composite score decomposed by dimension** — one score split into sub-parts (Tonal Strength 411 → Upper/Core/Lower). → a "Training Score" by movement axis / muscle group.
5. **Charts = headline number + delta + time-range selector + segmented metric toggles + single-focus area/line** (Quicken net worth, Substack growth, MacroFactor weight trend, Duolingo XP-with-comparison). → tighten the C11 chart environment with mandatory range + toggle affordances.
6. **Tiered/rarity badges with locked→unlocked states** (adidas hex badges, Ladder illustrated tiers, Life Reset 7/14/33/66-day shields with locked ghosts). → maps 1:1 to Swan rarity (Common/Rare/Epic/Legendary); locked ghosts create pull.
7. **Share the milestone** — explicit Share affordance on progress (Strava). → Product Core Loop shareable milestones.
8. **Celebration motion WITH a reduced-motion toggle** — Life Reset literally ships a "Display streak level-up animation" toggle. → validates rule 25; make the toggle a first-class pattern.

> These are STRUCTURE, not soul. The soul (NatGeo/Spotlight atmosphere + living micro-worlds) is generative art direction Kimi authors — Mobbin doesn't carry it. Deeper per-surface Mobbin pulls happen at build time for each real surface, not now.

## 7. The bounded engine (what "start now" executes)

1. **Claude → Mobbin research** (focused, principles-only): fitness/workout dashboards, progress/analytics charts, streak/gamified progress. Distill → in-brand HTML reference report (external-reference-mcp §5).
2. **Assemble the upgrade packet:** §1 site summary + §2 refresher + §4 three-pillar vision + §5 delivery decision + §6 Mobbin principles.
3. **Kimi K3 ×1** (`node scripts/consult-kimi.mjs --document <packet> --effort high`) → design-guru opinion on how to upgrade/enhance the brain.
4. **Fable ×1** (final decider) → upgrade opinion + arbitration over Kimi's + Claude's.
5. **Claude synthesizes** the three → the design-brain upgrade → lands in the markdown brain: new `design-brain/world-atmosphere.md` (the World & Atmosphere system) + extend `SWAN-ASSET-STORYBOARDING.md` (micro-world archetype + briefs) + `index.md` row + absorb the 2026-07-17 Living World Generator.
6. **(Later, optional)** wrap the brain as a Design-Brain MCP server (delivery-form option B/C).
7. **(Deferred — build at closeout, Sean 2026-07-18)** institutionalize this whole pattern as a reusable **skill**. Working name: `design-authority` (or `build-in-view-of`). It is a configurable generalization of the existing `fable-blueprint-forge` — same forge discipline, but the authority is swappable. Requirements to bake in (the AI must be reminded of ALL of these every single time the skill runs):
   - **Configurable authority.** A named model is the authoring voice — currently **Kimi = primary, Fable = secondary**, any AI swappable. All other agents + Mobbin + research feed it; the builder implements faithfully in the authority's view, never its own taste.
   - **Comprehensive, deep detail — never a thin sketch.** The authority must output a COMPLETE build package in its own vision: full architecture write-up, **Mermaid flowcharts, sequence diagrams, ERDs**, ASCII/HTML **wireframes**, file-by-file build order, exact signatures / paths / copy / tokens, "do NOT" bans, and per-slice executable acceptance criteria. A basic flowchart or one-line wireframe is a FAIL — the standard is "any competent builder AI can build it exactly as the authority would, with zero guesswork."
   - **Brand-agnostic + never-clone** discipline baked in (identity/subject/style-pack layers swappable; references translated, never copied).
   - **Auto-trigger.** The skill fires automatically whenever a design-authoring / build-in-a-model's-vision task is detected (trigger-based, like `prompt-watcher`), not only on manual invocation. It should "pop up and be used" when it fits.
   - Do not build mid-run — build once this run proves the pattern.

**Spend note (Rule 16):** steps 3–4 are paid OpenRouter calls (Kimi + Fable), bounded to ONE each — small, and Sean pre-authorized "Kimi and Fable one time." Confirm before firing.

---

## 7.5 Sean's answers to Kimi's 9 questions (2026-07-18) — CONVERGENCE CLOSED

1. **Photo-reference MCP → YES, add now.** Research + wire the best Pinterest/Unsplash-style photo-inspiration MCP, gated exactly like Mobbin (external-reference-mcp discipline). Flag any paid subscription cost before committing.
2. **Era default → ACCEPTED:** every app surface defaults to `lens-2020s-glass`; eras opt-in per campaign/marketing surface only.
3. **Identity config format → ACCEPTED:** markdown + YAML front matter at `design-brain/identities/{id}.md` (keeps hybrid/markdown-first delivery).
4. **Portability proof → PAPER EXERCISE:** prove portability with a fictional 2nd brand at closeout; no real project bound now.
5. **Epic provenance → FREE PATH:** NASA/ESA public-domain cosmos + generate-with-care-and-disclose for terrestrial. No licensing budget.
6. **Contrast enforcement → ACCEPTED:** dev-warn (in `WorldAtmosphere`) + CI-fail (world-gate).
7. **Higgsfield MCP → DEFER (accepted):** Seedance 2.0 stays the single motion pipeline.
8. **Scale-Reveal first surface → ACCEPTED:** milestone level-up, Vista (Miniature) → Ascent/Zenith (Epic). Lane A slots it.
9. **Taste cadence → ACCEPTED:** Sean appends to `taste-profile.md` anytime; Kimi promotes entries to archetype canon only at closeouts.

**Kimi spec is now fully converged with Sean's answers. → Fable ×1 ratify → full AI Village ×1 ratify → build in Kimi's view → `design-authority` skill.**

## 7.6 Fable ratification (2026-07-18) — RATIFY-WITH-NOTES

Fable (secondary reviewer; did NOT override Kimi) — buildable, internally consistent, no CLAUDE.md floor violation. Full: `AI-Village-Documentation/fable-consults/design-brain-upgrade-fable-ratify.md`.

- **C1 — HARD-BLOCKER (before ASSET ingestion, NOT code build):** "NASA/ESA public domain" is factually incomplete — NASA is generally PD, but **ESA/Webb + ESA/Hubble imagery is typically CC BY(-SA)** (attribution required). Sean's Q5 "free path" stays FREE but needs the correction. **Resolution folded in (recommended): add a mandatory per-asset CREDIT MANIFEST (source + license + attribution string) checked by world-gate** — keeps all cosmos imagery usable AND compliant (better than restricting to NASA-PD-only). Still $0.
- **C2 (advisory):** EXPLORE sandbox is bound by zero-PII + provenance laws too (only budgets/tokens waived) — add one sentence to `world-generator.md`.
- **C3:** give the tiny-faces rule a testable threshold (rendered face ≤N px / occluded / no real-person likeness / never seeded from client photos).
- **C4:** contrast-matrix dual-home — GENERATE the runtime data file from the brain table (one authored source), never hand-mirror.
- **C5:** bake GR-1 grade INTO delivered L0/L1 assets; reserve the CSS grade var for L2 synthetic (GPU perf on low-end mobile).
- **C6 (a11y):** Scale-Reveal needs focus + `aria-live` announcement (SR users perceive the celebration); restate 44px in world-gate; add forced-colors / High-Contrast statement (world layers drop to ground tier).
- **C7:** photo MCP → Unsplash/Pexels official APIs, NOT Pinterest (independently confirms our recommendation).
- **C8:** CI composite-contrast needs headless render (Playwright, already live); define sampled slots per `worldId×slot` for determinism.

**Disposition:** C1 folded (credit manifest — still free, still Sean's path). C2–C8 fold into the build spec as Kimi-dispositioned refinements. Fable called the Lane A reconciliation, the soul-mechanic-invariant acceptance test, and the append-only taste ledger genuinely strong. **Clear to proceed to full AI Village ratification → build in Kimi's view.**

## 7.7 AI Village ratification (2026-07-18) — 12/12 PASS, verdict "not yet build-authoritative"

Full 15-brain run + Opus judge. Cost $0.69 (under $10 cap). Reports: `AI-Village-Documentation/validation-prompts/latest/` (`synthesis.md` = judge verdict). Findings are **advisory input to Kimi** (Sean's authority directive). Vision validated as excellent; governance strong; token/brand compliance excellent. Gaps to close before build-authoritative:

**CRITICAL (fix inline before build):**
1. **License precision + automate Credit Manifest.** Exact: NASA = US-Gov PD (no-endorsement caveat); JWST/ESA-Hubble via STScI = **CC BY 4.0** (attribution, commercial OK, NO ShareAlike — refines Fable C1 which said BY-SA); ESA general = verify per-asset. Automate manifest via CI world-gate (block merge without license+attribution string).
2. **Stop over-claiming "existing."** Three.js/R3F is NOT production-sanctioned — tag "EXPLORE-sandbox candidate, not production-validated" + require the discipline pass before any 3D crosses the gate. Tag every §6c item `[EXISTING]` vs `[TO BUILD]` — Ice Wing rings + reduced-motion toggle are TO-BUILD.
3. **Quantify the perf budget.** State actual LCP/FCP/CLS numbers, image budget (Pillar A heroes), video budget (Pillar B), Three.js GPU-tier floor, asset-to-interaction latency; capture a live sswanstudios.com baseline for regression.

**HIGH (fix inline before build):**
4. **Era-token collision protocol** — namespace `--era-{id}-{property}`, WCAG-validate against Swan bg, never override core tokens (80s/70s/90s warm packs have no palette home). **Remove Pinterest from §4.6** (contradiction with Fable C7 — consolidate on Unsplash/Pexels).
5. **State aesthetics** — define how the Living World degrades in loading/empty/error (currently hero-only).
6. **Inline the convergence evidence** — summarize Kimi's authored spec (Two-World Doctrine, Scale-Reveal, 12 archetypes, Lane-A 14-var map) INTO this doc so a builder can act on it alone; add a **Kimi-vs-CLAUDE.md escalation path** + independent token/contrast check (mitigate single-point-of-aesthetic-failure).
7. **Security/privacy layer** — add auth+payment/PCI component specs to the stack; confirm Playwright is CI not local-only (else C8 isn't automated); soften/ substantiate the "Identity-Blind AI Privacy" claim; HIPAA-adjacent PHI safeguards + wearable controls if in scope.

**MEDIUM (build/next phase):** 8. Fitness rigor (Training Score = RPE/RIR × Volume Load; Rest-State UI Ice-Wing→Lavender; nutrition = Gilded Fern). 9. Re-scope timeline (core framework + generator absorption first; defer full era content + procedural 3D behind a feasibility spike). 10. Link aesthetic→engagement/business (per-pillar emotional goals + revenue hypotheses; white-label/era monetization). **Blind spots:** severity-scale standardization; i18n/RTL; version/rollback for the portable brain; hard cost cap for `design-authority`; manifest↔GDPR-deletion.

**Disposition:** These go to Kimi (authority) to disposition + author the final build-authoritative consolidated spec. → then build.

## 8. Convergence / done criteria

- Enough ideas gathered that the World & Atmosphere system can be written as a first-class brain file with: named archetypes, the two quality bars (NatGeo/Spotlight realism + tilt-shift living micro-world), per-surface usage, generation briefs, fallback/a11y/perf rules, token-fusion rules, and a subject-swap protocol for reuse on other sites.
- Kimi + Fable opinions folded in; contradictions resolved by Fable (final decider), CLAUDE.md rules win over any suggestion that forks tokens / reintroduces retired theme / breaks a11y.
- Lands in the markdown brain with an `index.md` row and a paired check against SWAN-CINEMATIC-DESIGN-SYSTEM.md (rule: brain never contradicts source of truth).
