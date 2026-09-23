# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-enemy-roster-brief-2026-08-26.md
**Seed:** (none)
**Tokens:** 1724 in / 8444 out · **Cost:** ~$0.0000 · **Wall:** 253.1s · **finish:** stop

---

```
id:              enemy.fryling
role:            swarm
voxelDims:       2 x 3 x 2
voxelCount:      6
silhouette:      A stubby wedge with one tall spur off the back-left corner; at 25% tris it still reads as a leaning shard with a horn, never a cube.
buildRecipe:     "base 2x1x2 at (0,0,0); spur 1x2x1 at (1,1,0)"
paletteSlots:    --world-night (charred body mass); --world-stone (scorched crust plating on base); --world-resource (grease glint on spur tip)
rig:             skeleton.creature-small.v1
clipIntent:      idle: two-frame skitter shiver, spur twitches 5°.  move: low bounding hop, base stays parallel to ground.  attack: spur cocks back 30° then full-body lunge one body-length.  hit: lateral knockback with 1-frame squash on base.  death: collapse into base cluster, spur tips over last.
telegraph:       The spur visibly cocks backward 30° and holds one beat before the lunge — readable as motion, not colour.
counterplay:     Linear lunge = sidestep (movement); hydration splash pools them for group clear.
ipRow:           Pikmin bulborbs (scale/swarm), Deep Rock Galactic glyphid grunts (melee swarm pressure), Minecraft silverfish (rejected reference — banned likeness); distinct because beveled food-scrap material language and a one-horn asymmetric read.
healthCheck:     Depicts burnt frying residue given motion; no body, no physique, no person.
```

```
id:              enemy.patty-larva
role:            armored
voxelDims:       5 x 2 x 2
voxelCount:      10
silhouette:      A low segmented tube with a raised crest plate near the head; at 25% it reads as three beads and a bump — segmentation survives decimation.
buildRecipe:     "rear segment 2x1x2 at (-2,0,0); mid segment 2x1x2 at (0,0,0); head 1x1x1 at (2,0,1); crest 1x1x1 at (0,1,0)"
paletteSlots:    --world-stone (dorsal plates on rear+mid); --world-night (flesh seams between segments); --world-resource (rendered-fat sheen on crest)
rig:             skeleton.creature-small.v1
clipIntent:      idle: slow peristaltic swell, crest bobs 1 voxel-unit.  move: inchworm compression — rear slides to mid, head leads.  attack: crest inflates, straight-line charge.  hit: segment stagger, plates shift 1 unit out of alignment.  death: SPLITS — rear and mid+head become two independent 4-cell actors (registry must accept spawn-on-death, see §5.3).
telegraph:       Crest inflates to full height and holds before the charge; deflated crest = safe window.
counterplay:     Fiber snare laid across its path prevents the split (both halves die as one); hydration erodes the stone plates to strip armor.
ipRow:           Hollow Knight crawlers (segmented armor), Dead Cells scorpions (charge tell), Terraria worms (split-on-death); distinct because the split is a fiber-counterable mechanic, not raw HP phases, and plates are grease-render not chitin.
healthCheck:     Rendered fat and spoiled protein in decay stages; no anatomy, no body type.
```

```
id:              enemy.crumb-roach
role:            ambush
voxelDims:       4 x 2 x 2
voxelCount:      10
silhouette:      A flat oval carapace with a single antenna and an offset tail spur; at 25% it reads as a low shield with one whisker — the asymmetry carries the read.
buildRecipe:     "body 3x1x2 at (0,0,0); pronotum 2x1x1 at (0,1,0); antenna 1x1x1 at (2,1,1); tail spur 1x1x1 at (-1,0,1)"
paletteSlots:    --world-night (carapace); --world-stone (molt-crack plating on pronotum); --world-resource (crumb fleck caught on shell)
rig:             skeleton.creature-small.v1
clipIntent:      idle: antenna sweeps 20° arc, body flat and still.  move: rapid low scuttle, pronotum leads.  attack: flatten-and-vanish crouch (drops to body-only height) then flank dash.  hit: flip threat — 50% chance lands inverted, self-rights in 1s.  death: carapace cracks along the molt line, halves splay.
telegraph:      The antenna stops sweeping and snaps to point at the player's flank position one beat before the dash.
counterplay:     Greens vision pulse reveals it during crouch-flatten (it cannot fully hide mold fringing); movement dodge on the antenna-snap.
ipRow:           Elden Ring giant land squirts (ambush startle), Risk of Rain 2 lemurians (flank AI), Animal Crossing roaches (rejected — comedic register); distinct because the ambush is telegraphed through a single antenna read at silhouette level.
healthCheck:     Mold-feasted scavenger carrion-adjacent creature; no humanoid traits.
```

