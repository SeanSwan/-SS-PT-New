import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionTypes } from './useSessionTypes';
import apiService from '../../../services/api';

vi.mock('../../../services/api');

describe('useSessionTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches session types on mount', async () => {
    const mockTypes = [
      { id: 1, name: 'Personal Training', duration: 60, bufferBefore: 0, bufferAfter: 15, color: '#00FFFF', isActive: true, sortOrder: 1 }
    ];
    vi.mocked(apiService.get).mockResolvedValueOnce({ data: { data: mockTypes } });

    const { result } = renderHook(() => useSessionTypes());

    await act(async () => {
      await result.current.fetchSessionTypes();
    });

    expect(result.current.sessionTypes).toHaveLength(1);
    expect(result.current.sessionTypes[0].name).toBe('Personal Training');
  });

  it('calculates effective end time correctly', async () => {
    const mockTypes = [
      { id: 1, name: 'PT', duration: 60, bufferBefore: 0, bufferAfter: 15, color: '#00FFFF', isActive: true, sortOrder: 1 }
    ];
    vi.mocked(apiService.get).mockResolvedValueOnce({ data: { data: mockTypes } });

    const { result } = renderHook(() => useSessionTypes());

    await act(async () => {
      await result.current.fetchSessionTypes();
    });

    const startTime = new Date('2026-02-01T08:00:00');
    const effectiveEnd = result.current.getEffectiveEndTime(startTime, 1);

    expect(effectiveEnd.getTime()).toBe(startTime.getTime() + 75 * 60000);
  });

  it('handles create/update/delete operations', async () => {
    const newType = { id: 2, name: 'New Type', duration: 30, bufferBefore: 5, bufferAfter: 10, color: '#FF0000', isActive: true, sortOrder: 2 };
    vi.mocked(apiService.post).mockResolvedValueOnce({ data: { data: newType } });
    vi.mocked(apiService.put).mockResolvedValueOnce({ data: { data: { ...newType, name: 'Updated Type' } } });
    vi.mocked(apiService.delete).mockResolvedValueOnce({});

    const { result } = renderHook(() => useSessionTypes());

    await act(async () => {
      await result.current.createSessionType({ name: 'New Type', duration: 30 });
    });
    expect(result.current.sessionTypes).toContainEqual(expect.objectContaining({ name: 'New Type' }));

    await act(async () => {
      await result.current.updateSessionType(2, { name: 'Updated Type' });
    });
    expect(result.current.sessionTypes).toContainEqual(expect.objectContaining({ name: 'Updated Type' }));

    await act(async () => {
      await result.current.deleteSessionType(2);
    });
    expect(result.current.sessionTypes).not.toContainEqual(expect.objectContaining({ id: 2 }));
  });
});
