import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin video upload filename entropy', () => {
  it('uses crypto entropy for uploaded video filenames', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/videoLibraryRoutes.mjs'), 'utf8');

    expect(source).toContain("from 'node:crypto'");
    expect(source).not.toContain('Math.random');
    expect(source).toContain('randomBytes');
  });
});
