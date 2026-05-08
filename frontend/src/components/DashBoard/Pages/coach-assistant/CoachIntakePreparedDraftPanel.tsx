/**
 * CoachIntakePreparedDraftPanel.tsx
 * =================================
 * Loads and renders the latest deterministic Coach proposal for an intake.
 */
import React from 'react';
import { AlertTriangle, Eye, Loader2, RefreshCcw, X } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';
import { getCoachProposal } from '../../../../services/coachProposalService';
import { ActionButton } from './CoachIntakeWorkspace.styles';
import CoachActionProposalCard from './CoachActionProposalCard';
import {
  PreparedDraftActions,
  PreparedDraftHeader,
  PreparedDraftPanel,
  TargetEyebrow,
  TargetNotice,
} from './CoachIntakeWorkspaceTarget.styles';

interface CoachIntakePreparedDraftPanelProps {
  proposalId: string;
  onClose: () => void;
}

function errorMessageFor(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  if (code === 'PROPOSAL_NOT_FOUND') {
    return 'Prepared draft is unavailable or no longer belongs to this session. Prepare an updated draft review.';
  }
  return err instanceof Error ? err.message : 'Prepared draft could not be loaded.';
}

export function CoachIntakePreparedDraftPanel({
  proposalId,
  onClose,
}: CoachIntakePreparedDraftPanelProps): JSX.Element {
  const [proposal, setProposal] = React.useState<CoachActionProposal | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const requestSeq = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => () => {
    mountedRef.current = false;
    requestSeq.current += 1;
  }, []);

  const loadProposal = React.useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCoachProposal(proposalId);
      if (!mountedRef.current || requestSeq.current !== seq) return;
      setProposal(result.proposal || null);
      if (!result.proposal) setError('Prepared draft response was empty. Prepare an updated draft review.');
    } catch (err) {
      if (!mountedRef.current || requestSeq.current !== seq) return;
      setProposal(null);
      setError(errorMessageFor(err));
    } finally {
      if (mountedRef.current && requestSeq.current === seq) setIsLoading(false);
    }
  }, [proposalId]);

  React.useEffect(() => {
    setProposal(null);
    void loadProposal();
  }, [loadProposal]);

  return (
    <PreparedDraftPanel aria-label="Prepared draft review panel">
      <PreparedDraftHeader>
        <div>
          <TargetEyebrow><Eye size={13} aria-hidden="true" /> Prepared draft review</TargetEyebrow>
          <h4>Review the linked Coach proposal</h4>
          <p>Details load through the deterministic proposal gate before any approval can write records.</p>
        </div>
        <PreparedDraftActions>
          <ActionButton type="button" onClick={loadProposal} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} aria-hidden="true" /> : <RefreshCcw size={16} aria-hidden="true" />}
            Reload draft
          </ActionButton>
          <ActionButton type="button" onClick={onClose}>
            <X size={16} aria-hidden="true" />
            Close
          </ActionButton>
        </PreparedDraftActions>
      </PreparedDraftHeader>
      {isLoading ? <TargetNotice role="status">Loading prepared draft...</TargetNotice> : null}
      {error ? <TargetNotice role="alert"><AlertTriangle size={13} aria-hidden="true" /> {error}</TargetNotice> : null}
      {proposal ? <CoachActionProposalCard proposal={proposal} /> : null}
    </PreparedDraftPanel>
  );
}

export default CoachIntakePreparedDraftPanel;
