/**
 * PublicWaiverPageV3 — post-signature routing + minor protection
 * ===============================================================
 * The previous version of this file asserted the BUG as correct: it seeded
 * `/waiver?returnUrl=%2Fdashboard%2Fclient` and then expected navigation to a
 * hardcoded `/user-dashboard`, so the gate's returnUrl being ignored was
 * locked in by a passing test (SWA-140).
 */
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42, role: 'client' }, refreshUser: refreshUserMock }),
}));

vi.mock('../services/publicWaiverService', async () => {
  const actual = await vi.importActual<typeof import('../services/publicWaiverService')>(
    '../services/publicWaiverService',
  );
  return {
    ...actual,
    fetchCurrentWaiverVersions: fetchVersionsMock,
    submitPublicWaiver: submitPublicWaiverMock,
  };
});

vi.mock('../components/SignatureCapture/SignaturePad', () => {
  const MockSignaturePad = forwardRef(({ onEnd, onClear }: { onEnd?: () => void; onClear?: () => void }, ref) => {
    const [signed, setSigned] = useState(false);
    useImperativeHandle(ref, () => ({
      isEmpty: () => !signed,
      toDataURL: () => 'data:image/png;base64,signature',
      getSignatureMethod: () => 'drawn' as const,
      clear: () => { setSigned(false); onClear?.(); },
    }));
    return (
      <button type="button" onClick={() => { setSigned(true); onEnd?.(); }}>Sign waiver</button>
    );
  });
  MockSignaturePad.displayName = 'MockSignaturePad';
  return { default: MockSignaturePad };
});

const versionsPayload = {
  versions: [
    { id: 1, waiverType: 'core', activityType: null, version: '2.0', title: 'Liability Waiver', displayText: '<p>Core waiver text</p>', textHash: 'a'.repeat(64) },
    { id: 2, waiverType: 'ai_notice', activityType: null, version: '2.0', title: 'Swan Coach Notice', displayText: '<p>Swan Coach text</p>', textHash: 'b'.repeat(64) },
    { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', version: '2.0', title: 'Home Gym Addendum', displayText: '<p>Home training addendum</p>', textHash: 'c'.repeat(64) },
  ],
  bundleHash: 'f'.repeat(64),
};

function renderPage(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ThemeProvider theme={themes['crystalline-default']}>
        <PublicWaiverPageV3 />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Opens each required document and ticks its read attestation. */
async function attestAllDocuments() {
  const readButtons = await screen.findAllByRole('button', { name: /^Read /i });
  for (let i = 0; i < readButtons.length; i += 1) {
    const buttons = screen.getAllByRole('button', { name: /^Read /i });
    fireEvent.click(buttons[i]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/i have read this document/i));
    fireEvent.click(within(dialog).getByLabelText(/close document/i));
  }
}

async function fillAdultWaiver() {
  fireEvent.click(await screen.findByLabelText(/home gym sessions/i));
  await attestAllDocuments();
  fireEvent.change(screen.getByLabelText(/full legal name/i), { target: { value: 'Fixture Client' } });
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'fixture@example.test' } });
  fireEvent.click(screen.getByLabelText(/i have read and agree to the liability waiver/i));
  fireEvent.click(screen.getByRole('button', { name: /sign waiver/i }));
}

