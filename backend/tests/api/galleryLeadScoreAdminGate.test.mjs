import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gallerySource = readFileSync(resolve(__dirname, '../../routes/galleryRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('gallery lead score admin gate', () => {
  it('keeps the gallery lead-score batch recalculation behind admin authentication', () => {
    expect(coreRoutesSource).toContain("app.use('/api/gallery', galleryRoutes)");
    expect(gallerySource).toContain("import { protect, adminOnly } from '../middleware/authMiddleware.mjs';");
    expect(gallerySource).toContain("router.post('/recalculate-lead-scores', protect, adminOnly");
  });
});
