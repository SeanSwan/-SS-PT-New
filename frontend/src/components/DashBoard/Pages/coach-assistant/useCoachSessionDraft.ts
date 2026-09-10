import { useCoachSessionDraftContext } from './CoachSessionDraftContext';

/** Shell-owned draft API. This hook never creates a second local store. */
export const useCoachSessionDraft = () => useCoachSessionDraftContext();

export default useCoachSessionDraft;
