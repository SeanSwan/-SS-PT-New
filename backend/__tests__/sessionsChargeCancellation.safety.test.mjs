/**
 * Cancellation billing route safety contract.
 *
 * The admin cancellation review endpoint sits on the money workflow. Its 500
 * response must never echo raw exception text back to browsers.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE_SOURCE = readFileSync(resolve(__dirname, '../routes/sessions.mjs'), 'utf8');

function chargeCancellationBlock() {
  const start = ROUTE_SOURCE.indexOf('router.post("/:sessionId/charge-cancellation"');
  const end = ROUTE_SOURCE.indexOf('export default router;', start);
  return ROUTE_SOURCE.slice(start, end);
}

describe('POST /api/sessions/:sessionId/charge-cancellation safety', () => {
  it('does not disclose raw exception messages in the 500 response', () => {
    const source = chargeCancellationBlock();

    expect(source).toContain("message: 'Server error recording cancellation billing decision'");
    expect(source).not.toMatch(/error:\s*error\.message/);
  });
});
