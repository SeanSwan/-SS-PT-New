# G05 build evidence (hash-bound)

Scope digest: `292ca454f965799595e7fae3556cb75ded4cb27355f62247991d6096cf31ac3f`

## Build gate applicability

G05 touches backend modules only (plain ESM — the repo's backend gates carry no
TypeScript step and no bundler). The honest build gate on this surface is:

1. **ESM import smoke** — `node /tmp/g05-smoke.mjs` from `backend/` on Node
   22.23.2 imports all six changed modules on the real runtime:
   `coachContextCache`, `coachEvidenceTools`, `coachInferenceBoundary`,
   `coachModelResponseContract`, `aiChatService`, `aiChatRoutes`.
   Result: **6/6 IMPORT_OK, SMOKE_PASS, exit 0** — `/tmp/g05-smoke.log`.
   The route graph's deferred dev-DB connect (`ECONNREFUSED 127.0.0.1:5432`)
   is expected outside an API test; the disposable PG on 15433 is used by the
   API suites, not by import.
2. **Scoped vitest run doubles as the transform gate** — every changed module
   is parsed/transformed by Vite inside the 32/32 and 71/71 runs (exit 0).
3. Frontend `tsc`/vite are NOT re-run: no frontend file is in the G05 scope
   (verified against the snapshot entry list — 12 files, all backend/docs).

No external release action; no provider spend.
