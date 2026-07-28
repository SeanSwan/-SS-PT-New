import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FORMAT_CONFIG } from '../../services/bootcamp/bootcampConstants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/bootcampRoutes.mjs'), 'utf8');

describe('bootcamp route format contract', () => {
  it('accepts every class format supported by the bootcamp generator', () => {
    expect(Object.keys(FORMAT_CONFIG).length).toBeGreaterThan(0);
    expect(routeSource).toContain('const VALID_FORMATS = Object.freeze(Object.keys(FORMAT_CONFIG));');
    expect(routeSource).toContain('VALID_FORMATS.includes(classFormat)');
  });

  it('maps internal bootcamp route errors to stable public responses without exporting helpers', () => {
    const spaceUpdateRoute = routeSource.slice(
      routeSource.indexOf("router.put('/spaces/:id'"),
      routeSource.indexOf("router.get('/trends'")
    );
    const trendApproveRoute = routeSource.slice(
      routeSource.indexOf("router.post('/trends/:id/approve'"),
      routeSource.indexOf("router.get('/exercises'")
    );

    expect(routeSource).toContain('const NOT_FOUND_PATTERN = /not found/i;');
    expect(routeSource).toContain('const getBootcampRouteErrorResponse = (');
    expect(routeSource).not.toContain('export const getBootcampRouteErrorResponse');
    expect(spaceUpdateRoute).toContain('getBootcampRouteErrorResponse(');
    expect(trendApproveRoute).toContain('getBootcampRouteErrorResponse(');
    expect(spaceUpdateRoute).not.toContain('error: err.message');
    expect(trendApproveRoute).not.toContain('error: err.message');
  });

  it('forwards valid OPT phase selections into the generator options', () => {
    const normalizedRouteSource = routeSource.replace(/\r\n/g, '\n');

    expect(normalizedRouteSource).toContain('name, optPhase, includeStretch, stretchDurationMin');
    expect(normalizedRouteSource).toContain('const parsedOptPhase = optPhase == null ? NaN : parseInt(optPhase, 10);');
    expect(normalizedRouteSource).toContain('parsedOptPhase >= 1 && parsedOptPhase <= 5');
    expect(normalizedRouteSource).toContain('optPhase: safeOptPhase');
  });
});
