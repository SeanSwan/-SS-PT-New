# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LADDER-COMPLETE-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 2419 in / 2277 out | **Cost:** ~$0.0414 | **Wall:** 96.5s | **finish_reason:** stop

---

## VERDICT
REVISE — the ladder is architecturally sound but ships with a dead consent gate, a publish artifact that expires under its own users, and a 2-minute synchronous HTTP request that will time out in production.

## BLOCKERS

1. **P0 — Publish consent gate is dead code.** §2.2: "nothing in the pipeline sets a flag yet, so today the consent gate never trips." Inputs: any asset with `consentConfirmed:false` → publish is *refused forever* (fail-closed against the operator himself), OR — worse interpretation — the gate checks a flag that is always false and someone "fixes" it by defaulting to true, silently opening the gate. Either way the frozen-provenance enforcement the document advertises as Publish's guarantee does not function. No file:line given; document supplies none anywhere (see CONFIDENCE).
2. **P0 — `/stills` holds a synchronous HTTP request for ~2 minutes.** §3.3: batch of 4 on a 27s/frame model inside one request, single-flight in-process. Concrete failure: Render/reverse-proxy idle timeout (commonly 30–120s) kills the client connection; the generation keeps running orphaned; the client retries → idempotency coalescing may or may not catch it depending on whether the reservation survives the dropped socket → double-spend of GPU time and a "dead lane" UI. This must be a job + poll contract before merge, not after.
3. **P1 — Signed read URL (4h expiry) handed out as an `<img>` snippet at Publish.** §3.2. Failure: operator publishes, pastes snippet into a real website, site works for 4 hours, then every image 403s — in production, on client sites, silently. Publish's output artifact contradicts its purpose. Either publish must mint a public/CDN URL or the snippet must point at a stable redirect endpoint.
4. **P1 — Motion idempotency key derived per asset+hash+prompt+**minute**.** §2.2. Failure: user double-clicks Motion across a minute boundary (trivially likely on a 27s/frame queue where the user assumes the first click died) → two queued jobs, double GPU spend, two assets racing on the same init image. The minute bucket defeats the entire point of idempotency for a slow queue.
5. **P1 — `permanent:true` on hash mismatch can strand legitimate assets.** §3.1. Failure: R2 object re-uploaded/rewritten (lifecycle, re-encode, manual fix) → agent re-hash mismatches at point of use → permanent failure recorded against an asset whose content is fine → asset is unbindable forever with no documented recovery path.

## ATTACKS

