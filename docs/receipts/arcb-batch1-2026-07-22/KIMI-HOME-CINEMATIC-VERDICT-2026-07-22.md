# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\5ee4c5b4-4b1c-41c6-ad8f-580ad41df9e6\scratchpad\kimi-home-cinematic-consult.md
**Seed:** (none)
**Tokens:** 1370 in / 2727 out · **Cost:** ~$0.0450 · **Wall:** 127.5s

---

# KIMI K3 REVIEW — HomePage.V4 Cinematic Enhancement Consult

## (a) VERDICT: **AGREE-WITH-CHANGES** — direction is right, the harvest discipline is right, but there are four implementation traps that will turn "cinematic" into "janky + washed-out" if shipped as drafted.

Sean is correct, by the way. The canonical page currently reads like a competent template with good sections and no *soul between the sections*. This consult targets the right wound. Now the hostile part.

---

## Q1 — Parallax atmosphere

**B wins, with A as the page-wide carrier. C dies on sight** — `background-attachment: fixed` on iOS Safari doesn't just "break," it silently re-renders the layer at viewport scale and crops it into mush. Good instinct to pre-attack it.

But the consult under-prices the hero stack. Read what's being proposed at the hero: caustic WebGL/canvas field + aurora gradient layers + particle veil + R2 MP4 with a known poster gap + letter-stagger heading. That is **four motion systems in one viewport**. Deltas:

1. **DPR cap is missing and it's the single biggest perf landmine.** OpticsCanvas on a 3x phone (414px wide) without `Math.min(devicePixelRatio, 2)` — honestly 1.5 for a full-viewport caustic sim — will cook fill rate and thermally throttle inside 30 seconds, taking the letter-stagger down with it. Mandate a DPR cap in the acceptance criteria, not as a nice-to-have.
2. **The canvas loop must be gated by visibility, not just tier.** `useAnimationTier` answers "can this device afford it." Nothing in the plan answers "is the hero even on screen" or "is the tab visible." IntersectionObserver + `document.visibilitychange` to pause the rAF loop. A caustic field burning GPU while the user is at Testimonials is pure waste.
3. **MP4 poster gap + caustic layer = double LCP exposure.** The canvas must mount *after* first paint (defer one frame + `requestIdleCallback` fallback) AND the poster gap must be closed — a blank rect behind a caustic field reads as a bug, not a vibe. If the poster isn't ready, the caustic field itself becomes the hero visual and the video lazy-promotes in. Decide this now, not in QA.
4. **Glow banding on 4K is a real attack and the proposed fix (cap spread) is wrong.** Low-alpha large-radius radial gradients band because of 8-bit interpolation across huge distances, not because of spread. The fix is a tiny procedural noise/dither overlay (SVG `feTurbulence` at ~0.6 opacity-of-noise, GPU-cheap) or slightly *more* alpha over *smaller* radii. Cap the spread and you'll get a visible "glow donut" edge instead — worse.
5. **Fixed layers + iOS = the 100vh trap.** Any `position: fixed` atmosphere layer sized `100vh` will jump when Safari's chrome collapses. `100dvh` with `100vh` fallback. One line, saves a whole bug class.

## Q2 — Emotional beats

The motion budget is well-judged — one-time reveals, real-value count-ups, no per-scroll re-triggers. Two attacks:

6. **One imagery-parallax moment is NOT enough for Sean's explicit ask.** He said "cool pictures," plural, and Golf alone carrying the entire imagery-parallax load means sections 7–12 are typographically animated but visually flat. **Yes, About earns the second** — the crystal swan render translating at 0.6x behind Sean's portrait/brand block is exactly the brand-specific imagery moment a competitor can't copy because they don't own the swan. Two moments, spaced 4+ sections apart, is rhythm. One is an accident. Three is noise. Cap at two.
7. **Count-up spec has a hole: what renders *before* first inView?** If the section mounts with real values already in DOM and then counts up from 0 on inView, reduced-motion users and no-JS crawlers are fine — but make it explicit: **values in DOM always, count-up is purely a visual transform of the displayed number, reduced-motion = final value instantly, no tween.** Also: if the API hasn't resolved by inView, don't animate to a stale 0 → render a shimmer skeleton and animate once on resolve. Never animate twice.

## Q3 — Implementation shape

