#!/usr/bin/env node
/**
 * health-sweep.mjs — registered T0 `health-sweep` (Delivery Quartet Q-2, per the
 * 7★ gap review): ping the SwanStudios health endpoints from the versioned
 * sweep manifest and report ONE green/amber/red line, receipted.
 *
 * Manifest (`sweep-manifest.json`) is DATA, not code — endpoints, auth class,
 * weight. `auth:'admin-jwt'` rows are skipped until the operator credential
 * (P-1) exists; skipped rows are REPORTED as unchecked, never fake-green, and
 * deliberately do NOT amber (a permanent parked gap must not train alarm
 * fatigue — the F6 lesson).
 *
 * Classification: RED = any critical endpoint non-2xx/unreachable (exit 2).
 * AMBER = any normal endpoint failing, or a critical endpoint slower than
 * slowMs (exit 1). GREEN otherwise (exit 0). Gate: SWITCH_MASTER +
 * SWITCH_HEALTH_SWEEP, fail closed. Read-only GETs; no auth, no writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  checkSwitches, resolveSwitchesFile, resolveVaultRoot, writeReceipt,
} from './hermesRunsLib.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

export function loadManifest(file = path.join(HERE, 'sweep-manifest.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function probe(ep, fetchImpl, timeoutMs) {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ep.url, { signal: ctl.signal, redirect: 'follow' });
    return { name: ep.name, weight: ep.weight, code: res.status, ok: res.status >= 200 && res.status < 300, ms: Date.now() - started };
  } catch (err) {
    return { name: ep.name, weight: ep.weight, code: 0, ok: false, ms: Date.now() - started, error: String(err && (err.name === 'AbortError' ? 'timeout' : err.message)).slice(0, 60) };
  } finally { clearTimeout(timer); }
}

export async function runSweep(vaultRoot, switchesFile, {
  manifest = loadManifest(), fetchImpl = globalThis.fetch, now, timeoutMs = 10000, slowMs = 3000,
} = {}) {
  const when = now || new Date().toISOString();
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER', 'SWITCH_HEALTH_SWEEP'], {
    who: 'harness/health-sweep', what: 'health-sweep (T0)', target: 'SwanStudios health endpoints', when,
  });
  const results = [];
  const unchecked = [];
  for (const ep of manifest.endpoints) {
    if (ep.skip || ep.auth !== 'public') { unchecked.push(`${ep.name} (${ep.skip || ep.auth})`); continue; }
    results.push(await probe(ep, fetchImpl, timeoutMs));
  }
  const redFaults = results.filter((r) => r.weight === 'critical' && !r.ok);
  const amberFaults = [
    ...results.filter((r) => r.weight !== 'critical' && !r.ok).map((r) => `${r.name} failing (${r.error || r.code})`),
    ...results.filter((r) => r.weight === 'critical' && r.ok && r.ms > slowMs).map((r) => `${r.name} slow (${r.ms}ms)`),
  ];
  const color = redFaults.length ? 'RED' : amberFaults.length ? 'AMBER' : 'GREEN';
  const detail = results.map((r) => `${r.name}:${r.code || r.error}(${r.ms}ms)`).join(' ');
  const line = color === 'RED'
    ? `RED — ${redFaults.map((r) => `${r.name} ${r.error || r.code}`).join('; ')}`
    : color === 'AMBER' ? `AMBER — ${amberFaults.join('; ')}`
      : `GREEN — ${results.length}/${results.length} checked ok${unchecked.length ? ` (${unchecked.length} unchecked: ${unchecked.join(', ')})` : ''}`;
  writeReceipt(vaultRoot, {
    who: 'harness/health-sweep', what: 'health-sweep (T0)', target: 'SwanStudios health endpoints', when,
    'approved-by': 'n/a',
    outcome: color === 'RED' ? `failed — ${line}` : color === 'AMBER' ? `partial — ${line}` : `ok — ${line}`,
    evidence: detail || 'no public endpoints in manifest',
  });
  return { color, line, results, unchecked, exitCode: color === 'RED' ? 2 : color === 'AMBER' ? 1 : 0 };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const out = await runSweep(resolveVaultRoot(), resolveSwitchesFile(), {});
  console.log(out.line);
  process.exit(out.exitCode);
}
