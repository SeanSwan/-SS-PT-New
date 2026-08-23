#!/usr/bin/env node
/**
 * egress-privacy-gate.mjs — PreToolUse(Bash) gate on what LEAVES the machine.
 * ===========================================================================
 * Sean's directive 2026-08-22: "I like that check that you did to make sure that
 * no private data or information was going out ... I really need that."
 *
 * The check he means: before sending a review packet to an external model, scan
 * the packet for secrets, PII, credentials, infrastructure names and absolute
 * user paths — and refuse to send if any are present.
 *
 * WHY A HOOK AND NOT A SKILL. Sean asked whether this should be a skill and
 * whether it is even needed, given how much protocol already exists. It should
 * not be a skill, and the reason is the same one written on spend-guard-gate:
 *
 *     a rule the model must REMEMBER is a rule that will eventually be skipped.
 *
 * A skill has to be loaded. The failure mode here is not ignorance — Rules 8,
 * 44 and 59 already say zero PII to LLMs — it is forgetting to look on the one
 * call that mattered. A skill inherits that exact failure mode. A hook does not.
 * So this adds ZERO new protocol for a human to carry: nothing to remember,
 * nothing to invoke. It either fires or it does not, and it fires every time.
 *
 * WHY IT IS NOT REDUNDANT with scan-secrets.sh. That script is excellent and is
 * reused here as layer 1 — but it is a script someone has to run. Rule 44 covers
 * writes, Rule 59 covers reads; NEITHER covers egress to a third party, which is
 * the moment data actually leaves Sean's control and cannot be recalled.
 *
 * STEALTH SEATS GET A STRICTER BAR. `stealth/*` listings (ox-alpha is the first)
 * are free BECAUSE an undisclosed lab retains and reads the prompts. Anything
 * sent there is gone permanently to a party we cannot name. Those calls get the
 * strict ruleset, including internal hostnames and repo-internal path shapes
 * that are merely untidy elsewhere.
 *
 * FAIL-CLOSED on detection, FAIL-OPEN on its own bugs. A privacy gate that
 * bricks the toolchain because of a regex mistake gets disabled within a day,
 * and a disabled gate protects nothing. It fails open loudly, so a broken gate
 * is visible rather than silent.
 */
import { readFileSync, existsSync } from 'node:fs';

const ALLOW = () => process.exit(0);

/**
 * Findings are (label, regex, tier). tier 'always' blocks on any outbound call;
 * tier 'strict' blocks only for retaining/stealth destinations.
 *
 * Patterns are written to match REAL values, not the pattern-source that
 * legitimately appears in de-identification code (which is frequently the very
 * thing under review). A diff containing `/[a-z]+@[a-z]+\.[a-z]{2,}/` must not
 * trip an email rule.
 */
