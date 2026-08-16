/**
 * artifact.mjs — R4, the rule that makes "reviewing a description of the code" structurally hard.
 * ================================================================================================
 * Split out of checks.mjs for the 300-line cap (CLAUDE.md rule 4). The code is unchanged by the
 * split; only its address is.
 *
 * "Is this implementation correct?" answered against a prose description of the implementation is
 * not a review — it is the model agreeing with your summary of yourself. That is the measured
 * failure this gate was built from: a prose packet returned 1 verified finding of 3, where source
 * packets returned findings that all held up.
 *
 * This file has now been corrected in three consecutive rounds, and every correction was to the
 * BINDING — the part deciding whether the cited artifact is actually the thing under review. Treat
 * it as the most attacked surface in the gate.
 *
 * @module packet-gate/artifact
 */
import { finding } from './refusal.mjs';
import { normPath, foldCase } from './normalize.mjs';

/** A cited block counts as CODE only if it is not prose. Citing `path=docs/notes.md` satisfied the
 *  letter of R4 while carrying zero bytes of code — the one check whose entire purpose is "a
 *  description of code is not code" was cleared by attaching a description. Kimi K3, 2026-08-14. */
const PROSE_EXT = /\.(md|mdx|markdown|txt|rst|adoc)$/i;
const PROSE_LANG = /^(md|mdx|markdown|text|txt|rst|adoc)$/i; // NO trailing '|': empty must not match

/**
 * A cited block counts as CODE unless something POSITIVELY says it is prose.
 *
 * The trailing `|` in the old PROSE_LANG alternation made the EMPTY string match, so a cited block
 * with no language tag — ```` ``` path=src/x.mjs lines=1-50 ```` — was classified as prose and R4
 * refused a packet carrying byte-verified source. That is the bare-fence trap from round 2
 * reappearing on the classification side: absence of a label was again read as a content type.
 * An unlabelled block is now judged by its PATH extension alone (Kimi K3 round 3, M1).
 */
export const isCodeBlock = (b) => b.cited
  && !PROSE_EXT.test(b.attrs.path ?? '')
  && !(b.lang && PROSE_LANG.test(b.lang));

/**
 * Does the remit name anything R4 can bind the artifact TO?
 *
 * Exported because the CLI must ask the identical question to decide whether to warn that the
 * binding did not run. Two places computing "is `named` empty" independently is how the
 * allow-missing predicate drifted in the first place.
 */
export const hasBindingAnchors = (namedPaths = [], namedContent = []) => (namedPaths.length + namedContent.length) > 0;

/**
 * A test, spec or fixture path. Deliberately mirrors `RESOLUTION_EXCLUDES` in repo-io.mjs, which
 * already refuses to let a test vouch for a route's EXISTENCE. Round 6 found the other half of that
 * hole: nothing stopped a packet from citing a test as the ARTIFACT under review, so a remit about a
 * handler was satisfied by the handler's test file — which byte-verifies and mentions the route.
 *
 * Two lists for one concept is the drift hazard this codebase keeps paying for, and these two are
 * still separate because one is a git pathspec and the other a JS predicate. They are pinned
 * together by a test that asserts both classify the same sample paths; if that test fails, they have
 * drifted and one of them is wrong.
 */
export const isTestPath = (p) => /(^|\/)(tests?|__tests__|fixtures?)\//i.test(String(p ?? '').replaceAll('\\', '/'))
  || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(String(p ?? ''));

/**
 * Does a cited body actually MENTION the named route/symbol?
 *
 * Was `body.includes(n)`, a bare substring test. A remit naming a common symbol — `main`, `init`,
 * `render`, `handle` — was bound by any cited block containing that sequence anywhere: inside a
 * longer identifier (`remain`, `handleError`), a comment, or a string literal. The decoy attack for
 * symbol-anchored remits therefore needed no fabrication at all, just any real file that happens to
 * contain the letters. Identifier-shaped needles now require identifier boundaries.
 *
 * Routes and anything containing punctuation (`/api/sessions`) keep substring semantics: `\b` around
 * a slash is meaningless, and a route is already high-precision. The residual is stated rather than
 * hidden — a symbol named in a comment inside a cited block still binds, exactly as R5's resolver
 * documents for premise resolution.
 */
export function mentions(body, needle) {
  const n = String(needle);
  if (!/^[\w$]+$/.test(n)) return body.includes(n);
  return new RegExp(`(?<![\\w$])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`).test(body);
}

/**
 * If the remit asks about code, the packet must carry at least one cited code block — and that
 * block must be bound to something the remit actually names.
 *
 * `remitIsAboutCode` is decided by the caller from anchors (a named path/route/symbol) so the
 * judgment stays in one place and is testable.
 */
