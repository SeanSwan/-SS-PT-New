# PROJECT AFTERTASTE — FULL BLUEPRINT + IMPLEMENTATION FOR HOSTILE REVIEW — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** packages/aftertaste/glm-review-packet.md
**Tokens:** 53228 in / 32000 out (reasoning: 28433) | total 85228
**Wall:** 737.2s

---

# HOSTILE REVIEW — Project Aftertaste @ `5dc371d2f`

Everything below is traced through the code as given. Where a claim depends on a file not in the packet (manifests, clip tables), it's quarantined into the final section.

---

**1. HIGH — The trigger has no focus-loss reset, and `shoot()` is not gated on `over`: the gun fires autonomously after alt-tab and keeps mutating the world after death.**
`App.jsx` → `TriggerControl` (`useEffect` bindings, `held` ref) + `state/store.js` → `shoot`.

Failure scenario: hold LMB, alt-tab (or the OS steals focus). `useKeyboard.js` has a `blur` handler that clears keys — the authors knew this failure mode and fixed it **for keys only**. The mouse path has no such reset: `mouseup` fires on the *other* window's document, `held.current` stays `true` forever. On refocus, rAF resumes and `shoot()` fires every 0.15 s with zero input. Worse: if this happens after hp hits 0, `tick` early-returns on `over` (so corpses never age off), but `shoot` has **no `over` check** — it happily filters `canBeShot`, kills living enemies post-mortem, increments `kills`, and stamps `lastKillAt`. The HUD subscribes to the whole store, so the "final score" line on the death screen visibly climbs while the player is dead. Also: nothing stops `reset()` + a stuck trigger from farming wave 1.

Fix: `window.addEventListener('blur', () => { held.current = false })` in `TriggerControl`, and `if (useGameStore.getState().over) return;` at the top of `shoot` (or in the frame gate).

---

**2. HIGH — The pointer-lock-acquiring click fires the gun, on every (re)engage, and the HUD instructs the player to do exactly this.**
`App.jsx` → `FpsRig.onMouseDown` and `TriggerControl.down` — both bound to canvas `mousedown`, both run for the same event.

Failure scenario: cold start, crosshair happens to overlap a fryling. Player follows the HUD ("click to take aim") → `requestPointerLock()` **and** `held.current = true` in the same event → next frame `lastShot === -Infinity` → a free shot down the pre-aim ray. Same after every Esc, every death screen (lock is force-exited in `Hud`), every restart: the click that re-arms the aim is always also a bullet. The shot lands wherever the crosshair sat *before* any look input, so it reads as a random hit/miss the player didn't author. The comment "Lock gates LOOKING only; firing works regardless" documents the decision but not the collision between the two handlers.

Fix: ignore the mousedown that acquires lock (e.g., only count `held` when `document.pointerLockElement === canvas`, or set a one-frame suppress flag when requesting lock).

---

**3. HIGH — The centerpiece "ONE capabilities table" claim is false on the damage side: `canHurt` is a dead column, and touch-range is answered in two places outside the table.**
`systems/lifecycle.js` → `CAPABILITIES` / `hurtsNow`; `systems/waves.js` → `tickRound`; `state/store.js` → `tick`.

Grep the consumers: `canMove` is asked in `Enemies.jsx`, `canBeShot` in `shoot`, `holdsWave` in `tickRound`/`Hud`. **`canHurt` is asked by nobody.** Damage goes through `hurtsNow()`, which re-derives state via `stateOf` and its own arithmetic, ignoring the table. Concrete proof: set `CAPABILITIES.attacking.canHurt = false` — the game's behavior is *bit-identical*; only `lifecycle.test.mjs` notices. The table's own card says "every system ASKS the table; none carries its own opinion" — for the one rule the game is named after (the dodge window), that's marketing. Additionally, the range question is answered locally **twice**: `store.tick` computes `inRange` with `TOUCH_RADIUS ** 2` (to trigger attacking), and `tickRound` independently computes `dist2(e, player) <= TOUCH_RADIUS ** 2` (to land the strike). If the design ever wants the lunge to reach farther than the trigger (it will — it's a lunge), there are two constants to desynchronize and no table to arbitrate.

Fix: `hurtsNow` = `can(enemy,'canHurt') && (now - enemy.stateSince >= ATTACK_WINDUP)`; move range semantics into the lifecycle (pass the radius in) so the table is actually load-bearing, and delete the column if you won't.

---

**4. HIGH — The patty-larva's hitscan sphere does not "honestly match the body" — by the packet's own numbers it's 28% too small, and the teaching card asserts the opposite.**
`enemies/roster.js` → `patty-larva`; `combat/combat.js` → `TARGET_HEIGHT`; `CONCEPTS/data-driven-monsters.md`.

