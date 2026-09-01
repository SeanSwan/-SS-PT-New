# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASYNC-STILLS-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 1987 in / 2948 out · **Cost:** ~$0.0000 · **Wall:** 108.4s · **finish:** stop

---

## VERDICT
REVISE — the async contract is sound in shape, but three unhandled states (hung batch holding the GPU forever, 404-not-terminal on the client, undefined idempotency-key scope/lifetime) will each produce a real failure in normal solo-operator use.

## BLOCKERS

1. **P1 — A hung render permanently seizes the GPU lane with no recovery path short of process restart.**
   Failure scenario: ComfyUI stalls mid-frame (OOM retry loop, agent socket hang). The batch stays `running` forever; §2 explicitly says "running never pruned"; §3 says there is no cancel. Every subsequent local request gets `E_LOCAL_BUSY` 409 indefinitely. The operator's only remedy is killing the backend — which then triggers blocker #2's 404 behavior. There is no watchdog predicate ("no frame progress in N minutes → fail batch + release") anywhere in §2, and no test pins one.
   Evidence: §2 "Expiry … running never pruned"; §3 "No cancel endpoint."

2. **P1 — 404-by-absence is not marked terminal for the poller; the documented UI loops forever after a restart.**
   Failure scenario: server restarts at frame 2 of 4. Client polls every 3s (§1) "until `terminal`." A 404 is not in `{queued|running|done|partial|failed}` and nothing in §1 says the UI treats 404 as terminal. Result: infinite 3s polling against `protect, adminOnly`, spinner forever, Generate button disabled permanently ("disables Generate while a batch is in flight"). The honest-state question in §4 Q1 is asked but not answered by the packet — that's a gate without a predicate, violating the packet's own stated rule.
   Evidence: §1 poll loop description + 404 semantics; §2 has no "client sees 404 → mark terminal" gate.

3. **P1 — Idempotency key scope and lifetime are undefined; both failure directions are plausible.**
   Failure scenario A (security): if `key` is derived from the payload alone and not salted with `userId`, user B posting an identical payload during user A's run receives A's `batchId` via the `replayed:true` path — a cross-owner read of A's stills through the poll endpoint's own owner-scope bypass (the poll checks ownership, but the *accept* path hands out the handle first).
   Failure scenario B (correctness): if the key persists past `terminal` until `prune()` (>1h), a legitimate re-render of the same composition within that hour silently returns the *old* batch (`replayed:true`) instead of rendering — indistinguishable from a bug.
   Neither the key construction nor its eviction point appears in §2. This is exactly the kind of prose-free gap the packet claims it doesn't have.
   Evidence: §2 "Idempotency coalesces to one batch | `store.has(key)`" — key definition absent.

4. **P2 — Batch-id validation is UNTESTED and mis-shapes the error.** `/^[0-9a-f-]{36}$/` accepts any 36 chars of hex/dash (not a UUID version check), and routes malformed ids to `E_BATCH_NOT_FOUND` (404) rather than a 400-class validation code. Low blast radius for a single-operator deployment, but it's an admitted-untested gate on an input boundary. Evidence: §2 "Batch id shape … UNTESTED (route-level)".

5. **P2 — Cross-process VRAM admission is TOCTOU, acknowledged but unresolved.** §3 concedes the Motion jobs' reservations are invisible to this process and that "admission reads live VRAM." Two processes sampling free VRAM before either allocates can both pass admission → OOM mid-batch, which then exercises blocker #1's hang/fail path. For a solo box this may be rare, but the packet presents live-VRAM-read as if it closes the hole; it narrows it. Evidence: §3 last bullet.

## ATTACKS

**Correctness**
- Background half runs after the HTTP response is sent. Any closure capturing `req`/`res` (request-scoped logger, abort signal, locale) will throw or no-op post-disconnect. Nothing in §2 pins "batch survives client disconnect" — the §4 Q1 scenario is posed, not gated.
- `finishBatch` in try AND catch covers throw paths, but not *hang* paths (see blocker #1) — `terminal state guaranteed` is only guaranteed for exceptions, not for non-returning awaits.
- Per-frame persistence ordering: "assetId on the still before pushStill" is pinned, but the reverse hazard isn't: a still persisted to the library whose batch later ends `failed` — do orphaned stills from a failed/partial batch appear in the library? No predicate addresses library visibility vs batch terminality.
- Off-by-one on `rendered of count`: no test asserts `rendered === count` exactly at `done`, or that `partial` implies `0 < rendered < count`.

**Security**
- IDOR via accept-path handle leakage (blocker #3A). The poll-side owner check is well-pinned; the accept-side is not.
- Poll amplification: 3s × up-to-2min = ~40 authenticated hits per batch; N tabs multiplies linearly. Each hit runs `protect, adminOnly`. If those middlewares share the API-wide rate limiter, a long batch plus a second tab can lock the operator out of unrelated endpoints. No `Retry-After`/ETag/304 on the snapshot endpoint despite the packet itself raising it in §4 Q3 — unanswered.
- `statusUrl` is server-generated so SSRF is not in play; no secrets appear in the snapshot per the schema shown. Replay/idempotency is covered under blocker #3.
- Multi-tenant: `getBatch(id, userId)` owner check is pinned by test — good. But `prune()` dropping finished batches >1h while a *poller is still open* on that batch converts a permission boundary into a silent data disappearance; acceptable, but unpinned.

**Data-truth / schema drift**
- Snapshot field names (`stills[]`, `failures[]`, `rendered`, `count`, `persistence`, `terminal`) have no pinned response-shape test listed; the frontend consumes camelCase while the store internals aren't shown — the classic drift point. One golden-snapshot assertion would pin it.
- `error.code` on failure is asserted, but the enum of codes is not enumerated anywhere; the client can't branch on codes it hasn't been given.
- `accepted:true` + `replayed:true` are two different shapes from the same endpoint; no test asserts the replayed shape's full field set (does it include `statusUrl`? `count`?).

House rules: no violations observed in this document — no MUI/Recharts, no PII-to-LLM pathway introduced, no banned credential phrasing, no yoga/meditation language. The 300-line cap is unstated for `batchStore.mjs`; confirm it.

## HIGHEST RISK
The hung-batch-holds-GPU-forever state (blocker #1), because it converts any transient ComfyUI stall into a hard outage of the entire local lane with restart-as-the-only-recovery — and restart cascades into blocker #2's infinite poll. Cheapest de-risk before ship: add one watchdog predicate — "if no `renderStill` completion for T minutes (T ≈ 3× worst measured frame time), force `finishBatch(failed, E_RENDER_TIMEOUT)` and `release()`" — plus one test that stubs a never-resolving `renderStill` and asserts the reservation frees. That's ~20 lines and it collapses blockers #1 and #2 into a handled path.

## CONFIDENCE
- I could **not verify** the tests exist or assert what the table claims — the packet cites test names, not bodies. A hung-render test, a disconnect-survival test, and a replay-shape test would settle whether my P1s are already covered.
- I could **not verify** the idempotency key construction (userId-salted? payload hash? TTL?) — this is the largest honest gap in my review; a five-line excerpt of the key derivation settles blocker #3 either way.
- I could **not verify** whether `protect`/`adminOnly` participate in a shared rate limiter, nor whether the poll endpoint sends cache validators — relevant to §4 Q3, unanswerable from this document.
- I assumed the deployment is genuinely single-process as stated; if a second backend instance ever exists, the process-local Map turns every gate in §2 into a lie simultaneously. Evidence that would settle it: the deploy config showing one replica and no load balancer across app instances.
