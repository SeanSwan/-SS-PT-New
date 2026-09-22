/**
 * usageLedger.mjs — the day-scoped usage ledger on local disk.
 *
 * Split out of `spendGuard.mjs` for rule 4: that file is the JUDGEMENT (may this run
 * proceed against a ceiling) and this one is the PERSISTENCE it reads. The seam is real
 * rather than arithmetic — the guard is pure and takes `usage` as an argument, which is
 * exactly what makes it testable without a filesystem. `spendGuard.mjs` re-exports
 * `makeFileLedger` and `dayKey`, so every existing import path is unchanged.
 *
 * ── WHY NOT A DATABASE ──────────────────────────────────────────────────────
 * Deliberately not one. The thing being counted is one operator's runs on one machine,
 * and a schema migration to hold two integers would be a worse trade than a JSON file
 * that a human can read and delete.
 *
 * KNOWN LIMIT, stated rather than discovered: two agents on the same machine sharing a
 * ledger file can interleave a read and a write and undercount. For one operator on one
 * workstation that is not a real scenario; if it becomes one, this is the piece that
 * moves server-side, which is where the licensing commitment pointed in the first place.
 *
 * ── THE PER-CALLER SPLIT IS ADDITIVE, NOT A SCHEMA CHANGE ────────────────────
 * `callers` is written beside the global `runs`/`spendUsd` rather than replacing them,
 * and a file written before it existed is read as "no split recorded" rather than as an
 * error or as an empty split. Those three readings are not equivalent: an empty split
 * says every caller has used nothing, while an absent one says nobody recorded who spent
 * what. `ceilingGate.callerRefusal` is what tells them apart, and it refuses only when a
 * per-caller cap is actually configured.
 *
 * ── READING AND WRITING ARE THE SAME JUDGEMENT (round 21) ────────────────────
 * Every round before 21 attacked `usageFor`. It now refuses a file it cannot parse, a day
 * whose shape is wrong and a count that is not a count. `record` was the half nobody
 * attacked, and it undid all three:
 *
 *   1. A corrupt file reads as `{}` and degrades. The FREE lane is deliberately still
 *      allowed to run while degraded, and its `record()` wrote `{...{}, [day]: next}` —
 *      a file that parses, carrying one day, with the corruption gone. `degraded` cleared
 *      and billing resumed against a counter rebuilt from nothing. Measured: $40 recorded
 *      of a $50 ceiling, file truncated, ONE free run, then a $12 run admitted.
 *   2. The 30-day trim sorted descending and sliced 30, so a day outside the window was
 *      discarded while `record()` still returned its total. 30 FUTURE-dated days planted
 *      in the file are valid JSON holding valid counts — so nothing degrades, and today's
 *      usage is evicted on every write. The anti-truncation fix detects a file it cannot
 *      parse, not one that forgets.
 *   3. A write that failed threw from `generateVideo.mjs:207`, after `adapter.generate`
 *      had already returned — converting a completed, already-billed render into a job
 *      failure. And because ENOENT is deliberately excluded from the read fault, the same
 *      path read as a fresh ledger forever: the ceiling never bound and every job failed
 *      after succeeding.
 *
 * The rule that closes all three: **the writer makes the same judgement as the reader.**
 * A total this module cannot read is one it must not add to, and a write that did not
 * land is the same unknown as a read that did not. `dayRecordIsTrustworthy` is the one
 * predicate both halves call, so they cannot drift.
 */

/** UTC day key. UTC rather than local so a timezone shift cannot silently reset a ledger. */
export function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** How many days of history the file keeps. An append-forever ledger is a slow leak. */
const RETAIN_DAYS = 30;

/** A count: a finite non-negative number. Anything else is not an answer to "how many". */
const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * May this day be written to?
 *
 * ONE predicate, called by BOTH halves of this module: `usageFor` uses it to decide
 * whether a day's totals can be trusted, and `record` uses it to decide whether that day
 * may be added to at all. Two copies of this rule would agree until someone edited one,
 * and the disagreement is exactly the round-21 defect — a reader that refuses a value the
 * writer goes on to replace.
 *
 * `true` for an ABSENT day, because absent is a fresh day and that is the normal case.
 * `false` for anything this module could not have written: a string, an array, or a
 * record carrying a value that is not a count. Those are not "empty", they are
 * UNREADABLE — and writing over one does not repair it, it replaces a total nobody can
 * verify with one this code invented, in the one file whose job is to be the truth about
 * what was spent.
 */
