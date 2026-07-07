import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CopilotIdleState from './CopilotIdleState';

/**
 * Launch P1-7: the two-click consent-override trap. When the backend requests
 * an override reason, the first Generate click silently returns to idle. This
 * locks in the visible notice so the admin knows a reason is required rather
 * than thinking the button is dead.
 */

const baseProps = {
  clientName: 'Test Client',
  isAdmin: true,
  overrideReason: '',
  setOverrideReason: vi.fn(),
  handleGenerate: vi.fn(),
  isSubmitting: false,
  templatesLoading: false,
  templates: [],
};

describe('CopilotIdleState — consent-override trap', () => {
  it('shows a clear alert when an override reason is required', () => {
    render(<CopilotIdleState {...baseProps} overrideReasonRequired />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/reason is required to override/i);
    expect(screen.getByText(/Admin Override Reason \(required\)/i)).toBeInTheDocument();
  });

  it('does NOT show the alert on the initial idle screen', () => {
    render(<CopilotIdleState {...baseProps} overrideReasonRequired={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
