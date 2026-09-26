#!/usr/bin/env node
/**
 * cli.mjs — Astra's terminal face. The same core the loopback surface will use.
 *
 * This is NOT a second implementation. Every command below calls `core/`, and
 * `core/` calls the brain. The console's whole reason for existing is that the
 * loop was "shell commands only its author remembers" — so the fix is a real
 * surface, not a nicer wrapper around a hidden one.
 *
 * `explain` is the command this slice exists for. The compiler has always
 * RETURNED `lawChecks`, `slots` and `facetsApplied`, and nothing ever rendered
 * them: the brain's reasoning was real, correct, and invisible.
 *
 * Usage:
 *   node scripts/astra/cli.mjs version
 *   node scripts/astra/cli.mjs directions [brief.json] [n]
 *   node scripts/astra/cli.mjs explain    [brief.json] [--caps caps.json]
 *   node scripts/astra/cli.mjs law        [brief.json]
 *   node scripts/astra/cli.mjs state
 *   node scripts/astra/cli.mjs bind       [host]
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASTRA_FIXTURES } from './core/paths.mjs';
import { compileAndExplain, directionsWithTiers, readBrainVersion } from './core/brain.mjs';
import { capabilitySummary } from './core/capabilities.mjs';
import { bindAddress } from './core/bind.mjs';

const out = (s = '') => process.stdout.write(`${s}\n`);
const pad = (s, n) => String(s).padEnd(n);

/**
 * Resolve a fixture argument against the cwd, then the fixtures directory.
 *
 * The basename fallback is deliberate: the A1 exit command in the packet is
 * written `explain <fixture>`, and an operator will type `fixtures/brief-hero.json`
 * as often as `brief-hero.json`. Failing on the first form because of a redundant
 * path segment is the kind of friction that makes a tool feel broken.
 */
function loadJson(arg, fallback) {
  const name = arg || fallback;
  const base = name.split(/[\\/]/).pop();
  const candidates = [name, join(ASTRA_FIXTURES, name), join(ASTRA_FIXTURES, base)];
  // EXISTENCE ONLY. An earlier version read `isAbsolute(p) || existsSync(p)`,
  // intending "accept a user-supplied absolute path" — but `join()` returns an
  // absolute path too, so the predicate was TRUE for every candidate and the
  // FIRST joined one won unconditionally. The selector could not select. An
  // absolute path that exists passes `existsSync` on its own, so the special case
  // was never needed.
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error(`E_FIXTURE_NOT_FOUND: no such fixture ${JSON.stringify(name)}`);
  return JSON.parse(readFileSync(hit, 'utf8'));
}

function renderLawTable(rows) {
  out(`LAW CHECKS (${rows.length})`);
  for (const r of rows) {
    // `null` is NOT a pass. A law that never ran must never read as a law that
    // found nothing wrong — that is the defect class this repo keeps re-fixing.
    const verdict = r.passed === true ? 'PASS' : (r.passed === false ? 'FAIL' : 'n/o ');
    const where = r.slot ? ` slot="${r.slot}"` : '';
    const detail = r.detail ? `  ${r.detail}` : (r.passed === null ? '  NOT OBSERVED' : '');
    out(`  ${pad(verdict, 5)} ${pad(r.law, 26)}${where}${detail}`);
  }
}

function renderExplain(view) {
  out(`ExplainView${view.blocked ? '  ** BLOCKED **' : ''}`);
  if (view.blocked) {
    out(`  code     ${view.code}`);
    out(`  partial  ${view.partialReason}`);
  } else {
    out(`  briefId  ${view.briefId ?? '(none)'}`);
    out(`  version  ${view.brainVersion ?? '(not on the record)'}`);
    out(`  provider ${view.provider} / ${view.modelVersion}`);
    out(`  aspect   ${view.aspect}${view.aspectDivergence
      ? `  DIVERGENCE declared=${view.aspectDivergence.declared} inProse=${view.aspectDivergence.inProse}`
      : '  (no divergence)'}`);
    out(`  style    ${view.promptStyle}`);
    out(`  seed     ${view.seed}`);
    out(`  facets   ${view.facetsApplied.join(', ') || '(none)'}`);
    if (view.truncated) out(`  TRUNCATED dropped: ${view.droppedSegments.join(', ')}`);
    out('');
    out(`SLOTS (${view.slots.length})`);
    for (const s of view.slots) {
      out(`  ${pad(s.key, 12)} ${s.value || (s.emptyReason ? `(empty) ${s.emptyReason}` : '(empty)')}`);
    }
    out('');
    out(`EMPTY SLOTS  ${view.emptySlots.length ? view.emptySlots.join(', ') : 'none'}`);
    out('');
    out('PROMPT');
    out(`  ${view.promptText}`);
    out('');
  }
  renderLawTable(view.lawChecks);
  const caps = view.capabilities;
  if (caps) {
    out('');
    out(`CAPABILITIES  seed=${caps.seedIsDeterministic} (usable: ${caps.seedUsable})  `
      + `negative=${caps.honorsNegativePrompt} (usable: ${caps.negativePromptUsable})`);
  }
}

