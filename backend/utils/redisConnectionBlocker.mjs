/**
 * Redis Connection Blocker - DISABLED COMPLETELY
 * ===============================================
 * This file does NOTHING - server works fine with Redis errors in logs
 * Reverting to original working state before our changes
 */

// Do absolutely nothing - let Redis behave normally
export default {
  isActive: false,
  level: 'DISABLED',
  message: 'Redis blocker completely disabled - server operates normally'
};
