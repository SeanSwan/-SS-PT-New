import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressView.tsx'),
  'utf8',
);
const STYLE_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressView.styles.ts'),
  'utf8',
);
const STATE_PANEL_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressViewStatePanels.tsx'),
  'utf8',
);

describe('EnhancedClientProgressView theme bridge', () => {
  it('keeps the progress shell under the line cap with extracted styles and mappers', () => {
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(SOURCE).toContain("from './EnhancedClientProgressView.styles'");
    expect(SOURCE).toContain("from './EnhancedClientProgressView.logic'");
  });

  it('bridges the canonical trainer progress shell to dashboard theme tokens', () => {
    expect(STYLE_SOURCE).toContain('var(--bg-elevated');
    expect(STYLE_SOURCE).toContain('var(--text-primary');
    expect(STYLE_SOURCE).toContain('var(--text-secondary');
    expect(STYLE_SOURCE).toContain('var(--accent-primary');
    expect(STYLE_SOURCE).toContain('var(--shadow-strong');

    expect(STYLE_SOURCE).not.toContain('color: #e2e8f0');
    expect(STYLE_SOURCE).not.toContain('color: #94a3b8');
    expect(STYLE_SOURCE).not.toContain("($active ? '#0ea5e9'");
    expect(STYLE_SOURCE).not.toContain('box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)');
  });

  it('bridges no-client and loading route states to the same dashboard tokens', () => {
    expect(STATE_PANEL_SOURCE).toContain('var(--bg-elevated');
    expect(STATE_PANEL_SOURCE).toContain('var(--text-primary');
    expect(STATE_PANEL_SOURCE).toContain('var(--text-secondary');
    expect(STATE_PANEL_SOURCE).toContain('var(--accent-primary');

    expect(STATE_PANEL_SOURCE).not.toContain('var(--surface-elevated');
    expect(STATE_PANEL_SOURCE).not.toContain('var(--border-accent-soft');
    expect(STATE_PANEL_SOURCE).not.toContain('var(--surface-interactive');
    expect(STATE_PANEL_SOURCE).not.toContain('#e2e8f0');
    expect(STATE_PANEL_SOURCE).not.toContain('#94a3b8');
    expect(STATE_PANEL_SOURCE).not.toContain('#7dd3fc');
    expect(STATE_PANEL_SOURCE).not.toContain('#0ea5e9');
  });

  it('keeps the advanced-mode quick action dock mobile-safe instead of covering progress content', () => {
    expect(STYLE_SOURCE).toContain('export const QuickActionBar');
    expect(STYLE_SOURCE).toContain('@media (max-width: 640px)');
    expect(STYLE_SOURCE).toContain('bottom: calc(12px + env(safe-area-inset-bottom, 0px))');
    expect(STYLE_SOURCE).toContain('position: sticky');
    expect(STYLE_SOURCE).toContain('z-index: 20');
    expect(STYLE_SOURCE).not.toContain('z-index: 1000');
  });
});
