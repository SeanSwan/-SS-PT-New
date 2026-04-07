/**
 * ┌─── SERVICE: Postiz API Client ─────────────────────────────┐
 * │ PURPOSE: Wrapper for Postiz social media scheduling API.    │
 * │          Handles OAuth token management, cross-platform     │
 * │          posting, and scheduling via Postiz REST API.       │
 * │ DOCS: https://docs.postiz.com                              │
 * │ NOTE: Postiz must be self-hosted or cloud-hosted.          │
 * │       Set POSTIZ_API_URL and POSTIZ_API_KEY in .env        │
 * └────────────────────────────────────────────────────────────┘
 */

import logger from '../utils/logger.mjs';

const POSTIZ_API_URL = process.env.POSTIZ_API_URL || 'http://localhost:5000';
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY || '';

/**
 * Make an authenticated request to the Postiz API
 */
async function postizFetch(path, options = {}) {
  const url = `${POSTIZ_API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(POSTIZ_API_KEY && { Authorization: `Bearer ${POSTIZ_API_KEY}` }),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error(`Postiz API error: ${res.status} ${path} — ${body}`);
      return { success: false, error: `Postiz ${res.status}: ${body || res.statusText}` };
    }
    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    logger.error(`Postiz API unreachable: ${err.message}`);
    return { success: false, error: `Postiz unreachable: ${err.message}` };
  }
}

/**
 * List connected social media accounts
 */
export async function listConnectedAccounts() {
  return postizFetch('/api/integrations');
}

/**
 * Get OAuth URL for connecting a new platform
 * @param {string} platform - instagram | facebook | youtube | bluesky | tiktok
 */
export async function getOAuthUrl(platform) {
  return postizFetch(`/api/integrations/${platform}/connect`);
}

/**
 * Disconnect a social media account
 */
export async function disconnectAccount(integrationId) {
  return postizFetch(`/api/integrations/${integrationId}`, { method: 'DELETE' });
}

/**
 * Publish a post to one or more platforms
 * @param {Object} post
 * @param {string} post.content - The post text
 * @param {string[]} post.platformIds - Array of connected platform IDs
 * @param {string} [post.mediaUrl] - Optional media URL (image/video from R2)
 * @param {string} [post.scheduledAt] - ISO date for scheduled posting
 */
export async function publishPost({ content, platformIds, mediaUrl, scheduledAt }) {
  const body = {
    content,
    integrationIds: platformIds,
    ...(mediaUrl && { media: [{ url: mediaUrl }] }),
    ...(scheduledAt && { scheduledDate: scheduledAt }),
  };
  return postizFetch('/api/posts', { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Get post history / status
 */
export async function getPostHistory(limit = 20) {
  return postizFetch(`/api/posts?limit=${limit}`);
}

/**
 * Get post by ID (check status)
 */
export async function getPostStatus(postId) {
  return postizFetch(`/api/posts/${postId}`);
}

/**
 * Check if Postiz is configured and reachable
 */
export async function checkHealth() {
  if (!POSTIZ_API_URL || POSTIZ_API_URL === 'http://localhost:5000') {
    return {
      success: false,
      configured: false,
      error: 'Postiz not configured. Set POSTIZ_API_URL in .env',
    };
  }
  if (!POSTIZ_API_KEY) {
    return {
      success: false,
      configured: false,
      error: 'Postiz API key missing. Set POSTIZ_API_KEY in .env',
    };
  }
  const result = await postizFetch('/api/health');
  return { ...result, configured: true };
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
