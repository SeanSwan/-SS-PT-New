/**
 * runtime.contract.test — the gating, colour and observation logic the fleet rests on.
 * @module pages/HomePage/three-worlds/__tests__/runtime.contract.test
 *
 * WHY THIS FILE EXISTS
 * A hostile review (glm-5.3 and glm-5.3-flash, independently) found that the
 * three-worlds suite covered only the registry and the copy pack. `resolveMotion`,
 * `hasWebGL`, `resolveColors`, `scrollProgressFor`, `pointerFor` and the context-loss
 * telemetry had NO unit coverage — which meant the reduced-motion and poster paths,
 * the accessibility floor, rested on a single browser run.
 *
 * Every test below is a regression test for a defect that was real, found either by
 * that review or by the builder's own audit, and then fixed. They are written to fail
 * against the pre-fix implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveMotion, hasWebGL } from '../diagnostics';
import { isColorLike, toColor, tokenCssVars, TOKEN_NAMES, TOKEN_FALLBACKS_FOR_TEST } from '../tokens';
import { scrollProgressFor, pointerFor, scrollAnchorFor, LOAD_ANCHOR_EPSILON_PX } from '../observe';
import { createContextLossPolicy } from '../contextLoss';
import {
  MAX_LIVE_WORLDS, acquireSlot, releaseSlot, onSlotFreed, slotStats, __resetSlots,
} from '../renderSlots';

/* ── Context-loss policy: the failure mode where the page LOOKS fine ───────── */

describe('createContextLossPolicy — telemetry must not report health on a corpse', () => {
  it('starts healthy with no losses', () => {
    const s = createContextLossPolicy().read();
    expect(s.stage).toBe('healthy');
    expect(s.contextLost).toBe(false);
    expect(s.giveUp).toBe(false);
    expect(s.losses).toBe(0);
  });

  it('reports lost, and asks to stop, on the first loss', () => {
    const p = createContextLossPolicy();
    const s = p.onLost();
    expect(s.stage).toBe('lost');
    expect(s.contextLost).toBe(true);
    expect(s.giveUp).toBe(false);
  });

  it('reports recovered once a restore follows', () => {
    const p = createContextLossPolicy();
    p.onLost();
    const s = p.onRestored();
    expect(s.stage).toBe('recovered');
    expect(s.contextLost).toBe(false);
  });

  /**
   * THE REGRESSION. In the version two reviewers attacked, `restored` was set on the
   * first restore and never cleared, so the SECOND — fatal — loss published
   * `contextLost: false` while the canvas was permanently black. The field lied at
   * exactly the moment it exists for.
   */
  it('reports LOST again on a loss AFTER a successful restore', () => {
    const p = createContextLossPolicy();
    p.onLost();          // loss 1
    p.onRestored();      // recovered
    const s = p.onLost(); // loss 2 — the fatal one
    expect(s.contextLost).toBe(true);
    expect(s.stage).toBe('fatal');
    expect(s.giveUp).toBe(true);
    expect(s.losses).toBe(2);
  });

  it('ignores a late restore once it has given up, so the verdict cannot flap', () => {
    const p = createContextLossPolicy();
    p.onLost();
    p.onRestored();
    p.onLost();          // fatal
    const s = p.onRestored();
    expect(s.giveUp).toBe(true);
    expect(s.stage).toBe('fatal');
  });

  it('keeps instances independent', () => {
    const a = createContextLossPolicy();
    const b = createContextLossPolicy();
    a.onLost();
    a.onLost();
    expect(a.read().giveUp).toBe(true);
    expect(b.read().giveUp).toBe(false);
    expect(b.read().stage).toBe('healthy');
  });
});

/* ── Motion gating: the accessibility floor ───────────────────────────────── */

describe('resolveMotion — a user who asked for less motion never gets a loop', () => {
  it('returns poster whenever prefers-reduced-motion is set, at EVERY tier', () => {
    // The whole point: a fast laptop must not override an OS-level request.
    expect(resolveMotion('full', true)).toBe('poster');
    expect(resolveMotion('balanced', true)).toBe('poster');
    expect(resolveMotion('essential', true)).toBe('poster');
  });

  it('returns poster on the essential tier even without a reduced-motion request', () => {
    expect(resolveMotion('essential', false)).toBe('poster');
  });

  it('returns poster when WebGL is unavailable, rather than mounting a broken canvas', () => {
    expect(resolveMotion('full', false, false)).toBe('poster');
  });

  it('returns live only when every gate passes', () => {
    expect(resolveMotion('full', false, true)).toBe('live');
    expect(resolveMotion('balanced', false, true)).toBe('live');
  });
});

