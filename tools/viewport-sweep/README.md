# viewport-sweep — portable mobile pixel-perfection sweep

Sweeps any web app across the **P1–P12 viewport buckets** (the ~50 most popular
US phones collapsed into 12 engineering-true sizes, ~93% of identifiable US
mobile traffic) and produces a defect ledger: horizontal overflow (with named
offenders), touch targets under 44px, clipped controls, failure screenshots.

**Zero dependencies of its own** — the config injects the Playwright browser
from the host app. `buckets.mjs` is a plain data module.

## Use in THIS app

```bash
cd frontend && npx vite build && npx vite preview --port 4173 &   # or any running URL
node tools/viewport-sweep/sweep.mjs                                # uses ./viewport-sweep.config.mjs
```

Ledger + failure screenshots land in `tools/viewport-sweep/output/`.

## Use in ANY OTHER app (3 steps)

1. **Copy the folder** `tools/viewport-sweep/` into the other project.
2. **Edit `viewport-sweep.config.mjs`:** point `createRequire(...)` at a
   package.json whose `node_modules` has `playwright` (or import chromium any
   way you like), set `baseUrl`, and list your `routes`
   (`{ path, label, readySelector? }`).
3. **Run** `node tools/viewport-sweep/sweep.mjs` (or pass a config path:
   `node tools/viewport-sweep/sweep.mjs my.config.mjs`). Exit code 0 = green.

## Authenticated surfaces

Generate a session once, then point the sweep at it:

```js
// one-off: save storage state after a scripted login
const context = await chromium.launchPersistentContext('', {});
// ...perform login in the opened page...
await context.storageState({ path: 'sweep-auth.json' });
```

Set `SWEEP_STORAGE_STATE=sweep-auth.json` (or `storageStatePath` in the config)
and add the protected routes to `routes`.

## Reading results

- `output/sweep-<stamp>.md` — human ledger, failures first with named offenders.
- `output/sweep-<stamp>.json` — machine ledger (CI-friendly; nonzero exit on failure).
- `FAIL-<bucket>-<route>.png` — screenshot of each failing check.

Buckets marked `pixelPerfect: false` (P12 = 320px floor) only assert
no-overflow/no-clipping — not the 44px polish bar.
