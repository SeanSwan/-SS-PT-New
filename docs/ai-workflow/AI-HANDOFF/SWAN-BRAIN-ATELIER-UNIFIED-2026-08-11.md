# SWAN BRAIN — "ATELIER" · UNIFIED WORK ORDER

- **Date:** 2026-08-11 · **Author:** Opus 5 (Fable-tier) · **Status:** DRAFT — review round 2
- **This is the single document.** It absorbs the original REV-1 plan, the Kimi K3 + HY3 hostile reviews, a previously-missed Fable Final-Decider ruling, the Midlibrary craft research, and six practitioner transcripts. REV-1 and REV-2 are superseded and exist only as history.
- **Branch:** `feat/swan-brain-v2-atelier` (worktree cut from `origin/main`)
- **Target:** `docs/ai-workflow/design-brain/` + `.claude/skills/swan-design-router/SKILL.md`
- **Bar:** every output defensible as a **$100,000 commissioned site**. Sean's verdict on current state: *"none of my sites, even the SwanStudios sites, looks anything like this."*

---

## §0 — BRANCH LAW

`wip/comms-notifications-2026-07-05` is **1731 commits behind `origin/main`** and is a stale fork of the brain: `worlds.md` (105 KB), `psychology.md`, `techniques.md`, `experience-mode.md`, `components.md`, `anti-patterns.md`, `qa-gates.md` exist on main and **not** on that branch; it carries orphans main already dropped. **All work lands on a branch cut from `origin/main`.** No exceptions.

---

## §1 — ROOT CAUSES (all `[VERIFIED]`)

| # | Root cause | Evidence |
|---|---|---|
| **RC-1** | Mobbin is capped at **"exactly one query and one result"** | `external-reference-mcp.md` mode P. S disabled, D Sean-only, X blocked. Enforced in `scripts/design-brain/src/reference-modes.mjs`; `egress-policy.mjs` denies by default. **This is the 5–10 image ceiling.** |
| **RC-2** | Router and protocol **contradict each other** | Router: *"**I** is the default for a named surface."* Protocol: `I` is **refused** with `E_LEGACY_MODE_REFUSED`, "never privilege-mapped." An agent resolving that conflict safely does the minimum and moves on. |
| **RC-3** | The approved fix exists and is **~10% built** | Fable locked S0→S10 on 2026-07-25. `tests/fixtures/visual-card-golden.svg` **EXISTS** (15,117 B). `visual-contract/visual-tokens/visual-card-svg/log-visual-card/trial-contract/log-trial.mjs` **all absent from `origin/main`.** |
| **RC-4** | Image generator has **no art brain**, wrong provider | `generate-image.mjs` → Gemini `gemini-3.1-flash-image-preview`; entire aesthetic intelligence is a **3-line** `SWANSTUDIOS_STYLE` constant. **No OpenRouter image path exists.** |
| **RC-5** | **No frame interpolation anywhere** | Rule 40 mandates a 60fps scrub gate; WFX-05 defines scroll-scrub; repo-wide grep returns **zero** motion-domain interpolation hits. The gate has no stated path to itself. |
| **RC-6** | Brain is **website-only** | No contract for audio-reactive, video/motion, 3D/WebGL, or generative art. Repo-wide grep on `origin/main`: **no Swan Visualizer exists** — only voice-capture (`useVoiceCapture`, `CoachVoiceLevelMeter`). |
| **RC-7** | **Typography, grid, and spacing are absent** from the upgrade | Kimi's catch. For a $100k bar these determine perceived quality more than hero art. |

*Correction of record:* REV-1 overclaimed RC-6 from a `frontend/src`-only grep. Now re-verified repo-wide. Claim stands; the original evidence scoping was sloppy and Kimi was right to flag it.

---

## §2 — WHY SEAN'S SITES DON'T LOOK LIKE THE TRANSCRIPTS

The gap is **not taste and not doctrine.** Swan already holds C13 Scroll-Bound Macro Journey, WFX-05, the Enchantment Ratio, and an explicit taste ceiling *above* Mobbin (rule 40). Four **mechanism** gaps explain the whole delta:

