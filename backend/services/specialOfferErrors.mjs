/**
 * specialOfferErrors.mjs
 * ======================
 * Stable domain error shared by special-offer pricing, checkout guards, and
 * paid-redemption services. Keeping one class preserves instanceof checks at
 * every Express boundary without coupling the redemption module back to the
 * larger pricing service.
 */
export class SpecialOfferError extends Error {
  constructor(message, { code = 'SPECIAL_OFFER_ERROR', status = 400, details = null } = {}) {
    super(message);
    this.name = 'SpecialOfferError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
