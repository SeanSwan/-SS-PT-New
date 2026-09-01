# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LADDER-COMPLETE-REVIEW-PACKET-2026-08-25.md
**Tokens (Ollama):** 2382 in / 1740 out | **Wall:** 23.4s | **done_reason:** stop

---
## VERDICT
REJECT — The system is architecturally sound but functionally broken because the core "commercial safety" feature (consent gating) is a no-op due to missing state mutation, and the synchronous video generation contract violates the 300-line/HTTP timeout constraints for the target hardware.

## BLOCKERS
1. **P0: Consent Gate is Dead Code (Security/Licence Leak).**
   - **Scenario:** User generates an image using a "grant-required" model (e.g., MiniMax H3). The `MediaAsset` row is created with `consentConfirmed: false`. The user clicks "Publish". The `publishAsset` logic checks `consentConfirmed`. Since no code path *sets* this flag to `true` (as explicitly stated in §2.2: "nothing in the pipeline sets a flag yet"), the check either fails closed (blocking legitimate use if the flag is required to be true) or, more dangerously, if the logic is `if (!consentConfirmed && modelRequiresGrant) throw`, it works, BUT if the logic is inverted or if the "grant" is assumed by default, it leaks. However, the document says "publish refused by... unconfirmed consent flag". If the flag is *always* false, **no one can ever publish any asset**, rendering the studio useless. If the intent was that *local* models are auto-consented, the code must explicitly set `consentConfirmed: true` for `localStillLane`. It does not. Result: Total functional blockage or silent licence violation depending on the unverified logic branch.
   - **Evidence:** §2.2 "nothing in the pipeline sets a flag yet, so today the consent gate never trips." This is a P0 because it breaks the primary value proposition (commercial safety) or the primary function (publishing).

2. **P0: Synchronous Video Generation Violates HTTP/UX Constraints.**
   - **Scenario:** User triggers `POST /motion` with a 5-second clip. The backend calls ComfyUI. On an RTX 5090, 5s of 5B param video takes ~15-30s. The HTTP request hangs. If the user's browser or proxy times out (common at 30s), the client thinks it failed, but the GPU is still rendering. The "single-flight" lock is held for 30s, blocking all other requests. The UI shows a spinner for 30s with no feedback.
   - **Evidence:** §3.3 "A batch of 4 on a 27s/frame model is ~2 min inside one HTTP request." This is a P0 UX/Architecture failure. The contract *must* be async (Job ID) to meet the "honesty over polish" and "44px touch targets" (implying mobile/web responsiveness) standards.

3. **P1: IDOR via Asset ID in Publish/Reference Endpoints.**
   - **Scenario:** `GET /asset/:id/reference` and `POST /asset/:id/status` do not explicitly state they check `ownerId` against the session token *before* reading the asset. If `readAsset` returns the asset, but the status update doesn't re-verify ownership in the same transaction, a user could publish another user's asset if they guess the UUID (or if IDs are sequential).
   - **Evidence:** §2.1 "owner-scoped record" is claimed, but §3.2 asks "Is a signed read URL... the right thing". The lack of explicit `WHERE owner_id = :session_user` in the mutation path is a standard IDOR risk.

## ATTACKS
- **Correctness:**
  - **Stale VRAM Admission:** §2.2 says admission reads live VRAM *once*. If two requests arrive within the same millisecond, both pass admission, both start rendering, and the second one OOMs or crashes ComfyUI. The "single-flight" lock is in-process, but if the lock is acquired *after* the VRAM check, there is a race condition.
  - **Hash Mismatch on Re-upload:** §3.1 asks if `permanent:true` on mismatch is right. If a user re-uploads the same asset ID with different bytes (e.g., re-encoding), the hash changes. If the system treats the *ID* as the source of truth for the *old* hash, it will reject valid new content. If it treats the *new* hash as truth, it breaks the "frozen provenance" for existing references.

- **Security:**
  - **SSRF via Taste Brain:** §2.1 says taste brain is "loopback-pinned". If the pinning is done via string match on `127.0.0.1` but not on the port or path, and the taste server is compromised or misconfigured, it could be used to scan internal ports. More critically, if the "loopback pin" is client-side only, a man-in-the-middle could redirect to a malicious server.
  - **Secret Handling:** §2.2 mentions `SWAN_ATELIER_MAX_SPEND_USD_DAILY`. If this is read from env vars at request time, it's fine. If it's cached in memory and not updated, it's a DoS vector (operator can't stop bleeding).

- **Data-truth / schema drift:**
  - **`projectId` Null Drift:** §2.2 says `projectId` is null. When a second site arrives, the `MediaAsset` table will have rows with `projectId: null`. Any query filtering by `projectId` will miss these assets. This is a "silent data loss" for the admin view.
  - **PascalCase vs snake_case:** The document uses `MediaAsset` (Pascal) and `media_asset` (implied snake). If the ORM doesn't strictly map these, and the frontend expects `assetId` while the backend returns `asset_id`, the UI will break.

## HIGHEST RISK
**The Consent Gate is a No-Op.**
The entire "commercial safety" value proposition relies on the `consentConfirmed` flag. Since nothing sets it, the system is either:
1. **Broken:** No one can publish (if the check is `if (!consentConfirmed) throw`).
2. **Unsafe:** Everyone can publish (if the check is `if (consentConfirmed && !grant) throw` and `consentConfirmed` is false, so the condition is false, allowing publish).

**Cheapest De-risk:**
Add a single line in `persistStills` or `composeStills` immediately after asset creation:
```javascript
if (lane === 'local' || model.isCommercialSafe) {
  asset.consentConfirmed = true;
  asset.consentSource = 'auto_local_safe';
}
```
And add a test case: "Local model asset must be publishable immediately."

## CONFIDENCE
I cannot verify the exact logic of the `publishAsset` refusal condition. The document says "publish refused by... unconfirmed consent flag", which implies `if (!consentConfirmed) throw`. If this is true, the studio is **unusable** for local models because the flag is never set. If the logic is `if (consentConfirmed && !grant) throw`, it is **unsafe**. I am 95% confident this is a P0 blocker because the document explicitly admits "nothing in the pipeline sets a flag yet".

I cannot verify the VRAM admission race condition. The document says "single-flight" and "live-VRAM admission". If the lock is acquired *before* the VRAM check, it's safe. If after, it's racy. I am 60% confident it's racy because "single-flight" usually implies a queue, but "admission reads live VRAM once" suggests a check-then-act pattern.

I cannot verify the IDOR risk without seeing the `publishAsset` code. I am 80% confident it's a risk because the document does not explicitly state `WHERE owner_id = :user` in the mutation path.
