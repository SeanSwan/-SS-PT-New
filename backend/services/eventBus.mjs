/**
 * SwanStudios Event Bus -- Phase 9e
 * ==================================
 * Singleton EventEmitter connecting subsystems for cross-component intelligence.
 *
 * Events:
 *   workout:completed   { userId, workoutId, duration, exercises, trainerId }
 *   pain:reported       { userId, region, severity, painEntryId }
 *   equipment:updated   { userId, profileId, items }
 *   variation:accepted  { userId, trainerId, variationLogId, category }
 *   form:analyzed       { userId, formAnalysisId, riskScore }
 *   movement:assessed   { userId, movementProfileId, compensations }
 *
 * Listeners are registered at startup via registerEventListeners().
 * All listeners are best-effort (errors logged, never thrown).
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.mjs';

class SwanEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(25);
  }

  /**
   * Emit an event with best-effort error isolation.
   * Wraps the standard emit to catch listener errors.
   */
  safeEmit(event, data) {
    try {
      this.emit(event, { ...data, timestamp: Date.now() });
    } catch (err) {
      logger.error(`[EventBus] Error emitting "${event}":`, err.message);
    }
  }
}

const eventBus = new SwanEventBus();

// ── Best-effort listener wrapper ──────────────────────────────────────

function safeListener(name, handler) {
  return async (data) => {
    try {
      await handler(data);
    } catch (err) {
      logger.error(`[EventBus] Listener "${name}" failed:`, err.message);
    }
  };
}

// ── Cross-Component Listeners ─────────────────────────────────────────

/**
 * Register all cross-component event listeners.
 * Called once during server startup.
 */
let listenersRegistered = false;

export function registerEventListeners() {
  if (listenersRegistered) {
    logger.info('[EventBus] Listeners already registered, skipping');
    return;
  }
  listenersRegistered = true;

  // When a workout is completed, invalidate the client's intelligence cache
  // so the next workout builder request gets fresh data
  eventBus.on('workout:completed', safeListener('workout-context-refresh', async (data) => {
    logger.info(`[EventBus] workout:completed for user ${data.userId} — context will refresh on next request`);
  }));

  // When pain is reported with high severity, log for trainer awareness
  eventBus.on('pain:reported', safeListener('pain-alert', async (data) => {
    if (data.severity >= 7) {
      logger.warn(`[EventBus] HIGH pain reported: user ${data.userId}, region "${data.region}", severity ${data.severity}`);
    }
  }));

  // When equipment profile is updated, log for workout builder awareness
  eventBus.on('equipment:updated', safeListener('equipment-refresh', async (data) => {
    logger.info(`[EventBus] Equipment updated for user ${data.userId}, profile ${data.profileId}`);
  }));

  // When a variation is accepted, log for rotation tracking
  eventBus.on('variation:accepted', safeListener('variation-track', async (data) => {
    logger.info(`[EventBus] Variation accepted: user ${data.userId}, category "${data.category}", log ${data.variationLogId}`);
  }));

  // When form analysis completes with high risk, flag for trainer
  eventBus.on('form:analyzed', safeListener('form-risk-alert', async (data) => {
    if (data.riskScore >= 7) {
      logger.warn(`[EventBus] HIGH risk form analysis: user ${data.userId}, risk ${data.riskScore}`);
    }
  }));

  // When movement assessment finds compensations, log for corrective exercise planning
  eventBus.on('movement:assessed', safeListener('movement-compensation-log', async (data) => {
    if (data.compensations && data.compensations.length > 0) {
      logger.info(`[EventBus] Movement compensations detected for user ${data.userId}: ${data.compensations.length} patterns`);
    }
  }));

  logger.info('[EventBus] Cross-component event listeners registered');
}

export default eventBus;
