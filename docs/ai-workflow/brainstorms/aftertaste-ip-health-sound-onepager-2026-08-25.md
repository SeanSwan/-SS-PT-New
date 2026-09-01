---
decision: "Originality, health-language, and sound rules for Project Aftertaste — binding on every asset, string, and audio cue before it is authored"
status: open
supersedes: none
linear: SWA-211
privacy: IDs/roles only
---

# Aftertaste — IP · Health-Language · Sound one-pager (P0)

One page, binding. If an asset, name, string, or sound cannot pass every gate here, it is not authored. This is planning guidance, **not a legal opinion**; a qualified human review is required before commercialization.

Much of this is **inherited, not invented** — `world.miniature-play.voxel-realm` (design-brain `worlds.md` entry 16) already carries an asset-provenance clause, a banned-likeness list, and an anti-cheese line. Where a rule below is marked **[inherited]**, the doctrine already exists and this doc only points at it.

---

## 1. Originality gates

**Genre vs expression.** "Round-based survival" is a genre and is free to use. The named franchise that inspired it is an internal reference only and appears in no shipped string, filename, asset ID, commit message, or marketing copy.

**Categorically banned** (any one of these fails the gate):
- Perk machines, round-number announcer, points ticker, wall-buy affordances, mystery-box, or any HUD arrangement recognizable as another game's.
- Existing restaurant trade dress: golden arches, a red-and-yellow scheme paired with a clown, a crowned burger figure, a bucket, a specific mascot's hair/braids/uniform, or any real slogan or menu name.
- **[inherited]** From Voxel Realm's negative list: *Minecraft likeness, branded blocks, loot-box visuals, plastic toy shine, readable fake UI text, logos, watermark, retired Galaxy-Swan tones.*
- Any real person's likeness.

**IP separation matrix — required per named character before any concept art.** Columns: `name · silhouette · palette · costume · props · voice · catchphrase · story function · nearest 3 commercial comparisons · why distinct`. A row with an empty "why distinct" cell blocks the asset.

**Boss status: NAME NOT APPROVED.** `[VERIFIED 2026-08-25]` A public search shows "Ringmaster" is a crowded character space — Marvel's Ringmaster (comics, since 1941), Dota 2's Ringmaster, a Ringmaster antagonist in *The Mimic*, and a tabletop game titled *Ringmaster*. Qwen flagged the archetype independently. Therefore:
- "Mirthmouth" and any "Ringmaster" construction are **rejected as working names**.
- The archetype survives **PROVISIONALLY**: **a maître d' of rot**. *This re-cast is itself an unsearched IP commitment made one paragraph after rejecting "Ringmaster" for crowding — the same unverified-claim pattern. It is provisional until it passes the same search gate. (GLM 5.3 P0 blocker 7, 2026-08-25.)* — a host of an endless banquet whose menace is manipulation and excess, not circus showmanship. No clown makeup, no ringmaster coat, no top hat, no whip, no big-top.
- A name is chosen only after a fresh search covering games, comics, film, and live trademark records; the search result is pasted into the matrix row.

**Provenance — [inherited], now enforced by tooling.** Voxel Realm already requires: *generator/model/version or engine/version, catalog version, deterministic seed, prompt/source meshes/textures/sprites, licenses, UTC timestamp, and SHA-256; similarity review must exclude protected game assets, characters, UI, audio, trademarks, and real likeness.* `scripts/assets/validate-asset.mjs` makes each of these a required, typed field. `provenance.license` is a **structured object** (`{kind, modelName, modelVersion, licenseId, receiptPath}`, kind ∈ `owner-authored | cc0 | ccby | model`), never free text and never a delimited string — a delimited `model:name@version:id` form is unsplittable when a model name itself contains `@` or `:`. (HY3 P0 blocker 3, 2026-08-25.) This covers the **generator's own** license, not just the artist's.

---

## 2. Health-language gates

The product is a real training platform used by real clients, including minors. The villain is contamination, decay, excess, manipulation, and neglect. **The villain is never a body.**

**Binding rule: debuffs are named for the environment or the material, never for the person.**

| Rejected | Shipping name | Why |
|---|---|---|
| Grease Drag | **Slick Footing** | "Drag" attaches to the body; slick floor is the world |
| Salt Lock | **Brine Stiff** | material state, not a physiology |
| Gut Static | **Spoilage Hum** | no organ named |
| Sugar Crash | **Sugar Crash** ✓ | describes a moment, not a body; widely understood as an event |
| Contamination · Fatigue · Dehydration | unchanged ✓ | environmental / transient |

**Also binding:**
- No medical diagnosis is a mechanic. No hypertension, diabetes, fatty liver, or cholesterol as a debuff, boss attack, or item name.
- No food is a cure. Greens, fiber, sweet potato, and water are game counters to game statuses — never treatments for a condition, in copy or tooltip.
- **The boss does not force-feed.** The kit targets the champion's *resolve and schedule* — pressure, distraction, temptation staged as an endless service — not eating. An "open wide" grab reads as force-feeding regardless of intent; it is cut.
- Avatar-Mirror guardrail carries over unchanged: progress affects radiance, posture, gear, vitality, and crystalline state — **never body-fat morphing**, in either direction.
- No "yoga" or "meditation" language anywhere (house rule); "stretching" / "flexibility".
- Credentials copy, if any coach-facing surface mentions it: "26+ years", "NASM-protocol". **Never "NASM-certified".**
- Any educational nutrition codex is a separate deliverable with its own human review. Until then, no factual health claim ships.

---

## 3. Sound gates (nobody on the panel raised this — it is the most recognizable layer)

Round-based audio is the single most identifiable element of the inspiring franchise. Original sound is an IP row, not polish.

- **No round-transition sting, no announcer, no "wave complete" fanfare** modelled on another game's cadence. The shard communicates state through material sound: the room going quiet, drains draining, the hum of a nest dying.
- **No voiced boss taunts** until the character passes the IP matrix. Non-verbal presence only (service bells, cutlery, cloth, wet movement).
- Every asset's audio carries the same provenance fields as its mesh — **[inherited]** from Voxel Realm's clause, which explicitly names *audio* in the similarity review.
- **[inherited]** Silence is the default. Voxel Realm: *"sonic-silence = silent default, user-activated soft build ticks."* Aftertaste inherits: **audio is off until the player turns it on**, and the game is fully legible without it (every status cue is icon + label + shape as well as sound).
- Licensed/stock audio requires a stored license receipt; a clip with no receipt does not ship.

---

## 4. Gate order (cheapest first)

1. Health-language pass on the name/string — free, instant.
2. IP matrix row incl. the three nearest commercial comparisons — minutes.
3. Public search for the name across games / comics / film / trademark records — minutes; result pasted into the row.
4. Concept art only after 1–3 pass.
5. `validate-asset.mjs` provenance + license gate at build.
6. Human legal review before any commercial use, title lock, or marketing.

**Nothing at step 4 or later starts while steps 1–3 are open.**
