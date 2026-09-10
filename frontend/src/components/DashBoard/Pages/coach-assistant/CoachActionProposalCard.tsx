import { useContext } from 'react';
import { AuthContext } from '../../../../context/authContextState';
import { UNSAFE_LocationContext } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, ExternalLink, Eye, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';
import { CoachProposalGateRail } from './CoachProposalGateRail';
import { CoachActionProposalSplitPlanPanel } from './CoachActionProposalSplitPlanPanel';
import { ProposalAccessLinkActions } from './CoachClaimLinkActions';
import {
  ActionButton,
  ActionLink,
  Actions,
  Card,
  DetailPanel,
  Header,
  Label,
  Row,
  StatusText,
  Value,
} from './CoachActionProposalCard.styles';
import {
  safeProposalTitle,
  type CoachActionProposalCardProps,
} from './CoachActionProposalCard.logic';
import { useCoachActionProposalController } from './useCoachActionProposalController';

/** Current router pathname without throwing outside a <Router> (bare test mounts). */
function useLocationPathname(): string | null {
  const ctx = useContext(UNSAFE_LocationContext) as { location?: { pathname?: string } } | null;
  if (ctx?.location?.pathname) return ctx.location.pathname;
  return typeof window === 'undefined' ? null : window.location.pathname;
}

/** Scope changes remount private state; sibling proposal cards stay independent. */
export function CoachActionProposalCard(props: CoachActionProposalCardProps) {
  const auth = useContext(AuthContext);
  const pathname = useLocationPathname();
  if (auth && !auth.user) return null;
  const scope = [auth?.user?.id ?? 'standalone', pathname, props.proposal.id, props.proposal.summary?.clientId].join(':');
  return <CoachActionProposalInstance key={scope} {...props} />;
}

function CoachActionProposalInstance({ proposal, onProposalAction }: CoachActionProposalCardProps) {
  const locationPathname = useLocationPathname();
  const controller = useCoachActionProposalController({ proposal, onProposalAction, locationPathname });
  const {
    status,
    busy,
    detail,
    generatedProposals,
    message,
    error,
    workoutOutcome: outcome,
    checkingResult,
    createdClientRoute,
    accessHandoff,
    clarificationOptions,
    approveLabel,
    isClarification,
    detailRows,
    terminalMessage,
    visibleStatus,
    rows,
    accessLabel,
    accessExpires,
    approveDisabled,
    showReject,
    showCheckResult,
    detailHidden,
    recordRoute,
    runLoadDetails,
    runApprove,
    runCheckResult,
    runClarificationAnswer,
    runReject,
  } = controller;
  const pending = status === 'PENDING';

  return (
    <>
      <Card>
        <Header><ShieldCheck size={16} /> {safeProposalTitle(proposal.type)}</Header>
        {rows.map(([label, value]) => (
          <Row key={label}><Label>{label}</Label><Value>{value}</Value></Row>
        ))}
        <Row><Label>Status</Label><Value>{visibleStatus}</Value></Row>
        <CoachProposalGateRail summary={proposal.summary || {}} />
        {detailRows.length > 0 && !detailHidden && (
          <DetailPanel>
            {detailRows.map(([label, value]) => (
              <Row key={label}><Label>{label}</Label><Value>{value}</Value></Row>
            ))}
          </DetailPanel>
        )}
        <CoachActionProposalSplitPlanPanel detail={detailHidden ? null : detail} />
        {pending && isClarification && clarificationOptions.length > 0 && (
          <Actions aria-label="Clarification answer options">
            {clarificationOptions.map((option) => (
              <ActionButton type="button" key={option.value} onClick={() => runClarificationAnswer(option.value)} disabled={!!busy}>
                {busy === 'clarification' ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}{option.label}
              </ActionButton>
            ))}
          </Actions>
        )}
        {pending && outcome?.kind !== 'commit_unknown' && (
          <Actions>
            <ActionButton type="button" onClick={runLoadDetails} disabled={!!busy || checkingResult}>
              {busy === 'detail' ? <Loader2 size={16} /> : <Eye size={16} />}Review details
            </ActionButton>
            {!isClarification && (
              <ActionButton type="button" onClick={runApprove} disabled={approveDisabled}>
                {busy === 'approve' ? <Loader2 size={16} /> : <ClipboardCheck size={16} />}{approveLabel}
              </ActionButton>
            )}
            {showReject && (
              <ActionButton type="button" $danger onClick={runReject} disabled={!!busy || checkingResult}>
                {busy === 'reject' ? <Loader2 size={16} /> : <XCircle size={16} />}Reject
              </ActionButton>
            )}
          </Actions>
        )}
        {showCheckResult && (
          <Actions aria-label="Workout result recovery">
            <ActionButton type="button" onClick={runCheckResult} disabled={!!busy || checkingResult}>
              {checkingResult ? <Loader2 size={16} /> : <Eye size={16} />}Check result
            </ActionButton>
          </Actions>
        )}
        {!pending && !message && !outcome && !error && terminalMessage && (
          <StatusText><CheckCircle2 size={14} /> {terminalMessage}</StatusText>
        )}
        {message && <StatusText><CheckCircle2 size={14} /> {message}</StatusText>}
        {accessLabel && (
          <DetailPanel aria-label="Client access handoff">
            <Row><Label>Access</Label><Value>{accessLabel}</Value></Row>
            {accessHandoff?.claimCode && <Row><Label>Claim code</Label><Value>{accessHandoff.claimCode}</Value></Row>}
            {accessExpires && <Row><Label>Expires</Label><Value>{accessExpires}</Value></Row>}
          </DetailPanel>
        )}
        {accessHandoff?.claimUrl && <ProposalAccessLinkActions url={accessHandoff.claimUrl} label="claim link" />}
        {accessHandoff?.resetUrl && <ProposalAccessLinkActions url={accessHandoff.resetUrl} label="reset link" />}
        {createdClientRoute && (
          <Actions aria-label="Onboarding next steps"><ActionLink to={createdClientRoute}><ExternalLink size={16} />Open Client Hub</ActionLink></Actions>
        )}
        {recordRoute && (
          <Actions aria-label="Workout record"><ActionLink to={recordRoute}><ExternalLink size={16} />View workout record</ActionLink></Actions>
        )}
        {error && <StatusText $error>{error}</StatusText>}
      </Card>
      {generatedProposals.map((generatedProposal: CoachActionProposal) => (
        <CoachActionProposalCard key={generatedProposal.id} proposal={generatedProposal} onProposalAction={onProposalAction} />
      ))}
    </>
  );
}

export default CoachActionProposalCard;
