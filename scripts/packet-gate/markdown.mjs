/**
 * markdown.mjs — the only place this gate models markdown STRUCTURE.
 * ==================================================================
 * Split out of remit.mjs for the 300-line cap (CLAUDE.md rule 4). Unchanged by the move.
 *
 * Every hijack the remit parser suffered — six of them — came from disagreeing with CommonMark about
 * what a line IS: a code fence, an HTML comment, an ATX heading, a setext heading, or prose. Five
 * rounds patched the heading GRAMMAR one character class at a time (trim, indent, hash count,
 * whitespace class, separator punctuation) and the sixth found the parser had never asked what
 * CONTAINER a line was in at all. Keeping that judgement in one module, with the grammar it implies,
 * is the point of this file existing.
 *
 * @module packet-gate/markdown
 */
import { splitDocLines } from './normalize.mjs';

/**
 * Split a document into lines, blanking every line that is not document CONTENT.
 *
 * @returns {{outside:(string|null)[], kind:string[]}} `kind` records WHY a line was blanked —
 *   'fence', 'html' or 'text'. The frontmatter bound must skip a leading `<!-- generated -->` banner
 *   while STOPPING at a leading fence, and inferring that from the line's own text fails on a
 *   multi-line comment whose middle lines look like ordinary prose.
 */
export function scanContainers(md) {
  const lines = splitDocLines(md);

  // FENCE-AWARE. A `## Remit` heading or a `remit:` line INSIDE a code fence is sample content,
  // not the packet's question. Without this, a packet that merely documents a remit (a YAML sample,
  // a quoted example) hijacks extraction and the gate evaluates text the model was never asked.
  const outside = [];
  const kind = [];
  let fence = null;
  let html = false;
  for (const line of lines) {
    // HTML COMMENTS ARE NOT DOCUMENT CONTENT. The fence-aware loop knew ``` and ~~~ and nothing
    // else, so a `## Remit` inside `<!-- … -->` — invisible in every renderer — was a heading to
    // findIndex. A superseded draft left in a comment above the real section hijacked extraction:
    // remit became the comment's text, non-empty (guard silent), naming nothing (R4 and R5 inert).
    // The parser had been patched three times for the heading's CHARACTER CLASS and never once
    // asked what CONTAINER the line was in. (GLM-5.3 round 10, F2.)
    if (!fence && /^\s*<!--/.test(line)) html = true;
    if (html) {
      outside.push(null);
      kind.push('html');
      if (/-->/.test(line)) html = false;
      continue;
    }
    // `[^\n]*`, matching parseFences: `.` excludes Unicode line terminators, so a fence line
    // carrying one would go unnoticed here and a `## Remit` heading inside that fence would hijack
    // extraction — the fence-awareness this loop exists for, silently switched off.
    const m = /^[ \t]*(`{3,}|~{3,})([^\n]*)$/.exec(line);
    if (m) {
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === '') fence = null;
      outside.push(null);
      kind.push('fence');
      continue;
    }
    outside.push(fence ? null : line);
    kind.push(fence ? 'fence' : 'text');
  }
  return { outside, kind };
}

/**
 * The level of ANY setext heading at line n — 1 for `===`, 2 for `---`, 0 for neither.
 *
 * Deliberately NOT Remit-specific. The section STOP test must recognise `Appendix` over `--------`
 * as a terminator, and the first version of this helper matched only the word "Remit" — so the stop
 * test saw nothing and every later section was absorbed into the question. That was the round-9
 * half-applied-fix defect repeated verbatim, one round after its lesson was written into this
 * parser: whenever a heading rule changes, BOTH the start test and the stop test change.
 */
export function anySetextLevel(outside, n) {
  if (n + 1 >= outside.length) return 0;
  const text = outside[n];
  const rule = outside[n + 1];
  if (text === null || rule === null) return 0;
  if (text.trim() === '' || /^ {0,3}#{1,6}[ \t]/.test(text)) return 0; // blank, or already ATX
  if (/^ {0,3}=+[ \t]*$/.test(rule)) return 1;
  if (/^ {0,3}-+[ \t]*$/.test(rule)) return 2;
  return 0;
}

/** The level of an ATX heading line, or 0. Accepts `#{1,6}` for section bounding. */
export function atxLevel(line) {
  const m = /^ {0,3}(#{1,6})[ \t]/.exec(line ?? '');
  return m ? m[1].length : 0;
}
