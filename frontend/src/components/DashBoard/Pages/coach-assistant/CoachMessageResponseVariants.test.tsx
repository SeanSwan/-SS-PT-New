import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CoachMessage } from './CoachMessage';
import type { CoachMessageData } from './SwanCoachTypes';

function assistantMessage(content: string): CoachMessageData {
  return {
    id: 'msg-response-variants',
    role: 'assistant',
    content,
    timestamp: '2026-06-14T12:00:00.000Z',
  };
}

describe('CoachMessage response style variants', () => {
  it('switches a normal assistant answer between Science and Keep It 100 without showing both at once', async () => {
    const user = userEvent.setup();
    render(
      <CoachMessage
        message={assistantMessage([
          '**Science**',
          'Mechanical tension is the adaptation signal when form stays clean.',
          '',
          '**Keep It 100**',
          'Pick a weight you control, finish the reps, then earn the next jump.',
        ].join('\n'))}
      />,
    );

    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Keep It 100' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Mechanical tension is the adaptation signal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pick a weight you control/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));

    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Keep It 100' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/Mechanical tension is the adaptation signal/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Pick a weight you control/i)).toBeInTheDocument();
  });

  it('keeps ordinary assistant messages on the markdown renderer path', () => {
    render(<CoachMessage message={assistantMessage('**Train today:** log the session, then review progress.')} />);

    expect(screen.queryByRole('button', { name: 'Science' })).not.toBeInTheDocument();
    expect(screen.getByText(/Train today/i)).toBeInTheDocument();
    expect(screen.getByText(/log the session/i)).toBeInTheDocument();
  });

  it('copies and reads the visible answer variant instead of the hidden full response', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const readAloud = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <CoachMessage
        message={assistantMessage([
          'Science: Mechanical tension is the adaptation signal.',
          '',
          'Keep it 100: Control the weight, finish clean reps, then go up.',
        ].join('\n'))}
        onReadAloud={readAloud}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));
    await user.click(screen.getByRole('button', { name: 'Copy message' }));
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));

    expect(writeText).toHaveBeenCalledWith('Control the weight, finish clean reps, then go up.');
    expect(readAloud).toHaveBeenCalledWith('Control the weight, finish clean reps, then go up.');
  });
});
