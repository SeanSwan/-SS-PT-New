#!/usr/bin/env node
/**
 * provider-registry.check.mjs — structural validator for $DSH_HOME/provider-registry.yaml
 *
 * NO NETWORK. This file imports only node:fs and node:path. That is asserted below by
 * parsing its OWN import statements (both quote styles, plus dynamic import()/require()),
 * not by scanning for forbidden substrings — an earlier revision used a single-quoted
 * substring scan that double-quoted specifiers would have walked straight past (VB-3).
 *
 * Hardened 2026-09-13 against GLM 5.3 findings VB-1..VB-9. The design rule adopted:
 * a check must evaluate a DERIVED FACT (resolve the path, join the lane to its billing
 * block, count the authorities) rather than assert that the file contains the right
 * WORDS — a registry with true vocabulary and false content previously scored 11/11.
 *
 * Usage: node provider-registry.check.mjs [path]
 * Exit:  0 = all checks passed, 1 = at least one failed.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';

const registryPath = resolve(process.argv[2] || resolve(process.env.DSH_HOME || '.', 'provider-registry.yaml'));
const checks = [];
const check = (name, fn) => {
  try { const detail = fn(); checks.push({ name, ok: true, detail: detail || '' }); }
  catch (error) { checks.push({ name, ok: false, detail: error.message }); }
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };

if (!existsSync(registryPath)) {
  console.error(`provider-registry.check: not found: ${registryPath}`);
  process.exit(1);
}
const text = readFileSync(registryPath, 'utf8');
const dshHome = process.env.DSH_HOME || '';

// ---------------------------------------------------------------------------
// Parsing. VB-9: a missing section must FAIL, not silently truncate a slice.
// ---------------------------------------------------------------------------
const sectionAt = (name) => text.indexOf(`\n${name}:`);
const requireSection = (name) => {
  const i = sectionAt(name);
  assert(i !== -1, `missing top-level section: ${name}`);
  return i;
};
const sliceSection = (name) => {
  const start = requireSection(name);
  const rest = text.slice(start + 1);
  const nextTop = rest.slice(1).search(/\n[a-zA-Z][A-Za-z]*:/);
  const body = nextTop === -1 ? rest : rest.slice(0, nextTop + 1);
  return body;
};

const modelsSection = sliceSection('models');
const rows = modelsSection.split(/\n {2}- id: /).slice(1).map(chunk => {
  const id = (chunk.match(/^(\S+)/) || [])[1] || '(unparsed)';
  return { id, body: chunk.replace(/^\S+\n/, '') };
});
const fieldOf = (row, field) => {
  const m = row.body.match(new RegExp(`^ {4}${field}: *(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
};
const laneKeys = (() => {
  const body = sliceSection('billingLanes');
  return new Set([...body.matchAll(/^ {2}([a-z][a-z0-9-]*):/gm)].map(m => m[1]));
})();
const statusKeys = (() => {
  const body = sliceSection('statusValues');
  return new Set([...body.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map(m => m[1]));
})();

// Lane coherence contract (VB-1). Each lane declares what its rows must look like.
const LANE_CONTRACT = {
  'subscription-zai': { credential: /ZAI_API_KEY|ZAI_CODING_CN_API_KEY/, endpoint: /api\.z\.ai|NOT_ESTABLISHED/ },
  'subscription-codex': { credential: /codex|CLIENT|auth/i, endpoint: /codex|NOT_ESTABLISHED/ },
  'subscription-claude': { credential: /claude|auth/i, endpoint: /claude|NOT_ESTABLISHED/i },
  'subscription-grok': { credential: /grok|oauth|auth/i, endpoint: /kilo|opencode|oauth|NOT_ESTABLISHED/i },
  'direct-google': { credential: /GEMINI_API_KEY|GOOGLE_AI_KEY/, endpoint: /generativelanguage\.googleapis\.com/ },
  'direct-deepseek': { credential: /DEEPSEEK_API_KEY/, endpoint: /api\.deepseek\.com/ },
  openrouter: { credential: /OPENROUTER_API_KEY/, endpoint: /openrouter\.ai/ },
  local: { credential: /none|n\/a/i, endpoint: /127\.0\.0\.1|localhost/ },
};

const roots = [dshHome, resolve(dshHome, '..', 'Desktop', '@Everything', 'quick-pt', 'SS-PT')].filter(Boolean);
const resolveCitation = (path) => {
  if (isAbsolute(path)) return existsSync(path) ? path : null;
  for (const root of roots) {
    const candidate = join(root, path);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};
const CITATION = /([A-Za-z0-9_][A-Za-z0-9_./@-]*\.(?:mjs|cjs|js|json|md|ts|tsx|ps1|ya?ml))(?::(\d+(?:-\d+)?))?/g;

// ---------------------------------------------------------------- checks ----
check('sections present (VB-9)', () => {
  for (const name of ['models', 'billingLanes', 'statusValues', 'invariants', 'openDecisions']) requireSection(name);
  return 'models, billingLanes, statusValues, invariants, openDecisions';
});

check('rows parsed and ids unique (VB-8)', () => {
  assert(rows.length >= 20, `expected >=20 rows, parsed ${rows.length}`);
  const seen = new Set(); const dupes = [];
  for (const row of rows) { if (seen.has(row.id)) dupes.push(row.id); seen.add(row.id); }
  assert(dupes.length === 0, `duplicate ids -> ${dupes.join(', ')}`);
  return `${rows.length} unique rows`;
});

check('every row declares all required fields', () => {
  const REQUIRED = ['provider', 'billingLane', 'credential', 'endpointFamily', 'harness', 'role',
    'authority', 'privacyClass', 'identityVerification', 'status', 'source', 'rollback', 'notes'];
  const missing = [];
  for (const row of rows) for (const f of REQUIRED) if (!new RegExp(`^ {4}${f}:`, 'm').test(row.body)) missing.push(`${row.id}:${f}`);
  assert(missing.length === 0, `missing -> ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12})` : ''}`);
  return `${rows.length} rows x ${REQUIRED.length} fields`;
});

check('every billingLane resolves to a declared lane (VB-1)', () => {
  const bad = rows.filter(r => !laneKeys.has(fieldOf(r, 'billingLane') || ''));
  assert(bad.length === 0, `undefined lanes -> ${bad.map(r => `${r.id}:${fieldOf(r, 'billingLane')}`).join(', ')}`);
  return `${rows.length} rows map onto ${laneKeys.size} declared lanes`;
});

check('lane <-> credential <-> endpoint coherence (VB-1)', () => {
  const bad = [];
  for (const row of rows) {
    const lane = fieldOf(row, 'billingLane');
    const contract = LANE_CONTRACT[lane];
    if (!contract) { bad.push(`${row.id}:no-contract-for-${lane}`); continue; }
    const cred = fieldOf(row, 'credential') || '';
    const endpoint = fieldOf(row, 'endpointFamily') || '';
    if (!contract.credential.test(cred)) bad.push(`${row.id}:credential-vs-${lane}`);
    if (!contract.endpoint.test(endpoint)) bad.push(`${row.id}:endpoint-vs-${lane}`);
  }
  assert(bad.length === 0, `incoherent -> ${bad.join(', ')}`);
  return 'every row agrees with its lane contract';
});

check('every status is from the declared vocabulary (VB-7)', () => {
  const bad = rows.filter(r => !statusKeys.has(fieldOf(r, 'status') || ''));
  assert(bad.length === 0, `undeclared status -> ${bad.map(r => `${r.id}:${fieldOf(r, 'status')}`).join(', ')}`);
  return `${statusKeys.size} declared statuses, all rows conform`;
});

check('authority is from a closed set and only one final decider exists (VB-6)', () => {
  const ALLOWED = new Set(['advisory', 'none', 'final-decider', 'gate-owner', 'builder-only']);
  const bad = []; let finalDeciders = [];
  for (const row of rows) {
    // Split on whitespace, ';' or '(' ONLY. Including '-' here split hyphenated
    // values like gate-owner into 'gate' and failed three valid rows.
    const value = (fieldOf(row, 'authority') || '').split(/[\s;(]/)[0].trim();
    if (!ALLOWED.has(value)) bad.push(`${row.id}:${value}`);
    if (value === 'final-decider') finalDeciders.push(row.id);
  }
  assert(bad.length === 0, `unknown authority -> ${bad.join(', ')}`);
  assert(finalDeciders.length <= 1, `multiple final deciders -> ${finalDeciders.join(', ')}`);
  return `authority values valid; final decider: ${finalDeciders[0] || 'none'}`;
});

check('every cited file:line resolves on disk (VB-2)', () => {
  const unresolved = []; let total = 0;
  for (const row of rows) {
    const source = fieldOf(row, 'source') || '';
    // A token counts as a CITATION only if it carries a line number or a directory:
    // a bare 'consult-ox.mjs' inside prose is a mention, not a path claim.
    const cited = [...source.matchAll(CITATION)].filter(([, path, line]) => line !== undefined || path.includes('/'));
    if (cited.length === 0) { unresolved.push(`${row.id}:no-citation`); continue; }
    for (const [, path, line] of cited) {
      total += 1;
      if (!resolveCitation(path)) unresolved.push(`${row.id}:${path}${line ? `:${line}` : ''}`);
    }
  }
  assert(unresolved.length === 0, `unresolved -> ${unresolved.slice(0, 8).join(', ')}${unresolved.length > 8 ? ` (+${unresolved.length - 8})` : ''}`);
  return `${total} citations resolved across ${rows.length} rows`;
});

check('no credential VALUE and no credential LENGTH is present (VB-4, SH-2)', () => {
  const offenders = [];
  const shapes = [
    [/sk-[A-Za-z0-9_-]{16,}/, 'openai-shaped'],
    [/AIza[0-9A-Za-z_-]{20,}/, 'google-shaped'],
    [/eyJ[A-Za-z0-9_-]{10,}\./, 'jwt-shaped'],
    [/\bwhsec_[A-Za-z0-9]{10,}/, 'webhook-shaped'],
    [/\bxoxb-[A-Za-z0-9-]{10,}/, 'slack-shaped'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'pem'],
    [/postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i, 'db-url'],
    [/[A-Fa-f0-9]{32,}/, 'long-hex-run'],
    [/\blen(?:gth)?\s*[:=]?\s*\d{2,}\b/i, 'credential-length'],
  ];
  for (const [shape, label] of shapes) if (shape.test(text)) offenders.push(label);
  for (const row of rows) {
    const ref = (fieldOf(row, 'credential') || '').match(/reference:\s*([^,}]+)/);
    if (ref) {
      const value = ref[1].trim().replace(/^["']|["']$/g, '');
      if (/^[A-Za-z0-9_\-]{24,}$/.test(value) && !/^[A-Z0-9_]+$/.test(value)) offenders.push(`${row.id}:reference-shaped-like-a-key`);
    }
  }
  assert(offenders.length === 0, `possible secret material -> ${offenders.join(', ')}`);
  return 'references are NAMES only; no lengths recorded';
});

check('GLM is never paired with an OpenRouter endpoint (WL-1 regression)', () => {
  const mispaired = rows.filter(r => {
    const lane = fieldOf(r, 'billingLane');
    const endpoint = fieldOf(r, 'endpointFamily') || '';
    const isZaiSubscription = lane === 'subscription-zai';
    return isZaiSubscription && /openrouter\.ai/.test(endpoint);
  });
  assert(mispaired.length === 0, `zai-subscription rows pointing at OpenRouter -> ${mispaired.map(r => r.id).join(', ')}`);
  const blocked = rows.filter(r => fieldOf(r, 'status') === 'BLOCKED');
  return `${blocked.length} row(s) marked BLOCKED; no subscription row points at OpenRouter`;
});

check('Fable 5.1 is keyed to the catalog id and not promoted (VB-5)', () => {
  const row = rows.find(r => r.id === 'anthropic/claude-fable-5.1');
  assert(row, 'catalog-keyed row anthropic/claude-fable-5.1 absent');
  assert(fieldOf(row, 'status') === 'CANDIDATE', `expected CANDIDATE, got ${fieldOf(row, 'status')}`);
  const source = fieldOf(row, 'source') || '';
  assert(/catalog/i.test(source), 'no catalog evidence recorded on the candidate row');
  const stray = rows.filter(r => /claude-fable-5-1(?![\d.])/.test(r.id));
  assert(stray.length === 0, `docs-spelling row still present -> ${stray.map(r => r.id).join(', ')}`);
  return 'catalog id; candidate; no docs-spelling row remains';
});

check('renamed-away defects stay closed (regression set)', () => {
  const notes = (id) => (fieldOf(rows.find(r => r.id === id) || { body: '' }, 'notes') || '');
  assert(/ZAI_API_KEY/.test(fieldOf(rows.find(r => r.id === 'stealth/ox-alpha') || { body: '' }, 'credential') || ''), 'ox seat is not on the Z.ai credential');
  assert(/CE-8 correction/.test(notes('stealth/ox-alpha')), 'ox row does not carry the CE-8 correction');
  assert(/MR-1 accepted/.test(notes('deepseek-v4.1-flash')), 'deepseek row does not carry the MR-1 correction');
  assert(/CE-10/.test(notes('glm-5.3')), 'glm row does not carry the process-env absence (CE-10)');
  return 'ox lane, CE-8, MR-1 and CE-10 dispositions present';
});

check('every open decision has an owner, a review date and an interim default (DQ-3)', () => {
  const body = sliceSection('openDecisions');
  const entries = body.split(/\n {2}- id: /).slice(1);
  assert(entries.length >= 9, `expected >=9 decisions, found ${entries.length}`);
  const missing = [];
  entries.forEach((entry, i) => {
    const id = (entry.match(/^(\S+)/) || [])[1] || `#${i}`;
    for (const field of ['owner', 'reviewBy', 'ifUnresolved', 'why']) {
      if (!new RegExp(`^ {4}${field}:`, 'm').test(entry)) missing.push(`${id}:${field}`);
    }
  });
  assert(missing.length === 0, `incomplete decisions -> ${missing.join(', ')}`);
  return `${entries.length} decisions, all owned and dated`;
});

check('the inertness claim is stated with its qualifications (IN-1)', () => {
  const header = text.slice(0, text.indexOf('\nmodels:'));
  assert(/INERT CONFIGURATION DATA/.test(header), 'header does not scope the inertness claim');
  assert(/Nothing \*routes\* on it|nothing under .DSH_HOME\s+boots it/.test(header), 'header does not distinguish load from route');
  assert(/inert load.{0,40}not.{0,20}inert effect|inert load" is not "inert effect/i.test(header), 'IN-2 qualification missing');
  return 'inertness claim scoped to routing, with the load-vs-effect qualification';
});

check('no provider inference was attempted by this validator (VB-3)', () => {
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  const specifiers = [
    ...[...self.matchAll(/^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/gm)].map(m => m[1]),
    ...[...self.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
    ...[...self.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
  ];
  const NETWORKISH = /^(node:)?(http|https|http2|net|dgram|tls|dns|child_process|worker_threads)$/;
  const reachable = specifiers.filter(s => NETWORKISH.test(s));
  assert(reachable.length === 0, `network/process module reachable -> ${reachable.join(', ')}`);
  return `model_calls=0; ${specifiers.length} static import(s): ${specifiers.join(', ')}`;
});

// ------------------------------- report -------------------------------------
const width = Math.max(...checks.map(c => c.name.length));
console.log(`provider-registry.check @ ${new Date().toISOString()}`);
console.log(`target: ${registryPath}`);
console.log(`rows: ${rows.length}   lanes: ${laneKeys.size}   statuses: ${statusKeys.size}   model_calls: 0\n`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(width)}  ${c.detail}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
