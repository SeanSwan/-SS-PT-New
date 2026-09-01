# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-parasite-expansion-brief-2026-08-26.md
**Seed:** (none)
**Tokens:** 1980 in / 22758 out · **Cost:** ~$0.0000 · **Wall:** 644.8s · **finish:** stop

---

# DELIVERABLE — Parasite Expansion + Intensity System

**QUARANTINE FIRST:** The untranscribed phrase (*"Edward makes an Edward poo theme"*) is flagged, not guessed. It is excluded from every decision below. If it turns out to be a content theme request, it arrives as its own brief — it does not ride along inside this one.

---

## PART 1 — THE INTENSITY SYSTEM

### Decision 1.1 — The axis is SURFACE FIDELITY. One axis. Nothing else moves.

There are four candidate axes hiding in this brief, and I am deliberately collapsing them:

- **Visceral surface treatment** (photoreal chitin/wet-membrane wraps, engorgement states, viscera particles, wet foley) — **this is the axis the toggle moves.**
- **Entomophobia trigger strength** — this is *not a separate axis*, it is a consequence of the first. A photoreal tick at 3× scale is a clinical trigger; a clay-matte tick at 3× scale is a monster. Same mesh, same behavior, different skin. Treating it as its own axis would produce two dials that always move together — bad UI, worse validation.
- **Swarm density / jump-scare timing / stats** — these are *mechanics*. They do not move. Ever. See 1.5.
- **Scale** ("scary, kind of") — scale is a world-space property of the creature, identical in both modes. A 3× tick is 3× in LIGHT too. Fear-of-size is part of the fantasy the Owner asked for; fear-of-texture is the part he offered an exit from.

**Rationale:** one axis means one validation surface, one settings verb, one marketing sentence. Every additional axis multiplies the "light mode with holes in it" failure mode described in the brief.

### Decision 1.2 — ONE mesh, TWO material sets. LIGHT is the base asset; HARDCORE is an additive texture pack.

Every creature ships as the standard beveled-voxel asset — the art law already mandates this geometry. HARDCORE adds a **texture-set override**: photoreal-wrapped albedo/normal maps, a subsurface/wetness shader branch, and hardcore-only particle attachments (engorgement decals, drip emitters).

- LIGHT = the compliant voxel asset with disciplined-roughness matte materials. It is not a degraded version; it is the art law, unchanged.
- HARDCORE = the same mesh with the wrap applied.

**Pipeline justification:** one Blender run per creature either way. The wrap is authored as a texture-layer pass on the existing UV layout, not a remodel. A second mesh would double the manifest, double the LOD work, double the collision-hull validation, and guarantee drift between variants. A "different creature entirely" fails outright — the Owner wants the *same* tick, minus the trigger.

### Decision 1.3 — Manifest-declared variant block, enforced at build time by absence of bytes.

Each spec gains a manifest stanza:

```
intensityTextures: {
  tier: photoreal-wrap,
  maps: ["tick_albedo_photo.ktx2", "tick_normal_photo.ktx2"],
  particles: ["fx_engorge_drip"],
  audioLayers: ["squelch_wet_loop"]
}
```

**Enforcement:** the LIGHT build simply does not ship those files. The validator's existing "manifest must agree with bytes" rule closes the loop mechanically: a creature whose manifest declares `tier: photoreal-wrap` and whose build contains no photo maps **fails the build**. "Light has no photoreal texture" becomes a byte-count assertion, not a promise. Both texture sets live in the shipped package (they're kilobytes of KTX2, not geometry), so the toggle is instant, offline, and reversible per session.

### Decision 1.4 — LIGHT is the default. Asked once, in plain language, changeable forever.

First launch shows one screen: *"Some creatures appear with realistic skins and wet sound effects. You can turn this off at any time."* Default = OFF (LIGHT). Minus among the user base makes this non-negotiable — the safe state is the default state, and the opt-*in* framing prevents "the game is asking if I'm tough enough."

It is a persistent settings toggle, not an onboarding gate and not a per-session choice — a minor who picked wrong at age nine should not have to renegotiate at age ten. Changes apply immediately, no reload, because the meshes never swap.

### Decision 1.5 — The invariant list. These are byte-identical across modes:

HP, damage, speed, attack ranges, telegraph durations, counterplay windows, dodge i-frames, XP, drops, progression gates, spawn tables, swarm counts, jump-scare timing. Implementation: one stat table keyed by creature ID, shared by both modes. There is no per-mode stat file to drift.

**Why absolute:** the moment LIGHT is also easier, it becomes the "kids' mode" and HARDCORE becomes "the real game" — the exact rot the brief predicts. An arachnophobe playing LIGHT must be able to raid with a HARDCORE friend and pull equal weight. Intensity is presentation; competence is universal.

### Decision 1.6 — Leak surfaces, closed item by item:

| Surface | Closure |
|---|---|
| **Enemy/codex names** | Neutral taxonomic names in both modes ("Tick," "Bedbug"). Names never carry intensity. |
| **Codex descriptions** | Two strings per entry (`desc.light`, `desc.hardcore`), both in the localization manifest, both validated for presence. LIGHT string describes behavior; HARDCORE string may describe feeding detail. |
| **Achievement names** | Authored once, intensity-neutral. No "Bloodletter" badges visible to LIGHT players. |
| **Loading screens / poster frames / store caps** | Always rendered from the LIGHT material set. Marketing never screenshots HARDCORE-only states. |
| **Audio** | Wet/squelch/gore layers are tagged `audioLayers` in the intensity block and physically absent from the LIGHT audio bank. |
| **Death effects** | Viscera particle systems are `particles:` entries — absent in LIGHT, replaced by the standard decay-dissolve every creature already has. |

### Decision 1.7 — HARDCORE is ADDITIVE, and modestly rewarded.

HARDCORE gets: photoreal wraps, wet audio layer, engorgement/viscera states, and one cosmetic mark (a profile sigil) for completing content with it enabled. No exclusive content, no exclusive rewards, no stat changes.

