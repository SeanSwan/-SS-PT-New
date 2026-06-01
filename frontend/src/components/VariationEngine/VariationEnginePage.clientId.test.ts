import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseVariationClientId } from './VariationEnginePage.logic';

const pageSource = readFileSync(resolve(__dirname, 'VariationEnginePage.tsx'), 'utf8');
const routeSource = readFileSync(resolve(process.cwd(), 'src/routes/main-routes.tsx'), 'utf8');

describe('VariationEnginePage client identity contract', () => {
  it('is mounted as a protected trainer/admin route', () => {
    expect(routeSource).toContain("path: 'variation-engine'");
    expect(routeSource).toContain("allowedRoles={['trainer', 'admin']}");
    expect(routeSource).toContain('<VariationEngine />');
  });

  it('accepts only complete positive integer client ids', () => {
    expect(parseVariationClientId('77')).toBe(77);
    expect(parseVariationClientId(' 77 ')).toBe(77);
    expect(parseVariationClientId('77junk')).toBeNull();
    expect(parseVariationClientId('0')).toBeNull();
    expect(parseVariationClientId(null)).toBeNull();
  });

  it('uses strict parsing for timeline, suggestions, and generate enablement', () => {
    expect(pageSource).toContain("import { parseVariationClientId } from './VariationEnginePage.logic';");
    expect(pageSource).toContain('const parsedClientId = parseVariationClientId(clientId);');
    expect(pageSource).toContain('const cid = parseVariationClientId(clientId);');
    expect(pageSource).toContain('if (!cid) return;');
    expect(pageSource).toContain('disabled={loading || !parsedClientId || selectedExercises.length === 0}');
    expect(pageSource).not.toContain('parseInt(clientId, 10)');
  });
});
