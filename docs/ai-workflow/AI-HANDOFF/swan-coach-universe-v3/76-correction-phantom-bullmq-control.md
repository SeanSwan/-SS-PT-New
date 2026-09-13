# Packet 70/69 correction — the `USE_BULLMQ_RECONCILIATION` control does not exist

Version 1, 2026-09-13. Root-authored. This corrects a **capability-truth** defect in
the canonical release audit: packets [70](70-release-and-worktree-audit.md) and
[69](69-selective-release-audit.md) each describe a queue-safety control and a Render
start command that are not present anywhere in the repository.

Found while trying to *take* the handoff those documents assign. The handoff could
not be taken because its subject does not exist.

## What the packets claim

| Doc | Line | Claim |
|---|---|---|
| [70](70-release-and-worktree-audit.md) | 90 | "Queue owner: `USE_BULLMQ_RECONCILIATION` must stay OFF until unreachable Redis has bounded startup, tested interval fallback and continued event-bus initialization. Existing tests cover missing URL, not a configured unavailable Redis. **ReconciliationQueue lines 70-72 and 104, startup lines 647-658** are the handoff." |
| [70](70-release-and-worktree-audit.md) | 510 | "…start remains `USE_BULLMQ_RECONCILIATION=false npm start`." |
| [69](69-selective-release-audit.md) | 69 | Same start-command sentence, verbatim. |

## What is actually true — every claim checked

| Claim | Reality | Evidence |
|---|---|---|
| An env var `USE_BULLMQ_RECONCILIATION` exists | **Does not exist in code.** It appears **only** in packets 69 and 70. | `git grep -l USE_BULLMQ_RECONCILIATION` → `docs/…/69…md`, `docs/…/70…md`. Nothing else. |
| Any code reads a `*BULLMQ*` or `*RECONCIL*` env var | **No.** | Tree-wide sweep of `*.mjs/*.js/*.cjs/*.ts/*.tsx/*.yaml/*.yml/*.json` (excluding `node_modules`, `docs`, `archive`, `package-lock`) for `process\.env\.[A-Z_]*(BULLMQ\|RECONCIL)` → **zero matches**. |
| A file/class `ReconciliationQueue` exists | **Does not exist.** No such identifier anywhere in `backend/`. | `ReconciliationQueue\|reconciliationQueue\|reconciliation-queue` over all of `backend/**/*.mjs` → zero matches. |
| Render's start command is `USE_BULLMQ_RECONCILIATION=false npm start` | **It is `cd backend && npm start`.** | `render.yaml` line 69 (worktree) and line 23 (main tree) both read `startCommand: cd backend && npm start`. No env prefix. |
| Reconciliation files exist at the cited lines | The `Reconciliation*` files are unrelated to a queue: `routes/adminReconciliationRoutes.mjs`, `services/checkoutReconciliationCron.mjs`, `services/checkoutReconciliationService.mjs`, `services/nutrition/nutritionReconciliation.mjs`. **None reads any `process.env.*` variable at all.** | Per-file `process\.env\.[A-Z_]+` sweep → zero matches across all five. |

## What the real Redis/BullMQ surface is

`bullmq@^5.80.5`, `ioredis@^5.4.1` and `connect-redis@^9.0.0` **are** real
dependencies, so Redis is genuinely part of the system. The only BullMQ queue in the
backend is:

**`backend/services/videoJobQueue.mjs`** — a **video job** queue, not a
reconciliation queue.