1. **No custom creative.** Every transcript site is carried by a bespoke ~8-second generated hero. *"The creative is really the heavy lifter."* Swan generates almost none.
2. **No frame interpolation.** 30fps scroll-scrub shows every discrete frame — precisely the "janky/weak" feeling. One post-process step fixes it.
3. **No reference depth.** RC-1/RC-2 starve every surface of the references that determine output quality.
4. **No convergence in pixels.** Swan converges in React — orders of magnitude costlier per iteration — so iteration stops early and the first mediocre draft ships.

**None require changing a LAW.**

---

## §3 — THE GOVERNING PRIOR RULING (do not re-litigate)

`FABLE-SWAN-DESIGN-BRAIN-VISUAL-LEDGER-FINAL-RULING-2026-07-25.md` — Fable 5, Final Decider: **LOCK-WITH-CHANGES.**

- **D1** Visuals explain, never corroborate — the data-truth firewall.
- **D4** **Mobbin reference-only, no bytes/URLs/HTML: CONFIRM. Non-negotiable licensing hygiene.**
- **D5** No licensed-image archive absent written permission: CONFIRM.
- **D6** Trial gate, not auto-canon — **override any fast path.** Two gates, both mandatory, forever.
- **D8** Recall useful before doctrine readiness.

Fable's binding pre-build changes (all still apply): renumber Modified as M1–M7 · `createdBy`/`verifiedBy` accept **role/agent IDs only** · add the **banned-lexicon gate** (yoga/meditation/NASM-certified must never render into an append-authoritative SVG) · determinism vs. timestamps (fixed `nowIso`, timestamps never render) · enumerate `refType`, `lookupHint` ≤120 chars, payload >500 chars fails · **stem-match** denied-key scanner (img/image/screenshot/src/href/url/html/base64/data/thumb) at every depth · packet at-ceiling displacement rule · readiness = `seanTasteVerdict === 'approve'` · two-product provenance reads the claim ledger, never the card · token-name drift test. **S10's two clean hostile rounds remain mandatory before merge.**

**Consequence:** REV-1's invented "Taste Ledger" is **deleted** — it re-invented an adjudicated system (a Rule 52 anti-rework violation by me). The panel's ledger dispute is settled **by authority, not opinion**: Kimi called the principles-only firewall "legally coherent, not laundering"; HY3 called it laundering and predicted a cease-and-desist while asserting a rationale for `egress-policy.mjs` it had never read. **D4 already permits a reference-only ledger. Kimi was right.**

**Still `[UNKNOWN]`:** whether P-mode's *one-query cap* was deliberate. Commit `9599539d8` has a bare message. **B1.1 stays blocked pending Sean.**

---

## §4 — THE CRAFT CORPUS (research, landed)

### 4.1 Style taxonomy — captured live, two-axis
`design-brain/style-taxonomy.md`. Midlibrary is a **matrix**, not a list — which is exactly what the Forge needs.

- **Axis 1 — SOURCE (15 categories, ~5,525 styles):** Painters 1546 · Illustrators 919 · Photographers 686 · Techniques 393 · Genres 312 · Various 309 · Titles 301 · Sculptors 236 · General 175 · Designers 165 · Fashion Designers 135 · Filmmakers 118 · Architects 107 · Street Artists 60 · Printmakers 43.
- **Axis 2 — QUALITY (51 facets):** Vivid 2303 · Detailed 2067 · Portraits 1646 · Moody 1483 · Subdued 1329 · Landscapes 989 · Scenes 974 · Characters 911 · Urban 742 · Fine lines 715 · Surreal 683 · BW 662 · Dark 652 · Floral 610 · Geometric 550 · Illustrative 506 · Broad brushstrokes 497 · Abstract 483 · Classical 478 · Dreamy 476 · Animals 472 · Expressive 465 · Patterns 423 · Realistic 405 · Painterly 393 · Fantasy 258 · Sci-fi 192 · Cinematic 182 · Minimalist 131 · Psychedelic 100 …
- **Swan mapping:** PREFER Subdued/Moody/Dark/Fine-lines/Geometric/Patterns/Abstract/Minimalist/BW/Cinematic/Realistic; sources Photographers, Architects, Printmakers, Filmmakers, Sculptors. **BANNED:** Psychedelic (the iridescent-gradient failure mode by another name), Animals/Characters as rendered subject (LAW 4 — permitted only as a dark occluder in a light field), "AI fantasy wallpaper," Cute/Funny/Madness.

