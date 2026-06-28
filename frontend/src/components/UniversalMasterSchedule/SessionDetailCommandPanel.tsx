import React from 'react';
import { AlertTriangle, Bot, CheckCircle2, Clock3, CreditCard, ShieldCheck } from 'lucide-react';
import { buildSessionCommandState, type SessionCommandRiskLevel } from './SessionDetailCommandPanel.logic';
import type { SessionDetail, SessionDetailModalMode } from './SessionDetailModal.types';
import * as S from './SessionDetailCommandPanel.styles';

interface SessionDetailCommandPanelProps {
  session: SessionDetail;
  mode: SessionDetailModalMode;
  isNonDeductingClient: boolean;
  onApplyPayment?: (clientId: number) => void;
  now?: Date;
}

function getOutcomeIcon(risk: SessionCommandRiskLevel) {
  if (risk === 'high') return <AlertTriangle size={16} aria-hidden="true" />;
  if (risk === 'medium') return <Clock3 size={16} aria-hidden="true" />;
  return <CheckCircle2 size={16} aria-hidden="true" />;
}

function getClientId(session: SessionDetail) {
  const clientId = Number(session.userId);
  return Number.isSafeInteger(clientId) && clientId > 0 ? clientId : null;
}

const SessionDetailCommandPanel: React.FC<SessionDetailCommandPanelProps> = ({
  session,
  mode,
  isNonDeductingClient,
  onApplyPayment,
  now,
}) => {
  const state = buildSessionCommandState({ session, mode, now, isNonDeductingClient });
  const clientId = getClientId(session);
  const canOpenPaymentReview = Boolean(
    state.primaryAction?.key === 'open_payment_review'
    && state.primaryAction.enabled
    && clientId
    && onApplyPayment
  );

  return (
    <S.CommandPanel aria-label="Appointment command panel">
      <S.CommandHeader>
        <S.TitleGroup>
          <S.PanelTitle>
            <ShieldCheck size={18} aria-hidden="true" />
            Appointment command
          </S.PanelTitle>
          <S.PanelKicker>Outcome, settlement, payment, and attention state</S.PanelKicker>
        </S.TitleGroup>
        <S.OutcomePill $risk={state.riskLevel}>
          {getOutcomeIcon(state.riskLevel)}
          {state.outcomeLabel}
        </S.OutcomePill>
      </S.CommandHeader>

      <S.CommandGrid>
        <S.CommandCard>
          <S.CardLabel><Clock3 size={14} aria-hidden="true" /> Settlement</S.CardLabel>
          <S.CardValue>{state.settlementLabel}</S.CardValue>
        </S.CommandCard>
        <S.CommandCard>
          <S.CardLabel><CreditCard size={14} aria-hidden="true" /> Payment state</S.CardLabel>
          <S.CardValue>{state.paymentLabel}</S.CardValue>
        </S.CommandCard>
        <S.CommandCard>
          <S.CardLabel><AlertTriangle size={14} aria-hidden="true" /> Attention</S.CardLabel>
          <S.AttentionList>
            {state.attentionReasons.map(reason => <S.AttentionChip key={reason}>{reason}</S.AttentionChip>)}
          </S.AttentionList>
        </S.CommandCard>
      </S.CommandGrid>

      <S.ProposalStrip>
        <S.CardLabel><Bot size={14} aria-hidden="true" /> AI proposal queue</S.CardLabel>
        <S.ProposalText>{state.proposalLabel}</S.ProposalText>
        {canOpenPaymentReview && (
          <S.ActionButton type="button" onClick={() => onApplyPayment?.(clientId as number)}>
            <CreditCard size={16} aria-hidden="true" />
            {state.primaryAction?.label}
          </S.ActionButton>
        )}
      </S.ProposalStrip>
    </S.CommandPanel>
  );
};

export default SessionDetailCommandPanel;