import { describe, expect, it } from 'vitest';
import { interpretCoachChatResponse } from './CoachCommandCenter.chatResponse';

const SENT = 'hello coach';

describe('interpretCoachChatResponse — honest chat-lane outcomes (spec: no fake replies)', () => {
  it('treats null (aborted/superseded request) as superseded, never a reply', () => {
    expect(interpretCoachChatResponse(null, SENT)).toEqual({ kind: 'superseded' });
    expect(interpretCoachChatResponse(undefined, SENT)).toEqual({ kind: 'superseded' });
  });

  it('renders a real reply body when content exists', () => {
    const outcome = interpretCoachChatResponse({ role: 'assistant', content: 'Here is your plan.' }, SENT);
    expect(outcome).toEqual({ kind: 'reply', body: 'Here is your plan.' });
  });

  it('never fabricates a coach reply for a paywall response', () => {
    const outcome = interpretCoachChatResponse({ paywallRequired: true, originalMessage: SENT }, SENT);
    expect(outcome.kind).toBe('paywall');
    if (outcome.kind === 'paywall') {
      expect(outcome.body).toContain('No message was processed');
      expect(outcome.retryMessage).toBeUndefined();
    }
  });

  it('surfaces failed sends with a retry when retryable', () => {
    const outcome = interpretCoachChatResponse(
      { failed: true, originalMessage: SENT, errorCode: 'NETWORK_ERROR', retryable: true },
      SENT,
    );
    expect(outcome.kind).toBe('failed');
    if (outcome.kind === 'failed') {
      expect(outcome.retryMessage).toBe(SENT);
      expect(outcome.body).toContain('Nothing was saved');
      expect(outcome.attachments).toContain('retry available');
    }
  });

  it('withholds retry when the failure is not retryable (rate limited)', () => {
    const outcome = interpretCoachChatResponse(
      { failed: true, originalMessage: SENT, errorCode: 'RATE_LIMITED', retryable: false },
      SENT,
    );
    expect(outcome.kind).toBe('failed');
    if (outcome.kind === 'failed') {
      expect(outcome.retryMessage).toBeUndefined();
      expect(outcome.body).toContain('too many requests');
    }
  });

  it('treats an empty or unknown-shape response as an honest empty state with retry', () => {
    for (const weird of [{ content: '   ' }, {}, 'plain string', 42]) {
      const outcome = interpretCoachChatResponse(weird, SENT);
      expect(outcome.kind).toBe('empty');
      if (outcome.kind === 'empty') {
        // The user message may be persisted server-side — never claim nothing
        // was saved on the empty-reply path.
        expect(outcome.body).not.toContain('Nothing was saved');
        expect(outcome.body).toContain('no answer came back');
        expect(outcome.retryMessage).toBe(SENT);
      }
    }
  });

  it('maps axios offline code and code-less offline failures to connection-truth copy', () => {
    const axiosOffline = interpretCoachChatResponse(
      { failed: true, originalMessage: SENT, errorCode: 'ERR_NETWORK', retryable: true },
      SENT,
    );
    expect(axiosOffline.kind).toBe('failed');
    if (axiosOffline.kind === 'failed') expect(axiosOffline.body).toContain('Check your connection');

    const codelessOffline = interpretCoachChatResponse(
      { failed: true, originalMessage: SENT, errorCode: null, retryable: true },
      SENT,
      true,
    );
    expect(codelessOffline.kind).toBe('failed');
    if (codelessOffline.kind === 'failed') expect(codelessOffline.body).toContain('offline');
  });

  it('never returns the retired fabricated draft copy for any outcome', () => {
    const shapes = [null, {}, { paywallRequired: true }, { failed: true }, { content: 'real' }];
    for (const shape of shapes) {
      const outcome = interpretCoachChatResponse(shape, SENT);
      const body = 'body' in outcome ? outcome.body : '';
      expect(body).not.toContain('Prepared a review package');
    }
  });
});
