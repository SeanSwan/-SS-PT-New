import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientAccessSource = readFileSync(resolve(__dirname, '../../utils/clientAccess.mjs'), 'utf8');
const photoRouteSource = readFileSync(resolve(__dirname, '../../routes/clientPhotoRoutes.mjs'), 'utf8');
const noteRouteSource = readFileSync(resolve(__dirname, '../../routes/clientNoteRoutes.mjs'), 'utf8');

describe('shared dashboard route hardening', () => {
  it('rejects non-integer and non-positive client IDs before model lookup', async () => {
    const { ensureClientAccess } = await import('../../utils/clientAccess.mjs');

    for (const input of ['1.5', 0, '-1']) {
      const result = await ensureClientAccess({ user: { id: 1, role: 'admin' } }, input);
      expect(result).toMatchObject({ allowed: false, status: 400 });
    }

    expect(clientAccessSource).toContain('Number.isInteger(id) && id > 0 ? id : null');
  });

  it('caps photo and note pagination limits', () => {
    expect(photoRouteSource).toContain('function parseOptionalInteger(value, fallback, { min, max })');
    expect(photoRouteSource).toContain('const safeLimit = parseOptionalInteger(limit, 20, { min: 1, max: 100 });');
    expect(photoRouteSource).toContain("return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });");
    expect(photoRouteSource).toContain('limit: safeLimit');
    expect(photoRouteSource).not.toContain('limit: parseInt(limit)');
    expect(photoRouteSource).not.toContain('Number.parseInt(limit');

    expect(noteRouteSource).toContain('function parseOptionalInteger(value, fallback, { min, max })');
    expect(noteRouteSource).toContain('const safeLimit = parseOptionalInteger(limit, 20, { min: 1, max: 100 });');
    expect(noteRouteSource).toContain('const safeOffset = parseOptionalInteger(offset, 0, { min: 0, max: 5000 });');
    expect(noteRouteSource).toContain('limit: safeLimit');
    expect(noteRouteSource).toContain('offset: safeOffset');
    expect(noteRouteSource).not.toContain('limit: parseInt(limit)');
    expect(noteRouteSource).not.toContain('offset: parseInt(offset)');
    expect(noteRouteSource).not.toContain('Number.parseInt(limit');
    expect(noteRouteSource).not.toContain('Number.parseInt(offset');
  });

  it('does not expose raw note or photo operational errors', () => {
    for (const source of [photoRouteSource, noteRouteSource]) {
      expect(source).toContain("const INTERNAL_ERROR = 'internal_error'");
      expect(source).toContain('function sendInternalError(res, message)');
      expect(source).not.toContain('error: error.message');
      expect(source).not.toContain('message: error.message');
      expect(source).not.toContain('details: error.message');
    }
  });
});
