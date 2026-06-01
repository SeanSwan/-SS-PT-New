import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, './OverloadSuggestion.tsx'), 'utf8');

describe('OverloadSuggestion touch target contract', () => {
  it('keeps the progressive overload pill explicit and 44px touch-safe', () => {
    expect(source).toContain('<Pill');
    expect(source).toContain('type="button"');
    expect(source).toMatch(/const Pill = styled\.button`[\s\S]*min-height: 44px;[\s\S]*min-width: 44px;/);
    expect(source).toMatch(/const Pill = styled\.button`[\s\S]*&:focus-visible/);
  });

  it('uses shared WorkoutLogger tokens instead of one-off color literals', () => {
    expect(source).not.toMatch(/rgba\(|#[0-9A-Fa-f]{3,8}/);
    expect(source).toContain('withAlpha');
  });
});
