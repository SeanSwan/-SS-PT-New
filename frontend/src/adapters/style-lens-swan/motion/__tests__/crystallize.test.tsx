/**
 * Swan Lens C4 Crystallize controller + overlay CSS gate (KIMI-SWAN-LENS-SLICE2 §2.6 tests 1–7).
 * Tier + viewport modules mocked to control variant resolution; PRM via matchMedia.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, render, act, cleanup } from '@testing-library/react';
import { useCrystallizeTransition } from '../useCrystallizeTransition';
import { CrystallizeOverlay, crystallizeOverlayCss, CRYSTALLIZE_OVERLAY_Z } from '../CrystallizeOverlay';
import { useAnimationTier } from '../../../../hooks/useAnimationTier';
import { useLensViewport } from '../../viewport/useLensViewport';
import { resolveMotionTier } from '../../../../core/motion/surfaceMotionTiers';

vi.mock('../../../../hooks/useAnimationTier', () => ({ useAnimationTier: vi.fn() }));
vi.mock('../../viewport/useLensViewport', () => ({ useLensViewport: vi.fn() }));
vi.mock('../../../../core/motion/surfaceMotionTiers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../core/motion/surfaceMotionTiers')>();
  return { ...actual, resolveMotionTier: vi.fn() };
});

const realMatchMedia = window.matchMedia;
function setPrm(matches: boolean | 'throw'): void {
  window.matchMedia = ((query: string) => {
    if (matches === 'throw') throw new Error('matchMedia unavailable');
    return {
      matches, media: query, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

beforeEach(() => {
  vi.mocked(useAnimationTier).mockReturnValue('full');
  vi.mocked(useLensViewport).mockReturnValue('desk');
  vi.mocked(resolveMotionTier).mockReturnValue('M2');
  setPrm(false);
  document.documentElement.removeAttribute('data-lens-transition');
  document.documentElement.removeAttribute('data-lens-transition-variant');
});
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
});

describe('AT-1 — desk sweep timeline', () => {
  it('charging@0 → commit@120 → settling@120 → idle@480, commit once, attrs set then removed', () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    expect(result.current.variant).toBe('sweep');

    act(() => result.current.crystallizeTo(commit, { settleAnnouncement: 'Appearance applied.' }));
    expect(result.current.phase).toBe('charging');
    expect(commit).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute('data-lens-transition')).toBe('charging');
    expect(document.documentElement.getAttribute('data-lens-transition-variant')).toBe('sweep');
    expect(document.documentElement.style.getPropertyValue('--lens-crystallize-charge-ms')).toBe('120ms');

    act(() => vi.advanceTimersByTime(120));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('settling');
    expect(document.documentElement.getAttribute('data-lens-transition')).toBe('settling');

    act(() => vi.advanceTimersByTime(360));
    expect(result.current.phase).toBe('idle');
    expect(document.documentElement.getAttribute('data-lens-transition')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--lens-crystallize-charge-ms')).toBe('');
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe('AT-2 — overlay CSS property gate', () => {
  it('animates only opacity/transform; no banned props in animation contexts; no world/z/important/retired', () => {
    // keyframe bodies + animation declarations must not touch layout/paint props
    const keyframeBodies = crystallizeOverlayCss.match(/@keyframes[^{]+\{([^@]*?)\}\s*\}/gs) ?? [];
    const animLines = crystallizeOverlayCss.match(/animation:[^;]+;/g) ?? [];
    const animationContext = [...keyframeBodies, ...animLines].join('\n');
    for (const banned of ['width', 'height', 'top', 'left', 'margin', 'padding', 'filter', 'backdrop-filter']) {
      expect(animationContext.includes(banned), `animation context must not touch ${banned}`).toBe(false);
    }
    expect(String(CRYSTALLIZE_OVERLAY_Z)).toBe('300');
    expect(crystallizeOverlayCss).toContain('z-index: 300');
    for (const forbidden of ['--world-z-', '--world-target-size', '!important']) {
      expect(crystallizeOverlayCss.includes(forbidden)).toBe(false);
    }
    const retired = new RegExp(['#0a0a' + '1a', '#00ff' + 'ff', '#7851' + 'a9'].join('|'), 'i');
    expect(retired.test(crystallizeOverlayCss)).toBe(false);
  });
});

describe('CrystallizeOverlay — render smoke (portal + live region + conditional sheen)', () => {
  afterEach(() => cleanup());
  it('idle/static → live region present, no sheen', () => {
    render(
      <CrystallizeOverlay phase="idle" variant="static" chargeMs={120} settleMs={360} announcement="Appearance applied." />,
    );
    const live = document.body.querySelector('.lens-crystallize-live');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.textContent).toBe('Appearance applied.');
    expect(document.body.querySelector('.lens-crystallize-sheen')).toBeNull();
  });
  it('charging/sweep → sheen mounts with data attributes, aria-hidden', () => {
    render(
      <CrystallizeOverlay phase="charging" variant="sweep" chargeMs={120} settleMs={360} announcement="" />,
    );
    const sheen = document.body.querySelector('.lens-crystallize-sheen');
    expect(sheen).not.toBeNull();
    expect(sheen?.getAttribute('data-phase')).toBe('charging');
    expect(sheen?.getAttribute('data-variant')).toBe('sweep');
    expect(sheen?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('AT-3 — reduced-motion matrix (static; commit sync, no sheen, no timers)', () => {
  const cases: Array<[string, () => void]> = [
    ['motionMode reduced', () => vi.mocked(useAnimationTier).mockReturnValue('full')],
    ['capability essential', () => vi.mocked(useAnimationTier).mockReturnValue('essential')],
    ['PRM matches', () => setPrm(true)],
  ];
  it.each(cases)('%s → static synchronous commit', (label, setup) => {
    vi.useFakeTimers();
    setup();
    // tier high so only the reduced trigger forces static
    vi.mocked(resolveMotionTier).mockReturnValue('M3');
    const motionMode = label === 'motionMode reduced' ? 'reduced' : 'auto';
    const commit = vi.fn();
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode }));
    expect(result.current.variant).toBe('static');
    act(() => result.current.crystallizeTo(commit, { settleAnnouncement: 'x' }));
    expect(commit).toHaveBeenCalledTimes(1); // synchronous
    expect(result.current.phase).toBe('idle');
    expect(document.documentElement.getAttribute('data-lens-transition')).toBeNull();
    act(() => vi.advanceTimersByTime(1000)); // no scheduled timers
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe('AT-4 — variant resolution (tier × viewport)', () => {
  it('hand+M3→fade, desk+M1→fade, wall+M2→sweep', () => {
    vi.mocked(useLensViewport).mockReturnValue('hand');
    vi.mocked(resolveMotionTier).mockReturnValue('M3');
    expect(renderHook(() => useCrystallizeTransition()).result.current.variant).toBe('fade');

    vi.mocked(useLensViewport).mockReturnValue('desk');
    vi.mocked(resolveMotionTier).mockReturnValue('M1');
    expect(renderHook(() => useCrystallizeTransition()).result.current.variant).toBe('fade');

    vi.mocked(useLensViewport).mockReturnValue('wall');
    vi.mocked(resolveMotionTier).mockReturnValue('M2');
    expect(renderHook(() => useCrystallizeTransition()).result.current.variant).toBe('sweep');
  });

  it('M0 (unlicensed fail-safe) → static', () => {
    vi.mocked(resolveMotionTier).mockReturnValue('M0');
    expect(renderHook(() => useCrystallizeTransition()).result.current.variant).toBe('static');
  });
});

describe('AT-5 — busy call completes the in-flight commit, never drops/doubles', () => {
  it('second crystallizeTo mid-charge flushes the first commit synchronously', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    act(() => result.current.crystallizeTo(first));
    act(() => vi.advanceTimersByTime(50)); // mid-charge
    expect(first).not.toHaveBeenCalled();
    act(() => result.current.crystallizeTo(second)); // busy → flush first synchronously
    expect(first).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(480));
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('AT-6/7 — fail-closed exceptions', () => {
  it('animated path: commit throws at charge → forces idle, commit once, error logged (not rethrown)', () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const commit = vi.fn(() => {
      throw new Error('commit failed');
    });
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    act(() => result.current.crystallizeTo(commit));
    act(() => vi.advanceTimersByTime(120)); // async path: no uncatchable throw
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('idle');
    expect(document.documentElement.getAttribute('data-lens-transition')).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('static path: commit throws → propagates synchronously so Lane A Apply catch owns the fallback', () => {
    vi.mocked(resolveMotionTier).mockReturnValue('M0'); // static
    const commit = vi.fn(() => {
      throw new Error('sync fail');
    });
    const { result } = renderHook(() => useCrystallizeTransition());
    expect(() => act(() => result.current.crystallizeTo(commit))).toThrow('sync fail');
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('PRM matchMedia throws → treated as reduced (static), no crash', () => {
    setPrm('throw');
    const commit = vi.fn();
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    expect(result.current.reduced).toBe(true);
    expect(result.current.variant).toBe('static');
    act(() => result.current.crystallizeTo(commit));
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe('Triangle-review fixes (Codex findings)', () => {
  it('Codex#1: busy-flush of a throwing old commit does NOT propagate + clears attrs; new proceeds', () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error('old boom');
    });
    const good = vi.fn();
    const { result } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    act(() => result.current.crystallizeTo(bad));
    act(() => vi.advanceTimersByTime(50)); // mid-charge, bad not yet committed
    expect(() => act(() => result.current.crystallizeTo(good))).not.toThrow(); // flush must not propagate
    expect(bad).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(480));
    expect(good).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-lens-transition')).toBeNull();
    errSpy.mockRestore();
  });

  it('Codex#2: unmount with a throwing pending commit does NOT throw + clears <html> attrs', () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error('unmount boom');
    });
    const { result, unmount } = renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }));
    act(() => result.current.crystallizeTo(bad)); // charging, attrs set
    expect(document.documentElement.getAttribute('data-lens-transition')).toBe('charging');
    expect(() => unmount()).not.toThrow();
    expect(bad).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-lens-transition')).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('Codex#4: legacy MediaQueryList (addListener only, no addEventListener) does not crash', () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        addListener() {},
        removeListener() {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    expect(() => renderHook(() => useCrystallizeTransition({ motionMode: 'auto' }))).not.toThrow();
  });
});