**Why additive:** subtractive design (LIGHT loses things) makes LIGHT the punished path, which contradicts Decision 1.4's entire purpose. The sigil is status, not power — enough reason to choose HARDCORE for players who want it, worthless enough that nobody feels forced. The real reason to enable HARDCORE is that the photoreal tick is genuinely horrifying, which is the Owner's actual request.

---

## PART 2 — BESTIARY SPEC BLOCKS

**Recipe grammar (global, script-parseable):**
```
C(x,y,z,dx,dy,dz)        one box, integer grid units; spine = x, y may be negative, z = up
N(k,sx,sy,sz, C(...))    k copies; i-th copy shifted by i*(sx,sy,sz)
GLOBAL RULES:
  - every box shares ≥1 full face with another box (cluster-touch law)
  - MIRROR-BREAK: odd-indexed copies of any N receive z += 1 (validator-visible asymmetry)
  - cells = Σ(dx·dy·dz), constrained to [4,40]
```

---

### `parasite.bedbug`
- **role:** ambush-drainer — nests in furniture props, emerges for idle sleepers
- **voxelDims:** 8×5×3
- **voxelCount:** 34
- **silhouette:** Oval, dorsoventrally flattened, banded abdomen; reads as "a seed with legs" at 25% tris. Banding survives LOD2 as alternating material stripes.
- **buildRecipe:** `C(-1,1,0,1,2,1); C(0,0,0,2,3,1); C(2,0,0,3,3,2); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,3,0,1,1,1)); C(-2,1,1,1,1,1); C(-2,2,1,1,1,1)`
- **paletteSlots:** `P1 #8A6E52 (chitin tan) · P2 #5C4636 (band shadow) · P3 #D8D2C4 (dust bloom) · P4 #3A2E28 (joint)`
- **rig:** headYaw, abdomenPulse, legIK×6, antennaWobble×2
- **clipIntent:** `idle_nest_hide`, `emerge_unfold`, `feed_pulse`, `flee_scurry`, `death_curl`
- **telegraph:** Nest prop visibly dusts and vibrates 1.2s before emergence; audible exoskeleton tick.
- **counterplay:** Inspect and ignite nest props before resting nearby. Emerged bedbugs are slow — walk away or sweep. Burning a nest grants area-clear buff.
- **ipRow:** *Grounded* (domestic insect dread), *Half-Life* headcrab (leaping parasite), *Starship Troopers* arthropods. Distinct: real-species fidelity tied to a nest-prop contamination economy, not alien warfare or boss spectacle.
- **healthCheck:** Feeding targets bedding and furniture decay-state, framed as infestation/neglect of the environment. No anatomy, no person, no bite-on-body depiction in either mode.
- **intensity:** LIGHT: matte clay chitin, dry foley. HARDCORE: photoreal banded-shell wrap, engorgement swell state, wet feeding loop.
- **biome:** The Bunkhouse
- **realismTier:** photoreal-wrap — the most universally recognized household parasite; recognition *is* the horror, and the Owner explicitly asked for the wrapped-photo treatment here.

---

### `parasite.kissingbug`
- **role:** stealth-night-raider — approaches while attention is elsewhere, applies delayed fever
- **voxelDims:** 7×5×2
- **voxelCount:** 26
- **silhouette:** Elongated cone-head with straight proboscis; flat shield-back. At 25% tris the proboscis spike and shield trapezoid carry it.
- **buildRecipe:** `C(-1,1,0,1,1,1); C(-2,1,0,1,1,1); C(0,0,0,1,3,1); C(1,0,0,1,3,1); C(2,0,0,4,3,1); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,3,0,1,1,1))`
- **paletteSlots:** `P1 #3E2A24 (dark carapace) · P2 #A65A3A (rim band) · P3 #D8D2C4 (pronotum mark)`
- **rig:** headPitch, proboscisExtend, legIK×6
- **clipIntent:** `creep_approach`, `strike_probe`, `retreat_drag`, `death_flat`
- **telegraph:** Its own shadow — it freezes completely when directly observed (weeping-angel behavior). Audio: faint skitter that stops when you turn.
- **counterplay:** Carry a light source; its freeze-frame is broken by sweeping light cones. A landed bite starts a visible fever timer cured at a clean-water station — never a hidden debuff.
- **ipRow:** *Rain World* (patient predator AI), *Grounded*, *Inside* (nameless menace). Distinct: the real insect's disease-vector biology becomes a visible, curable contamination timer — mechanic from entomology, not from film monster design.
- **healthCheck:** The "bite" is depicted as contact with the environment's decay (fever as contamination exposure), fully abstracted from anatomy.
- **intensity:** LIGHT: flat matte shell, silent movement. HARDCORE: photoreal mottled wrap, proboscis glisten shader, heartbeat-proximity audio.
- **biome:** The Bunkhouse (night) / The Stagnant Marsh (day refuge)
- **realismTier:** photoreal-wrap — recognizable enough that a stylized version loses the "that's a REAL bug" jolt the Owner commissioned.

---

### `parasite.leech`
- **role:** latch-drainer — attaches in water, drains stamina until scraped off
- **voxelDims:** 8×4×2
- **voxelCount:** 14
- **silhouette:** Annulated ribbon with two suckers. Survives 25% trivially — it's already minimal; annulation rings become texture, not geometry.
- **buildRecipe:** `N(6,1,0,0,C(0,0,0,1,2,1)); C(-1,0,0,1,2,1); C(6,0,0,1,2,1); N(3,2,0,0,C(0,-1,0,1,1,1)); N(3,2,0,0,C(0,2,0,1,1,1))`
- **paletteSlots:** `P1 #4A5238 (bog green) · P2 #6E7A52 (ring highlight) · P3 #2E3324 (sucker)`
- **rig:** segmentWave (spine chain ×6), suckerGrip×2
- **clipIntent:** `swim_undulate`, `latch_grip`, `drain_pulse`, `scrape_release`, `death_slack`
- **telegraph:** Water surface ripple ring 0.8s before latch attempt; latch itself plays a loud, fair grip sound.
- **counterplay:** Cannot be damaged meaningfully while attached — scrape against rough terrain nodes or use the scraper tool. Removal is a 1.5s channel interrupted by damage, creating a "find safe ground" decision, not a DPS check.
- **ipRow:** *Valheim* leeches, *Subnautica* bleeders, *Grounded*. Distinct: removal-as-navigation (drag yourself to sandpaper rock) instead of a damage-over-time stat stick.
- **healthCheck:** Drains stamina, not blood-on-screen; attachment shown as grip on gear/environment. Decay-of-vitality framing throughout.
- **intensity:** LIGHT: matte rubber-green, soft splash foley. HARDCORE: photoreal glistening annulation wrap, wet suction audio layer, distended post-feed silhouette decal.
- **biome:** The Stagnant Marsh
- **realismTier:** hybrid — silhouette is iconic without photo detail; the wetness shader (not the texture map) sells it, saving texture budget for the land bloodsuckers.

