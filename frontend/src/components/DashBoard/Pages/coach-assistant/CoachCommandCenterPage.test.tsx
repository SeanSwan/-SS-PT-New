import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

describe('CoachCommandCenterPage', () => {
  it('renders the command center labels, dock actions, and approval-gated copy', () => {
    render(<CoachCommandCenterPage />);

    expect(screen.getAllByText(/Swan Coach Command Center/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Coach Command Modes/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with a workflow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Coach Thread/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mic$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Prepare$/i })).toBeInTheDocument();
    expect(screen.getByText(/the operator approves the final write/i)).toBeInTheDocument();
  });

  it('uses accessible thread buttons that update the composer and selected status', () => {
    render(<CoachCommandCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Duplicate risk check/i }));

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Review duplicate-risk logs for Client B-217 before any draft approval.',
    );
    expect(screen.getAllByText(/Client B-217 - duplicate-risk hold/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Duplicate risk check/i })).toHaveAttribute('aria-current', 'true');
  });

  it('opens and closes mobile drawers with aria-expanded and Escape handling', () => {
    render(<CoachCommandCenterPage />);

    const drawerTrigger = screen.getByRole('button', { name: /^Threads$/i, hidden: true });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(drawerTrigger);
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});
