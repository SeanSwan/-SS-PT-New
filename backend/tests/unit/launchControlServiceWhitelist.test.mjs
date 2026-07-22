/**
 * Runtime contract for Sean's Launch Control law.
 *
 * The pure registry test catches additions; this test proves the database-backed
 * board and mutation path actually consume that registry.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    query: mocks.query,
    transaction: mocks.transaction,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    warn: vi.fn(),
  },
}));

import { deleteOverride, getBoard, upsertOverride } from '../../services/launchControlService.mjs';

const APPROVED = ['dashboardV2Finance', 'postSaveHandoff', 'prismCapture'];
const DESIGN_SURFACE_LAW = "Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.";
const adminRoutes = readFileSync(resolve(process.cwd(), 'routes/adminFlagRoutes.mjs'), 'utf8');


describe('Launch Control service whitelist', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    delete process.env.DASHBOARD_V2_FINANCE;
    delete process.env.PRISM_CAPTURE_ENABLED;
    delete process.env.ENABLE_POST_SAVE_HANDOFF;
  });

  it('limits the admin board query to the exact approved registry', async () => {
    mocks.query.mockResolvedValueOnce([[
      {
        flag: 'dashboardV2Finance',
        label: 'Dashboard finance data',
        grp: 'feature',
        parent_flag: null,
        health_threshold: null,
        value: null,
        mode: null,
        roles: null,
        pct: null,
        starts_at: null,
        updated_by: null,
        updated_at: null,
        fail24h: '0',
        fail7d: '0',
      },
    ]]);

    const board = await getBoard();

    expect(mocks.query, DESIGN_SURFACE_LAW).toHaveBeenCalledWith(
      expect.stringContaining('WHERE f.flag IN (:approvedFlags)'),
      { replacements: { approvedFlags: APPROVED } },
    );
    expect(board.map((item) => item.flag)).toEqual(['dashboardV2Finance']);
  });

  it('rejects a retired design key before any database mutation lookup', async () => {
    await expect(upsertOverride('homeVNext', { value: true }, 'admin#test'))
      .resolves.toEqual({ error: 'unknown_flag', status: 404 });
    expect(mocks.query, DESIGN_SURFACE_LAW).not.toHaveBeenCalled();
  });
  it('rejects clearing a retired design key before any database lookup', async () => {
    await expect(deleteOverride('homeVNext', 'admin#test'))
      .resolves.toEqual({ error: 'unknown_flag', status: 404 });
    expect(mocks.query, DESIGN_SURFACE_LAW).not.toHaveBeenCalled();
  });

  it('clears an approved override and writes its audit row in ONE transaction (crash between them must not leave an unaudited flip)', async () => {
    const t = { id: 'tx' };
    mocks.transaction.mockImplementation(async (fn) => fn(t));
    mocks.query
      .mockResolvedValueOnce([[{ flag: 'prismCapture', value: true, mode: 'force' }]]) // SELECT ... FOR UPDATE
      .mockResolvedValueOnce([[]]) // DELETE
      .mockResolvedValueOnce([[]]); // audit INSERT

    await expect(deleteOverride('prismCapture', 'admin#test')).resolves.toEqual({ ok: true });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    const calls = mocks.query.mock.calls;
    expect(calls[0][0]).toContain('FOR UPDATE'); // serialize concurrent clears so audit before-state is truthful
    for (const [sql, opts] of calls) {
      expect(opts.transaction, 'every delete-path query must run inside the transaction').toBe(t);
      void sql;
    }
    expect(calls.some(([sql]) => sql.includes('DELETE FROM flag_overrides'))).toBe(true);
    expect(calls.some(([sql]) => sql.includes('INSERT INTO flag_audit'))).toBe(true);
  });

  it('returns the delete-path whitelist rejection to the admin caller', () => {
    const start = adminRoutes.indexOf("router.delete('/:flag/override'");
    const end = adminRoutes.indexOf('/** GET /api/admin/flags/:flag/audit', start);
    const deleteRoute = adminRoutes.slice(start, end);

    expect(deleteRoute).toContain('const result = await deleteOverride');
    expect(deleteRoute).toContain('if (result.error) return res.status(result.status || 400)');
  });

});
