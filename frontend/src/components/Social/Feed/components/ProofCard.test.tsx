/**
 * ProofCard — S2 contract (Social Feed Upgrade, MEGA-BLUEPRINT §4.4)
 * ===========================================================================
 * Locks the S2 acceptance criteria: renders only the viewer's own session, posts to the
 * feed through the EXISTING route (no new write path), and never fabricates a comparison
 * when the member has no history to compare against.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProofCard from './ProofCard';

const { mockUseAuth, mockGet, mockPost } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

// Victory renders SVG through its own lifecycle; a stub keeps the contract under test
// (which metrics reach the DOM) rather than the charting library's internals.
vi.mock('victory', () => ({
  VictoryChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="victory-chart">{children}</div>,
  VictoryAxis: () => <div data-testid="victory-axis" />,
  VictoryBar: ({ data }: { data: unknown[] }) => (
    <div data-testid="victory-bar" data-points={data.length} />
  ),
}));

const payload = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 's-1',
  memberDisplayName: 'Sean',
  workoutName: 'Push Day',
  date: '2026-09-18',
  durationMin: 52,
  totalVolume: 12400,
  totalReps: 180,
  setsCount: 21,
  xpEarned: 120,
  streakDays: 4,
  baseline: { windowDays: 30, sampleSize: 6, avgSets: 18, avgVolume: 11000 },
  ...overrides,
});

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { success: true } });
  mockUseAuth.mockReturnValue({ authAxios: { get: mockGet, post: mockPost } });
});

describe('ProofCard — own-stats rendering', () => {
  it('renders the real logged metrics from the session', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    render(<ProofCard sessionId="s-1" />);

    await waitFor(() => expect(screen.getByTestId('proof-card')).toBeInTheDocument());
    // The export node duplicates these strings by design (it is the share image), so
    // assert against the visible stat strip specifically.
    const stats = within(screen.getByTestId('proof-card-stats'));
    expect(screen.getByRole('heading', { name: 'Push Day' })).toBeInTheDocument();
    expect(stats.getByText('12,400')).toBeInTheDocument();
    expect(stats.getByText('21')).toBeInTheDocument();
    expect(stats.getByText('180')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/social/proof-card/s-1');
  });

  it('compares sets against the member\'s own baseline when history exists', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    render(<ProofCard sessionId="s-1" />);

    await waitFor(() => expect(screen.getByTestId('proof-card-chart')).toBeInTheDocument());
    expect(screen.getByText(/3\.0 above your usual/)).toBeInTheDocument();
  });

  it('omits the chart entirely rather than inventing a baseline with no history', async () => {
    mockGet.mockResolvedValue({
      data: { proofCard: payload({ baseline: { windowDays: 30, sampleSize: 0, avgSets: 0, avgVolume: 0 } }) },
    });
    render(<ProofCard sessionId="s-1" />);

    await waitFor(() => expect(screen.getByTestId('proof-card')).toBeInTheDocument());
    expect(screen.queryByTestId('proof-card-chart')).not.toBeInTheDocument();
    expect(screen.getByText(/Log a few more sessions/)).toBeInTheDocument();
  });

  it('shows an honest message for a session that is not completed (409)', async () => {
    mockGet.mockRejectedValue({ response: { status: 409 } });
    render(<ProofCard sessionId="s-1" />);

    await waitFor(() =>
      expect(screen.getByText('Only completed workouts have a proof card.')).toBeInTheDocument(),
    );
  });

  it('shows an honest message when the session is not the viewer\'s (404)', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });
    render(<ProofCard sessionId="s-1" />);

    await waitFor(() => expect(screen.getByText(/could not load that proof card/)).toBeInTheDocument());
  });
});

describe('ProofCard — actions', () => {
  it('posts to the feed through the existing posts route, not a new endpoint', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    const onPosted = vi.fn();
    render(<ProofCard sessionId="s-1" onPosted={onPosted} />);

    await userEvent.click(await screen.findByRole('button', { name: /Post this proof card/ }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/social/posts', {
        content: 'Push Day — 12,400 lb moved across 21 sets.',
        type: 'workout',
        workoutSessionId: 's-1',
      }),
    );
    expect(onPosted).toHaveBeenCalled();
    expect(screen.getByText('Posted to your feed.')).toBeInTheDocument();
  });

  it('reports a failed post honestly instead of claiming success', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    mockPost.mockRejectedValue(new Error('network'));
    render(<ProofCard sessionId="s-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Post this proof card/ }));

    await waitFor(() => expect(screen.getByText(/did not go through/)).toBeInTheDocument());
  });

  it('copies the caption when the platform has no native share sheet', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: undefined, clipboard: { writeText } });

    render(<ProofCard sessionId="s-1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Share this proof card/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Push Day — 12,400 lb moved across 21 sets.'));
    expect(screen.getByText(/Caption copied/)).toBeInTheDocument();
  });

  it('treats a cancelled share sheet as a non-event, not a failure', async () => {
    mockGet.mockResolvedValue({ data: { proofCard: payload() } });
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(abort) });

    render(<ProofCard sessionId="s-1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Share this proof card/ }));

    await waitFor(() => expect(screen.queryByText(/did not complete/)).not.toBeInTheDocument());
  });
});
