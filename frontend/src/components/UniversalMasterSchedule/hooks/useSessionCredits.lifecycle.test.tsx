import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeSessionCreditsPayload, useSessionCredits } from './useSessionCredits';
const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { id: '101' } as { id: string } | null }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../../services/api.service', () => ({ default: { get: mocks.get } }));
const deferred = () => { let resolve!: (value: unknown) => void; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
beforeEach(() => { mocks.get.mockReset(); mocks.user = { id: '101' }; });
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useSessionCredits(), { wrapper });
};
describe('Session balance truth and ownership', () => {
  it.each([undefined, null, {}, { sessionsRemaining: null }, { sessionsRemaining: '' }, { sessionsRemaining: 'unknown' }, { sessionsRemaining: -1 }, { sessionsRemaining: 1.5 }, { sessionsRemaining: Infinity }])('rejects unverified balance %j', value => {
    expect(() => normalizeSessionCreditsPayload(value)).toThrow();
  });
  it('does not publish a prior account balance or query while logged out', async () => {
    const a = deferred(), b = deferred(); mocks.get.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = setup();
    mocks.user = { id: '102' }; rerender();
    await act(async () => a.resolve({ data: { success: true, data: { sessionsRemaining: 99 } } }));
    expect(result.current.data).toBeUndefined();
    await act(async () => b.resolve({ data: { success: true, data: { sessionsRemaining: 7 } } }));
    await waitFor(() => expect(result.current.data?.sessionsRemaining).toBe(7));
    mocks.user = null; rerender();
    expect(result.current.data).toBeUndefined();
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it('exposes a malformed success as unavailable', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = setup();
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
