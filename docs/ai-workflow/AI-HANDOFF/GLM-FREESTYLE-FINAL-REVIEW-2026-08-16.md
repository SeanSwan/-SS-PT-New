# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-FREESTYLE-FINAL-REVIEW-PACKET.md
**Tokens:** 7445 in / 15633 out (reasoning: 13053) | total 23078
**Wall:** 256.2s

---

# GLM-5.3 — hostile review, `useFreestyleSpeech` / `useFreestyleSession` / `CoachFreestyleOverlay`

## The on-device privacy reasoning is not sound. Attack first, as ordered.

Not re-reporting the disclosed Chrome fact. Reporting that the decision **built on** that fact is self-defeating in five ways:

1. **Wrong invariant.** The hook header guarantees "SwanStudios never transmits or stores the audio." That is a claim about *your hands*, not about *the audio*. The constraint is "ZERO PII to models." An API you invoke relaying PII-dense audio to a cloud recognizer is a model receiving PII with you as the invoking party. "Disclosure in the retention contract" documents a constraint violation; it does not cure one. Constraints are violated by facts, not footnotes.
2. **You steer users onto the leaking browser.** `FREESTYLE_SPEECH_UNSUPPORTED_COPY`: *"Use Chrome or Safari."* If on-device capture is the decision, Chrome is the browser you gate against, not the one your error copy recommends. This is the strongest single proof the reasoning is decorative.
3. **User-facing copy makes a promise the transport breaks.** `StatusLine`: *"nothing is saved yet"* / *"Nothing has been saved yet"* — asserted while the browser may stream audio off-device under the user's signed-in account. That is a false retention claim in your own UI.
4. **The blob argument is a strawman.** "No audio blob is created" — the blob was never the threat model. `useCoachCapture`'s defect was *transmission*. Answering "where's the blob?" answers a question nobody asked.
5. **Zero engineering of the property.** No browser gating, no capability detection, no local-first fallback (WASM/onnx recognizer class), no pre-session disclosure gate. The entire privacy posture is a comment block. A property that exists only in comments does not exist.

What survives: relative `atMs` timestamps and text-side tokenisation remain the correct tools for the *transcript*. One line, that's the quota.

---

## SECURITY — what I'd exploit to extract client data or leak a session

**S1 — Perpetual-listening loop on an unattended tablet.** `CoachFreestyleOverlay` auto-start effect (`if (isOpen && state === 'idle') start()`) + `useFreestyleSession` TTL effect (`clearBuffer('ttl')` → `state: 'idle'`). *What breaks:* at TTL the buffer purges to `idle`, the auto-start effect sees `idle` + `isOpen`, and the mic re-engages — a shared tablet left open listens forever in 24h cycles, each cycle legitimately "purged." *Conditions:* overlay mounted and open, user walked away. *Fix:* never auto-start from a purge-derived `idle`; auto-start at most once per `isOpen` transition (guard ref); stop the session when `isOpen` goes false (see S4).

**S2 — The `onStopped` snapshot escapes every purge trigger you named.** `handleStop` hands a frozen `FreestyleSnapshot` to the parent; `clearBuffer` purges the hook's array only. Discard/logout/switch/TTL/unmount — none of them touch the parent's copy, and S4 doesn't exist, so post-Done data is *guaranteed* to sit in parent memory with no TTL and no owner. *Exploit:* shared tablet, trainer A taps Done, account switches to B — the parent still holds A's frozen fragments full of client names. The F-3 "fix" (`Object.freeze` copies) changed immutability, not retention; the contract remains hollowed out, now with two arrays instead of one. *Fix:* hand the snapshot with an owner token + expiry registered on the same purge bus, or persist via S3 at stop and drop the in-memory reference entirely.

**S3 — `logout` is not a purge trigger.** `FreestylePurgeReason = 'discard' | 'account-switch' | 'ttl' | 'unmount'`. The constraint lists logout explicitly. It only fires if the parent happens to mutate `accountKey` on logout; receipts can't distinguish logout from switch. *Fix:* add `'logout'`, wire it explicitly, stop depending on a prop side effect to carry a contractual obligation.

**S4 — Hidden overlay, hot mic.** Nothing stops a `listening` session when `isOpen` goes false while the component stays mounted (`FreestyleOverlay $isOpen` is a styled-div visibility toggle, not an unmount). Session keeps `listening`, the engine-follow effect keeps the recognizer running, fragments keep appending — behind invisible UI. *Fix:* `if (!isOpen && session.isActive) pause()` in an effect.

**S5 — `LivePhrase` shoulder-surfs your client list.** `latestPhrase = speech.interim || last fragment` renders full spoken names — including names — on a gym floor, in large text, persisting in the DOM until the next phrase arrives. This directly contradicts the file's own doctrine line ("It shows counters, not a transcript"). *Fix:* cap to last 2–3 words or replace with a per-phrase pulse + word count.

**S6 — Audit receipts are false.** `reset()` (via `handleClose`, `handleDiscard`-adjacent paths, Escape-with-zero-fragments) calls `clearBuffer('discard')`. Every *completed* session that gets closed is receipted to `onPurge` as a discard. If receipts feed the retention audit, the audit is fiction. *Fix:* distinct `'completed'` reason threaded from `handleClose` after a successful stop.

