/**
 * Brand kits — the studio rendering for a site that is not SwanStudios.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. A typo'd kit id silently rendering under someone else's art direction.
 *   2. The default kit's own words being refused by the brand's own laws — which
 *      is exactly what the first draft did, and the reason there is a test named
 *      after gold below.
 *   3. `universal` (any non-Swan site) being judged by SwanStudios' brand laws.
 *   4. A brand kit and a workspace id being conflated again. They are two fields:
 *      art direction is a curated allowlist, filing is free text.
 *   5. Kit language counting against the operator's brief-length budget.
 */

import { describe, it, expect } from 'vitest';
import { resolveBrandKit, applyBrandKit, brandKitView, listBrandKits, BrandKitError } from '../../../shared/brandKits/registry.mjs';
import { BRAND_KITS, DEFAULT_BRAND_KIT } from '../../../shared/brandKits/catalogue.mjs';
import { composeStills, MAX_BRIEF_CHARS } from '../../services/atelier/composeStills.mjs';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { _resetBatches } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight } from '../../services/atelier/localStillLane.mjs';
import { LAW_PROFILES } from '../../services/atelier/promptSources.mjs';

const MODEL = 'openai/gpt-5.4-image-2';
const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };

/** Captures the prompt that actually reached the provider. */
function capturingDeps(over = {}) {
  const seen = [];
  return {
    seen,
    deps: {
      env: {}, verifier: () => ({ ok: true, model: MODEL, problems: [] }),
      generator: async (compiled) => { seen.push(compiled.promptText || ''); return { images: ['b64'], usage: {} }; },
      persist: async () => ({ ok: false, persisted: 0, code: 'E_STORAGE_UNCONFIGURED' }),
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false },
      commit: () => ({ allowed: true }),   // hosted lane spends; the gate is now explicit
      ...over,
    },
  };
}

