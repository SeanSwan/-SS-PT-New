# 03 — Contracts

Everything a builder must match exactly. Signatures are copied from the source as it stands.

## 1. HTTP surface (`scripts/swan-brain-console/server.mjs`)

### 1.1 `GET /api/state`

**Auth:** none. **Reachability:** loopback only, `Host` allowlist enforced.
**Request:** no body, no query parameters (query strings are ignored, not rejected).

**200 response:**

```jsonc
{
  "generatedAt": "2026-09-18T09:30:00.000Z",     // ISO, computed per request
  "engine": {
    "durableWrites": "DECLARED_BLOCKED",          // DECLARED_BLOCKED | VERIFIED_BLOCKED | UNKNOWN
    "reason": "…quoted sentence from the engine README…",
    "writeControls": [],                          // ALWAYS []. Asserted by test.
    "declaration": "…the matched clause, verbatim…",  // evidence, not verdict
    "gateDeclared": true,
    "sourceFiles": 23,                            // read-time count of scripts/design-brain/src/*.mjs
    "testFiles": 5,                               // read-time count of scripts/design-brain/tests/*.mjs
    "archetypes": 22,
    "doctrineLines": 238,
    "readmePresent": true
  },
  "fleet": {
    "rows": [ /* 20 × {id, title, nav_model, hero_mechanics, grid, chapters,
                          anti_specs[], wildcard, tradeoff, hasDir} */ ],
    "collisions": [],                             // non-empty = HARD GATE, halt
    "summary": {
      "total": 20, "navModels": 20, "grids": 20, "mechanics": 20,
      "wildcards": 1, "wildcardId": "v18",
      "variantDirs": 20, "missingDir": [], "missingTradeoff": [],
      "referenceDisclosure": "[MOBBIN UNAVAILABLE]"
    }
  },
  "doctrine": { /* per-document: path, role, lines, headings, state */ },
  "copy":     { /* per-variant banned-phrase results from findSlop */ }
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| `403` | `{ "error": "host not allowed", "hint": "expected one of 127.0.0.1, localhost, [::1]" }` | `Host` outside the allowlist (DNS-rebinding guard, checked **first**) |
| `405` | `{ "error": "read-only surface", "method": "<verb>" }` | any method other than `GET`/`HEAD` |
| `404` | `{ "error": "not found", "path": "<path>", "allowed": [...] }` | path not in `ASSET_ROUTES` |
| `500` | `{ "error": "snapshot failed", "detail": "<message>" }` | `snapshot()` threw |
| `500` | `{ "error": "asset missing", "file": "<name>" }` | allowlisted asset absent from disk |

**Headers on every JSON response:** `cache-control: no-store`,
`x-content-type-options: nosniff`, `content-security-policy: default-src 'none'; frame-ancestors 'none'`.

### 1.2 Static assets

`GET|HEAD` only. The path selects a **key**, never a file path — traversal is structurally
impossible rather than filtered.

| Path | File | Content-Type |
|---|---|---|
| `/` | `app/index.html` | `text/html; charset=utf-8` |
| `/app.css` | `app/app.css` | `text/css; charset=utf-8` |
| `/app.js` | `app/app.js` | `text/javascript; charset=utf-8` |
| `/onboard.css` | `app/onboard.css` | `text/css; charset=utf-8` |
| `/onboard.js` | `app/onboard.js` | `text/javascript; charset=utf-8` |

Asset responses add `referrer-policy: no-referrer` and a full CSP:
`default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.

### 1.3 CLI

```
node scripts/swan-brain-console/server.mjs [--port 4599] [--open]
```

`--port` must be an integer in `1024–65535`, else exit `2` with
`[console] invalid --port; expected 1024-65535`. On listen it prints the URL, then
`[console] read-only · localhost only · GET only · no engine writes`. `SIGINT`/`SIGTERM` close
gracefully.

## 2. Exported signatures

### 2.1 `engineState.mjs`

```js
export function readEngineState(repo: string): {
  durableWrites: 'DECLARED_BLOCKED' | 'UNKNOWN',   // 'VERIFIED_BLOCKED' reserved, unreachable
  reason: string,
  writeControls: [],                                // literal empty array
  declaration: string | null,
  gateDeclared: boolean,
  sourceFiles: number, testFiles: number, archetypes: number,
  doctrineLines: number, readmePresent: boolean,
}
```

