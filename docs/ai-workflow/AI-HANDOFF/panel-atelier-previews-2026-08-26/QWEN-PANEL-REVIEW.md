# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LIBRARY-PREVIEWS-PACKET-2026-08-26.md
**Tokens (Ollama):** 1359 in / 1526 out | **Wall:** 25.3s | **done_reason:** stop

---
## VERDICT
REVISE — The core logic is sound and the error isolation is excellent, but the document fails to address the critical security implication of exposing 24 signed URLs per page load, creating a significant replay and credential-leak surface that contradicts the "zero PII" and secure-by-default house rules.

## BLOCKERS
1. **P1: Signed URL Exposure & Replay Risk**
   - **Failure Scenario:** An operator loads a library page. The API response contains 24 distinct, short-lived signed URLs. If the browser devtools are open, or if a proxy logs the response, 24 valid credentials to access private S3/R2 objects are exposed simultaneously. While "short-lived," if the TTL is >5 minutes (standard for UX), an attacker with access to the network trace or a compromised client can replay these URLs to download assets. The document claims "opaque" but signed URLs are deterministic based on key+path+expiry.
   - **Evidence:** Section 2: "`listAssets` now signs one short-lived URL per **image** row... A page of two dozen costs nothing." Section 3, Q1: "it is now made 24 times per page instead of once per asset."
   - **Mitigation:** The document does not specify the TTL. If TTL is not <60s, this is a P1. Even if <60s, exposing 24 tokens in a single JSON blob increases the attack surface for credential scraping.

2. **P2: Silent Degradation Hides Operational Failures**
   - **Failure Scenario:** The signer throws synchronously (e.g., missing secret in env var). The `Promise.resolve().then(...)` wrapper catches it and returns `previewUrl: null`. The UI shows a dimension placeholder. The operator assumes the asset is "not an image" or "broken," but the actual cause is a server-side configuration error. This masks a P0 infrastructure failure as a P3 UI state.
   - **Evidence:** Section 2: "Each is wrapped so that one object which will not sign yields `previewUrl: null` — a card that falls back to its dimensions."
   - **Mitigation:** The backend should log a `WARN` or `ERROR` with the asset ID when signing fails, distinct from "asset is not an image." The document does not mention logging.

## ATTACKS
- **Correctness:**
  - **Stale State/Expiry:** Section 3, Q2 acknowledges that URLs may expire while scrolling. The client hides the image on `onError`. This is a race condition between the URL's validity and the user's interaction. If the user clicks "play" or "view" on a hidden image, the behavior is undefined. Does it re-sign? Does it 404? The document says "it does not re-sign," which is a UX trap.
  - **Type Mismatch:** `previewUrl: null` vs `undefined`. The frontend must handle both. The document implies `null`, but JS often defaults to `undefined`. If the API returns `undefined` for non-image rows, and the frontend checks `if (url)`, it works, but if it checks `url === null`, it fails. The document does not specify the JSON shape for non-image rows.

- **Security:**
  - **IDOR via Signed URL:** Signed URLs are bound to the object key. If the signing key is compromised, all assets are exposed. The document does not mention key rotation or scope limitation.
  - **Multi-tenant Scope Leak:** Does the signer verify that the requesting user has access to *this specific* asset before signing? The document says "using the same `generatePlaybackUrl` signer," which implies it does, but it doesn't explicitly state that the *list* endpoint checks per-asset ACLs before signing. If `listAssets` returns assets the user can see, but the signer doesn't re-check ACLs, and the user has a stale token, they could sign a URL for an asset they no longer have access to (if ACLs changed between list fetch and sign). This is a TOCTOU (Time-of-Check to Time-of-Use) vulnerability.
  - **Rate Limit/DoS:** "A page of two dozen costs nothing" is false if the signer is CPU-intensive or if the HMAC calculation is not optimized. More importantly, if an attacker can trigger `listAssets` repeatedly, they can generate a flood of signed URLs, potentially exhausting the signing key's rate limit or causing log bloat.

- **Data-truth / schema drift:**
  - **Frontend Response-Shape Drift:** The document says "non-image rows are not signed at all." Does the API return `previewUrl: null` or omit the key? If it omits the key, and the frontend expects `previewUrl` to be present (even if null), TypeScript types may drift. The document mentions `tsc` exit 0, but does not show the type definition.

## HIGHEST RISK
**The TOCTOU vulnerability in signing:** The `listAssets` endpoint checks if the user can *see* the asset, then signs a URL. If the user's access is revoked between the list fetch and the URL generation (or if the URL is cached and reused), the user can access an asset they no longer have permission to view. The signed URL itself does not carry the user's identity; it only carries the object key and expiry.

**Cheapest De-risk:**
1. **Explicitly state the TTL** in the document. If it's >5 minutes, reduce it to <60 seconds.
2. **Add a `X-Asset-Access-Token`** to the signed URL generation process, or ensure the signer re-validates the user's ACL *at the time of signing*. The document should explicitly state: "The signer re-validates the user's access to the specific asset ID before generating the signature."
3. **Log signing failures** with the asset ID and user ID (no PII, just IDs) to distinguish between "not an image" and "signing error."

## CONFIDENCE
I could NOT verify:
1. **The actual TTL of the signed URLs.** The document says "short-lived" but does not specify the duration. This is critical for assessing the replay risk.
2. **Whether the signer re-validates ACLs.** The document says "using the same `generatePlaybackUrl` signer," but does not explicitly state that this signer checks per-asset permissions. It might only check that the user is authenticated, not authorized for *this specific* asset.
3. **The exact JSON shape for non-image rows.** Does it return `previewUrl: null` or omit the key? This affects frontend type safety.
4. **The logging behavior on signing failure.** The document does not mention logging, which is a critical operational gap.

**Evidence needed:**
- The code for `generatePlaybackUrl` to see if it checks ACLs.
- The configuration for the signed URL TTL.
- The API response schema for `listAssets` to see how non-image rows are represented.
- The logging configuration for the asset library service.
