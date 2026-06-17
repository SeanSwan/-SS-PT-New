/**
 * SMS Suppression Service
 * =======================
 * Normalizes inbound sender phones and persists STOP-family opt-outs.
 */
import SmsSuppression from '../models/SmsSuppression.mjs';

export const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

export const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
};

const normalizeKeyword = (body) => String(body || '').trim().toUpperCase();

export const isStopKeyword = (body) => STOP_KEYWORDS.has(normalizeKeyword(body));

const evidenceFor = ({ body, raw } = {}) => ({
  keyword: normalizeKeyword(body),
  rawKeys: Object.keys(raw || {}).sort(),
});

export const recordSmsOptOut = async ({ from, body, messageSid = null, raw = null } = {}) => {
  if (!isStopKeyword(body)) {
    return { recorded: false, reason: 'not_stop_keyword' };
  }

  const phone = normalizePhone(from);
  if (!phone) {
    return { recorded: false, reason: 'missing_phone' };
  }

  const optedOutAt = new Date();
  const evidence = {
    source: 'twilio_inbound',
    reason: 'stop_keyword',
    messageSid,
    optedOutAt,
    metadata: evidenceFor({ body, raw }),
  };

  const [record, created] = await SmsSuppression.findOrCreate({
    where: { phone },
    defaults: { phone, ...evidence },
  });

  if (!created) {
    await record.update(evidence);
  }

  return { recorded: true, phone, created };
};

export default {
  STOP_KEYWORDS,
  normalizePhone,
  isStopKeyword,
  recordSmsOptOut,
};
