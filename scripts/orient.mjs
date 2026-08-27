#!/usr/bin/env node
/**
 * orient.mjs — v3. Renders and verifies the ORIENT block that opens substantive replies.
 * =====================================================================================
 * WHY (Sean, 2026-08-27): "I'm doing so many projects... I need a summary of what I asked,
 * what we were trying to do, and what it's done so far — so no matter what, I can look at ANY
 * tab and know exactly what we're doing... Then I have to deeply read everything."
 *
 * This replaces Rule 57's dual-tier summary, which could not satisfy that requirement: both of
 * its tiers described the DELTA at two altitudes and neither stated the INVARIANT. See
 * `scripts/lib/orient-contract.mjs` for the shape and the full reasoning.
 *
 * THE ONE IDEA STOLEN FROM `unlazy`: write the contract down and DERIVE the answer, because an
 * instruction is the first thing lost in a long session. Everything on the identity line is
 * computed. The model authors only judgement, and every authored field carries a mechanical
 * anchor rather than a hope.
 *
 * TWO LAYERS, so a missing file can never block a reply:
 *   1. DERIVED — repo, branch, HEAD sha, dirty state. Needs no ledger; cannot go stale.
 *   2. LEDGER — .ai-workflow/orientation/<PID>.yaml. ASK/WHY/step and the carried-copy hash.
 *      Absent => the block renders anyway, marked `no-ledger`, and says what to run.
 *
 * USAGE
 *   node scripts/orient.mjs                    render LIGHT (substantive turns)
 *   node scripts/orient.mjs --full             render FULL  (commit / phase change / recap)
 *   node scripts/orient.mjs --init --pid X --ask "..." --why "..." --step 3/7
 *   node scripts/orient.mjs --set now="..." next="..." done="..." proof="..."
 *   node scripts/orient.mjs --check <file>     verify an emitted block
 *   node scripts/orient.mjs --selftest
 *
 * EXIT: 0 ok · 2 bad usage · 3 stale · 4 malformed · 5 ledger inconsistent
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  parseOrient, validateShape, contentHash, LIGHT_FIELDS, FULL_FIELDS, BUDGET,
} from './lib/orient-contract.mjs';

const LEDGER_DIR = '.ai-workflow/orientation';
const BLOCKED_SENTINEL = '.ai-workflow/BLOCKED';

const argv = process.argv.slice(2);
// A flag is never a value: `--step --full` must leave step unset, not set it to "--full".
// The identity line is the one line that may never lie, so bad input degrades, never renders.
const arg = (f, d = '') => {
  const i = argv.indexOf(f);
  if (i < 0) return d;
  const v = argv[i + 1];
  return v == null || v.startsWith('--') ? d : v;
};
const has = (f) => argv.includes(f);

// ------------------------------------------------------------------ derived layer
/** Never throws: outside a git repo every field degrades to a visible placeholder. */
function derive() {
  const git = (...a) => {
    try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { return ''; }
  };
  const root = git('rev-parse', '--show-toplevel');
  return {
    repo: root ? basename(root) : basename(process.cwd()),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD') || '(no-branch)',
    sha: (git('rev-parse', 'HEAD') || 'NONE').slice(0, 7),
    dirty: (git('status', '--porcelain') || '').split('\n').filter(Boolean).length,
  };
}

// ------------------------------------------------------------------ ledger layer
// A hand-rolled flat parser rather than a YAML dependency: this is read on every reply, and a
// parse error must degrade to "no ledger", never crash a turn.
const ledgerPath = (pid) => join(LEDGER_DIR, `${pid}.yaml`);

/**
 * Which ledger are we talking about?
 *
 * READS may adopt a lone ledger — rendering a block for whatever project is obviously active is
 * the convenience that makes this cheap enough to use every turn.
 *
 * WRITES MAY NOT. Several agents share one working tree here, and on 2026-08-27 a concurrent
 * session auto-adopted this project's ledger and overwrote ASK/PROOF with its own unrelated
 * work — the block then described a different project entirely, which is the exact confusion
 * this whole mechanism exists to end. The gate caught it (PROOF cited commits absent from this
 * branch), but a silent clobber must not be possible in the first place. So a write requires an
 * EXPLICIT pid, from `--pid` or SWAN_ORIENT_PID. Convenience on read, intent on write.
 */
