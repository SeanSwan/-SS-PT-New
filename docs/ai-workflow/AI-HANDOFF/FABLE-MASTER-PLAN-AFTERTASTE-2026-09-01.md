---
decision: "Fable's Final-Decider verdict on Project Aftertaste + the teaching-first master plan a worker-bot executes with zero decisions"
status: open
supersedes: none (reviews FABLE-PACKET-AFTERTASTE-ASSET-MACHINE-2026-09-01.md; extends aftertaste-swanverse-game-blueprint-2026-08-25.md)
linear: SWA-211 (parent SWA-60)
author: Fable 5 (claude-fable-5), Final Decider, hand-driven by Sean
privacy: IDs/roles only. No PII, no secrets, no credentials.
---

# FABLE MASTER PLAN — Project Aftertaste

**This is the review Sean asked for AND the plan that follows it.** I am Fable. Sean switched me in
to be the Final Decider, so I decide — I do not punt. Where a decision genuinely needs the roster
author, I say so and give the default that keeps work moving until he answers one question.

**A note on how to read this, because Sean is new to game development and asked to be taught:**
every game-dev term is in **bold** the first time it appears and defined in plain English right there.
The full running list becomes `docs/aftertaste/GLOSSARY.md` (Workstream 3). This document models the
teaching voice it prescribes — that is deliberate.

---

## PART 0 — FABLE'S VERDICT (the hostile review)

**Verdict: REVISE — and the revision is large, because Sean added a pillar the plan does not have.**

The engineering under the packet is real and honest. The asset factory works, it is CI-gated, and
the previous session's hardening was correct (I confirmed the six external findings were real). The
packet's grounded state is accurate — I re-verified the three load-bearing facts myself this turn,
not from memory: `packages/aftertaste` does not exist, all four creature manifests are `planned`
with zero clips, and there is **no teaching or glossary document for the game anywhere in the repo**.

But the packet is a plan for building a *thing*. Sean just told me he wants a plan for building a
*thing that teaches him to build things*. That is a different plan. Here are the findings, ranked by
how much value they leave on the table.

### F1 — CRITICAL: there is no teaching layer, and Sean just made it a first-class requirement.
The packet mentions "he's new, teach him plainly" as an instruction to the author (§7). Sean has now
elevated teaching to a co-equal pillar with the game itself: *"This system needs to be built in a way
where it's gonna be a teacher as well."* That is an architecture change, not a tone note. A system
that teaches has: a **living glossary**, per-slice **Concept Cards** (what you're about to learn and
why), tools that **narrate what they just did and why**, and a documentation set written for someone
"completely out of his element." None of that is designed. Part 3 designs it. **This is the single
biggest gap and the reason the verdict is REVISE, not APPROVE.**

### F2 — CRITICAL: three of the "four blocking decisions" do not block the next move.
The blueprint and packet both carry "the four decisions that block everything." I attacked that claim
and it does not hold:
- **Two tiers vs three** only matters when you author creature *art*.
- **The MIRROR-BREAK grammar ambiguity** only matters when you turn a creature *roster* into *geometry*.
- Both are art-authoring blockers. **The correct next move (Part 1, Decision 1) authors no art** — it
  is a grey-box probe with untextured boxes. So sequencing the probe first **removes two blockers from
  the critical path entirely**, and turns the third (mode labels) into a five-minute cosmetic choice.
- Only one decision genuinely gates the near term, and it is not on that list: **does the game exist
  at all?** (`packages/aftertaste` is absent.)

A plan that presents four gates when the real critical path has one is optimizing anxiety, not
progress. This is the highest-leverage correction in the review.

### F3 — HIGH: "the best of everything in one package" is named but not designed.
Sean wants ONE coherent thing. The packet treats asset-factory, game, docs, video-pipeline and MCP as
separate lanes. The unifying surface — the *one place you open, one command you run, one place you
learn* — does not exist in any plan. Part 2 designs it: **Aftertaste Studio**, a single local
workspace that is factory + game + living docs + teacher.

### F4 — HIGH: the packet asks for "11-part plans per workstream" but never lists Aftertaste's workstreams.
The 11-part contract was lifted from the SwanStudios app brief (workstreams A–L). Aftertaste has
different workstreams and the packet never enumerates them. A worker-bot cannot execute "for every
workstream" when the workstreams are undefined. Part 4 enumerates the six real ones.

