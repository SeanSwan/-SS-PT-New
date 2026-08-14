/**
 * MODULE: Speed-to-Lead Readiness (SWA-40)
 * ========================================
 * Reports whether the instant lead acknowledgment is actually LIVE — the one
 * thing the Marketing Command Center could not previously tell Sean. Filed as a
 * known follow-up by `SPEED-TO-LEAD-ACTIVATION-RUNBOOK-2026-07-22.md`:
 *
 *   "marketingReadinessService does not yet report SPEED_TO_LEAD_REPLY_ENABLED
 *    — the readiness cockpit won't show this feature's on/off state."
 *
 * PRINCIPLES
 *  - PURE ENV READ. No DB, no network, no mutation. Cannot send anything.
 *  - Rule 8 / Rule 59: presence BOOLEANS only. No API key, no from-address, no
 *    postal address, no URL value is ever returned — only whether it is set.
 *  - SEVERITY MIRRORS THE AUTOMATION PRECEDENT: default-OFF is the SAFE state
 *    (`ready` + `enabled:false`), never an alarm. Dark-by-default is the design,
 *    so the cockpit must not cry wolf about it. We only degrade or block when
 *    the flag is ON and the chain behind it is incomplete — i.e. when the
 *    operator believes it works and it does not.
 *
 * WHY DOMAIN ALIGNMENT IS A FIRST-CLASS SIGNAL: per the runbook's own ordering,
 * SendGrid domain authentication + an on-domain from-address is a LARGER
 * inbox-placement lever than DMARC. A live reply sent from an off-domain address
 * fails SPF/DKIM alignment and reliably lands in spam — which looks identical to
 * "the feature is broken" from the operator's seat, with no error anywhere.
 */
import { STATUS } from './readinessStatus.mjs';

/** Brand sending domain. An off-domain from-address breaks SPF/DKIM alignment. */
export const BRAND_EMAIL_DOMAIN = 'sswanstudios.com';

/**
 * True when the address sits on the brand's organizational domain.
 *
 * Accepts the apex (`hello@sswanstudios.com`) AND any subdomain
 * (`hello@mail.sswanstudios.com`), because DMARC's DEFAULT alignment mode is
 * `relaxed`, which treats a subdomain of the organizational domain as aligned.
 * Requiring an exact apex match would flag a correctly-configured subdomain
 * sender as broken — a false alarm on a legitimate setup.
 *
 * The leading `(?:@|\.)` is what stops a lookalike from passing: `evil.tld`
 * ending in `notsswanstudios.com` has neither an `@` nor a `.` immediately
 * before the brand domain, so it cannot match.
 */
const onBrandDomain = (address) => new RegExp(
  `(?:@|\\.)${BRAND_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`,
  'i',
).test(address);

/**
 * Which capture surfaces actually call `sendSpeedToLeadReply`.
 *
 * Verified against origin/main 2026-08-14:
 *   consultRequestRoutes.mjs:101 · contactRoutes.mjs:226 · leadCaptureRoutes.mjs:150
 *
 * newsletter / signup / checkout DO create Lead rows but deliberately do NOT
 * receive the inquiry acknowledgment: newsletter has its own double-opt-in
 * confirmation email, and checkout users are buyers rather than inquiries.
 * Surfaced explicitly so the cockpit states the real coverage instead of
 * implying every capture point replies.
 */
export const REPLY_POINTS = Object.freeze({
  consult: true,
  contact: true,
  prism: true,
  newsletter: false,
  signup: false,
  checkout: false,
});

/**
 * Build the speed-to-lead readiness card.
 * @param {object} [opts]
 * @param {object} [opts.env] environment source (injectable for tests)
 * @param {object} [opts.logger] logger with `.warn` (injectable for tests)
 * @returns {object} readiness card — booleans + guidance only, never a secret value
 */