The single-listener/rAF/CSS-var architecture is correct in spirit. One structural error:

8. **Do NOT write `--scroll-y` to `:root` or any high ancestor.** Mutating an inherited custom property every frame forces style recalc across the entire subtree that consumes it. Write the var on `HomeAtmosphere`'s own container (which owns only the fixed layers), or better, write `transform` directly to layer refs. The hook contract should be: one passive listener → rAF-coalesced → writes to exactly one shallow scope.
9. **Reduced-motion spec says "static layers visible" — good — but nothing listens for *changes* to the preference.** `matchMedia('(prefers-reduced-motion: reduce)')` needs a live listener; a user toggling it mid-session should kill the canvas without a reload. Cheap, and it's the kind of thing that separates premium from checkbox-a11y.
10. **File budget:** `useScrollAtmosphere` + `HomeAtmosphere` + two section wrappers must each stay ≤300 lines. OpticsCanvas is harvested as-is — verify its line count and its color source on promotion. Which brings me to:

## (c) House-rule compliance audit

- **Tokens:** the consult names "Ice Wing / Wing Purple" verbally. On promotion, every color in HomeAtmosphere/OpticsCanvas must land as `var(--ice-wing, #A8D8EA)`-style with Crystalline fallbacks. The harvest inventory predates enforcement — **assume hero tokens contain hardcoded values until proven otherwise.** Also confirm no `#0a0a1a` / `#00FFFF` / `#7851A9` Galaxy-Swan ghosts survived in `home.tokens.ts` or `useCausticField`. Reject on sight per law.
- **Contrast:** low-alpha glow layers *behind* body copy will drag text below 4.5:1 in exactly the mid-page zones where aurora layers overlap section content. Mandate a scrim rule: any text-bearing section gets a local background with sufficient opacity; the atmosphere lives in the gaps (SectionTransitions), not under prose. This is the most likely WCAG failure mode and it's not mentioned anywhere in the doc.
- **Canvas a11y:** `aria-hidden="true"`, `pointer-events: none`, no focusable descendants. State it.
- **Styled-components:** fine, but the per-frame var writes must live on styled-component *attrs*/refs, not re-rendered styled wrappers — no React re-render per scroll frame, obviously.

## (d) THE ONE highest-impact change

**Ship the hero caustic light-field as the signature moment — but make it *respond*, not just play.** A caustic field that merely animates is a screensaver; every template site has one. A caustic field whose light refraction subtly follows the pointer (desktop) or device tilt is *ours*, costs one uniform and a lerp, and is the single frame of the site where a visitor decides "this is not a WordPress theme." If you ship exactly one beat from this entire consult: **hero optics + letter-stagger, pointer-reactive, tier-gated, reduced-motion static.** That's the signature. Everything else in Q1–Q3 is supporting cast.

## (e) What a design-savvy competitor out-builds here

1. **Text-under-glow contrast** — they'll scrim properly; your draft plan washes body copy over aurora layers and fails contrast at exactly the prettiest moments.
2. **The first 400ms** — they'll have a painted hero poster while you're still mounting a canvas. Defer mount *and* close the MP4 poster gap, or you lose the LCP comparison against a static-but-instant competitor hero.
3. **Two brand-imagery parallax beats instead of one** — they'll use *their* owned imagery twice; you'd use the swan once. The swan render is your only uncopyable asset. Underusing it is the biggest strategic design error available here.
4. **Thermal discipline** — DPR-capped, visibility-gated canvas vs. your uncapped always-on loop. On a mid phone after 45 seconds, their site is still at 60fps and yours is at 38 with a warm pocket.

---

**Numbered deltas to ship:** (1) DPR cap ≤1.5–2 on OpticsCanvas; (2) visibility + IO gating on the canvas loop; (3) defer canvas mount past first paint + close the MP4 poster gap; (4) noise-dither the aurora gradients instead of capping spread; (5) `100dvh` on fixed layers; (6) add the About/swan parallax as the second and final imagery beat; (7) count-up contract: real values in DOM, animate once, skeleton until resolve; (8) scope `--scroll-y` writes to the atmosphere container, never `:root`; (9) live `prefers-reduced-motion` listener; (10) scrim rule keeping 4.5:1 over all glow zones + token/hardcoded-hex audit on the harvested hero files before promotion.
