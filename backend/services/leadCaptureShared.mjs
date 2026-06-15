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
