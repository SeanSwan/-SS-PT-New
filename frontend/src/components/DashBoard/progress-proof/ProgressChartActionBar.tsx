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
import { Download, ListTree } from 'lucide-react';
import {
  downloadChartPng,
  downloadCsvFile,
  PROGRESS_CHART_TIME_RANGES,
  type ProgressChartCsvRow,
  type ProgressChartDrilldownRow,
  type ProgressChartTimeRange,
} from './progressChartActions';
import {
  ActionRow,
  ActionShell,
  DrilldownDetail,
  DrilldownPanel,
  DrilldownRow,
  IconActionButton,
  LegendButton,
  LegendGroup,
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
  csvRows: ProgressChartCsvRow[];
  drilldownRows: ProgressChartDrilldownRow[];
  filename: string;
  range: ProgressChartTimeRange;
  summary: string;
  legendItems?: ProgressChartLegendItem[];
  onRangeChange: (range: ProgressChartTimeRange) => void;
  onToggleLegend?: (id: string) => void;
}

const ProgressChartActionBar: React.FC<ProgressChartActionBarProps> = ({
  chartId,
  csvRows,
  drilldownRows,
  filename,
  range,
  summary,
  legendItems = [],
  onRangeChange,
  onToggleLegend,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const hasRows = drilldownRows.length > 0;
  const panelId = `${chartId}-drilldown`;

  const handleExport = () => {
    const exported = downloadCsvFile(filename, csvRows);
    setExportStatus(exported ? 'CSV export started.' : 'No verified chart rows to export.');
  };

  const handlePngExport = async () => {
    const pngName = filename.replace(/\.csv$/i, '.png');
    const exported = await downloadChartPng(chartId, pngName);
    setExportStatus(exported ? 'PNG export started.' : 'No rendered chart is available to export.');
  };

  return (
    <ActionShell>
      <ActionRow>
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
        <IconActionButton type="button" onClick={handleExport}>
          <Download size={14} aria-hidden="true" />
          CSV
        </IconActionButton>
        <IconActionButton type="button" disabled={csvRows.length === 0} onClick={handlePngExport}>
          <Download size={14} aria-hidden="true" />
          PNG
        </IconActionButton>
        <IconActionButton
          type="button"
          aria-controls={panelId}
          aria-expanded={isOpen}
          disabled={!hasRows}
          onClick={() => setIsOpen((current) => !current)}
        >
          <ListTree size={14} aria-hidden="true" />
          Details
        </IconActionButton>
      </ActionRow>

      {legendItems.length > 0 && (
        <LegendGroup role="group" aria-label={`${chartId} visible series`}>
          {legendItems.map((item) => (
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
      )}

      <SummaryText>{summary}</SummaryText>
      {exportStatus && <SummaryText role="status">{exportStatus}</SummaryText>}

      {isOpen && (
        <DrilldownPanel id={panelId}>
          {drilldownRows.map((row) => (
            <DrilldownRow key={row.id}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
              {row.detail && <DrilldownDetail>{row.detail}</DrilldownDetail>}
            </DrilldownRow>
          ))}
        </DrilldownPanel>
      )}
    </ActionShell>
  );
};

export default React.memo(ProgressChartActionBar);
