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
    expect(styles).toContain('swanClientActionButton');
    expect(styles).toContain('swanDataCardShell');
    expect(styles).toContain('swanPill');
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?min-width:\s*44px/);
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?min-height:\s*44px/);
    expect(styles).toMatch(/ClearSearchButton[\s\S]*?&:focus-visible/);
    expect(styles).toContain('box-sizing: border-box');
    expect(styles).toContain('background-color: var(--bg-base, #050810)');
    expect(styles).toContain('overflow-wrap: anywhere');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).not.toContain('white-space: nowrap');
    expect(styles).not.toContain('text-overflow: ellipsis');
  });

  it('bridges selector source identity styling to theme variables', () => {
    expect(source).toContain('getClientSourceTone');
    expect(source).not.toContain('$source={selectedClient.clientSource}');
    expect(source).not.toContain('$source={c.clientSource}');
    expect(styles).toContain("$source === 'mf'");
    expect(styles).not.toContain("$source === 'move_fitness'");
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
