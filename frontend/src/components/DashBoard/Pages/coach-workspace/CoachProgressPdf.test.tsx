/**
 * The coach-chat PDF is built on this device from the client's canonical charts
 * and previewed in the Approval Vault before download (Sean, 2026-09-23).
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachProgressPdf from './CoachProgressPdf';

const chartState = vi.hoisted(() => ({ current: { charts: { marker: 'charts' }, isLoading: false, error: null as string | null } }));
const adminHook = vi.hoisted(() => vi.fn());
const selfHook = vi.hoisted(() => vi.fn());
const buildPreview = vi.hoisted(() => vi.fn(async (input: unknown) => ({ blob: new Blob(['%PDF']), filename: 'r.pdf', brandWordmark: 'SwanStudios', input })));
const vaultProps = vi.hoisted(() => ({ current: null as null | { open: boolean; buildFile: () => unknown } }));

vi.mock('../../../../hooks/analytics/useAdminClientProgressCharts', () => ({
  useAdminClientProgressCharts: (id: number) => { adminHook(id); return chartState.current; },
}));
vi.mock('../../../../hooks/analytics/useClientProgressCharts', () => ({
  useClientProgressCharts: () => { selfHook(); return chartState.current; },
}));
vi.mock('../../../../context/GlobalClientContext', () => ({
  useOptionalGlobalClient: () => ({ clientList: [{ id: 84, clientSource: 'move_fitness' }] }),
}));
vi.mock('../../progress-proof/buildProgressReportSections', () => ({
  buildProgressReportSections: (charts: unknown) => [{ title: 'from', rows: [{ label: 'charts', value: JSON.stringify(charts) }] }],
}));
vi.mock('../../../../services/pdf/progressReportPdf', () => ({ buildProgressReportPdfPreview: buildPreview }));
vi.mock('../../../Shared/PdfApprovalVault', () => ({
  default: (props: { open: boolean; buildFile: () => unknown }) => {
    vaultProps.current = props;
    return props.open ? <div role="dialog" aria-label="PDF preview" /> : null;
  },
}));

beforeEach(() => {
  chartState.current = { charts: { marker: 'charts' }, isLoading: false, error: null };
  adminHook.mockClear(); selfHook.mockClear(); buildPreview.mockClear(); vaultProps.current = null;
});

describe('CoachProgressPdf', () => {
  it('opens the vault only after a real load finishes — never on the empty first render', async () => {
    const onStatus = vi.fn();
    const request = { nonce: 1, kind: 'client' as const, clientId: 84, clientName: 'Jesse Moreno' };
    const view = render(<CoachProgressPdf request={request} onClose={vi.fn()} onStatus={onStatus} />);
    expect(screen.queryByRole('dialog')).toBeNull(); // initial "not loading" is not "loaded"
    expect(adminHook).toHaveBeenCalledWith(84);

    chartState.current = { ...chartState.current, isLoading: true };
    view.rerender(<CoachProgressPdf request={request} onClose={vi.fn()} onStatus={onStatus} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onStatus).toHaveBeenLastCalledWith("Gathering Jesse Moreno's charts for the PDF…");

    chartState.current = { ...chartState.current, isLoading: false };
    view.rerender(<CoachProgressPdf request={request} onClose={vi.fn()} onStatus={onStatus} />);
    expect(screen.getByRole('dialog', { name: 'PDF preview' })).toBeInTheDocument();
    expect(onStatus).toHaveBeenLastCalledWith(null);

    await act(async () => { await vaultProps.current!.buildFile(); });
    expect(buildPreview).toHaveBeenCalledWith(expect.objectContaining({
      clientName: 'Jesse Moreno', // the roster name, printed locally
      clientSource: 'move_fitness', // white-labelled by the SUBJECT client
      sections: [{ title: 'from', rows: [{ label: 'charts', value: '{"marker":"charts"}' }] }],
    }));
  });

  it('a load failure says so and closes instead of printing a blank report', () => {
    const onStatus = vi.fn();
    const onClose = vi.fn();
    chartState.current = { ...chartState.current, error: 'Forbidden' };
    render(<CoachProgressPdf request={{ nonce: 2, kind: 'client', clientId: 84, clientName: 'Jesse Moreno' }} onClose={onClose} onStatus={onStatus} />);
    expect(onStatus).toHaveBeenCalledWith("Could not load Jesse Moreno's records for the PDF: Forbidden");
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a client asking for their own report uses the self-scoped charts, never a client id', () => {
    render(<CoachProgressPdf request={{ nonce: 3, kind: 'self', clientName: 'Ava Stone' }} onClose={vi.fn()} onStatus={vi.fn()} />);
    expect(selfHook).toHaveBeenCalled();
    expect(adminHook).not.toHaveBeenCalled();
  });

  it('CONTROL: no request mounts nothing and fetches nothing', () => {
    render(<CoachProgressPdf request={null} onClose={vi.fn()} onStatus={vi.fn()} />);
    expect(adminHook).not.toHaveBeenCalled();
    expect(selfHook).not.toHaveBeenCalled();
  });
});
