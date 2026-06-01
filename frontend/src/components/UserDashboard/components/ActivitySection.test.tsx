import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivitySection from './ActivitySection';

const { mockUseProfile } = vi.hoisted(() => ({
  mockUseProfile: vi.fn(),
}));

vi.mock('../../../hooks/profile/useProfile', () => ({
  useProfile: mockUseProfile,
}));

describe('ActivitySection', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      stats: {
        workouts: 12,
        streak: 5,
        followers: 42,
        level: 7,
      },
      posts: [
        {
          id: 'post-1',
          type: 'general',
          content: 'General post update',
          createdAt: '2026-04-08T10:00:00.000Z',
        },
        {
          id: 'post-2',
          type: 'workout',
          content: 'Workout logged today',
          createdAt: '2026-04-08T09:00:00.000Z',
        },
        {
          id: 'post-3',
          type: 'achievement',
          content: 'Achievement unlocked',
          createdAt: '2026-04-08T08:00:00.000Z',
        },
        {
          id: 'post-4',
          type: 'challenge',
          content: 'Challenge joined',
          createdAt: '2026-04-08T07:00:00.000Z',
        },
        {
          id: 'post-5',
          type: 'milestone',
          content: 'Milestone reached',
          createdAt: '2026-04-08T06:00:00.000Z',
        },
      ],
      isLoadingStats: false,
      isLoadingPosts: false,
    } as any);
  });

  it('filters posts into the visible activity categories users can actually select', async () => {
    const user = userEvent.setup();

    render(<ActivitySection />);

    await user.click(screen.getByRole('button', { name: /posts/i }));
    expect(screen.getAllByText('General post update').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryAllByText('Workout logged today')).toHaveLength(0);
    });

    await user.click(screen.getByRole('button', { name: /progress/i }));
    expect(screen.getAllByText('Challenge joined').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Milestone reached').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryAllByText('General post update')).toHaveLength(0);
    });
  });

  it('lets mobile users tap an achievement icon to read why they earned it', async () => {
    const user = userEvent.setup();

    render(<ActivitySection />);

    const detailsToggle = await screen.findByRole('button', {
      name: /show achievement details for achievement unlocked/i,
    });
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(detailsToggle);

    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true');
    const detailsPanel = screen.getByRole('region', {
      name: /achievement details for achievement unlocked/i,
    });
    expect(within(detailsPanel).getByText(/why you earned it/i)).toBeInTheDocument();
    expect(within(detailsPanel).getByText(/achievement unlocked/i)).toBeInTheDocument();
  });
});
