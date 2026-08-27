#!/usr/bin/env node
/**
 * redact-tainted-docs.mjs — Rule-34 cleanup tool for operator identity in committed docs.
 * ==========================================================================================
 * DEFAULT IS READ-ONLY. `--check` (default) prints per-file hit counts and the shape
 * classes it WOULD rewrite. Nothing is written unless BOTH `--apply` and
 * `--approved-by-sean` are present (Rule 34: cleanup execution needs explicit approval).
 *
 * What it rewrites (proposal: TAINTED-DOCS-CLEANUP-PROPOSAL-2026-08-26.md §3):
 *   C:\Users\<user>\Desktop\quick-pt\SS-PT\...   → <REPO>/...      (any slash style, any case)
 *   C:\Users\<user>\...                          → <HOME>\...
 *   /mnt/c/Users/<user>/...                      → <HOME>/...
 *   /home/<user>/... , /Users/<user>/...         → <HOME>/...
 *   c--Users-<user>-Desktop-quick-pt-SS-PT       → <SCRATCH-KEY>    (Claude scratchpad key)
 *   Windows 8.3 short-form home dir              → <HOME>\...
 *   <user>@<host-or-ip>  (ssh login)             → <OPERATOR>@<host-or-ip>
 *   any remaining bare <user>                    → <OPERATOR>
 * Identity is derived at runtime (never hardcoded) — same discipline as redact-egress.mjs.
 * Emails, hostnames, LAN IPs are NOT touched here (separate classes, see proposal §5).
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename } from 'node:path';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply') && args.has('--approved-by-sean');
const scopeArg = [...args].find((a) => a.startsWith('--scope='));
const SCOPE = scopeArg ? scopeArg.slice(8) : 'docs/ai-workflow/AI-HANDOFF';

const user = basename(homedir());
if (!user || user.length < 3) { console.error('cannot derive operator identity; refusing'); process.exit(2); }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const U = esc(user);
// Windows 8.3 short-form home dir: six alphanumerics, tilde, digit. Matched by SHAPE,
// never by literal — writing the operator's actual short name here would make this
// cleanup tool one more file that has to be cleaned (it did, until 2026-08-26).
const SHORT = '[A-Za-z0-9]{6}~[0-9]';

/** Ordered: most specific first. [label, regex, replacement] */
const RULES = [
  ['repo-path', new RegExp(`[A-Za-z]:[\\\\/]+Users[\\\\/]+(?:${U}|${SHORT})[\\\\/]+Desktop[\\\\/]+quick-pt[\\\\/]+SS-PT`, 'gi'), '<REPO>'],
  ['repo-path-wsl', new RegExp(`/mnt/[a-z]/Users/${U}/Desktop/quick-pt/SS-PT`, 'gi'), '<REPO>'],
  ['scratch-key', new RegExp(`c--Users-${U}-Desktop-quick-pt-SS-PT`, 'gi'), '<SCRATCH-KEY>'],
  ['home-win', new RegExp(`[A-Za-z]:[\\\\/]+Users[\\\\/]+(?:${U}|${SHORT})`, 'gi'), '<HOME>'],
  ['home-wsl', new RegExp(`/mnt/[a-z]/Users/${U}`, 'gi'), '<HOME>'],
  ['home-posix', new RegExp(`/(?:home|Users)/${U}(?=[/\\s"'\`)\\]]|$)`, 'gi'), '<HOME>'],
  ['ssh-login', new RegExp(`\\b${U}@(?=[A-Za-z0-9.-])`, 'gi'), '<OPERATOR>@'],
  ['bare-name', new RegExp(U, 'gi'), '<OPERATOR>'],
];

/**
 * `git grep` exits 1 when it finds nothing, which execFileSync turns into a throw.
 * A clean scope is the SUCCESS case for this tool (it is how you verify a finished
 * cleanup), so an empty result must return [] rather than crash. Any other exit
 * code is a real failure and still throws.
 */
function gitGrepFiles(argv) {
  try {
    return execFileSync('git', ['grep', ...argv], { encoding: 'utf-8' }).split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    if (err.status === 1) return [];
    throw err;
  }
}

const files = gitGrepFiles(['-il', user, '--', SCOPE])
  // -E: SHORT is a shape, not a literal (see its definition above).
  .concat(gitGrepFiles(['-ilE', `Users[^A-Za-z0-9]+${SHORT}`, '--', SCOPE]))
  .filter((f, i, a) => a.indexOf(f) === i)
  .filter((f) => { try { return statSync(f).isFile(); } catch { return false; } });

const totals = {};
let changed = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf-8');
  let out = before;
  const perFile = [];
  for (const [label, re, repl] of RULES) {
    const n = (out.match(re) || []).length;
    if (n) { perFile.push(`${label}×${n}`); totals[label] = (totals[label] || 0) + n; out = out.replace(re, repl); }
  }
  const residual = new RegExp(`${U}|${SHORT}`, 'i').test(out);
  console.log(`${APPLY ? 'REWRITE' : 'would  '} ${f}  ${perFile.join(', ')}${residual ? '  ⚠ RESIDUAL' : ''}`);
  if (APPLY && out !== before) { writeFileSync(f, out, 'utf-8'); changed++; }
}
console.log(`\n${files.length} file(s) in ${SCOPE}; shape totals: ${JSON.stringify(totals)}`);
console.log(APPLY ? `APPLIED — ${changed} file(s) rewritten. Verify: git grep -il <user> -- ${SCOPE} | wc -l  → expect 0`
  : 'DRY RUN — nothing written. Phase 2 requires: --apply --approved-by-sean');
