# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-S1-LOCAL-FIRST-REVIEW-PACKET-2026-08-24.md
**Tokens (Ollama):** 2664 in / 1923 out | **Wall:** 29.4s | **done_reason:** stop

---
## VERDICT
REJECT — The proposal fundamentally misunderstands the hardware constraints of a single 5090 (24GB VRAM) by attempting to serve concurrent local generation requests without a queue, and it exposes the unauthenticated, write-capable taste server to the backend network without any transport security or authentication controls.

## BLOCKERS
1. **P0: VRAM Exhaustion & Crash (Race Condition)**
   - **Scenario:** Two concurrent `POST /api/atelier/compose/stills` requests arrive. Both pass the `local` lane check (ComfyUI `/system_stats` is up). Both dispatch to the local ComfyUI adapter. The 5090 has 24GB VRAM. Wan 2.2 peaks at 25,385 MiB (24.78 GB) for a *single* 832x480x49f render. Two concurrent renders will exceed VRAM, causing an OOM crash of the ComfyUI server or the GPU driver. The backend will hang or return 500s, and the "free" local lane is now down for all users.
   - **Evidence:** §2.3 states `25,385 MiB peak VRAM` for a single run. §3 P-A proposes `local` lane with "volume cap only" but no mention of a concurrency lock or queue. §2.1 notes the idempotency store is "process-local," which does not prevent two different processes or two concurrent requests from hitting the GPU simultaneously.

2. **P0: Unauthenticated Write-Access to Taste Brain (Security)**
   - **Scenario:** The Atelier backend (running on the same host or network) calls `127.0.0.1:7331/api/prompt`. The taste server is "unauthenticated by design" and "can WRITE taste files." If the backend is compromised (e.g., via a bug in `composeStills` or a dependency), or if any other local process can reach port 7331, it can corrupt the taste corpus or inject malicious prompts that bypass the law filter if the filter is applied *after* the taste server returns data. More critically, if the taste server is exposed to the LAN (common in dev setups), any local user can write to the taste files, poisoning the "Swan Brain" with non-compliant or harmful content.
   - **Evidence:** §2.2 states the taste server is "unauthenticated by design (it can WRITE taste files)" and "binds localhost." §3 P-B proposes the backend calling this server directly without any mention of authentication, TLS, or read-only mode.

3. **P1: Law Filter Bypass via Taste Server (Correctness/Compliance)**
   - **Scenario:** The taste server returns a prompt that is *almost* compliant but contains a subtle violation (e.g., a brand name or a prohibited action). The law filter (`assertLawful`) is applied *after* the taste server returns the prompt. However, if the taste server modifies the prompt in a way that the law filter does not catch (e.g., by encoding the violation in a way that the filter's regex or logic misses), the non-compliant prompt is sent to the generator. The law filter is a gate, but it is only as strong as its implementation. If the taste server is a "black box" that returns pre-processed prompts, the law filter may not have visibility into the original intent or the full context.
   - **Evidence:** §3 P-B states "feeds each returned prompt through the law filter." §2.2 states the taste server "feeds on Sean's rated taste files." The law filter is in `shared/swanPromptCompiler.mjs`, which is separate from the taste server. There is no guarantee that the taste server's output is in a format that the law filter can fully validate.

4. **P1: Stale State in Idempotency Store (Data-Truth)**
   - **Scenario:** The idempotency store is "process-local" (§2.1). If the backend restarts or scales to multiple instances, the idempotency store is lost or inconsistent. A user who submits a request, receives a 207 partial, and then retries the same request will not be deduplicated if the process restarted or if the request hits a different instance. This leads to duplicate charges (if hosted) or duplicate GPU usage (if local), violating the "batch honesty" and "idempotency" claims.
   - **Evidence:** §2.1 states "idempotency (process-local store, derived seeds, 60s bucket)." §3 P-A does not address how idempotency is maintained across process restarts or multiple instances.

## ATTACKS
- **Correctness:**
  - **Race Condition:** As noted in Blocker 1, concurrent local requests will exhaust VRAM. The `comfyuiLocal` adapter does not appear to have a built-in queue or lock. The backend must implement a single-flight lock for local generation.
  - **Stale State:** The process-local idempotency store is a single point of failure. If the backend crashes, the store is lost. If the backend scales, the store is inconsistent.
  - **Unhandled Error Path:** If the ComfyUI server is down, the `local` lane fails. The proposal does not specify a fallback to `hosted` or a clear error message. It says "hosted only on explicit request," which means if the user requested `local` and it fails, the request fails. This is acceptable, but the error message must be clear.

- **Security:**
  - **IDOR:** The `protect, adminOnly` middleware is used for the Atelier routes. This is good. However, the taste server is unauthenticated. If the taste server is exposed to the network, any user can access it.
  - **Injection:** The taste server returns prompts. If these prompts are not sanitized before being sent to the ComfyUI adapter, they could contain malicious content. The law filter is a gate, but it is not a sanitizer.
  - **SSRF:** The backend calls `127.0.0.1:7331`. This is safe if the backend is on the same host. If the backend is on a different host, this is an SSRF risk. The proposal does not specify the network topology.

- **Data-truth / schema drift:**
  - **Model Column vs Caller Field Drift:** The taste server returns `{prompts:[{prompt}...], seed}`. The `composeStills` function expects a `brief` or a `promptSource`. If `promptSource: 'taste'`, the backend must map the taste server's response to the `brief` field. This mapping is not specified.
  - **Frontend Response-Shape Drift:** The frontend expects a specific response shape from `POST /api/atelier/compose/stills`. If the backend returns a different shape when `promptSource: 'taste'`, the frontend will break. The proposal does not specify the response shape.

## HIGHEST RISK
The single most dangerous item is the **VRAM exhaustion** caused by concurrent local generation requests. The 5090 has 24GB VRAM, and a single Wan 2.2 render peaks at 25,385 MiB. Two concurrent renders will exceed VRAM, causing an OOM crash. The cheapest concrete way to de-risk this is to implement a **single-flight lock** in the `composeStills` function that ensures only one local generation request is processed at a time. This lock should be a simple in-memory flag or a database lock that is acquired before dispatching to the local ComfyUI adapter and released after the render is complete.

## CONFIDENCE
I could not verify the following from the document alone:
1. **Network Topology:** Is the backend and the taste server on the same host? If not, the `127.0.0.1:7331` call is an SSRF risk.
2. **ComfyUI Adapter Queue:** Does the `comfyuiLocal` adapter have a built-in queue or lock? If not, the backend must implement one.
3. **Law Filter Implementation:** How does the law filter work? Is it a regex, a list of banned words, or a more complex logic? If it is a simple regex, it may be bypassed by the taste server.
4. **Idempotency Store Persistence:** Is the idempotency store persisted to disk or database? If not, it is lost on process restart.

Evidence that would settle these:
1. A network diagram showing the backend, taste server, and ComfyUI server.
2. The source code of the `comfyuiLocal` adapter.
3. The source code of the law filter.
4. The source code of the idempotency store.
