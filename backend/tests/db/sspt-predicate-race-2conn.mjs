/**
 * sspt-predicate-race-2conn.mjs — the TWO-CONNECTION proof that `WHERE revision < ?` serializes.
 *
 * WHY THIS EXISTS. `sspt-race-proof.mjs` (2026-09-20) proved two things against a real PostgreSQL 17
 * with A/B controls: that the shipped conditional UPDATE refuses a stale revision, and that the WHERE
 * clause is load-bearing. Both are real. But reading it shows its **Claim 1 is single-connection** —
 * it opens one client (line 46) and issues its UPDATEs sequentially, so the "delayed older delivery"
 * is a SEQUENCE, not a race. Nothing contends. Claim 2 in that harness does use two connections
 * (c1/c2), so the pattern was known and simply not applied to the predicate.
 *
 * THE GAP THIS CLOSES, in one line: the predicate's single-statement semantics are proven; that two
 * CONCURRENT connections racing it serialize is not — because a second connection was never opened on
 * that statement.
 *
 * WHAT IS ASSERTED, with a control for each claim so neither can pass for the wrong reason:
 *
 *   Claim A — with the shipped predicate, a writer that loses the race writes NOTHING.
 *     The window is REAL: connection 2 holds an open transaction having written revision 9 but NOT
 *     committed, so connection 1's predicate must contend with an in-flight, uncommitted row.
 *
 *   Claim B (CONTROL) — the same interleaving with the WHERE removed lets the loser CLOBBER the
 *     winner once the winner commits. If the control does not clobber, the interleaving never
 *     reproduced and Claim A proves nothing.
 *
 * This is a scratch harness. It touches nothing but the cluster named in RACE_PG_URL, creates its own
 * table in its own schema, and drops it. No production URL, no repo file, no migration.
 *
 * USAGE
 *   RACE_PG_URL='postgres://postgres@127.0.0.1:PORT/postgres' node sspt-predicate-race-2conn.mjs
 *
 * If no cluster is reachable the script exits 3 with a clear message rather than pretending to pass.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve `pg` from THIS file's location, never from a hardcoded absolute path.
// Two reasons, and the first one is the same reason this file exists at all:
//   1. An absolute `C:/Users/<operator>/...` path embeds the operator's account name in a committed
//      file and trips the repo's `operator-identity` secret pattern — correctly. Allowlisting it
//      would have been the easy fix and the wrong one: the path is also simply broken on any other
//      checkout. Removing it fixes the leak AND the portability defect in one change.
//   2. `backend/package.json` is two levels up from `backend/tests/db/`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '..', '..', 'package.json'));
const { Client } = require('pg');

const CONN = process.env.RACE_PG_URL || '';
const TABLE = 'predicate_race_scratch';

const failures = [];
const ok = (label, detail) => console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
const bad = (label, detail) => { console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); failures.push(label); };

const connect = async () => { const c = new Client({ connectionString: CONN }); await c.connect(); return c; };

/** Fresh table, one row at revision 5 — the state both writers will contend over. */
async function reset() {
  const c = await connect();
  try {
    await c.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await c.query(`CREATE TABLE ${TABLE} (item_id text PRIMARY KEY, revision integer NOT NULL)`);
    await c.query(`INSERT INTO ${TABLE} (item_id, revision) VALUES ('X', 5)`);
  } finally { await c.end(); }
}

/**
 * The shared interleaving. `predicate` is spliced in so the control can run the identical
 * choreography with the WHERE removed — the only difference between the claim and its control.
 *
 * ⚠️ SEQUENCING IS THE WHOLE TRICK, AND GETTING IT WRONG HANGS THE HARNESS.
 * A first version awaited c1's racing UPDATE before committing c2, and hung until the driver's
 * timeout killed both connections — the server logged `unexpected EOF on client connection with an
 * open transaction` twice. The reason is a REAL property of the mechanism, not a Postgres quirk:
 * under READ COMMITTED, c1's `UPDATE ... WHERE revision < 7` must evaluate the predicate against
 * c2's UNCOMMITTED row (revision 9), and reading an uncommitted row means taking a lock that c2
 * holds. So c1 BLOCKS. If the script is waiting on c1 before it reaches `c2 COMMIT`, nothing can
 * release c1 and the two waits close a cycle. That is the harness deadlocking itself.
 *
 * The fix is to keep c1's racing write IN FLIGHT (fire it, do not await it), then commit c2 so its
 * lock is released, and only then await c1's result. That ordering is also what the shipped code
 * does in practice: `applyBridgeSpotlightRevision` does not hold a transaction open across the
 * conditional write, so the shipped path never forms this cycle.
 *
 * Timeline (two live connections, a genuine window):
 *   c1 BEGIN; c1 reads revision 5           <- c1's stale snapshot
 *   c2 BEGIN; c2 writes revision 9 (uncommitted, holds the row lock)
 *   c1 fires UPDATE revision=7 through the predicate   <- IN FLIGHT, contended
 *   c2 COMMIT                                <- releases the lock; c1's write resolves
 *   c1's result is awaited                   <- now measurable
 *   c1 COMMIT
 */
