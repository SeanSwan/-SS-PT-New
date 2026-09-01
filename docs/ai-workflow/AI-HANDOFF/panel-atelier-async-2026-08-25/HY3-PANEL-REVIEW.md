# Atelier iteration 2 — async local `/stills` · HOSTILE REVIEW + ENHANCEMENT PACKET — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASYNC-STILLS-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 1926 in / 6222 out | **Cost:** ~$0.0036 | **Wall:** 107.2s | **finish_reason:** stop

---

## VERDICT
REVISE — The contract’s happy path is coherent but the process-local store plus 404-by-absence creates a UI deadlock on restart and two gates are explicitly untested, both must be closed before this ships.

## BLOCKERS
1. **P1** — UI permanently disables Generate on server restart mid-batch.  
   *Failure scenario:* User clicks Generate (lane:local) → `POST` returns `202` → UI disables Generate button (§1: “disables Generate while a batch is in flight”). Backend process is killed during render (frame 2 of 4). Client `GET` poll then hits restarted process → `batchStore` is empty → route returns `404` (§2: “after a server restart (absence, never ‘running’)”). UI polling loop keys only on `terminal` inside a `200` snapshot body; a `404` is not a snapshot, so `terminal` is never seen and the button stays disabled forever.  
   *Evidence:* `backend/services/atelier/batchStore.mjs` (process-local Map, §2 “Store: … process-local Map … a restart loses in-flight batches and reports them by 404”); §1 UI behaviour prose.

2. **P2** — Untested batch-id shape gate can let malformed ids reach the store path.  
   *Failure scenario:* Route receives `batchId` not matching `/^[0-9a-f-]{36}$/`; gate marked `UNTESTED (route-level)` (§2). If the route-level check is absent in code, `store.get(badId)` returns `undefined` → either a misleading `404` or an unhandled `undefined` deref crash in `getBatch`.  
   *Evidence:* §2 row “Batch id shape … UNTESTED (route-level)”.

3. **P2** — Untested expiry/prune logic may drop running batches or leak memory.  
   *Failure scenario:* `prune()` is `UNTESTED` (§2). A bug could prune a `running` batch (violating “running never pruned”) → poll suddenly `404` mid-render, or never prune finished batches → unbounded Map growth in long-running single process.  
   *Evidence:* §2 row “Expiry … UNTESTED”.

## ATTACKS
- **Correctness:** Happy-path-only logic dominates — tests assert `<25ms` with stubs but do not exercise real VRAM/admission failures. Null/undefined: `getBatch(id, userId)` assumes `userId` is populated; if auth middleware fails open, every poll returns `null`→`404` for all owners. Stale state: process-local Map is stale on any deploy/restart. Race: idempotency key composition is never specified; distinct requests with colliding key would coalesce to one batch silently. Off-by-one: UI shows “rendered of count”; if a frame fails after `rendered` increments but before `pushStill`, count may exceed actual `stills[]`. Unhandled error paths: “finishBatch in try AND catch” is prose; if the background task is fired as a detached promise without a `.catch`, an unexpected throw could become an unhandled rejection and skip the terminal state.

- **Security:** Authn/authz/IDOR: owner scope returns uniform `404` for other owners — good, no enumeration leak. Injection: batchId regex mitigates, but if the id is logged or concatenated into asset URLs without param binding, risk remains. SSRF: none. Secret handling: none described. Replay/idempotency: coalesce is fine, but replay during `queued` returns `accepted` again — a client could spam replay to keep a reservation held (minor DoS of own GPU). Multi-tenant scope leaks: single process but owner check present. Rate-limit/DoS: 3s polling × N tabs each hits `protect, adminOnly` (§4 Q3) with no `Retry-After`/ETag; a solo operator opening 20 tabs self-inflicts auth+admin overhead and could delay admission.

- **Data-truth / schema drift:** Model column vs caller field drift: `still` shape (assetId, maybe url) is never defined; if asset table uses `asset_uuid` and batch uses `assetId`, drift. PascalCase-vs-snake_case: not shown but likely given JS vs SQL. FK target drift: `persist({stills:[still]})` must reference the asset table PK; if asset store uses a different id generator than the `/^[0-9a-f-]{36}$/` batch id, stills could point to wrong row. Frontend response-shape drift: snapshot fields `persistence`, `terminal`, `failures[]` are named but not typed; UI could expect `status: 'partial'` but receive `failed` with empty `stills`.

## HIGHEST RISK
The single most dangerous item is the **process-local batch store + 404-by-absence on restart**, which silently orphans already-persisted stills and can permanently freeze the UI Generate control (deadlock described in Blocker 1). Cheapest concrete de-risk before ship: before returning `202`, write a minimal durable row (batchId, userId, status=`queued`, createdAt) to the existing DB; on poll, read from it; on process start, mark any non-terminal rows as `failed` with `error.code: 'E_RESTART'` so the client receives a terminal snapshot and re-enables the button. This avoids a full durable batch store but kills the deadlock.

## CONFIDENCE
Could NOT verify from the document alone: actual code for `reserveGpu()`/`release()` on crash paths; whether the frontend poll treats non-200 as terminal (likely not); whether asset persistence is durable and whether orphaned assets are cleaned; whether `userId` is reliably injected; the exact idempotency key formula; and compliance with the binding frontend house rules (styled-components only, Victory charts, Crystalline Swan `var(--token,#fallback)`, Dual-Button Glow, 44px, dark-first, WCAG 4.5:1) because the document contains zero frontend code or markup. Evidence that would settle it: the real `backend/services/atelier/*.mjs` sources, the React polling component, `atelierAsyncStills.test.mjs`, and a new test that kills the process after frame 2 and asserts the client recovers. House-rule flag: no explicit violation in the text, but the document is silent on UI implementation — that silence must not be taken as waiver; the frontend changes it triggers must still obey the non-negotiable rules.
