/**
 * leadRoutesInputValidation.test.mjs — HR-005-1 / HR-005-2 regression lock.
 * =========================================================================
 * The lead list endpoint (GET /api/leads) must:
 *  1. WHITELIST the sort column — an arbitrary ?sortBy=... previously went straight
 *     into ORDER BY, so ?sortBy=notacolumn -> Postgres "column does not exist" -> 500
 *     (reachable by any authenticated admin/trainer). Not SQL injection (Sequelize
 *     quotes the identifier) but a robustness/DoS-on-self gap.
 *  2. CLAMP page/limit — ?page=0 -> negative OFFSET, ?limit=-1 -> negative LIMIT,
 *     ?page=abc -> NaN; all -> Postgres error -> 500.
 * Source-lock (the route needs a live app+DB to exercise end-to-end); the clamp /
 * whitelist LOGIC is proven here by replicating it.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../../routes/leadRoutes.mjs'), 'utf8');

const SORTABLE = ['createdAt', 'updatedAt', 'score', 'nextFollowUpAt', 'lastContactedAt', 'status', 'firstName', 'lastName', 'email', 'contactCount'];
const sortCol = (s) => (SORTABLE.includes(s) ? s : 'createdAt');
const clampPage = (p) => Math.max(1, parseInt(p, 10) || 1);
const clampLimit = (l) => Math.min(Math.max(1, parseInt(l, 10) || 50), 100);

describe('HR-005 lead list input validation', () => {
  it('whitelists sortBy (arbitrary/unknown column falls back to createdAt)', () => {
    expect(sortCol('notacolumn')).toBe('createdAt');
    expect(sortCol('score')).toBe('score');
    expect(sortCol('x"; DROP TABLE leads;--')).toBe('createdAt');
  });

  it('clamps page to >= 1 (no negative OFFSET)', () => {
    expect(clampPage('0')).toBe(1);
    expect(clampPage('-5')).toBe(1);
    expect(clampPage('abc')).toBe(1);
    expect((clampPage('0') - 1) * clampLimit('50')).toBeGreaterThanOrEqual(0);
  });

  it('clamps limit to 1..100 (no negative/zero/huge LIMIT)', () => {
    expect(clampLimit('-1')).toBe(1);
    expect(clampLimit('0')).toBe(1);
    expect(clampLimit('9999')).toBe(100);
    expect(clampLimit('25')).toBe(25);
  });

  it('source-lock: route whitelists the sort column and clamps pagination', () => {
    expect(src).toMatch(/SORTABLE_LEAD_FIELDS/);
    expect(src).toMatch(/order:\s*\[\[sortColumn, sortDir\]\]/);
    expect(src).toMatch(/limit:\s*limitNum/);
    // the buggy unclamped forms must be gone
    expect(src).not.toMatch(/order:\s*\[\[sortBy,/);
    expect(src).not.toMatch(/Math\.min\(parseInt\(limit\), 100\)/);
  });
});
