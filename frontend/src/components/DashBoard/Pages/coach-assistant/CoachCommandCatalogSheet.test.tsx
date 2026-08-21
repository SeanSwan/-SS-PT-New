/**
 * Regression (v2 P1.3): the command catalog is sourced from the live
 * role-scoped registry endpoint, stages examples into the composer, and
 * fails honestly when the list cannot load.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiService from '../../../../services/api.service';
import CoachCommandCatalogSheet from './CoachCommandCatalogSheet';

vi.mock('../../../../services/api.service', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const getMock = apiService.get as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  getMock.mockReset();
});

describe('CoachCommandCatalogSheet', () => {
  it('lists registry commands grouped by category and stages the tapped example', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        commands: [
          { type: 'log_workout', description: 'Log a workout for a client', category: 'Workouts', examples: ['Log a workout for client 84'] },
          { type: 'view_available_slots', description: 'Show open schedule slots', category: 'Schedule', examples: ['View available slots this week'] },
        ],
      },
    });
    const onUsePrompt = vi.fn();
    const onClose = vi.fn();
    render(<CoachCommandCatalogSheet open onClose={onClose} onUsePrompt={onUsePrompt} />);

    expect(await screen.findByText('Log workout')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/ai-command/commands');
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /use example for log workout/i }));
    expect(onUsePrompt).toHaveBeenCalledWith('Log a workout for client 84');
    expect(onClose).toHaveBeenCalled();
  });


  /**
   * S5 (2026-08-21). The endpoint has always returned canExecute / executionLane /
   * manualOnlyReason per command; this sheet dropped them, so a panel titled
   * "What Swan Coach can do" listed commands Swan Coach cannot do — 5 of 139 at
   * 66ffde607. These lock the honest rendering.
   */
  it('flags commands the coach cannot actually execute, and leaves working ones unbadged', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        commands: [
          {
            type: 'log_workout',
            description: 'Log a workout for a client',
            category: 'Workouts',
            examples: ['Log a workout for client 84'],
            executionLane: 'server_dispatch',
            canExecute: true,
          },
          {
            type: 'run_ai_village',
            description: 'Run the validation village',
            category: 'System',
            examples: ['Run the AI village'],
            executionLane: 'manual_only',
            canExecute: false,
            manualOnly: true,
            manualOnlyReason: 'Costs money and needs explicit approval.',
          },
          {
            type: 'nutrition_advice',
            description: 'Answer a nutrition question',
            category: 'Nutrition',
            examples: ['What should I eat after training?'],
            executionLane: 'chat_fallback',
            canExecute: false,
          },
        ],
      },
    });
    render(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);

    expect(await screen.findByText('Log workout')).toBeInTheDocument();

    // manual_only surfaces its registry-supplied reason verbatim, not a generic string.
    expect(screen.getByText('Do it yourself')).toBeInTheDocument();
    expect(screen.getByText('Costs money and needs explicit approval.')).toBeInTheDocument();

    // chat_fallback is a different truth: it works, just not as an action.
    expect(screen.getByText('Answered in chat')).toBeInTheDocument();

    // Exactly two badges — the executable command must NOT be labelled. A badge on
    // everything communicates nothing.
    expect(screen.queryAllByText(/do it yourself|answered in chat|not available/i)).toHaveLength(2);

    // Screen-reader users hear the limitation with the name, not several nodes later.
    expect(
      screen.getByRole('button', { name: /run ai village — do it yourself/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /use example for log workout/i })
    ).toBeInTheDocument();
  });

  it('treats a not_wired command as unavailable rather than silently advertising it', async () => {
    // The backend coverage lock keeps this bucket empty today. If one ever slips
    // through, the sheet must say so.
    getMock.mockResolvedValue({
      data: {
        success: true,
        commands: [
          { type: 'ghost_command', category: 'System', examples: ['Do the ghost thing'], executionLane: 'not_wired', canExecute: false },
        ],
      },
    });
    render(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
  });

  it('fails honestly when the registry cannot be loaded', async () => {
    getMock.mockRejectedValue(new Error('boom'));
    render(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);
    await waitFor(() => expect(screen.getByText(/could not be loaded right now/i)).toBeInTheDocument());
    expect(screen.getByText(/still talk normally/i)).toBeInTheDocument();
  });

  it('clears prior role-scoped commands while a reopened catalog refreshes', async () => {
    getMock.mockResolvedValueOnce({ data: { success: true, commands: [{ type: 'admin_only', category: 'Admin', examples: ['Run admin action'] }] } });
    const view = render(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);
    expect(await screen.findByText('Admin only')).toBeInTheDocument();
    view.rerender(<CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />);
    getMock.mockReturnValueOnce(new Promise(() => undefined));
    view.rerender(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);
    expect(screen.getByText(/Loading commands/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin only')).toBeNull();
  });

  it('keeps Tab focus inside the modal sheet', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    render(<CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />);
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Close' });
    dialog.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });
  it('renders nothing while closed', () => {
    render(<CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });
});
