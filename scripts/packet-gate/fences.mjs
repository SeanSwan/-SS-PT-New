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
 * @returns {{lang:string, attrs:object, body:string, start:number, end:number, cited:boolean}[]}
 */
export function parseFences(markdown) {
  const lines = String(markdown).split('\n');
  const blocks = [];
  let open = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = /^([ \t]*)(`{3,}|~{3,})(.*)$/.exec(line);
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
