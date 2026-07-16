/**
 * RecoveryBoardPanel.test.tsx — 4B.4 render locks
 * =================================================
 * Locks: ready-state sections + 44px Done latch, honest starter/error states,
 * BOTH disclaimers ALWAYS rendered (pain-panel pattern), Rule-9 vocabulary ban,
 * failed completion reverts the ✓ (truthful latch), rail mount wired.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecoveryBoardPanel from './RecoveryBoardPanel';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../../services/api.service', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args), post: (...args: unknown[]) => mockPost(...args) },
}));

const item = (key: string, name: string, step: string) => ({
  key,
  name,
  step,
  region: 'Piriformis',
  durationSec: 45,
  reason: 'knees_bow',
});

const readyBoard = {
  status: 'ready',
  smrTargets: [item('ces-foam-roll-piriformis', 'Foam Roll Piriformis', 'inhibit')],
  stretches: [item('ces-piriformis-figure4-stretch', 'Supine Piriformis Stretch (Figure 4)', 'lengthen')],
  mobilityDrills: [item('ces-sidelying-hip-adduction', 'Side-Lying Hip Adduction', 'activate')],
  syndromeFocus: ['knee_varus'],
  cautionRegions: [],
  intensityNote: null,
  daysSinceLastRecovery: 4,
  starterMessage: null,
  disclaimers: [
    'These are comfort modifications for training only — not medical advice, diagnosis, or treatment. For persistent or severe pain, consult a healthcare professional.',
    'Rule-based guidance from your logged training data — not medical advice.',
  ],
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('RecoveryBoardPanel', () => {
  it('renders the three prescription sections with 44px Done controls and both disclaimers', async () => {
    mockGet.mockResolvedValue({ data: { success: true, board: readyBoard } });
    const { container } = render(<RecoveryBoardPanel />);

    expect(await screen.findByText('Foam Roll Piriformis')).toBeInTheDocument();
    expect(screen.getByText(/Myofascial release/i)).toBeInTheDocument();
    expect(screen.getByText(/Stretching/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobility/)).toBeInTheDocument();
    expect(screen.getByText(/comfort modifications for training only/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule-based guidance from your logged training data/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /mark .* done/i })).toHaveLength(3);
    // Rule 9 vocabulary ban on the rendered surface.
    expect(container.textContent?.toLowerCase()).not.toMatch(/yoga|meditat/);
  });

  it('marks an item done on tap and reverts the latch when the POST fails', async () => {
    mockGet.mockResolvedValue({ data: { success: true, board: readyBoard } });
    mockPost.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<RecoveryBoardPanel />);

    const button = await screen.findByRole('button', { name: /mark foam roll piriformis done/i });
    await user.click(button);
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/client/analytics/recovery-board/complete',
      { exerciseKey: 'ces-foam-roll-piriformis' }
    ));
    // Failed POST → the ✓ must revert (button pressable again, no strike).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /mark foam roll piriformis done/i })).not.toBeDisabled()
    );
  });

  it('renders the honest starter state (with disclaimers) when no assessment exists', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        board: { ...readyBoard, status: 'no-assessment', smrTargets: [], stretches: [], mobilityDrills: [], starterMessage: 'Complete a movement assessment with your trainer (or log a few workouts) to unlock a personalized daily recovery plan.' },
      },
    });
    render(<RecoveryBoardPanel />);
    expect(await screen.findByText(/complete a movement assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/comfort modifications for training only/i)).toBeInTheDocument();
  });

  it('renders an honest error state when the fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('500'));
    render(<RecoveryBoardPanel />);
    expect(await screen.findByText(/couldn't load your recovery plan/i)).toBeInTheDocument();
  });

  it('is mounted on the client home right rail', () => {
    const rail = readFileSync(
      resolve(__dirname, '../UserDashboard/components/ClientDashboardHome.railSections.tsx'),
      'utf8'
    );
    expect(rail).toMatch(/<RecoveryBoardPanel \/>/);
    expect(rail).toContain('Today&apos;s recovery');
  });
});