const RULES = [
  // ── credentials and keys ────────────────────────────────────────────────
  ['OpenAI-style key',      /\bsk-[A-Za-z0-9]{20,}/g,                       'always'],
  ['Stripe live/test key',  /\b[rs]k_(live|test)_[A-Za-z0-9]{16,}/g,        'always'],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{16,}/g,                    'always'],
  ['Google API key',        /\bAIza[0-9A-Za-z_-]{30,}/g,                    'always'],
  ['Slack bot token',       /\bxox[baprs]-[0-9A-Za-z-]{10,}/g,              'always'],
  ['Telegram bot token',    /\b\d{8,10}:[A-Za-z0-9_-]{30,}/g,               'always'],
  ['JWT',                   /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'always'],
  ['GitHub token',          /\bgh[pousr]_[A-Za-z0-9]{20,}/g,                'always'],
  ['private key block',     /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,          'always'],
  ['DB connection URI',     /\b(postgres|postgresql|mysql|mongodb)(\+srv)?:\/\/[^\s:@/'"`]+:[^\s@'"`]+@/gi, 'always'],
  ['inline credential',     /\b(password|passwd|api[_-]?key|secret|access[_-]?token)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi, 'always'],

  // ── personal data ───────────────────────────────────────────────────────
  // Real addresses only: a known consumer TLD after a real domain. Pattern
  // SOURCE (character classes, quantifiers) will not match.
  ['email address',         /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.(com|net|org|io|co|edu|gov|ca|uk)\b/g, 'always'],
  ['US SSN',                /\b\d{3}-\d{2}-\d{4}\b/g,                       'always'],
  // The leading \b here used to make this rule DEAD. A word boundary before `(`
  // requires a word/non-word transition, and the char before an opening paren is
  // almost always a space or line start — non-word to non-word, so no boundary, so
  // no match, ever. `call (415) 555-1234` sailed through a gate that reported CLEAN.
  // It also only ever tried the parenthesized form, so `415-555-1234` was never
  // covered at all. Found 2026-08-23 by the first test ever written for this file.
  //
  // The non-parenthesized branch demands an explicit - or . separator rather than
  // allowing whitespace: `\d{3}\s\d{3}\s\d{4}` would match ordinary table numerics
  // like "100 200 3000", and a privacy gate that blocks metrics docs is a privacy
  // gate somebody deletes.
  ['phone number',          /(?:\+1[-.\s]?)?(?:\(\d{3}\)\s?|\b\d{3}[-.])\d{3}[-.]\d{4}\b/g, 'always'],

  // ── environment and infrastructure ──────────────────────────────────────
  ['absolute user path',    /\b[A-Z]:\\Users\\[A-Za-z0-9._-]+/g,            'always'],
  ['unix home path',        /\/(home|Users)\/[A-Za-z0-9._-]{2,}\//g,        'always'],
  ['deployed hostname',     /\b[a-z0-9-]+\.onrender\.com\b/g,               'strict'],
  ['private IP',            /\b(10|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g, 'strict'],
  ['internal env var dump', /\b[A-Z][A-Z0-9_]{6,}=(?!<)[^\s'"]{12,}/g,      'strict'],
];

/** Allowlisted false positives — placeholders that are meant to be visible. */
const BENIGN = [
  /REDACTED/i, /example\.com/i, /placeholder/i, /your-?email/i,
  /<[a-z-]+>/i, /noreply@/i, /\.\.\./,
];

const isBenign = (hit) => BENIGN.some((b) => b.test(hit));

/** Pull every file path this command will transmit. */
function outboundDocs(cmd) {
  const paths = [];
  for (const flag of ['--document', '--seed', '--file']) {
    const re = new RegExp(`${flag}\\s+("[^"]+"|'[^']+'|[^\\s]+)`, 'g');
    let m;
    while ((m = re.exec(cmd)) !== null) paths.push(m[1].replace(/^['"]|['"]$/g, ''));
  }
  return [...new Set(paths)];
}

/** True when the destination retains prompts under an undisclosed party. */
function isRetainingDestination(cmd) {
  return /stealth\//.test(cmd) || /\box\b/.test((cmd.match(/--seats\s+([^\s]+)/) || [])[1] || '');
}

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { ALLOW(); }

try {
  const payload = JSON.parse(raw || '{}');
  const cmd = payload?.tool_input?.command || '';

  // Only outbound model calls. Everything else is none of this gate's business.
  if (!/consult-[a-z0-9-]+\.mjs/.test(cmd)) ALLOW();
  if (/--dry-run/.test(cmd)) ALLOW();

  const docs = outboundDocs(cmd).filter((p) => existsSync(p));
  if (docs.length === 0) ALLOW();

  const strict = isRetainingDestination(cmd);
  const findings = [];

  for (const doc of docs) {
    let text = '';
    try { text = readFileSync(doc, 'utf8'); } catch { continue; }
    const lines = text.split(/\r?\n/);

    for (const [label, re, tier] of RULES) {
      if (tier === 'strict' && !strict) continue;
      lines.forEach((line, i) => {
        const matches = line.match(re);
        if (!matches) return;
        for (const hit of matches) {
          if (isBenign(hit)) continue;
          findings.push({
            doc, line: i + 1, label, tier,
            // Never echo the full value — show enough to locate, not to reuse.
            preview: hit.length > 12 ? `${hit.slice(0, 6)}…${hit.slice(-3)}` : hit,
          });
        }
      });
    }
  }

  if (findings.length === 0) {
    const bar = strict ? 'STRICT (retaining destination)' : 'standard';
    console.error(`[egress-privacy] scanned ${docs.length} outbound doc(s), ${bar} ruleset — CLEAN.`);
    ALLOW();
  }

  const shown = findings.slice(0, 15);
  const lines = [
    '',
    '  ╔════════════════════════════════════════════════════════════════════╗',
    '  ║  EGRESS BLOCKED — private data would have left this machine        ║',
    '  ╚════════════════════════════════════════════════════════════════════╝',
    '',
    `  Destination ruleset: ${strict ? 'STRICT — prompts are RETAINED by an undisclosed provider' : 'standard external model'}`,
    `  Findings: ${findings.length}`,
    '',
  ];
  for (const f of shown) {
    lines.push(`    ${f.doc}:${f.line}  ${f.label}  →  ${f.preview}`);
  }
  if (findings.length > shown.length) {
    lines.push(`    … and ${findings.length - shown.length} more`);
  }
  lines.push(
    '',
    '  This call was NOT sent. Nothing left the machine.',
    '',
    '  Data sent to an external model cannot be recalled. For a stealth/retaining',
    '  seat it is held by a party we cannot name. Fix the packet, do not bypass:',
    '',
    '    1. Remove or redact the values above from the outbound document.',
    '    2. Re-run the same command. A clean packet passes silently.',
    '',
    '  If a finding is a false positive (a regex pattern in reviewed code, a',
    '  placeholder), make it visibly benign — <redacted>, example.com — rather',
    '  than deleting the gate. Tell Sean what you changed and why.',
    '',
  );

  console.error(lines.join('\n'));
  process.exit(2); // non-zero blocks the tool call
} catch (err) {
  // Fail OPEN, loudly. A privacy gate that bricks the toolchain gets disabled,
  // and a disabled gate protects nothing. A broken gate must be visible.
  console.error(`[egress-privacy] gate error, failing open: ${err?.message}`);
  ALLOW();
}
