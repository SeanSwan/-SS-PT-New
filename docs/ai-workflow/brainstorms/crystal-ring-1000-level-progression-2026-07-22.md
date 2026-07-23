# Kimi Design Brief — The 1,000-Level Crystal Ring Progression System

- **Date:** 2026-07-22 · **Requested by:** Sean · **For:** Kimi K3 (full creative-direction control) · **Status:** brief for consult
- **Consult remit:** you are the lead designer. Design the system. Sean wants marvelous — go past what any app has done.

---

## 0. The one-line ask

Sean wants the SwanStudios client-home **level ring** to become a **living, evolving trophy** — a ring that is beautiful at Level 1, and grows **more intricate, more animated, more jaw-dropping every 20 levels**, all the way to a **singular, ultimate ring at Level 1,000**. Sean's words, verbatim, so you feel the intent:

> "I would like more color animation in it. It should have like a gradient of the purple, the cyan, and then maybe like an **electricity kinda flowing through it in a circle-ish way**. These rings need to get **more and more intricate and beautiful, animated as we go**. Develop rings for every 20 levels — the ring changes to the next ring — all the way up to a thousand. All of them have to be **building up to that ultimate ring at level one thousand**. This needs to be **beautiful… marvelously beautiful, jaw-dropping, marvelous.** Feel free to use different color spectrums. I want you to have **full open creativity control** to make really something marvelous."

**You have full creative control**, including going beyond the standing Crystalline palette into richer/expanded spectrums for the higher tiers — Sean explicitly granted this. (Base tiers should still feel like they belong to SwanStudios; the expansion is a reward that unlocks as the user ascends.)

---

## 1. What exists today (your starting point — improve/replace it)

