# G06 tests evidence — 2026-09-11

Runner: Windows Node v24.19.0 (vitest via frontend/), WSL Node v22.23.2 (tsc).

## RED (before implementation) — assertion failures only, no setup errors
Command: `cd frontend && npx vitest run <3 new G06 test files>`
Result: 10 failed | 3 passed (13) — exit 1.
Key observed failures (all AssertionError):
- uniqueFinals: engine echo duplicated segment ('program push day program push day'); batch
  concat produced 'bench pressbench pressthree sets'; restart re-emitted 'log squats log squats'.
- VoiceRecordingOverlay.background: recorder.stop called 0 times on hidden (expected 1).
- VoiceLifecycle page: stopListening/tts stop never fired on background/logout/unmount/barge-in.

## GREEN (after implementation + hostile-review repairs)
Command: `cd frontend && npx vitest run src/components/DashBoard/Pages/coach-assistant/{hooks/useCoachBrowserSpeechInput.uniqueFinals.test.tsx,VoiceRecordingOverlay.background.test.tsx,CoachCommandCenterVoiceLifecycle.test.tsx,hooks/useCoachBrowserSpeechInput.contract.test.tsx,hooks/useCoachBrowserSpeechInput.runtime.test.tsx,CoachCommandCenterVoice.test.tsx,CoachVoiceLevelMeter.test.tsx}`
Result: 7 files passed, 35/35 tests, exit 0.

## Scoped regression (whole coach-assistant directory)
Result: 174 files passed / 4 failed (964 tests passed / 4 failed), exit 1.
The 4 failures were verified PRE-EXISTING on HEAD by stashing the entire G06 diff
(git stash -u) and re-running: identical 4 failures without any G06 change.
Failing files (pre-existing baseline, rule 56 disclosure):
- CoachActionProposalSplitPlanPanel.identity.test.ts
- CoachCommandCenter.sectionSplit.test.ts
- CoachCommandCenterNotebook.test.tsx
- CoachCommandCenterPage.context.test.tsx

## Baseline repairs required to make the regression set runnable (out-of-scope, disclosed)
- CoachCommandCenterVoice.test.tsx: render now wraps CoachSessionDraftProvider
  (page tree has required it since 0c96142f2; test predated the provider and threw
  on mount — broken on HEAD) + speechMock gained the stopListening member the real
  hook contract always had.

## Type check
Command (WSL): `node --max-old-space-size=10240 ./node_modules/typescript/bin/tsc --noEmit`
Result: exit 0, zero errors. (Default 4GB heap OOMs on this repo size — heap raise is
an environment requirement, not a code fix; Windows Node 24 OOMs at any tested heap.)

## Build
Command: `cd frontend && npx vite build`
Result: exit 0 (built in ~16s).
