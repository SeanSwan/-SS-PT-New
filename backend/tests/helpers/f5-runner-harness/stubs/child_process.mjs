/**
 * F5 harness — intercepted CHILD-PROCESS boundary.
 *
 * safe-migrate.mjs delegates each migration to
 *     spawn('npx', ['sequelize-cli','db:migrate', ..., '--to', <name>])
 * This module replaces the `child_process` specifier for the duration of a
 * harness run (see ../hooks.mjs) so the runner's real loop can be driven with
 * scripted per-migration outcomes, without running sequelize-cli or touching a
 * database.
 *
 * The runner's contract with this object is small and is reproduced faithfully:
 *   proc.stdout.on('data', fn) / proc.stderr.on('data', fn) / proc.on('exit', fn)
 * `exit` fires on a microtask AFTER it is registered, so the runner's handlers
 * are always attached first — the same ordering the real spawn gives it.
 */

let scenario = {
  /** Per-migration outcome, keyed by the value after `--to`. */
  byTarget: {},
  /** Outcome for any migration not named in byTarget. */
  default: { code: 0, stdout: '', stderr: '' },
  /** A runaway loop is a defect, not a slow test — fail loudly instead. */
  maxSpawns: 500,
};

const spawns = [];

export function setScenario(next) {
  scenario = { ...scenario, ...next };
}

export function getSpawns() {
  return spawns;
}

/** The `--to` target of every delegated invocation, in order. */
export function getSpawnTargets() {
  return spawns.map(s => s.target);
}

export function spawn(cmd, args) {
  const list = Array.isArray(args) ? args : [];
  const toIndex = list.indexOf('--to');
  const target = toIndex >= 0 ? list[toIndex + 1] : null;

  spawns.push({ cmd, args: list, target });

  if (spawns.length > scenario.maxSpawns) {
    throw new Error(
      `F5 harness: runaway delegation — ${spawns.length} spawns exceeded maxSpawns `
      + `(${scenario.maxSpawns}). The runner is no longer stopping at the first `
      + `genuine failure, which is the M-01 defect.`,
    );
  }

  const outcome = (target && scenario.byTarget[target]) || scenario.default;

  const dataHandlers = { stdout: [], stderr: [] };
  const exitHandlers = [];

  const proc = {
    stdout: {
      on(event, fn) {
        if (event === 'data') dataHandlers.stdout.push(fn);
        return this;
      },
    },
    stderr: {
      on(event, fn) {
        if (event === 'data') dataHandlers.stderr.push(fn);
        return this;
      },
    },
    on(event, fn) {
      if (event === 'exit') {
        exitHandlers.push(fn);
        queueMicrotask(fire);
      }
      return this;
    },
    kill() { return true; },
  };

  function fire() {
    if (outcome.stdout) {
      for (const fn of dataHandlers.stdout) fn(Buffer.from(outcome.stdout));
    }
    if (outcome.stderr) {
      for (const fn of dataHandlers.stderr) fn(Buffer.from(outcome.stderr));
    }
    for (const fn of exitHandlers) fn(outcome.code, null);
  }

  return proc;
}
