/**
 * Blueprint: ScheduleAiOperatorDock
 * Purpose: Gives Universal Master Schedule users a proposal-only AI control lane.
 * Inputs: Current schedule view, visible session snapshot, role mode, and optional proposal requester.
 * Safety: Sends only IDs, counts, statuses, and schedule-version metadata; never executes schedule or payment writes.
 */

import React, { useMemo, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Mic, Pencil, Send, Sparkles, X } from 'lucide-react';
import {
  ScheduleAiProposalRequest,
  ScheduleAiProposalResponse,
  universalMasterScheduleService,
} from '../../services/universal-master-schedule-service';
import {
  buildScheduleAiDockContext,
  formatScheduleAiAction,
  ScheduleAiDockMode,
} from './ScheduleAiOperatorDock.logic';
import {
  ActionRow,
  CollapsedButton,
  CollapsedLabel,
  DockBody,
  DockHeader,
  DockPanel,
  DockTitle,
  DockWrap,
  ErrorText,
  IconBadge,
  IconButton,
  ProposalCard,
  ProposalHeader,
  ProposalText,
  RequestArea,
  RequestTextarea,
  RiskPill,
  ScreenReaderOnly,
  SecondaryButton,
  SendButton,
} from './ScheduleAiOperatorDock.styles';

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface ScheduleAiOperatorDockProps {
  mode: ScheduleAiDockMode;
  activeView: string;
  currentDate: Date;
  sessions: Array<Record<string, unknown>>;
  selectedTrainerId?: string | number | null;
  adminViewScope?: 'my' | 'global';
  requestProposal?: (payload: ScheduleAiProposalRequest) => Promise<ScheduleAiProposalResponse>;
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function proposalRiskLabel(proposal: ScheduleAiProposalResponse['proposal']): string {
  const level = proposal?.risk?.level || 'review';
  const policy = proposal?.executionPolicy || (proposal?.manualOnly ? 'manual_only' : 'proposal_only');
  return `${level} / ${policy.replace(/_/g, ' ')}`;
}

const defaultRequestProposal = (payload: ScheduleAiProposalRequest) =>
  universalMasterScheduleService.createScheduleAiProposal(payload);

export default function ScheduleAiOperatorDock({
  mode,
  activeView,
  currentDate,
  sessions,
  selectedTrainerId,
  adminViewScope,
  requestProposal = defaultRequestProposal,
}: ScheduleAiOperatorDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const [proposal, setProposal] = useState<ScheduleAiProposalResponse['proposal'] | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const context = useMemo(() => buildScheduleAiDockContext({
    mode,
    activeView,
    currentDate,
    sessions,
    selectedTrainerId,
    adminViewScope,
  }), [activeView, adminViewScope, currentDate, mode, selectedTrainerId, sessions]);

  const SpeechRecognition = getSpeechRecognition();
  const canListen = Boolean(SpeechRecognition);

  const handleSubmit = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setLastMessage(cleanMessage);

    try {
      const result = await requestProposal({
        message: cleanMessage,
        context,
      });

      if (!result.success && !result.ok) {
        setProposal(null);
        setError(result.message || 'Schedule AI could not create a proposal.');
        return;
      }

      setProposal(result.proposal || null);
      setMessage('');
    } catch (submitError) {
      setProposal(null);
      setError(submitError instanceof Error ? submitError.message : 'Schedule AI could not create a proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceInput = () => {
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) setMessage((current) => `${current} ${transcript}`.trim());
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  const handleDismiss = () => {
    setProposal(null);
    setError('');
  };

  const handleEditRequest = () => {
    setMessage(lastMessage);
    setProposal(null);
    setError('');
  };

  if (!isOpen) {
    return (
      <DockWrap>
        <CollapsedButton
          type="button"
          aria-label="Open schedule AI operator"
          onClick={() => setIsOpen(true)}
        >
          <CollapsedLabel>
            <Bot size={20} aria-hidden="true" />
            Schedule AI
          </CollapsedLabel>
          <ChevronDown size={20} aria-hidden="true" />
        </CollapsedButton>
      </DockWrap>
    );
  }

  return (
    <DockWrap>
      <DockPanel aria-label="Schedule AI operator">
        <DockHeader>
          <DockTitle>
            <IconBadge>
              <Sparkles size={20} aria-hidden="true" />
            </IconBadge>
            <div>
              <strong>Schedule AI</strong>
              <span>Ask about a booking, move, attendance, or payment review.</span>
            </div>
          </DockTitle>
          <IconButton
            type="button"
            aria-label="Close schedule AI operator"
            onClick={() => setIsOpen(false)}
          >
            <ChevronUp size={20} aria-hidden="true" />
          </IconButton>
        </DockHeader>

        <DockBody>
          <RequestArea>
            <RequestTextarea
              aria-label="Schedule AI request"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Find an opening, draft a move, or review a cancellation."
              maxLength={2000}
            />
            <ActionRow>
              <IconButton
                type="button"
                aria-label={canListen ? 'Start voice input' : 'Voice input unavailable'}
                disabled={!canListen || isSubmitting}
                onClick={handleVoiceInput}
              >
                <Mic size={18} aria-hidden="true" />
              </IconButton>
              <SendButton
                type="button"
                disabled={!message.trim() || isSubmitting}
                onClick={handleSubmit}
                aria-busy={isSubmitting}
              >
                <Send size={18} aria-hidden="true" />
                {isSubmitting ? 'Sending' : 'Send'} <ScreenReaderOnly> schedule AI request</ScreenReaderOnly>
              </SendButton>
            </ActionRow>
          </RequestArea>

          {error ? <ErrorText role="alert">{error}</ErrorText> : null}

          {proposal ? (
            <ProposalCard>
              <ProposalHeader>
                <div>
                  <strong>{formatScheduleAiAction(proposal.action)}</strong>
                  <span>{proposal.status || 'pending_review'}</span>
                </div>
                <RiskPill>{proposalRiskLabel(proposal)}</RiskPill>
              </ProposalHeader>
              {proposal.content ? <ProposalText>{proposal.content}</ProposalText> : null}
              <ActionRow>
                <SecondaryButton type="button" onClick={handleEditRequest}>
                  <Pencil size={16} aria-hidden="true" />
                  Edit request
                </SecondaryButton>
                <SecondaryButton type="button" onClick={handleDismiss}>
                  <X size={16} aria-hidden="true" />
                  Dismiss proposal
                </SecondaryButton>
              </ActionRow>
            </ProposalCard>
          ) : null}
        </DockBody>
      </DockPanel>
    </DockWrap>
  );
}