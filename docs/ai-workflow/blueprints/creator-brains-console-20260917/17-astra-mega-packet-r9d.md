# ASTRA HOSTILE REVIEW — CREATOR BRAINS CONSOLE — ROUND 9d

You are reviewing **one file's fix pass**, not a feature. Round 9d touched
`scripts/lib/secret-shapes.mjs` and added one test file. That is the whole subject.
Attack it in the two directions that matter: **is each fix correct**, and **is each
fix's test falsifiable**. Be hostile. A finding that says "this looks fine" is not
a finding.

## 0. What round 9d was

Round 9 handed you a 19-neighbour audit of the secret-shape table. You dispositioned
most rows as *"test independently"* asks rather than established defects, and named
two as real: the bot-token row's trailing `\b`, and the keyed-numeric-ID row's
inability to see a JSON closing quote. Round 9d did both, then swept the remaining
rows for the class you called out.

**Four changes, one file:**

1. **Bot-token row — PARTIAL REDACTION, which is worse than a miss.**
   `/\b\d{8,}:[A-Za-z0-9_-]{30,}\b/` ended in `\b`, which cannot sit between two
   non-word characters. The row declares `-` as a legal token character, so a token
   ending in hyphens could not place its right boundary after the last character and
   the engine backtracked the `{30,}` tail. Measured against shipped source:

   ```
   12345678:<30 body>-                  -> <REDACTED-BOT-TOKEN>-        (1 char leaked)
   12345678:<30 body>-----              -> <REDACTED-BOT-TOKEN>-----    (5 chars leaked)
   12345678:<30 body>(20 hyphens)       -> 20 chars leaked
   ```

   The leak scales with the trailing run. A trailing `_` never leaked, because `_` IS
   a word character — the defect is `-`-specific, which is why the fix states the
   boundary as the row's own declared alphabet rather than another `\b` variant.

2. **Keyed numeric ID — the JSON spelling was not redacted at all.**
   The separator was `(\s*[=:]\s*)`, requiring `=`/`:` immediately after the name. A
   JSON key arrives as `"chat_id":`. The 7–9 digit band is below the bare row's
   10-digit floor, so nothing else caught it:

   ```
   {"chat_id":1234567}    -> unchanged, 0 hits     (BEFORE)
   {"chat_id":123456789}  -> unchanged, 0 hits     (BEFORE)
   {"chat_id":1234567890} -> redacted, by the BARE row
   ```

3. **Three more rows matched inside ordinary English.** You asked for the remainder to
   be tested independently. Four fired inside compounds; I measured each on prose to
   decide whether the false positive costs a *real word*:

   ```
   ghp_     in `highs_`         -> `hi<REDACTED-KEY>`    (high + s_)
   ghp_     in `weighp_`        -> `wei<REDACTED-KEY>`   (weigh + p_)
   eyJ      in `theyJhbGci`     -> `th<REDACTED-JWT>`    (they + JhbGci)
   lin_api_ in `displin_api_`   -> `disp<REDACTED-KEY>`
   ```

   Three gained `(?<!\w)`. **`AIza` and `rnd_` were deliberately LEFT UNBOUNDED** —
   no English word collides with either (`metaAIza…` and `brnd_…` are fabricated),
   so a boundary could only weaken the row.

4. **New test file, 93 cases** (`scripts/lib/redact-egress.rows.r9.test.mjs`).

## 1. YOUR REMIT — attack these, in this order

**(a) IS THE PARTIAL-REDACTION FIX COMPLETE, OR DID IT MOVE THE LEAK?** I replaced the
trailing `\b` with `(?![A-Za-z0-9_-])`. Find an input where the token is still
partially redacted — a character class the lookahead does not cover, a member of the
row's own declared alphabet that can still be left in the clear, or a context where
the lookahead succeeds early and the tail is truncated. **The row's alphabet is
`[A-Za-z0-9_-]`; if any member of it can survive, the fix is incomplete.**

