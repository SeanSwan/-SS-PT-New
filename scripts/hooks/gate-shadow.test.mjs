#!/usr/bin/env node
/**
 * gate-shadow.test.mjs — the module that can switch a gate off.
 * =============================================================
 * WHY THIS EXISTS, and why its absence was the worst thing in the session that shipped
 * it: five hostile seats independently named untested safety tooling as this
 * programme's meta-defect. The response was to build shadow mode — a module whose
 * entire job is to stop gates from blocking — and ship it with no tests at all.
 *
 * THE ASYMMETRY. Every case below is written from one question: **can this module
 * disable protection that should have fired?** A shadow that fails to engage costs an
 * annoying block. A shadow that engages when it should not costs the protection
 * itself, silently, which is the failure this whole repo keeps rediscovering.
 *
 * The allowlist tests (section 1) are the load-bearing ones. They exist because
 * attacking the first version worked: adding one line to a JSON file made
 * `isShadowed('egress-privacy-gate')` return true. It was not exploitable that day —
 * the PII gate does not route through emit() — but it was one refactor away from
 * being a config edit that disables PII scanning.
 *
 * Run: node scripts/hooks/gate-shadow.test.mjs   (exit 0 = pass)
 */
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { SHADOWABLE, redact } from '../lib/gate-shadow.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CONFIG = join(ROOT, '.ai-workflow', 'gate-mode.json');

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Run isShadowed in a CHILD process against a given config, so the real module's
 * file-reading path is exercised rather than a stubbed one. The config is swapped and
 * always restored.
 */
const TMP = mkdtempSync(join(tmpdir(), 'gateshadow-'));
const FIXTURE = join(TMP, 'gate-mode.json');

/**
 * Telemetry from this suite goes to a THROWAWAY path, never the live store.
 *
 * GLM caught this: the live `gate-telemetry.jsonl` showed `blocked: 3` for a gate that
 * was supposed to be shadowed. Inspecting it, 5 of 8 "blocked" records were written by
 * this very test suite — reasons `a blocking reason`, `pii found`, `Symbol(s)`. The
 * dataset that exists to decide which gates get retired was being contaminated by the
 * tests that exercise them. Kept OUTSIDE `TMP` because the `finally` below removes TMP
 * while sections 5-7 are still to run.
 */
const TELEM_TMP = join(tmpdir(), `gateshadow-telem-${process.pid}.jsonl`);
function shadowedWith(configText, hook, env = {}) {
  // HERMETIC: fixtures go to a temp path via SWAN_GATE_CONFIG. The live config is
  // never touched — an earlier version of this suite swapped the real file and a
  // failed restore left the repo shadowed until the year 5138.
  if (configText === null) { try { rmSync(FIXTURE); } catch { /* absent */ } }
  else writeFileSync(FIXTURE, configText);
  const src = `import('file://${join(ROOT, 'scripts/lib/gate-shadow.mjs').replace(/\\/g, '/')}')` +
    `.then(m=>process.stdout.write(String(m.isShadowed(${JSON.stringify(hook)}))))`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', src], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, SWAN_GATE_FORCE_NORMAL: '', SWAN_GATE_CONFIG: FIXTURE, SWAN_GATE_TELEMETRY: TELEM_TMP, ...env },
  });
  return out.trim() === 'true';
}
const FUTURE = '2099-01-01T00:00:00Z';
const cfg = (shadow, until = FUTURE) => JSON.stringify({ shadow, until });

