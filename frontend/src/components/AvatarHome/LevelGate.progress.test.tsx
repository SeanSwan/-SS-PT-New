import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LevelGate from './LevelGate';

describe('LevelGate progress display', () => {
  it('clamps malformed progress before exposing unlock state', () => {
    render(<LevelGate currentLevel={-4} requiredLevel={10} />);

    expect(screen.getByText('Level 0 / 10')).toBeInTheDocument();
    expect(screen.getByText(/10 levels to go - keep training!/i)).toBeInTheDocument();

    const progress = screen.getByRole('progressbar', { name: /avatar home unlock progress/i });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '10');
    expect(progress).toHaveAttribute('aria-valuenow', '0');
  });
});
