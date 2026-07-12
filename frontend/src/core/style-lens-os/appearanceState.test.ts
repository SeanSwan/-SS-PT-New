import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE_PROFILE,
  appearanceReducer,
  createInitialAppearanceState,
  type AppearanceProfile,
} from '.';

const profile = (
  styleLensId: string,
  updatedAt = '2026-07-11T20:00:00.000Z',
): AppearanceProfile => ({
  ...DEFAULT_APPEARANCE_PROFILE,
  styleLensId,
  updatedAt,
});

describe('appearance state machine', () => {
  it('isolates pending preview from committed appearance', () => {
    const initial = createInitialAppearanceState(DEFAULT_APPEARANCE_PROFILE);
    const previewing = appearanceReducer(initial, {
      type: 'BEGIN_PREVIEW',
      profile: profile('quiet-meridian'),
    });

    expect(previewing.phase).toBe('previewing');
    expect(previewing.preview?.styleLensId).toBe('quiet-meridian');
    expect(previewing.committed.styleLensId).toBe('default-safety');
  });

  it('cancels preview without changing committed state', () => {
    const previewing = appearanceReducer(
      createInitialAppearanceState(DEFAULT_APPEARANCE_PROFILE),
      { type: 'BEGIN_PREVIEW', profile: profile('quiet-meridian') },
    );
    const cancelled = appearanceReducer(previewing, { type: 'CANCEL_PREVIEW' });

    expect(cancelled.phase).toBe('idle');
    expect(cancelled.preview).toBeNull();
    expect(cancelled.committed).toBe(DEFAULT_APPEARANCE_PROFILE);
  });

  it('follows validate, commit, transition, persist, and idle phases', () => {
    const target = profile('quiet-meridian');
    let state = appearanceReducer(
      createInitialAppearanceState(DEFAULT_APPEARANCE_PROFILE),
      { type: 'BEGIN_PREVIEW', profile: target },
    );
    state = appearanceReducer(state, { type: 'BEGIN_COMMIT' });
    expect(state.phase).toBe('validating');

    state = appearanceReducer(state, { type: 'COMMIT_VALIDATED', profile: target });
    expect(state.phase).toBe('committing');
    expect(state.rollbackProfile).toBe(DEFAULT_APPEARANCE_PROFILE);

    state = appearanceReducer(state, { type: 'TRANSITION_STARTED' });
    expect(state.phase).toBe('transitioning');

    state = appearanceReducer(state, { type: 'TRANSITION_COMPLETED' });
    expect(state.phase).toBe('persisting');
    expect(state.committed.styleLensId).toBe('quiet-meridian');

    state = appearanceReducer(state, { type: 'PERSIST_SUCCEEDED' });
    expect(state.phase).toBe('idle');
    expect(state.preview).toBeNull();
  });

  it('rolls back the exact previous profile after persistence failure', () => {
    const target = profile('quiet-meridian');
    let state = createInitialAppearanceState(DEFAULT_APPEARANCE_PROFILE);
    state = appearanceReducer(state, { type: 'BEGIN_PREVIEW', profile: target });
    state = appearanceReducer(state, { type: 'BEGIN_COMMIT' });
    state = appearanceReducer(state, { type: 'COMMIT_VALIDATED', profile: target });
    state = appearanceReducer(state, { type: 'TRANSITION_STARTED' });
    state = appearanceReducer(state, { type: 'TRANSITION_COMPLETED' });
    state = appearanceReducer(state, {
      type: 'PERSIST_FAILED',
      error: 'quota exceeded',
    });

    expect(state.phase).toBe('rollback');
    expect(state.committed).toBe(DEFAULT_APPEARANCE_PROFILE);
    expect(state.error).toBe('quota exceeded');

    state = appearanceReducer(state, { type: 'ROLLBACK_COMPLETED' });
    expect(state.phase).toBe('idle');
    expect(state.rollbackProfile).toBeNull();
  });

  it('rejects invalid transitions without mutating state', () => {
    const initial = createInitialAppearanceState(DEFAULT_APPEARANCE_PROFILE);
    const unchanged = appearanceReducer(initial, { type: 'TRANSITION_STARTED' });

    expect(unchanged).toBe(initial);
  });
});
