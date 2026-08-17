# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round18-packet.md
**Tokens:** 32173 in / 20070 out (reasoning: 18986) | total 52243
**Wall:** 386.1s

---

# HOSTILE REVIEW ROUND 18 — RESULT

I attacked the round-17 change first, then swept everything else. No finding survived.

## The round-17 attack (normalized owner-key layout effect)

**Divergence check.** The overlay's `normalizedAccountKey` (overlay:156) and the session's `ownerKey` (session:156) are the identical expression — `null` preserved, otherwise `String()`. Both initial-value refs are seeded from the same normalized value, so the overlay's kill-on-change and the session's purge-on-change fire on exactly the same prop transitions. No path exists where the session purges but the engine lives, or the engine dies but the session holds.

**Type-only change (42 → "42").** Both normalized comparisons read equal: no layout kill, no purge, no mask, `owned` stays true. The follow effect's deps (`isOpen`, `state`, `speech.error`, stable `speechStart`/`speechStop`) don't move, so the engine is left untouched mid-flight rather than restarted. The owner law holds end-to-end.

**Real switch ("42" → "43").** Layout kill fires pre-paint (overlay:158-162); `speechStop`'s flush is gated on `wantListening` — already false only if something else killed it first; if still live, the flush calls `onPhrase` → `appendFragment`, which refuses on the ref-compare (session:444). Fail-closed, no mis-owned words. The passive purge effect then receipts with the true reason; the render-time mask (session:552-560) keeps the paintable frame clean; `reset('completed')` via Cancel is refused by `ownedNow` (round-9 law intact). `prevAccountRef` and `ownerRef` cannot desynchronize — both mutate only inside their guarded effects on the same normalized value.

**Residual-error interplay.** `speech.error` surviving an account switch was the one non-obvious blast-radius candidate: trainer B starting under trainer A's stale denial string re-enters capture, changes `state`, and the bridge effect (keyed on `state` **and** the error string, round-3 fix) re-fires `fail()`. `startEngine` success clears the error inside the gesture. No dead "listening" state is reachable.

## Sweep of everything else

- **useVoiceRecorder** — flight/generation lattice traced through every interleaving I could construct: stale grant with cleared latch, stale rejection during a newer request, stop→start→double-grant, queued-final-events after reset (handlers detached in `cleanup` before ref drop), sync track-stop in `stop()` with the late `onstop` blob still landing, unmount ordering versus `useCoachCapture`'s cleanup (primitive's own passive cleanup registers first, runs first — the floor holds). No hole.
- **useCoachCapture** — the `stopRequestedRef`-gated mirror effect cannot resurrect `isCapturingRef` on any sequence I ran (stop-during-requesting → restart; auto-hidden during the permission window; failed start unstranding the flag). Blob-keyed in-flight guard correctly rejects cross-capture inheritance; `reset` deliberately preserves the latch.
- **useFreestyleSession** — ownership mask verified against every mutator including the two that use ref-compares instead of `ownedNow`; TTL enforced synchronously on `stop`/`resume`/`appendFragment` and by sweep + wake listeners; pause accounting (settle/shift) checked for double-count and negative spans; receipt truthfulness (`hadData` gate, logout vs account-switch, disarm-on-purge) holds; passive-effect ordering between the switch purge and the TTL sweep cannot double-receipt.
- **useFreestyleSpeech** — restart pacing capped at 15s with health reset; fatal-error set (`not-allowed`, `service-not-allowed`, `audio-capture`) flushes before clearing the want-flag and cannot hot-loop; teardown-before-abart prevents the zombie `onend` restart; backoff timer cleared on every stop path including unmount.
- **CoachFreestyleOverlay** — every exit (Done, Pause, Cancel, discard-arm, parent close, unmount, account switch, tab hide, pagehide) reaches a synchronous engine release while the session can still accept the flush; gesture starters gate the engine on the session's actual transition boolean and carry their own `isOpen` guard; Escape routing and the focus lifecycle (opener restore, confirm focus, disarm restore, closed-overlay skip) are consistent; masked values drive all rendered truth.
- **styles** — the color-mix fallback cascade, visibility-based keyboard unfocusability, live-region stability, and reduced-motion handling all match their documented claims.

Non-findings I declined to manufacture: `start`'s unused `clearBuffer` dep (lint noise), the unreachable `'discarded'` copy branch (type-complete by amendment A3, hook deliberately settles idle), empty-blob `'ready'` status (consumer surface outside this packet), post-completion re-transcribe (consumer-gated, S3-adjacent — fenced).

---

**FINDINGS: 0**