- **Correctness:**
  - Live-VRAM admission is read **once** at request start (§3.3). Anything else on the box (ComfyUI's own caching, a second Sean process, the taste server) allocating VRAM mid-batch → OOM deep in frame 3 of 4, partial batch, and the document never states whether partial stills persist or roll back. Classic TOCTOU.
  - Single-flight is **in-process** (§3.3). Two Node processes (PM2 cluster, a stray dev server, a deploy overlap) both admit → VRAM collision. The guarantee is only as strong as "we only ever run one process," which is undocumented.
  - Half-failed bind state (§3.1): image uploaded into ComfyUI input, job then fails → orphaned bytes in ComfyUI input dir, no GC described. On a box that also runs everything else, this is slow disk/VRAM-pressure rot.
  - `draft→approved→published` "no jumps" — but Unpublish exists in the UI (§2.2 Compose UI). The transition table for published→draft is unspecified: does unpublishing re-freeze provenance? Can a published asset be re-approved after edits? Stale-state hole.
  - Key = sha256 per owner **per month** (§3.4): identical bytes uploaded twice across a month boundary → two R2 objects, two MediaAsset rows, dedup silently broken. The document asks "is that acceptable?" — it is not, because it also breaks the hash-keyed idempotency claim in §2.2.
- **Security:**
  - MCP: 39 tools, **no per-tool disable**, `stop_comfyui`/`free_memory` behind no consent gate, allow-list is "a doc, not config" (§2.2). Any prompt-injection path into whatever drives MCP (or a future agent feature) can kill the ComfyUI process mid-job — a one-user DoS with no code barrier. This is the largest unguarded attack surface named in the document.
  - Taste brain is loopback-pinned and GET-only — good — but "law-filtered" is asserted, not evidenced; a GET-only endpoint can still exfiltrate the rated-corpus taste profile (Sean's competitive asset) if any other local process is compromised. Loopback pinning is not auth.
  - Owner-scoped `GET /asset/:id` — but §2.2 says workspaces don't exist and `projectId` is null; when site #2 arrives, "owner" is the only tenant boundary and every asset for every client site sits in one flat owner scope. IDOR-by-omission the moment a second human (client, contractor) gets credentials.
  - Hosted lane gated on `SWAN_ATELIER_MAX_SPEND_USD_DAILY>0` but **no spend ledger exists** (§2.2) — ceilings are per-batch. Failure: 50 batches in a day each under the batch ceiling → daily cap is fictional. The env var name promises a guarantee the code does not keep. That is exactly the "UI must never promise what the server will refuse" sin, one layer down.
  - The `spendGuard` null-vs-undefined seam (§2.2) was found once; the same class of bug (env var parsed as string `"0"` being truthy, `NaN` from a malformed cap) is not shown to be covered by tests.
- **Data-truth / schema drift:**
  - `workspaceId` rides in `tags` (§2.2) — tags are typically free-text/array columns; no index, no FK, no integrity. First drift: a tag typo (`"swan"` vs `"swanstudios"`) silently partitions the asset library; second: any future workspace query is a full-table LIKE scan.
  - `MediaAsset.projectId` FK to `content_projects` left null — when it gets populated, every existing row needs a backfill migration; the document has no migration plan, so the schema and the query layer will drift the day site #2 ships.
  - Frontend polls "the Render Queue's endpoint" for motion jobs (§2.2) — response-shape coupling between Atelier UI and a pre-existing queue endpoint is asserted but no contract test is mentioned; classic frontend shape-drift site.
  - No file:line evidence for any of this — the document is a narrative summary, not a diff (see CONFIDENCE).

## HIGHEST RISK

The **synchronous 2-minute `/stills` request** is the most dangerous item because it is the only defect guaranteed to fire on the very first real use, by the only user, on the happy path — no adversary required. Cheapest de-risk: do not build a job system; make `/stills` return `202 {batchId}` immediately, write stills to R2 as each frame completes, and have the existing poll loop (already built for Motion) poll `GET /stills/:batchId`. The UI already knows how to poll; the server already knows how to persist incrementally. That is a small refactor of `composeStills`, not new infrastructure — and it simultaneously fixes the orphaned-generation and retry-double-spend failure modes.

## CONFIDENCE

I could not verify, from this document alone:
- **Any file:line evidence.** §2 claims "[VERIFIED — every file read this session]" but the packet contains zero code excerpts, line numbers, or diffs. Every blocker above cites section text, not code. A diff of PR #73 would settle whether, e.g., the minute-bucket idempotency key and the once-only VRAM read are real or summarization artifacts.
- **Whether the consent gate fails closed or fails open.** §2.2 says flags exist with `consentConfirmed:false` and "the gate never trips" — I cannot tell if publish is currently impossible (annoying) or currently unguarded (dangerous). One read of `publishAsset` settles it; this ambiguity is itself a finding.
- **The actual timeout budget** of the deployment target for `/stills`. If this admin runs only on Sean's LAN box with no proxy, the 2-minute request may survive — but the document says the UI polls "the Render Queue's endpoint," implying Render hosting, where it will not.
- **Whether partial-batch persistence rolls back.** Not stated anywhere.
- **House-rule compliance.** The document names no component library or chart library, so I find no MUI/Recharts violation — but absence of mention is not compliance; only the frontend diff settles styled-components/Victory/token usage, 44px targets, and 4.5:1 contrast. No "yoga/meditation" or "NASM-certified" language appears in this packet; whether the generated UI copy and LAW10 filters actually enforce it is unverifiable here.
- **The Wan 2.2 single-frame still quality question** (SWA-207) — both senior seats predicted poor stills from a video-latent decoder, and I concur on priors; if the probe fails, the entire "free by default" promise rests on a fallback (hosted FLUX costs money; no other local checkpoint exists on the box) that the document never names. That is a strategic gap, not a code bug, and only running the probe settles it.
