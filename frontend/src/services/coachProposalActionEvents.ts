import type { CoachActionProposal } from '../components/DashBoard/Pages/coach-assistant/SwanCoachTypes';

export const COACH_PROPOSAL_ACTION_EVENT = 'swan:coach-proposal-action';

export interface CoachProposalActionEventDetail {
  proposal: CoachActionProposal;
}

export const dispatchCoachProposalAction = (proposal: CoachActionProposal): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CoachProposalActionEventDetail>(
    COACH_PROPOSAL_ACTION_EVENT,
    { detail: { proposal } },
  ));
};

export const subscribeCoachProposalActions = (
  handler: (proposal: CoachActionProposal) => void,
): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CoachProposalActionEventDetail>).detail;
    if (detail?.proposal) handler(detail.proposal);
  };

  window.addEventListener(COACH_PROPOSAL_ACTION_EVENT, listener);
  return () => window.removeEventListener(COACH_PROPOSAL_ACTION_EVENT, listener);
};
