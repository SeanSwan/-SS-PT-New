import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OptimizedSignupModal from './OptimizedSignupModal';
import EnhancedFooter from '../components/Footer/Footer';

const mocks = vi.hoisted(() => ({
  auth: {
    register: vi.fn(async () => ({ success: false, error: 'test' })),
    user: null,
  },
  matchMedia: { matches: false },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../context/ThemeContext', () => ({
  useUniversalTheme: () => undefined,
}));

const theme = {
  background: { primary: '#07111f', elevated: '#132238', surface: '#102033' },
  borders: { elegant: '#507090', subtle: '#3c5870' },
  colors: { primary: '#60C0F0', accent: '#C6A84B' },
  gradients: {
    cosmic: 'linear-gradient(#07111f,#132238)',
    hero: 'linear-gradient(#07111f,#102033)',
    primary: 'linear-gradient(#60C0F0,#4070C0)',
    stellar: 'linear-gradient(#60C0F0,#C6A84B)',
  },
  shadows: { cosmic: 'none', elevation: 'none', primary: 'none' },
  text: { muted: '#9fb2c7', primary: '#f4f8fb', secondary: '#d6e4f0' },
  effects: { glowIntensity: 'none' },
  fonts: { drama: 'serif', heading: 'sans-serif', ui: 'sans-serif' },
};

const setMotionPreference = (matches: boolean) => {
  mocks.matchMedia.matches = matches;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
};

const renderSignup = () => render(
  <ThemeProvider theme={theme}>
    <MemoryRouter>
      <OptimizedSignupModal />
    </MemoryRouter>
  </ThemeProvider>,
);

describe('OptimizedSignupModal accessibility behavior', () => {
  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.register.mockClear();
    setMotionPreference(false);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  it('keeps controls readable and labels the password reveal action', async () => {
    renderSignup();

    const password = screen.getByLabelText('Password');
    expect(password).toHaveStyle({ fontSize: '16px', minHeight: '44px' });
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    expect(screen.getByText(/password must contain at least 8 characters/i)).toHaveStyle({ fontSize: '0.875rem' });

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
  });

  it('does not autoplay decorative signup motion for reduced-motion users', () => {
    setMotionPreference(true);
    renderSignup();

    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video).toHaveAttribute('tabindex', '-1');
    expect((video as HTMLVideoElement).autoplay).toBe(false);
    expect(screen.queryByRole('button', { name: /pause background animation/i })).toBeNull();
  });

  it('provides a keyboard reachable pause/resume control when motion is allowed', () => {
    renderSignup();
    const video = document.querySelector('video') as HTMLVideoElement;
    const pause = screen.getByRole('button', { name: /pause background animation/i });

    fireEvent.click(pause);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /resume background animation/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /resume background animation/i }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(video).toHaveAttribute('tabindex', '-1');
  });

  it('uses readable disclaimer text against the footer backdrop', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter><EnhancedFooter /></MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.getByText(/fitness tracking and community platform/i)).toHaveStyle({ color: '#d6e4f0' });
  });
});
