/**
 * Swan Lens C5 viewport hook + matrix CSS (KIMI-SWAN-LENS-SLICE2 §2.6 tests 8–11).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLensViewport,
  evaluateViewport,
  layoutProfileForViewport,
  LENS_VIEWPORT_FALLBACK,
} from '../useLensViewport';
import { lensViewportCss } from '../../styles/lensViewportStyles';

const realMatchMedia = window.matchMedia;

function mockMatchMedia(width: number): void {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)/.exec(query);
    const max = /max-width:\s*(\d+)/.exec(query);
    const okMin = !min || width >= Number(min[1]);
    const okMax = !max || width <= Number(max[1]);
    return {
      matches: okMin && okMax,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-viewport');
});
afterEach(() => {
  window.matchMedia = realMatchMedia;
  vi.useRealTimers();
});

describe('AT-8 — viewport classification + layout profile mapping', () => {
  it.each([
    [375, 'hand'],
    [768, 'lap'],
    [1024, 'desk'],
    [1440, 'desk'],
    [2560, 'wall'],
  ] as const)('width %ipx → %s', (width, expected) => {
    mockMatchMedia(width);
    expect(evaluateViewport()).toBe(expected);
    const { result } = renderHook(() => useLensViewport());
    expect(result.current).toBe(expected);
    expect(document.documentElement.getAttribute('data-viewport')).toBe(expected);
  });

  it('layoutProfileForViewport is the fixed mapping', () => {
    expect(layoutProfileForViewport('hand')).toBe('stack');
    expect(layoutProfileForViewport('lap')).toBe('rail');
    expect(layoutProfileForViewport('desk')).toBe('console');
    expect(layoutProfileForViewport('wall')).toBe('panorama');
  });
});

describe('AT-9 — resize is debounced 150ms', () => {
  it('two resizes 100ms apart → a single attribute write after 150ms', () => {
    vi.useFakeTimers();
    mockMatchMedia(1440); // desk
    renderHook(() => useLensViewport());
    expect(document.documentElement.getAttribute('data-viewport')).toBe('desk');

    mockMatchMedia(375); // now hand
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(100);
      window.dispatchEvent(new Event('resize')); // resets the debounce
      vi.advanceTimersByTime(100); // 100ms since 2nd resize — not yet fired
    });
    expect(document.documentElement.getAttribute('data-viewport')).toBe('desk');
    act(() => {
      vi.advanceTimersByTime(50); // 150ms since 2nd resize → fires once
    });
    expect(document.documentElement.getAttribute('data-viewport')).toBe('hand');
  });
});

describe('AT-10 — fail-closed to lap', () => {
  it('matchMedia throws → lap, render succeeds, no console error', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.matchMedia = (() => {
      throw new Error('matchMedia unavailable');
    }) as typeof window.matchMedia;
    expect(evaluateViewport()).toBe(LENS_VIEWPORT_FALLBACK);
    const { result } = renderHook(() => useLensViewport());
    expect(result.current).toBe('lap');
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('AT-11 — matrix CSS assertions (string)', () => {
  it('hand/desk/wall blocks + target clamp + wall spacious default', () => {
    expect(lensViewportCss).toContain("data-viewport='hand'");
    expect(lensViewportCss).toContain('--lens-geo-blur-md: 4px');
    expect(lensViewportCss).toContain('--lens-fx-surface-alpha: 0.92');
    expect(lensViewportCss).toContain('--lens-geo-blur-md: 12px'); // desk
    expect(lensViewportCss).toContain('--lens-fx-surface-alpha: 0.72'); // desk/wall
    expect(lensViewportCss).toContain("data-viewport='wall'");
    expect(lensViewportCss).toContain(":root[data-viewport='wall']:not([data-density])");
    expect(lensViewportCss).toContain('max(var(--lens-geo-target-min, 44px)');
    // no invented world tokens / no !important / no retired palette
    expect(lensViewportCss).not.toContain('--world-');
    expect(lensViewportCss).not.toContain('!important');
    const retired = new RegExp(['#0a0a' + '1a', '#00ff' + 'ff', '#7851' + 'a9'].join('|'), 'i');
    expect(retired.test(lensViewportCss)).toBe(false);
  });

  it('Codex#3: root-scale selector puts data-viewport on the :root compound, not a descendant', () => {
    expect(lensViewportCss).toContain(":root[data-viewport='desk']");
    expect(lensViewportCss).toContain(":root[data-viewport='lap']");
    // the broken descendant form (data-viewport looked up below :root) must be gone
    expect(lensViewportCss).not.toContain(":where([data-viewport='desk'], [data-viewport='lap']) #root");
  });
});
