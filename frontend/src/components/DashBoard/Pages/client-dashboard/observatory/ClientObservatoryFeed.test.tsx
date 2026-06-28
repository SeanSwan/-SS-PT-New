import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ClientObservatoryFeed from './ClientObservatoryFeed';
import { SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE } from './ClientObservatoryPostIntent';
import {
  CLIENT_OVERVIEW_COACH_PROMPT,
  CLIENT_OVERVIEW_COACH_PATH,
  QUICK_ACTIONS,
  buildClientOverviewCoachPath,
  canBookSwanStudiosSessions,
  quickActionsForClientSource,
} from './ClientObservatoryData';

const noop = vi.fn();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './ClientObservatoryFeed.tsx'), 'utf8');

describe('ClientObservatoryFeed XP receipt', () => {
  it('keeps overview quick actions workout-progress-first', () => {
    expect(QUICK_ACTIONS.map((action) => action.label)).toEqual([
      'Log Workout',
      'Progress',
      'Ask Coach',
      'Book Session',
    ]);
    expect(QUICK_ACTIONS.find((action) => action.label === 'Log Workout')?.path).toBe(
      '/dashboard/client/log-workout?loadPlan=today'
    );
    expect(QUICK_ACTIONS.find((action) => action.label === 'Ask Coach')?.path).toBe(
      CLIENT_OVERVIEW_COACH_PATH
    );
    const coachUrl = new URL(CLIENT_OVERVIEW_COACH_PATH, 'https://app.local');
    expect(coachUrl.pathname).toBe('/dashboard/client/coach-assistant');
    expect(coachUrl.searchParams.get('teachPrompt')).toBe(CLIENT_OVERVIEW_COACH_PROMPT);
    expect(quickActionsForClientSource('move_fitness').map((action) => action.label)).toEqual([
      'Log Workout',
      'Progress',
      'Ask Coach',
    ]);
    expect(quickActionsForClientSource(' Move Fitness ').map((action) => action.label)).toEqual([
      'Log Workout',
      'Progress',
      'Ask Coach',
    ]);
    expect(canBookSwanStudiosSessions('move-fitness')).toBe(false);
    expect(canBookSwanStudiosSessions(' External ')).toBe(false);
  });

  it('builds a compact client overview Coach handoff without profile identifiers', () => {
    const path = buildClientOverviewCoachPath({
      level: 7,
      points: 12840,
      progress: 62,
      streakDays: 5,
      canBookSessions: false,
      tierLabel: 'Frostwing Aegis',
    });

    const coachUrl = new URL(path, 'https://app.local');
    const prompt = coachUrl.searchParams.get('teachPrompt') || '';

    expect(coachUrl.pathname).toBe('/dashboard/client/coach-assistant');
    expect(prompt).toContain('level 7');
    expect(prompt).toContain('5d streak');
    expect(prompt).toContain('62%');
    expect(prompt).toContain('12.8K XP');
    expect(prompt).toContain('book through your trainer');
    expect(prompt).toContain('one safest next action');
    expect(prompt).not.toMatch(/sean|@|client|user|id|email|phone/i);
    expect(prompt.length).toBeLessThan(320);
  });

  it('requires router navigation from the mounted client overview parent', () => {
    expect(SOURCE).toContain('onNavigate: (path: string) => void;');
    expect(SOURCE).not.toContain('onNavigate?:');
    expect(SOURCE).not.toContain('window.location.href');
  });

  it('shows the point award returned by Quick Post with deterministic receipt copy', () => {
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
    expect(screen.getByText(SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('You earned 25 points for creating a training post!')).not.toBeInTheDocument();
  });

  it('does not render raw backend receipt details in the mounted client feed', () => {
    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText=""
        creatingPost={false}
        postReceipt={{
          pointsAwarded: 10,
          message: 'postgres://private-tenant client@example.com <script>alert(1)</script>',
        }}
        quickActions={QUICK_ACTIONS}
        onPostTextChange={noop}
        onCreatePost={async () => {}}
        onNavigate={noop}
      />
    );

    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(screen.getByText(SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/postgres|private-tenant|client@example|script/i)).not.toBeInTheDocument();
  });

  it('hides malformed point-award metrics instead of rendering false XP proof', () => {
    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText=""
        creatingPost={false}
        postReceipt={{
          pointsAwarded: Number.POSITIVE_INFINITY,
          message: 'You earned Infinity points for creating a training post!',
        }}
        quickActions={QUICK_ACTIONS}
        onPostTextChange={noop}
        onCreatePost={async () => {}}
        onNavigate={noop}
      />
    );

    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText(SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE)).not.toBeInTheDocument();
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
