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
import { normPath } from './normalize.mjs';

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
  const named = [...namedPaths, ...namedContent];
  if (!hasBindingAnchors(namedPaths, namedContent)) return [];

  const pathHit = codeBlocks.some((b) => namedPaths.some((n) => normPath(b.attrs.path) === normPath(n)));
  const contentHit = codeBlocks.some((b) => namedContent.some((n) => mentions(String(b.body), n)));
  if (pathHit || contentHit) return [];

  return [finding('R4', `remit names ${named.join(', ')}, but no cited block quotes any of them (cited: ${codeBlocks.map((b) => b.attrs.path).join(', ')})`,
    'cite the file the remit is actually about — an unrelated real block verifies nothing about the subject under review')];
}
