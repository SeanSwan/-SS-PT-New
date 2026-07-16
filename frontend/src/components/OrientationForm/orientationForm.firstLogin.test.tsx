import React, { forwardRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrientationForm from './orientationForm';

const { navigateMock, authAxiosPostMock, authUserRef } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authAxiosPostMock: vi.fn(),
  authUserRef: { current: null as any },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authUserRef.current,
    authAxios: { post: authAxiosPostMock },
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
  const motionFactory = (tag: string) => {
    const MockMotionComponent = forwardRef<HTMLElement, any>((props, ref) => {
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
    MockMotionComponent.displayName = `MockMotion.${tag}`;
    return MockMotionComponent;
  };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: vi.fn() }),
    motion: new Proxy({}, {
      get: (_target, tag: string) => motionFactory(tag),
    }),
  };
});

describe('OrientationForm first-login routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUserRef.current = null;
    authAxiosPostMock.mockResolvedValue({ data: { success: true } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  it('posts signed-in plain user orientation through the protected signup endpoint', async () => {
    authUserRef.current = {
      id: 77,
      role: 'user',
      email: 'member@example.test',
    };

    render(
      <MemoryRouter>
        <OrientationForm onClose={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Future Client' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'member@example.test' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-0100' } });
    fireEvent.change(screen.getByLabelText(/health information/i), { target: { value: 'No issues' } });
    fireEvent.change(screen.getByLabelText(/waiver initials/i), { target: { value: 'FC' } });
    fireEvent.click(screen.getByRole('button', { name: /submit orientation/i }));

    await waitFor(() => expect(authAxiosPostMock).toHaveBeenCalledWith(
      '/api/orientation/signup',
      expect.objectContaining({
        fullName: 'Future Client',
        email: 'member@example.test',
        status: 'pending',
        source: 'authenticated',
      })
    ));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/thank you for signing up/i)).toBeInTheDocument();
  });

  it('does not render the client orientation form for a trainer account', () => {
    authUserRef.current = {
      id: 9,
      role: 'trainer',
    };

    render(
      <MemoryRouter>
        <OrientationForm onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /submit orientation/i })).not.toBeInTheDocument();
    expect(screen.getByText(/trainer account is ready/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to trainer dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/trainer/overview');
  });
});
