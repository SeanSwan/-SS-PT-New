# The Swanverse — Game Universe Vision (Master Lore Doc)

- **Date:** 2026-07-22 · **Author:** Sean (captured by Claude) · **Status:** VISION CAPTURE — durable record, NOT a build spec yet
- **Timing:** the game universe is a **POST-DECEMBER 2026** effort. Documented now so nothing is lost; the near-term buildable piece is the level Badge + Ring + Companions + Elements (see the sibling brief `swan-badge-companion-progression-2026-07-22.md`).
- **Why this doc exists:** Sean brain-dumped a large, evolving game vision off the top of his head. This is the load-bearing capture so it survives context windows and feeds future design (Kimi) + the `story` skill. Sean said he will keep adding to it.
- **Privacy (Rule 8):** committed to repo — IDs/roles only, no PII.

---

## −1. Prior art — this BUILDS ON an existing ~60%-built RPG (do not duplicate)

Sean pointed to existing gaming docs. Found + reconciled — the Swanverse is the NEW long-horizon layer on top of a substantial existing foundation. Read these before designing:
- **`docs/ai-workflow/brainstorms/swanstudios-rpg-game-2026-06-13.md`** — the canonical RPG grill (7 decisions locked). KEY: the RPG is **~60% already built in the codebase**, waiting on React-Three-Fiber (3D). Existing REAL systems: Aegis HUD (Sims-style 5 needs bars + decay), **Companion Pets** (`CompanionPetService.mjs`: crystal_dragon / iron_wolf / ember_phoenix / frost_swan / shadow_panther × 6 evolution stages, ~300 variants), Vault Decryption loot (5 rarities), Job Classes (5 FFXIV-style), the full GamificationEngine + a real per-NASM-type / per-body-part **stat sheet** (`ClientProgress.overallLevel` 0–1000). Avatar = **"You, crystallized"** — a Crystalline Swan champion (Bronze Forge → Silver Edge → Titanium Core → Obsidian Warrior → Crystalline Swan). Mount point already stubbed: `frontend/src/components/AvatarHome/HomeWorld.tsx`.
- **`docs/ai-workflow/brainstorms/swanstudios-rpg-game-ceo-2026-06-14.md`** — Chromie verdict: **DEFER (bank, don't kill).** Not on the current business priority order. Matches "post-December."
- **`docs/ai-workflow/blueprints/GAMIFICATION-RPG-VISION-V2.md`** + **`GAMIFICATION-VISION-V2-RPG-LIFE-SIMULATOR.md`** — the V2 vision (Aegis HUD, Vault loot, Crystalline Avatar, Job System, RPG Life Simulator).
- **`docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md`** + `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling-social-rpg-upgrade.md` — social/party layer.

**How the Swanverse relates:** the existing RPG is "you, crystallized, growing from real workouts." The **Swanverse extends it OUTWARD** — the champion doesn't just grow, it **ascends into an infinite universe of planets you build and redeem.** The existing **Companion Pets are the seed of the cute-familiar cast** Sean now wants (crystal-cygnets, ice-sprites — extend the 5 species, don't reinvent). The badge/ring/elements = the level indicator that ties the champion to the planet/universe layer. **Reuse the existing pet/avatar/stat systems; don't build a competing silo (rule 27).**

## −0.5. STANDING QUALITY MANDATE (Sean, 2026-07-22 — applies to ALL game work)

**Highest quality is non-negotiable, AND it must scale to potato PCs.** Two requirements held together:
- **Highest visual/production quality is the ante.** Sean: "I really want this game to be of highest quality… high quality is very important." The game must look and feel premium — Sean plans to compete/win on gameplay + features, but quality is the price of entry. No cheap-looking, no placeholder-as-final, no "good enough" visual bar. This is the design-brain "jeweler's test" applied to a game.
- **Scalable down to low-end / "potato PC" hardware.** The same experience must degrade gracefully to run on weak machines and phones. This means a **tiered quality architecture from day one** — Ultra / High / Medium / Low / Potato — NOT quality bolted on late. Concretely: LOD (level-of-detail) models, dynamic resolution scaling, an aggressive low-spec / 2D `MinimalistView` fallback (already the pattern in the RPG doc), reduced-motion + reduced-effects modes, texture/particle/shadow budgets per tier, and a perf floor that guarantees a WORKING (if simpler) experience on the worst target device. The high-end path is the showcase; the potato path is a requirement, never an afterthought.

