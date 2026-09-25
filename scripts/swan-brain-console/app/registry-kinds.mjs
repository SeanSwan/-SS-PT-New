/**
 * registryKinds — the registry names, defined exactly once.
 * @module scripts/swan-brain-console/app/registry-kinds
 *
 * ONE DEFINITION, TWO CONSUMERS, AND AN IDENTITY TEST.
 *
 * These three names are the server's PERMISSION (`readRegistry` refuses anything not in the
 * list) and the browser shell's EXPECTATION (`loadRegistries` fetches exactly these). They used
 * to be two independent frozen literals — `REGISTRY_NAMES` in `server.mjs`, `REGISTRY_KINDS` in
 * `app/app-shell.js` — with `registry-route.test.mjs` asserting they were EQUAL.
 *
 * Astra F19 (round 11, [low]) graded the resulting "single source of truth" claim FALSE, and
 * was right: equality is not single-sourcing. Two literals that agree today can disagree
 * tomorrow, and the divergence is silent in one direction —
 *
 *   - a name the CLIENT has and the server refuses → every page load reports
 *     "could not load (HTTP 404)" for that registry;
 *   - a name the SERVER has and the client lacks → served, and never fetched.
 *
 * Both consumers now import THIS module: the browser through the `/registry-kinds.mjs` asset
 * route, Node through the relative path. `registry-route.test.mjs` asserts they hold the SAME
 * OBJECT, so re-inlining the literal on either side fails rather than passing an equality check.
 *
 * DEPENDENCY-FREE ON PURPOSE — a browser loads it, so it must import nothing. It is also why
 * this is safe for `server.mjs` to import: no DOM, no I/O, no globals, no state.
 */

/** The registries the console serves and the shell fetches. */
export const REGISTRY_KINDS = Object.freeze(['tabs', 'sources', 'seats']);
