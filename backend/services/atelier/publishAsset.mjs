/**
 * publishAsset.mjs — the Publish rung: draft → approved → published, with the gates
 * the provenance record was built to answer.
 * ============================================================================
 *
 * An asset that stops at a gallery has not done its job. Publish is where a
 * rendered still or clip becomes something a site can consume: a stable object
 * key, a read URL, and the attribution its licence requires — surfaced together,
 * copyable, and refused when the record says it should be.
 *
 * ── THE TRANSITIONS ────────────────────────────────────────────────────────
 *   draft → approved      a human looked at it (coverage counts from here)
 *   approved → published  it may be used on a site
 *   published → approved  unpublish (reversible; the object stays)
 *   approved → draft      withdraw approval
 * Nothing skips a step. draft → published is refused: nobody looked.
 *
 * ── THE PUBLISH GATES (answered from the FROZEN provenance, months later) ──
 *   1. Every policy flag on the record must have consentConfirmed:true. The
 *      record was designed so "no depiction of identifiable real people without
 *      consent" is answerable at publish time by someone who never saw the job.
 *      A flag left false is a refusal, not a warning.
 *   2. If the licence snapshot says requiresAttribution, the attribution string
 *      must exist — it is what the site must display.
 *   3. If the licence restricted commercial execution and no grant was recorded,
 *      the asset was produced under non-commercial terms and cannot be published
 *      to a commercial site. Note: this restricts running the model, not owning
 *      the output — the refusal names that distinction, because the ambiguous
 *      sentence already cost this project days.
 *
 * Injected model + URL signer so the suite runs without a DB or R2.
 */

import { keyOwnedByRow } from './assetKeyOwnership.mjs';
import { ComposeError } from './composeLimits.mjs';

export class PublishError extends ComposeError {
  constructor(code, message, extra) { super(code, message, extra); this.name = 'PublishError'; }
}

export const STATUSES = Object.freeze(['draft', 'approved', 'published']);
export const TRANSITIONS = Object.freeze({
  draft: Object.freeze(['approved']),
  approved: Object.freeze(['published', 'draft']),
  published: Object.freeze(['approved']),
});

async function defaultDeps() {
  const [{ default: MediaAsset }, r2] = await Promise.all([
    import('../../models/MediaAsset.mjs'),
    import('../r2StorageService.mjs'),
  ]);
  return {
    assetModel: MediaAsset,
    readUrl: (key, mime) => r2.generatePlaybackUrl({ objectKey: key, mimeType: mime }),
    now: () => new Date(),
  };
}

/** The reasons an asset may NOT be published, from its frozen record. Empty = may publish. */
export function publishBlockers(asset) {
  const p = asset?.provenance || null;
  const out = [];
  if (!p) return ['E_NO_PROVENANCE: this asset has no provenance record; publish needs one to answer licence and consent questions'];
  for (const f of p.policyFlags || []) {
    if (f && f.consentConfirmed !== true) {
      out.push(`E_CONSENT_UNCONFIRMED: policy flag "${f.rule || 'unnamed'}" has no confirmed consent${f.detail ? ` — ${f.detail}` : ''}`);
    }
  }
  if (p.licence?.requiresAttribution && !p.attribution) {
    out.push('E_ATTRIBUTION_MISSING: the licence requires attribution to be displayed and none is recorded');
  }
  if (p.licence?.commercialUse === 'requires-grant' && p.licence?.usedCommercially && !p.licence?.grantRecorded) {
    out.push('E_LICENCE_GRANT_REQUIRED: produced by running a model whose licence requires a written grant for commercial execution, and none was recorded. This restricts running the model, not owning the output — but a commercial site is commercial use of the model run');
  }
  return out;
}

/**
 * The declaration a human makes at publish time. The provenance record ships with
 * `consentConfirmed:false` as the honest start state and NOTHING in the pipeline can
 * detect an identifiable person or a commercial intent — only the operator can. So
 * publishing takes an explicit declaration, and the declaration is welded onto the
 * asset as policy flags with who/when, so the question is answerable months later by
 * someone who never saw the job.
 */
