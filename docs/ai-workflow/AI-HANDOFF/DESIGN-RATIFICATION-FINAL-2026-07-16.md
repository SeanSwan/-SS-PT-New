# DESIGN RATIFICATION — FINAL VERDICT (Village → Gemini → Decider chain closed)

- **Date:** 2026-07-16 · **Decider:** Opus 4.8 as **fallback Final Decider** (Fable 5 session limit reached; Fable re-ratifies at the next boundary when available — this record is written to be overturnable by Fable, not to preempt it) · **Human owner:** Sean (above all models)
- **Chain executed:** paid AI Village (19 brains, 3 consensus debates, $0.7405, Sean-approved spend) → ratification pass (triangle transport FAILED — all three agents timed out; salvaged per precedent with **Gemini 3.1 Pro as Lead Design Authority** + Opus hostile review) → this verdict.
- **Inputs:** `AI-Village-Documentation/validation-prompts/latest/synthesis.md` · `AI-Village-Documentation/gemini-consults/latest.md` · packet: `VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md`

## 1. THE VERDICT — one language, two intensities (not two languages)

**Ratified: the split is real but it is NOT a split.** Village and Gemini both landed on "Swan Deep Field for marketing, Faceted Sigil for dashboards" and both framed it as two languages. **That framing is wrong and I am overruling it as the Decider, while keeping the assignment.**

The correct framing — and the reason this survives the "one place, different rooms" test that justified the entire program:

> **SwanStudios adopts ONE design language: Crystalline Swan chrome + crystalline-swan-logo facet geometry — with a world layer on a dimmer switch.**
> - **Marketing (home/about/contact):** world layer at FULL — deep-space field, Cygnus the Swan resting in frame, gold Evidence Lens on the one real proof, sodium-amber warmth. (= "Swan Deep Field")
> - **Dashboards (user/client/trainer/admin):** world layer at WHISPER — facet planes and sapphire grounds only; the same chrome, the same geometry, the same gradient law, no atmosphere over data. (= "Faceted Sigil")
> - **Store / photography / video:** world layer at LOW; **waiver + checkout:** world layer OFF (M0).

This is defensible because **Swan Deep Field already contains Faceted Sigil** — the hybrid was built from Webb's world + the logo's facet chrome. They share DNA by construction. The dimmer-switch framing makes the Evidence Lens, the facet planes, and the Crystalline chrome travel across every surface, which a two-language framing would have blocked. **Chrome Sovereign loses** (its luxury pull is preserved via the steal-list, below).

Sean's taste signal is honored: he gets the space theme where prospects meet the brand, and the Evidence Lens everywhere.

## 2. ACCEPTED from the Village (binding prerequisites — no Track code before these land)

