/**
 * Commission ledger truth contract (Dashboard batch 2026-07-13, hostile-review fixes).
 *
 * Locks the round-1 review fixes on commissionRoutes.mjs:
 * 1. The TrainerCommission model option `createdAt: 'created_at'` RENAMES the
 *    Sequelize attribute — reading `c.createdAt` yields undefined and rendered
 *    "Invalid Date" on the payout surfaces. Responses must map c.created_at.
 * 2. Trainer totals must be computed over the FULL ledger, and unpaid rows
 *    must never age out of the mark-paid window behind the newest-100 display
 *    cap (an old unpaid commission was unsettleable + totals understated).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, '../../routes/commissionRoutes.mjs'), 'utf8');

describe('commission ledger truth contract', () => {
  it('maps timestamps from the renamed created_at attribute, never c.createdAt', () => {
    expect(source).toContain('createdAt: c.created_at');
    expect(source).not.toContain('createdAt: c.createdAt');
  });

  it('computes trainer totals over the full ledger, not the display window', () => {
    expect(source).toContain('const totalEarned = totalRows.reduce');
    expect(source).toContain('const unpaid = totalRows');
  });

  it('keeps every unpaid row reachable regardless of the newest-100 display cap', () => {
    expect(source).toContain('paidToTrainerAt: null },');
    expect(source).toContain('[...unpaidAllRows, ...recentRows]');
  });
});
