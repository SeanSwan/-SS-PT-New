#!/usr/bin/env node
/**
 * secret-read-gate.mjs — PreToolUse gate for CLAUDE.md Rule 59.
 *
 * WHY
 * ---
 * Rule 59 exists because of a real incident (2026-05-04): a `Grep` with
 * `output_mode: "content"` against `.env` surfaced the live OPENROUTER_API_KEY into
 * chat while diagnosing why a script could not load it. Rule 44 already covered
 * WRITES; nothing covered READS.
 *
 * privacy-boundary-gate is fail-closed on what leaves in artifacts and commits. The
 * read path has stayed open for three months, and it is the cheaper leak: a value in
 * chat is copied into transcripts, history, and any replay or memory feature, so the
 * blast radius is larger than the file it came from and cannot be recalled.
 *
 * WHAT IT BLOCKS — only value-surfacing reads, never existence checks
 * -------------------------------------------------------------------
 * Rule 59 names presence-only substitutes as the correct workflow, so this gate is
 * built around that distinction rather than around the filename alone:
 *   BLOCKED   Grep output_mode "content" (or -A/-B/-C context) on a secret-bearing path
 *   BLOCKED   Read of a secret-bearing file
 *   BLOCKED   cat/head/tail/less/strings/awk/sed/grep piping such a file to stdout
 *   BLOCKED   echo $SECRET, printenv SECRET, bare `env` or `set`, and PID environ dumps
 *   ALLOWED   Grep output_mode "files_with_matches" or "count"
 *   ALLOWED   `grep -c`, `test -n`, `${#VAR}` — presence and length, not value
 *   ALLOWED   loading a value INTO a process: `export K=$(grep ...)` with no echo
 *
 * That last allowance matters: Rule 59 explicitly endorses it, and a gate that blocked
 * it would push agents toward `--no-verify`-shaped workarounds for legitimate work.
 *
 * FAIL-OPEN, deliberately
 * -----------------------
 * A thrown bug here must not block every Read and Grep in the session. It announces
 * the failure instead of exiting silently — an unchecked read that LOOKS checked is
 * the reports-green-while-doing-nothing class this system exists to kill.
 *
 * Contract: stdin = { tool_name, tool_input }. stdout = {decision,reason} or silence.
 */
import { readFileSync } from 'node:fs';
import { runGate, FAIL_OPEN } from './lib/gate-run.mjs';

/** Presumed to hold secrets regardless of contents (Rule 59's own list). */
// Anchored on TOKEN boundaries, not ^/$. The first version used `(^|[\/])\.env(\.|$)`,
// which silently failed on the two shapes that matter most: `cat .env` (preceded by a
// space, not a slash) and a Grep whose path and glob were joined with a space (so `$`
// never matched). Both read as ALLOW - a gate reporting green on the exact 2026-05-04
// incident it was written for. Boundaries below accept whitespace, quotes, =, :, ( and
// path separators on either side.
const B = String.raw`(?:^|[\s\/=:'"(,])`;
const E = String.raw`(?:$|[\s'")\,;|&])`;
const SECRET_PATH = new RegExp([
  B + String.raw`\.env(?:\.[\w.-]+)?` + E,
  B + String.raw`secrets?\.[\w]+` + E,
  B + String.raw`credentials(?:\.[\w]+)?` + E,
  String.raw`\.(?:secret|secrets|pem|key|p12|pfx|jks)(?=$|[\s'")\,;|&])`,
  String.raw`(?:^|[\s\/=:'"(,])id_(?:rsa|ed25519|ecdsa|dsa)`,
  String.raw`[\/]\.ssh[\/]`,
  String.raw`[\/]\.aws[\/]credentials`,
  String.raw`[\/](?:keys|credentials)[\/]`,
  String.raw`[\/]proc[\/][^\/\s]+[\/]environ`,
].join('|'), 'i');

/** Placeholder env files. They are COMMITTED, hold variable NAMES not values, and are
 *  the file an agent should read to learn what a service needs. Blocking them would be a
 *  pure false positive on the most-legitimately-read env file, and false positives are
 *  what get a gate switched off (Rule 34). Checked BEFORE SECRET_PATH so `.env.example`
 *  does not fall into the `.env.*` presumption. */
