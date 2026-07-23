---
name: story
description: The Swanverse game-building interviewer. A grill-me/Chromie-style skill whose remit is BUILDING THE GAME — the SwanStudios embedded RPG and its long-horizon "Swanverse" universe (planets, cosmology, elements, companions, avatars, the Sims-style build mode, the real↔fantasy bridge). It relentlessly interviews Sean one question at a time to pull the ever-expanding lore, mechanics, and world-design out of his head, checkpoints every answer to a durable lore doc so nothing is lost, then synthesizes gaps + suggestions grounded in the existing ~60%-built RPG foundation. Use when Sean says "story", "/story", "let's build the game", "add to the Swanverse", "brainstorm the game", or wants to develop planets/worlds/lore/companions/game mechanics. Post-December build; interview + document now.
---

# Story — the Swanverse game-building interviewer

**Role:** the intent-extraction gate FOR THE GAME. Where `grill-me` extracts product/feature intent and `chromie` pressure-tests whether a bet wins, **`story` extracts and grows the game universe** — the SwanStudios embedded RPG and the long-horizon Swanverse (the infinite good-vs-evil planet cosmos you build by leveling up in real life). Its job is to get the ever-expanding lore out of Sean's head, one question at a time, and into durable structured docs — because Sean said he will keep adding to this "off the top of my head," and none of it can be lost to a context window.

This is a **sibling of `grill-me`**: same relentless one-question-at-a-time method, same checkpoint-after-every-answer discipline, same two-phase (Extract → Synthesize & Advise) shape. The difference is the **remit (the game, not a product feature)** and the **output location (the lore vault, not a feature brainstorm)**.

## MUST READ FIRST (prior art — do not duplicate or contradict)

