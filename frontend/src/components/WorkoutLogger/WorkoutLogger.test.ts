import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * WorkoutLogger initialization-order invariant — source-level TDZ guard.
 *
 * History:
 *   - Original test (pre-2026-04-18): locked that the now-deleted
 *     `loadClientData` wrapper was declared before its mount useEffect.
 *   - 2026-04-18 Codex round 3: the `loadClientData` wrapper was
 *     pure indirection (async () => await executeLoadClientData()) and
 *     listing `executeLoadClientData` in its deps array tripped the
 *     TDZ at render time because the real callback was declared
 *     ~160 lines later. The wrapper has been removed; the mount
 *     useEffect now sits adjacent to (just after) the real
 *     `executeLoadClientData` useCallback.
 *
 * This file was updated to lock the NEW invariant that prevents the
 * same regression class:
 *
 *   `executeLoadClientData` must be declared BEFORE any mount-time
 *   consumer (useEffect / useCallback) that references it in its
 *   deps array.
 *
 * Runtime coverage of the same regression lives in
 * `WorkoutLogger.clientMount.test.tsx` — that file actually renders
 * the component and catches any TDZ that would trip on mount.
 */
describe('WorkoutLogger initialization order', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, 'WorkoutLogger.tsx'),
    'utf8',
  );

  it('does NOT re-introduce the deleted loadClientData wrapper', () => {
    // The wrapper `const loadClientData = useCallback(async () => { await executeLoadClientData(); }, [executeLoadClientData])`
    // was the vehicle for the TDZ regression (deps array referenced an
    // identifier declared ~160 lines below). Lock that the wrapper
    // stays deleted.
    expect(source).not.toMatch(
      /const\s+loadClientData\s*=\s*useCallback\s*\(\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+executeLoadClientData\s*\(\s*\)/,
    );
  });

  it('declares executeLoadClientData before its mount useEffect', () => {
    // The mount effect that calls executeLoadClientData() must appear
    // AFTER the useCallback that defines it — otherwise React would
    // evaluate the effect's deps array against a TDZ identifier.
    const executeIdx = source.indexOf(
      'const executeLoadClientData = useCallback',
    );
    const mountEffectIdx = source.search(
      /useEffect\(\(\)\s*=>\s*\{\s*\n?\s*executeLoadClientData\(\);[\s\S]*?\[executeLoadClientData\]\);/,
    );

    expect(executeIdx).toBeGreaterThan(-1);
    expect(mountEffectIdx).toBeGreaterThan(-1);
    expect(executeIdx).toBeLessThan(mountEffectIdx);
  });

  it('no useCallback declared above executeLoadClientData lists it as a dep', () => {
    // Structural backstop: any `useCallback(..., [executeLoadClientData])`
    // declared BEFORE `const executeLoadClientData =` would trip the
    // TDZ on render. Enumerate every occurrence of the dep pattern and
    // verify each one sits after the declaration.
    const executeIdx = source.indexOf(
      'const executeLoadClientData = useCallback',
    );
    expect(executeIdx).toBeGreaterThan(-1);

    const depPattern = /\[executeLoadClientData\]/g;
    let match: RegExpExecArray | null;
    while ((match = depPattern.exec(source)) !== null) {
      expect(match.index).toBeGreaterThan(executeIdx);
    }
  });
});
