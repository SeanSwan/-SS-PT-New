import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3a — un-watermarked print-master pipeline (source contract).
 *
 * No R2 in dev, so this locks the load-bearing INVARIANTS by asserting the
 * source of the pipeline. The security-critical ones (unguessable master key,
 * master never turned into a public URL, master never selected by the public
 * download-all zip, presigned-only delivery) are the point of the slice — a
 * regression on any of them silently defeats the print paywall.
 */
const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('gallery print-master: model + migration', () => {
  const model = readSource('models/GalleryPhoto.mjs');

  it('declares originalStorageKey mapped to a nullable original_storage_key column', () => {
    expect(model).toMatch(/originalStorageKey:\s*\{[^}]*allowNull:\s*true[^}]*field:\s*'original_storage_key'/);
  });

  it('ships an additive, idempotent, nullable migration for original_storage_key', () => {
    const mig = readSource('migrations/20260706010000-add-original-storage-key-to-gallery-photos.cjs');
    expect(mig).toContain("addColumn('gallery_photos', 'original_storage_key'");
    expect(mig).toMatch(/allowNull:\s*true/);
    // Idempotent on re-run (Render migrates at build time).
    expect(mig).toContain("already exists");
    expect(mig).toContain("removeColumn('gallery_photos', 'original_storage_key'");
  });
});

describe('gallery print-master: upload handlers (adminGalleryRoutes)', () => {
  const src = readSource('routes/adminGalleryRoutes.mjs');

  it('gates master storage behind an opt-in storeMaster flag (default OFF)', () => {
    // Read as a string, only stored when explicitly "true" — new-galleries-only,
    // storage does not double for every gallery.
    expect(src).toContain("const storeMaster = req.body.storeMaster === 'true';");
  });

  it('stores the master under an UNGUESSABLE private key (anti-leak — public key is guessable)', () => {
    // The public watermarked object is at gallery/{slug}/{n}.jpg and the bucket
    // is public via R2_PUBLIC_URL, so the master MUST carry a random token.
    expect(src).toContain('gallery-originals/');
    expect(src).toContain("randomBytes(16).toString('hex')");
    // Key is only generated when storeMaster is on.
    expect(src).toMatch(/const masterKey = storeMaster[\s\S]*?gallery-originals\/\$\{event\.slug\}\/\$\{photoNumber\}-\$\{randomBytes\(16\)\.toString\('hex'\)\}\.jpg/);
  });

  it('never turns the master into a public URL (the paywall guard)', () => {
    // buildUrl() is the public-URL builder — it must NEVER see the master key.
    expect(src).not.toContain('buildUrl(masterKey)');
    expect(src).not.toContain('buildUrl(originalStorageKey)');
  });

  it('PUTs the master with private, non-cacheable headers', () => {
    expect(src).toContain("CacheControl: 'private, no-store'");
  });

  it('captures the pristine ORIGINAL (pre-watermark) as the master, not the watermarked output', () => {
    // masterBuffer is taken from inputBuffer BEFORE applyWatermark; processedBuffer
    // (watermarked) is what lands at the public key.
    expect(src).toContain('const masterBuffer = masterKey ? inputBuffer : null;');
    // Public object is still the watermarked processedBuffer.
    expect(src).toMatch(/Key:\s*storageKey,\s*Body:\s*processedBuffer/);
    // Master object is the untouched masterBuffer.
    expect(src).toMatch(/Key:\s*masterKey,\s*Body:\s*masterBuffer/);
  });

  it('persists original_storage_key in the single-upload raw INSERT', () => {
    expect(src).toContain('original_storage_key, created_at, updated_at');
    expect(src).toContain(':originalStorageKey, NOW(), NOW()');
    expect(src).toContain('originalStorageKey: originalStorageKey ?? null,');
  });

  it('persists originalStorageKey in the batch-upload ORM create', () => {
    expect(src).toMatch(/mimeType:\s*'image\/jpeg',\s*originalStorageKey,\s*metadata,/);
  });
});