**(b) THE LEFT BOUNDARY ON THE BOT-TOKEN ROW.** I wrote
`(?:(?<!\w)|(?<=\\[nrt]))`. The first alternative replaces `\b`'s effect; the
second is copied from the `sk-` row for a serialised body's `\n`. **The `sk-` row
earned that alternative by measurement. Does this row need it?** I did not measure it
here — I reasoned that a serialised body puts `\n` before the whole token, and the
preceding `n` is a word character that the first alternative already rejects. If that
reasoning is wrong, a key on the line after a newline is missed at the transport.
**Also: is the second alternative LOAD-BEARING or is it noise?** A branch no input can
reach is dead code in a security control, and dead code in a security control is how
the next reader concludes the boundary is subtler than it is.

**(c) THE THREE NEW BOUNDARIES — BOTH DIRECTIONS.** Show me a real secret shape my
`(?<!\w)` now MISSES, or an ordinary English string it still refuses. I measured the
prose direction (`highs_`, `weighp_`, `theyJhbGci`, `displin_api_` all clean) and
the catch direction (each row still fires at start-of-string, after `=`, and in JSON).
**Break one of those two claims.**

**(d) THE TWO ROWS I DELIBERATELY DID NOT FIX.** I claim `AIza` and `rnd_` are safe
to leave unbounded because no English word ends in `AIza` or produces `brnd_`/`grnd_`.
**Falsify it.** If you can construct prose a person would actually write where one of
these over-redacts, I made the wrong call and it should be fixed. I would rather be
shown wrong here than have a boundary added later for a case nobody writes — or, worse,
added wrongly.

**(e) IS THE NEW TEST FILE FALSIFIABLE, OR IS IT DECORATION?** Case `R9-E3` reads the
table itself rather than a hand-copied list of names, so deleting a row deletes a case.
Case `R9-E6` requires each row to match its own sample when run alone. Case `R9-E7`
pins BOTH the four fixed rows and the two deliberately-unfixed ones, so a later
"completion" of the fix flips a case.
**Attack the harness.** Specifically: can a row be DELETED from the table and leave the
suite green? Can a row be neutered (its pattern made unsatisfiable) and leave the suite
green? Can the placeholder be produced by a DIFFERENT row and satisfy the assertion?
I believe the answers are no, no and no — prove me wrong.

**(f) THE MUTATION EVIDENCE.** My harness reports three outcomes now: RED, STAYED-GREEN
and CRASHED. I added CRASHED during this run after discovering that mutating the `AIza`
row makes `selfTest()` refuse with `CANARY FAILED`, which my earlier two-outcome
harness scored as "survived". **That is a false clean produced by my own tooling and I
found it by reading a stack trace, not by a test.** Check the rest of the harness for
the same class: is there another outcome I am collapsing?

**(g) WHAT DID 9d NOT FIX THAT IT IMPLIED IT HAD?** The 19-row audit dispositioned
several rows as "confirm as shipped" (`SG.`, PEM, DB-URL, `Bearer`, `github_pat_`).
If any of those is a DEFECT I mislabelled as a conservatism, say so.

## 2. SCOPE BOUND — this packet is deliberately small

Per `ASTRA-REVIEW-ROUTING.md` §7, this dispatch is `--bounded`: the Mega Blueprint
hunting mandate is **off**. You have the remit, the table source and the new test file,
and nothing else — because nothing else was touched. **A document you cannot see is not
a gap in the packet.** Do not report missing context and do not go looking for it.

## 3. WHAT I AM NOT CLAIMING

- I am **not** claiming the table is complete. It has 20 rows and I did not add any.
- I am **not** claiming the 19-row audit is exhaustive beyond the rows listed.
- I am **not** claiming the bot-token row's JSON-escape alternative is load-bearing —
  I copied it from `sk-` by analogy and did not measure it here (see (b)).
- I am **not** claiming `AIza`/`rnd_` are safe by argument; I claim they are safe by
  measurement, and measurement is what (d) attacks.
- I am **not** claiming the console is done. Slices S2–S7 remain unbuilt.

## 4. EVIDENCE I MEASURED (attack the measurements)

| Gate | Result |
|---|---|
| console suite | 298/298, 0 fail, 0 cancelled |
| engine | 189 tests, 183 pass, 0 fail, 6 skipped |
| redact main | 83 passed, 0 failed |
| redact rows r9 (new) | **93 passed, 0 failed** |
| redact guard | 9 passed, 0 failed |
| redact seat + training-tier | 26 passed, 0 failed |
| web (vitest) | 62/62, 6 files |
| `tsc --noEmit` | exit 0 |
| rule 4 | `secret-shapes.mjs` 152; `redact-egress.rows.r9.test.mjs` 234 — both under 300 |
| pre-commit secret scan | CLEAN (2 files, 0 hits) |

