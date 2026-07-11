/**
 * Automation Decision Service
 * ===========================
 * Pure send/suppress decisions shared by live automation and dry-run preview.
 */

const normalizePreferences = (prefs) => {
  if (!prefs || typeof prefs !== 'object') {
    return { email: true, sms: true, push: true, quietHours: null };
  }

  return {
    email: prefs.email !== false,
    sms: prefs.sms !== false,
    push: prefs.push !== false,
    quietHours: prefs.quietHours || null
  };
};

const parseTime = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return { hours, minutes };
};

const isWithinQuietHours = (quietHours, now = new Date()) => {
  if (!quietHours || typeof quietHours !== 'object') return false;
  const start = parseTime(quietHours.start);
  const end = parseTime(quietHours.end);
  if (!start || !end) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const getNextAllowedTime = (quietHours, now = new Date()) => {
  const start = parseTime(quietHours?.start);
  const end = parseTime(quietHours?.end);
  if (!start || !end) return now;

  const next = new Date(now);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes < endMinutes) {
    next.setHours(end.hours, end.minutes, 0, 0);
    if (currentMinutes >= endMinutes) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (currentMinutes >= startMinutes) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(end.hours, end.minutes, 0, 0);
  return next;
};

/**
 * Pure send-decision for one scheduled automation log. NO side effects.
 * @param {object} recipient - user OR lead-derived target: `{ phone, notificationPreferences }`.
 *   Leads carry no per-channel prefs (`notificationPreferences:null` → defaults on); they are
 *   gated by suppression + phone presence instead of by stored preferences.
 * @param {object|null} suppression - result of `resolveMarketingSuppression({ email, phone })`:
 *   `{ suppressed, checked }`. `suppressed` → CANCEL; `checked:false` → FAIL CLOSED (consent could
 *   not be verified, so we do NOT send). Omitted/null → suppression not evaluated here (legacy /
 *   unit calls that gate consent elsewhere). The gate runs FIRST so an opt-out always wins.
 * @param {object|null} frequency - result of `resolveFrequencyCap(...)`:
 *   `{ capped, nextAttempt }`. `capped` → DEFER (the recipient already hit the rolling
 *   per-recipient cap; we space the message out, never drop it). Checked LAST, after
 *   no_phone, so a terminal no-phone failure still wins over a re-try. Omitted/null → no cap.
 * @returns {{action:'send'|'defer'|'cancel'|'fail', reason:string, channel:string, nextAttempt?:Date}}
 */
export const evaluateScheduledMessage = (log, recipient, now = new Date(), suppression = null, frequency = null) => {
  const channel = log?.channel || 'sms';
  // Implemented channels: sms + email. Email is what reaches the phone-less, email-only
  // prospects that make up most contact-form leads. push/other remain unimplemented.
  if (channel !== 'sms' && channel !== 'email') return { action: 'fail', reason: 'channel_not_implemented', channel };

  // Marketing consent gate — checked FIRST, fails CLOSED (shared by every channel).
  if (suppression) {
    if (suppression.suppressed) return { action: 'cancel', reason: suppression.reason || 'marketing_suppressed', channel };
    if (suppression.checked === false) return { action: 'fail', reason: 'suppression_unverified', channel };
  }

  const prefs = normalizePreferences(recipient?.notificationPreferences);

  // Per-channel preference gate.
  if (channel === 'email') {
    if (prefs.email === false) return { action: 'cancel', reason: 'email_disabled', channel };
  } else if (prefs.sms === false) {
    return { action: 'cancel', reason: 'sms_disabled', channel };
  }

  // Quiet hours apply to every channel.
  if (isWithinQuietHours(prefs.quietHours, now)) {
    return { action: 'defer', reason: 'quiet_hours', channel, nextAttempt: getNextAllowedTime(prefs.quietHours, now) };
  }

  // Deliverable-address gate: email needs an email, sms needs a phone.
  if (channel === 'email') {
    if (!recipient?.email) return { action: 'fail', reason: 'no_email', channel };
  } else if (!recipient?.phone) {
    return { action: 'fail', reason: 'no_phone', channel };
  }

  // Rolling per-recipient frequency cap — defer (space out), never drop.
  if (frequency?.capped) {
    return { action: 'defer', reason: 'frequency_capped', channel, nextAttempt: frequency.nextAttempt || now };
  }
  return { action: 'send', reason: 'eligible', channel };
};
