# Hostile review — Round 2: the mic work in `hermes-agent` as it stands

You are a hostile code reviewer. Two things are true and you must hold both:

1. **The capture chain is now proven to work when the audio stack is healthy.** Sean spoke; the
   raw mic tap transcribed as "Hello, this is Simon Swann and right here for a special world where
   we can go ahead and" and Hermes' own MediaRecorder bytes transcribed as "Hello, this is Slon Slon
   and we're here for a special world where we can go ahead." Same sentence, both taps, one session.
   The failure is therefore NOT "Chromium can't record" — it is the WSLg audio stack (PulseAudio
   RDP source) dying intermittently, and three distinct error states of that death.
2. **The work under review below was written before that proof, on weaker evidence.** Round-1 hostile
   review (appended at the end) already demolished the main evidentiary pillar of `resolveAudioConstraints`.
   Your job is NOT to re-litigate the debugging history. Your job is to review **the code as it stands now**
   and hand back a fix plan detailed enough that an engineer can execute it mechanically.

## The work under review (verbatim diff, 8 files)

Repo: a private Electron + Python desktop app. Branch has 8 modified files, all uncommitted.
The complete diff is embedded below between the DIFF markers. Do not re-derive it; review it.

@@DIFF@@

## The three user-facing symptoms this work touches

1. `Local transcription failed: [Errno 541478725] End of file: '/tmp/hermes-desktop-voice-*.webm'`
   — 541478725 is FFmpeg AVERROR_EOF; PyAV found zero audio frames in a header-only webm.
2. `No speech detected — try recording again` — valid recording, empty transcript, filtered.
3. `No microphone found` — `getUserMedia` threw `NotFoundError` (zero enumerable inputs).

## Established facts (do not challenge without better evidence)

- WSLg's audio arrives via a PulseAudio shim: source `RDPSource` (s16le 1ch 44.1kHz), sink `RDPSink`.
- `parec -d RDPSource` on a healthy stack captures real audio (rms 488-722 int16, peaks 2346-3283).
- The WSLg stack does NOT exist until a GUI app has booted; it also dies intermittently
  (pactl unresponsive, RDPSource vanishing from the device list). Each dead-state maps to one
  of the three symptoms above. This is the leading root cause and it is OUTSIDE this repo.
- Whisper (faster-whisper base, VAD on, en) round-trips TTS audio exactly and read Sean's real
  speech off both taps. `small` was tested and is worse AND 5x slower on this recording — withdrawn.
- 74 renderer tests pass; tsc exit 0; eslint exit 0 (as of the build before this review).
- `package-lock.json` has one benign line-churn; not part of the logic review.

## What I specifically want from you — a mechanical fix plan

For EACH of the 8 files, give a verdict: **KEEP / FIX / REVERT**, then:

- **FIX** → exact code, ready to paste. You are the design authority; I will apply your code
  verbatim. Specify the final code for the changed regions, not a description of an approach.
- **REVERT** → say precisely what the final state should be (usually: restore the original call
  shape). If reverting, identify which tests in the diff go with it and whether any test in the diff
  is valuable independent of the code it was written for.
- **KEEP** → one sentence of justification plus any single hardening you insist on (optional).

Then, in order:

1. **The `resolveAudioConstraints` question, settled.** It was built on a 1-run-vs-4-runs ambient
   table that Round-1 demolished, and the speech test shows the default path works. But it may still
   have value if framed correctly (defensive, logged, never breaking). Give me the final code for
   `use-mic-recorder.ts` in your preferred end state — either fully reverted or a specific improved
   form. Pick one. Do not leave it to my judgment.
2. **Error classification in `transcription_tools.py`.** Is the EOF→no_speech mapping correct and
   complete? Any decode error class that should join it? Any that must NOT be swallowed? Exact final
   code for the changed region if you change it.
3. **The pre-transcribe size guard** (`size >= 512`). What is the right threshold for webm/opus
   header-only detection and why? Keep it here, move it, or replace it — give the exact final code
   for `index.ts` and `use-mic-recorder.ts` as you want them.
4. **The guard test** `rejects empty or header-only audio before it reaches the decoder`. Does it
   actually prove the behavior? Name the exact assertion you would add or rewrite, or confirm it stands.
5. **Anything in the diff that is wrong, unsafe, or dead** that I did not ask about. No compliments
   requested; findings only.
6. **Your single most important objection** to shipping this set as-is, stated in one sentence.

Rules: attribute nothing to other models; if you quote the Round-1 review, mark it as such. Where
your verdict contradicts Round-1, say why the new evidence changes it. Code you write must be
complete and syntactically valid TypeScript / Python as the case may be.

## APPENDIX — Round-1 hostile review (context; GLM 5.3 flash, 2026-08-26)

This review predates the speech test. It correctly identified the weak pillar of
`resolveAudioConstraints`. Its "cheapest decisive experiment" was subsequently run (the speech
test); its findings below are context, not a task.

@@ROUND1@@
