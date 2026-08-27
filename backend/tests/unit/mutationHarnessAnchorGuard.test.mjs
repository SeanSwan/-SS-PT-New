/**
 * mutationHarnessAnchorGuard.test.mjs
 * ===================================
 * The instrument that validates other instruments needs one of its own.
 *
 * `scripts/mutation-harness.mjs` refuses to run on an anchor that cannot match. If that
 * refusal were wrong in either direction the harness would be worse than useless: too
 * strict and it blocks working mutations, too loose and it lets a silently-unmatchable
 * anchor be reported as a mutation that "did not fire" — which reads as a vacuous
 * assertion and sends you to rewrite a test that was fine.
 *
 * The rule it encodes cost nine occurrences across five sessions to state precisely, and
 * was learned by RUNNING the guard rather than by writing it down again: the sources are
 * CRLF, so a newline inside an anchor cannot match — the file has a `\r` there the anchor
 * lacks — while a LEADING newline matches the `\n` half of a `\r\n` and correctly anchors
 * the start of a line.
 */
import { describe, it, expect } from 'vitest';

import { unusableAnchors } from '../../../scripts/mutation-harness.mjs';
import ownershipMutations from '../mutations/ownership.mutations.mjs';

const m = (id, find, replace = 'x') => ({ id, file: 'irrelevant.mjs', find, replace });

describe('mutation harness anchor guard', () => {
  it('rejects an anchor whose newline is in the middle', () => {
    const bad = unusableAnchors([m('spans a line break', 'const a = 1;\n  const b = 2;')]);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toContain('spans a line break');
  });

  it('ACCEPTS an anchor whose newline leads', () => {
    // The distinction the write-ups never made. Blocking this would reject a working
    // mutation and push the author back toward an anchor that cannot be made unique.
    expect(unusableAnchors([m('leading newline', '\n    if (hasTrainerScope) {')])).toEqual([]);
  });

  it('accepts a plain single-line anchor', () => {
    expect(unusableAnchors([m('single line', '  const trainerId = resolveTrainerId(x);')])).toEqual([]);
  });

  it('allows a newline in the REPLACEMENT, which is written and never matched', () => {
    expect(unusableAnchors([m('multi-line replacement', '  const a = 1;', '  const a = 2;\n  const b = 3;')])).toEqual([]);
  });

  it('checks every part of a multi-file mutation, not only the first', () => {
    const bad = unusableAnchors([{
      id: 'second part is bad',
      parts: [
        { file: 'a.mjs', find: 'fine', replace: 'x' },
        { file: 'b.mjs', find: 'not\nfine', replace: 'x' },
      ],
    }]);
    expect(bad).toHaveLength(1);
  });

  it('rejects a non-string anchor rather than throwing on it', () => {
    expect(unusableAnchors([{ id: 'undefined find', file: 'a.mjs', replace: 'x' }])).toHaveLength(1);
  });

  it('passes the committed ownership mutation set', () => {
    // The set is the harness's real input. If it ever stops satisfying the guard, the
    // guard is what fails — loudly, before anything is modified.
    expect(unusableAnchors(ownershipMutations.mutations)).toEqual([]);
    // Floors, not exact counts. An exact count fails every time the set GROWS, which trains
    // the next person to edit the number without reading why it moved — and this one did
    // exactly that the first time two suites were added. A floor still catches the failure
    // that matters: a set silently shrinking to nothing.
    expect(ownershipMutations.mutations.length).toBeGreaterThanOrEqual(29);
    expect(ownershipMutations.suites.length).toBeGreaterThanOrEqual(4);
  });
});
