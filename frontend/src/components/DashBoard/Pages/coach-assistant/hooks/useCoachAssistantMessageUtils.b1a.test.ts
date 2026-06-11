/**
 * useCoachAssistantMessageUtils — B1a contracts
 * =============================================
 * 1. appendPendingEcho: the in-flight user message renders instantly and
 *    never doubles when the chat lane's own optimistic echo lands.
 * 2. buildCommandLaneMessages: extraction parity — the [userMsg, reply]
 *    shapes match the pre-extraction inline blocks in
 *    useCoachAssistant.sendMessage (rule 4 file-size split, 2026-06-10).
 */
import { describe, expect, it } from 'vitest';
import type { CoachMessageData } from '../SwanCoachTypes';
import {
  appendPendingEcho,
  buildCommandLaneMessages,
} from './useCoachAssistantMessageUtils';

const userMsg = (content: string, timestamp?: string): CoachMessageData => ({
  id: `u-${content}`,
  role: 'user',
  content,
  timestamp: timestamp ?? new Date().toISOString(),
});

const assistantMsg = (content: string): CoachMessageData => ({
  id: `a-${content}`,
  role: 'assistant',
  content,
  timestamp: new Date().toISOString(),
});

const echo = (content: string, timestamp?: string): CoachMessageData => ({
  id: 'pending-echo-1',
  role: 'user',
  content,
  timestamp: timestamp ?? new Date().toISOString(),
});

describe('appendPendingEcho', () => {
  it('returns messages untouched when no echo is pending', () => {
    const messages = [assistantMsg('hi')];
    expect(appendPendingEcho(messages, null)).toBe(messages);
  });

  it('appends the echo after an assistant reply', () => {
    const result = appendPendingEcho([assistantMsg('hi')], echo('log squats'));
    expect(result).toHaveLength(2);
    expect(result[1].content).toBe('log squats');
    expect(result[1].role).toBe('user');
  });

  it('dedups when the chat lane already echoed the same user message', () => {
    const result = appendPendingEcho(
      [assistantMsg('hi'), userMsg('log squats')],
      echo('log squats'),
    );
    expect(result).toHaveLength(2);
  });

  it('still appends when the trailing user message differs', () => {
    const result = appendPendingEcho(
      [userMsg('earlier question')],
      echo('log squats'),
    );
    expect(result).toHaveLength(2);
    expect(result[1].content).toBe('log squats');
  });

  it('dedups a chat-lane echo that landed MID-LIST (lane merge places command messages after chat messages)', () => {
    // Hostile-review regression 2026-06-10: with older command-lane
    // messages present, the chat lane's landed optimistic echo is not
    // the last merged message — a trailing-message-only dedup doubled
    // the user bubble.
    const result = appendPendingEcho(
      [
        assistantMsg('hi'),
        userMsg('log squats', '2026-06-10T10:00:00.500Z'), // chat-lane optimistic
        userMsg('cancel my session'), // older command-lane user msg
        assistantMsg('Cancelled.'),
      ],
      echo('log squats', '2026-06-10T10:00:00.000Z'),
    );
    expect(result).toHaveLength(4);
  });

  it('does NOT suppress a fresh echo because of an identical OLDER send', () => {
    const result = appendPendingEcho(
      [userMsg('log squats', '2026-06-10T09:00:00.000Z'), assistantMsg('Logged.')],
      echo('log squats', '2026-06-10T10:00:00.000Z'),
    );
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe('pending-echo-1');
  });
});

describe('buildCommandLaneMessages — extraction parity', () => {
  it('returns null for lanes the caller handles itself', () => {
    expect(buildCommandLaneMessages('x', { type: 'fallback_to_chat' })).toBeNull();
    expect(buildCommandLaneMessages('x', { type: 'error', error: 'boom' })).toBeNull();
  });

  it('maps confirmation_required to a user msg + confirmation card msg', () => {
    const result = buildCommandLaneMessages('cancel session 9', {
      type: 'confirmation_required',
      message: 'Cancel session 9?',
      operationId: 'op-9',
      command: 'cancel_session',
      params: { sessionId: 9 },
      client: { id: 1, firstName: 'Jane' },
      details: null,
      isDestructive: true,
    });
    expect(result).not.toBeNull();
    const [user, reply] = result!;
    expect(user.role).toBe('user');
    expect(user.content).toBe('cancel session 9');
    expect(reply.role).toBe('assistant');
    expect(reply.metadata?.commandConfirmation).toMatchObject({
      operationId: 'op-9',
      command: 'cancel_session',
      isDestructive: true,
    });
  });

  it('maps executed to a user msg + result card msg', () => {
    const result = buildCommandLaneMessages('show my sessions', {
      type: 'executed',
      command: 'view_sessions',
      result: { count: 2 },
      client: null,
    });
    const [user, reply] = result!;
    expect(user.content).toBe('show my sessions');
    expect(reply.metadata?.commandResult).toMatchObject({
      command: 'view_sessions',
      result: { count: 2 },
    });
  });

  it('maps not_wired to an honest plain reply', () => {
    const result = buildCommandLaneMessages('set availability', {
      type: 'not_wired',
      message: 'Not wired yet. No data was changed.',
      command: 'set_availability',
      manualOnly: true,
      reason: null,
    });
    const [, reply] = result!;
    expect(reply.content).toBe('Not wired yet. No data was changed.');
    expect(reply.metadata).toBeUndefined();
  });

  it('maps frontend_dispatch failure to the not-ready message', () => {
    const result = buildCommandLaneMessages('add a set', {
      type: 'frontend_dispatch',
      message: 'Sent.',
      command: 'add_set',
      event: 'ai:add_set',
      payload: {},
      dispatched: false,
    });
    const [, reply] = result!;
    expect(reply.content).toBe(
      'I understood the form action, but this page is not ready to receive it.',
    );
  });
});
