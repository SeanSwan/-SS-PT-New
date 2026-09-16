import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompactFooter from './CompactFooter';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => auth,
}));

describe('CompactFooter public auth help', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('routes signed-out auth-page help to the public contact page', () => {
    render(<MemoryRouter><CompactFooter /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', '/contact');
  });

  it('keeps authenticated users in the protected Report Room', () => {
    auth.user = { id: 'account-a' };
    render(<MemoryRouter><CompactFooter /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Report a problem' })).toHaveAttribute('href', '/support');
  });
});
