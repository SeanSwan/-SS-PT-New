# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md
**Seed:** AI-Village-Documentation/kimi-consults/design-brain-upgrade-round1.md
**Tokens:** 9503 in / 13151 out · **Cost:** ~$0.2258 · **Wall:** 395.5s

---

# THE WORLD & ATMOSPHERE SYSTEM — Authored Spec (Round 2: Completion)
**Kimi K3 · Final Design Authority, Design-Brain Aesthetic Workstream · 2026-07-18**

Resuming exactly where the cut landed. Sections 0–2 stand as shipped. Picking up mid-sentence in §3.

---

## 3. The brand-agnostic engine (continued)

**The Two-Layer Law.** The brain is written so every world rule appears twice-once: first the **universal law** (brand-neutral prose), then the **identity binding** (the config that fills the law). This is not a documentation style — it is the portability mechanism itself. Every archetype entry, every brief, every gate must be separable into the layer that never changes and the layer a second brand rebinds. If a rule cannot name which layer it lives in, it is not finished.

The archetype tables in my locked §1 already obey the law structurally: the *universal slot* column is the law; the *Swan canon* column is the binding. What follows is the rest of the engine.

### 3.1 The identity config + the subject-swap protocol

**Where the layers live:**
- **System layer** (universal, never per-brand): Two-World Doctrine, fusion physics (Epic recedes / Miniature projects), GR-1/GR-2 grade *structure*, z-stack, fallback ladder L0–L3, luminance/contrast floor *mechanism*, Scale-Reveal mechanic, a11y/perf gates, Translation Test, provenance law, diversity spec. Lives in `world-atmosphere.md` + `world-briefs.md` (format) + `qa-gates.md`.
- **Identity layer** (swappable): palette tokens, ground tone, seam hues, type faces, brand voice, archetype subject bindings, micro-world theme, taste-profile pointer, default lens. Lives in `design-brain/identities/{identity-id}.md` — one markdown file per brand, YAML front matter for the machine-readable fields. Crystalline Swan is `identities/crystalline-swan.md`, the first config, not the boundary.

**Identity config schema (front matter):**

```yaml
identity_id: swan-crystalline
palette: { ground, seam_ice, seam_gold, seam_wing, glow }   # token refs, never hex here
type: { display, body }                                      # faces on the existing scale
default_lens: lens-2020s-glass
world_bindings:                                              # the subject column
  zenith:  [nebulae, jwst-fields, aurora, star-fields]
  ascent:  [dawn-ridgelines, snow-peaks, aerial-high-country]
  # ...one binding per adopted archetype; a brand need not adopt all 12
miniature_theme: "the living world of personal training"     # what the tiny world IS
taste_profile: design-brain/taste-profile.md
```

**The subject-swap protocol (how a second brand adopts the soul):** (1) choose which universal slots the product needs — archetypes are adopt-what-you-need, minimum one Epic + one Miniature; (2) bind subjects per archetype that serve the same *narrative job* and pass token harmony against the new ground/seams; (3) define the brand's Miniature theme — the tiny world of *that* business; (4) run the Translation Test + token-harmony check per subject; (5) author briefs per the standard format. The dawn/blue-hour bias, the luminance caps, the grades, the z-stack, the floors — none of that is Swan. That is law. Only the subjects and hues are config.

**Runtime corollary (this is where the engine meets Lane A):** the identity layer resolves to `paletteThemeId`; the archetype instance resolves to `worldId`; the lens resolves to `styleLensId`; the fallback tier resolves to `motionMode`. Four seams, four of my layers. Full mapping in §3.5.

### 3.2 Era style-packs — the decision

Sean asked: grade-and-type modifier, separate lens, or their own dimension. My ruling, and it is deliberate:

**Eras are style-packs deployed through the `styleLensId` seam. Not a fifth runtime axis. Not token changes. Not new registers.** A lens is a *bounded data record*, not a code path:

```yaml
# design-brain/world-lenses.md — one entry per era (registry file, Sean-extensible)
lens_id: lens-80s-neon
label: "80s — synthwave / chrome / Memphis"
grade_bias:    { saturate: 0.90, brightness: 0.88, hue_lean: wing }   # bounded, see floors
texture_stack: [chromatic-fringe-edges, fine-scanline]                # ≤2 layers, GPU-cheap
type_treatment: { display_face: <era face>, scope: marketing-only }   # never app body text
motif_set:     [neon-grid-horizon, chrome-bevel, sun-disc]            # shape language, not tokens
seam_preference: wing                                                 # biases seam choice WITHIN the archetype's declared seam
motion_mannerism: slow-drift + grid-scroll                             # within existing motion tiers
status: active   # append-only additions; deprecate, never delete
```

