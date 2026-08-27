/**
 * previewKeyFor — the one rule that decides which object a card shows.
 *
 * Tested directly, and not only through `listAssets`, because the rule is the thing that
 * has to survive. The dominant defect class in this subsystem is a rule applied to one
 * half of a pair; the defence is that the rule exists once, so it needs a test that fails
 * when someone splits it back into an image branch and a video branch.
 */

import { describe, it, expect } from 'vitest';
import { previewKeyFor } from '../../services/atelier/assetPreviews.mjs';

describe('the poster always wins when there is one', () => {
  it('prefers the poster over the original for an image', () => {
    expect(previewKeyFor({ kind: 'image', r2Key: 'a.png', posterR2Key: 't.webp' })).toBe('t.webp');
  });

  it('prefers the poster for a video', () => {
    expect(previewKeyFor({ kind: 'video', r2Key: 'a.mp4', posterR2Key: 'p.webp' })).toBe('p.webp');
  });

  it('prefers the poster for a kind nobody planned for', () => {
    // The rule is stated once, so it answers for kinds that did not exist when it was
    // written. A pair of branches would have needed a third.
    expect(previewKeyFor({ kind: 'hologram', r2Key: 'a.bin', posterR2Key: 'p.webp' })).toBe('p.webp');
  });
});

describe('the fallback is conditional on the original being a picture', () => {
  it('falls back to the original for an image', () => {
    expect(previewKeyFor({ kind: 'image', r2Key: 'a.png', posterR2Key: null })).toBe('a.png');
  });

  it('does NOT fall back to the video file', () => {
    // Signing this would put an MP4 in an <img>.
    expect(previewKeyFor({ kind: 'video', r2Key: 'a.mp4', posterR2Key: null })).toBeNull();
  });

  it('does NOT fall back to the audio file', () => {
    expect(previewKeyFor({ kind: 'audio', r2Key: 'a.mp3', posterR2Key: null })).toBeNull();
  });

  it('does not fall back for an unknown kind either — the allowlist is the picture claim', () => {
    expect(previewKeyFor({ kind: 'hologram', r2Key: 'a.bin', posterR2Key: null })).toBeNull();
  });
});

describe('nothing showable is null, never an error', () => {
  it('an image row with no key at all yields null rather than an empty string', () => {
    // `''` is falsy but would still be SIGNED if this returned it — a signature over the
    // bucket root. Null is the only safe absence.
    expect(previewKeyFor({ kind: 'image', r2Key: '', posterR2Key: null })).toBeNull();
    expect(previewKeyFor({ kind: 'image', r2Key: null, posterR2Key: null })).toBeNull();
  });

  it('an empty row does not throw', () => {
    expect(previewKeyFor({})).toBeNull();
    expect(previewKeyFor()).toBeNull();
  });
});

describe('the "never an error" promise covers the shapes it claims', () => {
  it('a null row returns null instead of throwing', () => {
    // A default parameter fires on `undefined` ONLY, so `previewKeyFor(null)` dereferenced
    // null and threw a TypeError while the docstring above it promised "never an error".
    // The old test asserted `{}` and `undefined` and called that coverage — a test that
    // passes without touching the case its name implies.
    expect(previewKeyFor(null)).toBeNull();
  });
});
