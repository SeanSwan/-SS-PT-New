---
decision: Continue Project Aftertaste with the DISMEMBERMENT pass (Sean's standing directive) — part-tagged geometry from the pipeline + locational hitscan; 6b, FPS, lifecycle wiring, and the full four-monster roster (8a rigs `8a7cfda41` + 8b in-game `546654624`) all landed 2026-09-01
status: open
supersedes: none
---

# Handoff — Project Aftertaste (the game)

**Written** 2026-09-01 · **Branch** `codex/aftertaste-hardening-20260830` · **HEAD at writing** `de9856db5`
**Linear** SWA-211 (In Progress) · **Audience** the next agent, with no prior context.

> **The one thing to understand before touching anything:** this is a **grey-box** built boxes-first
> on purpose. If it is not fun with boxes it will not be fun with monsters. Sean is **new to game
> development** and has said so plainly — *"school me right now and set me up so it's the best that
> it can be for a person who is new to build his own video games."* **The teaching layer is not
> decoration, it is a deliverable.** Every slice ships a concept card. Do not skip it because the
> code works.

---

## 1. What the game is

Project Aftertaste — a voxel zombie-survival game. **CoD Zombies with food monsters**, in the
Swanverse's fallen food court. React Three Fiber in the browser.

**It is currently playable.** Boxes, but a real round: you move, enemies swarm you, you shoot them,
waves escalate, you die, you go again.

```
packages/aftertaste/
  src/
    App.jsx                  the scene: canvas, lights, camera rig
    world/Ground.jsx         floor + grid (the grid is load-bearing — see §4)
    player/Player.jsx        the blue box you drive
    player/movement.js       PURE movement rule            (7 unit tests)
    enemies/steering.js      seek + separate               (10 unit tests)
    enemies/Enemies.jsx      ONE component owns the flock
    enemies/Fryling.jsx      the real model — WRITTEN, NEVER RENDERED (§5)
    combat/combat.js         hits/damage/fireAt            (11 unit tests)
    combat/Shooting.jsx      click → raycast → world point
    systems/waves.js         waveSize/spawnRing/tickRound  (12 unit tests)
    systems/cameraFollow.js  smoothed third-person follow
    state/store.js           zustand: player + game state  (7 unit tests)
    ui/Hud.jsx               HP / Wave / Kills / Remaining + game over
  tests/                     47 unit (node --test) + 9 browser (Playwright)
docs/aftertaste/             THE TEACHING LAYER — glossary, concept cards, learning path
```

**Run it:** `cd packages/aftertaste && npm run dev` → `http://127.0.0.1:5299`
**Test it:** `npm test` (unit then browser) — currently **47/47 unit, 9/9 browser**, run 3× with no flake.

---

## 2. Slices 1–5, done and committed

| Slice | What | Commit |
|---|---|---|
| 1 | boots to a live WebGL2 canvas | — |
| 2 | you drive a box; camera follows | — |
| 3 | enemies seek you, and separate | — |
| 4 | click to shoot; enemies take damage and die | — |
| 5 | **a round you can lose**: waves, contact damage, death screen, restart | `cc7f7c504` |
| 6a | **the Fryling is really rigged**, five clips proven to animate | `de9856db5` |

### The tuning constants that ARE the feel of the game

All four are named and in one place on purpose, so Sean can change the game by editing a number:

| Constant | Where | Now |
|---|---|---|
| `SPEED` (player) | `player/movement.js` | 5 |
| `ENEMY_SPEED` | `enemies/steering.js` | 2.2 |
| `INVULN_SECONDS` | `state/store.js` | 1.0 |
| `PLAYER_HP` | `systems/waves.js` | 3 |
| `waveSize(n)` | `systems/waves.js` | `1 + n*2`, capped 40 |
| spawn ring radius | `state/store.js` | 18 |

**`SPEED` vs `ENEMY_SPEED` is the most important relationship in the game.** The *ratio* decides
whether this is a game about dodging or about positioning. Make enemies faster than the player and
there is no game left, only a countdown.

---

## 3. Two defects Slice 5 found that are worth carrying as lessons

### 3.1 The round was unloseable, and both unit suites were green

`store.tick` suppressed damage during the invulnerability window by handing `tickRound` an **empty
enemy list**. An empty list also means **"wave cleared"**. So every hit advanced the wave and
respawned the flock at radius 18 instead of costing a life.

`tickRound` was correct. The store's state was correct. **The bug lived in the seam where they
compose**, which is a layer neither unit test covered. `tests/store.test.mjs` now tests that layer.

> **Suppress the CONSEQUENCE, never the INPUT.** The moment you fake a function's input to change
> one output, you change every *other* thing that function derives from that input.

### 3.2 The regression test passed against the broken code

The first version of that test only ticked the **non-merciful** frame — which never reaches the bad
path. It passed, and proved nothing. Only after being rewritten to enter the mercy frame did it
fail.

> **A test that has never failed has proven nothing.** Write it, watch it go red against the real
> defect, *then* fix. This is not optional ceremony; it is the difference between a test and a
> comment.

---

## 4. Three legibility defects no test could catch

Found by **looking at a screenshot** — worth remembering as a technique, because the suite was fully
green while all three were live:

1. **The floor had no features.** With a camera that follows the player, the player stays centred, so
   on a plain floor *nothing on screen changes as you move* and the game reads as frozen. A grid
   fixed it — and doubles as a free ruler: one square is one world unit, so you can SEE that the
   player covers 5 units/sec and an enemy 2.2.
2. **The camera was too close.** At y7/z10 it covered ~20 units while enemies spawn on a ring of
   radius **18** — they arrived entirely off-screen. Being killed by something you were never shown
   is a missing camera, not difficulty. Now y13/z15.
3. **Shadows were never on.** `castShadow`/`receiveShadow` had been set on meshes since Slice 1 and
   did **nothing**, because shadows are off at the renderer unless `<Canvas shadows>` asks for them.
   Silent, not an error. A contact shadow is the strongest single cue for *where* a thing is on the
   floor.

---

## 5. WHERE YOU ARE PICKING UP — Slice 6, half done

### Done and proven: the asset

`assets/runtime/enemy/fryling/` is **`status: validated`** (was `planned`), carrying all **five**
clips the skeleton contract names, each verified to actually animate:

| Clip | Frames | Motion | Must |
|---|---|---|---|
| `idle` | 24 | breathing sway | close (loop) |
| `move` | 16 | waddle — rocks and dips | close (loop) |
| `attack` | 16 | wind-up then lunge | close (recover) |
| `hit` | 12 | flinch and recover | close (recover) |
| `death` | 24 | topple | **NOT** close |

Geometry 292/146/60 triangles, collision 18. LOD0 is the only rigged tier (3 bones: root/mid/tip) —
lower tiers are distant silhouettes that never animate.

**New gate:** `scripts/assets/verify-clips.mjs` proves a clip *animates* rather than merely exists,
and checks loop closure. Run it:

```bash
node scripts/assets/verify-clips.mjs assets/runtime/enemy/fryling/lod0.glb \
  --loop idle,move,attack,hit --once death
node scripts/assets/verify-clips.mjs --selftest    # 7 negative controls
```

**Clip names come from the registry, not from taste.** The first attempt authored `walk` and `die` —
the words a person reaches for. `validate-asset` rejected both: `skeleton.creature-small.v1` names
`idle, move, attack, hit, death`, and a `validated` asset must carry all five. Good gate.

### DONE 2026-09-01: the model is in the game (commit `684a564db`)

Slice 6b landed: `Enemies.jsx` renders a Fryling per enemy (position writes land on a wrapper
group; the Slice-3 box survives as the Suspense fallback), `vite.config.js` carries `fs.allow` for
the repo root, and `tests/fryling.spec.js` proves it in a browser — one SkinnedMesh per enemy,
distinct root bone per enemy (the crowd-bug regression), a bone quaternion advancing, and
`store.fire()` darkening exactly the monster it hit. Suite: 47/47 unit, 11/11 browser ×3.

The same slice's screenshot review found a **pre-existing** renderer defect (present since Slice 2,
confirmed against stashed code): after ~9 units of travel the fixed grid's along-view lines stop
rasterizing (Windows GL near-plane line clipping). Fixed in `ccfc750a8` by making the world
translation-invariant — floor/grid/sun follow the player (grid in whole-unit snaps), guarded by
`tests/world.spec.js`, taught in `CONCEPTS/debugging-by-elimination.md`. New browser-test seams:
`window.__swanScene`, `window.__swanCamera`.

