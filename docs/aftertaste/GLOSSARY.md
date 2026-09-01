# Glossary — game development, in plain English

Every term is added here the first time any slice uses it. If you meet a word in this project that
is not here, that is a bug in the docs, not a gap in you.

| Term | What it actually means |
|---|---|
| **grey-box** | The game played with plain untextured boxes instead of art, to test whether it is fun before spending time on models. Standard practice, not a shortcut. |
| **the game loop** | The code that runs ~60 times a second: read input → update the world → draw it. Every game is this loop. See `CONCEPTS/game-loop.md`. |
| **frame** | One trip through the game loop. "60 fps" = the loop completed 60 times in a second. |
| **canvas** | The HTML element the 3D picture is drawn into. A canvas can exist and be blank — its presence is not proof anything rendered. |
| **scene** | The 3D world: everything currently in it (floor, lights, monsters, camera). |
| **mesh** | A visible thing = a **shape** plus a **material**. |
| **material** | How a surface responds to light. A "standard" material with no light in the scene renders pure black — the most common "my screen is empty" mistake. |
| **radians** | How three.js measures angles. `Math.PI` = 180°, so `-Math.PI / 2` = -90°. It never uses degrees. |
| **LOD** (Level Of Detail) | Cheaper, simpler versions of a model shown when it is far from the camera. This is how you keep 40 monsters on screen without the frame rate collapsing. |
| **rig / skeleton** | The invisible puppet-strings inside a model that let it bend and move. |
| **clip** | One recorded animation, e.g. "walk" or "death". A model has several; code picks which plays. |
| **navmesh** | An invisible simplified floor shape that marks where characters are allowed to walk. |
| **steering behavior** | Simple per-monster rules ("move toward the player, avoid your neighbours") that make a crowd look intelligent without expensive pathfinding. |
| **draw call** | One instruction to the graphics card. Too many is the usual reason a scene runs slowly. |
| **atlas bake** | Packing many small textures into one big image so the graphics card needs fewer draw calls. |
| **strictPort** | A dev-server setting that makes it FAIL when its port is busy instead of quietly moving to another one. A server that silently moves is a test that silently tests nothing. |
| **delta** | Seconds elapsed since the previous frame. Multiply movement by it so speed is per SECOND and identical on a 60Hz and a 120Hz machine. |
| **normalise** | Scaling a direction so its length is exactly 1. Without it, diagonal movement is 41% faster than straight — a bug that shipped in real, famous games. |
| **store** | A small shared table of world state any component can read, instead of threading values down through every component in between. |
| **ref** | A React value that can change without causing a re-render. Used for things that change every frame, because 60 re-renders a second is how a React game gets slow. |
| **test seam** | A deliberate, documented hook added so a test can observe something it could not otherwise reach. Kept narrow so nothing else depends on it. |
| **pathfinding / A\*** | Searching a map for a route around obstacles. Clever, and costs a real search per agent — which is why 40 agents re-planning every frame kills a browser game. |
| **A\* (a-star)** | The standard pathfinding algorithm. Needs a navmesh, and pays for cleverness with CPU time. |
| **seek** | The simplest steering rule: a unit-length direction pointing at the target. |
| **separation** | The rule that stops a flock stacking into one square. Closer neighbours push harder. Without it, seek alone gives you one box wearing 39 hats. |
| **boids** | Craig Reynolds' 1987 flocking model (seek/separate/align). The origin of nearly every crowd in games and film. |
| **NaN** | "Not a Number" — what you get from dividing by zero. It does not throw; it silently propagates, and a NaN position makes an object vanish with no error to search for. |
| **snapshot** | Reading every agent's position *before* moving any of them, so each steers against the same world state instead of a half-updated one. |
| **tripwire** | A written-down condition that says when to switch tools (e.g. "more than 30 agents needing real routes -> now you need pathfinding"), instead of switching on instinct. |
| **raycast** | Firing an invisible ray from the camera through the pixel you clicked to find what it hits in 3D. How a flat mouse position becomes a world point. |
| **hit-points (hp)** | How much damage a thing absorbs before dying. Flooring at 0 matters: negative hp breaks every UI that draws a bar. |
| **HUD** | Heads-Up Display — the score and status drawn over the game. Done in plain HTML here, because 3D text costs draw calls and fights antialiasing. |
| **pure function** | A function that reads its inputs and returns a new value without changing anything. Testable in milliseconds, and it cannot corrupt a snapshot another system is reading. |
| **physics engine** | A library simulating real collisions, stacking and friction (rapier, cannon). Powerful, heavy, and unnecessary when your question is only "is this box near that box". |
| **game feel** | How a game responds to you, as distinct from what its rules say. Almost always a handful of timing constants, not a system. |
| **i-frames (invulnerability frames)** | A brief window after taking damage during which you cannot be hit again. Without it, per-frame contact damage kills you in a heartbeat. |
| **wave** | One batch of enemies. Clearing it advances to a bigger one — the simplest difficulty curve there is. |
| **difficulty curve** | How much harder each wave gets. Here it is literally one function, `waveSize(n)`. |
| **fun probe** | Reaching a playable state as early as possible, on purpose, while changing a number is still cheap. |
| **seam** | The join between two components. Both can be correct and the join still wrong — which is why the seam needs its own test. |
| **negative control** | Deliberately checking that your test FAILS when the bug is present. A test that has never failed has proven nothing. |
| **skinned mesh** | Geometry bound to a skeleton: clips move the bones, the mesh follows. The bind is also where crowd bugs live — see CONCEPTS/skinned-mesh-crowds.md. |
| **AnimationMixer** | The runtime player that advances a clip onto a skeleton a little every frame. No mixer update, no motion — a model without one stands in its bind pose, silently. |
| **SkeletonUtils.clone** | The clone that duplicates the bones too. Ordinary `.clone()` shares the original skeleton, so a whole crowd animates as one creature — with no error. |
| **bind pose** | The shape a skinned model holds when no clip is playing (often a T or A pose). Seeing it in-game means the mixer is not running, not that the model is broken. |
| **Suspense** | React's "this component is still loading" boundary. `useGLTF` pauses the component until the file arrives; Suspense says what to render meanwhile — here, the grey box. |
| **translation-invariance** | Arranging the world so absolute position stops mattering — floor, grid and sun follow the player. If it renders right at spawn, it renders right everywhere. |
| **near plane** | The camera's closest visible distance. Geometry crossing it must be clipped, and lines that cross far behind the camera are where Windows GL visibly gets clipping wrong. |
