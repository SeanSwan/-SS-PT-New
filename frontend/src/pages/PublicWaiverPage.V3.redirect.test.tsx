import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicWaiverPageV3 from './PublicWaiverPage.V3';
import { themes } from '../context/ThemeContext/UniversalThemeContext';

const { navigateMock, refreshUserMock, submitPublicWaiverMock, fetchVersionsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  refreshUserMock: vi.fn(),
  submitPublicWaiverMock: vi.fn(),
  fetchVersionsMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, role: 'client' },
    refreshUser: refreshUserMock,
  }),
}));

vi.mock('../services/publicWaiverService', () => ({
  fetchCurrentWaiverVersions: fetchVersionsMock,
  submitPublicWaiver: submitPublicWaiverMock,
}));

vi.mock('../components/ui-kit/cinematic/ParallaxHero', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ui-kit/cinematic/ScrollReveal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/ui-kit/cinematic/TypewriterText', () => ({
  default: ({ text }: { text: string }) => <>{text}</>,
}));

vi.mock('../components/ui-kit/cinematic/SectionDivider', () => ({
  default: () => <div data-testid="section-divider" />,
}));

vi.mock('../components/ui/buttons/GlowButton', () => ({
  default: ({ text, onClick, disabled }: { text: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick}>{text}</button>
  ),
}));

vi.mock('../components/SignatureCapture/SignaturePad', () => ({
  default: forwardRef(({ onEnd, onClear }: { onEnd?: () => void; onClear?: () => void }, ref) => {
    const [signed, setSigned] = useState(false);
    useImperativeHandle(ref, () => ({
      isEmpty: () => !signed,
      toDataURL: () => 'data:image/png;base64,signature',
      clear: () => {
        setSigned(false);
        onClear?.();
      },
    }));

    return (
      <button
        type="button"
        onClick={() => {
          setSigned(true);
          onEnd?.();
        }}
      >
        Sign waiver
      </button>
    );
  }),
}));

const waiverVersions = [
  {
    waiverType: 'core',
    version: '2026.1',
    displayText: 'Core waiver text',
  },
  {
    waiverType: 'ai_notice',
    version: '2026.1',
    displayText: 'AI notice text',
  },
  {
    waiverType: 'activity_addendum',
    activityType: 'HOME_GYM_PT',
    version: '2026.1',
    displayText: 'Home training addendum',
  },
];

const fillRequiredWaiverFields = async () => {
  fireEvent.click(await screen.findByLabelText(/home gym pt/i));
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fixture Client' } });
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fixture@example.test' } });
  fireEvent.click(screen.getByLabelText(/i accept the liability waiver/i));
  fireEvent.click(screen.getByRole('button', { name: /sign waiver/i }));
};

describe('PublicWaiverPageV3 authenticated submit routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchVersionsMock.mockResolvedValue(waiverVersions);
    refreshUserMock.mockResolvedValue({ success: true });
    submitPublicWaiverMock.mockResolvedValue({
      success: true,
      status: 'linked',
      waiverRecordId: 4242,
    });
  });

  it('refreshes auth state and routes logged-in clients to the user dashboard after a linked waiver submit', async () => {
    render(
      <MemoryRouter initialEntries={['/waiver?returnUrl=%2Fdashboard%2Fclient']}>
        <ThemeProvider theme={themes['crystalline-default']}>
          <PublicWaiverPageV3 />
        </ThemeProvider>
      </MemoryRouter>
    );

    await fillRequiredWaiverFields();
    fireEvent.click(screen.getByRole('button', { name: /submit waiver/i }));

    await waitFor(() => expect(refreshUserMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/user-dashboard', { replace: true });
    expect(screen.queryByText(/create an account/i)).not.toBeInTheDocument();
  });
});
