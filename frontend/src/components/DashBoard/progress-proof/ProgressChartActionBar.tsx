/**
 * COMPONENT: ProgressChartActionBar
 * PURPOSE: Shared interaction shell for Progress Proof charts.
 *
 * DATA FLOW:
 * - Parent chart owns real data and selected range/legend state.
 * - This component only controls display/export actions.
 * - CSV export uses the rows supplied by the parent; no data is generated here.
 */

import React, { useState } from 'react';
import { Download, ListTree, Share2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  downloadChartPng,
  downloadCsvFile,
  PROGRESS_CHART_RANGE_LABELS,
  PROGRESS_CHART_TIME_RANGES,
  type ProgressChartCsvRow,
  type ProgressChartDrilldownRow,
  type ProgressChartPulse,
  type ProgressChartTimeRange,
} from './progressChartActions';
import ProgressChartStudio from './ProgressChartStudio';
import { buildProgressShareCard } from './progressShareCard';
import { shareProgressCardToFeed } from './progressSocialShare';
import {
  ActionRow,
  ActionShell,
  DrilldownDetail,
  DrilldownPanel,
  DrilldownRow,
  IconActionButton,
  LegendButton,
  LegendGroup,
  PulseDetail,
  PulsePanel,
  PulseTarget,
  PulseValue,
  RangeButton,
  RangeGroup,
  SummaryText,
} from './ProgressChartActionBar.styles';

interface ProgressChartLegendItem {
  id: string;
  label: string;
  color: string;
  active: boolean;
}

interface ProgressChartActionBarProps {
  chartId: string;
  chartTitle: string;
  csvRows: ProgressChartCsvRow[];
  drilldownRows: ProgressChartDrilldownRow[];
  filename: string;
  range: ProgressChartTimeRange;
  pulse?: ProgressChartPulse;
  summary: string;
  legendItems?: ProgressChartLegendItem[];
  onRangeChange: (range: ProgressChartTimeRange) => void;
  onToggleLegend?: (id: string) => void;
}

const RangePicker: React.FC<{
  chartId: string;
  range: ProgressChartTimeRange;
  onRangeChange: (range: ProgressChartTimeRange) => void;
}> = ({ chartId, range, onRangeChange }) => (
  <RangeGroup role="group" aria-label={`${chartId} time range`}>
    {PROGRESS_CHART_TIME_RANGES.map((item) => (
      <RangeButton
        key={item.id}
        $active={range === item.id}
        aria-pressed={range === item.id}
        type="button"
        onClick={() => onRangeChange(item.id)}
      >
        {item.label}
      </RangeButton>
    ))}
  </RangeGroup>
);

const ExportButtons: React.FC<{
  canExportPng: boolean;
  panelId: string;
  isOpen: boolean;
  hasRows: boolean;
  isRecord: boolean;
  onCsvExport: () => void;
  onOpenStudio: () => void;
  onPngExport: () => void;
  onToggleDetails: () => void;
}> = ({
  canExportPng,
  panelId,
  isOpen,
  hasRows,
  isRecord,
  onCsvExport,
  onOpenStudio,
  onPngExport,
  onToggleDetails,
}) => (
  // CTA hierarchy (G4): Details=primary (the everyday depth action), Share=promoted
  // only when a fresh record is worth celebrating, CSV/PNG=utility exports.
  <>
    <IconActionButton
      type="button"
      aria-controls={panelId}
      aria-expanded={isOpen}
      disabled={!hasRows}
      $emphasis="primary"
      onClick={onToggleDetails}
    >
      <ListTree size={14} aria-hidden="true" />
      Details
    </IconActionButton>
    <IconActionButton
      type="button"
      $emphasis={isRecord ? 'promoted' : undefined}
      aria-label={isRecord ? 'Share new record proof card' : undefined}
      onClick={onOpenStudio}
    >
      <Share2 size={14} aria-hidden="true" />
      Share
    </IconActionButton>
    <IconActionButton type="button" $emphasis="utility" onClick={onCsvExport}>
      <Download size={14} aria-hidden="true" />
      CSV
    </IconActionButton>
    <IconActionButton type="button" $emphasis="utility" disabled={!canExportPng} onClick={onPngExport}>
      <Download size={14} aria-hidden="true" />
      PNG
    </IconActionButton>
  </>
);

