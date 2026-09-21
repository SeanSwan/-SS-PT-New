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
