import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import RestoreCard from './RestoreCard';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestoreToday } from './useRestoreToday';
import type { RestoreTodayData } from './RestoreCard.types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../../services/api.service', () => ({ default: mocks }));
vi.mock('../../../../utils/logger', () => ({ logger: { warn: vi.fn() } }));
const deferred = () => { let resolve!: (value: unknown) => void; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
const data = (id: string): RestoreTodayData => ({ mode: 'full', dayState: 'rest', localDate: '2026-09-13', generatedAt: '2026-09-13T01:00:00Z', completedExerciseIds: [], blocks: [{ key: 'inhibit', provenance: 'Recent training', conflictNote: null, items: [{ exerciseId: id, name: `Move ${id}`, dose: '30 seconds', xp: 5, thumbnailUrl: null, videoUrl: null, why: ['Recent training'], dataSources: ['training'] }] }] });
const response = (payload: unknown) => ({ data: { success: true, data: payload } });
beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); });

describe('Restore owner and response boundaries', () => {
  it('dismisses an old owner details sheet before the new owner renders', async () => {
    mocks.get.mockResolvedValueOnce(response(data('a'))).mockResolvedValueOnce(response(data('b')));
    const { rerender } = render(<RestoreCard userId="101" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Why Move a? Open details' }));
    expect(screen.getByRole('dialog', { name: 'Move a details' })).toBeInTheDocument();
    rerender(<RestoreCard userId="102" />);
    await screen.findByRole('button', { name: 'Why Move b? Open details' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('rejects malformed success and recovers through a fresh retry', async () => {
    mocks.get.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response(data('a')));
    const { result } = renderHook(() => useRestoreToday('101'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.data).toBeNull();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data?.blocks[0].items[0].exerciseId).toBe('a'));
    expect(result.current.error).toBe(false);
  });
  it('clears the prior owner and rejects retired fetches, including logout', async () => {
    const a = deferred(), b = deferred();
    mocks.get.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = renderHook(({ owner }) => useRestoreToday(owner), { initialProps: { owner: '101' as string | null } });
    rerender({ owner: '102' });
    await act(async () => a.resolve(response(data('owner-a'))));
    expect(result.current.data).toBeNull();
    await act(async () => b.resolve(response(data('owner-b'))));
    await waitFor(() => expect(result.current.data?.blocks[0].items[0].exerciseId).toBe('owner-b'));
    rerender({ owner: null });
    expect(result.current.data).toBeNull();
    expect(result.current.completed.size).toBe(0);
  });
  it('rolls back malformed completion receipts instead of retaining false success', async () => {
    const payload = data('a');
    mocks.get.mockResolvedValue(response(payload)); mocks.post.mockResolvedValue(response({}));
    const { result } = renderHook(() => useRestoreToday('101'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.completeItem(payload.blocks[0].items[0], 'inhibit'));
    expect(result.current.completed.has('a')).toBe(false);
    expect(result.current.lastXpAwarded).toBeNull();
  });
  it('does not publish a retired owner completion or permit its old action', async () => {
    const a = data('a'), b = data('b'), post = deferred();
    mocks.get.mockResolvedValueOnce(response(a)).mockResolvedValueOnce(response(b)); mocks.post.mockReturnValue(post.promise);
    const { result, rerender } = renderHook(({ owner }) => useRestoreToday(owner), { initialProps: { owner: '101' } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const oldComplete = result.current.completeItem;
    let pending!: Promise<void>;
    act(() => { pending = oldComplete(a.blocks[0].items[0], 'inhibit'); });
    rerender({ owner: '102' });
    await waitFor(() => expect(result.current.data?.blocks[0].items[0].exerciseId).toBe('b'));
    await act(async () => { post.resolve(response({ exerciseId: 'a', alreadyCompleted: false, xpAwarded: 15, levelUp: false })); await pending; });
    expect(result.current.completed.has('a')).toBe(false);
    expect(result.current.lastXpAwarded).toBeNull();
    await act(async () => oldComplete(a.blocks[0].items[0], 'inhibit'));
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});
