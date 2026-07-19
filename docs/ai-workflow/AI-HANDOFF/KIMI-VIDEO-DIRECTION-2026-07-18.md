# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-VIDEO-DIRECTION-SEED-2026-07-18.md
**Seed:** (none)
**Tokens:** 1525 in / 10281 out · **Cost:** ~$0.1588 · **Wall:** 399.5s

---

# (a) VERDICT

**SEND-BACK** — the scaffolding (freeze, flag/gate, a11y mechanics) is the most disciplined of any surface brief so far, but this document exists to decide exactly ONE thing — the signature — and it punts on the mechanism, the color story, and the loudness hierarchy. Hand this to the builder and "freedom" resolves those randomly. You'll get Dribbble glassmorphism with a cyan fringe: Galaxy by physics.

---

# (b) Design weaknesses, most severe first

**1. The signature has no committed optical mechanism — and its obvious one violates its own perf law.** The brief offers the signature as multiple choice ("a prism/dispersion hero? thumbnails behind glass-refraction? a spectral sweep?"). A creative direction with question marks isn't a direction. Worse: "glass" in a scrolling card grid means `backdrop-filter: blur()` — which is *not* transform/opacity, is the most expensive compositing feature you can put in a scroll container, and is precisely what dies on "60fps mid-Android." The brief bans the cost and demands the material. Pick one: glass is **faked** (layered gradients, 1px chrome edge, inner highlight, zero live blur outside the hero) or the perf law gets amended. As written, the builder must break one rule to honor the other.

**2. Dispersion is a Galaxy-Swan backdoor.** You banned the trio "incl. channel forms" — a lintable, syntactic ban. But chromatic dispersion *is* cyan-to-violet. A spectral sweep derived from `--lens-fx-glow-primary` will land on the retired palette without typing a single banned byte. You've defined the forbidden look precisely and the desired look not at all. Where is the positive statement of what Crystalline refraction produces? (My answer: dispersion lives in the ice-blue→white range with one restrained royal-purple terminal fringe — cool spectrum, never magenta, never equal-weight rainbow.) Without that sentence, the signature is un-reviewable.

**3. No loudness budget: "ONE signature moment" vs. "the refraction must live in the cards" is a direct contradiction.** Twelve to twenty-four refracting cards = twelve to twenty-four signatures = a slot machine. The brief never states the hierarchy: hero loud, cards whisper (fringe only on hover/focus, opacity-capped), chrome silent. This omission is exactly how you get the most generic pattern of the decade — the gradient-border glass card grid.

**4. The signature is hover-carried; your audience is touch.** "Spectral sweep on hover" → mobile pays the full cost (glass) and gets none of the payoff (motion). There is no touch-state art direction, and the reduced-motion "designed static frame" — the thing reduced-motion users, loading states, and screenshots experience as THE design — is unspecified. Frozen mid-dispersion or fully resolved? That's a taste decision this document exists to make.

**5. The gated affordance — the conversion surface sitting on the money path — has zero design direction.** Wording frozen, fine; the *look* of locked content is left to chance. It's the second most important element on the page, and the refraction language has an obvious semantic answer for it (see d). Missing it is the biggest creative failure in the doc.

**6. "Scrim behind hero text" is pre-surrender.** A gray band over your one loud moment. Design the hero so the title sits on a controlled field — dispersion concentrated away from the text column, or the charge resolving to calm beneath the title. Scrim as last resort, not as the accessibility plan. Also unspecified: duration badge over arbitrary thumbnails (needs a solid chip, not text-on-image) and focus-ring contrast against an animated spectral background.

**7. Chrome decoration is misallocated.** Asking how *pagination* gets "the premium glass/refraction treatment" is asking the builder to decorate utility. Filters and pagination should be monastic — solid `--lens-elev-1`, no glass, no fringe. Premium is the *contrast* between quiet chrome and one loud signature. Glowing pagination pills = template. And: is the control row sticky? If so, you've got blurred layers stacking over blurred cards — perf and mud.

**8. Thumbnail art direction is absent — and it determines 90% of the grid's look.** Aspect discipline, poster-frame quality, skeleton/blur-up, empty and broken-thumb states: nothing. Refraction over inconsistent thumbnails looks worse than flat cards over good ones.

**9. Responsive is a blank page.** No column math, no 320 control-row wrap behavior, no 2560/3840 answer (stretched hero band vs. composed max-width), no statement of whether the dispersion scales or crops. Freedom on layout mechanics is fine; zero responsive intent for the signature is not.

---

