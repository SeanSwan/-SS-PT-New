import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3f — enable the client "Order prints" storefront (source contract).
 * Flag-gated OFF (PRINT_STOREFRONT_ENABLED): the existing PrintStore is un-gated only
 * when the flag is on. Off = the current disabled "Coming Soon" card (byte-identical UX).
 */
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('3f: backend surfaces the storefront flag', () => {
  const gallery = read('routes/galleryRoutes.mjs');
  it('the gallery photos response carries printStorefrontEnabled from a default-OFF env flag', () => {
    expect(gallery).toContain("printStorefrontEnabled: process.env.PRINT_STOREFRONT_ENABLED === 'true'");
  });

  it('the MONEY endpoint POST /print-order is itself server-flag-gated (not just the UI) — 10-review fix', () => {
    const start = gallery.indexOf("router.post('/print-order'");
    const end = gallery.indexOf("router.get('/print-orders'", start);
    const block = gallery.slice(start, end);
    expect(block).toContain("process.env.PRINT_STOREFRONT_ENABLED !== 'true'");
    expect(block).toMatch(/Print ordering is not currently available/);
  });

  it('checkout rejects a photo with no print master (never charge for an un-fulfillable print) — 10-review fix', () => {
    const start = gallery.indexOf("router.post('/print-order'");
    const end = gallery.indexOf("router.get('/print-orders'", start);
    const block = gallery.slice(start, end);
    expect(block).toContain('if (!photo.originalStorageKey)');
    expect(block).toMatch(/Prints are not available for this photo/);
  });
});

describe('3f: frontend un-gates the Order Print button behind the flag', () => {
  const base = '../frontend/src/pages';
  const galleryPage = read(`${base}/GalleryPage.tsx`);
  const modal = read(`${base}/gallery/PhotoDetailModal.tsx`);

  it('GalleryPage reads the flag from the photos response and threads it to the modal', () => {
    expect(galleryPage).toContain('const [printStorefrontEnabled, setPrintStorefrontEnabled] = useState(false)');
    expect(galleryPage).toContain('setPrintStorefrontEnabled(!!data.printStorefrontEnabled)');
    expect(galleryPage).toContain('printStorefrontEnabled={printStorefrontEnabled}');
  });

  it('the Order Print button is disabled+ComingSoon when OFF, enabled+opens PrintStore when ON', () => {
    expect(modal).toContain('printStorefrontEnabled?: boolean;');
    expect(modal).toContain('disabled={!printStorefrontEnabled}');
    expect(modal).toContain('onClick={printStorefrontEnabled ? () => setShowPrintStore(true) : undefined}');
    // Coming Soon badge only shows when the flag is off.
    expect(modal).toContain('{!printStorefrontEnabled && <OptionBadge');
    // the existing PrintStore (built earlier) is what opens.
    expect(modal).toContain('showPrintStore && photo && galleryToken');
  });
});
