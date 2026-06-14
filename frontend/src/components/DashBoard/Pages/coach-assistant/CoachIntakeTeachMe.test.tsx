import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachIntakeTeachMe from './CoachIntakeTeachMe';

describe('CoachIntakeTeachMe', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps Hive Mind intake guidance available without opening by default', () => {
    const onCommandPrompt = vi.fn();

    render(<CoachIntakeTeachMe onCommandPrompt={onCommandPrompt} />);

    expect(screen.getByRole('button', { name: /teach me: hive mind intake review/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Review next intake first/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /teach me: hive mind intake review/i }));

    expect(screen.getByText(/Review next intake first/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolve client, date, and audio order/i)).toBeInTheDocument();
    expect(screen.getByText(/Review the prepared draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Final writes stay approval-gated/i)).toBeInTheDocument();
    expect(screen.getByText(/First click: Review next intake/i)).toBeInTheDocument();
    expect(screen.getByText(/No silent writes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('teach me how to process Coach intake safely');
  });
});
