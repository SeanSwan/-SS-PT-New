# 18 — D7 relocation receipt: console → `packages/creator-brains-console/`

- **Date:** 2026-09-20 · **Authority:** Sean, "OK LETS DO IT" (2026-09-20) — the D7 owner decision
- **Verdict executed:** Astra's D7 **AMEND — OVERTURN**, which `15-astra-brief.md` §3-D7 and
  `17-astra-adjudication.md` §1 both expressly reserved to Sean.
- **Engine change required:** **none.** That is the whole point of choosing relocation (A1-01).

## 1. The defect this closes

`consistency-check.mjs` walks `scripts/creator-brains/**` for `.mjs` with **no `node_modules`
skip** (lines 46–51) and asserts `maxLine <= 300` (line 90). With the console inside the engine
tree, the walk descended into `console/web/node_modules` and measured a dependency:

```
before:  14/15 consistent   DISAGREE no engine file exceeds the Rule 4 cap   largest = 4914 lines
after:   15/15 consistent   AGREE                                        engineMjs 184 -> 85
```

4914 lines was `decimal.js`. The console's **own** cap walk already skipped third-party
(`NOT_OUR_SOURCE`), so the engine was the only surface measuring a dependency as if it were ours.

## 2. Per-file source manifest (A2-05)

Every relocated source, with its blob in `HEAD` (old path) and in the index (new path). A
matching pair is proof the move itself altered nothing; a differing pair is a **deliberate**
repair enumerated in §3. Read out of the object database — not asserted from intent.

**52 files · 29 PRESERVED · 23 REPAIRED**

| file | HEAD blob | index blob | verdict |
|---|---|---|---|
| `api.mjs` | `f415125d7569` | `23929cdaa03b` | REPAIRED |
| `lib/brains.mjs` | `2ede706c2794` | `8ffd06bf20a9` | REPAIRED |
| `lib/creators.mjs` | `c37ad8eb99a3` | `7d373d8365d7` | REPAIRED |
| `lib/errors.mjs` | `d31b57cb8d60` | `e460cce77d12` | REPAIRED |
| `lib/health.mjs` | `9f3c16a7bc6a` | `c937d9dad398` | REPAIRED |
| `lib/http.mjs` | `f043d46550ed` | `93f2cb48741e` | REPAIRED |
| `lib/instance.mjs` | `12ab9a723402` | `a33cd30968bd` | REPAIRED |
| `lib/status.mjs` | `9f3eb47570c0` | `442a4da3cbc9` | REPAIRED |
| `routes.mjs` | `f8650fdcc7b9` | `fedfce44b5ba` | REPAIRED |
| `server.mjs` | `74f1004e8cd9` | `2769cb034414` | REPAIRED |
| `test/bridge.body.test.mjs` | `2367a3e646c5` | `2367a3e646c5` | PRESERVED |
| `test/bridge.boundary.test.mjs` | `276e0ac3f142` | `6e022c7ec882` | REPAIRED |
| `test/bridge.brains.test.mjs` | `a23eda1e0eb9` | `a23eda1e0eb9` | PRESERVED |
| `test/bridge.damage.test.mjs` | `fa02684e1dc3` | `fa02684e1dc3` | PRESERVED |
| `test/bridge.hy4.process.test.mjs` | `3628589bdb4d` | `0680a6981166` | REPAIRED |
| `test/bridge.hy4.structure.test.mjs` | `580bb476e402` | `cc462d2d48b3` | REPAIRED |
| `test/bridge.hy4.test.mjs` | `4ce67a99e604` | `76324dd7d368` | REPAIRED |
| `test/bridge.inprocess.test.mjs` | `5883bb16dc0f` | `83a3077f90ff` | REPAIRED |
| `test/bridge.requesttarget.test.mjs` | `d38e4cb5cda9` | `8664799dfbcc` | REPAIRED |
| `test/bridge.routes.test.mjs` | `d94d3eb371fb` | `133e94ec39b7` | REPAIRED |
| `test/bridge.write.test.mjs` | `21c00eb6d71a` | `21c00eb6d71a` | PRESERVED |
| `test/fixtures.mjs` | `5d918df7cb1f` | `bbd3810e884c` | REPAIRED |
| `test/health.failcache.test.mjs` | `3b23c23c83a0` | `d48add07c1ee` | REPAIRED |
| `test/health.history.test.mjs` | `65d327e2c2d8` | `34e78063ecb3` | REPAIRED |
| `test/health.test.mjs` | `8dd0fe4ea1be` | `299fdc3fd230` | REPAIRED |
| `test/leak-guard.falsenegative.test.mjs` | `95cf9ff224a0` | `68a725f94f90` | REPAIRED |
| `test/leak-guard.mjs` | `12643f8d840b` | `1064fa3ac3f8` | REPAIRED |
| `test/s1-exit-e2e.mjs` | `7d14b897f3c7` | `7d14b897f3c7` | PRESERVED |
| `web/index.html` | `bf211a53cac9` | `bf211a53cac9` | PRESERVED |
| `web/package-lock.json` | `abb8487fbaa4` | `abb8487fbaa4` | PRESERVED |
| `web/package.json` | `fcc8fbab031a` | `fcc8fbab031a` | PRESERVED |
| `web/src/adapters/errors.ts` | `4af0c69f0a16` | `4af0c69f0a16` | PRESERVED |
| `web/src/adapters/fixtures.ts` | `469d0da1d8a5` | `469d0da1d8a5` | PRESERVED |
| `web/src/adapters/index.ts` | `91d6f9a8576b` | `91d6f9a8576b` | PRESERVED |
| `web/src/adapters/LocalEngineAdapter.ts` | `a0c2b4a3fcb0` | `a0c2b4a3fcb0` | PRESERVED |
| `web/src/adapters/MockAdapter.ts` | `cdfe7a456ec5` | `cdfe7a456ec5` | PRESERVED |
| `web/src/adapters/types.ts` | `fc936172b6bb` | `fc936172b6bb` | PRESERVED |
| `web/src/adapters/validate.ts` | `cfe436ccf3c4` | `cfe436ccf3c4` | PRESERVED |
| `web/src/App.tsx` | `aad046e0fbab` | `aad046e0fbab` | PRESERVED |
| `web/src/components/ErrorBoundary.tsx` | `23715143a9af` | `23715143a9af` | PRESERVED |
| `web/src/components/StatusBoard.test.tsx` | `def1b3d04863` | `def1b3d04863` | PRESERVED |
| `web/src/components/StatusBoard.tsx` | `f07d2368a1d8` | `f07d2368a1d8` | PRESERVED |
| `web/src/hooks/useStatus.test.ts` | `fdf7c9862508` | `fdf7c9862508` | PRESERVED |
| `web/src/hooks/useStatus.ts` | `9376e8a42006` | `9376e8a42006` | PRESERVED |
| `web/src/main.tsx` | `68ffde5486c5` | `68ffde5486c5` | PRESERVED |
| `web/src/styles/tokens.css` | `c61867738bc8` | `c61867738bc8` | PRESERVED |
| `web/src/test/adapter-contract.test.ts` | `d2d762bbd142` | `d2d762bbd142` | PRESERVED |
| `web/src/test/no-engine-import.test.ts` | `f1ee7f10bfa9` | `f1ee7f10bfa9` | PRESERVED |
| `web/src/test/payload-shape.test.tsx` | `7d8f6cc0ee06` | `7d8f6cc0ee06` | PRESERVED |
| `web/src/test/setup.ts` | `bb02c60cd055` | `bb02c60cd055` | PRESERVED |
| `web/tsconfig.json` | `44d51a0b5aa6` | `44d51a0b5aa6` | PRESERVED |
| `web/vite.config.ts` | `ac5fa7adb1a8` | `ac5fa7adb1a8` | PRESERVED |