The original work order is kept below because its reasoning still teaches (all four steps were
done, in this order):

1. **Vite must be allowed to serve the GLB.** It is imported by URL from the repo-root asset
   directory — `import frylingUrl from '../../../../assets/runtime/enemy/fryling/lod0.glb?url'` —
   which is **outside** the Vite project root. You will need `server.fs.allow` to include the repo
   root in `vite.config.js`. **Do not copy the GLB into `public/`**: a second copy is a second thing
   to keep in sync, and the manifest's sha256 would then describe a file the game does not load.
2. **Render one Fryling** in place of one box and look at it. Expect to fix scale/offset first: the
   GLB measures **2 × 3 × 2 with its origin at a corner** (measured from the POSITION accessor, not
   guessed), while the box it replaces was 1×1×1 centred. `Fryling.jsx` already scales by 1/3 and
   offsets by −1/3 on X and Z — verify that lands its feet on the floor and its centre on the
   enemy's actual position. If the model stands beside where the game thinks it is, every collision
   looks unfair for reasons you cannot see.
3. **Then all of them.** Note `Fryling.jsx` uses `SkeletonUtils.clone`, not `.clone()` — an ordinary
   clone keeps pointing at the **original skeleton**, so all forty enemies animate identically,
   driven by whichever mixer ran last. It produces no error, just wrong-looking output. It is the
   most common three.js crowd bug.
