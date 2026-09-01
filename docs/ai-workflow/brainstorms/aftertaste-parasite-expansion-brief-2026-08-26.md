---
decision: "Expand the Aftertaste bestiary into parasites, deep-ocean horrors and parasitic robots — and design the HARDCORE / LIGHT content-intensity system that makes them shippable to every audience"
status: open
supersedes: none (extends the 2026-08-26 contamination roster)
privacy: IDs/roles only.
---

# BRIEF — Parasite expansion + the intensity system · 2026-08-26

Two jobs this round. **The second is the more important one and constrains the first.**

## 0. What the Owner asked for, in his words (reconstructed, not paraphrased away)

- A family of **bloodsucker parasites**: bedbugs, kissing bugs, leeches, mosquitoes, fleas, ticks — "and all other bugs that belong in that family."
- **Photoreal texture treatment**: "take a model and wrap realistic pictures like a flea." Scaled **up**, not down. "Scary. Kind of."
- **The weirdest, most jaw-dropping bugs** — creatures people do not see every day, "the greatest looking bugs, the weirdest looking bugs," as zombies.
- **Parasitic robots** — machine bloodsuckers.
- **Deep-ocean parasites** — "cruel weird animals from the deep ocean."
- **Mobs that range across different areas** — a bestiary that spans biomes, not one contaminated food court.
- **A HARDCORE mode and a LIGHT mode**: light mode "takes all the hardcore stuff out." He called this *very important*.

One phrase in the dictation did not survive transcription — something like *"Edward makes an Edward poo theme"*. **Do not guess at it.** Flag it as an open question; the Owner will clarify.

## 0.5 ⚠ CORRECTION FROM THE OWNER (2026-08-26, mid-round — this SUPERSEDES §1's framing)

The Owner clarified after this brief was sent. **LIGHT mode is not "the hardcore stuff taken out."
It is a completely different cast of creatures.** His words: *"completely changed the mobs up in the
game… the light version should be cute mobs."* Two audiences, both catered to, neither one holding
a degraded copy of the other's game.

He also asked directly whether there should be **three** tiers — cute, the realistic one he wants,
and a third I might suggest — and whether three is too much.

**The builder's recommendation, for you to attack:** TWO visual tiers, ONE gameplay spine.
- **CUTE** and **DREAD** are different creatures: different silhouette treatment, proportions,
  palette, name, sound.
- They share the **same blockout family and the same fight** — identical telegraph, counterplay,
  hitbox, timing, difficulty. A cute mob and its dread twin are the same encounter wearing
  different skin. Cost lands near 2× on art and near 1× on design and balance.
- A middle tier is the option nobody picks and everybody maintains — cute players find it
  off-putting, dread players find it a letdown. And the natural middle **already exists**: the
  beveled-voxel look the pipeline produces today, with no photo wrap. So two can ship now and the
  middle costs almost nothing to add later if players actually ask for it.

**Attack that recommendation.** If two-with-a-shared-spine is wrong, say why and what beats it.

Everything in §1 below still applies to the *mechanics* of the switch (where the variant lives so
the validator can CHECK it, defaults, discoverability, leak surfaces, what must never differ). What
changes is Q2: the answer is no longer "one asset or two" but "how do two creature sets stay one
fight" — and how a variant pair is REPRESENTED so a manifest cannot claim a twin it does not have.

## 1. THE INTENSITY SYSTEM — design this first, because it gates everything else

A toggle that "takes the hardcore stuff out" is easy to describe and easy to get wrong. Wrong looks like: two asset sets to build and maintain; a light mode that is obviously the real game with holes in it; a hardcore mode that becomes the "real" one and light mode rots; a switch that changes nothing mechanically so nobody uses it; or an intensity level that leaks through audio, text, or a still frame the toggle never touched.

**Answer these as design decisions with reasons, not options lists:**

