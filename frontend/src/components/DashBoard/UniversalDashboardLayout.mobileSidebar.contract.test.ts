import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './UniversalDashboardLayout.tsx'), 'utf8');

describe('UniversalDashboardLayout mobile sidebar contract', () => {
  it('closes the controlled mobile drawer after dashboard route changes', () => {
    expect(source).toContain('setMobileSidebarOpen(false);');
    expect(source).toContain('scheduleDashboardRouteScrollReset(mainContentRef.current)');
    expect(source).toContain('}, [location.pathname]);');
  });
});
