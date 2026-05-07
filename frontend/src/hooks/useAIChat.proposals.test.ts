import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
});
