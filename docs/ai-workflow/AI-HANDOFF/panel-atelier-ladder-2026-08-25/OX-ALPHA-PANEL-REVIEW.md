# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LADDER-COMPLETE-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 2428 in / 4079 out · **Cost:** ~$0.0000 · **Wall:** 149.0s · **finish:** stop

---

## VERDICT
REVISE — the ladder's architecture is sound and honestly documented, but it ships with a dead safety gate (consent/provenance flags nothing sets), a publish artifact that self-destructs in 4 hours, and a ~2-minute synchronous HTTP contract that will fall over on the first real proxy between Sean and the server.

## BLOCKERS

1. **P0 — The consent/licence publish gate is unwired, and the document cannot tell us which way it fails.** §2.1 says publish is "refused by the FROZEN provenance: unconfirmed consent flag"; §2.2 says "`consentConfirmed:false` as the honest start state — nothing in the pipeline sets a flag yet, so today the consent gate never trips." These two statements are mutually exclusive. Either (a) the gate checks `consentConfirmed` and *every* publish is refused forever (studio bricked at the last rung), or (b) the gate checks something else / nothing, meaning the flagship commercial-safety guarantee is decorative — a direct violation of the binding fail-closed rule. No third option. Evidence: §2.1 Publish row vs §2.2 bullet 5. This must be resolved by a test, not prose, before merge.

2. **P0 — Publish hands out a 4-hour-expiring signed URL as the deliverable.** Scenario: Sean copies the `<img>` snippet into a client site (§2.1 Publish row explicitly offers "read URL + snippet"); 4 hours later every image on the live site 403s. "Published" is a lie — the artifact rots on a timer. For a tool whose stated purpose is producing assets *for websites he builds* (§1), this makes the final rung unusable for its only real job. Needs CDN/public URLs or a server-side redirect endpoint with a stable permalink; signed URLs are fine for preview only.

3. **P1 — Stills is a ~2-minute synchronous HTTP request.** §3 Q3 admits it: 4-up × 27s/frame inside one request. Concrete failure: any nginx/Cloudflare tunnel/browser default (commonly 30–100s idle timeout) kills the connection mid-batch; the client sees a network error, retries, and now contends with single-flight for a batch whose result nobody is listening for. Motion got a queue; stills didn't, and there is no stated reason why. Contract should be: submit → jobId → poll, identical to Motion.

4. **P1 — VRAM admission is a check-then-act race, and single-flight is per-process.** Two concurrent `/stills` requests both read "live VRAM" (§2.1 Still row) before either allocation lands → both admitted → ComfyUI OOMs, taking down unrelated jobs on the shared box. And "single-flight" being in-process means it silently evaporates the day this runs under PM2/cluster mode with >1 worker — admission becomes advisory. The doc treats both as guarantees; they're best-effort heuristics at best.

5. **P1 — Minute-granularity idempotency key double-fires on retry across a boundary.** §2.2: motion idempotency is "derived per asset+hash+prompt+minute." A client retry at :59.8 landing at :00.1 derives a *different* key → duplicate video job queued and (once hosted lanes open) double spend. Idempotency keys must be client-supplied or content-derived, never wall-clock-sliced. Also note internal drift: the Motion key includes `prompt`, but §2.1 says Motion *refuses a prompt alone* and binds `{assetId, sha256}` — which component set is real?

