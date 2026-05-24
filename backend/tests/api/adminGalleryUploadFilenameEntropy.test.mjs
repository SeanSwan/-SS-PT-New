import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin gallery single upload filename entropy', () => {
  it('uses crypto entropy for temporary uploaded gallery filenames', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminGalleryRoutes.mjs'), 'utf8');

    expect(source).toContain("from 'node:crypto'");
    expect(source).not.toContain('Math.random');
    expect(source).toContain('randomBytes');
  });

  it('uses private temp directories for RAW conversion work files', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminGalleryRoutes.mjs'), 'utf8');

    expect(source).toContain('mkdtempSync');
    expect(source).toContain('createRawConversionTempPaths');
    expect(source).not.toContain('reprocess_${photo.id}.arw');
    expect(source).not.toContain('bg_${bgPhotoId}.arw');
    expect(source).not.toContain('repair-${id}.arw');
  });

  it('does not return stack traces from gallery route JSON responses', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminGalleryRoutes.mjs'), 'utf8');

    expect(source).not.toContain('stack: err.stack');
    expect(source).not.toContain('stack: error.stack');
  });
});
