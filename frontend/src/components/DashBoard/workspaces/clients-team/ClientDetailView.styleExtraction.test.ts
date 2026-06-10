import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const source = read('./ClientDetailView.tsx');
const styles = read('./MasterDetailDetailStyles.ts');
const identityStyles = read('./MasterDetailIdentityStyles.ts');

describe('ClientDetailView style extraction', () => {
  it('keeps tab and placeholder chrome in styled-components', () => {
    expect(source).not.toContain('style={{');
    expect(source).toContain('<DetailTabLabel>');
    expect(source).toContain('<DetailTabPanel');
    expect(source).toContain('aria-labelledby={`detail-tab-${activeTab}`}');
    expect(styles).toContain('export const DetailTabLabel');
    expect(styles).toContain('export const DetailTabPanel');
    expect(styles).toContain('export const PlaceholderShell');
    expect(styles).toContain('export const PlaceholderTitle');
    expect(styles).toContain('export const PlaceholderText');
    expect(styles).toContain('var(--bg-surface, #141419)');
    expect(styles).toContain('var(--border-subtle, rgba(224, 236, 244, 0.05))');
  });

  it('keeps selected-client identity email compact without ellipsis', () => {
    const emailBlock = identityStyles.slice(
      identityStyles.indexOf("[data-swan-detail-email='true']"),
      identityStyles.indexOf("[data-swan-detail-email='true']") + 520
    );

    expect(emailBlock).toContain('white-space: nowrap');
    expect(emailBlock).toContain('overflow: hidden');
    expect(emailBlock).toContain('mask-image');
    expect(emailBlock).not.toContain('text-overflow: ellipsis');
    expect(source).toContain('aria-label={clientSubtext}');
    expect(source).toContain('title={clientSubtext}');
  });
});