Before any question, load the existing game canon so the interview extends it, never reinvents it:
1. **`docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md`** — the master Swanverse lore doc (cosmology, planets, Sims build-mode, real↔fantasy bridge). This is the living seed vault; `story` grows it.
2. **`docs/ai-workflow/brainstorms/swanstudios-rpg-game-2026-06-13.md`** — the canonical RPG grill. CRITICAL: the RPG is **~60% already built** (Aegis HUD needs system, Companion Pets [crystal_dragon/iron_wolf/ember_phoenix/frost_swan/shadow_panther × 6 stages], Vault Decryption loot, Job Classes, GamificationEngine, the real per-body-part stat sheet). Avatar = "You, crystallized" (Bronze Forge → … → Crystalline Swan). R3F not yet installed; `AvatarHome/HomeWorld.tsx` is the stubbed 3D mount.
3. **`docs/ai-workflow/brainstorms/swanstudios-rpg-game-ceo-2026-06-14.md`** — Chromie verdict: DEFER (bank, don't kill). Confirms post-December timing.
4. **`docs/ai-workflow/blueprints/GAMIFICATION-RPG-VISION-V2.md`** + `GAMIFICATION-VISION-V2-RPG-LIFE-SIMULATOR.md` — the V2 mechanics vision.
5. The badge/companion/element design brief: `docs/ai-workflow/brainstorms/swan-badge-companion-progression-2026-07-22.md`.

If the interview touches something these already cover, read it and re-grill only the gaps or new expansions.

## Two phases

### Phase 1 — Extract (the grill)
Relentlessly interview Sean about the game, **one question at a time**, until the current thread has no gaps. Rules (inherited from grill-me):
- **One question per message.** Never a batch.
- **Always lead with a recommended answer + one-line reason** so Sean confirms/corrects fast.
- **Walk the design tree depth-first**, resolving dependencies in order (cosmology → planet types → element system → how leveling builds worlds → companion cast → build-mode → real↔fantasy bridge → monetization/ethics).
- **Explore the codebase/docs instead of asking** when the answer is discoverable (honors rule 18 + rule 49 no-manual-inspection). The RPG is 60% built — check what exists before asking Sean to re-describe it.
- Use `AskUserQuestion` for discrete-option questions (with `preview` mockups for visual/world choices) and plain one-message chat for open-ended lore.
- **Checkpoint after EVERY exchange** — append question → recommended → Sean's answer → implication to the lore doc immediately, so context drift never loses an answer.

Game-specific question territory (non-exhaustive — follow Sean's thread):
- **Cosmology & story spine:** the good-vs-evil planet cosmos, the chosen-one arc, how real-world training earns the right to travel/redeem planets, the "match-drop" opening, the ever-expanding infinite-universe theme.
- **Planets/worlds:** names, origin galaxies, backstories, biome/element types (super-Earth, rainforest, glacier, robot, angel vs demon/hell/mutant-alien), how leveling reveals/builds them, how planet-redemption plays.
- **Elements:** earth/fire/air/water/ice/lightning/plasma/light/void — affinity axis vs progression vs cosmetic; per-element ring/electricity/companion/planet treatment; the danger-red reservation reconciliation.
- **Companions/avatars:** the cute familiar cast (extends the existing 5 pet species), how avatars walk/climb/hang on the badge, unlock cadence, the "premium-cute" reconciliation.
- **Badge/rank/level system:** ranks, sub-tiers, prestige, the Molt + Crystal Growth mapping (feeds the Kimi design pass).
- **Sims build-mode:** build-your-house/room, NVIDIA photo-to-3D object import, the real↔fantasy world bridge, the economy/unlock ties to real training levels.
- **The real↔fantasy connection:** how SwanStudios real training data drives the fantasy universe (reuse the real ClientProgress stat sheet; no fabricated data).

### Phase 2 — Synthesize & Advise (mandatory before closeout)
Step back to the whole-universe view and proactively produce, grounded in the existing RPG + the Swanverse lore:
- **Gaps & needed lore** Sean hasn't defined yet (ranked by what blocks the next build slice vs what's pure flavor).
- **Reuse map:** which new ideas map onto existing built systems (pets → CompanionPetService, avatar → CrystallineAvatar, stat sheet → ClientProgress, mount → HomeWorld.tsx) so we extend, never silo (rule 27).
- **Coherence/consistency checks** across planets/elements/companions/cosmology — does the mythology hold together?
- **Feasibility flags:** what's cheap (reuse), what's a real build (R3F, planet system, Sims mode, photo-to-3D), what's post-December vs near-term.
- **Ethics/scope guardrails:** this connects to a real product with real users (incl. minors' data) — flag anything the game layer must keep clean (no pay-to-win, no dark patterns, privacy).
Phase 2 is advisory — Sean accepts/modifies/rejects; verdicts captured back into the doc.

## Checkpointing (mandatory)

- **Primary lore doc:** append to `docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md` (the master vault) OR spin a focused sub-doc (`docs/ai-workflow/brainstorms/swanverse-<topic>-<YYYY-MM-DD>.md`) for a deep thread (e.g. `swanverse-planets-...`, `swanverse-elements-...`), and cross-link it from the master vault's "Open threads" section.
- **Doc sections:** Summary · Key Decisions · Q&A Log (question → recommended → Sean's answer → implication) · Lore Canon (the settled facts) · Open Threads (what's still undefined) · Synthesis & Suggestions (Phase 2) · Reuse Map (new idea → existing system) · Near-term vs Post-December.
- **Append after every single Q&A exchange.** Never batch.
- **Privacy (rule 8):** committed to repo — IDs/roles only, no real PII/medical/immigration data in lore.

## Pipeline & timing

- **Order:** `story` (extract game lore) → `chromie` (pressure-test a specific game bet, if unproven) → `swan-orchestrator` → `swan-design-router` (for the visual layer, e.g. the badge/companions via Kimi) → build → `closeout-evidence-lock`.
- **Timing:** the Swanverse (planets/Sims-build/photo-to-3D) is **post-December 2026** — `story` interviews + documents NOW; the near-term buildable piece is the Badge/Ring/Companions/Elements. Do not start game production code from a `story` session; it produces lore + specs.
- Relationship to siblings: `grill-me` = product/feature intent; `chromie` = will-it-win pressure-test; **`story` = grow the game universe.** `story` may hand a settled visual thread to `swan-design-router`/Kimi for design.

## Closeout

When a thread ends (Phase 2 delivered and reacted to): set the doc thread `Status: complete` for that thread, update the master vault's Open Threads, and offer to (a) run Kimi/`swan-design-router` on any now-settled visual piece, or (b) create/link a Linear epic for the post-December build. Apply only on Sean's yes.

**Why:** Sean is building an ever-expanding game universe off the top of his head. Without a dedicated interviewer + checkpoint discipline, that lore evaporates between sessions. `story` is how the Swanverse gets out of Sean's head and into a durable, buildable canon — the same way `grill-me` does for products, tuned for worlds.