### F5 — MEDIUM: the "grey-box fun probe" has no success metric, so it is not executable.
"48-hour probe" with no defined go/no-go is a vibe, not a slice. A worker-bot cannot run it and Sean
cannot judge it. Part 5, Slice 5 specifies exactly what is built, what is measured, and the honest
go/no-go — including that the judge is Sean's own hands, not a metric a bot can fake.

### F6 — MEDIUM: the security step-0 is flagged but never sequenced as a taught first slice.
The Ollama firewall exposure is real and open. For a beginner it cannot be a footnote — it must be
Slice 0, with the WHY taught, because it also teaches the single most important safety habit before
any MCP work. Part 5, Slice 0.

### F7 — LOW but expensive-if-ignored: the packet under-states that MCP teaches badly.
The research is right that MCP's screenshot loop is its one real advantage. But for a *beginner*, an
agent silently driving Blender through arbitrary Python is the opposite of a teacher — it hides the
`bpy` calls Sean needs to learn. MCP as a *teacher* is worse than the script, which is readable. This
sharpens the "MCP last, and only as an exploration tool" posture into a teaching argument, not just a
security one. Part 4, W4.

### What the packet got RIGHT (so it is not re-litigated)
The grounded-state honesty; the Blender-vs-engine correction (Blender authors the walk cycle, the
engine decides when to walk); the Blender-MCP security findings including the telemetry-by-default
IP-leak; the repair-vs-construction pipeline insight; and the refusal to pay for anything this phase.
All adopted unchanged.

---

## PART 1 — THE DECISIONS, MADE (Final Decider)

Sean's whole reason for switching me in: downstream agents make no decisions. So I make them here.

| # | Decision | Verdict | Reasoning |
|---|---|---|---|
| **D1** | Next move: more asset capability, or the grey-box game? | **THE GREY-BOX GAME.** Build `packages/aftertaste` and prove the loop is fun with boxes, before one more creature is authored. | The factory works and has zero consumer. The classic beginner grave is 50 beautiful monsters in a game nobody has felt yet. If it is boring with boxes it is boring with Frylings. |
| **D2** | Two visual tiers or three? | **TWO tiers, ONE cast, cluster-level variant** (swap face/head clusters + palette + material). | One name, one hitbox, one wiki, one fight; reads as a different mob. A forked cast means two players cannot discuss the same enemy. **Not on the critical path** (D1) — this only matters at first creature-art authoring. |
| **D3** | On-screen mode labels? | **"Natural / Stylised."** | "Hardcore" tells a nine-year-old what the game thinks of them. Cosmetic, five-minute change, do it when the settings screen is built. |
| **D4** | MIRROR-BREAK grammar reading (`off`/`on0`/`on1`)? | **DEFERRED by sequencing, default `off`.** Grey-box authors no creatures, so this does not block. When the first real creature is authored, Sean answers ONE question and it is settled; `--explain` already shows the roster's own parenthetical points to reader-applied. | You do not resolve a grammar ambiguity you are not exercising yet. D1 takes it off the critical path. |
| **D5** | Where does the game deploy? | **Standalone first (Law B).** In-dashboard embed (must be Law A) is a later, constrained slice. | The blueprint's own L1 makes standalone the natural home; a Law-B palette cannot live inside the Swan-chromed dashboard. |
| **D6** | Blender MCP in the pipeline? | **NO.** Hardened, telemetry-off, `execute_blender_code`-denied exploration tool, installed LAST. Never in the build path. | It cannot run headless (so cannot replace the script), adds no mesh tools, ships an IP-leak telemetry channel, and — for a beginner — hides the `bpy` calls he needs to learn. Its one real value (screenshot loop) is an exploration aid, harvested back into the script. |

**The headline consequence:** with D1 taken, the "four blocking decisions" collapse to **zero
blockers on the next month of work.** That is the plan's spine.

---

## PART 2 — THE ELEVATED VISION: "Aftertaste Studio," one package

Not four lanes. One local workspace, in the repo, that a beginner opens and a worker-bot extends:

```
Aftertaste Studio  (one repo area, one command: npm run aftertaste)
├── FACTORY   author a creature in text → game-ready GLB          (exists; W1)
├── GAME      the playable grey-box, then the real thing          (W2, the missing consumer)
├── LEARN     living glossary + concept cards + a taught path     (W3, the new pillar)
└── EXPLORE   Blender MCP, hardened, last, exploration-only        (W4)
```

