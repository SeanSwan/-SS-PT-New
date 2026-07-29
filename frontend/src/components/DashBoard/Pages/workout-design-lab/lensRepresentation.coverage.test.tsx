/**
 * NO-INERT-AXIS GUARD — the distinctness metric may only count axes that RENDER.
 * ============================================================================
 * WHY (hostile-review finding, 2026-07-29): `changedAxisCount` counts 6 axes
 * (typography / composition / surface / collection / action / chart) and the
 * world gate demands ≥3 differing axes per pair. That gate is only honest if
 * every axis actually changes the DOM's appearance. It was NOT: no
 * `.lens2-surface` / `.lens2-chart` element existed, so two worlds could clear
 * the gate on axes that painted nothing (the "25 greys" failure the World
 * Ledger's phenomenon-uniqueness rule exists to prevent).
 *
 * This file is the regression lock, from two directions:
 *  1. VOCABULARY COVERAGE — every variant in `variantVocabulary.ts` has at
 *     least one representation selector, so adding a variant without a form
 *     renderer fails the build (the exact way an inert axis is reintroduced).
 *  2. HOOK REALITY — every `.lens2-*` class the representation CSS targets is a
 *     hook that a real primitive actually renders (no dead CSS), proven at the
 *     DOM level through the real `LensPlanFrame` → concept-primitive path.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LensPlanFrame from './LensPlanFrame';
import { lensRepresentationStyles } from './lensRepresentationStyles';
import { Panel, ReadinessDial } from './concepts/conceptShared.styles';
import { ExerciseList, ConceptActions } from './concepts/conceptShared';
import { AURORA_INDEX_RECIPE } from '../../../../adapters/style-lens-swan/worlds/recipes/aurora-index';
import { COACH_LEDGER_RECIPE } from '../../../../adapters/style-lens-swan/worlds/recipes/coach-ledger';
import {
  ACTION_VARIANTS,
  BODY_VARIANTS,
  CHART_VARIANTS,
  COLLECTION_VARIANTS,
  DISPLAY_VARIANTS,
  SURFACE_VARIANTS,
  TEMPLATE_NAMES,
} from '../../../../adapters/style-lens-swan/worlds/variantVocabulary';

/** Flatten a styled-components RuleSet (nested arrays + interpolations) to CSS text. */
const cssText = (rules: unknown): string => {
  if (typeof rules === 'string') return rules;
  if (Array.isArray(rules)) return rules.map(cssText).join('');
  return '';
};

const CSS = cssText(lensRepresentationStyles);

/**
 * `playfield-stack` is the BASELINE composition (the host's own grid) — it is
 * deliberately the absence of a template override, so it carries no selector.
 * Any other exemption must be justified here in writing before being added.
 */
const TEMPLATE_EXEMPT = new Set(['playfield-stack']);

/** The class hooks real primitives render. Extending this list requires adding
 *  the hook to an actual component (proven by the DOM test at the bottom). */
const REAL_HOOKS = new Set([
  'lens2-composition',
  'lens2-display',
  'lens2-collection',
  'lens2-row',
  'lens2-actions',
  'lens2-surface',
  'lens2-chart',
]);

