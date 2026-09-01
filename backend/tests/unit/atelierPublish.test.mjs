/**
 * Publish rung — the gates the provenance record was built to answer.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. draft → published in one step (nobody looked).
 *   2. Publishing over an unconfirmed consent flag — the record's whole reason to exist.
 *   3. Publishing an asset whose licence requires attribution with none recorded.
 *   4. Publishing a non-commercial-terms render to a commercial site.
 *   5. A "copy link" that hands out a read URL for an unpublished asset.
 */

import { describe, it, expect } from 'vitest';
import { transitionAsset, publishedReference, publishBlockers, resolvePublic, TRANSITIONS, PublishError, PUBLIC_PATH } from '../../services/atelier/publishAsset.mjs';

const prov = (over = {}) => ({
  provider: 'comfyui/wan-2.2', attribution: 'Video generated with Wan 2.2',
  licence: { name: 'Apache License 2.0', requiresAttribution: false, commercialUse: 'permitted', usedCommercially: true, grantRecorded: false },
  artifact: { sha256: 'ab'.repeat(32) }, policyFlags: [], ...over,
});
function model(row) {
  const state = { ...row };
  return {
    state,
    findOne: async ({ where }) => (where.id === state.id && where.ownerUserId === state.ownerUserId
      ? { ...state, update: async (patch) => { Object.assign(state, patch); } } : null),
  };
}
const base = (over = {}) => ({ id: 'a1', ownerUserId: 1, approvalStatus: 'draft', r2Key: 'atelier/stills/1/x.png', mime: 'image/png', width: 1024, height: 576, provenance: prov(), ...over });
const deps = (m) => ({ assetModel: m, readUrl: async (k) => `https://r2/${k}?sig`, now: () => new Date('2026-08-25T00:00:00Z') });
const DECL = { consentConfirmed: true, intendedUse: 'commercial' };

describe('transitions are steps, not jumps', () => {
  it('draft → approved → published, and back down', async () => {
    const m = model(base());
    expect((await transitionAsset({ id: 'a1', userId: 1, to: 'approved' }, deps(m))).to).toBe('approved');
    expect((await transitionAsset({ id: 'a1', userId: 1, to: 'published', declaration: DECL }, deps(m))).to).toBe('published');
    expect(m.state.approvalStatus).toBe('published');
    expect((await transitionAsset({ id: 'a1', userId: 1, to: 'approved' }, deps(m))).to).toBe('approved');
    expect((await transitionAsset({ id: 'a1', userId: 1, to: 'draft' }, deps(m))).to).toBe('draft');
  });
  it('refuses draft → published and says why', async () => {
    const err = await transitionAsset({ id: 'a1', userId: 1, to: 'published', declaration: DECL }, deps(model(base()))).catch((e) => e);
    expect(err).toBeInstanceOf(PublishError);
    expect(err.code).toBe('E_BAD_TRANSITION');
    expect(err.message).toMatch(/nobody has looked/i);
  });
  it('is a no-op for same-status, and owner-scoped', async () => {
    expect((await transitionAsset({ id: 'a1', userId: 1, to: 'draft' }, deps(model(base())))).changed).toBe(false);
    await expect(transitionAsset({ id: 'a1', userId: 2, to: 'approved' }, deps(model(base())))).rejects.toMatchObject({ code: 'E_ASSET_NOT_FOUND' });
  });
  it('the transition table has no draft→published edge', () => {
    expect(TRANSITIONS.draft).not.toContain('published');
  });
});

