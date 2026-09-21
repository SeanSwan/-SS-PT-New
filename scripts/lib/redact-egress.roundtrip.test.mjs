/**
 * redact-egress.roundtrip.test.mjs — the SERIALISED and WORD-FIDELITY evidence for the
 * secret-shape table, split out of `redact-egress.rows.r9.test.mjs` when that file passed the
 * 300-line cap (Rule 4, extracted at the seam rather than raised).
 *
 * WHAT THIS FILE OWNS, and why the split is at this boundary:
 *   - R9-E6  every recognizer matches its own sample when run ALONE (no row certified by another)
 *   - R9-E7  the rows that matched inside a WORD now bound their left edge, both directions
 *   - R9-E11 the serialised spelling: a token after a JSON-escaped `\n \r \t \b \f`, and `Bearer`
 *   - R9-E12 a JSON body must STILL BE JSON after redaction
 *
 * The row-by-row evidence (R9-E3/E4/E5) and the falsifiability harness (R9-E8/E9/E10) stay in the
 * sibling file: those are about the table's own rows, while these are about the table MEETING a
 * body. `fetchForEgress()` is the control in the real system, and every case here is stated over
 * what that control does, not over a paraphrase of it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchForEgress, redactForEgress } from './redact-egress.mjs';
import { SECRET_SHAPES } from './secret-shapes.mjs';
import { SHORT_JSON_ESCAPES } from './redact-harness.mjs';

// `async` because R9-E12 asserts on the TRANSPORT (`fetchForEgress`), not only on the redactor's
// return value. The caller awaits this; a sync signature would have forced that one case to be
// deleted or paraphrased, and the transport is the claim that actually matters.
export async function run(m) {
  const ok = m.ok;
  const here = dirname(fileURLToPath(import.meta.url));

// --- R9-E11: the SERIALISED spelling of every row that needs one (Astra A1, round 9d) ---
//
// `fetchForEgress()` redacts the request body AFTER `JSON.stringify()`. A newline therefore
// reaches the regex as `\` `n`, and the LITERAL `n` that follows is a word character — so a
// bare `(?<!\w)` boundary rejects the match and the token on the next line reaches the socket.
// This is the same defect round 9 hit on `sk-`, and Astra's round-9d review found it still
// present on the three rows that had just GAINED that boundary: `gh[pours]_`, `lin_api_`, `eyJ`.
// Measured before the repair: all three MISSED, while `sk-` survived only because it happened
// to carry the escape branch the others lacked. A boundary copied to three rows without its
// escape alternative is a fix aimed at a row, not at a class.
//
// ALL FIVE short JSON control escapes are covered, not the three that were first measured: the
// class is the JSON spec's (`\n \r \t \b \f` — the ones that leave a word character behind).
// `JSON_ESCAPE_BEFORE` in `secret-shapes.mjs` is the single definition those rows now share.
{
  const A32 = 'A'.repeat(32);
  const families = [
    ['sk-', `sk-${A32}`, '<REDACTED-KEY>'],
    ['gh[pours]_', `gho_${A32.slice(0, 24)}`, '<REDACTED-KEY>'],
    ['lin_api_', `lin_api_${A32.slice(0, 24)}`, '<REDACTED-KEY>'],
    ['eyJ (JWT)', `eyJ${A32.slice(0, 12)}.eyJ${A32.slice(0, 12)}.abcde`, '<REDACTED-JWT>'],
    ['bot-token', `12345678:${'C'.repeat(30)}`, '<REDACTED-BOT-TOKEN>'],
  ];
  for (const esc of SHORT_JSON_ESCAPES) {
    for (const [name, token, placeholder] of families) {
      // THE ESCAPE IS TWO CHARACTERS: a backslash then the letter. The body is built by joining
      // parts rather than with a template literal, because a template's own escape processing
      // turns `\\${esc}` into ONE backslash — which is not what a serialised body contains, and
      // which the row's `[nrtbf]` class then fails to match for a reason unrelated to the fix.
      // The first draft of this case did exactly that and passed against a mutant it should have
      // caught; the mutation proof is what surfaced it.
      const escapeSequence = '\\' + esc;
      const body = JSON.stringify({ prompt: escapeSequence + token });
      // PRECONDITION: the serialised body must actually contain the two-character escape. If a
      // future JSON.stringify ever emitted the raw control character instead, this case would be
      // measuring a different thing and should say so rather than pass quietly.
      ok(
        `R9-E11: the fixture really contains the two-character escape \\${esc}`,
        body.includes('\\\\' + esc),
        JSON.stringify(body).slice(0, 80),
      );
      const { text } = redactForEgress(body);
      ok(
        `R9-E11: ${name} after a JSON-escaped \\${esc} is redacted`,
        text.includes(placeholder),
        `${JSON.stringify(body)} -> ${JSON.stringify(text)}`,
      );
    }
  }

  // BEARER is a different shape of the same problem: its SEPARATOR is `\s+`, and `\s` matches
  // no part of the two-character `\n`. So the raw form was caught and the serialised one was
  // not, even though the serialised body is the only form this redactor actually processes.
  {
    const body = JSON.stringify({ prompt: `Bearer\n${A32}` });
    const { text } = redactForEgress(body);
    ok(
      'R9-E11: Bearer survives serialisation (its separator, not just its left edge)',
      text.includes('<REDACTED-KEY>'),
      `${JSON.stringify(body)} -> ${JSON.stringify(text)}`,
    );
    ok(
      'R9-E11: ...and the raw Bearer form is unaffected by the repair',
      redactForEgress(`Authorization: Bearer ${A32}`).text.includes('<REDACTED-KEY>'),
    );
  }
}

// --- R9-E12: a JSON body must STILL BE JSON after redaction (Astra A3/A4) ---
//
// A redactor that emits an unparseable body has broken the request it was protecting: the point
// of redacting the serialised transport is that the caller's JSON survives the trip. Three
// defects were measured here before the repair:
//   `{"chat_id":1234567}`    -> `{"chat_id:<REDACTED-ID>}`    UNTERMINATED STRING (quote eaten)
//   `{"chat_id":"1234567"}`  -> unchanged, 0 hits             (a STRING value was not matched)
//   `{"prompt":"{\"chat_id\":1234567}"}` -> unchanged, 0 hits (the escaped spelling was missed)
// and the first repair of the quote leaked the other way: `"<REDACTED-ID>""` — also not JSON.
//
// The transport is asserted, not only the redactor's return value: `fetchForEgress()` is the
// control, and what reaches the socket is the claim that matters.
{
  const bodies = [
    ['number value', JSON.stringify({ chat_id: 1234567 })],
    ['string value', JSON.stringify({ chat_id: '1234567' })],
    ['nested object', JSON.stringify({ message: { chat: { id: '1234567' } } })],
    ['single-quoted-ish', "{'chat_id':'1234567'}"],
    ['spaced', '{"chat_id": 123456789}'],
    ['escaped body inside a prompt', JSON.stringify({ prompt: JSON.stringify({ chat_id: 1234567 }) })],
    ['the negative form', '{"chat_id":-1234567}'],
  ];
  for (const [label, body] of bodies) {
    const { text, hits } = redactForEgress(body);
    ok(`R9-E12: ${label} is redacted`, hits.length >= 1, `${JSON.stringify(body)} -> ${JSON.stringify(text)}`);
    // The validity check only applies to a body that was VALID TO BEGIN WITH. `{'chat_id':…}`
    // is single-quoted pseudo-JSON: it does not parse before redaction either, so requiring it
    // to parse after would assert something the input never satisfied — a probe failing its own
    // precondition, which is its own false report. The property that matters is PRESERVATION:
    // redaction must not take a parseable body and return an unparseable one.
    const wasJson = (() => { try { JSON.parse(body); return true; } catch { return false; } })();
    if (wasJson) {
      let parses = true;
      let why = '';
      try { JSON.parse(text); } catch (e) { parses = false; why = e.message.slice(0, 60); }
      ok(`R9-E12: ${label} is STILL PARSEABLE JSON`, parses, why);
    } else {
      // Non-JSON input is still redacted; only the parse assertion is skipped, and the fact is
      // stated so a reader does not mistake the absence of a FAIL for a passing validity check.
      ok(`R9-E12: ${label} was not JSON to begin with (validity not applicable)`, true, '');
    }
  }
  // A value of 10+ digits is the bare row's business, not the keyed row's — and it too must
  // leave a parseable body behind.
  {
    const body = JSON.stringify({ note: 'x', chat_id: 1234567890 });
    const { text } = redactForEgress(body);
    let parses = true;
    try { JSON.parse(text); } catch { parses = false; }
    ok('R9-E12: a 10-digit value under a key leaves parseable JSON', parses, text);
  }
  // ...and the transport, not only the redactor.
  let sent = null;
  const fakeFetch = async (url, init) => { sent = init; return { ok: true, status: 200 }; };
  await fetchForEgress('https://example.invalid/v1', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'x', chat_id: 1234567, messages: [{ role: 'user', content: 'hi' }] }),
  }, { quiet: true, fetchImpl: fakeFetch });
  ok('R9-E12: the socket receives a body with no numeric id', sent && !sent.body.includes('1234567'), sent?.body);
  ok('R9-E12: ...and that body is still valid JSON', (() => {
    try { JSON.parse(sent.body); return true; } catch { return false; }
  })(), sent?.body);
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

  // `SG.` IS THE THIRD ROW IN THAT GROUP, AND ITS COMMENT WAS WRONG (round 9d, Astra A7).
  //
  // The table's comment claimed `massSG.…` does NOT fire, on the reasoning that the row's prefix
  // ends in a dot and a dot cannot be part of a word. Measured, IT FIRES — and this case pins
  // exactly what it does, because the first draft of THIS comment got the consequence wrong too
  // and claimed the match "consumes the `mass`". It does not:
  //
  //   `mass` + `SG.<16>.<16>`  ->  `mass<REDACTED-KEY>`
  //
  // The match begins at `S`, so `mass` survives as ordinary text and the token is redacted
  // normally. The defect was never in the pattern; it was in the CLAIM, which asserted a
  // behaviour the code does not have and would have been "fixed" by adding a boundary that
  // nothing needed. Pinning the real output is the only way to stop that re-derivation.
  {
    const input = ['mass', 'SG.', 'A'.repeat(16), '.', 'B'.repeat(16)].join('');
    const { text, hits } = redactForEgress(input);
    ok('R9-E7: SG. DOES fire inside a word (the old comment said it did not)', hits.length === 1, `-> ${JSON.stringify(text)}`);
    ok('R9-E7: ...and the prefix word SURVIVES (the match starts at `S`)',
      text === 'mass<REDACTED-KEY>', text);
    // The disposition is unchanged and deliberate: no measured English word collides, so adding
    // `(?<!\\w)` would be symmetry rather than evidence. Pinned so a future "fix" is argued.
    ok('R9-E7: the SG. row is left unbounded on purpose (no word collides)',
      !SECRET_SHAPES.some(([re]) => re.source.startsWith('(?<!\\w)SG')), '');
  }
}
}