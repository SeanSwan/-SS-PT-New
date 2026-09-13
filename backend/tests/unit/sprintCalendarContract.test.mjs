/**
 * ============================================================================
 * FILE: sprintCalendarContract.test.mjs — S07 / R-H06.
 *
 * The core claim: a sprint scaffolds the SAME calendar dates regardless of the
 * host timezone. Proved three ways:
 *   1. exact dates across both DST boundaries, leap years, year rollover and a
 *      non-Monday start
 *   2. a trap that makes the LOCAL date APIs throw, so any local-time access is
 *      a hard failure rather than a silent off-by-one
 *   3. a real subprocess run under TZ=America/Los_Angeles compared against the
 *      in-process UTC result
 * ============================================================================
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  buildSprintSchedule,
  computeEndDate,
  normalizeFocusRotation,
  normalizeFrequencyPattern,
  parseDateOnly,
  SprintCalendarValidationError,
  validateSprintCreateInput,
  weekdayIndexOf,
} from '../../services/bootcamp/sprintCalendarContract.mjs';

const schedule = (over = {}) => buildSprintSchedule({
  startDate: '2026-03-02',
  durationWeeks: 2,
  frequencyPattern: ['monday', 'wednesday', 'friday'],
  focusRotation: ['lower_body', 'upper_body', 'full_body'],
  ...over,
});

const allDates = (weeks) => weeks.flatMap(week => week.slots.map(slot => slot.scheduledDate));

describe('date-only primitives', () => {
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(parseDateOnly('2026-03-02')).toBe('2026-03-02');
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-3-2', '2026-03-02T00:00:00Z', '', 20260302, null, undefined]) {
      expect(() => parseDateOnly(bad)).toThrow(SprintCalendarValidationError);
    }
  });

  it('does calendar arithmetic that crosses leap years and year rollover', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
    expect(addCalendarDays('2025-02-28', 1)).toBe('2025-03-01'); // non-leap
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01'); // year rollover
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('reads the weekday in UTC', () => {
    expect(weekdayIndexOf('2026-03-02')).toBe(1); // Monday
    expect(weekdayIndexOf('2026-03-08')).toBe(0); // Sunday
  });

  it('computes the end date as start + durationWeeks*7 - 1 calendar days', () => {
    expect(computeEndDate('2026-03-02', 1)).toBe('2026-03-08');
    expect(computeEndDate('2026-03-02', 12)).toBe('2026-05-24');
    // Across a DST boundary the calendar result must not move.
    expect(computeEndDate('2026-03-02', 4)).toBe('2026-03-29');
  });
});

describe('input validation', () => {
  it('rejects a non-date-only start, bad durations and impossible counts', () => {
    expect(() => validateSprintCreateInput({ startDate: '2026-03-02T00:00:00Z' })).toThrow(/date-only/);
    expect(() => validateSprintCreateInput({ startDate: '2026-02-30' })).toThrow(/real calendar date/);
    // `null`/`undefined` mean OMITTED (the existing default applies); anything
    // else must be a real, in-range whole number of weeks.
    expect(validateSprintCreateInput({ startDate: '2026-03-02', durationWeeks: null }).durationWeeks).toBe(12);
    for (const weeks of [0, 53, 1.5, '12', Number.NaN, true]) {
      expect(() => validateSprintCreateInput({ startDate: '2026-03-02', durationWeeks: weeks }))
        .toThrow(SprintCalendarValidationError);
    }
  });

  it('rejects empty, duplicate, malformed and non-string weekdays instead of dropping them', () => {
    expect(() => normalizeFrequencyPattern([])).toThrow(/between 1 and 7/);
    expect(() => normalizeFrequencyPattern(['monday', 'Monday'])).toThrow(/duplicate weekday/);
    expect(() => normalizeFrequencyPattern(['monday', 3])).toThrow(/must be a string/);
    expect(() => normalizeFrequencyPattern(['funday'])).toThrow(/unknown weekday/);
    expect(() => normalizeFrequencyPattern(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toThrow(/between 1 and 7/);
  });

  it('trims and lowercases recognisable weekday tokens', () => {
    expect(normalizeFrequencyPattern(['  MONDAY ', 'Wednesday'])).toEqual(['monday', 'wednesday']);
  });

  it('rejects an empty or unsupported focus rotation', () => {
    expect(() => normalizeFocusRotation([])).toThrow(/must not be empty/);
    expect(() => normalizeFocusRotation(['lower_body', 'moon_phase'])).toThrow(/unsupported focus/);
    expect(() => normalizeFocusRotation([7])).toThrow(/must be a string/);
  });

  it('requires classesPerWeek to match the weekday count when supplied', () => {
    const base = { startDate: '2026-03-02', frequencyPattern: ['monday', 'wednesday'] };
    expect(validateSprintCreateInput(base).classesPerWeek).toBe(2);
    expect(() => validateSprintCreateInput({ ...base, classesPerWeek: 3 })).toThrow(/must match/);
  });

  it('preserves the existing omitted-field defaults', () => {
    const resolved = validateSprintCreateInput({ startDate: '2026-03-02' });
    expect(resolved.durationWeeks).toBe(12);
    expect(resolved.frequencyPattern).toEqual(['monday', 'wednesday', 'friday']);
    expect(resolved.focusRotation).toEqual(['lower_body', 'upper_body', 'full_body']);
  });
});

describe('schedule shape and rotation', () => {
  it('starts week one on the supplied start date and covers seven days per week', () => {
    const weeks = schedule({ durationWeeks: 3 });
    expect(weeks[0].startDate).toBe('2026-03-02');
    expect(weeks[0].endDate).toBe('2026-03-08');
    expect(weeks[1].startDate).toBe('2026-03-09');
    expect(weeks[2].startDate).toBe('2026-03-16');
  });

  it('places each chosen weekday exactly once inside its own week window', () => {
    const weeks = schedule({ durationWeeks: 4 });
    for (const week of weeks) {
      const dates = week.slots.map(slot => slot.scheduledDate);
      expect(dates).toHaveLength(3);
      for (const date of dates) {
        expect(date >= week.startDate && date <= week.endDate).toBe(true);
      }
      expect(new Set(dates).size).toBe(3);
      expect(dates.map(weekdayIndexOf).sort()).toEqual([1, 3, 5]); // Mon, Wed, Fri
    }
  });

  it('produces exactly durationWeeks * weekdayCount slots', () => {
    for (const [weeks, days] of [[1, 1], [4, 3], [12, 7], [52, 2]]) {
      const pattern = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, days);
      const built = schedule({ durationWeeks: weeks, frequencyPattern: pattern });
      expect(built).toHaveLength(weeks);
      expect(allDates(built)).toHaveLength(weeks * days);
    }
  });

  it('assigns the rotating focus chronologically, not in caller listing order', () => {
    // Friday listed first, but Monday is the earliest occurrence in the week.
    const weeks = schedule({
      durationWeeks: 1,
      frequencyPattern: ['friday', 'monday'],
    });
    expect(weeks[0].slots.map(slot => slot.scheduledDate)).toEqual(['2026-03-02', '2026-03-06']);
    expect(weeks[0].slots.map(slot => slot.dayType)).toEqual(['lower_body', 'upper_body']);
  });

  it('continues the rotation across weeks', () => {
    const weeks = schedule({ durationWeeks: 2, frequencyPattern: ['monday', 'wednesday', 'friday'] });
    expect(weeks[0].slots.map(slot => slot.dayType)).toEqual(['lower_body', 'upper_body', 'full_body']);
    expect(weeks[1].slots.map(slot => slot.dayType)).toEqual(['lower_body', 'upper_body', 'full_body']);
    const long = schedule({ durationWeeks: 2, frequencyPattern: ['monday', 'tuesday'] });
    expect(long[0].slots.map(slot => slot.dayType)).toEqual(['lower_body', 'upper_body']);
    expect(long[1].slots.map(slot => slot.dayType)).toEqual(['full_body', 'lower_body']);
  });

  it('keeps the ordinal weekNumber and the fourth-week scaffold fields', () => {
    const weeks = schedule({ durationWeeks: 5 });
    expect(weeks.map(week => week.weekNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(weeks[3]).toMatchObject({ isDeloadWeek: true, intensityModifier: 0.7, theme: 'Deload & Recovery' });
    expect(weeks[0]).toMatchObject({ isDeloadWeek: false, intensityModifier: 1.0, theme: null });
  });

  it('handles a non-Monday start', () => {
    const weeks = schedule({ startDate: '2026-03-05', durationWeeks: 1 }); // Thursday
    expect(weeks[0].startDate).toBe('2026-03-05');
    expect(weeks[0].endDate).toBe('2026-03-11');
    // Thursday start; the window is 2026-03-05..2026-03-11. The earliest chosen
    // weekday in that window is Friday 2026-03-06, and slots are chronological.
    expect(weeks[0].slots.map(slot => slot.scheduledDate))
      .toEqual(['2026-03-06', '2026-03-09', '2026-03-11']);
  });
});

describe('DST, leap year and rollover exactness', () => {
  it('is exact across the spring-forward boundary', () => {
    // US DST begins 2026-03-08.
    const weeks = schedule({ startDate: '2026-03-02', durationWeeks: 2 });
    expect(allDates(weeks)).toEqual([
      '2026-03-02', '2026-03-04', '2026-03-06',
      '2026-03-09', '2026-03-11', '2026-03-13',
    ]);
  });

  it('is exact across the autumn fall-back boundary', () => {
    // US DST ends 2026-11-01.
    const weeks = schedule({ startDate: '2026-10-26', durationWeeks: 2 });
    expect(allDates(weeks)).toEqual([
      '2026-10-26', '2026-10-28', '2026-10-30',
      '2026-11-02', '2026-11-04', '2026-11-06',
    ]);
  });

  it('is exact across a leap day and a year rollover', () => {
    expect(allDates(schedule({ startDate: '2024-02-26', durationWeeks: 1 })))
      .toEqual(['2024-02-26', '2024-02-28', '2024-03-01']);
    expect(allDates(schedule({ startDate: '2026-12-28', durationWeeks: 2, frequencyPattern: ['monday', 'friday'] })))
      .toEqual(['2026-12-28', '2027-01-01', '2027-01-04', '2027-01-08']);
  });
});

describe('timezone independence', () => {
  it('never touches the local-time date APIs', () => {
    const originalGetDay = Date.prototype.getDay;
    const originalSetDate = Date.prototype.setDate;
    const originalGetDate = Date.prototype.getDate;
    Date.prototype.getDay = function trapped() { throw new Error('local getDay() was used'); };
    Date.prototype.setDate = function trapped() { throw new Error('local setDate() was used'); };
    Date.prototype.getDate = function trapped() { throw new Error('local getDate() was used'); };
    try {
      expect(() => schedule({ durationWeeks: 4 })).not.toThrow();
    } finally {
      Date.prototype.getDay = originalGetDay;
      Date.prototype.setDate = originalSetDate;
      Date.prototype.getDate = originalGetDate;
    }
  });

  it('produces an identical schedule under UTC and America/Los_Angeles', () => {
    const moduleUrl = new URL('../../services/bootcamp/sprintCalendarContract.mjs', import.meta.url).href;
    const probePath = join(tmpdir(), `sprint-tz-probe-${process.pid}.mjs`);
    writeFileSync(probePath, [
      `import { buildSprintSchedule, computeEndDate } from ${JSON.stringify(moduleUrl)};`,
      "import { writeFileSync } from 'node:fs';",
      'const weeks = buildSprintSchedule({',
      "  startDate: '2026-03-02', durationWeeks: 12,",
      "  frequencyPattern: ['monday','wednesday','friday'],",
      "  focusRotation: ['lower_body','upper_body','full_body'],",
      '});',
      'writeFileSync(process.argv[2], JSON.stringify({',
      "  dates: weeks.flatMap(w => w.slots.map(s => s.scheduledDate)),",
      "  types: weeks.flatMap(w => w.slots.map(s => s.dayType)),",
      '  starts: weeks.map(w => w.startDate),',
      "  end: computeEndDate('2026-03-02', 12),",
      '  tz: process.env.TZ,',
      '}));',
    ].join('\n'), 'utf8');

    // HOSTILE-REVIEW FIX: this used to run ONE subprocess under TZ=America/
    // Los_Angeles and compare it against `schedule(...)` computed in the PARENT
    // process — i.e. under whatever TZ the host happens to have. On a host
    // already set to America/Los_Angeles both sides were LA and the test proved
    // nothing. Both sides are now subprocesses with an EXPLICIT TZ, so the
    // comparison cannot be satisfied by the host's configuration.
    const parity = [];
    const runProbe = (tz) => {
      const outPath = join(tmpdir(), `sprint-tz-${tz.replace(/\W/g, '_')}-${process.pid}.json`);
      parity.push(outPath);
      execFileSync(process.execPath, [probePath, outPath], {
        env: { ...process.env, TZ: tz },
        stdio: 'ignore',
      });
      return JSON.parse(readFileSync(outPath, 'utf8'));
    };

    try {
      const utc = runProbe('UTC');
      const la = runProbe('America/Los_Angeles');
      expect(utc.tz).toBe('UTC');
      expect(la.tz).toBe('America/Los_Angeles');

      const withoutTz = ({ tz, ...rest }) => rest;
      expect(withoutTz(la)).toEqual(withoutTz(utc));

      // Ground truth, so two hosts that are wrong the SAME way still fail.
      // 2026-03-02 is a Monday, so the first Monday/Wednesday/Friday slot is it.
      expect(utc.dates[0]).toBe('2026-03-02');
      expect(utc.starts[0]).toBe('2026-03-02');
      expect(utc.dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))).toBe(true);
    } finally {
      rmSync(probePath, { force: true });
      for (const path of parity) rmSync(path, { force: true });
    }
  });
});

describe('exported module path', () => {
  it('is the extracted module, not the service', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'services/bootcamp/sprintCalendarContract.mjs'), 'utf8',
    );
    // Strip comments first: the header deliberately NAMES the banned APIs to
    // explain the defect, so a raw grep would match the explanation.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('getDay()');
    expect(code).not.toContain('setDate(');
    expect(code).not.toContain('toISOString');
    expect(code).toContain('getUTCDay');
    expect(code).toContain('Date.UTC');
  });
});
