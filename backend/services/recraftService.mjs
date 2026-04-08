/**
 * ┌─── SERVICE: Recraft V3 API Client ─────────────────────────┐
 * │ PURPOSE: AI badge/icon generation via Recraft V3 API.      │
 * │ Specializes in vector icons and clean badge art.           │
 * │ CEO RULING: 2026-04-07 — Recraft V3 primary, 50 gens/mo.  │
 * │ REQUIRES: RECRAFT_API_KEY in .env                          │
 * │ DOCS: https://www.recraft.ai/docs                          │
 * └────────────────────────────────────────────────────────────┘
 */

import logger from '../utils/logger.mjs';

const RECRAFT_API_URL = 'https://external.api.recraft.ai/v1';
const RECRAFT_API_KEY = process.env.RECRAFT_API_KEY || '';

/**
 * Generate a badge image using Recraft V3
 * @param {Object} params
 * @param {string} params.prompt - Description of the badge/icon
 * @param {string} params.style - Art style modifier (e.g., "flat_2", "art_deco")
 * @param {number} [params.size] - Image size (default 256)
 * @returns {{ success: boolean, imageUrl?: string, error?: string }}
 */
export async function generateBadge({ prompt, style, size = 256 }) {
  if (!RECRAFT_API_KEY) {
    return { success: false, error: 'Recraft API key not configured. Set RECRAFT_API_KEY in .env' };
  }

  try {
    const res = await fetch(`${RECRAFT_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RECRAFT_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: `${prompt}. Style: ${style}. Clean icon design, transparent background, suitable for badge/achievement display.`,
        style: 'icon',
        model: 'recraftv3',
        size: `${size}x${size}`,
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error(`Recraft API error: ${res.status} — ${body}`);
      return { success: false, error: `Recraft ${res.status}: ${body || res.statusText}` };
    }

    const data = await res.json();
    const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;

    if (!imageUrl) {
      return { success: false, error: 'No image returned from Recraft' };
    }

    return { success: true, imageUrl };
  } catch (err) {
    logger.error(`Recraft API error: ${err.message}`);
    return { success: false, error: `Recraft error: ${err.message}` };
  }
}

/**
 * Check if Recraft is configured
 */
export function isConfigured() {
  return !!RECRAFT_API_KEY;
}

/**
 * Health check
 */
export async function checkHealth() {
  if (!RECRAFT_API_KEY) {
    return {
      success: false,
      configured: false,
      error: 'Recraft not configured. Set RECRAFT_API_KEY in .env',
    };
  }

  // Probe Recraft API with a lightweight request to verify key is valid
  try {
    const res = await fetch(`${RECRAFT_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RECRAFT_API_KEY}`,
      },
      body: JSON.stringify({ prompt: '', style: 'icon', model: 'recraftv3', size: '64x64', n: 0 }),
    });
    // Any response (even 400 for bad params) means the key + endpoint are reachable
    // Only 401/403 means the key is invalid
    if (res.status === 401 || res.status === 403) {
      return { success: false, configured: true, error: 'Recraft API key is invalid or revoked' };
    }
    return { success: true, configured: true };
  } catch (err) {
    return { success: false, configured: true, error: `Recraft unreachable: ${err.message}` };
  }
}

export default { generateBadge, isConfigured, checkHealth };
