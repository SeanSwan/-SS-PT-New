---
decision: Consolidate the seven practitioner transcripts (six from 2026-08-11 + Scrollcraft 2026-08-24) that feed the Swan Design Brain into one digest, and ship the ChatGPT Pro deep-research + hostile-review prompt built from it.
status: open
supersedes: none
---

# Swan Design Brain — Transcript Corpus Digest + ChatGPT Pro Audit Prompt

- **Date:** 2026-08-24 · **Author:** Claude Fable 5 (`claude-fable-5`) · **Board:** SWA-186 (taste brain) / SWA-55 (cinematic doctrine)
- **Why this exists:** Sean is about to hand ChatGPT Pro a deep-research + hostile-review job on the Swan Design Brain. Before that, he asked for one place that says what every transcript he fed the brain actually taught, folds in the new Scrollcraft transcript, and turns the whole thing into a paste-ready prompt.
- **What the brain is FOR (Sean's words, 2026-08-24):** the Midjourney brain inside the design brain should let `grill-me` **interview Sean to discover what styles he likes**, then **offer him style suggestions from the Midjourney brain** so whatever he is making — websites, pictures, films — comes out more beautiful.

## §0a — WHERE THIS FILE LIVES (for ChatGPT Pro and any external model)

- **Repo:** `https://github.com/SeanSwan/-SS-PT-New` · **Branch:** `docs/design-brain-transcript-corpus-2026-08-24` (cut clean from `origin/main`; merge to `main` when Sean says)
- **Path:** `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md`
- **⚠ The repo is PRIVATE `[VERIFIED 2026-08-24: gh repo view → isPrivate:true; unauthenticated raw fetch → HTTP 404]`.** Anonymous raw URLs do NOT work. Two real access paths for ChatGPT Pro: **(1) connect the GitHub connector in ChatGPT (Deep Research → Sources → GitHub), authorize `SeanSwan/-SS-PT-New`, and point it at the branch + path above; or (2) upload this `.md` file directly into the chat** (and optionally the six brain files listed below). Authenticated raw URL, for tooling that carries a token: `https://raw.githubusercontent.com/SeanSwan/-SS-PT-New/docs/design-brain-transcript-corpus-2026-08-24/docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md`
- **Brain files it summarises (all on `main`):** `docs/ai-workflow/design-brain/` — start with `README.md`, `index.md`, `field-techniques.md`, `style-taxonomy.md`, `forge-compiler-contract.md`, `design.md`; raw-URL pattern: `https://raw.githubusercontent.com/SeanSwan/-SS-PT-New/main/docs/ai-workflow/design-brain/<file>`
- **Not on GitHub (by design):** the Midlibrary corpus and taste files (`swan-taste-brain`, private, copyrighted) — only their counts and structure are described here.

## §0 — Where the transcripts actually live `[VERIFIED]`

They were never stored as raw transcripts. Each was distilled into a brain file on `origin/main`:

| # | Transcript (Sean-supplied) | Distilled into | Date |
|---|---|---|---|
| T1 | Animated dithered hero (frame-stepped procedural background) | `docs/ai-workflow/design-brain/field-techniques.md` §T1 | 2026-08-11 |
| T2 | Scroll-bound macro journey build (Kimi-K3 scroll-film lineage) | `field-techniques.md` §T2 · `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B2.4/§C13 · CLAUDE.md rule 40 | 2026-07-22 → 08-11 |
| T3 | Mobbin MCP depth + PRD-first sequencing | `field-techniques.md` §T3 · `design-brain/external-reference-mcp.md` | 2026-08-11 |
| T4 | Recursive variant tournament | `field-techniques.md` §T4 | 2026-08-11 |
| T5 | Claude Design walkthrough (interrogation loop, brand kit, Higgsfield asset pack) | `field-techniques.md` §T5 · `SWAN-ATELIER-STUDIO-REVIEW-PACKET-2026-08-18.md` §1 | 2026-08-11 / 08-18 |
| T6 | Codex as art director (Three.js, shaders, reference ladder) | `field-techniques.md` §T6 | 2026-08-11 |
| T7 | ComfyUI local MCP | `ATELIER-V2-COMFY-MCP-REVIEW-PACKET-2026-08-24.md` §3 | 2026-08-24 |
| **T8 (NEW)** | **Scrollcraft skill (Nate Herk) — interview → assets → scroll-synced site → keyframe verification** | **this doc §2** | **2026-08-24** |
| MJ | Midlibrary archive (not a transcript — the "Midjourney brain" corpus) | `design-brain/style-taxonomy.md` · `forge-compiler-contract.md` · `swan-taste-brain` repo (outside git) | 2026-08-11 / 08-21 |

`field-techniques.md` header, verbatim: *"Sean supplied 6–7 source transcripts on 2026-08-11; synthesis deferred until all are captured."* Its `## T4 — (awaiting transcript)` stub still sits above the filled T4 section — a leftover to clean.

---

## §1 — What each transcript taught (one screen each)

### T1 — Animated dithered hero
Generate a **widescreen 1K still** (batch ≥2, never judge one) → image-to-video **4s** (duration is the cost driver; 1080p/720p, never 480p) → dump to frames replayed at **~11fps** → apply ordered dither → mount as a pointer-reactive background → static hosting. The staccato frame-jump *is* the look. **Load-bearing insight:** *generate ~20 stills cheaply, pick one, spend video money only on the winner* — image-to-video conforms to composition far better than text-to-video. Style notes: grand/Renaissance subjects, warm pastels, slow zoom/drift/particulate survive frame-stepping; fast action dies; moderation trips on anatomy words. **Swan ruling:** OFF-LAW for SwanStudios surfaces (dither breaks LAW 1 realism), ON-LAW for client work; the step-frame *mechanism* is separable from the dither *look*.

### T2 — Scroll-bound macro journey (C13's build recipe)
Ideate **10 radically different** scroll concepts (AI is cheap at breadth; human picks) → 2-stage concept→video prompt with a worked example of detail level → one continuous **8s extreme macro journey** (16:9 + 9:16, 1080p, batch 3) → **AI frame interpolation 30→60fps** (the missing step; 30fps scrub is why sites feel janky) → extract frames, bind playhead to scroll → **tour mode** autoplay → static deploy. *"The creative is the heavy lifter"* — spend on the 8 seconds, not the scaffolding. Kimi-K3's hostile review added the **scrub-physics layer** (damped target `current += (target-current)*0.085`, ≤3-frame clamp, never hijack wheel/touch), mobile = T2 autoplay loop by default, `100dvh`, persistent scrim for contrast at every frame, resolution ladder 1280/1920/2560w, reduced-motion → static frame.

### T3 — Mobbin MCP depth + PRD-first
Three tools = three research modes: `search_screens` (30/call, directions), `search_sections` (named regions), `search_flows` (10/call, a named app's onboarding). 50+ references is trivial; the constraint was Swan's own one-query P-mode doctrine, not the tool. Practitioner uses: **fundamental directions**, **named-flow adoption**, **component atoms**; cross-industry transfer is the anti-generic lever. **Sequencing law:** PRD → requirements → **UX direction (most-skipped step)** → screen prompts → iterate for hours → pull designs *back* into the PRD/data model. Honest caveat: Mobbin is **mobile-strong, web-weak** — Swan is web-first.

### T4 — Recursive variant tournament
Scaffold A → AI makes A/B/C/D → gut-pick the winner → branch variants from it → repeat **2–3 rounds then stop** ("trading tokens for quality"). Independently matches Kimi-K3's cap on the convergence loop; overruled the earlier "loop forever" plan. Shape = tournament (branch → judge → branch from winner), not linear revision. Human taste is the judge function.

### T5 — Claude Design: native interrogation + portable brand kit
Vague prompt → Claude Design **returns a questionnaire** (purpose, primary CTA…) — do NOT rebuild the interrogation. Reference ladder: pasted screenshot gets vibe only; **Figma `.fig` carries real tokens**. Three edit modalities (`edit` / `comments` / `tweaks`) — use the cheapest. Style transfer by named designer (BYQ) with an explicit **KEEP list**. Mobbin inside the loop: *"find three variants for this section… match its spacing and layout"* — borrow layout, never aesthetics. MagicPath for side-by-side variants. **Finale:** export `design.md` + `PRD.md` so any new project inherits the exact style *including image style* — Swan's `design.md` already is this; T5 adds the portable-skeleton + swappable-brand-layer pattern. Also: **generate a brand asset pack BEFORE designing** (the step most people miss), one showstopper "moving piece" (~25s), and UI sniping from 21st.dev / aceternity / reactbits.

### T6 — Codex as art director
**Reference quality ladder** (most transferable idea across all six): S = URL + repo + original prompt + live demo + stack → A = URL → B = screen recording → C = screenshot only (*where vector-slop begins*) → D = bare prompt. Recreate to learn the mechanism, then **reinterpret** so the result is very different. Third confirmation of image-first (480p ~$0.10–0.50 to explore → upscale → ~$1–2 finished). **Transparent PNG, never vector** for AI illustration. Single-file HTML for prototypes only. Libraries: canvasui.dev (shader effects over live HTML), shaders.com, Higgsfield MCP as art director with cost confirmation before spend.

### T7 — ComfyUI local MCP
`comfy-cli` + `comfy-mcp` give the agent handshake/introspection (Torch/CUDA/VRAM), server lifecycle, workflow ops (install missing nodes/models, diagnose, recommend models fitted to the actual GPU), job tracking, 558 templates, and Comfy Cloud partner nodes (Nano Banana, Kling, Runway, BFL…) on per-generation credits. Thesis: Higgsfield/Freepik are an upcharge over the same backend; the real differentiator is **context** — wrap a skill around a folder of hand-tuned workflows so the model navigates ComfyUI technically *and* contextually. Not worth it for one image; a scale + diagnosis play. Swan's v2 proposal: MCP as a second control plane (never the render path), graphs as a described manifest, partner nodes as ordinary providers, one `Compose` surface, multi-project schema, a Doctor surface, cost truth.

### Midlibrary (the Midjourney brain)
Not a flat style list — a **two-axis matrix**: SOURCE (15 categories, ~5,525 styles: painters 1,546 · illustrators 919 · photographers 686 · filmmakers 118 · architects 107 …) × QUALITY (51 facets: vivid/moody/dark/dreamy · portraits/landscapes/animals · fine lines/painterly · geometric/abstract/minimalist · realistic/surreal/documentary · BW/pastel · cinematic/retro/baroque…). Navigate by quality when you know the feeling, by source when you know the hand. The Swan Taste Brain (separate private repo) adds **223 SREF codes, 4,272 real prompts, 407 style handles**, a taste-steered prompter (`--surprise / --cinematic / --seed / --rate / --keep`), explore/exploit with a 25% exploration floor, and export of *taste only* into the Hermes brain-vault as `swan-visual-taste`. Forge compiler: 12-slot composer; slot 4 style anchor must use the **personification formula** `[Artist]'s [actual medium] depicting [subject]`, never `[subject] by [Artist]`.

---

## §2 — T8 (NEW): Scrollcraft — the interview-driven scroll-site skill

**Source:** Nate Herk, "I built the ultimate Claude design skill for websites" (Scrollcraft). Rebuilt his own AI Automation Society site live.

**The thesis.** A scroll-driven page hooks like short-form content: if the first screen doesn't grab, they leave. The skill's whole idea is that **scroll must correlate to something happening on the page** — the user's mouse is the control; they can go forward or back, and the page responds (numbers fading in, a globe filling with members, departure-board cards syncing to scroll, images fading out). Design elements (spacing, typography, taste) are baked in, but it is **not a template** — every output differs because the interview differs.

**The four-stage pipeline.**
1. **Interview.** Not one question — a sequence, each with a recommended answer. The questions that shipped:
   - *What's the scroll journey — what does the visitor hit first, and in what order?* (proof/receipts first? founder story? inside look?)
   - *What must the visitor believe by the end — one sentence, not a feature list.* (he pasted the mission statement)
   - *What real assets exist?* — decides how much is **generated vs graded from what you own** (two photos + a merch image; the rest generated as **minimal low-poly geometric human figures** matching the brand palette)
   - *One thing this site should do that no site you've seen does — this becomes the signature move.* ("every claim has a receipt — nothing asserted without a source")
   - *Where should the page feel calm and where intense?* — pacing/emotional map
   - Framing input up front: "premium, trusted, **editorial** — not a world we fly through, subtle animations."
2. **Assets.** key.ai as "OpenRouter for image/video models": the skill generates images, turns them into videos, stitches — fills every gap itself given an API key. **Emotional instruction works:** tell the model what the visitor should *feel* and have it imagine scrolling as the user.
3. **Build.** ~30 min. Pulled **live numbers** (community count as of today) and found leaderboard screenshots that were nowhere on the source site.
4. **Verification.** *"Now the part the harness can't judge: zooming into keyframes"* — it screenshots the scrolled page at key frames and inspects them before handing over. Delivered a scroll-flow contact sheet with the result.

**What the first draft got right / wrong (the feedback loop).** Right: editorial-report vibe, globe-fill-as-members-grow, exhibit-labelled sections ("Exhibit A — the room on an ordinary Tuesday"), sources counter unlocking on scroll (0/9 → 6/9), horizontal exhibit rail, real testimonials, correct-brand feel. Wrong: **hero bland on first load** (fixed as a magazine-cover hero with scroll-in), **globe animation scrolled too fast** (slowed so users can read what's happening), certification animation too short, wrong caption, wrong CTA link, a "register" section he killed, a bug on reload. Round 2 added a typewriter text reveal and faces appearing one-by-one on the call screenshot. **Pacing is the #1 revision class** — animations tied to scroll almost always need to be slowed.

**What T8 adds that T1–T7 did not.**
- A **concrete interview script for scroll pages** (journey order · one-sentence belief · owned-vs-generated assets · signature move · calm/intense map). T5 said "Claude Design interviews you"; T8 shows the *questions*.
- **Emotional-state prompting** as a first-class design input.
- **Keyframe screenshot self-verification** as a build step, not an after-the-fact QA — a real mechanism for the "harness can't judge motion" problem.
- **Live data + found assets** as a premium signal (real receipts, real numbers).
- **Scroll-pace tuning** as the expected first feedback round.
- An "editorial, calm, subtle" scroll register alongside T2's maximalist macro-journey — confirms the taste tiers are a spectrum, not one ceiling.

---

## §3 — Merged digest: what the whole corpus says (T1–T8 + Midlibrary)

**Settled convergences (≥2 independent sources):**
1. **Image-first, then video** (T1, T2, T6, T8). Stills are cents; commit video spend only to the winner.
2. **Batch and select; never judge one output** (T1, T2, T4, T5, T8's contact sheet). Per-generation hit rate ~30–50%.
3. **Interview before generating** (T5, T8, Swan's grill-me). The interview is what makes the output non-template.
4. **2–3 tournament rounds, then stop** (T4 + Kimi). Breadth first (10 concepts / 8–12 per rule 40), then converge.
5. **The creative is the heavy lifter** (T2, T6, T8). Bespoke hero creative carries the page; scaffolding is cheap.
6. **Reference quality determines output quality** (T3, T5, T6). Screenshot-only → generic; repo/Figma/URL → specific.
7. **Scroll drives something real** (T1, T2, T6, T8) — a video playhead (C13) *or* a data reveal; either way, the user's scroll is the control, and pacing is tuned in review.
8. **Verify what the harness can't see** (T8 keyframes, Kimi's scrub-physics gates, Swan's qa-gates receipt).
9. **Borrow structure, not aesthetics** (T3, T5): spacing/layout/flow order from references; style stays yours.
10. **Taste is a two-axis navigation problem** (Midlibrary): *whose hand* × *what it does to the viewer*.

**Standing Swan diagnosis (field-techniques CONVERGENCE, still true):** the gap between Swan's sites and these transcript sites is **not taste and not doctrine** — Swan already holds C13, WFX-05, the Enchantment Ratio and a taste ceiling above Mobbin. It is four **mechanism** gaps: no custom creative, no 30→60 interpolation, no reference depth (one-query P-mode), no convergence in pixels (converging in React is ~100× costlier, so iteration stops early).

**Known open items the auditor should see:** `design.md` vs `typography-grid.md` spacing/radius scale conflict (SWA-163, unenforced); taste brain has only **145 on-taste subjects** (3.6% of corpus) and agent-written placeholder ratings Sean must delete; ComfyUI nodes unverified in a live instance; `field-techniques.md` is still `DRAFT` with a stale T4 stub; no mechanism yet links **grill-me → taste brain → style suggestions** (the thing Sean actually wants).

---

## §4 — THE CHATGPT PRO PROMPT (paste everything inside the fence)

```text
FETCH FIRST
The source repo (github.com/SeanSwan/-SS-PT-New) is PRIVATE. Read the handoff this prompt comes from and the design-brain files EITHER through the GitHub connector Sean has authorized in this chat OR from the files Sean attached. Handoff: branch `docs/design-brain-transcript-corpus-2026-08-24`, path `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md`. Brain: branch `main`, folder `docs/ai-workflow/design-brain/` (start with README.md, index.md, field-techniques.md, style-taxonomy.md, forge-compiler-contract.md, design.md). If neither is available to you, say so explicitly and work from the summary below — do not pretend you read the files.

ROLE
You are a senior design-systems researcher and a hostile reviewer. You will (1) run deep research, (2) hostile-review a design "brain", and (3) design a missing mechanism. Cite sources for research claims. Mark any speculation [HYPOTHESIS]. Do not flatter. Absence-first: the most valuable findings are the things nobody wrote down.

WHO I AM
Sean — founder of SwanStudios, a production personal-training SaaS (React 18 + TypeScript + styled-components; Node/Express/PostgreSQL). Brand: "Enchanted Apex: Crystalline Swan" — dark-first, frozen enchanted forest + deep-ocean luxury vault. Palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0 (glow), Arctic Cyan #50A0F0 (data only), Gilded Fern #C6A84B (gold, rationed), Frost White #E0ECF4, Wing Purple #8B5CF6 (glow accent), Obsidian #0A0A0F, Carbon #141419, Graphite #1A1A24. Fonts: Plus Jakarta Sans, Cormorant Garamond Italic, Fira Code, Sora. My visual taste: NatGeo-grade realism — glaciers, mountains, islands, open fields, wild and tropical animals shot with documentary patience; cinematic over decorative; light emerging from dark; moods = frozen enchanted forest, deep-ocean vault, aurora over ice, quiet awe, weight and scale. Refusals: template gloss, flat corporate stock, neon cyber-clutter, busy collage, anything that reads "AI art" before it reads image.

WHAT THE SWAN DESIGN BRAIN IS
A folder of markdown (docs/ai-workflow/design-brain/) that multiple AI coding agents (Claude, Codex, Gemini, a local Qwen, and my Telegram operator "Hermes") load before building any UI, so four brains draw the same picture. It ADAPTS two source-of-truth docs (a cinematic design system with a C1–C13 pattern library and a four-act page arc; an asset-storyboarding doc) into callable files: design.md (tokens, canon), motion.md, components.md, anti-patterns.md, qa-gates.md, cinematic-pages.md, website-archetypes.md (22 archetypes), worlds.md (18 "World DNA" recipes), techniques.md (WFX-01–13 effect contracts with a B0–B3 render ladder and hard perf budgets), experience-mode.md (M0–M4 motion budgets), psychology.md (10 ethical [HYPOTHESIS] persuasion contracts), typography-grid.md, style-taxonomy.md, field-techniques.md, forge-compiler-contract.md, per-agent adapters, and a link-integrity gate. Bar: every output must be defensible as a $100k commissioned site. Taste ceiling: the "C13 Scroll-Bound Macro Journey" (scroll drives a video playhead, 60fps scrub gate, tour mode) sits ABOVE conventional app-UI reference (Mobbin). Governance laws that any recommendation must respect: styled-components only (no Material-UI), 44px touch targets, dark-first, WCAG 4.5:1, prefers-reduced-motion honoured with a designed static fallback, no hardcoded hex (tokens with fallbacks), 300-line file cap, zero client PII to any LLM, "stretching/flexibility" never "yoga/meditation".

THE MIDJOURNEY BRAIN INSIDE IT
Two halves, deliberately separate. (a) KNOWLEDGE: a private offline copy of the Midlibrary guide (78 guides, ~143k words) distilled into a two-axis style matrix — SOURCE (15 categories, ~5,525 styles: painters 1,546, illustrators 919, photographers 686, techniques 393, genres 312, filmmakers 118, architects 107, printmakers 43 …) × QUALITY (51 facets: vivid/moody/subdued/dark/dreamy/epic; portraits/landscapes/animals/urban/floral; fine lines/painterly/broad brushstrokes; geometric/abstract/minimalist/patterns; realistic/surreal/documentary/classical; BW/pastel/bold; cinematic/retro/baroque/fantasy/sci-fi) — plus 223 SREF (style-reference) codes, 4,272 real prompts, 407 style handles, 22 canonical parameters. (b) TASTE: my own judgement files — themes.md (positive), rejected.md (negative), loved-srefs.md (ratings 1–5), kept.md (prompts I kept). A prompter samples real prompt grammar at observed corpus frequencies, filters by taste (keyword +2 / avoid −3), weights rated codes by rating², and keeps exploring unrated codes down to a 25% floor. Only taste (never the copyrighted corpus) is exported to Hermes's knowledge vault. A "Forge compiler" composes images through 12 slots (intent, subject, medium, style anchor, composition, optics, light, palette, material, abstraction, negative, output); the style anchor must use the personification formula "[Artist]'s [actual medium] depicting [subject]", never "[subject] by [Artist]". A Prompt Studio workbench is specified but unbuilt: browsable brain (click to insert SREFs/artists/handles), a main prompt box, a "director" box that rewrites it, an iteration ledger.

THE INTENDED PURPOSE THAT IS NOT YET BUILT (this is the core of the job)
I have an interview skill ("grill-me": one question at a time, always leading with a recommended answer, checkpointing every answer to a doc, then a synthesis phase that proposes what I didn't ask for). I want the design brain to USE grill-me to discover what styles I like, and THEN offer me style suggestions drawn from the Midjourney brain — so that whether I'm designing a website, generating a picture, or making a film, the output gets more beautiful and more "mine". Today there is no mechanism connecting grill-me → taste brain → style suggestions. Design it.

WHAT THE BRAIN HAS ALREADY LEARNED (eight practitioner transcripts I fed it, distilled)
T1 Dithered animated hero: widescreen 1K still (batch ≥2) → 4s image-to-video → frames at ~11fps → dither → pointer-reactive background. Key economics: generate ~20 stills cheaply, pick one, spend video money only on the winner; image-to-video conforms far better than text-to-video.
T2 Scroll-bound macro journey: ideate 10 radically different concepts → 8s continuous macro journey (batch 3, 16:9 + 9:16) → AI frame interpolation 30→60fps (the step that separates premium scrub from janky) → frames bound to scroll → tour mode. "The creative is the heavy lifter." A hostile review added scrub physics (damped target ~0.085 lerp, ≤3-frame clamp, never hijack wheel/touch), mobile = autoplay loop, 100dvh, persistent scrim for contrast at every frame, resolution ladder, reduced-motion → static frame.
T3 Mobbin MCP: three research modes (screens for directions, sections for named regions, flows for a named app's journey); 50+ references is trivial; cross-industry transfer is the anti-generic lever; PRD → requirements → UX DIRECTION (most-skipped step) → screens → iterate → pull designs back into the data model. Caveat: Mobbin is mobile-strong, web-weak; we are web-first.
T4 Recursive variant tournament: A → A/B/C/D → gut-pick → branch from winner → 2–3 rounds then stop (independently confirmed by a hostile review). Human taste is the judge function.
T5 Claude Design: it natively returns a questionnaire for vague prompts (don't rebuild the interrogation); Figma file ≫ screenshot for reference fidelity; three edit modalities, cheapest first; named-designer style transfer with an explicit KEEP list; borrow spacing/layout from references, never aesthetics; side-by-side variant viewing; export design.md + PRD.md so any new project inherits the style including image style; generate a brand asset pack BEFORE designing; one showstopper "moving piece"; UI sniping from component libraries.
T6 Codex as art director: reference quality ladder S (URL + repo + original prompt + live demo + stack) → A (URL) → B (screen recording) → C (screenshot only — where vector-slop begins) → D (bare prompt); recreate to learn the mechanism then reinterpret into something clearly new; explore at 480p then upscale; transparent PNG never vector for AI illustration; shader overlays over live HTML; cost confirmation before every spend.
T7 ComfyUI local MCP: agent gets machine introspection (Torch/CUDA/VRAM), node/model install, diagnosis, model recommendation fitted to the actual GPU, job tracking, partner nodes on per-generation credits; the differentiator is CONTEXT — wrap a skill around hand-tuned workflows explaining what each is for; a scale/diagnosis play, not a one-image play.
T8 Scrollcraft (newest): an interview-driven scroll-site skill. Interview questions that shipped: what's the scroll journey and order; what must the visitor believe by the end (one sentence); which assets are real vs generated (decides "generated vs graded from what you own"); one thing no site does — becomes the signature move; where the page should feel calm vs intense. Emotional instruction ("imagine you are the visitor scrolling — what should they feel") is a first-class input. Assets via an image/video model aggregator; then the harness SCREENSHOTS KEYFRAMES of the scrolled page and inspects them before handover. Pulled live numbers and found real screenshots as "receipts". First feedback round was almost all PACING (slow the scroll-linked animations), plus a bland hero fixed as a magazine-cover reveal. Scroll must correlate to something on the page; the user's scroll is the control. Not a template — every output differs because the interview differs. Registers range from calm/editorial to maximalist.
Midlibrary: taste is a two-axis navigation problem — whose hand × what it does to the viewer.
Cross-transcript convergences: image-first then video; batch-and-select; interview before generating; 2–3 rounds then stop; the creative carries the page; reference quality = output quality; scroll drives something real; verify what the harness can't see; borrow structure not aesthetics.
Our own standing diagnosis: the gap between our sites and these is NOT taste or doctrine (we hold the doctrine) — it is four mechanisms: no custom creative generated, no 30→60 interpolation, no reference depth (a one-query cap), no convergence in pixels (we converge in React, ~100× costlier, so iteration stops early).
Known open defects: two brain files state different spacing/radius scales and nothing enforces either; the taste model reaches only 145 on-taste subjects (3.6% of the corpus) via literal keyword matching; placeholder ratings written by an agent still steer output; the field-techniques file is still marked DRAFT; ComfyUI nodes are unverified live.

YOUR DELIVERABLES (in this order, with headings)
1. DEEP RESEARCH (cite sources). (a) State of the art in taste/preference elicitation for visual style — pairwise comparison, two-alternative forced choice, Bradley–Terry / Elo over image pairs, active learning for preference, SREF-driven style discovery workflows in Midjourney and their equivalents in Flux/SDXL (style LoRAs, IP-Adapter, CLIP-embedding style vectors), and how practitioners run "style interviews" with clients. (b) Craft standards for scroll-driven premium sites in 2026: frame-sequence scrub vs video-scrub vs WebGL, interpolation tools (RIFE/FILM/commercial), GSAP ScrollTrigger / Lenis / native scroll-timeline, pacing heuristics, mobile strategy, accessibility (WCAG 2.2.2 pause, reduced motion), Core Web Vitals impact, and measurement. (c) How the best AI design tools structure the interview → assets → build → self-verification loop, and what they do that this brain doesn't. Say which findings are settled vs contested.
2. HOSTILE REVIEW of the brain as described. Where is it wrong, hollow, self-contradicting, unbuildable, over-specified where it should be simple, or theatre? Rank by severity. Attack especially: the keyword taste scoring, the 25% exploration floor and rating² weighting, the personification-formula claim, the 12-slot composer, the "creative is the heavy lifter" budget claim, the 2–3-round cap, and the assumption that Midlibrary's two axes are the right axes for a personal taste model. Quote the specific claim you are attacking.
3. ABSENCE-FIRST GAP ANALYSIS. What should exist and doesn't, ranked by value left on the table (output quality, money, my time). Include what a taste brain needs to serve THREE media at once — web pages, still images, and film — and whether one taste model can span them or three linked ones are needed.
4. DESIGN THE MISSING MECHANISM: the "Taste Discovery Grill". Produce a concrete protocol that grill-me can run: the exact question sequence (with the recommended-default style each question should lead with), what each answer writes into themes/rejected/loved-srefs, when to switch from questions to showing me paired image/style examples, how to sample those examples from the two-axis matrix so I discover styles I don't have words for, how many rounds before it has enough signal, how it avoids collapsing onto the first two things I rate highly (the exploit trap), how the same session yields suggestions for a website direction, a Midjourney prompt, and a short film treatment, and what "done" looks like. Give it as a numbered spec an engineer could build Monday, plus a worked example run against my stated taste above.
5. STYLE SUGGESTIONS, NOW. Using my taste statement, propose 12 concrete style directions from the Midlibrary axes (name the SOURCE hand + QUALITY facets, why it fits, one risk), split 4 for web hero/scroll journeys, 4 for still imagery, 4 for short film. For each give one prompt-ready style anchor in the personification form.
6. PRIORITISED ACTION LIST: the 10 changes to make first, each with the file it touches, the failure it prevents, and rough effort.

RULES FOR YOUR ANSWER
No Material-UI, no light-first defaults, no Galaxy-Swan legacy palette (#0a0a1a / #00FFFF / #7851A9), no "yoga/meditation". Do not propose vector RAG or a knowledge graph for what a markdown catalog can do. Distinguish [VERIFIED from cited source] / [LIKELY] / [HYPOTHESIS]. If you would need something from the actual files to be sure, say exactly what and why instead of guessing. Be as long as the job needs; do not summarise away the deliverables.
```

---

## §5 — Notes for the next agent

- **Do not paste real transcripts into the prompt.** Everything above is distilled; the raw Scrollcraft transcript stays in the chat where Sean posted it.
- **After ChatGPT Pro answers:** treat its output as `[HYPOTHESIS]` per rule 30/52; route through `swan-oracle` classification before any brain file changes; `field-techniques.md` needs its `DRAFT` status and the stale `T4 — (awaiting transcript)` stub resolved in the same pass, and T8 deserves its own `§T8` section there.
- **Privacy:** this doc and the prompt carry Sean's brand/taste only — no client data, no secrets, no absolute paths.
