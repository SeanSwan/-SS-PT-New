# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-world-generator-authoring.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-WORLD-GENERATOR-PROMPT-2026-07-17.md
**Tokens:** 4826 in / 9213 out · **Cost:** ~$0.1527 · **Wall:** 302.5s

---

# Kimi K3 — Hostile Design / Front-End Review

**Document:** "Living World Site Generator" master-prompt authoring brief (round 2)
**Seed:** my own round-1 review — treated as the compliance baseline

---

## (a) VERDICT

**SHIP-WITH-CHANGES** — it absorbed ~90% of the seed and the taste doctrine is now real law, but it locks in three *self-contradicting* requirements (a locked contradiction is worse than a gap — the author is forced to violate something silently), leaves the mode router and the token allowlist un-specced, and its own example menu breaks its own enchantment rule. Five patches before authoring; all fixable in one editing pass.

Credit where due, once: modes split, gold ≤5%, kill-list, rainbow physics, crystallize state machine, Dual-Button Glow, Cormorant fence, rubric-scoped passes, svh/dvh, DPR/particle budgets, Seedance slot, references, scene-per-file, ≤300 lines — all carried. The doc is house-rule clean. What follows is what it *missed*.

---

## (b) Design/front-end weaknesses, most severe first

**1. "Persists across runs" + "self-contained, builder needs no other doc" + "spawn parallel worlds" — three locked requirements that cannot all be true.**
A persistent world registry is *external state*. Self-containment forbids external dependencies. And parallel world-spawning against a no-repeats registry is a race condition: four parallel builders each declare phenomena against a registry none of the others can see, and you get three nebula worlds. This is the same *class* of architectural contradiction I flagged in round 1 (DATA-vs-CODE) — the doc fixed the taste half and re-introduced the state half. Fix is one mechanism: a concrete `world-registry` artifact (schema below in d), a **declare-first phase** (all worlds in a batch declare {phenomenon · palette-ratio · motion-signature · type-mood} and lock the registry *before* any building starts), and a registry read/write step bookending every run. **Blocking.**

**2. Mode routing is asserted, never specified.**
"The prompt tells the builder which mode it's producing" — *how?* Invocation parameter? Front-matter? Two separate prompts? If both schemas live inline in one megaprompt, a cheap model will blend them — the exact failure requirement #1 bans in its last sentence. The brief never says the master prompt needs an explicit mode gate: mode declared as the first input line, and an output guard ("emit ONLY the declared mode's schema; the other schema must not appear in output"). Unspecified routing = blended output on run one. **Blocking.**

**3. "≈14 vars" and "the existing SurfaceLensGate" are hedge-words inside a fail-closed contract.**
Fail-closed means *exact*. Enumerate the allowlist — all 14, by name — or the token mode cannot be validated by anyone, including the builder's own Pass 3. Worse, there's no **scoping/attachment rule**: do `--world-*` vars attach to a lens root or `:root`? Unscoped, a token world can repaint app chrome — a direct violation of the two-speed law the doc itself carries. The gate is invoked by name with zero inline contract in a document that demands self-containment. **Blocking for token mode.**

**4. No attention architecture for the artifact it commissions.**
Requirement #12 says "written so a dumber model still succeeds" — and provides no mechanism. Twelve dense requirements + invariants + menu = a 4,000–8,000-word master prompt, and cheap models degrade in the *middle* of long prompts. The brief never budgets prompt length, never priority-tiers the requirements, never demands a **closing KILL-CHECK** (the retired-palette ban, one-phenomenon rule, gold cap, and contrast gate restated as the *last* thing before generation, because recency is where weak models obey). This doc hostile-reviewed noun-soup last round; it's commissioning prompt-soup this round. **Blocking for the cheap-model claim.**

**5. The reactivity model is mouse-only. The "living" claim dies on the phone.**
§6 defines scroll progress + *pointer proximity* as the reactive channel. Touch devices have no proximity. On a 375px screen — the device that decides whether "cinematic" is a category win or a desktop demo — the world has zero reactivity spec: no scroll-velocity response, no tap-ripple, no orientation-gated parallax. Round 1 I said ambient loops without reactivity = screensaver. On mobile, this brief *specifies the screensaver*. **Blocking for mobile premium.**

**6. The example menu violates the brief's own enchantment doctrine.**
"Rainforest-dawn with real hummingbirds + a physically-correct rainbow" — real hummingbirds are realism. A physically-correct rainbow is *realism*. That's **zero impossible phenomena** = the BBC-nature-documentary failure I named in round 1, baked into the doc's own flagship example. And "deep-ocean whale-song vault" sits *on* the brand substrate (deep-ocean-luxury-vault IS the baseline) — the differentiation matrix should reject it as insufficiently differentiated from default. The menu must demonstrate the doctrine, not smuggle in its violation.

**7. Taste law without units.**
Gold "≤5%" — 5% of *what*? Painted pixels per viewport? Per scene? A builder cannot self-check an unmeasurable law, and the rubric can't enforce it. Same class of problem: the Dual-Button Glow doctrine is specced as *fixed* tokens (blue→purple glow, purple→cyan glow) against *variable* per-world palettes. A cyan-dominant glacier world behind a blue primary button is a guaranteed contrast failure at the exact moment of conversion. The brief needs a per-world clause: CTA tokens re-validated at 4.5:1 against the *actual* handoff-act scene background, with glow intensity as the adjustable variable.

