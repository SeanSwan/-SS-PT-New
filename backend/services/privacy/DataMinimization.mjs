/**
 * Data Minimization Service
 *
 * The production data stores are not connected to an executable minimization
 * workflow yet. This boundary intentionally fails closed so an admin request
 * can never report deletion, anonymization, aggregation, or archival that did
 * not actually occur. Replace this service only when the real store adapters,
 * audit receipts, and retention-policy tests are available together.
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

function createDataMinimizationNotImplementedError(message) {
  const error = new Error(message);
  error.statusCode = 501;
  return error;
}

export class DataMinimization {
  constructor() {
    this.dataSource = 'not_connected';
  }

  /**
   * Reject every execution until a real, auditable data-store workflow exists.
   */
  async runMinimization(options = {}) {
    const error = createDataMinimizationNotImplementedError(
      'Data minimization is not connected to real data stores yet.',
    );

    piiSafeLogger.error('Data minimization failed', {
      error: error.message,
      requestingUserId: options.requestingUserId,
    });

    throw error;
  }
}

export const dataMinimization = new DataMinimization();
