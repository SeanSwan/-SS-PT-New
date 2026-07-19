/**
 * S1-C active-injection logic + reactivity (KIMI-SWAN-LENS-S1C AT-4a/b/c/d).
 *
 * Assertion strategy: styled-components uses speedy `insertRule` in this jsdom env, so injected
 * CSS text is NOT readable from <style> tags (probed). We therefore test the real CONTRACT —
 * which lens ids resolve active, the cascade ORDER of rendered components, and the subtree-aware
 * reactivity — via pure helpers + renderHook. Pixel-level computed cascade is the deferred
 * Playwright pass (Kimi §11.4). Source-level contracts live in monolithContract.test.ts.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  selectActiveLensIds,
  orderedLensStyleComponents,
  useStyleLensIds,
  __resetUnknownIdWarnings,
} from '../activeLensStyles';
import { LensCoreGlobalStyles } from '../lensCoreStyles';

beforeEach(() => {
  document.documentElement.removeAttribute('data-style-lens');
  document.body.innerHTML = '';
  __resetUnknownIdWarnings();
});
afterEach(() => {
  document.documentElement.removeAttribute('data-style-lens');
  document.body.innerHTML = '';
});

describe('AT-4a/c — selectActiveLensIds (active-only; unknown dropped)', () => {
  it('keeps a known lens id', () => {
    expect(selectActiveLensIds(['aurora-console'])).toEqual(['aurora-console']);
  });
  it('drops an unknown id (→ core-only)', () => {
    expect(selectActiveLensIds(['ghost-lens'])).toEqual([]);
  });
  it('keeps the union of two known ids in order', () => {
    expect(selectActiveLensIds(['quiet-meridian', 'analog-flight-recorder'])).toEqual([
      'quiet-meridian',
      'analog-flight-recorder',
    ]);
  });
});

describe('AT-4d — cascade order: lens first, core LAST', () => {
  it('core is the final rendered component', () => {
    const ordered = orderedLensStyleComponents(['aurora-console']);
    expect(ordered).toHaveLength(2);
    expect(ordered[ordered.length - 1]).toBe(LensCoreGlobalStyles);
    expect(ordered[0]).not.toBe(LensCoreGlobalStyles);
  });
  it('core is last even with zero known lenses (core-only)', () => {
    const ordered = orderedLensStyleComponents([]);
    expect(ordered).toEqual([LensCoreGlobalStyles]);
  });
});

describe('AT-4a/b — useStyleLensIds reactivity (subtree-aware)', () => {
  it('reads the committed id on <html> at mount', () => {
    document.documentElement.setAttribute('data-style-lens', 'aurora-console');
    const { result } = renderHook(() => useStyleLensIds());
    expect(result.current).toEqual(['aurora-console']);
  });

  it('AT-4b flip: updates when the attribute changes', async () => {
    document.documentElement.setAttribute('data-style-lens', 'quiet-meridian');
    const { result } = renderHook(() => useStyleLensIds());
    expect(result.current).toEqual(['quiet-meridian']);
    act(() => {
      document.documentElement.setAttribute('data-style-lens', 'swan-flagship');
    });
    await waitFor(() => expect(result.current).toEqual(['swan-flagship']));
  });

  it('core-only when no lens attribute is present', () => {
    const { result } = renderHook(() => useStyleLensIds());
    expect(result.current).toEqual([]);
  });
});

describe('AT-4g — subtree union (ScopedLensFrame previews)', () => {
  it('includes a preview frame id alongside the committed lens, then drops it on unmount', async () => {
    document.documentElement.setAttribute('data-style-lens', 'quiet-meridian');
    const { result } = renderHook(() => useStyleLensIds());
    expect(result.current).toEqual(['quiet-meridian']);

    const frame = document.createElement('div');
    frame.setAttribute('data-scoped-lens-frame', '');
    frame.setAttribute('data-style-lens', 'analog-flight-recorder');
    act(() => {
      document.body.appendChild(frame);
    });
    // dedup'd + sorted union of the two present ids
    await waitFor(() =>
      expect(result.current).toEqual(['analog-flight-recorder', 'quiet-meridian']),
    );

    act(() => {
      frame.remove();
    });
    await waitFor(() => expect(result.current).toEqual(['quiet-meridian']));
  });
});
