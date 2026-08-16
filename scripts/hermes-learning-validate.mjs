#!/usr/bin/env node
/**
 * hermes-learning-validate — the CONTRACT for the Hermes durable learning corpus.
 *
 * WHY THIS EXISTS
 *   18 packets had 8 distinct frontmatter shapes because every one was hand-written from
 *   memory and nothing checked them. Kimi K3 (2026-08-13) ranked a validator above an emitter:
 *   "the validator is the contract, the emitter is merely one producer of it." A validator that
 *   only accepts generated output cannot migrate a hand-written corpus — so this deliberately
 *   validates ANY packet, however it was produced.
 *
 * WHAT IT IS NOT
 *   Not an emitter. Not an indexer. Not a secret scanner for git history (that is a separate
 *   one-time job over all refs — this only sees the working tree).
 *
 * CONTRACT LIVES IN DATA, NOT HERE
 *   docs/ai-workflow/hermes-learning-packets/_schema.json — so the contract is inspectable and
 *   diffable. Changing what is required is a data change with a changelog entry, not a code edit.
 *
 * USAGE
 *   node scripts/hermes-learning-validate.mjs                  # validate the whole corpus
 *   node scripts/hermes-learning-validate.mjs --check          # same, exit 2 on any error
 *   node scripts/hermes-learning-validate.mjs --file <path>    # one packet
 *   node scripts/hermes-learning-validate.mjs --json           # machine-readable, for self-repair
 *   node scripts/hermes-learning-validate.mjs --migration-spec # what the existing corpus fails
 *
 * EXIT CODES
 *   0 = no errors (warnings may exist)   2 = errors present (only with --check)   3 = bad invocation
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CORPUS = join(ROOT, 'docs', 'ai-workflow', 'hermes-learning-packets');
const SCHEMA_PATH = join(CORPUS, '_schema.json');

function die(msg) { console.error(`hermes-learning-validate: ${msg}`); process.exit(3); }

// ---------------------------------------------------------------- frontmatter

/**
 * Deliberately NOT a YAML parser. We need presence-of-key and scalar values only; pulling a YAML
 * dependency in to read six keys would be the heavier failure. Nested list items (models_used) are
 * detected as "key present with block content", which is all the contract requires.
 */