const LegendToggles: React.FC<{
  chartId: string;
  items: ProgressChartLegendItem[];
  onToggleLegend?: (id: string) => void;
}> = ({ chartId, items, onToggleLegend }) => {
  if (items.length === 0) return null;

  return (
    <LegendGroup role="group" aria-label={`${chartId} visible series`}>
      {items.map((item) => (
        <LegendButton
          key={item.id}
          $active={item.active}
          $color={item.color}
          aria-pressed={item.active}
          type="button"
          onClick={() => onToggleLegend?.(item.id)}
        >
          {item.label}
        </LegendButton>
      ))}
    </LegendGroup>
  );
};

const PulseSummary: React.FC<{ pulse?: ProgressChartPulse }> = ({ pulse }) => {
  if (!pulse) return null;

  return (
    <PulsePanel $tone={pulse.tone} aria-label={`${pulse.label}: ${pulse.value}`}>
      <span>{pulse.label}</span>
      <PulseValue>{pulse.value}</PulseValue>
      <PulseDetail>{pulse.detail}</PulseDetail>
      {pulse.target && <PulseTarget>{pulse.target}</PulseTarget>}
    </PulsePanel>
  );
};

const DrilldownRows: React.FC<{
  isOpen: boolean;
  panelId: string;
  rows: ProgressChartDrilldownRow[];
}> = ({ isOpen, panelId, rows }) => {
  if (!isOpen) return null;

  return (
    <DrilldownPanel id={panelId}>
      {rows.map((row) => (
        <DrilldownRow key={row.id}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {row.detail && <DrilldownDetail>{row.detail}</DrilldownDetail>}
        </DrilldownRow>
      ))}
    </DrilldownPanel>
  );
};

const ProgressChartActionBar: React.FC<ProgressChartActionBarProps> = ({
  chartId,
  chartTitle,
  csvRows,
  drilldownRows,
  filename,
  range,
  pulse,
  summary,
  legendItems = [],
  onRangeChange,
  onToggleLegend,
}) => {
  const { authAxios } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const hasRows = drilldownRows.length > 0;
  const panelId = `${chartId}-drilldown`;
  const shareCard = buildProgressShareCard({
    chartTitle,
    csvRows,
    pulse,
    rangeLabel: PROGRESS_CHART_RANGE_LABELS[range],
    summary,
  });

  const handleExport = () => {
    const exported = downloadCsvFile(filename, csvRows);
    setExportStatus(exported ? 'CSV export started.' : 'No verified chart rows to export.');
  };

  const exportPng = async () => {
    const pngName = filename.replace(/\.csv$/i, '.png');
    return downloadChartPng(chartId, pngName);
  };

  const handlePngExport = async () => {
    const exported = await exportPng();
    setExportStatus(exported ? 'PNG export started.' : 'No rendered chart is available to export.');
  };

  return (
    <ActionShell>
      <ActionRow>
        <RangePicker chartId={chartId} range={range} onRangeChange={onRangeChange} />
        <ExportButtons
          canExportPng={csvRows.length > 0}
          panelId={panelId}
          isOpen={isOpen}
          hasRows={hasRows}
          isRecord={pulse?.tone === 'record'}
          onCsvExport={handleExport}
          onOpenStudio={() => setIsStudioOpen(true)}
          onPngExport={handlePngExport}
          onToggleDetails={() => setIsOpen((current) => !current)}
        />
      </ActionRow>

      <LegendToggles chartId={chartId} items={legendItems} onToggleLegend={onToggleLegend} />
      <PulseSummary pulse={pulse} />
      <SummaryText>{summary}</SummaryText>
      {exportStatus && <SummaryText role="status">{exportStatus}</SummaryText>}
      <DrilldownRows isOpen={isOpen} panelId={panelId} rows={drilldownRows} />
      <ProgressChartStudio
        card={shareCard}
        chartId={chartId}
        filename={filename.replace(/\.csv$/i, '-proof-card.png')}
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onShareToFeed={() => shareProgressCardToFeed(authAxios, shareCard)}
      />
    </ActionShell>
  );
};

export default React.memo(ProgressChartActionBar);
