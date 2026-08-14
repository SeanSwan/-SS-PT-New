/**
 * PROVIDER: Bluesky Native Publisher
 * ==================================
 * First-party AT Protocol adapter for app-password login and text posting.
 */

const DEFAULT_SERVICE_URL = 'https://bsky.social';
const POST_COLLECTION = 'app.bsky.feed.post';
const MAX_TEXT_LENGTH = 300;

const normalizeServiceUrl = value => String(value || DEFAULT_SERVICE_URL).trim().replace(/\/+$/, '');

const readJson = async (response, operation) => {
  const payload = await response.json().catch(async () => {
    const text = await response.text().catch(() => '');
    return text ? { message: text } : {};
  });
  if (!response.ok) {
    throw new Error(`Bluesky ${operation} failed (${response.status}): ${payload.message || payload.error || response.statusText}`);
  }
  return payload;
};

export async function createBlueskySession({
  identifier,
  appPassword,
  serviceUrl = DEFAULT_SERVICE_URL,
  fetchImpl = fetch,
}) {
  if (!identifier || !appPassword) {
    throw new Error('identifier and appPassword are required for Bluesky connection');
  }

  const resolvedServiceUrl = normalizeServiceUrl(serviceUrl);
  const response = await fetchImpl(`${resolvedServiceUrl}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
  });
  const payload = await readJson(response, 'createSession');

  for (const field of ['did', 'handle', 'accessJwt', 'refreshJwt']) {
    if (!payload[field]) throw new Error(`Bluesky createSession response missing ${field}`);
  }

  return {
    did: payload.did,
    handle: payload.handle,
    accessJwt: payload.accessJwt,
    refreshJwt: payload.refreshJwt,
    serviceUrl: resolvedServiceUrl,
  };
}

export async function refreshBlueskySession({
  refreshJwt,
  serviceUrl = DEFAULT_SERVICE_URL,
  fetchImpl = fetch,
}) {
  if (!refreshJwt) throw new Error('refreshJwt is required for Bluesky session refresh');

  const resolvedServiceUrl = normalizeServiceUrl(serviceUrl);
  const response = await fetchImpl(`${resolvedServiceUrl}/xrpc/com.atproto.server.refreshSession`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshJwt}` },
  });
  const payload = await readJson(response, 'refreshSession');

  // Mirrors the createSession validation above. Without it a response missing
  // the rotated refreshJwt returns "successfully" and the caller keeps storing
  // the token it just consumed — so the account is guaranteed to die at the
  // NEXT expiry, with nothing failing at the moment the fault occurs. did and
  // handle stay optional: they are not load-bearing for a refresh, and a PDS
  // that omits one should not cost a working session.
  for (const field of ['accessJwt', 'refreshJwt']) {
    if (!payload[field]) throw new Error(`Bluesky refreshSession response missing ${field}`);
  }

  return {
    did: payload.did,
    handle: payload.handle,
    accessJwt: payload.accessJwt,
    refreshJwt: payload.refreshJwt,
    serviceUrl: resolvedServiceUrl,
  };
}

export async function publishBlueskyPost({
  account,
  credentials,
  content,
  fetchImpl = fetch,
}) {
  const text = String(content || '').trim();
  if (!text) throw new Error('content is required');
  if (text.length > MAX_TEXT_LENGTH) throw new Error(`Bluesky posts must be ${MAX_TEXT_LENGTH} characters or fewer`);
  if (!credentials?.accessJwt) throw new Error('Bluesky access token is missing');

  const serviceUrl = normalizeServiceUrl(credentials.serviceUrl);
  const repo = account.providerAccountId || credentials.did || credentials.handle;
  if (!repo) throw new Error('Bluesky account DID/handle is missing');

  const response = await fetchImpl(`${serviceUrl}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.accessJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo,
      collection: POST_COLLECTION,
      record: {
        text,
        createdAt: new Date().toISOString(),
        langs: ['en'],
      },
    }),
  });
  const payload = await readJson(response, 'createRecord');

  return {
    provider: 'bluesky',
    providerPostId: payload.uri,
    status: 'published',
    raw: payload,
  };
}

export default {
  id: 'bluesky',
  createSession: createBlueskySession,
  refreshSession: refreshBlueskySession,
  publish: publishBlueskyPost,
};
