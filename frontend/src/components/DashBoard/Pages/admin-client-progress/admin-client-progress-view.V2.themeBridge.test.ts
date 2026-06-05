import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const viewSource = readFileSync(
  resolve(__dirname, 'admin-client-progress-view.V2.tsx'),
  'utf8',
);

describe('AdminClientProgressView V2 theme bridge', () => {
  it('routes active admin progress chrome through Crystalline Swan tokens', () => {
    [
      'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent)',
      'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)',
      'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)',
      'var(--text-secondary, #8BA8C8)',
      'var(--border-accent-soft',
      'var(--border-accent-subtle',
      'var(--accent-gradient-primary',
    ].forEach((tokenizedDeclaration) => {
      expect(viewSource).toContain(tokenizedDeclaration);
    });
  });

  it('does not keep raw cyan, purple, or text-alpha declarations in the canonical V2 view', () => {
    [
      'rgba(96, 192, 240, 0.05)',
      'rgba(96, 192, 240, 0.08)',
      'rgba(96, 192, 240, 0.1)',
      'rgba(96, 192, 240, 0.15)',
      'rgba(96, 192, 240, 0.03)',
      'rgba(96, 192, 240, 0.04)',
      'rgba(96, 192, 240, 0.06)',
      'rgba(139, 92, 246, 0.08)',
      'rgba(224, 236, 244, 0.6)',
      'rgba(224, 236, 244, 0.5)',
      'outline: 2px solid #60C0F0',
      'linear-gradient(135deg, #002060, #8B5CF6)',
      'linear-gradient(90deg, #002060, #8B5CF6)',
    ].forEach((rawDeclaration) => {
      expect(viewSource).not.toContain(rawDeclaration);
    });
  });
});
