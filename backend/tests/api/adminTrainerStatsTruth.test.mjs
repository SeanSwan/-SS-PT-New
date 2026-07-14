/**
 * Trainer stats truth contract (Dashboard batch 2026-07-13, P1-2).
 *
 * GET /api/admin/finance/trainers used to hardcode every performance stat to
 * null with source 'not_tracked' while the commission ledger, assignments,
 * and completed sessions already held the real numbers. These locks keep the
 * live aggregation wired, fail-open, and honest (no fabricated numbers).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

describe('admin trainer stats truth contract', () => {
  it('aggregates live trainer stats from assignments, sessions, and the commission ledger', () => {
    expect(source).toContain('async function aggregateTrainerStats(trainerIds)');
    expect(source).toContain("getModel('ClientTrainerAssignment')");
    expect(source).toContain("getModel('Session')");
    expect(source).toContain("getModel('TrainerCommission')");
    expect(source).toContain("where: { trainerId: trainerIds, status: 'active' }");
    expect(source).toContain("where: { trainerId: trainerIds, status: 'completed' }");
  });

  it('fails open to the legacy not_tracked stub instead of crashing the roster', () => {
    expect(source).toContain('statsByTrainer = await aggregateTrainerStats(trainers.map(t => t.id));');
    expect(source).toContain('catch (statsError)');
    expect(source).toContain("source: live ? 'live_aggregate' : 'not_tracked'");
  });

  it('exposes the top-level aliases the trainer management UI actually reads', () => {
    expect(source).toContain('clientCount: live ? live.activeClients : null');
    expect(source).toContain('averageRating: rating');
    expect(source).toContain('monthlyRevenue,');
  });

  it('never fabricates a rating when no rated sessions exist', () => {
    expect(source).toContain('live.ratingCount > 0');
    expect(source).not.toContain('rating: 4.5');
  });
});