```
id:              enemy.grease-fly
role:            area-denial
voxelDims:       3 x 3 x 2
voxelCount:      5
silhouette:      A tiny suspended teardrop with one raised wing and a hanging proboscis; at 25% it reads as a drifting comma with a drip.
buildRecipe:     "thorax 2x1x1 at (0,1,0); abdomen 1x1x1 at (-1,1,0); wing 1x1x1 at (0,2,0); proboscis 1x1x1 at (1,0,0)"
                 # CORRECTED 2026-08-26 by the generator's connectivity check: the wing was authored at
                 # (0,2,1), which is diagonal from the thorax and touches nothing — the author's own §4 rule
                 # ("clusters must touch or overlap"). Moved to (0,2,0): directly above the thorax, still a
                 # raised wing, now connected. Original preserved in this comment.
paletteSlots:    --world-night (body); --world-water (oily iridescent wing); --world-resource (fat drip at proboscis tip)
rig:             skeleton.creature-small.v1
clipIntent:      idle: figure-eight hover, wing flutters at 2 frames.  move: strafing drift, proboscis pendulums.  attack: proboscis dips, drops a slick blob at own feet (leaves persistent ground hazard).  hit: tumble spin, altitude loss.  death: falls, pops into a 1-cell splat decal.
telegraph:       Full hover-stop with proboscis dipping to vertical — one beat before the drop.
counterplay:     Hydration dissolves the slick pools it leaves; movement keeps you out of the drip radius while it is paused.
ipRow:           Half-Life barnacle (hanging hazard), Hades chariot flies (harass flier), Splatoon ink coverage (rejected — brand shape risk); distinct because denial is persistent floor state the player cleanses, not damage ticks.
healthCheck:     Liquid grease given wings; a material behaving badly, not a body.
```

```
id:              enemy.pizza-husk
role:            elite
voxelDims:       4 x 3 x 2
voxelCount:      15
silhouette:      A leaning triangular slab with a broken crust ridge on the back edge and one hanging drip; at 25% it reads as a tilted sail — the lean is the identity.
buildRecipe:     "base 3x1x2 at (0,0,0); slope tier 2x1x2 at (0,1,0); tip 1x1x1 at (0,2,0); crust ridge 2x1x1 at (0,2,1); drip 1x2x1 at (-1,0,0)"
paletteSlots:    --world-resource (baked crust gold); --world-stone (charred undercrust); --world-night (hollow interior visible at lean gaps)
rig:             skeleton.creature-small.v1
clipIntent:      idle: slow 5° rock on base edge, drip stretches.  move: ponderous pivot-and-slide, tip gouges ground.  attack: leans back 30°, tip-first charge ending in a ground slam shockwave.  hit: chips fly (crust ridge loses 1 voxel visually), lean deepens.  death: topples onto its long face, breaks at the tier seam.
telegraph:       The 30° back-lean with the tip tracking the player — a physical wind-up readable in shadow.
counterplay:     Hydration jet quenches the charge mid-run (steam-stun window); fiber anchor roots it during the lean so the slam whiffs.
ipRow:           Souls knights (elite pacing), Doom hell knight (arena duelist), TMNT pizza monsters (rejected — branded adjacency); distinct because it is architecture-shaped spoilage, a fallen structure not a creature or mascot.
healthCheck:     A discarded slice structurally failing through rot; object decay, zero anatomy.
```

