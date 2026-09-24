# Astra Hostile Review Packet — creator-brains-console ops-wave landing (CUT)

## REMIT

Mega Blueprint — hostile-review the landing plan below and guide the build: exact commit
composition, ordering, gates, repairs you demand. Flag-armed contract governs the doc set.

## CONTEXT (do not explore anything; everything is here)

- SS-PT repo, branch `creator-brains-engine-r2-20260915`, HEAD `89a9e3294`, pushed.
- Standing guard: a commit must not add a file importing a module the commit leaves untracked
  ("M1" fresh-clone class). Shared tree with peer agents: commits go through a scratch index; a
  peer's STAGED trio (`scripts/creator-brains/lib/lock-release.mjs` + 2 tests, green) plus
  modified `lock.mjs` is a separate in-flight slice this landing must NOT touch.
- House rules: ≤300 lines/file (generated lockfiles exempt), no `git add -A`, tests before done.

## MEASURED STATE (today, all green)

- The wave (~59 paths under `packages/creator-brains-console/`): modified tracked 16 —
  `api.mjs`(+8 re-exports of the new lib modules), `routes.mjs`(+47), `server.mjs`(+14),
  `web/src/App.tsx`(+80/−22, wires six new components), `web/package.json`(+`three`,`@types/three`)
  +lockfile, 5 modified tests, `BrainConstellation.tsx`(297), adapters, hooks.
  Untracked ~43 — `lib/{repair,run-daily,run-gate,run-reservation}.mjs`; 7 bridge tests + fixture;
  web components `Roster/BrainDrawer/QueryConsole/RunConsole/OpsRail/ConstellationRoster` + tests;
  `constellation-{chunk,layout,loop,pointer,walk,three,scene-parts}.ts` + tests; styles;
  `useRoster/useRunPoll`; `runVerdict.ts`; `web/bench/frame-bench.mjs`;
  one junk twin `constellation-three.ts.e5-backup` (excluded).
- Gates already green: console node --test 354/354 (incl. untracked); web vitest 174/174;
  web tsc exit 0; web vite build exit 0; engine suite 233/0; guard --staged on the full staged
  wave = exit 0. Only lockfile >300 lines. Wave has zero references to the staged lock-release
  slice (separable).

## FALSIFIABLE CLAIMS

- C1. Whole wave green as measured above; C2. no non-generated file >300 lines.
- C3. Wave independent of the peer's staged F03 slice.
- C4. `api.mjs` re-exports + `routes/server` wiring are load-bearing (lib modules unreachable
  without them; and landing them without the libs is an M1 violation).
- C5. Same for `App.tsx` vs the six components (dead UI vs M1 violation).
- C6. All wave imports resolve within HEAD ∪ wave ∪ node_modules (guard --staged exit 0 measured).

## PLAN TO ATTACK

Scratch-index commit(s) from HEAD, explicit paths, guard --staged gate, then re-run all suites,
push, Rule 86 filing. Open: ONE commit vs TWO (backend ops then web UI — both orders claim
fresh-clone safety since HEAD `App.tsx` imports none of the new UI and `routes.mjs` only needs
the libs); bench script in or out; is vite build a required gate (already green).

## BANS

No repository/network exploration. Do not re-architect; the wave is built and green — review the
landing, demand repairs, set composition and gates. The staged lock-release slice is out of scope.