A `CrystalProgressRing` React + styled-components + inline-SVG component already ships on a branch. Current state:
- An SVG stroke ring around the level number. Ice Wing (#60C0F0) progress fill on an obsidian groove track.
- A **1.5px spectral dispersion fringe** on the leading (progress) edge — monotonic in wavelength violet→lavender→cyan→gold (the SwanStudios "§4 dispersion law": rainbows are physics — light split by a facet — never arbitrary gradients).
- One SNAP opacity-pulse on the fringe on mount. Level number centered. Reduced-motion static fallback.

Sean liked it but wants **much more**: flowing electricity, a purple↔cyan animated gradient sweeping the ring, and the whole progression system on top.

## 2. The hard architecture decision (already made with Sean — design WITHIN it)

**Parametric engine + milestone bespoke rings.** NOT 50 hand-drawn rings.
- **Tier = ceil(level / 20)** → tiers 1..50 (L1–20 = tier 1, … L981–1000 = tier 50).
- ONE ring *engine* consumes a `tier` (1–50) and `pct` (0–100 progress in the current level) and renders escalating complexity from a **design spec you define**: what dials up per tier (layer count, motion intensity, palette, particle/electricity density, facet count, glow, extra orbital elements…).
- A **handful of milestone rings** (you choose — e.g. every 100 levels, and definitely the **L1000 ultimate**) get **bespoke hero treatment** on top of the engine.
- **This must stay performant** (see §5) — a data dashboard renders this ring; it can't melt phones.

**Your job:** design the *escalation curve* and the *visual language of each band*. Concretely, we need from you:
1. **A tier-band map** — group the 50 tiers into a small number of named visual "eras" (e.g. tiers 1–5 "Frost", 6–15 "Aurora", … up to "Ascendant" at 50). Name each era, give its palette/spectrum, its signature motion, and what visually distinguishes it from the era below.
2. **Per-tier dial table** — the parameters the engine animates across the 50 tiers (monotonic escalation): stroke layers, gradient composition, electricity/arc density & speed, particle count, facet count, glow radius, orbital rings, backing aura, etc. Give the *curve* (how each dial ramps 1→50), not 50 hand values.
3. **The electricity mechanic** — how the "electricity flowing in a circle" reads and escalates: arc-lightning along the ring? a chasing luminous head? plasma filament? crackle at the progress tip? Define it so it's beautiful at tier 1 and awe-inspiring by tier 50.
4. **Milestone hero rings** — which tiers get bespoke art, and what makes each a "moment." The **L1000 ultimate ring** especially: describe it in loving, concrete detail — this is the thing users climb 1000 levels for.
5. **The color spectrums** — base tiers in Crystalline (Midnight Sapphire #002060 · Ice Wing #60C0F0 · Wing Purple #8B5CF6 · Swan Lavender #4070C0 · Gilded Fern gold #C6A84B · Frost White #E0ECF4 · Obsidian #0A0A0F). You may introduce expanded/exotic spectrums as ascension rewards for higher eras (aurora, prismatic, plasma, molten-gold, deep-cosmos — your call). Name them.
6. **The level-up transition** — when a user crosses a 20-level boundary and the ring "changes to the next ring," what does that transition look/feel like? (This is a celebration beat.)

## 3. Emotional target (Sean's north star)

Marvelously beautiful · anchored · deep · **jaw-dropping** · marvelous. The ring is the **trophy of the whole product loop** — proof of the user's training journey. Someone at Level 1 should think "I want to see what this becomes." Someone at Level 1000 should feel they earned something sacred. This is the single most-looked-at object on the client home.

## 4. Reference intel (PRINCIPLE ONLY — do not clone; Sean wants to BEAT these)

From Mobbin (real shipped apps), the escalating-rank pattern is proven but visually timid:
- **Brainly** — hexagonal rank tiers Beginner→Master, greyed until unlocked (progression legibility, but flat/static).
- **Duolingo / Mimo** — league badges wood→bronze→silver→gold→diamond (material escalation as status — but cartoon, not premium).
- **Azar** — an animated level ring with EXP arc (closest to ours — but a single plain green ring, no evolution).
- **Brilliant** — locked octagon leagues (the "unlock the next tier" tension).

The lesson: everyone escalates *material* (wood→gold) or *shape* (more sides). **Nobody escalates LIGHT, MOTION, and DIMENSION.** That's the SwanStudios opening — the ring doesn't just get a shinier metal, it becomes more *alive*: more light refracting, more energy flowing, more depth, until the L1000 ring feels like a living crystalline reactor. Go there.

## 5. Non-negotiable constraints (design freely, but inside these)

- **Stack:** React 18 + TypeScript + styled-components + inline SVG (and/or `<canvas>`/WebGL for the high tiers if genuinely warranted). No Material UI, no Tailwind. Victory is only for charts — this is a bespoke indicator, not a chart.
- **Performance (this is a DATA DASHBOARD):** animation must be GPU-safe (transform/opacity; SVG paint kept minimal). Motion caps: this can carry the home's ONE signature moment (it already is `data-signature`). Higher tiers may be richer but must degrade — define **Full / Lean / Still** quality modes, and a **reduced-motion** static composition for every tier (mandatory; a blank or frozen-ugly ring under reduced-motion is a fail — the still frame must itself be beautiful).
- **Accessibility:** the ring is decorative (`aria-hidden`); a real `role="progressbar"` with `aria-valuenow` lives beside it. Never rely on color alone to convey tier — the level number + tier name carry it too.
- **Buildable by a parametric engine:** your spec must be expressible as "given tier T and pct P, compute these layers/params." If a tier needs something the engine can't express, call it out as a milestone-bespoke exception.
- **Dispersion honesty (Crystalline law):** multi-hue = dispersion (light split by a facet, ordered by wavelength), not arbitrary rainbow washes — UNLESS you're deliberately introducing a named exotic spectrum for a high era, in which case name it and justify it as an ascension reward.
- **No swan illustration / no mascot / no emoji** — brand is expressed through optical physics, not creatures.

## 6. What we need back from you (deliverable shape)

A design doctrine we can build from:
1. **The escalation philosophy** (2–3 paragraphs: what "gets more beautiful" MEANS here, mechanically).
2. **Tier-band / era map** (the ~6–10 named eras across tiers 1–50, each with palette + signature + motion + what unlocks).
3. **Per-dial escalation table** (the parameters + how each ramps 1→50).
4. **The electricity mechanic** (defined + how it escalates).
5. **Milestone hero rings** (which tiers, what makes each a moment; the L1000 ultimate in loving detail).
6. **The named color spectrums** (base Crystalline + the exotic ascension spectrums, with rough hex intent).
7. **The level-up transition** (the 20-level-boundary celebration beat).
8. **Performance/tier notes** (Full/Lean/Still + reduced-motion still-frame per era; what to render in SVG vs canvas).
9. **A build-order recommendation** (what to prototype first to prove the system — likely: engine + 3 sample tiers across the range + the L1000 ultimate).

Be concrete, be bold, be beautiful. Sean gave you the keys. Make something people screenshot and show their friends.
