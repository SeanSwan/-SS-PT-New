# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/CAMILLE-BRIEF-7-WORLD-DESIGN-BLUEPRINT-2026-07-17.md
**Seed:** (none)
**Tokens:** 2184 in / 9182 out · **Cost:** ~$0.1443 · **Wall:** 292.8s

---

# HOSTILE REVIEW — "7-World Design Blueprint" Brief

## (a) VERDICT

**SHIP-WITH-CHANGES** — top-decile brief discipline (motion tiers, Law A, anti-cheese lines, CI gates are genuinely rare), but it contradicts its own binding Palette Law twice, specifies a showpiece beat that is physically impossible on its own gated viewport, and puts the wrong world in the default slot. Do **not** let anyone build §5–6 until the amendments below land.

---

## (b) Design weaknesses, most-severe first

**1. The default world is the wrong world — a hierarchy error at the root.**
The brief states flatly that THE LOGO WORLD is "the strongest brand-anchor world," then buries it at slot #5 behind Swan Deep Field. World switchers see single-digit engagement; ~90%+ of visitors — including every first impression, every paid click, every owner-promised client demo — will only ever see the default. The default must be the brand-true atmosphere. You don't launch a rebrand where the brand only appears if the user finds a menu. This is the document's most expensive mistake.

**2. Law A + dark-first = the "seven wallpapers" trap.**
Chrome is frozen Crystalline. All 7 worlds are dark-first. Three of them (Swan Deep, Glacier, Webb/Logo-sapphire) are cold-dark-blue. With hue legally unavailable as a differentiator, worlds can only separate via **geometry, light direction, motion physics, and grade** — and the brief never names this risk. Without that explicit directive, a builder will ship palette-swapped particle fields, i.e., a template skin-picker, the exact generic feel this redesign exists to kill.

**3. The two-axis state model contradicts Palette Law A.**
`paletteTheme` (chrome) × `activeWorld` (setting) is asserted as the architecture — but Law A says chrome is *always* Crystalline on marketing. A variable that never varies is not an axis; it's a constant. Keeping it doubles the contrast/test matrix (7 × N palettes) for zero user value and invites a builder to wire a chrome themer that violates Law A. Kill the axis on marketing or scope it explicitly to the app shell.

**4. The refracting header sigil is an unwritten Law A violation.**
§5 mandates a header sigil that "refracts the active world's accent." The sigil *is* header chrome. Law A: a world accent that reaches chrome "kills Law A." The brief violates its own binding constraint in the same document that declares such designs invalid — and never carves the exception. Either reclassify the sigil as WorldLayer (miniature of the world, not chrome) or amend the law. Unresolvable ambiguity = builder improvises.

**5. The "wow" is a transition, not a moment.**
A 700ms re-grade is something a visitor *might* trigger. There is no choreographed **arrival** beat in the default world — the thing every visitor is guaranteed to see. The gold Evidence Lens is the obvious signature moment (SVG stroke-draw lock-on over real proof) and it's mentioned only as set dressing. Signature moments must fire on load, not on discovery of a settings menu.

**6. No numeric scrim floors → Glacier Cathedral fails its own gate.**
"Per-world hero-scrim grade" without minima isn't buildable-to-letter. Specify the floor: e.g., text-anchor zones ≥60% black at 0.9 opacity gradient, measured against the *brightest aurora frame*, sampled by CI. Otherwise the brightest world ships at ~3:1 and the gate fails at launch.

**7. Unscoped lavender token fails WCAG as text.**
`#4070C0` on `#0A0A0F` computes to ≈ **4.0:1** — under the mandated 4.5:1. The palette law lists it as a chrome token with no usage scope. Scope it: fills/borders/large-display only, never body text.

**8. Content vacuum = stock-photo gravity.**
The Evidence Lens circles "one real proof" — which proof? No asset inventory (testimonials, transformation imagery, swan video source, 7 grade plates) exists in this brief. A blueprint without content inventory gets built with placeholder media, and placeholder media *is* the template feel.

**9. No ultrawide containment spec.**
`clamp()` type is demanded, but nothing caps the asymmetric editorial grid at 2560/3840. Uncapped asymmetry + fluid type at 3840 = 2000px measures and a hero that reads as a banner ad. Mandate max content width (~1600px) and let atmosphere bleed, not layout.

---

## (c) Implementation-fidelity attacks