**Internal constants that carry the semantics:**

```js
const GATE_DECLARATION = 'remain fail-closed';
const NEGATION = /\b(no longer|not|never|cease|ceased|removed?|unblock(?:ed)?|drop(?:ped)?|lift(?:ed)?)\b/i;
```

**The rule:** `declared = Boolean(clause) && !NEGATION.test(clause)`. A README reading
*"writes must no longer remain fail-closed"* **contains** the declaration phrase and asserts the
opposite — the negation guard is what stops maximum confidence at the exact moment the gate is gone.
Do not simplify this to an `includes()`.

### 2.2 `fleetData.mjs`

```js
export const REPO: string;
export async function loadSkeletons(): Promise<{ skeletons: SkeletonContract[]; collisions: string[] }>;
export function readRegistryText(): {
  present: boolean;
  titles: Record<string, string>;
  tradeoffs: Record<string, string>;
  dirs: string[];
  referenceDisclosure: string;
};
export function summarize(skeletons, registryText): { total, navModels, grids, mechanics,
  wildcards, wildcardId, variantDirs, missingDir, missingTradeoff, referenceDisclosure };
export async function loadFleet(): Promise<{ rows: FleetRow[]; collisions: string[]; summary }>;
```

**Why two access strategies:** `skeletons.ts` is imported directly (Node 24 TS type-stripping) so
the console shows the **same objects the app renders** — no second copy to drift. `registry.ts`
cannot be, because its internal imports are extensionless (correct for Vite, unresolvable for bare
Node); it is read as **text** for prose fields only. Do not "fix" this by restructuring app source
to suit a tool.

### 2.3 `skeletons.ts` — the divergence contract

```ts
export type NavModel = 'no-nav' | 'radial-hub' | … | 'ticker-nav';        // 20 values
export type HeroMechanics = 'scroll-scrub' | … | 'shell-lens';            // 20 values
export type GridModel = 'full-bleed' | … | 'editorial-cards';             // 20 values

export interface SkeletonContract {
  id: string;
  nav_model: NavModel;
  hero_mechanics: HeroMechanics;
  grid: GridModel;
  chapters: number;
  anti_specs: string[];     // minimum 2, enforced by test
  wildcard?: string;        // exactly ONE variant (v18)
}
export const SKELETONS: SkeletonContract[];                               // exactly 20
export function fingerprintOf(s: SkeletonContract): string;               // `${nav}|${hero}|${grid}`
export function findCollisions(rows?: SkeletonContract[]): string[];
```

**Honest limit of the fingerprint:** the three axes are enums and the 20 values are pairwise unique
**by construction**, so the test detects authoring copy-paste and nothing more. It is labelled
`config uniqueness only`. A collision is a **HARD GATE**: halt, report, build nothing on top.

**Motion is deliberately NOT a seed axis** — a static artboard judges a motion seed with the motion
removed, which biases the judge against it. Motion enters only on the winner.

### 2.4 `renderSlots.ts` — the context budget

```js
export const MAX_LIVE_WORLDS = 4;                            // renderSlots.ts:28
export function onSlotFreed(fn: () => void): () => void;     // :34 — returns an unsubscribe
export function acquireSlot(): boolean;                      // :40 — false when the budget is full
export function releaseSlot(): void;                         // :48 — no argument; no identity
export function slotStats(): { inUse: number; cap: number }; // :61 — read-only diagnostics
export function publishSlotStats(): void;                    // :72 — writes data-live-worlds / -cap
export function __resetSlots(): void;                        // :79 — test helper
```

**⚠ CORRECTED 2026-09-19.** An earlier revision of this document listed
`acquireSlot(worldId): number | null`, `releaseSlot(worldId)` and
`publishSlotStats(): {live, cap}`. **None of those signatures exist.** They were transcribed from a
prose description in the review-preparation packet rather than read from the source. A builder
following the old text would have written code that does not compile. Signatures above are read
from `renderSlots.ts` and line-numbered.

**There is no per-world identity in this API.** `releaseSlot()` takes no argument and decrements
unconditionally (`if (inUse > 0) inUse -= 1`, `:49`), so the pool cannot detect a double release —
it silently under-counts, which would report capacity that does not exist. No reachable double
release was found in the current wiring, so this is a **latent hazard, not a live defect** — but a
future caller that releases twice, or a Vite HMR reload that re-executes the module (resetting
`inUse` to 0 while live contexts remain), can put more than `MAX_LIVE_WORLDS` contexts on a page.

