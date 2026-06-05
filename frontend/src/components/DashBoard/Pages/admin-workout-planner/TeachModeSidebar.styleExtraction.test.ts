import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSourceIfPresent = (fileName: string) => {
  const filePath = resolve(__dirname, fileName);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
};

const source = readSourceIfPresent('./TeachModeSidebar.tsx');
const styles = readSourceIfPresent('./TeachModeSidebar.styles.ts');

describe('TeachModeSidebar style extraction', () => {
  it('keeps teach-mode sidebar styles extracted with accessible retry controls', () => {
    expect(source).not.toContain('style={{');
    expect(source).toContain("from './TeachModeSidebar.styles'");
    expect(source).toMatch(/<RetryButton[\s\S]*?type="button"/);
    expect(source).toMatch(/<TabButton[\s\S]*?type="button"/);
    expect(source).toContain('onClose?: () => void');
    expect(source).toMatch(/<TeachCloseButton[\s\S]*?type="button"/);
    expect(source).toContain('aria-label="Close Teach Mode"');
    expect(source).toContain('<ExerciseContextGrid');

    expect(styles).toContain('export const SkeletonSpacer');
    expect(styles).toContain('export const ExerciseName');
    expect(styles).toContain('export const TeachTabLabel');
    expect(styles).toContain('export const TeachErrorBox');
    expect(styles).toContain('export const TeachErrorText');
    expect(styles).toContain('export const RetryButton');
    expect(styles).toContain('export const TeachHeaderActions');
    expect(styles).toContain('export const TeachCloseButton');
    expect(styles).toContain('export const ExerciseContextGrid');
    expect(styles).toContain('export const ExerciseContextPill');
    expect(styles).toContain('var(--danger, #C92A54)');
    expect(styles).toMatch(/RetryButton[\s\S]*?min-height:\s*44px/);
    expect(styles).toMatch(/RetryButton[\s\S]*?&:focus-visible/);
    expect(styles).toMatch(/TeachCloseButton[\s\S]*?min-width:\s*44px/);
    expect(styles).toMatch(/TeachCloseButton[\s\S]*?min-height:\s*44px/);
    expect(styles).toMatch(/TeachCloseButton[\s\S]*?&:focus-visible/);
  });
});