6. **P1 — "Used commercially" has no source.** The publish gate refuses "grant-required model run used commercially with no grant" (§2.1), but nowhere in the pipeline is "commercial" an input: not on the asset, not on the publish call, not derivable from a frozen licence snapshot alone (a licence grants by territory/use, and §3 Q2 concedes territory isn't captured). Today this clause can never evaluate true. It needs an explicit publish-time declaration (`intendedUse: commercial|personal`, target domain) captured on the publish request and frozen alongside provenance.

## ATTACKS

**Correctness**
- Half-failed bind state machine is incomplete (§3 Q1): uploaded-to-ComfyUI-input-but-job-failed leaves orphaned files in ComfyUI's input dir with no GC path mentioned — unbounded disk growth on a solo operator's box. Ticket states need at minimum `uploaded`, `upload_failed`, `job_failed` with cleanup on the latter two.
- `permanent:true` on hash mismatch (§3 Q1) strands legitimately re-uploaded assets with no override path. Hash mismatch after upload means upstream corruption or a mutated record — that's a *halt-and-inspect*, not a permanent tombstone. Require an explicit human `overrideMismatch` action with audit trail instead.
- Filename handed to the ComfyUI graph post-upload is unspecified. If it's not hash-derived, replays collide or duplicate; if it is, say so — it's load-bearing for idempotency.
- `/limits` read at page load (§2.2 Compose UI) is inherently stale; fine only because `spendGuard` re-checks server-side — but the UI must render the *submit-time* refusal, not just pre-hide the button, or the honesty contract breaks on stale state.

**Security**
- Authn/authz is asserted ("owner-scoped") but never specified: what middleware guards `/estimate`, `/stills`, `/motion`, `/asset/:id/status`? An admin SaaS where the status-mutation endpoint's scoping is undocumented is where IDOR lives. `GET /asset/:id` is scoped; is `POST /asset/:id/status`?
- Hosted OpenRouter lane ships operator-authored prompt text to a third party. Zero-PII rule is enforced for LLM chat presumably, but nothing scrubs prompts — a prompt like "hero image for [client name] dental site" leaks client identity. Cheap fix: a lint/warn on prompt submission.
- Taste-brain loopback-pinning is good SSRF hygiene; verify the pin rejects `127.0.0.2`–`127.255.255.254` and DNS-rebinding via literal-IP enforcement, not just string-prefix matching on `127.0.0.1`.
- `stop_comfyui`/`free_memory` MCP tools behind no consent gate (§2.2) — these are DoS primitives against the shared box from anything holding the MCP socket. "Doc, not config" is Sean's call, but the review should record that it's a known accepted risk, not an oversight.

**Data-truth / schema drift**
- Env var named `SWAN_ATELIER_MAX_SPEND_USD_DAILY` gates a *per-batch* ceiling because there's no ledger (§2.2). The name promises daily enforcement the system doesn't do — config-name-vs-semantics drift that will bite the first time Sean raises it believing it caps his day.
- "Key = sha256" implies content-addressed dedup, but month-scoping (§3 Q4) means the same bytes stored twice are two objects — the invariant the name suggests doesn't hold. Rename or accept and document.
- `workspaceId` in `tags` (stringly-typed, no FK, collision-prone) plus `projectId` permanently null is the known landmine for site #2; the first cross-project query filtered on a tag substring will leak across sites. Cheapest fix now: a dedicated indexed column, even if single-valued.
- Frontend response-shape contracts (`/limits`, estimate payload, asset record) are described only narratively — no schema is pinned anywhere in the doc, so PascalCase/snake_case drift between `MediaAsset` rows and the TS api layer is unverifiable from here.

## HIGHEST RISK
Blocker #1 — the publish gate. Everything upstream (pricing honesty, tri-state lanes, provenance freezing) is theatre if the final commercial-safety checkpoint demonstrably cannot fire. Cheapest de-risk before merge, ~an hour: write two tests against the real route handler — (1) publish an asset with `consentConfirmed:false` and assert the outcome, (2) flip the flag via whatever write path exists and assert again. Test 1's result tells you which failure mode you have (always-refuse vs never-refuse); then wire the minimal honest signal — a manual "I confirm consent + intended use" action on the Approve step that writes `consentConfirmed:true` with actor/timestamp into the frozen record — and make test 2 pass through the gate. Do not merge on prose assurances about this gate.

## CONFIDENCE
Everything above is judged from the document's own claims; I have not seen a line of the branch, so no file:line citations were possible and every "guarantee" in §2 is taken on trust from the authoring session. Specifically unverifiable from here: (a) which way the consent gate actually fails — settled by the two-test protocol above; (b) whether auth middleware exists on these routes at all — settle by reading the router mount in `backend/routes/atelierComposeRoutes.mjs` and the app wiring; (c) whether the 195 backend tests exercise failure paths (R2 unconfigured, VRAM exhaustion, hash mismatch) or only happy-path mock injections — settle by reading the suites; (d) all frontend house-rule compliance (styled-components/Victory/token fallbacks/44px/dark-first) — the doc asserts the constraints but shows zero UI code, so I neither credit nor fault it; (e) whether Wan 2.2 TI2V-5B produces acceptable single-frame stills — genuinely unknown until SWA-207 runs, and the doc is admirably honest that it's unprobed; my review assumes the `claimed` posture holds. Where the doc and my analysis conflict, trust a test over either of us.
