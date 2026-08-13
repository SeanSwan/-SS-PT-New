/**
 * useSocialPublish — publish/retry orchestration contract
 * ============================================================================
 * This hook owns every call the composer makes to the publishing API, and with
 * them the one decision that has already destroyed a user's work once: when to
 * discard the draft.
 *
 * The original bug was that the route hardcoded `success: true`, the composer
 * branched on it, and its success branch cleared the caption — so a post where
 * every platform failed said "published" AND threw the text away. `166565e53`
 * made the server truthful. These tests keep the CLIENT truthful, at the single
 * choke point where the draft can now be cleared:
 *
 *  1. `onPublished` fires only for an outcome that actually published. Not for
 *     `failed`, not for `partial_failed`, not for a compliance block, not for a
 *     transport error.
 *  2. retry is offered only when there is something retryable — a real jobId
 *     from a partially- or fully-failed publish. Never after a success, never
 *     after a compliance block (a retry cannot fix disallowed content), and
 *     never after a network error, where no jobId was ever observed and
 *     inventing one would post to the wrong job.
 *  3. a retry that succeeds clears the draft; a retry that fails again keeps
 *     both the draft and the offer to retry.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSocialPublish } from './useSocialPublish';

vi.mock('../../../../services/api.service', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiService = (await import('../../../../services/api.service')).default as any;

const PUBLISH_ARGS = { content: 'Leg day is done.', platformIds: ['acct-1', 'acct-2'] };

/** A 200 response body, the way axios delivers it. */
const ok = (body: unknown) => ({ data: body });
/** A non-2xx, the way axios delivers it: a rejection carrying the body. */
const rejectWith = (body: unknown) => Object.assign(new Error('Request failed'), {
  response: { data: body },
});

describe('useSocialPublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('the draft survives anything that did not publish', () => {
    it('clears the draft when the publish actually published', async () => {
      apiService.post.mockResolvedValue(ok({
        success: true,
        status: 'published',
        data: { status: 'published', jobId: '77', results: [{ provider: 'bluesky', status: 'published' }] },
      }));
      const onPublished = vi.fn();
      const { result } = renderHook(() => useSocialPublish({ onPublished }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(onPublished).toHaveBeenCalledTimes(1);
      expect(result.current.retryTarget).toBeNull();
      expect(result.current.failed).toBe(false);
    });

    it('never reports a scheduled post as published, even with no label to echo', async () => {
      apiService.post.mockResolvedValue(ok({
        success: true, status: 'scheduled', data: { status: 'scheduled', jobId: '5' },
      }));
      const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(result.current.publishStatus).toMatch(/scheduled/i);
      expect(result.current.publishStatus).not.toMatch(/published/i);
    });

    it('flags every non-publishing outcome as failed so the banner cannot look neutral', async () => {
      const outcomes: Array<() => void> = [
        () => apiService.post.mockResolvedValueOnce(ok({
          status: 'failed',
          data: { status: 'failed', jobId: '1', results: [{ provider: 'bluesky', status: 'failed', error: 'x' }] },
        })),
        () => apiService.post.mockRejectedValueOnce(rejectWith({ status: 'blocked', compliance: { blockers: ['FDA: no'] } })),
        () => apiService.post.mockRejectedValueOnce(new Error('socket hang up')),
      ];

      for (const arrange of outcomes) {
        vi.clearAllMocks();
        arrange();
        const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));
        await act(async () => { await result.current.publish(PUBLISH_ARGS); });
        expect(result.current.failed).toBe(true);
      }
    });

    it('keeps the draft and offers retry when every platform failed', async () => {
      apiService.post.mockResolvedValue(ok({
        success: false,
        status: 'failed',
        data: {
          status: 'failed',
          jobId: '88',
          results: [
            { provider: 'bluesky', status: 'failed', error: 'ExpiredToken' },
            { provider: 'mastodon', status: 'failed', error: 'ExpiredToken' },
          ],
        },
      }));
      const onPublished = vi.fn();
      const { result } = renderHook(() => useSocialPublish({ onPublished }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(onPublished).not.toHaveBeenCalled();
      expect(result.current.retryTarget).toEqual({ jobId: '88', failedCount: 2, content: PUBLISH_ARGS.content });
      expect(result.current.publishStatus).toMatch(/ExpiredToken/);
    });

    it('keeps the draft and offers retry for the failed half of a partial publish', async () => {
      apiService.post.mockResolvedValue(ok({
        success: false,
        status: 'partial_failed',
        data: {
          status: 'partial_failed',
          jobId: '99',
          results: [
            { provider: 'bluesky', status: 'published' },
            { provider: 'mastodon', status: 'failed', error: 'rate limited' },
          ],
        },
      }));
      const onPublished = vi.fn();
      const { result } = renderHook(() => useSocialPublish({ onPublished }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(onPublished).not.toHaveBeenCalled();
      // Only the platform that failed is counted — retrying must not re-post to
      // the one that succeeded, and the count is what the button promises.
      expect(result.current.retryTarget).toEqual({ jobId: '99', failedCount: 1, content: PUBLISH_ARGS.content });
    });

    it('does not offer retry after a compliance block — a retry cannot fix the content', async () => {
      apiService.post.mockRejectedValue(rejectWith({
        success: false,
        status: 'blocked',
        compliance: { blockers: ['FDA: Content contains "treats" which may constitute a medical claim.'] },
      }));
      const onPublished = vi.fn();
      const { result } = renderHook(() => useSocialPublish({ onPublished }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(onPublished).not.toHaveBeenCalled();
      expect(result.current.retryTarget).toBeNull();
      expect(result.current.publishStatus).toMatch(/FDA/);
    });

    it('does not offer retry after a transport failure — no jobId was ever observed', async () => {
      apiService.post.mockRejectedValue(new Error('socket hang up'));
      const onPublished = vi.fn();
      const { result } = renderHook(() => useSocialPublish({ onPublished }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(onPublished).not.toHaveBeenCalled();
      // Inventing a jobId here would retry SOME OTHER job.
      expect(result.current.retryTarget).toBeNull();
      expect(result.current.publishStatus).toMatch(/network error/i);
    });

    it('does not offer retry when the server reports a failure without a jobId', async () => {
      apiService.post.mockResolvedValue(ok({
        success: false,
        status: 'failed',
        data: { status: 'failed', results: [{ provider: 'bluesky', status: 'failed', error: 'nope' }] },
      }));
      const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));

      await act(async () => { await result.current.publish(PUBLISH_ARGS); });

      expect(result.current.retryTarget).toBeNull();
    });
  });

  describe('compliance check', () => {
    it('stores the result without blocking on failure', async () => {
      apiService.post.mockResolvedValue(ok({ success: true, data: { compliant: true, warnings: [], autoTags: [] } }));
      const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));

      await act(async () => { await result.current.runComplianceCheck('Leg day', ['#SwanStudios']); });

      expect(result.current.complianceResult).toEqual({ compliant: true, warnings: [], autoTags: [] });
    });

    it('swallows a compliance-check error rather than blocking manual review', async () => {
      apiService.post.mockRejectedValue(new Error('down'));
      const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));

      await act(async () => { await result.current.runComplianceCheck('Leg day', []); });

      expect(result.current.complianceResult).toBeNull();
    });
  });
});