---

### `parasite.mosquito`
- **role:** hit-and-run thief — drinks, flees, converts stolen resources into larvae spawns
- **voxelDims:** 8×5×3
- **voxelCount:** 27
- **silhouette:** Needle forward, dangling abdomen, two blade wings. The needle + abdomen line survives any LOD; wings collapse gracefully.
- **buildRecipe:** `C(0,0,0,2,2,2); C(2,0,1,4,1,1); C(-1,0,1,1,2,1); C(-2,0,1,1,1,1); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,2,0,1,1,1)); C(1,2,2,3,1,1); C(1,-1,2,3,1,1)`
- **paletteSlots:** `P1 #6E7A52 (body) · P2 #3A2E28 (stripes) · P3 #D8D2C4 (wing membrane) · P4 #2E3324 (needle)`
- **rig:** wingFlap×2 (high-frequency), abdomenSag, legDangle×6, proboscisFixed
- **clipIntent:** `hover_weave`, `dart_strike`, `flee_loaded`, `deposit_larvae`, `death_spin`
- **telegraph:** Wing pitch rises a full octave during aim windup — audio telegraph, dodgeable by sprint-direction change.
- **counterplay:** Smoke-repellent zones (craftable) deny approach entirely. A fed mosquito visibly glows faintly at the abdomen — shoot it before it deposits, or it spawns 2 larvae at the nearest stagnant-water node. Killing fed mosquitoes is the actual game.
- **ipRow:** *Grounded* (mosquito as aerial raider), *Pikmin* (bulborb-style ecological predator), *Deep Rock Galactic* glyphid swarms. Distinct: theft-to-spawn economy — the mosquito is a resource conveyor you intercept, not a damage dealer.
- **healthCheck:** Drains from resource pools and lantern-fluid props, not bodies. Larvae deposit contaminates water nodes — environmental decay loop.
- **intensity:** LIGHT: flat cel-adjacent wings, airy buzz. HARDCORE: photoreal scale-texture wrap, translucent-wing iridescence, blood-weighted flight audio (heavier buzz when loaded).
- **biome:** The Stagnant Marsh → raids The Bunkhouse
- **realismTier:** photoreal-wrap — the single most recognized insect on earth; the Owner named it first for a reason.

---

### `parasite.flea`
- **role:** ballistic-swarmer — arrives in packs, nearly unhittable alone, trivially weak
- **voxelDims:** 5×4×3
- **voxelCount:** 28
- **silhouette:** Compressed hump with oversized rear-leg paddles. Reads as "an arrowhead that jumps."
- **buildRecipe:** `C(0,0,0,3,2,2); C(-1,0,1,1,2,1); N(3,1,0,0,C(0,-1,0,1,2,1)); N(3,1,0,0,C(0,2,0,1,2,1)); C(3,0,2,1,2,1)`
- **paletteSlots:** `P1 #5C4636 (dark chitin) · P2 #8A6E52 (leg joint) · P3 #D8D2C4 (bristle crest)`
- **rig:** legCompress×6, bodySpring, bristleFlare
- **clipIntent:** `coil_charge`, `launch_ballistic`, `skitter_recover`, `death_pop`
- **telegraph:** Coil crouch (visible squash, 0.6s) before every jump — jump arcs are fully predictable once you read the coil.
- **counterplay:** Ground-target AoE (stomp, dust bomb) — they cannot dodge what covers an area. Solo fleas deal chip damage; the threat is pack coordination, solved by positioning, not aim.
- **ipRow:** *Grounded* (mite swarms), *Hollow Knight* (Grimmkin darting), *Pikmin* (small-pest ecology). Distinct: pure ballistic-geometry enemy — the fight is about reading arcs, unique in the roster.
- **healthCheck:** Swarms target food stores and fabric props (contamination of supplies). No feeding close-up in either mode.
- **intensity:** LIGHT: matte lacquer finish, dry clicks. HARDCORE: photoreal bristle-map wrap, chitinous click-track layer, squash-and-glisten landing decal.
- **biome:** The Bunkhouse / The Kennel Run
- **realismTier:** photoreal-wrap — at swarm scale, individual texture detail is what separates "cartoon dots" from "oh god there are forty."

---

