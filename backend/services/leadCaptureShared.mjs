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
 * DELIBERATELY UNLIKE the channel tally: an untagged lead is skipped rather than bucketed under a
 * default. Channels have a meaningful fallback ('direct' — everyone arrived somehow); intent does
 * not. Most leads declare none, and folding them into a catch-all would swamp the real signal and
 * make the trainer count look like noise in a bucket of thousands.
 */
export const aggregateLeadIntents = (rows = []) => {
  const acc = {};
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const tags = Array.isArray(row?.tags) ? row.tags : [];
    const tag = tags.find((t) => typeof t === 'string' && t.startsWith(INTENT_TAG_PREFIX));
    if (!tag) continue;
    const intent = tag.slice(INTENT_TAG_PREFIX.length);
    if (!intent) continue; // a bare "prism:intent:" is malformed, not a bucket
    if (!acc[intent]) acc[intent] = { intent, count: 0, converted: 0 };
    acc[intent].count += 1;
    if (row?.status === 'converted') acc[intent].converted += 1;
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
  const acc = {};
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