export const INTENDED_USES = Object.freeze(['commercial', 'personal']);
export function normalizeDeclaration(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const intendedUse = String(raw.intendedUse || '').toLowerCase();
  if (!INTENDED_USES.includes(intendedUse)) return null;
  if (raw.consentConfirmed !== true) return null;
  return { intendedUse, consentConfirmed: true, note: typeof raw.note === 'string' ? raw.note.slice(0, 280) : null };
}

/**
 * Move an asset between statuses.
 * @param {object} req  { id, userId, to, declaration?: { intendedUse, consentConfirmed, note? } }
 */
export async function transitionAsset(req = {}, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const to = String(req.to || '').trim();
  if (!STATUSES.includes(to)) throw new PublishError('E_BAD_STATUS', `status must be one of ${STATUSES.join(', ')}.`);
  if (!Number.isInteger(req.userId)) throw new PublishError('E_BAD_OWNER', 'An owner user id is required.');

  const asset = await d.assetModel.findOne({ where: { id: String(req.id || ''), ownerUserId: req.userId } });
  if (!asset) throw new PublishError('E_ASSET_NOT_FOUND', 'No asset with that id belongs to you.');

  const from = asset.approvalStatus;
  if (from === to) return { id: asset.id, from, to, changed: false, blockers: [] };
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new PublishError('E_BAD_TRANSITION',
      `${from} → ${to} is not a step. Allowed from ${from}: ${TRANSITIONS[from].join(', ') || 'none'}.`
      + (from === 'draft' && to === 'published' ? ' Approve it first — nobody has looked at it.' : ''));
  }
  if (to === 'published') {
    const decl = normalizeDeclaration(req.declaration);
    if (!decl) {
      throw new PublishError('E_PUBLISH_DECLARATION_REQUIRED',
        'Publishing needs an explicit declaration: consentConfirmed:true and intendedUse of commercial or personal. '
        + 'Nothing in the pipeline can confirm consent for you.');
    }
    // Weld the declaration onto the record: every existing flag is confirmed by this
    // human, and the declaration itself becomes a flag with who and when.
    const prov = asset.provenance ? JSON.parse(JSON.stringify(asset.provenance)) : null;
    if (prov) {
      const at = d.now().toISOString();
      prov.policyFlags = (prov.policyFlags || []).map((f) => ({ ...f, consentConfirmed: true, confirmedBy: req.userId, confirmedAt: at }));
      prov.policyFlags.push({ rule: 'publish-declaration', detail: `intendedUse=${decl.intendedUse}${decl.note ? `; ${decl.note}` : ''}`, consentConfirmed: true, confirmedBy: req.userId, confirmedAt: at });
      // A commercial declaration on a grant-required run without a grant is still refused —
      // the licence snapshot decides, and it is checked below on the UPDATED flags.
      if (decl.intendedUse === 'commercial' && prov.licence) prov.licence.usedCommercially = true;
      asset.provenance = prov;
    }
    const blockers = publishBlockers(asset);
    if (blockers.length) {
      throw new PublishError('E_PUBLISH_BLOCKED', `Cannot publish: ${blockers.join('; ')}`, { blockers });
    }
    await asset.update({ approvalStatus: to, provenance: prov });
    return { id: asset.id, from, to, changed: true, blockers: [], declaration: decl };
  }
  await asset.update({ approvalStatus: to });
  return { id: asset.id, from, to, changed: true, blockers: [] };
}

/**
 * What a site needs to consume the asset — only for a PUBLISHED asset. For anything
 * else the URL is withheld, so "copy link" cannot leak a draft onto a page.
 */
