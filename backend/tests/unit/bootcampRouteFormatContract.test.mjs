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

  it('sanitizes immediate-regeneration exclusions before passing them to the generator', () => {
    expect(routeSource).toContain('exclusionKeys');
    expect(routeSource).toContain('Array.isArray(exclusionKeys)');
    expect(routeSource).toContain('.slice(0, 100)');
    expect(routeSource).toContain('exclusionKeys: new Set(safeExclusionKeys)');
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
});

describe('bootcamp log route contract (Slice 0.2)', () => {
  it('rejects empty or non-array exercisesUsed at the route boundary', () => {
    expect(routeSource).toContain('!Array.isArray(exercisesUsed) || exercisesUsed.length === 0');
    expect(routeSource).toContain('classDate and a non-empty exercisesUsed array are required');
  });

  it('Coach context reads the real bootcamp_class_log table (Rule 58 drift lock)', () => {
    const aiChatSource = readFileSync(resolve(__dirname, '../../services/aiChatService.mjs'), 'utf8');
    expect(aiChatSource).toContain('FROM bootcamp_class_log bcl');
    expect(aiChatSource).not.toContain('FROM bootcamp_class_logs bcl');
  });
});
