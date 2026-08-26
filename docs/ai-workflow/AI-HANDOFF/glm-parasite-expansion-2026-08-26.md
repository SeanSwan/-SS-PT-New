# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/aftertaste-parasite-expansion-brief-2026-08-26.md
**Tokens:** 1866 in / 32000 out (reasoning: 28159) | total 33866
**Wall:** 664.1s

---

**OPEN QUESTION, flagged per instruction and not guessed at:** *"Edward makes an Edward poo theme"* — unknown meaning, unknown target. I've quarantined it to the strings layer (descriptors are mode-local, so if it turns out to be a naming/theming instruction it lands there cheaply). Nothing below is built against it. Get the Owner's clarification before manifest freeze.

---

# §1 — THE INTENSITY SYSTEM

**D1 — The axis is sensory fidelity, not threat. Four axes move; three are pinned.**

Moving axes: **(1) surface realism** (voxel-stylised ↔ photoreal-wrap), **(2) fluid/gore FX class** (dry ↔ wet: burst decals, feeding residue, engorgement rupture), **(3) foley layer** (dry chitin ↔ wet feeding/suction layer), **(4) strings** (descriptors, codex text).

Pinned axes: **jump timing** (telegraphs are counterplay; see D5), **spawn density** (count is difficulty wearing a horror costume — a stylised swarm of 12 and a photoreal swarm of 12 are the same fight and opposite experiences; that's the free intensity, take it there), and **mechanical state geometry** (a fed tick is 160% scale in both modes, because that's information; the *rupture* is FX and moves).

The dividing rule the whole system hangs on: **if it changes what the player knows or can do, it never moves; if it changes how the knowing feels, it moves.**

And name the real payload honestly: photoreal exoskeletons at 3× scale are a clinical entomophobia trigger, not an art style. So in validation terms, `photoreal-wrap` is treated as a **gore-equivalent class** — same reachability bans, same leak audits.

**D2 — One asset. Same mesh, same rig, same LODs, one Blender run. The variant is a parallel material set + FX/clip/audio bank.**

LIGHT is not a desaturated photoreal — it is a hand-authored Law-B stylised set, the house look, first-class. Neither mode is "the real one." Cost profile: one mesh, one rig, one LOD chain (the ceilings apply to the shared mesh), plus one extra material set, one extra foley bank, and clip variants only where body horror lives in the animation (latch/feed holds).

Geometry never forks: **mechanical states are bones and scale — identical in both modes; visceral consequences are FX — hardcore only.** This also makes the toggle hot-swappable mid-session with zero loading, which D4 depends on. Precedent: Grounded's arachnophobia mode swaps spider *presentation* while everything around them stays constant — proof the axis is separable and that players trust a presentation-only toggle.

**D3 — It lives in three places; only the first is author-facing. Everything downstream is a checkable assertion.**

1. **Per-asset manifest dual block — both keys required or the manifest is refused** (exhaustiveness rule; this is the anti-LIGHT-rot mechanism — you cannot ship a hardcore-only creature, and you cannot ship "light later"):

```
intensity: {
  light:    { materialSet: mat_tick_light, fxBank: fx_dry,  audioBank: aud_dry,  clips: clipSet_A, descriptor: "Wood Tick", codex: "tick_l1" },
  hardcore: { materialSet: mat_tick_photo, fxBank: fx_wet,   audioBank: aud_wet,  clips: clipSet_B, descriptor: "— engorged female, Ixodes", codex: "tick_h1" }
}
```

2. **A registry/profile mode flag** selecting which block loads. Runtime, hot-swappable, stored per-profile (not per-device — a shared family machine can't leak a sibling's mode).
3. **Build-time validation, three checks:** (a) **reachability walk** — spawn table → prefab → renderer → material → texture; the LIGHT graph must contain zero `textureTier: photoreal-wrap` materials, zero `class: gore` FX, zero `tag: wet` clips; (b) **byte proxy** — LIGHT albedos must quantize to ≤4 color clusters (a photographic albedo fails the entropy check; "light has no photoreal texture" becomes a test, not a promise); (c) **the four-directory rule** — repackage both mode builds and diff; any byte difference outside `materials/ fx/ audio/ strings/` fails the build.

Explicitly **not** a runtime shader branch (a branch implies shared texture bytes — the entire point is different bytes) and **not** a build flag (two SKUs, divergent test matrices, cache and storefront leaks).

**D4 — Default LIGHT. First-run mode card. Settings any time, applied instantly, PIN-lockable.**

New profiles get LIGHT, no exceptions — the product has minors, first impressions are irreversible, and the Owner's own "Scary. Kind of." says fear here is opt-in. The onboarding card shows the **same tick rendered in both tiers side by side** — an honest one-tap pitch, skippable. Post-onboarding discoverability: the first photoreal-tier creature encountered under LIGHT triggers a one-time prompt ("This is the LIGHT look — Settings → Intensity"). Changes apply mid-scene with no reload (D2 makes it a bank swap) — a guardian can de-escalate the moment it's needed, which is the entire point of a toggle on a family product. A guardian profile can **PIN-lock the mode**; see hostile read §4.7 for why that's not optional.

