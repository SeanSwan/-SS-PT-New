/**
 * remit.mjs — pulling the packet's QUESTION out of the document.
 * ==================================================================
 * Split out of checks.mjs for the 300-line cap (CLAUDE.md rule 4). Unchanged by the move.
 *
 * This parser has been the single most-attacked surface in the gate after R4's binding, and every
 * defect it produced was the SAME shape: extraction silently yields the wrong text, the remit is
 * non-empty so the fail-closed empty-remit guard never fires, it names nothing so `aboutCode` goes
 * false, and R4 and R5 both return [] having examined nothing. A phantom route ships at exit 0 with
 * two checks silent. It has been patched for that shape four times — a JS-invalid `\Z` lookahead, a
 * subheading terminator, an inline-heading hijack, and a whitespace class — and three of those
 * patches were themselves the previous patch's hole. Treat any change here as security-relevant.
 *
 * @module packet-gate/remit
 */
import { splitDocLines } from './normalize.mjs';

/**
 * Pull the remit out of a packet document: a `## Remit` section, else a `remit:` frontmatter line.
 *
 * Deliberately line-based, not a regex with a lookahead. The first version used
 * `(?=^##\s|\Z)` — but `\Z` is not a JavaScript assertion. Under `/i` it matched the literal
 * letter `z`, so the remit silently truncated at the first "z" in the text ("Is the authori…"),
 * which dropped every anchor after it and silently disabled R4 and R5. The gate reported a clean
 * premise check because it had nothing left to check. That is exactly the decorative-gate failure
 * this module exists to prevent, so the parser is now boring on purpose and canaried below.
 */