**How lenses touch each register (the invariant that keeps this sane):**
- **Epic × lens:** the lens touches *grade and texture only*. An 80s nebula is still Zenith — same subject, same composition rules, same z1 recession — graded warmer/cooler, wearing scanlines. The lens can never raise Epic above content luminance, never move it up the z-stack, never change the narrative job.
- **Miniature × lens:** the lens touches *set dressing and practical light*. A 70s Block has wood-paneled gym walls, tungsten practicals in the tiny windows, film grain. An 80s Block has neon signage on the tiny street and chrome on the equipment. The physics are era-invariant: tilt-shift DOF, isometric peer-in framing, the diversity spec, the GR-2 frame, seam + glow. *The diorama is a lit jewel in every decade — the jewel's interior decorates, the jewel's mounting never changes.*

**Bounds (QA-enforced, absolute):** grade bias stays within `saturate .75–.95` / `brightness .85–1.0`; texture ≤2 layers; luminance floors and the per-world contrast matrix are immutable under any lens; type treatments map onto the existing type scale (era display faces permitted on marketing surfaces only, loaded per-surface); **mixing capped at 2 lenses per surface with a declared ≥70/30 dominance ratio** — a third lens is visual noise and a world-gate fail. Default everywhere: `lens-2020s-glass` — cinematic dark is where Swan already lives; eras are opt-in per surface/campaign, declared in the brief's lens field, never global-by-accident. In v1 the app core ships default lens; lenses prove themselves first in marketing surfaces and the sandbox.

The seven seed packs (60s mod, 70s funk, 80s neon, 90s grunge, Y2K aero, 2010s flat, 2020s glass) ship authored at launch in `world-lenses.md`. Registry is append-only with deprecate-not-delete — Sean appends sub-styles (e.g. `lens-80s-memphis` splitting from `lens-80s-neon`) the same way he appends taste.

### 3.3 The extensible taste-profile — file and append format

Sean's taste is a living input, so it gets a ledger, not a list. **`design-brain/taste-profile.md`** — append-only. §D1 of the storyboarding ref migrates in as seed entries (D1 keeps a pointer; the profile is the maintained home going forward).

**Append format — Sean drops a block at the bottom, nothing else, ever:**

```markdown
### TASTE-2026-07-18-01
- Kind: subject | mood | style | reference | anti
- Statement: "Aurora over frozen waterfalls — the exact meeting of Flow and Zenith."   ← one sentence
- Applies-to: zenith, flow        # registers / archetype IDs / lens IDs / "global"
- Strength: canon | strong | accent | anti
- Source: Sean, 2026-07-18
- Status: active                  # or superseded-by: TASTE-YYYY-MM-DD-nn
```

**Reading rules (binding on every generator and every lens):** read active entries newest-first; on conflict within a strength class, newest wins; across classes, canon > strong > accent; **`anti` entries auto-compile into the standard negative block** of every brief (alongside the banned hexes). History is never edited — a correction is a new entry superseding the old ID. Canon *promotion* (folding a taste entry into world-archetypes.md proper) happens only through me at a workstream closeout, via the amendments process — that's how the ledger grows the canon without ever forking it. Adding taste must stay a 30-second act for Sean; if the format ever demands more than that, the format is wrong.

### 3.4 The world-generator adapter — two modes, one gate

`design-brain/adapters/world-generator.md` absorbs the 2026-07-17 Living World Generator and adopts Sean's "get out of the model's way" philosophy as its operating contract. The adapter's job is to specify **the goal, the floor, and the verification — never the strokes.** It hands the authority model (me, Fable, or a future sworn-in authority) the archetype canon, the taste-profile, the negative block, the budgets, and the gates — then steps back. Taste is discovered by the authority running with tools, not dictated by the adapter.

**Mode 1 — EXPLORE (freedom sandbox).** Full creative license: single-file Three.js/R3F concepts, shaders, particle swarms, generative type, audio-reactive sketches — and explicitly **procedural 3D micro-worlds**: a procedurally generated tiny living city *is* a legitimate discovery engine for the Miniature register. N parallel variations via the Workflow tool / sub-agents across the matrix `{archetype × lens × paletteThemeId}`. Self-verification is mandatory and evidenced: Playwright MCP + `agent-browser` + `webapp-testing` — the authority opens its own output, screenshots it, critiques it, **≥3 self-critique passes per concept** (find problems, complexify, improve), folding into the dual-pass discipline (rules 22–23). EXPLORE output is *concept cards + captures*, tagged `{worldId, lensId, paletteThemeId}`, stored in a sandbox gallery. EXPLORE is exempt from production budgets and exempt from the token floor — it is where taste is found, not where product ships.

