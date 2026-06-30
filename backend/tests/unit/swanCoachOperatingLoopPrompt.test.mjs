/**
 * swanCoachOperatingLoopPrompt.test.mjs
 * =====================================
 * Ensures Swan Coach behaves like a context-aware operator, not a loose prompt.
 */
import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '../../services/aiChatService.mjs';

describe('Swan Coach operating loop prompt', () => {
  it('requires intent, context, memory, and tool-state honesty before proposal output', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('SWAN COACH OPERATING LOOP');
    expect(prompt).toContain('selected client, thread history, date, source, and route context');
    expect(prompt).toContain('Use loaded conversation memory and verified client data when present');
    expect(prompt).toContain('Be tool-state honest');
    expect(prompt.indexOf('SWAN COACH OPERATING LOOP')).toBeLessThan(
      prompt.indexOf('SWAN COACH STRUCTURED PROPOSAL CONTRACT')
    );
  });
});