**Invariant:** contexts live only while a world holds a slot. The canvas element is created **per
setup** and destroyed with each teardown. Reusing a canvas across a teardown resurrects a
force-lost context — the crash class this workstream spent three rounds burying.

### 2.5 `runtime.ts` — the public hook

```js
export function useThreeWorld(
  canvasHostRef: RefObject<HTMLElement>,   // EMPTY container the runtime fills; React owns it
  hostRef: RefObject<HTMLElement>,         // the measured host (scroll/pointer/size source)
  motion: MotionMode,                      // 'live' | 'poster'
  build: WorldBuilder,                     // (ctx: WorldContext) => WorldHandle
  opts?: { canvasId?: string },
): { live: boolean; lost: boolean; error: string | null; frames: number };
```

**⚠ CORRECTED 2026-09-19.** An earlier revision listed this as
`useThreeWorld(ref, variantId, opts?)` returning `{live, frames}`. **That signature does not
exist** — it was inferred from prose. The real one takes five parameters and returns four fields.

`frames` is a **render-time snapshot only**; the runtime owns the DOM attribute.

**⚠ CORRECTED AGAIN 2026-09-19 (round 2).** The first correction below claimed `runtime.ts`
*solely* owns `data-live`, `data-motion` and `data-nav-model`. **That is false** — Astra
(gpt-6-astra) falsified it. Those three are rendered by **React** in
`WorldPage.tsx:101-106` (`data-world-id` at `:101`, `data-nav-model` at `:102`,
`data-motion` at `:105`, `data-live` at `:106`). The ownership split is:

| Owner | Attributes |
|---|---|
| **Runtime** (`publishDiag` via `startDiagTimer`/`publishTornDown`) | `data-frames`, `data-running`, `data-on-screen`, `data-tab-visible`, `data-context-lost`, `data-context-losses`, `data-draw-calls`, `data-primitives` |
| **React** (`WorldPage.tsx`) | `data-world-id`, `data-nav-model`, `data-motion`, `data-live` |
| **Slot pool** (`renderSlots.publishSlotStats`, on `documentElement`) | `data-live-worlds`, `data-live-world-cap` |

`WorldPage` must **not** render `data-frames` — doing so re-froze a stale value over the live
attribute (round-4 F6). That constraint stands; it is the *attribution of the other three*
that was wrong.

**⚠ `framesRef` WAS not reset across a hand-off — FIXED round 2.** `const framesRef = useRef(0)`
sat at *hook* scope (`runtime.ts:113`), outside the effect, and the only write in the fleet was
`deps.framesRef.current += 1` (`loop.ts:47`). A teardown/rebuild cycle therefore **carried the
previous context's frame count forward**, so `data-frames` could not distinguish "presented on
this context" from "presented on a previous one". The same teardown left the *last published
snapshot frozen on the element*, so a handed-off world advertised `frames=132` and
`running=yes` while holding no canvas — measured reproducibly over three runs.

Fixed in `teardown.ts` (extracted from `runtime.ts` for the rule-4 cap, exactly as `loop.ts`
was): it resets `framesRef.current = 0` and calls `publishTornDown(host)`. Guarded by
`gallery-verify`'s `context budget: a torn-down world reports no live context`, observed
**RED at 108/110 before the fix and GREEN at 110/110 after**. See `09-tests.md` §4 and §5.

### 2.6 `observe.ts` — scroll semantics

```js
export function scrollProgressFor(rect: DOMRect, viewportHeight: number, anchor: 'load' | 'travel'): number;
export function scrollAnchorFor(hostEl: Element): 'load' | 'travel';
```

- `'load'` — hero contract: `0` at load, span = host height. `p = -top / max(1, height)`, clamped.
- `'travel'` — a host the reader scrolls **to**: `0` when its top enters at the viewport bottom,
  `1` when its bottom leaves the viewport top. `p = (vh - top) / (vh + height)`.

The classifier reads the **scroll-invariant document offset** (`rect.top + scrollY`, ±2px), so a
reload mid-page still load-anchors the hero. Settled in round 4: this was the Fable-vs-GLM dispute,
and both were half right — the load rule is correct *for the page-opening host* and was applied
universally.

### 2.7 `copy/antiSlop.ts`

```js
export function findSlop(text: string): SlopHit[];
```