1. **Canonical `tokens.ts`/`tokens.css`** mapping every hex to a named custom property + **Stylelint rule banning the retired Galaxy-Swan hexes** (`#00FFFF`, `#7851A9`, `#0a0a1a`). *"A ban without enforcement is just a comment"* — correct, and this repo's history proves it.
2. **`<WorldLayer>` / `<ChromeLayer>` boundary**, snapshot-tested: ChromeLayer contains zero raw-hex backgrounds. This is what makes Palette Law A mechanical instead of aspirational, and it IS the dimmer switch's implementation.
3. **`MotionTier` context + `SURFACE_MOTION_TIERS` map** so waiver/checkout/admin-finance are guaranteed M0 at runtime, not by convention.
4. **Evidence Lens data contract resolved BEFORE it ships:** API source, loading skeleton, honest zero-state (fall back to a labeled platform aggregate — never "0 workouts" on a marketing page), defined scope, and **never optimistic** (wait for server confirmation — the data-truth promise is the brand).
5. **Narrow the "no backend changes" claim to "no IA/interaction-contract changes"** + a surface-by-surface audit tracing every displayed value to a real column + a Sequelize-vs-DB schema-drift CI test. (Analyst 8 beat Analyst 9 here: "endpoints already exist" was asserted, not verified — and schema drift is this repo's most recurring bug class per rule 58.)
6. **320px Trainer/Admin = the single HIGH-risk QA target.** Atmosphere replaced with solid `#0A0A0F` at ≤375px.
7. **Decompose every dashboard artifact** — no file over 300 lines; DashboardPage = composition only.
8. **Lazy-load** Charts (Victory) and Atmosphere bundles; poster-first solid ground before atmosphere paints (LCP protection).
9. **Two CRITICAL legal items elevated out of the design frame** (these are the highest-value things the Village surfaced): (a) **Swan Coach data retention / DPA / GDPR-cascade** must be settled before Coach or Lens ship — health-adjacent data to a third-party LLM without a DPA is real exposure; (b) **FDA/MHMDA wellness disclaimer + biometric opt-in consent** if the Evidence Lens ever implies predictive health claims (the WHOOP warning letter is the precedent). Both go to Sean as separate slices — they are not aesthetics and must not ride in a design PR.
10. **Pre-commit success metrics** before launch: marketing conversion lift, trainer task-completion time, mobile bounce. A design bet this size without metrics is a vibe.

## 3. ACCEPTED from Gemini (design authority)

- **The Shared-DNA law:** the `ChromeLayer` is **byte-identical** across marketing and dashboards — buttons, forms, focus rings, modals, floor-rail nav, type hierarchy (Plus Jakarta / Sora / Fira Code data / Cormorant italic marketing-only), Arctic Cyan reserved for charts and never on marketing. This is exactly right and is the mechanism behind §1's dimmer switch.
- **The assignment is the right way round** — flipping it (facets on marketing, space on dashboards) would be a UX failure. Confirmed.
- **The Experiential Seam is the biggest missed design risk** — the login/signup threshold from marketing world → app world. Gemini is RIGHT that the seam exists and that a jarring cut shatters the premium illusion. **This is the single most valuable thing the ratification pass produced.**

## 4. REJECTED (Decider overrides — with reasons)

1. **REJECT Gemini's `transition: all 250ms`.** It violates the trainer-dashboard responsive contract test, which explicitly forbids `transition: all` (and raw `rgba()` and `clamp()`) in the core style files. Use explicit properties: `transition: transform 250ms var(--ease), opacity 250ms var(--ease)`. Gemini did not know about the contract test; the test wins.
2. **REJECT "Crimson Frost `#C92A54`".** Not a Crystalline Swan token — Gemini invented it. Error states use the existing token (`--danger`/`--error`). This is exactly the "Gemini sometimes cites non-canonical tokens" failure mode; caught.
3. **REJECT the "Crystalline Refraction" 1200ms login transition as specified.** The *risk* is real; the *prescription* is over-engineered and violates three standing laws: (a) `filter: blur(8px)` + `scale` + `rotateY` on a full-screen surface is precisely the large-surface filter work motion doctrine bans; (b) 1200ms of theater on the auth path is a beauty tax on the coaching loop — a trainer opening the app between clients pays it every time; (c) it adds a shader-adjacent dependency to the most reliability-critical flow in the product.
   **Decider's substitute — the seam is closed by CHROME CONTINUITY, not by a set piece:** because the ChromeLayer is byte-identical across the boundary (§3), the user's *hands* never notice the crossing — the buttons, rails, and type are literally the same components. The world layer then dims with a **≤300ms opacity-only crossfade** (transform/opacity only, fully skipped under `prefers-reduced-motion`, zero blur, zero layout work). One tasteful beat, no tax. If Sean later wants the full refraction as a signature moment, it ships as an opt-in M4 experiment on the marketing side of the boundary only — never on the auth path.

## 5. ROLLOUT ORDER — Decider ruling (Village said A→C→B; Gemini said A→B→C)

**RULING: A → B → C**, with the Village's sandbox insight preserved *inside* Track A.

- **Gemini wins the argument.** A prospect who converts on a stunning new marketing page and lands in the old dashboard experiences a broken promise at the exact moment of conversion — the most expensive possible seam. Track C's store/photography/video/waiver are secondary journeys; they can wait.
- **The Village's "low-risk token sandbox" insight is still correct and is kept** — but taken *within* Track A: build **Contact first** (smallest, simplest, already has a real working backend pipeline), prove `tokens.ts` + WorldLayer/ChromeLayer + MotionTier + the ≤300ms dimmer there, then Home and About. Sandbox benefit, zero delay to the conversion journey.
- **Inside Track C the existing order holds:** store → photography → video library → waiver (revenue first; checkout and waiver flows behavior-frozen).

## 6. What the whole panel missed (Decider's own finding)

**Nobody in the chain saw the pixels.** Nineteen Village brains and Gemini all reasoned from *descriptions* — they ratified a strategy, not a design. Their verdict is strong precisely where it's strategic (data contracts, legal exposure, token enforcement, rollout economics) and untested where it's aesthetic. Therefore:

> **The aesthetic ratification is not closed by this record.** Sean walks the gallery — the 10 Wave-1 home pages and the 12 Wave-2 dashboard mocks — and his eye is the final aesthetic authority. This record ratifies the *system*: which language, what shared DNA, what must exist before code, what order. If Sean's eye disagrees with the assignment when he sees Faceted Sigil vs. Swan Deep Field on a real trainer dashboard, **his eye wins and this record gets amended.**

Second missed item: **nobody costed the 18-theme × surface × breakpoint visual-regression matrix.** The Lens OS already carries 25+ styles and the 10-style blueprint would add more; every new world-layer intensity multiplies that grid. Before Track B, decide what visual-regression coverage is real vs. aspirational.

## 7. Next actions (in order)

1. **Sean:** walk the gallery (10 home pages + 12 dashboard mocks) → confirm or overrule §1's assignment with his eye.
2. **Fable (when limit resets):** re-ratify this record at the boundary; overturn freely — it was written by the fallback decider.
3. **Prerequisite slice (before ANY Track code):** `tokens.ts` + Stylelint ban + WorldLayer/ChromeLayer boundary + MotionTier map + Evidence Lens data contract. This is now the true next build slice.
4. **Track A:** Contact (sandbox) → Home → About, per the marketing-trinity handoff (copy rewrite + claims-vs-reality audit still binding).
5. **Separate, non-design slices to Sean:** Swan Coach DPA/retention; FDA/MHMDA disclaimer + biometric consent.

---

*Chain integrity note: the triangle transport failed (claude/gemini/codex all timed out on the polling board — a known recurring failure of that tooling). The ratification was salvaged with Gemini as design authority plus this hostile Opus pass, and the salvage is disclosed rather than papered over. Codex has NOT reviewed this verdict; its hostile pass remains available and is recommended before the prerequisite slice ships.*
