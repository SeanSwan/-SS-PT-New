# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/fc35ba13-48c4-4e2a-a55c-0b3010bed2f4/scratchpad/crystal-ring-evolution-brief.md
**Seed:** (none)
**Tokens:** 1214 in / 2355 out | **Cost:** ~$0.0390 | **Wall:** 46.6s

---

# Crystal Ring — Evolution Direction (Kimi K3)

Sean is right: the current system is a *dimmer switch*, not an evolution. The fix is to stop thinking "more FX per band" and start thinking **"each band is a different artifact forged from the same crystal."** Here's the full direction.

---

## (A) Band-Identity Matrix — 5 axes, 4 eras, 20 artifacts

**The five axes** (every band gets a distinct coordinate on all five — no two bands share a full signature):

| Axis | What it controls | Progression logic |
|---|---|---|
| **1. Silhouette** | Ring geometry itself: smooth circle → faceted polygon → notched gear → twin counter-rings → spiked halo | Sides = `3 + bandIndex` capped at 12; notch depth ramps 0→14px |
| **2. Material** | Gradient stop-pair + stroke treatment | Frost glass → liquid silver → amethyst → gold-inlaid → obsidian-core-with-light |
| **3. Motion signature** | ONE dominant motion per band (never all at once) | rotate → counter-rotate → pulse-scale → orbital drift → shimmer-sweep (opacity gradient rotation) |
| **4. Particle grammar** | Shape of orbitals, not count | dots → dashes → shards → comets → runes (tiny 4px path glyphs) |
| **5. Center treatment** | What's behind/around the number | plain → scrim ring → era glyph → swan watermark → full crest |

**Era structure (the punctuation):** 20 bands in **4 eras of 5**. Each era *restarts the density dial but upgrades the material* — this is the anti-monotony trick. Within an era, bands 1→5 escalate density; crossing an era boundary *transforms* (new silhouette family + new material + motion signature flips). The user feels a "prestige reset" every 250 levels, like a new game-plus.

| Era | Levels | Name | Silhouette | Material | Motion |
|---|---|---|---|---|---|
| I | 1–250 | **Frostbound** | smooth → hexagon | Ice Wing `#60C0F0` → Frost White | slow rotate, 1.0× loop |
| II | 251–500 | **Argent Tide** | hexagon → octagon, first notches | silver-lavender `#4070C0`→`#E0ECF4` | counter-rotate twin arc |
| III | 501–750 | **Amethyst Reign** | octagon → 12-gon, deep notches | `#8B5CF6` → `#60C0F0` | pulse-scale breathing (scale 1→1.015) |
| IV | 751–1000 | **Gilded Apex** | faceted halo → spiked crown | `#C6A84B` inlay over obsidian | shimmer-sweep + orbital drift |

**Named standout bands** (the ones people screenshot):

- **Band 1 "First Frost"** — bare 2px arc, single mote. Restraint is the design.
- **Band 5 "Glacier Gate"** (L250) — first polygon: hexagon ring, era-climax 6-shard burst.
- **Band 10 "Silver Meridian"** (L500) — twin counter-rotating arcs lock into phase; the "eclipse moment."
- **Band 13 "Violet Reliquary"** (L650) — rune particles replace dots; first gold *trace* (single 1px gold inner line — a promise).
- **Band 16 "Gilded Threshold"** (L800) — material flips: obsidian ring with gold inlay, light now comes from *inside*.
- **Band 19 "Swan Ascendant"** (L950) — crest fully formed (see C), wings at rest.
- **Band 20 "The Apex"** (L1000) — crown silhouette, 12 spikes, gold shimmer-sweep, swan crest luminous. Not "band 19 + more" — it's the *coronation* of everything prior.

**Continuous ramp:** drive density/luminosity off one normalized scalar `--evo: calc(var(--level) / 1000)` — mote count, arc thickness (2→5px), glow opacity (0.15→0.5) all interpolate off it. Era boundaries then *jump* silhouette/material discretely. Ramp = continuity, eras = punctuation.

---

## (B) Clipping / Extent Solution

**Rule: geometry lives inside a fixed safe core; all FX live inside a computed budget; the viewBox is oversized with the ring optically centered.**

- **viewBox: `0 0 400 400`**, ring center at `200,200`. Render at any CSS size — vector scales, nothing clips.
- **Radius budget (hard law, enforced in the builder as constants):**
  - Core ring radius: `R = 132` (preserves current optical size)
  - FX budget: **68px** → absolute max extent `132 + 68 = 200` = exactly the viewBox edge.
  - Sub-budgets that must sum ≤ 68: crown spikes `≤26`, orbital path radius offset `≤34` (mote radius ≤6 → 40), aura scale max `1.12` on a 148px halo circle (→ ~18), comet tails drawn *inward* only.
