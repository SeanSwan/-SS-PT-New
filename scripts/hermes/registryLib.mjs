/**
 * registryLib.mjs — Registry-as-data: the single source of the broker's command
 * vocabulary (E1, closes finding G-1).
 *
 * command-effect-registry.md §3 and kill-switches.md §4 are CANON. This module
 * parses them into a validated, machine-readable registry (committed as
 * registry.generated.json) so the runtime never hand-mirrors the doc. The parser
 * IS the validator: a row missing any field, a duplicate name, or a command that
 * names a switch absent from the kill-switch inventory THROWS — the build and the
 * drift test both fail. queueModel (QUEUEABLE / FORBIDDEN / T2 rows) and
 * hermesRunsLib (switch seed) read the generated data; nothing transcribes the
 * doc by hand.
 *
 * Canon (do not drift from these):
 *  - docs/ai-workflow/hermes-agentic-os/command-effect-registry.md §2 schema · §3 rows
 *  - docs/ai-workflow/hermes-agentic-os/kill-switches.md §4 inventory
 *
 * Pure file I/O + string parsing — no LLM, no network, no product DB, no shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

export const CMD_DOC_REL = 'docs/ai-workflow/hermes-agentic-os/command-effect-registry.md';
export const SWITCH_DOC_REL = 'docs/ai-workflow/hermes-agentic-os/kill-switches.md';
export const GENERATED_JSON = path.join(HERE, 'registry.generated.json');
export const SCHEMA_VERSION = 1;

// Physical table headers (lower-cased). tier + approval are section-derived;
// the doc groups rows by tier heading, so those two are never table columns.
const CMD_HEADER = ['name', 'description', 'owner', 'channels', 'inputs', 'receipt evidence', 'kill-switch'];
const DENIED_HEADER = ['name', 'status', 'why the row exists'];
const SWITCH_HEADER = ['name', 'stops', 'flip', 'owner', 'default'];
// command-effect-registry.md §2 `approval` field: derived from tier, never inferred at runtime.
const APPROVAL_BY_TIER = { T0: 'none-logged', T1: 'none-logged', T2: 'allowlist', T3: 'queue', T4: 'queue+arm' };

function fail(msg) { throw new Error(`registry parse error: ${msg}`); }
function stripCode(s) { return String(s).replace(/`/g, '').trim(); }

/** Split a markdown table row on UNescaped pipes; drop the two border cells; unescape \| . */
function splitRow(line) {
  const parts = line.split(/(?<!\\)\|/);
  if (parts.length && parts[0].trim() === '') parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
  return parts.map((c) => c.replace(/\\\|/g, '|').trim());
}

