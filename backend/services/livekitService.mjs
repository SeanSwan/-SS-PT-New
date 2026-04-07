/**
 * ┌─── SERVICE: LiveKit Server SDK ────────────────────────────┐
 * │ PURPOSE: Create/manage LiveKit video rooms, generate tokens │
 * │          for trainers and clients to join video calls.      │
 * │ REQUIRES: LIVEKIT_API_URL, LIVEKIT_API_KEY, LIVEKIT_SECRET │
 * │ CEO RULING: 2026-04-07 — LiveKit Cloud free tier for MVP.  │
 * └────────────────────────────────────────────────────────────┘
 */

import logger from '../utils/logger.mjs';

const LIVEKIT_API_URL = process.env.LIVEKIT_API_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET || '';

/**
 * Check if LiveKit is configured
 */
export function isConfigured() {
  return !!(LIVEKIT_API_URL && LIVEKIT_API_KEY && LIVEKIT_SECRET);
}

/**
 * Generate a LiveKit access token for a participant
 * Uses JWT format compatible with LiveKit's auth system
 * @param {string} roomName - The room to join
 * @param {string} participantName - Display name
 * @param {string} participantId - Unique user ID
 * @param {boolean} isTrainer - Grants extra permissions (recording, moderation)
 * @returns {string} JWT token
 */
export async function generateToken(roomName, participantName, participantId, isTrainer = false) {
  if (!isConfigured()) {
    throw new Error('LiveKit not configured. Set LIVEKIT_API_URL, LIVEKIT_API_KEY, LIVEKIT_SECRET in .env');
  }

  try {
    // Dynamic import — livekit-server-sdk is an optional dependency
    const { AccessToken } = await import('livekit-server-sdk');

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantId,
      name: participantName,
      ttl: '2h',
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      ...(isTrainer && {
        roomAdmin: true,
        roomRecord: true,
      }),
    });

    return await token.toJwt();
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message?.includes('Cannot find')) {
      logger.warn('livekit-server-sdk not installed. Run: npm install livekit-server-sdk');
      // Return a placeholder token for development
      return `dev-token-${roomName}-${participantId}-${Date.now()}`;
    }
    throw err;
  }
}

/**
 * Create a unique room name for a video session
 */
export function createRoomName(trainerId, clientId) {
  const timestamp = Date.now().toString(36);
  return `ss-${trainerId}-${clientId}-${timestamp}`;
}

/**
 * Get LiveKit connection info for the frontend
 */
export function getConnectionInfo() {
  return {
    url: LIVEKIT_API_URL,
    configured: isConfigured(),
  };
}

/**
 * Health check
 */
export async function checkHealth() {
  if (!isConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'LiveKit not configured. Set LIVEKIT_API_URL, LIVEKIT_API_KEY, LIVEKIT_SECRET in .env',
    };
  }
  return { success: true, configured: true, url: LIVEKIT_API_URL };
}

export default {
  isConfigured,
  generateToken,
  createRoomName,
  getConnectionInfo,
  checkHealth,
};
