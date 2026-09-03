import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierProvider, useTier } from './TierContext';

const Probe = () => <span data-testid="tier">{useTier()}</span>;

describe('TierContext', () => {
  it('defaults to the LEAST motion when no provider is present', () => {
    render(<Probe />);
    expect(screen.getByTestId('tier')).toHaveTextContent('essential');
  });

  it('carries the resolved tier when provided', () => {
    render(<TierProvider tier="full"><Probe /></TierProvider>);
    expect(screen.getByTestId('tier')).toHaveTextContent('full');
  });
});
