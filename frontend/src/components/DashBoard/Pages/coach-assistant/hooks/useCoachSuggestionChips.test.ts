/**
 * useCoachSuggestionChips — B1a role-aware next-action chips
 * ==========================================================
 * Locks the chip-content and visibility contracts:
 *  - role decides the chip set; an adopted client personalizes the
 *    trainer/admin brief chip
 *  - chips never render while sending or on top of a pending decision
 *    card (command confirmation / transcript review / transcript error)
 */
import { describe, expect, it } from 'vitest';
import {
  areSuggestionChipsVisible,
  buildSuggestionChips,
} from './useCoachSuggestionChips';
import type { CoachMessageData } from '../SwanCoachTypes';

const msg = (
  role: CoachMessageData['role'],
  metadata?: CoachMessageData['metadata'],
): CoachMessageData => ({
  id: `m-${role}-${Math.random()}`,
  role,
  content: 'hello',
  timestamp: new Date().toISOString(),
  ...(metadata ? { metadata } : {}),
});

describe('buildSuggestionChips', () => {
  it('returns client next-actions for the client role', () => {
    const chips = buildSuggestionChips('client');
    expect(chips).toEqual([
      'Log a workout',
      'Show my progress',
      'What should I train next?',
      'Book a session',
    ]);
  });

  it('returns trainer next-actions for trainer and admin roles', () => {
    for (const role of ['trainer', 'admin'] as const) {
      const chips = buildSuggestionChips(role);
      expect(chips[0]).toBe("How's my day look?");
      expect(chips).toHaveLength(4);
    }
  });

  it('personalizes the brief chip when a client is adopted', () => {
    const chips = buildSuggestionChips('trainer', 'Jane');
    expect(chips[0]).toBe('Brief me on Jane');
    expect(chips).toHaveLength(4);
  });

  it('ignores a blank selected-client name', () => {
    expect(buildSuggestionChips('trainer', '   ')[0]).toBe("How's my day look?");
  });

  it('always returns 2-4 chips (B1 plan contract)', () => {
    for (const role of ['client', 'trainer', 'admin'] as const) {
      const count = buildSuggestionChips(role).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
  });
});

describe('areSuggestionChipsVisible', () => {
  it('shows after an assistant reply when idle', () => {
    expect(areSuggestionChipsVisible([msg('user'), msg('assistant')], false)).toBe(true);
  });

  it('shows under the welcome message (empty-state next action)', () => {
    expect(areSuggestionChipsVisible([msg('assistant')], false)).toBe(true);
  });

  it('hides while sending', () => {
    expect(areSuggestionChipsVisible([msg('assistant')], true)).toBe(false);
  });

  it('hides when the last message is from the user (echo in flight)', () => {
    expect(areSuggestionChipsVisible([msg('assistant'), msg('user')], false)).toBe(false);
  });

  it('hides on an empty message list', () => {
    expect(areSuggestionChipsVisible([], false)).toBe(false);
  });

  it('hides on top of a pending command confirmation card', () => {
    const confirm = msg('assistant', {
      commandConfirmation: {
        message: 'Confirm?',
        operationId: 'op-1',
        command: 'cancel_session',
        params: {},
        client: null,
        details: null,
        isDestructive: true,
      },
    });
    expect(areSuggestionChipsVisible([confirm], false)).toBe(false);
  });

  it('hides on top of a pending transcript review card', () => {
    const review = msg('assistant', {
      transcriptReview: {
        transcript: 't',
        parsedWorkout: { exercises: [] },
        fileName: 'f.txt',
        fileSize: 1,
        fileMimeType: 'text/plain',
        clientId: 1,
      },
    });
    expect(areSuggestionChipsVisible([review], false)).toBe(false);
  });

  it('hides on top of a transcript error card', () => {
    const error = msg('assistant', {
      transcriptError: { kind: 'upload_failed', fileName: 'f.txt', reason: 'nope' },
    });
    expect(areSuggestionChipsVisible([error], false)).toBe(false);
  });
});
