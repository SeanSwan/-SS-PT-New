import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetsRepsTrendCard, WeeklyVolumeCard } from './CanonicalProgressChartsGrid.interactiveCards';

const mockAuthPost = vi.hoisted(() => vi.fn());

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { post: mockAuthPost },
  }),
}));

describe('Canonical progress interactive cards', () => {
  beforeEach(() => {
    mockAuthPost.mockReset();
  });

  it('renders weekly volume range controls and a verified-data drilldown', () => {
    render(<WeeklyVolumeCard data={[
      { x: 'W1', y: 1200, workouts: 1 },
      { x: 'W2', y: 2400, workouts: 2 },
    ]} />);

    expect(screen.getByText('Weekly Training Volume')).toBeTruthy();
    expect(screen.getByText('Volume Pulse')).toBeTruthy();
    expect(screen.getByText('+100% vs prior')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recent' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('2 logged workouts in this point.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByRole('dialog', { name: /weekly training volume share card/i })).toBeTruthy();
    expect(screen.getByText('Shareable proof card')).toBeTruthy();
    expect(screen.getByText('Copy Caption')).toBeTruthy();
    expect(screen.getByText('Share to Feed')).toBeTruthy();
    expect((screen.getByLabelText('Progress proof caption') as HTMLTextAreaElement).value)
      .toContain('Volume Pulse: +100% vs prior');
  });

  it('shares weekly volume proof to the social milestone feed from chart studio', async () => {
    mockAuthPost.mockResolvedValue({ data: { post: { id: 'post-1' } } });

    render(<WeeklyVolumeCard data={[
      { x: 'W1', y: 1200, workouts: 1 },
      { x: 'W2', y: 2400, workouts: 2 },
    ]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share to Feed' }));

    await waitFor(() => expect(mockAuthPost).toHaveBeenCalledTimes(1));
    const [url, formData] = mockAuthPost.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(formData.get('type')).toBe('milestone');
    expect(formData.get('content')).toContain('Progress Proof: Weekly Training Volume');
    expect(screen.getByText('Shared to the feed.')).toBeTruthy();
  });

  it('renders sets/reps legend toggles that can isolate a series', () => {
    render(<SetsRepsTrendCard bundle={{
      sets: [{ x: 'W1', y: 10 }, { x: 'W2', y: 12 }],
      reps: [{ x: 'W1', y: 80 }, { x: 'W2', y: 96 }],
    }} />);

    const repsToggle = screen.getByRole('button', { name: 'Reps' });
    expect(screen.getByText('Rep Pulse')).toBeTruthy();
    expect(screen.getByText('+20% vs prior')).toBeTruthy();
    expect(repsToggle.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(repsToggle);
    expect(repsToggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Set Pulse')).toBeTruthy();
    expect(screen.getByText(/toggle sets and reps/i)).toBeTruthy();
  });
});
