/**
 * COMPONENT: ProgressChartStudio
 * PURPOSE: Read-only share-card preview for canonical Progress Proof charts.
 * DATA POLICY: Receives sanitized chart-card copy only; performs no social writes.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Clipboard, ImageDown, LockKeyhole, X } from 'lucide-react';
import type { ProgressShareCard } from './progressShareCard';
import { downloadProgressShareCardPng } from './progressShareCardExport';
import {
  CaptionBox,
  CloseButton,
  MetricGrid,
  MetricItem,
  PreviewCard,
  PreviewDetail,
  PreviewKicker,
  PreviewTitle,
  ProofLine,
  StudioActions,
  StudioBackdrop,
  StudioBody,
  StudioButton,
  StudioDialog,
  StudioHeader,
  StudioKicker,
  StudioStatus,
  StudioTitle,
} from './ProgressChartStudio.styles';

interface ProgressChartStudioProps {
  card: ProgressShareCard;
  chartId: string;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

const unavailableMessage = 'Add verified chart rows before sharing this proof card.';

const ProgressChartStudio: React.FC<ProgressChartStudioProps> = ({
  card,
  chartId,
  filename,
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState('');
  const titleId = `${chartId}-studio-title`;

  useEffect(() => {
    if (!isOpen) return undefined;
    setStatus('');
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!card.isShareable) {
      setStatus(unavailableMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(card.caption);
      setStatus('Caption copied.');
    } catch {
      setStatus('Copy unavailable in this browser. The caption remains visible for manual review.');
    }
  };

  const handleExport = async () => {
    if (!card.isShareable) {
      setStatus(unavailableMessage);
      return;
    }

    const exported = await downloadProgressShareCardPng(card, filename);
    setStatus(exported ? 'PNG export started.' : 'No share card image could be generated.');
  };

  return (
    <StudioBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <StudioDialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
      >
        <StudioHeader>
          <div>
            <StudioKicker>{card.kicker}</StudioKicker>
            <StudioTitle id={titleId}>{card.title} share card</StudioTitle>
          </div>
          <CloseButton type="button" aria-label="Close chart studio" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </StudioHeader>

        <StudioBody>
          <PreviewCard $tone={card.tone}>
            <PreviewKicker>Shareable proof card</PreviewKicker>
            <PreviewTitle>{card.title}</PreviewTitle>
            <PreviewDetail>{card.detail}</PreviewDetail>
            <MetricGrid>
              {card.metrics.map((metric) => (
                <MetricItem key={`${metric.label}-${metric.value}`}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </MetricItem>
              ))}
            </MetricGrid>
            <ProofLine>
              {card.isShareable ? card.proofLine : (
                <>
                  <LockKeyhole size={14} aria-hidden="true" /> {card.proofLine}
                </>
              )}
            </ProofLine>
          </PreviewCard>

          <CaptionBox
            aria-label="Progress proof caption"
            readOnly
            value={card.caption}
          />

          <StudioActions>
            <StudioButton type="button" disabled={!card.isShareable} onClick={handleCopy}>
              <Clipboard size={15} aria-hidden="true" />
              Copy Caption
            </StudioButton>
            <StudioButton type="button" disabled={!card.isShareable} onClick={handleExport}>
              <ImageDown size={15} aria-hidden="true" />
              Export Card PNG
            </StudioButton>
          </StudioActions>
          {status && <StudioStatus role="status">{status}</StudioStatus>}
        </StudioBody>
      </StudioDialog>
    </StudioBackdrop>
  );
};

export default React.memo(ProgressChartStudio);
