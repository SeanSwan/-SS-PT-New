import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProgressReportPdfButton from './ProgressReportPdfButton';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';

const mocks = vi.hoisted(() => ({
  download: vi.fn(async () => true),
}));

vi.mock('../../../services/pdf/progressReportPdf', () => ({
  downloadProgressReportPdf: mocks.download,
}));

const charts = {
  workoutFrequency: [{ x: 'Wk 1', y: 3 }],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 0,
    totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
  },
  weeklyVolume: [],
  setsRepsTrend: { sets: [], reps: [] },
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
  weightTrend: [],
  bodyFatTrend: [],
  estOneRm: { exercise: null, data: [] },
} as CanonicalProgressCharts;

describe('ProgressReportPdfButton', () => {
  beforeEach(() => {
    mocks.download.mockClear();
    mocks.download.mockResolvedValue(true);
  });

  it('builds the report from the charts bundle and downloads on tap', async () => {
    render(<ProgressReportPdfButton charts={charts} clientName="Client FortyTwo" />);

    fireEvent.click(screen.getByRole('button', { name: /download progress report pdf/i }));

    await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1));
    const input = mocks.download.mock.calls[0][0];
    expect(input.clientName).toBe('Client FortyTwo');
    expect(input.sections).toHaveLength(15);
    expect(input.sections[0].rows).toEqual([{ id: 'Wk 1', label: 'Wk 1', value: '3 workouts' }]);
  });

  it('defaults the header name and surfaces an honest failure note', async () => {
    mocks.download.mockRejectedValueOnce(new Error('boom'));
    render(<ProgressReportPdfButton charts={charts} />);

    fireEvent.click(screen.getByRole('button', { name: /download progress report pdf/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/try again/i));
    expect(mocks.download.mock.calls[0][0].clientName).toBe('SwanStudios Client');
  });
});
