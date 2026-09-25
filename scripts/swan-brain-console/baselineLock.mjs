/**
 * baselineLock — name the resources an attempt really writes, and read the fleet they cover.
 * @module scripts/swan-brain-console/baselineLock
 *
 * WHY THIS MODULE EXISTS (Astra round 16, L01 — and it is a defect IN THAT ROUND'S OWN FIX)
 * `shot-diff.mjs` locks `resultPath ?? baselineDir` — ONE path, chosen as a fallback. Astra's
 * finding is that this is the wrong resource in the ordinary case, not the edge case:
 *
 *   `--update --result X`   writes X, AND it writes `docs/qa/baseline/three-worlds/*.png`.
 *                           It locks only X. Two such runs with different `--result` values hold
 *                           two different locks, share one baseline directory, and interleave.
 *   `--update` (no --result) writes the baselines and locks the directory — which is the resource
 *                           that run really uses, so this case was accidentally right.
 *   `--result X` (compare)  writes X only, and locks X. Right.
 *
 * So the lock was on a resource the run MIGHT write instead of one it DOES write, and the
 * exclusion those runs need is shared across the two schedules above. A `??` fallback reads as
 * "either/or"; what the caller has is "one or both", and only one of the two was being protected.
 *
 * THE REPAIR IS TO DERIVE THE SET FROM THE MODE, IN ONE PLACE.
 * A lock is a claim on a RESOURCE, so the module that knows which resources an attempt touches
 * is the module that must name them — rather than each lock site remembering the rule. `--update`
 * touches the baseline generation and the artifact; a compare touches the artifact. That is the
 * whole rule, and it is stated once, here, where a suite can drive it directly.
 *
 * ORDER IS PART OF THE CONTRACT: the baseline resource sorts BEFORE the result resource. A run
 * holding one and waiting on the other is therefore impossible between two runs that both want
 * the baseline, because they claim the same resource first. Named rather than left to callers.
 *
 * BOUNDS: `node:fs` reads of `baselineComparison.mjs` (for `BASELINE_DIR`) and the checkout
 * layout (for the baseline directory). No DOM, no browser, no argv, no clock.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/**
 * Resources the WRITE half of this subsystem names. Files that are only ever READ — the manifest
 * — are deliberately absent, and that is a scope line rather than an oversight: an attempt does
 * not modify the fleet manifest, so it is not a resource two attempts contend for. Stated here so
 * the omission cannot rot into an oversight as this set grows.
 */
export const LOCKABLE_RESOURCES = Object.freeze(['baseline-set', 'result-artifact']);

/**
 * The absolute path of a named resource, or null when the caller does not have one.
 *
 * `baseline-set` is resolved from `BASELINE_DIR` rather than re-derived, because a second
 * derivation of the same path is two things to keep in step — and a lock on a path computed
 * differently from the path actually written protects nothing while still reporting success.
 *
 * EVERY RETURNED PATH IS `resolve()`d, AND A LOCK THAT NAMES ITS RESOURCE TWO WAYS EXCLUDES
 * NOTHING. The lock file is `${resourcePath}.lock`, so `--result ./out/r.json` and
 * `--result C:/repo/out/r.json` would create two lock files for one artifact and both runs would
 * proceed — the L01 defect reached through spelling instead of through `??`. Resolving here means
 * every lock site inherits one spelling, because there is only one place a resource path is made.
 */
export function resourcePathFor(name, { repoRoot = REPO, baselineDir = null, resultPath = null } = {}) {
  const raw = name === 'baseline-set'
    ? (baselineDir ?? join(repoRoot, declaredBaselineDir()))
    : name === 'result-artifact' ? resultPath ?? null : null;
  if (raw === null) {
    if (name === 'result-artifact') return null;
    throw new Error(`${JSON.stringify(name)} is not a lockable resource — see LOCKABLE_RESOURCES`);
  }
  return resolve(raw);
}

/**
 * The baseline directory as `baselineComparison.mjs` declares it.
 *
 * READ FROM THE SOURCE RATHER THAN IMPORTED, and that is not laziness: `baselineComparison.mjs`
 * re-exports a browser-facing surface, and importing it into the lock path would make the lock's
 * module graph depend on the comparator. The constant is the thing that must not drift, so this
 * reads the one exported declaration and fails loudly if the shape changes — a silent `undefined`
 * here would produce a lock on `.../undefined.lock`, which protects nothing and looks fine.
 */
