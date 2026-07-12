import type { AppearanceProfile } from './types';

export type AppearancePhase =
  | 'idle'
  | 'previewing'
  | 'validating'
  | 'committing'
  | 'transitioning'
  | 'persisting'
  | 'rejected'
  | 'rollback';

export interface AppearanceState {
  phase: AppearancePhase;
  committed: AppearanceProfile;
  preview: AppearanceProfile | null;
  rollbackProfile: AppearanceProfile | null;
  error: string | null;
}

export type AppearanceAction =
  | { type: 'BEGIN_PREVIEW'; profile: AppearanceProfile }
  | { type: 'CANCEL_PREVIEW' }
  | { type: 'BEGIN_COMMIT' }
  | { type: 'VALIDATION_REJECTED'; error: string }
  | { type: 'COMMIT_VALIDATED'; profile: AppearanceProfile }
  | { type: 'TRANSITION_STARTED' }
  | { type: 'TRANSITION_COMPLETED' }
  | { type: 'PERSIST_SUCCEEDED' }
  | { type: 'PERSIST_FAILED'; error: string }
  | { type: 'ROLLBACK_COMPLETED' }
  | { type: 'EXTERNAL_PROFILE_RECEIVED'; profile: AppearanceProfile };

export const createInitialAppearanceState = (
  committed: AppearanceProfile,
): AppearanceState => ({
  phase: 'idle',
  committed,
  preview: null,
  rollbackProfile: null,
  error: null,
});

export const appearanceReducer = (
  state: AppearanceState,
  action: AppearanceAction,
): AppearanceState => {
  switch (action.type) {
    case 'BEGIN_PREVIEW':
      if (!['idle', 'previewing', 'rejected'].includes(state.phase)) return state;
      return {
        ...state,
        phase: 'previewing',
        preview: action.profile,
        error: null,
      };
    case 'CANCEL_PREVIEW':
      if (!['previewing', 'rejected'].includes(state.phase)) return state;
      return { ...state, phase: 'idle', preview: null, error: null };
    case 'BEGIN_COMMIT':
      if (state.phase !== 'previewing' || !state.preview) return state;
      return { ...state, phase: 'validating', error: null };
    case 'VALIDATION_REJECTED':
      if (state.phase !== 'validating') return state;
      return { ...state, phase: 'rejected', error: action.error };
    case 'COMMIT_VALIDATED':
      if (state.phase !== 'validating') return state;
      return {
        ...state,
        phase: 'committing',
        preview: action.profile,
        rollbackProfile: state.committed,
        error: null,
      };
    case 'TRANSITION_STARTED':
      if (state.phase !== 'committing') return state;
      return { ...state, phase: 'transitioning' };
    case 'TRANSITION_COMPLETED':
      if (state.phase !== 'transitioning' || !state.preview) return state;
      return {
        ...state,
        phase: 'persisting',
        committed: state.preview,
      };
    case 'PERSIST_SUCCEEDED':
      if (state.phase !== 'persisting') return state;
      return {
        ...state,
        phase: 'idle',
        preview: null,
        rollbackProfile: null,
        error: null,
      };
    case 'PERSIST_FAILED':
      if (state.phase !== 'persisting' || !state.rollbackProfile) return state;
      return {
        ...state,
        phase: 'rollback',
        committed: state.rollbackProfile,
        error: action.error,
      };
    case 'ROLLBACK_COMPLETED':
      if (state.phase !== 'rollback') return state;
      return {
        ...state,
        phase: 'idle',
        preview: null,
        rollbackProfile: null,
      };
    case 'EXTERNAL_PROFILE_RECEIVED':
      if (state.phase !== 'idle') return state;
      return { ...state, committed: action.profile, error: null };
    default:
      return state;
  }
};