describe('picking a brand kit', () => {
  it('defaults to SwanStudios when none is named — the single-site case stays one field shorter', () => {
    expect(resolveBrandKit(undefined).brandKit).toBe(DEFAULT_BRAND_KIT);
    expect(resolveBrandKit(null).brandKit).toBe(DEFAULT_BRAND_KIT);
    expect(resolveBrandKit('').brandKit).toBe(DEFAULT_BRAND_KIT);
  });

  it('REFUSES an unknown id instead of falling back — a typo must not render under the wrong brand', () => {
    let err;
    try { resolveBrandKit('swanstudio'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(BrandKitError);
    expect(err.code).toBe('E_UNKNOWN_BRAND_KIT');
    expect(err.message).toMatch(/Known brand kits: swanstudios, universal/);
    expect(err.message).toMatch(/[Nn]othing was generated/);
  });

  it('lists kits for a picker without leaking the art direction itself', () => {
    const list = listBrandKits();
    expect(list.map((k) => k.id)).toEqual(['swanstudios', 'universal']);
    expect(list.find((k) => k.isDefault).id).toBe('swanstudios');
    // The prompt material is server-side, for the same reason a compiled prompt is.
    for (const k of list) {
      expect(k.styleAnchors).toBeUndefined();
      expect(k.paletteWords).toBeUndefined();
    }
  });

  it("the client's view carries which law profile applied and whether it was overridden", () => {
    const plain = brandKitView(resolveBrandKit('swanstudios'));
    expect(plain).toMatchObject({ id: 'swanstudios', lawProfile: 'full', lawProfileOverridden: false });
    const forced = brandKitView(resolveBrandKit('swanstudios', { lawProfile: 'universal' }));
    // The caller's explicit choice wins, and the record says so — "why did this ignore the
    // gold rule" is answerable from the asset rather than from memory.
    expect(forced).toMatchObject({ lawProfile: 'universal', lawProfileFromKit: 'full', lawProfileOverridden: true });
  });
});

describe('what a kit does to a brief', () => {
  it('leads with the operator words and follows with the brand language', () => {
    const out = applyBrandKit('a glacier at dawn', resolveBrandKit('swanstudios'));
    expect(out.indexOf('a glacier at dawn')).toBe(0);
    expect(out).toMatch(/midnight sapphire/);
    expect(out).toMatch(/cinematic/);
  });

  it('leaves the brief untouched under `universal` — another site is not dressed as Swan', () => {
    const kit = resolveBrandKit('universal');
    expect(applyBrandKit('a glacier at dawn', kit)).toBe('a glacier at dawn');
    expect(kit.lawProfile).toBe('universal');
  });

  it("NEVER injects gold — the kit's own words must survive the brand's own laws", () => {
    // The first draft listed "gilded fern gold used sparingly", which is true of the CSS
    // palette and false of art direction: LAW2 permits gold in four UI places, none of
    // which is a subject in a generated image. Every brief was refused. The law was right.
    const words = BRAND_KITS.swanstudios.paletteWords.join(' ') + ' ' + BRAND_KITS.swanstudios.styleAnchors.join(' ');
    expect(words).not.toMatch(/gold|gilded/i);
  });
});

describe('through the real orchestrator', () => {
  it('the default kit reaches the provider AND survives the law filter', async () => {
    const { seen, deps } = capturingDeps();
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 }, deps);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/glacier/);
    // The point of the test: the KIT reached the model, not just the brief. Checking only
    // for "glacier" would pass with no kit applied at all.
    expect(seen[0]).toMatch(/midnight sapphire/);
    expect(seen[0]).toMatch(/crystalline refraction|enchanted forest/);
  });

  it('an unknown kit is refused before anything is generated or spent', async () => {
    const { seen, deps } = capturingDeps();
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'nope' }, deps).catch((e) => e);
    expect(err.code).toBe('E_UNKNOWN_BRAND_KIT');
    expect(seen).toHaveLength(0);
  });

  it('the result reports which kit rendered it', async () => {
    const { deps } = capturingDeps();
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'universal' }, deps);
    expect(out.brandKit).toMatchObject({ id: 'universal', lawProfile: 'universal' });
  });

  it('a workspace id is still FREE TEXT and is not a brand kit — two fields, two meanings', async () => {
    const { deps } = capturingDeps();
    // `ws-1` is not a kit and is never resolved as one; it files the asset, nothing more.
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, workspaceId: 'ws-1', brandKit: 'universal' }, deps);
    expect(out.brandKit.id).toBe('universal');
  });

  it('naming a WORKSPACE without a brand kit is REFUSED, not defaulted', async () => {
    // RE-ANCHOR, from the panel: three seats independently made the same point — if
    // omission defaults to SwanStudios, then a caller who files an asset under another
    // project silently gets Swan art direction, and the original bug is now the documented
    // behaviour. Ambiguity is refused instead of guessed.
    const { seen, deps } = capturingDeps();
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, workspaceId: 'ws-1' }, deps).catch((e) => e);
    expect(err.code).toBe('E_BRAND_KIT_REQUIRED');
    expect(err.message).toMatch(/swanstudios, universal/);
    expect(seen).toHaveLength(0);
  });

  it('omitting BOTH is still fine — the single-site case has no ambiguity to resolve', async () => {
    const { deps } = capturingDeps();
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 }, deps);
    expect(out.brandKit.id).toBe('swanstudios');
  });

  it('the TASTE corpus is Swan-rated, so a non-Swan kit is refused rather than dressed in it', async () => {
    // Unanimous across all six seats. The corpus behind the taste brain is Sean's
    // Swan-rated library; there is no version of it that belongs to another brand, so
    // silently using it for one is a brand-scope leak.
    const { seen, deps } = capturingDeps();
    const err = await composeStills({ brief: BRIEF, promptSource: 'taste', lane: 'local', count: 1, userId: 1, brandKit: 'universal' }, deps).catch((e) => e);
    expect(err.code).toBe('E_TASTE_IS_SWAN_ONLY');
    expect(err.message).toMatch(/brief source/);
    expect(seen).toHaveLength(0);
  });

  it("a non-Swan kit REPLACES the compiler's Swan kill-list, and Swan keeps its own", async () => {
    // Dropping Swan's LAWS was only half of "render for another site". The compiler injects
    // a hardcoded negative slot whose own comment says those bans "are most of what
    // separates Swan output" — including literal creature form, the swan-is-never-a-bird
    // rule. Another site was still forbidden from drawing an animal.
    const briefs = [];
    const spyCompiler = (brief) => { briefs.push(brief); return { promptText: `${brief.text} [compiled]` }; };

    const a = capturingDeps({ compiler: spyCompiler });
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'universal' }, a.deps);
    expect(briefs[0].slotOverrides.negative).toBe('watermark, text artifacts');
    expect(briefs[0].slotOverrides.negative).not.toMatch(/creature|glassmorphism|wallpaper/);

    const b = capturingDeps({ compiler: spyCompiler });
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'swanstudios' }, b.deps);
    // Swan sets no override, so the compiler's own kill-list stands.
    expect(briefs[1].slotOverrides.negative).toBeUndefined();
  });

  it("an explicit caller slotOverride still beats the kit, same as lawProfile", async () => {
    const briefs = [];
    const spyCompiler = (brief) => { briefs.push(brief); return { promptText: `${brief.text} [compiled]` }; };
    const d = capturingDeps({ compiler: spyCompiler });
    await composeStills({
      brief: { ...BRIEF, slotOverrides: { negative: 'only what I said' } },
      lane: 'hosted', count: 1, userId: 1, brandKit: 'universal',
    }, d.deps);
    expect(briefs[0].slotOverrides.negative).toBe('only what I said');
  });

  it('kit language does not count against the operator’s brief-length budget', async () => {
    const { seen, deps } = capturingDeps();
    // A brief at the limit still passes, even though the kit appends more words after it.
    const atLimit = 'a'.repeat(MAX_BRIEF_CHARS);
    await composeStills({ brief: { ...BRIEF, text: atLimit }, lane: 'hosted', count: 1, userId: 1 }, deps);
    expect(seen[0].length).toBeGreaterThan(MAX_BRIEF_CHARS);
  });
});