export function declaredBaselineDir() {
  const src = readFileSync(join(HERE, 'baselineComparison.mjs'), 'utf8');
  const m = src.match(/export const BASELINE_DIR\s*=\s*'([^']+)'/);
  if (!m) throw new Error('BASELINE_DIR is no longer a single-quoted export in baselineComparison.mjs — re-derive this reader');
  return m[1];
}

/**
 * The canonical resources one attempt must hold, in claim order.
 *
 * `--update` writes the baseline generation, so it is a writer of `baseline-set` and must exclude
 * every other update run. A compare run does not touch the baseline bytes at all, so it takes only
 * the artifact. Returns an ARRAY because the `??` this replaces was a single value.
 *
 * ROUND 17 (Astra L08) — THE READER IS NOW IN THE PROTOCOL, AND IT EARNED ITS PLACE BY FAILING.
 * The line above used to be the whole policy: "a compare run does not touch the baseline bytes at
 * all, so it takes only the artifact." That reasoning is about WRITES and it silently converted
 * into a claim about SAFETY. Astra executed the consequence through the shipped `measureFleet`:
 *
 *   compare checks the incomplete-generation marker is absent
 *   compare reads   old-alpha
 *   update  publishes both new baselines, removes its marker
 *   compare reads   new-beta        <- and BOTH ROWS PASSED
 *
 * A comparison that matches neither generation, reporting success, with `shared lock resources: []`.
 * The incomplete-generation marker guards a comparison that STARTS after an interrupted update; it
 * does nothing for a reader ALREADY RUNNING. Reading a directory while another process rewrites it
 * is a race whether or not the reader writes, so the reader must be visible to the writer.
 *
 * HOW IT IS EXPRESSED. A compare run now claims `baseline-set` too, marked `mode: 'read'`; an
 * update claims it `mode: 'write'`. The resource is the SAME PATH, so the same lock file governs
 * both and the acquisition below is what makes the modes mean anything. Locking it read-only for
 * every concurrent comparison would be the over-correction — many readers are fine, and this
 * subsystem runs exactly one comparison per invocation, so read/read overlap is not the risk.
 *
 * WHY NOT AN IMMUTABLE GENERATION SNAPSHOT. That is the better long-run design and Astra names it:
 * a compare would read a frozen copy and need no lock at all. It is not done here because it moves
 * the baseline bytes through a copy step whose failure modes (partial copy, stale snapshot, disk
 * cost per variant) are not yet measured — and a snapshot that silently serves a stale generation
 * is this subsystem's signature defect wearing a new hat. The lock is the smaller change that
 * makes the existing bytes safe to read; the snapshot is a slice, not a patch.
 */
export function requiredResources({ update = false, resultPath = null, baselineDir = null, repoRoot = REPO } = {}) {
  /*
   * A compare run claims the baseline READ-ONLY; an update claims it WRITE. Both name the same
   * path, so one lock file governs them — `mode` is what lets the acquisition below tell "I only
   * read this" from "I am rewriting this", which is the difference between a shared and an
   * exclusive claim.
   *
   * `baselineDir` AND `repoRoot` ARE THREADED THROUGH, WHICH IS THE L12 FIX. They were dropped
   * here and this function called `resourcePathFor(name, { resultPath })` — so the directory the
   * CALLER named never reached the path the lock was taken on, and `lockPlanFor` faithfully
   * reported the override while the lock ignored it. A parameter this function does not accept is
   * a parameter the caller's intent cannot reach.
   */
  const wanted = update
    ? LOCKABLE_RESOURCES.map((name) => ({ name, mode: 'write' }))
    : [{ name: 'baseline-set', mode: 'read' }, { name: 'result-artifact', mode: 'write' }];
  return wanted
    .map(({ name, mode }) => ({ name, mode, path: resourcePathFor(name, { baselineDir, repoRoot, resultPath }) }))
    .filter((r) => {
      if (!r.path) {
        if (r.name === 'result-artifact') return false; // no --result: nothing is written
        throw new Error(`the ${r.name} resource has no path — a run that writes it must be able to name it`);
      }
      return true;
    });
}

