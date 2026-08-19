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
import { scanContainers, anySetextLevel as anySetext, atxLevel } from './markdown.mjs';

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
/**
 * Resolve the packet's remit, or explain PRECISELY why it cannot be resolved.
 *
 * AMBIGUOUS AND ABSENT ARE DIFFERENT PROBLEMS. Round 10 made two Remit headings return '' —
 * correctly, since a gate that cannot tell which question it is certifying must not certify either —
 * and the CLI then printed "add a `## Remit` section" to a document that has TWO. A remedy the
 * operator has already followed twice over is the refusal-fatigue signature this codebase names in
 * five other places, and it shipped in the same commit that fixed the hijack.
 * (Kimi K3 round 11 F4 / GLM-5.3 round 11 F3.)
 *
 * @returns {{remit:string, error?:string[]}} `error` present => the caller exits 2.
 */
export function resolveRemit(md, override) {
  const remit = (override ?? remitFromDoc(md)).trim();
  if (remit) return { remit };

  const n = countRemitHeadings(md);
  if (n > 1) {
    return { remit: '', error: [
      `packet-gate: ${n} "## Remit" sections found — the gate cannot tell which question it is certifying.`,
      '  Refusing to certify: delete the superseded section, or fence/comment it out, so exactly one remains.'] };
  }
  return { remit: '', error: [
    'packet-gate: no remit found — pass --remit "…" or add a "## Remit" section to the document.',
    '  Refusing to certify: R4 and R5 are unevaluable without a remit, and an unevaluable gate is not a passing gate.'] };
}

/**
 * How many Remit-shaped headings the document has, outside fences and HTML comments.
 *
 * Deliberately implemented by re-running `remitFromDoc`'s own traversal rather than re-stating the
 * heading grammar: a second copy of that regex is the last thing this parser needs, having been
 * patched five times. It is cheap (one pass over an already-small document) and it cannot drift.
 */
export function countRemitHeadings(md) {
  return remitFromDoc(md, { count: true });
}

