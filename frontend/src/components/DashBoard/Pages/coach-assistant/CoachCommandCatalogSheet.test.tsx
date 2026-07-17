/**
 * Regression (v2 P1.3): the command catalog is sourced from the live
 * role-scoped registry endpoint, stages examples into the composer, and
 * fails honestly when the list cannot load.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
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

  it('restores focus to the opener when the modal closes', () => {
    getMock.mockReturnValue(new Promise(() => undefined));

    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open command list</button>
          <CoachCommandCatalogSheet
            open={open}
            onClose={() => setOpen(false)}
            onUsePrompt={() => undefined}
          />
        </>
      );
    };

    render(<Harness />);
    const opener = screen.getByRole('button', { name: /open command list/i });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(opener).toHaveFocus();
  });

  it('renders nothing while closed', () => {
    render(<CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });
});
