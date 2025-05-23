/**
 * Utils index file
 * Imports critical emergency fixes first to ensure they're loaded early
 */

// Load emergency admin fix first to ensure it's available
import './emergencyAdminFix';

// Export common utility functions
export { default as formatters } from './formatters';
export { default as accessibility } from './accessibility';

// Export any other utilities as needed
// This file serves as a central entry point for utils and ensures critical fixes are loaded
