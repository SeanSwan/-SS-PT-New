import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/pages/ForgotPasswordModal.jsx'),
  'utf8'
);
const styleSource = readFileSync(resolve(process.cwd(), 'src/pages/ForgotPasswordModal.styles.js'), 'utf8');
const source = [componentSource, styleSource].join('\n');

describe('ForgotPasswordModal production contract', () => {
  it('uses the Swan token system without inline JSX styles', () => {
    expect(source).not.toContain('style={{');
    expect(source).toContain('var(--bg-elevated, #141419)');
    expect(source).toContain('var(--accent-primary, #60C0F0)');
    expect(source).toContain('var(--danger, #C92A54)');
    expect(source).toContain('var(--success, #3BC48D)');
  });

  it('keeps close and submit controls accessible', () => {
    expect(source).toContain('min-width: 44px;');
    expect(source).toContain('min-height: 44px;');
    expect(source).toContain('aria-label="Close password reset"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="alert"');
  });
});
