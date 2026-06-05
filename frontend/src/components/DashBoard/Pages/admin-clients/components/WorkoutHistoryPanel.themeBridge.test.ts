import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const layoutStylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.layoutStyles.ts'),
  'utf8',
);
const editStylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.styles.ts'),
  'utf8',
);
const combinedSource = `${layoutStylesSource}\n${editStylesSource}`;

describe('WorkoutHistoryPanel theme bridge', () => {
  it('routes shell, edit, notes, and error chrome through dashboard tokens', () => {
    [
      'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
      'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
      'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)',
      'var(--text-secondary, #8BA8C8)',
      'var(--border-accent-soft',
      'var(--border-danger-soft',
      'var(--bg-base, #0A0A0F)',
    ].forEach((tokenizedDeclaration) => {
      expect(combinedSource).toContain(tokenizedDeclaration);
    });
  });

  it('does not keep raw alpha palette declarations in the canonical panel helpers', () => {
    [
      'rgba(96, 192, 240, 0.15)',
      'rgba(96, 192, 240, 0.4)',
      'rgba(96, 192, 240, 0.25)',
      'rgba(96, 192, 240, 0.06)',
      'rgba(96, 192, 240, 0.35)',
      'rgba(96, 192, 240, 0.14)',
      'rgba(224, 236, 244, 0.06)',
      'rgba(224, 236, 244, 0.15)',
      'rgba(224, 236, 244, 0.12)',
      'rgba(224, 236, 244, 0.55)',
      'rgba(201, 42, 84, 0.12)',
      'rgba(201, 42, 84, 0.3)',
      'rgba(201, 42, 84, 0.2)',
      'rgba(139, 92, 246, 0.12)',
      'rgba(139, 92, 246, 0.3)',
      'rgba(139, 92, 246, 0.2)',
      'rgba(0, 0, 0, 0.25)',
      'rgba(255, 255, 255, 0.08)',
      'rgba(255, 255, 255, 0.6)',
    ].forEach((rawDeclaration) => {
      expect(combinedSource).not.toContain(rawDeclaration);
    });
  });
});