4. **Write the browser test.** "Exists" is not "renders": assert a `SkinnedMesh` is actually in the
   scene and the mixer is advancing — do not assert on the import succeeding.

**Performance to watch:** 40 skinned meshes each with its own `AnimationMixer`. Fine for a 3-bone
rig, but measure rather than assume. If it bites, the escape route is instancing, and the flock
already lives in a plain array precisely so that stays open.

### Deferred on purpose: `attack` and `death` are not wired

Both need an **enemy lifecycle the game does not have**. An enemy that is mid-attack or mid-death is
still on the board but must not damage you, block a wave from clearing, or be shot again. That is a
**behaviour slice, not an asset one** — wiring the clips without the lifecycle would produce corpses
that kill you and dying enemies that keep a wave open forever.

Currently `Fryling.jsx` plays `move`, and flinches with `hit` on damage.

---

## 6. Suggested slice order after 6

| Slice | What | Why here |
|---|---|---|
| ~~**6b**~~ | ~~finish 6 — model in game, verified in browser~~ **DONE 2026-09-01**, `684a564db` + world fix `ccfc750a8` | the pipeline reached the runtime |
| ~~**FPS**~~ | ~~Overwatch/BF6 shooting~~ **DONE 2026-09-01**, `26bf9cb99` — Sean's mid-session directive. First-person camera (eye 1.6, fov 75, pointer lock), view-relative WASD, hitscan (`combat.js` ray-vs-sphere), hold-to-fire, crosshair + hitmarkers. Grid became a floor TEXTURE (line primitives clip-broken at eye height), fog added, enemies got emissive. Old click-to-shoot mechanic + its spec deleted. | the game Sean actually asked for |
| ~~**7**~~ | ~~WIRE the enemy lifecycle~~ **DONE 2026-09-01**, `7518c2707` — kills topple (corpses ride wave respawns, untargetable, don't hold waves), attacks telegraph (ATTACK_WINDUP = the dodge window; proximity damage left the game), spawns are fair both ways. All rules answered by the ONE capabilities table. 82 unit / 13 browser. Card: `CONCEPTS/enemy-lifecycle.md` | the state machine everything else needed |
| ~~**8**~~ | ~~the other three enemies~~ **DONE 2026-09-01** — 8a `8a7cfda41`: all three rigged with five verified clips, `validated`, lod1/2/collision byte-identical to the prop builds (rig-only change, same signature as the fryling). 8b `546654624`: in the game as DATA — `roster.js` (facts, node-tested schema + the every-monster-slower-than-player ratio law), `models.js` (Vite-only URLs quarantined), `Monster.jsx` (one component, any row; Fryling.jsx deleted). Stat spread = role system; waves unlock one face at a time, deterministic cycle; per-target aimRadius. 90 unit / 14 browser ×3. Card: `CONCEPTS/data-driven-monsters.md` | same pipeline, one row + one URL per monster |
| **8b** | **dismemberment — Sean's standing directive**: "shoot off body parts, limbs, head, legs, feet, toes." Needs (a) locational hitscan — per-part spheres instead of one, the ray already reports where it struck; (b) severable part meshes, which means the Blender pipeline must emit part-tagged geometry (the current Fryling is one blob on 3 bones — nothing to sever). Design it INTO the roster assets rather than retrofitting | headshots and gore are the CoD-Zombies fantasy; asset contract must be born with parts |
| **9** | sound | the feedback moments already exist (hit, kill, wave, death) — they were built as hooks |
| **10** | the food court itself — walls, props, a place | **this is the slice that needs pathfinding**; see the tripwire below |

**The pathfinding tripwire, written down so it is a decision and not an instinct:** steering (what we
use) is correct while there is nothing to route around. The moment there are **walls the player must
not walk through**, revisit `CONCEPTS/steering-vs-pathfinding.md`. Not before — 40 monsters each
running A* every frame is a budget you do not have, and an open food court has nothing to route
around.

---

## 7. The teaching layer — a deliverable, not a nicety

`docs/aftertaste/` — this is why Sean can follow the code. **Every slice must ship its concept card.**

| File | What |
|---|---|
| `GLOSSARY.md` | 41 terms, each defined on first use |
| `LEARNING-PATH.md` | one video per slice, tied to a milestone, each ending in *what you can now DO* |
| `CONCEPTS/game-loop.md` | update-then-draw, and why you never write the loop yourself in R3F |
| `CONCEPTS/input-state-render.md` | why a key handler changes a number, not a box |
| `CONCEPTS/steering-vs-pathfinding.md` | boids vs A*, and the tripwire for switching |
| `CONCEPTS/collision-without-physics.md` | why "is this box near that box" needs no physics engine |
| `CONCEPTS/game-feel.md` | why a *correct* game is still un-fun; i-frames; the four constants |

Watching is not learning — every learning-path row ends in a thing Sean can do. The Blender MCP
videos are **deliberately last**: doing one asset by hand first is what lets him tell a good agent
suggestion from a bad one.

---

## 8. Blender MCP — NOT installed, and install it LAST

Sean wants agents building assets through Blender MCP. Before enabling `ahujasid/blender-mcp`, know
what it is — these were confirmed against the repo source, not a summary:

- **Unrestricted RCE by design**: `exec(code, {"bpy": bpy})`. Anything that can talk to it runs
  arbitrary Python on the machine.
- **Telemetry is ON by default**, shipping prompts, code and screenshots — *and manual edits* — under
  a perpetual AI-training licence.
- Cannot run headless. No mesh tools.

**It is not needed yet.** The `swan_pipe.py` route already produces validated, rigged, animated
assets from a blockout with receipts and gates — that is what Slice 6a proved. Do the roster by hand
through the existing pipeline first; adopt MCP only with telemetry off and a wrapper, and only once
Sean can judge what it produces.

---

## 9. How the asset pipeline works, for Slice 8

```bash
node scripts/assets/run-blender.mjs tools/blender/swan_pipe.py -- \
  --in assets/source/enemy/<name>/<name>-blockout.obj \
  --id enemy.<name> \
  --out /c/tmp/<name>-stage \
  --skeleton skeleton.creature-small.v1 \
  --clips idle,move,attack,hit,death
```

Blender is at `%LOCALAPPDATA%\Programs\blender-4.5.13-windows-x64`. `run-blender.mjs` is the **only**
sanctioned way to run it — a bare `blender -b --python …` exits 0 on a script that did nothing, so
the wrapper writes and checks a run receipt.

**Build into a staging dir and copy across.** The pipe refuses to overwrite a curated manifest.

Then: `measure-glb` → copy files → update manifest (`animations`, `sha256`, `status`,
`budgets.commit`, `clipContract`) → `verify-clips` → `validate-asset`.

**Clip motions live in `swan_pipe_stages.py` `CLIPS`** as frame→bone-rotation tables. A clip with no
recipe is a hard failure, never a silently shorter animation list.

---

## 10. Two mistakes from this session, kept because they cost real time

### 10.1 I nearly "fixed" a pipeline that was working

My first `verify-clips.mjs` read the keyframe count from `animation.samplers[0]`. Sampler 0 is
usually `root.translation`, which in a rotation-only clip is **constant** and therefore correctly
compressed to 2 keys. So it reported a healthy 24-key `idle` as `keys=2`, I concluded the exporter
was eating keyframes, and **committed a change to the shared Blender pipeline disabling
`export_optimize_animation_size`** — which would have written every frame of every channel (34,096
bytes vs 26,992) to fix a defect that did not exist.

Reverted. The checker now judges by **properties** (does it move, does it close) and never by
guessing intent from a key count. Both the false positive and a correctly-compressed clip are
permanent regressions in its selftest.

> **Validate the instrument before believing what it says about the subject.** A tool reporting a
> defect is a claim, not a finding.

### 10.2 A test that measured geometry instead of the claim

`enemies.spec.js` asserted "hold S and the nearest enemy gets further away". True only while every
enemy spawned at −z; Slice 5's ring spawning made it false, and it failed. **The game was correct —
the test's assumption had died.** It now measures what "you can outrun them" actually *means*: the
player covers more ground than any enemy in the same interval, which holds whatever the arrangement.

> When a test fails after a design change, ask whether it was measuring the *claim* or an
> *incidental arrangement* that happened to imply it.

---

## 11. Environment gotchas that will cost you an hour each

- **Port 5299, and `reuseExistingServer: false`.** The suite originally used 5199 — which is the
  **SwanStudios frontend**. With server reuse on, Playwright happily tested a *different
  application* and passed.
- **`host: '127.0.0.1'` is pinned.** Vite binding `localhost` resolves to IPv6 on Windows while
  Playwright polls IPv4 and hangs.
- **Never `waitUntil: 'networkidle'`** against a Vite dev server — the HMR websocket means it never
  fires. Use `domcontentloaded` plus an explicit wait for the canvas.
- **Git Bash `/tmp` ≠ Node `/tmp` on Windows.** A script written to Git Bash `/tmp` cannot resolve
  the package's `node_modules`. Put throwaway scripts inside the package.
- **`git commit -F <file>`** — the shell mangles messages containing backticks and quotes.
- **Never `git worktree remove --force` on a tree containing a junction.** It follows the link and
  deletes the real target; this destroyed a 29 MB licensed corpus on 2026-08-31.

**Test seams** (deliberate, not leaks — a browser test cannot reach into a module closure):
`window.__swanPlayerPos`, `__swanEnemyPos`, `__swanKills`, `__swanRound`, `__swanGameStore`.

---

## 12. Definition of done for the next slice

- Failing test first, watched go **red** against the real defect.
- 47+ unit and 9+ browser green, browser suite run **3×** for flake.
- Screenshot reviewed — the suite cannot see legibility.
- Concept card written for anything new Sean has not met before.
- Commit says what is **proven** and what is **not**.
- SWA-211 updated.

**Do not write "done" without current-session proof in the same message.** The word costs evidence.
