---
surface: vs-claude
utc: 20260717T221928Z
topic: SHIPPED (docs) — the Living World Site Generator master prompt + the KIMI convergence method that produced it
tags: [world-engine, design-system, kimi, prompt-authoring, coordination]
---

## What I did / learned
- **Committed the finished, SHIP-verified "Living World Site Generator" master prompt** (`b3824d692`, docs-only, on the wip/comms working branch): `docs/ai-workflow/AI-HANDOFF/SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT-2026-07-17.md`. This is the artifact Sean pastes to a builder AI to spin up SwanStudios living worlds.
- **The KIMI convergence method is the transferable lesson.** `scripts/consult-kimi.mjs` is a REVIEW tool by construction — its prompt template ends with "PRODUCE YOUR REVIEW NOW", so KIMI reviews whatever you give it and will NOT author, no matter what the document asks. Fighting that wasted two calls. The method that worked: **let KIMI review (its strength), I author from its findings, then feed MY draft back to KIMI to review, patch, repeat until it says SHIP.** Use `--remit` to override the default hostile-review remit when you need a different framing (e.g. "confirm SHIP, terse, verdict on line 1"), and use `--effort medium` for confirm passes.
- **KIMI at `--effort high` can return "(empty response)" while still billing ~16k output tokens** — it exhausts the output cap on internal reasoning and emits no text. Fix: drop to `--effort medium` + a terse remit that demands a short, verdict-first answer. The re-run cost 1/3 as much and produced a clean verdict.
- **The confirm-pass earned its keep:** patching in the 15 round-1 fixes ADDED a canonical WorldScript JSON block + oklch palette, and the confirm pass caught 3 NEW bugs I introduced there (an `em` value violating my own px/rem typing rule; a per-layer-skip rule that referenced a field layers don't have; an `edge-glow intensity` that violated the doc's own ΔL≤0.05 luminance cap — in the fail-closed DEFAULT, which must satisfy its own law). Lesson: patching introduces defects; always re-verify the patched artifact, and validate any embedded JSON actually parses (I ran `node -e JSON.parse` on it).
- **Two Sean design rulings are now brand law:** (1) OPTICS-NOT-CREATURES — render nature as light/refraction/caustics, never literal creature silhouettes (a whale silhouette behind a workout table = clip-art); enforce it structurally by giving the renderer NO arbitrary-geometry primitive, so a creature is *unauthorable in the format*. Whale=sonar light-rings, swan=the Crystallize moment. (2) RAINBOWS STAY AS LIGHT — physically-correct dispersion (red-out/violet-in, ~40-42°), never a striped conic arc.

## Why it matters to Hermes
- **When a paid design brain keeps "reviewing instead of doing," check the tool's remit before spending more calls.** The consult-* scripts inject a fixed remit; that shapes the output more than the document does. This will recur with any consult-tool.
- **Every embedded artifact (JSON/schema/config) inside a prompt or doc must be parse-validated, not eyeballed.** Three of KIMI's final blockers were internal-consistency bugs in hand-written JSON that looked fine.
- **The fail-closed DEFAULT must satisfy its own constraints.** A default that violates the very caps it's supposed to guarantee is a silent hole — check the default against every rule the system enforces.
- **Lane split holds and is on the ledger:** this generator is CODE-mode (marketing sites), Sean's must-build World Atmosphere layer is TOKEN-mode (in-app), built by the World-Engine lane from the blueprint. The `--world-*` token contract is the only shared seam. Builder handoff for the atmosphere enhancement (optics reframe + 12 mechanized fixes) is logged in `review-queue.md`.

## State right now
- Master prompt: COMMITTED `b3824d692` (docs-only, wip/comms branch — NOT on main, NOT pushed; it's a paste-to-builder artifact, doesn't need to be on main). All 15 round-1 + 3 confirm-pass fixes applied; canonical JSON validated with node.
- KIMI spend this arc: 8 calls, ~$1.62, all design-scoped / PII-free / grounded on verified `origin/main 96ac6bd3d`.
- World Atmosphere enhancement (Track B): handed to the build lane via the coordination ledger (optics-not-creatures + mechanized distraction caps + determinism seed + oklch crossfade + corrected file budget: Slice 2 is L not M).

## Sean owes / blockers
- Two decisions still parked, both feeding the World-Engine build lane: (a) fuse the swan-mark into the DEFAULT world? (§7 concept 5 leans this way); (b) confirm `worldId` added to `AppearanceProfile` + a "World" tab in the existing Appearance Studio (vs a new header control — the receipt agent already recommends the Studio path).
- Seedance (video-gen) still unavailable (~2 days out); the generator produces zero-video-today worlds with a specced video slot for when it lands.
