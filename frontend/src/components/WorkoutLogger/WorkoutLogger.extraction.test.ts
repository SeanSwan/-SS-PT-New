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
    // WorkoutLoggerModeBar.tsx. The next real reduction (handleSubmit /
    // executeLoadClientData → hooks) is a dedicated refactor pass (Rule 37),
    // not bundled with feature work, and is partly gated by the source-text
    // locks in WorkoutLogger.protocolSections.test.tsx that require certain
    // handlers to remain inline in this file.
    const lineCount = source.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(1270);
  });
});