/**
 * Named paths the remit asks about that the packet does NOT carry.
 *
 * R4 is satisfied by ONE bound artifact, so "review how src/a.mjs and src/b.mjs interact" citing
 * only `b` passes — and the model then answers a question about an interaction it can only see half
 * of. Refusing would be defensible but would false-refuse the common case where a remit mentions a
 * neighbouring file in passing, and refusal fatigue is a first-class failure here. So this is
 * SURFACED in the approval view rather than blocked: the operator sees exactly which named file is
 * absent and decides. Exported so the CLI and R4 share one notion of "bound".
 */
/**
 * The blocks eligible to BIND — one definition, used by checkArtifact and by both warnings.
 *
 * A test/fixture path is excluded as a DECOY but never as the SUBJECT: if the remit names it, it is
 * what the review is about. Three copies of this filter existed for about ten minutes after the
 * test-exclusion fix, and two of them lacked the named-path exemption — which would have warned
 * "src/x.test.mjs is NOT carried by this packet" about a file the packet was carrying. Same
 * duplicate-predicate hazard, caught by writing it down rather than by a reviewer.
 */
export function bindableBlocks(blocks, namedPaths = []) {
  const namedSet = new Set(namedPaths.map(foldCase));
  return blocks.filter(isCodeBlock)
    .filter((b) => !isTestPath(b.attrs.path) || namedSet.has(foldCase(b.attrs.path)));
}

export function unboundNamedPaths(blocks, namedPaths = []) {
  const bindable = bindableBlocks(blocks, namedPaths);
  return namedPaths.filter((n) => !bindable.some((b) => foldCase(b.attrs.path) === foldCase(n)));
}

/**
 * True when R4 was satisfied ONLY by a route/symbol mention while the remit also named a path.
 *
 * The strictest-kind rule is preserved as SIGNAL rather than as a veto: making it a veto refused the
 * ordinary "does the handler for /api/sessions read package.json?" packet, which names a path in
 * passing and is really about the route. So the weaker binding is allowed and DECLARED — the
 * operator sees that the artifact was tied to the remit by a mention, not by identity, which is the
 * dimension the round-2 decoy attack lived in.
 *
 * A separate pure function rather than state hung off checkArtifact: this module is pure by
 * construction so the canary suite can drive every gate red, and a module-level mutable would go
 * stale exactly when two packets are checked in one process.
 */
export function weakBindingOnly(blocks, namedPaths = [], namedContent = []) {
  if (!namedPaths.length || !namedContent.length) return false;
  const bindable = bindableBlocks(blocks, namedPaths);
  const pathHit = bindable.some((b) => namedPaths.some((n) => foldCase(b.attrs.path) === foldCase(n)));
  const contentHit = bindable.some((b) => namedContent.some((n) => mentions(String(b.body), n)));
  return !pathHit && contentHit;
}

