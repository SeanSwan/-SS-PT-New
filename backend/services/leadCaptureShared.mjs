/**
 * Lead-capture shared constants + helpers (rule 4 extraction from leadCaptureService).
 * Pure, dependency-free helpers reused by every capture touchpoint.
 */

export const CONTACT_FORM_LEAD_SCORE = 30;     // warm: they actively typed a message
export const CONTACT_FORM_REPEAT_BONUS = 15;   // repeat contact = higher intent
export const SIGNUP_LEAD_SCORE = 50;           // creating an account = strong intent
export const CHECKOUT_CONVERSION_SCORE = 100;  // paid checkout = converted
export const NON_SALES_ROLES = new Set(['admin', 'trainer']);
export const CHECKOUT_CONVERSION_TAGS = ['checkout', 'converted'];
export const NEWSLETTER_LEAD_SCORE = 25;       // confirmed double-opt-in subscriber: warm, content-interested
export const NEWSLETTER_TAG = 'newsletter';

/**
 * Map a clientSource string to the Lead.source ENUM
 * (gallery | walk_in | website | referral | social_media | other).
 */
export const mapClientSourceToLeadSource = (clientSource) => {
  switch (clientSource) {
    case 'external':
      return 'referral';
    case 'social_media':
      return 'social_media';
    default:
      return 'website';
  }
};

export const splitLeadName = (name) => {
  const [firstToken, ...rest] = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstToken || 'Unknown',
    lastName: rest.length ? rest.join(' ') : null,
  };
};

export const firstString = (...values) => (
  values.map((value) => String(value || '').trim()).find(Boolean) || ''
);

export const parseCartCustomerInfo = (cart) => {
  if (!cart?.customerInfo) return {};
  if (typeof cart.customerInfo === 'object') return cart.customerInfo;
  try {
    return JSON.parse(cart.customerInfo);
  } catch {
    return {};
  }
};

export const mergeLeadTags = (currentTags = [], tagsToAdd = []) => (
  [...new Set([
    ...(Array.isArray(currentTags) ? currentTags : []),
    ...tagsToAdd,
  ])]
);

// --- Public capture intent ---------------------------------------------------
// ONE definition of the intent vocabulary. Both public funnels validate against it:
// POST /api/leads/capture (leadCaptureRoutes) and the contact form (captureLeadFromContact).
// Two copies of an enum is the drift bug this repo keeps paying for (rule 58) — a trainer
// tagged `prism:intent:trainer` by one path and something else by the other is unqueryable.
export const CAPTURE_INTENTS = Object.freeze(['book', 'trainer', 'spectrum']);

/**
 * Tag for a self-declared capture intent, or null if it isn't one we recognize.
 *
 * ⚠ SELF-DECLARED, NOT A CREDENTIAL. The intent arrives from a URL query param a visitor
 * can craft (`/contact?intent=trainer`). It is a marketing attribution signal only — it says
 * "this person clicked the trainer door," never "this person IS a trainer." Nothing may grant
 * access, pricing, or role on the strength of this tag; public trainer self-registration is
 * forbidden outright and locked by trainerRecruitmentLinks.contract.test.ts. Allowlisted here
 * so an arbitrary query string can never become an arbitrary tag in the CRM.
 *
 * Note the allowlist does NOT protect the aggregator downstream: `Lead.tags` is writable through
 * the admin lead-update API, so a tag can exist that this function would never have produced.
 * That is why aggregateLeadIntents uses a null-prototype accumulator rather than trusting the key.
 */
export const INTENT_TAG_PREFIX = 'prism:intent:';

export const intentTag = (intent) => (
  typeof intent === 'string' && CAPTURE_INTENTS.includes(intent)
    ? `${INTENT_TAG_PREFIX}${intent}`
    : null
);