```
id:              enemy.rot-maitre-d
role:            prop
voxelDims:       3 x 6 x 2
voxelCount:      27
silhouette:      A tall hollow coat on a stand with one sleeve and a draped napkin; at 25% it reads as a crooked monolith with a white collar — presence without a performer.
buildRecipe:     "torso 2x4x2 at (0,0,0); shoulders 3x1x2 at (0,4,0); head stand 1x1x1 at (0,5,0); sleeve 1x3x1 at (-1,2,0); napkin 1x1x1 at (-1,5,0)"
paletteSlots:    --world-night (mildewed coat cloth); --world-type (bone-white collar and napkin); --world-stone (serving tray fused into the shoulder)
rig:             none
clipIntent:      none — static prop; pipeline skips clip validation for rig:none assets.  Suggested still-frame pose authored directly into the blockout (sleeve raised as if presenting).
telegraph:       n/a — does not act. Its aura (a slow table-setting ring decal it anchors) expands on a fixed timer; the ring itself is the tell.
counterplay:     Greens cleanse the anchored ring to shrink the aura; hydration on the prop itself starts the capture channel that ends the wave phase.
ipRow:           Bioshock plaster splicers (rejected — figure too human), Dark Souls NPC statues (set-piece menace), Little Nightmares mannequins (garment-as-presence); distinct because there is deliberately NO body inside — the force-feeding cut removed the performer, leaving service-industry neglect as a monument.
healthCheck:     An abandoned uniform colonized by mold; explicitly not a person — the coat is empty by design.
```

```
id:              enemy.drip-cyst
role:            prop
voxelDims:       3 x 4 x 2
voxelCount:      14
silhouette:      A swollen bulb on a squat base with one spout and one side-blister; at 25% it reads as a lopsided sac on a plinth.
buildRecipe:     "base 2x1x2 at (0,0,0); bulb 2x2x2 at (0,1,0); spout 1x1x1 at (1,3,0); blister 1x1x1 at (-1,1,0)"
paletteSlots:    --world-water (ooze fill, visible at spout); --world-grass (mold bloom across bulb shoulder); --world-night (translucent membrane read)
rig:             none
clipIntent:      none — static prop; spawn behaviour is game-logic driven, not animated. Membrane pulse is a shader/breathing-vertex pass, not a skeleton clip.
telegraph:       The bulb inflates one full voxel-unit over 0.5s before each spawn burst — size change, not colour.
counterplay:     Destroy it first — it emits grease-fly instances every 8s until killed; hydration poured on its base slows the spawn cadence by 50%.
ipRow:           Left 4 Dead bile nodes (hazard attractor), League Ziggs nests (rejected — champion IP), Spore nest pods (spawn structure); distinct because it converts area-denial into a target-priority decision, giving the roster its only "kill order" puzzle.
healthCheck:     A bacterial bloom fruiting from standing grease; microbiology, not biology-of-a-person.
```

```
id:              enemy.rind-bulwark
role:            armored
voxelDims:       5 x 3 x 2
voxelCount:      16
silhouette:      A broad low shell with a single dorsal ridge, one claw forward and one leg spur back; at 25% it reads as a door with feet.
buildRecipe:     "shell 3x2x2 at (0,0,0); ridge 2x1x1 at (0,2,0); claw 1x1x1 at (3,0,0); leg spur 1x1x1 at (-1,0,1)"
paletteSlots:    --world-stone (rind plating); --world-resource (tallow sheen along ridge); --world-night (joint gaps)
rig:             skeleton.creature-small.v1
clipIntent:      idle: ridge flexes slowly, shell settles.  move: heavy stomp-walk, shell rocks side to side.  attack: rears onto the ridge and slams — projects a grease film onto nearby allies (damage reduction aura).  hit: plate shift, film flickers off for 1s.  death: shell collapses flat, film pops off all beneficiaries.
telegraph:       The rear-up onto the dorsal ridge — shell tips past 45° and holds before the slam/projection.
counterplay:     Hydration strips the film from its allies (and halves its own armor while wet); movement kites it away from the pack so the film finds no targets.
ipRow:           Overwatch Reinhardt barrier (rejected — readable fake-tech risk), Divinity 2 oil elemental (material match), XCOM ADVENT shieldbearer (support-role match); distinct because the shield is a physical grease film the player washes off rather than a health bar.
healthCheck:     Hardened tallow rind, waste congealed into plating; a substance, never a physique.
```

