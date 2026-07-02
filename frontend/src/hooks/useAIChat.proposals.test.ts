import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSafeRequestContext } from './useAIChat';

const USE_AI_CHAT_SRC = readFileSync(resolve(__dirname, './useAIChat.ts'), 'utf8');

describe('useAIChat proposal metadata bridge', () => {
  it('attaches coach action proposals to assistant message metadata', () => {
    expect(USE_AI_CHAT_SRC).toMatch(/coachActionProposals/);
  });

  it('does not dispatch AI_SUBMIT_WORKOUT as a browser custom event', () => {
    expect(USE_AI_CHAT_SRC).toMatch(/BLOCKED_FRONTEND_EVENTS/);
    expect(USE_AI_CHAT_SRC).toMatch(/AI_SUBMIT_WORKOUT/);
    expect(USE_AI_CHAT_SRC).not.toMatch(/new CustomEvent\(action\.event/);
  });

  it('preserves safe route context tokens and zero-credit booked-session hints', () => {
    expect(buildSafeRequestContext({
      source: 'clients-team',
      intent: 'historical_import',
      surface: 'coach-command-center',
      scheduledSessionId: '777',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCredits: 0,
      workoutDate: '2026-06-07',
      equipmentProfileId: 3,
    })).toEqual({
      source: 'clients-team',
      intent: 'historical_import',
      surface: 'coach-command-center',
      scheduledSessionId: '777',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCredits: 0,
      workoutDate: '2026-06-07',
      equipmentProfileId: 3,
    });
  });

  it('drops unsafe route context token values before sending chat requests', () => {
    expect(buildSafeRequestContext({
      source: '../clients-team',
      intent: 'historical import',
      surface: 'coach-command-center'.repeat(6),
    })).toBeNull();
  });

  it('does not coerce blank booked-session credit hints into zero credits', () => {
    expect(buildSafeRequestContext({ scheduledSessionCredits: null })).toBeNull();
    expect(buildSafeRequestContext({ scheduledSessionCredits: '' })).toBeNull();
    expect(buildSafeRequestContext({ scheduledSessionCredits: '   ' })).toBeNull();
  });
});