try {
  // ---- 1. THE ALLOWLIST — a config cannot extend it ------------------------
  {
    check('1a compliance gate REFUSED even when named',
      shadowedWith(cfg(['egress-privacy-gate']), 'egress-privacy-gate') === false);
    check('1b spend gate REFUSED even when named',
      shadowedWith(cfg(['spend-guard-gate']), 'spend-guard-gate') === false);
    check('1c destructive-db gate REFUSED',
      shadowedWith(cfg(['db-blast-radius-gate']), 'db-blast-radius-gate') === false);
    check('1d exit-status gate REFUSED',
      shadowedWith(cfg(['exit-status-gate']), 'exit-status-gate') === false);
    check('1e an unknown/typo hook is REFUSED',
      shadowedWith(cfg(['not-a-real-gate']), 'not-a-real-gate') === false);
    check('1f a legitimate closeout gate IS shadowed',
      shadowedWith(cfg(['orient-gate']), 'orient-gate') === true);
    // The allowlist must not silently contain a compliance gate.
    for (const forbidden of ['egress-privacy-gate', 'spend-guard-gate', 'db-blast-radius-gate',
      'exit-status-gate', 'push-blast-radius', 'secret-read-gate', 'irreversible-git-gate']) {
      check(`1g allowlist excludes ${forbidden}`, !SHADOWABLE.has(forbidden));
    }
  }

  // ---- 2. Every ambiguous config falls back to BLOCKING --------------------
  {
    check('2a config absent', shadowedWith(null, 'orient-gate') === false);
    check('2b malformed JSON', shadowedWith('{ not json', 'orient-gate') === false);
    check('2c root is null', shadowedWith('null', 'orient-gate') === false);
    check('2d root is an array', shadowedWith('[]', 'orient-gate') === false);
    check('2e root is a number', shadowedWith('42', 'orient-gate') === false);
    check('2f shadow key missing', shadowedWith(JSON.stringify({ until: FUTURE }), 'orient-gate') === false);
    check('2g shadow is not an array', shadowedWith(JSON.stringify({ shadow: 'orient-gate', until: FUTURE }), 'orient-gate') === false);
    check('2h shadow is null', shadowedWith(JSON.stringify({ shadow: null, until: FUTURE }), 'orient-gate') === false);
    check('2i hook not listed', shadowedWith(cfg(['hermes-closeout-gate']), 'orient-gate') === false);
    check('2j empty shadow list', shadowedWith(cfg([]), 'orient-gate') === false);
  }

  // ---- 3. THE EXPIRY — an undated window is a permanent window -------------
  {
    check('3a until missing', shadowedWith(JSON.stringify({ shadow: ['orient-gate'] }), 'orient-gate') === false);
    check('3b until malformed', shadowedWith(cfg(['orient-gate'], 'not-a-date'), 'orient-gate') === false);
    check('3c until null', shadowedWith(JSON.stringify({ shadow: ['orient-gate'], until: null }), 'orient-gate') === false);
    check('3d until is a number', shadowedWith(JSON.stringify({ shadow: ['orient-gate'], until: 99999999999999 }), 'orient-gate') === false,
      'a bare number must not parse as a far-future date');
    check('3e until in the past', shadowedWith(cfg(['orient-gate'], '2020-01-01T00:00:00Z'), 'orient-gate') === false);
    check('3f until in the future', shadowedWith(cfg(['orient-gate'], FUTURE), 'orient-gate') === true);
    check('3g empty string until', shadowedWith(cfg(['orient-gate'], ''), 'orient-gate') === false);
  }

  // ---- 4. FORCE_NORMAL only ever makes a gate stricter ---------------------
  {
    check('4a FORCE_NORMAL=1 disables shadowing',
      shadowedWith(cfg(['orient-gate']), 'orient-gate', { SWAN_GATE_FORCE_NORMAL: '1' }) === false);
    // It must not be able to CREATE shadowing for a forbidden gate.
    check('4b FORCE_NORMAL cannot enable a compliance gate shadow',
      shadowedWith(cfg(['egress-privacy-gate']), 'egress-privacy-gate', { SWAN_GATE_FORCE_NORMAL: '1' }) === false);
    check('4c other values of the env var do not disable shadowing',
      shadowedWith(cfg(['orient-gate']), 'orient-gate', { SWAN_GATE_FORCE_NORMAL: '0' }) === true);
  }
} finally {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* temp */ }
}

