/**
 * PublicWaiverPage Tests — Phase 5W-G
 * =====================================
 * 6 tests covering the public waiver submission form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Capture endStroke callbacks so tests can simulate signing
let endStrokeCallback: (() => void) | null = null;

vi.mock('signature_pad', () => {
  return {
    default: class MockSignaturePad {
      _isEmpty = true;
      clear() { this._isEmpty = true; }
      isEmpty() { return this._isEmpty; }
      toDataURL() { return 'data:image/png;base64,mock'; }
      toData() { return []; }
      fromData() {}
      addEventListener(event: string, cb: () => void) {
        if (event === 'endStroke') {
          const self = this;
          endStrokeCallback = () => {
            self._isEmpty = false;
            cb();
          };
        }
      }
      off() {}
    },
  };
});

// Mock the public waiver service
const mockFetchVersions = vi.fn();
const mockSubmitWaiver = vi.fn();

vi.mock('../services/publicWaiverService', () => ({
  fetchCurrentWaiverVersions: (...args: unknown[]) => mockFetchVersions(...args),
  submitPublicWaiver: (...args: unknown[]) => mockSubmitWaiver(...args),
}));

import PublicWaiverPage from './PublicWaiverPage';

const MOCK_VERSIONS = [
  { id: 1, waiverType: 'core', activityType: null, title: 'Core Waiver', displayText: '<p>Core waiver terms</p>', textHash: 'a'.repeat(64) },
  { id: 2, waiverType: 'ai_notice', activityType: null, title: 'AI Notice', displayText: '<p>AI consent notice</p>', textHash: 'b'.repeat(64) },
  { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', title: 'Home Gym PT Addendum', displayText: '<p>Home gym terms</p>', textHash: 'c'.repeat(64) },
];

/** Fill all required fields and simulate signature */
async function fillFormAndSign() {
  await waitFor(() => {
    expect(screen.getByText('1. Select Activities')).toBeInTheDocument();
  });

  // Select activity — use the checkbox role with "Home Gym PT" name (activity checkbox)
  const homeGymCheckbox = screen.getByRole('checkbox', { name: 'Home Gym PT' });
  fireEvent.click(homeGymCheckbox);

  // Fill identity fields
  fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText('Date of Birth *'), { target: { value: '1990-01-15' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@test.com' } });

  // Check consent boxes
  const liabilityCheckbox = screen.getByRole('checkbox', { name: /I accept the liability waiver/ });
  fireEvent.click(liabilityCheckbox);

  const aiCheckbox = screen.getByRole('checkbox', { name: /I consent to AI-powered features/ });
  fireEvent.click(aiCheckbox);

  // Simulate signing via the captured endStroke callback (wrapped in act for state update)
  await act(async () => {
    if (endStrokeCallback) endStrokeCallback();
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PublicWaiverPage />
    </MemoryRouter>,
  );
}

describe('PublicWaiverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endStrokeCallback = null;
    mockFetchVersions.mockResolvedValue(MOCK_VERSIONS);
  });

  it('renders all required sections (activity, identity, consent, signature, submit)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
    });

    expect(screen.getByText('1. Select Activities')).toBeInTheDocument();
    expect(screen.getByText('3. Your Information')).toBeInTheDocument();
    expect(screen.getByText('5. Consent')).toBeInTheDocument();
    expect(screen.getByText('6. Signature')).toBeInTheDocument();
    expect(screen.getByText('Submit Waiver')).toBeInTheDocument();
  });

  it('submit button is disabled when required fields are empty', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Submit Waiver')).toBeInTheDocument();
    });

    const submitBtn = screen.getByText('Submit Waiver');
    expect(submitBtn).toBeDisabled();
  });

  it('waiver text is displayed after activity selection', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('1. Select Activities')).toBeInTheDocument();
    });

    const homeGymCheckbox = screen.getByRole('checkbox', { name: 'Home Gym PT' });
    fireEvent.click(homeGymCheckbox);

    await waitFor(() => {
      expect(screen.getByText('2. Read the Waiver')).toBeInTheDocument();
    });

    expect(screen.getByText('Core Waiver')).toBeInTheDocument();
    expect(screen.getByText('AI Notice')).toBeInTheDocument();
  });

  it('successful submit shows confirmation with waiver record ID', async () => {
    mockSubmitWaiver.mockResolvedValue({
      success: true,
      waiverRecordId: 99,
      status: 'pending_match',
      message: 'Waiver submitted successfully',
    });

    renderPage();
    await fillFormAndSign();

    // Submit button should now be enabled
    await waitFor(() => {
      expect(screen.getByText('Submit Waiver')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Waiver'));
    });

    // Verify confirmation view appears
    await waitFor(() => {
      expect(screen.getByText('Waiver Submitted')).toBeInTheDocument();
    });
    expect(screen.getByText(/99/)).toBeInTheDocument();
    expect(mockSubmitWaiver).toHaveBeenCalledTimes(1);
  });

  it('error response shows error message', async () => {
    mockSubmitWaiver.mockRejectedValue({
      response: { data: { error: 'Rate limit exceeded' } },
    });

    renderPage();
    await fillFormAndSign();

    await waitFor(() => {
      expect(screen.getByText('Submit Waiver')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Waiver'));
    });

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });
    expect(mockSubmitWaiver).toHaveBeenCalledTimes(1);
  });

  it('submits source=qr when ?source=qr query param is present', async () => {
    mockSubmitWaiver.mockResolvedValue({
      success: true,
      waiverRecordId: 100,
      status: 'pending_match',
      message: 'Waiver submitted successfully',
    });

    render(
      <MemoryRouter initialEntries={['/waiver?source=qr']}>
        <PublicWaiverPage />
      </MemoryRouter>,
    );
    await fillFormAndSign();

    await waitFor(() => {
      expect(screen.getByText('Submit Waiver')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Waiver'));
    });

    await waitFor(() => {
      expect(mockSubmitWaiver).toHaveBeenCalledTimes(1);
    });

    expect(mockSubmitWaiver.mock.calls[0][0].source).toBe('qr');
  });

  it('blocks submit when signature is empty (button disabled)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Submit Waiver')).toBeInTheDocument();
    });

    const submitBtn = screen.getByText('Submit Waiver');
    expect(submitBtn).toBeDisabled();
  });
});