Arithmetic: larva bounds `minX:-2, maxX:3` → width 5, `height: 2` → `scale = 0.5` → normalized half-footprint = **1.25**. `aimRadius = 0.9`, sphere centered at (x, 0.5, z). A shot passing 1.0 unit off the center line — visually through the middle of the rendered tail — gives `closest2 = 1.0 > 0.81` → miss, no hitmarker, no feedback. This is *precisely* the "every collision looks unfair for invisible reasons" failure the fryling lesson in §5.2 wrote down, reintroduced in Slice 8b and blessed in a concept card ("the hitscan sphere honestly matches the body it stands for"). Grease-fly is exactly marginal: half-width 0.5 vs `aimRadius 0.5` — silhouette-edge shots are a floating-point coin flip.

Fix: derive `aimRadius` from the measured bounds in the schema test (`≥ half-diagonal of the normalized footprint`), or use a two-sphere/capsule per long body. Add a roster schema assertion so a future long monster can't ship with a dishonest sphere.

---

**5. HIGH — The "quiet frames cost no React work" optimization inverts exactly during combat: the flock + HUD re-render on every hit and nearly every frame of a melee.**
`state/store.js` → `shoot` / `tick`; `enemies/Enemies.jsx` → subscription + inline refs; `enemies/Monster.jsx` (unmemoized); `ui/Hud.jsx` (selectorless `useGameStore()`).

Trace it: every *hit* replaces the `enemies` array identity (`enemies.map` in `shoot`) at ~6.7 Hz sustained fire. During close combat, every alive↔attacking boundary is another `set({enemies})` — with ~20 enemies planted at the player cycling `ATTACK_SECONDS` (0.667 s), that's ~30 transitions/s, i.e. `set` on roughly every other frame, and at the wave-20 cap it's every frame. Each `set` re-renders `Enemies`, reconciles 40 `<group>`s, detaches/re-attaches **40 inline ref callbacks** (arrow identity changes per render → 80 ref invocations), re-renders 40 `Monster`s, and re-renders the HUD (which subscribes to the entire store). The doc's claim — "a frame where nobody transitions costs no React work at all" — is true only of the frames where nothing interesting is happening. The perf story is built for the boring part of the game and collapses during the part the game is about.

Fix: `memo(Monster)` + stable ref callbacks; separate transient hitmarker timestamps from the board array; per-enemy `state` changes could be written to meshes/clip players directly and reconciled only on spawn/despawn.

---

**6. MEDIUM — Per-frame garbage everywhere, including test seams that ship to players, directly under a comment lecturing about GC.**
`enemies/Enemies.jsx` → `useFrame`; `state/store.js` → `tick`.

Every frame allocates: `snapshot = list.map(...)` (n+1 objects), `window.__swanEnemyPos = list.map(...)` (n+1, **not dev-gated — this runs in production builds**), `stepped = []`, `patch = {}`, and in the seam block `now.enemies.filter(holdsWave)` (another n-array) plus a fresh `__swanRound` object. With n=40 that's ~90–100 allocations/frame ≈ 5–6k objects/sec. `App.jsx` opens with a comment bragging about one reused `_dirScratch` Vector3 "because allocating in a frame loop feeds the garbage collector." The lesson didn't survive contact with the actual hot path.

Fix: `import.meta.env.DEV`-gate all `window.__swan*` writes; reuse scratch arrays/objects for snapshot and stepped; compute `left` by count, not `filter`.

---

**7. MEDIUM — `separate()` throws away its own distance weighting: "closer neighbours push harder" is false in the code comment and in the steering card.**
`enemies/steering.js` → `separate`.

The accumulation does `+= (dx/dist)/dist` — then `const len = Math.hypot(x,z); return {x: x/len, z: z/len}` **normalizes the sum to unit length**. Output magnitude is always exactly 1, so a neighbour at 0.05 and a neighbour at 1.55 produce identical push strength; only the *direction* of the blend retains anything. The comment claims "Closer neighbours push harder (the push is divided by distance), which is what stops a pile forming" — the pile is stopped by direction + `SEPARATION_WEIGHT`, not by graded magnitude, and any tuning reasoning Sean builds on that sentence ("raise the weight so close neighbours shove harder") is reasoning about a mechanism that doesn't exist. Same false claim repeated in `CONCEPTS/steering-vs-pathfinding.md`.

Fix: either keep per-neighbour normalization and scale the final vector by `Math.min(1, accumulated magnitude)`, or correct both the comment and the card.

---

**8. MEDIUM — Attack/death durations are one rig's clip lengths hardcoded as global constants for all four monsters.**
`systems/lifecycle.js` → `ATTACK_SECONDS = 16 / 24`, `DEATH_SECONDS = 24 / 24`.