/**
 * Tally leads by declared intent — "how many trainers actually knocked".
 *
 * Mirrors aggregateLeadChannels and runs over the SAME rows that endpoint already fetched, so it
 * costs no extra query. Without this the intent tag is technically queryable and practically
 * invisible: answering "how many trainers came through this month" would mean hand-writing JSONB
 * SQL, which is the same friction that made the old free-text marker useless.
 *
 * TWO DELIBERATE ASYMMETRIES with the channel tally:
 *   1. An untagged lead is SKIPPED, not bucketed under a default. Channels have a meaningful
 *      fallback ('direct' — everyone arrived somehow); intent does not. Most leads declare none,
 *      and a catch-all would swamp the real signal in a bucket of thousands.
 *   2. Every published intent is nonetheless SEEDED AT ZERO, so the three known buckets always
 *      appear. Absent data and zero data must be distinguishable — see the seeding comment below.
 * These are not in tension: rows without an intent contribute to nothing, but the intents we
 * publish are always reported, even at zero.
 */
export const aggregateLeadIntents = (rows = []) => {
  // Object.create(null), NOT {} — the bucket key comes from a tag, and tags are writable via the
  // admin lead-update API. With a plain object a tag of `prism:intent:__proto__` makes acc[key]
  // resolve to Object.prototype (truthy, so the guard below skips init) and the ++ then lands on
  // Object.prototype.count — polluting EVERY object in the process with count:NaN. Verified, not
  // theorised. A null-prototype accumulator has no inherited keys to collide with.
  //
  // The allowlist intersection below makes that unreachable anyway, and both are kept deliberately:
  // the vocabulary check is the intent, the null prototype is the floor if the vocabulary ever grows
  // a caller that forgets to filter.
  const acc = Object.create(null);
  // SEED EVERY PUBLISHED INTENT AT ZERO. Without this the accumulator only gains keys that actually
  // occurred, so a window containing no trainer leads returns NO trainer key at all — and a dashboard
  // reading `byIntent` renders nothing rather than "trainer: 0". That is the disappearance this whole
  // feature exists to prevent, reproduced one layer up: a real zero and a missing metric become
  // indistinguishable, so "no trainers knocked this month" reads identically to "the counter broke".
  // A reviewer caught it. Every prior reviewer and I missed it, because we all tested windows that
  // happened to contain the intent we were looking for.
  for (const intent of CAPTURE_INTENTS) acc[intent] = { intent, count: 0, converted: 0 };
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const tags = Array.isArray(row?.tags) ? row.tags : [];
    // ALL matching tags, not the first. A lead can legitimately hold several — a repeat submitter
    // who came through the book door and later the trainer door has both unioned by mergeLeadTags,
    // and `.find()` counted them once under whichever happened to sit earlier in the array. That
    // made the tally depend on array order and silently undercount exactly the multi-touch leads
    // most worth seeing. Consequence, deliberate: sum(byIntent) can exceed the number of leads.
    const declared = tags.filter((t) => typeof t === 'string' && t.startsWith(INTENT_TAG_PREFIX));
    if (!declared.length) continue;
    const seen = new Set(); // one row counts at most once per intent even if a tag is duplicated
    for (const tag of declared) {
      const intent = tag.slice(INTENT_TAG_PREFIX.length);
      // Only tally intents the published vocabulary knows. `Lead.tags` is admin-writable, so an
      // arbitrary `prism:intent:<anything>` can exist that intentTag() would never have produced —
      // unbounded distinct keys (a stats-pollution and response-size vector) and unbounded key
      // LENGTH (a tag can be ~1MB). There is no legitimate reason to report an intent we do not
      // publish, so unknown ones are dropped rather than bucketed.
      if (!CAPTURE_INTENTS.includes(intent)) continue;
      if (seen.has(intent)) continue;
      seen.add(intent);
      acc[intent].count += 1; // bucket pre-seeded above, so no lazy init

      if (row?.status === 'converted') acc[intent].converted += 1;
    }
  }
  return Object.values(acc).sort((a, b) => b.count - a.count);
};