### `parasite.tick`
- **role:** anchor — burrows into terrain and structures, pulses, punishes careless removal
- **voxelDims:** 6×5×2
- **voxelCount:** 21
- **silhouette:** Flat disc with eight splayed legs and a forward capitol. The disc-with-rays reads perfectly at 25%.
- **buildRecipe:** `C(0,0,0,4,3,1); C(-1,1,0,1,1,1); N(4,1,0,0,C(0,-1,0,1,1,1)); N(4,1,0,0,C(0,3,0,1,1,1))`
- **paletteSlots:** `P1 #6E5A3A (engorged tan) · P2 #3A2E28 (capitol) · P3 #8A6E52 (leg) · P4 #2E3324 (eye cluster)`
- **rig:** legSplay×8, bodyEngorge (scale channel), capitolBurrow
- **clipIntent:** `quest_seek`, `burrow_anchor`, `pulse_feed`, `twist_resist`, `death_deflate`
- **counterplay:** Anchored ticks pulse a visible swelling rhythm — attack *between* pulses or take reflected contamination splash. Removing one from a structure requires the twist-tool channel; ripping it out raw leaves an infection-site hazard prop that must be burned. Patience is the mechanic.
- **ipRow:** *The Last of Us* (infected-as-environment), *Grounded*, *Limbo* (arachnid dread). Distinct: the removal minigame and the leave-a-hazard punishment come from real tick biology, not from any film's infected design.
- **healthCheck:** Anchors into wood, soil, and machine housings — decay of structures. Engorgement is shown as the tick's own body state, never as anything extracted from a person.
- **intensity:** LIGHT: smooth matte disc, soft pulse tone. HARDCORE: photoreal wrinkled-cuticle wrap, engorgement stretch maps, wet rupture particles on death.
- **biome:** The Kennel Run / The Bunkhouse perimeter
- **realismTier:** photoreal-wrap — the highest entomophobia-trigger creature in the roster; this is the exact case the intensity system exists for, and it must ship in both modes.

---

### `weird.assassinbug`
- **role:** corpse-armored duelist — wears its kills as removable armor
- **voxelDims:** 6×6×3
- **voxelCount:** 29
- **silhouette:** Bug with a ragged rectangular mass riding its back, deliberately off-center. The carried-corpse lump is the signature read.
- **buildRecipe:** `C(0,0,0,3,3,1); C(-1,1,0,1,1,1); C(-2,1,0,1,1,1); C(1,-1,1,3,4,1); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,3,0,1,1,1))`
- **paletteSlots:** `P1 #3A2E28 (own chitin) · P2 #6E7A52 (carried husk) · P3 #A65A3A (husk wounds)`
- **rig:** bodyLean, shellShift (armor slides on hits), legIK×6, rostrumSnap
- **clipIntent:** `stalk_low`, `impale_lunge`, `shell_absorb`, `shed_armor`, `death_bare`
- **telegraph:** Rostrum snap-click 0.5s before lunge; the shell visibly tilts in the direction it will dodge.
- **counterplay:** Damage lands on the worn husk first — break the shell (it sheds and flees briefly), then it's fast but fragile. Shed husks are lootable contamination samples. Fighting it bare is easy; fighting it dressed is the puzzle.
- **ipRow:** *Rain World* (ecological cruelty), *Dark Souls* mimics (worn-disguise threat), *Hollow Knight*. Distinct: armor-is-a-corpse is a direct translation of real assassin-bug behavior; no film owns "bug wearing its prey."
- **healthCheck:** Kills are other creature-mobs; the worn husk is decay made visible — the villain is parasitism itself, which is precisely the health frame.
- **intensity:** LIGHT: husk rendered as clean gray husk-mesh. HARDCORE: photoreal husk wrap with puncture marks, damp drag-trail particles.
- **biome:** RANGES: The Bunkhouse → The Stagnant Marsh → Reef Shallows (wears whatever it kills locally)
- **realismTier:** hybrid — the concept carries it; photo texture on the husk is a HARDCORE bonus, not a requirement.

---

### `weird.cymothoa`
- **role:** hostage-taker — replaces the "tongue" of fish-type mobs, converts them to guardians
- **voxelDims:** 8×3×2
- **voxelCount:** 17
- **silhouette:** Segmented pill with a fan-tail. Cheap, clean, indestructible at low LOD.
- **buildRecipe:** `N(5,1,0,0,C(0,0,0,1,2,1)); C(-1,0,0,1,2,1); C(5,0,0,1,2,1); C(6,0,0,1,1,1); C(6,1,0,1,1,1); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,2,0,1,1,1))`
- **paletteSlots:** `P1 #8A6E52 (pale segments) · P2 #5C4636 (segment seams) · P3 #D8D2C4 (underside)`
- **rig:** segmentCurl (chain ×5), uropodFan, legRow×6
- **clipIntent:** `drift_attach`, `seat_clamp`, `host_steer`, `dislodge_fall`, `death_curl`
- **telegraph:** Host fish swims with a subtle head-bobbing stutter and a pale mouth glow — learnable tells, no random conversion.
- **counterplay:** Kill the *isopod*, not the fish: precision shots to the mouth region free the host, which becomes a temporary ally. Killing the host outright destroys the sample reward. Aim discipline as mercy mechanic.
- **ipRow:** *Subnautica* (parasitic fauna), *Rain World* (creature-relations ecology), *Grounded*. Distinct: the real tongue-replacement behavior becomes a hostage-rescue mechanic — nature wrote this design; we're just crediting it.
- **healthCheck:** Host relationship framed as colonization of a creature, played as rescue gameplay. The fish is a mob, not meat.
- **intensity:** LIGHT: clean pale segmentation. HARDCORE: photoreal translucent-claw wrap, host-mouth interior detail pass.
- **biome:** Reef Shallows (attached to reef fish mobs)
- **realismTier:** hybrid — the Owner's "jaw-drop" comes from learning what it does, not from its skin.

---

