# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-world-generator-packet.md
**Seed:** (none)
**Tokens:** 2444 in / 11499 out · **Cost:** ~$0.1798 · **Wall:** 384.3s

---

# (a) VERDICT

**SHIP-WITH-CHANGES** — the safety/constraint spine is the best I've seen in a generator brief, but the *taste half* — the actual core job — is encoded as a noun-soup with zero exclusions, and there's a load-bearing architectural contradiction (worlds-as-DATA vs worlds-as-CODE) that will make the first production run generate unsafe-or-uncinematic output. Five blocking changes, named below.

---

# (b) Design/front-end weaknesses, most severe first

**1. The DATA-vs-CODE contradiction is unresolved — this is architectural, not cosmetic.**
§4 says "worlds/lenses are DATA, never code" behind a fail-closed token gate. §2 demands WebGL, shaders, canvas, particle systems. A cinematic marketing microsite **is code**. The brief never splits the output contract into the two things it's actually describing: **World-as-Site** (code, cinematic, marketing) vs **World-as-Tokens** (data, `--world-*`, in-app, gate-validated). A builder model handed this will either emit tokens that can't be cinematic, or code that bypasses the safety gate. The master prompt must declare which mode it's in and emit the matching schema. Everything else is downstream of this fix. **Blocking.**

**2. Taste is specified as inclusion-only. Premium = restraint, and this brief restrains nothing.**
The founder's taste section is 20+ nouns in a single run-on with bold as the only prioritization (the doc's own information hierarchy models the slop it will generate). There is not one negative taste rule. "Crystals + swans + gold + REAL rainbows + enchanted" is **one generation away from the Claire's-accessories unicorn aisle** — iridescent gradients, lens flares, star-bokeh soup. The retired-palette ban guards the hex codes but nobody guards the *kitsch line*. A builder given 20 ingredients and no pairing rules will plate all 20: glacier + rainbow + hummingbird + nebula in one hero. The brand needs an **enchantment doctrine**: realism as substrate, *one impossible phenomenon per world* — otherwise you get a BBC nature documentary, gorgeous and brand-generic. **Blocking.**

**3. Consistency mechanisms with zero differentiation mechanisms.**
Token contract + signature moment + one palette = homogenization machine. The original YouTube prompt's genius ("each fundamentally different") got fenced to death. Nothing stops 25 worlds from being "dark, cyan glow, purple glow, swan, repeat." You need a per-world **differentiation matrix**: each world declares {primary phenomenon · palette ratio (glacier = 70/20/10 cyan/sapphire/gold; nebula = purple-dominant) · motion signature (parallax-led vs shader-led vs particle-led vs typographic-led) · type mood}, with a registry forbidding repeats. Otherwise: brand-consistent monotony — 25 wallpapers, one soul, no series. **Blocking.**

**4. The Crystallize is a vibe, not a contract.**
§5 calls it the soul, then specs nothing: no facet geometry (SVG polygon? canvas? shader?), no state machine (pending → forming → formed → resting), no easing/duration, no reduced-motion behavior (must be instant facet-swap, no morph), no typographic spec for the big number (tabular numerals? gold? size ramp?). "Every world shares one signature soul" with no shared spec = 25 different Crystallizes = no soul. A signature moment is only ownable if it's *recognizably identical* across worlds. **Blocking.**

**5. "Wow = conversion" asserted once; conversion never designed.**
No CTA doctrine anywhere. **Dual-Button Glow is absent from the brief entirely** — my house rule, your brand's button signature, missing from the generator spec. No final-act grammar (where does the story hand to booking/store?), no CTA hierarchy, no deep-link contract. As written: story-from-top-to-bottom that ends in a footer.

**6. "Story" demanded with no story grammar and no reactivity model.**
§3's "presence as weather" reacts to app state (idle/listening/thinking/speaking). Marketing worlds have no such states — and the brief never says what the world reacts to. Scroll progress as narrative clock + pointer proximity is the obvious answer; unsaid. No scene contract, no act structure, no scene-count band. Ambient loops without reactivity = screensaver, not "living."

**7. "REAL rainbows, not fake ones" — the boldest line in the doc is the vaguest.**
Operationally meaningless as written. If you want real, spec physics: spectral order red-outside→violet-inside, ~40–42° antisolar arc, radial luminance falloff, supernumerary softness, alpha-blended, never hard-edged stripes. Otherwise you get a pride-flag arc in the hero and the founder's one bolded demand is the thing built wrongest.

**8. No typography/spacing/motion systems — the exact defects my checklist attacks.**
Three fonts named, no scale, no spacing ramp, no measure rules, no easing tokens, no duration scale, no stagger law, no simultaneous-motion-layer cap. **Cormorant Garamond Italic is a display face** — unfenced, a cheap model will set body copy in it, and thin italic strokes on dark sapphire at 16px is a readability and contrast kill. Fence it: ≤7-word display lines, ≥32px only.

**9. "Three iteration passes" is cargo-culted theater without a rubric.**
A model can "pass" three times against nothing and change nothing. Passes must be rubric-scoped: Pass 1 = structure/story, Pass 2 = craft (spacing rhythm, contrast pairs, motion discipline), Pass 3 = device matrix + reduced-motion storyboard + gate re-validation.

