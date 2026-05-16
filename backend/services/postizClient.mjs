/**
 * SERVICE: Postiz API Client
 * ==========================
 * Wrapper for the current Postiz Public API used by the admin Marketing tab.
 *
 * Runtime contract:
 * - POSTIZ_API_URL should point to the Postiz public API host or base path.
 *   Examples: https://api.postiz.com, https://api.postiz.com/public/v1,
 *   https://postiz.example.com/api, https://postiz.example.com/api/public/v1.
 * - POSTIZ_API_KEY is sent server-side only in the Authorization header.
 * - POSTIZ_AUTH_SCHEME defaults to "raw" per current public docs; set "bearer"
 *   if a hosted/self-hosted Postiz deployment requires Bearer auth.
 */

import logger from '../utils/logger.mjs';

const POSTIZ_API_URL = process.env.POSTIZ_API_URL || '';
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY || '';
const POSTIZ_AUTH_SCHEME = process.env.POSTIZ_AUTH_SCHEME || 'raw';
const POSTIZ_PUBLIC_API_SUFFIX = '/public/v1';
const NOT_CONFIGURED_ERROR = 'Postiz not configured. Set POSTIZ_API_URL and POSTIZ_API_KEY in .env';

export function normalizePostizApiUrl(rawUrl = POSTIZ_API_URL) {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'http://localhost:5000') return '';
  if (trimmed.endsWith(POSTIZ_PUBLIC_API_SUFFIX)) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}${POSTIZ_PUBLIC_API_SUFFIX}`;
  return `${trimmed}${POSTIZ_PUBLIC_API_SUFFIX}`;
}

export function buildPostizHeaders(apiKey = POSTIZ_API_KEY, authScheme = POSTIZ_AUTH_SCHEME) {
  const headers = { 'Content-Type': 'application/json' };
  if (!apiKey) return headers;

  const scheme = String(authScheme || 'raw').toLowerCase();
  headers.Authorization = scheme === 'bearer' && !apiKey.startsWith('Bearer ')
    ? `Bearer ${apiKey}`
    : apiKey;
  return headers;
}

const normalizePostizIdentifier = (identifier) => {
  if (identifier === 'instagram-standalone') return 'instagram';
  if (identifier === 'linkedin-page') return 'linkedin';
  return identifier || 'unknown';
};

export function normalizeIntegration(raw = {}) {
  const postizIdentifier = raw.identifier || raw.platform || raw.provider || raw.type || 'unknown';
  return {
    id: String(raw.id || raw.integrationId || ''),
    platform: normalizePostizIdentifier(postizIdentifier),
    postizIdentifier,
    name: raw.name || raw.profile || normalizePostizIdentifier(postizIdentifier),
    profile: raw.profile || null,
    picture: raw.picture || raw.avatar || null,
    disabled: Boolean(raw.disabled),
  };
}

export function normalizeIntegrationsResponse(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.integrations)
        ? payload.integrations
        : [];

  return rows.map(normalizeIntegration).filter(account => account.id);
}

const buildYouTubeTitle = (content = '') => {
  const firstLine = String(content).split('\n').find(line => line.trim()) || 'Swan Studios Update';
  return firstLine.trim().slice(0, 95);
};

export function buildPostizSettings(identifier, content = '') {
  switch (identifier) {
    case 'instagram':
    case 'instagram-standalone':
      return { __type: identifier, post_type: 'post' };
    case 'tiktok':
      return {
        __type: 'tiktok',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        duet: true,
        stitch: true,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        video_made_with_ai: false,
        content_posting_method: 'DIRECT_POST',
      };
    case 'youtube':
      return {
        __type: 'youtube',
        title: buildYouTubeTitle(content),
        type: 'public',
        selfDeclaredMadeForKids: 'no',
        tags: [],
      };
    case 'facebook':
      return { __type: 'facebook' };
    default:
      return { __type: identifier };
  }
}

export function buildPostizPostPayload({
  content,
  platformIds,
  mediaUrl,
  scheduledAt,
  accounts = [],
  type,
}) {
  const accountById = new Map(accounts.map(account => [String(account.id), account]));
  const missingAccountIds = platformIds.filter(id => !accountById.has(String(id)));

  if (missingAccountIds.length > 0) {
    throw new Error(`Missing Postiz account metadata for: ${missingAccountIds.join(', ')}`);
  }

  return {
    type: type || (scheduledAt ? 'schedule' : 'now'),
    date: scheduledAt || new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: platformIds.map((id) => {
      const account = accountById.get(String(id));
      const identifier = account.postizIdentifier || account.platform;
      return {
        integration: { id },
        value: [
          {
            content,
            image: mediaUrl ? [{ path: mediaUrl }] : [],
          },
        ],
        settings: buildPostizSettings(identifier, content),
      };
    }),
  };
}

async function postizFetch(path, options = {}) {
  const baseUrl = normalizePostizApiUrl();
  if (!baseUrl || !POSTIZ_API_KEY) {
    return { success: false, configured: false, error: NOT_CONFIGURED_ERROR };
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    ...buildPostizHeaders(),
    ...options.headers,
  };
  const body = options.body && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body;

  try {
    const res = await fetch(url, { method: options.method || 'GET', ...options, body, headers });
    if (!res.ok) {
      const responseText = await res.text().catch(() => '');
      logger.error(`Postiz API error: ${res.status} ${path} - ${responseText}`);
      return { success: false, error: `Postiz ${res.status}: ${responseText || res.statusText}` };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    logger.error(`Postiz API unreachable: ${err.message}`);
    return { success: false, error: `Postiz unreachable: ${err.message}` };
  }
}

export async function listConnectedAccounts() {
  const result = await postizFetch('/integrations');
  if (!result.success) return result;
  return { ...result, data: normalizeIntegrationsResponse(result.data) };
}

export async function getOAuthUrl(platform) {
  return postizFetch(`/social/${platform}`);
}

export async function disconnectAccount(integrationId) {
  return postizFetch(`/integrations/${integrationId}`, { method: 'DELETE' });
}

export async function publishPost({ content, platformIds, mediaUrl, scheduledAt }) {
  const accountsResult = await listConnectedAccounts();
  if (!accountsResult.success) return accountsResult;

  let body;
  try {
    body = buildPostizPostPayload({
      content,
      platformIds,
      mediaUrl,
      scheduledAt,
      accounts: accountsResult.data,
    });
  } catch (err) {
    return { success: false, error: err.message };
  }

  return postizFetch('/posts', { method: 'POST', body });
}

export async function getPostHistory(limit = 20) {
  return postizFetch(`/posts?limit=${limit}`);
}

export async function getPostStatus(postId) {
  return postizFetch(`/posts/${postId}`);
}

export async function checkHealth() {
  if (!normalizePostizApiUrl() || !POSTIZ_API_KEY) {
    return { success: false, configured: false, error: NOT_CONFIGURED_ERROR };
  }

  const result = await postizFetch('/integrations');
  if (!result.success) return { ...result, configured: true };

  return {
    success: true,
    configured: true,
    data: {
      reachable: true,
      accountCount: normalizeIntegrationsResponse(result.data).length,
    },
  };
}

export default {
  listConnectedAccounts,
  getOAuthUrl,
  disconnectAccount,
  publishPost,
  getPostHistory,
  getPostStatus,
  checkHealth,
};
