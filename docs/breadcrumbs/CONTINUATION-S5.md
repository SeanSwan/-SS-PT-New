# S5 blocked dependency — dead voice-code deletion

DONE: Read-only cut-list and import inventory completed. `DictationOrb.tsx` has zero runtime importers; `useWorkoutLoggerDictation` and `LoggerDictationStrip` are active in `WorkoutLogger.tsx` after S3.
BLOCKER: S5 requires deleting R3, but it is explicitly superseded by Finisher-only S6 `useVoiceCapture`, which is not landed. Deleting it now removes the sole active logger mic and violates the no-half-cutover rule.
NEXT AFTER S6: delete `DictationOrb.tsx` and its deleted-only tests; replace/remove logger-local dictation and strip; remove Coach drawer auto-send voice pill and Command Center duplicate; prove zero deleted-symbol grep hits and run logger/drawer/planner suites.
NO CHANGES: no S5 production code was changed. Do not force-delete R3 before S6 supplies the replacement.
