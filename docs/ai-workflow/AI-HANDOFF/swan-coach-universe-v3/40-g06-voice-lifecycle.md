# G06 — Foreground speech lifecycle (S7)

Artifact `SCU-G06-40`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G06/S7 row + [32](32-gwen-domain-and-verification-contract.md) T30–T32.
Builder: session agent (subscription). Reviews: deferred-to-final per Sean's 2026-09-11
instruction — per-slice hostile review runs until clean, final combined Astra review still owns release.

## Scope

Compose the three existing voice lanes — browser dictation
(`useCoachBrowserSpeechInput`), recorder/transcription fallback
(`useVoiceRecorder` + `VoiceRecordingOverlay`), and TTS output
(`usePremiumTTS`) — into one foreground lifecycle.

1. **T30 — unique final segments, no interim auto-submit.** Consecutive
   duplicate final segments (speaker echo / engine restart re-emission) land in
   the composer exactly once; interim text is display-only and can never append
   to or submit the draft.
2. **T31 — stop tracks/output on background/logout/switch.** Tab hidden
   (`visibilitychange`/`pagehide`), logout (authenticated → false), or surface
   teardown stops TTS output AND mic tracks AND dictation. An in-flight chat
   write is NOT aborted or cancelled by any voice stop; audio stop is
   structurally separate from action cancel.
3. **T32 — reconnect after action submission.** Resuming capture after a
   submission is a fresh session (dedupe cursor reset); resumption can never
   replay the submitted tool call — sends happen only on explicit Send.

## Design

- New `hooks/useCoachVoiceLifecycle.ts`: owns global stop triggers
  (background/logout/unmount), exposes `stopAll(reason)` + `bargeIn()`
  (output-only stop when capture starts). Wired inside
  `CoachCommandCenter.voiceCapture.ts` so the controller only passes
  `speechOutputStop: tts.stop` (controller is at the 300-line cap).
- `useCoachBrowserSpeechInput`: exported pure `appendUniqueFinal` +
  session-scoped `lastFinalRef` dedupe; reset on arm AND on stop (fresh
  session on resume).
- `useVoiceRecorder`: unmount effect stops tracks/timer/audio context (leak
  fix — cleanup previously only ran on onstop/reset).
- `VoiceRecordingOverlay`: while capture is track-active (requesting/recording),
  background hard-stops tracks and tears the overlay down WITHOUT transcribing
  (nothing auto-sends). Preview/transcribing states are left alone — no active
  tracks, reviewed draft survives.

## Out of scope

Server transport reconnect semantics (G03 requestKey dedupe already owns
server-side identity); new voice UI; FoodTracker/dictation lanes outside the
coach assistant; TTS voice selection.

## Verification

Scoped vitest on the four new test files + existing voice regression set
(`CoachCommandCenterVoice`, `useCoachBrowserSpeechInput.contract/runtime`,
`CoachVoiceLevelMeter`), `tsc --noEmit`, `vite build`. RED observed before
implementation on: duplicate-final duplication, background stop absence,
overlay track leak. Receipts: `tmp/coach-g06-20260911/`.