- `new Worker(QUEUE_NAME, routeJob, { connection: redisConnection })` at `:238`
- `new Queue(QUEUE_NAME, { connection: bullmqConnection })` at `:375`
- Builds its connection from `REDIS_URL` (`:349-360`), with `maxRetriesPerRequest: null`
  for the BullMQ connection (BullMQ's own requirement) and a separate client using
  `maxRetriesPerRequest: 3, lazyConnect: true`.

**And it is not loaded at boot.** It is imported *lazily and defensively* from two
controllers, each wrapping the dynamic import in try/catch with a warning and a
graceful skip:

- `backend/controllers/videoCatalogController.mjs:38-49` — "videoJobQueue may not exist yet — import with graceful fallback", `logger.warn('[VideoCatalogController] videoJobQueue import failed: … background jobs will be unavailable')`
- `backend/controllers/youtubeImportController.mjs:28-31` — "Graceful import — videoJobQueue depends on ioredis which may not be available"

## What the cited lines and files actually are

**CORRECTION TO THIS DOCUMENT'S FIRST VERSION (2026-09-13, same day).** The first
version concluded that "the handoff cannot be taken because its subject does not
exist." **That was too strong and is wrong.** The line references in packet 70 are
**real**. What is wrong is the *naming* — the packet conflates a real DB-backed
sweeper cron with a BullMQ queue.

| Packet 70 says | Reality |
|---|---|
| "ReconciliationQueue lines 70-72 and 104" | No `ReconciliationQueue` exists — but `backend/services/checkoutReconciliationService.mjs` **lines 70-72 and 104 are real and substantive**: `reconcileStalePendingCarts()` at `:66`, the `ShoppingCart.update(...)` releasing carts stranded in `pending_payment` at `:71-75`, and the sweep's internal boundary at `:104-105`. The line numbers match a real reconciliation component; only the file name is wrong. |
| "startup lines 647-658" | **Real**, and they hit the sweeper-cron block: `startup.mjs:651-659` starts `startRenderLeaseSweeper`; `startup.mjs:661-669` starts `startCheckoutReconciliationSweeper`. |
| "Queue owner … must stay OFF" | The component is a **cron sweeper over `ShoppingCart`**, not a queue, and it is **deliberately not behind a kill switch**. `checkoutReconciliationCron.mjs:6-12` states why, in its own words: *"DELIBERATELY NOT behind a kill switch … Disabling this does not pause a feature — it leaves customers locked out of their own carts after any deploy that lands mid-checkout. Building the reclaim logic and not scheduling it is indistinguishable from not building it, except that it LOOKS handled in code review."* `startup.mjs:652-654` repeats the reasoning for the render-lease sweeper. |
| `USE_BULLMQ_RECONCILIATION` gates it | The variable does not exist and gates nothing. |

So packet 70 merged three unrelated things into one row: (a) real, DB-backed
sweeper crons that are intentionally kill-switch-free, (b) a "ReconciliationQueue"
that does not exist, and (c) a `USE_BULLMQ_RECONCILIATION` flag that does not exist.
The **only** real Redis/BullMQ surface is `videoJobQueue.mjs`, which the row does
not mention at all.

## Conclusion — corrected

**The row cannot be acted on as written, but not because its subject is imaginary.**
The reconciliation component it points at is real, and its line references resolve.
What is wrong is that the row:

1. calls a **DB-backed cron sweeper** a "queue" and assigns it a BullMQ env flag;
2. names a file (`ReconciliationQueue`) that does not exist, so the reader cannot
   find the real one (`checkoutReconciliationService.mjs`);
3. instructs the owner to keep a flag **OFF** for a component that is deliberately
   **not behind any switch** — the opposite of the recorded design intent in
   `checkoutReconciliationCron.mjs:6-12`; and
4. attaches a **Redis** availability concern to a component that does not use Redis,
   while omitting the component that does.

The genuine, still-open Redis question is entirely separate and lives in
`videoJobQueue.mjs` — see "the real Redis/BullMQ surface" above. It is being
investigated as its own slice.

**The general lesson is narrower than the first version claimed, and more useful:**
the packet's *line references* were trustworthy while its *names* were not. A reader
who greps for the name finds nothing and may conclude the area is clean; a reader
who follows the line numbers finds the real component. Both failure modes are
avoided by citing the file that actually contains the lines.

Explicitly **not** claimed:
- That Redis unavailability is safe on every path. The lazy path still runs on first
  use, and `maxRetriesPerRequest: null` on the BullMQ connection means commands can
  queue rather than fail fast. Whether a request that triggers the import can be held
  by an unreachable Redis is a **real, narrower, uninvestigated question** — it is
  simply not the boot-blocking risk the packet describes, and it is not about the
  checkout sweeper.
- That the sweeper crons themselves are correct. They were read for this correction,
  not audited; their behaviour under concurrent deploys was not tested.
- That the rest of packet 70's inventory is affected. This is one row.

## Why this class of defect matters

Packet [48](48-capability-truth-and-release-gaps.md) exists because "a declaration is
not proof that every command completes successfully." The same discipline applies to
the audit documents themselves: a handoff row naming a file, an env var and a line
range that do not exist will send the next agent looking for a component that was
never built, and — worse — it will read as evidence that a safety control is **in
place and switched off**, when in fact there is no control.

## RESOLVED 2026-09-13 — the residual Redis question is closed: **no defect on any request path**

A probe was run under the reviewed isolated runner (dotenv disabled, sensitive env
scrubbed, non-loopback TCP denied, no real Redis). `REDIS_URL` was set *inside* the
probe to a loopback port with nothing listening, and the refusal was verified as
`ECONNREFUSED` before anything was measured.

**Answer: neither blocks. The request path never contacts Redis at all.**

| Measurement | Result |
|---|---|
| lazy `import('../services/videoJobQueue.mjs')` | 189 ms standalone / 1385.9 ms cold in vitest, **0 connect attempts** |
| `addJob('checksum_verify', …)` — the exact call the upload path makes | returned `null` in **0.1 ms**, **0 connect attempts** |
| `initVideoJobQueue()` against a refusing port | settled in 8.3 ms → `{queue: null, isLeader: false}` |

**Why: `initVideoJobQueue()` (`videoJobQueue.mjs:328`) is the only code that reads
`REDIS_URL` or constructs a client, and it has ZERO callers.** Root confirmed
independently: `git grep -n initVideoJobQueue` over all `*.mjs/*.js/*.ts/*.tsx`
returns exactly one hit — the definition itself. So `queue` stays `null` forever and
`addJob` short-circuits at `:424` before touching the network.

**On `maxRetriesPerRequest: null`:** the probe proved it *does* make commands queue
rather than fail fast — the `null` connection's `.get()` was still pending at
4014.0 ms while the bounded connection rejected at 326.7 ms on the same endpoint.
But it is **inert on this path**: `initVideoJobQueue`'s first await is
`redisClient.connect()` on the *bounded* client, which rejects in ~1 ms whether the
option is `null` or `3` (measured 0.9 ms vs 3.2 ms). `new Queue()` at `:375` is never
reached.

**Conclusion: the packet's Redis concern does not materialise, because the component
it worried about is not on any request path — it is not on any path at all.** No
production code was changed.

### Findings the probe produced (all unfixed, out of this correction's scope)

1. **The whole BullMQ video queue is dead code.** `initVideoJobQueue` has zero
   callers, so `addJob` always returns `null` and **no video job has ever been
   enqueued**. `startWorker`/`routeJob` and all six job processors are `TODO` stubs
   anyway (`videoJobQueue.mjs:231-264`).
2. **A false success log on the upload path.** `videoCatalogController.mjs:653-663`
   `await`s `addJob(...)` but never inspects the result — `addJob` returns `null`
   rather than throwing, so the `catch` at `:660` never fires and `:659` logs
   `"Enqueued checksum_verify job for video <id>"` unconditionally. Root verified
   this directly. The sibling `youtubeImportController.mjs:224` *does* capture the
   result and returns an honest `503 "Job queue unavailable"` — so the two callers
   of the same function disagree about whether silence is success.
3. **The health surface reports the queue as available while every enqueue no-ops.**
   `videoCatalogController.mjs:41-45` sets `jobQueueAvailable = true` on *import*
   success, and `:58-63` returns `available: true`. The import cannot fail for Redis
   reasons, so this is effectively hardcoded `true`.
4. **`/job-queue-health` appears shadowed by `/:id`.** `routes/videoCatalogRoutes.mjs:16`
   registers `router.get('/:id')` before `:22` `router.get('/job-queue-health')`, so
   ordered matching sends the request to `getVideo`. Runtime consequence tagged
   `[LIKELY]` — registration order was verified, the HTTP response was not.
5. **`redisClient` has no `'error'` listener** (`videoJobQueue.mjs:356`) → ioredis
   emits `[ioredis] Unhandled error event` (observed in probe stderr).
6. **Latent unbounded wait, NOT on a request path.** Against a *reachable-but-silent*
   Redis (TCP accepted, never replies — the partition case, not the refusing case),
   `initVideoJobQueue()` was still pending after **16012 ms**; ioredis's 10 s
   `connectTimeout` does not bound the ready-check handshake and there is no RST to
   reject on. Unreachable today because nothing calls it. **If anyone ever wires a
   caller to `videoJobQueue.mjs:328`, bound this first** — that is the one item worth
   escalating at that moment, not now.

## Recommended follow-up (a real, small slice)

1. Establish the **actual** Redis-unavailable behaviour of `videoJobQueue.mjs`: does a
   request that triggers the lazy import block, degrade, or fail cleanly? Cover
   "configured but unreachable", not just "missing URL" — that part of the packet's
   concern is legitimate.
2. Reconcile `render.yaml` against the deployed service's real start command and
   record the result; do not assume either document.
3. When packets 69/70 are next revised, strike the three instances rather than
   carrying them forward. They are annotated in place as of this document.
