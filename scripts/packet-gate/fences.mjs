/**
 * fences.mjs — markdown fence parsing for the packet gate.
 * ========================================================
 * Split out of checks.mjs to keep both files under the 300-line cap (CLAUDE.md rule 4) and because
 * parsing and judging are genuinely different jobs: this module decides only *what the operator
 * wrote*, never *whether it is acceptable*.
 *
 * The central distinction is CITED vs UNCITED:
 *   cited    ```js path=backend/x.mjs lines=40-118   — claims provenance, so R3 byte-verifies it
 *   uncited  ```js                                   — illustrative, never byte-checked
 *
 * @module packet-gate/fences
 */

/**
 * THE LINE-ENDING NORMALIZER lives in ./normalize.mjs — imported, never re-declared here.
 *
 * It is applied at the PARSER rather than at the one CLI call site, deliberately: these parsers are
 * exported and called directly by the canaries, the tests and build-packet, so a choke point that
 * only covered `main()` would leave every other caller holding raw text. Round 4's critical is
 * written up in full at its definition — read it there before touching this file's regex, because
 * the regex is exactly what the `\r` defeats.
 */
import { splitDocLines } from './normalize.mjs';

/** Remove up to `n` leading spaces/tabs (CommonMark fence de-indentation); never eats content. */
function stripIndent(line, n) {
  let i = 0;
  while (i < n && (line[i] === ' ' || line[i] === '\t')) i += 1;
  return line.slice(i);
}

/**
 * Parse fenced code blocks and their info-string attributes.
 *
 * Handles ``` and ~~~ fences of length >= 3; a fence closes on a run of the same character that is
 * at least as long and carries no info string, which is how CommonMark nests fences inside fences.
 *
 * Fence indentation is stripped from the body. A verbatim block nested in a bullet list is indented
 * by markdown, and without this it would fail byte-verification purely because of leading spaces —
 * a FALSE refusal, which is the failure mode that teaches operators to ignore refusals.
 *
 * THE MATCHER MUST NOT DEPEND ON LINE-TERMINATOR SEMANTICS. Round 4's critical was CRLF: `.` does
 * not match `\r`, so a CRLF fence line matched nothing and the parser returned [] for the whole
 * document — no blocks meant no UNCITED blocks, and the fabrication guard filters on exactly those.
 * Folding line endings fixed CRLF and left the CLASS open: `.` also excludes U+2028 LINE SEPARATOR
 * and U+2029 PARAGRAPH SEPARATOR. A document using U+2028 as its line break, sent with an explicit
 * `--remit`, still reached `PACKET READY / no fences present / exit 0` carrying hand-typed code —
 * the identical signature, one round later, found by attacking the round-4 fix itself.
 *
 * So the fix is at both levels, deliberately: normalizeEol folds `\r\n`/`\r` so line SPLITTING is
 * right, and the matcher below uses `[^\n]*` so no Unicode terminator can make a fence invisible
 * even if a normalizer is later changed or bypassed. Splitting stays on `\n` ALONE on purpose —
 * folding U+2028 into a line break would renumber the lines of any source file that legitimately
 * contains one inside a string literal, and every `lines=N-M` citation into that file would break.
 * A document that really is U+2028-separated now parses as one enormous unterminated fence, which
 * is uncited, which is refused. Fail-closed.
 *
 * @returns {{lang:string, attrs:object, body:string, start:number, end:number, cited:boolean}[]}
 */
export function parseFences(markdown) {
  const lines = splitDocLines(markdown);
  const blocks = [];
  let open = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // `[^\n]*`, NOT `.*`. See the note above parseFences: `.` excludes every Unicode line
    // terminator, so a fence line carrying one silently fails to match and the fence disappears.
    const m = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/.exec(line);
    if (!m) { if (open) open.body.push(stripIndent(line, open.indent)); continue; }

    const [, indent, fence, info] = m;
    if (open) {
      const sameChar = fence[0] === open.fence[0];
      if (sameChar && fence.length >= open.fence.length && info.trim() === '') {
        open.end = i + 1;
        blocks.push(open);
        open = null;
      } else {
        open.body.push(stripIndent(line, open.indent));
      }
      continue;
    }

    const attrs = {};
    for (const a of info.trim().matchAll(/([A-Za-z][\w-]*)=("([^"]*)"|\S+)/g)) attrs[a[1]] = a[3] ?? a[2];
    // The language is the first token ONLY when it is a bare word. With no language but attributes
    // present — ```` ``` path=x.mjs lines=1-2 ```` — the old code took `path=x.mjs` AS the language,
    // which is simply wrong and would mis-classify a block the moment anything reasoned about lang.
    const first = info.trim().split(/\s+/)[0] || '';
    open = { lang: first.includes('=') ? '' : first, attrs, body: [], start: i + 1, end: -1, fence, indent: indent.length };
  }
  // An unterminated fence is malformed markdown; keep what we have so R3 can still inspect it.
  if (open) { open.end = lines.length; blocks.push(open); }

  return blocks.map((b) => ({ ...b, body: b.body.join('\n'), cited: typeof b.attrs.path === 'string' }));
}

