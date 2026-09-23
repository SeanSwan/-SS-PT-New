import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../socket/socketManager.mjs'), 'utf8');
const compact = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ');

/**
 * D-01 regression guard (second-opinion pass, fixed in the seat-3 fixing pass).
 *
 * `dashboard:admin:active` was joined from the CLIENT-supplied
 * `socket.handshake.query.dashboard === 'admin'` at connection time, with no
 * authentication — socketManager.mjs has no io.use() at all and authentication
 * is opt-in via an `authenticate` event. Any socket could sit in the admin room.
 *
 * Fix: the join moved into joinDashboardRooms(), which only runs after the JWT
 * is verified, under the verified ADMIN role.
 */
describe('admin socket room is role-gated (D-01)', () => {
  it('no longer joins the admin room from the handshake query string', () => {
    expect(compact).not.toContain("socket.handshake.query.dashboard === 'admin'");
  });

  it('joins the admin room only under the verified ADMIN role', () => {
    expect(compact).toContain("'dashboard:admin', 'dashboard:trainer', 'dashboard:client', 'dashboard:admin:active'");
    // and that push is inside the ADMIN case of the role switch
    const adminCase = compact.indexOf("case 'ADMIN':");
    const pushIdx = compact.indexOf("'dashboard:admin:active'");
    expect(adminCase).toBeGreaterThan(-1);
    expect(pushIdx).toBeGreaterThan(adminCase);
  });

  it('emits the admin payload only to a verified ADMIN', () => {
    const guard = compact.indexOf("if (role === 'ADMIN') {");
    const emit = compact.indexOf("admin:dashboard_ready'");
    expect(guard).toBeGreaterThan(-1);
    expect(emit).toBeGreaterThan(guard);
  });

  it('keeps joinDashboardRooms driven by the verified role', () => {
    expect(compact).toContain('async function joinDashboardRooms(socket, userRole)');
    expect(compact).toContain('String(userRole || \'\').toUpperCase()');
  });

  it('records why the join moved', () => {
    expect(source).toContain('D-01 fix');
  });

  it('verifies a handshake-presented token at connect time via io.use (D-01 residual)', () => {
    expect(compact).toContain('io.use(async (socket, next)');
    // middleware runs before the connection handler
    expect(compact.indexOf('io.use(')).toBeLessThan(compact.indexOf("io.on('connection'"));
  });

  it('handshake middleware never rejects the connection (additive, non-breaking)', () => {
    expect(compact).not.toContain('next(new Error');
    expect(compact).not.toContain('next(new jwt.');
  });

  it('rejects non-access token families for socket auth (same class as E-02)', () => {
    expect(compact).toContain("decoded?.tokenType !== 'access'");
  });
});
