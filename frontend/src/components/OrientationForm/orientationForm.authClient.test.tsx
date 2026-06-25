import React, { forwardRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrientationForm from './orientationForm';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 42,
      role: 'client',
      clientSource: 'swanstudios',
      sessionBillingMode: 'no_session_required',
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('framer-motion', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  const motionFactory = (tag: string) => forwardRef<HTMLElement, any>((props, ref) => {
    const {
      children,
      initial,
      animate,
      exit,
      variants,
      transition,
      whileHover,
      whileTap,
      ...rest
    } = props;

    return ReactModule.createElement(tag, { ...rest, ref }, children);
  });

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: vi.fn() }),
    motion: new Proxy({}, {
      get: (_target, tag: string) => motionFactory(tag),
    }),
  };
});

describe('OrientationForm authenticated client routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  it('does not render the public orientation signup form for an already active client account', () => {
    render(
      <MemoryRouter>
        <OrientationForm onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /submit orientation/i })).not.toBeInTheDocument();
    expect(screen.getByText(/client account is ready/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to user dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/user-dashboard');
  });
});
