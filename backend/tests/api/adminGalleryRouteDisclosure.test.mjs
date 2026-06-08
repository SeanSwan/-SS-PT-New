import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('admin gallery route disclosure hardening', () => {
  it('locks the active admin gallery mount', () => {
    const coreRoutesSource = readSource('core/routes.mjs');
    const adminGallerySource = readSource('routes/adminGalleryRoutes.mjs');

    expect(coreRoutesSource).toContain("app.use('/api/admin/gallery', adminGalleryRoutes)");
    expect(adminGallerySource).toContain("router.post('/events/:id/upload-single'");
    expect(adminGallerySource).toContain("router.post('/events/:id/upload'");
    expect(adminGallerySource).toContain("router.post('/events/:id/confirm-upload'");
    expect(adminGallerySource).toContain("router.delete('/photos/:photoId'");
  });

  it('does not echo raw admin gallery exception details in JSON responses', () => {
    const source = readSource('routes/adminGalleryRoutes.mjs');

    expect(source).not.toContain('? `Upload rejected: ${err.message}`');
    expect(source).not.toContain('? `Upload rejected: ${err.message}${err.field ? ` (field: ${err.field})` : ');
    expect(source).not.toContain(": err.message || 'File upload failed'");
    expect(source).not.toContain("error: err.message || 'Upload failed'");
    expect(source).not.toContain("error: err.message || 'Failed to upload photos'");
    expect(source).not.toContain("error: err.message || 'Failed to generate upload URLs'");
    expect(source).not.toContain("return res.json({ success: false, error: err.message, code: err.Code || err.name });");
    expect(source).not.toContain("error: err.message || 'Failed to confirm uploads'");
    expect(source).not.toContain('error: `Failed to delete photo: ${err.message}`');
    expect(source).not.toContain("results.push({ id, display_name, storage_key, status: 'error', error: err.message });");
    expect(source).not.toContain('error: `Repair failed: ${err.message}`');
    expect(source).not.toContain('error: `Reset failed: ${err.message}`');
  });
});
