/**
 * RENDER SIGNATURE — "no 25 greys", proven at the DOM instead of in the metric.
 * ============================================================================
 * WHY (hostile round 8): every distinctness gate so far reasons about the
 * COMPILED PLAN — `whatChanged` over the resolved variants. That is the engine
 * grading its own homework. It cannot see whether two worlds actually paint
 * differently, because it never renders anything.
 *
 * This suite drives all 23 built worlds through the REAL `LensPlanFrame` and
 * reads what lands in the DOM: the `data-lens2-*` representation attributes that
 * select form, and the `--world-*` custom properties that carry the setting.
 * Two worlds are only genuinely distinct if BOTH signatures differ — same form
 * with a different palette is a reskin; same palette with a different form is a
 * relayout. The engine promises both.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LensPlanFrame from './LensPlanFrame';
import { builtWorlds } from '../../../../adapters/style-lens-swan/worlds/registry';

const FORM_ATTRS = [
  'data-lens2-template',
  'data-lens2-display',
  'data-lens2-body',
  'data-lens2-surface',
  'data-lens2-collection',
  'data-lens2-action',
  'data-lens2-chart',
] as const;

interface Signature {
  id: string;
  form: Record<string, string>;
  tokens: Record<string, string>;
}

const signatures: Signature[] = builtWorlds().map((world) => {
  const { container } = render(
    <LensPlanFrame recipe={world.recipe}>
      <p>same child, every world</p>
    </LensPlanFrame>,
  );
  const frame = container.querySelector('[data-lens2-plan]') as HTMLElement;
  if (!frame) throw new Error(`${world.id} did not render a plan frame`);

  const form: Record<string, string> = {};
  for (const attr of FORM_ATTRS) form[attr] = frame.getAttribute(attr) ?? '(none)';

  // LensPlanFrame paints tokens through StyledBox's `$style` prop, which
  // styled-components compiles into a CLASS rule — nothing lands on the inline
  // `style` attribute, so read the computed value (the same channel
  // LensPlanFrame.test.tsx asserts on). Names come from the recipe itself.
  const computed = window.getComputedStyle(frame);
  const tokens: Record<string, string> = {};
  for (const name of Object.keys(world.recipe.tokens ?? {})) {
    tokens[`--${name}`] = computed.getPropertyValue(`--${name}`).trim();
  }
  return { id: world.id, form, tokens };
});

const differingFormAxes = (a: Signature, b: Signature): number => {
  // text.display + text.body collapse into ONE typography axis, matching
  // whatChanged's SLOT_AXIS mapping — do not double-count them here.
  const typography =
    a.form['data-lens2-display'] !== b.form['data-lens2-display'] ||
    a.form['data-lens2-body'] !== b.form['data-lens2-body'];
  const others = (
    ['data-lens2-template', 'data-lens2-surface', 'data-lens2-collection', 'data-lens2-action', 'data-lens2-chart'] as const
  ).filter((attr) => a.form[attr] !== b.form[attr]).length;
  return (typography ? 1 : 0) + others;
};

describe('world render signature · all built worlds paint differently', () => {
  it('rendered every built world through the real frame (anti-vacuous guard)', () => {
    expect(signatures.length).toBeGreaterThanOrEqual(23);
    // Both halves of the signature must carry real data, or the uniqueness
    // checks below pass by comparing nothing to nothing. This guard already
    // earned its keep once: the first draft read `frame.style` and found ZERO
    // tokens, because StyledBox compiles `$style` into a class rule.
    for (const sig of signatures) {
      expect(Object.keys(sig.tokens).length, `${sig.id} token names`).toBeGreaterThanOrEqual(6);
      expect(
        Object.values(sig.tokens).filter((v) => v !== '').length,
        `${sig.id} has no non-empty --world-* values in the computed style`,
      ).toBeGreaterThanOrEqual(6);
      expect(Object.values(sig.form).filter((v) => v !== '(none)').length).toBeGreaterThanOrEqual(6);
    }
  });

  it('no two worlds share a form signature (structure is never a reskin)', () => {
    const seen = new Map<string, string>();
    for (const sig of signatures) {
      const key = FORM_ATTRS.map((a) => sig.form[a]).join('|');
      const clash = seen.get(key);
      expect(clash, `${sig.id} renders the IDENTICAL form signature as ${clash}: ${key}`).toBeUndefined();
      seen.set(key, sig.id);
    }
  });

  it('no two worlds share a token bundle (setting is never a relayout)', () => {
    const seen = new Map<string, string>();
    for (const sig of signatures) {
      const key = Object.entries(sig.tokens).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(';');
      const clash = seen.get(key);
      expect(clash, `${sig.id} paints the IDENTICAL --world-* bundle as ${clash}`).toBeUndefined();
      seen.set(key, sig.id);
    }
  });

  it('every pair differs on >= 3 FORM axes in the rendered DOM', () => {
    const failures: string[] = [];
    signatures.forEach((a, i) =>
      signatures.slice(i + 1).forEach((b) => {
        const n = differingFormAxes(a, b);
        if (n < 3) failures.push(`${a.id} vs ${b.id}: only ${n} form axes differ in the DOM`);
      }),
    );
    expect(failures, `\n${failures.join('\n')}\n`).toEqual([]);
  });

  it('every pair differs on the SETTING too (accent, panel or title face)', () => {
    // A pair that differs only structurally reads as the same world relaid out.
    const failures: string[] = [];
    signatures.forEach((a, i) =>
      signatures.slice(i + 1).forEach((b) => {
        const settingKeys = ['--world-accent', '--world-panel', '--world-title-font', '--world-action'];
        if (settingKeys.every((k) => a.tokens[k] === b.tokens[k])) {
          failures.push(`${a.id} vs ${b.id}: identical accent, panel, action AND title face`);
        }
      }),
    );
    expect(failures, `\n${failures.join('\n')}\n`).toEqual([]);
  });
});
