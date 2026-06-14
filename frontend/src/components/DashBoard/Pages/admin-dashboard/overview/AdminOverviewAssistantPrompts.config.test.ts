import { describe, expect, it } from 'vitest';
import { ADMIN_OVERVIEW_ASSISTANT_PROMPTS } from './AdminOverviewAssistantPrompts.config';

describe('AdminOverviewAssistantPrompts config', () => {
  it('keeps admin overview prompts one-tap and business-action focused', () => {
    expect(ADMIN_OVERVIEW_ASSISTANT_PROMPTS).toEqual([
      expect.objectContaining({ label: 'Onboard now', sendImmediately: true }),
      expect.objectContaining({ label: 'Who needs a log?', sendImmediately: true }),
      expect.objectContaining({ label: 'Money risk', sendImmediately: true }),
    ]);
  });

  it('keeps fixed prompts generic enough for admin overview chat sends', () => {
    const combinedPrompts = ADMIN_OVERVIEW_ASSISTANT_PROMPTS
      .map((item) => item.prompt)
      .join(' ');

    expect(combinedPrompts).toContain('client onboarding');
    expect(combinedPrompts).toContain('workout logging');
    expect(combinedPrompts).toContain('money-path risk');
    expect(combinedPrompts).not.toMatch(/clientId|userId|sessionId|stripe|email|phone/i);
  });
});