/**
 * The fleet, as the ids the SKELETON MANIFEST declares, minus the ones the caller excludes.
 *
 * WHY THIS IS A TEXT READ AND NOT `loadFleetIds()`. The manifest is a literal array of `id: 'vNN'`
 * fields, so the ids are readable without a dynamic `import()` of a TypeScript module — and the
 * lock is the FIRST thing an attempt does, before any measurement, which is Astra's K01 ordering.
 * The reader is written to FAIL LOUDLY rather than return a short list, because `['v01']` would
 * lock one twentieth of the baseline set and report success, which is this subsystem's signature
 * defect.
 *
 * **WHEN THIS IS CALLED IS PART OF THE CONTRACT, AND ROUND 16 (Astra L03) IS WHY.** An earlier
 * draft of this module resolved the ids up front, beside the lock plan — which put a manifest read
 * BEFORE `runAttempt`, and therefore outside the guarded region. That resurrects round 15's K03
 * exactly: make the manifest unreadable, run, and the process dies with the previous green
 * artifact untouched and still the console's answer. `lifecycleEntry.test.mjs` caught it.
 *
 * So the MODE-derived resource set is computed up front (it needs no manifest), and the id-scoped
 * child locks are taken from INSIDE the lifecycle, once the manifest has been read there. Callers
 * that need the ids before the lifecycle must not exist.
 */