function cmdExplain(argv) {
  const capsIdx = argv.indexOf('--caps');
  const capsFile = capsIdx !== -1 ? argv[capsIdx + 1] : 'caps-verified.json';
  const briefFile = argv.find((a) => !a.startsWith('--') && a !== capsFile);
  const brief = loadJson(briefFile, 'brief-hero.json');
  const caps = loadJson(capsFile, 'caps-verified.json');
  const { ok, view } = compileAndExplain(brief, caps);
  renderExplain(view);
  return ok ? 0 : 0; // a blocked compile is a REPORTED outcome, not a CLI failure
}

function cmdDirections(argv) {
  const briefFile = argv.find((a) => !/^\d+$/.test(a));
  const n = Number(argv.find((a) => /^\d+$/.test(a)) || 3);
  const brief = loadJson(briefFile, 'brief-hero.json');
  const dirs = directionsWithTiers(brief, n);
  out(`DIRECTIONS (${dirs.length})  — zero provider calls, zero spend`);
  for (const d of dirs) {
    out('');
    out(`  ${d.name}   [${d.tier.toUpperCase()}]`);
    out(`    ${d.sentence}`);
    out(`    phenomenon: ${d.phenomenon}`);
    out(`    facets:     ${d.facets.join(', ')}`);
    out(`    palette:    ${d.paletteLaw}`);
    out(`    swatches:   ${d.swatches.map((s) => `${s.facet}=${s.hex}`).join('  ')}`);
    out(`    tier:       ${d.tierReason}`);
  }
  return 0;
}

function cmdState() {
  const { board, byStatus, inconclusive } = capabilitySummary();
  out('STATE — the honest board. Every row resolves to a live code source.');
  out('');
  for (const r of board) {
    const src = r.sourceMissing ? `${r.source}  (MARKER MISSING)` : r.source;
    out(`  ${pad(r.status, 13)} ${pad(r.lane, 20)} ${src}`);
    out(`      ${r.gatedBy ? `gated by: ${r.gatedBy}` : 'ungated'}`);
    out(`      writes:   ${r.writes}`);
    if (r.note) out(`      note:     ${r.note}`);
  }
  out('');
  out(`COUNTS  ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  if (inconclusive.length) out(`INCONCLUSIVE: ${inconclusive.join(', ')} — status NOT asserted`);
  return inconclusive.length ? 1 : 0;
}

function cmdBind(argv) {
  const host = argv[0];
  const { url } = bindAddress(host ? { host } : {});
  out(`OK  binding ${url}`);
  return 0;
}

function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  try {
    switch (cmd) {
      case 'version':
        out(`brainVersion ${readBrainVersion()}`);
        return 0;
      case 'explain': return cmdExplain(argv);
      case 'law': return cmdExplain([...argv, '--caps', 'caps-verified.json']);
      case 'directions': return cmdDirections(argv);
      case 'state': return cmdState();
      case 'bind': return cmdBind(argv);
      default:
        out('astra — commands: version | directions | explain | law | state | bind');
        return cmd ? 2 : 0;
    }
  } catch (e) {
    // A refusal is the correct outcome for several of these paths, so the code is
    // printed rather than the stack. A guard that fails loudly beats one that
    // fails legibly.
    out(`REFUSED  ${e.code || 'E_UNEXPECTED'}: ${e.message}`);
    return 1;
  }
}

process.exit(main());
