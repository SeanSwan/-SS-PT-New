/**
 * SWA-105 Phase 2 F1 — the safety rail is now VISIBLE. The generator's
 * explanations (contract verdicts, small-class collapse, equipment warnings,
 * brain provenance) render on the class preview; warnings read gold.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';

import ExplanationsStrip from './ExplanationsStrip';

const explanations = [
  { type: 'day_type_contract', message: 'Upper Body contract: 38 exercises qualify.' },
  { type: 'small_class', message: 'Small class: 4 participants — collapsed to 2 stations.' },
  { type: 'equipment_feasibility', message: 'Equipment may bottleneck: kettlebell x2 for ~5 people.' },
  { type: 'brain_fallback', message: 'Generated with the deterministic engine (coach brain unavailable: timeout).' },
];

describe('ExplanationsStrip — F1: the safety rail renders', () => {
  it('renders every explanation with its type tag and message', () => {
    render(<ExplanationsStrip explanations={explanations} />);
    expect(screen.getByTestId('explanations-strip')).toBeTruthy();
    expect(screen.getByTestId('explanation-day_type_contract').textContent).toContain('38 exercises qualify');
    expect(screen.getByTestId('explanation-small_class').textContent).toContain('collapsed to 2 stations');
    expect(screen.getByTestId('explanation-equipment_feasibility').textContent).toContain('kettlebell x2');
    expect(screen.getByTestId('explanation-brain_fallback').textContent).toContain('deterministic engine');
  });

  it('renders nothing for an empty or missing list — no dead chrome', () => {
    const { container } = render(<ExplanationsStrip explanations={[]} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<ExplanationsStrip explanations={undefined} />);
    expect(c2.firstChild).toBeNull();
  });
});
