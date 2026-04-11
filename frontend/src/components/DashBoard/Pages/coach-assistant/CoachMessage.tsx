/**
 * ┌─── SUB-COMPONENT: CoachMessage ────────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Renders a single AI or user message bubble         │
 * │ WIREFRAME:                                                  │
 * │ ┌─────────────────────────────────┐                         │
 * │ │ Message text (16px mobile min)  │                         │
 * │ │ [🔊 Read] [📋 Copy]            │  ← AI messages only     │
 * │ │ 2:34 PM                         │                         │
 * │ └─────────────────────────────────┘                         │
 * │ Props: { message, onReadAloud }                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import { Volume2, Copy, Check, UserPlus, Key, Link2, Shield, Dumbbell } from 'lucide-react';
import {
  MessageBubbleAI,
  MessageBubbleUser,
  MessageTime,
  MessageActions,
  MessageActionBtn,
} from './SwanCoachStyles';
import MarkdownRenderer from './MarkdownRenderer';
import ProviderBadge from './ProviderBadge';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import type { CoachMessageData } from './SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Action Result Cards (client creation, workout import)
// ─────────────────────────────────────────────────────────────
const ActionCard = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, var(--bg-surface, #1A1A24));
`;

const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const CardLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 100px;
`;

const CardValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-all;
`;

const CopyableValue = styled.button`
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 6px;
  padding: 4px 10px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s;
  &:hover { background: rgba(96, 192, 240, 0.15); }
`;

const ProgressBar = styled.div<{ $pct: number }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(96, 192, 240, 0.1);
  overflow: hidden;
  max-width: 120px;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    background: var(--accent-secondary, #8B5CF6);
    border-radius: 3px;
  }
`;

interface CoachMessageProps {
  message: CoachMessageData;
  onReadAloud?: (text: string) => void;
  onConfirmCommand?: (operationId: string) => Promise<{ success: boolean; error?: string }>;
  onCancelCommand?: (operationId: string | null) => Promise<void>;
}

const CoachMessageComponent: React.FC<CoachMessageProps> = ({
  message,
  onReadAloud,
  onConfirmCommand,
  onCancelCommand,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [message.content]);

  const handleReadAloud = useCallback(() => {
    onReadAloud?.(message.content);
  }, [message.content, onReadAloud]);

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (message.role === 'user') {
    return (
      <MessageBubbleUser>
        {message.content}
        <MessageTime>{timeStr}</MessageTime>
      </MessageBubbleUser>
    );
  }

  const clientCreate = message.metadata?.clientCreateResult;
  const workoutImports = message.metadata?.workoutImportResults;
  const commandConfirmation = message.metadata?.commandConfirmation;
  const commandResult = message.metadata?.commandResult;

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  return (
    <MessageBubbleAI>
      <MarkdownRenderer content={message.content} />

      {/* Client Creation Result Card */}
      {clientCreate?.success && (
        <ActionCard>
          <CardTitle><UserPlus size={16} /> New Client Created</CardTitle>
          <CardRow>
            <CardLabel>Name</CardLabel>
            <CardValue>{clientCreate.firstName} {clientCreate.lastName}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Client ID</CardLabel>
            <CardValue>{clientCreate.clientId}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Type</CardLabel>
            <CardValue>{clientCreate.isMoveFitness ? 'Move Fitness (free)' : 'SwanStudios (paid)'}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Claim Code</CardLabel>
            <CopyableValue onClick={() => copyToClipboard(clientCreate.claimCode)}>
              <Key size={12} /> {clientCreate.claimCode} <Copy size={10} />
            </CopyableValue>
          </CardRow>
          <CardRow>
            <CardLabel>Claim URL</CardLabel>
            <CopyableValue onClick={() => copyToClipboard(clientCreate.claimUrl)}>
              <Link2 size={12} /> {clientCreate.claimUrl} <Copy size={10} />
            </CopyableValue>
          </CardRow>
          <CardRow>
            <CardLabel>Temp Password</CardLabel>
            <CopyableValue onClick={() => copyToClipboard(clientCreate.temporaryPassword)}>
              <Shield size={12} /> {clientCreate.temporaryPassword} <Copy size={10} />
            </CopyableValue>
          </CardRow>
          <CardRow>
            <CardLabel>Onboarding</CardLabel>
            <CardValue>{clientCreate.sectionsPreFilled}/{clientCreate.totalSections} pre-filled</CardValue>
            <ProgressBar $pct={clientCreate.completionPercentage || 0} />
          </CardRow>
        </ActionCard>
      )}

      {clientCreate && !clientCreate.success && (
        <ActionCard style={{ borderColor: 'rgba(201, 42, 84, 0.3)' }}>
          <CardTitle style={{ color: '#C92A54' }}>Client Creation Failed</CardTitle>
          <CardRow><CardValue>{clientCreate.reason}</CardValue></CardRow>
        </ActionCard>
      )}

      {/* Workout Import Results Card */}
      {workoutImports?.length > 0 && (
        <ActionCard>
          <CardTitle><Dumbbell size={16} /> Workout Import Results</CardTitle>
          {workoutImports.map((w: any, i: number) => (
            <CardRow key={i}>
              <CardLabel>{w.date || `Workout ${i + 1}`}</CardLabel>
              {w.success ? (
                <CardValue style={{ color: '#10B981' }}>
                  {w.exerciseCount} exercises · {w.totalSets} sets · {w.totalWeight > 0 ? `${w.totalWeight.toLocaleString()} lbs` : 'bodyweight'}
                </CardValue>
              ) : (
                <CardValue style={{ color: '#C92A54' }}>Failed: {w.reason}</CardValue>
              )}
            </CardRow>
          ))}
        </ActionCard>
      )}

      {/* Command Confirmation Card */}
      {commandConfirmation && onConfirmCommand && onCancelCommand && (
        <ConfirmationCard
          operationId={commandConfirmation.operationId}
          command={commandConfirmation.command}
          params={commandConfirmation.params}
          client={commandConfirmation.client}
          details={commandConfirmation.details}
          isDestructive={commandConfirmation.isDestructive}
          onConfirm={onConfirmCommand}
          onCancel={onCancelCommand}
        />
      )}

      {/* Command Execution Result Card */}
      {commandResult && (
        <ExecutionResultCard
          command={commandResult.command}
          result={commandResult.result}
          client={commandResult.client}
          message={commandResult.message}
        />
      )}

      <MessageActions>
        {onReadAloud && (
          <MessageActionBtn onClick={handleReadAloud} aria-label="Read aloud">
            <Volume2 size={14} /> Read
          </MessageActionBtn>
        )}
        <MessageActionBtn onClick={handleCopy} aria-label="Copy message">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </MessageActionBtn>
      </MessageActions>
      <MessageTime>
        {timeStr}
        {message.metadata?.model && (
          <ProviderBadge provider={message.metadata.provider} model={message.metadata.model} />
        )}
      </MessageTime>
    </MessageBubbleAI>
  );
};

export const CoachMessage = memo(CoachMessageComponent);
