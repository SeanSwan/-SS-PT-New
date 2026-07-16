/**
 * ProgressReportPdfButton (A3 vault flow) wiring tests.
 * The button no longer downloads directly — it opens the Approval Vault, whose
 * buildFile callback assembles the report input (sections from the charts
 * bundle, neutral name fallback, subject clientSource) for the preview builder.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';

const vaultProps = vi.hoisted(() => [] as Array<{
  open: boolean;
  documentLabel?: string;
  buildFile: () => Promise<unknown> | unknown;
}>);

vi.mock('../../Shared/PdfApprovalVault', () => ({
  default: (props: (typeof vaultProps)[number]) => {
    vaultProps.push(props);
    return props.open ? <div data-testid="approval-vault" data-label={props.documentLabel} /> : null;
  },
}));

interface PreviewInput {
  clientName: string;
  clientSource?: string | null;
  sections: Array<{ rows: unknown[] }>;
}

const mocks = vi.hoisted(() => ({
  buildPreview: vi.fn(async (_input: PreviewInput) => ({
    blob: new Blob(['%PDF'], { type: 'application/pdf' }),
    filename: 'SwanStudios-Progress-Report-Client.pdf',
    brandWordmark: 'SwanStudios',
  })),
}));

vi.mock('../../../services/pdf/progressReportPdf', () => ({
  buildProgressReportPdfPreview: mocks.buildPreview,
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

import ProgressReportPdfButton from './ProgressReportPdfButton';

describe('ProgressReportPdfButton (Approval Vault flow)', () => {
  beforeEach(() => {
    vaultProps.length = 0;
    mocks.buildPreview.mockClear();
  });

  it('opens the Approval Vault (not a direct download) on tap', () => {
    render(<ProgressReportPdfButton charts={charts} clientName="Client FortyTwo" />);
    expect(screen.queryByTestId('approval-vault')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /download progress report pdf/i }));

    expect(screen.getByTestId('approval-vault')).toBeInTheDocument();
    expect(screen.getByTestId('approval-vault').getAttribute('data-label')).toBe('progress report');
    // Nothing builds until the vault itself calls buildFile.
    expect(mocks.buildPreview).not.toHaveBeenCalled();
  });

  it('builds the report from the charts bundle with the subject clientSource', async () => {
    render(
      <ProgressReportPdfButton charts={charts} clientName="MF Client" clientSource="move_fitness" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download progress report pdf/i }));

    await vaultProps.at(-1)!.buildFile();

    await waitFor(() => expect(mocks.buildPreview).toHaveBeenCalledTimes(1));
    const input = mocks.buildPreview.mock.calls[0][0];
    expect(input.clientName).toBe('MF Client');
    expect(input.clientSource).toBe('move_fitness');
    expect(input.sections).toHaveLength(15);
    expect(input.sections[0].rows).toEqual([{ id: 'Wk 1', label: 'Wk 1', value: '3 workouts' }]);
  });

  it('defaults the header name to a brand-neutral label when unnamed', async () => {
    render(<ProgressReportPdfButton charts={charts} />);
    fireEvent.click(screen.getByRole('button', { name: /download progress report pdf/i }));

    await vaultProps.at(-1)!.buildFile();

    // Neutral fallback — an unnamed Move Fitness client must not be stamped "SwanStudios".
    expect(mocks.buildPreview.mock.calls[0][0].clientName).toBe('Client');
  });
});
