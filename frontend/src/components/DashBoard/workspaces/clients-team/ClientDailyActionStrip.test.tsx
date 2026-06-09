import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import ClientDailyActionStrip from './ClientDailyActionStrip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, './ClientDailyActionStrip.tsx'), 'utf8');

const handlers = {
  onLogToday: vi.fn(),
  onPlanNext: vi.fn(),
  onViewProgress: vi.fn(),
  onDictateAI: vi.fn(),
};

describe('ClientDailyActionStrip', () => {
  it('shows SwanStudios paid-session deduction context', () => {
    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={12}
        clientSource="swanstudios"
        {...handlers}
      />
    );

    expect(screen.getByText('12 paid sessions')).toBeInTheDocument();
    expect(screen.getByText(/deducts when logged/i)).toBeInTheDocument();
  });

  it('flags low SwanStudios paid-session inventory', () => {
    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={1}
        clientSource="swanstudios"
        {...handlers}
      />
    );

    expect(screen.getByText('1 paid session')).toBeInTheDocument();
    expect(screen.getByText(/refill soon/i)).toBeInTheDocument();
  });

  it('shows Move Fitness clients as free tracking with no session deduction', () => {
    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={0}
        clientSource="move_fitness"
        {...handlers}
      />
    );

    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 sessions left/i)).not.toBeInTheDocument();
  });

  it('keeps the daily action buttons wired', async () => {
    const user = userEvent.setup();
    const onLogToday = vi.fn();
    const onPlanNext = vi.fn();
    const onViewProgress = vi.fn();
    const onDictateAI = vi.fn();

    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={12}
        clientSource="swanstudios"
        onLogToday={onLogToday}
        onPlanNext={onPlanNext}
        onViewProgress={onViewProgress}
        onDictateAI={onDictateAI}
      />
    );

    await user.click(screen.getByRole('button', { name: /log today for fixture client/i }));
    await user.click(screen.getByRole('button', { name: /plan next for fixture client/i }));
    await user.click(screen.getByRole('button', { name: /view fixture client progress/i }));
    await user.click(screen.getByRole('button', { name: /dictate to swan for fixture client/i }));

    expect(onLogToday).toHaveBeenCalledTimes(1);
    expect(onPlanNext).toHaveBeenCalledTimes(1);
    expect(onViewProgress).toHaveBeenCalledTimes(1);
    expect(onDictateAI).toHaveBeenCalledTimes(1);
  });

  it('labels every daily action with the selected client context', () => {
    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={12}
        clientSource="swanstudios"
        {...handlers}
      />
    );

    expect(screen.getByRole('button', { name: /log today for fixture client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plan next for fixture client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view fixture client progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dictate to swan for fixture client/i })).toBeInTheDocument();
  });

  it('presents the coaching lane as Swan Coach instead of generic AI', () => {
    render(
      <ClientDailyActionStrip
        clientName="Fixture Client"
        workoutCount={7}
        sessionsLeft={12}
        clientSource="swanstudios"
        {...handlers}
      />
    );

    expect(screen.getByRole('button', { name: /dictate to swan for fixture client/i }))
      .toHaveTextContent('Swan Coach');
    expect(screen.queryByText('Dictate / AI')).not.toBeInTheDocument();
  });

  it('keeps phone actions compact instead of stacking into a full-screen blocker', () => {
    expect(source).toMatch(
      /@media \(max-width: 420px\)\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/
    );
  });
});