**D5 — The Invariance Contract: what never differs.**

Identical in both modes: spawn tables, AI, hitboxes, damage, speeds, telegraph timings *and* telegraph color (`--world-danger`), loot, progression, codex entry IDs, achievements (names and conditions), biome ranges, encounter scripting. The four-directory rule (D3) enforces this mechanically — the mode diff literally cannot touch a tuning file. Reasoning: an intensity toggle that is also a difficulty toggle is two products and a permanent balance fork, and LIGHT becomes a tutorial nobody respects. SOMA's safe mode proved the separation works in the inverse direction (difficulty moved, horror didn't); we move horror and pin difficulty. Consequence to state on the mode card in plain text: **LIGHT is not easier.** Otherwise players self-select wrong.

**D6 — Leak surfaces and closures.**

- **Audio:** two foley banks; wet-tagged clips banned from the LIGHT graph by reachability (D3).
- **Stills/posters/marketing:** all promo renders pinned `mode=light`; override requires an explicit signed flag in the render manifest.
- **Codex:** text is mode-local; no "switch modes to see more" teasers — the teaser is itself a leak.
- **Achievements:** shared domain, so authored to LIGHT standard from birth (they render in both).
- **Loading screens/tips:** strings layer, mode-local.
- **The name:** base name is **shared** — two players in different modes must be able to talk about the same mob, or the mode forks the social layer. The *descriptor* is mode-local (LIGHT: plain folk name; HARDCORE appends the clinical line).
- **UI icons:** always rendered from LIGHT materials — one icon set, zero leak, zero fork. Music: shared; only foley forks.

**D7 — HARDCORE gets depth, not content. Additive in experience, subtractive in nothing.**

HARDCORE adds: the photoreal tier, the wet FX class, the feeding clip set, the foley detail layer, and clinical codex depth (real-species notes — the documentary pleasure). LIGHT keeps every creature, biome, mechanic, codex entry, and achievement. No hardcore-only mobs, no gated progression, no badge. Where a creature seems un-LIGHT-able, we port its **mechanic** to a mode-safe fiction rather than withholding it — mechanics are anchors, fiction is mode-local (the tongue-eater clamps a tool; never tissue, in either mode). And the inversion that keeps LIGHT alive: LIGHT is the default front door, so it's the mode most players see and the one that cannot rot; HARDCORE is the connoisseur's cut. Its reward is aesthetic and curatorial, deliberately.

---

# §2 — THE BESTIARY

**Conventions (apply to every block):** `voxelCount` = occupied LOD0 cells (4–40); every silhouette line states its LOD2 (≤25%) read. Clip frames @30fps. `paletteSlots` name Law-B token roles (≤4); `--world-danger` appears only inside telegraph fields. Every buildRecipe carries a deliberate `asym:` note (mirror-check compliance) and cluster-contact is called out where it's load-bearing. `realismTier` states the **HARDCORE ceiling**; LIGHT is always the voxel-stylised floor (D2).

## Bloodsuckers

**`bedbug_harbor`**
- **role:** harborage node — the fight is the nest, not the bugs
- **voxelDims:** 14×5×10 · **voxelCount:** 26 (carapace 14, head 4, leg nubs 8)
- **silhouette:** flat coin with a leg skirt; LOD2 read: coin + dots — survives
- **buildRecipe:** 14-cell lenticular carapace, bevel 0.4; head tucked under anterior lip; 4×2-cell L-shaped nubs at corners; asym: posterior-left nub pair rotated 20°
- **paletteSlots:** shellRust · seamCream · sootInk
- **rig:** 5 — root, shell, head, skirtL, skirtR
- **clipIntent:** 5 — idle(40f), scuttle(24f), feed(60f), alertFreeze(12f), death(8f)
- **telegraph:** 0.8s pre-swarm — nest seam pulses `--world-danger` at 2 Hz with audible creak
- **counterplay:** follow stragglers back to the harborage, scrub it (3s channel); killing bugs alone never ends the spawn
- **ipRow:** Grounded mite swarms (no source object) · StarCraft creep (structure, but static) · Terraria spawn pressure (invisible rules) — distinct: the nest is a destructible structure betrayed by its own stragglers' return paths
- **healthCheck:** infestation is neglect of a *place*; feed animation attaches to furniture seams, never to a person
- **intensity:** LIGHT — stylised "apple-seed bug," dry tap foley / HARDCORE — photoreal sheen, harborage stain decals, wet rustle swarm layer
- **biome:** The Lodgings
- **realismTier:** hybrid — a mass-read mob at 1m+; wrap buys sheen, not pores; distance kills photoreal detail

