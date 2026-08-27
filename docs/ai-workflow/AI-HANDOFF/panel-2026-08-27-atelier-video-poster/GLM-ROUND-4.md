# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens:** 11475 in / 18835 out (reasoning: 17083) | total 30310
**Wall:** 409.2s

---

## VERDICT
REVISE — the reader-side logic is correct, unusually well-falsified, and I found no defect in `previewKeyFor`/`signPreviews` themselves, but the module's central guarantee ("a broken signer is never silent") is structurally unobservable on exactly the page shape the packet's own round-2 writer finding makes common, and closing it is a five-minute log check plus at most a mechanical logging change.

## BLOCKERS

1. **P1 — Composite silent-signer on sparse pages.** Inputs/state: a page where fewer than 2 rows are signable — e.g., 23 poster-less clips (the round-2 found-path population) plus 1 clip with a poster — and a broken signer (rotated key). `attempted = failed = 1` → `previewsUnavailable = false` (`attempted >= 2` gate, §4), the banner at `AtelierLibrary.tsx:131→:178` never renders, and the *only* signal is `console.warn` — whose reachability to any human has been an open item since round 1. Output: all-grey page, HTTP 200, zero observable telemetry — the precise outcome §4's per-row catch declares unacceptable. Sharper still: on a fully poster-less page (`attempted = 0`) a broken signer is undetectable *by design*. Three separately-recorded facts (gate, unverified console capture, poster-less population) compose into one hole nobody composed. This collapses to P2 the moment someone shows `[Atelier/library]` in shipped logs.

2. **P2 — `kind` casing is load-bearing in two places and unverified.** `row.kind === 'image'` is both the fallback allowlist and the marker suppressor. Any MediaAsset writer emitting `'Image'`/`'VIDEO'` (packet admits only two writers verified) sprouts ` · Image` labels on every still and re-greys poster-less stills (pre-existing there, not a regression). Settle it forever with `SELECT DISTINCT kind FROM media_assets` — not another grep.

3. **P2 — Unconditional poster preference with no freshness invariant.** `previewKeyFor` returns `posterR2Key` regardless of `r2Key` state. Any current or future path that updates `r2Key` on an existing row without co-updating `posterR2Key` renders the *old* image — a card that lies, strictly worse than a grey box because nobody notices. §10 audited signing sites, not mutation sites. Settle with a grep for `MediaAsset.update` / r2Key mutations; if none exist, say so in the model comment as an invariant.

4. **P2 — Writer tenant scoping (out of slice; attach to backlog #1).** `videoRenderJobService.mjs:270`: `findOrCreate({ where: { r2Key } })` — `ownerUserId` appears only in `defaults`. On any r2Key collision across tenants (keygen regression, import, seed data), tenant A's completed render *finds* tenant B's row: A's asset is invisible in A's library (`ownerUserId` stays B), no error fires anywhere. Round 2 stared at these exact lines for the poster gap and missed the where-clause scope. Conditional on collision, but the fix rides the same transaction as the poster backfill.

5. **P2 — Packet integrity, by this workstream's own standard.** `assetView` is load-bearing (the entire round-3 whole-view-shape test targets it), exists only as a quoted fragment (`assetLibrary.mjs:181`), and the new assertion is described but never pasted. Four manufactured findings and one stale paste in this workstream came from exactly this class. Re-splice.

## ATTACKS

**Correctness:**
- Lookahead row is sliced *before* `signPreviews` — no wasted signature on row pageSize+1. Checked; correct.
- `Promise.resolve().then(...)` handles sync-throwing signers; counters are safe in single-threaded map/await; no race found.
- `readUrl` resolving a non-string yields `previewUrl: undefined`, not null — benign today (frontend falsy check) but the seam's contract is `string | null` and nothing enforces it.
- `broken` reset per fetch (`AtelierLibrary.tsx:120`) re-requests permanently-broken images on every subsequent page load — churn, not incorrectness.
- `kind === 'image'` is a proxy for "browser-decodable still"; an `image/heic`/`image/tiff` fallback still grey-boxes in Chromium. Pre-existing, mime-vs-kind truth gap, P3 note only.

**Security:**
- No new surface in the slice: owner scoping unconditional (waived round 2, correctly), route `adminOnly`, per-row signing.
- Presign TTL never stated. The expiry comment implies short-lived; if `generateThumbnailUrl` issues long-lived URLs, posters are bearer links that outlive the session. One paste settles it.
- Blocker 4 (findOrCreate scope). No injection/SSRF/PII surface touched.

**Data-truth / schema drift:**
- `posterR2Key` vs `poster_r2_key` consistent via model (§12 SQL joins on it cleanly).
- View shape now asserted end-to-end — good; residual is that the assertion lives in an unpasted file (blocker 5).
- §12's correction is right, but the handoff's §5a remains wrong *in the tree* — the fix is documented here, not applied; the next agent re-inherits the false baseline.

On the packet's five questions, tersely: (1) one function is right; the smuggled branch is the `kind` allowlist, where mime is the truth; (2) mixed-page gate semantics are fine — the failure mode is sparse pages, blocker 1; (3) your empty-r2Key-with-poster case is a fix, not a regression; the unconsidered shape is the stale poster, blocker 3; (4) I agree no unlabelled surface exists — both the poster path and the placeholder path sit inside `AssetCard` with `AssetMeta`, conditional on the round-1 grep being complete; (5) your grep says no reader infers image — I can't independently verify, and the assumption is now doubly load-bearing (blocker 2).

## HIGHEST RISK
Blocker 1. Cheapest de-risk: grep a production or staged log sink for `[Atelier/library]` across a window with known library traffic — zero hits means every telemetry claim in §4 is dead in deploy and the "nothing goes silent" design promise is false. If unreachable, route the three console calls through the service's structured logger at the same lines — mechanical, no logic change. Pair with the round-3 SQL to size the sparse-page population. Do not ship the silence claim until one of those two facts is in hand.

## CONFIDENCE
Could not verify from the packet: `assetView` body; `buildAssetQuery`'s tail (does the search path dereference `fn`/`col` when `listAssets` guards only `assetModel && Op`? — the tests pass `Op` alone, suggesting lazy use, but a search request plus partial deps may crash); the route injection beyond the quoted line; `generateThumbnailUrl` implementation and TTL; whether backend console output is captured or alerted anywhere; `kind` casing across all writers; existence of any r2Key mutation path; styled-components definitions — no house-rule violation is *visible* in pasted code (styled-components only, no MUI/Recharts, no restricted language), but 44px targets, `var(--token,#fallback)` palette, dark-first contrast, and Dual-Button Glow applicability to `QuietButton` rest entirely on the unshown `frontend-guards` result; whether the 188 `node:test` runs are in CI; §12's jose/sanitize-html diagnosis. Honest scoping: blockers 3 and 4 are conditional on code paths not in the packet — they are audit demands, not assertions that they fire; blocker 1's severity is evidence-dependent as stated.