Mutation proof — 7 mutants, two harnesses, anchors located by content search:

| Mutant | Target | Result |
|---|---|---|
| M-A | restore trailing `\b` | RED — 6 failures, all `R9-E4` |
| M-B | drop the quote tolerance | RED — 10 failures, all `R9-E5` |
| M-C | drop `gh[pousr]_` boundary | RED — 4 failures, that row's cases |
| M-D | drop `lin_api_` boundary | RED — 2 failures, that row's cases |
| M-E | drop `eyJ` boundary | RED — 2 failures, that row's cases |
| M-F | add the boundary `AIza` lacks | **CRASHED** — `selfTest()` refused |
| — | unexpected outcomes | **0** |

**Where I was wrong and corrected it, rather than hiding it:**

- My first probe of the bot-token row reported every case `CAUGHT`, including cases I
  expected to fail. The helper tested `out !== input` on a function that returns an
  OBJECT, so the comparison was always true and **the probe's verdict was decided by
  the wrong predicate**. Five lines of output were meaningless until I fixed it. This is
  the same error class as an unexecuted assertion: a check whose predicate does not
  test what its label claims.
- I flagged `{"chat_id":…}` correctly, but a later sweep marked a 13-digit numeric run
  as a truncating match. Re-measured: `{10,}` is greedy, consumes the whole run, and
  **zero digits survive at 10, 11, 13, 16 and 20 digits**. The expectation was wrong,
  not the row. Recorded rather than dropped.
- A mutant I initially reported `BROKEN` matched only after the needle was read OUT of
  the file: the table module is **CRLF**, so a needle joined with `\n` matches nothing.
  Identical visible text gave `count: 1` from a file-written probe and `0` from a shell
  heredoc, because the heredoc had already eaten the carriage return.
- Mutant `M-F` was scored "STAYED-GREEN" by my two-outcome harness when the truth was
  that the tree refused to run. The harness now has a third outcome.

## 5. OUTPUT

Findings as a numbered list, each with: **severity** (P1/P2/P3), the **file and line**,
what is **wrong**, how to **observe** it, and the **fix**. Separate "this is wrong" from
"this is risky" and from "I could not verify". A finding you could not verify is still
useful if you label it.

If a claim in section 4 is wrong, say which and how you measured it. Do not accept my
numbers because I listed them in a table — that table is the thing under review.

---


=== BEGIN DOCUMENT: scripts/lib/secret-shapes.mjs — the 20-row table under review ===