const PLACEHOLDER_ENV = /\.env\.(?:example|sample|template|dist|defaults?)(?:$|[\s'")\,;|&])/i;

/** Commands that print file contents to stdout. */
const DUMPERS = /\b(cat|bat|head|tail|less|more|strings|xxd|od|nl|tac|awk|sed|rg|grep|type)\b/i;

/** Env-dumping shapes that surface values with no file involved. */
const ENV_DUMPS = [
  { re: /\bprintenv\b(?!\s*\|\s*(wc|grep\s+-c))/i, what: '`printenv` prints values' },
  { re: /(^|[;&|]\s*)env\s*(\||$|;|&)/i, what: 'bare `env` dumps every value' },
  { re: /(^|[;&|]\s*)set\s*(\||$|;|&)/i, what: 'bare `set` dumps every shell variable' },
  { re: /\becho\s+["']?\$\{?[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|DATABASE_URL|DSN)[A-Z0-9_]*\}?/i,
    what: '`echo $VAR` on a secret-shaped variable name prints the value' },
];

/** Presence/length-only forms Rule 59 endorses — these must never be blocked. */
function isPresenceOnly(cmd) {
  if (/\bgrep\b[^|;&]*\s-[a-z]*c\b/i.test(cmd)) return true;          // grep -c
  if (/\bwc\s+-[lc]\b/.test(cmd) && /\|/.test(cmd)) return true;      // ... | wc -l
  if (/\$\{#[A-Za-z_][A-Za-z0-9_]*\}/.test(cmd)) return true;         // ${#VAR}
  if (/\btest\s+-[nz]\b|\[\s+-[nz]\s+/.test(cmd)) return true;        // test -n "$VAR"
  // Rule 59 gives this awk form as a CORRECT substitute, so blocking it would make the
  // gate an obstacle on the very workflow it recommends. Allowed only when the field is
  // consumed by length() and never printed bare: `print $2, length($2)` still leaks.
  if (/\blength\s*\(\s*\$\d/.test(cmd) && !/\bprint\s+\$\d/.test(cmd)) return true;
  // Loading a value into the environment without echoing it (Rule 59's example).
  if (/\bexport\s+[A-Z0-9_]+=\$\(/i.test(cmd) && !/\becho\b|\bset\s+-x\b/.test(cmd)) return true;
  return false;
}

/** @returns {string|null} block reason, or null to allow. */
export function decide(hookInput) {
  const tool = hookInput?.tool_name || '';
  const input = hookInput?.tool_input || {};

  if (tool === 'Grep') {
    // Tested separately: joining them with a space broke the end-boundary on `.env`.
    const targets = [input.path, input.glob].filter(Boolean).map(String);
    if (!targets.some((t) => SECRET_PATH.test(t) && !PLACEHOLDER_ENV.test(t))) return null;
    const mode = String(input.output_mode ?? 'files_with_matches');
    const hasContext = input['-A'] != null || input['-B'] != null || input['-C'] != null || input.context != null;
    if (mode === 'content' || hasContext) {
      return reason('Grep', `output_mode "${mode}"${hasContext ? ' with context flags' : ''} on ${input.path ?? input.glob}`,
        'Use output_mode "files_with_matches" (does it contain the pattern?) or "count" (how many?).');
    }
    return null;
  }

  if (tool === 'Read') {
    const p = String(input.file_path ?? '');
    if (!SECRET_PATH.test(p) || PLACEHOLDER_ENV.test(p)) return null;
    return reason('Read', `whole-file read of ${p}`,
      'Use Grep with output_mode "count" to confirm a key is present, or have the script load it from process.env itself.');
  }

  if (tool === 'Bash') {
    const cmd = String(input.command ?? '');
    if (!cmd) return null;
    if (isPresenceOnly(cmd)) return null;

    for (const d of ENV_DUMPS) {
      if (d.re.test(cmd)) {
        return reason('Bash', d.what,
          'Check presence and length instead: `[ -n "$VAR" ] && echo "set, ${#VAR} chars"`.');
      }
    }
    // A dumper pointed at a secret-bearing path.
    if (SECRET_PATH.test(cmd) && !PLACEHOLDER_ENV.test(cmd) && DUMPERS.test(cmd)) {
      return reason('Bash', 'a content-printing command targets a secret-bearing file',
        'Count instead of print: `grep -c \'^KEY=\' .env`, or `awk -F= \'/^KEY=/{print "found, "length($2)" chars"}\' .env`.');
    }
    return null;
  }

  return null;
}

function reason(tool, what, alternative) {
  return [
    `BLOCKED by Rule 59 — this ${tool} call would surface a secret VALUE into chat.`,
    '',
    `  ${what}`,
    '',
    'Chat context is persistent: transcripts, history, and any replay or memory feature',
    'each become a new copy in a less-controlled place than the gitignored file it came',
    'from. That is why Rule 59 covers READS even though Rule 44 already covers writes.',
    '',
    `  Do this instead: ${alternative}`,
    '',
    'If a value genuinely leaks anyway, Rule 59 step 1 is STOP and tell Sean immediately',
    'with the secret class and source — then rotate. Do not re-quote the value.',
  ].join('\n');
}

function main() {
  let hookInput;
  try { hookInput = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const { payload } = runGate(
    { name: 'secret-read-gate', boundary: 'tool', mode: FAIL_OPEN },
    () => {
      const r = decide(hookInput);
      return r ? { block: true, reason: r } : { block: false };
    },
  );
  if (payload) process.stdout.write(JSON.stringify(payload));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
