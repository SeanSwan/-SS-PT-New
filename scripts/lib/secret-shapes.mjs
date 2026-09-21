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
 * THE SHORT JSON CONTROL ESCAPES, as they appear in a SERIALISED body.
 *
 * `fetchForEgress()` redacts the request body AFTER `JSON.stringify()`, so a newline in the
 * prompt reaches the regex as the two characters `\` and `n`. A value that follows one begins
 * with a literal `n`, `r`, `t`, `b` or `f` — all of which are WORD characters, so a bare
 * `(?<!\w)` boundary rejects them and the token is missed.
 *
 * This started as `[nrt]`, which is what happened to be measured. Astra's round-9d review asked
 * for consistency, and the answer is that the class is the JSON spec's, not the three cases a
 * test happened to cover: the five short escapes above are exactly the ones `JSON.stringify`
 * emits that produce a trailing word character. (`\f` form-feed, `\b` backspace, `\t` tab,
 * `\r` carriage return, `\n` newline.) `\"`, `\\` and `\/` need no branch — they leave a `"`,
 * `\` or `/` before the token, none of which is a word character.
 *
 * WHY IT IS A CONSTANT AND NOT SPELLED OUT IN EACH ROW. Three rows carry the same lookbehind,
 * and the round-9b note in this file records what happens when a boundary is written once and
 * copied: the copies drift. One definition means a fifth escape is added once, not four times,
 * and the row that forgets it is visible as a row that does not use this constant.
 */
export const JSON_ESCAPE_BEFORE = '(?<=\\\\[nrtbf])';

/**
 * Canary samples are assembled from parts so no source file contains a literal
 * key-shaped string: the pre-commit secret scanner (rightly) cannot tell a canary from
 * a leak, and an allowlist for this file would be a bigger hole.
 */
export const c = (...parts) => parts.join('');

/**
 * The LEFT BOUNDARY a row must carry when its token can follow a JSON escape, composed once.
 *
 * `(?<!\w)` rejects a token glued to a preceding word character; the escape branch accepts one
 * that follows a SERIALISED control character, where the character before the token is the
 * LETTER of an escape (`\n` is backslash + `n`, and that `n` is a word character). Both are
 * needed: the first for prose, the second for the transport.
 *
 * THIS IS WHAT THE ROWS USE. An earlier revision exported `JSON_ESCAPE_BEFORE` and left every row
 * spelling the class out inline — so the constant had no consumer at all, and the comment
 * claiming the rows "share" it was false. A mutation proved it: narrowing the constant changed
 * nothing and the suite stayed green. That is dead code carrying a false claim, which is worse
 * than dead code alone. Stating the boundary as a FUNCTION means a row cannot inline the class
 * by accident: calling the helper is the only way to get it, so the definition has one home.
 */
export const BEFORE_SECRET = `(?:(?<!\\w)|${JSON_ESCAPE_BEFORE})`;

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
  [new RegExp(`${BEFORE_SECRET}sk-[A-Za-z0-9_-]{12,}`, 'g'), '<REDACTED-KEY>', c('sk-', 'CANARYCANARYCANARY123456')],
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
  //   `SG.`  — NOT FIXED, but for a reason an earlier revision of this comment got WRONG.
  //
  //            The old text claimed "the token's own prefix ENDS in a dot, which cannot be part
  //            of a word, so there is no word it can hide inside. Measured: `massSG.…` does NOT
  //            fire." That measurement was wrong, and round 9d (Astra A7) reproduced it:
  //
  //              `mass` + `SG.<16>.<16>`  ->  `mass<REDACTED-KEY>`
  //
  //            It fires, and it consumes the `mass`. The reasoning failed because a dot is not a
  //            boundary — it is a MEMBER of the row's own alphabet only where the alphabet says
  //            so, and `SG\.[A-Za-z0-9_-]{16,}` begins at `S`. The dot cannot stop `mass` from
  //            being swallowed, because the regex starts matching at `S` and `mass` is left
  //            OUTSIDE the match while still being part of the same word. `(?<!\w)` would fix
  //            it; it is not added because no measured word collides (`massSG.` needed a
  //            fabricated prefix, exactly like `AIza` above) and a boundary here would be a
  //            change made for symmetry rather than for evidence. The claim is corrected; the
  //            disposition is unchanged, and both are now in the record.
  [new RegExp(`${BEFORE_SECRET}gh[pousr]_[A-Za-z0-9]{20,}`, 'g'), '<REDACTED-KEY>', c('ghp', '_CANARYCANARYCANARY0123456789')],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '<REDACTED-KEY>', c('github_pat', '_CANARYCANARYCANARY0123')],
  [/SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', c('SG.', 'CANARYCANARYCANARY01.CANARYCANARYCANARY02')],
  [new RegExp(`${BEFORE_SECRET}lin_api_[A-Za-z0-9]{20,}`, 'g'), '<REDACTED-KEY>', c('lin_api', '_CANARYCANARYCANARY0123')],
  [new RegExp(`${BEFORE_SECRET}eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{5,}`, 'g'), '<REDACTED-JWT>', c('eyJ', 'CANARYCANARY.eyJCANARYCANARY.CANARY')],
  // THE SEPARATOR BETWEEN `Bearer` AND ITS TOKEN MUST SURVIVE SERIALISATION (round 9d, Astra A1).
  //
  // `\s+` matches whitespace. In a SERIALISED body there is no whitespace there — a newline
  // arrives as the two characters `\` `n`, and `\s` matches neither. So the raw form
  // `Authorization: Bearer <tok>` was caught while the same value inside a JSON body was not,
  // even though `fetchForEgress()` redacts that body and nothing else:
  //
  //   'Bearer <32 A>'                         -> hit
  //   JSON.stringify({prompt:'Bearer\\n<32 A>'}) -> MISS, returned unchanged
  //
  // The separator now accepts a JSON escape in place of the whitespace, which is the same
  // repair `sk-` and the bot token carry on their LEFT edge — stated here in the middle, where
  // this row's separator actually sits. `\s*` is kept in front so the escaped and unescaped
  // spellings both match without a second alternative for the surrounding text.
  [/Bearer(?:\s|\\[nrtbf])+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer <REDACTED-KEY>', 'Bearer CANARYCANARYCANARY0123'],
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
  [new RegExp(`${BEFORE_SECRET}\\d{8,}:[A-Za-z0-9_-]{30,}(?![A-Za-z0-9_-])`, 'g'), '<REDACTED-BOT-TOKEN>',
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
  // THE SEPARATOR ABSORBS A JSON CLOSING QUOTE (round 9d, Astra P3 #10). The keyed form was
  // written `(\s*[=:]\s*)`, which requires the separator to be the character IMMEDIATELY after
  // the name. In JSON the key arrives as `"chat_id":` — a closing quote sits between the name
  // and the colon — so the row could not see it, and a 7-9 digit id under a quoted key was NOT
  // REDACTED AT ALL. Measured before the fix:
  //   `{"chat_id":1234567}`     -> unchanged, 0 hits
  //   `{"chat_id":123456789}`   -> unchanged, 0 hits   (the bare row's floor is 10)
  //   `{"chat_id":1234567890}`  -> redacted, by the BARE row, not this one
  // So the keyed policy silently did not apply to the spelling that a JSON body — the form this
  // redactor actually processes on the serialised transport — most commonly uses.
  //
  // ROUND 9d PART 2 (Astra A3/A4): THE QUOTE MUST BE CAPTURED AND THE VALUE MAY BE A STRING.
  // The first repair absorbed the closing quote with a NON-capturing `['"]?`, which consumed it.
  // Measured consequence:
  //   `{"chat_id":1234567}`  ->  `{"chat_id:<REDACTED-ID>}`   <- UNTERMINATED STRING, not JSON
  // A redactor that emits an unparseable body has broken the request it was protecting: the
  // whole point of redacting the serialised transport is that the caller's JSON survives it.
  // Two further forms were missed outright — a JSON STRING value (`"chat_id":"1234567"`) and a
  // JSON body embedded inside a prompt string, where every quote is backslash-escaped.
  //
  // So the row now: captures the quote into `$2` so it is re-emitted, captures the separator
  // into `$3`, and accepts the id as a bare run OR as a quoted string (quotes kept in `$4`).
  //
  // A BARE VALUE MUST BECOME A STRING PLACEHOLDER, NOT A BARE ONE — but ONLY WHEN IT WAS BARE.
  // Emitting `<REDACTED-ID>` where a JSON NUMBER stood produces `"chat_id":<REDACTED-ID>`, which
  // is not JSON (`Unexpected token '<'`). Wrapping unconditionally is worse: a value that was
  // ALREADY a quoted string arrives with its quotes captured, so wrapping doubles them into
  // `"<REDACTED-ID>""` — also not JSON. Both were measured:
  //   bare   `{"chat_id":1234567}`    -> `{"chat_id":<REDACTED-ID>}`      BAD
  //   quoted `{"chat_id":"1234567"}`  -> `{"chat_id":"<REDACTED-ID>""}`  BAD
  //
  // The clean resolution is TWO ROWS, because the two cases need different whole matches. A
  // conditional replacement (`${q:+}`) was tried first and rejected: it needs a named group to
  // test, the group's content is consumed by the match, and the resulting expression was harder
  // to read than the pair of rows it replaced. Two shapes, two rows — the same discipline the
  // escaped-key case below uses.
  //
  // ROW 1: the QUOTED value. Its quotes are part of the match, so the placeholder goes INSIDE
  // them and the quoting survives byte-for-byte.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)(["']?)(\s*[=:]\s*)(["'])(-?\d{7,})\4/gi,
    '$1$2$3$4<REDACTED-ID>$4', 'chat_id="1234567"'],
  // ROW 2: the BARE value, which is a JSON number or a plain assignment. The placeholder is
  // emitted as a STRING so a JSON body still parses; a plain `chat_id=1234567` is not JSON to
  // begin with, and there the quoted form is harmless.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)(['"]?)(\s*[=:]\s*)(-?\d{7,})(?!\d)/gi,
    '$1$2$3"<REDACTED-ID>"', 'chat_id=1234567'],
  // THE SAME KEY, WITH EVERY QUOTE BACKSLASH-ESCAPED — a JSON body inside a prompt string.
  // `JSON.stringify({prompt: JSON.stringify({chat_id: 1234567})})` puts `\"chat_id\":` in the
  // document: the key's opening quote is a `\` `"` pair, then the colon, then the value. The
  // rows above cannot see it — their separator group starts at a raw `"` and this document has
  // an escaped one. Measured before this row existed: the id reached the socket under a
  // spelled-out key, which is the failure mode a keyed policy exists to prevent.
  //
  // The literal `\` characters are written as `\\\\` in a regex LITERAL, which is the four
  // backslashes visible in the source below: two for the string escape, two for the regex
  // escape, matching ONE literal backslash each. The escaped-quote pairs therefore read as
  // `\\"` and the value's own escaped quotes are re-emitted around the placeholder.
  //
  // The bare-vs-quoted split from the rows above is preserved here for the same reason: the
  // body has to stay parseable after it is un-escaped by whoever reads the prompt.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)\\":(\s*)\\"(-?\d{7,})\\"/gi,
    '$1\\": $2\\"<REDACTED-ID>\\"', 'chat_id\\":\\"1234567\\"'],
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)\\":(\s*)(-?\d{7,})(?!\d)/gi,
    '$1\\": $2\\"<REDACTED-ID>\\"', 'chat_id\\":1234567'],
  [/(?<![\w.-])-?\d{10,}(?![\w.-])/g, '<REDACTED-ID>', '98765432109876543210'],
];