export function remitFromDoc(md) {
  // Same CRLF trap as parseFences, and it bit here too: `/^remit:\s*(.+)$/` cannot match a line
  // ending in `\r`, because `.` excludes line terminators — so frontmatter-style remits vanished
  // from every CRLF document, taking R4's and R5's anchors with them.
  const lines = splitDocLines(md);

  // FENCE-AWARE. A `## Remit` heading or a `remit:` line INSIDE a code fence is sample content,
  // not the packet's question. Without this, a packet that merely documents a remit (a YAML sample,
  // a quoted example) hijacks extraction and the gate evaluates text the model was never asked.
  const outside = [];
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
      continue;
    }
    outside.push(fence ? null : line);
  }

  // THE HEADING MAY CARRY THE REMIT INLINE. `/^#{2,}\s*remit\s*$/` required the heading to be the
  // bare word, so `## Remit: review the refund flow` — a completely natural spelling — was not found
  // at all, and the gate exited 2 telling the operator to "add a `## Remit` section" to a document
  // that has one. A remedy the operator has already followed is the refusal-fatigue signature this
  // file names in three other places. (GLM-5.3 round 6, F8.)
  //
  // Trailing punctuation with no text (`## Remit:`) is also accepted; the inline text, when present,
  // becomes the first line of the remit and the following lines still append.
  // The separator must be a COLON, or whitespace before a dash. `\s*[:—–-]` matched `Remit-driven`,
  // `Remit-to-pay`, `Remit-check` — so `## Remit-to-pay reconciliation` anywhere in the document
  // hijacked extraction (findIndex takes the FIRST match), the remit became "to-pay reconciliation"
  // plus that section's body, `aboutCode` went false, and R4 and R5 were both inert while the
  // empty-remit guard stayed silent because the remit was non-empty garbage. That is the exact
  // Category-2 signature the round-5 subheading fix was written about, reintroduced one round later
  // by the inline-remit fix. Both reviewers found it independently. (Kimi K3 F3 / GLM-5.3 F4.)
  // `(?:#+\s*)?` accepts the CLOSED ATX form `## Remit ##`, which is valid CommonMark and was
  // missed — the gate told the operator to add a section the document already had, in a spelling
  // markdown explicitly permits. (Kimi K3 round 8, F3.)
  // COMMONMARK'S HEADING GRAMMAR, MATCHED ON THE RAW LINE — not `trim()` plus a loose regex.
  //
  // Round 5 made both the start and stop tests run on `l.trim()` ("one predicate, one spelling"),
  // which fixed an indentation asymmetry and opened a worse hole: `trim()` makes lines match that
  // CommonMark does not consider headings AT ALL. Verified, all three:
  //     `    ## Remit`  4-space indent — a CODE BLOCK, not a heading
  //     `##Remit`       no space after the hashes — a paragraph
  //     `#######Remit`  seven hashes — not a valid ATX level
  // Each is found FIRST by findIndex, and the real `## Remit` below then STOPS extraction (level
  // <= level), so the remit becomes the decoy's text: non-empty, so the fail-closed empty-remit
  // guard never fires; naming nothing, so `aboutCode` goes false, R4 returns [] and R5 has no
  // anchors. A phantom route in the REAL remit — R5's founding failure mode — ships at exit 0 with
  // both checks silent. The Category-2 signature, reached through the trim fix rather than a regex.
  // (GLM-5.3 round 8, F4.)
  //
  // So: `^ {0,3}` (four spaces is code), `#{2,6}` (capped), and a REQUIRED space after the hashes.
  // The separator alternatives are unchanged apart from adding the parenthesised form, which was a
  // pure MISS — `## Remit (review the refund flow)` matched nothing and the gate told the operator
  // to add a section the document already had. (GLM-5.3 round 8, F6.)
  //
  // `[—–-]` still requires whitespace before AND after, which is what keeps `## Remit-to-pay …`
  // from matching — round 7's fix for the hijack in the other direction. Verified both ways.
  // `\(([^)]*)\)?` — the closing paren is OPTIONAL. `## Remit (review the refund flow` (unclosed,
  // a perfectly ordinary typo) matched no alternative, so the trailing `\s*$` failed, the heading
  // was not found, and the gate told the operator to add a `## Remit` section to a document whose
  // CommonMark heading is exactly that. Same miss-direction class as the parenthesised form itself,
  // one alternative over. (Kimi K3 round 9, F6.)
  // `[ \t]+` after the hashes, NOT `\s+`. CommonMark's ATX rule is a space or a tab; JavaScript's
  // `\s` also matches U+00A0 NBSP, U+2028, U+3000 and friends. So `##<NBSP>Remit` — a PARAGRAPH in
  // every markdown renderer — matched this gate's heading test, and round-8's decoy hijack reopened
  // one invisible byte over: the fake heading is found first, the real `## Remit` below stops
  // extraction, and the remit becomes the decoy's text while R4 and R5 go inert. The round-8 fix
  // tightened the *shape* of a heading and left its *whitespace class* as JavaScript's rather than
  // CommonMark's. (GLM-5.3 round 9, F6 — the same hijack this file has now been patched for three
  // times, each time through the previous patch.)
  const HEADING_RE = /^ {0,3}#{2,6}[ \t]+remit[ \t]*(?:#+)?[ \t]*(?::[ \t]*(.*)|[—–-][ \t]+(.*)|\(([^)]*)\)?)?[ \t]*$/i;
  // AMBIGUITY IS REFUSED, not silently resolved by taking the first.
  //
  // Every hijack this parser has suffered — five now — worked the same way: get ONE extra
  // Remit-shaped line above the real one and `findIndex` takes it. Patching container types and
  // character classes one at a time has failed four consecutive rounds, and round 9's own
  // parenthesised alternative made it worse by making `## Remit (draft)` a legitimate heading, so an
  // ordinary draft-above-final layout hijacks with no trickery at all.
  //
  // So the first-match rule itself is the defect. A document with two Remit headings is AMBIGUOUS,
  // and a gate that cannot tell which question it is certifying must not certify either. Returning
  // '' makes the CLI's fail-closed empty-remit guard fire (exit 2) with an actionable message —
  // which is the correct outcome for a genuine draft-plus-final document too.
  const matches = outside.map((l, n) => (l !== null && HEADING_RE.test(l) ? n : -1)).filter((n) => n !== -1);
  if (matches.length > 1) return '';
  const i = matches.length ? matches[0] : -1;
  if (i !== -1) {
    // STOP ONLY AT A HEADING OF THE SAME LEVEL OR HIGHER — not at any heading at all.
    //
    // The stop test used `/^#{1,6}\s/`, so a SUBHEADING inside the remit section ended it. A remit
    // written the way people actually write them —
    //     ## Remit
    //     Review the refund flow end to end.
    //     #### In scope
    //     `src/refunds/run.mjs` and its route
    // — extracted only the first sentence. Every anchor below the subheading was dropped before
    // extractAnchors saw it, so `aboutCode` went false, R4 returned [] unconditionally and R5 had
    // nothing to resolve. Both checks silently did not run, which is the Category-2 failure this
    // gate exists to refuse in other people's code, reached through the back door: the fail-closed
    // empty-remit guard never fires because the remit is non-empty, just truncated. A phantom route
    // below the subheading would be blessed. (GLM-5.3 round 5, F3.)
    //
    // This also matches CommonMark, where only a heading of level <= 2 closes a `##` section.
    //
    // Both tests now run on `l.trim()`. They disagreed before — start trimmed, stop did not — so an
    // indented `## path/to/file.mjs` (still an ATX heading in CommonMark at <= 3 spaces) failed the
    // stop test and was ABSORBED into the remit, injecting a real path anchor the operator never
    // wrote and letting R4 be satisfied by citing it instead of the true subject. (Kimi K3 round 5,
    // F6.) One predicate, one spelling, applied at both ends.
    const level = /^ {0,3}(#{2,6})/.exec(outside[i])[1].length;
    const rest = outside.slice(i + 1);
    const stop = rest.findIndex((l) => {
      if (l === null) return false;
      // RAW LINE, same grammar as the start test. This still read `l.trim()` after the round-8
      // rewrite — the fix was HALF-APPLIED, and my own tests did not catch it because they exercise
      // where extraction STARTS, not what stops it. So an indented `    ## Artifact` (a code block,
      // not a heading) still terminated the remit early, dropping every anchor below it: aboutCode
      // false, R4 and R5 inert, empty-remit guard silent because the remit is non-empty. The same
      // Category-2 shape the start-test fix closed, surviving in its sibling. (Kimi K3 round 9, F2.)
      const m = /^ {0,3}(#{1,6})[ \t]/.exec(l); // space or tab, per CommonMark — not JS `\s`
      return Boolean(m) && m[1].length <= level;
    });
    const hm = HEADING_RE.exec(outside[i]);
    const inline = (hm?.[1] ?? hm?.[2] ?? hm?.[3])?.trim();
    const body = (stop === -1 ? rest : rest.slice(0, stop)).filter((l) => l !== null);
    return [inline || null, ...body].filter((l) => l !== null).join('\n').trim();
  }
  // FRONTMATTER MEANS THE TOP OF THE DOCUMENT — it is the one part of this parser no review had
  // touched, and it carried the same hijack the heading form has now been patched for four times.
  // `outside.find` scanned the WHOLE document, so any prose line beginning "remit:" — a sentence
  // like "remit: see below", a quoted example, a changelog entry — became the packet's question when
  // no `## Remit` heading existed. Same shape as always: non-empty, so the fail-closed empty-remit
  // guard never fires; naming nothing, so aboutCode goes false and R4 and R5 both go inert.
  //
  // Bounded to the leading block (up to the first blank line, and at most the first 10 lines), which
  // is what "frontmatter" means in every format that has it. Found by my own round-10 pass.
  const lead = [];
  for (const l of outside.slice(0, 10)) {
    if (l === null || l.trim() === '') break;
    lead.push(l);
  }
  const fm = lead.find((l) => /^remit:[ \t]*.+$/i.test(l));
  return fm ? /^remit:[ \t]*(.+)$/i.exec(fm)[1].trim() : '';
}