describe('the publish gates read the frozen record', () => {
  it('refuses to publish without a declaration; a declaration confirms every flag with who and when', async () => {
    const m = model(base({ approvalStatus: 'approved', provenance: prov({ policyFlags: [{ rule: 'no-identifiable-people', detail: 'face visible', consentConfirmed: false }] }) }));
    // With NO declaration the refusal is the declaration itself, before any flag is read.
    const noDecl = await transitionAsset({ id: 'a1', userId: 1, to: 'published' }, deps(m)).catch((e) => e);
    expect(noDecl.code).toBe('E_PUBLISH_DECLARATION_REQUIRED');
    // With a declaration, the human confirmed every flag — the record now says who and when.
    const out = await transitionAsset({ id: 'a1', userId: 1, to: 'published', declaration: DECL }, deps(m));
    expect(out.to).toBe('published');
    const flags = m.state.provenance.policyFlags;
    expect(flags.every((f) => f.consentConfirmed === true && f.confirmedBy === 1 && f.confirmedAt)).toBe(true);
    expect(flags.some((f) => f.rule === 'publish-declaration' && /intendedUse=commercial/.test(f.detail))).toBe(true);
  });
  it('refuses when attribution is required and missing', () => {
    const b = publishBlockers(base({ provenance: prov({ attribution: null, licence: { name: 'MiniMax H3 Model Licence', requiresAttribution: true, commercialUse: 'requires-grant', usedCommercially: false, grantRecorded: false } }) }));
    expect(b.some((x) => x.startsWith('E_ATTRIBUTION_MISSING'))).toBe(true);
  });
  it('refuses a commercial publish of a grant-required model run with no grant — and names the distinction', () => {
    const b = publishBlockers(base({ provenance: prov({ licence: { name: 'MiniMax H3 Model Licence', requiresAttribution: true, commercialUse: 'requires-grant', usedCommercially: true, grantRecorded: false } }) }));
    const hit = b.find((x) => x.startsWith('E_LICENCE_GRANT_REQUIRED'));
    expect(hit).toBeTruthy();
    expect(hit).toMatch(/running the model, not owning the output/);
  });
  it('a COMMERCIAL declaration on a grant-required run with no grant is still refused — the licence decides', async () => {
    const m = model(base({ approvalStatus: 'approved', provenance: prov({ licence: { name: 'MiniMax H3 Model Licence', requiresAttribution: true, commercialUse: 'requires-grant', usedCommercially: false, grantRecorded: false } }) }));
    const err = await transitionAsset({ id: 'a1', userId: 1, to: 'published', declaration: DECL }, deps(m)).catch((e) => e);
    expect(err.code).toBe('E_PUBLISH_BLOCKED');
    expect(err.blockers.some((b) => b.startsWith('E_LICENCE_GRANT_REQUIRED'))).toBe(true);
    expect(m.state.approvalStatus).toBe('approved');
  });

  it('a PERSONAL declaration on the same run is allowed — non-commercial local use needs no grant', async () => {
    const m = model(base({ approvalStatus: 'approved', provenance: prov({ licence: { name: 'MiniMax H3 Model Licence', requiresAttribution: true, commercialUse: 'requires-grant', usedCommercially: false, grantRecorded: false } }) }));
    const out = await transitionAsset({ id: 'a1', userId: 1, to: 'published', declaration: { consentConfirmed: true, intendedUse: 'personal' } }, deps(m));
    expect(out.to).toBe('published');
  });

  it('an asset with no provenance cannot be published', () => {
    expect(publishBlockers(base({ provenance: null }))[0]).toContain('E_NO_PROVENANCE');
  });
  it('a clean Apache asset has no blockers', () => {
    expect(publishBlockers(base())).toEqual([]);
  });
});

describe('the site reference', () => {
  it('withholds the read URL and snippet until published', async () => {
    const r = await publishedReference({ id: 'a1', userId: 1 }, deps(model(base({ approvalStatus: 'approved' }))));
    expect(r.readUrl).toBeNull();
    expect(r.snippet).toBeNull();
    expect(r.withheld).toContain('approved');
  });
  it('the snippet points at the STABLE permalink, never the expiring signed URL', async () => {
    const r = await publishedReference({ id: 'a1', userId: 1, publicBase: 'https://sswanstudios.com' }, deps(model(base({ approvalStatus: 'published' }))));
    expect(r.readUrl).toContain('?sig');                       // preview only
    expect(r.permalink).toBe(`https://sswanstudios.com${PUBLIC_PATH}/a1`);
    expect(r.snippet).toContain(`src="${r.permalink}"`);
    expect(r.snippet).not.toContain('?sig');
    expect(r.snippet).toContain('width="1024"');
    expect(r.snippet).toContain('Video generated with Wan 2.2');
  });

  it('the public resolver answers only for a PUBLISHED asset, so Unpublish revokes on the next request', async () => {
    const m = model(base({ approvalStatus: 'published' }));
    const d = { assetModel: { findOne: async ({ where }) => (where.approvalStatus === 'published' && m.state.approvalStatus === 'published' && where.id === 'a1' ? m.state : null) }, readUrl: async (k) => `https://r2/${k}?fresh` };
    expect((await resolvePublic({ id: 'a1' }, d)).url).toContain('?fresh');
    m.state.approvalStatus = 'approved';
    expect(await resolvePublic({ id: 'a1' }, d)).toBeNull();
  });
  it('emits a <video> snippet for a video asset', async () => {
    const r = await publishedReference({ id: 'a1', userId: 1 }, deps(model(base({ approvalStatus: 'published', mime: 'video/mp4' }))));
    expect(r.snippet).toContain('<video');
  });
});

