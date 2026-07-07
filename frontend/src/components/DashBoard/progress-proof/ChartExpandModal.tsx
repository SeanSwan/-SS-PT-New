/**
 * ChartExpandModal
 * ================
 * Click-a-chart → full-screen drill-down (Phase 2.2a, Fable Vision arc —
 * Sean's headline chart ask). Village-locked binary decided (B): built fresh
 * on the hardened WorkoutDayDrilldown overlay pattern (z-2200, scroll lock,
 * focus return, Escape, reduced-motion) + PostMediaLightbox's body portal
 * (defends the translateZ stacking-context gotcha). ProgressChartStudio —
 * the app's only milestone-share surface — is untouched by construction.
 *
 * Chart-agnostic: the card passes its own Victory composition via
 * renderChart(width, height); the modal supplies measured dimensions so the
 * SAME chart renders bigger with adaptive height. Rows feed the semantic
 * data table (the SR tabular alternative); pulse/facts reuse the existing
 * ProgressChartInsightBar verbatim.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { buildChartMomentCaption, shareChartMomentToFeed } from './progressSocialShare';
import ProgressChartInsightBar from './ProgressChartInsightBar';
import ChartExpandDataTable from './ChartExpandDataTable';
import type { ProgressChartDrilldownRow, ProgressChartPulse } from './progressChartActions';
import type { ProgressChartFact } from './progressChartFacts';
import {
  ChartStage,
  CloseButton,
  HeaderRow,
  HeaderShareButton,
  ModalSubtitle,
  ModalTitle,
  Overlay,
  Panel,
  SectionLabel,
  ShareOutcome,
  TitleBlock,
} from './ChartExpandModal.styles';

export interface ChartExpandModalProps {
  title: string;
  subtitle?: string | null;
  renderChart: (width: number, height: number) => React.ReactNode;
  rows: ProgressChartDrilldownRow[];
  pulse?: ProgressChartPulse | null;
  facts?: ProgressChartFact[];
  /** Client-dashboard mounts opt in; staff grids stay PNG/copy-only. */
  canShareToFeed?: boolean;
  onClose: () => void;
}

const ChartExpandModal: React.FC<ChartExpandModalProps> = ({
  title,
  subtitle,
  renderChart,
  rows,
  pulse,
  facts,
  canShareToFeed = false,
  onClose,
}) => {
  const { authAxios } = useAuth();
  const [shareState, setShareState] = useState<'idle' | 'posting' | 'shared' | 'failed'>('idle');
  const shareCaption = canShareToFeed
    ? buildChartMomentCaption({ title, pulse: pulse ?? null, facts })
    : null;

  const handleShare = async () => {
    if (!shareCaption || shareState === 'posting') return;
    setShareState('posting');
    try {
      setShareState((await shareChartMomentToFeed(authAxios, shareCaption)) ? 'shared' : 'failed');
    } catch {
      setShareState('failed');
    }
  };

  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const titleId = 'chart-expand-modal-title';

  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // Lock background scroll while the dialog is open (mobile especially).
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => setStageWidth(Math.max(280, Math.floor(stage.clientWidth)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const chartHeight = Math.min(420, Math.max(260, Math.round(stageWidth * 0.5)));

  return createPortal(
    <Overlay onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <HeaderRow>
          <TitleBlock>
            <ModalTitle id={titleId}>{title}</ModalTitle>
            {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
          </TitleBlock>
          {shareCaption && shareState !== 'shared' && (
            <HeaderShareButton
              type="button"
              onClick={handleShare}
              disabled={shareState === 'posting'}
              aria-label={`Share ${title} to your feed`}
            >
              <Share2 size={15} aria-hidden="true" />
              {shareState === 'posting' ? 'Sharing...' : 'Share'}
            </HeaderShareButton>
          )}
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title} detail view`}>
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </HeaderRow>
        {shareState === 'shared' && <ShareOutcome>Shared to your community feed.</ShareOutcome>}
        {shareState === 'failed' && (
          <ShareOutcome>Couldn't share right now — you can post it from the Progress share studio.</ShareOutcome>
        )}
        <ChartStage ref={stageRef}>
          {stageWidth > 0 && renderChart(stageWidth, chartHeight)}
        </ChartStage>
        {(pulse || (facts && facts.length > 0)) && (
          <ProgressChartInsightBar pulse={pulse ?? null} facts={facts} testId="chart-expand-insights" />
        )}
        {rows.length > 0 && <SectionLabel>Data behind this chart</SectionLabel>}
        <ChartExpandDataTable title={title} rows={rows} />
      </Panel>
    </Overlay>,
    document.body,
  );
};

export default ChartExpandModal;
