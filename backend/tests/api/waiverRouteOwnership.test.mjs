/**
 * Waiver Route Ownership Guard — SWA-140 S0
 * ==========================================
 * Express matches mounts in registration order. `/api/admin/waivers` is
 * registered AFTER several bare `/api/admin` routers in core/routes.mjs, so
 * any earlier router that grows a `/waivers*` path would silently capture
 * admin waiver traffic with no test failing. This suite locks that door:
 *
 *  1. Exactly one mount each for '/api/admin/waivers' and '/api/public/waivers'.
 *  2. No `/api/admin`-mounted router registered BEFORE the waiver mount
 *     declares a route path starting with '/waivers'.
 *
 * Source-scan based (no app boot) so it runs in plain vitest with no DB.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const routesSource = readFileSync(path.join(backendRoot, 'core/routes.mjs'), 'utf8');

/** Ordered list of app.use mounts with their router identifier. */
function orderedMounts(source) {
  const mounts = [];
  const re = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_$.]+)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    mounts.push({ mountPath: m[1], routerName: m[2], index: m.index });
  }
  return mounts;
}

/** Resolve an imported identifier to its module file path (relative import only). */
function importPathFor(source, identifier) {
  const re = new RegExp(
    `import\\s+(?:${identifier}|\\{[^}]*\\b${identifier}\\b[^}]*\\})\\s+from\\s+['"]([^'"]+)['"]`,
  );
  const m = source.match(re);
  return m ? m[1] : null;
}

describe('waiver route ownership (Rule 31 guard)', () => {
  const mounts = orderedMounts(routesSource);

  it('mounts /api/admin/waivers exactly once', () => {
    const hits = mounts.filter((m) => m.mountPath === '/api/admin/waivers');
    expect(hits).toHaveLength(1);
  });

  it('mounts /api/public/waivers exactly once', () => {
    const hits = mounts.filter((m) => m.mountPath === '/api/public/waivers');
    expect(hits).toHaveLength(1);
  });

  it('no earlier /api/admin router declares a /waivers* path (shadow guard)', () => {
    const waiverMount = mounts.find((m) => m.mountPath === '/api/admin/waivers');
    expect(waiverMount).toBeDefined();

    const earlierAdminRouters = mounts.filter(
      (m) => m.mountPath === '/api/admin' && m.index < waiverMount.index,
    );
    // Sanity: the ordering hazard this guard exists for is real.
    expect(earlierAdminRouters.length).toBeGreaterThan(0);

    const offenders = [];
    for (const { routerName } of earlierAdminRouters) {
      const importPath = importPathFor(routesSource, routerName);
      if (!importPath || !importPath.startsWith('.')) continue;
      let resolved = path.resolve(path.join(backendRoot, 'core'), importPath);
      if (!existsSync(resolved) && existsSync(`${resolved}.mjs`)) resolved = `${resolved}.mjs`;
      if (!existsSync(resolved)) continue;
      const routerSource = readFileSync(resolved, 'utf8');
      if (/router\.[a-z]+\(\s*['"]\/waivers/.test(routerSource)) {
        offenders.push({ routerName, importPath });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('public waiver mount is the only /api/public* mount (no sibling shadow)', () => {
    const publicMounts = mounts.filter((m) => m.mountPath.startsWith('/api/public'));
    expect(publicMounts.map((m) => m.mountPath)).toEqual(['/api/public/waivers']);
  });
});