**Mode 2 — SHIP (production translation).** Nothing crosses from EXPLORE to production except through the **translation gate**, and the gate has a specific shape: first, write the concept's **soul-mechanic invariant** — one sentence naming what makes it move people ("your reps become the mountain" is the Scale-Reveal's) — that sentence is the acceptance test of the translation. Then rebuild inside the discipline: styled-components + the 14-var contract + L0–L3 fallbacks + a11y gates + perf budgets + dual-pass review + world-gate v1. The translation is a principled compression, not a port; if the invariant survives and the gates pass, it ships. A single-file shader demo shipped as a product surface without this pass is an anti-pattern by name (ledger, §4).

**Tool stack (given to the authority, then we step back):** Mobbin (LIVE — UI structure only); a Pinterest/Unsplash-style photo-reference MCP for atmosphere subjects — **flagged as a gap, candidate to add with the same gate discipline as Mobbin**; NanoBanana/key.ai + GPT-image (stills); Seedance 2.0 (motion — the standard; a Higgsfield-style animation MCP is a *defer*, not a now — no pipeline sprawl); Three.js/R3F (sandbox-unrestricted; production-surgical only); Playwright MCP + agent-browser + webapp-testing (self-verification); Workflow/sub-agents (parallelization).

### 3.5 Runtime reconciliation — mapping onto Lane A's contract (converge, don't fork)