describe('the publish signer will not sign a key this system did not write', () => {
  // r2Key on a video row is caller-supplied: it arrives from the body of
  // POST /api/render-agents/jobs/:jobId/complete, and verifyObject — when it runs at all —
  // checks that an object EXISTS at that key, never that the key is ours.
  // generatePlaybackUrl presigns anything it is handed. The library learned this and
  // started checking; this signer reads the same unvalidated field.
  const FOREIGN = 'atelier/stills/99/secret.png';
  const model = (asset) => ({ findOne: async () => asset });
  const signer = { readUrl: async (k) => `https://cdn.example/${k}?sig=x` };

  it('withholds the reference rather than signing a foreign key', async () => {
    const asset = base({ approvalStatus: 'published', r2Key: FOREIGN });
    const out = await publishedReference({ id: 'a1', userId: 1 }, { assetModel: model(asset), ...signer });
    expect(out.readUrl).toBeNull();
    expect(out.snippet).toBeNull();
    expect(out.withheld).toMatch(/not one this system wrote/);
  });

  it('still signs a key the system did write', async () => {
    // The guard must not eat the working path.
    const asset = base({ approvalStatus: 'published' });
    const out = await publishedReference({ id: 'a1', userId: 1 }, { assetModel: model(asset), ...signer });
    expect(out.readUrl).toContain('atelier/stills/1/x.png');
    expect(out.withheld).toBeNull();
  });

  it('the UNAUTHENTICATED permalink resolves to nothing for a foreign key', async () => {
    // This route is mounted without auth, so it is the least forgiving place in the system
    // to sign an unvalidated key: a planted r2Key on a published row would otherwise become
    // a public signed URL for someone else's object.
    const asset = base({ approvalStatus: 'published', r2Key: FOREIGN });
    expect(await resolvePublic({ id: 'a1' }, { assetModel: model(asset), ...signer })).toBeNull();
  });

  it('the permalink still resolves for a key the system wrote', async () => {
    const asset = base({ approvalStatus: 'published' });
    const out = await resolvePublic({ id: 'a1' }, { assetModel: model(asset), ...signer });
    expect(out.url).toContain('atelier/stills/1/x.png');
  });

  it('a video asset published from its own job namespace still resolves', async () => {
    const jobId = '11111111-2222-3333-4444-555555555555';
    const asset = base({ approvalStatus: 'published', jobId, kind: 'video',
      mime: 'video/mp4', r2Key: `jobs/${jobId}/source.mp4` });
    const out = await resolvePublic({ id: 'a1' }, { assetModel: model(asset), ...signer });
    expect(out.url).toContain(`jobs/${jobId}/source.mp4`);
  });
});

describe('the embed snippet is pasted onto a public site, so attribution is not trusted', () => {
  const model = (asset) => ({ findOne: async () => asset });
  const signer = { readUrl: async (k) => `https://cdn.example/${k}?sig=x` };
  const ref = (attribution) => publishedReference({ id: 'a1', userId: 1 }, {
    assetModel: model(base({
      approvalStatus: 'published',
      provenance: { ...prov(), attribution },
    })),
    ...signer,
  });

  it('an attribution cannot close the HTML comment it sits in', async () => {
    // `provenance` reaches MediaAsset as `meta.provenance` from the render-agent completion
    // body, so an enrolled agent chooses this string — and the operator is told to paste the
    // snippet onto a public website. `-->` would end the comment and make everything after
    // it live markup on their site.
    const out = await ref('Wan 2.2 --> <img src=x onerror=alert(1)>');
    // The property that matters is that the ATTRIBUTION contributes no comment terminator
    // and no angle bracket. The word "onerror" survives as inert text inside the comment,
    // which is fine and is deliberately not asserted against: without a `<` it cannot
    // become a tag, and stripping vocabulary rather than syntax is how sanitisers rot.
    // Exactly one comment terminator, and nothing bracket-shaped between the delimiters.
    expect((out.snippet.match(/-->/g) || []).length).toBe(1);
    const inside = out.snippet.slice(out.snippet.indexOf('<!--') + 4, out.snippet.lastIndexOf('-->'));
    expect(inside).not.toMatch(/[<>]/);
  });

  it('a legitimate attribution still appears', async () => {
    // The sanitiser must not eat the credit the licence requires.
    const out = await ref('Video generated with Wan 2.2');
    expect(out.snippet).toContain('Video generated with Wan 2.2');
  });

  it('an attribution of only markup leaves no empty comment behind', async () => {
    const out = await ref('<<>>');
    expect(out.snippet).not.toContain('<!--');
  });
});

describe('the one refusal that would otherwise be silent', () => {
  it('logs when the public permalink refuses a key, because a 404 hides the reason', async () => {
    // The library degrades to a visible placeholder and publishedReference returns a
    // `withheld` reason. This path returns null and the route answers 404 — a permalink
    // that worked yesterday simply stops, indistinguishable from an unpublish. The key
    // convention is not enforced at the writer (r2KeyForJob is called by nothing in
    // production), so a historical asset may carry a shape this predicate does not know.
    const warns = [];
    const spy = console.warn; console.warn = (m, ...a) => warns.push(String(m) + a.join(' '));
    try {
      const asset = base({ approvalStatus: 'published', r2Key: 'legacy/shape/x.png' });
      const out = await resolvePublic({ id: 'a1' }, {
        assetModel: { findOne: async () => asset },
        readUrl: async () => 'https://cdn/x',
      });
      expect(out).toBeNull();
      expect(warns.join(' ')).toMatch(/not one this system wrote/);
    } finally { console.warn = spy; }
  });

  it('says nothing when the key is fine', async () => {
    const warns = [];
    const spy = console.warn; console.warn = (m, ...a) => warns.push(String(m) + a.join(' '));
    try {
      await resolvePublic({ id: 'a1' }, {
        assetModel: { findOne: async () => base({ approvalStatus: 'published' }) },
        readUrl: async (k) => `https://cdn/${k}`,
      });
      expect(warns.join(' ')).not.toMatch(/not one this system wrote/);
    } finally { console.warn = spy; }
  });
});
