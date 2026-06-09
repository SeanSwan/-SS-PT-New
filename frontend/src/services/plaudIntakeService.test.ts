/**
 * plaudIntakeService source-shape tests.
 * =====================================
 * Locks the unified PLAUD intake queue contract used by the top-level
 * workspace. Behavioral HTTP tests remain covered by backend route tests.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as plaudIntakeService from './plaudIntakeService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = readFileSync(resolve(__dirname, 'plaudIntakeService.ts'), 'utf8');

describe('plaudIntakeService', () => {
  it('exports listPlaudIntakeItems', () => {
    expect(typeof plaudIntakeService.listPlaudIntakeItems).toBe('function');
  });

  it('uses the unified /api/plaud/intake endpoint through apiService', () => {
    expect(SRC).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
    expect(SRC).toMatch(/\/api\/plaud\/intake/);
    expect(SRC).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(SRC).not.toMatch(/Bearer \$\{token\}/);
  });

  it('models only list-safe queue metadata', () => {
    expect(SRC).toMatch(/source:\s*'manual_upload'\s*\|\s*'applaud_webhook'\s*\|\s*'applaud_local_sync'\s*\|\s*'plaud_merge'/);
    expect(SRC).toMatch(/needs_clarification/);
    expect(SRC).toMatch(/duplicate_hold/);
    expect(SRC).toMatch(/playbackReady\?:\s*boolean/);
    expect(SRC).toMatch(/playbackPath\?:\s*string\s*\|\s*null/);
    expect(SRC).not.toMatch(/transcript:/);
    expect(SRC).not.toMatch(/parsedWorkout:/);
  });

  it('defaults the workspace request to actionable queue items', () => {
    expect(SRC).toMatch(/scope\s*=\s*['"]actionable['"]/);
  });
});
