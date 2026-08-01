# S5 — dead voice code deleted (scoped by the S10 kill-switch ruling)

DELETED: components/AIAssistant/DictationOrb.tsx (500 LOC, zero runtime importers —
verified by repo grep). tsc 0, AIAssistant suite 9/9.
NOT DELETED (with reasons, per docs/breadcrumbs/S10.md ruling):
- useWorkoutLoggerDictation + LoggerDictationStrip (R3): they ARE the §6.6
  VOICE_MODE_V2=OFF kill-switch path; deletable only after Sean's device gate flips.
- Coach drawer auto-send pill (E3): already deleted by the SESSION SHELL rebuild.
- CoachCommandCenter.voiceCapture (R7): actively imported by the coach-assistant
  controller; cutover of that page to JarvisVoiceMode is a flag-flip cleanup item.
Net: the ≥800-LOC target is met across E3 (removed earlier) + R2 (now); R3/R7 are
scheduled deletions, not silent keeps.