/**
 * Unverified content = ANY fence that is not cited. Language is irrelevant, and that is the whole
 * point of this function existing.
 *
 * The first version of the anchor-free guard filtered on `b.lang && !/^(text|json|yaml|…)$/`, which
 * meant a BARE fence (no info string at all → falsy `lang`) counted as nothing. Round 1 closed
 * "anchor-free remit + ```js fake code" and reopened the identical bypass with one FEWER keystroke:
 * ``` with no language. Both paid reviewers found it independently, and the approval view cheerfully
 * printed "no code fences present" over a packet full of hand-typed code.
 *
 * A single predicate, used by every caller, so the two copies cannot drift apart again — the
 * duplication was itself flagged as a defect waiting to happen, and it was right.
 */
export const isUnverifiedFence = (b) => !b.cited;

/** Where a block came from, for findings: the document, or the `--seed` file appended after it.
 *  A refusal that says "line 7" when the operator's document has no line 7 is undiagnosable. */
export const blockWhere = (b) => (b.origin ? `${b.origin} line ${b.start}` : `line ${b.start}`);

/** Tag every block with the channel it arrived on, so one set of checks can police both. */
export const parseFencesFrom = (text, origin) => parseFences(text).map((b) => ({ ...b, origin }));

/**
 * Lines that LOOK like fence delimiters but which the parser did not consume as delimiters.
 *
 * THE ROUND-5 GENERALIZATION, and the reason this exists instead of a longer character class.
 * Round 4's critical was `\r`. Round 5 found U+2028/U+2029 (same mechanism), then a BOM and a
 * non-breaking space before the backticks (different mechanism — `^[ \t]*` simply does not admit
 * them). Each was patched-and-reopened one code point at a time, which is a losing game: the strict
 * matcher will always admit a smaller set than some downstream reader, and every gap is a fence the
 * gate cannot see while the MODEL still reads the content as code.
 *
 * Both failure faces come from the same disagreement:
 *   - FAIL-OPEN: an opener the parser misses means the block never exists, so there are no uncited
 *     fences to refuse. A BOM'd unterminated block with an anchor-free remit reached exit 0.
 *   - FALSE REFUSAL: an opener the parser misses turns the intended CLOSER into an opener, inverting
 *     fence parity so the rest of the document becomes one uncited block. The operator is told to
 *     "cite" their own closing delimiter — a remedy that cannot be followed.
 *
 * So rather than enumerate what may precede a fence, compare a LENIENT reading against the strict
 * one and refuse when they disagree. `\s` in JavaScript already includes U+00A0, U+FEFF, U+2028,
 * U+2029, U+000B and U+000C, so it is exactly the "anything a human or renderer would forgive"
 * class. Any fence-like line that is neither a delimiter the parser used nor inside a block body is
 * a line the two readings disagree about, and the gate must not certify a document it cannot agree
 * with itself about.
 *
 * Nested fences are NOT anomalies: a ``` inside a ````-delimited body is legitimately not a
 * delimiter, which is why body ranges are excluded rather than just the delimiter lines.
 */
export function fenceParseAnomalies(markdown) {
  const lines = splitDocLines(markdown);
  const blocks = parseFences(markdown);
  const delimiters = new Set();
  for (const b of blocks) { delimiters.add(b.start); delimiters.add(b.end); }
  const insideBody = (n) => blocks.some((b) => n > b.start && n < b.end);

  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const n = i + 1;
    if (!/^\s*(`{3,}|~{3,})/.test(lines[i])) continue;
    if (delimiters.has(n) || insideBody(n)) continue;
    out.push(n);
  }
  return out;
}
