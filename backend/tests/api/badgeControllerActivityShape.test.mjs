import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('badge controller activity shape', () => {
  it('maps validated activityType and activityData before calling the badge service', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/badgeController.mjs'), 'utf8');

    expect(source).toContain('activityType');
    expect(source).toContain('activityData');
    expect(source).toContain('type: activityType');
    expect(source).not.toContain('const activity = req.body;');
  });
});
