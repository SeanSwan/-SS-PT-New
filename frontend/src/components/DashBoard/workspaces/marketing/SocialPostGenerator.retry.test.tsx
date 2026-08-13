/**
 * SocialPostGenerator — retry wiring (rendered)
 * ============================================================================
 * `POST /publish/:jobId/retry` shipped complete and tested, but with no way to
 * reach it from the UI, so the capability was unusable. These tests exercise the
 * affordance itself through the real component: the button only exists when
 * there is something to retry, it calls the right endpoint for the right job,
 * and it never quietly promises to send text the server will not send.
 *
 * The hook's own logic is covered in useSocialPublish.test.ts; this file is
 * deliberately about the WIRING, which source-level assertions cannot prove.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../../../../services/api.service', () => ({ default: { post, get } }));

import SocialPostGenerator from './SocialPostGenerator';

const ACCOUNTS = [
  { id: 'acct-1', platform: 'instagram', name: 'Swan IG' },
  { id: 'acct-2', platform: 'bluesky', name: 'Swan Bluesky' },
];

/** Health + accounts, the two GETs the composer makes on mount. */
const mockHealthy = () => {
  get.mockImplementation((url: string) =>
    url.includes('/health')
      ? Promise.resolve({ data: { success: true, data: { configured: true, mode: 'native' } } })
      : Promise.resolve({ data: { success: true, data: ACCOUNTS } }),
  );
};

const partialFailure = {
  success: false,
  status: 'partial_failed',
  data: {
    status: 'partial_failed',
    jobId: '4242',
    results: [
      { provider: 'instagram', status: 'published' },
      { provider: 'bluesky', status: 'failed', error: 'ExpiredToken' },
    ],
  },
};

/** Compose a post against both accounts and publish it. */
const publishWith = async (response: unknown, { reject = false } = {}) => {
  render(<SocialPostGenerator />);
  const first = await screen.findByLabelText(/Swan IG/i);
  fireEvent.click(first);
  fireEvent.click(screen.getByLabelText(/Swan Bluesky/i));
  fireEvent.change(screen.getByPlaceholderText(/Write your/i), {
    target: { value: 'Leg day is done.' },
  });

  post.mockImplementationOnce(() => (reject
    ? Promise.reject(Object.assign(new Error('rejected'), { response: { data: response } }))
    : Promise.resolve({ data: response })));

  fireEvent.click(screen.getByRole('button', { name: /Publish to 2 Accounts/i }));
};

describe('SocialPostGenerator — retry affordance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthy();
  });

  it('offers no retry until a publish has actually failed', async () => {
    render(<SocialPostGenerator />);
    await screen.findByLabelText(/Swan IG/i);

    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('offers a retry naming how many platforms failed, and keeps the draft', async () => {
    await publishWith(partialFailure);

    const retryButton = await screen.findByRole('button', { name: /Retry 1 failed platform/i });
    expect(retryButton).toBeInTheDocument();
    // The draft must survive — this is the bug the whole workstream exists for.
    expect(screen.getByPlaceholderText(/Write your/i)).toHaveValue('Leg day is done.');
  });

  it('retries the job the server named, and clears the draft once it publishes', async () => {
    await publishWith(partialFailure);
    const retryButton = await screen.findByRole('button', { name: /Retry 1 failed platform/i });

    post.mockImplementationOnce(() => Promise.resolve({
      data: { success: true, status: 'published', data: { status: 'published', jobId: '4242', results: [] } },
    }));
    fireEvent.click(retryButton);

    await waitFor(() => expect(post).toHaveBeenLastCalledWith(
      '/api/admin/social-publishing/publish/4242/retry',
    ));
    await waitFor(() => expect(screen.getByPlaceholderText(/Write your/i)).toHaveValue(''));
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('warns that a retry sends the original text once the composer is edited', async () => {
    await publishWith(partialFailure);
    await screen.findByRole('button', { name: /Retry 1 failed platform/i });

    // The retry endpoint re-publishes the STORED job content
    // (socialJobRetry.mjs:54), so after an edit the button must stop implying
    // it will post what is now on screen.
    fireEvent.change(screen.getByPlaceholderText(/Write your/i), {
      target: { value: 'Completely different text.' },
    });

    expect(await screen.findByRole('button', { name: /Retry 1 failed platform with the original text/i }))
      .toBeInTheDocument();
  });

  it('offers no retry when the content was refused by the compliance gate', async () => {
    await publishWith({
      success: false,
      status: 'blocked',
      compliance: { blockers: ['FDA: Content contains "treats" which may constitute a medical claim.'] },
    }, { reject: true });

    await screen.findByText(/FDA/);
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('blocks a fresh publish while a retry is in flight, so nothing double-posts', async () => {
    await publishWith(partialFailure);
    const retryButton = await screen.findByRole('button', { name: /Retry 1 failed platform/i });

    post.mockImplementationOnce(() => new Promise(() => {})); // never settles
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Publish to 2 Accounts/i })).toBeDisabled());
  });
});