### `weird.botfly`
- **role:** implant-specialist — plants larva nodes in props and machines, erupts on a timer
- **voxelDims:** 7×3×3
- **voxelCount:** 33
- **silhouette:** Fat tapered grub with mouth hooks and twin rear spiracles. Maximum-volume silhouette; survives any LOD.
- **buildRecipe:** `N(5,1,0,0,C(0,0,0,1,3,2)); C(-1,1,0,1,1,1); C(5,0,1,1,1,1); C(5,2,1,1,1,1)`
- **paletteSlots:** `P1 #D8D2C4 (pale grub) · P2 #8A6E52 (segment shading) · P3 #3A2E28 (hooks)`
- **rig:** segmentPeristalsis (×5), hookGrind, spiracleFlutter×2
- **clipIntent:** `burrow_enter`, `implant_node`, `gestate_swell`, `erupt_burst`, `death_slump`
- **telegraph:** Implanted nodes glow warm and hum, escalating over 45 seconds. Extraction window is generous and clearly marked.
- **counterplay:** Dig nodes out before eruption (short channel, interruptible). Erupted nodes spawn the adult and contaminate the prop until cleansed. Timer pressure, not reflex pressure.
- **ipRow:** *Scorn* (biological intrusion dread), *Half-Life* xen fauna, *Grounded* larvae. Distinct: the implant-extract loop is a defusal minigame built from real botfly biology; Scorn's imagery is avoided entirely.
- **healthCheck:** Nodes implant exclusively in props, crates, and machine casings. Eruption is a burst of spore-decay particles, not visceral matter, in BOTH modes — this creature's HARDCORE ceiling is deliberately capped.
- **intensity:** LIGHT: matte grub, dry crumble eruption. HARDCORE: photoreal skin-translucent wrap, wet eruption particles, gestation squelch loop.
- **biome:** The Bunkhouse / The Rustyard (loves machine insulation)
- **realismTier:** hybrid — grub forms read through silhouette alone; texture budget stays with the adults.

---

### `weird.horsehair`
- **role:** puppeteer — possesses critter mobs and drives them into water
- **voxelDims:** 9×1×2
- **voxelCount:** 11
- **silhouette:** A single knotted thread. The cheapest asset in the roster and unkillable by LOD.
- **buildRecipe:** `N(8,1,0,0,C(0,0,0,1,1,1)); C(3,0,1,1,1,1); C(6,0,1,1,1,1); C(8,0,0,1,1,1)`
- **paletteSlots:** `P1 #6E7A52 (hair body) · P2 #4A5238 (knots)`
- **rig:** ropeChain (×8), knotTwist×2
- **clipIntent:** `thread_drift`, `possess_dive`, `puppet_walk`, `exit_swim`, `death_unravel`
- **telegraph:** Possessed critters move with a stiff, jerky gait and a faint wet-string audio trail. Possession is always visible within 2 seconds if you know the gait.
- **counterplay:** Knock the host down (any stagger) and the hair exits to re-drift — catch it in open air where it's helpless. Water is its win condition; drain the pond node to end the encounter permanently.
- **ipRow:** *Inside* (puppeteer control dread), *Rain World* (creature possession ecology), *Scorn*. Distinct: the puppet mechanic is literal horsehair-worm biology; presentation is a thread, not a body-horror set piece.
- **healthCheck:** Possession targets critter mobs only. The "exit" is a slender thread slipping into water — unsettling through implication, clean through content.
- **intensity:** LIGHT: matte thread, soft string foley. HARDCORE: photoreal wet-strand wrap, viscous exit audio layer.
- **biome:** The Stagnant Marsh
- **realismTier:** hybrid — a thread needs motion, not maps.

---

### `weird.mantisshrimp`
- **role:** shockwave-bruiser — strikes that break shields, blocks, and formations
- **voxelDims:** 8×5×3
- **voxelCount:** 34
- **silhouette:** Armored torpedo with two folded front clubs and stalked turret eyes. Clubs and eye turrets survive 25% easily.
- **buildRecipe:** `C(0,0,0,3,3,2); C(-1,0,0,1,3,1); C(-1,0,2,1,1,1); C(-1,2,2,1,1,1); C(-2,-1,0,1,1,1); C(-2,3,0,1,1,1); N(3,1,0,0,C(3,0,0,1,2,1)); C(6,0,0,1,2,1); N(2,1,0,0,C(0,-1,0,1,1,1)); N(2,1,0,0,C(0,3,0,1,1,1))`
- **paletteSlots:** `P1 #3E5C66 (abyss teal carapace) · P2 #A65A3A (club accents) · P3 #D8D2C4 (underside) · P4 #2E3324 (joints)`
- **rig:** clubCock×2, clubStrike×2, eyeTurretTrack×2, tailFlex
- **clipIntent:** `patrol_strut`, `club_cock`, `sonic_strike`, `shield_shatter_react`, `death_curl`
- **telegraph:** The cock — clubs fold back and the eye turrets lock onto you for a full 0.9s, with a rising pressure whine. Longest telegraph in the roster; the strike is unavoidable, so the dodge window is generous.
- **counterplay:** Never block — the strike shatters guards and destructible cover. Sidestep during the cock, punish the 2s recovery. Its own shockwave cracks nearby brittle terrain, which you can bait it into.
- **ipRow:** *Subnautica* (aggressive reef fauna), *Monster Hunter* (charged-attack brutes), *Grounded* (orb-weaver strike pattern). Distinct: the real cavitation-bubble strike becomes a guard-break mechanic with a fair, readable windup — no film owns a mantis shrimp.
- **healthCheck:** Breaks structures and shields; aggression framed as territorial contamination of the reef. Strike VFX is a pressure shockwave, not gore, in both modes.
- **intensity:** LIGHT: matte banded armor, dry crack impact. HARDCORE: photoreal speckled-wrap, cavitation bubble shimmer shader, concussive wet impact layer.
- **biome:** Reef Shallows
- **realismTier:** hybrid — its fame is kinetic; the clubs and eyes do the acting.

---

