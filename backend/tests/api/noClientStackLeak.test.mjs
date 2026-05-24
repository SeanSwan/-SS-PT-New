import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const read = (path) => readFileSync(join(repoRoot, path), 'utf8');

describe('client stack leak guard', () => {
  const clientFacingFiles = [
    'backend/controllers/scheduleController.mjs',
    'backend/routes/dashboard/sharedDashboardRoutes.mjs',
    'backend/routes/sessionRoutes.mjs',
    'backend/core/middleware/errorHandler.mjs',
    'backend/middleware/errorMiddleware.mjs',
  ];

  it('does not include stack traces in API JSON response payloads', () => {
    for (const file of clientFacingFiles) {
      const source = read(file);

      expect(source, file).not.toMatch(/stack:\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\?\s*(error|err|e)\.stack/);
      expect(source, file).not.toMatch(/stack:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]\s*\?\s*undefined\s*:\s*stack/);
      expect(source, file).not.toMatch(/errorResponse\.error\s*=\s*(error|err|e)\.stack/);
    }
  });
});
