# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/ec5425f3-fdf8-48f0-b85f-c8569414e558/scratchpad/kimi-cinematic-doctrine-review-packet.md
**Seed:** (none)
**Tokens:** 3982 in / 4577 out · **Cost:** ~$0.0806 · **Wall:** 140.7s

---

# K3 HOSTILE REVIEW — Cinematic Scroll-Journey Doctrine Upgrade

**1. VERDICT: SHIP-WITH-CHANGES.** The concept layer (B2.4 grammar, §18 breadth discipline) is genuinely good and non-generic; but C13 as written will ship a broken-feeling page, because it specifies the *asset pipeline* and the *gates* while omitting the one thing that determines whether scroll-scrub feels magical or like a damaged video: the **input-mapping / scrub-physics layer**. That's a blocker, not a nit.

---

## 2. BLOCKERS (must-fix)

### B1 — The scrub-feel spec is absent. This is the entire ballgame.
C13 says "map frame index to scroll progress, draw only on frame-index change." A builder obeying that literally produces raw 1:1 mapping: frame index = f(scrollY). Result: jagged frame-stepping, momentum-scroll overshoot blowing through 20 frames, reverse-scroll stutter — the "broken video" feel. The doctrine gates *frame smoothness* (60fps) but not *mapping smoothness*, which matters more.

**Paste-in fix (new C13 subsection "Scroll physics — the feel layer"):**
> Never bind frame index directly to scrollY. Bind it to a **damped target**: each rAF tick, `current += (target - current) * 0.085` (lerp 0.07–0.12; lower = more cinematic lag, higher = more responsive). Clamp per-tick frame delta to ≤3 frames so momentum flings read as fast-forward, not teleport. Native scroll only — **never hijack wheel/touch events**; smoothing lives in the mapping, not the input. Reverse travel must be as smooth as forward (pre-buffer frames in both directions). If you can't describe your damping constant, you haven't built C13.

### B2 — Touch/mobile behavior is unspecified, and it's not the same product.
iOS Safari: momentum scroll + collapsing chrome shifts `vh` mid-scene, and touch-scrub without damping is unusable. Doctrine is silent on whether mobile even gets T1.

**Paste-in fix:**
> Mobile default is **T2 autoplay loop**, not scrub. Promote to scrub only if: no `saveData`, `hardwareConcurrency ≥ 6`, and DPR-adjusted frame payload stays ≤2MB. All pinned/pinned-equivalent scenes use `100dvh` (never `vh`) with `invalidateOnRefresh` on viewport-height change, or the address-bar collapse will visibly re-layout the scene. State the tier decision in the scene ledger.

### B3 — Reduced-motion and WCAG on the canvas are hand-waved.
"Tour mode mandatory" helps, but: (a) an autoplaying T2 loop violates WCAG 2.2.2 without a pause control; (b) `prefers-reduced-motion` users must get T3 static, not a slower autoplay; (c) a canvas painting frames is an accessibility void.

**Paste-in gates (add to C13 gates list):**
> - `prefers-reduced-motion` → T3 static composed frame, no exceptions; tour mode available but strictly user-initiated.
> - Canvas carries `role="img"` + an `aria-label` narrating the journey ("Camera travels through a crystalline geode, arriving at the SwanStudios wordmark"). Typographic beats are real DOM text, never baked into video.
> - Tour mode and any autoplay loop ship with a visible pause control, ≥44px target, keyboard-focusable with a visible focus ring in `var(--wing-purple, #8B5CF6)`.
> - Keyboard: with the scene region focused, ArrowDown/ArrowUp step the playhead between beats (this is why beats are DOM, not pixels).

### B4 — The contrast gate is gameable.
"4.5:1 at brightest frame" invites a builder to test one frame and ship text that drowns at frames 40–70. Video moves; luminance moves with it.

**Fix — replace with:**
> Text beats sit on a persistent scrim: `linear-gradient(180deg, transparent, var(--obsidian, #0A0A0F) 78%)` (or a radial behind the CTA cluster), so contrast holds at *every* frame, not the brightest one. Sample-check luminance at the three brightest beats, not one.

### B5 — Byte budget vs. frame count vs. 4K is internally contradictory.
60–120 frames ≤ 4–6MB = ~40–50KB/frame. Achievable at 1440w WebP/AVIF; **not** sharp at 2560w/3840w. On a 4K display the flagship pattern will upscale soft — the opposite of premium. Doctrine must resolve this, not leave it to the builder.

**Fix:**
> Ship a resolution ladder (1280w / 1920w / 2560w frame sets, AVIF-then-WebP). Above 2560w viewport, serve the T2 video (hardware-decoded, scales cleaner) instead of frames. Budget applies per served set, and the ledger records which set each breakpoint gets.

### B6 — §B2.4 and C13 contradict each other on scope.
B2.4 says the grammar is "for Act 1 (the hook) specifically, rest of B2 arc still applies." C13's anti-pattern says anything stacked below the journey is "C1 in a costume." So is the macro-journey an Act-1 device inside a 4-act page, or a whole-page pattern? A builder can't obey both.

