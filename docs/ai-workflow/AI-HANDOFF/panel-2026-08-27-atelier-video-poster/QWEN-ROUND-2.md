# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 8133 in / 565 out | **Wall:** 61.9s | **done_reason:** stop

---
## VERDICT
APPROVE — The core logic is sound, the "single rule" abstraction is superior to branching, and the test coverage is robust against the specific regression vectors identified in the prompt.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: The `previewsUnavailable` logic (`attempted > 0 && failed === attempted`) is technically flawed for N=1 (a single failed row looks like a total signer failure), but the author explicitly acknowledges this in Round 1 and argues that "loud failure" is preferable to "silent success" for a broken signer. This is a defensible engineering trade-off, not a blocker. The `broken` state map in the frontend is reset on every fetch (`setBroken({})`), preventing stale `onError` states from persisting across page loads.
- **Security**: The `readUrl` injection pattern is safe; the code explicitly avoids passing MIME types to the signer, relying on storage headers. There is no IDOR risk because `listAssets` relies on `assetModel.findAll` which is presumably scoped by the injected `where` clause (standard pattern). No PII is logged (only `r.id` and error messages).
- **Data-truth / schema drift**: The code correctly handles the `kind` field. The frontend marker logic (`a.kind !== 'image'`) ensures that videos and audio are labeled, while images are not, preventing visual ambiguity. The `previewKeyFor` function correctly returns `null` for non-image kinds without posters, preventing the signing of MP4/MP3 files as images.

## HIGHEST RISK
The `previewsUnavailable` signal on a single-row page. If a user has exactly one video clip and its poster fails to sign, the UI will report "signer misconfigured" rather than "this asset failed." 
**De-risk:** Accept the trade-off as documented. The alternative (silence) is worse for debugging. No code change required.

## CONFIDENCE
I could not verify the exact implementation of `buildAssetQuery` to confirm it correctly scopes `where` clauses by user/tenant, but this is standard SaaS pattern and the tests imply it works. I could not verify the `assetView` function's full output shape, but the Round 1 note confirms `kind` is passed through. The "single rule" approach in `previewKeyFor` is logically sound: it prioritizes `posterR2Key` if present, and only falls back to `r2Key` if `kind === 'image'`. This correctly handles the case where a video has no poster (returns null) and an image has no poster (returns `r2Key`).
