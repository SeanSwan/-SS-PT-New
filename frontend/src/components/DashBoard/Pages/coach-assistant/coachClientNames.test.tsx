/**
 * Names on screen, AI stays blind (Sean, 2026-09-23). The server swaps every client
 * name for "Client #<id>" before a model sees it and keeps replies ID-only; the
 * PRIVACY-PROXY display contract says the FRONTEND joins names back on. That half
 * was missing, so trainers read "Client #84" instead of the name they typed.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoachClientNamesProvider, clientNameLookup, nameClientTokens } from './coachClientNames';
import CoachCommandLogEntry from './CoachCommandLogEntry';

const names = clientNameLookup([{ id: 84, label: 'Jesse Moreno' }, { id: 7, label: 'Ava Stone' }]);

describe('nameClientTokens', () => {
  it('shows the roster name for every Client #<id> the viewer can see', () => {
    expect(nameClientTokens("Client #84's last workout was Tuesday; Client #7 is due.", names))
      .toBe("Jesse Moreno's last workout was Tuesday; Ava Stone is due.");
    expect(nameClientTokens('[Client #84] logged 3 sessions', names)).toBe('Jesse Moreno logged 3 sessions');
  });

  it('never guesses: an ID outside the roster stays an ID, and longer numbers are not cut', () => {
    expect(nameClientTokens('Client #99 and Client #840', names)).toBe('Client #99 and Client #840');
  });

  it('CONTROL: text without tokens and an empty roster are untouched', () => {
    expect(nameClientTokens('Squat 155 × 5', names)).toBe('Squat 155 × 5');
    expect(nameClientTokens('Client #84 trained', clientNameLookup([]))).toBe('Client #84 trained');
  });
});

describe('a coach reply renders names, while the ID text is what leaves the browser', () => {
  it('shows the name; read-aloud still receives the ID-only text', () => {
    const onSpeak = vi.fn();
    render(
      <CoachClientNamesProvider clients={[{ id: 84, label: 'Jesse Moreno' }]}>
        <CoachCommandLogEntry
          entry={{ id: 'c1', actor: 'coach', label: 'coach reply', body: "Client #84's last workout: squat 155 × 5." } as never}
          onSpeak={onSpeak}
        />
      </CoachClientNamesProvider>,
    );
    expect(screen.getByText(/Jesse Moreno's last workout/)).toBeInTheDocument();
    expect(screen.queryByText(/Client #84/)).not.toBeInTheDocument();
    screen.getByRole('button', { name: /read aloud|listen|speak/i }).click();
    expect(onSpeak).toHaveBeenCalledWith("Client #84's last workout: squat 155 × 5.");
  });
});
