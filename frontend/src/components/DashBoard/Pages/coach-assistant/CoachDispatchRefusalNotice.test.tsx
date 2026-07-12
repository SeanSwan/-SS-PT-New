/**
 * Cortex P0 §5.4/§13.5.9 — charming-no notice contract tests.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoachDispatchRefusalNotice from './CoachDispatchRefusalNotice';

describe('CoachDispatchRefusalNotice', () => {
  it('explains a pain-excluded hold warmly and lists eligible swaps as chips', () => {
    render(
      <CoachDispatchRefusalNotice
        refusals={[{
          event: 'AI_ADD_EXERCISE',
          exerciseName: 'Barbell Bench Press',
          code: 'PAIN_EXCLUDED',
          reason: 'targets pain-excluded muscles',
          alternatives: ['Goblet Squat', 'Supported Row'],
        }]}
      />,
    );
    expect(screen.getByText(/held for safety/i)).toBeTruthy();
    expect(screen.getByText(/Barbell Bench Press/)).toBeTruthy();
    expect(screen.getByText(/safety wins/i)).toBeTruthy();
    expect(screen.getByText('Goblet Squat')).toBeTruthy();
    expect(screen.getByText('Supported Row')).toBeTruthy();
  });

  it('renders registry and safety-data holds with their own plain-language copy', () => {
    render(
      <CoachDispatchRefusalNotice
        refusals={[
          { event: 'AI_ADD_EXERCISE', exerciseName: 'Quantum Slam', code: 'EXERCISE_NOT_IN_REGISTRY', reason: 'not matched', alternatives: [] },
          { event: 'AI_ADD_EXERCISE', exerciseName: 'Goblet Squat', code: 'SAFETY_DATA_UNAVAILABLE', reason: 'context failed', alternatives: [] },
        ]}
      />,
    );
    expect(screen.getByText(/approved exercise library/i)).toBeTruthy();
    expect(screen.getByText(/better a short wait than a wrong guess/i)).toBeTruthy();
  });

  it('renders nothing for an empty refusal list', () => {
    const { container } = render(<CoachDispatchRefusalNotice refusals={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