These numbers are the *fryling's* clip lengths (§5 table: attack 16f, death 24f @24fps). The other three GLBs' clip frame counts appear nowhere in the packet. If drip-cyst's attack is authored at 20 frames, `attacking` expires at 0.667 s while the clip runs to 0.833 s — the monster snaps from lunge to `move` mid-animation, and `clampWhenFinished`-style sync for deaths drifts the same way. The whole pipeline exists to enforce "clips come from the registry, not from taste," and then the runtime hardcodes one creature's timings as physics for all four. No roster field, no schema test, no `verify-clips` output binds duration to asset.

Fix: per-row `attackSeconds`/`deathSeconds` in `ROSTER`, emitted by the pipeline from measured clip lengths, enforced by the schema test.

---

**9. MEDIUM — Fog/floor/range arithmetic contradicts the comments: the floor edge is NOT fully fogged, and MAX_RANGE shoots past the visibility horizon.**
`App.jsx` → `<fog args={['#0b0b0e', 20, 46]}>`; `world/Ground.jsx` → `planeGeometry args={[50, 50]}`; `combat/combat.js` → `MAX_RANGE = 60`.

Linear fog factor at the floor's straight-ahead edge (25 units from the plane center, where the player stands): (25−20)/(46−20) ≈ **0.19** — the edge renders at ~81% floor color against the background. Corners (35.4 units) are ~59% fogged. The comment — "fully swallows the world before the floor's 25-unit edge could show" — is arithmetically false; fog-far must be ≤ 25 for the claim to hold. Separately: `MAX_RANGE = 60` with fog ending at 46 means crosshair-center shots kill targets in the 46–60 band that render as *nothing*. The handoff §4/§5 claims "threats are never hidden"; a hittable-but-invisible band is the same "missing camera" sin the doc defines, relocated to the gun.

Fix: `fog far ≤ 25` (or enlarge the plane), and `MAX_RANGE ≤ fog far`.

---

**10. MEDIUM — The 8b dismemberment plan is underspecified at every layer where its risk actually lives, and its one technical claim is wrong as written.**
Handoff §6, slice 8b; `combat.js` → `hitscan` return; `roster.js`; `lifecycle.js`.

(a) "locational hitscan — per-part spheres instead of one, **the ray already reports where it struck**." It doesn't. `hitscan` returns `{ target, t }` — `t` is along-ray distance; the strike *point* is derivable, but the *part* is not, and no per-part bounds exist anywhere: the roster carries a whole-model AABB, the pipeline emits no part metadata. (b) "feet, toes": `skeleton.creature-small.v1` is 3 bones. Articulating or severing toes requires a contract version bump, which — by the pipeline's own gates — invalidates `validated` status, the sha256 manifests, and `clipContract` for **all four landed 8a assets**. 8b is secretly a full pipeline slice bigger than 8a, scheduled as if it were a gameplay slice. (c) The state machine has no representation for "alive minus a leg": speed is read from the immutable `ROSTER[type].speed` per frame in `Enemies.jsx`, so a leg shot cannot slow anything without new per-enemy mutable state and new table columns — the "one table" (see finding 3) doesn't extend to partial capability degradation. (d) Gibs: do severed parts `holdsWave`? Are they `canBeShot`? Do they expire? Undefined — and these are exactly the three-rule drift the table was invented to prevent.

Fix: write the v2 asset contract (part tags, per-part spheres, bone minimums, measured per-part durations) and the capability extension *first*; only then slice.

---

**11. MEDIUM — The pathfinding tripwire contradicts the wave cap and teaches a false cost model.**
Handoff §6 tripwire; `CONCEPTS/steering-vs-pathfinding.md`.

The tripwire fires at "more than ~30 agents needing real routes." The wave cap is **40**. The moment Slice 10 adds walls, a max wave already exceeds the tripwire — the doc's two halves disagree about the project's own numbers. The card also treats "forty monsters each running A* every frame" as the only pathfinding cost model — a strawman; replan-throttling, hierarchical search, and flow fields are the standard answers, and presenting per-frame A* as the sole alternative teaches a beginner a false dichotomy as fact. The tripwire list also includes "rollback networking" and "animation state machines past ~4 layers" — neither is a steering-vs-pathfinding trigger; it's a category error in a document whose stated purpose is to make tool-switching a decision instead of an instinct.

Fix: reconcile the numbers (tripwire ≥ cap, or cap < tripwire), restate the cost model honestly, and prune the non-pathfinding tripwires.

---

**12. MEDIUM — Test-suite blind spots: named assertions that stay green while the game is broken, and inputs the suite never exercises.**

- **Invert the pointer-lock guard** (`document.pointerLockElement !== canvas` → `===`) in `FpsRig.onMouseMove
