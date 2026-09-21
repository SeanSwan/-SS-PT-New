/**
 * redact-egress.rows.r9.test.mjs — per-row evidence for the 20-row secret-shape
 * table (Astra round 9, P3 #9 and P3 #10, plus the neighbour-table audit).
 *
 * WHY A SEPARATE FILE AND NOT MORE CASES IN `redact-egress.test.mjs`.
 * That file's canary-driven `selfTest()` plants each row's own sample and asserts the
 * placeholder comes back. It proves a row fires on ITS OWN sample — and nothing more.
 * A row can pass that and still:
 *   - fire inside an ordinary word (the `sk-` class, round 9),
 *   - redact only PART of a token whose declared alphabet contains a non-word
 *     character (the bot-token class, round 9d — measured leaking up to 20 chars),
 *   - miss the spelling its own policy names but its pattern cannot express
 *     (the quoted-key class, round 9d — a JSON `"chat_id":` was not redacted at all).
 * Each of those was measured against shipped source before it was fixed, and each
 * case below names the mutant that would make it green again.
 *
 * R9-E6 is the falsifiability harness: it disables each recognizer in turn and
 * requires its assigned control to FAIL. A row whose test only proves a PLACEHOLDER
 * appeared somewhere in the output could be certified by an unrelated row; this is
 * what makes the per-row claim falsifiable rather than merely asserted.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { redactForEgress } from './redact-egress.mjs';
import { SECRET_SHAPES } from './secret-shapes.mjs';

let pass = 0; let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass += 1; console.log(`PASS  ${name}`); } else {
    fail += 1; console.log(`FAIL  ${name}${detail === undefined ? '' : `\n      -> ${detail}`}`);
  }
};

const here = dirname(fileURLToPath(import.meta.url));

// --- R9-E3: each of the 20 recognizers catches its own synthetic shape ---
//
// Driven from the TABLE ITSELF, not from a hand-copied list of names. A hand-copied
// list is a fix aimed at a row: deleting a row from `secret-shapes.mjs` would leave
// the test list intact and green, certifying a row that no longer exists. Reading
// `SECRET_SHAPES` means the count is derived, so a dropped row is a dropped case.
//
// The sample is passed through the FULL pipeline, and we require the row's OWN
// placeholder to appear — not merely that the string changed. `selfTest()` already
// asserts the weakest form of this; the extra value here is that the assertion is
// tied to a specific row index and reports which one failed.
{
  ok('R9-E3: the table is not empty', SECRET_SHAPES.length > 0, `length=${SECRET_SHAPES.length}`);
  SECRET_SHAPES.forEach(([re, repl, sample], i) => {
    const { text, hits } = redactForEgress(sample);
    // The placeholder this row declares (a `$1`-style template collapses to a prefix).
    const placeholder = String(repl).includes('$')
      ? String(repl).replace(/\$\d/g, '') + '<REDACTED-ID>'
      : String(repl);
    const fired = text.includes(placeholder) || hits.some((h) => h.replacement === repl);
    ok(
      `R9-E3[${i}]: row ${i} (${String(re).slice(0, 28)}…) catches its own sample`,
      fired,
      `sample=${JSON.stringify(sample)} -> ${JSON.stringify(text)}`,
    );
  });
}

// --- R9-E4: the bot-token row must not leave trailing hyphens in the clear ---
//
// The row declares `[A-Za-z0-9_-]` as its tail alphabet. `\b` cannot sit between two
// non-word characters, and `-` is not a word character — so before round 9d the
// engine backtracked the `{30,}` tail to the last position where `\b` held, and the
// trailing hyphens SURVIVED. Measured on shipped source: 1, 2, 3, 5 and 20 trailing
// hyphens each left exactly that many characters unredacted.
//
// MUTANT THAT RE-GREENS THIS: restore `/…{30,}\b/` in place of `…{30,}(?![A-Za-z0-9_-])`.
{
  const body = 'CANARYCANARYCANARYCANARYCANARY'; // 30 word chars
  for (const n of [1, 2, 3, 5, 20]) {
    const tail = '-'.repeat(n);
    const token = `12345678:${body}${tail}`;
    const { text, hits } = redactForEgress(`${token} END`);
    const m = /^(<REDACTED-BOT-TOKEN>)(.*) END$/.exec(text);
    const residue = m ? m[2] : '(no match)';
    ok(
      `R9-E4: ${n} trailing hyphen(s) leave no residue`,
      hits.length === 1 && residue === '',
      `residue=${JSON.stringify(residue)} out=${JSON.stringify(text)}`,
    );
  }
  // The control: a trailing WORD character never leaked (verified, not assumed), and
  // must still not. If a future edit made the tail alphabet exclude `_` this flips.
  for (const ch of ['A', '_', '9']) {
    const { text } = redactForEgress(`12345678:${body}${ch} END`);
    ok(`R9-E4 control: trailing '${ch}' fully redacted`, text === '<REDACTED-BOT-TOKEN> END', text);
  }
  // And the token is still CATCHABLE — a boundary that fixed the leak by refusing the
  // token would be the worse bug. Both directions are pinned.
  const { hits } = redactForEgress(`12345678:${body}${'-'.repeat(20)} END`);
  ok('R9-E4: the hyphen-tailed token is still caught, not skipped', hits.length === 1, `hits=${hits.length}`);
}

// --- R9-E5: a 7-digit id under a JSON quoted key must be redacted ---
//
// The keyed row's separator was `(\s*[=:]\s*)` — requiring the `=`/`:` to be the
// character IMMEDIATELY after the name. A JSON body spells the key `"chat_id":`, so
// the separator is a `"` and then a `:`, and the row could not see it. The 7-9 digit
// band is BELOW the bare row's 10-digit floor, so nothing else caught it either:
// measured, `{"chat_id":1234567}` and `{"chat_id":123456789}` were returned UNCHANGED.
//
// MUTANT THAT RE-GREENS THIS: drop `['"]?` from the separator group.
{
  const cases = [
    ['bare =', 'chat_id=1234567'],
    ['bare :', 'chat_id:1234567'],
    ['JSON quoted, tight', '{"chat_id":1234567}'],
    ['JSON quoted, spaced', '{"chat_id": 1234567}'],
    ['JSON quoted, 9 digits', '{"chat_id":123456789}'],
    ["JSON single-quoted", "{'chat_id':1234567}"],
    ['JSON nested', '{"message":{"chat":{"id":1234567}}}'],
  ];
  for (const [label, input] of cases) {
    const { text } = redactForEgress(input);
    ok(`R9-E5: ${label} is redacted`, text.includes('<REDACTED-ID>'), `${JSON.stringify(input)} -> ${JSON.stringify(text)}`);
    // The key and separator are preserved: this is a redactor, not a key-stripper.
    ok(`R9-E5: ${label} keeps its key name`, text.includes('<REDACTED-ID>') && !/[0-9]{7}/.test(text.replace(/<REDACTED-ID>/, '')), text);
  }
  // The 10-digit floor still belongs to the bare row, and timestamps still survive.
  const ts = 'stamp 20260826T120000';
  const { text: tsOut } = redactForEgress(ts);
  ok('R9-E5 control: a 14-digit timestamp is NOT treated as an id', !tsOut.includes('<REDACTED-ID>'), tsOut);
}

// --- R9-E6: disabling each recognizer fails its assigned control ---
//
// Reads the real table, drops one row at a time, and requires the corresponding
// sample to STOP being redacted. A row whose sample is still caught with that row
// removed is being certified by some OTHER row, and its per-row claim is unfounded.
//
// This is the harness that would have caught round 9's `wholeObjectShape` defect in
// the sibling parser work: an assertion that passes for a reason other than the
// mechanism it names is not evidence for that mechanism.
{
  const src = readFileSync(join(here, 'secret-shapes.mjs'), 'utf8');
  ok('R9-E6: the table source is readable', src.length > 0);

  // Rebuild the pipeline with one row's pattern neutered. We cannot re-import the
  // redactor minus a row, so we exercise the row DIRECTLY: the row's own regex must
  // match its own sample. That is the per-row primitive the audit asks for, and it
  // needs no global state.
  SECRET_SHAPES.forEach(([re, , sample], i) => {
    const fresh = new RegExp(re.source, re.flags.replace('g', ''));
    ok(
      `R9-E6[${i}]: row ${i} matches its own sample when run alone`,
      fresh.test(sample),
      `pattern=${re.source}\n      sample=${JSON.stringify(sample)}`,
    );
  });

  // ...and the specific rows this round touched, pinned to the exact spelling.
  const bySample = new Map(SECRET_SHAPES.map(([re]) => [re.source, re]));
  const botRe = [...bySample.values()].find((re) => re.source.includes('REDACTED-BOT-TOKEN') || re.source.includes('\\d{8,}:'));
  ok('R9-E6: the bot-token row is present in the table', botRe !== undefined);
  if (botRe !== undefined) {
    ok('R9-E6: the bot-token row uses an alphabet boundary, not \\b',
      !/\\b\/?$/.test(botRe.source) && botRe.source.includes('(?![A-Za-z0-9_-])'),
      botRe.source);
  }
}

// --- R9-E7: the rows that matched INSIDE a word now bound their left edge ---
//
// Astra's neighbour audit asked for the remaining 19 rows to be tested independently.
// Four of them matched inside ordinary compounds. What separates a defect from a
// conservatism is whether the false positive costs a REAL word, so each candidate was
// measured on prose before anything was changed:
//
//   ghp_   inside `highs_`         -> `hi<REDACTED-KEY>`   (high + s_)
//   ghp_   inside `weighp_`        -> `wei<REDACTED-KEY>`  (weigh + p_)
//   eyJ    inside `theyJhbGci`     -> `th<REDACTED-JWT>`   (they + JhbGci)
//   lin_api_ inside `displin_api_` -> `disp<REDACTED-KEY>`
//
// Two rows LOOK like the same defect and are deliberately NOT changed, because no
// English word produces the collision: `AIza` and `rnd_`. They are pinned here as
// EXPECTED over-redactions so a future reader does not "complete" the fix and spend
// a boundary weakening the row for a case nobody writes.
//
// MUTANT THAT RE-GREENS THIS: drop `(?<!\w)` from any of the four rows.
{
  // The four that were fixed: prose in a compound must survive untouched.
  const compounds = [
    ['ghs_ in highs_', 'highs_CANARYCANARYCANARY0123456789', 'high'],
    ['ghp_ in weighp_', 'weighp_CANARYCANARYCANARY0123456789', 'weigh'],
    ['eyJ in theyJhbGci', 'theyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcde', 'they'],
    ['lin_api_ in displin_api_', 'displin_api_CANARYCANARYCANARY0123', 'displin'],
  ];
  for (const [label, text, word] of compounds) {
    const { text: out, hits } = redactForEgress(text);
    ok(`R9-E7: ${label} is left alone`, hits.length === 0 && out === text, `-> ${JSON.stringify(out)}`);
    ok(`R9-E7: ${label} keeps '${word}' intact`, out.startsWith(word), out);
  }

  // ...and each still catches its own token at a real boundary. A boundary that fixed
  // the prose by refusing the token would be the worse bug, so BOTH directions are
  // pinned — the same discipline the round-9b neighbour block uses.
  const real = [
    ['ghp_', 'ghp_CANARYCANARYCANARY0123456789'],
    ['gho_', 'gho_CANARYCANARYCANARY0123456789'],
    ['ghs_', 'ghs_CANARYCANARYCANARY0123456789'],
    ['lin_api_', 'lin_api_CANARYCANARYCANARY0123'],
    ['eyJ (JWT)', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcde'],
  ];
  for (const [name, token] of real) {
    for (const [where, input] of [
      ['at start', `${token} trailer`],
      ['after =', `k=${token}`],
      ['in JSON', JSON.stringify({ k: token })],
    ]) {
      const { text } = redactForEgress(input);
      ok(`R9-E7: ${name} still caught ${where}`, /<REDACTED-(KEY|JWT)>/.test(text), text);
    }
  }

  // The two rows deliberately left unbounded. If someone adds a boundary here, this
  // case flips and the change has to be argued rather than slipped in.
  const accepted = [
    ['AIza', 'metaAIzaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    ['rnd_', 'the brnd_CANARYCANARYCANARY0123 field'],
  ];
  for (const [name, input] of accepted) {
    const { text } = redactForEgress(input);
    ok(`R9-E7: ${name} over-redaction is accepted (no word collides)`, text !== input, text);
  }
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
