# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\reuse-review.md
**Tokens (Ollama):** 2753 in / 1648 out | **Wall:** 27.7s | **done_reason:** stop

---
## VERDICT
REVISE — The security property is sound, but the adoption lifecycle contains a critical race condition where a failed batch generation leaves the user with a stale, unbound "Motion" button that will fail with a cryptic server error.

## BLOCKERS
1. **P0: Stale Bind Target on Batch Failure.**
   - **Scenario:** User arrives at Compose with an adopted frame (`adopted` is set). User triggers a new batch generation. The generation fails (network error, API limit, etc.), so `c.result` remains `null` (or undefined).
   - **Failure:** The effect `useEffect(() => { if (c.result) setAdopted(null); }, [c.result]);` does **not** clear `adopted` because `c.result` is falsy. `bindTarget` remains `adopted`. The UI displays the "Approve → Motion" button (assuming `motionBindable` returns true for the adopted frame). When the user clicks it, the client sends the `sha256` of the *adopted* frame, but the context implies the user expects to animate the *failed batch* or is confused by the UI state. More critically, if the user *did* see a partial result or if the UI state is ambiguous, they may click bind. If the server-side state has moved on or if the user intended to bind a *new* frame that didn't render, the bind succeeds for the *old* frame. This is a "quiet lie" violation: the UI implies the current context is the target, but the bind targets the previous context.
   - **Evidence:** `Compose adoption + bind target` section: `useEffect(() => { if (c.result) setAdopted(null); }, [c.result]);` only clears on truthy `c.result`. It does not clear on `c.error` or `c.loading === false && !c.result`.

2. **P1: `reusable()` does not verify `kind === 'image'` against the server's `kind` field, only the client's prop.**
   - **Scenario:** The `assetView` returns `kind: row.kind`. If `row.kind` is `'video'` but the client-side `reusable()` check is bypassed or if the `onUse` handler is called programmatically (e.g., via a keyboard shortcut or external event) without the UI guard, the `MotionTarget` is passed to the bind.
   - **Failure:** The server gate `motionBind.mjs` checks `sha256` format and match, but does **not** explicitly check `kind === 'image'` in the provided snippet. If the server allows binding a video asset (which has a valid sha256), it will attempt to animate a video, which is likely unsupported or causes a crash in the motion engine. The client guard is the only line of defense.
   - **Evidence:** `reusable()` checks `a.kind !== 'image'`. The server snippet `motionBind.mjs` only checks `sha256` regex and match. No `kind` check in server snippet.

## ATTACKS
- **Correctness:**
  - **Race Condition:** The `adopted` state is not cleared when a batch generation *fails*. The effect only clears on `c.result` (truthy). If `c.result` is `null` after a failed attempt, `adopted` persists. `bindTarget` remains `adopted`. The user sees the "Use in Compose" button (or equivalent) and may click it, binding the *old* frame instead of the intended new one (or realizing the new one failed). This is a state desync.
  - **Stale State:** If the user leaves the tab and comes back, `adopted` is preserved (as intended). But if a batch was *in progress* when they left, and they return after it *failed*, `adopted` is still set. The UI should reflect the failure, but `bindTarget` still points to the adopted frame.

- **Security:**
  - **IDOR/Scope Leak:** The `assetView` is owner-scoped (`ownerUserId: req.userId`). The `sha256` is the hash of the *caller's own* asset. This is safe. The server compares the provided `sha256` to the recorded one. If the caller provides a hash for a *different* asset they own, the server will reject it because it looks up the asset by `assetId` and compares the hash of *that* asset. So, no cross-asset hash reuse is possible.
  - **Injection:** None. The `sha256` is validated by regex `/^[0-9a-f]{64}$/`.
  - **SSRF:** None.
  - **Secret Handling:** `r2Key` and `posterR2Key` are withheld. `previewUrl` is a short-lived signed URL. This is acceptable.

- **Data-truth / schema drift:**
  - **Field Drift:** `assetView` returns `sha256`. `reusable()` expects `sha256`. `MotionTarget` expects `sha256`. Consistent.
  - **Type Mismatch:** `seed` is converted to `Number` in `assetView`. If `tag('seed')` is not a valid number, `Number()` returns `NaN`. The client does not check for `NaN`. If `seed` is used in a calculation, it may fail. However, `seed` is not part of the `MotionTarget` or `reusable()` check. It is only for display. Low risk.

## HIGHEST RISK
The **P0 Stale Bind Target on Batch Failure**. The user arrives with an adopted frame, triggers a new batch, the batch fails, and the UI still offers to bind the *old* adopted frame. This is a direct violation of the "quiet lie" principle and will cause user confusion and potential incorrect bindings.

**Cheapest de-risk:** Modify the `useEffect` that clears `adopted` to also clear it when `c.error` is truthy or when `c.loading` becomes `false` and `c.result` is `null`. Specifically:
```tsx
useEffect(() => {
  if (c.result || c.error) setAdopted(null);
}, [c.result, c.error]);
```
This ensures that any batch attempt (success or failure) retires the adopted frame, forcing the user to explicitly re-adopt if they want to fall back.

## CONFIDENCE
- **Verified:** The security property of publishing `sha256` and requiring it in the bind is sound. It prevents the server from self-comparing and maintains the adversarial check.
- **Unverified:** The server-side `motionBind.mjs` does not show a `kind` check. I assume the server *should* check `kind === 'image'` but the snippet does not show it. If the server does not check `kind`, then the client-side `reusable()` is the only guard, which is a P1 risk.
- **Unverified:** The behavior of `motionBindable(bindTarget)` when `bindTarget` is `adopted` but the batch has failed. I assume it returns `true` if `adopted` is valid, which leads to the P0 blocker.
- **Gap:** I cannot see the `c` object structure (e.g., `c.error`, `c.loading`). I assume `c.result` is the only state that clears `adopted`. If `c` has an `error` field, the current code does not use it to clear `adopted`.
