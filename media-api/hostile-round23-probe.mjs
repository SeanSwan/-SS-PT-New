/**
 * hostile-round23-probe.mjs — THE QUEUE-COMPLETION PROJECTION, attacked for the first time.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * The ledger test picked this surface: `backend/scripts/handlers/completion.mjs` is the ONE
 * module in the lane's own directories that the file-table assertion exempts BY NAME, on the
 * stated grounds that "the lane has never modified it and it is absent from the patch".
 *
 * That is a fact about the PATCH, not about the lane's dependency surface. `generateVideo.mjs`
 * imports `mimeForFilename` from here, so every video job's artifact pointer — the r2Key, the
 * mime and the operator log line — is built out of this file's output. Twenty-two rounds
 * attacked the money, the licence, the provenance record, both adapters, the ledger's write
 * path and the HTTP primitives, and left the one module the review had formally excluded from
 * its own coverage assertion unexamined. This is the skill's rule in its purest form: the best
 * finds are in files nobody named.
 *
 * ── THE DEFECTS, MEASURED BEFORE ANY FIX ───────────────────────────────────
 *
 *   1. **`MIME_BY_EXT[ext]` resolved through `Object.prototype`.** `MIME_BY_EXT` is a plain
 *      object literal — `Object.freeze` does not remove the prototype — so the lookup is
 *      `MIME_BY_EXT[ext]` and not `MIME_BY_EXT[ext] ?? fallback`. Measured:
 *
 *          mimeForFilename('out.constructor')  ->  [function]   the Object constructor
 *          mimeForFilename('out.__proto__')    ->  [object]     Object.prototype
 *          mimeForFilename('out.toString')     ->  video-ish?  no: 'application/octet-stream'
 *
 *      The last line is why this hid: only names that are ALREADY lowercase reach the
 *      prototype, and `toString` lowercases to `tostring`, which misses. So the obvious probe
 *      (`a.toString`) comes back clean and `a.constructor` does not. Both values are truthy,
 *      so the `||` fallback passed them straight through — and then `JSON.stringify` DROPPED
 *      the key, because a function is not JSON. **The queue received a completion body with
 *      no `mime` at all** — silently absent, which is the same defect the module was extracted
 *      to fix, one layer down.
 *   2. **`completionSummary`'s fallback shipped the string its own header indicts.** The
 *      docstring says `offset undefineds usable=undefined` is "worse than silence, because it
 *      reads as a measurement that ran and failed". The `??` fix only helped callers that
 *      already declared a summary; the indicted expression stayed as the default, and
 *      `render-agent.mjs:262` prints this unconditionally to the operator log.
 *   3. **`completionBody` used `||` where a TYPE is required.** `||` answers "is it absent".
 *      A function is not absent. So the fallback that reads as "a string is guaranteed here"
 *      guaranteed nothing.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * Sections A–D drive the real exports and FAIL on the pre-fix module. Section F's mutation
 * controls report "MUTATION DID NOT APPLY" there, because the strings they re-introduce do not
 * exist until the fix lands — the same shape as rounds 21 and 22, and the reason the pre-fix
 * replay is a real number rather than a claim.
 *
 * Section E is the one that is not about `completion.mjs` at all. Round 21 established that a
 * self-consistency check must be TOTAL over the places a fact is written, and then asserted the
 * file count in six places while leaving the gate count and the defect total unasserted. Both had
 * drifted, and E found them — which is the fourth defect of the round and the only one that lives
 * in the document rather than in the code.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No job is created, no queue is contacted, no server is started, no provider is enabled, and
 * no file outside a temp directory is written.
 */

import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  completionBody, completionSummary, mimeForFilename,
} from '../backend/scripts/handlers/completion.mjs';

let passed = 0; let failed = 0;
/**
 * How many assertions section E is expected to make. Measured once by running the probe and
 * reading the `E0` pin's own diagnostic, then written down — see the R3-4 note at the call site.
 * The pin exists so that DELETING the invocation fails loudly rather than silently removing the
 * assertions, which is the defect round 3 filed as R3-4.
 *
 * Raised 9 -> 10 on 2026-09-21 when E1e (the R4-1 compound-number control) was ADDED. The pin
 * fired first and its diagnostic named both numbers, which is the intended workflow: the number
 * is updated by a human who has decided the new count is right, never by the check quietly
 * agreeing with whatever it found.
 */
const E_LEDGER_CHECKS = 10;
/** Counts assertions made inside section E, so the pin can tell "ran" from "was deleted". */
let sectionEChecks = 0;
const check = (name, ok, detail) => {
  if (String(name).startsWith('E') && !String(name).startsWith('E0')) sectionEChecks += 1;
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);

/**
 * Every name that can be reached through `Object.prototype`, lowercased, because the
 * extension is lowercased before the lookup. Derived from the runtime rather than typed out:
 * a hand-written list of the two names that happen to work today is a list that drifts.
 */
const PROTO_EXTENSIONS = Object.getOwnPropertyNames(Object.prototype)
  .map((n) => n.toLowerCase());