1. **What is the axis?** Gore? Body-horror? Insect realism specifically (many people have genuine entomophobia — a photoreal tick at 3× scale is a clinical trigger, not a style choice)? Jump-scare timing? Density/swarm count? Name the axes that actually exist here, and say which ones the toggle moves.
2. **One asset or two?** Is LIGHT a different *material and shader treatment* on the same mesh (stylised/voxel-flat vs photoreal-wrapped), a different mesh, or a different creature entirely? Whichever you pick, justify it against a pipeline where every asset costs a Blender run and a manifest.
3. **Where does it live?** Per-asset manifest field, a registry-level variant set, a runtime shader branch, or a build-time flag? The validator already refuses manifests that disagree with their bytes — how does an intensity variant get represented so that "light has no photoreal texture" is *checkable*, not promised?
4. **Default and discoverability.** What does a first-time player get, and how do they change it? Is it a settings toggle, an onboarding question, or a per-session choice? (The product this attaches to has minors among its users.)
5. **What must NEVER differ between modes** — the counterplay, the telegraphs, the difficulty, the progression? A mode that is also easier is a different product decision than a mode that is only less intense.
6. **The leak surfaces.** Audio, still/poster frames, the codex, achievement names, loading screens, the enemy's *name*. Where does intensity leak past a mesh-level toggle, and what closes it?
7. **What does HARDCORE get that LIGHT does not** — and is that additive content (a reason to choose it) or subtractive (light is the punished path)?

## 2. THE PARASITE / DEEP-OCEAN / ROBOT BESTIARY

Use the **same spec block** as the 2026-08-26 contamination roster (§3 there): `id · role · voxelDims · voxelCount · silhouette · buildRecipe · paletteSlots · rig · clipIntent · telegraph · counterplay · ipRow · healthCheck`. Everything the pipeline needs must be numeric; a spec that has to be interpreted is a spec that gets re-done.

**Plus three NEW required fields for this round:**

```
intensity:       the LIGHT/HARDCORE treatment for THIS creature — what changes, in one line
biome:           which area this mob ranges (name the biome; the bestiary now spans areas)
realismTier:     voxel-stylised | hybrid | photoreal-wrap    — and WHY this creature earns it
```

**Constraints that still bind, all of them:**
- **The art law is inherited:** *"beveled voxels with disciplined roughness, not plastic cubes."* Voxel is the authoring dialect; runtime is remeshed beveled low-poly. **A photoreal wrap is a TEXTURE decision, not a geometry decision** — the silhouette is still built from voxel clusters. If you think a creature genuinely needs non-voxel geometry, say so and argue it.
- **Tier ceilings the validator enforces:** LOD1 ≤ 50 % of LOD0, LOD2 ≤ 25 %, and a closed-manifold collision hull. A silhouette that dies at 25 % is a design the pipeline refuses.
- **Occupied cells 4–40.** The pipe is calibrated there; larger is a probe-then-recalibrate job, not a free choice.
- **Clusters must touch.** The last roster had a floating wing and the generator refused it.
- **No perfect X-mirror symmetry** — programmatically refused.
- **Health language:** the villain is contamination, decay, parasitism, neglect. **Never a body, never a body type, never a person.** A parasite feeding is a *creature behaviour*; it must not read as disgust at human anatomy.
- **IP:** an `ipRow` with three nearest commercial comparisons and why this is distinct. Real species names are fine — nature is not trademarked — but a specific film's creature design is.
- **Palette:** ≤4 Law-B slots; `--world-danger` is a telegraph, never body colour.

**Coverage the Owner asked for — aim across all of it:**
- **Bloodsuckers:** bedbug, kissing bug, leech, mosquito, flea, tick. What makes each *mechanically* distinct rather than differently-shaped?
- **Jaw-droppers:** the genuinely weird real ones — the Owner explicitly wants creatures people have never seen. Assassin bugs that wear their kills, tongue-eating isopods, botfly, horsehair worm, mantis shrimp, hagfish, barreleye, sea spiders. Pick the ones whose *silhouette* survives at 25 % triangles.
- **Parasitic robots:** what is a machine parasite *for*? What does it drain, and from what?
- **Deep-ocean:** pressure, bioluminescence, and the fact that most of them are translucent — how does that survive a low-poly beveled treatment and a Law-B palette?

## 3. What I need back

1. **The intensity system**, §1 answered as decisions with rationale. This first.
2. **The bestiary**, as many complete spec blocks as you can author in one pass — the generator judges and writes each block independently, so a truncated response still yields usable assets, and a completeness count now catches what was never written.
3. **Biome map:** which mobs range where, and why that grouping.
4. **Your hostile read of this brief.** Where is it wrong, and what is the Owner going to regret? The last roster's author found six real problems in my brief and three of them became code.
