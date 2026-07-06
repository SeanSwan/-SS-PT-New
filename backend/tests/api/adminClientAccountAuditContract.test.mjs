import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Money-path forensics contract for admin client account-control changes.
 *
 * Regression guard for the 2026-07-05 audit finding: PUT /api/admin/clients/:id
 * (adminClientController.updateClient) flipped sessionBillingMode (paid <-> free)
 * — a revenue-affecting field — and committed with ZERO audit trail. This locks
 * in an append-only AdminAccountAuditLog row for sensitive account fields,
 * written INSIDE the transaction (fail-closed), snapshotting state BEFORE update.
 *
 * Mirrors sessionAllocationClientSourceBoundary.test.mjs (source-contract style;
 * DB-free) — the repo's established pattern for money-path audit verification.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(
  resolve(__dirname, '../../controllers/adminClientController.mjs'),
  'utf8',
);

const updateClientRegion = () => {
  const start = controllerSource.indexOf('async updateClient(req, res)');
  const end = controllerSource.indexOf('async restoreClient(req, res)', start);
  return { start, end, source: controllerSource.slice(start, end) };
};

describe('admin client account-control audit contract', () => {
  it('imports the append-only AdminAccountAuditLog model', () => {
    expect(controllerSource).toContain(
      "import AdminAccountAuditLog from '../models/AdminAccountAuditLog.mjs';",
    );
  });

  it('writes an AdminAccountAuditLog row for sensitive account-field changes in updateClient', () => {
    const { start, end, source } = updateClientRegion();
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    expect(source).toContain('AdminAccountAuditLog.create(');
    expect(source).toContain("action: 'admin_client_account_update'");
    expect(source).toContain('previousState: auditPreviousState');
    expect(source).toContain('nextState: auditNextState');
    expect(source).toContain('actorUserId: req.user.id');
    expect(source).toContain('targetUserId: client.id');
  });

  it('audits the money-path billing field (and sibling sensitive controls)', () => {
    const { source } = updateClientRegion();
    expect(source).toContain('sessionBillingMode');
    expect(source).toContain("'clientSource'");
    expect(source).toContain("'accountStatus'");
    expect(source).toContain("'isLocked'");
  });

  it('snapshots previous state BEFORE client.update mutates the row', () => {
    const { source } = updateClientRegion();
    expect(source.indexOf('const auditPreviousState'))
      .toBeLessThan(source.indexOf('await client.update(safeUpdates'));
  });

  it('writes the audit row INSIDE the transaction, before commit (fail-closed)', () => {
    const { source } = updateClientRegion();
    const createIdx = source.indexOf('AdminAccountAuditLog.create(');
    const updateIdx = source.indexOf('await client.update(safeUpdates');
    const commitIdx = source.indexOf('await transaction.commit()');
    // ordering: update -> audit create -> commit
    expect(updateIdx).toBeLessThan(createIdx);
    expect(createIdx).toBeLessThan(commitIdx);
    // create is passed the transaction (atomic with the change)
    expect(source).toMatch(/AdminAccountAuditLog\.create\([\s\S]*?\},\s*\{\s*transaction\s*\}\)/);
  });

  it('only writes an audit row when a sensitive field actually changed', () => {
    const { source } = updateClientRegion();
    expect(source).toContain('if (Object.keys(auditNextState).length > 0)');
  });

  // Sibling coverage: createClient is the OTHER admin path that can set a
  // no-pay/free grant (sessionBillingMode: no_session_required at creation).
  it('audits the admin client CREATE path (fail-closed, before commit)', () => {
    const s = controllerSource.indexOf('async createClient(req, res)');
    const e = controllerSource.indexOf('async createExternalClient(req, res)', s);
    const region = controllerSource.slice(s, e);
    expect(region).toContain("action: 'admin_client_create'");
    expect(region).toContain('targetUserId: newClient.id');
    expect(region).toContain('sessionBillingMode: normalizedSessionBillingMode');
    expect(region).toContain('if (req.user?.id)');
    const createIdx = region.indexOf('AdminAccountAuditLog.create(');
    expect(createIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeLessThan(region.indexOf('await transaction.commit()'));
  });

  it('audits the admin external-client CREATE path (fail-closed, before commit)', () => {
    const s = controllerSource.indexOf('async createExternalClient(req, res)');
    const region = controllerSource.slice(s);
    expect(region).toContain("action: 'admin_client_create_external'");
    expect(region).toContain('if (req.user?.id)');
    const createIdx = region.indexOf('AdminAccountAuditLog.create(');
    expect(createIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeLessThan(region.indexOf('await transaction.commit()'));
  });
});
