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
