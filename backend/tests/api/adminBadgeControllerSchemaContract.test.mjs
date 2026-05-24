import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin badge controller schema contract', () => {
  it('imports the canonical Badge model and writes canonical badge columns', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/adminBadgeController.mjs'), 'utf8');

    expect(source).toContain("import Badge from '../models/Badge.mjs'");
    expect(source).not.toContain("import { Badge } from '../models/index.mjs'");
    expect(source).toContain("criteriaType: 'custom_criteria'");
    expect(source).toContain('createdBy: req.user.id');
    expect(source).toContain('rewards: { points:');
    expect(source).not.toContain('xpReward }');
    expect(source).not.toContain('xpReward,');
  });
});