describe('hasWebGL — probes without throwing in a non-DOM environment', () => {
  it('returns a boolean and never throws', () => {
    expect(typeof hasWebGL()).toBe('boolean');
  });
});

/* ── Colour tokens: the silent-white defect ───────────────────────────────── */

describe('isColorLike — CSS-wide keywords must be REJECTED', () => {
  /**
   * The defect: the guard used to accept anything matching /^[a-z]+$/, which admits
   * `unset`, `inherit` and `currentColor`. THREE.Color does not throw on those — it
   * warns and leaves the colour WHITE — so the fallback path never ran and a token
   * defined as `unset` rendered the scene white. Measured, not assumed:
   *   THREE.Color.set('unset') -> r=1 g=1 b=1, warned, did NOT throw.
   */
  it.each(['unset', 'inherit', 'initial', 'revert', 'currentColor', 'transparent', 'none'])(
    'rejects the CSS-wide keyword %s',
    (keyword) => { expect(isColorLike(keyword)).toBe(false); },
  );

  it('accepts real hex forms, including 4- and 8-digit alpha', () => {
    for (const hex of ['#fff', '#ffff', '#002060', '#002060ff']) {
      expect(isColorLike(hex)).toBe(true);
    }
  });

  it('accepts legacy comma rgb()/hsl() that Three parses deterministically', () => {
    expect(isColorLike('rgb(0, 32, 96)')).toBe(true);
    expect(isColorLike('rgba(0, 32, 96, 0.5)')).toBe(true);
    expect(isColorLike('hsl(210, 100%, 19%)')).toBe(true);
  });

  it('accepts modern space-separated syntax, because CSS accepts it', () => {
    // Measured in this repo's test DOM: rgb(0 0 0 / 50%) -> "rgba(0, 0, 0, 0.5)".
    // It IS valid CSS; the problem was only that THREE.Color cannot parse it. So the
    // guard accepts it and `toColor` normalizes it, rather than rejecting valid CSS.
    expect(isColorLike('rgb(0 0 0 / 50%)')).toBe(true);
  });

  it('accepts named colours Three does not know, via the browser parse', () => {
    expect(isColorLike('rebeccapurple')).toBe(true);
  });

  it('rejects blanks and nonsense', () => {
    for (const bad of ['', '   ', 'notacolor', '12px', '#12']) {
      expect(isColorLike(bad)).toBe(false);
    }
  });
});

describe('toColor — falls back rather than silently whitening', () => {
  it('returns the fallback for a CSS-wide keyword instead of white', () => {
    const c = toColor('unset', '#002060');
    // #002060 => r=0, g=0.014, b=0.117. White would be 1,1,1.
    expect(c.r).toBeLessThan(0.1);
    expect(c.b).toBeGreaterThan(0.05);
    expect(c.getHexString()).toBe('002060');
  });

  it('returns the fallback for nonsense instead of white', () => {
    expect(toColor('notacolor', '#60c0f0').getHexString()).toBe('60c0f0');
  });

  it('NORMALIZES modern syntax rather than falling back or whitening', () => {
    // rgb(0 0 0 / 50%) is black at 50% alpha: the RGB channels must be black, NOT the
    // fallback colour and NOT white. This is the regression the guard used to cause.
    const c = toColor('rgb(0 0 0 / 50%)', '#60c0f0');
    expect(c.r).toBeLessThan(0.01);
    expect(c.g).toBeLessThan(0.01);
    expect(c.b).toBeLessThan(0.01);
  });

  it('NORMALIZES a named colour Three cannot parse', () => {
    const c = toColor('rebeccapurple', '#000000');
    expect(c.getHexString()).toBe('663399');
  });

  it('honours a valid value over the fallback', () => {
    expect(toColor('#c6a84b', '#002060').getHexString()).toBe('c6a84b');
  });
});

/* ── Scroll progress: the degenerate-dolly defect ─────────────────────────── */