**S7 — Modal that isn't.** `role="dialog" aria-modal="true"` with no focus trap, no initial focus, no restore — keyboard users tab into background content mid-session. Also `aria-label="Keep the session"` vs visible "Keep it" fails WCAG 2.5.3 Label-in-Name. *Fix:* trap + restore focus; accessible name must contain the visible string.

---

## RELIABILITY — what kills a real 10-minute gym-floor session

**R1 — In-flight phrase destroyed at every engine cycle.** `rec.onend` does `setInterim('')` and discards the pending interim *before* restarting. Safari finalises trailing interims late or never; the restart problem you document guarantees frequent cycles; each cycle can silently drop the tail of a sentence. Ten minutes × per-phrase cycling = cumulative word loss in exactly the long sessions this feature exists for. *Fix:* flush last non-empty interim through `onPhraseRef.current` before restart.

**R2 — Restart storm with no backoff.** `onerror` deliberately ignores everything except `not-allowed`/`service-not-allowed`; `onend` then immediately restarts. A gym dead zone (`'network'` — note the Chrome recognizer *needs* network, so the "on-device" path dies exactly when connectivity does) or `'audio-capture'` produces a hot start/abort loop: battery burn, no error surfaced, fragments stop. *Fix:* exponential backoff, consecutive-failure cap, then a surfaced error state.

**R3 — `startEngine`'s catch is a lie.** `rec.start()` throwing (iOS screen lock, no user activation, `InvalidStateError`) lands in `catch { setListening(true) }` — "treat as already-live." The UI then says *"Listening. Talk as long as you need"* over a dead engine for the full session. *Fix:* on catch, treat as dead until an `onresult`/`onend` event proves otherwise; surface an error otherwise.

**R4 — Auto-start violates iOS gesture requirements.** The open-triggered effect calls `start()` outside user activation; iOS Safari requires activation for `SpeechRecognition.start()` — the platform your own header names as most aggressive fails on entry, then R3 masks it. *Fix:* on gesture-gated platforms the explicit "Start talking" tap is the only entry point.

**R5 — Permission denial never reaches the session.** `rec.onerror` (`not-allowed`) clears `wantListeningRef` and sets copy, but `session.state` stays `'listening'`: clock climbs, `isQuiet` announces *"Still listening. Nothing heard for 47s"* — a lie concatenated to the denial copy — and the user talks into a dead mic. `resume()` later silently re-fails. Worse: `FREESTYLE_SPEECH_DENIED_COPY` says *"type your notes instead"* and the overlay offers no typing path — a dead end. *Fix:* `onDenied` callback driving session to `error`/`paused`; add the promised text fallback. Related: `setError` in `useFreestyleSession` is never called; `'error'` and `'discarded'` are unreachable states; `StatusLine` has no branch for them — the "copy table has no gaps (amendment A3)" claim is false.

**R6 — The liveness signal was built and then not wired.** `restarts` is returned by the hook and never read by the overlay. The whole justification in the header ("reports `restarts` so the surface can prove it is alive") is dead code. Meanwhile `isQuiet` conflates user silence with engine death. *Fix:* render a "reconnected ×N" chip; if restarts exceed a rate or no engine events arrive, hard-fail with an error.

**R7 — The TTL "not a timer" comment is false; it is a timer.** `setInterval(..., 1000)` is throttled/suspended in background tabs and sleeps. On a dozed device the purge fires arbitrarily late — effective retention exceeds the 24h ceiling the contract states as `<=`. *Fix:* recheck on `visibilitychange`/focus, not only on tick.

**R8 — Stale-closure snapshot micro-loss.** `handleStop` reads `fragments` from the render closure; a final emitted between last render and the tap is excluded from the snapshot and then dropped because `appendFragment` refuses non-`listening` states. *Fix:* assemble the snapshot from a ref-maintained list inside `stop()`.

**R9 — Duplicate finals after restart.** Chrome can re-deliver the last final with `resultIndex` reset after a restart; `appendFragment` has no dedupe. *Fix:* hash-dedupe consecutive identical fragments.

---

## ENHANCEMENTS — materially useful one-handed mid-session

**E1 — Wake Lock while `listening`.** Screen lock is the single biggest iOS session-killer; `navigator.wakeLock` is one effect. Its absence makes R3/R4 materially more likely.

**E2 — Haptic per final fragment** (`navigator.vibrate(10)`) or a soft earcon. Counters require looking at the screen; a trainer mid-set needs ears/hands-free confirmation Coach heard the phrase.

**E3 — Tap-the-stage pause/resume.** Full-width thumb target instead of precise `ControlButton` taps; also resolves the unverifiable-here 44px question for the primary gesture by making it enormous.

**E4 — 9:30 wrap-up cue.** Doctrine caps freestyle at ten minutes; nothing in the UI acknowledges the ceiling. A soft warning prevents overrun and forced rushed stops.

**E5 — Engine-health chip** from the already-computed `restarts` (see R6) — doubles as the dead-engine detector this surface lacks.

**E6 — Inline text input on denial/unsupported.** Your own copy promises it; ship it.

**E7 — Unverifiable, flagged not assumed:** `CoachFreestyleOverlay.styles` was not provided — `prefers-reduced-motion` on `BreathOrb`, the Dual-Button Glow mapping on `$variant`, contrast ratios, and 44px targets cannot be confirmed from this review. Absence of evidence in the diff is not compliance.

---

Right, one line: the `resultIndex`-based dedupe in `onresult` and the ref-mirrored transition guards in `useFreestyleSession` are correct. Everything above stands.
