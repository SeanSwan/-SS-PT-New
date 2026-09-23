import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspacePanels } from './useWorkspacePanels';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('R6 media-query docking at fractional zoom boundaries', () => {
  it.each([
    [767.97, 768, false, false], [767.99, 768, true, false],
    [1199.97, 1200, true, false], [1199.99, 1200, true, true],
  ])('CSS width %s agrees even when innerWidth rounds to %s', (cssWidth, rounded, sidebar, inspector) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(rounded);
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: cssWidth <= Number(/([0-9.]+)px/.exec(query)?.[1]), media: query,
      onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
    const h = renderHook(() => useWorkspacePanels('operator-grid', { current: null }));
    expect(h.result.current.docking).toEqual({ sidebarDocked: sidebar, inspectorDocked: inspector });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(h.result.current.docking).toEqual({ sidebarDocked: sidebar, inspectorDocked: inspector });
  });
});