export async function publishedReference({ id, userId, publicBase = '' }, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const asset = await d.assetModel.findOne({ where: { id: String(id || ''), ownerUserId: userId } });
  if (!asset) throw new PublishError('E_ASSET_NOT_FOUND', 'No asset with that id belongs to you.');
  const blockers = publishBlockers(asset);
  const base = {
    id: asset.id, status: asset.approvalStatus, r2Key: asset.r2Key, mime: asset.mime,
    width: asset.width, height: asset.height, sha256: asset.provenance?.artifact?.sha256 ?? null,
    attribution: asset.provenance?.attribution ?? null,
    attributionRequired: asset.provenance?.licence?.requiresAttribution === true,
    licence: asset.provenance?.licence?.name ?? null,
    blockers,
  };
  if (asset.approvalStatus !== 'published') {
    return { ...base, readUrl: null, snippet: null, withheld: `not published (status: ${asset.approvalStatus})` };
  }
  // WHOSE OBJECT, not just which. `r2Key` on a video row is caller-supplied: it arrives
  // from the body of POST /api/render-agents/jobs/:jobId/complete and `verifyObject` (when
  // it runs at all) checks that an object EXISTS at that key, never that the key is ours.
  // `generatePlaybackUrl` presigns anything. The library learned this and started checking;
  // this signer reads the same unvalidated field and must apply the same rule, or the
  // guard is one half of a pair — which is what a review of the library sweep concluded
  // by asking "which object" at each signing site and never "whose".
  if (!keyOwnedByRow(asset.r2Key, asset)) {
    return { ...base, readUrl: null, snippet: null,
      withheld: 'the stored object key is not one this system wrote for this asset' };
  }
  const readUrl = await d.readUrl(asset.r2Key, asset.mime);
  // THE STABLE REFERENCE. A signed URL expires (4h default) — pasting it into a site
  // means every image 403s after lunch, and unpublishing cannot retract a URL already
  // copied. The snippet therefore points at an app path that re-signs on every request
  // and answers 404 the moment the asset is no longer published. The signed URL is
  // returned too, for PREVIEW only.
  const permalink = `${publicBase || d.publicBase || ''}${PUBLIC_PATH}/${asset.id}`;
  const isVideo = String(asset.mime || '').startsWith('video/');
  const alt = 'Generated asset';
  // ATTRIBUTION IS NOT OURS. `provenance` reaches MediaAsset as `meta.provenance` from the
  // body of POST /api/render-agents/jobs/:jobId/complete (videoRenderJobService.mjs:291), so
  // an enrolled agent chooses this string — and this snippet is HTML the operator is told
  // to paste onto a public website. An attribution containing `-->` closes the comment and
  // everything after it becomes live markup on their site; `<img src=x onerror=...>` runs on
  // the visitor. Every other part of this snippet is server-built.
  //
  // The comment delimiters are removed rather than escaped: there is no escaping INSIDE an
  // HTML comment — `-->` is the terminator, full stop — so the only safe move is to ensure
  // the sequence cannot appear. `<` goes too, so a stripped remainder cannot open a tag.
  const safeAttribution = String(base.attribution || '').replace(/[<>]/g, ' ').replace(/--+/g, '-').trim();
  const credit = safeAttribution ? ` <!-- ${safeAttribution} -->` : '';
  const snippet = isVideo
    ? `<video src="${permalink}" playsinline muted loop autoplay></video>${credit}`
    : `<img src="${permalink}" alt="${alt}"${asset.width ? ` width="${asset.width}"` : ''}${asset.height ? ` height="${asset.height}"` : ''} />${credit}`;
  return { ...base, readUrl, permalink, snippet, withheld: null };
}

/** The path the permalink lives under. Mounted WITHOUT auth; published-only; UUIDs are not guessable. */
export const PUBLIC_PATH = '/api/atelier/public';

/**
 * Resolve a permalink to a fresh signed URL — or nothing. No auth: the asset id is a
 * UUIDv4 and only PUBLISHED assets resolve, so "copy link" onto a public site works
 * and "Unpublish" revokes it on the next request. Never leaks a draft.
 */
export async function resolvePublic({ id }, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const asset = await d.assetModel.findOne({ where: { id: String(id || ''), approvalStatus: 'published' } });
  if (!asset) return null;
  // This route is mounted WITHOUT auth, so it is the least forgiving place in the system to
  // sign an unvalidated key: a planted `r2Key` on a published row would become a public
  // signed URL for someone else's object. Same predicate as everywhere else.
  if (!keyOwnedByRow(asset.r2Key, asset)) return null;
  return { url: await d.readUrl(asset.r2Key, asset.mime), mime: asset.mime };
}
