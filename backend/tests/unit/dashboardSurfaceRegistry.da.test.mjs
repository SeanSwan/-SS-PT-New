/**
 * G08 — dashboard surface adapter registry DA contract tests.
 *
 * Packet 19 shape, contract 32 waves: every audited domain declares a surface
 * row; activation is receipt-gated; unknown/unproved rows stay explain-only;
 * a catalog name is not proof — active commandKeys must exist in the
 * initialized command registry; hostile key probes cannot alter policy.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  SURFACE_DOMAIN_IDS,
  getSurfaceAdapter,
  getSurfaceCapabilityManifest,
} from '../../services/ai/dashboardSurfaceRegistry.mjs';
import { getAllCommands, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

beforeAll(() => {
  initializeRegistry();
});

describe('G08 surface adapter registry', () => {
  it('declares all 24 domains exactly once with complete packet-19 rows', () => {
    expect(SURFACE_DOMAIN_IDS).toHaveLength(24);
    expect(new Set(SURFACE_DOMAIN_IDS).size).toBe(24);
    for (const id of SURFACE_DOMAIN_IDS) {
      const row = getSurfaceAdapter(id);
      expect(row, id).toBeTruthy();
      expect(row.surfaceKey).toBe(id);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.routePatterns.length).toBeGreaterThan(0);
      expect(row.roles.length).toBeGreaterThan(0);
      expect(row.targetSource.length).toBeGreaterThan(0);
      expect(row.privacyClass.length).toBeGreaterThan(0);
      expect(['active', 'explain']).toContain(row.activation.state);
      // DA-08: a manual fallback exists for every row, active or not.
      expect(row.manualFallbackRoute.startsWith('/')).toBe(true);
    }
  });

  it('DA-01: manifest reads are declarations only — scoped by role, no entity data', () => {
    const admin = getSurfaceCapabilityManifest({ role: 'admin', surfaceKey: 'D03' });
    expect(admin.state).toBe('ok');
    expect(admin.surface.surfaceKey).toBe('D03');
    // Declarations, never records: no client/entity payloads in a manifest row.
    const serialized = JSON.stringify(admin);
    expect(serialized).not.toMatch(/"clientId"|"userId":\d|"email"/);
  });

  it('DA-02: role-invisible and unknown surfaces resolve to explain-only, never capabilities', () => {
    const hidden = getSurfaceCapabilityManifest({ role: 'trainer', surfaceKey: 'D22' });
    expect(hidden.state).toBe('explain');
    expect(hidden.reason).toBe('role_not_visible');
    expect(hidden.surface.capabilities).toEqual([]);

    const unknown = getSurfaceCapabilityManifest({ role: 'admin', surfaceKey: 'D99' });
    expect(unknown.state).toBe('explain');
    expect(unknown.reason).toBe('unknown_surface');
    expect(unknown.surface.capabilities).toEqual([]);
  });

  it('DA-03: hostile key probes cannot alter the registry or escalate activation', () => {
    for (const hostile of ['__proto__', 'constructor', 'D01/../D22', 'd01', '{"role":"admin"}']) {
      const out = getSurfaceCapabilityManifest({ role: 'admin', surfaceKey: hostile });
      expect(out.state).toBe('explain');
      expect(out.reason).toBe('unknown_surface');
    }
    // The registry itself was not polluted into a new domain.
    expect(SURFACE_DOMAIN_IDS.filter((id) => id === 'D01')).toHaveLength(1);
    expect(getSurfaceAdapter('__proto__')).toBeNull();
  });

  it('DA-07: active rows declare refresh keys and their command keys really exist', () => {
    const known = new Set(getAllCommands().map((command) => command.type));
    const activeRows = SURFACE_DOMAIN_IDS
      .map((id) => getSurfaceAdapter(id))
      .filter((row) => row.activation.state === 'active');
    expect(activeRows.length).toBeGreaterThanOrEqual(6);
    for (const row of activeRows) {
      expect(row.refreshKeys.length, row.surfaceKey).toBeGreaterThan(0);
      for (const key of row.commandKeys) {
        expect(known.has(key), `${row.surfaceKey} commandKey ${key}`).toBe(true);
      }
    }
  });

  it('DA-08: explain rows declare no command capabilities and keep a working fallback', () => {
    const explainRows = SURFACE_DOMAIN_IDS
      .map((id) => getSurfaceAdapter(id))
      .filter((row) => row.activation.state === 'explain');
    expect(explainRows.length).toBeGreaterThanOrEqual(10);
    for (const row of explainRows) {
      expect(row.commandKeys, row.surfaceKey).toEqual([]);
      expect(row.refreshKeys, row.surfaceKey).toEqual([]);
      expect(row.activation.reason.length).toBeGreaterThan(0);
    }
    // Contract-fixed explain/navigate rows stay explain.
    for (const fixed of ['D07', 'D09', 'D10', 'D17', 'D22']) {
      expect(getSurfaceAdapter(fixed).activation.state).toBe('explain');
    }
  });
});
