import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');

describe('WorkoutLogger shell extraction', () => {
  it('keeps local data contracts and pure helpers outside the component shell', () => {
    expect(source).toContain("from './WorkoutLogger.localTypes'");
    expect(source).toContain("from './WorkoutLogger.helpers'");
    expect(source).not.toMatch(/interface\s+PlannedExercise/);
    expect(source).not.toMatch(/const\s+coerceToNumericId\s*=/);
    expect(source).not.toMatch(/const\s+normalizeWorkoutDate\s*=/);
  });

  it('keeps the active logger shell moving toward the 300-line project cap', () => {
    // 2026-06-18: ratchet nudged 1260 → 1270 when five operator-requested UX
    // features landed (Active Plan Context strip, Repeat Last Session, NASM
    // "N recommended" hint, Quick Log discoverability + persistence, sticky
    // Save bar). Net shell growth was held to +26 lines by extracting THREE
    // helpers out of the shell in the same slice: WorkoutLogger.preferences.ts,
    // repeatLastSessionIntoLogger (in WorkoutLogger.repeatLastSession.ts), and
    // WorkoutLoggerModeBar.tsx.
    // 2026-07-13 (Slice D1): ratchet tightened 1270 → 1110 — the AI-events
    // cluster (plan-transfer listener, AI_* command bridge, voice import,
    // pending-plan drain, ~170 lines) moved verbatim to useWorkoutAiEvents.ts;
    // the source-text locks in protocolSections/clientRoute/writerDefaults now
    // read logger + hook as one contract surface.
    // 2026-07-13 (Slice D2): ratchet tightened 1110 → 970 — the submit
    // cluster (guarded save, AI_SUBMIT_WORKOUT bridge, summary generation,
    // ~165 lines) moved verbatim to useWorkoutSubmit.ts; submit-result
    // state stays in the component (useWorkoutDraft + the success panel
    // read it).
    // 2026-07-14 (Slice D3): ratchet tightened 970 → 875 — the plan-load
    // cluster (client-info fetch, today's-plan auto-load, generated-day
    // apply, repeat-last, ~115 lines + six owned states) moved verbatim to
    // useWorkoutPlanLoading.ts. The decomposition arc's hook trilogy is
    // complete (AI events / submit / plan load); what remains in the shell
    // is exercise-row state management and JSX composition.
    // 2026-08-01 (JARVIS S10): ratchet nudged 875 -> 885 — the one-mic
    // cutover wires the Jarvis overlay (flag branch, hook call, mount) at a
    // net +6 after extracting useJarvisVoiceCutover.ts. Next tightening is
    // ALREADY SCHEDULED: the VOICE_MODE_V2 flag-flip deletes the legacy
    // dictation cluster (strip mount, dictation hook, imports) from the shell.
    const lineCount = source.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(885);
  });
});