**How to apply:** every game design/build slice must state its quality tiers and its potato-PC fallback as part of the spec (like the ring's Full/Lean/Still + reduced-motion). "Ships beautiful on a 4090 AND runs on a 5-year-old laptop" is the bar. Feed this to Kimi and every future `story`/design pass.

## 0. One-line premise

SwanStudios (the real-world training app) is the on-ramp to **the Swanverse** — an ever-expanding game universe you unlock and BUILD by leveling up in real life. Train in the real world → earn your place among the stars → travel, build, and redeem planets in an infinite fantasy cosmos. The two worlds are bridged: **the real world (your actual training) powers the fantasy world (your universe).**

## 1. Cosmology & theme (the "match-drop" opening of the story)

- **God made the universe** — everlasting, never-ending, always expanding. Infinite.
- **Scale humility:** our entire solar system is "nothing but a grain of sand on Earth" compared to the everlasting size of the universe. The awe of true scale is a core feeling.
- **Good vs Evil, scattered across the stars:** planets of light and planets of darkness are splattered throughout the universe.
  - **Good/benevolent planets:** super-Earths, super-rainforest planets, super-glacier planets, angel planets, beautiful utopian worlds, super-cool robot planets (the good kind).
  - **Bad/negative planets:** demon planets, hell-worlds, mutant-alien planets — worlds overrun by negative energy that create disgusting mutant/alien horrors.
- **The chosen one:** the player is a chosen one. **Do what you're supposed to do on Earth first** (the real training — this is the SwanStudios loop), and you **earn the right to travel these planets.**
- **The mission:** journey to negative-energy planets, **destroy the demons / mutant aliens** and the abominations they create, and **turn those planets benevolent** — convert darkness to light, one world at a time.
- **Ever-expanding:** like the real universe, the game world is never finished — it keeps expanding as the player (and the studio) develop it. This is the beginning of the story; Sean will add more.

## 2. World-building through leveling (the core connection to the level system)

- As you gain **levels** (the SwanStudios 1–1000 system, already being built as the Badge + Crystal Ring), you don't just get badges — you **develop your own planets and worlds.**
- Each planet gets **its own name and its own origin/backstory** set in a faraway, unreachable galaxy — cool to develop even though you can "never really reach" it.
- The **worlds you see when you level up** are the building blocks — leveling literally **builds your game universe.**
- **Elements** (earth, fire, air, water, ice, lightning/plasma, light, void…) and **the worlds** are woven into this — see the badge/companion/element brief; elements likely map to planet types / biomes (fire planets, glacier planets, verdant planets, etc.).
- Planets can each carry **their own stories** — a planet is a container for narrative, not just a skin.

## 3. The Sims connection (build-your-own-world mode)

- A **Sims-style build/create mode** connected to SwanStudios: build your own house/room, **exactly like the Sims** — but "take everything everybody always wanted and do what they wanted," plus Swan's own style on top.
- **Import real 3D objects via NVIDIA photo-to-3D:** photograph a real object (or your room) → generate a 3D model (Blender-style), and bring it into the game. Sean: "take a picture of your room and create your own room in that game."
- **The bridge (critical):** this is how community connects in SwanStudios — **the real world** (your real training, your real room/objects) **↔ the fantasy world** (your planets, your built spaces in the Swanverse). Real effort and real objects flow into the fantasy universe.

## 4. The `story` skill (to build — see separate scaffold)

- Sean wants a new skill called **`story`** — a **grill-me / Chromie-style interviewer**, but its remit is **building the GAME**: it asks Sean questions about what he wants for the game/universe, one at a time, and checkpoints every answer to a durable brainstorm doc (like grill-me does).
- It is the intent-extraction engine for the Swanverse — the way this ever-expanding lore gets pulled out of Sean's head and into structured docs over time.
- Being scaffolded this session at `.claude/skills/story/SKILL.md` (interview-only; no game code built yet).

## 5. Side note — Dad's singing / "dance & thinking" (SEPARATE, smaller, also post-Dec)

- Sean feels there is **not enough emphasis on "Dad's singing"** and wants **more emphasis on it** — believes it's important.
- Wants to **spice up a "dance and thinking" area in the USER DASHBOARD** — unsure exactly how yet; wants to explore what could be done there.
- **Status:** parked idea, needs its own grill/exploration later. Flagged here so it isn't lost. NOT part of the near-term badge work.

## 6. What is NEAR-TERM vs POST-DECEMBER

| Item | Status |
|---|---|
| Level Badge + Crystal Ring engine | **NEAR-TERM** — ring engine built; badge frame + companions + elements = next (Kimi design pass queued) |
| Companions/pets (cute familiars) | NEAR-TERM design, phased build |
| Elements (earth/fire/air/water/plasma/electricity variations) | NEAR-TERM design (folded into the badge brief) |
| **Planets / worlds / cosmology / good-vs-evil story** | **POST-DECEMBER** — documented here, designed via `story` skill later |
| **Sims build-mode + NVIDIA photo-to-3D + real↔fantasy bridge** | **POST-DECEMBER** — big effort |
| `story` skill (interviewer) | scaffolded now, used to expand this lore over time |
| Dad's singing / dashboard dance-&-thinking spice | parked, explore later |

## 7. Open threads (Sean will expand — feed these to the `story` skill)
- Name the first planets + their origin galaxies + backstories.
- Define the player's "chosen one" arc and how real-world training maps to in-game power/travel rights.
- Element ↔ planet-type mapping.
- How planet redemption (demon-destruction → benevolence) plays as a mini-game.
- How the Sims build-mode economy/unlocks tie to real training levels.
- Monetization/ethics guardrails (this is connected to a real product with real users, incl. minors' data — keep the game layer clean).

---

**Bottom line:** the Swanverse is SwanStudios' long-horizon "why" — real training becomes a mythic, ever-expanding, buildable universe where you redeem worlds. Near-term we ship the Badge/Ring/Companions/Elements (the seed of it). This doc is the seed vault; the `story` skill is how it grows.
