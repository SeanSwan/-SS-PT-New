/**
 * The coalescing IDENTITY — what makes two requests the same request.
 *
 * Split from composeGuardsRefusals at the 300-line cap. Every case here is a field that
 * was missing from `deriveKey` when a later feature added it, and each one meant two
 * different requests sharing one result. They are grouped because the failure is always
 * the same: a feature landed and nobody came back to the key.
 */

import { describe, it, expect } from 'vitest';

describe('the coalescing identity must include everything that changes the output', () => {
  it('brandKit, lawProfile, cinematic and mode all change the key', async () => {
    // brandKit is the one that mattered: it arrived a slice after the key was written and
    // nobody came back, so the SAME brief under swanstudios and under universal derived
    // the SAME key — and the second request silently received the first's
    // differently-branded images. A key that ignores an input is not an identity.
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const base = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7 };
    const now = Date.now();
    const pairs = [
      ['brandKit', { brandKit: 'swanstudios' }, { brandKit: 'universal' }],
      ['lawProfile', { lawProfile: 'full' }, { lawProfile: 'universal' }],
      ['cinematic', { cinematic: true }, { cinematic: false }],
      ['mode', { mode: 'a' }, { mode: 'b' }],
    ];
    for (const [label, a, b] of pairs) {
      expect(deriveKey({ ...base, ...a }, now), `${label} did not change the key`)
        .not.toBe(deriveKey({ ...base, ...b }, now));
    }
  });

  it('and an identical request still coalesces with itself', async () => {
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const req = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7, brandKit: 'swanstudios' };
    const now = Date.now();
    expect(deriveKey(req, now)).toBe(deriveKey(req, now));
  });
});

describe('the identity, one round later', () => {
  it('includes the top-level aspect and the slot overrides', async () => {
    // Found one round after brandKit, in the same file that had just declared "every
    // field that changes the output belongs in the identity". The top-level aspect
    // overrides the brief's, and slot overrides replace compiler slots outright.
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const base = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7 };
    const now = Date.now();
    expect(deriveKey({ ...base, aspect: '16:9' }, now)).not.toBe(deriveKey({ ...base, aspect: '1:1' }, now));
    expect(deriveKey({ ...base, brief: { ...base.brief, slotOverrides: { negative: 'a' } } }, now))
      .not.toBe(deriveKey({ ...base, brief: { ...base.brief, slotOverrides: { negative: 'b' } } }, now));
  });
});

describe('slot overrides are a channel past the brief length gate', () => {
  it('refuses an oversized override', async () => {
    // MAX_BRIEF_CHARS guards brief.text and NOTHING ELSE, so slotOverrides was an
    // unbounded channel straight past it into the compiler and out to a provider. A
    // reviewer found it by asking the question the length gate never asked: what else
    // reaches the compiler?
    const { assertSlotOverrides, MAX_SLOT_OVERRIDE_CHARS } = await import('../../services/atelier/composeGuards.mjs');
    let err;
    try { assertSlotOverrides({ slotOverrides: { negative: 'x'.repeat(MAX_SLOT_OVERRIDE_CHARS + 1) } }); } catch (e) { err = e; }
    expect(err?.code).toBe('E_BAD_SLOT_OVERRIDE');
    expect(err.message).toMatch(/characters/);
  });

  it('refuses too many slots, and non-text values', async () => {
    const { assertSlotOverrides, MAX_SLOT_OVERRIDES } = await import('../../services/atelier/composeGuards.mjs');
    const many = Object.fromEntries(Array.from({ length: MAX_SLOT_OVERRIDES + 1 }, (_, i) => [`s${i}`, 'x']));
    expect(() => assertSlotOverrides({ slotOverrides: many })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
    expect(() => assertSlotOverrides({ slotOverrides: { negative: 42 } })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
    expect(() => assertSlotOverrides({ slotOverrides: ['a'] })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
  });

  it('NORMALISES the values, so NFC and NFD spellings are one request', async () => {
    // The brief gets normalised and the overrides did not, so the same word in two
    // encodings produced two different prompts — and, once the key hashed them, two
    // different keys for one intent.
    const { assertSlotOverrides } = await import('../../services/atelier/composeGuards.mjs');
    const nfc = assertSlotOverrides({ slotOverrides: { negative: 'caf\u00e9' } });
    const nfd = assertSlotOverrides({ slotOverrides: { negative: 'cafe\u0301' } });
    expect(nfc.negative).toBe(nfd.negative);
  });

  it('passes an absent or empty override through untouched', async () => {
    const { assertSlotOverrides } = await import('../../services/atelier/composeGuards.mjs');
    expect(assertSlotOverrides({})).toBeUndefined();
    expect(assertSlotOverrides({ slotOverrides: {} })).toEqual({});
  });
});