describe('PublicWaiverPageV3 — post-signature routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    fetchVersionsMock.mockResolvedValue(versionsPayload);
    refreshUserMock.mockResolvedValue({ success: true });
    submitPublicWaiverMock.mockResolvedValue({
      success: true,
      status: 'linked',
      waiverRecordId: 4242,
      signedAt: '2026-08-04T19:00:00.000Z',
      signedSummary: [{ id: 1, title: 'Liability Waiver', version: '2.0', waiverType: 'core', activityType: null }],
    });
  });

  it('honours the returnUrl the waiver gate wrote, instead of a hardcoded dashboard', async () => {
    renderPage('/waiver?returnUrl=%2Fdashboard%2Fclient%2Fprogress');
    await fillAdultWaiver();
    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    const continueBtn = await screen.findByRole('button', { name: /continue to your dashboard/i });
    fireEvent.click(continueBtn);

    await waitFor(() => expect(refreshUserMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/client/progress', { replace: true });
  });

  it('falls back to the dashboard when no returnUrl is present', async () => {
    renderPage('/waiver');
    await fillAdultWaiver();
    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    fireEvent.click(await screen.findByRole('button', { name: /continue to your dashboard/i }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/user-dashboard', { replace: true }));
  });

  it('refuses an off-site returnUrl rather than becoming an open redirect', async () => {
    renderPage('/waiver?returnUrl=https%3A%2F%2Fevil.example.com');
    await fillAdultWaiver();
    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    fireEvent.click(await screen.findByRole('button', { name: /continue to your dashboard/i }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/user-dashboard', { replace: true }));
  });

  it('does not offer account creation to someone already logged in', async () => {
    renderPage('/waiver');
    await fillAdultWaiver();
    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    await screen.findByRole('button', { name: /continue to your dashboard/i });
    expect(screen.queryByText(/create an account/i)).not.toBeInTheDocument();
  });

  it('names exactly what was signed, and when', async () => {
    renderPage('/waiver');
    await fillAdultWaiver();
    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    await screen.findByText(/what you signed/i);
    expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
    expect(screen.getByText(/#4242/)).toBeInTheDocument();
  });
});

describe('PublicWaiverPageV3 — minor protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    fetchVersionsMock.mockResolvedValue(versionsPayload);
    refreshUserMock.mockResolvedValue({ success: true });
    submitPublicWaiverMock.mockResolvedValue({ success: true, status: 'linked', waiverRecordId: 1 });
  });

  it('opens the guardian section from the date of birth, with no self-declared checkbox', async () => {
    renderPage('/waiver');
    fireEvent.click(await screen.findByLabelText(/home gym sessions/i));

    expect(screen.queryByLabelText(/parent or guardian full name/i)).not.toBeInTheDocument();

    const minorDob = new Date();
    minorDob.setFullYear(minorDob.getFullYear() - 14);
    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: minorDob.toISOString().slice(0, 10) },
    });

    expect(await screen.findByLabelText(/parent or guardian full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency contact name/i)).toBeInTheDocument();
  });

  it('will not submit a minor waiver without guardian details', async () => {
    renderPage('/waiver');
    fireEvent.click(await screen.findByLabelText(/home gym sessions/i));
    await attestAllDocuments();

    const minorDob = new Date();
    minorDob.setFullYear(minorDob.getFullYear() - 14);
    fireEvent.change(screen.getByLabelText(/full legal name|participant's full name/i), { target: { value: 'Young Client' } });
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: minorDob.toISOString().slice(0, 10) } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'guardian@example.test' } });
    fireEvent.click(screen.getByLabelText(/i have read and agree to the liability waiver/i));
    fireEvent.click(screen.getByRole('button', { name: /sign waiver/i }));

    fireEvent.click(screen.getByRole('button', { name: /agree & sign/i }));

    await waitFor(() => expect(screen.getByText(/a parent or guardian must sign/i)).toBeInTheDocument());
    expect(submitPublicWaiverMock).not.toHaveBeenCalled();
  });
});

describe('PublicWaiverPageV3 — document load failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('says so and offers a retry instead of silently disabling submit', async () => {
    fetchVersionsMock.mockRejectedValueOnce(new Error('network down'));
    renderPage('/waiver');

    expect(await screen.findByText(/couldn't load your agreement/i)).toBeInTheDocument();

    fetchVersionsMock.mockResolvedValueOnce(versionsPayload);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.queryByText(/couldn't load your agreement/i)).not.toBeInTheDocument());
  });

  it('distinguishes an empty document set from a network failure', async () => {
    fetchVersionsMock.mockResolvedValue({ versions: [], bundleHash: null });
    renderPage('/waiver');

    expect(await screen.findByText(/not available right now/i)).toBeInTheDocument();
  });
});