- **The wow beat is impossible as implied.** Animating `filter`/`mix-blend-mode` over `<video>` is not GPU-safe — Safari repaints the full frame per tick, and 7 "pre-composited grade" video files cannot load on 375/4G inside a 2.5s LCP budget. Mandate: **one** video, re-grade via overlay scrim crossfade (`opacity` only), explicit ban on animating `filter` on the video element, no source swaps mid-beat.
- **No world-persistence boot spec.** Returning visitors will flash Swan Deep Field, then swap — first-paint jank plus an accidental 700ms re-play of the showpiece on every page load. Require: world in cookie + inline `<head>` script setting `data-world` on `<html>` pre-paint; SSR reads the cookie.
- **Switcher a11y is under-contracted.** `menuitemradio` obliges the full menu choreography: roving tabindex, arrow/Home/End, Escape, type-ahead. `aria-live` must announce *after* the 700ms completes, `polite`. Explicitly forbid buttons/links nested inside `menuitemradio` (nested-interactive violation). Bottom sheet needs focus trap + inert background + swipe-to-dismiss with 44px grab target.
- **Preview media has no budget.** "One hero-sized lazy preview" × 7 worlds on 4G: spec AVIF ≤30KB, srcset/sizes, prefetch-on-intent (hover/focus), or the sheet itself janks.
- **styled-components is never named.** "No MUI" ≠ "styled-components only." Mandate the engine, `ThemeProvider`, and the house consumption pattern `var(--token, #fallback)` — Law A currently lists raw hexes with no fallback requirement.
- **Focus rings under-specced for worlds.** A single cyan 2px outline can fail 3:1 over Glacier's brightest ice frame. Require dual-layer focus (2px cyan + 1px dark offset ring), validated per-world at brightest frame.
- **Missing data-gating for the hero video.** No `Save-Data` / `prefers-reduced-data` / effective-connection fallback to poster-only. On a trainer's client base (older devices, gym wifi), this is not edge-case.
- **300-line cap vs. 7-world data density.** One atmosphere map file *will* blow 300 lines if dense as ordered. Mandate per-world data modules (7 files) + per-act home components now, or the cap dies in week one.
- **CI gate has no mechanism.** "Contrast ≥4.5:1 over scrim" needs the how: Playwright screenshot at brightest frame → canvas luminance sampling at text-anchor coordinates, per world. Name it or it's a wish.

**Credit where due:** 44px everywhere, reduced-motion stills per world, M0 on checkout/waiver, scrim `pointer-events:none`, Victory-only, NASM-protocol/stretching language, retired Galaxy-Swan hexes quoted only to be banned — all compliant. No false flags there.

---

## (d) The ONE highest-impact change

**Fuse the Logo World into the default.** Make Swan Deep Field *become* the crystalline mark: the Cygnus field resolves into faceted constellation geometry, the Evidence Lens *is* the sapphire badge-circle, gold sodium-amber = the lens light. Then the other six worlds are "the mark under different light" — expeditions, not skins.

This single move: (1) puts the brand-true atmosphere in front of the 90% who never switch; (2) **legalizes the refracting header sigil** — it's now a miniature of the world system, not a Law A exception; (3) gives the 700ms beat an on-brand story ("the swan's facets re-light") instead of a theme swap; (4) forces world differentiation through faceted geometry and light direction, structurally defusing the seven-wallpapers risk. One change, four attacks dead.

---

## (e) What a design-savvy competitor out-builds here

- **One world with real depth over seven with none.** They'd spend our 7-world budget on documentary-grade proof — real clients, shot for the brand, the Evidence Lens as a 20-second proof film. Trust converts a "26+ years" claim; particles don't.
- **A procedural hero that never begs 4G for mercy.** A canvas/Lottie crystalline swan under ~100KB that hits LCP every time, while our video poster prays on gym wifi.
- **Owned type.** A commissioned variable grotesk with optical sizing versus our "pairing by name-category." Type ownership is the moat no one can screenshot-clone.
- **A real 3D faceted sigil** (small three.js/canvas) with pointer parallax in the header — actual refraction behavior — versus our CSS gradient impersonation of it.
- **Luxurious M0.** We'd ship checkout/waiver as motion-dead *and* design-dead. They'd make stillness itself art-directed — typographic density, hairline craft — so the trust pages feel expensive precisely because they don't move.

Fix the default world, amend Law A for the sigil, re-spec the beat as overlay-only, add the boot script — then this is buildable.
