import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import CoachIntakeTeachMe from './CoachIntakeTeachMe';

describe('CoachIntakeTeachMe', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps Hive Mind intake guidance available without opening by default or staging prompts', () => {
    render(<CoachIntakeTeachMe />);

    expect(screen.getByRole('button', { name: /teach me: hive mind intake review/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Review next intake first/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /teach me: hive mind intake review/i }));

    expect(screen.getByText(/Review next intake first/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolve client, date, and audio order/i)).toBeInTheDocument();
    expect(screen.getByText(/Use the review target and PLAUD tools/i)).toBeInTheDocument();
    expect(screen.getByText(/Review the prepared draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Final writes stay approval-gated/i)).toBeInTheDocument();
    expect(screen.getByText(/First click: Review next intake/i)).toBeInTheDocument();
    expect(screen.getByText(/No silent writes/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ask swan coach for help/i })).not.toBeInTheDocument();
  });
});
