/**
 * availabilityWindows.mjs — pure window arithmetic for standing client availability.
 * ==================================================================================
 * Deliberately free of Sequelize, models, and I/O. Every rule here is a statement about how
 * availability behaves, and rules that can be tested without a database are rules that stay
 * correct — the alternative is discovering a DST bug in production at 2am on a Sunday.
 *
 * TIME BASIS. Windows are business-local wall clock: a day-of-week plus 'HH:MM:SS'. A client
 * saying "Tuesday mornings" means Tuesday morning where the gym is, forever, regardless of
 * daylight saving. Sessions store absolute instants, so `sessionSlot()` is the ONLY sanctioned
 * bridge between the two representations — it converts an instant into the business-local
 * (dayOfWeek, timeOfDay) pair these windows are expressed in. Comparing a UTC hour directly
 * against a window column is correct for most of the year and then silently wrong for the rest.
 *
 * 'HH:MM:SS' strings are compared lexicographically throughout, which is exactly ordinally
 * correct for zero-padded 24-hour time and avoids a parse on every comparison.
 */

export const BUSINESS_TIME_ZONE = process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** 'H:M' / 'HH:MM' / 'HH:MM:SS' -> canonical 'HH:MM:SS'. Returns null if unusable. */
export const normalizeTime = (value) => {
  if (typeof value !== 'string') return null;
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
};

/**
 * A day index must be a real number 0-6. The explicit typeof guard is load-bearing: Number(null)
 * is 0, so without it a window with NO day silently becomes SUNDAY — a client would be offered
 * Sunday slots they never asked for, and nothing would ever look wrong. Same trap as '' -> 0.
 */
export const isValidDayOfWeek = (day) => {
  if (typeof day !== 'number' && typeof day !== 'string') return false;
  if (typeof day === 'string' && day.trim() === '') return false;
  const n = Number(day);
  return Number.isInteger(n) && n >= 0 && n <= 6;
};

/**
 * Validate and canonicalise one window. Returns { dayOfWeek, startTime, endTime } or null.
 * A window that ends at or before it starts is rejected rather than silently repaired: a
 * zero-width window matches nothing, and "my availability saved but nobody ever offers me
 * anything" is a far worse failure than an error at save time.
 */
export const normalizeWindow = (window) => {
  if (!window || !isValidDayOfWeek(window.dayOfWeek)) return null;
  const startTime = normalizeTime(window.startTime);
  const endTime = normalizeTime(window.endTime);
  if (!startTime || !endTime || endTime <= startTime) return null;
  return { dayOfWeek: Number(window.dayOfWeek), startTime, endTime };
};

/**
 * Canonical form of a whole week: invalid windows dropped, then per day sorted and any
 * overlapping OR touching windows merged into one.
 *
 * Merging matters because the UI is a tap-to-paint grid: painting 09:00-10:00 and then
 * 10:00-11:00 is one intention expressed in two gestures, and storing it as two rows would
 * make the same client match a 09:30-10:30 slot zero times instead of once. Touching windows
 * merge (end === next start) for the same reason.
 */
export const normalizeWeek = (windows = []) => {
  const byDay = new Map();
  for (const raw of Array.isArray(windows) ? windows : []) {
    const w = normalizeWindow(raw);
    if (!w) continue;
    if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
    byDay.get(w.dayOfWeek).push(w);
  }

  const out = [];
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const sorted = byDay.get(day).sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0));
    let current = null;
    for (const w of sorted) {
      if (current && w.startTime <= current.endTime) {
        if (w.endTime > current.endTime) current.endTime = w.endTime;
        continue;
      }
      if (current) out.push(current);
      current = { ...w };
    }
    if (current) out.push(current);
  }
  return out;
};

/** Does a window contain this instant-of-week? start inclusive, end exclusive. */
export const windowCovers = (window, dayOfWeek, timeOfDay) =>
  window.dayOfWeek === dayOfWeek && window.startTime <= timeOfDay && timeOfDay < window.endTime;

/**
 * A session instant -> the business-local { dayOfWeek, timeOfDay } these windows speak in.
 *
 * Uses Intl rather than date maths so the IANA database supplies the DST rules. On the US
 * "spring forward" Sunday there is no 02:30 local at all, and on "fall back" 01:30 happens
 * twice; Intl resolves both the way a wall clock in the gym would, which is the semantics a
 * client means when they say they are free at 1:30.
 */
const slotFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const sessionSlot = (instant) => {
  // The null guard is load-bearing: new Date(null) is the 1970 epoch, NOT an invalid date, so
  // a missing session time would resolve to a real-looking Thursday slot in 1970 and match
  // whoever happens to be free then. Refuse instead of inventing a plausible answer.
  if (instant === null || instant === undefined || instant === '') return null;
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    slotFormatter.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  const dayOfWeek = WEEKDAY_INDEX[parts.weekday];
  if (dayOfWeek === undefined) return null;

  // Intl renders midnight as '24' in some ICU versions under hour12:false.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return { dayOfWeek, timeOfDay: `${hour}:${parts.minute}:${parts.second}` };
};