async function main() {
  console.log('HOSTILE PROBE — ROUND 23: the queue-completion projection, attacked for the first time\n');

  // ══ A. mimeForFilename must return a STRING, always ══════════════════════
  section('A. mimeForFilename must return a string for every extension, including prototype names');
  {
    const real = [['render.mp4', 'video/mp4'], ['clip.webm', 'video/webm'],
      ['a.mov', 'video/quicktime'], ['a.mkv', 'video/x-matroska'], ['a.gif', 'image/gif'],
      ['RENDER.MP4', 'video/mp4'], ['a.b.c.mp4', 'video/mp4']];
    for (const [file, want] of real) {
      const got = mimeForFilename(file);
      check(`A. ${file} -> ${want}`, got === want && typeof got === 'string',
        `-> got ${typeof got} ${JSON.stringify(got)}`);
    }

    // The fallback cases must be a STRING too, not merely "not undefined".
    for (const file of ['noext', '', null, undefined, 'trailing.mp4 ']) {
      const got = mimeForFilename(file);
      check(`A. ${JSON.stringify(file)} falls back to a string`,
        got === 'application/octet-stream',
        `-> got ${typeof got} ${typeof got === 'function' ? '[FUNCTION]' : JSON.stringify(got)}`);
    }

    // THE DEFECT. Total over the prototype, so this cannot pass by listing the wrong names.
    const reached = [];
    for (const ext of PROTO_EXTENSIONS) {
      const got = mimeForFilename(`artifact.${ext}`);
      if (typeof got !== 'string') reached.push(`${ext} -> ${typeof got}`);
    }
    check('A. no prototype name can produce a non-string mime',
      reached.length === 0,
      reached.length
        ? `-> ${reached.length} prototype name(s) reached the lookup: ${reached.join(', ')}. `
          + 'A function or object here is truthy, so every `||` downstream passes it through, '
          + 'and JSON.stringify then drops the key.'
        : `-> probed ${PROTO_EXTENSIONS.length} prototype names, all returned strings`);

    // The two that actually bit, named, so the round's own record is concrete.
    check('A. the two reachable names return strings (constructor, __proto__)',
      typeof mimeForFilename('out.constructor') === 'string'
      && typeof mimeForFilename('out.__proto__') === 'string',
      `-> constructor: ${typeof mimeForFilename('out.constructor')}, `
      + `__proto__: ${typeof mimeForFilename('out.__proto__')}`);
  }

  // ══ B. the /complete payload must carry a string mime ════════════════════
  section('B. the queue payload must carry a mime, and it must be a string');
  {
    const outs = [
      ['a declared mp4', { r2Key: 'jobs/j1/r4.mp4', mime: 'video/mp4' }, 'video/mp4'],
      ['nothing declared', {}, 'application/json'],
      ['a prototype-named artifact', { mime: mimeForFilename('out.constructor') }, null],
      ['__proto__ artifact', { mime: mimeForFilename('out.__proto__') }, null],
      ['a non-string mime', { mime: 42 }, 'application/json'],
      ['an empty mime', { mime: '' }, 'application/json'],
    ];
    for (const [label, out, want] of outs) {
      const body = completionBody({ id: 'j1' }, out);
      check(`B. ${label}: body.mime is a string`,
        typeof body.mime === 'string' && body.mime.trim() !== '',
        `-> ${typeof body.mime} ${typeof body.mime === 'function' ? '[FUNCTION]' : JSON.stringify(body.mime)}`);
      if (want) {
        check(`B. ${label}: body.mime is ${want}`, body.mime === want, `-> ${JSON.stringify(body.mime)}`);
      }
      // THE DEFECT. What actually goes over the wire.
      const wire = JSON.parse(JSON.stringify(body));
      check(`B. ${label}: mime SURVIVES the JSON round-trip`,
        Object.hasOwn(wire, 'mime') && typeof wire.mime === 'string',
        `-> the serialised body was ${JSON.stringify(wire)}`
        + (Object.hasOwn(wire, 'mime') ? '' : ' — the mime key is GONE, so the queue stores a'
          + ' completion with no artifact type at all'));
    }

    // The r2Key is the other field the queue persists, and it had the same `||` shape.
    check('B. a non-string r2Key falls back rather than serialising away',
      typeof completionBody({ id: 'j9' }, { r2Key: {} }).r2Key === 'string',
      `-> ${JSON.stringify(completionBody({ id: 'j9' }, { r2Key: {} }).r2Key)}`);
  }

  // ══ C. the operator log line must not invent a measurement ══════════════
  section('C. completionSummary must never print the string its own header indicts');
  {
    const mediasync = completionSummary({ offsetSeconds: 1.25, usable: true });
    check('C. CONTROL: the mediasync line is unchanged',
      mediasync === 'offset 1.2500s usable=true', `-> ${JSON.stringify(mediasync)}`);
    check('C. CONTROL: a declared summary wins',
      completionSummary({ summary: 'r4.mp4 (19 bytes)' }) === 'r4.mp4 (19 bytes)');
    check('C. CONTROL: a false `usable` still prints as false',
      completionSummary({ offsetSeconds: 0, usable: false }) === 'offset 0.0000s usable=false',
      `-> ${JSON.stringify(completionSummary({ offsetSeconds: 0, usable: false }))}`);

    // THE DEFECT. `render-agent.mjs:262` prints this for ANY handler that declares nothing.
    for (const [label, out] of [
      ['a handler that declares nothing', {}],
      ['an empty summary', { summary: '' }],
      ['a whitespace summary', { summary: '   ' }],
      ['a half-mediasync shape', { offsetSeconds: 1.25 }],
    ]) {
      const line = completionSummary(out);
      check(`C. ${label}: no invented measurement`,
        !/undefined/.test(line) && typeof line === 'string' && line.trim() !== '',
        `-> printed ${JSON.stringify(line)}`);
    }
  }

  // ══ D. the coupling: one mime lookup, derived from one predicate ════════
  section('D. the handler must keep deriving its mime from this module');
  {
    const gen = readFileSync(new URL('../backend/scripts/handlers/generateVideo.mjs', import.meta.url), 'utf8');
    check('D. generateVideo.mjs imports mimeForFilename from completion.mjs',
      /import\s*\{[^}]*\bmimeForFilename\b[^}]*\}\s*from\s*['"]\.\/completion\.mjs['"]/.test(gen),
      '-> the coupling is the whole reason this module is in scope; if the import moves, this '
      + 'probe is reviewing a file nothing uses and must be re-pointed, not deleted.');
    check('D. generateVideo.mjs calls it on the adapter filename',
      /mimeForFilename\(\s*result\.filename\s*\)/.test(gen),
      '-> a second hand-rolled mime lookup would bypass every check in section A.');
  }

  // ══ E. the ledger's own totals must be self-consistent ══════════════════
  //
  // ── R3-4: A PIN THAT ASSERTS TEXT EXISTS DOES NOT ASSERT IT EXECUTES ───────
  //
  // This call was pinned by nothing. Round 3 (R3-4) measured it: deleting the single line below
  // dropped this probe from 52 checks to 43 — nine assertions, the whole of section E — and the
  // probe still printed "43 passed, 0 failed" and exited 0. No other gate references
  // `ledgerSelfConsistency`, so the ENTIRE lane stayed green with this section gone. A green gate
  // that cannot notice its own central assertion disappearing is not evidence of anything.
  //
  // The cause is general to this lane's pins: they assert that a STRING EXISTS in a source file
  // (`/HISTORICAL RECEIPT/.test(doc)`), not that a FUNCTION RAN. Deleting an invocation removes
  // assertions without removing any pinned text — the calls count changes, and nothing reads that
  // count. That is why the fix is a count, taken from the probe's own behaviour rather than from
  // its source.
  //
  // `E_LEDGER_CHECKS` is the number of `check(` calls section E is expected to make, MEASURED
  // below rather than declared: `check` is wrapped to count calls whose label starts with `E`.
  // If the invocation is deleted, that count falls to zero and E0 fails. If a future edit ADDS an
  // assertion to section E, the control fails until the number is updated — which is the correct
  // failure direction: it makes the pin's staleness loud instead of silent.
  const ledgerChecksBefore = sectionEChecks;
  ledgerSelfConsistency();
  const sectionERan = sectionEChecks - ledgerChecksBefore;

  // ── E2. the section E assertion count, and therefore that it EXECUTED ──────
  check('E0. PIN: section E ran and made the assertions it is supposed to make (R3-4)',
    sectionERan === E_LEDGER_CHECKS,
    `-> section E made ${sectionERan} assertion(s); this pin expects ${E_LEDGER_CHECKS}. `
    + (sectionERan === 0
      ? 'ZERO means the `ledgerSelfConsistency()` call above is GONE — and before this pin existed, '
        + 'deleting it dropped nine assertions while every gate in the lane stayed green. A section '
        + 'that never runs cannot fail, which is why the pin counts CALLS rather than text.'
      : 'A change here means section E was edited: update E_LEDGER_CHECKS deliberately, having '
        + 'decided the new number is right. The pin fails loudly rather than letting the count drift.'));

  // ══ F. MUTATION CONTROLS ════════════════════════════════════════════════
  await mutationControls();

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

