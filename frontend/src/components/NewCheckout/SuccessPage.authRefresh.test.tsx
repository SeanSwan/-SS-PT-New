import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuccessPage from './SuccessPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshUser: vi.fn(),
  clearCart: vi.fn(),
  toast: vi.fn(),
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('session_id=cs_test_auth_refresh')],
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'client@example.com',
    },
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    clearCart: mocks.clearCart,
  }),
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('../../services/api.service', () => ({
  default: mocks.api,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

const activationStatus = {
  sessionId: 'cs_test_auth_refresh',
  userId: 7,
  cart: {
    id: 33,
    status: 'completed',
    paymentStatus: 'paid',
    sessionsGranted: true,
    total: 500,
    completedAt: '2026-05-22T12:00:00.000Z',
    updatedAt: '2026-05-22T12:01:00.000Z',
  },
  activation: {
    paid: true,
    accountLinked: true,
    waiverComplete: true,
    onboardingComplete: true,
    sessionCreditsAllocated: true,
    orderRecorded: true,
    sessionsAvailable: 10,
    scheduledSessionCount: 0,
    forcePasswordChange: false,
    nextStep: 'schedule_first_session',
    nextRoute: '/dashboard/client/schedule',
    nextAction: 'Schedule first session',
  },
  nextSession: null,
};

describe('SuccessPage auth refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.api.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionId: 'cs_test_auth_refresh',
          amount: 500,
          sessionsAdded: 10,
          customerEmail: 'client@example.com',
          orderDate: '2026-05-22T12:00:00.000Z',
          items: [],
        },
      },
    });

    mocks.api.get.mockResolvedValue({
      data: {
        success: true,
        data: activationStatus,
      },
    });

    mocks.refreshUser.mockResolvedValue({
      success: true,
      user: {
        id: '7',
        email: 'client@example.com',
        username: 'client',
        firstName: 'Client',
        lastName: 'Example',
        role: 'client',
        isActive: true,
        createdAt: '2026-05-22T12:00:00.000Z',
        updatedAt: '2026-05-22T12:01:00.000Z',
      },
    });
  });

  it('refreshes the authenticated user before resolving the paid activation CTA', async () => {
    render(<SuccessPage />);

    await waitFor(() => {
      expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
    });

    expect(mocks.api.post).toHaveBeenCalledWith('/api/v2/payments/verify-session', {
      sessionId: 'cs_test_auth_refresh',
    });
    expect(mocks.api.get).toHaveBeenCalledWith('/api/v2/payments/activation-status', {
      params: { sessionId: 'cs_test_auth_refresh' },
    });
  });
});