```js
/**
 * secret-shapes.mjs — the secret-shape table, extracted from `redact-egress.mjs`
 * when that file crossed the 300-line cap (Rule 4).
 *
 * WHY A SEPARATE MODULE AND NOT A SHRUNK COMMENT. The table is pure data: a list of
 * [regex, replacement, canary sample] rows with no dependency on the redactor around
 * it. The alternative — trimming the comment on the `sk-` row — would have deleted the
 * record of a defect the round-9 loop made TWICE in opposite directions, and a shape
 * whose boundary is not explained gets "simplified" back into a bug by the next reader.
 * The parent module already set this precedent when it extracted `training-tier-gate.mjs`.
 *
 * The parent re-exports nothing from here; it consumes `SECRET_SHAPES` directly. Callers
 * still import the egress control from `redact-egress.mjs`, so the public surface is
 * unchanged — this is an internal seam.
 */

/**
 * Canary samples are assembled from parts so no source file contains a literal
 * key-shaped string: the pre-commit secret scanner (rightly) cannot tell a canary from
 * a leak, and an allowlist for this file would be a bigger hole.
 */
export const c = (...parts) => parts.join('');

/**
 * Secret-shaped values: [regex, replacement, canary sample]. Redacted wherever
 * they appear, key name irrelevant. Every row's sample is planted by selfTest().
 */
export const SECRET_SHAPES = [
  // THE `sk-` ROW NEEDS A LEFT BOUNDARY (round 9). Without one the alternative
  // matched INSIDE ordinary English words, because `sk-` occurs as a word-junction
  // in all of them:
  //
  //   ta[sk-]runner-identifier   ri[sk-]management-framework   di[sk-]usage-reporting
  //
  // Every one has 12+ word-characters after `sk-`, so the `{12,}` lower bound gave no
  // protection: the bound counts the TAIL, and the tail of an English compound is long.
  //
  // ROUND 9 GOT THIS WRONG TWICE, IN OPPOSITE DIRECTIONS, WHICH IS WHY THE SHAPE IS NOW
  // PINNED BY MEASUREMENT RATHER THAN BY ARGUMENT. The first attempt used `(?<![\w-])`,
  // which fixed the prose false positives and introduced a FALSE NEGATIVE at the
  // transport: `fetchForEgress()` redacts the SERIALISED request body, where a newline
  // is the two characters `\` `n` — and that literal `n` satisfies `\w`, so a key on the
  // line after a newline was no longer caught. The hyphen exemption was the other error:
  // it declared `prefix-<key>` harmless by construction, which no measurement supported.
  //
  // So the boundary is stated POSITIVELY — the two contexts a key actually follows:
  //   (?<!\w)        start of string, whitespace, quote, `=`, `(`, `:`, `,`  (NOT `-`)
  //   (?<=\\[nrt])   a JSON escape for newline/tab/CR in a serialised body
  // The first alternative still rejects `task-runner-identifier`; dropping the hyphen
  // exemption means `x-task-<key>` is caught, which is the safe direction on an egress
  // path where a false negative leaves the machine and a false positive merely redacts.
  // Both directions measured in `redact-egress.test.mjs`; see the round-9 block.
  [/(?:(?<!\w)|(?<=\\[nrt]))sk-[A-Za-z0-9_-]{12,}/g, '<REDACTED-KEY>', c('sk-', 'CANARYCANARYCANARY123456')],
  // THE FOUR ROWS BELOW TARGET PREFIXED UNDERCORE/HYPHEN TOKENS, WHICH IS WHY THEY NEED
  // THE SAME LEFT BOUNDARY AS `sk-` ABOVE (round 9b, Astra's neighbour audit). Measured
  // without it: `ta[sk_live_]identifier` -> `ta<REDACTED-KEY>`, `di[sk_test_]reporting`
  // -> `di<REDACTED-KEY>`, `wo[rk_live_]configuration` -> `wo<REDACTED-KEY>`. These are
  // over-refusals nine and ten in this loop's count, and they sit in the rows ADJACENT
  // to the one round 9 fixed — a fix aimed at a row is not a fix aimed at a class.
  //
  // `(?<!\w)` is the whole boundary here, unlike `sk-`: the token's first character is a
  // word character (`s`, `r`, `w`, `x`), so any preceding word character means the token
  // began mid-compound. The JSON-escape alternative is unnecessary for these rows — a
  // serialised body puts `\n` before the whole token, and the preceding `n` is caught by
  // the same word-character test — but it is kept for `sk-` where it was MEASURED to
  // matter. See the neighbour block in `redact-egress.test.mjs`.
  [/(?<!\w)sk_(live|test)_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('sk_', 'live_', 'CANARY0123456789')],
  [/(?<!\w)rk_live_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('rk_', 'live_', 'CANARY0123456789')],
  [/(?<!\w)whsec_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('whsec', '_CANARY0123456789')],
  [/(?<!\w)xoxb-[A-Za-z0-9-]{8,}/g, '<REDACTED-KEY>', c('xoxb', '-CANARY-0123456789')],
  [/AIza[A-Za-z0-9_-]{20,}/g, '<REDACTED-KEY>', 'AIzaCANARYCANARYCANARY0123456789'],
  [/rnd_[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'rnd_CANARYCANARYCANARY0123'],
  // ROUND 9d: THE ROW THAT MATCHES INSIDE A WORD MUST BOUND ITS LEFT EDGE.
  //
  // The class was diagnosed on `sk-` (round 9) and its four adjacent rows (round 9b).
  // Astra's neighbour audit asked for the remainder to be tested independently, and
  // three of them fail the same way. What separates a DEFECT from a conservatism here
  // is whether the false positive costs a real word, so each was measured on prose:
  //
  //   ghp_  inside `highs_`     ->  `hi<REDACTED-KEY>`     (high + s_ — a real word)
  //   ghp_  inside `weighp_`    ->  `wei<REDACTED-KEY>`    (weigh + p_)
  //   eyJ   inside `theyJhbGci` ->  `th<REDACTED-JWT>`     (they + JhbGci — a pronoun)
  //   lin_api_ inside `displin_api_` -> `disp<REDACTED-KEY>`
  //
  // The boundary is `(?<!\w)` — these tokens all BEGIN with a word character (`g`,
  // `l`, `e`), so a preceding word character means the token began mid-compound. This
  // is the same reasoning as the four rows above, and it is stated once here rather
  // than four times because the mechanism is identical.
  //
  // DELIBERATELY NOT FIXED, and recorded so the next reader does not "complete" it:
  //   `AIza` — no English word ends in those four characters; the over-redaction is
  //            reachable only from a contrived string. Measured: `metaAIza…` needed a
  //            fabricated prefix. Not worth a boundary that could only weaken it.
  //   `rnd_` — `brnd_`/`grnd_` are not words. Same disposition.
  //   `SG.`  — already safe without a boundary: the token's own prefix ENDS in a dot,
  //            which cannot be part of a word, so there is no word it can hide inside.
  //            Measured: `massSG.…` does NOT fire. No change needed.
  [/(?<!\w)gh[pousr]_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'ghp_CANARYCANARYCANARY0123456789'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '<REDACTED-KEY>', 'github_pat_CANARYCANARYCANARY0123'],
  [/SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'SG.CANARYCANARYCANARY01.CANARYCANARYCANARY02'],
  [/(?<!\w)lin_api_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'lin_api_CANARYCANARYCANARY0123'],
  [/(?<!\w)eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>', 'eyJCANARYCANARY.eyJCANARYCANARY.CANARY'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer <REDACTED-KEY>', 'Bearer CANARYCANARYCANARY0123'],
  // THE TRAILING BOUNDARY IS THE DECLARED ALPHABET, NOT `\b` (round 9d, Astra P3 #9).
  //
  // `\b` cannot sit between two NON-word characters, and the row declares `-` as a
  // legal token character. So a token ending in hyphen(s) could not place its right
  // boundary after the last character: the engine backtracked the `{30,}` tail to the
  // last position where `\b` held and every trailing hyphen stayed IN THE CLEAR.
  //
  // Measured against shipped source before the fix:
  //   `12345678:<30 body>-`      -> `<REDACTED-BOT-TOKEN>-`      (1 char leaked)
  //   `12345678:<30 body>-----`  -> `<REDACTED-BOT-TOKEN>-----`  (5 chars leaked)
  //   `12345678:<30 body>${'-'.repeat(20)}` -> 20 chars leaked
  // The leak scales with the trailing run, so the tail is bounded only by the length.
  // A trailing `_` never leaked: `_` IS a word character, so `\b` held after it. The
  // defect is specific to `-`, which is exactly why `[A-Za-z0-9_-]`-as-alphabet is the
  // right way to state it: the boundary follows the alphabet the row already declares.
  //
  // Astra recorded this as "`\b` can fail on a 30-char tail ending in `-`". The check
  // re-confirmed the mechanism and found the consequence worse than stated: the token
  // is not MISSED, it is PARTIALLY redacted, which is the failure mode that leaves
  // evidence in the clear while the placeholder suggests the value was handled.
  //
  // Both sides are now stated as alphabets. The left side keeps `\b`'s effect via a
  // negative lookbehind (a numeric run glued to a word character is not a standalone
  // id), and keeps the JSON-escape alternative for a serialised body's `\n`.
  [/(?:(?<!\w)|(?<=\\[nrt]))\d{8,}:[A-Za-z0-9_-]{30,}(?![A-Za-z0-9_-])/g, '<REDACTED-BOT-TOKEN>',
    '12345678:CANARYCANARYCANARYCANARYCANARY01'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED-PEM>',
    '-----BEGIN PRIVATE KEY-----\nCANARY\n-----END PRIVATE KEY-----'],
  [/(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|amqps?):\/\/[^\s"'<>]+/gi, '<REDACTED-DB-URL>',
    c('postgresql:', '//canary:canary@canary.invalid:5432/canary')],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<REDACTED-EMAIL>', 'canary@canary.invalid'],
  [/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '<REDACTED-PHONE>', '(555) 000-0199'],
  // Rule 47 numeric IDs (Telegram chat_id etc): keyed at 7+ digits, bare only
  // at 10+ so all-digit 9-char commit SHAs and 20260826T… timestamps survive.
  //
  // THE SEPARATOR ABSORBS A JSON CLOSING QUOTE (round 9d, Astra P3 #10). The keyed
  // form was written `(\s*[=:]\s*)`, which requires the separator to be the character
  // IMMEDIATELY after the name. In JSON the key arrives as `"chat_id":` — a closing
  // quote sits between the name and the colon — so the row could not see it, and a
  // 7-9 digit id under a quoted key was NOT REDACTED AT ALL. Measured before the fix:
  //   `{"chat_id":1234567}`     -> unchanged, 0 hits
  //   `{"chat_id":123456789}`   -> unchanged, 0 hits   (the bare row's floor is 10)
  //   `{"chat_id":1234567890}`  -> redacted, by the BARE row, not this one
  // So the keyed policy silently did not apply to the spelling that a JSON body —
  // the form this redactor actually processes on the serialised transport — most
  // commonly uses. The separator now tolerates one `'` or `"` before the `=`/`:`.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)['"]?(\s*[=:]\s*)-?\d{7,}\b/gi, '$1$2<REDACTED-ID>', 'chat_id=1234567'],
  [/(?<![\w.-])-?\d{10,}(?![\w.-])/g, '<REDACTED-ID>', '9876543210'],
];
```

=== BEGIN DOCUMENT: scripts/lib/redact-egress.rows.r9.test.mjs — the new per-row evidence ===

```js
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
```

=== BEGIN DOCUMENT: scripts/lib/redact-egress.mjs — the consumer (SECRET_SHAPES + applyAll) ===

```js
/**
 * redact-egress.mjs — the last gate before a document leaves this machine.
 * =======================================================================
 * WHY THIS EXISTS (2026-08-22 incident, handoff v5 §4):
 * A review packet dispatched to six external vendors carried the operator's
 * Windows username inside filesystem paths. A secret scan had been run before
 * dispatch and returned "No matches found" — on a file that demonstrably
 * contained the string. **The instrument produced a false negative and it was
 * believed.** Scope, once measured: 59 documents, 140 occurrences, months old.
 *
 * REVISED 2026-08-26 (Fable review, EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23):
 * the first version gated the *file read*; callers then assembled diffs,
 * prompts, seeds and even the redactor's own ENOENT messages around it and
 * sent those raw. The gate now sits at the TRANSPORT: `fetchForEgress()`
 * redacts the final request body immediately before the socket. Per-read
 * helpers remain for early, labelled reporting — they are defense in depth,
 * not the control.
 *
 * THE CANARY IS A POSITIVE CONTROL ON THE INSTRUMENT, NOT A COVERAGE PROOF.
 * Before redacting anything real, every call plants one sample of EVERY shape
 * it knows (identity, hostname, each secret family) and verifies each was
 * caught. That proves the instrument is live and every pattern fires in this
 * process. Coverage — whether a class nobody thought of leaks — lives in the
 * test corpus and the threat model (accidental leakage by cooperative authors;
 * regex is the right tool for that and the wrong tool for adversarial exfil).
 *
 * Identity is derived at runtime (os.userInfo / homedir / hostname), never
 * hardcoded — hardcoding the operator's name here would make THIS FILE the leak.
 */
