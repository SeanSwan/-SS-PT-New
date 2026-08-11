# SWAN BRAIN v2 — "ATELIER" · Master Upgrade Prompt & Work Order

- **Date:** 2026-08-11 · **Author:** Opus 5 (Fable-tier) · **Status:** DRAFT — awaiting panel review + Sean's steer
- **Target of upgrade:** `docs/ai-workflow/design-brain/` + `.claude/skills/swan-design-router/SKILL.md` **as they exist on `origin/main`**
- **Reviewers requested by Sean:** Kimi K3 (hostile), HY3 (design + hostile), Opus 5 (this doc), Gemini 3.1 Pro (design authority), Sonnet 5.6
- **Bar:** every output must be defensible as a **$100,000 commissioned website / brand system**, comparable to Claude Design 3.0-tier work.

---

## §0 — READ THIS FIRST: the branch trap

`wip/comms-notifications-2026-07-05` is **1731 commits behind `origin/main`** and 81 ahead. The Design Brain here is a **stale fork**:

| On `origin/main` (canonical) | On this branch |
|---|---|
| `worlds.md` (105 KB), `psychology.md`, `techniques.md`, `experience-mode.md`, `components.md`, `anti-patterns.md`, `qa-gates.md`, `adapters/index.md`, `adapters/product-surfaces.md` | **absent** |
| — | orphans main already dropped: `mobbin-learning-system.md`, `swan-element-intelligence.md`, `graphify/graphify-policy.md`, `obsidian/vault-routing.md` |

**Law for this work order:** every edit lands on a **fresh branch cut from `origin/main`**. Editing the brain on this branch would fork the design system a second time. No exceptions.

---

## §1 — WHAT IS ACTUALLY WRONG (evidence, not opinion)

Five root causes. Each is a *mechanism* in the brain, not a prompting mistake by Sean.

### RC-1 — The Mobbin cap is written into the protocol, in code

`docs/ai-workflow/design-brain/external-reference-mcp.md` defines four modes. The only enabled one is:

> **P — Probe.** "Exactly one query and one result." … "The heartbeat overwrites the prior value; it is not an activity log."

S (Spec) is `enabled:false`. D (Doctrine) is Sean-hand-edit-only. X (source corpus) is `blocked`. The runtime enum lives at `scripts/design-brain/src/reference-modes.mjs`, and `egress-policy.mjs` **denies by default**.

So the brain's *only* legal Mobbin operation is one query, one result, retaining nothing but `{schema, day, connector, availability}`. **That is the entire reason a month-old paid Mobbin subscription returns 5–10 images and no accumulated taste.**

### RC-2 — The router and the protocol contradict each other

`swan-design-router/SKILL.md` line ~290 says:

> "**I** is the default for a named surface."

`external-reference-mcp.md` line 3 says legacy letters **and `I` (Inspect) are refused** with `E_LEGACY_MODE_REFUSED`, "never privilege-mapped."

The router instructs agents to use a mode the protocol hard-refuses. An agent resolving that conflict safely does the minimum — one probe — and moves on. **The shallowness is the documented, correct behavior of a self-contradicting spec.**

### RC-3 — There is no learning layer

`mobbin-learning-system.md` existed on the stale branch and **does not exist on `origin/main`**. Nothing accumulates. Every design task starts from zero references. A month of paid Mobbin has produced **no durable corpus**, because Probe mode is explicitly "not an activity log."

### RC-4 — The image generator has no art brain, and is on the wrong provider

`scripts/generate-image.mjs`:
- Provider is **Google Gemini (Nano Banana Pro)** — `gemini-3.1-flash-image-preview` / `gemini-3-pro-image-preview`. **There is no OpenRouter image path at all.** Sean's requested GPT-image-via-OpenRouter transport does not exist.
- Its entire aesthetic intelligence is a **hardcoded 3-line string**, `SWANSTUDIOS_STYLE`: palette names + "Professional photography quality, cinematic lighting."

