import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SwanCoachActionLauncher from './SwanCoachActionLauncher';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('SwanCoachActionLauncher', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('carries typed drafts into the personal Coach composer without putting the draft in the URL', async () => {
    const user = userEvent.setup();

    render(
      <SwanCoachActionLauncher
        userName="Sean"
        userRole="admin"
        streakDays={7}
        level={12}
      />,
    );

    await user.type(
      screen.getByLabelText(/swan coach action draft/i),
      "Log today's push workout and explain what changed.",
    );
    await user.click(screen.getByRole('button', { name: /open swan coach/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/coach-assistant', {
      state: { teachPrompt: "Log today's push workout and explain what changed." },
    });
    expect(String(mockNavigate.mock.calls[0][0])).not.toContain('teachPrompt=');
  });
});
