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
 * Safe ID comparison for UUID or other ID types
 * @param {any} id1 - First ID
 * @param {any} id2 - Second ID
 * @returns {boolean} True if IDs match
 */
export const idEquals = (id1, id2) => {
  // Handle null/undefined cases
  if (!id1 || !id2) return id1 === id2;
  
  // Convert both to strings for comparison
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