No art-history vocabulary, no medium, no lens, no film stock, no lighting design, no composition law, no abstraction control, no tileability, no negative prompt, no iteration loop. **It is a one-shot string concatenator, not a generator brain.**

### RC-5 — The brain is website-shaped only

`index.md` scopes the folder to "tokens, patterns, motion rules, bans, QA gates, page generators, per-agent adapters." `website-archetypes.md` covers eight *web* archetypes. There is **no contract** for:
- audio-reactive visualizers (Sean's Swan Visualizer)
- motion graphics / video / YouTube workout animation (Free Motion)
- 3D / WebGL / Three.js scenes, scroll-driven animation, parallax systems
- generative/abstract art as a first-class medium

**Verified:** grep across `frontend/src` for `AnalyserNode|createAnalyser|getByteFrequencyData|butterchurn|milkdrop|audioContext` returns **one file** (`useMicroInteractions.ts`) — the "Swan Visualizer" Sean describes has **no audio-reactive implementation in this tree**. `[UNKNOWN]` whether it lives on another branch; must be located before B5 is planned.

---

## §2 — THE UPGRADE: six modules

Nothing below deletes an existing LAW. LAWS 1–11 (Enchantment Ratio, gold allowlist, optics-not-creatures, Crystallize, two-speed motion, Dual-Button Glow, token contract, build rules, content law, anti-generic) **survive intact**. This adds capability underneath them.

---

### **B1 — Reference Depth Engine** (kills RC-1, RC-2, RC-3)

**Goal: 50–150 references per design task, minimum, and they compound.**

**B1.1 — Resolve the mode contradiction.** One decision, Sean's to make:
- (a) Add a new enabled mode **`R — Reference`**: unlimited *read* queries, in-session analysis, **zero durable storage of Mobbin-derived media or identity.** This respects the privacy/legal posture (which is what P was protecting) while removing the depth cap — the cap was collateral damage, not the goal.
- (b) Or lift P's "exactly one query" to "exactly one *retained heartbeat*, unlimited reads."
Either way: **delete the `I` reference from the router in the same commit.** A spec that contradicts itself is the bug.

**B1.2 — The Six-Facet Sweep (mandatory for NET-NEW and REDESIGN).** One query is a lookup; six is research. Every design task runs:

| Facet | Tool | What it answers |
|---|---|---|
| 1. Archetype | `search_sections` | How does this *kind* of section get built? |
| 2. Motion/interaction | `search_flows` | What does it do over time? |
| 3. Direct competitor | `search_screens` + app name | What does the category leader ship? |
| 4. Adjacent-excellence | `search_screens` | Best-in-class from an *unrelated* industry (the anti-generic lever) |
| 5. Anti-pattern | `search_screens` | The mediocre version — so we can name what we refuse |
| 6. Component atom | `search_screens` | The specific card/button/nav at the pixel level |

Each facet at `limit: 25–30`, `mode: "deep"`, both `ios` and `web` where relevant. Floor: **6 calls / ~120 references.** Use `exclude_screen_ids` to page deeper without repeats. **A design task that ran fewer than 6 facets fails Gate 0.**

**B1.3 — The Taste Ledger (restores RC-3).** A durable, **principles-only** corpus at `docs/ai-workflow/design-brain/taste-ledger/`. Per sweep, append one entry:

```
SWEEP: <surface> · <date> · facets run: 6 · refs examined: N
PATTERN OBSERVED: <mechanism, in Swan vocabulary>
WHY IT WORKS: <the perceptual/psych reason>
SWAN VERDICT: ADOPT | ADAPT | REFUSE — <which LAW it serves or violates>
```

**Hard privacy contract, non-negotiable:** the ledger stores **abstracted principles in Swan's own words only**. Never images, never URLs, never screen IDs, never app-identifying strings, never provider-derived text. This keeps `egress-policy.mjs`'s deny-by-default posture and the "Mobbin is never doctrine evidence" rule intact — the ledger is *Swan's* observations, not Mobbin's data. Doctrine promotion stays Sean-only (mode D). **This distinction is the whole reason the ledger is legal; the panel must attack it.**

---

### **B2 — The Convergence Loop** (Sean's "ask until it's right / show pictures until it's right")

Today Gate 0 asks for 2–3 concept directions in *text*. Sean wants **visual convergence**. New protocol, replacing the text-only ideation gate for NET-NEW and major redesigns:

```
ROUND 0 — INTERROGATE
  One question at a time (grill-me discipline, Rule 64).
  Always lead with a recommended answer + one-line reason.
  Never ask what the codebase can answer.
  Exit when: purpose, audience, emotional target, the ONE impossible
  phenomenon, and the refusal list are all pinned.

ROUND 1 — SHOW, DON'T TELL
  Six-Facet Sweep (B1.2) → present a MOOD SLATE:
  3 named directions × 4–6 real reference images each, cited to mobbin_url.
  Sean reacts: keep / kill / "more like #3 but colder."

ROUND 2 — GENERATE
  Image Forge (B3) renders 3–4 originals per surviving direction,
  in Swan's palette, at the real aspect ratio of the target surface.
  NOT clip-art: hero plates, abstract substrates, texture, lighting studies.

ROUND 3 — CONVERGE  ← the loop Sean actually asked for
  Sean reacts. Forge re-prompts with the delta. Repeat.
  LOOP UNTIL SEAN SAYS "THAT'S IT." No round cap.
  Every round costs a prompt, not a rebuild — this is why it must
  happen BEFORE code, never after.

ROUND 4 — LOCK
  The chosen frame becomes the BUILD-EXACT visual contract:
  named direction, palette slots, the ONE phenomenon, motion budget,
  signature moment. Builder makes zero decisions.
```

**The economic argument for the panel to attack:** convergence in *pixels* is ~100× cheaper than convergence in *React*. The current brain converges in React. That is the single biggest quality-per-dollar defect in the system.

---

### **B3 — The Image Forge** (a real art-director brain; kills RC-4)

A sub-brain whose only job is turning "I need a hero background" into a masterpiece-grade prompt. Lands as `docs/ai-workflow/design-brain/image-forge.md` + a rebuilt generator script.

**B3.1 — Transport.** Add an **OpenRouter image path** to `scripts/generate-image.mjs` (or a sibling `forge-image.mjs`) alongside the existing Gemini path. `[UNKNOWN]` — exact OpenRouter image-model slug must be verified live against the OpenRouter model list before coding; **do not hardcode a slug from memory** (Rule 18). Keep Gemini/Nano-Banana as a fallback provider — it is already wired and paid for.

**B3.2 — The 12-slot prompt architecture.** Every generated image is composed, never described:

| # | Slot | Purpose |
|---|---|---|
| 1 | Intent | What job this image does on the page |
| 2 | Subject | The literal content (often: *no* subject — pure phenomenon) |
| 3 | Medium | Photograph / render / painting / macro / scan / generative |
| 4 | Style anchor | Artist / movement / studio — **using the personification formula (B3.3)** |
| 5 | Composition | Symmetrical · layered · radial · bird's-eye · low-vantage · macro · split |
| 6 | Optics | Lens · aperture · shutter · focal length · film stock |
| 7 | Light | Direction + quality + color temperature |
| 8 | Palette | Swan token hexes named explicitly, in dominance order |
| 9 | Material | Texture, surface, substance behavior |
| 10 | Abstraction control | Chaos/variety level + stylization strength |
| 11 | Negative | What must not appear (kill-list, LAW 3) |
| 12 | Output contract | Aspect ratio, tileability, transparency, resolution |

**B3.3 — Midlibrary knowledge, extracted and loaded.** Verified from the guides Sean linked:

- **The personification formula (the single highest-value finding).** `[subject] by [artist]` is *weak*. The guide proves the strong form is:
  `[Artist]'s [their actual medium] depicting [subject]`
  → *"Erwin Wurm's installation depicting…"*, *"Larry Poons' painting of…"*, *"Anton Corbijn's classical photograph of…"*
  Rule: **always name the artist's real discipline.** Mismatching subject to an artist's medium is the #1 style failure.
- **Photographic vocabulary** (load as a picklist): 8 lens types (fisheye, normal, pinhole, telephoto, tilt-shift, ultra-wide, vintage, wide-angle) · aperture + shutter + film-grain descriptors · 12 lighting directions/qualities (back, bottom, contrasty, hard, neon, window-blind, peach-and-cyan, side, soft, sunlight, top) · 16 film stocks (Portra 160/400, Ektar 100, Tri-X 400, Ektachrome E100, CineStill 50, Provia 100F, Velvia 100, Pro 400H, Superia X-TRA 400, Neopan 100, FP4 125, HP5+ 400, XP2 400, Fomapan 400, Fujicolor C200, Lomography Color 100) · framing + angle sets · a photographer roster (Avedon, Leibovitz, Crewdson, Roversi, Knight, Aldridge, Corbijn, Schoeller, Erik Madigan Heck, Tim Walker, Karen Knorr, David Lynch…).
- **General modifiers (GenMods)**: colors/schemes (translucent, complementary, psychedelic, subdued, vivid, anaglyph, monochromatic, iridescent) · texture/material (gritty, fibrous, spectral, fluffy, porous, translucent) · atmosphere (dreamy, melancholic, serene, joyful) · composition (symmetrical, layered, radial, bird's-eye, low-vantage, side, split, macro) · time/weather. Placement: append at end, or weave into the opening for stronger binding.
- **Abstraction control**: `--chaos` 0–100, default 0. **0** = repeatable/conservative · **33** = coherent variation · **66** = real stylistic divergence (the sweet spot for abstract substrates) · **99–100** = maximum unpredictability. Chaos + a locked seed *adds order* to variation — the controlled-exploration trick. Pairs with stylize.
- **SREF (style reference)**: `--sref <code>`, weight `--sw 0–1000` (default 100, **sweet spot 65–175**). Multi-blend `--sref a b c`; weighted `--sref a::2 b::1` (only proportions matter). SREF controls technique, palette, contrast, light/shadow ratio, composition, layout — **not subject.** Discoverable via `--sref random`. **Portability caveat `[HYPOTHESIS]`:** SREF is Midjourney-native; the *concept* (a reusable numeric style handle) must be re-implemented for our provider as a **Swan Style Token** — a saved, named, reusable 12-slot preset. That translation is B3's most important original work, not a copy-paste.
- **Super-Tiling** — directly solves seamless web backgrounds: generate with `--tile` (1024²), then inpaint the **interior only, never the edges** where tiles meet → 2048² seamless. Preserve left/right edges only → infinite horizontal panorama (parallax strips). Preserve top/bottom only → vertical scroll bands. **This is the technique for Sean's parallax backgrounds**, and it must be re-expressed for our provider.
- **Animation genre vocabulary** (feeds B5): hand-drawn (Disney/WB/Fleischer/Ghibli) · silhouette (Reiniger — backlit cut-outs, duotone) · stop-motion (Laika — felt, plasticine, miniature sets) · claymation (Aardman — fingerprints, soft indentations) · cutout/collage · rotoscope (*Waking Life*, *A Scanner Darkly* — flat texture, bold outline) · anime (`--niji`) · 3D/CGI (Pixar/DreamWorks; low-poly, voxel, raytraced, glitch-CGI, retro-futurist).
- **Gap flagged honestly:** the Midlibrary animation guide **does not cover abstract motion graphics or loops**. Swan must author that vocabulary itself — it cannot be harvested. That is an original-work item, not a research item.

**B3.4 — The art-styles taxonomy is NOT yet captured.** `midlibrary.io/art-styles` is client-side rendered; WebFetch returned only the shell ("Arranging the shelves… Almost there!"). **I did not get the category list.** Options for Sean: (a) Playwright MCP renders the page and I extract the real taxonomy; (b) Sean exports his saved collections; (c) build Swan's own style taxonomy from the guide corpus above. **Recommend (a), then (c) as the durable artifact.** I will not fabricate a taxonomy I could not read.

---

### **B4 — Motion & Dimension** (Three.js, scroll-driven, parallax, "ultra-modern")

New file `docs/ai-workflow/design-brain/dimension.md`, extending the existing WFX render ladder in `techniques.md` rather than replacing it.

- **Scroll-driven law.** Scroll is a *timeline*, not a trigger. Define: entry/exit ranges, pin regions, scrub vs. play-once, the reduced-motion static frame (mandatory — LAW 5 REFINEMENT 1 already proves the CSS-only guard is a lie for JS animation), and the mobile-degradation rule.
- **Parallax law.** Depth is earned by **layer count × differential rate × atmospheric perspective** (far layers lose contrast and gain haze). Flat multi-speed scrolling is the cheap version and is banned. Ties to Super-Tiling (B3.3) for the source plates.
- **Three.js / WebGL tier.** Where a real 3D scene is justified vs. a faked 2.5D layer stack (which is correct far more often). Budgets: draw calls, texture memory, DPR ≤ 2 (already law), pause offscreen + on `visibilitychange` (already law). Fail-closed to the B0 semantic frame.
- **Scroll-Bound Macro Journey (C13)** already exists as the taste ceiling in CLAUDE.md rule 40. **B4's job is to make it buildable**, not to re-invent it: gates are 60fps scrub + a tour-mode fallback.
- **Integration with the other agent's MiniMax-Hailuo work.** `[UNKNOWN] — not verified.* Grep for `hailuo|minimax` on `origin/main` hits **only archived AI-Village docs**; there is no active integration in this tree. Sean must confirm what that agent is building and where, before B4 writes a contract against it.

---

### **B5 — Beyond-Web Studio** (kills RC-5 — the visualizer, video, and general digital art)

New file `docs/ai-workflow/design-brain/mediums.md`. The brain stops being website-only and becomes a **design intelligence across mediums**, sharing one taste law.

- **M-AUDIO — the Swan Visualizer.** First: **locate it** (`[UNKNOWN]` — not in this tree). Then a real contract: FFT band mapping → visual parameter (not the naive bars-equal-bins default that makes every hobby visualizer look alike); transient/beat detection driving discrete events; spectral flux → color temperature; a **preset architecture** so Sean gets the creative options he's missing (MilkDrop's whole appeal is *preset variety*, not one scene). Swan's advantage over MilkDrop/Apple: LAW 1 — a believable substrate with exactly one impossible phenomenon, driven by audio. That is a genuinely ownable visualizer identity, and no mainstream visualizer has it.
- **M-MOTION — video & YouTube (Free Motion workout animations).** Bridges to the existing `seedance-swan-workout-video` / `seedance-swan-cinematic-video` skills, which already carry the five-beat Setup→Action→Signature→Proof→Reset teaching rhythm and the 2499-char cap. B5's job is the **design layer above them**: title cards, lower-thirds, exercise-name typography, anatomy-overlay visual language, transition grammar, and a per-channel motion identity. Must honor Rule 9 (never "yoga"/"meditation") and the credential rule.
- **M-ABSTRACT — generative & abstract art as a first-class medium.** Composition, rhythm, negative space, color relationships (OKLab/OKLCH — `colorScience.ts` already exists and is reusable per memory), tension/release. Feeds visualizer presets, hero substrates, and parallax plates from one vocabulary.
- **M-BRAND — identity systems beyond one site.** So the brain is genuinely versatile, as Sean asked — able to design for *any* project, not only SwanStudios. **Portability requirement:** the LAWS must separate into (i) universal taste law and (ii) Swan-specific palette/content law, so the brain can be pointed at a new brand without dragging Crystalline Swan tokens into it. This is a real architectural change and the panel should attack it.

---

### **B6 — The Taste Ceiling** (the $100k bar)

- **Benchmark set.** Name the specific tier we are measuring against — Claude Design 3.0, Awwwards SOTD, Linear/Vercel/Stripe-class product marketing, plus the couture/editorial reference class that most product designers never look at. Sean's homepage gets scored against it explicitly.
- **The "why is this worth $100k" test**, added to Gate 3. Answer in one sentence naming: the ONE phenomenon, the signature moment, and the thing a competitor **cannot** copy in a week. If the honest answer is "it's clean and modern," it fails.
- **Homepage verdict.** Sean's stated position: the homepage is weak and he is ready for a full ultra-redesign. Under B1–B5 that becomes the **first real commission** of the upgraded brain — a live proof, not a doc.
- **Standing constraint (memory, non-negotiable):** the hero video `Swans.mp4` is **KEPT**. Upgrade the treatment *around* it. Never replace the footage.

---

## §3 — WHAT I AM ASKING THE PANEL (Kimi K3, HY3, Gemini 3.1 Pro, Sonnet 5.6)

Independent reviews. Do not converge; disagreement is the product.

1. **B1 privacy split — attack it.** Is "principles-only, Swan-authored, zero provider media/identity" a *real* firewall, or laundering that defeats `egress-policy.mjs` and the "Mobbin is never doctrine evidence" rule? If it is laundering, the Taste Ledger must die. This is the highest-risk item in the document.
2. **Was the one-query cap deliberate?** If P-mode's "exactly one query" was a considered legal decision rather than collateral damage, B1.1 is wrong and must be re-scoped. Find the reasoning.
3. **Does B2's convergence loop actually raise quality**, or just spend money slower? What is the honest round count before diminishing returns?
4. **B3 portability.** Is translating SREF and Super-Tiling to a non-Midjourney provider *technically sound*, or cargo-culted syntax that will silently fail? This is the most likely place I am wrong.
5. **B5 scope.** Is one brain across web + audio-visual + video + brand *coherent*, or is this the moment the Design Brain becomes an unmaintainable monolith and should split?
6. **Absence-first.** What is missing from this document entirely? Rank by value left on the table.
7. **Design-specific (HY3, Gemini):** given the references and Midlibrary vocabulary above, what would you *actually design* for the homepage? Name direction, phenomenon, signature moment, motion grammar.

---

## §4 — SEQUENCING (nothing is built before Sean steers)

| # | Step | Gate |
|---|---|---|
| 0 | Cut a branch from `origin/main` | Mandatory before any edit |
| 1 | Render `midlibrary.io/art-styles` via Playwright → real taxonomy | Closes B3.4 |
| 2 | Locate the Swan Visualizer; confirm the MiniMax-Hailuo work | Closes two `[UNKNOWN]`s |
| 3 | Verify OpenRouter image-model slugs live | Rule 18 — no slugs from memory |
| 4 | Panel review (Kimi K3 + HY3) | **Preflight → Sean's `-ConfirmSpend`** |
| 5 | Land B1 + B2 (highest value, lowest risk) | Sean's steer |
| 6 | Land B3 Image Forge + transport | After step 3 |
| 7 | Land B4 + B5 | After panel verdict on scope |
| 8 | Homepage ultra-redesign as the live proof | The real deliverable |

---

## §5 — HONEST GAPS IN THIS DOCUMENT

- The **art-styles taxonomy is not captured** (§B3.4). Client-side rendering defeated WebFetch. I did not invent one.
- The **Swan Visualizer is not located** in this tree — one grep hit, not an implementation.
- The **MiniMax-Hailuo integration is unverified**; my reading of "Medmax h three" as MiniMax Hailuo 03 is `[HYPOTHESIS]`.
- **OpenRouter image-model slugs unverified.** Must be checked live.
- SREF/Super-Tiling portability to a non-Midjourney provider is `[HYPOTHESIS]` — flagged for the panel as the most likely error.
- No code has been written and no brain file has been modified. This is a plan awaiting a steer.