describe('lens representation · vocabulary coverage (no inert axis)', () => {
  const cases: Array<[string, readonly string[]]> = [
    ['display', DISPLAY_VARIANTS],
    ['body', BODY_VARIANTS],
    ['surface', SURFACE_VARIANTS],
    ['collection', COLLECTION_VARIANTS],
    ['action', ACTION_VARIANTS],
    ['chart', CHART_VARIANTS],
  ];

  it.each(cases)('every %s variant has a form renderer', (axis, variants) => {
    for (const variant of variants) {
      expect(
        CSS.includes(`[data-lens2-${axis}='${variant}']`),
        `${axis} variant "${variant}" has NO representation selector — it would ` +
          `count toward the ≥3-axis distinctness gate while rendering nothing. ` +
          `Add a form renderer (or remove the variant).`,
      ).toBe(true);
    }
  });

  it('every composition template has a form renderer (baseline exempted)', () => {
    for (const template of TEMPLATE_NAMES) {
      if (TEMPLATE_EXEMPT.has(template)) continue;
      expect(
        CSS.includes(`[data-lens2-template='${template}']`),
        `template "${template}" has NO representation selector`,
      ).toBe(true);
    }
  });

  it('no dead CSS: every .lens2-* class targeted is a hook a primitive renders', () => {
    const targeted = new Set(
      [...CSS.matchAll(/\.(lens2-[a-z0-9-]+)/g)].map((m) => m[1]),
    );
    expect(targeted.size).toBeGreaterThan(0);
    for (const hook of targeted) {
      expect(REAL_HOOKS.has(hook), `.${hook} is targeted by CSS but no primitive renders it`).toBe(
        true,
      );
    }
  });

  it('no token duplication: variant rules never restate a token-owned property', () => {
    // The generic [data-lens2-display] rule applies `font:` + `letter-spacing:`
    // from --world-title-font / --world-letter-spacing. A per-variant rule that
    // set font-weight/letter-spacing/font-family would have equal specificity and
    // later source order, silently overriding the token for every future world.
    for (const variant of DISPLAY_VARIANTS) {
      const block = CSS.split(`[data-lens2-display='${variant}']`)[1] ?? '';
      const body = block.slice(block.indexOf('{'), block.indexOf('}'));
      for (const banned of ['font-weight', 'letter-spacing', 'font-family']) {
        expect(
          body.includes(banned),
          `display variant "${variant}" sets ${banned} — that property is token-owned ` +
            `(--world-title-font / --world-letter-spacing) and would be overridden`,
        ).toBe(false);
      }
    }
  });
});

describe('lens representation · hooks are real (DOM proof through LensPlanFrame)', () => {
  const model = {
    exercises: [
      {
        id: 'e1', name: 'Trap-bar deadlift', focus: 'Posterior chain',
        sets: 4, reps: '5', load: '215 lb', tempo: '2-0-1', restSeconds: 120,
        rpe: 7, pain: 0,
      },
    ],
  } as never;

  const renderWorld = (recipe: typeof AURORA_INDEX_RECIPE) =>
    render(
      <LensPlanFrame recipe={recipe}>
        <Panel className="hero">
          <ReadinessDial $readiness={72}>
            <div>
              <strong>72</strong>
              <span>Ready</span>
            </div>
          </ReadinessDial>
        </Panel>
        <ExerciseList model={model} />
        <ConceptActions
          model={model}
          conceptName="coverage"
          primaryActionLabel="Save"
          onAction={() => {}}
          onOpenRolodex={() => {}}
        />
      </LensPlanFrame>,
    );

  it('renders .lens2-surface + .lens2-chart and merges the caller class', () => {
    const { container } = renderWorld(AURORA_INDEX_RECIPE);
    const surface = container.querySelector('.lens2-surface');
    const chart = container.querySelector('.lens2-chart');
    expect(surface).not.toBeNull();
    expect(chart).not.toBeNull();
    // the caller's grid-area class must SURVIVE the hook injection
    expect(surface!.classList.contains('hero')).toBe(true);
  });

  it('the frame emits the surface + chart attrs the form rules key off', () => {
    const aurora = renderWorld(AURORA_INDEX_RECIPE).container.querySelector(
      '[data-lens2-plan]',
    ) as HTMLElement;
    expect(aurora.getAttribute('data-lens2-surface')).toBe('lightwell');
    expect(aurora.getAttribute('data-lens2-chart')).toBe('spark-ribbon');
    expect(aurora.getAttribute('data-lens2-body')).toBe('signal-grotesk');

    const ledger = renderWorld(COACH_LEDGER_RECIPE).container.querySelector(
      '[data-lens2-plan]',
    ) as HTMLElement;
    expect(ledger.getAttribute('data-lens2-surface')).toBe('faceted-console');
    expect(ledger.getAttribute('data-lens2-chart')).toBe('ring-gauge');
  });

  it('all four collection/action hooks exist in the same tree', () => {
    const { container } = renderWorld(COACH_LEDGER_RECIPE);
    for (const hook of ['lens2-collection', 'lens2-row', 'lens2-actions']) {
      expect(container.querySelector(`.${hook}`), hook).not.toBeNull();
    }
  });
});