### `deep.hagfish`
- **role:** area-denial — coats zones in slime that slows players and gums machines
- **voxelDims:** 9×2×2
- **voxelCount:** 16
- **silhouette:** Eel-form with barbels and a paddle tail. Minimal geometry, maximum readability.
- **buildRecipe:** `N(7,1,0,0,C(0,0,0,1,2,1)); C(-1,0,0,1,2,1); C(-2,0,0,1,1,1); C(-2,1,0,1,1,1); N(3,2,0,0,C(0,0,1,1,1,1)); C(7,0,0,1,2,1)`
- **paletteSlots:** `P1 #4A5238 (slime grey-green) · P2 #6E7A52 (sheen band) · P3 #2E3324 (barbels)`
- **rig:** ropeChain (×7), barbelWrithe×2, poreBloat×3
- **clipIntent:** `slither_patrol`, `slime_secrete`, `knot_feign_death`, `uncoil_flee`, `death_puddle`
- **telegraph:** Pore bumps inflate visibly along the flank 1s before secretion; a low wet hiss precedes the pool.
- **counterplay:** Slime pools slow and jam mechanisms but burn away with fire tools or dry-salt throwables. Feigned-death knot is a trap — attacking a knotted hagfish triggers the burst. Learn the knot, save your stamina.
- **ipRow:** *Subnautica* (repulsive-defensive fauna), *Death Stranding* (terrain-coating hazards), *Scorn*. Distinct: slime as a persistent editable terrain state — the fight is janitorial, which serves the contamination theme directly.
- **healthCheck:** Slime is environmental contamination — it decays machines and walkways, and cleaning it is progression. Death dissolves into a cleanable residue, never viscera.
- **intensity:** LIGHT: matte gel material, soft plop foley. HARDCORE: photoreal mucous sheen shader, stringy drip particles, wet respiratory loop.
- **biome:** The Midnight Trench
- **realismTier:** hybrid — the sheen shader IS the creature; a photo map would fight the gel material.

---

### `deep.barreleye`
- **role:** spotter — sees through cover and marks players for other trench mobs
- **voxelDims:** 5×4×3
- **voxelCount:** 24
- **silhouette:** Barrel dome with two glowing green lenses inside, flat hull below. The dome-with-dots is a legendary read at any LOD.
- **buildRecipe:** `C(0,0,0,4,2,1); C(0,0,1,2,2,2); C(0,0,2,1,1,1); C(0,1,2,1,1,1); C(2,-1,0,2,1,1); C(2,2,0,2,1,1); C(4,0,0,1,2,1)`
- **paletteSlots:** `P1 #3E5C66 (hull) · P2 #D8D2C4 (dome frame) · P3 #7FD4A8 (lens glow — telegraph-adjacent, permitted as sensory organ, not danger red)`
- **rig:** domeInnerGimbal (eyes rotate independently), finHover×2, tailSteer
- **clipIntent:** `drift_scan`, `spot_lock`, `flee_panicked`, `mark_call`, `death_sink`
- **telegraph:** When it spots you, both lenses physically rotate toward you and emit a two-note sonar chirp — you hear yourself being found.
- **counterplay:** Break line-of-sight using thermal-blocking cover (it sees through glass and foliage, not metal). Kill it silently before the mark-call finishes, or spend the next two minutes fighting everything it invited. Stealth-priority target.
- **ipRow:** *Subnautica* peeper (bioluminescent scout), *Iron Lung* (claustrophobic deep observation), *Outer Wilds* (vision-based threat design). Distinct: real barreleye anatomy (transparent skull, rotating eyes) becomes a wallhack-support AI — the science is the design.
- **healthCheck:** Pure surveillance creature; harms nothing directly. The glowing lens is curiosity, not menace — fits the decay/observation theme.
- **intensity:** LIGHT: frosted-opaque dome (stylized), soft chirps. HARDCORE: photoreal translucent-membrane dome with visible interior lens sockets, hydrophone ambience layer.
- **biome:** The Midnight Trench
- **realismTier:** hybrid — translucency is a shader problem, not a texture problem; the dome material does the work.

---

### `deep.seaspider`
- **role:** stilt-strider harvester — drains sap from kelp/coral nodes
- **voxelDims:** 5×4×2
- **voxelCount:** 14
- **silhouette:** Tiny body, absurd leg span. Eight needle legs on a pebble — instantly legible.
- **buildRecipe:** `C(0,0,0,2,2,1); C(-1,0,0,1,1,1); N(4,1,0,0,C(0,-1,0,1,1,1)); N(4,1,0,0,C(0,3,0,1,1,1)); C(0,0,1,1,1,1)`
- **paletteSlots:** `P1 #A65A3A (russet legs) · P2 #D8D2C4 (body) · P3 #3A2E28 (ocelli)`
- **rig:** legStiltIK×8, proboscisProbe, bodyBob
- **clipIntent:** `stride_gait`, `probe_tap`, `drain_siphon`, `startle_scatter`, `death_collapse`
- **telegraph:** Probing tap-tap-tap on the node before draining — three taps, then the sap-stream VFX starts. Audible across the reef floor.
- **counterplay:** It flees from vibration — stomp near it and it scatters, abandoning the node. Defend nodes by patrolling, not by chasing. It can't be fought conventionally and doesn't need to be.
- **ipRow:** *Iron Lung* (deep-sea wrongness), *Subnautica* (reef microfauna), *Death Stranding* (spindly strider unease). Distinct: real sea-spider proportions (body smaller than its legs) create an uncanny gait no studio has standardized.
- **healthCheck:** Harvests from kelp and coral nodes — resource-drain pressure on the reef ecosystem. No predation on player characters at all.
- **intensity:** LIGHT: matte russet, dry tapping. HARDCORE: photoreal tubular-leg wrap, viscous sap-audio layer.
- **biome:** Reef Shallows
- **realismTier:** hybrid — proportion is the whole show.

---

### `robot.socketleech`
- **role:** power-parasite — drills into generators and lamps, drains the grid, darkness follows
- **voxelDims:** 6×3×3
- **voxelCount:** 24
- **silhouette:** Boxed tick with a drill snout and a trailing cable gut. Machine-dialect silhouette, no organic curves needed.
- **buildRecipe:** `C(0,0,0,3,2,2); C(-1,0,1,1,2,1); C(-2,0,1,1,1,1); C(-2,1,1,1,1,1); N(3,1,0,0,C(0,-1,0,1,1,1)); N(3,1,0,0,C(0,2,0,1,1,1)); C(3,0,2,2,1,1)`
- **paletteSlots:** `P1 #5C5C64 (gunmetal) · P2 #8A6E52 (rusted joints) · P3 #D8D2C4 (warning stripe — static marking, not danger-red)`
- **rig:** drillSpin, clampGrip×2, magLegIK×6, cableWhip
- **clipIntent:** `crawl_seek`, `drill_mount`, `drain_hum`, `detatch_drop`, `death_spark`
- **telegraph:** Drill whine ramps over 1.5s before mounting; mounted units broadcast an audible grid-hum that gets louder as the area darkens.
- **counterplay:** Kill it mounted and the stored power returns to the grid (bonus). Kill it crawling and the power is lost. Rip it off manually for a shock — timed release tool exists. Light management as combat resource.
- **ipRow:** *Half-Life 2* barnacle (ceiling drain-parasite), *Portal* turret personality, *SOMA* (degraded machine pathos). Distinct: it parasitizes infrastructure, not people — the victim is the light itself, which no comparison owns.
- **healthCheck:** Victim is the power grid and the darkness it causes — neglect/decay of systems, squarely in-theme. No organics involved.
- **intensity:** Identical in both modes by default; HARDCORE adds a photoreal rust-and-grime wrap and capacitor-whine layer. Machines were never the phobia risk.
- **biome:** The Rustyard
- **realismTier:** voxel-stylised — machine parasites belong to the beveled-voxel industrial dialect; photoreal here would fight the art law, not serve it.

