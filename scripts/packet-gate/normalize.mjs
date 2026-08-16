/**
 * normalize.mjs — the two normalizers, in one place, because copies of them keep drifting.
 * ========================================================================================
 * Every comparison this gate makes is a comparison of text the operator wrote against text the repo
 * holds. Both normalizers below exist so that a difference which means NOTHING (a line ending, a
 * path separator) cannot be mistaken for a difference that means EVERYTHING (someone retyped the
 * code, or cited a file the remit is not about).
 *
 * They live here rather than beside their first caller because this codebase has now been bitten
 * four separate times by two copies of one predicate drifting apart:
 *   - the fabrication guard and its warning shared a `b.lang` defect, so the bypass produced neither
 *   - `--allow-missing` was folded one way in checks.mjs and compared raw in packet-gate.mjs
 *   - build-packet re-typed the byte normalizer and could disagree with the checker about arithmetic
 *   - the R4 binding declared a local `norm` that SHADOWED the module-level byte normalizer
 *
 * @module packet-gate/normalize
 */

/**
 * Fold line endings to LF.
 *
 * THE ROUND-4 CRITICAL. `parseFences` split on `'\n'` only, so on a CRLF document every line kept a
 * trailing `'\r'`. Markdown fence detection uses `.` and `$`, and in JavaScript `.` does NOT match
 * `'\r'` (it is a line terminator) while a non-multiline `$` anchors to end-of-string — so a CRLF
 * fence line matched NOTHING and the parser returned an EMPTY array for the entire document.
 *
 * That is not the false-refusal it appears to be. Every check is driven by those blocks, so a CRLF
 * packet had no cited blocks for R3 AND no uncited blocks for the fabrication guard to catch. A CRLF
 * packet carrying hand-typed code with a remit naming nothing printed `PACKET READY`, `no fences
 * present`, exit 0 — where byte-identical LF content exited non-zero. On Windows, CRLF is what an
 * editor saves by default, so the gate's headline invariant was one Save As away from decorative.
 *
 * `\r\n?` also folds a lone `\r` (classic-Mac endings), which defeats `.` and `$` identically.
 */
export const normalizeEol = (s) => String(s).replace(/\r\n?/g, '\n');

/**
 * Split a PACKET DOCUMENT into structural lines. Deliberately NOT the same operation as folding a
 * source file's line endings, and the distinction is load-bearing.
 *
 * Round 4's CRLF fix closed `\r` and left the CLASS open. `.` in JavaScript excludes U+2028 LINE
 * SEPARATOR and U+2029 PARAGRAPH SEPARATOR too, and — worse — a document that uses U+2028 as its
 * line break has NO `\n` at all, so splitting on `\n` yields ONE line and every fence sits mid-line
 * where `^` can never match. Such a packet, sent with an explicit `--remit`, reached
 * `PACKET READY / no fences present / exit 0` carrying hand-typed code: the round-4 critical's exact
 * signature, one round later. Found by attacking the round-4 fix rather than by waiting for a review.
 *
 * WHY THIS IS NOT FOLDED INTO normalizeEol, which would be the obvious tidier thing to do:
 * `normalizeEol` also feeds R3's byte comparison, where the source file is split into LINES to
 * resolve `lines=N-M`. A `.mjs` file may legitimately contain U+2028 inside a string literal — it is
 * valid JavaScript source. Folding it there would split one real line into two, renumbering the file
 * against what git and the operator's editor show, and silently breaking every citation into it.
 * Document STRUCTURE and source LINE NUMBERING are different questions; conflating them trades a
 * fail-open for a silent mis-citation, which is not a trade worth making.
 *
 * RESIDUAL, stated rather than hidden: a cited body that itself contains a literal U+2028 has that
 * character turned into `\n` here while the source file retains it, so R3 refuses with a visible
 * first-divergence line. That is fail-CLOSED and diagnosable, and the remedy is to cite a range that
 * does not span the literal separator.
 */
// Written as \u escapes ON PURPOSE: a literal U+2028 here would be an invisible character in the
// very file that exists to handle invisible characters, and unreviewable in a diff.
export const splitDocLines = (s) => normalizeEol(s).split(/[\n\u2028\u2029]/);

/**
 * Fold a path to one comparable spelling: separators, a leading `./`, and repeated slashes.
 *
 * Used by R4's binding, R5's premise check, and the CLI's `--allow-missing` filter — all three, on
 * purpose. Round 4 measured three failures from not having this:
 *   - `--allow-missing ./src/x.mjs` and `src//x.mjs` did not match the extracted anchor `src/x.mjs`,
 *     so the packet refused with a remedy the operator had already followed.
 *   - `--allow-missing src\x.mjs` cleared R5 (which folded separators) but NOT the CLI filter (which
 *     used a raw `Array.includes`), leaving the path in R4's binding, which then demanded a citation
 *     of a file that by definition cannot be cited. One check contradicting another's requirement.
 *
 * Deliberately LEXICAL: it never touches the filesystem, so it stays pure and cannot be tricked into
 * resolving something. Containment against `..` and absolute paths is enforced separately, before
 * any read, by `badPath` in provenance.mjs and by the resolver in repo-io.mjs.
 */
export const normPath = (p) => String(p)
  .replaceAll('\\', '/')
  .replace(/^\.\//, '')
  .replace(/\/{2,}/g, '/');
