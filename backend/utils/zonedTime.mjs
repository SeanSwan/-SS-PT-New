/**
 * ============================================================================
 * FILE: zonedTime.mjs
 * PURPOSE: Convert wall-clock time in an IANA timezone to the correct UTC instant.
 * ADDED: 2026-07-28 (SWA-74, gym-ops spine S0)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Given "06:30 on 2026-03-08 in America/Los_Angeles", returns the exact UTC
 * Date for that moment — correctly, across daylight-saving transitions.
 *
 * HOW IT FITS IN THE APP: Recurring classes are defined as a local wall-clock start time plus the
 * location's IANA zone. Each concrete occurrence must be materialized as a UTC instant. A weekly
 * 6:30 AM class must stay 6:30 AM local through a DST shift — naively adding 7 days in UTC moves it
 * to 5:30 or 7:30 twice a year.
 *
 * KEY DECISION: no timezone library. This repo ships none (verified: package.json has date-fns and
 * moment, neither with tz data), and the established house pattern is native Intl.DateTimeFormat
 * (see backend/services/nutrition/displayDate.mjs). Adding luxon/date-fns-tz for one function is
 * not worth the dependency.
 *
 * WHY TWO PASSES: the UTC offset near a DST boundary differs between the naive guess and the real
 * instant. Probing once, correcting, then re-probing resolves it. A single pass is wrong exactly
 * twice a year — which is precisely when a schedule silently shifts by an hour and nobody notices
 * until members show up to a locked door.
 */

/**
 * Offset of `timeZone` from UTC, in milliseconds, at the given instant.
 * Positive means ahead of UTC. Derived by formatting the instant in the target zone and reading
 * the resulting wall-clock back as if it were UTC.
 */
function zoneOffsetMs(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const v = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  // hour can format as "24" at midnight in some ICU versions; normalize to 0.
  const asUtc = Date.UTC(
    Number(v.year),
    Number(v.month) - 1,
    Number(v.day),
    Number(v.hour) % 24,
    Number(v.minute),
    Number(v.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Wall-clock time in an IANA zone -> the UTC instant it refers to.
 *
 * @param {{year:number, month:number, day:number, hour:number, minute:number}} wall
 *        month is 1-based (January = 1), matching how humans and cron strings write it.
 * @param {string} timeZone IANA zone, e.g. 'America/Los_Angeles'.
 * @returns {Date} the UTC instant.
 */
export function zonedWallClockToUtc({ year, month, day, hour = 0, minute = 0 }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const pass1 = naive - zoneOffsetMs(new Date(naive), timeZone);
  const pass2 = naive - zoneOffsetMs(new Date(pass1), timeZone);
  return new Date(pass2);
}

/**
 * Parse a 'HH:mm' wall-clock string. Returns null when malformed, so callers can treat a bad or
 * absent value as "no constraint" rather than crashing or silently coercing to midnight.
 */
export function parseWallClock(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * The current wall-clock time at a location, as { hour, minute }. Used by door-access hours checks,
 * which need now-in-local-terms — the opposite direction from zonedWallClockToUtc.
 */
export function nowInZone(timeZone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const v = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { hour: Number(v.hour) % 24, minute: Number(v.minute) };
}

export default { zonedWallClockToUtc, parseWallClock, nowInZone };
