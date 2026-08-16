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