- **No `overflow: visible` anywhere.** The budget is the guarantee; overflow-visible is a hope.
- **One structural note:** the breathing aura must scale about `transform-origin: 200px 200px` (or `center` with `transform-box: fill-box` on a centered element) — a mis-anchored scale is the #1 way FX silently exceed budget.
- Builder adds one dev-mode assertion: a debug `<circle r="200">` outline toggle. If any pixel crosses it at any t in the loop, the band fails review. That's the "NEVER clips" guarantee made testable.

---

## (C) Swan-Crest Integration

**Entry: Band 13 (L650), as a watermark — not a badge.** Earlier is unearned; later wastes the best asset.

Escalation in four stages:

1. **Band 13–14 "The Reflection"** — swan silhouette at **4% opacity**, Frost White, *behind* the obsidian scrim in the center, scaled to 90px, static. You notice it on the second look. That's the hook.
2. **Band 15–16 "The Dark Glass"** — the About-SwanMark treatment: swan becomes a **dark-glass occluder** — obsidian-fill silhouette at 60% opacity set against the luminous ring glow, rim-lit by a 1px `#60C0F0` stroke at 30% opacity. Negative prestige: the swan is *carved out of the light*.
3. **Band 17–19 "The Crest"** — swan goes **positive emblem**: gold `#C6A84B` gradient fill (two static stops), 64px, seated in a notched seat at the *top* of the ring (12 o'clock, interrupting the arc — the arc breaks for it, which is what makes it feel mounted, not pasted). Opacity breathes 0.85→1 on the master clock.
4. **Band 20 "Coronation"** — the crest **unfurls**: a second mirrored wing-path (same silhouette, `scale(-1,1)` reflected partial) fades in flanking the crest, and the whole crest group does a slow `scale(1→1.04→1)` on the loop — the only element at the ultimate tier allowed to breathe. Gold shimmer-sweep passes *through* the crest via a rotating gradient-filled overlay clipped to the swan path (gradient fill on the rotating layer — no filter, constraint-safe).

The swan never spins. The ring revolves around the swan. That hierarchy is the brand.

---

## (D) The ONE Brand-Defining Move

**The Era Metamorphosis: at each 250-level threshold, the ring doesn't upgrade — it *molts*.**

On level-up across an era boundary, the old silhouette's facets **shatter outward and recrystallize** into the new polygon: the old ring's stroke-dasharray collapses (opacity crossfade, 1 loop cycle), 6–12 shard particles (the era's particle grammar) fly outward along the orbital radius and freeze into the vertices of the new silhouette. All transform/opacity, all on the master clock, all static keyframes parameterized by `--evo`.

Why it's the move: **progression systems are everywhere; transformation systems are owned.** Nobody else's progress ring *becomes a different object*. It gives Sean a demo moment ("watch it molt at 500"), gives users a reason to chase thresholds instead of levels, and it's brutally hard to copy because it requires the silhouette-axis architecture from (A) — copiers who just stack dots can't fake it. The molt IS the Crystalline Swan thesis: beauty through transformation, not accumulation.

---

## (E) Traps to Avoid

1. **Additive thinking.** If a band can be described as "previous band + X," kill it. Luxury is *substitution* (new material replaces old), gaming is *accumulation* (more stuff). Every era must remove something.
2. **Full-spectrum rainbow.** Never show all 4 tokens at once. Each band uses **max 2 tokens + Frost White**. Gold appears only as a trace before Band 16 — early gold is the fastest route to gamer-cheap.
3. **Uniform motion.** Everything rotating at harmonic speeds in the same direction reads as a screensaver. Each band gets ONE dominant motion; stillness elsewhere is the luxury signal. Band 20 is powerful because 19 taught restraint.
4. **Glow as personality.** If removing the aura makes two bands indistinguishable, the silhouettes aren't doing their job. Design flat-first; glow is garnish, never identity.
5. **Symmetrical particle spam.** 8 evenly-spaced identical dots = AI-generated clip-art. Use prime counts (3, 5, 7), detuned orbital phases, and varied mote sizes (1.5/2.5/4px). Organic asymmetry within geometric discipline.
6. **The L1000 kitchen sink.** The Apex must have *fewer* particle types than Band 18, executed richer. Coronation = editing, not maximalism.
7. **Crest slapped on top.** If the swan doesn't interrupt the arc geometry, it's a sticker. Integration must cost the ring something.

**North star:** Band 1 should feel like a frozen breath; Band 20 like a crowned relic — and a user scrolling the tier ladder should feel *geology happening*, not a slider moving.