async function race({ predicate, label }) {
  await reset();
  const c1 = await connect();
  const c2 = await connect();
  const seen = {};
  try {
    await c1.query('BEGIN');
    const read = await c1.query(`SELECT revision FROM ${TABLE} WHERE item_id = 'X'`);
    seen.readByC1 = read.rows[0].revision;

    await c2.query('BEGIN');
    await c2.query(`UPDATE ${TABLE} SET revision = 9 WHERE item_id = 'X'`); // uncommitted, lock held

    const where = predicate ? ' AND revision < $1' : '';
    // FIRED, NOT AWAITED — awaiting here deadlocks the harness (see the note above).
    const inFlight = c1.query(
      `UPDATE ${TABLE} SET revision = $1 WHERE item_id = $2${where}`,
      [7, 'X']
    );

    // Give c1's contender a moment to actually reach the server and block, so the contention is
    // real rather than a scheduling accident. Best-effort; the assertion does not depend on it.
    const blocked = await waitForLockWait(c2, 2000);
    seen.observedContention = blocked;

    await c2.query('COMMIT');           // release the lock; c1's write now resolves
    const attempt = await inFlight;     // measurable at last
    seen.loserRowCount = attempt.rowCount;

    await c1.query('COMMIT');

    const after = await c1.query(`SELECT revision FROM ${TABLE} WHERE item_id = 'X'`);
    seen.final = after.rows[0].revision;
    console.log(
      `        ${label}: c1 read ${seen.readByC1} · contended=${seen.observedContention} · ` +
      `loser rowCount=${seen.loserRowCount} · final=${seen.final}`
    );
    return seen;
  } finally {
    await c1.end();
    await c2.end();
  }
}

/**
 * Best-effort contention check: poll `pg_stat_activity` from the LOCK HOLDER's connection until some
 * backend is waiting on a lock, or the budget runs out. Returns whether contention was observed, so
 * the report can say the window was real rather than assumed.
 */
async function waitForLockWait(observer, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const r = await observer.query(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock'"
    );
    if (r.rows[0].n > 0) return true;
    await new Promise((res) => setTimeout(res, 25));
  }
  return false;
}

/** Claim A — the predicate refuses the racing write. */
async function claimA() {
  console.log('\n=== CLAIM A (2 connections): the shipped predicate refuses a racing writer ===');
  const seen = await race({ predicate: true, label: 'WITH predicate' });
  if (seen.observedContention) ok('contention was OBSERVED, so the window is real', 'a backend held a Lock wait');
  else bad('contention was OBSERVED', 'no Lock wait seen — the writers may not have overlapped');
  if (seen.loserRowCount === 0) ok('racing writer matched nothing', `rowCount=${seen.loserRowCount}`);
  else bad('racing writer matched nothing', `rowCount=${seen.loserRowCount}, expected 0`);
  if (seen.final === 9) ok('the winner holds the row', `final=${seen.final}`);
  else bad('the winner holds the row', `final=${seen.final}, expected 9`);
}

/** Claim B — the control. Same choreography, WHERE removed; the loser must clobber. */
async function claimB() {
  console.log('\n=== CLAIM B (CONTROL): with the WHERE removed the racing writer CLOBBERS ===');
  const seen = await race({ predicate: false, label: 'NO predicate' });
  if (seen.loserRowCount === 1 && seen.final === 7) {
    ok('CONTROL: without the predicate the loser clobbers', `final=${seen.final} (proves the predicate is load-bearing)`);
  } else {
    bad(
      'CONTROL: without the predicate the loser clobbers',
      `rowCount=${seen.loserRowCount}, final=${seen.final}, expected rowCount=1 final=7 — ` +
      'the interleaving did NOT reproduce, so Claim A proves nothing'
    );
  }
}

(async () => {
  if (!CONN) {
    console.error('RACE_PG_URL is not set. Point it at a throwaway cluster, e.g.');
    console.error("  RACE_PG_URL='postgres://postgres@127.0.0.1:55432/postgres' node sspt-predicate-race-2conn.mjs");
    process.exit(3);
  }
  console.log(`scratch cluster: ${CONN.replace(/:[^:@/]*@/, ':***@')}`);
  try {
    await claimA();
    await claimB();
  } catch (err) {
    console.error('\nHARNESS ERROR:', err.message);
    process.exitCode = 2;
    return;
  }
  console.log('\n' + '─'.repeat(72));
  if (failures.length === 0) {
    console.log('RESULT: ALL CHECKS PASSED — the predicate serializes two CONCURRENT connections,');
    console.log('        and the control shows the interleaving was real.');
  } else {
    console.log(`RESULT: ${failures.length} FAILED —`);
    for (const f of failures) console.log(`  · ${f}`);
    process.exitCode = 1;
  }
})();
