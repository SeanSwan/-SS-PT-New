/**
 * ID Utilities
 * =======================================
 * Utilities for handling UUID and ID conversion/validation
 */

import { validate as uuidValidate } from 'uuid';
import logger from './logger.mjs';

/**
 * Check if a value is a valid UUID
 * @param {string} value - Value to check
 * @returns {boolean} True if valid UUID
 */
export const isValidUuid = (value) => {
  if (!value) return false;
  
  try {
    return uuidValidate(value);
  } catch (error) {
    return false;
  }
};

/**
 * Safely convert a UUID or string ID to string
 * @param {any} id - ID to convert
 * @returns {string} String representation of ID
 */
export const toStringId = (id) => {
  if (id === null || id === undefined) {
    return null;
  }
  
  return String(id);
};

/**
 * Safe ID comparison for UUID or other ID types.
 *
 * Contract: an absent identity is NEVER equal to anything, including another
 * absent identity. This matters because the helper is used as an authorization
 * guard (`if (!idEquals(resource.ownerId, req.user.id)) return 403;`), where
 * answering `true` for two missing ids would mean "authorized".
 *
 * History (2026-09-18 hostile pass G-08): the previous body was
 *   `if (!id1 || !id2) return id1 === id2;`
 * which was internally inconsistent — `idEquals(null, null)` returned true
 * while `idEquals(null, undefined)` returned false, because `null === undefined`
 * is false. Every current call site passes `req.user.id` (a non-null string set
 * by `protect` via `toStringId`), so the both-absent branch is unreachable today;
 * it is made to fail closed here so it stays safe if that ever changes.
 *
 * @param {any} id1 - First ID
 * @param {any} id2 - Second ID
 * @returns {boolean} True if both IDs are present and match as strings
 */
export const idEquals = (id1, id2) => {
  // Absent on either side → not equal (fail closed).
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) {
    return false;
  }

  // Convert both to strings for comparison: `protect` stringifies req.user.id
  // while Sequelize INTEGER foreign keys are JS numbers, so `42 !== '42'`.
  return String(id1) === String(id2);
};

/**
 * Log ID information for debugging
 * @param {string} context - Context description
 * @param {any} id - ID to log
 */
export const logIdDebug = (context, id) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`ID Debug [${context}]:`, {
      id,
      type: typeof id,
      isUuid: isValidUuid(id)
    });
  }
};

export default {
  isValidUuid,
  toStringId,
  idEquals,
  logIdDebug
};