export function remitFromDoc(md, opts) {
  // Same CRLF trap as parseFences, and it bit here too: `/^remit:\s*(.+)$/` cannot match a line
  // ending in `\r`, because `.` excludes line terminators — so frontmatter-style remits vanished
  // from every CRLF document, taking R4's and R5's anchors with them.
  // Container detection lives in ./markdown.mjs — the only place this gate models markdown
  // structure. Six hijacks came from disagreeing with CommonMark about what a line IS.
  const { outside, kind } = scanContainers(md);

  // THE HEADING GRAMMAR. Every clause below is a patch for a MEASURED defect, and the two failure
  // directions alternate — a decoy that the gate wrongly accepts as a heading (hijack), or a real
  // heading it wrongly rejects (a refusal telling the operator to add a section they already have).
  // Both end the same way when they hit: extraction yields the wrong text, the remit is non-empty so
  // the fail-closed guard stays silent, it names nothing so `aboutCode` goes false, and R4 and R5
  // both return [] having examined nothing.
  //
  //   `^ {0,3}`      four spaces is a CODE BLOCK, not a heading            (r8 F4, hijack)
  //   `#{2,6}`       seven hashes is not a valid ATX level                 (r8 F4, hijack)
  //   `[ \t]+`       CommonMark's separator; JS `\s` also matches U+00A0,
  //                  so `##<NBSP>Remit` — a paragraph — matched            (r9 F6, hijack)
  //   `(?:#+)?`      the CLOSED ATX form `## Remit ##`                     (r8 F3, refusal)
  //   `:` …          inline remit, `## Remit: review the refund flow`      (r6 F8, refusal)
  //   `[—–-]` …      dash separator, whitespace REQUIRED both sides, which
  //                  is what keeps `## Remit-to-pay …` from matching       (r7,  hijack)
  //   `\(([^)]*)\)?` parenthesised, closing paren optional because the
  //                  unclosed form is an ordinary typo                     (r8 F6 / r9 F6, refusal)
  //
  // Three of those patches were themselves the previous patch's hole. Treat any edit here as
  // security-relevant, and change the STOP test in the same commit — see round 9's F2.
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
  // AMBIGUITY MEANS TWO COMPETING SECTIONS — not a Remit heading at a DEEPER level.
  //
  // The round-10 rule counted every `#{2,6}` match in the document, so a legitimate packet with
  // `## Remit` and a later `### Remit` recap inside an appendix was refused as ambiguous. That is a
  // false refusal on an ordinary document layout, produced by the fix for the hijack — the same
  // over-tightening this session has now caused three times. (Kimi K3 round 11, F4.)
  //
  // Only the SHALLOWEST level competes: two `## Remit` headings genuinely leave the gate unable to
  // say which question it is certifying, while a `### Remit` beneath one of them is part of that
  // section, exactly as CommonMark nests it. The hijacks that motivated the rule — a draft section,
  // an indented decoy, an HTML comment — all sit at the SAME level as the real heading, so this
  // keeps every one of them closed.
  // SETEXT HEADINGS ARE HEADINGS. `Remit` underlined by `===` (H1) or `---` (H2) is CommonMark, and
  // the ATX-only test simply could not see it — so the document fell through to the frontmatter
  // fallback and the gate told the operator to add a `## Remit` section to a document that has one,
  // in a spelling markdown explicitly permits. The fourth instance of that miss-direction class in
  // this one parser (round 6 F8, round 8 F6, round 9 F6). (GLM-5.3 round 11, F6.)
  //
  // Treated as level 1 for `===` and level 2 for `---`, which is what CommonMark assigns them, so
  // the shallowest-level ambiguity rule above applies to them identically.
  /**
   * The level of ANY setext heading at line n — 1 for `===`, 2 for `---`, 0 for neither.
   * Deliberately not Remit-specific: the STOP test needs to recognise `Appendix\n----` as a section
   * terminator, and the first version of this helper only matched the word "Remit", so the stop test
   * saw nothing and every later section was absorbed into the question.
   */
  const anySetextLevel = (n) => anySetext(outside, n);

  /** A setext heading whose text is exactly `Remit` — the START test's concern. */
  const setextLevel = (n) => (/^ {0,3}remit[ \t]*$/i.test(outside[n] ?? '') ? anySetextLevel(n) : 0);

  const all = outside.map((l, n) => {
    if (l === null) return -1;
    return (HEADING_RE.test(l) || setextLevel(n)) ? n : -1;
  }).filter((n) => n !== -1);
  const levelAt = (n) => setextLevel(n) || /^ {0,3}(#{2,6})/.exec(outside[n])[1].length;

  // NESTING, NOT LEVEL. Round 12's first attempt asked "is this heading deeper?" and I pinned the
  // result as correct nesting after testing ONE layout — the decoy immediately above the real
  // section, where the decoy genuinely encloses it and the real anchors survive into extraction.
  //
  // That generalisation was wrong, and BOTH reviewers found it independently. Put an intervening
  // same-level heading between them:
  //     ## Remit            <- decoy, names nothing
  //     ## Implementation   <- ENDS the decoy's section
  //     ### Remit           <- the real question, now outside it
  // "Deeper" is still true and "nested" is now false. The decoy is the only competitor, extraction
  // stops at `## Implementation`, the remit becomes the decoy's prose, aboutCode goes false and R4
  // and R5 both examine nothing. Verified: extracted "A quick sanity check.", real anchor gone.
  //
  // A deeper Remit is part of a shallower one's section ONLY if no heading of level <= the
  // shallower one's appears between them — which is exactly how CommonMark bounds a section. Any
  // Remit heading that is not nested that way COMPETES, and two competitors are ambiguous.
  // ANY heading bounds a section, not only a Remit-shaped one — and setext counts. Using the
  // Remit-specific check here would have meant `## Implementation` bounded the section while
  // `Appendix\n----` did not, which is the same half-applied split that produced round 9's F2.
  const headingLevels = all.length
    ? outside.map((l, n) => (l === null ? 0 : (atxLevel(l) || anySetextLevel(n))))
    : [];
  const nestedIn = (outer, inner) => {
    if (levelAt(inner) <= levelAt(outer)) return false;
    for (let n = outer + 1; n < inner; n += 1) {
      if (headingLevels[n] && headingLevels[n] <= levelAt(outer)) return false; // section ended
    }
    return true;
  };
  const matches = all.filter((n) => !all.some((o) => o !== n && o < n && nestedIn(o, n)));
  // The counting mode shares this exact traversal and grammar — see countRemitHeadings.
  if (opts?.count) return matches.length;
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
    // A setext heading occupies TWO lines — the text and its underline — so the section body starts
    // one line further down, and its level comes from the underline character, not from hashes.
    const setext = setextLevel(i);
    const level = levelAt(i);
    const rest = outside.slice(i + (setext ? 2 : 1));
    // THE STOP TEST SEES SETEXT HEADINGS TOO. Round 12 taught the START test about `Remit\n===`
    // and left its sibling ATX-only — so `Appendix\n--------` never terminated the section and every
    // later heading's content was absorbed into the question. That is the round-9 F2 defect
    // VERBATIM ("the fix was HALF-APPLIED, and my own tests did not catch it because they exercise
    // where extraction STARTS, not what stops it"), committed one round after writing that sentence
    // into this very file, three lines below. Both reviewers quoted it back. The lesson evidently
    // does not transfer by being written down: whenever a heading rule changes, BOTH tests change.
    const restOffset = i + (setext ? 2 : 1);
    const stop = rest.findIndex((l, k) => {
      if (l === null) return false;
      const sx = anySetextLevel(restOffset + k);
      if (sx) return sx <= level;
      // RAW LINE, same grammar as the start test. This still read `l.trim()` after the round-8
      // rewrite — the fix was HALF-APPLIED, and my own tests did not catch it because they exercise
      // where extraction STARTS, not what stops it. So an indented `    ## Artifact` (a code block,
      // not a heading) still terminated the remit early, dropping every anchor below it: aboutCode
      // false, R4 and R5 inert, empty-remit guard silent because the remit is non-empty. The same
      // Category-2 shape the start-test fix closed, surviving in its sibling. (Kimi K3 round 9, F2.)
      const m = /^ {0,3}(#{1,6})[ \t]/.exec(l); // space or tab, per CommonMark — not JS `\s`
      return Boolean(m) && m[1].length <= level;
    });
    // A setext heading carries no inline remit text — its line is just the bare word.
    const hm = setext ? null : HEADING_RE.exec(outside[i]);
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
  // Bounded to the leading BLOCK, which is what "frontmatter" means in every format that has it.
  //
  // ROUND-12 CORRECTION, and the bound I wrote in round 10 was measured wrong twice over:
  //   - it capped a LINE COUNT at 10 while frontmatter is a BLOCK. An ordinary header carrying
  //     title/author/date/labels/status/reviewer pushed `remit:` to line 11 and the gate reported
  //     "no remit" on a document with perfectly valid frontmatter.
  //   - it `break`s on `l === null`, and null is what a fence or an HTML comment leaves behind. So a
  //     `<!-- generated -->` banner on line 1 — the most ordinary thing a generator emits — truncated
  //     the block to empty BEFORE the frontmatter that follows it.
  // Both are miss-direction false refusals introduced by the fix for a hijack. (GLM-5.3 round 11, F4.)
  //
  // Now: skip leading container lines (a banner is not content), then take the contiguous non-blank
  // block however long it is. The hijack this bound exists for — a prose line beginning "remit:"
  // deep in the document — is still closed, because prose is separated from the header by a blank
  // line, which is exactly what ends the block.
  // A LEADING HTML COMMENT IS A BANNER; A LEADING FENCE IS CONTENT.
  //
  // The skip exists for `<!-- generated -->` on line 1, which is metadata a generator emits above
  // real frontmatter. Skipping ALL containers went too far: a packet that opens with a fenced
  // EXAMPLE and then has prose beginning "remit:" had that prose treated as frontmatter — the exact
  // smuggle the block bound exists to prevent, reintroduced by the fix for the banner. Found by my
  // own round-12 pass, attacking the round-12 diff.
  //
  // A fence means the document body has begun, so nothing after it is frontmatter.
  let start = 0;
  while (start < outside.length && kind[start] === 'html') start += 1;
  const lead = [];
  for (let n = start; n < outside.length; n += 1) {
    const l = outside[n];
    if (l === null || l.trim() === '') break;
    lead.push(l);
  }
  const fm = lead.find((l) => /^remit:[ \t]*.+$/i.test(l));
  return fm ? /^remit:[ \t]*(.+)$/i.exec(fm)[1].trim() : '';
}
