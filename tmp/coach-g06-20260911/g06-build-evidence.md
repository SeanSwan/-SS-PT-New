# G06 build evidence — 2026-09-11

Builder: session agent (subscription seat; Luna-style build, Astra deferred to final gate per Sean 2026-09-11).

## Changes
1. NEW hooks/useCoachVoiceLifecycle.ts — one foreground lifecycle: background
   (visibilitychange hidden / pagehide), logout (authenticated flip), and surface
   teardown stop BOTH speech output and capture; bargeIn() = output-only stop.
   No reference to the action lane: voice stop can never cancel/abort a write.
2. hooks/useCoachBrowserSpeechInput.ts — session-scoped echo dedupe
   (appendUniqueFinal, last-two-finals window) across events AND engine restarts;
   cursor reset on arm and on stop (T32 fresh resume); interim remains display-only;
   runtimeFailureFor compacted to a lookup (300-line cap).
3. hooks/useVoiceRecorder.ts — abort() hard teardown (detaches onstop/ondataavailable
   so no empty blob reaches transcription), cancelledRef closing the getUserMedia
   race (abort/reset during permission prompt), unmount track/timer/ctx cleanup
   (previously leaked on route switch mid-recording).
4. CoachCommandCenter.voiceCapture.ts — composes the lifecycle (stopCapture =
   dictation stop + overlay close), barge-in on capture start, authenticated from useAuth.
5. CoachCommandCenter.controller.ts — passes speechOutputStop: tts.stop (same line,
   file stays 299/300).
6. VoiceRecordingOverlay.tsx — while tracks are live (requesting/recording),
   background aborts capture + resets transcription + requests close WITHOUT
   transcribing; preview state (no live tracks) survives backgrounding.

## Hostile review (slice-internal, pre-receipt) — findings fixed in-slice
- F1 multi-final restart duplication: single-final cursor missed adjacent [A,B]
  re-emission → widened to last-two-finals window + regression test.
- F2 getUserMedia race: abort/reset during 'requesting' let a late resolve start an
  invisible recording → cancelledRef guard in start(); reset() also cancels.
  (Race verified by code-path review, not automated test — getUserMedia promise
  control was out of the mock harness's reach; disclosed honestly.)
- F3 300-line cap breach after edits (305) → lookup-table compaction, 300 exactly.
- F4 overlay test over-asserted DOM unmount (parent-owned move) → corrected to
  onClose contract.

## Known limitations (disclosed)
- Client-side SwanCoachAssistantPage TTS keeps playing if the tab is hidden mid-
  playback on that lane (its recorder overlay IS covered via the shared overlay
  fix). Deferred as a follow-up finding for the final combined review; not in the
  registered G06 file scope.
- The 4 pre-existing coach-assistant baseline failures are unrelated to voice and
  remain open (verified against HEAD).

## Cap check
All scoped source files ≤300 lines (speech hook exactly 300; controller 299).
