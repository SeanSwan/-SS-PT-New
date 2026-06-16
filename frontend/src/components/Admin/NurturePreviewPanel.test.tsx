/**
 * Render smoke for NurturePreviewPanel — proves the read-only framing, the
 * dry-run data rendering, and the empty state. The hook is mocked so no network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NurturePreviewPanel from './NurturePreviewPanel';

const { mockUseNurturePreview } = vi.hoisted(() => ({ mockUseNurturePreview: vi.fn() }));
vi.mock('../../hooks/useNurturePreview', () => ({ useNurturePreview: mockUseNurturePreview }));

const baseResult = {
  preview: {
    dryRun: true,
    total: 0,
    summary: { wouldSend: 0, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 },
    byReason: {},
    items: [],
  },
  templates: [],
  isLoading: false,
  error: null as string | null,
  refetch: vi.fn(),
};

beforeEach(() => mockUseNurturePreview.mockReset());

describe('NurturePreviewPanel', () => {
  it('renders the read-only dry-run framing and the audience rows', () => {
    mockUseNurturePreview.mockReturnValue({
      ...baseResult,
      preview: {
        dryRun: true,
        total: 1,
        summary: { wouldSend: 1, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 },
        byReason: { ok_to_send: 1 },
        items: [{ id: 1, userId: 9, leadId: null, recipientKind: 'user', channel: 'sms', templateName: 'welcome', action: 'send', reason: 'ok_to_send', hasPhone: true, suppressed: false }],
      },
    });

    render(<NurturePreviewPanel />);

    // read-only framing — the whole point of this panel
    expect(screen.getByText(/SENDS NOTHING/i)).toBeTruthy();
    expect(screen.getByText(/never sends or changes anything/i)).toBeTruthy();
    // PII-safe recipient label (IDs only) + decision ("Would send" appears in both
    // the summary tile and the item action pill — assert at least one renders)
    expect(screen.getByText('User #9')).toBeTruthy();
    expect(screen.getAllByText(/Would send/i).length).toBeGreaterThan(0);
    // a refresh control exists; there is NO send/test-send button on this read-only surface
    expect(screen.getByRole('button', { name: /refresh nurture preview/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /test.?send|send a|process/i })).toBeNull();
  });

  it('shows the empty state when nothing is due', () => {
    mockUseNurturePreview.mockReturnValue(baseResult);
    render(<NurturePreviewPanel />);
    expect(screen.getByText(/nothing would send if armed/i)).toBeTruthy();
  });

  it('surfaces an error without crashing', () => {
    mockUseNurturePreview.mockReturnValue({ ...baseResult, error: 'Network error loading nurture preview' });
    render(<NurturePreviewPanel />);
    expect(screen.getByText(/Network error loading nurture preview/i)).toBeTruthy();
  });
});
