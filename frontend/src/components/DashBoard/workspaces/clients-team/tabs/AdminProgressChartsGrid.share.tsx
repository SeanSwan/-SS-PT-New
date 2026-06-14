/**
 * COMPONENT: AdminProgressChartsGrid.share
 * PURPOSE: Client Hub proof-card sharing for trainer/admin progress pulse cards.
 */

import React, { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { ChartPoint } from '../../../../../hooks/analytics/useClientProgressCharts.types';
import {
  type ProgressChartCsvRow,
  type ProgressChartPulse,
} from '../../../progress-proof/progressChartActions';
import { buildProgressShareCard } from '../../../progress-proof/progressShareCard';
import ProgressChartStudio from '../../../progress-proof/ProgressChartStudio';
import { AdminShareButton } from './AdminProgressChartsGrid.styles';

interface AdminProgressProofShareProps {
  chartId: string;
  csvRows: ProgressChartCsvRow[];
  filename: string;
  pulse: ProgressChartPulse;
  summary: string;
  title: string;
}

const rowForPoint = (
  point: ChartPoint,
  label: string,
  valueKey: string,
): ProgressChartCsvRow => ({
  [label]: point.x,
  [valueKey]: Math.round(point.y),
});

export const chartRowsForPoints = (
  points: ChartPoint[],
  label: string,
  valueKey: string,
): ProgressChartCsvRow[] => points.map((point) => rowForPoint(point, label, valueKey));

export const buildSetsRepsShareRows = (
  sets: ChartPoint[],
  reps: ChartPoint[],
): ProgressChartCsvRow[] => {
  const rows = new Map<string, ProgressChartCsvRow>();

  sets.forEach((point) => rows.set(point.x, { period: point.x, sets: Math.round(point.y) }));
  reps.forEach((point) => {
    const current = rows.get(point.x) || { period: point.x };
    rows.set(point.x, { ...current, reps: Math.round(point.y) });
  });

  return Array.from(rows.values());
};

const AdminProgressProofShare: React.FC<AdminProgressProofShareProps> = ({
  chartId,
  csvRows,
  filename,
  pulse,
  summary,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const card = useMemo(() => buildProgressShareCard({
    chartTitle: title,
    csvRows,
    pulse,
    rangeLabel: 'selected client progress',
    summary,
  }), [csvRows, pulse, summary, title]);

  return (
    <>
      <AdminShareButton type="button" onClick={() => setIsOpen(true)}>
        <Share2 size={14} aria-hidden="true" />
        Share Proof
      </AdminShareButton>
      <ProgressChartStudio
        card={card}
        chartId={chartId}
        filename={filename}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default React.memo(AdminProgressProofShare);
