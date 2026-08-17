# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round13-packet.md
**Tokens:** 31192 in / 15374 out (reasoning: 14108) | total 46566
**Wall:** 241.3s

---

# HOSTILE REVIEW ROUND 13 — Swan Coach freestyle capture layer

## Attacks on the fresh surface (supersede-safely `start()`), and why each held

**Attack 1 — supersede before cleanup ordering.** Verified the fix does what round 12 claimed: `useVoiceRecorder.ts:150` runs `cleanup()` before `setRecState('requesting')` (156) and before `getUserMedia` (158). Detach-then-stop is synchronous; no window exists where the new flight's refs share a world with the old recorder's attached handlers. Held.

**Attack 2 — three-flight generation arithmetic.** start(A) → start(B supersedes) → stop() → start(C): A's grant lands with `flight !== flightSeqRef` (159) → tracks released, state untouched (A's `flight === flightSeq` is false, so the 166 settlement correctly stays silent for B/C's state). B superseded by C mid-await: same path. Rejection of a stale flight hits the catch guard at 203 and is swallowed without clobbering the current flight. No interleaving of `cancelRequestedRef` × `flightSeqRef` I could construct lets a superseded or cancelled grant build a recorder or touch state. Held.

**Attack 3 — supersede of a recorder whose `stop()` was already called (queued final events).** stop() (212–224) calls `recorder.stop()` and stops tracks but leaves both refs non-null until onstop→cleanup. A start() landing in that window hits the 150 condition → handlers detached → queued dataavailable/stop fire into null. The abandoned blob is fenced design; no state or ref leak. Held.

**Attack 4 — supersede of a *live* recorder without `recorder.stop()`.** cleanup() (117–134) stops tracks but never calls `.stop()` on the recorder. Track-ended finalization fires into detached handlers; the object is unreferenced and collectable; no mic, no blob resurrection, no timer (113–116). Held.

**Attack 5 — post-stop double-`stop()` poisoning the latch.** A second stop() after recorder went inactive takes the else branch (225–236): sets `cancelRequestedRef = true`, bumps `flightSeq`, and — because state is 'recording'/'stopped', not 'requesting' — settles no state. The latch and bump are both consumed/cleared by the next start (152, 138); the queued onstop still lands the blob and 'stopped'. No downstream consumer reads either ref in a way that misbehaves. Held.

**Attack 6 — `stateRef` render-mirror clobber (105).** The hazard requires an intermediate render between a synchronous `setRecState` write and its commit, fed by a different setState. Every sync write here is co-batched in the same task (onstop's setAudioBlob+setState; stop()'s single setState; start's reset block), and no transitions/concurrent renders exist on this surface. Not reachable. Held.

**Attack 7 — supersede reachable through `useCoachCapture`.** The wrapper's `isCapturingRef` guard (204) blocks double-start while requesting/recording, and every path that leaves recorder refs populated (onstop/onerror/reset/unmount cleanup) nulls them before the wrapper can legally re-enter start. The supersede branch is exercised only by direct primitive consumers, where attacks 1–4 cleared it. Held.

## Attacks elsewhere (twelve-round sweep)

- **Blob MIME fallback** (`useVoiceRecorder.ts:50,181`): `''` → default container typed `audio/webm` requires an iOS build with MediaRecorder but without `isTypeSupported('audio/mp4')` — no such shipping configuration identified; iPadOS-as-Mac userAgent (48) still resolves to `audio/mp4` via the desktop list. Fails the concrete-reachable bar; not reported as a finding.
- **iPadOS 13+ userAgent masking** (48): outcome-identical per above. Held.
- **`useCoachCapture` late transcription resolution after `reset()`** (220, 276–278): the in-flight ref is cleared, but whether the transcription hook suppresses late state writes post-`reset()` is inside `useGeminiTranscription`, not in evidence. Unfalsifiable from the packet; the unabortable-upload half is fenced. Not reported.
- **Unmount cleanup ordering** (recorder 257–261 vs wrapper 196–201): both orderings safe — wrapper-first gets a real stop(); recorder-first gets the else-branch no-op. Held.
- **Freestyle engine lifecycle**: backoff timer vs stop/unmount (`useFreestyleSpeech.ts:181–193, 274–277`), commit-bounded engine release after handleStop (overlay 176–186), fatal-error flush ordering (245–251), account-switch layout-effect flush refusal (overlay 152–156 → session 435). All interleavings hold.
- **Session machine**: TTL sweep vs stop()-synchronous expiry (314–329, 335), pause accounting (291–303), masked-view mutator coverage (`ownedNow` on every mutator), receipt truthfulness (clearBuffer 248–257). Held.
- **Overlay**: Escape semantics per state (299–309), focus disarm/restore guards (328–346), hidden-overlay engine gate (176–186 + gesture guards 256–271). Held.

## Count

**0 findings.**

Round 13 is an honest zero from this reviewer: the round-12 supersede fix withstands direct attack on ordering, generation arithmetic, and every stop/restart interleaving I can construct, and nothing twelve rounds missed surfaced above the concrete-reachable bar. Per the remit, a zero round requires both reviewers empty — GLM's side is clean; the loop now turns on whether Codex can land the first consecutive pair.