**10. "A machine that gets BETTER each run" — specified as a stateless function.**
No world registry, no used-phenomena ledger, no scoring persistence, no founder-feedback ingestion. Run N+1 knows nothing about run N. That's a shuffle, not a series. The registry manifest is the difference between a collection and a slot machine. **Blocking.**

---

# (c) Implementation-fidelity attacks (spec holes that will ship as bugs)

- **No viewport-unit doctrine.** Scroll-narrative scenes built on `100vh` will jank on iOS as chrome collapses. Mandate `svh/dvh` tokens or accept the jump.
- **No DPR cap, no particle budget, no fps floor.** DPR-3 Android + volumetric clouds + nebula shader = melted phone. The brief demands "bubbly volumetric clouds" — the single most expensive real-time technique — with zero perf budget.
- **Reduced-motion is "honored," never designed.** `animation: none` on a scroll-story = no story. Spec the fallback: static storyboard, all scenes pre-revealed, crystallize swaps instantly. "Honor it" is not a design.
- **No focus-visible token; no forced-colors plan.** Glow-only focus indicators vanish in Windows High Contrast and fail non-text contrast. Real borders under every glow, gold facet focus ring as a named token.
- **The load-time safety gate (§4) covers token worlds only.** Code-built marketing worlds have no validator — just rubric-less self-QA. 44px targets, contrast, and reduced-motion need an enforcement story for code output.
- **No ≤300-line/file rule, no file-decomposition contract.** Cheap models will emit 900-line single-file worlds. Scene-per-file must be in the output contract.
- **No scroll-jacking ban.** "Cinematic reveals as you descend" begs for hijacked scroll. Mandate native scroll semantics, keyboard/PgDn/spacebar scene traversal, skip-links, landmarks.
- **No nested-interactive rule.** Cinematic whole-card-click + inner CTA = invalid nested interactives. Say it or get it.
- **No theme bootstrap.** Dark-first worlds need pre-hydration background paint or every load flashes white before the obsidian arrives. First paint IS the brand.
- **No stacking-layer contract for marketing.** The app rule ("atmosphere behind content, never under tables") isn't generalized: atmosphere < scene < content < crystal UI < top-layer focus.
- **The Seedance "slot" has no interface.** Aspect container? poster fallback? autoplay policy (muted/playsinline/IO-gated)? reduced-motion = poster? Undefined slots become dead divs that break layout when filled. And nothing on asset pipeline at all — AVIF/srcset/lazy — so cinematic worlds ship as 8MB pages.
- **Responsive: total silence.** 320→3840 unmentioned. Coarse-pointer parallax gating unmentioned. Ultrawide (2560/3840) — where cinematic sites either sing or show empty gutters — unmentioned. You're designing for the founder's monitor.
- **Credit where due:** §4+§6 genuinely nail Victory-only, styled-components-only, tokens-with-fallback, retired-palette ban, contrast/44px/RM validation for token worlds. The safety half is elite. That's what makes the taste half's thinness so glaring.

---

# (d) The ONE highest-impact change

**Add a "Crystalline Taste Bible" section to the master prompt — taste encoded as exclusion, pairing, and ratio, not as a noun list.** Three mechanisms, one section:

1. **DO/DON'T table (exclusions are the brand).** DO: one impossible phenomenon per world (light refracting through a glacier into impossible spectra; whale-song rendered as crystalline resonance). DON'T: stack phenomena in one scene. DO: rainbows as physically-correct spectral arcs per the physics spec above. DON'T: hard-edged stripe arcs. DO: gold as ≤5% filigree/numerals/hairlines. DON'T: gold gradients, gold body text. DON'T: iridescent unicorn gradients, lens flare, star-bokeh soup, glass-on-glass — "AI fantasy wallpaper" on sight.
2. **The differentiation matrix** — every world declares phenomenon × palette-ratio × motion-signature × type-mood before building; registry forbids repeats.
3. **The enchantment ratio** — realism as substrate, exactly one impossible thing as signature. Nature documentary = generic. One impossible thing = Enchanted Apex.

This converts the founder's taste from a mood board into brand law, and it's the only change that makes worlds *premium* rather than *busy* — abundance is cheap; restraint is the luxury signal the gold accent is supposed to carry.

---

# (e) What a design-savvy competitor out-builds here

1. **They ship the Crystallize as a versioned component with a spec sheet** — states, geometry, easing, reduced-motion swap — a screenshot-able, ownable UI artifact. Yours is currently a sentence. Sentences don't get recognized; components do.
2. **They encode motion as engineering** — named easings, duration scale, choreography lanes, a scene-contract JSON — while you're still writing "cinematic reveals" adjectives at a model.
3. **They design mobile-first cinematic**: a deliberate 375px storyboard, `dvh` scenes, touch choreography, coarse-pointer gating. Most "cinematic" sites are desktop demos; whoever wins the phone wins the category.
4. **They anchor each world to 2–3 concrete references** (Sugimoto seascapes, Hadid ice interiors, Planet Earth II color grades). References steer a builder model 10× harder than adjective lists — and cost you nothing but taste.
5. **They ship the series registry with conversion instrumentation** — every world names the offer it sells and its handoff point — so their drops read as a curated collection with a funnel, while yours reads as a gorgeous archipelago of dead ends.

**Tie-break:** the output-contract split (b#1) ships first — nothing else can be validated until the generator knows whether it's emitting code or data. The Taste Bible ships second, before world #1 is ever generated, because retrofitting restraint onto 10 published kitsch worlds is a rebrand, not a fix.
