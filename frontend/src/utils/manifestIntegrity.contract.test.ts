/**
 * manifestIntegrity.contract.test.ts
 * ====================================
 * Delivery & Resilience audit lock (2026-07-29): every PNG size the PWA
 * manifest declared was false (Logo.png 1024² declared 192², swan-tile-big
 * 3072²/3.8MB declared 512²), the theme color contradicted index.html, and
 * the description used "AI-powered" (brand law: never "AI" user-facing).
 * This suite reads the REAL PNG headers so declarations can't lie again.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PUB = resolve(__dirname, '../../public');
const readPub = (rel: string) => readFileSync(resolve(PUB, rel.replace(/^\//, '')));

const pngSize = (buf: Buffer) =>
  `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;

type IconEntry = { src: string; sizes: string; type: string };
const manifest = JSON.parse(
  readFileSync(resolve(PUB, 'manifest.json'), 'utf8')
) as {
  description: string;
  theme_color: string;
  icons: IconEntry[];
  screenshots?: IconEntry[];
  shortcuts?: Array<{ icons?: IconEntry[] }>;
};

const allPngEntries: IconEntry[] = [
  ...manifest.icons,
  ...(manifest.screenshots ?? []),
  ...(manifest.shortcuts ?? []).flatMap((s) => s.icons ?? []),
].filter((i) => i.type === 'image/png');

describe('PWA manifest integrity', () => {
  it('every declared PNG icon exists and its real IHDR dimensions match the declaration', () => {
    expect(allPngEntries.length).toBeGreaterThan(0);
    for (const icon of allPngEntries) {
      const buf = readPub(icon.src);
      expect(`${icon.src} ${pngSize(buf)}`).toBe(`${icon.src} ${icon.sizes}`);
    }
  });

  it('declares no icon heavier than 400KB (swan-tile-big was 3.8MB)', () => {
    for (const icon of allPngEntries) {
      expect(readPub(icon.src).byteLength).toBeLessThan(400 * 1024);
    }
  });

  it('theme_color matches the index.html meta theme-color (they drifted: #16213e vs #002060)', () => {
    const html = readFileSync(resolve(PUB, '../index.html'), 'utf8');
    const meta = html.match(/<meta name="theme-color" content="([^"]+)"/);
    expect(manifest.theme_color).toBe(meta?.[1]);
  });

  it('user-facing description never says "AI" (Swan Coach branding law)', () => {
    expect(manifest.description).not.toMatch(/\bAI\b/);
  });

  it('index.html apple-touch icons point at files that exist', () => {
    const html = readFileSync(resolve(PUB, '../index.html'), 'utf8');
    const hrefs = [...html.matchAll(/rel="apple-touch-icon"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(() => readPub(href)).not.toThrow();
  });
});
