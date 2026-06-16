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
 * @returns {{action:'send'|'defer'|'cancel'|'fail', reason:string, channel:string, nextAttempt?:Date}}
 */
export const evaluateScheduledMessage = (log, user, now = new Date()) => {
  const channel = log?.channel || 'sms';
  if (channel !== 'sms') return { action: 'fail', reason: 'channel_not_implemented', channel };

  const prefs = normalizePreferences(user?.notificationPreferences);
  if (prefs.sms === false) return { action: 'cancel', reason: 'sms_disabled', channel };
  if (isWithinQuietHours(prefs.quietHours, now)) {
    return { action: 'defer', reason: 'quiet_hours', channel, nextAttempt: getNextAllowedTime(prefs.quietHours, now) };
  }
  if (!user?.phone) return { action: 'fail', reason: 'no_phone', channel };
  return { action: 'send', reason: 'eligible', channel };
};
