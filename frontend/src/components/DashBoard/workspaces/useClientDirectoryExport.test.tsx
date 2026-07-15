import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClientDirectoryExport } from './useClientDirectoryExport';

const toast = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

describe('useClientDirectoryExport', () => {
  beforeEach(() => {
    toast.mockReset();
  });

  it('reports completion only after the browser download succeeds', async () => {
    const service = {
      exportClients: vi.fn().mockResolvedValue(true),
    };
    const { result } = renderHook(() => useClientDirectoryExport(service));

    await act(async () => {
      await result.current.exportDirectory();
    });

    expect(service.exportClients).toHaveBeenCalledWith('csv');
    expect(toast).toHaveBeenCalledWith({
      title: 'Client export ready',
      description: 'Your client directory CSV was downloaded.',
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('survives the React StrictMode effect replay without suppressing completion', async () => {
    const service = {
      exportClients: vi.fn().mockResolvedValue(true),
    };
    const { result } = renderHook(() => useClientDirectoryExport(service), {
      wrapper: StrictMode,
    });

    await act(async () => {
      await result.current.exportDirectory();
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client export ready',
    }));
    expect(result.current.isExporting).toBe(false);
  });

  it('treats a false service result as failure instead of showing false success', async () => {
    const service = {
      exportClients: vi.fn().mockResolvedValue(false),
    };
    const { result } = renderHook(() => useClientDirectoryExport(service));

    await act(async () => {
      await result.current.exportDirectory();
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'Client export failed',
      description: 'No client file was downloaded. Please try again.',
      variant: 'destructive',
    });
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client export ready',
    }));
  });

  it('coalesces repeated clicks while one export request is in flight', async () => {
    let resolveExport: ((value: boolean) => void) | undefined;
    const service = {
      exportClients: vi.fn().mockReturnValue(new Promise<boolean>((resolve) => {
        resolveExport = resolve;
      })),
    };
    const { result } = renderHook(() => useClientDirectoryExport(service));

    act(() => {
      void result.current.exportDirectory();
      void result.current.exportDirectory();
    });

    expect(service.exportClients).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isExporting).toBe(true));

    await act(async () => {
      resolveExport?.(true);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isExporting).toBe(false));
    expect(service.exportClients).toHaveBeenCalledTimes(1);
  });

  it('reports thrown service failures without leaking the underlying error', async () => {
    const service = {
      exportClients: vi.fn().mockRejectedValue(new Error('private transport detail')),
    };
    const { result } = renderHook(() => useClientDirectoryExport(service));

    await act(async () => {
      await result.current.exportDirectory();
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client export failed',
      variant: 'destructive',
    }));
  });
});
