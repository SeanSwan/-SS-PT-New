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
  [/sk_(live|test)_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('sk_', 'live_', 'CANARY0123456789')],
  [/rk_live_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('rk_', 'live_', 'CANARY0123456789')],
  [/whsec_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('whsec', '_CANARY0123456789')],
  [/xoxb-[A-Za-z0-9-]{8,}/g, '<REDACTED-KEY>', c('xoxb', '-CANARY-0123456789')],
  [/AIza[A-Za-z0-9_-]{20,}/g, '<REDACTED-KEY>', 'AIzaCANARYCANARYCANARY0123456789'],
  [/rnd_[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'rnd_CANARYCANARYCANARY0123'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'ghp_CANARYCANARYCANARY0123456789'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '<REDACTED-KEY>', 'github_pat_CANARYCANARYCANARY0123'],
  [/SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'SG.CANARYCANARYCANARY01.CANARYCANARYCANARY02'],
  [/lin_api_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'lin_api_CANARYCANARYCANARY0123'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>', 'eyJCANARYCANARY.eyJCANARYCANARY.CANARY'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer <REDACTED-KEY>', 'Bearer CANARYCANARYCANARY0123'],
  [/\b\d{8,}:[A-Za-z0-9_-]{30,}\b/g, '<REDACTED-BOT-TOKEN>', '12345678:CANARYCANARYCANARYCANARYCANARY01'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED-PEM>',
    '-----BEGIN PRIVATE KEY-----\nCANARY\n-----END PRIVATE KEY-----'],
  [/(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|amqps?):\/\/[^\s"'<>]+/gi, '<REDACTED-DB-URL>',
    c('postgresql:', '//canary:canary@canary.invalid:5432/canary')],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<REDACTED-EMAIL>', 'canary@canary.invalid'],
  [/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '<REDACTED-PHONE>', '(555) 000-0199'],
  // Rule 47 numeric IDs (Telegram chat_id etc): keyed at 7+ digits, bare only
  // at 10+ so all-digit 9-char commit SHAs and 20260826T… timestamps survive.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)(\s*[=:]\s*)-?\d{7,}\b/gi, '$1$2<REDACTED-ID>', 'chat_id=1234567'],
  [/(?<![\w.-])-?\d{10,}(?![\w.-])/g, '<REDACTED-ID>', '9876543210'],
];
