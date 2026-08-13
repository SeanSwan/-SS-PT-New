/**
 * useSocialPublish — retry behaviour
 * ============================================================================
 * Split from useSocialPublish.test.ts to keep both files under the 300-line
 * rule. Retry is its own operation with its own correctness rule: it re-posts
 * only to the accounts that failed, so it must never be offered when there is
 * nothing retryable, never fire twice concurrently, and never report a
 * still-failing job as sent.
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

  describe('retry', () => {
    const failFirst = async (onPublished = vi.fn()) => {
      apiService.post.mockResolvedValueOnce(ok({
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
      const hook = renderHook(() => useSocialPublish({ onPublished }));
      await act(async () => { await hook.result.current.publish(PUBLISH_ARGS); });
      return { hook, onPublished };
    };

    it('calls the retry endpoint for the job that failed', async () => {
      const { hook } = await failFirst();
      apiService.post.mockResolvedValueOnce(ok({
        success: true,
        status: 'published',
        data: { status: 'published', jobId: '99', results: [], retried: ['acct-2'] },
      }));

      await act(async () => { await hook.result.current.retry(); });

      expect(apiService.post).toHaveBeenLastCalledWith('/api/admin/social-publishing/publish/99/retry');
    });

    it('clears the draft and withdraws the retry offer once the retry publishes', async () => {
      const { hook, onPublished } = await failFirst();
      apiService.post.mockResolvedValueOnce(ok({
        success: true,
        status: 'published',
        data: { status: 'published', jobId: '99', results: [], retried: ['acct-2'] },
      }));

      await act(async () => { await hook.result.current.retry(); });

      expect(onPublished).toHaveBeenCalledTimes(1);
      expect(hook.result.current.retryTarget).toBeNull();
    });

    it('keeps the draft and the retry offer when the retry fails again', async () => {
      const { hook, onPublished } = await failFirst();
      apiService.post.mockResolvedValueOnce(ok({
        success: false,
        status: 'partial_failed',
        data: {
          status: 'partial_failed',
          jobId: '99',
          results: [
            { provider: 'bluesky', status: 'published' },
            { provider: 'mastodon', status: 'failed', error: 'still rate limited' },
          ],
          retried: ['acct-2'],
        },
      }));

      await act(async () => { await hook.result.current.retry(); });

      expect(onPublished).not.toHaveBeenCalled();
      expect(hook.result.current.retryTarget).toEqual({ jobId: '99', failedCount: 1, content: PUBLISH_ARGS.content });
      expect(hook.result.current.publishStatus).toMatch(/still rate limited/);
    });

    it('reports a vanished job without pretending the post went out', async () => {
      const { hook, onPublished } = await failFirst();
      apiService.post.mockRejectedValueOnce(rejectWith({
        success: false, status: 'not_found', message: 'Social publishing job not found',
      }));

      await act(async () => { await hook.result.current.retry(); });

      expect(onPublished).not.toHaveBeenCalled();
      expect(hook.result.current.publishStatus).not.toMatch(/success/i);
    });

    it('is a no-op when there is nothing to retry', async () => {
      const { result } = renderHook(() => useSocialPublish({ onPublished: vi.fn() }));

      await act(async () => { await result.current.retry(); });

      expect(apiService.post).not.toHaveBeenCalled();
    });

    it('does not fire twice while a retry is already in flight', async () => {
      const { hook } = await failFirst();
      let release: (v: unknown) => void = () => {};
      apiService.post.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));

      let first: Promise<void> | undefined;
      act(() => { first = hook.result.current.retry(); });
      await waitFor(() => expect(hook.result.current.retrying).toBe(true));
      await act(async () => { await hook.result.current.retry(); });

      // The publish call plus exactly one retry call.
      expect(apiService.post).toHaveBeenCalledTimes(2);

      await act(async () => {
        release(ok({ success: true, status: 'published', data: { status: 'published', jobId: '99', results: [] } }));
        await first;
      });
    });
  });
});