export function dayRecordIsTrustworthy(rec) {
  if (rec === undefined || rec === null) return true;
  if (typeof rec !== 'object' || Array.isArray(rec)) return false;
  if (rec.runs !== undefined && !isCount(rec.runs)) return false;
  if (rec.spendUsd !== undefined && !isCount(rec.spendUsd)) return false;
  return true;
}

/**
 * The newest `RETAIN_DAYS` days, but ALWAYS including `day`.
 *
 * The old expression was `.slice(0, 30)` and nothing more, so a day that sorted outside
 * the window was dropped while `record()` returned its total as though it had been kept —
 * a ceiling enforced against a row that no longer exists. Keeping the recorded day costs
 * one slot of history, and displaces the OLDEST retained entry rather than the newest,
 * because the newest are the ones a reader is most likely to ask about.
 */
function trimKeeping(merged, day) {
  const kept = Object.entries(merged).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, RETAIN_DAYS);
  if (!kept.some(([k]) => k === day)) kept[kept.length - 1] = [day, merged[day]];
  return Object.fromEntries(kept);
}

export function makeFileLedger(path, fs) {
  // TWO faults, deliberately separate.
  //
  // `readFault` is RECOMPUTED on every read, because a repaired file must stop being
  // degraded the moment it is repaired.
  //
  // `writeFault` is STICKY until a write actually lands, because a read cannot clear it:
  // the file being parseable says nothing about whether the spend was recorded, and that
  // is the only question the ceiling asks. Collapsing the two is what let a successful
  // read quietly forgive a write that had failed.
  let readFault = false;
  let writeFault = false;
  const degraded = () => readFault || writeFault;

  const read = () => {
    try {
      const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
      // NOT A LEDGER. An array passes `typeof === 'object'` and would spread its INDICES
      // into the day map on the next write, so a file of `[1,2,3]` would become a ledger
      // with three days named 0, 1 and 2.
      const shaped = raw !== null && typeof raw === 'object' && !Array.isArray(raw);
      readFault = !shaped;
      return { all: shaped ? raw : {}, ok: shaped };
    } catch (err) {
      // A MISSING ledger is simply a fresh day and reads as zero.
      //
      // A CORRUPT one is different, and conflating them was the defect: truncating this
      // file to "{" resets the day's usage, and anyone with disk access to the worker can
      // do that. Blanket fail-open turned a counter into an unlimited-quota exploit.
      //
      // So corruption is recorded and the ceiling degrades ASYMMETRICALLY: the free local
      // path keeps running (a bookkeeping problem must not become an outage) while
      // anything that spends money is refused until the ledger is readable again.
      readFault = err && err.code !== 'ENOENT' && !/ENOENT/.test(String(err.message));
      return { all: {}, ok: !readFault };
    }
  };

  return {
    usageFor(day) {
      const { all } = read();
      const raw = all[day];
      // A RECORD THAT IS NOT A RECORD. `read()` already refuses a file it cannot parse;
      // this refuses a day entry whose SHAPE is wrong, because `rec.runs` on a string is
      // `undefined` and `undefined` is indistinguishable from "absent" further down.
      if (!dayRecordIsTrustworthy(raw)) readFault = true;
      const rec = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

      // PER-CALLER SPLIT, ADDITIVE. A day written before per-caller tracking existed has
      // no `callers` key, and that must not be an error — it is a fact about the file's
      // age. It is reported as-is (`undefined`) rather than defaulted to `{}`, because
      // `{}` would say "every caller has used nothing" and an absent split says "nobody
      // recorded who spent what".
      //
      // Deliberately NOT folded into `degraded`: a malformed per-caller split is a problem
      // with the per-caller ceiling, and degrading the global one as well would stop
      // billing for a bookkeeping fault that does not affect the global total.
      const callers = rec.callers && typeof rec.callers === 'object' && !Array.isArray(rec.callers)
        ? rec.callers : undefined;

      return {
        runs: isCount(rec.runs) ? rec.runs : 0,
        spendUsd: isCount(rec.spendUsd) ? rec.spendUsd : 0,
        // Present only when the file actually carries a split. See above.
        callers,
        // True when the file could not be parsed, when a value in it cannot be a count, or
        // when the last write did not land. Consumed by checkRunAllowed to refuse billing
        // providers while leaving free ones alone — the same asymmetric degradation, for the
        // same reason.
        degraded: degraded(),
      };
    },
    record(day, { runs = 1, spendUsd = 0, caller = null } = {}) {
      // MONOTONIC. A negative delta buys back headroom — an external reviewer probed this
      // and drove a recorded 5 runs / $5 back down to 1 / $1, which would let any caller
      // that can reach the ledger mint unlimited quota. Usage only ever goes up; a refund
      // is not a spend-guard concern, and if it ever becomes one it needs its own audited
      // path rather than a sign flip on the counter.
      const dRuns = Math.max(0, Number(runs) || 0);
      const dSpend = Math.max(0, Number(spendUsd) || 0);
      const { all, ok } = read();

      // ── DO NOT WRITE OVER A LEDGER WE COULD NOT READ ────────────────────────
      // `read()` hands back `{}` for a corrupt file and `usageFor` turns that into
      // `degraded`, which is the right answer — and then the very next write erased it.
      // The free lane runs while degraded on purpose, so `record()` wrote
      // `{...{}, [day]: next}`: parseable, one day, corruption gone. `degraded` cleared
      // and billing resumed on a counter rebuilt from nothing. The refusal was undone by
      // the next write from the one lane exempt from it.
      //
      // Not recording costs nothing that was not already lost: while degraded, `usageFor`
      // reports zero, so the volume ceiling already cannot bind. What refusing buys is
      // that the corrupt file stays VISIBLE until a human does what the error message
      // already tells them to do — repair it or delete it.
      if (!ok) return null;

      const rec = all[day];
      // ── THE SAME RULE, ONE LEVEL DOWN ───────────────────────────────────────
      // The old expression was `all[day] || { runs: 0, spendUsd: 0 }` followed by
      // `Number(rec.runs) || 0`, which reads a string as an empty record and "many" as 0.
      // So a day whose totals could not be read was REPLACED by a day whose totals this
      // code invented — and the replacement parses, so `degraded` cleared. A day we
      // cannot read is a day we must not add to, for the reason `usageFor` already gives.
      if (!dayRecordIsTrustworthy(rec)) { readFault = true; return null; }
      const base = rec === undefined || rec === null ? { runs: 0, spendUsd: 0 } : rec;
      const next = {
        runs: (Number(base.runs) || 0) + dRuns,
        spendUsd: (Number(base.spendUsd) || 0) + dSpend,
      };

      // THE PER-CALLER SPLIT, also monotonic and also clamped at zero for the same reason.
      // Only written when a caller is named: a record with no attribution leaves the key
      // absent rather than inventing an "unknown" bucket a later reader would have to
      // interpret. `callerRefusal` treats an absent split as unknown, which is both the
      // fail-closed reading and the honest one.
      const who = String(caller ?? '').trim();
      const prev = (base.callers && typeof base.callers === 'object' && !Array.isArray(base.callers))
        ? base.callers : {};
      if (who) {
        // `Object.hasOwn` for the same reason `ceilingGate` uses it: a plain lookup would
        // resolve `constructor` / `__proto__` through the prototype chain and read a
        // function or `Object.prototype` as this caller's previous total.
        const before = Object.hasOwn(prev, who) && prev[who] && typeof prev[who] === 'object'
          ? prev[who] : {};
        // A COMPUTED key (`[who]:`) is an own data property even when `who` is `__proto__`,
        // unlike a literal `__proto__:` key which would set the prototype. That distinction
        // is why a caller may be named anything without polluting this object.
        next.callers = {
          ...prev,
          [who]: {
            runs: Math.max(0, Number(before.runs) || 0) + dRuns,
            spendUsd: Math.max(0, Number(before.spendUsd) || 0) + dSpend,
          },
        };
      } else if (Object.keys(prev).length) {
        // An unattributed run must not erase the split recorded for attributed ones.
        next.callers = prev;
      }

      // Keep only the last 30 days — but NEVER drop the day being recorded. Older rows
      // answer no question this guard asks; today's row is the one the ceiling is
      // computed from, and `trimKeeping` displaces the oldest retained entry instead.
      const trimmed = trimKeeping({ ...all, [day]: next }, day);

      try {
        fs.writeFileSync(path, JSON.stringify(trimmed, null, 2));
        writeFault = false;
      } catch (err) {
        // ── A WRITE THAT DID NOT LAND IS THE SAME UNKNOWN AS A READ THAT DID NOT ──
        // This call sits at `generateVideo.mjs:207`, AFTER `adapter.generate` has
        // returned, so throwing here turns a completed render — already billed, for a
        // billing provider — into a job failure. And ENOENT is deliberately excluded
        // from `readFault`, so a ledger path that cannot be written read as a fresh day
        // forever: the ceiling never bound and every job failed after succeeding.
        //
        // Degrading instead keeps the free lane running and refuses the next run that
        // would bill against a total that was never recorded. Unknown is not zero.
        writeFault = true;
        return null;
      }
      return next;
    },
  };
}