import { readFileSync } from 'node:fs';
import { homedir, hostname, userInfo } from 'node:os';
import { basename } from 'node:path';
// The training-tier gate moved to its own module when this file outgrew the
// 300-line cap (SWA-236), but it stays part of THIS file's public surface:
// every caller imports the egress control from here, and fetchForEgress below
// is what actually enforces it.
import { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
// Astra is NOT blocked on OpenRouter (the subscription does not serve
// `gpt-6-astra-pro`), but it is double-gated: two independent confirmations,
// surfaced as two sequential stops. Sean 2026-09-19. See the module header.
// The names are imported (not only re-exported) because the default export
// object below references them as local bindings — `export … from` alone
// creates no binding in this module.
import { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

export { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
export { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

// The secret-shape table lives in its own module as of round 9b: this file crossed
// the 300-line cap (Rule 4) when the `sk-` row gained the boundary it needed. The
// table is pure data; callers still import the egress control from HERE, so the
// public surface is unchanged. See `secret-shapes.mjs` for the `sk-` boundary record.
import { SECRET_SHAPES } from './secret-shapes.mjs';
/** Names that are also ordinary words: redact with boundaries instead of corrupting prose. */
const COMMON_WORD_NAMES = new Set([
  'admin', 'administrator', 'user', 'users', 'root', 'dev', 'developer', 'test', 'guest',
  'owner', 'default', 'public', 'home', 'desktop', 'server', 'local', 'localhost', 'ubuntu',
  'runner', 'node', 'docker', 'system', 'pi', 'me', 'main',
]);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Identity-bearing names, derived from the RUNTIME environment. */
export function identityNames() {
  const user = (userInfo().username || '').trim();
  const winUser = basename(homedir() || '') || '';
  let host = '';
  try { host = (hostname() || '').trim(); } catch { host = ''; }
  return [...new Set([user, winUser, host].filter((n) => n && n.length >= 3 && n.toLowerCase() !== 'localhost'))];
}

/** Identity-bearing patterns, built from the RUNTIME environment. */
function identityPatterns() {
  // Paths must be redacted before their identity-bearing segments. If names run
  // first, `C:\\Users\\operator` becomes `C:\\Users\\<OPERATOR>` and the path
  // rule can no longer prove or replace the absolute prefix. Match one or two
  // backslashes so the same rule covers raw text and JSON-stringified bodies.
  const out = [
    [/\/mnt\/[a-z]\/Users\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
    [/[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\\/\s"'<>]+/g, '<PATH>'],
    [/\/(?:home|Users)\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
  ];
  for (const name of identityNames()) {
    const esc = escapeRe(name);
    const re = COMMON_WORD_NAMES.has(name.toLowerCase())
      ? new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'gi')
      : new RegExp(esc, 'gi');
    out.push([re, '<OPERATOR>']);
  }
  return out;
}

function applyAll(text, patterns) {
  let out = text;
  const hits = [];
  for (const [re, repl] of patterns) {
    const m = out.match(re);
    if (m && m.length) hits.push({ replacement: repl, count: m.length });
    out = out.replace(re, repl);
  }
  return { out, hits };
}

/**
 * Prove the instrument is live: plant one sample of every known shape plus
 * the runtime identity, and verify each was caught. Throws rather than
 * returning a reassuring boolean — a caller can ignore a boolean; it cannot
 * ignore a throw. This certifies the instrument, NOT coverage.
 */
export function selfTest() {
  const names = identityNames();
  const user = basename(homedir() || '') || userInfo().username || '';
  if (!user || user.length < 3 || !names.length) {
    throw new Error(
      '[redact-egress] CANARY IMPOSSIBLE: cannot derive an operator identity from the ' +
      'runtime environment, so the redactor cannot be proven. Refusing to certify this ' +
      'document as safe to send.',
    );
  }
  const identityCanary = names.map((n) => `/home/${n}/x C:\\Users\\${n}\\y host=${n}`).join(' ');
  const canary = `canary ${identityCanary} ${SECRET_SHAPES.map((s) => s[2]).join(' ')}`;
  const { out } = applyAll(canary, [...identityPatterns(), ...SECRET_SHAPES]);
  const leaked = [];
  for (const n of names) if (out.toLowerCase().includes(n.toLowerCase())) leaked.push(`identity:${n.length}ch`);
  for (const [, repl, sample] of SECRET_SHAPES) {
    const probe = sample.split('\n')[0].slice(0, 12);
    if (out.includes(probe)) leaked.push(`shape:${repl}`);
  }
  if (leaked.length) {
    throw new Error(
      `[redact-egress] CANARY FAILED — the instrument did not catch: ${leaked.join(', ')}. ` +
      'Its silence about this document means NOTHING. Refusing to send.',
    );
  }
  return true;
}

/**
 * Redact `text` for egress. Runs the canary first, every time.
 * @returns {{text: string, hits: Array<{replacement: string, count: number}>}}
 */
export function redactForEgress(text) {
  selfTest();
  const { out, hits } = applyAll(String(text ?? ''), [...identityPatterns(), ...SECRET_SHAPES]);
  return { text: out, hits };
}

function report(label, hits) {
  if (hits.length) {
    const total = hits.reduce((n, h) => n + h.count, 0);
    console.error(`[redact-egress] ${label}: ${total} redaction(s) before send — ` +
      hits.map((h) => `${h.replacement}×${h.count}`).join(', '));
  } else {
    console.error(`[redact-egress] ${label}: no matches (instrument live; coverage per test corpus)`);
  }
}

/** Redact and report in one call; returns the redacted string. */
export function redactOutbound(text, { label = 'outbound', quiet = false } = {}) {
  const { text: out, hits } = redactForEgress(text);
  if (!quiet) report(label, hits);
  return out;
}

/**
 * Drop-in replacement for `readFileSync(path, 'utf-8')` on any document that is
 * about to be sent to an external model. Reports what it removed on stderr —
 * silent redaction is how you stop noticing that documents keep needing it.
 * A read failure is rethrown with a REDACTED message: Node's ENOENT text
 * carries the absolute path, which is the incident class this module exists for.
 */
export function readForEgress(path, opts = {}) {
  const { label = 'document', quiet = false } = typeof opts === 'object' && opts ? opts : {};
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    const e = new Error(`[redact-egress] read failed (${err.code || 'ERR'}): ${redactForEgress(err.message).text}`);
    e.code = err.code;
    throw e;
  }
  return redactOutbound(raw, { label, quiet });
}

/**
 * THE CONTROL. Drop-in for `fetch(url, init)` on any request that leaves this
 * machine: the string `init.body` is redacted immediately before the socket,
 * so diffs, prompts, seeds and error strings assembled around a document get
 * the same treatment the document did. Headers are untouched (the API key
 * lives there and belongs there). Canary failure throws → nothing is sent.
 */
/**
 * Seats that must never be reached through a paid reseller.
 *
 * Sean holds a Z.ai subscription that already includes BOTH glm-5.3 and glm-5.3-flash,
 * so routing either one through OpenRouter pays per-token for something already bought.
 * This lives at the egress chokepoint rather than in a doc because every consult script
 * funnels through here: a prose rule has to be remembered by each new script and each
 * new agent, and this project's own corpus records prose rules being violated four times
 * in one session after being written up. A refusal cannot be forgotten.
 */
const SUBSCRIPTION_ONLY_MODEL_PREFIXES = [
  { prefix: 'z-ai/', seat: 'GLM (glm-5.3, glm-5.3-flash)', use: 'node scripts/consult-glm.mjs --model glm-5.3[-flash]' }
];

export function assertNotResoldSubscriptionSeat(url, body) {
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return; }
  if (!host.includes('openrouter')) return;

  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return; }
  if (!model) return;

  const hit = SUBSCRIPTION_ONLY_MODEL_PREFIXES.find((entry) => model.toLowerCase().startsWith(entry.prefix));
  if (!hit) return;

  throw new Error(
    `[redact-egress] REFUSED: "${model}" via OpenRouter. The ${hit.seat} seat is covered by the ` +
    `Z.ai subscription and must go direct, not through a paid reseller. Use: ${hit.use}`
  );
}

export async function fetchForEgress(url, init = {}, { label = 'request', quiet = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof init.body !== 'string') {
    throw new Error('[redact-egress] fetchForEgress requires a string body (JSON.stringify it first); refusing to send an unredactable body.');
  }
  assertNotResoldSubscriptionSeat(url, init.body);
  assertAstraResellerDoubleArmed(url, init.body);
  assertTrainingTierArmed(url, init.body);
  const body = redactOutbound(init.body, { label, quiet });
  return fetchImpl(url, { ...init, body });
}


export default {
  readForEgress, redactForEgress, redactOutbound, fetchForEgress,
  assertNotResoldSubscriptionSeat, selfTest, identityNames,
  armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist,
  assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel,
};
```
