/**
 * tokens.themeAware.test.ts
 * =========================
 * Regression guard (dry-loop 2026-07-20): the static `theme/tokens.ts` palette was
 * invisible to the 18-theme runtime (PREREQ-SLICE-CORRECTED-2026-07-16 §2.2 — "the thing
 * that will break the dimmer switch"). Brand/glow/primary-text color tokens must be
 * expressed as `var(--token, #fallback)` so every styled-component importer re-skins
 * when the Appearance Studio switches theme/world, while keeping the exact previous
 * hex as fallback (zero visual change when variables are absent, e.g. unit tests).
 *
 * Spacing, typography, breakpoints, semantic/session status colors, and composite
 * shadows/gradients stay static by design — they are theme-neutral or have no single
 * canonical custom-property owner.
 */
import { describe, expect, it } from 'vitest';
import { theme } from './tokens';

const VAR_WRAPPED = /^var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,8}\)$/;

describe('theme/tokens.ts theme-awareness bridge', () => {
  it('wraps brand accents in canonical injected custom properties', () => {
    expect(theme.colors.brand.cyan).toBe('var(--accent-primary, #60c0f0)');
    expect(theme.colors.brand.purple).toBe('var(--accent-secondary, #8b5cf6)');
  });

  it('wraps the glow system (dual-button glow law) in injected custom properties', () => {
    expect(theme.colors.glow.primary).toBe('var(--accent-secondary, #8b5cf6)');
    expect(theme.colors.glow.cyan).toBe('var(--accent-primary, #60c0f0)');
    expect(theme.colors.glow.luxury).toBe('var(--accent-gold, #c6a84b)');
  });

  it('keeps Arctic Cyan static (data-only law: charts never re-skin off-data)', () => {
    expect(theme.colors.glow.secondary).toBe('#50a0f0');
  });

  it('bridges primary text to the runtime text token', () => {
    expect(theme.colors.text.primary).toMatch(VAR_WRAPPED);
    expect(theme.colors.text.primary).toContain('--text-primary');
  });

  it('leaves theme-neutral scales untouched', () => {
    expect(theme.spacing.md).toBe('16px');
    expect(theme.breakpoints.tablet).toBe('768px');
    expect(theme.colors.semantic.success).toBe('#22c55e');
  });
});
