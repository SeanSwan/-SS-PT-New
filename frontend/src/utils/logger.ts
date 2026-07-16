/* eslint-disable no-console -- This is the centralized, production-gated console boundary. */
/**
 * ============================================================================
 * FILE: logger.ts
 * PURPOSE: Production-safe logging utility — suppresses console output in prod
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Wraps console.log/warn/error so that log and warn are silenced in production
 * builds. Errors always print (they indicate real problems). Debug logs only
 * appear when VITE_DEBUG=true is set.
 *
 * HOW TO USE:
 *   import { logger } from '@/utils/logger';
 *   logger.log('fetched clients', data);   // dev only
 *   logger.warn('deprecated API used');      // dev only
 *   logger.error('request failed', err);     // always prints
 *   logger.debug('verbose trace', obj);      // only when VITE_DEBUG=true
 */

const isDev = import.meta.env.DEV;
const isDebug = import.meta.env.VITE_DEBUG === 'true';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (..._args: unknown[]) => {};

export const logger = {
  /** General info — dev only */
  log: isDev ? console.log.bind(console) : noop,

  /** Warnings — dev only */
  warn: isDev ? console.warn.bind(console) : noop,

  /** Errors — always print (real problems) */
  error: console.error.bind(console),

  /** Verbose debug — only with VITE_DEBUG=true */
  debug: isDebug ? console.log.bind(console, '[DEBUG]') : noop,

  /** Grouping — dev only */
  group: isDev ? console.group.bind(console) : noop,
  groupEnd: isDev ? console.groupEnd.bind(console) : noop,

  /** Table output — dev only */
  table: isDev ? console.table.bind(console) : noop,
};

export default logger;
