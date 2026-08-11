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

