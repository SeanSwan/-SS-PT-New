/**
 * Wave 1 Slice 2 — messaging capabilities come from the server
 * ============================================================
 * Behavioral coverage for the decision the retired tier-gate string assertion
 * used to freeze. The defect it froze: `isElite` is a SUBSCRIPTION tier used as
 * a stand-in for a COACHING relationship, so a client on a training package
 * (tier stays 'free' — no purchase controller writes it) was walled off from
 * the trainer they pay, while a live trial was allowed by the API and blocked
 * by the UI.
 *
 * These tests assert the two lanes and the fail-closed default.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('../../../services/api.service', () => ({
  default: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { useMessagingCapabilities } = await import('./useMessagingCapabilities');

beforeEach(() => { vi.clearAllMocks(); });

describe('useMessagingCapabilities', () => {
  it('grants the coach thread to a free-tier client with an active trainer', async () => {
    getMock.mockResolvedValue({
      data: { success: true, canMessageAssignedCoach: true, canUseCommunityDirectMessages: false },
    });

    const { result } = renderHook(() => useMessagingCapabilities(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The whole point of the slice: reachable trainer, no subscription.
    expect(result.current.capabilities.canMessageAssignedCoach).toBe(true);
    // And the monetization rule for member-to-member chat is untouched.
    expect(result.current.capabilities.canUseCommunityDirectMessages).toBe(false);
    expect(getMock).toHaveBeenCalledWith('/api/messaging/capabilities');
  });

  it('grants both lanes to a subscriber', async () => {
    getMock.mockResolvedValue({
      data: { success: true, canMessageAssignedCoach: true, canUseCommunityDirectMessages: true },
    });

    const { result } = renderHook(() => useMessagingCapabilities(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.capabilities).toEqual({
      canMessageAssignedCoach: true,
      canUseCommunityDirectMessages: true,
    });
  });

  it('denies both lanes for a user with neither a trainer nor a subscription', async () => {
    getMock.mockResolvedValue({
      data: { success: true, canMessageAssignedCoach: false, canUseCommunityDirectMessages: false },
    });

    const { result } = renderHook(() => useMessagingCapabilities(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
  });

  it('fails closed when the request errors', async () => {
    getMock.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMessagingCapabilities(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.capabilities).toEqual({
      canMessageAssignedCoach: false,
      canUseCommunityDirectMessages: false,
    });
    expect(result.current.error).toBeTruthy();
  });

  it('treats a truthy-but-not-true payload as denied', async () => {
    // A shape change upstream must not be read as permission.
    getMock.mockResolvedValue({
      data: { canMessageAssignedCoach: 'yes', canUseCommunityDirectMessages: 1 },
    });

    const { result } = renderHook(() => useMessagingCapabilities(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
    expect(result.current.capabilities.canUseCommunityDirectMessages).toBe(false);
  });

  it('does not call the API when disabled', async () => {
    const { result } = renderHook(() => useMessagingCapabilities(false));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
  });
});