**Desired end state (the bar every slice is measured against):** Sean types one command, a browser
opens to a playable Aftertaste, and next to it is a page that taught him exactly what he just saw and
why. Spectacularly simple to run, teaches as it goes, and every artifact is documentation.

---

## PART 3 — THE TEACHING LAYER (the new pillar)

This is what F1 says is missing. It is built from four mechanisms, all cheap, all durable.

### 3.1 The living glossary — `docs/aftertaste/GLOSSARY.md`
Every game-dev term defined in plain English the first time any slice uses it. Seeded now with the
terms already in play: **grey-box** (the game played with untextured boxes, to test if it is fun
before any art), **LOD** (Level Of Detail — cheaper versions of a model shown when it is far away),
**rig / skeleton** (the puppet-strings inside a model), **clip** (one animation, e.g. "walk"),
**navmesh** (the invisible floor shape that says where things can walk), **draw call** (one
instruction to the graphics card; too many = slow), **steering behavior** (simple rules like "move
toward the player, avoid your neighbors" that make a swarm look smart without real pathfinding),
**atlas bake** (packing many textures into one image for speed), **the game loop** (the code that
runs 60 times a second: read input → update the world → draw it). A worker-bot adds a row the first
time it introduces a term; the pre-commit check (W3) fails a slice that uses an undefined bolded term.

### 3.2 Concept Cards — one per slice, in the ticket AND in `docs/aftertaste/CONCEPTS/`
Every slice ships a five-line card. This is the teacher, inline:
```
CONCEPT  — the one idea this slice teaches (e.g. "the game loop")
WORDS    — the new glossary terms it introduces, linked
WHY      — why THIS slice needs it, in one sentence
WATCH    — the one video + timestamp (from the curated path) that shows it
PROVE    — "you'll know you understand it when you can ..." (a thing Sean does, not reads)
```

### 3.3 Tools that narrate — the "what just happened" footer
Every Aftertaste command prints, after it runs, a short plain-English teaching footer: what it did,
why, and what to look at. `--quiet` for CI. Example the build script would print:
> *Made 3 versions of this model at different detail levels (LODs). The game shows the cheap one when
> the monster is far away — that is how you keep 40 monsters on screen without the frame rate dying.
> Open the contact sheet to see them side by side.*

### 3.4 The taught path — `docs/aftertaste/LEARNING-PATH.md`
The curated videos, but tied to milestones instead of listed: *"Before Slice 2, watch `zwNF1-lsia8`
(0:00–8:00). After Slice 2 you will understand the game loop and Zustand state, and you will have
built one."* Ends each entry with what Sean can now DO, not what he watched.

**Why this is durable and not busywork:** the glossary and concept cards are written *as the code is
written*, by the same worker-bot, enforced by one pre-commit check. The teaching is a byproduct of
building, not a separate documentation project that rots.

---

## PART 4 — THE WORKSTREAMS (enumerated — F4)

| ID | Workstream | State | Role |
|---|---|---|---|
| **W0** | Environment & safety | firewall exposure OPEN | one-time setup; the first taught habit |
| **W1** | The asset factory | EXISTS, CI-green | harden + document; NOT the bottleneck |
| **W2** | The grey-box game (`packages/aftertaste`) | DOES NOT EXIST | **the critical path** — the missing consumer |
| **W3** | The teaching layer | DOES NOT EXIST | the new pillar (Part 3) |
| **W4** | Blender MCP (exploration) | not installed | LAST; hardened; teaching-negative, so gated |
| **W5** | Engine systems (movement, waves, pathfinding) | not built | the R3F work Sean mis-attributed to Blender |

The video-upscale/H3 pipeline is explicitly **out of scope** for Aftertaste — it is the
marketing/cinematic lane. Recorded so a worker-bot does not pull it in.

---

## PART 5 — THE SLICE PLAN (worker-bot bar, each carries a Concept Card)

Numbered, independently shippable, in dependency order. Every slice: goal · files · failing-test-first
· acceptance · hostile-review checklist · responsive targets (where UI) · rollback · **Concept Card**.
The near-term path (Slices 0–6) is specified to execution depth here; Slices 7+ are scoped and get
their own full 11-part expansion when reached (they depend on grey-box outcomes, so specifying them
now would be guessing — and guessing is what this plan exists to prevent).

### Slice 0 — Lock the machine (W0)
- **Goal:** close the Ollama Public-profile firewall exposure; establish the "understand before you
  run" habit.
- **Action (Sean, taught):** run `c:\tmp\ollama-firewall-fix.ps1` as Administrator (disables, never
  deletes; tests WSL reach; auto-reverts). Verify `Get-NetFirewallRule -DisplayName ollama.exe` shows
  the two rules disabled and "Allow Ollama From Pi" still enabled.
- **Acceptance:** the two installer rules disabled; Hermes-in-WSL still reaches Ollama.
- **Rollback:** `Enable-NetFirewallRule -DisplayName 'ollama.exe'`.
- **Concept Card:** CONCEPT firewall profiles · WORDS **inbound rule**, **network profile** · WHY a
  gen-AI tool that binds a port is a door; Public profile means the door is open on café Wi-Fi · WATCH
  n/a · PROVE you can name which of your firewall rules are Public and say why that matters.

### Slice 1 — Aftertaste Studio skeleton + the teaching spine (W2 + W3)
- **Goal:** `packages/aftertaste` exists as a Vite + React-Three-Fiber app that boots to a black
  screen with a floor, and `docs/aftertaste/` exists with GLOSSARY, CONCEPTS/, LEARNING-PATH seeded.
- **Files:** `packages/aftertaste/package.json` (exact pins: `three@0.169`, `@react-three/fiber@8.18.0`,
  `@react-three/drei@9.x`, `zustand`; NO rapier), `packages/aftertaste/index.html`,
  `packages/aftertaste/src/main.tsx`, `src/App.tsx` (a `<Canvas>` + ground plane), `vite.config.ts`;
  `docs/aftertaste/GLOSSARY.md`, `docs/aftertaste/LEARNING-PATH.md`, `docs/aftertaste/CONCEPTS/game-loop.md`.
- **Failing test first:** a Playwright test that loads the dev server and asserts a WebGL canvas is
  present and `pageerror` count is 0 — fails before the app exists.
- **Acceptance:** `npm run aftertaste` opens a browser to a lit floor; test green; glossary has ≥8 terms.
- **Responsive:** 375 · 768 · 1280 · 1920 (the game canvas must letterbox, never overflow).
- **Rollback:** delete `packages/aftertaste` (isolated; nothing else imports it).
- **Concept Card:** CONCEPT the game loop · WORDS **game loop**, **canvas**, **scene** · WHY every
  game is "update then draw, 60×/sec"; R3F hides the loop but you must know it is there · WATCH
  `zwNF1-lsia8` 0:00–8:00 · PROVE you can point to where the loop runs in the code.

### Slice 2 — A thing you control (W2 + W5)
- **Goal:** a box you move with WASD, camera following. The first moment it feels like a game.
- **Files:** `src/player/Player.tsx`, `src/player/useKeyboard.ts`, `src/state/store.ts` (Zustand),
  `src/systems/cameraFollow.ts`.
- **Failing test first:** a unit test on the movement reducer — given input "W" for 100ms, position.z
  decreases by the expected step; fails before the reducer exists.
- **Acceptance:** box moves smoothly, camera follows, no `pageerror`, 60fps on the 5090.
- **Concept Card:** CONCEPT input → state → render · WORDS **reducer**, **state store**, **frame** ·
  WHY input never touches the screen directly; it changes state, and the loop draws state · WATCH the
  same video's Zustand section · PROVE you can add a "run" key by adding one line to the reducer.

### Slice 3 — One dumb enemy that comes for you (W5)
- **Goal:** a red box that moves toward the player using a **steering behavior** (not pathfinding yet).
- **Files:** `src/enemies/Enemy.tsx`, `src/systems/steering.ts` (seek behavior), `src/systems/spawn.ts` (one).
- **Failing test first:** the seek function returns a velocity vector pointing from enemy to player;
  test with fixed positions; fails before it exists.
- **Acceptance:** the red box chases; you can outrun it; no crash when it reaches you.
- **Concept Card:** CONCEPT steering vs pathfinding · WORDS **steering behavior**, **seek**,
  **velocity** · WHY 40 monsters cannot each run a pathfinder; simple rules scale, A* does not · WATCH
  `apoFCaxUlg8` (Yuka steering) · PROVE you can make it FLEE by negating one vector.

### Slice 4 — Shoot it, and it dies (W2 + W5)
- **Goal:** click to shoot; enemy has hit-points; it dies; a counter goes up.
- **Files:** `src/combat/shoot.ts`, `src/combat/health.ts`, `src/ui/Hud.tsx` (kill counter),
  `src/systems/collision.ts` (sphere-overlap, no rapier).
- **Failing test first:** damage reduces hp; hp≤0 marks dead; test the pure functions.
- **Acceptance:** click kills the box, counter increments, dead box is removed.
- **Responsive (HUD):** 375 · 768 · 1280 · 1920 · 2560×1440; the counter never overlaps the canvas.
- **Concept Card:** CONCEPT collision without a physics engine · WORDS **hit-points**, **collision**,
  **broad-phase** · WHY rapier is heavy; for boxes-vs-bullets, distance checks are enough, and knowing
  when you DON'T need a tool is a senior skill · PROVE you can make an enemy take two hits.

### Slice 5 — THE FUN PROBE (D1's payoff, F5's metric)
- **Goal:** waves of boxes, escalating; you survive or die; a round ends with a score. Then Sean
  plays it for real.
- **Files:** `src/systems/waves.ts`, `src/state/round.ts`, `src/ui/GameOver.tsx`.
- **Failing test first:** wave N spawns the specified count at the specified interval.
- **Acceptance (mechanical):** waves escalate, death ends the round, restart works, holds 40 enemies
  at 60fps on the 5090 and ≥30fps on one real laptop.
- **Acceptance (the real one — Sean, not a bot):** Sean plays five rounds. Go/no-go question, answered
  honestly: *"did I want a sixth round without being asked?"* If no, the fun is not there yet and the
  fix is mechanics (speed, spawn rhythm, weapon feel) — **not art.** This is the whole point of D1:
  discover it here, with boxes, for the cost of one week, not after a cast of monsters.
- **Concept Card:** CONCEPT game feel · WORDS **wave**, **difficulty curve**, **game feel** · WHY
  "fun" lives in timing and response, not graphics; this is why we used boxes · PROVE you can make it
  more fun by changing ONE number, and say which.

### Slice 6 — Put ONE real creature in (W1 → W2 bridge; unblocks D2/D4)
- **Goal:** replace one box with the real Fryling GLB, authored through the existing factory, with its
  four clips. This is where D2 (two-tier) and D4 (mirror-break) finally matter — and Sean answers the
  one mirror-break question here, once, for real.
- **Files:** author `move/attack/hit/death` clips on the shared skeleton; flip
  `assets/runtime/enemy/fryling/manifest.json` from `planned` to `validated`; wire the GLB + an
  animation state machine into `Enemy.tsx`.
- **Failing test first:** `validate-asset.mjs` fails Fryling for missing clips → passes after they exist.
- **Acceptance:** Fryling walks, attacks, takes hits, dies, in the running game; the factory→game
  bridge is proven end-to-end with one asset (the "1+1" proof, now with a consumer).
- **Concept Card:** CONCEPT rig + clips + state machine · WORDS **rig**, **clip**, **animation state
  machine**, **LOD** · WHY the model is a puppet; clips are recorded motions; the state machine picks
  which plays · WATCH `bkn_uA2_qbc` (voxel→rig) · PROVE you can make it play "death" on hp≤0.

### Slices 7+ (scoped, expanded when reached)
Second creature (proves the pipeline repeats) · zone geometry + **navmesh** + `three-pathfinding`
(the tripwire moment for real routes) · the two-tier art pass (D2) · souvenirs from verified training
(L3) · Law-A embed vs Law-B standalone (D5) · Blender MCP hardened install (W4/D6). Each gets its full
11-part expansion at the time, informed by what the grey-box taught — specifying them now is guessing.

---

## PART 6 — ONE FULLY-WORKED SLICE (the pattern a worker-bot copies)

To remove all ambiguity about the bar, Slice 1 in full:

**Data/API contract:** none (client-only; no backend, no models, no endpoints this slice).
**Component breakdown (each ≤300 lines, blueprint header):**
- `src/main.tsx` (~20 ln) — React root, mounts `<App/>`.
- `src/App.tsx` (~40 ln) — `<Canvas>` with `<color attach="background">`, `<ambientLight>`,
  `<directionalLight>`, `<Ground/>`, `<OrbitControls>` (drei) for now.
- `src/world/Ground.tsx` (~15 ln) — a `<mesh>` with `<planeGeometry args={[50,50]}>` rotated flat.
- `docs/aftertaste/GLOSSARY.md` — the ≥8 seed terms from §3.1.
- `docs/aftertaste/CONCEPTS/game-loop.md` — one page, beginner voice, ~200 words.
**Exact pins (avoid the drift class):** `three@0.169.0`, `@react-three/fiber@8.18.0`,
`@react-three/drei@9.114.0`, `zustand@4.5.5`, `vite@5.x`, `@playwright/test` matching the repo.
`npm i --dry-run` first (Rule: never blind-install).
**Failing test first:** `packages/aftertaste/tests/boots.spec.ts` — start dev server, `goto`, assert
`canvas` exists and `getContext('webgl2')` is non-null and zero `pageerror`. Red before the app.
**Acceptance:** test green; `npm run aftertaste` opens a lit floor you can orbit; glossary ≥8 terms;
`docs/aftertaste/CONCEPTS/game-loop.md` exists and is linked from the LEARNING-PATH.
**Responsive:** 375/768/1280/1920 — canvas fits, never scrolls the page.
**Hostile-review checklist:** no `pageerror` (attach listener before nav); WebGL context-loss handler
present (`webglcontextlost` → pause, not crash); exact-pinned deps; the boot test actually fails with
the app deleted (prove the test can fail); glossary check fails on an undefined bolded term.
**Rollback:** `rm -rf packages/aftertaste docs/aftertaste` — isolated, nothing imports it.
**Concept Card:** as in Slice 1 above.

That is the density. Every slice reads like this before a worker-bot touches it.

---

## PART 7 — THE LIVING DOCUMENTATION SET (Sean's "solid documentation")

Created in Slice 1, grown every slice thereafter, all under `docs/aftertaste/`:
- `README.md` — what Aftertaste is, one command to run it, the map of this folder.
- `GLOSSARY.md` — every term, plain English (§3.1).
- `LEARNING-PATH.md` — videos tied to milestones (§3.4).
- `CONCEPTS/*.md` — one beginner page per big idea, linked from Concept Cards.
- `DECISIONS.md` — the Part-1 decisions, so a future agent (or Sean in three months) sees WHY.
- `ARCHITECTURE.md` — the app↔game↔factory↔teaching map + the Blender-vs-engine split (Part 5 of the
  packet), because that one misunderstanding costs months.

**One pre-commit check enforces the whole thing:** a slice that introduces a bolded game-dev term
without a glossary row, or ships without its Concept Card, fails. Teaching becomes a build gate, not a
hope — the same lesson the last learning packet drove home: *a rule that is not a mechanism does not
hold.*

---

## PART 8 — WHAT I AM DELIBERATELY NOT DOING (so it is not re-argued)

- No creature art before the grey-box is proven fun (D1). No exceptions, including "just Fryling."
- No Blender MCP until W4, and never in the build pipeline (D6).
- No rapier physics engine yet — distance checks until a real tripwire (Part 5 teaches when).
- No Godot until P6 tripwires.
- No spend (L8). No text-to-3D this phase — the voxel path is construction, not repair; text-to-3D is
  a repair pipeline and belongs, if anywhere, to props, later.
- No merge of the stale hardening branch without a deliberate sync (36 ahead / 31 behind main).

---

## PART 9 — HERMES LEARNING HOOK

What Hermes should learn from this plan: **when a plan lists several "blockers," attack the claim
before you accept the sequence — most "blockers" only block a specific downstream step, and
re-ordering the work can dissolve them off the critical path without resolving them at all.** Aftertaste
had "four decisions that block everything"; three only blocked creature-art authoring, and choosing to
build the grey-box (which authors no art) first removed them from the next month entirely. Also: **when
a system is for a beginner, teaching is an architecture, not a tone** — a living glossary, per-slice
concept cards, and self-narrating tools, enforced by one pre-commit gate so the teaching is a byproduct
of building and cannot rot.

---

## PART 10 — WHAT SEAN DOES NEXT (fewest steps)

1. **Run Slice 0** — `c:\tmp\ollama-firewall-fix.ps1` as Administrator. (Also step 0 of your own ladder.)
2. **Approve this plan** (or tell me what to change — I am the Final Decider but you are the owner).
3. **A worker-bot builds Slices 1–5** — the grey-box — with me verifying each against the bar above.
4. **You play Slice 5** and answer one honest question: did you want a sixth round?

That answer, not any document, decides whether Aftertaste becomes a game. Everything before it is
cheap on purpose.
