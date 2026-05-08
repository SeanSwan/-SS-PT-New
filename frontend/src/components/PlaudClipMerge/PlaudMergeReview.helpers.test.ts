import { describe, expect, it } from 'vitest';
import { errorMessage } from './PlaudMergeReview.helpers';

describe('PlaudMergeReview errorMessage safety', () => {
  it('does not expose arbitrary backend error code or message detail', () => {
    const err = {
      response: {
        data: {
          error: {
            code: 'UNSAFE_BACKEND_DETAIL',
            message: 'do-not-render-private-detail',
          },
        },
      },
    };

    const message = errorMessage(err, 'Unable to complete the PLAUD review action.');

    expect(message).toContain('PLAUD_ERROR');
    expect(message).toContain('Unable to complete the PLAUD review action.');
    expect(message).not.toContain('UNSAFE_BACKEND_DETAIL');
    expect(message).not.toContain('do-not-render-private-detail');
  });
});