---

### `robot.soldernat`
- **id correction:** `robot.soldergnat`
- **role:** lubricant-thief — drains machines into degradation, swarms like its organic template
- **voxelDims:** 6×4×3
- **voxelCount:** 22
- **silhouette:** The mosquito's machine ghost: rotor wings, needle fuel-probe, hanging reservoir abdomen.
- **buildRecipe:** `C(0,0,0,2,2,2); C(2,0,1,3,1,1); C(-1,0,1,1,2,1); C(-2,0,1,1,1,1); C(1,2,2,2,1,1); C(1,-1,2,2,1,1); N(2,1,0,0,C(0,-1,0,1,1,1)); N(2,1,0,0,C(0,2,0,1,1,1))`
- **paletteSlots:** `P1 #5C5C64 (frame) · P2 #A65A3A (reservoir tank) · P3 #D8D2C4 (rotor discs)`
- **rig:** rotorSpin×2, probeExtend, reservoirSlosh, legDangle×4
- **clipIntent:** `hover_loiter`, `tap_drain`, `flee_heavy`, `dump_reserve`, `death_fall`
- **telegraph:** Rotor pitch drop during tap; drained machines visibly sag and their ambient loops detune.
- **counterplay:** Repellent EMP pylons (craftable) clear an area. Heavier-than-normal gnats (post-drain) fly slower — shoot the loaded ones, same interception logic as the organic mosquito, teaching transferable skills across biomes.
- **ipRow:** *Half-Life 2* manhack (swarming blade-drone), *Portal* (small machine menace), *SOMA*. Distinct: it degrades machines via theft, creating maintenance gameplay — a logistics parasite, not a combat drone.
- **healthCheck:** Machine-on-machine parasitism; degradation of neglected equipment is the villain. Fully in-frame.
- **intensity:** Same both modes; HARDCORE adds oil-leak drip particles and strained-motor audio.
- **biome:** The Rustyard
- **realismTier:** voxel-stylised — industrial dialect, deliberate mirror of `parasite.mosquito` for cross-biome skill transfer.

---