export function buildSpeedToLeadReadiness({ env = process.env, logger = console } = {}) {
  try {
    // Exact-match 'true' — mirrors `flagEnabled()` in speedToLeadService.mjs.
    // Any other value (including 'TRUE' or '1') leaves the feature dark, and
    // this card must report the same truth the service acts on.
    const enabled = env?.SPEED_TO_LEAD_REPLY_ENABLED === 'true';

    const sendgridConfigured = Boolean(env?.SENDGRID_API_KEY);
    const fromAddress = String(env?.SENDGRID_FROM_EMAIL || '').trim();
    const fromEmailConfigured = Boolean(fromAddress);
    const fromEmailOnBrandDomain = fromEmailConfigured && onBrandDomain(fromAddress);
    const businessAddressConfigured = Boolean(env?.SWAN_BUSINESS_ADDRESS);
    const consultUrlConfigured = Boolean(env?.SWAN_CONSULT_URL);
    const senderChainReady = sendgridConfigured && fromEmailConfigured;

    let status = STATUS.READY;
    let nextAction = null;
    let note;

    if (!enabled) {
      note = 'Dark by default (fail-closed). Leads are still captured and the owner is still alerted — but the lead receives no instant reply.';
      nextAction = senderChainReady
        ? 'Set SPEED_TO_LEAD_REPLY_ENABLED=true in Render to go live (SPEED-TO-LEAD-ACTIVATION-RUNBOOK-2026-07-22.md). Rollback is the same switch.'
        : 'Complete the sender chain (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL) before flipping SPEED_TO_LEAD_REPLY_ENABLED=true.';
    } else if (!senderChainReady) {
      // Believed-live but structurally dead: the worst state to be silent about.
      status = STATUS.BLOCKED;
      note = 'ARMED but the sender chain is incomplete — every instant reply fails silently. Lead capture and owner alerts are unaffected (separate paths).';
      nextAction = !sendgridConfigured
        ? 'Set SENDGRID_API_KEY, or set SPEED_TO_LEAD_REPLY_ENABLED=false until the sender is configured.'
        : 'Set SENDGRID_FROM_EMAIL, or set SPEED_TO_LEAD_REPLY_ENABLED=false until the sender is configured.';
    } else if (!fromEmailOnBrandDomain) {
      status = STATUS.DEGRADED;
      note = `LIVE, but the from-address is not on ${BRAND_EMAIL_DOMAIN}. SPF/DKIM alignment fails, so replies are likely landing in spam — indistinguishable from "broken" to the prospect.`;
      nextAction = `Point SENDGRID_FROM_EMAIL at an authenticated ${BRAND_EMAIL_DOMAIN} address (e.g. hello@${BRAND_EMAIL_DOMAIN}).`;
    } else {
      note = 'LIVE — consult, contact, and PRISM captures send an instant branded reply to the lead.';
      if (!businessAddressConfigured) {
        // The runbook classes SWAN_BUSINESS_ADDRESS as "recommended — still
        // sends", so this does NOT degrade status (diverging from a ratified
        // runbook needs stronger cause than this). But a placeholder postal
        // address is going out in real prospect mail, so the cockpit says so.
        nextAction = 'Set SWAN_BUSINESS_ADDRESS — the transactional footer is rendering a placeholder postal address in live prospect email.';
      }
    }

    return {
      status,
      enabled,
      sendgridConfigured,
      fromEmailConfigured,
      fromEmailOnBrandDomain,
      businessAddressConfigured,
      consultUrlConfigured,
      replyPoints: { ...REPLY_POINTS },
      note,
      nextAction,
    };
  } catch (err) {
    // Fail-soft, matching every other subsystem: one bad card must not take
    // down the whole cockpit.
    logger?.warn?.('[marketingReadiness] speed-to-lead subsystem unavailable:', err?.message);
    return {
      status: STATUS.DEGRADED,
      enabled: false,
      error: 'speed-to-lead state unavailable',
    };
  }
}

export default { buildSpeedToLeadReadiness, REPLY_POINTS, BRAND_EMAIL_DOMAIN };