### Not covered by Git (untracked, and why that is fine)

- `web/node_modules` — gitignored build/install output. Moved by the directory rename, not tracked, so no blob exists to compare. Reinstallable from `package-lock.json` (`npm ci`).
- `web/dist` — gitignored build/install output. Moved by the directory rename, not tracked, so no blob exists to compare. Reinstallable from `package-lock.json` (`npm ci`).

## 3. Repairs applied to the REPAIRED set

The move changes the console's depth from `scripts/creator-brains/console/` to
`packages/creator-brains-console/` — the same two-level depth, but no longer adjacent to the
engine. Every import that reached **into** the engine therefore gains one `../` level plus a
`scripts/creator-brains/` prefix:

| repair | count | where |
|---|---|---|
| engine-relative import specifiers repointed | 25 | 10 files (`lib/*.mjs`, `test/*.mjs`, `server.mjs`) |
| stale path mentions in comments (`FILE:`, `USAGE`, `@module`) | 47 | 23 files |
| direct-entry detection | 1 | `server.mjs` — `endsWith('creator-brains/console/server.mjs')` → `'packages/creator-brains-console/server.mjs'` |

**Console-internal imports were deliberately NOT touched** — `'../server.mjs'`, `'../api.mjs'`,
`'../lib/http.mjs'`, `'../lib/errors.mjs'`, `'../lib/health.mjs'`, `'../lib/status.mjs'`,
`'../test/fixtures.mjs'`, and everything under `web/`. Repointing those would have broken the
console to fix the engine. A rewriter assertion confirmed zero stale engine-relative specifiers
remained afterwards.

## 4. Verification (all re-run after the move)

| gate | command | result |
|---|---|---|
| engine consistency | `node scripts/creator-brains/consistency-check.mjs` | **15/15**, exit 0 |
| console bridge | `node --test packages/creator-brains-console/test/*.test.mjs` | **105/105**, 0 fail |
| web unit | `npm test` (vitest) in `web/` | **48/48**, 5 files |
| types | `npm run typecheck` | exit 0 |
| build | `npm run build` | exit 0, 51 modules, `dist/` 184.68 kB |

The console's own HY4-H7 cap walk resolves its root as `join(HERE, '..')`, so it followed the
move without edit and still reaches the whole tree — the relocation did not silently narrow the
surface it measures.

## 5. What this receipt does NOT establish

- **`HR14f` flakiness is independent of this move** (A1-01 said so; unchanged here).
- No engine file was read, written or reformatted. The engine is untouched; the console simply
  left its walk.
- Launcher behaviour from the Desktop `.cmd` is **unproven** — no console `.cmd` exists yet
  (D6 is a plan item). The direct-entry detection is repaired and unit-covered, not launcher-tested.
- A fresh GPU/three.js pass (S5) is not covered.
