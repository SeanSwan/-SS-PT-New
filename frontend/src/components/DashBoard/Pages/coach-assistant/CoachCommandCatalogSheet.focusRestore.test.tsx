/**
 * PROBE (rule 55) — Codex finding #4: the catalog sheet traps focus but never restores it.
 *
 * CoachCommandCatalogSheet.tsx:77-108 focuses the panel on open and installs a Tab trap, but the
 * cleanup only removes the keydown listener. Nothing captures the element that had focus before
 * the sheet opened, and nothing returns focus to it on close.
 *
 * Effect: a keyboard or screen-reader user opens "What can I say?" from the More menu, closes it,
 * and focus is dumped to <body> — they must re-tab through the entire dock to get back. That is
 * WCAG 2.4.3 (Focus Order), on the keyboard path of a floor tool.
 *
 * Contract: on close, focus returns to whatever opened it.
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

function mockCommands() {
  getMock.mockResolvedValue({
    data: {
      success: true,
      commands: [
        { type: 'log_workout', description: 'Log a workout for a client', category: 'Workouts', examples: ['Log a workout for client 84'] },
      ],
    },
  });
}

describe('PROBE: catalog sheet focus restoration', () => {
  it('returns focus to the opener when the sheet closes', async () => {
    mockCommands();

    // The real opener: the More-menu button that owns focus before the sheet opens.
    const opener = document.createElement('button');
    opener.textContent = 'What can I say?';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const view = render(
      <CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />,
    );

    view.rerender(
      <CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />,
    );
    expect(await screen.findByText('Log workout')).toBeInTheDocument();
    expect(document.activeElement).not.toBe(opener); // sheet took focus

    view.rerender(
      <CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />,
    );

    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });

  it('CONTROL — Escape still closes the sheet', async () => {
    mockCommands();
    const onClose = vi.fn();
    render(<CoachCommandCatalogSheet open onClose={onClose} onUsePrompt={() => undefined} />);
    expect(await screen.findByText('Log workout')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  // Guards the regression the restore could introduce: staging an example closes the sheet AND
  // moves focus to the composer. Blindly restoring would yank focus back off the composer —
  // worse than the original bug, because the user is now typing in the wrong place.
  it('does NOT steal focus back when something else has claimed it', async () => {
    mockCommands();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const composer = document.createElement('textarea');
    document.body.appendChild(composer);

    const view = render(
      <CoachCommandCatalogSheet open onClose={() => undefined} onUsePrompt={() => undefined} />,
    );
    expect(await screen.findByText('Log workout')).toBeInTheDocument();

    // Simulate the onUsePrompt path: composer takes focus, then the sheet unmounts.
    composer.focus();
    view.rerender(
      <CoachCommandCatalogSheet open={false} onClose={() => undefined} onUsePrompt={() => undefined} />,
    );

    await waitFor(() => expect(document.activeElement).toBe(composer));
    opener.remove();
    composer.remove();
  });
});