export function checkArtifact(remitIsAboutCode, blocks, namedPaths = [], namedContent = []) {
  if (!remitIsAboutCode) return [];
  const codeBlocks = blocks.filter(isCodeBlock);
  if (!codeBlocks.length) {
    const citedProse = blocks.filter((b) => b.cited).length;
    return [finding('R4', `remit asks about code, but the packet contains no cited CODE block${citedProse ? ` (${citedProse} cited block(s) are prose — markdown/text paths do not satisfy this)` : ' (```lang path=… lines=…)'}`,
      'attach the source itself. A description of code is not code — that is the failure this gate exists to prevent')];
  }

  // BIND THE ARTIFACT TO THE REMIT. One cited block used to satisfy R4 for a remit about a
  // completely different file: cite two real lines of some unrelated util, then hand-type fences
  // purporting to be the file actually under review. R3 verifies the decoy, R4 goes green, and the
  // real source lends credibility to the fabrication. (Kimi K3 round 2, finding 2.)
  //
  // ROUND-3 CORRECTIONS, both from Kimi K3:
  //   H1 — it bound to `anchors.paths` only, while `aboutCode` is true for routes and symbols too.
  //        "Review the handler for POST /api/sessions" names no path, so the binding was SKIPPED
  //        and the decoy attack reopened for the most natural way to phrase a review remit.
  //   H2 — the match was bidirectional (`w.endsWith('/' + a)`), so citing a repo-root `login.mjs`
  //        satisfied a remit naming `src/auth/login.mjs`.
  //
  // ROUND-4 CORRECTION: the match is now EXACT. H2 left the REVERSE direction open — the cited path
  // was still allowed to be MORE specific than the named one, so a remit naming a real root
  // `login.mjs` was bound by a cited `src/auth/login.mjs`: a DIFFERENT real file that byte-verifies
  // under R3. R5 already requires every named path to exist at exactly that path, so "more specific"
  // bought nothing and cost a decoy needing zero fabrication. Three rounds, three corrections, all
  // to this one predicate.
  if (!hasBindingAnchors(namedPaths, namedContent)) return [];

  // ROUND-6 CORRECTION, fourth consecutive round on this one predicate.
  //
  // (a) BIND BY THE STRICTEST ANCHOR KIND PRESENT. The check was `pathHit || contentHit`, so a remit
  //     naming BOTH a path and a symbol was satisfied by any file merely MENTIONING the symbol —
  //     the round-2 decoy shape reborn through the other dimension. If the remit names a path, a
  //     path must be cited; content binding applies only when no path is named at all.
  //
  // (b) A TEST FILE IS NOT THE SUBJECT. repo-io excludes tests/fixtures from R5 *resolution* (a test
  //     cannot prove a route exists), but nothing stopped a packet from CITING one as the artifact:
  //     "review the handler for /refunds/run" + tests/refunds.test.mjs byte-verifies and mentions
  //     the route, so R4 went green while the model reviewed the test instead of the handler.
  //     Same exclusion semantics, now applied on both sides.
  // A test is excluded as a DECOY, never as the SUBJECT. Round 6's first version excluded every
  // test path unconditionally, which hard-failed the perfectly legitimate remit "review
  // tests/refunds.test.mjs — is this test actually asserting the refund path?": the only block that
  // could bind was excluded, R4 refused, and no flag existed to excuse it. A refusal with no remedy
  // is the refusal-fatigue signature this gate names in three other comments. The exclusion now
  // applies only to a test the remit did NOT name. (Kimi K3 round 6, F4.)
  const bindable = bindableBlocks(blocks, namedPaths);
  const pathHit = bindable.some((b) => namedPaths.some((n) => normPath(b.attrs.path) === normPath(n)));
  const caseOnlyHit = bindable.some((b) => namedPaths.some((n) => foldCase(b.attrs.path) === foldCase(n)));
  const contentHit = bindable.some((b) => namedContent.some((n) => mentions(String(b.body), n)));

  // ROUND-6 SELF-CORRECTION, found by attacking this very fix rather than by waiting for a review.
  //
  // The first version of "strictest anchor kind" was `namedPaths.length ? pathHit : contentHit` —
  // if the remit named ANY path, only a path could bind. That is a FALSE REFUSAL on a completely
  // ordinary remit: "Does the handler for /api/sessions correctly read package.json?" names a path
  // IN PASSING while being about the route, so a packet citing the real handler was refused for
  // carrying the wrong file. The gate's own doctrine rates a false refusal as severe as a fail-open,
  // because it is what teaches an operator to bypass.
  //
  // So the strictness is preserved as SIGNAL, not as a veto: either anchor kind can bind, but when
  // the binding rests only on the weaker one the receipt says so. `weakBinding` is what the caller
  // surfaces. Sixth consecutive round in which a fix created the next defect — the difference this
  // time is that the fix's own author found it.
  const bound = pathHit || caseOnlyHit || contentHit;
  const weakBinding = !pathHit && contentHit && namedPaths.length > 0;

  if (!bound) {
    const excluded = codeBlocks.length - bindable.length;
    const why = namedPaths.length
      ? `remit names path(s) ${namedPaths.join(', ')}, but no cited non-test block IS one of them`
      : `remit names ${namedContent.join(', ')}, but no cited non-test block mentions any of them`;
    return [finding('R4', `${why} (cited: ${codeBlocks.map((b) => b.attrs.path).join(', ') || 'none'}${excluded ? `; ${excluded} excluded as test/fixture` : ''})`,
      'cite the file the remit is actually about — an unrelated real block, or the test for it, verifies nothing about the subject under review')];
  }
  void weakBinding; // surfaced by weakBindingOnly() — see below; kept pure, no module state.
  return [];
}

/**
 * True when R4 bound only because two paths differ in CASE.
 *
 * On a case-insensitive volume (NTFS, default APFS, WSL /mnt/c) this is one file and the bind is
 * correct — declaring it costs the operator one line. On a case-SENSITIVE volume it is two different
 * real files, and the declaration is the whole point: R5 and R3 both pass on their own file, so
 * without this the operator gets a fully-green approval view for a packet carrying the wrong source.
 * (Kimi K3 round 7, F1 — round 6 had folded case unconditionally, turning a macOS false-refusal into
 * a Linux fail-open.)
 */
export function caseOnlyBinding(blocks, namedPaths = []) {
  const bindable = bindableBlocks(blocks, namedPaths);
  const exact = bindable.some((b) => namedPaths.some((n) => normPath(b.attrs.path) === normPath(n)));
  if (exact) return null;
  for (const b of bindable) {
    for (const n of namedPaths) {
      if (foldCase(b.attrs.path) === foldCase(n)) return { cited: b.attrs.path, named: n };
    }
  }
  return null;
}
