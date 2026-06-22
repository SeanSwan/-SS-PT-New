import { describe, expect, it, vi } from 'vitest';
import {
  HISTORY_MESSAGE_WITHHELD,
  RESPONSE_MESSAGE_WITHHELD,
  sanitizePromptHistory,
} from '../../services/ai/aiChatPromptPrivacy.mjs';

describe('aiChatPromptPrivacy', () => {
  it('strips user and assistant history before it is reused in the provider prompt', async () => {
    const messageStripper = vi.fn(async (content) => ({
      sanitizedMessage: content.replace(/Sarah Smith/g, '[Client #42]'),
      identitiesStripped: content.includes('Sarah Smith') ? 1 : 0,
    }));
    const responseStripper = vi.fn(async (content) => ({
      sanitizedResponse: content.replace(/Sarah Smith/g, 'Client #42'),
      identitiesStripped: content.includes('Sarah Smith') ? 1 : 0,
    }));

    const result = await sanitizePromptHistory({
      messages: [
        { role: 'user', content: 'old message outside prompt window' },
        { role: 'user', content: 'Sarah Smith had lunch' },
        { role: 'assistant', content: 'Sarah Smith needs hydration context' },
      ],
      enrichUserId: 42,
      sequelize: {},
      maxMessages: 2,
      messageStripper,
      responseStripper,
    });

    expect(result.messages).toHaveLength(2);
    expect(JSON.stringify(result.messages)).not.toContain('Sarah Smith');
    expect(result.messages[0].content).toContain('[Client #42]');
    expect(result.messages[1].content).toContain('Client #42');
    expect(result.identitiesStripped).toBe(2);
  });

  it('withholds a history item when redaction fails instead of sending raw content', async () => {
    const log = { warn: vi.fn() };
    const result = await sanitizePromptHistory({
      messages: [{ role: 'user', content: 'Sarah Smith had dinner' }],
      enrichUserId: 42,
      sequelize: {},
      messageStripper: vi.fn(async () => {
        throw new Error('identity lookup failed');
      }),
      responseStripper: vi.fn(),
      log,
    });

    expect(result.messages[0].content).toBe(HISTORY_MESSAGE_WITHHELD);
    expect(JSON.stringify(result.messages)).not.toContain('Sarah Smith');
    expect(result.identitiesStripped).toBe(1);
    expect(log.warn).toHaveBeenCalled();
  });

  it('does not alter history when there is no target client to protect', async () => {
    const result = await sanitizePromptHistory({
      messages: [{ role: 'user', content: 'General programming question' }],
      enrichUserId: null,
      messageStripper: vi.fn(),
      responseStripper: vi.fn(),
    });

    expect(result.messages[0].content).toBe('General programming question');
    expect(result.identitiesStripped).toBe(0);
  });

  it('exports the response-withheld placeholder for mounted route fail-closed behavior', () => {
    expect(RESPONSE_MESSAGE_WITHHELD).toBe('[Response withheld: identity redaction unavailable.]');
  });
});