### `robot.huskweaver`
- **role:** rider — mounts other robots, overrides their targeting, puppets them
- **voxelDims:** 6×4×2
- **voxelCount:** 16
- **silhouette:** A saddle-shaped hitchhiker with clamp legs and a trailing cable tail. Reads as "something is riding that machine."
- **buildRecipe:** `C(0,0,0,3,2,1); N(2,2,0,0,C(0,-1,0,1,1,2)); C(-1,0,0,1,2,1); C(-2,0,0,1,1,1); N(3,1,0,0,C(3,0,0,1,1,1))`
- **paletteSlots:** `P1 #3A2E28 (housing) · P2 #5C5C64 (clamps) · P3 #A65A3A (cable sheath)`
- **rig:** clampGrip×4, headScan, injectorJab, cableTrail (rope ×3)
- **clipIntent:** `leap_mount`, `clamp_seat`, `override_jack`, `eject_bail`, `death_deadweight`
- **telegraph:** Target robot's eye-light flickers amber and its gait stutters 1s before override completes — a window to shoot the rider off.
- **counterplay:** Precision shot to the rider (it's exposed on top) forces eject; the abandoned robot resumes friendly-neutral behavior. Area EMP knocks all riders off at once — expensive but decisive. The robot isn't the enemy; the passenger is.
- **ipRow:** *Prey* mimics (thing-that-isn't), *System Shock 2* (hijacked machinery), *SOMA*. Distinct: visible-rider hijacking with a rescue outcome — you save the machine, uniquely heroic for a parasite roster.
- **healthCheck:** Rescue-the-machine framing; the parasite is neglect of maintenance made animate. Clean.
- **intensity:** Same both modes; HARDCORE adds sparking override-jack particles and corrupted-radio chatter layer.
- **biome:** The Rustyard → anywhere robots operate (true ranger)
- **realismTier:** voxel-stylised — industrial dialect.

---

### `deep.anglerfish`
- **role:** lure-ambusher — the light is the trap AND the economy
- **voxelDims:** 6×5×4
- **voxelCount:** 34
- **silhouette:** Ball of teeth with a fishing rod. The illicium-and-bulb line survives any reduction.
- **buildRecipe:** `C(0,0,0,4,3,2); C(2,1,2,1,1,1); C(3,1,3,1,1,1); C(-1,0,0,1,3,1); C(2,-1,0,1,1,1); C(2,3,0,1,1,1); C(4,0,0,1,3,1)`
- **paletteSlots:** `P1 #2E3324 (abyss black-green) · P2 #3E5C66 (fin edges) · P3 #D8D2C4 (teeth) · P4 #7FD4A8 (lure glow — sensory organ, not danger-red)`
- **rig:** jawUnhinge, illiciumSway, lureFlicker, finPaddle×2
- **clipIntent:** `lure_idle`, `stalk_glide`, `strike_engulf`, `lure_dangle_play`, `death_lightout`
- **telegraph:** The lure itself — it flickers in a rhythmic pattern when hunting and goes steady when committed to a strike. Players learn to read the lamp.
- **counterplay:** Shoot the lure to blind it (it thrashes blindly, dangerous but dodgeable), or extinguish your own lights and walk past — it hunts by its own lamp. Killing it permanently darkens that trench pocket until a lure-item is recovered from the corpse: light as a lootable resource.
- **ipRow:** *Outer Wilds* anglerfish (blind-lure dread), *Subnautica*, *Iron Lung*. Distinct: the lure is a harvestable light-source economy object — killing the anglerfish changes the level's lighting, which none of the comparisons do.
- **healthCheck:** Ambush predator of creatures and drones; engulf is a swallow-into-darkness fade, never shown anatomically. The dark is the harm.
- **intensity:** LIGHT: steady soft lure glow, muted roar. HARDCORE: photoreal skin-flap and teeth wrap, lure-flicker strobe, pressure-groan audio layer.
- **biome:** The Midnight Trench
- **realismTier:** hybrid — silhouette and light carry it; HARDCORE texture is gravy on the Owner's favorite kind of animal.

---

**Deferred this pass (named so the completeness count catches them):** `deep.vampiresquid` (cloak-flip needs a deformable membrane the voxel dialect can't author yet — probe-then-recalibrate job), `deep.giantisopod` (correct bulk exceeds the 40-cell ceiling — recalibration candidate, not a free resize), `deep.seaangel` (depends on the translucency shader being scoped — see hostile read §5).

---

## PART 3 — BIOME MAP

| Biome | Drain economy | Residents |
|---|---|---|
| **The Bunkhouse** | warmth/rest (bedding, stores, fabric) | bedbug, flea, kissing bug (night), botfly nodes, tick (perimeter) |
| **The Stagnant Marsh** | vitality/fluid (water nodes, kelp sap) | leech, mosquito (home), horsehair worm, kissing bug (day refuge) |
| **The Kennel Run** | warmth-in-transit (ground nests, passing hosts) | tick (primary), flea (secondary) |
| **Reef Shallows** | sap/light (coral, kelp, reef fish) | cymothoa, mantis shrimp, sea spider |
| **The Midnight Trench** | light/pressure (lures, lamps, silence) | hagfish, barreleye, anglerfish |
| **The Rustyard** | power/coolant (grid, lubricant, signal) | socket leech, solder gnat, husk weaver |
| **Rangers (multi-biome)** | — | assassin bug (follows kills across three biomes), mosquito (marsh→bunkhouse raids), husk weaver (follows robots anywhere) |

**Grouping rationale:** each biome runs one *drain economy*, so each biome teaches one counterplay kit (fire/inspection in the Bunkhouse, scraping/smoke in the Marsh, EMP/light-management in the Rustyard, darkness-literacy in the Trench). Rangers exist specifically to satisfy the Owner's "mobs that range across areas" without diluting the per-biome lesson — a ranger is scary *because* your counterplay kit doesn't fully apply.

---

## PART 4 — HOSTILE READ OF THE BRIEF

1. **The brief misdiagnoses its own most important feature.** "HARDCORE vs LIGHT" frames an accessibility necessity as a toughness choice. A photoreal tick at 3× scale is a clinical entomophobia trigger; shipping it as the "brave" option invites exactly the community dynamics (light = coward mode) the brief fears. I've made LIGHT the default and renamed nothing yet — but the mode *names* themselves leak. "Hardcore" printed on a settings screen tells every nine-year-old what the game thinks of them. Rename before ship: **"Natural / Stylised"** or similar. This will feel like a downgrade to the Owner; it is the single highest-leverage fix in this document.

2. **"Scaled up, scary" collides with the 4–40 cell ceiling, and the brief pretends it doesn't.** Scale is world-space, not mesh-density. A 40-cell tick rendered at 3 meters is terrifying; a 400-cell tick rendered at 3 meters is the same picture with a longer load time. The brief conflates the two and will generate a recalibration fight it doesn't need. What's missing is an explicit **world-scale ratio table** (creature → in-world meter height) ratified alongside the cell budget. I've designed to the existing ceiling; someone should write the ratio table down before the generator does it wrong.

3. **Six bloodsuckers, one verb.** Left alone, every parasite converges on "attaches, drains over time, die to remove it" — five reskins of one mechanic. The brief demands mechanical distinctness but provides no verb budget. I've imposed one (ambush / stealth-raid / latch-scrape / dart-steal / ballistic-swarm / anchor-pulse), but the Owner should ratify the verb list explicitly, because it defines the combat sandbox more than any stat sheet.

4. **The parasitic robots have no economy to parasitize.** The brief asks "what does it drain?" and then doesn't answer it — because the answer depends on whether the game *has* a machine-power/lubricant/signal economy. I invented one (grid power, lubricant, robot hijacking). If that economy doesn't exist in the build, all three robots are decoration and should be cut rather than shipped hollow. This needs an Owner answer, not a designer assumption.

5. **Translucent deep-ocean creatures vs. an opaque beveled-voxel dialect is a real contradiction the brief waves through.** "How does translucency survive a low-poly beveled treatment" is not a styling question — it's an unscoped shader feature (frosted/translucent materials with interior rendering). Either scope that shader now or accept that the trench roster ships opaque and loses half its identity. I've designed around frosted-opacity as a stopgap; it works, but it's a compromise someone should sign off on knowingly.

6. **The untranscribed phrase is a landmine in a quotable document.** "Edward poo theme" sits in a brief that will be screenshotted, cited, and built against for months. It should be moved to a quarantined appendix today, not left inline where a future generator run treats it as canon. I've quarantined it in this deliverable; the source document needs the same treatment.

7. **Dual-mode copy doubles the localization surface and nobody budgeted it.** Two codex strings per creature, intensity-neutral achievements, dual audio banks — every leak surface closed in §1.6 adds strings and audio assets that must translate cleanly. The brief treats the intensity system as an art problem; it's also a content-ops tax that scales with every future creature. Budget it once, now, or every expansion re-discovers it.
