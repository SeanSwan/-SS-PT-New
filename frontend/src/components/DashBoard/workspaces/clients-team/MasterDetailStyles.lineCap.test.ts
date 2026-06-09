import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const files = [
  'MasterDetailStyles.ts',
  'MasterDetailShellStyles.ts',
  'MasterDetailCardStyles.ts',
  'MasterDetailDetailStyles.ts',
  'MasterDetailIdentityStyles.ts',
];

describe('Master detail style modules', () => {
  it('keeps each master-detail style module under the 300-line cap', () => {
    for (const file of files) {
      const source = readFileSync(resolve(__dirname, file), 'utf8');
      expect(source.split(/\r?\n/).length, file).toBeLessThanOrEqual(300);
    }
  });
});
