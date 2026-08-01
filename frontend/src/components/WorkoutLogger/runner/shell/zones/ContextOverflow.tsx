/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ContextOverflow — the context bar's ⋯ menu (zone 1).        │
 * │ Destructive/rare actions leave the thumb zone (mis-tap      │
 * │ law): Cancel session · Export PDF · the summary action      │
 * │ with its save-first LOCK semantics carried verbatim from    │
 * │ the retired footer (visible-with-reason, disabled until a   │
 * │ confirmed save unlocks it).                                 │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { ArrowUpRight, Download, LogOut, MessageSquare, MoreHorizontal } from 'lucide-react';
import Sheet from '../primitives/Sheet';

const TriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--world-text, #e0ecf4) 14%, transparent);
  border-radius: 10px;
  background: transparent;
  color: var(--world-muted, #94a3b8);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

const MenuTitle = styled.h2`
  margin: 0 0 10px;
  font: 700 1rem 'Plus Jakarta Sans', sans-serif;
  color: var(--world-text, #e0ecf4);
`;

const ActionRow = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  margin-bottom: 6px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  font: 600 0.85rem 'Sora', sans-serif;
  border: 1px solid ${({ $danger }) =>
    $danger
      ? 'color-mix(in srgb, var(--danger, #ef4444) 45%, transparent)'
      : 'color-mix(in srgb, var(--world-text, #e0ecf4) 14%, transparent)'};
  background: transparent;
  color: ${({ $danger }) => ($danger ? 'var(--danger, #ef4444)' : 'var(--world-text, #e0ecf4)')};

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export interface ContextOverflowProps {
  onCancelSession: () => void;
  onExportPDF: () => void;
  onGenerateSummary?: () => void;
  showGenerateSummary: boolean;
  isGeneratingSummary: boolean;
  summaryLockedReason?: string;
  /** Parent-owned SPA navigation; exposed only when leaving cannot lose a live draft. */
  onOpenCoachCommand?: () => void;
}

const ContextOverflow: React.FC<ContextOverflowProps> = ({
  onCancelSession, onExportPDF, onGenerateSummary,
  showGenerateSummary, isGeneratingSummary, summaryLockedReason, onOpenCoachCommand,
}) => {
  const [open, setOpen] = useState(false);
  // Footer-contract lock: the summary row stays VISIBLE with its reason,
  // and stays disabled until a confirmed save unlocks it.
  const shouldRenderSummaryAction = Boolean((showGenerateSummary || summaryLockedReason) && onGenerateSummary);
  const summaryActionLabel = showGenerateSummary
    ? 'Generate & Send Summary'
    : summaryLockedReason ?? 'Save Workout to Send Summary';

  const runAndClose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <>
      <TriggerButton type='button' aria-haspopup='dialog' aria-label='Session actions' onClick={() => setOpen(true)}>
        <MoreHorizontal size={18} aria-hidden='true' />
      </TriggerButton>
      <Sheet open={open} onClose={() => setOpen(false)} label='Session actions' historyKey='session-actions'>
        <MenuTitle>Session actions</MenuTitle>
        {onOpenCoachCommand && (
          <ActionRow type='button' onClick={runAndClose(onOpenCoachCommand)} aria-label='Open full Coach Command Center for this workout'>
            <ArrowUpRight size={16} aria-hidden='true' /> Full Command Center
          </ActionRow>
        )}
        <ActionRow type='button' onClick={runAndClose(onExportPDF)}>
          <Download size={16} aria-hidden='true' /> Export PDF
        </ActionRow>
        {shouldRenderSummaryAction && onGenerateSummary && (
          <ActionRow
            type='button'
            onClick={runAndClose(onGenerateSummary)}
            disabled={!showGenerateSummary || isGeneratingSummary}
          >
            <MessageSquare size={16} aria-hidden='true' /> {summaryActionLabel}
          </ActionRow>
        )}
        <ActionRow type='button' $danger onClick={runAndClose(onCancelSession)}>
          <LogOut size={16} aria-hidden='true' /> Cancel session
        </ActionRow>
      </Sheet>
    </>
  );
};

export default ContextOverflow;
