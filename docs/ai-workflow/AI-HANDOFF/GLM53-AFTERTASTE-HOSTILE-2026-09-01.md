# PROJECT AFTERTASTE — FULL BLUEPRINT + IMPLEMENTATION FOR HOSTILE REVIEW — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** packages/aftertaste/glm-review-packet.md
**Tokens:** 53228 in / 9832 out (reasoning: 5554) | total 63060
**Wall:** 179.3s

---

# Hostile Review — Project Aftertaste @ 5dc371d2f

---

## CRITICAL

### 1. `shoot()` does not check `over` — you can farm kills from the death screen
**File:** `state/store.js`, `shoot()`; `App.jsx`, `TriggerControl`.
**Failure:** Die while holding the trigger (extremely common — you die *because* enemies are on you and you are firing). The game-over overlay appears, `tick` early-returns, but `TriggerControl`'s `useFrame` keeps running, `held.current` is still true, and `shoot()` keeps damaging enemies and incrementing `kills`. The death screen shows a live-increasing kill count and the corpse-flock keeps dying around a dead player. Restart while holding the button and you resume mid-burst.
**Fix:** guard `shoot()` with `if (get().over) return false;` and clear `held.current` (and `lastShot`) when `over` flips true. Add a browser test: die mid-hold, assert `__swanShotsFired` stops advancing.

