/**
 * ============================================================================
 * FILE: ClientTrainingCommandBar.tsx
 * PURPOSE: Selected-client inline Swan command bar for daily training work.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lets an admin/trainer dictate or type a client-scoped
 * workout instruction without leaving Clients & Team.
 *
 * HOW IT FITS IN THE APP: TrainingTabContent -> command bar -> useAIChat.
 * It sends client IDs only; display names stay local to the UI.
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Mic2, Send, Sparkles } from 'lucide-react';
import { useAIChat } from '../../../../hooks/useAIChat';
import CoachActionProposalCard from '../../Pages/coach-assistant/CoachActionProposalCard';
import type { CoachActionProposal } from '../../Pages/coach-assistant/SwanCoachTypes';

interface ClientTrainingCommandBarProps {
  clientId: number | string;
  clientName?: string;
}

const Shell = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 18%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #1a1a24) 86%, var(--accent-primary, #60c0f0) 8%),
      color-mix(in srgb, var(--bg-base, #0a0a0f) 88%, var(--accent-secondary, #8b5cf6) 8%));
  box-shadow: 0 14px 34px var(--shadow-ambient, rgba(0, 0, 0, 0.26));

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  color: var(--accent-primary, #60c0f0);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 8%);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;

  @media (max-width: 620px) {
    justify-content: center;
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  min-width: 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const InputWrap = styled.div`
  position: relative;
  min-width: 0;
`;

const LeadingIcon = styled(Mic2)`
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 42px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 88%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60c0f0);
  }
`;

const SubmitButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--accent-secondary, #8b5cf6);
  background: linear-gradient(135deg, var(--accent-secondary, #8b5cf6), var(--accent-tertiary, #4070c0));
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 26px var(--shadow-accent, rgba(96, 192, 240, 0.16));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

const StatusLine = styled.div<{ $tone?: 'error' | 'success' }>`
  grid-column: 2;
  margin-top: -6px;
  color: ${({ $tone }) =>
    $tone === 'error'
      ? 'var(--danger-text, #fca5a5)'
      : 'var(--accent-primary, #60c0f0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;

  @media (max-width: 620px) {
    grid-column: 1;
    text-align: center;
  }
`;

const OutputPanel = styled.div`
  grid-column: 2;
  display: grid;
  gap: 10px;
  padding-top: 2px;

  @media (max-width: 620px) {
    grid-column: 1;
  }
`;

const AssistantNote = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 5%);
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.5;
`;

function buildDailyCommandPrompt(clientId: number | string, command: string): string {
  return [
    `Client-scoped daily training command for clientId=${clientId}.`,
    'Use client ID only. Do not require or echo client display names.',
    'Intent: daily workout logging, set updates, workout review, and next-session readiness.',
    'Prepare a review-gated workout_log proposal when enough detail exists.',
    'Do not directly submit workout forms or bypass trainer review.',
    `Operator command: ${command}`,
  ].join('\n');
}

function proposalBelongsToClient(proposal: CoachActionProposal, clientId: number | string): boolean {
  const proposalClientId = proposal.summary?.clientId;
  return proposalClientId != null && String(proposalClientId) === String(clientId);
}

const ClientTrainingCommandBar: React.FC<ClientTrainingCommandBarProps> = ({
  clientId,
  clientName = 'selected client',
}) => {
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'error' | 'success'>('success');
  const { messages, sending, error, sendMessageWithConversation, clearError } = useAIChat();
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const latestAssistantContent = typeof latestAssistantMessage?.content === 'string'
    ? latestAssistantMessage.content
    : '';
  const latestProposals = (
    (latestAssistantMessage?.metadata?.coachActionProposals || []) as CoachActionProposal[]
  );
  const latestClientProposals = latestProposals.filter((proposal) =>
    proposalBelongsToClient(proposal, clientId)
  );
  const shouldShowAssistantContent =
    !!latestAssistantContent && (latestProposals.length === 0 || latestClientProposals.length > 0);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = command.trim();
      if (!trimmed || sending) return;

      clearError();
      setStatus(null);
      const result = await sendMessageWithConversation(
        buildDailyCommandPrompt(clientId, trimmed),
        'workout_generation',
        `Client #${clientId} daily training`,
        clientId,
        'both'
      );

      if (result && (result as { paywallRequired?: boolean }).paywallRequired) {
        setStatusTone('error');
        setStatus('Swan Coach requires an active subscription.');
        return;
      }

      if (!result || (result as { failed?: boolean }).failed) {
        setStatusTone('error');
        setStatus('Swan could not process that. Edit and resend.');
        return;
      }

      setCommand('');
      setStatusTone('success');
      setStatus('Sent to Swan. Review before save.');
    },
    [clearError, clientId, command, sendMessageWithConversation, sending]
  );

  const displayedStatus = error || status;
  const displayedTone = error ? 'error' : statusTone;

  return (
    <Shell aria-label={`${clientName} Swan daily training command`}>
      <Badge>
        <Sparkles size={16} />
        Tell Swan
      </Badge>

      <Form onSubmit={handleSubmit}>
        <InputWrap>
          <LeadingIcon size={17} aria-hidden="true" />
          <Input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            aria-label={`Tell Swan about ${clientName}`}
            placeholder="Dictate sets, reps, load, pain, notes..."
          />
        </InputWrap>

        <SubmitButton type="submit" disabled={!command.trim() || sending} aria-label="Send to Swan">
          <Send size={16} />
          Send
        </SubmitButton>
      </Form>

      {displayedStatus && (
        <StatusLine role={displayedTone === 'error' ? 'alert' : 'status'} $tone={displayedTone}>
          {displayedStatus}
        </StatusLine>
      )}

      {(shouldShowAssistantContent || latestClientProposals.length > 0) && (
        <OutputPanel aria-label="Swan daily training review output">
          {shouldShowAssistantContent && <AssistantNote>{latestAssistantContent}</AssistantNote>}
          {latestClientProposals.map((proposal) => (
            <CoachActionProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </OutputPanel>
      )}
    </Shell>
  );
};

export default ClientTrainingCommandBar;
