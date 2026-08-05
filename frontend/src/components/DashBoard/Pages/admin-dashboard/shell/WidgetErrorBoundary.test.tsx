import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WidgetErrorBoundary from './WidgetErrorBoundary';

const Bomb: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('widget exploded');
  return <div>recovered content</div>;
};

describe('WidgetErrorBoundary crash isolation (SWA-138 S1)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a throwing widget degrades to a labeled fallback while siblings keep rendering', () => {
    render(
      <>
        <WidgetErrorBoundary name="Revenue chart">
          <Bomb shouldThrow={true} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Healthy widget">
          <div>healthy sibling</div>
        </WidgetErrorBoundary>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Revenue chart is unavailable');
    expect(screen.getByText('healthy sibling')).toBeInTheDocument();
  });

  it('"Try again" resets the boundary and re-renders the child', async () => {
    let shouldThrow = true;
    const Flaky: React.FC = () => <Bomb shouldThrow={shouldThrow} />;
    render(
      <WidgetErrorBoundary name="Flaky widget">
        <Flaky />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
