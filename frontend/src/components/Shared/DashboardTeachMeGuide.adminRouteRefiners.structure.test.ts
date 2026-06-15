import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

const readShared = (fileName: string) => readFileSync(
  resolve(root, 'src/components/Shared', fileName),
  'utf8',
);

const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('DashboardTeachMeGuide admin route refiner structure', () => {
  it('keeps the admin Teach Me route logic split into focused files under the project line cap', () => {
    const entrySource = readShared('DashboardTeachMeGuide.adminRouteRefiners.ts');

    expect(entrySource).toContain("from './DashboardTeachMeGuide.adminCareRefiners'");
    expect(lineCount(entrySource)).toBeLessThanOrEqual(300);
    expect(lineCount(readShared('DashboardTeachMeGuide.adminCareRefiners.ts')))
      .toBeLessThanOrEqual(300);
  });
});
