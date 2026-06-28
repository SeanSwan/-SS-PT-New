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

  it('keeps filled action contrast mapped to the active theme accent text token', () => {
    expect(styles).toContain('var(--button-primary-text, #FFFFFF)');
    expect(styles).not.toContain('var(--button-text, #FFFFFF)');
    expect(styles).not.toContain("? '#FFFFFF'");
  });

  it('delegates Clients & Team scrolling to the dashboard page instead of nested panels', () => {
    const hubBlock = styles.slice(
      styles.indexOf('export const HubContainer'),
      styles.indexOf('export const TopBar')
    );
    const contentAreaBlock = styles.slice(
      styles.indexOf('export const ContentArea'),
      styles.indexOf('export const DetailScrollWrap')
    );
    const detailBlock = styles.slice(
      styles.indexOf('export const DetailScrollWrap'),
      styles.indexOf('export const CardGrid')
    );
    const cardGridBlock = styles.slice(
      styles.indexOf('export const CardGrid'),
      styles.indexOf('export const EmptyHub')
    );

    expect(hubBlock).toContain('min-height: calc(100dvh - 64px)');
    expect(hubBlock).toContain('overflow: visible');
    expect(contentAreaBlock).toContain('overflow: visible');
    expect(detailBlock).toContain('overflow: visible');
    expect(cardGridBlock).toContain('overflow: visible');
    expect(cardGridBlock).not.toContain('overflow-y: auto');
    expect(styles).not.toContain('scrollbar-gutter: stable');
    expect(styles).toContain('padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))');
  });

  it('keeps desktop client cards aligned while allowing long cards to grow naturally', () => {
    const cardGridBlock = styles.slice(
      styles.indexOf('export const CardGrid'),
      styles.indexOf('export const EmptyHub')
    );

    expect(cardGridBlock).toContain('--client-card-desktop-row: 520px');
    expect(cardGridBlock).toContain('grid-auto-rows: minmax(var(--client-card-desktop-row), auto)');
    expect(cardGridBlock).toContain('grid-template-columns: repeat(auto-fill, minmax(min(100%, clamp(340px, 25vw, 560px)), 1fr))');
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
    expect(styles).not.toContain('max-width: 2200px');
    expect(styles).not.toContain('max-width: 3000px');
  });
});
