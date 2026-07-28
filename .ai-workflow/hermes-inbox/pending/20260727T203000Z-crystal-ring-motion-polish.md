# Crystal Ring MOTION POLISH shipped (c181b10da)

- **When:** terminal VS Claude, worktree C:/tmp/ss-charts-g3. Sean: "ring animations look
  cheap, make it polished/professional."

## Grounding call (Rule 76) worth carrying
Kimi's ring ARCHITECTURE was already professional (one master clock, transform/opacity-only,
reduced-motion gate, tokens, useId). "Cheap" was the motion CRAFT, not the bones. So the fix
was a craft pass that PRESERVED every Kimi mandate — NOT a rewrite. Lesson: when someone says
"this looks cheap," separate architecture from craft before touching it; often the bones are
fine and only the surface motion needs work.

## The 7 cheap tells -> fixes (all transform/opacity, one-clock preserved)
1. every layer shared one period+direction (loading-spinner lock) -> DETUNED to 1.0/1.4/2.3/
   0.82x (harmonic derivations of the SAME --ring-loop, so still one clock, now parallaxing).
2. no entrance (snap-in) -> one-shot scale+opacity BLOOM on mount.
3. glow throb (0.3 opacity swing) -> gentle 0.16 breath.
4. flat one-color orbital dots -> radial-gradient GLOWING MOTES + staggered twinkle.
5. uniform sliding-dash "electricity" -> COMET: dimmed tail + bright leading head (head angle
   math places it at the clockwise/leading edge of each filament).
6. flat rotated-square "gems" -> FACETED cut-stone gradient (frost-white highlight -> era color).
7. aura was static despite being called "breathing" -> now breathes.

## Recurring gotcha (carry this — 2nd time a template-literal trap bit this session)
A backtick INSIDE a CSS comment (`both`) closed the styled-components template literal ->
build-breaking parse crash ("Expected ; but found both"). styled tagged templates are JS
backtick strings; ANY backtick inside — even in a /* comment */ — terminates them. Hostile
review caught it pre-ship. (Companion to the earlier case-only-filename collision gotcha.)

## Structure
FX geometry extracted to CrystalProgressRing.fx.tsx (Rule 4: main 218, fx 163, styles 238).
Paint order preserved exactly (aura/track/fill/fringe/spark/crown in main; mid FX in fx).

## Proof + honest limits
8/8 ring + 9/9 tier + 12/12 SwanRankBadge tests; build exit 0; token+degalaxy clean. DRYx2.
LIMITATION: on-screen feel not visually QA'd in this env -> published a faithful before/after
preview artifact for Sean to judge. PRE-EXISTING (not mine, out of scope): the L1000 crown
clips slightly at the default 132px size (crown outer radius exceeds the svg viewBox).

## Next
Sean eyeballs the preview / live deploy; optional triangle or Kimi creative-peer pass on taste.
