import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VIDEO_ROUTES_SRC = readFileSync(resolve(process.cwd(), 'routes/videoLibraryRoutes.mjs'), 'utf8');
const MASTER_PROMPT_SRC = readFileSync(
  resolve(process.cwd(), 'services/integration/MasterPromptIntegration.mjs'),
  'utf8',
);

describe('active ESM runtime require guards', () => {
  it('video library routes use an ESM fs import for upload directory creation', () => {
    expect(VIDEO_ROUTES_SRC).toMatch(/import\s+\{\s*mkdirSync\s*\}\s+from\s+['"]fs['"]/);
    expect(VIDEO_ROUTES_SRC).not.toMatch(/require\(['"]fs['"]\)/);
  });

  it('master prompt health checks use an ESM os import', () => {
    expect(MASTER_PROMPT_SRC).toMatch(/import\s+os\s+from\s+['"]os['"]/);
    expect(MASTER_PROMPT_SRC).not.toMatch(/require\(['"]os['"]\)/);
  });
});