Lane A owns the plumbing: the `--world-*` 14-variable contract, the `AppearanceProfile {paletteThemeId, styleLensId, worldId, motionMode}`, the `WorldAtmosphere` primitive, the per-world contrast matrix. I own the direction: values, semantics, visual law. The ownership rule, stated once and binding both ways: **where a name collides, Lane A's name wins (they're the plumbing); where a value or semantic is in question, mine wins (I'm the direction); anything either side can't map lands on the converge list below, not in a fork.**

**The 14-slot contract — my 6 tokens map in, and I author the values of the remaining 8:**

| # | Variable | Source | Value authority |
|---|---|---|---|
| 1 | `--world-ground` | Lane A slot | resolves to palette obsidian per `paletteThemeId` — world components never import brand tokens directly |
| 2 | `--world-scrim-deep` | **mine, verbatim** (locked §1) | me |
| 3 | `--world-scrim-soft` | **mine, verbatim** | me |
| 4 | `--world-vignette` | **mine, verbatim** | me |
| 5 | `--world-content-fade` | completes my z2 ground-fade seam — a genuine gap my locked section left unnamed; named now | me |
| 6 | `--world-seam-ice` | **mine, verbatim** | me |
| 7 | `--world-seam-gold` | **mine, verbatim** | me |
| 8 | `--world-seam-wing` | completes the seam trio my brief template already declared (`ice\|gold\|wing`; Zenith's seam is wing) | me |
| 9 | `--world-seam-strength` | the shared 45% mix scalar | me |
| 10 | `--world-diorama-glow` | **mine, verbatim** (ice) | me |
| 11 | `--world-diorama-glow-gold` | gold-glow variant — Track lap marks, Vista | me |
| 12 | `--world-atmosphere-blur` | z1 blur: 2px; 0 at synthetic/ground tiers | me |
| 13 | `--world-grade-filter` | the GR-1 composite: `saturate(.82) brightness(.9)` — one var, lens-bounded per §3.2 | me |
| 14 | `--world-reveal-duration` | ≤1200ms; reduced-motion resolves to the ≤200ms gold-seam settle via `motionMode` | me |

All values remain compositions of existing primitives with `var(--token, #fallback)` — inline hex in a world component stays a QA fail. If Lane A's shipped identifiers differ from this table, adopt their identifiers and keep these semantics; the table is the Rosetta, not a rename demand.

**AppearanceProfile — the four seams are my four layers:**

| Seam | Engine layer | Values | Default |
|---|---|---|---|
| `paletteThemeId` | identity | `swan-crystalline`, future second-brand configs | `swan-crystalline`; the 14 vars resolve per theme |
| `styleLensId` | era style-pack | any `world-lenses.md` entry | `lens-2020s-glass`; bounds per §3.2 |
| `worldId` | archetype instance | `{register}-{archetype}` — `epic-zenith`, `mini-track`, … | per surface spec; drives asset family, composition, allowed slots, alt pattern, diversity spec |
| `motionMode` | fallback tier | `motion \| still \| synthetic \| ground` | = L0/L1/L2/L3 exactly — my `useWorldTier()` resolution *is* the `motionMode` resolver (reduced-motion, save-data, connection, viewport per the locked ladder) |

**Primitive disposition — one of each, no duplicates:**
- **`WorldAtmosphere`** (Lane A's name stands): implements my `AtmosphereLayer` spec — props `{worldId, slot, motionMode?}`, internally applies GR-1, scrim floors from the contrast matrix, srcset + fallback ladder, `aria-hidden` decorative discipline. My brain files refer to the *pattern* as AtmosphereLayer; the *component* is `WorldAtmosphere`. One primitive, two names for one thing — documented as such so nobody builds a second.
- **`DioramaFrame`** (my contribution to the runtime contract; Lane A has no diorama primitive): props `{worldId, alt}`, enforces GR-2 (seam + glow + sheen), ratio lock, zero text overlay, alt per the brief pattern. Lane A adopts it into their contract; spec stays mine.
- `useWorldTier()` folds into Lane A's `motionMode` resolution — one hook, their name, my semantics.

**The per-world contrast matrix is data, not tokens.** Canonical table lives in `world-atmosphere.md §5` (and mirrors into Lane A's runtime data file; brain wins conflicts): keyed `worldId × slot` → min scrim opacity in the text zone, max asset mean luminance, measured-composite floor (≥4.5:1 body text, per design.md's existing text classes). Example rows: `epic-zenith × hero` — scrim ≥55%/75% (top/bottom), asset luminance cap low (wing-purple sits dark naturally); `mini-flora × card` — GR-2 frame means the *frame interior* is exempt, but any adjacent caption zone holds 4.5:1 against ground. Enforcement is double: dev-time warning in `WorldAtmosphere` + CI fail in world-gate. QA always measures the *composite* (image + scrim stack), never the raw asset.

---

## 4. The amendments ledger

New files grow from 5 → **7** (Sean's post-round-1 dimensions get their own homes): `world-atmosphere.md`, `world-archetypes.md`, `world-briefs.md`, `portability.md`, `adapters/world-generator.md`, **`taste-profile.md`**, **`world-lenses.md`**, plus `identities/crystalline-swan.md` as the first config. All get `index.md` rows and obsidian/graphify registration.

| File | Verdict | Concretely |
|---|---|---|
| `design.md` | **ADD** | World Layer token appendix (the 14-slot contract + values); component entries for `WorldAtmosphere` + `DioramaFrame`; z-stack note in the layout section. **KEEP** everything else; zero edits to existing tokens — extension, never fork. |
| `design.html` | **ADD** | World Layer gallery: grade swatches (GR-1/GR-2 live), z-stack diagram, L2 synthetic recipes rendered, fallback-ladder demo, lens switcher demo (default → one era). |
| `motion.md` | **ADD / KEEP** | ADD: Scale-Reveal spec (≤1200ms, reduced-motion ≤200ms gold-seam settle, celebration budget ≤24 GPU-transformed elements); the explicit **scroll-parallax ban (v1, entire risk class)**; lens motion-mannerisms bounded to existing tiers. KEEP existing motion tiers untouched. |
| `components.md` | **ADD** | "World primitives" subsection pointing to `world-atmosphere.md §11`. No renumbering of C1–C12; upstream sync of the two new primitives into the source-of-truth C-library is a closeout proposal for Sean, not a unilateral edit. |
| `anti-patterns.md` | **ADD** | Nine new entries: raw-image-without-grade · text-on-diorama · >2 lenses per surface · inline hex in world components · Galaxy-Swan hexes in assets *or* prompts · scroll-parallax · motion-dependent meaning · tokenism-style "diversity figure" · **shipping a single-file sandbox artifact as a product surface**. |
| `qa-gates.md` | **ADD** | **world-gate v1**: grade pass · composite-contrast measurement (composite, not raw) · banned-hex scan · PII/identifiable-face scan · Translation Test · budget check (≤350KB/route, hero ≤160KB, diorama ≤120KB, L0 ≤2.5MB) · L1+L2 fallback presence · alt-pattern check · lens count ≤2 with declared dominance. |
| `cinematic-pages.md` | **ADD** | World slotting rules per B2 arc phase (which archetypes may serve which phase); the Scale-Reveal named as *the* sanctioned register-transition in story-arc pages. No changes to the arc itself. |
| `website-archetypes.md` | **ADD** | Per-recipe world defaults: landing → Zenith + Block; SaaS/dashboard → Depth/Flow + Track/Box; portal → Terra; community → Block/Seasons; operator → Depth, minimal world presence. KEEP all recipes. |
| `adapters/cinematic-site-generator.md` | **CHANGE / KILL** | Route all asset generation through the `world-briefs.md` format; **kill its inline prompt templates** (superseded by the brief format + standard negative block). |
| `adapters/{builders,fable,hermes,reviewers,product-surfaces,knowledge}.md` | **ADD** | One pointer block each: the World Layer exists, when to consult it; reviewers get the world-gate checklist. Everything else KEEP. |
| `obsidian/` + `graphify/` | **ADD** | Register the 7 new files + identities dir in vault and graph schemas. |
| `external-reference-mcp.md` | **KEEP / ADD note** | Discipline unchanged; add note that the atmosphere photo-reference MCP (Pinterest/Unsplash-style candidate) inherits this gate wholesale when added. |
| `references/SWAN-ASSET-STORYBOARDING.md` | **ADD** | Miniature archetype section standardizing the tilt-shift vocabulary (tilt-shift, diorama, isometric peer-in, macro DOF); brief templates import the standard negative block + diversity spec from `world-briefs.md`; §D1 marked "maintained in `taste-profile.md` going forward" — content migrates as seed entries, D1 stays as historical record. Minimal touch: it's a source-of-truth ref. |
| `references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` | **KEEP (no change now)** | Brain never contradicts it. One closeout proposal to Sean: ratify the two world primitives as C13/C14 upstream. |
| `AI-HANDOFF/SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT-2026-07-17.md` + `KIMI-WORLD-GENERATOR-MASTER-PROMPT-FINAL-2026-07-17.md` (+ blueprint set) | **KILL via archive** | Move to `AI-HANDOFF/_archive/` with SUPERSEDED banners. Archetypes absorbed into `world-archetypes.md`; prompt logic absorbed into `adapters/world-generator.md`. Absorbed, not forked — as the plan demanded. |

---

## 5. Open questions for Sean — what I need to converge

1. **Photo-reference MCP (gap).** Approve adding a Pinterest/Unsplash-style image-inspiration MCP as the atmosphere-reference source, gated exactly like Mobbin? This is procurement + a small build. Without it, Epic art direction runs on my internal canon + generated references only — workable, weaker.
2. **Era in production v1.** I'm defaulting every app surface to `lens-2020s-glass` with eras opt-in per campaign/marketing surface. Confirm — and if you want one production surface to pilot a non-default lens, name it. (My recommendation if you do: a marketing landing, 80s or Y2K, nothing in the auth'd app yet.)
3. **Identity config format.** Markdown + YAML front matter at `design-brain/identities/{id}.md` — keeps delivery-decision C (markdown-first) intact. Confirm over pure-YAML.
4. **Portability proof at closeout.** Paper-exercise a fictional second brand, or bind a real second project of yours as the pilot? If real — which one? This is a first-class success criterion; it needs a named target.
5. **Epic provenance: licensing path.** The law says Epic is captured (NASA/ESA public domain covers cosmos; terrestrial needs licensed pro photography). Approve a licensing budget ceiling, or rule "generate-with-care + disclose" as the terrestrial fallback? Cost decision, yours.
6. **Contrast matrix enforcement.** I spec both dev-warn (in `WorldAtmosphere`) and CI-fail (world-gate). Confirm the CI budget/hook is allowed.
7. **Higgsfield-style animation MCP.** I've ruled *defer* — Seedance 2.0 stays the single motion pipeline for now. Confirm the deferral.
8. **Scale-Reveal first implementation.** I nominate the milestone level-up: Vista (Miniature) → Ascent/Zenith (Epic). Confirm the surface so Lane A can slot it.
9. **Taste canon cadence.** You append to `taste-profile.md` anytime; promotion of entries into archetype canon happens only through me at closeouts. Confirm that division of labor.

Answer those nine and this workstream is fully converged: doctrine, engine, eras, taste, two-mode autonomy, runtime plumbing, and the ledger are all decided and internally consistent. Claude builds to this spec, exactly.

— Kimi K3
