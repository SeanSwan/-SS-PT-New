/**
 * AiConsentPanel Tests — Phase 5W-G Re-consent CTA
 * ==================================================
 * 2 tests for the re-consent banner with waiver navigation CTA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Track navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the consent service
vi.mock('../../services/aiConsentService', () => ({
  getConsentStatus: vi.fn(),
  grantConsent: vi.fn(),
  withdrawConsent: vi.fn(),
}));

import AiConsentPanel from './AiConsentPanel';
import { getConsentStatus } from '../../services/aiConsentService';

const mockedGetConsentStatus = vi.mocked(getConsentStatus);

describe('AiConsentPanel — Re-consent CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-consent banner with CTA appears when requiresReconsent=true', async () => {
    mockedGetConsentStatus.mockResolvedValue({
      hasConsent: true,
      consentState: 'granted',
      profile: {
        aiEnabled: true,
        consentVersion: '1.0',
        consentedAt: '2026-01-01T00:00:00Z',
      },
      waiverEligibility: {
        hasWaiverConsent: true,
        isCurrent: false,
        requiresReconsent: true,
        reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
        consentSource: 'waiver_signature',
      },
    } as never);

    render(
      <MemoryRouter>
        <AiConsentPanel />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Waiver update required')).toBeInTheDocument();
    });

    expect(screen.getByText('Sign Updated Waiver')).toBeInTheDocument();
  });

  it('CTA "Sign Updated Waiver" navigates to /waiver', async () => {
    mockedGetConsentStatus.mockResolvedValue({
      hasConsent: true,
      consentState: 'granted',
      profile: {
        aiEnabled: true,
        consentVersion: '1.0',
        consentedAt: '2026-01-01T00:00:00Z',
      },
      waiverEligibility: {
        hasWaiverConsent: true,
        isCurrent: false,
        requiresReconsent: true,
        reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
        consentSource: 'waiver_signature',
      },
    } as never);

    render(
      <MemoryRouter>
        <AiConsentPanel />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sign Updated Waiver')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sign Updated Waiver'));
    expect(mockNavigate).toHaveBeenCalledWith('/waiver');
  });
});