Gate classes: banned phrases · **stem inflections** (`empowers`, `unlocks`, `delving`; e-drop
handled) · **unhyphenated intensifiers** (`world class`, `cutting edge`, `state of the art`,
`best in class`, `game changing`) · **house vocabulary** (`NASM-certified` / `NASM certified`).

**Negative contract:** `NASM OPT model` and `NASM overhead squat assessment` are **named methods**
and must stay legal. Any new class must ship with a negative test.

## 3. Invariants (each is asserted by a test — do not weaken)

| # | Invariant | Asserted by |
|---|---|---|
| I1 | 20 skeletons, 20 unique fingerprints, ≥2 `anti_specs` each | `fleet.contract.test.ts` |
| I2 | exactly one `wildcard`, id `v18` | `fleet.contract.test.ts` |
| I3 | every registry entry `status: 'parked'` (20/20) | `fleet.contract.test.ts` |
| I4 | `main-routes.tsx` matches neither `playgroundRegistry` nor `three-worlds`; `HomePage.V4` still mounted | `fleet.contract.test.ts` |
| I5 | copy resolves figures from `marketingStats`; no invented metrics | `fleet.contract.test.ts` |
| I6 | every file ≤300 lines (fleet scope) | `fleet.contract.test.ts` |
| I7 | `writeControls` is `[]`; no POST route exists | `engine-contract.test.mjs` |
| I8 | the engine verdict is **derived**, not asserted; negation → `UNKNOWN` | `engine-contract.test.mjs` |
| I9 | `MAX_LIVE_WORLDS` respected; live set **changes** on scroll; DOM canvases == live worlds | `gallery-verify.mjs` |
| I10 | 0 colour fallbacks; token mutation **follows** to the scene | `gallery-verify.mjs` |
| I11 | reduced motion → 0 canvases, 0 frames, poster present | `gallery-verify.mjs` |
| I12 | every control ≥44px; contrast ≥4.5:1 | `gallery-verify.mjs` / `console-verify.mjs` |

**I7 and I8 are the crown jewels.** I8's test is the reason the console cannot lie about what is
being saved.

## 4. New contract — MCP server (S1)

> **⚠ SUPERSEDED IN PART — ruled D17, 2026-09-19.** This table is the original contract and is kept as
> the evidence record. Four of its columns no longer describe the build:
> **the `Backed by` column is replaced by direct imports** (the MCP server is a local stdio tool; a
> required HTTP console would make it unavailable exactly when it is most useful, and create a second
> source of truth). **`swan_get_gate_health` is not in S1** — it moves to S4 with `gateHealth.mjs`.
> **`filter` is `{field, value}`, not `filter: 'nav_model'`** — the old shape named a *field*, not a
> value, so it could not narrow anything. **The search is bounded** (allowlist + capped limit).
> See `DECISIONS-D14-D21.md` §D17.

**Transport:** stdio. **Tools:** read-only. **No tool may have a side effect.**

| Tool | Input | Output | Backed by |
|---|---|---|---|
| `swan_get_state` | `{}` | the full snapshot | ~~`GET /api/state`~~ → **direct imports** (`fleetData` + `engineState` + `doctrine`) |
| `swan_list_variants` | `{ filter?: { field: 'nav_model' \| 'hero_mechanics' \| 'grid', value: string } }` | 20 rows, structural fields + tradeoff | `fleetData.loadFleet()` |
| `swan_get_engine_state` | `{}` | `durableWrites`, `reason`, `declaration`, `gateDeclared` | `engineState.readEngineState()` |
| `swan_search_doctrine` | `{ query, limit? }` | matching doctrine lines with `file:line` | grep over `docs/ai-workflow/design-brain/` |
| ~~`swan_get_gate_health`~~ | `{}` | per-gate last-run result, `not run` rendered distinctly | **moved to S4** |

**Forbidden tools — these must never exist:** `promote_variant`, `accept_claim`,
`write_receipt`, `run_seat`, `set_engine_state`, or anything that writes, promotes, or spends.
Their absence is the contract.

**Degraded mode — re-scoped by D17(b).** With direct imports there is no console to be down, so the
original trigger is vacuous. It is re-scoped to: *a required data module fails to load, or a required
file is absent → typed error `{ error, hint }`, and the process does not exit.* The intent is preserved
— an agent discovering a dead tool learns nothing; an agent getting a correctable error learns the fix.