export function parseFrontmatter(src) {
  const norm = src.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { ok: false, keys: [], values: {}, body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { ok: false, keys: [], values: {}, body: norm };
  const block = norm.slice(4, end);
  const body = norm.slice(end + 4);
  const keys = [];
  const values = {};
  for (const line of block.split('\n')) {
    // Top-level keys only: no leading whitespace, no list marker.
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s?(.*)$/.exec(line);
    if (!m) continue;
    keys.push(m[1]);
    values[m[1]] = m[2].trim();
  }
  return { ok: true, keys, values, body };
}

/** A key counts as present if it has an inline scalar OR a nested block beneath it. */
function keyHasContent(src, key) {
  const norm = src.replace(/\r\n/g, '\n');
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const m = re.exec(norm);
  if (!m) return false;
  if (m[1].trim()) return true;
  const after = norm.slice(m.index + m[0].length);
  return /^\n\s+\S/.test(after); // nested block
}

/**
 * Reduce an originating_model value to its bare model id for allowlist comparison.
 *   "anthropic/claude-fable-5"                        -> "claude-fable-5"
 *   "claude-fable-5 (probe-verified); sanitizer PASS" -> "claude-fable-5"
 *   "moonshotai/kimi-k3"                              -> "kimi-k3"
 * Provider prefix and trailing prose are presentation, not identity. Keeping them in the
 * comparison manufactures false Rule 68 violations — see the tier-gate comment below.
 */
export function normaliseModelId(raw) {
  return String(raw)
    .split(/[(;,]/)[0]          // drop trailing notes: "(probe-verified)", "; sanitizer PASS"
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .split('/').pop()           // drop provider prefix: anthropic/, moonshotai/
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------- validation

export function validatePacket(path, src, schema) {
  const errors = [];
  const warnings = [];
  const name = basename(path);
  const fm = parseFrontmatter(src);

  if (!fm.ok) {
    return { path, name, errors: ['no YAML frontmatter block (must open with --- on line 1)'], warnings, date: null };
  }

  // Date drives which rules apply: retro-requiring fields on historical packets would make the
  // validator permanent noise and migration impossible.
  const fileDate = (/^(\d{4})-?(\d{2})-?(\d{2})/.exec(name) || []).slice(1, 4).join('-') || null;
  const date = fm.values.date || fileDate;

  for (const k of schema.required_frontmatter) {
    if (!keyHasContent(src, k)) errors.push(`missing required frontmatter: ${k}`);
  }

  for (const [from, keys] of Object.entries(schema.required_frontmatter_from || {})) {
    if (from.startsWith('_')) continue;
    if (!date || date < from) continue;
    for (const k of keys) {
      if (!keyHasContent(src, k)) errors.push(`missing frontmatter required for packets from ${from}: ${k}`);
    }
  }

  // Tier gate — fail-closed. A wrong originating_model poisons the corpus, so an unknown value
  // is an error, never a warning.
  //
  // NORMALISE FIRST. The first run of this validator flagged "anthropic/claude-fable-5" and
  // "claude-fable-5 (this session, probe-verified...)" as non-Fable-tier. Both ARE Fable-tier —
  // one carries a provider prefix, the other a trailing note. Naive exact-matching turned two
  // well-formed packets into fake Rule 68 violations, which is a worse failure than missing a real
  // one: a validator that cries wolf gets switched off. Compare the bare model id only.
  const model = fm.values.originating_model;
  if (model) {
    const bare = normaliseModelId(model);
    const allowed = schema.tier_allowlist.models.map(normaliseModelId);
    if (!allowed.includes(bare)) {
      errors.push(`originating_model "${model}" (normalised: "${bare}") is NOT Fable-tier — sub-Fable output must never enter the corpus (Rule 68). Allowed: ${schema.tier_allowlist.models.join(', ')}`);
    }
  }

  const status = fm.values.status;
  if (status && !schema.status_values.includes(status)) {
    errors.push(`status "${status}" is not one of: ${schema.status_values.join(', ')}`);
  }
  if (status && (schema.lifecycle.requires_reviewed_by || []).includes(status) && !keyHasContent(src, 'reviewed_by')) {
    errors.push(`status "${status}" requires reviewed_by — unreviewed knowledge is a rumour with frontmatter`);
  }

  // Headings, matched LITERALLY at line start. "## 6. Mistakes I made" does not match, and the
  // closeout gate reads an absent section as "nothing went wrong". That defect shipped 2026-08-13.
  const rh = schema.required_headings || {};
  if (!rh.from || (date && date >= rh.from)) {
    for (const h of rh.headings || []) {
      const re = new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      if (!re.test(fm.body.replace(/\r\n/g, '\n'))) {
        errors.push(`missing required heading (must match literally, unnumbered): "${h}"`);
      }
    }
  }
  for (const h of schema.recommended_headings || []) {
    const re = new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    if (!re.test(fm.body.replace(/\r\n/g, '\n'))) warnings.push(`recommended heading absent: "${h}"`);
  }

  for (const [label, pattern] of Object.entries(schema.privacy_forbidden_patterns || {})) {
    if (label.startsWith('_')) continue;
    if (new RegExp(pattern).test(src)) errors.push(`privacy: content matches forbidden pattern "${label}"`);
  }

  const sup = fm.values.supersedes;
  if (sup && sup !== 'none' && schema.warnings?.supersedes_target_must_exist) {
    const target = join(ROOT, sup.replace(/^["'`]|["'`]$/g, ''));
    if (!existsSync(target)) warnings.push(`supersedes target not found: ${sup}`);
  }
  if (schema.warnings?.reviewed_by_present && !keyHasContent(src, 'reviewed_by')) {
    warnings.push('no reviewed_by — packet is unreviewed');
  }

  return { path, name, errors, warnings, date };
}

// ---------------------------------------------------------------- cli

function main(argv) {
  const args = new Set(argv);
  const jsonOut = args.has('--json');
  const check = args.has('--check');
  const migrationSpec = args.has('--migration-spec');

  if (!existsSync(SCHEMA_PATH)) die(`schema not found at ${SCHEMA_PATH}`);
  let schema;
  try { schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')); }
  catch (e) { die(`schema is not valid JSON: ${e.message}`); }

  let files;
  const fi = argv.indexOf('--file');
  if (fi !== -1) {
    const p = argv[fi + 1];
    if (!p) die('--file requires a path');
    if (!existsSync(p)) die(`no such file: ${p}`);
    files = [p];
  } else {
    if (!existsSync(CORPUS)) die(`corpus not found at ${CORPUS}`);
    files = readdirSync(CORPUS)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'INDEX.md')
      .sort()
      .map((f) => join(CORPUS, f));
  }

  const results = files.map((f) => validatePacket(f, readFileSync(f, 'utf8'), schema));
  const bad = results.filter((r) => r.errors.length);
  const warned = results.filter((r) => !r.errors.length && r.warnings.length);

  if (jsonOut) {
    // Machine-readable so an agent can self-repair inside the turn instead of only being blocked.
    console.log(JSON.stringify({
      schema_version: schema.schema_version,
      total: results.length,
      failed: bad.length,
      results: results.map(({ name, errors, warnings, date }) => ({ name, date, errors, warnings })),
    }, null, 2));
    process.exit(check && bad.length ? 2 : 0);
  }

  console.log(`hermes-learning-validate  schema v${schema.schema_version}  ${results.length} packet(s)\n`);

  if (migrationSpec) {
    // The failure list IS the migration spec (Kimi 2026-08-13 Q6).
    const counts = new Map();
    for (const r of bad) for (const e of r.errors) {
      const k = e.replace(/"[^"]*"/g, '"…"');
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    console.log('MIGRATION SPEC — what the existing corpus fails, by frequency:\n');
    [...counts.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([e, n]) => console.log(`  ${String(n).padStart(3)}x  ${e}`));
    console.log(`\n  ${bad.length}/${results.length} packets need migration.`);
    process.exit(check && bad.length ? 2 : 0);
  }

  for (const r of results) {
    if (!r.errors.length && !r.warnings.length) continue;
    console.log(`  ${r.errors.length ? 'FAIL' : 'warn'}  ${r.name}`);
    r.errors.forEach((e) => console.log(`          ERROR  ${e}`));
    r.warnings.forEach((w) => console.log(`          warn   ${w}`));
  }

  const clean = results.length - bad.length - warned.length;
  console.log(`\n  clean: ${clean}   warnings-only: ${warned.length}   FAILING: ${bad.length}`);
  if (bad.length) console.log(`  run with --migration-spec to see what to fix, --json to self-repair`);
  process.exit(check && bad.length ? 2 : 0);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('hermes-learning-validate.mjs')) {
  main(process.argv.slice(2));
}