function activePid({ forWrite = false } = {}) {
  if (arg('--pid')) return arg('--pid');
  if (process.env.SWAN_ORIENT_PID) return process.env.SWAN_ORIENT_PID;
  if (forWrite) return '';
  if (!existsSync(LEDGER_DIR)) return '';
  const files = readdirSync(LEDGER_DIR).filter((f) => f.endsWith('.yaml'));
  return files.length === 1 ? files[0].replace(/\.yaml$/, '') : '';  // ambiguous => never guess
}

function readLedger(pid) {
  if (!pid || !existsSync(ledgerPath(pid))) return null;
  try {
    const out = { pid };
    for (const line of readFileSync(ledgerPath(pid), 'utf8').split('\n')) {
      const m = line.match(/^([a-z_]+):\s*(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1').trim();
    }
    return out;
  } catch { return null; }
}

function writeLedger(pid, patch) {
  mkdirSync(LEDGER_DIR, { recursive: true });
  const next = { ...(readLedger(pid) || {}), ...patch, updated: new Date().toISOString() };
  delete next.pid;
  // ASK is authored ONCE and then held to byte-equality by the gate. Stamping when it changes
  // is what lets a later check demand a re-ask instead of letting a months-old ASK silently
  // describe work that moved on.
  if (patch.ask) next.ask_updated = next.updated;
  if (next.step && !/^\d+\/\d+$/.test(next.step)) {
    console.error(`[orient] step must look like 3/7, got "${next.step}"`); process.exit(5);
  }
  if (next.step) {
    const [n, m] = next.step.split('/').map(Number);
    if (n > m) { console.error(`[orient] step ${next.step} exceeds its total`); process.exit(5); }
  }
  const order = ['project', 'ask', 'ask_updated', 'why', 'step', 'done', 'now', 'proof', 'next', 'last_block_hash', 'updated'];
  const keys = [...order.filter((k) => next[k] != null), ...Object.keys(next).filter((k) => !order.includes(k))];
  writeFileSync(ledgerPath(pid),
    '# orientation ledger — machine-local, written by scripts/orient.mjs. Do not hand-edit.\n'
    + keys.map((k) => `${k}: "${String(next[k]).replace(/"/g, "'")}"`).join('\n') + '\n', 'utf8');
  return next;
}

// ------------------------------------------------------------------ render
const clip = (s, f) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  const max = BUDGET[f][1];
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/**
 * Status token. Derived, never asserted — what a human scans first when triaging many tabs is
 * a state glyph, not prose. BLOCK is an explicit sentinel file rather than a ledger field, so
 * clearing a blocker is an action rather than an edit that can be forgotten.
 */
const statusToken = (d) => (existsSync(BLOCKED_SENTINEL) ? 'BLOCK' : d.dirty > 0 ? 'WIP' : 'OK');

function render({ full }) {
  const d = derive();
  const pid = activePid();
  const led = readLedger(pid);
  const project = led?.project || pid || d.repo;
  const step = led?.step ? ` · ${led.step}` : '';
  const nl = led ? '' : ' · no-ledger';

  const lines = [`${project} · ${d.branch}@${d.sha}${step} · [${statusToken(d)}]${nl} · ${full ? 'F' : 'L'}`];
  const put = (k, v) => { if (v) lines.push(`${k.padEnd(5)} ${clip(v, k)}`); };
  const unset = (k) => `(unset — run: node scripts/orient.mjs --set ${k.toLowerCase()}="…")`;

  put('ASK', led?.ask || '(unset — run: node scripts/orient.mjs --init --pid <ID> --ask "…")');
  if (full) { put('WHY', led?.why || unset('WHY')); put('DONE', led?.done || unset('DONE')); }
  put('NOW', led?.now || unset('NOW'));
  if (full) put('PROOF', led?.proof || unset('PROOF'));
  put('NEXT', led?.next || unset('NEXT'));
  return lines.join('\n');
}

// ------------------------------------------------------------------ check
/** Verify an emitted block against live reality. Makes reuse loud rather than preventing it. */
function check(file) {
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch { console.error(`[orient] unreadable: ${file}`); return 4; }

  const claim = parseOrient(text);
  const shape = validateShape(claim);
  if (shape.length) {
    for (const p of shape) console.error(`[orient] ${p.code} — ${p.detail}`);
    return 4;
  }

  const d = derive();
  const problems = [];
  if (claim.branch !== d.branch) problems.push(`branch "${claim.branch}" != live "${d.branch}" — this block describes a DIFFERENT project`);
  if (claim.sha !== 'NONE' && claim.sha !== d.sha) problems.push(`sha ${claim.sha} != live HEAD ${d.sha}`);
  if (problems.length) { console.error(`[orient] STALE — ${problems.join(' · ')}`); return 3; }

  const req = claim.size === 'F' ? FULL_FIELDS : LIGHT_FIELDS;
  console.log(`[orient] FRESH — ${d.repo} ${d.branch}@${d.sha}, size ${claim.size}, ${req.length} fields present`);
  return 0;
}

// ------------------------------------------------------------------ main
if (has('--selftest')) {
  const d = derive();
  const light = render({ full: false });
  const full = render({ full: true });
  const fail = (m) => { console.error(`selftest: ${m}`); process.exit(1); };

  if (light.split('\n').length !== 4) fail(`LIGHT must be 4 lines, got ${light.split('\n').length}`);
  if (full.split('\n').length !== 7) fail(`FULL must be 7 lines, got ${full.split('\n').length}`);
  if (!light.includes(`@${d.sha}`)) fail('identity line missing live sha');
  if (!/· L$/.test(light.split('\n')[0])) fail('LIGHT identity line missing size marker L');
  if (!/· F$/.test(full.split('\n')[0])) fail('FULL identity line missing size marker F');
  if (parseOrient(light)?.size !== 'L') fail('contract did not parse the rendered LIGHT block');
  if (parseOrient(full)?.size !== 'F') fail('contract did not parse the rendered FULL block');

  // Negative control: a block claiming a sha that is not HEAD must be caught as STALE.
  const tmp = join(process.env.TEMP || process.env.TMPDIR || '.', `orient-selftest-${process.pid}.md`);
  writeFileSync(tmp, light.replace(`@${d.sha}`, '@0000000'), 'utf8');
  const rc = check(tmp);
  rmSync(tmp, { force: true });
  if (rc !== 3) fail(`tampered sha must return 3 (STALE), got ${rc}`);
  console.log('[orient] SELFTEST PASS — LIGHT 4 lines / FULL 7, size markers, live sha, tamper detected');
  process.exit(0);
}

if (has('--check')) process.exit(check(arg('--check')));

if (has('--init') || has('--set') || has('--step')) {
  const pid = activePid({ forWrite: true });
  if (!pid) {
    console.error(
      '[orient] a write needs an explicit --pid (or SWAN_ORIENT_PID). Several agents share '
      + 'this working tree, and auto-adopting a lone ledger let a concurrent session overwrite '
      + 'another project\'s block on 2026-08-27. Convenience on read, intent on write.',
    );
    process.exit(2);
  }
  const patch = {};
  for (const [flag, key] of [['--ask', 'ask'], ['--why', 'why'], ['--project', 'project'], ['--step', 'step']]) {
    if (has(flag) && arg(flag)) patch[key] = arg(flag);
  }
  // `--set now="..." next="..."` — the per-turn fields, set together so a turn updates state in
  // one call rather than four, which is what keeps the habit cheap enough to survive.
  if (has('--set')) {
    for (const a of argv.slice(argv.indexOf('--set') + 1)) {
      if (a.startsWith('--')) break;
      const m = a.match(/^(now|next|done|proof|why|ask)=([\s\S]*)$/);
      if (m) patch[m[1]] = m[2];
    }
  }
  writeLedger(pid, patch);
  // NOTE: the carried-copy hash is deliberately NOT written here. Writing it at RENDER time was
  // a defect the gate caught on its first live use (2026-08-27): the renderer stamped the hash
  // of content it was about to emit, so the very first honest emission of freshly-written
  // content compared equal to itself and was accused of being a copy. The hash must record what
  // was last ACCEPTED, not what was last rendered — so `orient-gate` writes it, after it allows
  // a block. Turn N+1 is then compared against turn N's accepted content, which is the actual
  // question ("did the summary move when the work did?").
  console.log(`[orient] ledger → ${ledgerPath(pid)}\n`);
  console.log(render({ full: has('--full') }));
  process.exit(0);
}

console.log(render({ full: has('--full') }));
