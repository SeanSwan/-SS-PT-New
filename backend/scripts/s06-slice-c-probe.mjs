/**
 * ============================================================================
 * FILE: s06-slice-c-probe.mjs — closes the proof gap for slice C (R-H04/H29).
 *
 * WHY THIS EXISTS
 *   Slice C claims `confirmSlotUsed` is exactly-once under concurrency because it
 *   uses a CONDITIONAL update (`where: { wasUsed: false }`) instead of a
 *   read-then-write guard. Its unit tests are MODEL-MOCKED: the harness's
 *   `update` is code the author wrote to return [0] or [1], so those tests prove
 *   the LOGIC given the model, not the DATABASE's behaviour.
 *
 *   This project's H02 justification is that four real defects were found ONLY by
 *   the real database and were invisible to the model-mocked suite. This probe
 *   applies the same standard to slice C's central claim.
 *
 * WHAT IT PROVES: two CONCURRENT connections issuing the same conditional update
 *   report 1 and 0 affected rows — so exactly one caller would increment.
 *
 * SCOPE: the owned disposable fixture only. Creates and drops a synthetic table;
 *   touches nothing else. Read-only with respect to production.
 *
 * RUN: node scripts/s06-slice-c-probe.mjs   (fixture must be up on 55089)
 * ============================================================================
 */

import pg from 'pg';

const DB = { host: '127.0.0.1', port: 55089, database: 'rolodex_s06_test', user: 'rolodex_s06_client' };
const TABLE = 's06_slice_c_probe';

const connect = async () => {
  const client = new pg.Client({ ...DB, password: null });
  await client.connect();
  return client;
};

/** One "confirmation": conditional update, then count only if it matched. */
const confirm = async (client) => {
  const result = await client.query(
    `update ${TABLE} set "wasUsed" = true where id = 1 and "wasUsed" = false`,
  );
  if (result.rowCount === 1) {
    await client.query(`update ${TABLE} set counter = counter + 1 where id = 1`);
  }
  return result.rowCount;
};

const setup = await connect();
await setup.query(`drop table if exists ${TABLE}`);
await setup.query(
  `create table ${TABLE} (id integer primary key, "wasUsed" boolean not null default false, counter integer not null default 0)`,
);
await setup.query(`insert into ${TABLE} (id, "wasUsed", counter) values (1, false, 0)`);
await setup.end();

// Two INDEPENDENT connections, so the two updates genuinely race.
const a = await connect();
const b = await connect();
const [rowsA, rowsB] = await Promise.all([confirm(a), confirm(b)]);
await a.end();
await b.end();

const verify = await connect();
const { rows } = await verify.query(`select "wasUsed", counter from ${TABLE} where id = 1`);
await verify.query(`drop table if exists ${TABLE}`);
await verify.end();

const affected = [rowsA, rowsB].sort();
const uniqueClaimants = affected.filter((n) => n === 1).length;

console.log(JSON.stringify({
  affectedRows: affected,
  uniqueClaimants,
  finalCounter: rows[0].counter,
  finalWasUsed: rows[0].wasUsed,
  exactlyOnce: uniqueClaimants === 1 && rows[0].counter === 1,
}, null, 2));

process.exitCode = uniqueClaimants === 1 && rows[0].counter === 1 ? 0 : 1;
