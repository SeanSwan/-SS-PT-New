import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'migrations/20260711000000-enforce-one-open-shopping-cart.cjs'),
  'utf8',
);

describe('single active shopping cart migration', () => {
  it('deterministically closes duplicates before adding a partial unique index', () => {
    expect(migration).toMatch(/HAVING COUNT\(\*\) > 1/);
    expect(migration).toMatch(/MULTIPLE_PENDING_CARTS_REQUIRE_RECONCILIATION/);
    expect(migration).toMatch(/CASE WHEN status = 'pending_payment' THEN 0 ELSE 1 END/);
    expect(migration).toMatch(/sequelize\.transaction/);
    expect(migration).toMatch(/LOCK TABLE shopping_carts IN SHARE ROW EXCLUSIVE MODE/);
    expect(migration).toMatch(/ROW_NUMBER\(\) OVER/);
    expect(migration).toMatch(/PARTITION BY "userId"/);
    expect(migration).toMatch(/SET status = 'cancelled'/);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS shopping_carts_one_open_per_user/);
    expect(migration).toMatch(/WHERE status IN \('active', 'pending_payment'\)/);
  });
});