function isRow(line) { return /^\s*\|.*\|\s*$/.test(line); }
function isSeparator(line) { return /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-'); }

/**
 * Walk lines, yielding one object per markdown table with its section context:
 * { header:[lowercased cells], rows:[{cells,lineNo}], tier, denied, proposed }.
 * tier tracks `### T0..T4` headers; denied tracks `### DENIED`; proposed flips on
 * a `**PROPOSED` line and resets on any heading.
 */
function* tables(text) {
  const lines = text.split('\n');
  let tier = null;
  let denied = false;
  let proposed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = /^###\s+(T[0-4])\b/.exec(line))) { tier = m[1]; denied = false; proposed = false; continue; }
    if (/^###\s+DENIED\b/i.test(line)) { tier = null; denied = true; proposed = false; continue; }
    if (/^#{1,3}\s/.test(line)) { tier = null; denied = false; proposed = false; continue; }
    if (/^\s*\*\*PROPOSED\b/i.test(line)) { proposed = true; continue; }
    if (isRow(line) && isSeparator(lines[i + 1] || '')) {
      const header = splitRow(line).map((c) => c.toLowerCase());
      const rows = [];
      let j = i + 2;
      for (; j < lines.length && isRow(lines[j]); j++) {
        if (isSeparator(lines[j])) continue;
        rows.push({ cells: splitRow(lines[j]), lineNo: j + 1 });
      }
      yield { header, rows, tier, denied, proposed };
      i = j - 1;
    }
  }
}

function headerMatches(header, expected) {
  return header.length === expected.length && expected.every((h, k) => header[k] === h);
}

/**
 * Parse both canon docs into a validated registry. THROWS on any invalid row —
 * this function is the validator the build and drift test rely on.
 */
export function parseRegistryMarkdown(cmdText, switchText) {
  // 1) Switches first — commands cross-check their kill-switch against this set.
  const switches = [];
  const switchNames = new Set();
  for (const t of tables(switchText)) {
    if (!headerMatches(t.header, SWITCH_HEADER)) continue;
    for (const { cells, lineNo } of t.rows) {
      if (cells.length !== SWITCH_HEADER.length) fail(`switch row has ${cells.length} cells, expected ${SWITCH_HEADER.length} (line ${lineNo})`);
      const [nameC, stops, flip, owner, dflt] = cells;
      const name = stripCode(nameC);
      for (const [k, v] of [['name', name], ['stops', stops], ['flip', flip], ['owner', owner], ['default', dflt]]) {
        if (!v) fail(`switch row missing field '${k}' (line ${lineNo})`);
      }
      if (!/^SWITCH_[A-Z0-9_]+$/.test(name)) fail(`switch name '${name}' is not a SWITCH_* constant (line ${lineNo})`);
      // UX-9: seed posture is doc-driven — unbuilt surfaces ship OFF so day-1
      // status never shows green brakes for vapor, and a landing slice is never pre-armed.
      if (!/^(on|off)$/.test(dflt)) fail(`switch default '${dflt}' must be 'on' or 'off' (line ${lineNo})`);
      if (switchNames.has(name)) fail(`duplicate switch '${name}' (line ${lineNo})`);
      switchNames.add(name);
      switches.push({ name, stops, flip, owner, default: dflt === 'on' });
    }
  }
  if (!switches.length) fail(`no switch inventory found in ${SWITCH_DOC_REL} §4`);

  // 2) Commands (tier-sectioned) + DENIED rows.
  const commands = [];
  const denied = [];
  const names = new Set();
  const claim = (name, lineNo) => {
    if (names.has(name)) fail(`duplicate command/denied name '${name}' (line ${lineNo})`);
    names.add(name);
  };
  for (const t of tables(cmdText)) {
    if (t.tier && headerMatches(t.header, CMD_HEADER)) {
      for (const { cells, lineNo } of t.rows) {
        if (cells.length !== CMD_HEADER.length) fail(`command row has ${cells.length} cells, expected 7 (line ${lineNo})`);
        const field = {};
        CMD_HEADER.forEach((h, k) => { field[h] = cells[k]; });
        for (const h of CMD_HEADER) {
          if (!field[h]) fail(`command row missing field '${h}' (line ${lineNo})`);
        }
        const name = stripCode(field.name);
        if (!/^[a-z][a-z0-9-]*$/.test(name)) fail(`command name '${name}' is not kebab-case (line ${lineNo})`);
        claim(name, lineNo);
        const ksCell = field['kill-switch'];
        const km = /SWITCH_[A-Z0-9_]+/.exec(ksCell);
        let killSwitch = null;
        if (km) killSwitch = km[0];
        else if (!/^none\b/i.test(ksCell)) fail(`command '${name}' kill-switch cell has neither a SWITCH_* token nor 'none' (line ${lineNo})`);
        if (killSwitch && !switchNames.has(killSwitch)) {
          fail(`command '${name}' names switch '${killSwitch}' absent from the kill-switch inventory (line ${lineNo}) — doc drift`);
        }
        commands.push({
          name,
          tier: t.tier,
          approval: APPROVAL_BY_TIER[t.tier],
          owner: stripCode(field.owner),
          channels: field.channels.split(',').map((c) => stripCode(c)).filter(Boolean),
          inputs: field.inputs,
          receipt: field['receipt evidence'],
          description: field.description,
          killSwitch,
          proposed: Boolean(t.proposed),
        });
      }
    } else if (t.denied && headerMatches(t.header, DENIED_HEADER)) {
      for (const { cells, lineNo } of t.rows) {
        if (cells.length !== DENIED_HEADER.length) fail(`denied row has ${cells.length} cells, expected 3 (line ${lineNo})`);
        const [nameC, status, why] = cells;
        const name = stripCode(nameC);
        for (const [k, v] of [['name', name], ['status', status], ['why', why]]) {
          if (!v) fail(`denied row missing field '${k}' (line ${lineNo})`);
        }
        claim(name, lineNo);
        denied.push({ name, status, why });
      }
    }
  }
  if (!commands.length) fail(`no command rows found in ${CMD_DOC_REL} §3`);

  return { schemaVersion: SCHEMA_VERSION, generatedFrom: [CMD_DOC_REL, SWITCH_DOC_REL], commands, denied, switches };
}

/** Read + parse both canon docs from disk (build + drift test). Deterministic. */
export function buildRegistryFromDocs({ cmdPath, switchPath } = {}) {
  const cmd = fs.readFileSync(cmdPath || path.join(REPO_ROOT, CMD_DOC_REL), 'utf8');
  const sw = fs.readFileSync(switchPath || path.join(REPO_ROOT, SWITCH_DOC_REL), 'utf8');
  return parseRegistryMarkdown(cmd, sw);
}

let _cache = null;
/** Runtime load of the committed generated JSON (fast, no markdown parse). Fail closed. */
export function loadRegistry({ jsonPath = GENERATED_JSON, fresh = false } = {}) {
  if (_cache && !fresh && jsonPath === GENERATED_JSON) return _cache;
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    throw new Error(`registry.generated.json unreadable (${err.code || 'parse error'}) — run: node scripts/hermes/registry-build.mjs`);
  }
  if (jsonPath === GENERATED_JSON) _cache = reg;
  return reg;
}

// Derived accessors — the ONLY way the runtime learns the command vocabulary.
export function getCommand(reg, name) { return reg.commands.find((c) => c.name === name); }
export function getQueueable(reg) {
  const out = {};
  for (const c of reg.commands) {
    if (c.tier === 'T3' || c.tier === 'T4') out[c.name] = { tier: c.tier, killSwitch: c.killSwitch };
  }
  return out;
}
export function getForbidden(reg) { return reg.denied.map((d) => d.name); }
export function getT2Rows(reg) { return reg.commands.filter((c) => c.tier === 'T2').map((c) => c.name); }
export function getT2Standing(reg) { return reg.commands.filter((c) => c.tier === 'T2' && !c.proposed).map((c) => c.name); }
export function getSwitchInventory(reg) { return reg.switches.map((s) => s.name); }
export function getSwitchDefaults(reg) { return Object.fromEntries(reg.switches.map((s) => [s.name, s.default !== false])); } // UX-9 doc-driven seed posture