export function fleetIdsFromManifest({
  repoRoot = REPO, source = null, excluded = [],
} = {}) {
  const file = source ?? join(repoRoot, 'frontend/src/pages/HomePage/three-worlds/skeletons.ts');
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('export const SKELETONS');
  if (start === -1) throw new Error(`${file} no longer declares SKELETONS — re-derive this reader`);
  const ids = [...src.slice(start).matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
  if (ids.length === 0) throw new Error(`${file} declares SKELETONS but this reader found no ids in it`);
  const drop = new Set(excluded);
  return ids.filter((id) => !drop.has(id));
}

/**
 * One file per variant id, inside the baseline directory.
 *
 * `[]` for an empty id list is a legitimate answer — a `--status`-only lock, or a caller that
 * locks the generation without any variant. It is NOT a failure, which is why `parentsFor` below
 * rather than this function decides what an empty list means.
 */
export function childrenFor({ baselineDir, ids }) {
  return ids.map((id) => join(baselineDir, `${id}.png`));
}

/**
 * The directories that hold the resources.
 *
 * `[]` IS THE DANGEROUS ANSWER HERE, and the guard is the point of the function. A lock whose
 * directory set is empty claims nothing, succeeds, and reports `ok: true` — a green result from a
 * mechanism that protected nothing, which is exactly the shape of Astra's L01 and of `#fff`
 * before it. So an empty set is refused unless the caller says it is expected.
 *
 * `resources` IS PART OF THE SET, and it is not a refinement — it is the case that matters most.
 * A compare run locks only the result artifact and never names a baseline directory, so deriving
 * the parents from `baselineDir` and the id-scoped children alone yields an empty set for the
 * ORDINARY run: the mode that locks exactly one file. Every directory the plan touches must
 * contribute, or the guard fires on the common path while passing the rare one.
 *
 * EVERY ENTRY IS RESOLVED BEFORE IT IS DEDUPED, AND THAT IS THE WHOLE POINT OF THE `Set`.
 * `dirname()` does not preserve the spelling of its input: `dirname('C:/tmp/bl/v01.png')` returns
 * `'C:\\tmp\\bl'` while `baselineDir` stays `'C:/tmp/bl'`, because `join()` uses the platform
 * separator and a literal does not. Two spellings of ONE directory therefore entered the `Set` as
 * two members, and the plan claimed two resources where the run touches one. It does not break
 * the lock (the same directory twice is not a missing directory) but it makes the plan's own
 * description of what is covered FALSE — and the case that reports it is the compare run, whose
 * ONLY directory arrives through `resources` and therefore through `dirname`.
 *
 * `resolve()` is what makes one directory one member: it normalises separators as well as `..`
 * and `.`, so the set is keyed by path rather than by spelling. `resolve` also makes the members
 * absolute, which is what a lock file name needs to be unambiguous across processes.
 */
export function parentsFor({
  resources = [], baselineDir = null, children = [], allowEmpty = false,
} = {}) {
  const dirs = [
    ...new Set([
      ...resources.map((r) => resolve(dirname(r.path))),
      ...(baselineDir ? [resolve(baselineDir)] : []),
      ...children.map((c) => resolve(dirname(c))),
    ]),
  ].sort();
  if (dirs.length === 0 && !allowEmpty) {
    throw new Error('a lock with no directories claims no resource — refusing rather than reporting ok');
  }
  return dirs;
}

/**
 * Everything the lock needs, derived from the mode ALONE. The one call site `shot-diff.mjs` uses.
 *
 * NO MANIFEST READ HAPPENS HERE, and the signature is shaped to make that hard to break: `ids`
 * defaults to `[]`, so a caller cannot supply them without having read the manifest first — and the
 * contract is that the manifest is read INSIDE the guarded region (see `fleetIdsFromManifest`).
 * What this returns is the resource SET and the DIRECTORIES that hold it, both of which follow from
 * the mode.
 *
 * `children` is therefore id-scoped and usually empty at this point. It stays in the plan because a
 * caller that already has the ids — a test, or a future schedule that reads the manifest inside the
 * lifecycle — should get the same shape, rather than a second way to say it.
 */
export function lockPlanFor({
  update = false, resultPath = null, baselineDir = null, repoRoot = REPO, ids = [], allowEmpty = false,
} = {}) {
  /*
   * L12 (Astra round 17) — `requiredResources` USED TO DROP `baselineDir` AND `repoRoot`, SO THE
   * DESCRIPTION AND THE ACQUISITION COULD NAME DIFFERENT DIRECTORIES. Measured:
   *
   *   lockPlanFor({ update:true, baselineDir:'C:/tmp/other-baselines', resultPath:'C:/tmp/r.json' })
   *     plan.baselineDir = C:/tmp/other-baselines
   *     baseline lock    = <module checkout>/docs/qa/baseline/three-worlds
   *
   * `plan.baselineDir` is what a caller READS to know what is covered; the lock is what actually
   * protects. Two answers to one question, and the reassuring one is the one that gets printed.
   * The overrides are now threaded through, so the directory the plan describes is the directory
   * the lock names — by construction, because both come from `dir` below.
   *
   * The default CLI path supplies neither override, which is why the shipped run was never
   * misdirected; this is a helper-contract defect, and it is fixed here rather than documented
   * because a helper that can describe a lock it did not take is a helper that will eventually
   * be called with an override.
   */
  const dir = baselineDir ?? join(repoRoot, declaredBaselineDir());
  const resources = requiredResources({ update, resultPath, baselineDir: dir, repoRoot });
  // A READER LOCKS THE BASELINE TOO (L08). `mode` distinguishes the claim; the path does not.
  const locksBaseline = resources.some((r) => r.name === 'baseline-set');
  const children = locksBaseline ? childrenFor({ baselineDir: dir, ids }) : [];
  return {
    resources,
    locksBaseline,
    baselineDir: dir,
    children,
    /*
     * `allowEmpty` is passed through rather than derived, and the default is FALSE on purpose: a
     * plan whose directories are empty claims nothing and would otherwise report `ok: true`. See
     * `parentsFor` — which is also why `resources` is passed to it.
     */
    parents: parentsFor({
      resources, baselineDir: locksBaseline ? dir : null, children, allowEmpty,
    }),
  };
}

/**
 * The directories that hold the baseline generation's children, given ids read INSIDE the
 * lifecycle. Kept separate from `lockPlanFor` so the two reads cannot be confused for one.
 */
export function baselineChildrenFor(plan, ids) {
  if (!plan.locksBaseline) return [];
  return childrenFor({ baselineDir: plan.baselineDir, ids });
}

/**
 * Take SEVERAL locks, in the order given, or none.
 *
 * THIS LIVES HERE BESIDE `lockPlanFor` RATHER THAN IN `attemptLock.mjs`, and the boundary is
 * Rule 4's: `attemptLock.mjs` is about ONE FILE, its holder and its stale modes; "which resources
 * an attempt must hold, and in what order" is this module's subject. The two were one file until
 * round 16, which is the same split this subsystem has taken eight times before.
 *
 * ROUND 16 (Astra L01) — ONE ATTEMPT CAN WRITE MORE THAN ONE RESOURCE. An `--update` run writes
 * the baseline generation AND the result artifact; the old call site locked `resultPath ??
 * baselineDir`, a single path chosen as a FALLBACK, so two update runs with different `--result`
 * values held two different locks over one shared baseline directory and interleaved. A `??` reads
 * as "either/or"; the run's real requirement is "one or both", and only one was protected.
 *
 * ALL-OR-NOTHING, AND THE ORDER IS THE INTERESTING PART. Two runs that both want the baseline
 * claim it first — `lockPlanFor` puts it first in `resources` — so neither can end up holding the
 * artifact while waiting on the baseline. That is what makes deadlock unreachable between two
 * update runs; it is an ordering property, not a timeout, and it is asserted by a test that
 * checks the order rather than by the refusal text.
 *
 * A partial acquisition RELEASES what it took before returning. A caller that got one lock and a
 * refusal has nothing safe to do with the one: continuing would hold half the resource set and
 * report failure, which is the stale-lock failure mode with extra steps.
 */
export async function acquireAllLocks({
  resources = [], acquire, ...opts
} = {}) {
  if (typeof acquire !== 'function') {
    throw new Error('acquireAllLocks needs the single-resource acquire function — pass attemptLock.mjs\'s acquireAttemptLock');
  }
  const held = [];
  try {
    for (const { name, path } of resources) {
      // Sequential on purpose: the ordering above is the deadlock argument, so these cannot be
      // raced. A Promise.all here would claim the artifact before the baseline and delete the
      // property this function exists to provide.
      // eslint-disable-next-line no-await-in-loop
      const lock = await acquire({ ...opts, resourcePath: path, label: `${opts.label ?? 'attempt'}:${name}` });
      if (!lock.ok) {
        for (const h of held) h.release();
        return {
          ok: false, name, lockPath: lock.lockPath, reason: lock.reason, held: [],
        };
      }
      held.push({ ...lock, name });
    }
  } catch (error) {
    /*
     * L13 (Astra round 17) — ALL-OR-NOTHING COVERED REFUSAL, NOT THROWING.
     *
     * The loop above unwinds when `acquire` RETURNS `ok: false`. It did not unwind when `acquire`
     * THREW — and `acquire` writes a lock document, so a full disk, a permission change or a
     * broker-induced EPERM between the two writes leaves the first lock HELD and the process on its
     * way out. Astra executed it with an injected ENOSPC on the second document write:
     *
     *     remaining locks: A.lock, B.lock   <- both present, first populated, second empty
     *     open descriptors: 1
     *
     * Two persistent lock files survive the process, and the next run refuses against a holder that
     * no longer exists. The caller's `finally` release is not entered here because the acquisition
     * never RETURNED a handle — the window is between the first successful claim and the return.
     *
     * RELEASING IN THE CATCH IS NOT ENOUGH ON ITS OWN, and the difference matters: `release()` on a
     * partially-written acquisition can itself throw, and a throw from a catch block REPLACES the
     * original error — turning "we ran out of disk" into "we could not release a lock", which is the
     * less useful of the two facts. So each release is attempted independently, failures are
     * collected, and the ORIGINAL error is rethrown with them attached rather than instead of them.
     */
    const unwindFailures = [];
    for (const h of [...held].reverse()) {
      try {
        h.release();
      } catch (releaseError) {
        unwindFailures.push({ name: h.name, error: String(releaseError?.message ?? releaseError) });
      }
    }
    if (unwindFailures.length > 0) {
      error.unwindFailures = unwindFailures;
      error.message += ` (and ${unwindFailures.length} lock(s) could NOT be released: `
        + `${unwindFailures.map((f) => f.name).join(', ')} — these must be cleared by hand)`;
    }
    throw error;
  }
  let released = false;
  return {
    ok: true,
    held,
    names: held.map((h) => h.name),
    release: () => {
      if (released) return [];
      released = true;
      // Reverse order, so a holder never releases the resource it claimed last while still
      // claiming the one it claimed first.
      return [...held].reverse().map((h) => h.release());
    },
  };
}
