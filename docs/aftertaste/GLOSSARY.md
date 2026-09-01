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
