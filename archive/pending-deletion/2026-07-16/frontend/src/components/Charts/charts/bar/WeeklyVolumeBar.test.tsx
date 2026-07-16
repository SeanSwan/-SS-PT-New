import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeeklyVolumeBar from './WeeklyVolumeBar';

const SOURCE = readFileSync(resolve(__dirname, './WeeklyVolumeBar.tsx'), 'utf8');

describe('WeeklyVolumeBar data truth', () => {
  it('does not keep a hardcoded demo-data fallback or preview label', () => {
    expect(SOURCE).not.toContain('DEMO_DATA');
    expect(SOURCE).not.toContain('(Preview)');
  });

  it('renders an honest empty state when no verified weekly volume exists', () => {
    render(<WeeklyVolumeBar data={[]} />);

    expect(screen.getByText('Weekly Volume')).toBeTruthy();
    expect(screen.getByText(/log workouts with sets, reps, and weight/i)).toBeTruthy();
    expect(screen.getByText(/no verified weekly volume data is available yet/i)).toBeTruthy();
  });
});
