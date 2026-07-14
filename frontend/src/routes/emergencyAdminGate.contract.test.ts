import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routesDir = __dirname;

const readSource = (path: string) => readFileSync(path, 'utf8');

/**
 * Security contract (audit 2026-07-13, P0-1):
 * /emergency-admin must never mount outside an admin-only ProtectedRoute, and
 * the orphaned emergency AdminRoute (unconditional dev bypass + localStorage
 * role check) must stay deleted.
 */
describe('emergency admin gate contracts', () => {
  it('mounts /emergency-admin inside an admin-only ProtectedRoute', () => {
    const mainRoutesSource = readSource(resolve(routesDir, 'main-routes.tsx'));

    const emergencyBlockStart = mainRoutesSource.indexOf("path: 'emergency-admin'");
    expect(emergencyBlockStart).toBeGreaterThan(-1);

    const emergencyBlock = mainRoutesSource.slice(
      emergencyBlockStart,
      mainRoutesSource.indexOf('<EmergencyDashboard />', emergencyBlockStart) + '<EmergencyDashboard />'.length
    );

    expect(emergencyBlock).toContain("allowedRoles={['admin']}");
    expect(emergencyBlock).toContain('<ProtectedRoute');
  });

  it('keeps the orphaned bypass AdminRoute deleted', () => {
    expect(existsSync(resolve(routesDir, 'admin-route.tsx'))).toBe(false);
  });

  it('keeps hooks recovery from referencing the deleted bypass route', () => {
    const hooksRecoverySource = readSource(resolve(routesDir, '../utils/hooksRecovery.js'));
    expect(hooksRecoverySource).not.toContain('admin-route.tsx');
  });
});
