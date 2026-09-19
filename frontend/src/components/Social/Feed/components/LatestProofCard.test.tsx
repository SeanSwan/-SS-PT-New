/**
 * LatestProofCard — S2.5 wiring contract
 * ===========================================================================
 * Added after the hostile review flagged that ProofCard shipped with no live mount point
 * (the same defect class as S1's orphaned dock). These tests fail if the card is orphaned
 * again or if it starts rendering an empty shell when the member has no proof yet.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import LatestProofCard from './LatestProofCard';

const { mockUseAuth, mockGet } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockGet: vi.fn() }));

vi.mock('../../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

// The ProofCard child is exercised by its own suite; here we only assert the gate.
vi.mock('./ProofCard', () => ({
  default: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="proof-card-mounted" data-session={sessionId} />
  ),
}));

const homeSource = readFileSync(
  resolve(__dirname, '../../../UserDashboard/components/ClientDashboardHome.tsx'),
  'utf8',
);

beforeEach(() => {
  mockGet.mockReset();
  mockUseAuth.mockReturnValue({ authAxios: { get: mockGet } });
});

describe('LatestProofCard — live entry point', () => {
  it('renders nothing while the lookup is in flight', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { container } = render(<LatestProofCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the proof card for the member\'s most recent completed session', async () => {
    mockGet.mockResolvedValue({ data: { success: true, proofCard: { sessionId: 's-9' } } });
    render(<LatestProofCard />);
    await waitFor(() => expect(screen.getByTestId('proof-card-mounted')).toBeInTheDocument());
    expect(screen.getByTestId('proof-card-mounted')).toHaveAttribute('data-session', 's-9');
    expect(mockGet).toHaveBeenCalledWith('/api/social/proof-card/latest');
  });

  it('renders nothing when the member has no completed session (204)', async () => {
    mockGet.mockResolvedValue({ status: 204, data: '' });
    const { container } = render(<LatestProofCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the lookup fails — no error shell on Home', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { container } = render(<LatestProofCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('is mounted on the live Home surface', () => {
    expect(homeSource).toContain("from '../../Social/Feed/components/LatestProofCard'");
    expect(homeSource).toContain('<LatestProofCard />');
  });
});
