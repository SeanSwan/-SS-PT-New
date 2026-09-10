import { describe, expect, it } from 'vitest';
import { beginDraft, createInitialDraftState, editDraft, freezeForSubmit, requestTargetChange, resolveTargetChange } from './coachSessionDraftState';

const ids = (() => { let index = 0; return () => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`; })();

describe('CoachSessionDraft state owner', () => {
  it('requires positive actor and target IDs', () => {
    expect(beginDraft(createInitialDraftState('0', 'trainer'), 4, 'workout', ids)).toMatchObject({ ok: false, code: 'NO_ACTOR' });
    expect(beginDraft(createInitialDraftState('42', 'trainer'), 0, 'workout', ids)).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
  });

  it('shares one revision and rejects stale writes', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'talk', ids);
    if (!started.ok) throw new Error('expected task');
    const edited = editDraft(started.state, started.scopeToken, 0, { content: { title: 'Upper body' } }, ids);
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.draft.revision).toBe(1);
    expect(editDraft(edited.state, started.scopeToken, 0, { content: { title: 'stale' } }, ids)).toMatchObject({ ok: false, code: 'STALE_REVISION' });
  });

  it('freezes an immutable snapshot with a stable retry identity', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'workout', ids);
    if (!started.ok) throw new Error('expected task');
    const edited = editDraft(started.state, started.scopeToken, 0, { content: { sets: [{ reps: 8, weight: 100 }] } }, ids);
    if (!edited.ok) throw new Error('expected edit');
    const frozen = freezeForSubmit(edited.state, started.scopeToken, 1, ids);
    expect(frozen.ok).toBe(true);
    if (!frozen.ok) return;
    expect(frozen.submitted.submittedRevision).toBe(1);
    expect(frozen.submitted.snapshot.taskId).toBe(edited.draft.taskId);
    expect(Object.isFrozen(frozen.submitted.snapshot)).toBe(true);
    expect(Object.isFrozen(frozen.submitted.snapshot.content)).toBe(true);
    expect(frozen.state.draft?.dirty).toBe(true);
  });

  it('models target Return and Discard without cancelling server work', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'workout', ids);
    if (!started.ok) throw new Error('expected task');
    const requested = requestTargetChange(started.state, 8);
    if (!requested.ok) throw new Error('expected target change');
    const returned = resolveTargetChange(requested.state, started.scopeToken, 'return');
    expect(returned.intent).toEqual({ kind: 'return', targetUserId: 7 });
    const requestedAgain = requestTargetChange(returned.state, 8);
    if (!requestedAgain.ok) throw new Error('expected target change');
    const discarded = resolveTargetChange(requestedAgain.state, started.scopeToken, 'discard');
    expect(discarded.intent).toEqual({ kind: 'discard', targetUserId: 8 });
    expect(discarded.state.draft).toBeNull();
    expect(discarded.state.submitted).toBeNull();
  });
});
