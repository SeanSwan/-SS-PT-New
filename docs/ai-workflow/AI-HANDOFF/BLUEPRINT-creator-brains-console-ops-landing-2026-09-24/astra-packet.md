# Astra Hostile Review Packet — creator-brains-console ops-wave landing

## REMIT

Mega Blueprint — hostile-review the measured landing plan below for the creator-brains-console
ops wave (~60 files: backend ops modules + HTTP wiring + frontend ops/constellation UI + their
tests), then emit the updated blueprint set for the surface (blueprint, wireframes, Mermaid flow
of the run-gate lifecycle, test-plan additions, traceability of the numbered claims to gates) and
a decision-density self-test. Then GUIDE THE BUILD: the exact commit composition, commit ordering,
verification gates, any repairs you demand before landing, and what you would refuse to land.

## CONTEXT (all you need — do not explore anything)

- Repo: SwanStudios (SS-PT), branch `creator-brains-engine-r2-20260915`, HEAD `89a9e3294`, pushed.
- A 2026-09-22 git race destroyed 23 unpushed commits; content survived only as untracked
  working-tree files. Since then the tree has been re-committed in waves. A standing guard
  (`scripts/hooks/import-closure-guard.mjs`) enforces: a commit must not add a file that imports a
  module the same commit leaves untracked (fresh-clone breakage class "M1").
- Coordination rule: agents share this working tree; commits use a scratch index
  (`GIT_INDEX_FILE` outside `.git`) so another seat's STAGED entries are untouched. Right now the
  shared index holds a peer's staged trio (`scripts/creator-brains/lib/lock-release.mjs` + 2 test
  files, green 5/5) plus a modified `lock.mjs` — an in-flight "F03 retried release" slice that is
  SEPARATE from this wave and must NOT be committed by it.
- Yesterday's blocker is gone: HEAD's `scripts/creator-brains/lib/lock.mjs` now exports
  `withLock`/`acquireLock`/`lockStatus` (commits `170220fbb`, `eff3ae245`).
- House rules that bind this landing: max 300 lines per file (Rule 4); no `git add -A`; commit
  style `type(scope): description`; tests before claiming done; dual-pass hostile review before
  reporting.

## MEASURED STATE (2026-09-24, all numbers from disk today)

### The wave (all files `git status` shows under `packages/creator-brains-console/`)

- Modified tracked (16): `api.mjs` (+8), `routes.mjs` (+47/−2), `server.mjs` (+14/−3),
  `test/bridge.contractsync.test.mjs`, `test/bridge.hy4.structure.test.mjs`,
  `test/contract-parse.r7.test.mjs`, `test/contract-readers.r9.test.mjs`, `web/package.json`,
  `web/package-lock.json`, `web/src/App.tsx` (+80/−22), `web/src/adapters/LocalEngineAdapter.ts`,
  `web/src/adapters/MockAdapter.ts`, `web/src/components/BrainConstellation.tsx` (297 lines,
  post-split), `web/src/hooks/useStatus.ts` + `.test.ts`, `web/src/test/adapter-contract.test.ts`.
- Untracked (~44): `lib/repair.mjs` (132), `lib/run-daily.mjs` (269), `lib/run-gate.mjs` (165),
  `lib/run-reservation.mjs` (183); 7 new `test/bridge.*.test.mjs` + `test/fixtures/spawn-recorder.mjs`;
  `web/bench/frame-bench.mjs`; web components `BrainDrawer.tsx` (263), `ConstellationRoster.tsx`
  (149), `OpsRail.tsx` (182) + test, `QueryConsole.tsx` (286) + test, `Roster.tsx` (175) + test,
  `RunConsole.tsx` (177) + 2 tests, `constellation-{chunk,layout,loop,pointer,walk,three,
  scene-parts}.ts` + 7 constellation test files, `ops.styles.ts`, `roster.styles.ts`,
  `runVerdict.ts`, `hooks/useRoster.ts`, `hooks/useRunPoll.ts`;
  `web/src/components/constellation-three.ts.e5-backup` (300) — a backup twin of
  `constellation-three.ts` (identical content hash) that looks like junk.
- `web/package.json` adds deps: `three@^0.186.0`, `@types/three@^0.186.0`.

### Load-bearing diffs (verified by reading)

