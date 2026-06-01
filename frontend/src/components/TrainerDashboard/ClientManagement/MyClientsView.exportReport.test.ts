import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(resolve(__dirname, './MyClientsView.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
const SECTIONS_SOURCE = readFileSync(resolve(__dirname, './MyClientsView.sections.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

describe('MyClientsView export report wiring', () => {
  it('wires Export Report to a real client CSV export instead of a coming-soon toast', () => {
    expect(SOURCE).toMatch(/downloadTrainerClientReport/);
    expect(SOURCE).toMatch(/handleExportReport/);
    expect(SOURCE).toMatch(/onExportReport=\{handleExportReport\}/);
    expect(SECTIONS_SOURCE).toMatch(/onClick=\{onExportReport\}/);
    expect(SOURCE).not.toMatch(/Client export feature in development/);
  });
});