// ---- 5. emit(): stdout is the block channel; shadow must not write to it ----
{
  // emit() resolves its config relative to the REAL repo root, so these run against the
  // live config rather than a temp one — which is the honest test anyway: it is the
  // config that actually governs turns.
  const src = (hook, reason) =>
    `import('file://${join(ROOT, 'scripts/lib/gate-shadow.mjs').replace(/\\/g, '/')}')` +
    `.then(m=>{m.emit(${JSON.stringify(hook)},${JSON.stringify(reason)})})`;
  const runReal = (hook, reason, env = {}) => {
    const r = execFileSync(process.execPath, ['--input-type=module', '-e', src(hook, reason)],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, SWAN_GATE_TELEMETRY: TELEM_TMP, ...env } });
    return r;
  };
  // Shadowed hook: stdout MUST be empty. Must name a hook the LIVE config actually shadows —
  // this used dual-tier-gate until 2026-08-27, when that gate was deleted and its replacement
  // (orient-gate) deliberately shipped enforcing rather than shadowed. hermes-closeout-gate is
  // the remaining live shadow entry, so it is the honest subject for this assertion.
  const shadowOut = runReal('hermes-closeout-gate', 'a blocking reason');
  check('5a shadowed hook writes NOTHING to stdout', shadowOut.trim() === '', JSON.stringify(shadowOut.slice(0, 80)));
  // Forced normal: stdout MUST carry the harness block JSON.
  const normOut = runReal('orient-gate', 'a blocking reason', { SWAN_GATE_FORCE_NORMAL: '1' });
  check('5b FORCE_NORMAL writes the block JSON', /"decision"\s*:\s*"block"/.test(normOut), JSON.stringify(normOut.slice(0, 120)));
  // A compliance gate must block even though the config lists only closeout gates.
  const compOut = runReal('egress-privacy-gate', 'pii found');
  check('5c non-shadowable hook always writes the block JSON', /"decision"\s*:\s*"block"/.test(compOut), JSON.stringify(compOut.slice(0, 120)));
  // Allow path: no reason -> no stdout at all, in either mode.
  check('5d allow writes nothing', runReal('orient-gate', '').trim() === '');
  check('5e whitespace-only reason counts as allow', runReal('orient-gate', '   ').trim() === '');
}

// ---- 6. redact(): telemetry must never carry PII to a later LLM reader -----
// Measured first: 112 live records, 8 distinct reason prefixes, 0 PII hits. This is
// enforcement behind an assumption that happened to hold, not a response to a leak.
{
  check('6a email stripped', redact('mail steve.jones@gmail.com here').includes('<redacted-email>'));
  check('6b parenthesised phone stripped', redact('call (415) 555-1234').includes('<redacted-phone>'));
  check('6c dashed phone stripped', redact('415-555-1234').includes('<redacted-phone>'));
  check('6d api key stripped', redact('sk-' + 'A'.repeat(30)).includes('<redacted-key>'));
  check('6e jwt stripped', redact('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ').includes('<redacted-jwt>'));
  check('6f windows user path stripped', redact('C:\\Users\\someone\\x').includes('<redacted-userpath>'));
  check('6g unix home stripped', redact('/home/someone/x').includes('<redacted-userpath>'));
  // Repo-relative paths are the USEFUL part of a reason and must survive redaction.
  const keep = redact('File: docs/ai-workflow/hermes-learning-packets/x.md fails schema');
  check('6h repo-relative path preserved', keep.includes('docs/ai-workflow/hermes-learning-packets/x.md'), keep);
  check('6i ordinary prose untouched', redact('this turn changed code') === 'this turn changed code');
}

// ---- 7. emit() can never convert a BLOCK into a silent pass ----------------
// Every caller wraps emit() in `try { emit(...) } catch { /* fail-open */ }`. A throw
// inside emit() therefore ALLOWS a turn the gate decided to block. The stdout write is
// the last statement for exactly this reason; these cases pin it.
{
  const modUrl = 'file://' + join(ROOT, 'scripts/lib/gate-shadow.mjs').replace(/\\/g, '/');
  const hostile = [
    ['throwing toString', 'const r={toString(){throw new Error("boom")}};'],
    ['symbol reason', 'const r=Symbol("s");'],
  ];
  for (const [label, decl] of hostile) {
    // 'egress-privacy-gate' is NOT shadowable, so a correct run must emit block JSON.
    const code = `import(${JSON.stringify(modUrl)}).then(m=>{${decl}` +
      `try{m.emit("egress-privacy-gate",r)}catch(e){process.stdout.write("THREW")}})`;
    let out = '';
    try {
      out = execFileSync(process.execPath, ['--input-type=module', '-e', code],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, SWAN_GATE_TELEMETRY: TELEM_TMP } });
    } catch { out = 'CRASHED'; }
    const silentPass = out.trim() === '';
    check(`7 ${label}: did NOT silently allow`, !silentPass, JSON.stringify(String(out).slice(0, 90)));
    check(`7 ${label}: emitted a block`, /"decision"\s*:\s*"block"/.test(out), JSON.stringify(String(out).slice(0, 90)));
  }
}

try { rmSync(TELEM_TMP, { force: true }); } catch { /* temp */ }

if (failures.length) {
  console.error(`FAIL ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`gate-shadow: ${pass}/${pass} pass`);