**`kissbug_lurker`**
- **role:** stealth feeder — anti-idle pressure
- **voxelDims:** 18×6×8 · **voxelCount:** 28 (abdomen 16, cone head 6, legs 6)
- **silhouette:** elongated shield with a needle chin; LOD2 read: shield + spike
- **buildRecipe:** 16-cell flattened tapering abdomen; 6-cell conical head with 2-cell proboscis laid ventral; 3×2-cell legs; asym: proboscis deflects 15° left
- **paletteSlots:** duskTan · seamCream · sootInk
- **rig:** 6 — root, abdomen, head, proboscis, legL, legR
- **clipIntent:** 6 — lurkCreep(36f), proboscisExtend(18f), feed(72f), startleFreeze(10f), flee(20f), death(8f)
- **telegraph:** 1.5s wing-rustle audio within 6m + `--world-danger` glint at proboscis tip at 1 Hz before approach; player movement breaks it
- **counterplay:** don't stand still; turn — it only advances outside your view cone; held light sources ward it
- **ipRow:** Alien: Isolation (stalker dread, but ours flees confrontation) · Phasmophobia (audio-first tell, but ours is counterable in-world) · Grounded (backyard scale, no stealth loop)
- **healthCheck:** feeds on rest-debt/stamina, never anatomy; drawn to stillness — behaviour framing, not body framing
- **intensity:** LIGHT — stylised "cone-nose wanderer," dry leaf-step foley / HARDCORE — photoreal-wrap, close-feed audio layer, clinical descriptor
- **biome:** The Lodgings (dusk edge of The Green)
- **realismTier:** photoreal-wrap — the mechanic is proximity; the whole point is inspecting it at 0.5m while deciding whether to move

**`leech_pool`**
- **role:** water-zone drainer with a debuff that follows you out
- **voxelDims:** 16×4×6 · **voxelCount:** 24 (8×2-cell segments, sucker head 4, tail sucker 4)
- **silhouette:** ribbon with two suction cups; LOD2 read: thick line + two dots
- **buildRecipe:** 8×2-cell segments bevel 0.3; anterior 4-cell sucker disc; posterior 4-cell smaller disc; asym: segments 5–8 planed 10° off-axis
- **paletteSlots:** muckOlive · bellyAsh · slimeHighlight
- **rig:** 9 — root + 8 segments
- **clipIntent:** 6 — swimLoop(30f), latch(14f), feed(60f), writhe(24f), detachFed(20f), death(8f)
- **telegraph:** water dimples 0.6s before strike + one `--world-danger` ring on the surface
- **counterplay:** avoid reedwater; latched → 2s removal channel (salt tool instant); a fed leech detaches and is collectable (leech-sac resource)
- **ipRow:** Subnautica Bleeder (latch-drain, but ours persists out of water) · Half-Life water leeches (zone fear, no debuff economy) · Terraria worm AI (segmentation, no latch) — distinct: the debuff travels and demands a deliberate removal act — and the parasite pays you for letting it finish
- **healthCheck:** drains vitality/stamina; a satisfied parasite leaves — parasitism as transaction, not violation
- **intensity:** LIGHT — matte ribbon, soft plop foley / HARDCORE — wet sheen wrap, engorgement scale, wet suction layer
- **biome:** The Reedline
- **realismTier:** hybrid — wetness is a shader property; photoreal pores add nothing to a silhouette that lives half-submerged

**`mosq_vector`**
- **role:** marker/force-multiplier — protects your stealth, not your health bar
- **voxelDims:** 18×8×6 · **voxelCount:** 18 (abdomen+thorax 8, head 2, proboscis 1, legs 5, wings 2)
- **silhouette:** a dangling note with a needle; LOD2 read: dot + line
- **buildRecipe:** pendulous 8-cell body; 2-cell head; 1-cell proboscis forward; 5 splayed leg cells; **2-cell wing pair folded dorsal along the body — touching the thorax (cluster law)**; asym: one hind leg absent
- **paletteSlots:** duskGrey · wingGlass · stripeAlabaster
- **rig:** 6 — root, abdomen, thorax, head, wingPair, legsIK
- **clipIntent:** 6 — hover(24f loop ±6°), approach(30f), bite(12f), evade(16f), restLanding(20f), death(6f)
- **telegraph:** 1.0s rising whine + `--world-danger` pip at the head on dive-commit
- **counterplay:** 0.5s swat window at hover-commit; smoke zones it avoids; CO₂ decoy lures it off you
- **ipRow:** Grounded mosquito (direct combat mob) · Vampire Survivors (swarm pressure, no mechanic) · Risk of Rain 2 (scaling swarm, no stacking mark) — distinct: individually trivial; each bite stacks "marked," growing every parasite's detection radius — you swat it to keep your stealth
- **healthCheck:** disease-courier framing — the mob spreads contamination; the vector is the villain, not the bite
- **intensity:** LIGHT — stylised, hum-only / HARDCORE — hybrid wrap, proximity-bending whine, welt FX on the *suit*, never skin
- **biome:** ranges Lodgings + Green + Reedline — the widest ranger, deliberately
- **realismTier:** hybrid — wings earn a glass slot; photoreal body detail vanishes at swarm distance

**`flea_hopper`**
- **role:** vertical ambusher with fixed, readable punish windows
- **voxelDims:** 10×8×6 · **voxelCount:** 16 (thorax 6, abdomen 4, head 2, haunches 4)
- **silhouette:** laterally compressed seed on two springs; LOD2 read: seed + hooks
- **buildRecipe:** 6-cell tall-narrow thorax slab; 4-cell tucked abdomen; 2-cell low head;