describe('gallery print-master: admin-gated presigned delivery', () => {
  const src = readSource('routes/adminGalleryRoutes.mjs');

  it('exposes GET /photos/:photoId/original-url with a numeric-id guard', () => {
    expect(src).toContain("router.get('/photos/:photoId/original-url'");
    expect(src).toContain('const photoId = parseInt(req.params.photoId, 10);');
    expect(src).toContain("error: 'Invalid photo id'");
  });

  it('404s when the photo has no stored master and delivers via the presigned helper', () => {
    expect(src).toContain('No print master stored for this photo');
    expect(src).toContain('generateGalleryOriginalUrl(photoRow.originalStorageKey');
  });

  it('lives behind the file-wide admin|trainer gate (no per-route auth bypass)', () => {
    // The router applies protect + admin|trainer once at the top; the route must
    // sit after it and add no relaxed middleware of its own.
    const gateIdx = src.indexOf("Admin or trainer access required");
    const routeIdx = src.indexOf("router.get('/photos/:photoId/original-url'");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(routeIdx).toBeGreaterThan(gateIdx);
  });
});

describe('gallery print-master: presigned helper (r2StorageService)', () => {
  const src = readSource('services/r2StorageService.mjs');

  it('generateGalleryOriginalUrl issues a short-lived attachment presigned GET', () => {
    expect(src).toContain('export async function generateGalleryOriginalUrl(objectKey');
    expect(src).toContain("ResponseContentDisposition: 'attachment'");
    expect(src).toContain('const GALLERY_ORIGINAL_TTL_SECONDS = 900;');
    expect(src).toContain('new GetObjectCommand(');
  });
});

describe('gallery print-master: the public download-all zip never leaks the master', () => {
  it('download-all selects only storage_key, never original_storage_key', () => {
    const src = readSource('routes/galleryRoutes.mjs');
    const start = src.indexOf("router.get('/events/:slug/download-all'");
    const end = src.indexOf('Enhancement Credits Constants', start);
    const block = start >= 0 && end > start ? src.slice(start, end) : '';
    expect(block).not.toEqual('');
    expect(block).not.toContain('original_storage_key');
    expect(block).not.toContain('originalStorageKey');
    // Still zips the watermarked public object.
    expect(block).toContain('storage_key as "storageKey"');
  });
});

describe('gallery print-master: frontend uploader wiring', () => {
  const base = '../frontend/src/components/DashBoard/Pages/admin-gallery';

  it('adminGalleryApi appends storeMaster to the upload FormData', () => {
    const api = readSource(`${base}/adminGalleryApi.ts`);
    expect(api).toContain("form.append('storeMaster', storeMaster ? 'true' : 'false');");
    expect(api).toMatch(/storeMaster:\s*boolean;/);
  });

  it('useGalleryUpload threads storeMaster into the single-upload call', () => {
    const hook = readSource(`${base}/hooks/useGalleryUpload.ts`);
    expect(hook).toMatch(/uploadSinglePhoto\(eventId, files\[i\], \{\s*watermark,\s*storeMaster,/);
  });

  it('PhotoUploader renders the Store print master toggle', () => {
    const ui = readSource(`${base}/components/PhotoUploader.tsx`);
    expect(ui).toContain('label="Store print master"');
    expect(ui).toContain('checked={storeMaster}');
    expect(ui).toContain('onChange={onStoreMasterChange}');
  });

  it('AdminGalleryStudio defaults storeMaster OFF and passes it to the uploader', () => {
    const page = readSource(`${base}/AdminGalleryStudio.tsx`);
    expect(page).toContain('const [storeMaster, setStoreMaster] = useState(false);');
    expect(page).toContain('storeMaster={storeMaster}');
    expect(page).toContain('upload.start(id, files, watermark, storeMaster,');
  });
});
