import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientObservatoryFeed from './ClientObservatoryFeed';
import { QUICK_ACTIONS, quickActionsForClientSource } from './ClientObservatoryData';

const noop = vi.fn();

describe('ClientObservatoryFeed XP receipt', () => {
  it('keeps overview quick actions workout-progress-first', () => {
    expect(QUICK_ACTIONS.map((action) => action.label)).toEqual([
      'Log Workout',
      'Progress',
      'Book Session',
    ]);
    expect(quickActionsForClientSource('move_fitness').map((action) => action.label)).toEqual([
      'Log Workout',
      'Progress',
    ]);
  });

  it('shows the point award returned by Quick Post', () => {
    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText=""
        creatingPost={false}
        postReceipt={{
          pointsAwarded: 25,
          message: 'You earned 25 points for creating a training post!',
        }}
        quickActions={QUICK_ACTIONS}
        onPostTextChange={noop}
        onCreatePost={async () => {}}
        onNavigate={noop}
      />
    );

    expect(screen.getByText('+25 XP')).toBeInTheDocument();
    expect(screen.getByText('You earned 25 points for creating a training post!')).toBeInTheDocument();
  });

  it('submits smart inferred canonical post type and hashtags from the active client composer', async () => {
    const user = userEvent.setup();
    const onCreatePost = vi.fn().mockResolvedValue(undefined);

    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText="New PR on squats today"
        creatingPost={false}
        postReceipt={null}
        quickActions={QUICK_ACTIONS}
        onPostTextChange={noop}
        onCreatePost={onCreatePost}
        onNavigate={noop}
      />
    );

    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(onCreatePost).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('#Milestone'),
      type: 'achievement',
      visibility: 'friends',
    }));
    expect(onCreatePost.mock.calls[0][0].type).not.toBe('training');
  });

  it('does not leak broad observatory category labels as backend post types', async () => {
    const user = userEvent.setup();
    const onCreatePost = vi.fn().mockResolvedValue(undefined);

    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText="Meal prep is ready for tomorrow"
        creatingPost={false}
        postReceipt={null}
        quickActions={QUICK_ACTIONS}
        onPostTextChange={noop}
        onCreatePost={onCreatePost}
        onNavigate={noop}
      />
    );

    await user.click(screen.getByRole('button', { name: /^nutrition$/i }));
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(onCreatePost).toHaveBeenCalledWith(expect.objectContaining({
      type: 'general',
      visibility: 'friends',
    }));
    expect(onCreatePost.mock.calls[0][0].type).not.toBe('nutrition');
  });
});
