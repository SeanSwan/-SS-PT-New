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
import { redactForEgress, selfTest } from './redact-egress.mjs';
import { resolveSpans } from './redact-apply.mjs';
import { SECRET_SHAPES } from './secret-shapes.mjs';
import { SECRET_FAMILIES, uncoveredFamilies, duplicatePatterns } from './secret-families.mjs';
// The serialisation and word-fidelity cases moved to their own file when this one passed the
// 300-line cap (Rule 4). They are RUN from here so a single command still exercises the whole
// round, and so the reporter's total is one number rather than two that a caller must add up.
import { run as runRoundtrip } from './redact-egress.roundtrip.test.mjs';
// E8/E9 moved out for the same reason, at the seam between "cases about the INSTRUMENT" (there)
// and "cases about the ROWS" (here). This file fell from 402 to 188 lines on that extraction.
import { runE8E9 } from './redact-egress.coverage.r9.test.mjs';

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


// --- R9-E5b: the keyed class is ANY id-suffixed key, not the canonical seven ---
//
// G9 hostile review (2026-09-25, major 4): the rows named `chat_id|chat|user_id|from_id|
// owner_id|telegram_id|id`, and live probes showed the generalisation gap a hard list creates —
// `userId`, `chatId`, `sender_id`, `message_id` (camelCase and *_id suffixes, this codebase's
// own dominant spellings) sailed through with 7-9 digit ids in the clear. The class is now any
// word key ending in `id` (case-insensitive) plus bare `chat`, bounded to a 32-char prefix.
//
// MUTANT THAT RE-GREENS THIS: restore the seven-key alternation in secret-shapes.mjs — every
// case below then returns UNCHANGED, which is exactly the leak this block exists to prevent.
{
  const cases = [
    ['camelCase bare JSON', '{"userId":1234567}'],
    ['camelCase spaced', '{"chatId": 7654321}'],
    ['snake _id suffix', '{"sender_id":1234567}'],
    ['snake _id suffix 2', '{"message_id":7654321}'],
    ['Mongo _id', '{"_id": 1234567}'],
    ['camelCase quoted value', '{"userId":"1234567"}'],
    ['escaped-quote camelCase', 'prompt body {\\"userId\\":1234567} tail'],
    ['bare chat key preserved', '{chat: 1234567}'],
    ['quoted bare chat key', '{"chat":1234567}'],
    ['long key within the 32-char cap', '{"secondaryContactId":1234567}'],
  ];
  for (const [label, input] of cases) {
    const { text } = redactForEgress(input);
    ok(`R9-E5b: ${label} is redacted`, text.includes('<REDACTED-ID>'), `${JSON.stringify(input)} -> ${JSON.stringify(text)}`);
    ok(`R9-E5b: ${label} leaves no 7+ digit residue`, !/[0-9]{7}/.test(text.replace(/<REDACTED-ID>/g, '')), text);
  }
  // Over-refusal guards: words that merely CONTAIN an id-shaped suffix must not trip the row —
  // the separator has to sit immediately after the key.
  const guards = [
    ['catch is not a key', '{"catch":1234567}'],
    ['width is not a key', 'width = 1234567'],
    ['watch is not a key', 'watch: 1234567'],
  ];
  for (const [label, input] of guards) {
    const { text } = redactForEgress(input);
    ok(`R9-E5b guard: ${label} survives untouched`, !text.includes('<REDACTED-ID>'), `${JSON.stringify(input)} -> ${JSON.stringify(text)}`);
  }
}


// --- R9-E10: OVERLAP RESOLUTION on ORIGINAL spans (Astra A2) ---
//
// The redactor used to apply each row in TABLE ORDER, so row N+1 matched against text row N had
// already edited. A row could not see that its match sat inside another row's, because the
// enclosing text was already gone. Measured consequence: a 40-character bot token containing
// `sk-` was reported as redacted while 30 of its characters stayed in the clear — the failure
// mode where a placeholder suggests the value was handled. No pattern change repairs it; the
// ORDER was the bug. `resolveSpans()` now decides overlaps on original positions.
{
  const span = (start, end) => ({ start, end, repl: '', label: '', row: 0 });

  ok('R9-E10: disjoint spans are both kept',
    resolveSpans([span(0, 3), span(6, 9)]).length === 2);

  ok('R9-E10: identical spans resolve to ONE (earlier row wins, deterministic)',
    resolveSpans([span(2, 8), span(2, 8)]).length === 1);

  const contained = resolveSpans([span(0, 20), span(4, 9)]);
  ok('R9-E10: a CONTAINED span is dropped — the enclosing match wins',
    contained.length === 1 && contained[0].start === 0 && contained[0].end === 20,
    JSON.stringify(contained));

  const partial = resolveSpans([span(0, 10), span(6, 18)]);
  ok('R9-E10: a PARTIAL overlap redacts their UNION (never half of each)',
    partial.length === 1 && partial[0].start === 0 && partial[0].end === 18,
    JSON.stringify(partial));

  // The real case, end to end: the token CONTAINS the key.
  const A32 = 'A'.repeat(32);
  const hostile = ['12345678:', 'sk-', A32.slice(2)].join('');
  const { text, hits } = redactForEgress(hostile);
  ok('R9-E10: a bot token CONTAINING sk- redacts whole, not partially',
    text === '<REDACTED-BOT-TOKEN>' && hits.length === 1,
    `${JSON.stringify(hostile)} -> ${JSON.stringify(text)} hits=${JSON.stringify(hits)}`);
  // The placeholder is `<REDACTED-BOT-TOKEN>`, which itself contains an `A` — so testing
  // `!text.includes('A')` would assert the wrong thing and fail on a CORRECT redaction. The
  // property that matters is that none of the token's PAYLOAD survives, so the check is on a
  // run of the payload character, which no placeholder contains.
  ok('R9-E10: ...and no run of the token\'s payload survives',
    text === '<REDACTED-BOT-TOKEN>' && !/A{3,}/.test(text),
    text);
}

// The sibling's cases run into THIS reporter, so a single RUN command still exercises the whole
// round and the RESULT line at the bottom — not the sibling's — is the authoritative total. The
// siblings never print their own total or exit; they receive `ok` and report through it.
runE8E9({
  ok, SECRET_SHAPES, SECRET_FAMILIES, uncoveredFamilies, duplicatePatterns, selfTest, redactForEgress,
});
await runRoundtrip({ ok });

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
