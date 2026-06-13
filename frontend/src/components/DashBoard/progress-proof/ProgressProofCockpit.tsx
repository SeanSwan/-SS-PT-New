/**
 * COMPONENT: ProgressProofCockpit
 * OWNER: Dashboard Progress / Client Hub
 * PURPOSE: Shared proof-readiness, copy, and chart lens controls.
 */

import React, { useMemo, useState } from 'react';
import { Copy, Gauge, ShieldCheck } from 'lucide-react';
import {
  PROGRESS_CHART_LENSES,
  getProgressChartLens,
  type ProgressChartLensId,
} from './progressChartLens';
import {
  buildProgressProofSummary,
  type ProgressProofAudience,
} from './progressProofSummary';
import {
  ActionRow,
  CockpitShell,
  CopyButton,
  CopyStatus,
  LensButton,
  LensDescription,
  LensLabel,
  LensPanel,
  LensRow,
  MeterTop,
  PercentLabel,
  PercentStack,
  PercentValue,
  ProofGuidance,
  ProofHeadline,
  ProofIntro,
  ProofKicker,
  ProofMeter,
  ProofSegment,
  ProofSegments,
  ProofStat,
  ProofStatLabel,
  ProofStatValue,
  ProofStats,
  QualityPill,
} from './ProgressProofCockpit.styles';

interface ProgressProofCockpitProps {
  activeLensId: ProgressChartLensId;
  audience?: ProgressProofAudience;
  nonEmptyChartCount: number;
  unavailableChartCount?: number;
  subjectLabel?: string;
  onLensChange: (lensId: ProgressChartLensId) => void;
}

const writeClipboardText = async (text: string): Promise<'copied' | 'unavailable' | 'failed'> => {
  const clipboard = typeof navigator === 'undefined' ? null : navigator.clipboard;
  if (!clipboard?.writeText) return 'unavailable';
  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
};

const copyStatusByResult: Record<Awaited<ReturnType<typeof writeClipboardText>>, string> = {
  copied: 'Proof summary copied.',
  unavailable: 'Copy is unavailable in this browser.',
  failed: 'Copy failed. The summary is still visible here.',
};

const getSegmentState = (
  index: number,
  populated: number,
  totalCharts: number,
  unavailable: number,
): 'active' | 'empty' | 'unavailable' => {
  if (index < populated) return 'active';
  if (unavailable > 0 && index >= totalCharts - unavailable) return 'unavailable';
  return 'empty';
};

const ProgressProofCockpit: React.FC<ProgressProofCockpitProps> = ({
  activeLensId,
  audience = 'client',
  nonEmptyChartCount,
  unavailableChartCount = 0,
  subjectLabel,
  onLensChange,
}) => {
  const [copyStatus, setCopyStatus] = useState('');
  const activeLens = getProgressChartLens(activeLensId);
  const subject = audience === 'admin' ? subjectLabel || 'Selected client' : 'Your training';
  const summary = useMemo(
    () => buildProgressProofSummary({
      audience,
      nonEmptyChartCount,
      unavailableChartCount,
    }),
    [audience, nonEmptyChartCount, unavailableChartCount],
  );

  const handleCopy = async () => {
    setCopyStatus(copyStatusByResult[await writeClipboardText(summary.copyText)]);
  };

  return (
    <CockpitShell $tone={summary.tone} aria-label="Progress proof controls">
      <ProofIntro>
        <ProofKicker>
          <ShieldCheck size={15} aria-hidden="true" />
          Verified progress proof
        </ProofKicker>
        <ProofHeadline>{summary.headline}</ProofHeadline>
        <ProofGuidance>
          {subject}: {summary.guidance}
        </ProofGuidance>

        <LensPanel>
          <LensLabel>Chart lens</LensLabel>
          <LensRow role="group" aria-label="Choose chart lens">
            {PROGRESS_CHART_LENSES.map((lens) => (
              <LensButton
                key={lens.id}
                type="button"
                $active={lens.id === activeLensId}
                aria-pressed={lens.id === activeLensId}
                onClick={() => onLensChange(lens.id)}
              >
                {lens.label}
              </LensButton>
            ))}
          </LensRow>
          <LensDescription>{activeLens.description}</LensDescription>
        </LensPanel>
      </ProofIntro>

      <ProofMeter aria-label={`Progress proof readiness ${summary.readinessPercent}%`}>
        <MeterTop>
          <PercentStack>
            <PercentValue>{summary.readinessPercent}%</PercentValue>
            <PercentLabel>chart readiness</PercentLabel>
          </PercentStack>
          <QualityPill>
            <Gauge size={14} aria-hidden="true" />
            {summary.qualityLabel}
          </QualityPill>
        </MeterTop>

        <ProofSegments aria-hidden="true">
          {Array.from({ length: summary.totalCharts }, (_, index) => (
            <ProofSegment
              key={index}
              $state={getSegmentState(
                index,
                summary.populated,
                summary.totalCharts,
                summary.unavailable,
              )}
            />
          ))}
        </ProofSegments>

        <ProofStats>
          <ProofStat>
            <ProofStatValue>{summary.populated}/{summary.totalCharts}</ProofStatValue>
            <ProofStatLabel>populated</ProofStatLabel>
          </ProofStat>
          <ProofStat>
            <ProofStatValue>{summary.proofLevel}</ProofStatValue>
            <ProofStatLabel>proof level</ProofStatLabel>
          </ProofStat>
          <ProofStat>
            <ProofStatValue>{summary.nextUnlock}</ProofStatValue>
            <ProofStatLabel>next unlock</ProofStatLabel>
          </ProofStat>
          <ProofStat>
            <ProofStatValue>{summary.unavailable}</ProofStatValue>
            <ProofStatLabel>unavailable</ProofStatLabel>
          </ProofStat>
        </ProofStats>

        <ActionRow>
          <CopyButton type="button" onClick={handleCopy}>
            <Copy size={15} aria-hidden="true" />
            Copy proof summary
          </CopyButton>
          <CopyStatus role="status" aria-live="polite">
            {copyStatus || summary.statusText}
          </CopyStatus>
        </ActionRow>
      </ProofMeter>
    </CockpitShell>
  );
};

export default ProgressProofCockpit;