**8. No copy/content model — premium is 50% words.**
Every requirement is visual/systemic. Nothing says who writes headlines, what the offer grammar sounds like, what the placeholder policy is. A crystalline glacier cathedral with "Unleash Your Potential" in the hero is a *template*, full stop. The banned-lexicon rules (stretching/flexibility, NASM-protocol, 26+ years) live in invariants but aren't wired into the three passes as a lint step. And the privacy header (zero PII) sits in unresolved tension with a personal-training brand whose entire premium signal is *the human* — gorgeous-but-anonymous is the default failure.

---

## (c) Implementation-fidelity attacks

- **Pre-hydration obsidian paint vs styled-components-only is unreconciled.** styled-components injects at runtime — after first paint. The bootstrap *must* be a tiny static inline `<style>` token block in `<head>`, explicitly carved out as the one allowed exception, or every world white-flashes and "first paint is the brand" is dead on arrival.
- **No token namespace for WORLD-AS-SITE.** Tokens get `--world-*`. Sites get… nothing named. Without a `--site-*` contract, 25 worlds invent 25 bespoke variable dialects = unmaintainable sprawl across the series.
- **Invalid DOM is not named.** "No nested interactives" made it in; "no `<button>` inside `<a>`, no block-in-`<p>`" didn't. Cheap models emit invalid DOM constantly. One line fixes it.
- **Deep-link contract named, never schemed.** Deep links *to what* — booking with trainer preselected? Store SKU? UTM grammar? "No gorgeous dead ends" needs a URL contract, not a slogan.
- **No deployment topology.** Subdomain? Route? The handoff grammar depends on where worlds live. Unstated.
- **No version field on the master prompt itself.** If run N+1 improves on run N, the registry must record *which prompt version* built each world, or founder feedback can't be correlated.
- **Adopted and verified present (no attack):** svh/dvh, DPR cap, particle budget, fps floor, volumetric-cloud tiering, AVIF/srcset/lazy, stacking contract, keyboard/PgDn/spacebar traversal, skip-links, landmarks, focus-visible real border + gold facet ring, forced-colors, 44px, 4.5:1, reduced-motion *storyboard* (designed, not just "honored" — this was the right fix), scene-per-file, ≤300 lines.

---

## (d) The ONE highest-impact change

**Specify the Series Ledger as a concrete, inline artifact — and make every run begin by reading it and end by writing it.** This single change resolves contradiction #1, enables the parallel batch in #5, and converts "a machine that gets better each run" from fiat into mechanism. Concretely, the master prompt must contain a copy-pasteable registry block:

```
WORLD REGISTRY (persist across runs — paste back in each invocation)
| world-id | phenomenon (ONE) | palette ratio | motion signature | type mood | references | offer → handoff | prompt-v | founder verdict |
```

Rules: (1) batch runs execute a **declare-first phase** — all worlds lock their matrix rows before any building starts, killing the parallel race; (2) any row duplicating an existing phenomenon or motion signature is rejected and re-declared; (3) founder feedback ingests as one-line verdicts (`KEEP: facet timing · KILL: bokeh density`) appended to the row, so taste compounds. The Taste Bible restrains a single world; the Ledger is what makes 25 worlds a *curated series with memory* instead of a slot machine. That is the premium, brand-specific claim — and right now it's the only one with no mechanism behind it.

---

## (e) What a design-savvy competitor out-builds here

1. **They spec the touch channel.** Scroll-velocity-reactive atmospheres, tap-ripples, orientation-gated parallax with a coarse-pointer tier table. Their worlds are alive on the phone; yours are alive within 40px of a mouse cursor.
2. **They ship the share-card system.** A per-world OG image generated from the crystallize still, plus title/description meta. The first impression of every world is the link unfurl — this brief never mentions it, so their brand travels and yours doesn't.
3. **They encode taste with units.** Mechanical self-checks a cheap model can't talk its way past: gold painted-pixel %, simultaneous glow-layer cap, CTA contrast captured against the actual handoff scene. Their rubric is a gate; yours is an intention.
4. **They write the copy voice sheet.** Headline patterns, offer grammar, a banned-phrase lint wired into Pass 2. Their worlds *sound* like the founder; yours will sound like every AI fitness template with better shaders.
5. **They ship two lean single-mode prompts** behind a one-line router instead of one megaprompt carrying both schemas — half the length, double the cheap-model compliance, and structurally incapable of blending modes.

**Patch order before authoring:** (1) Series Ledger + declare-first protocol + self-containment reconciliation; (2) mode router with output guard — ideally two prompts; (3) enumerate the 14 `--world-*` vars + scoping rule; (4) prompt attention architecture (length budget, priority tiers, closing KILL-CHECK); (5) touch reactivity channel + fix the rainforest menu item to name its one impossible phenomenon. Then write the prompt — the bones, this time, are worth writing on.