- `api.mjs` +8: `export { repairStore, projectRepair } from './lib/repair.mjs'`,
  `export { startDailyRun } from './lib/run-daily.mjs'`,
  `export { underRunGate, heldRefusal, lockedError } from './lib/run-gate.mjs'` — the ops modules
  are surfaced through the api module; `validatePerHour` deliberately NOT re-exported (one
  validator, one name — comment in the diff).
- `App.tsx`: HEAD version imports NONE of the six new components; working-tree version imports
  `useRoster`, `Roster`, `BrainDrawer`, `QueryConsole`, `RunConsole`, `OpsRail` and mounts them.
- `routes.mjs`/`server.mjs`: +61 lines wiring the ops modules into HTTP surface.

### Verification already executed today (all green)

- `node --test packages/creator-brains-console/test/*.test.mjs` → **354 pass / 0 fail** (includes
  the untracked bridge tests).
- `cd packages/creator-brains-console/web && npm test` (vitest) → **19 files / 174 tests pass**.
- `cd packages/creator-brains-console/web && npm run typecheck` (tsc --noEmit) → **exit 0**.
- Engine suite `scripts/creator-brains` → 233 pass / 0 fail / 6 skipped (unchanged by this wave).
- Line caps: only `web/package-lock.json` (3,335, generated) exceeds 300.
- `scripts/creator-brains/lib/lock-release.mjs` references inside the wave: NONE outside two
  tracked tests already green at HEAD. The wave is independent of the staged F03 slice.
- Import-closure census before this landing: 24 remaining untracked-but-needed files (22 console +
  the staged lock-release pair). After landing the console wave, expect 2 (the staged F03 pair).

## NUMBERED FALSIFIABLE CLAIMS (refute specifics, not vibes)

- C1. The full wave is green right now in the working tree: 354 console tests, 174 web tests,
  web tsc clean, engine suite 233/0.
- C2. No wave file exceeds 300 lines except the generated lockfile.
- C3. The wave has no dependency on the staged lock-release/`lock.mjs` F03 slice, so it can land
  without touching the peer's staged entries.
- C4. `api.mjs`'s +8 re-export lines and the `routes.mjs`/`server.mjs` wiring are load-bearing:
  landing the lib modules without them ships unreachable (dormant) ops; landing them without the
  lib modules is impossible (imports a module the commit leaves untracked — M1 violation).
- C5. HEAD's `App.tsx` mounts none of the six new components; landing components without the
  `App.tsx` modification ships dead UI; landing `App.tsx` without the components is an M1 violation.
- C6. Every relative import inside wave files resolves to (HEAD-tracked ∪ wave ∪ node_modules);
  I will re-prove this at commit time with `import-closure-guard.mjs --staged` against the
  scratch index.
- C7. `constellation-three.ts` is exactly 300 lines (at cap); its `.e5-backup` twin is
  content-identical junk and should be excluded from the landing.
- C8. `web/package.json` and `web/package-lock.json` must land together (three + @types/three).

## DRAFT LANDING PLAN (attack this)

- Method: scratch index (`GIT_INDEX_FILE` outside `.git`), `git read-tree HEAD`, explicit
  `git update-index --add` per path, `import-closure-guard --staged` exit 0 required, write-tree,
  commit-tree, update-ref. Never `git add -A`. Peer staged trio untouched.
- Composition options:
  - Option 1 — ONE commit: the whole wave minus `.e5-backup` (atomic: tests+code together,
    fresh-clone-consistent in one hop, ~59 files).
  - Option 2 — TWO commits: (a) backend ops + api/routes/server + bridge tests; (b) web UI +
    App + web tests + package.json/lock + bench. Both orders claim fresh-clone safety because
    HEAD `App.tsx` imports none of the new UI and `routes.mjs` wiring only references lib modules
    landing in (a).
- Gates before push: re-run console node --test, web vitest, web tsc, engine suite; census rerun
  (expect 2 remaining, the staged F03 pair); push; then review-queue note + Rule 86 filing of
  this review.
- Open questions: bench script in or out of the landing? one commit or two? is `vite build` a
  required gate (not yet run)? any repair you demand before this lands?

## BANS

- Do NOT explore the repository, filesystem, or network. Every fact you need is in this packet.
- Do NOT propose re-architecting the console; the wave is built and green — your job is to
  hostile-review the landing and guide commit composition, gates, and repairs.
- Do NOT treat the staged lock-release slice as part of this wave.