### 2. Per-frame mutation of store objects by `Enemies.jsx` while `tick` treats those objects as immutable
**File:** `enemies/Enemies.jsx` (`list[i].x = next.x`), `state/store.js` (`tick`, `shoot`).
**Failure:** `Enemies` mutates the enemy objects *inside* zustand state without `set()`. `shoot()` then does `enemies.map(...)` producing a new array whose untouched elements are the *same mutated references*. Any future change that snapshots or compares enemies (replay, networking — both named in your own tripwire doc) will see objects whose contents changed under them with no notification. Worse: `round.spec.js` already exploits this by writing `e.x = player.x` directly on store state — the test suite is *dependent on the mutation*, so fixing this correctly breaks tests silently in the other direction. The blueprint's "pure function, never mutates" teaching claim in `combat.js` is contradicted one layer up.
**Fix:** own the mutation explicitly — either commit positions via `set` on a cadence (positions never re-render React anyway; they're written to meshes directly) or document the enemies array as a mutable buffer outside zustand. Then make the browser tests drive damage through `tick`, not through object pokes.

### 3. Hitscan picks nearest *center*, not nearest *entry point* — wrong target on grazing shots, and it is load-bearing for the dismemberment plan
**File:** `combat/combat.js`, `hitscan()` — `if (!best || t < best.t)`.
**Failure:** Enemy A dead-center at t=5.0 has sphere entry at ~4.4; enemy B grazing at t=4.9 (large `closest2`) has entry at ~4.85. The bullet physically reaches B's sphere first; `hitscan` awards the hit to A. With a 0.9-radius patty-larva in the mix at wave cap this is a recurring "I shot the one in front and the one behind died." The bug gets *worse* under the 8b dismemberment plan: per-part spheres make sphere overlap the common case, and nearest-center selection across parts is meaningless.
**Fix:** compute `t_enter = t - Math.sqrt(r*r - closest2)` and select on that. Add a unit test with two offset spheres whose entry order contradicts center order — the current suite has no such case.

---

## HIGH

### 4. `canHurt` is a dead capability; `hurtsNow` re-implements policy outside the table
**File:** `systems/lifecycle.js`.
**Failure:** `CAPABILITIES.attacking.canHurt = true`, but no system reads `canHurt` — `tickRound` calls `hurtsNow()`, which independently encodes "attacking AND past wind-up." The entire premise of the card ("every system ASKS the table; none carries its own opinion — one place to be wrong") is violated by the module that declares it. `enemy-lifecycle.md`'s table ("attacking: hurts — past wind-up") even disagrees with the code table ("canHurt: true"), papering over the discrepancy in prose. The next state added (stunned) will get `canHurt` wrong silently because nothing consults it.
**Fix:** delete `canHurt` from the table and the docs, or make `hurtsNow` read it plus wind-up arithmetic that lives in the table's definition. One of the two must go.

### 5. At wave cap, enemy state flapping re-renders all 40 `Monster` components essentially every frame
**File:** `enemies/Enemies.jsx`, `store.tick` (`changed` → `patch.enemies = stepped`), `Monster.jsx`.
**Failure:** An engaged enemy cycles `attacking → alive → attacking` every ~0.667s (`ATTACK_SECONDS`). With 40 enemies in contact-adjacent states, `changed` is true on nearly every frame, so `enemies` gets a new array identity ~60×/s, and the `useGameStore((s) => s.enemies)` subscription re-renders `Enemies` → reconciles 40 wrapper groups + 40 `Monster` components (props change only for transitioned enemies, but the children aren't memoized) at frame rate. The identity-check optimization the lifecycle card celebrates optimizes the *quiet* case, which at wave cap never occurs. Nobody measured this — the blueprint says "measure rather than assume" and then doesn't.
**Fix:** `React.memo` on `Monster` keyed on `(type, hp, state)`; subscribe to per-enemy slices or split the positional buffer (finding 2) from the React-visible state array. Add a frame-time assertion at a forced wave-10 board to the browser suite.

### 6. The pathfinding tripwire is blind to the two systems walls actually break: hitscan and player collision
**File:** blueprint §6 (Slice 10), `CONCEPTS/steering-vs-pathfinding.md`.
**Failure:** The tripwire is written purely about *movement* ("walls the player must not walk through"). But Slice 10 also breaks (a) **shooting** — `hitscan` tests enemies only; every shot will pass through walls, so the food court's cover is one-way cover for the AI and decoration for the player; (b) **the player** — `movement.js` `step()` has no collision at all, so the player walks through the walls that were the point of the slice. The doc's own numeric tripwire ("more than ~30 agents") is *already exceeded* — the wave cap is 40 — and the game still works, proving that number wrong and teaching Sean a wrong threshold.
**Fix:** rewrite the tripwire to enumerate all four consumers of world geometry (enemy steering, player movement, hitscan occlusion, spawn-ring validity — a ring spawn will place enemies *inside* walls). Fix or delete the "30 agents" figure.

### 7. The dismemberment plan is incompatible with the asset contract that just shipped
**File:** blueprint §6 slice 8b; §5 (skeleton contract).
**Failure:** The plan says "design it INTO the roster assets rather than retrofitting" — but all four roster assets are already `validated` against `skeleton.creature-small.v1`: one blob geometry on **3 bones**. "Feet, toes" severing is not expressible on a root/mid/tip rig, and part-tagged meshes invalidate every manifest signature, every clip (five verified clips per monster must be re-exported against the new rig), and the browser crowd tests. The work is a full re-run of slice 8a ×4 presented as an additive pass, and locational hitscan (finding 3) needs the entry-point fix first or part selection will be wrong. Nothing in the plan acknowledges re-validation cost or the hitscan prerequisite.
**Fix:** re-scope 8b explicitly as "roster v2 asset contract" with a budget for re-export/re-verify of all four monsters, and sequence the `hitscan` entry-point fix (finding 3) as its first PR.

---

## MEDIUM

### 8. `lastHitAt === 0` suppresses the hitmarker for any hit timestamped at clock 0
**File:** `ui/Hud.jsx` (`lastHitAt > 0 &&`), `state/store.js` (`clockNow` starts 0).
**Failure:** `shoot()` stamps `lastHitAt: clockNow`; `clockNow` is only advanced by `tick`. A hit registered before the first `tick` runs (Enemies' `useFrame` vs TriggerControl ordering on frame 1, or a direct `__swanGameStore` shot in a test) is stamped `0` and the `0 = never` sentinel swallows it. Sentinel-value-in-band bug — the exact class this project lectures about.
**Fix:** initialize `lastHitAt: -1` and test `> -1`, or use a separate `hasHit` boolean.

### 9. Frame-order coupling: tick uses this frame's player position but last frame's enemy positions, and none of it is specified
**File:** `App.jsx` (component order Player → Enemies → FpsRig → TriggerControl), `Enemies.jsx`, `Player.jsx`.
**Failure:** Correctness of "strike lands only if still in range" silently depends on Player's `useFrame` running *before* Enemies' tick (it does, because of mount order — an accident). Reorder `<Player />` after `<Enemies />` and damage detection lags a frame against strafing; nothing tests or documents this. Same for TriggerControl reading `clockNow` that only Enemies' tick advances — move `tick` out of `Enemies` and every kill timestamp skews.
**Fix:** make ordering explicit (a single `useFrame` root that calls tick/steer/shoot in a declared order, or `useFrame(..., renderPriority)`), and document it in the game-loop card, which currently implies ordering doesn't matter.

### 10. Per-frame allocation churn: snapshot map, `stepped` array, `__swanEnemyPos` rebuild — every frame, 40 enemies
**File:** `Enemies.jsx` (`list.map`, `__swanEnemyPos = list.map(...)`), `store.tick` (`stepped` array + patch object every frame).
**Failure:** The codebase carefully hoists `_dirScratch` and lectures about GC ("allocating in a frame loop feeds the garbage collector") while allocating 80+ short-lived objects per frame at cap in three other places. Not fatal at 40, but it's the stated principle violated in the same file that states it, and it scales with the cap.
**Fix:** reuse a preallocated `stepped` buffer and mutate it in place (positions are already mutated anyway — finding 2), and publish `__swanEnemyPos` on a throttle or only in test builds.

### 11. `Monster.jsx` flinch and state-clip effects fight over the mixer on every hit
**File:** `enemies/Monster.jsx`.
**Failure:** The `hit` flinch `reset().play()`s `hit` while `move` is also playing (no `stop`/crossfade of the base clip, no `LoopOnce` clamp on the flinch's *finish*). During an attacking state, a non-killing hit layers `hit` over `attack` mid-windup — the visual telegraph the whole dodge design depends on is corrupted exactly when it matters. `fadeOut` on cleanup fades whatever action was last begun, so rapid hits can fade the wrong clip. No test observes clip blending.
**Fix:** stop/fade the locomotion clip before the flinch, restore it on flinch completion (`mixer.addEventListener('finished')`), and suppress flinch during `attacking` (the telegraph is gameplay, the flinch is decoration).

### 12. Attack/lifecycle durations are duplicated constants pretending to be one source of truth
**File:** `systems/lifecycle.js` (`ATTACK_SECONDS = 16/24`) vs `swan_pipe.py` `CLIPS` frame tables vs `Monster.jsx` playing clips at mixer default rate with 0.15s fade.
**Failure:** `ATTACK_SECONDS` assumes the clip is 16 frames *at 24fps exported at 24fps* and starts instantly; the mixer adds `fadeIn(0.15)` — so the state machine expires the attack ~15% before/after the visual lunge depending on export FPS. If anyone re-exports a clip at 30fps, the "the state lasts exactly as long as the animation" comment becomes false and nothing fails — `verify-clips` checks clip properties, not this coupling.
**Fix:** derive the constant from the GLB's actual clip duration at load (one source), or assert in `validate-asset` that exported clip durations match the lifecycle table.

### 13. `reset()` does not reset `window.__swanShotsFired`, and the seams drift
**File:** `state/store.js`, `reset()`.
**Failure:** After "Go again", `__swanKills` is zeroed but `__swanShotsFired` persists across rounds. Any future per-round stat (accuracy display — the obvious next HUD number) silently inherits the previous round's shots. The seams are claimed to be "narrow"; they are also *unmanaged* — reset is exactly where they should be centralized.
**Fix:** one `publishSeams(state)` function called from `tick` and `reset`, owning every `__swan*` write.

---

## LOW

### 14. Teaching layer references deleted code as if live
**Files:** `CONCEPTS/collision-without-physics.md` (`fireAt`, `HIT_RADIUS` — mechanic deleted in the FPS slice, per your own TEST-DELTA note in `combat.test.mjs`); `CONCEPTS/input-state-render.md` (the "camera lags on purpose" section describes `cameraFollow.js`, deleted); `GLOSSARY.md` ("raycast … a flat mouse position becomes a world point" — the click-to-ground mechanic, deleted; "LOD … this is how you keep 40 monsters on screen" — no runtime LOD selection exists); `docs/aftertaste/README.md` ("drag to orbit" — OrbitControls deleted). The project's own rule — docs that claim behaviour the game doesn't have are lies — is violated four times.
**Fix:** sweep every concept card against current exports on each slice; the rule you wrote for commits applies to docs.

### 15. "One place to tune" claims are false for two of the four constants
**File:** blueprint §2 table; `state/store.js` (`18` appears in `firstWave`, `tick`, `reset`), `enemies/steering.js` (`ENEMY_SPEED = 2.2` is now dead — the roster supplies every real speed; only the default fallback reads it).
**Failure:** Change the documented spawn-radius row and waves still spawn at 18 from two other call sites; `game-feel.md` tells Sean to tune `ENEMY_SPEED`, which affects nothing at runtime since every enemy carries a roster speed. A beginner following the teaching layer edits a number and observes no change — the worst possible lesson.
**Fix:** hoist `SPAWN_RADIUS` to one export; delete or re-role `ENEMY_SPEED`.

### 16. Factual wobble in the teaching layer
**File:** `CONCEPTS/fps-camera-and-hitscan.md` — "most guns in Overwatch and Battlefield are hitscan" is wrong for a large fraction of both rosters (projectiles are first-class in OW). `CONCEPTS/collision-without-physics.md` — "every enemy checking every other … 250,000 comparisons per frame … kills the frame rate long before rendering does" is false in JS at this scale (1,600 comparisons at n=40 is microseconds); the doc's own project disproves its drama. Sean is being taught confident wrong numbers.
**Fix:** soften both claims to what is actually true.

### 17. Blueprint self-inconsistency in test counts
**File:** header ("90/90 unit tests, 14/14 browser") vs §5 ("47/47 unit, 11/11") vs §6 slice rows ("82 unit / 13 browser", "90 unit / 14 browser"). The packet's own accounting of proof is unreconciled — the project that insists "the word 'done' costs evidence" cannot state its evidence count once.
**Fix:** one source of truth for counts, generated.

---

## Test-suite blind spots (specific green-while-broken assertions)

- **`fps.spec.js` "holding the trigger fires repeatedly"**: asserts `shots > 1` and `kills > 0`. A trigger that *never stops firing after mouseup* passes fully. No assertion anywhere that firing ceases on release, or that rate is bounded above by `FIRE_INTERVAL` (a broken trigger firing 60/s passes).
- **`round.spec.js` "losing all hp"**: teleports enemies by mutating store objects — it never exercises the real damage path (enemy walks into touch range → attacks → windup → strike) in a browser. If `stepLifecycle`'s `inTouchRange` wiring in `tick` were dropped, every browser test stays green; only node tests would catch it, and only at the unit level.
- **`combat.test.mjs`**: never tests overlapping spheres with conflicting center-vs-entry order (finding 3) — the nearest-center bug is invisible to the entire suite. Never tests a target whose sphere *straddles* `t = 0` (origin inside sphere).
- **`lifecycle.test.mjs`**: never tests being *killed while attacking* (dying stamped with `clockNow` from `shoot` rather than `stateSince` continuity), nor an attacker whose target leaves and re-enters range mid-attack.
- **No test anywhere** exercises: pointer-lock acquisition/loss behaviour, Esc during fire, wave-clear and strike landing on the *same* frame, the wave cap board (40 enemies — zero performance assertions in a suite whose cap is justified as "a performance guarantee"), or `reset()` while the trigger is held.
- **`fryling.spec.js`/`roster.spec.js`** assert material darkening by hex hardcode `'7a2418'` — a tint change in the roster row breaks the test for a non-reason, the exact "incidental arrangement" failure mode §10.2 warns about.

---

## What I could not verify from this packet

- Whether `verify-clips.mjs`, `validate-asset`, `swan_pipe*.py`, the manifests, and the four roster GLBs exist and match the described contracts — none of the asset pipeline source or manifests is included.
- Actual frame timings at wave cap — no profiling data, no perf test; findings 5 and 10 are structural arguments, not measurements, same as the blueprint's own unmeasured claim.
- The claimed test-run counts (90/14) and the 3×-no-flake history — only the test *source* is in the packet.
- `tests/shooting.spec.js` deletion, `CONCEPTS/fps-camera-and-hitscan.md`'s claim about `window.__swanLook` being "the same applyLook the real handler calls" (true from source, but the headless-refusal behaviour itself is untested), and whether `useAnimations` from drei 9.114 behaves as `Monster.jsx` assumes across Suspense re-suspensions for four concurrent GLBs.
- `cameraFollow.js`, `Shooting.jsx`, and `Fryling.jsx` are listed in §1's tree but not provided — the file map and the packet disagree about what is live; I could not confirm which version of the tree the branch actually contains.
