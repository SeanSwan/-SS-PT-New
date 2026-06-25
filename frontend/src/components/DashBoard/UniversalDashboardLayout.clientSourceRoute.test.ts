import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = [
  readFileSync(resolve(__dirname, './UniversalDashboardLayout.tsx'), 'utf8'),
  readFileSync(resolve(__dirname, './UniversalDashboardLayout.shell.tsx'), 'utf8'),
  readFileSync(resolve(__dirname, './UniversalDashboardLayout.shellPieces.tsx'), 'utf8'),
].join('\n');

const SOURCE = source;

describe('UniversalDashboardLayout client source route boundary', () => {
  it('removes the client schedule route for Move Fitness and external clients', () => {
    expect(SOURCE).toContain("from './workspaces/clients-team/clientSessionSignal'");
    expect(SOURCE).toContain('!isNonDeductingClientSource(user?.clientSource)');
    expect(SOURCE).toMatch(/roleConfig\.routes\.filter\(\(\{\s*path\s*\}\)\s*=>\s*path\s*!==\s*['"]\/schedule['"]\)/);
  });

  it('renders the filtered client route list instead of the raw role config', () => {
    expect(SOURCE).toContain('visibleRoleRoutes.map');
    expect(SOURCE).not.toContain('roleConfig.routes.map(({ path, component: Component })');
  });

  it('uses the filtered dashboard default for direct blocked-route redirects', () => {
    const redirectsToDashboardDefault = SOURCE.match(/dashboardDefaultPath/g) || [];

    expect(SOURCE).toContain('const dashboardDefaultPath');
    expect(redirectsToDashboardDefault.length).toBeGreaterThanOrEqual(4);
  });
});
