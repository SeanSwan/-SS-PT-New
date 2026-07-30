/**
 * ============================================================================
 * FILE: workoutSessionQuery.test.mjs
 * PURPOSE: Lock the list-query validation that was ported onto the live endpoint.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-30 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * routes/workoutSessionRoutes.mjs validated its list query carefully — bounded
 * limit, sort allowlist, date parsing — and that route was UNREACHABLE.
 * `/api/workout` is mounted ahead of `/api/workout/sessions`, so every real list
 * request was answered by workoutController.getWorkoutSessions, which parsed
 * `limit` with a bare parseInt and passed it into the query with NO CAP:
 * `?limit=1000000` was a valid request. The validation guarded a door nobody could
 * open while the door everyone used had none.
 *
 * The helpers were MOVED (not copied) into utils/workoutSessionQuery.mjs and wired
 * into the live controller. These tests pin the behaviour that now protects it.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  parseSessionListQuery,
  parsePositiveInteger,
  parseDateQuery,
  SORT_FIELDS,
} from '../../utils/workoutSessionQuery.mjs';

describe('parseSessionListQuery — the unbounded-limit gap is closed', () => {
  it('clamps an absurd limit instead of passing it to the query', () => {
    const r = parseSessionListQuery({ limit: '1000000' });
    expect(r.ok).toBe(true);
    expect(r.value.limit).toBe(MAX_PAGE_SIZE);
  });

  it('leaves limit and offset UNDEFINED when the caller sends nothing', () => {
    // Pre-existing contract: the SERVICE owns the defaults. Returning 0/10 here
    // would look harmless and would quietly take that ownership away.
    const r = parseSessionListQuery({});
    expect(r.ok).toBe(true);
    expect(r.value.limit).toBeUndefined();
    expect(r.value.offset).toBeUndefined();
  });

  it('CLAMPS page<1 rather than rejecting it (pre-existing behaviour)', () => {
    // The retired router 400'd this. This endpoint has always clamped, and
    // callers sending page=0 get results today — turning that into a 400 while
    // "porting validation" would be a breaking change smuggled in as hardening.
    expect(parseSessionListQuery({ page: '0', limit: '10' }).value.offset).toBe(0);
    expect(parseSessionListQuery({ page: '-5', limit: '10' }).value.offset).toBe(0);
    expect(parseSessionListQuery({ page: 'abc', limit: '10' }).value.offset).toBe(0);
  });

  it.each(['abc', '0', '-5', '1.5', '1e3', '', ' '])('rejects limit %j with a 400-able message', (limit) => {
    const r = parseSessionListQuery({ limit });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Invalid limit/);
  });
});

describe('parseSessionListQuery — pagination contract preserved', () => {
  it('translates page -> offset the way the live consumer expects', () => {
    // useDashboardQueries.useWorkoutSessions sends { limit, page }. Page 3 at 10
    // per page must skip 20, or pagination beyond page 1 silently returns page 1.
    const r = parseSessionListQuery({ page: '3', limit: '10' });
    expect(r.value.offset).toBe(20);
    expect(r.value.limit).toBe(10);
  });

  it('uses the default page size for page maths when limit is omitted', () => {
    const r = parseSessionListQuery({ page: '2' });
    expect(r.value.offset).toBe(DEFAULT_PAGE_SIZE);
  });

  it('lets an explicit offset win over page (back-compat with older callers)', () => {
    const r = parseSessionListQuery({ offset: '55', page: '9', limit: '10' });
    expect(r.value.offset).toBe(55);
  });

  it('accepts offset 0, which is a legitimate value and not "missing"', () => {
    const r = parseSessionListQuery({ offset: '0' });
    expect(r.ok).toBe(true);
    expect(r.value.offset).toBe(0);
  });

  it('rejects a malformed offset rather than silently starting at 0', () => {
    const r = parseSessionListQuery({ offset: 'abc' });
    expect(r.ok).toBe(false);
  });
});

describe('parseSessionListQuery — sort is an allowlist, not a passthrough', () => {
  it('accepts a known sort field', () => {
    const r = parseSessionListQuery({ sort: 'date' });
    expect(r.ok).toBe(true);
    expect(r.value.sort).toBe('date');
  });

  it.each(['id; DROP TABLE sessions', 'password', 'unknownColumn'])(
    'rejects unknown sort %j',
    (sort) => {
      const r = parseSessionListQuery({ sort });
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/Invalid sort/);
    },
  );

  it('normalises order and rejects anything that is not asc/desc', () => {
    expect(parseSessionListQuery({ order: 'asc' }).value.order).toBe('ASC');
    expect(parseSessionListQuery({ order: 'DESC' }).value.order).toBe('DESC');
    expect(parseSessionListQuery({ order: 'sideways' }).ok).toBe(false);
  });

  it('ACCEPTS the retired router sortBy/sortDirection spelling', () => {
    // Callers built against the deleted contract now land on the live endpoint.
    // Silently dropping their sort would be a behaviour regression dressed up as
    // a cleanup, so both vocabularies are honoured.
    const r = parseSessionListQuery({ sortBy: 'duration', sortDirection: 'asc' });
    expect(r.ok).toBe(true);
    expect(r.value.sort).toBe('duration');
    expect(r.value.order).toBe('ASC');
  });

  it('applies the allowlist to sortBy too, not just sort', () => {
    expect(parseSessionListQuery({ sortBy: 'evil' }).ok).toBe(false);
  });
});

describe('parseSessionListQuery — dates', () => {
  it('treats absent dates as no filter', () => {
    const r = parseSessionListQuery({});
    expect(r.ok).toBe(true);
    expect(r.value.startDate).toBeNull();
  });

  it('parses a valid date', () => {
    const r = parseSessionListQuery({ startDate: '2026-01-15' });
    expect(r.value.startDate).toBeInstanceOf(Date);
  });

  it.each(['notadate', '2026-13-45'])('rejects unparseable date %j', (startDate) => {
    expect(parseSessionListQuery({ startDate }).ok).toBe(false);
  });
});

describe('the moved helpers kept their contracts', () => {
  it('parsePositiveInteger clamps to maxValue', () => {
    expect(parsePositiveInteger('999', 'limit', 100)).toEqual({ ok: true, value: 100 });
  });

  it('parseDateQuery reports the label it was given', () => {
    expect(parseDateQuery('nope', 'endDate').message).toBe('Invalid endDate');
  });

  it('SORT_FIELDS still carries the columns the retired router allowed', () => {
    for (const field of ['date', 'createdAt', 'duration', 'intensity', 'status']) {
      expect(SORT_FIELDS.has(field)).toBe(true);
    }
  });
});
