import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const styles = readFileSync(resolve(__dirname, './ClientsWorkspace.styles.ts'), 'utf8');

describe('ClientsWorkspace mobile selected-client header contract', () => {
  it('suppresses the duplicate full client card on small selected-client detail screens', () => {
    expect(styles).toContain('> section + *');
    expect(styles).toContain('display: none;');
  });

  it('keeps client-management top action labels wrap-safe', () => {
    expect(styles).toContain('overflow-wrap: anywhere');
    expect(styles).not.toContain('white-space: nowrap');
  });

  it('keeps filled action contrast tokenized instead of raw white literals', () => {
    expect(styles).toContain('var(--button-text, #FFFFFF)');
    expect(styles).not.toContain("? '#FFFFFF'");
  });

  it('makes the selected-client detail surface a smooth single-scroll owner', () => {
    const contentAreaBlock = styles.slice(
      styles.indexOf('export const ContentArea'),
      styles.indexOf('export const DetailScrollWrap')
    );

    expect(contentAreaBlock).toContain('min-height: 0');
    expect(styles).toContain('scroll-behavior: smooth');
    expect(styles).toContain('scrollbar-gutter: stable');
    expect(styles).toContain('overscroll-behavior: contain');
    expect(styles).toContain('padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))');
  });

  it('keeps desktop client cards pixel-even while leaving mobile card height natural', () => {
    const cardGridBlock = styles.slice(
      styles.indexOf('export const CardGrid'),
      styles.indexOf('export const EmptyHub')
    );

    expect(cardGridBlock).toContain('--client-card-desktop-row: 520px');
    expect(cardGridBlock).toContain('grid-auto-rows: var(--client-card-desktop-row)');
    expect(cardGridBlock).toContain('@media (min-width: 2560px)');
    expect(cardGridBlock).toContain('--client-card-desktop-row: 560px');
    expect(cardGridBlock).toContain('@media (min-width: 3840px)');
    expect(cardGridBlock).toContain('--client-card-desktop-row: 620px');
    expect(cardGridBlock).toMatch(/@media \(max-width: 768px\)[\s\S]*grid-auto-rows: auto/);
  });

  it('raises the Client Hub readability floor on 4K monitor-class screens', () => {
    expect(styles).toContain('@media (min-width: 2560px)');
    expect(styles).toContain('--client-hub-density-scale: 1.08');
    expect(styles).toContain('@media (min-width: 3840px)');
    expect(styles).toContain('--client-hub-density-scale: 1.16');
  });
});
