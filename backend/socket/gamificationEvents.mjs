/**
 * ============================================================================
 * FILE: gamificationEvents.mjs
 * PURPOSE: Real-time gamification event broadcasting via Socket.IO
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides helper functions to broadcast gamification
 * events (workout_completed, achievement_unlocked, level_up, streak_milestone)
 * to connected clients via Socket.IO. Includes 30s per-user debounce for
 * workout events to prevent UI thrashing.
 *
 * HOW IT FITS IN THE APP:
 *   gamificationController → emitGamificationEvent() → Socket.IO → All clients
 *   Falls back gracefully if Socket.IO is not initialized (server-side rendering, tests)
 *
 * ARCHITECTURE:
 * graph TD
 *   A[gamificationController] --> B[gamificationEvents]
 *   B --> C[Socket.IO io instance]
 *   C --> D[Connected Clients]
 *   B --> E[30s Debounce Map]
 */

import logger from '../utils/logger.mjs';
import { getIO as getSocketIO } from './socketManager.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Debounce State
// PURPOSE: Prevent spam — max 1 workout_completed event per user per 30s
// ─────────────────────────────────────────────────────────────
const lastEmission = new Map(); // key: `${event}:${userId}` → timestamp

const DEBOUNCE_MS = 30000; // 30 seconds

function shouldEmit(event, userId) {
  const key = `${event}:${userId}`;
  const now = Date.now();
  const last = lastEmission.get(key) || 0;
  if (now - last < DEBOUNCE_MS) return false;
  lastEmission.set(key, now);
  return true;
}

// Clean up stale entries every 5 minutes to prevent memory leak
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - DEBOUNCE_MS * 2;
  for (const [key, ts] of lastEmission) {
    if (ts < cutoff) lastEmission.delete(key);
  }
}, 300000);
if (cleanupInterval.unref) cleanupInterval.unref();

// ─────────────────────────────────────────────────────────────
// SECTION: Event Emitters
// ─────────────────────────────────────────────────────────────

/**
 * Get the Socket.IO instance from the server.
 * Returns null if not initialized (safe fallback).
 */
function getIO() {
  try {
    return getSocketIO?.() || null;
  } catch {
    return null;
  }
}

/**
 * Emit a gamification event to all connected clients.
 * @param {string} event - Event name (workout_completed, achievement_unlocked, etc.)
 * @param {object} data - Event payload
 * @param {object} [options] - { debounce: boolean }
 */
export function emitGamificationEvent(event, data, options = {}) {
  try {
    const io = getIO();
    if (!io) return; // Socket.IO not initialized — skip silently

    const userId = data.userId;
    const debounce = options.debounce !== false; // default: true for workout events

    // Apply debounce for workout_completed
    if (debounce && event === 'workout_completed') {
      if (!shouldEmit(event, userId)) return;
    }

    // Broadcast to all connected clients in the 'gamification' room
    io.to('gamification').emit(`gamification:${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Gamification event emitted: ${event} for user ${userId}`);
  } catch (error) {
    // Non-fatal — gamification events are enhancement, not critical path
    logger.error(`Failed to emit gamification event: ${error.message}`);
  }
}

/**
 * Convenience: Emit workout_completed event (30s debounce per user)
 */
export function emitWorkoutCompleted(userId, username, workoutName, xpEarned) {
  emitGamificationEvent('workout_completed', {
    userId, username, workoutName, xpEarned
  });
}

/**
 * Convenience: Emit achievement_unlocked event (no debounce)
 */
export function emitAchievementUnlocked(userId, username, achievementName, rarity) {
  emitGamificationEvent('achievement_unlocked', {
    userId, username, achievementName, rarity
  }, { debounce: false });
}

/**
 * Convenience: Emit level_up event (no debounce)
 */
export function emitLevelUp(userId, username, newLevel, newTier) {
  emitGamificationEvent('level_up', {
    userId, username, newLevel, newTier
  }, { debounce: false });
}

/**
 * Convenience: Emit streak_milestone event (no debounce)
 */
export function emitStreakMilestone(userId, username, streakDays) {
  emitGamificationEvent('streak_milestone', {
    userId, username, streakDays
  }, { debounce: false });
}

export default {
  emitGamificationEvent,
  emitWorkoutCompleted,
  emitAchievementUnlocked,
  emitLevelUp,
  emitStreakMilestone,
};