```
id:              enemy.glaze-decoy
role:            ambush
voxelDims:       4 x 3 x 2
voxelCount:      11
silhouette:      A rounded dome with a bright single-cell cap and two splayed pseudopods; at 25% it reads as a lump wearing a coin.
buildRecipe:     "dome 2x2x2 at (0,0,0); glint cap 1x1x1 at (0,2,0); pseudopod fore 1x1x1 at (2,0,1); pseudopod aft 1x1x1 at (-1,0,0)"
paletteSlots:    --world-resource (bait glint cap — deliberate false reward signal); --world-night (true body beneath); --world-grass (mold fringe at the base seam)
rig:             skeleton.creature-small.v1
clipIntent:      idle: perfect stillness — this is the disguise state.  move: none by design (it does not travel).  attack: dome splits open and enrobes the player in a slow-debuff splash when approached within 1.5 units.  hit: disguise breaks instantly, glint cap slides off.  death: deflates through the dome seam.
telegraph:      Deliberately near-none — one 1-frame settle wobble inside trigger radius plus an audio squelch; the counterplay IS the telegraph-check loop.
counterplay:     Hydration splashed on any resource pickup before pickup: real rewards bead and shine, the decoy absorbs it and darkens. Fiber tether lets you pull the cap off from range safely.
ipRow:           Dark Souls mimic (chest-trap archetype), Zelda Like-Likes (bait ambush), gacha chest-monsters (rejected — loot-box visual ban); distinct because the lure exploits the game's own reward colour law, making verification a learned skill not a UI prompt.
healthCheck:     Sugar-glaze skin over rot; deception as contamination theme, no body depicted.
```

---

## 5. Closing items

**1. Roster rationale.** The wave-based cleanse loop needs, in order: cheap pressure (fryling), a durability check (patty-larva), spatial tension (crumb-roach flanks), territory the player must actively reclaim (grease-fly slicks), a wave-capstone duel (pizza-husk), and systems that make the player *choose* targets rather than mop (drip-cyst forces kill-order, rind-bulwark punishes unstructured clumping, glaze-decoy punishes greedy pickup habits). The maître d' prop anchors the finale as a capture objective rather than a fight, honoring the cut force-feeding beat. This is a full pressure→priority→objective arc with no two enemies answering the same player question.

**2. Build order.** Author **fryling, patty-larva, grease-fly** first. Fryling validates the pipeline end-to-end against the known-good proof asset at nearly identical scale (6 vs 5 voxels — any tri-count anomaly is immediately attributable). Patty-larva stresses the *worst-case* validator path (spawn-on-death registry hook, see below) earliest, when rework is cheapest. Grease-fly is the smallest cell count (5) and exercises instancing plus a persistent ground decal — the two pipeline features nothing else touches. Everything else reuses patterns proven by these three.

**3. Hostile review of §1–§4.**
- **§3 `clipIntent` vs `rig: none` contradiction.** The template mandates five clip lines for every enemy, but §2 allows props. I've written "none" into those fields; the generator script needs an explicit rule that `rig: none` voids clip validation, or every prop spec will fail parsing. Fix the template or fix the parser — pick one.
- **§4 box grammar biases symmetry.** Axis-aligned boxes centered at origin naturally produce mirrored stacks; the "no perfect mirror symmetry" rule fights the format. My recipes comply via offset sub-clusters, but the script should assert asymmetry programmatically (e.g., reject if the occupied-cell set equals its own X-mirror) rather than trusting authors.
- **§2 split mechanic has no pipeline hook.** Patty-larva's death-split implies spawn-on-death. Nothing in the manifest schema described covers child actor registration. If the validator doesn't model it, the split silently becomes a visual-only effect — decide whether that's acceptable before I finalize the death clip.
- **§1 palette law leaves `--world-portal` orphaned.** Eight tokens, four slots, danger reserved — but portal ("single action") is never usable on an enemy body under any reading, and no enemy here uses it. Either permit it for capture-objective props (the maître d''s ring would legitimately want it) or delete it from the enemy-facing subset of the law.
- **§2 collision ceiling is ambiguous.** "Collision ≤ 25%" — of LOD0 tris, or of hull volume vs blockout volume? The proof asset (16-tri hull on 260-tri LOD0 ≈ 6%) passes either reading, but a flat wide enemy like crumb-roach will diverge sharply between the two metrics. Specify.
- **§0 "one enemy per response is wrong" is doing a lot of load-bearing work.** Correct call given rate limits — but note that a 9-block single response is also the worst case for a partial-parse failure. Recommend the generator accepts a multi-document stream and commits per-block, so a truncated response still yields 7 usable assets instead of 0.