describe('scrollProgressFor — must not be binary for short hosts', () => {
  /**
   * The defect: the divisor was `rect.height - viewportHeight`. For a host shorter
   * than the viewport — every card in the gallery — that is negative, the clamp
   * forced it to 1, and progress snapped 0 -> 1 at a single pixel of scroll. Every
   * scene multiplies this by `dolly`, so all 20 variants toggled between two camera
   * positions instead of scrubbing.
   */
  const VH = 900;

  it('produces intermediate values across a SHORT host (the regression)', () => {
    // A 400px card. The round-1 formula snapped 0 -> 1 the instant its top crossed
    // -1px. The fix gives it a real curve spread across its own height, so the samples
    // are taken at that granularity. Against the old formula this test fails at the
    // FIRST intermediate sample: p(-40) was already 1.
    const at = (top: number) => scrollProgressFor({ top, height: 400 }, VH);
    expect(at(700)).toBe(0);                       // still below the fold
    const samples = [0, -40, -80, -120, -160, -200, -240, -280, -320, -360, -400].map(at);
    const intermediate = samples.filter((v) => v > 0.02 && v < 0.98);
    expect(intermediate.length).toBeGreaterThanOrEqual(6);
    // Monotonic, never toggling between two states.
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it('starts at ZERO on load, for hosts both taller and shorter than the viewport', () => {
    // THE REGRESSION THIS PINS, and the reason the first version of this test was
    // wrong: it asserted `p(0.85 * vh) ≈ 0` and never tested `p(0)`. A front page has
    // its host at `rect.top = 0` on load, and the old formula returned 0.85 there —
    // so every variant opened 85% of the way through its camera dolly and the whole
    // move finished within 15% of a viewport of scrolling. Two hostile reviewers
    // caught it; this is the assertion that should have caught it first.
    for (const height of [400, 900, 1800]) {
      expect(scrollProgressFor({ top: 0, height }, VH)).toBe(0);
    }
  });

  it('is still zero while the host sits below the fold', () => {
    expect(scrollProgressFor({ top: VH, height: 900 }, VH)).toBe(0);
    expect(scrollProgressFor({ top: VH * 3, height: 900 }, VH)).toBe(0);
  });

  it('ramps monotonically to 1 as the host travels up, and stays there', () => {
    const at = (top: number) => scrollProgressFor({ top, height: 900 }, VH);
    const samples = [VH, 0, -VH * 0.5, -VH, -VH * 2, -VH * 10].map(at);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it('does NOT finish in the first fraction of a viewport (the 15% bug)', () => {
    // The old formula reached 1 after 0.15vh of scroll on a viewport-tall host.
    // Half a screen in, a 100vh hero must be genuinely mid-dolly.
    const half = scrollProgressFor({ top: -VH / 2, height: VH }, VH);
    expect(half).toBeGreaterThan(0.3);
    expect(half).toBeLessThan(0.7);
    // And it completes after a full screen, not before.
    expect(scrollProgressFor({ top: -VH, height: VH }, VH)).toBe(1);
    expect(scrollProgressFor({ top: -VH * 0.15, height: VH }, VH)).toBeLessThan(0.3);
  });

  it('spreads a taller hero across its own height, taking a full transit to finish', () => {
    const hero = 2 * VH;
    // At load a 2vh hero reads 0, like every other host.
    expect(scrollProgressFor({ top: 0, height: hero }, VH)).toBe(0);
    // Half its own height in, it is genuinely mid-dolly.
    const mid = scrollProgressFor({ top: -VH, height: hero }, VH);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
    // It completes across its own height, not in a fraction of a viewport.
    expect(scrollProgressFor({ top: -hero, height: hero }, VH)).toBe(1);
  });

  it('clamps to 0..1 and never returns NaN for degenerate boxes', () => {
    expect(scrollProgressFor({ top: 10_000, height: 0 }, VH)).toBe(0);
    expect(scrollProgressFor({ top: -10_000, height: 0 }, VH)).toBe(1);
    expect(Number.isNaN(scrollProgressFor({ top: 0, height: 0 }, 0))).toBe(false);
  });
});

describe('scrollProgressFor travel anchor — a host the reader scrolls TO must scrub', () => {
  /**
   * THE ROUND-3 DISPUTE, SETTLED. The load rule (`top >= 0 -> 0`) was correct for the
   * 100vh hero and WRONG for every host below the first: such a host sat at progress 0
   * for its entire approach, so its dolly only played while it was leaving the screen.
   * Fable judged that a new defect; GLM judged the fix CORRECT. Both numbers below were
   * produced under the load rule and were 0 — the second is the "readable life" case.
   */
  const VH = 900;

  it('is 0 on entry at the viewport bottom and 1 at full exit', () => {
    const at = (top: number) => scrollProgressFor({ top, height: 400 }, VH, 'travel');
    expect(at(VH)).toBe(0);            // top edge at viewport bottom: readable life begins
    expect(at(-400)).toBe(1);          // bottom edge at viewport top: readable life over
  });

  it('is genuinely positive while the band is fully on screen (the Fable regression)', () => {
    // A 400px band whose top is halfway up the viewport is FULLY readable, yet under
    // the load rule its progress was still 0 — the dolly did nothing while it was read.
    const mid = scrollProgressFor({ top: VH / 2, height: 400 }, VH, 'travel');
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });

  it('monotonically spans the whole readable life, then clamps', () => {
    const at = (top: number) => scrollProgressFor({ top, height: 400 }, VH, 'travel');
    const samples = [VH * 2, VH, VH * 0.5, 0, -200, -400, -2000].map(at);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it('leaves the load anchor untouched — the served hero still opens on its authored pose', () => {
    // Regression guard on the OTHER direction: the travel fix must not reintroduce
    // the round-2 bug where a hero at rect.top = 0 loaded mid-dolly.
    expect(scrollProgressFor({ top: 0, height: VH }, VH, 'load')).toBe(0);
    expect(scrollProgressFor({ top: -VH / 2, height: VH }, VH, 'load')).toBeCloseTo(0.5, 5);
  });
});

describe('scrollAnchorFor — document-offset classification', () => {
  it('classifies a host at the document top as load-anchored', () => {
    expect(scrollAnchorFor(0)).toBe('load');
    expect(scrollAnchorFor(LOAD_ANCHOR_EPSILON_PX)).toBe('load');
    expect(scrollAnchorFor(-LOAD_ANCHOR_EPSILON_PX)).toBe('load');
  });

  it('classifies anything genuinely below the first fold as travel-anchored', () => {
    expect(scrollAnchorFor(LOAD_ANCHOR_EPSILON_PX + 1)).toBe('travel');
    expect(scrollAnchorFor(4_000)).toBe('travel');
  });

  it('never returns NaN-bearing output for garbage input', () => {
    expect(scrollAnchorFor(Number.NaN)).toBe('load'); // fails toward the authored-hero pose
  });
});

describe('pointerFor — normalized and finite for tiny boxes', () => {
  it('maps the box centre to (0,0) and corners to +/-1', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 };
    expect(pointerFor(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(pointerFor(0, 0, rect)).toEqual({ x: -1, y: -1 });
    expect(pointerFor(200, 100, rect)).toEqual({ x: 1, y: 1 });
  });

  it('does not divide by zero for a zero-area box', () => {
    const p = pointerFor(5, 5, { left: 0, top: 0, width: 0, height: 0 });
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });
});

describe('tokenCssVars — the static literal must not drift from the token table', () => {
  /**
   * ROUND-4 GUARD. tokenCssVars() is a static string because the token-registry gate
   * reads source and cannot see through runtime .map() indirection. A static string
   * next to a table can silently diverge — this test is the tripwire: every table
   * entry must appear verbatim in the literal, and the two house aliases the styled
   * layer reads must stay declared.
   */
  it('carries every TOKEN_FALLBACKS entry verbatim', () => {
    const css = tokenCssVars();
    for (const [name, { cssVar, hex }] of Object.entries(TOKEN_FALLBACKS_FOR_TEST)) {
      expect(css).toContain(`${cssVar}: ${hex};`);
      expect(TOKEN_NAMES).toContain(name);
    }
  });

  it('declares the styled-layer house aliases', () => {
    const css = tokenCssVars();
    expect(css).toContain('--obsidian: #0A0A0F;');
    expect(css).toContain('--card-dark: #141419;');
  });
});

describe('renderSlots — the context budget is a real pool, not a number on a page', () => {
  beforeEach(() => __resetSlots());

  it('caps acquisitions at MAX_LIVE_WORLDS and refuses beyond it', () => {
    for (let i = 0; i < MAX_LIVE_WORLDS; i += 1) expect(acquireSlot()).toBe(true);
    expect(acquireSlot()).toBe(false);
    expect(slotStats()).toEqual({ inUse: MAX_LIVE_WORLDS, cap: MAX_LIVE_WORLDS });
  });

  it('hands a released slot to a waiter (the hand-off primitive)', () => {
    for (let i = 0; i < MAX_LIVE_WORLDS; i += 1) acquireSlot();
    expect(acquireSlot()).toBe(false);
    let woken = false;
    onSlotFreed(() => { woken = true; });
    releaseSlot();
    expect(woken).toBe(true);
    expect(acquireSlot()).toBe(true);
  });

  it('never counts below zero and unsubscribes cleanly', () => {
    releaseSlot();
    expect(slotStats().inUse).toBe(0);
    const unsub = onSlotFreed(() => { throw new Error('must not be called'); });
    unsub();
    releaseSlot();
    expect(slotStats().inUse).toBe(0);
  });
});
