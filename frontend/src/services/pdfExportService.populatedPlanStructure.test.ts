/**
 * Guards exportPopulatedPlanPDF against growing back into one inline renderer.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVICE_SOURCE = readFileSync(resolve(__dirname, 'pdfExportService.ts'), 'utf8');

describe('exportPopulatedPlanPDF structure', () => {
  it('delegates populated-plan sections to focused helpers', () => {
    expect(SERVICE_SOURCE).toContain('const addPopulatedPlanHeader');
    expect(SERVICE_SOURCE).toContain('const addPopulatedPlanSummary');
    expect(SERVICE_SOURCE).toContain('const addPopulatedPlanMesocycles');
    expect(SERVICE_SOURCE).toContain('const addPopulatedPlanRecommendations');
    expect(SERVICE_SOURCE).toContain('const addPopulatedPlanWeeks');
    expect(SERVICE_SOURCE).toContain('const buildPopulatedPlanFilename');
  });
});
