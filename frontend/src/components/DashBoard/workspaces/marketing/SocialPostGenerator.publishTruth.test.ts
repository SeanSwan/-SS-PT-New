/**
 * SocialPostGenerator — publish-outcome messaging contract
 * ========================================================
 * The composer used to branch on `data.success`, which the route hardcoded to
 * true. A publish where every platform failed therefore reported
 * "Post published successfully!" AND cleared the caption — destroying the draft
 * for a post that never went out, with nothing in history to recover from.
 *
 * These lock the two things that make the new behaviour trustworthy:
 *  1. the message names WHICH platform failed and WHY (a bare "failed" is
 *     unactionable when several accounts are selected), and
 *  2. a rejected request carrying a server reason is never reported as a
 *     network error — axios rejects non-2xx, so the 422 compliance refusal
 *     arrives through the catch, and calling that "Network error" would be the
 *     same class of lie this change exists to remove.
 */
import { describe, expect, it } from 'vitest';
import { describeFailure, describeThrown } from './SocialPostGenerator.outcome';

describe('describeFailure', () => {
  it('names the platform and the reason when everything failed', () => {
    const message = describeFailure({
      status: 'failed',
      data: { results: [{ provider: 'bluesky', status: 'failed', error: 'ExpiredToken' }] },
    });

    expect(message).toMatch(/bluesky/);
    expect(message).toMatch(/ExpiredToken/);
    expect(message).toMatch(/draft is kept/i);
  });

  it('distinguishes a partial publish, and still reassures about the draft', () => {
    const message = describeFailure({
      status: 'partial_failed',
      data: {
        results: [
          { provider: 'bluesky', status: 'published' },
          { provider: 'bluesky', status: 'failed', error: 'rate limited' },
        ],
      },
    });

    expect(message).toMatch(/partly published/i);
    expect(message).toMatch(/rate limited/);
    // The succeeded platform must NOT be listed as a failure.
    expect(message.match(/rate limited/g)).toHaveLength(1);
  });

  it('surfaces the actual compliance blocker rather than a generic refusal', () => {
    const message = describeFailure({
      status: 'blocked',
      compliance: { blockers: ['FDA: Content contains "treats" which may constitute a medical claim.'] },
    });

    expect(message).toMatch(/compliance/i);
    expect(message).toMatch(/FDA/);
    expect(message).toMatch(/treats/);
  });

  it('falls back to the server message when there is no per-platform detail', () => {
    expect(describeFailure({ status: 'failed', message: 'Storage is unavailable' }))
      .toMatch(/Storage is unavailable/);
  });

  it('never claims success, whatever the shape', () => {
    for (const body of [{}, { status: 'failed' }, { status: 'blocked' }, { data: { results: [] } }]) {
      expect(describeFailure(body)).not.toMatch(/success/i);
    }
  });
});

describe('describeThrown', () => {
  it('reports a server-provided reason instead of blaming the network', () => {
    // Axios rejects non-2xx, so a 422 arrives HERE, not in the success branch.
    const err = {
      response: {
        data: {
          status: 'blocked',
          compliance: { blockers: ['FTC: Content resembles a client testimonial.'] },
        },
      },
    };

    const message = describeThrown(err);
    expect(message).toMatch(/FTC/);
    expect(message).not.toMatch(/network/i);
  });

  it('calls it a network error only when there is genuinely no response', () => {
    const message = describeThrown(new Error('socket hang up'));
    expect(message).toMatch(/network error/i);
    // Even then, say the draft survived — that is the user's actual worry.
    expect(message).toMatch(/draft is kept/i);
  });
});
