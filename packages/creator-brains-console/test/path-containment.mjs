/*
 * Path containment, judged BY COMPONENT — the one predicate both fixture
 * validators ask the same question with.
 *
 * WHY THIS HAS ITS OWN MODULE (round 9). It lived in `store-attacks.mjs`, where
 * R8-07 introduced it. Round 9 swept the package for the class it belongs to — a
 * string-prefix test standing in for a containment test — and found one remaining
 * member in an unrelated subject: the H3 traversal validator in
 * `bridge.hy4.test.mjs`, whose assertion read `resolved.startsWith(dist)`.
 *
 * The fix could have imported this predicate out of `store-attacks.mjs`, but that
 * would couple an HTTP-surface test to a store-attack fixture — and drag in
 * `tempRoot` through it — to obtain four lines of `node:path` arithmetic. The
 * predicate is about paths, not about stores, so it is its own module and both
 * subjects import it. The class then has ONE named predicate rather than a copy
 * per validator, which is the whole point: R7-01 fixed the guard in
 * `lib/containment.mjs` and the same test survived one file over, because the fix
 * was aimed at a row and not at a class.
 *
 * WHY THIS IS NOT IN A `.test.mjs`. S1-H13 — a harness exported from a test file
 * re-registers that file's tests in every importer, so one test is counted once per
 * importer. A harness is not a test, and `node --test` must not see it.
 *
 * ── THE DEFECT THIS REPLACES, AND WHY IT SURVIVED A ROUND ────────────────────
 *
 * `junction()` proved its attack with `!real.toLowerCase().startsWith(realStore
 * .toLowerCase())` — the SAME string-prefix containment test R7-01 had removed from
 * `lib/containment.mjs` one round earlier. R7-01's fix was aimed at the guard; this
 * copy stood one file over, in the fixture validator, and round 8 found it there. That
 * is the sixth consecutive round in which "a fix aimed at a row is not a fix aimed at
 * a class" held, and it is why this predicate is now a named function with its own
 * tests rather than an expression inside an assertion.
 *
 * A prefix test is wrong in BOTH directions, and only the second one is quiet:
 *
 *   OVER-PERMISSIVE — `C:\store-evil` starts with `C:\store`, so a junction resolving
 *     to a SIBLING whose name merely begins with the store's name was judged INSIDE
 *     the store. The assertion then fires and reports "the attack was not
 *     constructed" against a junction that escaped perfectly well: a false alarm that
 *     reads as a broken fixture.
 *   OVER-REFUSING — a directory genuinely inside the store whose name begins with two
 *     dots (`..notes`) is not a parent component, and R7-01 recorded exactly this
 *     over-refusal as a defect. A guard that refuses legal input is a defect too.
 *
 * A parent component is exactly `..`, or `..` followed by a SEPARATOR. A longer name
 * that merely begins with two dots is an ordinary name and is inside. A `relative()`
 * result that is absolute means the two paths do not share a root at all, which is
 * also outside.
 *
 * IT IS DELIBERATELY NOT `lib/containment.mjs`'s `inside()`. Importing the production
 * guard would make these validators agree with the guard BY CONSTRUCTION, so a bug in
 * the guard would be invisible to the very tests whose job is to notice it. The rule is
 * restated here from `node:path` primitives, independently.
 *
 * THE ONE CLASS OF INPUT WHERE THIS IS NOT SIMPLY `!inside()`. For every target whose
 * relative path against the root is non-empty, this returns the exact negation of
 * production's `inside()`. Where `relative()` yields `''` the two COINCIDE on `false` —
 * `inside()` because it is strictly inside, this one because `''` is neither `..` nor
 * absolute.
 *
 * IT IS EVERY EMPTY-RELATIVE PAIR, NOT ONLY `target === root` (round 9c, Astra P3 #6).
 * The first version of this note said "the one input where", which names a case far
 * narrower than the behaviour. MEASURED, four distinct spellings all produce `''` and
 * all take the exception: `root` itself, `root + sep + '.'`, `root + sep + '.' + sep + '.'`,
 * and `join(root, 'sub', '..')`. Only the first is string equality; the other three are
 * different strings naming the same normalized path, which is exactly the distinction the
 * note obscured. `T-B26c` pins all four.
 *
 * That is stated rather than unified: making them one function would restore exactly the
 * by-construction agreement this file exists to avoid.
 *
 * @module creator-brains-console/test/path-containment
 */

import { isAbsolute, relative, sep } from 'node:path';

/** Does `target` lie OUTSIDE `root`, judged BY PATH COMPONENT (R8-07)? */
export function escapes(root, target) {
  const rel = relative(root, target);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}
