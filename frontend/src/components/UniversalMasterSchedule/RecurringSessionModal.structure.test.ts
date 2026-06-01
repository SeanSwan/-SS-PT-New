import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/RecurringSessionModal.tsx'),
  'utf8'
);

const SECTIONS_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/RecurringSessionModal.sections.tsx'),
  'utf8'
);

describe('RecurringSessionModal structure', () => {
  it('keeps the modal shell below the large-file threshold by extracting form sections', () => {
    expect(SOURCE).toContain("from './RecurringSessionModal.sections'");
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(SECTIONS_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
