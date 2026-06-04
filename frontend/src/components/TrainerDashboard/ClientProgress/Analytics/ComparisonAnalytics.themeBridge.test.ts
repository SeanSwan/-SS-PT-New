import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (relativePath: string) => readFileSync(
  resolve(__dirname, relativePath),
  'utf8',
);

describe('ComparisonAnalytics theme bridge', () => {
  it('keeps comparison analytics under the line cap with extracted view, styles, and logic', () => {
    const source = readSource('./ComparisonAnalytics.tsx');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source).toContain("from './ComparisonAnalyticsView'");
    expect(source).toContain("from './ComparisonAnalytics.logic'");
    expect(existsSync(resolve(__dirname, './ComparisonAnalytics.styles.ts'))).toBe(true);
    expect(existsSync(resolve(__dirname, './ComparisonAnalytics.logic.ts'))).toBe(true);
    expect(existsSync(resolve(__dirname, './ComparisonAnalyticsView.tsx'))).toBe(true);
  });

  it('bridges comparison analytics styling to dashboard theme tokens', () => {
    const styleSource = readSource('./ComparisonAnalytics.styles.ts');

    expect(styleSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('var(--text-primary');
    expect(styleSource).toContain('var(--text-secondary');
    expect(styleSource).toContain('var(--accent-primary');
    expect(styleSource).toContain('var(--shadow-strong');

    expect(styleSource).not.toContain('color: #e2e8f0');
    expect(styleSource).not.toContain('background: #1d1f2b');
    expect(styleSource).not.toContain('background: #fff');
    expect(styleSource).not.toContain('rgba(15,23,42');
  });
});