describe('the promise of the slice, compiled for real', () => {
  const caps = { provider: 'test', promptStyle: 'sentence', honorsNegativePrompt: 'verified', maxPromptChars: 4000 };
  const fox = { text: 'a lone red fox crossing a snowfield at dusk', intent: 'hero', aspect: '16:9' };
  const briefFor = (id) => {
    const kit = resolveBrandKit(id);
    return {
      ...fox,
      text: applyBrandKit(fox.text, kit),
      slotOverrides: kit.negativeSlot ? { negative: kit.negativeSlot } : {},
      lawProfileDrop: LAW_PROFILES[kit.lawProfile] || [],
    };
  };

  it('SwanStudios still refuses a creature — LAW4 protects the Swan mark', () => {
    let err;
    try { compileImage(briefFor('swanstudios'), caps); } catch (e) { err = e; }
    expect(err?.code).toBe('E_LAW_VIOLATION');
    expect(err.message).toMatch(/LAW4-optics-not-creatures/);
  });

  it('a NON-Swan site can render that same creature, with no Swan language in the output', () => {
    // This is the whole slice in one assertion. Before it, `universal` dropped Swan's laws
    // on the taste path and nowhere else, so the compiler refused this brief for every
    // brand — a studio that could not draw a fox for a site that is not SwanStudios.
    const out = compileImage(briefFor('universal'), caps);
    const text = `${out.promptText || ''} ${out.negativeText || ''}`;
    expect(text).toMatch(/fox/);
    expect(text).not.toMatch(/sapphire|ice.wing|crystalline|frost|obsidian|enchanted/i);
    // ...and none of the Swan kill-list rides along either.
    expect(text).not.toMatch(/creature form|glassmorphism|fantasy wallpaper/i);
  });

  it('an empty drop-list is the ORIGINAL behaviour exactly — every existing caller is untouched', () => {
    let a; let b;
    try { compileImage({ ...fox }, caps); } catch (e) { a = e.code; }
    try { compileImage({ ...fox, lawProfileDrop: [] }, caps); } catch (e) { b = e.code; }
    expect(a).toBe('E_LAW_VIOLATION');
    expect(b).toBe(a);
  });
});

describe('what the asset remembers about its brand', () => {
  it('records the kit AND its content hash on the row', async () => {
    // Ox: a kit recorded only on the ephemeral response answers nothing later.
    // GLM: a kit LABEL without a version points at whatever that name means today.
    const rows = [];
    const persist = async ({ stills, brandKit }) => { rows.push(brandKit); stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: stills.length, total: stills.length }; };
    const { deps } = capturingDeps({ persist });
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'universal' }, deps);
    expect(rows[0]).toMatchObject({ id: 'universal', lawProfile: 'universal' });
    expect(rows[0].kitHash).toMatch(/^[0-9a-f]{12}$/);
  });

  it('the hash CHANGES when the art direction changes — that is the whole point of carrying it', () => {
    const a = resolveBrandKit('swanstudios').kitHash;
    const b = resolveBrandKit('universal').kitHash;
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });

  it('an overridden law profile is recorded on the asset, not just in the response', async () => {
    const rows = [];
    const persist = async ({ stills, brandKit }) => { rows.push(brandKit); stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: 1, total: 1 }; };
    const { deps } = capturingDeps({ persist });
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, brandKit: 'swanstudios', lawProfile: 'universal' }, deps);
    expect(rows[0]).toMatchObject({ lawProfileOverridden: true, lawProfile: 'universal', lawProfileFromKit: 'full' });
  });
});
