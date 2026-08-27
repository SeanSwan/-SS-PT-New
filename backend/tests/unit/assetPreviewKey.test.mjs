/**
 * previewKeyFor — the one rule that decides which object a card shows.
 *
 * Tested directly, and not only through `listAssets`, because the rule is the thing that
 * has to survive. The dominant defect class in this subsystem is a rule applied to one
 * half of a pair; the defence is that the rule exists once, so it needs a test that fails
 * when someone splits it back into an image branch and a video branch.
 */

import { describe, it, expect } from 'vitest';
import { previewKeyFor, keyBelongsTo } from '../../services/atelier/assetPreviews.mjs';

// Realistic keys. Every key this codebase writes carries the owner as a path segment, and
// the signer now requires it — so fixtures that omitted it were describing a row that
// cannot exist and quietly exercising a path production never takes.
const OWNER = 7;
const A_PNG = `atelier/stills/${OWNER}/abc.png`;
const A_THUMB = `atelier/stills/${OWNER}/thumbs/abc.webp`;
const A_MP4 = `jobs/${OWNER}/source.mp4`;
const A_MP3 = `atelier/audio/${OWNER}/take.mp3`;
const A_BIN = `atelier/x/${OWNER}/a.bin`;
const A_POSTER = `atelier/video/${OWNER}/poster.webp`;

describe('the poster always wins when there is one', () => {
  it('prefers the poster over the original for an image', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: A_PNG, posterR2Key: A_THUMB })).toBe(A_THUMB);
  });

  it('prefers the poster for a video', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'video', r2Key: A_MP4, posterR2Key: A_POSTER })).toBe(A_POSTER);
  });

  it('prefers the poster for a kind nobody planned for', () => {
    // The rule is stated once, so it answers for kinds that did not exist when it was
    // written. A pair of branches would have needed a third.
    expect(previewKeyFor({ ownerUserId: 7, kind: 'hologram', r2Key: A_BIN, posterR2Key: A_POSTER })).toBe(A_POSTER);
  });
});

describe('the fallback is conditional on the original being a picture', () => {
  it('falls back to the original for an image', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: A_PNG, posterR2Key: null })).toBe(A_PNG);
  });

  it('does NOT fall back to the video file', () => {
    // Signing this would put an MP4 in an <img>.
    expect(previewKeyFor({ ownerUserId: 7, kind: 'video', r2Key: A_MP4, posterR2Key: null })).toBeNull();
  });

  it('does NOT fall back to the audio file', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'audio', r2Key: A_MP3, posterR2Key: null })).toBeNull();
  });

  it('does not fall back for an unknown kind either — the allowlist is the picture claim', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'hologram', r2Key: A_BIN, posterR2Key: null })).toBeNull();
  });
});

describe('nothing showable is null, never an error', () => {
  it('an image row with no key at all yields null rather than an empty string', () => {
    // `''` is falsy but would still be SIGNED if this returned it — a signature over the
    // bucket root. Null is the only safe absence.
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: '', posterR2Key: null })).toBeNull();
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: null, posterR2Key: null })).toBeNull();
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

describe('signing is a capability, so a key must belong to the row that carries it', () => {
  // posterR2Key on a video row is written by NOTHING in this repository. It arrives as
  // `...meta` spread from the body of POST /api/render-agents/jobs/:jobId/complete into
  // completeJob's rest parameter and on into MediaAsset defaults, unvalidated —
  // verifyObject checks r2Key only. generateThumbnailUrl presigns any key it is handed.
  // Before this slice that was inert, because non-image rows were never signed. Signing a
  // video's poster is exactly what would turn it into a presign-anything oracle rendered
  // into the operator's own page.
  const FOREIGN = 'atelier/stills/99/thumbs/deadbeef.webp';

  it('refuses a poster pointing at another owner, on a row the actor legitimately owns', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'video', r2Key: A_MP4, posterR2Key: FOREIGN })).toBeNull();
  });

  it('refuses it on an image row too, rather than falling back into signing it', () => {
    // The fallback must reach the OWNER'S original, never the planted key.
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: A_PNG, posterR2Key: FOREIGN })).toBe(A_PNG);
  });

  it('refuses an original that does not belong to the row either', () => {
    expect(previewKeyFor({ ownerUserId: 7, kind: 'image', r2Key: 'atelier/stills/99/x.png', posterR2Key: null })).toBeNull();
  });

  it('a row with no owner signs nothing, rather than defaulting open', () => {
    expect(previewKeyFor({ kind: 'image', r2Key: A_PNG, posterR2Key: A_THUMB })).toBeNull();
  });

  it('matches on a whole path segment, not a substring', () => {
    // Owner 7 must not be satisfied by owner 77's key, which contains "7".
    expect(keyBelongsTo('atelier/stills/77/x.png', 7)).toBe(false);
    expect(keyBelongsTo('atelier/stills/7/x.png', 7)).toBe(true);
    // Nor by the digit appearing inside a hash.
    expect(keyBelongsTo('atelier/stills/99/thumbs/7abc.webp', 7)).toBe(false);
  });

  it('a numeric owner matches its string segment', () => {
    expect(keyBelongsTo('atelier/stills/7/x.png', '7')).toBe(true);
  });
});
