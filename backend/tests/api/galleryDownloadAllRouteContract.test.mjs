import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('gallery download-all (batch ZIP) route contract', () => {
  const routeSource = readSource('routes/galleryRoutes.mjs');

  const start = routeSource.indexOf("router.get('/events/:slug/download-all'");
  const end = routeSource.indexOf('Enhancement Credits Constants', start);
  const block = start >= 0 && end > start ? routeSource.slice(start, end) : '';

  it('module-loads with the installed archiver ESM package', async () => {
    const module = await import('../../routes/galleryRoutes.mjs');
    expect(module.default).toBeDefined();
  });

  it('registers the batch-download route with auth BEFORE the limiter', () => {
    // Auth must run before the limiter so unauthenticated hits do not burn the
    // per-visitor budget, and before the handler.
    expect(routeSource).toMatch(
      /router\.get\('\/events\/:slug\/download-all',\s*requireGalleryAccess,\s*downloadAllLimiter/
    );
  });

  it('uses a dedicated, tighter limiter keyed per-visitor (not the 200/hr single-download limiter)', () => {
    expect(routeSource).toContain('const downloadAllLimiter = rateLimit(');
    expect(routeSource).toContain("keyGenerator: (req) => `ga_${req.galleryAccess?.visitorId ?? 'anon'}`");
    // The heavy full-gallery route must NOT reuse the loose 200/hr downloadLimiter.
    expect(block).not.toContain('downloadLimiter,');
  });

  it('runs every JSON guard (403 slug / 404 empty / 503 storage) BEFORE writing zip headers', () => {
    expect(block).not.toEqual('');
    const headerIdx = block.indexOf("res.setHeader('Content-Type', 'application/zip')");
    expect(headerIdx).toBeGreaterThan(-1);
    // Once bytes start flowing a JSON error is impossible, so all guards precede it.
    expect(block.indexOf('return res.status(403)')).toBeGreaterThan(-1);
    expect(block.indexOf('return res.status(403)')).toBeLessThan(headerIdx);
    expect(block.indexOf('return res.status(404)')).toBeGreaterThan(-1);
    expect(block.indexOf('return res.status(404)')).toBeLessThan(headerIdx);
    expect(block.indexOf('return res.status(503)')).toBeGreaterThan(-1);
    expect(block.indexOf('return res.status(503)')).toBeLessThan(headerIdx);
  });

  it('enforces the slug/token cross-check and scopes the query by the token eventId', () => {
    expect(block).toContain('req.galleryAccess.slug !== req.params.slug');
    expect(block).toContain('WHERE event_id = :eventId');
    expect(block).toContain('eventId: req.galleryAccess.eventId');
    expect(block).toContain('storage_key as "storageKey"');
  });

  it('streams from R2 one object at a time and stores JPEGs (no recompression)', () => {
    expect(routeSource).toContain("import { ZipArchive } from 'archiver';");
    expect(routeSource).not.toContain("import archiver from 'archiver';");
    expect(block).toContain('new ZipArchive({ store: true })');
    expect(block).toContain('new GetObjectCommand(');
    expect(block).toContain('archive.pipe(res)');
    expect(block).toContain('archive.finalize()');
    // Never buffer the whole image (the reprocess path does Buffer.concat — this must not).
    expect(block).not.toContain('Buffer.concat');
  });

  it('tears down on client disconnect and on archive error', () => {
    expect(block).toContain("res.on('close'");
    expect(block).toContain("archive.on('error'");
    expect(block).toContain('archive.destroy()');
  });

  it('produces collision-safe, number-prefixed zip entry names', () => {
    expect(block).toContain("padStart(3, '0')");
    expect(block).toContain('usedNames');
  });

  it('keeps the route source text-safe while rejecting control characters in ZIP entry names', () => {
    expect(routeSource).not.toContain('\u0000');
    expect(block).toContain(".replace(/[\\\\/:*?\"<>|\\x00-\\x1F]/g, '_')");
  });

  it('sanitizes the attachment ZIP filename before setting Content-Disposition', () => {
    expect(block).toContain('const zipSlug = String(req.params.slug)');
    expect(block).toContain(".replace(/[^A-Za-z0-9._-]/g, '_')");
    expect(block).toContain('const zipName = `${zipSlug}-photos.zip`;');
    expect(block).toContain("res.setHeader('Content-Disposition', `attachment; filename=\"${zipName}\"`)");
  });
});

describe('gallery download-all frontend wiring', () => {
  const galleryPage = readSource('../frontend/src/pages/GalleryPage.tsx');

  it('exposes a Download-all button that hits the batch endpoint with the access token', () => {
    expect(galleryPage).toContain('/download-all?token=');
    expect(galleryPage).toContain('handleDownloadAll');
    expect(galleryPage).toContain('Download all ');
    // Guarded on having photos + not loading.
    expect(galleryPage).toMatch(/selectedEvent && !loading && photos\.length > 0/);
  });
});

