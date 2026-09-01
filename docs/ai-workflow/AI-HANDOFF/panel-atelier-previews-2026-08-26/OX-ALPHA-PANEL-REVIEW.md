# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LIBRARY-PREVIEWS-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 1421 in / 3289 out · **Cost:** ~$0.0000 · **Wall:** 111.3s · **finish:** stop

---

## VERDICT
REVISE — the failure-isolation pattern is genuinely correct engineering, but the feature ships with an unverified signer-to-R2 contract, an undefined TTL, and an `onError` path that contradicts the packet's own degradation philosophy.

## BLOCKERS
No P0s. Three P1/P2 items I'd hold the branch on:

1. **P1 — Reusing `generatePlaybackUrl` for still images is an unverified cross-contract assumption.** The signer is named for *playback*; the packet asserts it works for image rows because "the published-reference endpoint already uses it." If that endpoint serves video/audio, the signer may bake in response headers (`Content-Disposition: inline; filename=...`, content-type hints) or key-prefix/shaping assumptions that R2 happily signs but refuses to serve for a still — every preview silently 403s/404s and the entire feature degrades to the dimensions placeholder while all 405 tests stay green. The packet itself admits this ("Not proven: a real signed URL against real R2"), which means the *core claim of the slice* is the one thing untested. Evidence: §2 ("the same `generatePlaybackUrl` signer") and §4 ("Not proven").

2. **P1 — Signed URLs convert a metadata-leak into a content-leak; authz surface is asserted nowhere.** Last round's posture was "the storage key never leaves the server." Now every list response carries up to 24 live bearer credentials. Two concrete scenarios: (a) if `listAssets` has any IDOR/over-broad role scoping, previously you leaked filenames and dimensions — now you leak fetchable bytes; (b) presigned URLs are object-key-scoped only, so *any* per-asset authorization enforced at the detail-endpoint layer (draft/unpublished state, tenant scope) is bypassed the moment the URL is handed out. The packet attacks its own trade on cost and expiry but never states who can call `listAssets` and whether draft rows get signed. Evidence: §2, §3 question 1 raises the trade but not the authz delta.

3. **P2 — `onError` hides the image outright, contradicting the packet's own stated principle.** §2 argues "a broken-image icon reads as 'your asset is gone'" — correct — but then the expiry path *removes* the image rather than falling back to the dimensions placeholder that the no-`previewUrl` path uses. Result: two different degradation behaviors for two flavors of the same failure, and the scrolled-back-to card shows *less* than it did before the URL expired. Also, `onError` fires for CORS misconfig, network blips, and R2 500s — not just expiry — so all of these get silently swallowed into blank grid cells with no counter, no log, no refetch affordance. A systemic signer failure is observationally identical to "lots of assets lack previews." Evidence: §2, "The client degrades twice."

## ATTACKS

**Correctness**
- The sync-throw wrap (`Promise.resolve().then(() => readUrl(...)).catch(...)`) is correct and the test for it is the right test — credit where due. But isolation is only as good as the aggregation: if the code uses `Promise.all`, fine; if anything downstream does `rows.map(...)` then mutates rows by index as promises resolve, fast/slow completion order can attach `previewUrl` to the wrong row under paging. Nothing in the packet rules this in or out.
- "Short-lived" is never given a number. If it's ≤ scroll-session length, expiry-on-scroll isn't an edge case, it's the median case for page 1. If it's hours, the leakage window in Blocker 2 widens correspondingly. Pick a TTL deliberately and state it.
- How is "image row" determined — stored MIME column, extension, or magic-byte guess at write time? Extension-vs-MIME drift is the classic way a video ends up unsigned or a corrupt row ends up signed.

**Security**
- Replay: presigned URLs are fully replayable by anyone who observes them — proxy logs, browser cache, React Query/devtools persistence, referrer leaks if any preview ever loads off-origin. Time-boxing mitigates; nothing here says the boxes are small.
- Rate-limit/DoS: HMAC is cheap, agreed — but the *serving* side isn't. 24 live URLs per page response means cached list responses (if any HTTP caching exists) serve stale-but-valid or valid-looking URLs unpredictably. State the Cache-Control story for the list endpoint.
- Secret handling: CLEAN per scan, nothing contradicts.

**Data-truth / schema drift**
- Backend is `.mjs`; the packet names the field `previewUrl`. If the rest of this API serializes snake_case (or if `assetLibrary.mjs` passes storage-layer objects through raw), the frontend's `previewUrl` read yields `undefined` — which happens to be handled (falls into the null path), so the drift would be *invisible* in staging where previews work via some other path, and latent forever. Confirm the serializer, don't infer it from green tests.
- `previewUrl: null` vs field-absent: the TSX must treat both identically; a `hasOwnProperty` or truthiness asymmetry here produces flicker between placeholder states.

**House rules**
- No violations visible: no MUI/Recharts, no yoga/NASM language, ≤300 lines claimed and plausible (234/178/67). Token-registry guard CLEAN covers palette mechanically. What I *cannot* see: 44px touch targets on interactive cards (are library cards clickable? unstated), WCAG 4.5:1 on the dimensions-placeholder text over letterbox bars, dark-first rendering of the placeholder. None are violations on current evidence; all are unverified.

## HIGHEST RISK
Blocker 1: the entire slice rests on an untested assumption that a playback signer produces servable image URLs, and the test suite structurally cannot catch it being wrong (injected signer, plumbing-only assertions). Cheapest de-risk: one manual staging smoke — call `listAssets` against real R2, `curl -I` one returned `previewUrl`, confirm 200 + `image/*`. Thirty minutes, kills or confirms the biggest unknown before anyone writes another line.

## CONFIDENCE
- **Could not verify:** that `generatePlaybackUrl` is header/prefix-safe for stills (packet concedes this); actual TTL value; how image-ness is determined; whether `listAssets` enforces role/tenant scoping and whether draft rows get signed; whether the `.mjs` layer emits camelCase consistently; whether `onError` hides the card or falls back to the placeholder (the prose is ambiguous); frontend stale-response handling under fast paging.
- **Evidence that would settle it:** the `assetLibrary.mjs` diff (signer call site, row filter predicate, serialization), the `AtelierLibrary.tsx` `onError` handler body, one real-R2 curl transcript, and the authz middleware on the list route. My Blocker 2 severity in particular is conditional — if `listAssets` is already operator-only and drafts are operator-visible by design, it drops to P2 hardening notes; I cannot see that from here, so I'm flagging at the severity it would have if my reading is right, not the severity I can prove.
