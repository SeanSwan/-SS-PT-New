import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const source = read('./ClientSelectorDropdown.tsx');
const styles = read('./ClientSelectorDropdown.styles.ts');

describe('ClientSelectorDropdown style extraction', () => {
  it('keeps selector chrome extracted and clear-search touch-safe', () => {
    expect(source).not.toContain('style={{');
    expect(source).toMatch(/<ClearSearchButton[\s\S]*?type="button"/);
    expect(styles).toContain('export const MutedIconSlot');
    expect(styles).toContain('export const SelectorPlaceholder');
    expect(styles).toContain('export const ChevronIndicator');
    expect(styles).toContain('export const ClearSearchButton');
    expect(styles).toContain('export const SectionLabelIcon');
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?min-width:\s*44px/);
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?min-height:\s*44px/);
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?&:focus-visible/);
  });

  it('bridges selector source identity styling to theme variables', () => {
    expect(styles).toContain('linear-gradient(135deg, var(--accent-gold, #C6A84B)');
    expect(styles).toContain('linear-gradient(135deg, var(--bg-elevated, #1A1A24)');
    expect(styles).toContain('linear-gradient(135deg, var(--primary, #002060)');
    expect(styles).toContain('var(--button-text, #FFFFFF)');
    expect(styles).not.toContain('linear-gradient(135deg, #C6A84B');
    expect(styles).not.toContain('linear-gradient(135deg, #1A1A24');
    expect(styles).not.toContain('linear-gradient(135deg, #002060');
    expect(styles).not.toContain('var(--avatar-text, #fff)');
  });
});
