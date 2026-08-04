/**
 * TabErrorBoundary regression (launch-audit shared-infra P1, 2026-08-03).
 * A throwing tab must degrade to the in-shell card (not propagate), and
 * Retry must re-attempt the children.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabErrorBoundary from './TabErrorBoundary';

const Bomb: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('tab exploded');
  return <div>tab content alive</div>;
};

describe('TabErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when nothing throws', () => {
    render(
      <TabErrorBoundary tabLabel="Waivers">
        <Bomb shouldThrow={false} />
      </TabErrorBoundary>
    );
    expect(screen.getByText('tab content alive')).toBeTruthy();
  });

  it('catches a throwing tab and shows the labeled card with a 44px retry', () => {
    render(
      <TabErrorBoundary tabLabel="Waivers">
        <Bomb shouldThrow={true} />
      </TabErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Waivers hit an error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.queryByText('tab content alive')).toBeNull();
  });

  it('retry re-attempts the children', () => {
    let shouldThrow = true;
    const Flaky: React.FC = () => {
      if (shouldThrow) throw new Error('first render fails');
      return <div>recovered</div>;
    };
    render(
      <TabErrorBoundary tabLabel="Analytics">
        <Flaky />
      </TabErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('recovered')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
