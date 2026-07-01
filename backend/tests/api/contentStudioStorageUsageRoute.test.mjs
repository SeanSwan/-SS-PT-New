import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/contentStudioRoutes.mjs'),
  'utf8',
);

describe('Content Studio storage usage route contract', () => {
  it('mounts the admin-only storage usage endpoint consumed by the dashboard meter', () => {
    expect(routeSource).toContain('contentStudioStorageUsageService.mjs');
    expect(routeSource).toContain('loadContentStudioStorageUsage');
    expect(routeSource).toContain("router.get('/storage-usage', protect, adminOnly, async (req, res) => {");
    expect(routeSource).toContain('data: { ...EMPTY_CONTENT_STUDIO_STORAGE_USAGE }');
  });
});