/**
 * spendLedger.mjs — the day-scoped usage counter both paid lanes are gated on.
 *
 * ── WHY THIS FILE EXISTS SEPARATELY FROM spendGuard.mjs ─────────────────────
 * The counter was born inside the VIDEO spend guard and, for as long as it lived
 * there, nothing outside video could reach it without importing a video module.
 * The image lane needed exactly the same counter, and the cheapest wrong answer
 * would have been to write a second one — two implementations of the same money
 * gate, drifting apart, each with its own corruption semantics. So the counter
 * moved here, lane-neutral, and spendGuard re-exports it unchanged.
 *
 * ── WHAT A LEDGER IS FOR, STATED PLAINLY ────────────────────────────────────
 * A per-request price check stops ONE runaway batch. It does not stop fifty
 * separate ones, and a "daily ceiling" that is only ever compared against zero
 * is not a daily ceiling — it is a per-request ceiling wearing a day's name.
 * This file is the accumulation that makes the word "daily" true.
 *
 * ── KNOWN LIMIT, NAMED RATHER THAN DISCOVERED ───────────────────────────────
 * This is a file on local disk. On a host whose filesystem is ephemeral, a
 * redeploy resets the day's count and buys back a full budget. That is an
 * acceptable trade while the thing being counted is one operator's renders on
 * one machine — which is the whole design of the local-first lane — and it stops
 * being acceptable the moment hosted generation is enabled in production for
 * more than one operator. THAT is the trigger for moving these two integers into
 * a table, and it is a trigger, not a someday.
 */


/** UTC day key. UTC rather than local so a timezone shift cannot silently reset a ledger. */
export function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * A tiny day-scoped usage ledger on local disk.
 *
 * Deliberately not a database. The thing being counted is one operator's runs on one
 * machine, and a schema migration to hold two integers would be a worse trade than a
 * JSON file that a human can read and delete.
 *
 * KNOWN LIMIT, stated rather than discovered: two agents on the same machine sharing a
 * ledger file can interleave a read and a write and undercount. For one operator on one
 * workstation that is not a real scenario; if it becomes one, this is the piece that
 * moves server-side, which is where the commitment pointed in the first place.
 */
export function makeFileLedger(path, fs) {
  let degraded = false;
  const read = () => {
    try {
      const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
      degraded = false;
      return (raw && typeof raw === 'object') ? raw : {};
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
      degraded = err && err.code !== 'ENOENT' && !/ENOENT/.test(String(err.message));
      return {};
    }
  };

  return {
    usageFor(day) {
      const all = read();
      const rec = all[day] || {};
      return {
        runs: Number(rec.runs) || 0,
        spendUsd: Number(rec.spendUsd) || 0,
        // True only when the file existed and could not be parsed. Consumed by
        // checkRunAllowed to refuse billing providers while leaving free ones alone.
        degraded,
      };
    },
    record(day, { runs = 1, spendUsd = 0 } = {}) {
      // MONOTONIC. A negative delta buys back headroom — an external reviewer probed this
      // and drove a recorded 5 runs / $5 back down to 1 / $1, which would let any caller
      // that can reach the ledger mint unlimited quota. Usage only ever goes up; a refund
      // is not a spend-guard concern, and if it ever becomes one it needs its own audited
      // path rather than a sign flip on the counter.
      const dRuns = Math.max(0, Number(runs) || 0);
      const dSpend = Math.max(0, Number(spendUsd) || 0);
      const all = read();
      const rec = all[day] || { runs: 0, spendUsd: 0 };
      // Rounded to a hundredth of a cent on every write. Binary floats do not hold decimal
      // money: three $0.0039 renders accumulate to 0.011699999999999999, and a file whose
      // job is to be read by a person should not show that. Six places is far finer than
      // any provider bills and keeps the drift from compounding across a day of writes.
      const next = {
        runs: (Number(rec.runs) || 0) + dRuns,
        spendUsd: Math.round(((Number(rec.spendUsd) || 0) + dSpend) * 1e6) / 1e6,
      };
      // Keep only the last 30 days. An append-forever ledger is a slow leak, and older
      // rows answer no question this guard asks.
      const trimmed = Object.fromEntries(
        Object.entries({ ...all, [day]: next }).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 30),
      );
      // WRITE VIA TEMP + RENAME where the filesystem offers it. The 30-day trim REWRITES
      // the whole file, so a crash or a full disk partway through leaves truncated JSON —
      // which this same module then reads as CORRUPT and uses to refuse every billed
      // request. The failure mode the ledger exists to survive was reachable through the
      // ledger's own housekeeping. rename(2) is atomic within a filesystem, so a reader
      // sees either the old file or the new one and never half of either.
      // Falls back to a direct write when `fs` has no renameSync — the injected
      // test doubles do not, and they are not racing anything.
      const data = JSON.stringify(trimmed, null, 2);
      if (typeof fs.renameSync === 'function') {
        const tmp = `${path}.tmp`;
        fs.writeFileSync(tmp, data);
        fs.renameSync(tmp, path);
      } else {
        fs.writeFileSync(path, data);
      }
      return next;
    },
  };
}