# (c) Implementation-fidelity attacks

- **House-rule violation: "prefer ZERO hex."** The binding form is `var(--token, #CrystallineFallback)`. Bare `var(--video-accent)` fails closed to `initial`/transparent when the world-contract probe or token load fails — silent contrast catastrophe. Mandate the fallback form verbatim.
- **Dual-Button Glow is never mentioned.** The gated affordance is a CTA. Bind it now — blue bg→purple glow, purple bg→cyan glow — or "freedom" invents a third button style and the house system fractures on surface #6.
- **≤300 lines/file never mentioned.** Hero canvas + overlay + card treatment + controls + grid is a God-file in waiting. Mandate the decomposition: tokens file, `VideoRefractionHero`, `VideoGlassCard`, dispersion/reduced-frame hook, gate/flag files.
- **Two canvases, no numbers.** "One shared canvas at most" + the shipped CrystallizeOverlay canvas = two, and "60fps mid-Android" is an incantation, not a budget. Provide one: backing-store cap, canvas DPR cap, IO pause offscreen, canvas killed entirely under reduced-motion.
- **Nested interactives / invalid DOM:** card → watch link, collection link, gated CTA. The classic card-grid violation, unaddressed. Mandate the pattern: single stretched-link on title/thumbnail; on locked cards the CTA *replaces* the link — never a button inside an anchor.
- **Focus:** "no naked outline:none" ✓, but no focus token and no 3:1-against-adjacent requirement over an animated spectral background. Rings on dispersion need a specified, possibly dual-tone treatment.
- **Reduced motion:** entrance handling is correct ✓, but does it also kill the sweep, charge replays, the canvas loop? And what *is* the static frame? Unspecified.
- **SVG defs:** `useId()` ✓ — but per-card gradient defs = N duplicates. Mandate one shared `<defs>` block.
- **Charge replay undefined:** Crystallize on every mount? Every pagination change? A signature that fires on page 4 of pagination is a tax, not a moment. Once per session, or on filter-change only.
- **New copy is ungoverned.** The freeze covers existing labels; the builder still writes empty states, skeletons, aria-labels. House wording rules apply there — "stretching/flexibility" only, "26+ years / NASM-protocol" if credentials appear. Say so, or the freeze gets cited as permission.

---

# (d) THE ONE highest-impact change

**Make the material semantic: refraction = access.** Locked content renders as *diffuse* glass — scattered light, desaturated thumbnail under a milk-glass gradient layer, zero dispersion. Unlocked content is *clear* glass, and the spectral fringe appears only as the hover/focus charge — and on touch, as the pressed state.

One decision, five payoffs: (1) the frozen-wording gated affordance gets a premium look with zero copy change; (2) the system becomes brand-specific instead of decorative — the Crystalline thesis becomes "clarity is earned," expressed *in the material itself*; (3) the loudness budget solves itself — fringe is a reward, not wallpaper; (4) touch and reduced-motion users get the full signature, because frosted-vs-clear is a *state*, not a motion — and it IS your static frame; (5) it's transform/opacity-legal: two pre-rendered gradient layers toggled by opacity, one shared SVG defs, no per-card canvas, no live blur. The cards carry the refraction cheaply, exactly as the brief demands — it just never occurred to the brief to make the cards' refraction *mean something*.

---

# (e) What a design-savvy competitor out-builds here

- **They commit to a mechanism.** RGB channel-split chromatic aberration on the hero title — three layered copies, channels offset 1–2px, pure transform, genuinely optical. Real dispersion reads as optics; gradient borders read as a UI kit.
- **They art-direct thumbnails** — enforced 16:9, a consistent crystalline grade, curated poster frames — and ship skeletons that resolve *diffuse→clear* on load, making the loading state an echo of the signature.
- **They make the grid breathe without one per-card canvas:** IO-driven focus pull — the centered card rests with its fringe visible, off-center cards sit diffuse. Scroll itself becomes the optics.
- **They keep chrome monastic** — quiet solid controls, near-invisible pagination — because the contrast between silent utility and one loud optical moment is what reads as expensive.
- **They design the 3840 frame** as a composed cinematic layout instead of a stretched band, and ship the reduced-motion static frame as a poster worth screenshotting.

**Bottom line:** the brief's skeleton is ship-shape; its soul is undecided. Commit the mechanism (channel-split, transform-only), define the Crystalline spectrum positively, make refraction semantic (d), demote all chrome to silence, bind Dual-Button Glow + `var(--token,#fallback)` + 300-line decomposition — then send it to the builder.