/**
 * Round 23's fourth finding, and the one that outlives the round.
 *
 * Round 21 established the rule: a self-consistency check has to be TOTAL over the places a fact
 * is stated, not over the one the author happened to be editing — and then asserted the file count
 * in six places while leaving the gate count and the defect total unasserted. Both had drifted:
 * the patch paragraph said "twenty-seven gates" while three other sentences said twenty-eight, and
 * the rounds table held 79 rows under a sentence claiming 70. Neither is checkable by reading; both
 * are checkable by arithmetic, and that is the whole point of a self-consistency assertion.
 */
function ledgerSelfConsistency() {
  section('E. the ledger\'s stated totals must agree with each other and with its own receipt');
  const doc = readFileSync(
    new URL('../docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md', import.meta.url),
    'utf8',
  );

  // ── ROUND 27 (F5): THE DETECTOR WAS ITSELF SCOPED TO TWO NUMBER FAMILIES ────
  // Round 26 closed the silent skip for a count written as `twenty-…`/`thirty-…`. Astra's F5
  // showed that closure was itself scoped: the family filter read
  // `/^(twenty|thirty)(-[a-z]+)*$/i`, so a document saying "**forty** gates" was neither read
  // nor flagged — the very defect class this check exists to close, re-opened one family over.
  // A guard against silent omission that can itself omit silently is not a guard.
  //
  // The fix is TOTALITY, in both directions:
  //   * `WORDS` now covers every tens family (20-99) BY CONSTRUCTION, so a plausible future
  //     count is READABLE and therefore checked by E1/E2 rather than merely tolerated.
  //   * The unreadable detector is INVERTED: every token `num()` cannot read is a candidate,
  //     UNLESS it is on an explicit allowlist of phrases provably not counts.
  //
  // The allowlist inverts the failure mode, which is the whole point. Forgetting a non-count
  // phrase now produces a LOUD failure — this check fires, the author adds one line and a
  // reason — instead of a SILENT one, where a stale count stays invisible forever. It holds
  // exactly two entries because exactly two were MEASURED in the document, not imagined.
  const TENS = [null, null, 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const UNITS = [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const WORDS = {};
  for (let t = 2; t <= 9; t += 1) {
    WORDS[TENS[t]] = t * 10;
    for (let u = 1; u <= 9; u += 1) WORDS[`${TENS[t]}-${UNITS[u]}`] = t * 10 + u;
  }
  const num = (w) => WORDS[String(w).toLowerCase()] ?? (/^\d+$/.test(String(w)) ? Number(w) : null);

  // Tokens that LOOK like a gate count but are provably not one. Every entry carries its reason,
  // and every entry was measured in the document rather than guessed at.
  //
  // ── R3-3: AN EXEMPTION WITHOUT A SCOPE IS A HOLE, AND THIS ONE HAD ONE ────────
  // `'five'` was exempted because ONE sentence — "The old verification reported all five gates
  // green, and it was right about the five it ran" — uses the word for a DIFFERENT, older set of
  // gates. That reasoning is sound about that sentence and was written as a fact about the TOKEN,
  // which is not the same thing. The exemption is consulted for every `all <word> gates` phrase in
  // the document, so **any** future sentence reading "all five gates" — including one that means
  // THIS suite while the suite has drifted to thirty-three — became unreviewable. The escape hatch
  // outlived its justification the moment the document moved on.
  //
  // So the exemption now carries the PHRASE it applies to, not just the word, and is matched
  // against the surrounding text. An exemption that fires on a phrase which is not the one it was
  // written for is the same defect class as a check satisfied by never looking.
  //
  // `D-F` needs no phrase: it is a gate CATEGORY (the hosted/licence gates) and is never a count
  // in any phrasing, so the token-level exemption is the honest one and stays.
  const NON_COUNT_TOKENS = new Map([
    ['five', {
      reason: 'the OLD five-gate verification — a DIFFERENT set of gates, not a count of this one',
      // Only exempt where that older verification is actually being discussed. Measured: line 332.
      within: /old verification reported all five gates/i,
    }],
    ['fifteen', {
      reason: 'a QUOTED historical claim ("fifteen gates, 545 assertions") in the round-12 row, '
        + 'describing the gate set as it stood THEN — a record of what was believed, not a live count',
      // R3-3's fourth pattern is the first that can see 11-19, which is why this entry is new:
      // the older three patterns only ever reached 20-99 or digits, so `fifteen` was invisible
      // rather than merely exempt. Scoped to the quotation for the same reason as `five`.
      within: /fifteen gates, 545 assertions/,
    }],
    ['D-F', { reason: 'a gate CATEGORY (the hosted/licence gates), not a count' }],
  ]);

  // ── E1. the GATE COUNT, in every sentence that states it ────────────────
  // THREE forms, not two, and the third was added after this check PASSED with a stale count
  // still in the document. The first draft matched `**twenty-eight** gates` and `all N gates`
  // and missed `**all twenty-eight** gates` — the bold wrapping the phrase rather than the
  // number — which is the form line 290 actually used. E1 was green because it never looked,
  // which is §15's defect arriving inside the check written to catch it. The control below is
  // what surfaced it: a mutation on the first statement it FOUND could not be applied to the
  // statement it could not see.
  // ── ROUND 26: THE MAP SILENTLY IGNORED A COUNT IT DID NOT KNOW ──────────────
  // `num()` returns null for a word the map does not carry, and the loop below then skipped
  // that statement — so a gate-count phrase written in an unlisted form was INVISIBLE rather
  // than wrong. Round 26 walked straight into it: the document was updated to "**thirty-two**
  // gates" while the map stopped at `'thirty-one'`, so E1 stayed green reporting a count from
  // a DIFFERENT sentence and E2 failed with "the document says 31" while the sentence it was
  // reading said 32. That is §15's defect — an assertion satisfied by never looking — arriving
  // inside the check written to catch stale counts.
  //
  // The map is extended above, AND the silent skip is closed below: a phrase that looks like a
  // gate count but carries a word this check cannot read is now a FAILURE, not an omission.
  // Without that, every future gate count has to be remembered in two places, and the failure
  // mode of forgetting is silence.
  // ── R3-3: THE FOURTH FORM, AND WHY THE THIRD WAS NOT ENOUGH ───────────────
  //
  // The first draft matched `**N** gates` and `all N gates` and missed `**all N** gates` — the bold
  // wrapping the phrase rather than the number. That was fixed by adding a third pattern, and the
  // fix was scoped to the SHAPE ITS AUTHOR WAS LOOKING AT: all three require either `**` immediately
  // around the number, or the literal word `all` immediately before it. The document also writes
  //
  //   "**What is verified against the COMMIT, as distinct from the patch.** The thirty-three gates
  //    in the readiness receipt above were run..."
  //
  // — an UNBOLDED number, with no `all`, followed by `gates in`. None of the three patterns matches
  // it. Measured 2026-09-21 (round 3, R3-3): with the document mutated so that line 1531 reads
  // "The ninety-nine gates in the..." — a count three times wrong — the scan reports only 33, so
  // **E1 PASSED on the defect it exists to catch.** This is the same shape as the third form's
  // omission, and it is the fifth time this lane has found "a check satisfied by never looking".
  //
  // The fourth pattern is deliberately LOOSE about what precedes the number and STRICT about what
  // follows it. Requiring `gates` (or `gates in/are/were/that`) immediately after is what keeps it
  // from matching arbitrary prose: the numeral must be bound to the word `gates`, which is the
  // property that makes it a count rather than a coincidence.
  //
  // It does NOT try to catch every conceivable phrasing — "the gates, thirty-three of them" would
  // still be missed, because a regex cannot close a class of English sentences. What it does is
  // remove the known gap and make the CONTROL below fail if the gap reopens, which is the only
  // version of this that can be maintained.
  //
  // ── THE FOURTH PATTERN'S FIRST DRAFT WAS TOO LOOSE, AND THE FIXTURE CAUGHT IT ──
  // Written as `([A-Za-z-]+|\d+)\s+gates\b`, it matched "**the** gates", "**that** gates" and
  // "**money** gates" — because `[A-Za-z-]+` is happy to capture an ordinary word that happens to
  // sit in front of the noun. E1b then reported nine unreadable phrases, and the failure was
  // LOUD, so it was caught immediately rather than shipped. That loudness is the allowlist design
  // working as intended, and it is worth recording: the defect this check exists to close is a
  // SILENT omission, and the thing that saved it here was failing loudly on noise instead.
  //
  // The token is therefore constrained to what a COUNT can actually be — a number word from the
  // same families `num()` maps, or digits — rather than to "any word". `num()` remains the reader;
  // the pattern only decides what is worth asking it about.
  const COUNT_WORD = '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?'
    + '|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)'
    + '|\\d+';
  // ── R3-8: WHY PATTERNS 1–3 KEEP THE LOOSE TOKEN, AND WHY THAT IS NOT AN OVERSIGHT ───────
  // R3-3 constrained ONLY the fourth pattern to `COUNT_WORD` and left `([A-Za-z-]+|\d+)` in the
  // other three. That asymmetry was reported as a defect and "fixed" by constraining all four —
  // and the fix broke E1c, which is the control that makes this scan TOTAL.
  //
  // `**umpteen** gates` must be FLAGGED as unreadable. A constrained token cannot see it: `umpteen`
  // is not a count word, so the pattern would not match and the phrase would be SILENTLY SKIPPED —
  // replacing a loud false positive with a silent omission, which is the worse direction and
  // exactly what F5 was filed about. The loose token is therefore load-bearing: it captures
  // anything word-shaped in front of `gates`, `num()` classifies it, and anything `num()` cannot
  // read is either exempted by name (with a stated reason) or FAILS the gate.
  //
  // Measured cost of the loose token, against ordinary prose: `**money** gates`, `**all money**
  // gates`, `all applicable gates` and `**readiness** gates` all match. That cost is not paid as a
  // false positive on this document — the measurements are below — and where a phrase genuinely is
  // a count of a different set, the repair is a scoped `NON_COUNT_TOKENS` entry, not a narrowing of
  // the pattern. Narrowing would make the gate blind to exactly the phrases F5 exists to catch.
  //
  // This is recorded because the wrong fix is the tempting one, and it was made and reverted here.
  const GATE_PATTERNS = [
    /\*\*([A-Za-z-]+|\d+)\*\*\s+gates/g,                    // "**twenty-nine** gates"
    /\*\*all\s+([A-Za-z-]+|\d+)\*\*\s+gates/g,              // "**all twenty-eight** gates"
    /(?<![A-Za-z-])all\s+([A-Za-z-]+|\d+)\s+gates\b/g,      // "all twenty-nine gates"
    // R3-3: "The thirty-three gates in the readiness receipt" — unbolded, no `all`. Constrained to
    // a real count word, because THIS pattern has no `all` and no `**` to anchor it: an unanchored
    // loose token here would match any `X gates` in the document, which was the nine-false-positive
    // failure R3-3 measured. The first three stay loose for the reason above.
    new RegExp(`(?<![A-Za-z-])(${COUNT_WORD})\\s+gates\\b`, 'g'),
  ];

  // ── R4-1 (Astra round 4): A COMPOUND NUMBER'S TAIL WAS READ AS THE WHOLE NUMBER ───────────
  //
  // `COUNT_WORD` covers units, teens and tens, so `thirty-three` reads correctly. It does NOT cover
  // a MULTIPLIER, and the pattern has no way to notice one: against
  //   "The one hundred thirty-three gates in the receipt."
  // the alternation matches the `thirty-three` at the END and reports **33** — dropping the
  // `one hundred` entirely. Measured, and the same hole admits `The two hundred ten gates` -> **10**.
  //
  // This is the F5 defect class in its quietest form: not an omission (the phrase IS seen) but a
  // MISREAD, which is worse, because the gate then reports a confident wrong number instead of
  // flagging a phrase it cannot parse. A count of "one hundred thirty-three" silently becoming 33 is
  // a factor-of-four error that no downstream arithmetic can detect.
  //
  // Reachability in THIS document: NIL. Measured — zero occurrences of a multiplier before `gates`
  // (`grep -c -oiE "hundred[a-z -]* gates"` -> 0). So this is a latent hole, not a live defect. It is
  // fixed anyway because the repair is three lines and the failure mode is silent.
  //
  // The fix is NOT to widen `COUNT_WORD` to parse English numerals — that is an unbounded project
  // and it would still misread a form nobody anticipated. It is to REFUSE: if a multiplier word
  // immediately precedes the matched token, the phrase is unreadable and must be flagged, which is
  // the same treatment `umpteen` gets. Failing loud on a shape the scanner does not understand is
  // the property this whole file exists to have.
  const MULTIPLIER_BEFORE = /(?:^|[^A-Za-z-])(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|several|many)\s+(?:hundred|thousand|million)\s*$/i;
  const hasUnparsedMultiplier = (text, matchIndex) => MULTIPLIER_BEFORE.test(text.slice(Math.max(0, matchIndex - 32), matchIndex));

  // ── R3-3, SECOND HALF: A LIVE COUNT AND A HISTORICAL ONE ARE DIFFERENT FACTS ──
  //
  // The fourth pattern above closed the blind spot and immediately revealed WHY the token allowlist
  // could never have been the whole answer: the document states `twenty-seven gates` and `thirty
  // gates` too, and both are CORRECT — they are records of what earlier rounds found, in the rounds
  // table and in round 23's narrative. E1 reported three different answers and failed.
  //
  // The allowlist cannot scale to this. Exempting `twenty-seven` would make any FUTURE live claim of
  // twenty-seven gates unreviewable — the same bounded-escape-hatch defect as the unscoped `'five'`,
  // except that numbers are unbounded. The distinction that actually separates the two kinds of
  // statement is not the TOKEN; it is WHERE the sentence lives. Sections that narrate history
  // record a count from the past, and the receipt and handover sections state the count that is
  // true NOW.
  //
  // So statements inside the historical sections are excluded structurally, by section, rather than
  // by phrase. `LIVE_EXCLUDE` names the headings whose bodies are history. This is deliberately the
  // SMALLER risk: if a live claim is ever moved into one of these sections it stops being checked,
  // which is visible in a diff — whereas a number-level exemption hides silently forever.
  //
  // The rounds table (under "Rounds 2–23") and round 23's own narrative are the two measured
  // sources of historical counts. Nothing else in the document states a non-current gate total.
  const LIVE_EXCLUDE = [
    /^### Rounds 2–23 — the hostile loop.*$/m,
    /^### Round 23 — the queue-completion projection.*$/m,
  ];
  /** Blank out the bodies of historical sections, keeping line count so diagnostics stay honest. */
  const liveText = (text) => {
    let out = text;
    for (const heading of LIVE_EXCLUDE) {
      const m = heading.exec(out);
      if (!m) continue;
      const from = m.index;
      // To the next heading of the same or higher level, or end of document.
      const rest = out.slice(from);
      const nextRel = /^#{1,3} /m.exec(rest.slice(m[0].length));
      const to = nextRel ? from + m[0].length + nextRel.index : out.length;
      const body = out.slice(from, to);
      // Preserve newlines so every line number and the `#   GATE NN` receipt parsing stay valid.
      out = out.slice(0, from) + body.replace(/[^\n]/g, ' ') + out.slice(to);
    }
    return out;
  };
  const liveDoc = liveText(doc);
  const scanGateStatements = (text) => {
    const readable = [];
    const unreadable = [];
    for (const re of GATE_PATTERNS) {
      for (const m of text.matchAll(re)) {
        const token = String(m[1]);
        const v = num(token);
        // An exemption must apply to THIS occurrence, not to the token everywhere. See the note
        // on NON_COUNT_TOKENS: an unscoped `'five'` made any future "all five gates" unreviewable.
        const exempt = NON_COUNT_TOKENS.get(token);
        const exemptHere = exempt !== undefined
          && (exempt.within === undefined || exempt.within.test(m[0]) || exempt.within.test(text.slice(Math.max(0, m.index - 120), m.index + 120)));
        // R4-1: A COMPOUND FORM IS UNREADABLE EVEN THOUGH ITS TAIL READS. `num()` succeeds on
        // `thirty-three`, so without this the phrase "one hundred thirty-three gates" would be
        // pushed to `readable` as 33. The multiplier check runs BEFORE the readable push precisely
        // because `num()` is the wrong authority here — it can only see the token it was handed.
        const compound = hasUnparsedMultiplier(text, m.index);
        if (v !== null && !compound) readable.push({ value: v, text: m[0] });
        // TOTAL, NOT FAMILY-SCOPED. Anything `num()` cannot read is a candidate count, and the
        // only way out is an explicit allowlist entry with a stated reason.
        //
        // The UNREADABLE scan runs over the WHOLE document even when the readable scan is scoped to
        // `liveDoc`. That asymmetry is deliberate: an unreadable phrase is a GAP IN THE DETECTOR and
        // must be reported wherever it appears, including in history — where a future count word
        // would first show up. Narrowing the readable scan must not narrow the warning.
        else if (!exemptHere) unreadable.push(compound ? `${m[0]} (compound number — multiplier before "${token}")` : m[0]);
      }
    }
    return { readable, unreadable };
  };

  // TWO SCANS, ON PURPOSE. `readable` is scoped to the live sections (a historical count is a
  // record, not a claim); `unreadable` runs over everything (a gap in the detector is a gap
  // wherever it appears). See the note on LIVE_EXCLUDE.
  const { readable: gateStatements } = scanGateStatements(liveDoc);
  const { unreadable: unreadableGateStatements } = scanGateStatements(doc);
  check('E1b. every gate-count phrase uses a word this check can READ',
    unreadableGateStatements.length === 0,
    unreadableGateStatements.length
      ? `-> UNREADABLE: ${unreadableGateStatements.join(', ')} — a count this check cannot parse is `
        + 'skipped, so E1 can pass while a stale count sits in the document. Extend the number '
        + 'map, or add the phrase to NON_COUNT_TOKENS with a reason.'
      : `-> ${gateStatements.length} LIVE statement(s), all readable (the unreadable scan covers the `
        + 'whole document, including history)');

  // E1c — THE CONTROL FOR E1b, and the deletion-sensitive evidence for F5. E1b passing proves
  // nothing on its own: it is green when the detector reads NOTHING at all. This runs the SAME
  // scan over a synthetic phrase in a family the pre-round-27 filter did not know, and asserts
  // it is FLAGGED. `umpteen` is carried by no number map, so if the detector is ever narrowed
  // back to a family allowlist this check fails instead of the omission returning in silence.
  const probeScan = scanGateStatements('The suite runs **umpteen** gates and **forty-two** gates.');
  check('E1c. CONTROL: an unreadable count word is FLAGGED, not silently skipped (F5)',
    probeScan.unreadable.length === 1 && probeScan.unreadable[0] === '**umpteen** gates'
      && probeScan.readable.length === 1 && probeScan.readable[0].value === 42,
    `unreadable=${JSON.stringify(probeScan.unreadable)} readable=${JSON.stringify(probeScan.readable.map((r) => r.value))}`
    + ' — `forty-two` must now be READABLE (20-99 is covered by construction) and `umpteen` must be FLAGGED');

  // ── E1e. CONTROL for R4-1 (Astra round 4): A COMPOUND NUMBER IS FLAGGED, NOT TAIL-READ ────
  //
  // Astra's finding, as a permanent witness. `num('thirty-three')` succeeds, so without the
  // multiplier guard the phrase
  //   "The one hundred thirty-three gates in the receipt."
  // was pushed to `readable` with value **33** — the tail read as the whole, a factor-of-four
  // misstatement that no downstream arithmetic can detect. The same hole read
  // "The two hundred ten gates" as **10**.
  //
  // The control asserts the CORRECT reading is now the LOUD one: the phrase must appear in
  // `unreadable`, and `readable` must be EMPTY. Asserting only the first half would pass on an
  // implementation that flagged it AND still reported 33 — which is the defect, not the fix.
  const compoundScan = scanGateStatements('The one hundred thirty-three gates in the receipt.');
  const compoundScan2 = scanGateStatements('The two hundred ten gates.');
  check('E1e. CONTROL: a COMPOUND count is FLAGGED as unreadable, not tail-read as its last word (R4-1)',
    compoundScan.unreadable.length === 1 && compoundScan.readable.length === 0
      && compoundScan2.unreadable.length === 1 && compoundScan2.readable.length === 0,
    `"one hundred thirty-three gates" -> unreadable=${JSON.stringify(compoundScan.unreadable)} `
    + `readable=${JSON.stringify(compoundScan.readable.map((r) => r.value))}; `
    + `"two hundred ten gates" -> unreadable=${JSON.stringify(compoundScan2.unreadable)} `
    + `readable=${JSON.stringify(compoundScan2.readable.map((r) => r.value))}. `
    + 'Before the guard both read as a confident wrong number (33 and 10) rather than being flagged, '
    + 'which is the silent direction of the F5 class: the phrase IS seen, it is just MISread.');
  const distinctGates = [...new Set(gateStatements.map((s) => s.value))];
  check('E1. every sentence stating the gate count states the same one',
    distinctGates.length === 1,
    distinctGates.length === 1
      ? `-> ${gateStatements.length} statement(s), all saying ${distinctGates[0]}`
      : `-> ${distinctGates.length} DIFFERENT gate counts in one document: `
        + distinctGates.map((v) => `${v} (${gateStatements.filter((s) => s.value === v).length}x)`)
          .join(', ')
        + '. A count is checkable by arithmetic, so there is no excuse for two answers.');

  // ── E1d. CONTROL for R3-3: the UNBOLDED form is SEEN, and a live drift is CAUGHT ─────
  //
  // Round 3's R3-3, as a permanent witness. The old three patterns required `**` around the number
  // or the literal word `all` before it, so the document's own sentence
  //   "The thirty-three gates in the readiness receipt above were run..."
  // was invisible. Measured: mutating THAT sentence to "The ninety-nine gates in the..." left the
  // scan reporting only 33, so E1 PASSED on a count three times wrong.
  //
  // Two assertions, because either alone is satisfiable vacuously:
  //   (a) the fourth pattern READS the unbolded form in a synthetic string, and
  //   (b) applying the mutation to the REAL document changes the live scan's answer.
  // (a) without (b) would pass even if the document never used the form; (b) without (a) would pass
  // if the mutation happened to hit some other pattern's territory.
  const unbolded = scanGateStatements('The forty-two gates in the readiness receipt were run.');
  const unboldedSeen = unbolded.readable.length === 1 && unbolded.readable[0].value === 42;
  const liveTarget = /The ([A-Za-z-]+) gates in the\n?readiness receipt/.exec(doc);
  const liveDrift = liveTarget
    ? (() => {
      const evil = doc.replace(liveTarget[0], liveTarget[0].replace(liveTarget[1], 'ninety-nine'));
      if (evil === doc) return null;                 // mutation was a no-op: control is worthless
      return [...new Set(scanGateStatements(liveText(evil)).readable.map((s) => s.value))];
    })()
    : null;
  check('E1d. CONTROL: the UNBOLDED "<N> gates in" form is SEEN, and drifting it is CAUGHT (R3-3)',
    unboldedSeen && liveDrift !== null && liveDrift.length > 1,
    !unboldedSeen
      ? `-> the synthetic unbolded phrase was NOT read: ${JSON.stringify(unbolded)}. Pattern 4 is gone `
        + 'or narrowed, which is R3-3 returning.'
      : liveDrift === null
        ? '-> THE MUTATION WAS A NO-OP: the live sentence this control targets is not where it thinks '
          + 'it is, so this control tests nothing. A no-op control is the defect it guards against.'
        : `-> synthetic "${'forty-two gates in'}" reads as 42, and mutating the live sentence to `
          + `"ninety-nine gates" makes the scan report ${JSON.stringify(liveDrift)} — two answers, so `
          + 'E1 can fail. The old three patterns saw neither.');

  // ── E2. that count against the receipt's own command list ───────────────
  const receipt = doc.split('## Readiness receipt')[1]?.split('```')[1] ?? '';
  const commands = receipt.split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(cd backend && npx vitest run|node --test|node media-api\/|node )/.test(l));
  const statedGates = distinctGates.length === 1 ? distinctGates[0] : null;
  check('E2. the stated gate count equals the number of commands in the receipt',
    statedGates !== null && commands.length === statedGates,
    `-> the receipt lists ${commands.length} gate command(s); the document says `
    + `${statedGates ?? '(no single answer — see E1)'}. A gate that is run but not listed, or listed `
    + 'but not run, is exactly how "fifteen gates, 545 assertions" stayed true of a suite that was '
    + 'never looked at.');

  // ── E3. the DEFECT TOTAL against the rounds table's own row count ───────
  const defectClaim = doc.match(/\*\*(\d+) further defects\*\*/);
  const rows = doc.split('\n').filter((l) => /^\| \d+ \|/.test(l));
  check('E3. the stated defect total equals the rounds table\'s row count',
    defectClaim !== null && Number(defectClaim[1]) === rows.length,
    `-> the sentence says ${defectClaim ? defectClaim[1] : '(no claim found)'} further defects; the `
    + `table holds ${rows.length} rows. The sentence itself says "That count is the number of rows `
    + 'below, which is what the table is for" — so the two are the same fact and must be one number.');

  // ── E4. the ASSERTION TOTAL against the receipt's own parts ─────────────
  // Drafted first as "every sentence stating the total must agree", and NARROWED rather than
  // kept: that version matched `the assertion total is **936**` inside row 20's narrative,
  // where 936 is a QUOTATION of a defect that was corrected — not a live claim. A guard that
  // fires on the document's own account of a fixed bug is a guard the next author deletes.
  // Recorded as a rejected rule so it is not re-proposed as a gap (skill §20.6).
  // The rule here is arithmetic instead: the stated total must equal the sum of the parts the
  // receipt itself lists — row 20's own rule, applied to the whole receipt rather than to one
  // parenthetical.
  const parts = [];
  for (const line of receipt.split('\n')) {
    const m = line.match(/\((\d+) tests\)/)            // a vitest suite
      || line.match(/#\s*tests (\d+)\b/)               // node --test
      || line.match(/ALL (\d+) CHECKS PASSED/)         // demo / http probe
      || line.match(/# (\d+) CHECKS —/)                // a round probe
      || line.match(/#\s+(\d+) passed/);               // control-round12 (inline, not line-leading)
    if (m) parts.push(Number(m[1]));
  }
  const sumOfParts = parts.reduce((a, b) => a + b, 0);
  const statedTotal = Number((doc.match(/all green — \*\*(\d+) assertions\*\*/) || [])[1]);
  check('E4. the stated assertion total equals the sum of the parts the receipt lists',
    Number.isFinite(statedTotal) && statedTotal === sumOfParts,
    `-> the receipt lists ${parts.length} gate counts summing to ${sumOfParts}; the document states `
    + `${Number.isFinite(statedTotal) ? statedTotal : '(none found)'}. A total carrying its own `
    + 'arithmetic must equal that arithmetic — checked here over the whole receipt, because the '
    + 'version that checked one parenthetical missed the third place the same total was written.');

  // ── E5. CONTROL: the checks above must be able to fail ──────────────────
  // Each control re-introduces the drift into a COPY of the document and requires the
  // corresponding extraction to disagree — the re-introduce direction, per skill §7.
  const drift = doc.replace(/\*\*(\d+) further defects\*\*/, (s, n) => `**${Number(n) - 1} further defects**`);
  check('E5. CONTROL: decrementing the defect total is DETECTED',
    drift !== doc && Number(drift.match(/\*\*(\d+) further defects\*\*/)[1]) !== rows.length,
    drift === doc
      ? '-> MUTATION WAS A NO-OP: the sentence is not where this control thinks it is'
      : `-> the mutated document claims ${drift.match(/\*\*(\d+) further defects\*\*/)[1]} against `
        + `${rows.length} rows, so E3 can fail`);

  // Derived from the statement this check FOUND, not from a hard-coded phrase. The first draft
  // hard-coded `all twenty-eight gates` and became a no-op the moment the document legitimately
  // moved to twenty-nine — and a no-op control is exactly what this control exists to prevent.
  const firstGate = gateStatements[0];
  const decremented = firstGate
    ? firstGate.text.replace(/[A-Za-z-]+|\d+/, (w) => {
      const v = num(w);
      return v === null ? w : String(v - 1);
    })
    : null;
  const gateDrift = decremented ? doc.replace(firstGate.text, decremented) : doc;
  const gateDriftCount = [...new Set([...gateDrift.matchAll(
    /\*\*([A-Za-z-]+|\d+)\*\*\s+gates|\*\*all\s+([A-Za-z-]+|\d+)\*\*\s+gates|all\s+([A-Za-z-]+|\d+)\s+gates/g,
  )].map((m) => num(m[1] ?? m[2] ?? m[3])).filter((v) => v !== null))];
  check('E5. CONTROL: one gate sentence decremented is DETECTED',
    decremented !== null && gateDrift !== doc && gateDriftCount.length > 1,
    decremented === null
      ? '-> NO GATE STATEMENT WAS FOUND, so this control tests nothing'
      : gateDrift === doc
        ? '-> MUTATION WAS A NO-OP: the substitution changed nothing'
        : `-> the mutated document now states ${gateDriftCount.join(' and ')}, so E1 can fail`);
}

async function mutationControls() {
  section('F. mutation controls — re-introduce each defect and require the check to fail');
  const src = readFileSync(new URL('../backend/scripts/handlers/completion.mjs', import.meta.url), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'r23-mut-'));
  try {
    const mutations = [
      ['A: the mime lookup resolves through Object.prototype again',
        /const hit = hasOwn\(MIME_BY_EXT, ext\) \? MIME_BY_EXT\[ext\] : null;\s*\n\s*return str\(hit\) \|\| 'application\/octet-stream';/,
        "return MIME_BY_EXT[ext] || 'application/octet-stream';",
        async (m) => typeof m.mimeForFilename('out.constructor')],
      ['B: completionBody accepts a non-string mime',
        /mime: str\(output\.mime\) \|\| 'application\/json',/,
        "mime: output.mime || 'application/json',",
        async (m) => {
          // The argument is supplied LITERALLY rather than read from the mutated module.
          // The first draft called `m.mimeForFilename('out.constructor')` here, which the
          // B-mutation does not touch — so the control passed its own argument in and
          // reported "did NOT reproduce" for a defect that was in fact reproduced. The
          // rule (skill §7): a control must not supply the very argument under test.
          const wire = JSON.parse(JSON.stringify(m.completionBody({ id: 'j1' },
            { mime: function notAString() {} })));
          return Object.hasOwn(wire, 'mime') ? 'mime survived' : 'mime dropped';
        }],
      ['C: completionSummary prints the indicted string again',
        /if \(!hasOffsetLine\) return 'no summary declared by this handler';/,
        'if (false) return null;',
        async (m) => m.completionSummary({})],
    ];
    for (const [label, pattern, replacement, probe] of mutations) {
      if (!pattern.test(src)) {
        check(`F. ${label}`, false,
          `-> MUTATION DID NOT APPLY: ${pattern} is not in completion.mjs. On the PRE-FIX tree `
          + 'this is the expected result — the string being re-introduced does not exist yet.');
        continue;
      }
      const mutated = src.replace(pattern, replacement);
      if (mutated === src) {
        check(`F. ${label}`, false, '-> MUTATION WAS A NO-OP: the replacement changed nothing, so '
          + 'this control tests nothing');
        continue;
      }
      const p = join(dir, `${label.slice(0, 1).toLowerCase()}-mut.mjs`);
      writeFileSync(p, mutated);
      const mod = await import(pathToFileURL(p).href);
      let observed;
      try { observed = await probe(mod); } catch (e) { observed = `threw ${e.code || e.message}`; }
      const reproduced = { A: 'function', B: 'mime dropped' }[label.slice(0, 1)]
        ?? (typeof observed === 'string' && /undefined/.test(observed) ? observed : false);
      check(`F. ${label}`, reproduced !== false && observed === reproduced,
        `-> the mutated module ${observed === reproduced ? 'reproduced' : 'did NOT reproduce'} the `
        + `defect (observed: ${JSON.stringify(observed)}), so the check above `
        + `${observed === reproduced ? 'can fail' : 'CANNOT fail'}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