// --- Acquisition-channel attribution -----------------------------------------
// Normalize a marketing channel from utm params / referrer so every lead records
// WHERE it came from (YouTube, TikTok, IG, Nextdoor, search, referral, direct).
// utm/referrer are non-PII marketing signals (rule 8 safe). No schema change:
// the channel rides Lead.tags ('channel:<x>') + sourceDetail + LeadActivity.metadata,
// and maps to the existing Lead.source ENUM.
const SOCIAL_CHANNELS = new Set([
  'youtube', 'tiktok', 'instagram', 'facebook', 'twitch', 'twitter', 'linkedin',
  'reddit', 'pinterest', 'threads', 'snapchat',
]);
const CHANNEL_ALIASES = { ig: 'instagram', fb: 'facebook', x: 'twitter', yt: 'youtube' };
const REFERRER_HOSTS = [
  ['youtu', 'youtube'], ['tiktok', 'tiktok'], ['instagram', 'instagram'],
  ['facebook', 'facebook'], ['fb.', 'facebook'], ['twitch', 'twitch'],
  ['twitter', 'twitter'], ['x.com', 'twitter'], ['linkedin', 'linkedin'],
  ['reddit', 'reddit'], ['pinterest', 'pinterest'], ['nextdoor', 'nextdoor'],
  ['google', 'google'], ['bing', 'bing'], ['duckduckgo', 'google'],
];

const sanitizeChannelToken = (value) => String(value || '')
  .trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);

const channelFromReferrer = (referrer) => {
  const r = String(referrer || '').trim().toLowerCase();
  if (!r) return '';
  // Match on the HOSTNAME (not the full URL+path) so '/youtube-tips' on a third-party
  // blog isn't mis-attributed to YouTube.
  let host = r;
  try { host = new URL(r).hostname; } catch { /* not a full URL — fall back to raw */ }
  for (const [needle, label] of REFERRER_HOSTS) if (host.includes(needle)) return label;
  return /^https?:\/\//.test(r) ? 'referral' : '';
};

/** Map a normalized channel to the Lead.source ENUM (…|website|referral|social_media|…). */
export const channelToLeadSource = (channel) => {
  if (SOCIAL_CHANNELS.has(channel)) return 'social_media';
  if (channel === 'referral') return 'referral';
  return 'website';
};

/** Tags for a channel — skip the non-channels so we don't tag every lead. */
export const channelTags = (channel) => (
  channel && channel !== 'direct' && channel !== 'website' ? ['channel:' + channel] : []
);

/** Derive { channel, leadSource } from utm params + referrer. */
export const deriveChannel = ({ utmSource, utmMedium, referrer } = {}) => {
  let channel = sanitizeChannelToken(utmSource) || channelFromReferrer(referrer) || 'direct';
  channel = CHANNEL_ALIASES[channel] || channel;
  const medium = sanitizeChannelToken(utmMedium);
  let leadSource = channelToLeadSource(channel);
  if (leadSource === 'website' && (medium === 'social' || medium === 'paid_social')) leadSource = 'social_media';
  if (leadSource === 'website' && medium === 'referral') leadSource = 'referral';
  return { channel, leadSource };
};

// Friendly label for leads that have no 'channel:' tag yet (pre-attribution / non-form).
const CHANNEL_SOURCE_LABEL = { website: 'direct', social_media: 'social', referral: 'referral', gallery: 'gallery', walk_in: 'walk-in', other: 'other' };

/**
 * Roll lead rows ({ tags, source, status }) into a sorted top-N channel breakdown
 * for the Marketing Command Center. The 'channel:<x>' tag wins; else bucket by
 * source enum. Tracks converted count per channel so the UI can show which channel
 * produces PAYING clients, not just leads.
 * @returns {{channel:string, count:number, converted:number}[]}
 */
export const aggregateLeadChannels = (rows = [], topN = 8) => {
  // Same null-prototype requirement as aggregateLeadIntents — a `channel:__proto__` tag pollutes
  // Object.prototype identically. Pre-existing; found by testing the copy, so fixed in the original.
  const acc = Object.create(null);
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const tags = Array.isArray(row?.tags) ? row.tags : [];
    const tag = tags.find((t) => typeof t === 'string' && t.startsWith('channel:'));
    const channel = tag ? tag.slice(8) : (CHANNEL_SOURCE_LABEL[row?.source] || row?.source || 'direct');
    if (!acc[channel]) acc[channel] = { channel, count: 0, converted: 0 };
    acc[channel].count += 1;
    if (row?.status === 'converted') acc[channel].converted += 1;
  }
  return Object.values(acc)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
};
