# G04c typecheck + build evidence (hash-bound)

Scope digest: `c917c7562cc5f77f890ab60f59c6bdd850901056deb15f9c6eb47fabd8fead96`

## TypeScript no-emit

- Command: `NODE_OPTIONS=--max-old-space-size=12288 node node_modules/typescript/bin/tsc --noEmit`
  (worktree `frontend/`, WSL Node 22.23.2).
- Result: **`TSC_EXIT=0`** — `/tmp/g04c-tsc5.log`.
- History in this slice: round-2 OOM on the default 4 GB heap (exit 134) while a Vite build
  ran concurrently on 9p; round-3 and round-5 runs with the 12 GB heap flag exited 0.
  The 12 GB flag is environmental (9p + concurrent transform load), not a type error;
  no type errors were ever reported by any run.

## Vite production build

- Command: `node node_modules/vite/bin/vite.js build --outDir ../tmp/coach-g04c-20260909/frontend-dist`
- Result: **`✓ built in 1m 34s`, `BUILD_EXIT=0`** — `/tmp/g04c-build.log`.
- Output: `tmp/coach-g04c-20260909/frontend-dist/` (largest asset
  `v3/index.CAoVShIk.js` 688.95 kB / gzip 190.26 kB).
- No external release action: dist stays in the slice evidence directory.