**Fix — append to B2.4 Rules:**
> Scope: the four beats power the Act-1 hook of any page tier (rendered via C1/C3 within a full 4-act page). C13 is the rare whole-page deployment where the journey *is* all four acts and the arrival carries the only CTA. If your sitemap below the fold has >0 sections, you are in C1/C3 territory, not C13.

### B7 — Scroll runway length is undefined.
§5 caps flowing scenes at 8–14vh, which obviously doesn't govern a whole-page scrub. Nothing says how long the C13 runway is — and runway length *is* the pacing.

**Fix:**
> C13 runway: 400–800vh of scroll travel (4–8 viewport heights), distributed across the four beats roughly 20/25/35/20, with the CTA arriving *exactly* at the final frame — not 90%, not 110%. Include a hairline progress indicator (1–2px, `var(--ice-wing, #60C0F0)`) so users can feel the journey's length.

---

## 3. ENHANCEMENTS

**(a) The $2-and-magical vs. broken-video difference, named:** Beyond B1's damping: (1) preload + `createImageBitmap` decode the next ±10 frames so `drawImage` never waits on decode; (2) text beats get 1–2% counter-parallax drift so the DOM doesn't feel dead-glued over a moving world; (3) grain overlay on the canvas hides AI-interpolation shimmer; (4) beat thresholds are placed at *narrative* moments (membrane break = beat 2 text), not even 25% splits — even splits are the generic smell. Write those four into C13 "How to build."

**(b) The formula:** `inside → through → across → out` is right but incomplete in one specific way — it only covers *ingress*. Add two sanctioned variants or the grammar becomes a monoculture:
> Variants: **Reverse journey** (`out → across → through → in` — open on the athlete/landscape, push *into* the body/crystal/product; use when the brand moment is intimacy, not arrival). **Orbit** (`around → tightening spiral → in` — for product-as-monument). Non-macro awe (time-lapse metamorphosis, human-scale transformation) remains legal via §18 — macro is the default awe grammar, not the only one.

**(c) One C13 per site:** Correct, keep it, and harden it — the risk isn't over-use, it's *premature* use. Add: "Default answer is no. C13 requires a completed §18 breadth pass and Seedance budget sign-off; absent either, the answer is C1." Scarcity is what keeps it premium.

**(d) Sound:** The transcript sites are silent and Swan should default silent too — autoplay policies and taste both demand it. But doctrine should claim the option:
> Sound is an optional, user-initiated layer: mute-first, off by default, toggle ≥44px, choice persisted. If scored, score to the beats (membrane break = sub-bass thump; arrival = resolve). Silence is never a defect; bad autoplay audio is.

**(e) Mobile:** Covered in B2 — the doctrine should say out loud what everyone suspects: **touch scrub is the exception, autoplay is the rule.** Saying it prevents ten bad builds.

---

## 4. GENERIC-KILLER CHECK

| Piece | Moves needle? | Lazy-compliance failure mode | Closing sentence (paste in) |
|---|---|---|---|
| **B2.4** | Yes — real grammar, real beats | Every Swan surface opens "inside a bubble/crystal." Macro-journey becomes the *new* template — generic at the portfolio level | "If two consecutive Swan surfaces open at the same scale with the same beat structure, the second is generic regardless of subject. Vary the awe grammar, not just the object." |
| **C13** | Yes — but highest-risk | A scrubbed Seedance abstract-particle field = a lava lamp with a CTA. Technically compliant, spiritually Bootstrap | "The creative must contain a brand-ownable object that could not appear in any other brand's film — swan anatomy, wing geometry, Crystalline refraction. Abstract particles alone = rejected at review." |
| **§18** | Yes — the strongest piece | 8–12 concepts that are all macro-journeys = breadth theater | "At least 3 of the 8–12 concepts must be non-macro awe hooks; a field of one shape is one concept." |
| **#2b** | Neutral — it's an index entry | Builders pick it because it's the "maximalist" shiny tier | See 3(c): "Default answer is no…" |

---

## 5. THE SINGLE BIGGEST MISSING THING

**The scroll-physics / input-mapping spec** (B1 + B7 merged). Everything else in this doctrine — grammar, pipeline, budgets, gates — is about *what the film is* and *how it's made*. Nothing anywhere defines *how scroll becomes time*: the damping curve, the frame-delta clamp, the runway length, the beat-threshold placement, the direction-of-travel handling. That mapping is the entire perceptual difference between "I am flying through a crystal" and "this video is glitching as I scroll." Write it once, as a named subsection with constants, and every future C13/C1/C3 build inherits the feel for free.

**Also flag for the house-rule audit (clean, but noting):** new material introduces no hardcoded hexes, no retired Galaxy-Swan values, no MUI/Tailwind/Recharts, no banned vocabulary — good. But add to C13 gates what the house rules already demand elsewhere, so C13 doesn't quietly exempt itself: Dual-Button Glow on the single CTA, 44px minimum on every overlay control, and all beat/scrim colors via `var(--token, #fallback)` with Crystalline fallbacks.

Ship it after B1–B7 land. The bones are genuinely above Mobbin-tier — right now the nervous system is missing.
