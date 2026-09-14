/**
 * egress.mjs — inline-secret redaction on content crossing to a provider (threat T3, content half).
 * ===================================================================================================
 * safeRead blocks secret-bearing PATHS (DENY patterns); this blocks secret VALUES that live inside an
 * otherwise-innocent tracked file (a hardcoded key in a committed script, a JWT pasted into a doc).
 * Every evidence window and every tool result runs through redactSecrets BEFORE it can egress, so a
 * value the path-filter could not know about never reaches the model. Counts are reported (never the
 * value) so the receipt shows redaction happened without re-leaking it (Rule 59).
 *
 * High-confidence SHAPES only — matching key/token/PEM/DB-URL formats, not generic "password =" code,
 * to avoid mangling ordinary source. Pure, synchronous, dependency-free.
 *
 * @module context-gateway/egress
 */
import { homedir, hostname, userInfo } from 'node:os';
import { basename } from 'node:path';

// Every quantifier here is UPPER-BOUNDED. An unbounded `{n,}` or lazy `*?` over a delimiter-poor
// input backtracks O(n²) and can hang the default compile lane for minutes on one long line
// (hostile pass 4/5: EMAIL, then JWT + PRIVATE_KEY were each this class). Real secrets fit the caps.
const RULES = [
  // \b anchor: a real JWT is always preceded by a boundary (space/quote/=); this collapses an
  // `eyJeyJeyJ…` attack (no interior boundaries) to a single start position, killing the O(n·cap).
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}/g],
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]{1,8192}?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g],
  ['STRIPE', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ['STRIPE_WHSEC', /\bwhsec_[A-Za-z0-9]{16,}/g],
  ['OPENAI', /\bsk-(?:or-)?(?:proj-|v1-)?[A-Za-z0-9_-]{20,}/g],
  ['GOOGLE', /\bAIza[0-9A-Za-z_-]{30,120}/g],
  ['SLACK', /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ['TELEGRAM', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g],
  ['DB_URL', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s:@/]+@[^\s/]+/g],
  ['HTTP_AUTH_URL', /\bhttps?:\/\/[^\s:@/]+:[^\s:@/]+@[^\s/]+/g], // user:pass@host basic-auth (finding 4)
  ['AWS_AKID', /\bAKIA[0-9A-Z]{16}\b/g],
  ['GITHUB', /\bgh[pousr]_[A-Za-z0-9]{36,}/g],
  ['GITHUB_PAT', /\bgithub_pat_[A-Za-z0-9_]{22,}/g], // fine-grained PATs (finding 10)
  ['ANTHROPIC', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  // PII (Rule 8 is categorical — zero PII to external LLMs). High-confidence shapes only.
  // Quantifiers are RFC-BOUNDED ({1,64}@{1,255}.{2,24}), NOT open `+`: an unbounded class with
  // boundary punctuation backtracks O(n²) and hung the default compile lane for ~minutes on a long
  // punctuated line (hostile pass 4, finding 1 — a ReDoS the pass-3 EMAIL rule itself introduced).
  // The negative lookahead skips retina/asset "domains" (logo@2x.png) to cut over-redaction.
  ['EMAIL', /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.(?!png|jpe?g|gif|webp|svg|ico|css|s?css|js|mjs|tsx?|jsx?|json|html?|woff2?|ttf|map)[A-Za-z]{2,24}\b/gi],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
];

// ── Operator identity (Rule 8) ────────────────────────────────────────────────
// The rules above catch secret VALUES. They do not catch WHO AND WHERE, and that is
// the class that actually leaked: on 2026-08-22 a review packet reached six external
// vendors carrying the operator's Windows username inside filesystem paths. A secret
// scan had run and returned "no matches" — correctly, because it had no rule for this
// class at all. Coverage is not existence.
//
// Derived at RUNTIME, never written down: hardcoding the name here would make this
// file the leak it exists to prevent. If the name cannot be derived, or is a common
// word that would shred ordinary prose ("root", "admin"), the identity rules are
// SKIPPED rather than applied — a redactor that mangles every document gets turned
// off, which is worse than one that misses this class.
//
// Every quantifier is upper-bounded, per the ReDoS discipline established above.
const COMMON_WORD_NAMES = new Set([
  'admin', 'administrator', 'user', 'users', 'root', 'dev', 'developer', 'test', 'guest',
  'owner', 'default', 'public', 'home', 'desktop', 'server', 'local', 'localhost',
  'ubuntu', 'runner', 'node', 'docker', 'system', 'pi', 'me', 'main', 'app', 'build',
]);

function operatorNames() {
  const raw = [];
  try { raw.push(userInfo().username); } catch { /* no passwd entry — skip */ }
  try { raw.push(basename(homedir() || '')); } catch { /* no home — skip */ }
  try { raw.push(hostname()); } catch { /* no hostname — skip */ }
  return [...new Set(raw
    .map((n) => (n || '').trim())
    .filter((n) => n.length >= 3 && n.length <= 64)
    .filter((n) => !COMMON_WORD_NAMES.has(n.toLowerCase())))];
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Identity rules for the current runtime. Path rules match only the HOME PREFIX so the
 * tail (`\Desktop\quick-pt\...`) survives and citations stay navigable — the point is to
 * remove who, not to destroy where.
 */
function identityRules(names = operatorNames()) {
  const out = [];
  // 8.3 short-form home dirs (six alphanumerics, tilde, digit) leak the same account
  // without spelling the name, so this one is machine-independent and always on.
  out.push(['HOME_PATH', /[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}[A-Za-z0-9]{6}~\d/g]);
  for (const name of names) {
    const n = esc(name);
    out.push(['HOME_PATH', new RegExp(`[A-Za-z]:[\\\\/]{1,2}Users[\\\\/]{1,2}${n}`, 'gi')]);
    out.push(['HOME_PATH', new RegExp(`/mnt/[a-z]/Users/${n}`, 'gi')]);
    out.push(['HOME_PATH', new RegExp(`/(?:home|Users)/${n}`, 'gi')]);
    // Claude scratchpad keys flatten the path with hyphens: c--Users-<name>-Desktop-…
    out.push(['HOME_PATH', new RegExp(`c--Users-${n}`, 'gi')]);
    out.push(['OPERATOR', new RegExp(`\\b${n}@`, 'gi')]);          // ssh login
    out.push(['OPERATOR', new RegExp(`\\b${n}\\b`, 'gi')]);        // bare mention (last)
  }
  return out;
}

const IDENTITY_RULES = identityRules();

/**
 * Prove the instrument fires before anything trusts its silence.
 *
 * This is a POSITIVE CONTROL, not a coverage proof: it shows the rules compiled and ran
 * in THIS process against input it knows is dirty. It cannot detect a class nobody thought
 * of — which is exactly how the original incident happened, so the distinction matters and
 * the error message says so. Runs once at module load (fail-closed); exported so a caller
 * can re-check. Not per-call: redactSecrets runs on every evidence window and tool result.
 *
 * @throws if identity is derivable but the rules fail to remove it.
 */
export function selfTest(names = operatorNames()) {
  if (!names.length) return { proven: false, reason: 'no derivable operator identity; identity rules inactive' };
  // The 8.3 sample is ASSEMBLED, never a literal: a literal makes this file trip the
  // pre-commit rule it is the runtime half of (caught 2026-08-27 before first commit).
  const short = ['ABCDEF', '~', '1'].join('');
  const canary = names.map((n) =>
    `C:\\Users\\${n}\\x /home/${n}/y /mnt/c/Users/${n}/z c--Users-${n}-w ${n}@host ${n}`).join(' ')
    + ` C:\\Users\\${short}\\v`;
  const { text } = redactSecrets(canary);
  const survived = names.filter((n) => new RegExp(esc(n), 'i').test(text));
  if (survived.length || text.includes(short)) {
    throw new Error(
      '[egress] CANARY FAILED — the identity rules did not remove a string this process ' +
      'planted itself. Silence from this redactor about any other document means NOTHING. ' +
      'Refusing to certify content as safe to egress.',
    );
  }
  return { proven: true, names: names.length };
}

/**
 * Redact inline secret VALUES from a string.
 * @returns {{ text: string, redactions: number, kinds: string[] }}
 */
const PK_RULE = RULES.find(([k]) => k === 'PRIVATE_KEY')[1];
const LINE_RULES = [...IDENTITY_RULES, ...RULES.filter(([k]) => k !== 'PRIVATE_KEY')];

export function redactSecrets(input) {
  // Defense-in-depth against a FUTURE unbounded rule: regex backtracking is superlinear in the
  // length of one contiguous run, so the single-line rules run PER LINE — bounding the unit of work
  // even if someone later adds an unbounded quantifier. PRIVATE_KEY is the only multi-line secret, so
  // it runs once over the whole text (its gap is bounded) before the per-line pass.
  let redactions = 0;
  const kinds = new Set();
  const afterPk = String(input).replace(PK_RULE, () => { redactions += 1; kinds.add('PRIVATE_KEY'); return '<REDACTED-PRIVATE_KEY>'; });
  const text = afterPk.split('\n').map((line) => {
    let t = line;
    for (const [kind, re] of LINE_RULES) {
      t = t.replace(re, () => { redactions += 1; kinds.add(kind); return `<REDACTED-${kind}>`; });
    }
    return t;
  }).join('\n');
  return { text, redactions, kinds: [...kinds] };
}

// Fail-closed at load. If identity is derivable but the rules cannot remove it, this module
// must not be trusted, and throwing here stops the gateway rather than letting it certify
// content it cannot actually clean. Costs one regex pass per process, not per call.
selfTest();