### 4.2 Craft vocabulary (verified from the guides)
- **Personification formula — the single highest-value extraction.** `[subject] by [artist]` is the **weak** form. Strong: **`[Artist]'s [their actual medium] depicting [subject]`** — *"Erwin Wurm's installation depicting…"*, *"Anton Corbijn's classical photograph of…"*. Always name the artist's real discipline; mismatching subject to medium is the #1 style failure.
- **Photographic controls:** 8 lens types (fisheye, normal, pinhole, telephoto, tilt-shift, ultra-wide, vintage, wide-angle) · aperture/shutter/film-grain descriptors · 12 lighting qualities (back, bottom, contrasty, hard, neon, window-blind, peach-and-cyan, side, soft, sunlight, top) · **16 film stocks** (Portra 160/400, Ektar 100, Tri-X 400, Ektachrome E100, CineStill 50, Provia 100F, Velvia 100, Pro 400H, Superia X-TRA 400, Neopan 100, FP4 125, HP5+ 400, XP2 400, Fomapan 400, Fujicolor C200, Lomography Color 100) · framing/angle sets · photographer roster (Avedon, Leibovitz, Crewdson, Roversi, Knight, Aldridge, Corbijn, Schoeller, Erik Madigan Heck, Tim Walker, Karen Knorr).
- **General modifiers:** color schemes (translucent, complementary, subdued, vivid, anaglyph, monochromatic, iridescent) · texture (gritty, fibrous, spectral, fluffy, porous) · atmosphere (dreamy, melancholic, serene) · composition (symmetrical, layered, radial, bird's-eye, low-vantage, split, macro). Append at end, or weave into the opening for stronger binding.
- **Abstraction control:** `--chaos` 0–100, default 0. **0** repeatable/conservative · **33** coherent variation · **66** real stylistic divergence (sweet spot for abstract substrates) · **99–100** maximum unpredictability. Chaos + locked seed *adds order* to variation — controlled exploration.
- **SREF:** `--sref <code>`, `--sw` 0–1000 (default 100, **sweet spot 65–175**), multi-blend `--sref a b c`, weighted `a::2 b::1` (only proportions matter). Controls technique/palette/contrast/light-ratio/composition — **not subject.**
- **Super-Tiling:** generate with `--tile` (1024²) → inpaint the **interior only, never the edges** → 2048² seamless. Preserve L/R edges only → infinite horizontal panorama (**parallax strips**). Preserve T/B only → vertical scroll bands.
- **Animation genres:** hand-drawn (Disney/WB/Fleischer/Ghibli) · silhouette (Reiniger — backlit cut-outs, duotone) · stop-motion (Laika — felt, plasticine) · claymation (Aardman — fingerprints, soft indentations) · cutout/collage · rotoscope (*Waking Life*, *A Scanner Darkly*) · anime (`--niji`) · 3D/CGI (Pixar/DreamWorks; low-poly, voxel, raytraced, glitch-CGI, retro-futurist).
- **Honest gap:** the animation guide **does not cover abstract motion graphics or loops.** Swan must author that vocabulary itself — original work, not harvestable.

### 4.3 Provider-portability warning
`--sref`, `--tile`, `--chaos`, `--stylize` are **Midjourney flags.** Non-MJ models largely ignore numeric params. Keep the *intent* (abstraction level, style strength, tileability); express per-provider. **Do not call a saved prompt preset an "SREF translation"** — SREF is a latent-space style embedding; a preset is a prompt template. Both Kimi and HY3 independently called that framing cargo-cult, and they were right.

---

## §5 — THE FIELD PIPELINES (six transcripts, landed)

Full detail in `design-brain/field-techniques.md`. Highlights:

- **T1 — Animated dithered hero.** Widescreen (never 1:1) · 1K not 2K · batch 2 · still→video 4s → frames at **~11fps** (the staccato *is* the aesthetic) → dither → pointer layer. A **performance cheat**: cinematic surface at near-zero GPU cost. **OFF-LAW for Swan** (dither is overt stylization vs. LAW 1) — **ON-LAW for client work.** Hard evidence for the law-split.
- **T2 — Scroll-Bound Macro Journey.** This *is* rule 40's C13. Supplies the missing recipe: 10-concept breadth → 2-stage concept→video prompt (few-shot on detail level) → **8-second single continuous extreme macro journey**, 16:9/9:16, batch 3 → **interpolate 30→60fps** → extract frames → bind to scroll → **tour mode** → static deploy. *"The creative is really the heavy lifter."*
- **T3 — Mobbin depth + PRD-first.** Three tools = three modes (`search_screens` 30/call · `search_sections` 30/call+paging · `search_flows` 10/call, 20 pages). **50+ refs is two calls — the tool was never the constraint.** Cross-industry transfer is the anti-generic lever. Sequencing law: PRD → requirements → **UX direction (most-skipped)** → screen prompts → design → **designs flow BACK into the PRD** so schema/models reference them. **Caveat: Mobbin is mobile-strong, web-weak** — SwanStudios is web-first, so temper expected ROI and lean on `search_sections` + mobile→web transfer.
- **T4 — Recursive variant tournament.** A → {A,B,C,D} → judge → branch from winner, **2–3 rounds**. "Trading tokens for quality." Independently matches Kimi's cap recommendation.
- **T5 — Claude Design.** Its **native questionnaire already is** Sean's "ask questions until it gets it right" — do not rebuild it. Figma upload ≫ screenshot (carries real tokens). Three edit modalities (`edit` / `comments` / `tweaks`) + image-driven tweaks. BYQ (`byq.supply`) for **named-designer style transfer with an explicit KEEP-list**. Mobbin in-loop: borrow **spacing and layout, not aesthetics**. MagicPath for **side-by-side** variant judging. **Finale: a portable `design.md` + `PRD.md` pair** droppable into any new project — Swan's `design.md` already *is* this file; T5 adds the portability pattern.
- **T6 — Codex as art director.** **The reference quality ladder: S** (URL + repo + prompt + demo + stack) → A (URL) → B (screen recording) → C (screenshot — *where vector-slop starts*) → D (no reference). *"The most important thing is the references."* **Recreate → then REINTERPRET.** Cost ladder: **480p test (~$0.10–0.50) → approve → upscale 1080p**; finished video ≈ $1–2. **Transparent PNG, never vector.** Single-file HTML for prototypes only. Canvas UI (`canvasui.dev`) for shader-over-HTML; `shaders.com`; Higgsfield MCP as model-router.

### Convergent findings (independent sources → highest confidence)
1. **Image-first, then video** (T1, T2, T6 — three sources). **Settled law.**
2. **Batch and select; never judge one output** (T1/T2/T4/T5). Per-generation satisfaction ~30–50%.
3. **2–3 tournament rounds, then stop** (T4 practitioner + Kimi hostile review). **Overrules REV-1's "loop forever."**
4. **The creative is the heavy lifter** (T2, T6). Budget the 8 seconds, not the scaffolding.
5. **Reference quality determines output quality** (T3/T5/T6).
6. **Scroll drives a video playhead** (T1/T2/T6) — already Swan law as C13/WFX-05.

---

## §6 — THE MODULES

### **B0 — Unblock** *(first; cheap; no new design)*
- **B0.0 — COMMIT THE PANEL TOOLING.** `consult-opus5.mjs`, `consult-hy3-design.mjs`, `run-newsroom-top-ai-panel.ps1` are **uncommitted, working-tree-only.** Fable's S10 mandates two clean hostile rounds — but *"the mandatory review gates depend on scripts that could vanish with one `git clean`. That's not a gap to note; it's a B0.0"* (Kimi). Commit them, or every mandatory gate in this plan is optional.
- **B0.1** Delete the `I`-mode reference from the router (RC-2). A self-contradicting spec is a bug regardless of the cap decision. *Kimi: fixing RC-2 alone recovers most of B1's value.*
- **B0.2 — P-mode decision tree** (not just "ask Sean"; a blocking `[UNKNOWN]` with no branch logic is deferred, not de-risked):
  - **If the cap was collateral hardening →** add mode **R (Reference)**: unlimited *reads*, zero durable provider media/identity. Six-Facet Sweep proceeds as specced.
  - **If the cap was deliberate (rate/legal) →** B1's sweep runs **within one session's read budget, no retention**, and depth comes from `exclude_screen_ids` paging inside that single authorized operation. The sweep survives; only its accounting changes. **B1 is not cancelled either way.**
- **B0.3** **Finish Fable's locked S1–S10** with all ten binding changes. Already reviewed, ruled, de-risked; the golden fixture is done. **Do not reopen the lock** — both reviewers agree; re-litigating because "3 weeks passed" is churn, not rigor.
- **B0.4 — Resolve the D4 / reference-ladder conflict** *(Kimi's sharpest catch — a real self-contradiction in this document)*. Fable's **D4 licenses "reference-only, no bytes/URLs/HTML."** But B6's reference-quality ladder **stores URLs at tiers S and A**, plus repo/prompt/stack at S. **Ruling needed before build.** Proposed boundary, for Sean/Fable to confirm: a **URL supplied by Sean as a build input is a working note in the task thread; it never enters the durable ledger.** The ledger keeps only Swan-authored principles (D4-clean); the task thread may hold references while the task is live. If that boundary isn't accepted, the ladder's S/A tiers must be downgraded to session-only.

### **B1 — Reference Depth**
- **Six-Facet Sweep**: archetype · motion/interaction · direct competitor · **adjacent-excellence (cross-industry)** · anti-pattern · component atom.
- **Gate on facet COVERAGE + one-line justification, not a call-count floor.** Kimi: a hard 150-ref minimum "will be gamed or will stall small tasks." Accepted.
- Borrow **spacing and layout, not aesthetics** — keeps intake inside D4.
- Ledger writes go through B0.3's locked system, never a parallel invention.

### **B2 — Convergence Loop** *(runs AFTER B3)*
- **Sequencing inverted per HY3:** *"you cannot converge on pixels using a generator that has a 3-line hardcoded string — B2 is a mansion on a tent."* Correct.
- **Round 0 = Claude Design's native questionnaire** + `grill-me` depth only where shallow.
- **Round 1** = Six-Facet Sweep → mood slate (3 named directions × 4–6 cited refs).
- **Round 2–3** = tournament: generate → judge side-by-side → branch from winner. **Cap 3 rounds**, then escalate to Sean with two finalists.
- **Cost model** (answers Kimi's objection): stills are cents; video $1–2; React iteration is hours. Converge in stills, commit once.

### **B3 — Image Forge** *(ships FIRST)*
- **12-slot prompt architecture:** intent · subject · medium · style anchor (personification formula) · composition · optics · light · palette (Swan tokens named in dominance order) · material · abstraction control · negative (kill-list) · output contract (ratio, tileability, transparency, resolution).
- **BLOCKING VERIFICATION:** does the chosen provider support **masked inpainting**? The entire Super-Tiling/parallax-plate pipeline assumes it. *Kimi caught this; REV-1 missed it.* Also verify OpenRouter image-model slugs **live** (Rule 18).
- Add an **OpenRouter image path** alongside the existing Gemini/Nano-Banana path (keep it as fallback — already wired and paid for).
- **Image-first → video**; **480p → approve → 1080p**.
- **Transparent PNG over vector** → kill-list addition.

### **B4 — Motion & Dimension**
- **Frame interpolation 30 → 60fps before frame extraction.** Highest-value technical addition in this document: it closes the verified gap between rule 40's mandated 60fps scrub gate and WFX-05's silence on how to reach it.
- Scroll-as-timeline: entry/exit ranges, pin regions, scrub vs. play-once, **designed static frame for reduced motion** (LAW 5 R1 — the CSS-only guard is a lie for JS scroll animation), mobile degradation.
- Parallax law: depth = layer count × differential rate × **atmospheric perspective**. Flat multi-speed scrolling banned.
- Three.js tier vs. faked 2.5D (2.5D is correct far more often). **Canvas UI** as the cheap middle path — water/refraction on-law (LAW 4 optics); cloth decorative, needs justification.

### **B5 — Beyond-Web** *(cut hard; both reviewers called it a monolith)*
- **SHIP NOW: the law-split only** — separate universal taste law from Swan-specific palette/content law. **T5 gives its concrete form: a droppable `design.md` + `PRD.md` pair.** This is Sean's "versatile, not just one thing," and the best-evidenced module here.
- **DEFER the three medium contracts** until their `[UNKNOWN]`s close. **M-AUDIO is net-new** (no visualizer exists). M-MOTION bridges to the existing Seedance skills. MiniMax-Hailuo unverified.
- Structure as **`mediums/` lazy-loaded by the router** — never bulk-loaded (HY3: "a 400KB index.md no agent can parse").

### **B6 — Taste Ceiling** *(now measurable)*
- **Measurement instrument** (Kimi's #1 absence-first gap): repeatable rubric, named benchmark set, defined scorer, cadence. Without it the upgrade's ROI is unverifiable.
- **Reference quality ladder as a Gate-0 requirement** (T6): declare S/A/B/C/D; below B on an *awe* surface must be justified.
- **"Why is this worth $100k"** at Gate 3: name the ONE phenomenon, the signature moment, and what a competitor cannot copy in a week. "Clean and modern" fails.
- Homepage ultra-redesign as the live proof. **`Swans.mp4` is KEPT** — upgrade the treatment around it, never replace the footage.

### **B7 — Typography, Grid & Spacing** *(promoted to position 2 — a SUBSTRATE, not a module)*
**Both reviewers independently demanded this promotion.** Kimi: *"Typography/grid is not a module; it's a substrate. Every other module renders onto it… B7 in position 7 means the homepage proof gets built, then rebuilt when B7 lands — the exact anti-rework pattern Rule 52 exists to prevent."* HY3: *"B7 should precede B3 because image plates are composed within that grid."*

Ships as a **token contract that B3 and B4 consume**, not a doctrine PDF. Acceptance criteria required, or it is an orphan:
- Type scale + pairing doctrine; measure/leading rules; optical alignment.
- Baseline/spacing rhythm (HY3 proposes an 8px baseline).
- Grid contract per archetype (HY3 proposes a strict asymmetric 12-column for the homepage).
- **Exported as consumable tokens** — B3 composes plates *within* the grid; B4 choreographs type against the rhythm. If B3 can't consume it programmatically, B7 isn't done.

### **B8 — Agent-Behavior Spec & Rollback**
Token budget per phase (how an agent sequences sweep + ledger write + 12-slot prompt in one context — REV-1 "designed a museum, not a machine"). Kill criteria, A/B against current output, revert plan if the Forge underperforms the 3-line string.

### **B9 — Accessibility & Performance Budget** *(NEW — both reviewers, top-5 absence)*
- **Accessibility beyond reduced-motion.** LAW 5 R1 is cited but insufficient. Awe surfaces need: contrast on text over moving plates, **focus management inside pinned scroll regions**, and **screen-reader order through scroll-jacked content**. Kimi: *"for a $100k site this is a lawsuit-shaped hole."*
- **Performance budget.** An 8-second hero + interpolated 60fps + shader layers with no ceiling is a bounce. Needs: byte budget per archetype, LCP target, and a defined degradation ladder (currently "mobile degradation" is undefined). Kimi: *"Awe that loads in 9 seconds is a bounce."*

### **B10 — Judge Capacity Model** *(NEW — Kimi's #1 absence)*
> *"REV 2 has quietly built a **Sean-serialized system**."*

Sean is the judge function at `seanTasteVerdict==='approve'`, Gate 0, Gate 3, the round-3 escalation, and the P-mode decision. Throughput is one human. Required: a **proxy rubric that lets tournament rounds 1–2 proceed autonomously**, reserving Sean for the final cut — plus a defined behavior when he is unavailable for a week.

---

## §7 — SEQUENCING *(revised after review round 2)*

**B0.0 → B0 → B7 → B3 → B2 → B4 → B1 → B6 → B9 → B5**

- **B0.0 first** — commit the review tooling, or the mandatory gates aren't real.
- **B7 second** — both reviewers, unanimous: typography/grid is the substrate everything else renders onto. Building the homepage before it means rebuilding after.
- **B3 before B2** — HY3's mansion/tent argument: you cannot converge on pixels using a 3-line string generator.
- **Reviewer split (minor):** Kimi puts B4 before B1 (motion depends on the Forge, not reference depth); HY3 puts B1 before B4. Taking Kimi's, whose reasoning is explicit. Low stakes either way.
- **Kimi's cut:** the *competitor* facet in B1 is the weakest — competitor sites are the generic-output source you're trying to escape. **Make it optional.**
- **HY3's cut:** defer B4's Three.js tier (rarely needed); keep interpolation + parallax core.

---

## §7.5 — WORKED EXAMPLE REQUIRED BEFORE EXECUTION *(Kimi's absence #5)*
> *"The plan is all modules, no narrative; the first agent to execute it will discover the seams the hard way."*

Before any agent runs this, walk **one surface — the SwanStudios homepage hero — end to end through B0→B6 concretely.** That worked example is a deliverable, not documentation.

**Two independent homepage directions are already on the table** (both keep `Swans.mp4`):
- **Kimi — "The Flock as Instrument."** The ONE impossible phenomenon: *the swans' motion is the page's scrollbar.* Signature moment: a wingtip exits frame-right and **becomes the first section divider** — footage geometry transitioning into layout geometry with no cut. Everything below the fold is an *echo* of the hero's motion curve (same easing, same duration ratios) so the page feels **conducted rather than assembled**. Uncopyable in a week because it needs the footage *and* the interpolation pipeline *and* the discipline.
- **HY3 — "Living Optics."** Swan as light-bending entity; `Swans.mp4` merged with generated refractive caustics on a strict asymmetric 12-column grid, 8px baseline. Phenomenon: a wing-beat resolving into atmospheric-perspective depth planes driven by the interpolated 60fps scrub. Signature: at 20–60% scroll pin, real swans dissolve into a Canvas-UI shader refraction (LAW 4 optics). Exit 60–100% settles to a typographic manifesto.

Both are on-law. **Sean picks, or they go to the tournament as directions A and B.**

---

## §8 — TOOLING + ECONOMICS
Register (each must pass the AI Skill & Operator Registry — unregistered capability is BLOCKED): Mobbin MCP (have) · Claude Design + its MCP export path · Higgsfield MCP · BYQ (`byq.supply`) · MagicPath · Canvas UI · shaders.com.

**Codex double-pay:** `consult-codex.mjs:37` uses metered `openai/gpt-5.5` while Sean holds a **$100/mo flat-rate Codex CLI subscription.** The file reference is `[VERIFIED]`.

**But the economics are `[HYPOTHESIS]`, not fact** — Kimi's catch, and it is a real risk I stated too confidently: *"routing through the CLI makes it free-at-the-margin assumes the CLI subscription's ToS permits programmatic/agentic invocation at review-loop volume. Many flat-rate plans explicitly prohibit automated high-volume use. If wrong, B2's affordability argument collapses and possibly creates account-risk."*

**Action:** verify the Codex CLI terms before building B2's per-round reviewer on this assumption. Do not design the loop's economics around an unverified allowance, and do not risk Sean's account.

---

## §9 — QUESTIONS FOR THIS ROUND
1. Should B0.3 finish Fable's locked S1–S10 as-is, or has enough changed in 3 weeks to re-open the lock? (Fable said no further review round was required before build.)
2. Is **B3-before-B2** correct? Where would you cut further?
3. Is **B7 (typography/grid)** bigger than a module — should it precede everything, since it gates perceived quality on every surface?
4. Is prompt-preset + seed-locking a genuine substitute for style reference, or should Swan drop style-consistency ambitions until a provider supports it natively?
5. What here is still **vaporware**? Rank by shipped-wrong-code risk.
6. **Absence-first:** what is missing entirely? Rank by value left on the table.
7. **Design:** given the taxonomy, C13, and the interpolation fix — what would you actually design for the SwanStudios homepage? Name direction, the ONE impossible phenomenon, signature moment, motion grammar. `Swans.mp4` must be kept.

---

## §10 — HONEST GAPS
- P-mode cap rationale `[UNKNOWN]` — blocks B1.1; needs Sean.
- OpenRouter image slugs + **masked-inpainting support** unverified — blocks Super-Tiling/parallax plates.
- **No Swan Visualizer exists** on `origin/main` — M-AUDIO is net-new.
- MiniMax-Hailuo `[HYPOTHESIS]`; "Cense 2.0" ≈ Seedance 2.0 `[HYPOTHESIS]`.
- Abstract-motion-graphics vocabulary must be authored by Swan — not harvestable.
- Panel tooling (`consult-opus5.mjs`, `consult-hy3-design.mjs`, `run-newsroom-top-ai-panel.ps1`) is **uncommitted, working-tree-only** — the review capability itself is not durable.
- **No code written; no brain file modified.** Plan awaiting steer.
