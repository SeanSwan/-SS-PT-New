/**
 * Bluesky Native Publisher - Unit Tests
 * =====================================
 * Locks the first working first-party social adapter to AT Protocol calls.
 */

import { describe, expect, it, vi } from 'vitest';

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  json: vi.fn(async () => data),
  text: vi.fn(async () => JSON.stringify(data)),
});

describe('blueskyPublisher', () => {
  it('creates a Bluesky session using app-password credentials', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      did: 'did:plc:swan',
      handle: 'swanstudios.bsky.social',
      accessJwt: 'access-jwt',
      refreshJwt: 'refresh-jwt',
    }));

    const { createBlueskySession } = await import('../../services/socialProviders/blueskyPublisher.mjs');
    const session = await createBlueskySession({
      identifier: 'swanstudios.bsky.social',
      appPassword: 'app-password',
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bsky.social/xrpc/com.atproto.server.createSession',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'swanstudios.bsky.social',
          password: 'app-password',
        }),
      }),
    );
    expect(session).toEqual(expect.objectContaining({
      did: 'did:plc:swan',
      handle: 'swanstudios.bsky.social',
      accessJwt: 'access-jwt',
      refreshJwt: 'refresh-jwt',
      serviceUrl: 'https://bsky.social',
    }));
  });

  it('publishes text posts through com.atproto.repo.createRecord', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      uri: 'at://did:plc:swan/app.bsky.feed.post/post-1',
      cid: 'cid-1',
    }));

    const { publishBlueskyPost } = await import('../../services/socialProviders/blueskyPublisher.mjs');
    const result = await publishBlueskyPost({
      account: { providerAccountId: 'did:plc:swan' },
      credentials: { accessJwt: 'access-jwt', serviceUrl: 'https://bsky.social' },
      content: 'Training tip for the day.',
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bsky.social/xrpc/com.atproto.repo.createRecord',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-jwt',
          'Content-Type': 'application/json',
        },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      repo: 'did:plc:swan',
      collection: 'app.bsky.feed.post',
      record: {
        text: 'Training tip for the day.',
        createdAt: expect.any(String),
        langs: ['en'],
      },
    });
    expect(result).toEqual({
      provider: 'bluesky',
      providerPostId: 'at://did:plc:swan/app.bsky.feed.post/post-1',
      status: 'published',
      raw: { uri: 'at://did:plc:swan/app.bsky.feed.post/post-1', cid: 'cid-1' },
    });
  });
});
