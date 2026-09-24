#!/usr/bin/env node
/**
 * validate-directions.mjs — the Direction Registry gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * A registry that is only prose drifts. The Design Brain already learned this once:
 * `design.html` and `design.md` carry a paired-update ban because divergence makes the
 * mirror a liar. This file is the same lesson applied to directions — it makes the
 * registry fail loudly instead of decaying quietly.
 *
 * WHAT IT MEASURES RATHER THAN TRUSTS
 * -----------------------------------
 * A direction never gets to assert its own contrast. It declares `contrast_pairs` as
 * ROLE NAMES, and this file resolves them against that direction's own palette and
 * computes WCAG 2.x relative luminance. A direction that writes a flattering number
 * into a comment cannot pass; only the arithmetic counts.
 *
 * Where a pair legitimately cannot pass, it goes in `contrast_exceptions` with a
 * compensating mechanism — and this file still computes the value and fails if the
 * recorded number has drifted. An exception must stay honest, not just be declared.
 *
 * It found a real one on its first run: `codex-restraint`'s source mockup used
 * `#6b7280` for 11px metadata at 4.00:1, below AA. The direction registers the
 * corrected `#7C8492` at 5.13:1 and the mockup was fixed to match.
 *
 * Zero dependencies, matching the rest of scripts/design-brain.
 *
 * Usage:  node scripts/design-brain/directions/validate-directions.mjs [--json] [--strict]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const DIRS = path.join(REPO_ROOT, 'docs', 'ai-workflow', 'design-brain', 'directions');

/** The closed seven, fixed in prompter/lib/design-bridge.mjs:40 (PALETTE_ROLES). */
export const REQUIRED_ROLES = ['ground', 'surface', 'panel', 'text', 'muted', 'focus', 'rare'];

/** The Brain's own ladder vocabulary, on top of the required seven. */
export const OPTIONAL_ROLES = [
  'ground-2', 'panel-hi', 'panel-sunk', 'line', 'line-hi',
  'text-dim', 'on-accent', 'third', 'danger', 'warn', 'ok',
];

export const ALLOWED_ROLES = [...REQUIRED_ROLES, ...OPTIONAL_ROLES];

const STATUSES = ['canonical', 'experimental', 'quarantined'];
const SCOPES = ['product', 'operator', 'marketing', 'internal-tool', 'experiment'];
const HEX = /^#[0-9A-Fa-f]{6}$/;
const ID_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** Tolerance for an exception's recorded number against the computed one. */
const EXCEPTION_TOLERANCE = 0.05;

// ── WCAG 2.x relative luminance ────────────────────────────────────────────────

function srgbToLinear(channel255) {
  const s = channel255 / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Extraction ─────────────────────────────────────────────────────────────────

/**
 * Pull the canonical payload out of a direction's markdown.
 * The fenced ```json direction block is the single source of truth — the prose
 * around it is commentary. Two files would drift; one block cannot.
 */
export function extractDirectionBlock(markdown) {
  const m = /```json direction\r?\n([\s\S]*?)```/.exec(markdown);
  if (!m) return { ok: false, error: 'no ```json direction block found' };
  try {
    return { ok: true, value: JSON.parse(m[1]) };
  } catch (e) {
    return { ok: false, error: `the json direction block is not valid JSON: ${e.message}` };
  }
}

// ── Structural validation ──────────────────────────────────────────────────────

function requireString(errors, obj, key, label) {
  if (typeof obj[key] !== 'string' || obj[key].length === 0) {
    errors.push(`${label}: "${key}" must be a non-empty string`);
    return false;
  }
  return true;
}

export function validateDirection(dir, expectedId) {
  const errors = [];
  const E = (msg) => errors.push(msg);

  if (dir.schema !== 'swan-direction/1') E(`schema must be "swan-direction/1", got ${JSON.stringify(dir.schema)}`);
  if (!ID_RE.test(dir.id || '')) E(`id must match ${ID_RE}, got ${JSON.stringify(dir.id)}`);
  if (expectedId && dir.id !== expectedId) E(`id "${dir.id}" must equal the filename stem "${expectedId}"`);
  requireString(errors, dir, 'name', dir.id || '?');
  if (!SEMVER.test(dir.version || '')) E(`version must be semver, got ${JSON.stringify(dir.version)}`);
  if (!STATUSES.includes(dir.status)) E(`status must be one of ${STATUSES.join(' | ')}, got ${JSON.stringify(dir.status)}`);

  if (!Array.isArray(dir.scope) || dir.scope.length === 0) {
    E('scope must be a non-empty array');
  } else {
    for (const s of dir.scope) if (!SCOPES.includes(s)) E(`scope "${s}" is not one of ${SCOPES.join(' | ')}`);
  }

  requireString(errors, dir, 'feel', dir.id || '?');
  if (typeof dir.feel === 'string' && dir.feel.length > 240) E('feel must be <= 240 characters');

  // ── palette ──────────────────────────────────────────────────────────────────
  const pal = dir.palette;
  if (!pal || typeof pal !== 'object' || Array.isArray(pal)) {
    E('palette must be an object');
  } else {
    for (const role of REQUIRED_ROLES) {
      if (!(role in pal)) E(`palette is missing the required role "${role}" (the closed seven)`);
    }
    for (const [role, value] of Object.entries(pal)) {
      if (!ALLOWED_ROLES.includes(role)) E(`palette role "${role}" is not in the allowed set — the schema is closed`);
      if (typeof value !== 'string' || !HEX.test(value)) E(`palette.${role} must be a 6-digit hex, got ${JSON.stringify(value)}`);
    }
  }

  // ── contrast: MEASURED, never trusted ────────────────────────────────────────
  const pairs = Array.isArray(dir.contrast_pairs) ? dir.contrast_pairs : null;
  if (!pairs || pairs.length === 0) {
    E('contrast_pairs must be a non-empty array — a direction with no measured pairs is a guess');
  } else if (pal && typeof pal === 'object') {
    for (const [i, pair] of pairs.entries()) {
      const where = `contrast_pairs[${i}]`;
      if (!pair || typeof pair !== 'object') { E(`${where} must be an object`); continue; }
      for (const key of ['fg', 'bg', 'role']) {
        if (typeof pair[key] !== 'string' || pair[key].length === 0) E(`${where}.${key} must be a non-empty string`);
      }
      if (typeof pair.min !== 'number') { E(`${where}.min must be a number`); continue; }
      if (typeof pair.fg !== 'string' || typeof pair.bg !== 'string') continue;
      if (!(pair.fg in pal)) { E(`${where}.fg "${pair.fg}" is not a role in this direction's palette`); continue; }
      if (!(pair.bg in pal)) { E(`${where}.bg "${pair.bg}" is not a role in this direction's palette`); continue; }
      const measured = contrastRatio(pal[pair.fg], pal[pair.bg]);
      if (measured < pair.min) {
        E(
          `${where}: ${pair.fg} on ${pair.bg} measures ${measured.toFixed(2)}:1, below the declared minimum ` +
          `${pair.min}:1 (${pair.role}). Either fix the values or declare it in contrast_exceptions WITH a compensating mechanism.`
        );
      }
    }
  }

  // ── exceptions must stay honest ──────────────────────────────────────────────
  const exceptions = dir.contrast_exceptions;
  if (exceptions !== undefined && !Array.isArray(exceptions)) {
    E('contrast_exceptions must be an array');
  } else if (Array.isArray(exceptions) && pal && typeof pal === 'object') {
    for (const [i, ex] of exceptions.entries()) {
      const where = `contrast_exceptions[${i}]`;
      if (!ex || typeof ex !== 'object') { E(`${where} must be an object`); continue; }
      for (const key of ['fg', 'bg', 'reason', 'compensated_by']) {
        if (typeof ex[key] !== 'string' || ex[key].length === 0) E(`${where}.${key} must be a non-empty string`);
      }
      if (typeof ex.compensated_by === 'string' && ex.compensated_by.length < 20) {
        E(`${where}.compensated_by must be a real mechanism (>= 20 chars) — an exception without one is a bug wearing a justification`);
      }
      if (typeof ex.reason === 'string' && ex.reason.length < 20) {
        E(`${where}.reason must be a real explanation (>= 20 chars)`);
      }
      if (typeof ex.fg !== 'string' || typeof ex.bg !== 'string') continue;
      if (!(ex.fg in pal)) { E(`${where}.fg "${ex.fg}" is not a role in this direction's palette`); continue; }
      if (!(ex.bg in pal)) { E(`${where}.bg "${ex.bg}" is not a role in this direction's palette`); continue; }
      const measured = contrastRatio(pal[ex.fg], pal[ex.bg]);
      if (typeof ex.measured !== 'number') {
        E(`${where}.measured must be a number — the recorded value is checked against the computed one`);
      } else if (Math.abs(measured - ex.measured) > EXCEPTION_TOLERANCE) {
        E(
          `${where}: recorded measured ${ex.measured} but computed ${measured.toFixed(2)} ` +
          `(tolerance ${EXCEPTION_TOLERANCE}). A stale exception number is worse than no exception.`
        );
      }
      // An exception should not be used to launder a pair that actually passes.
      if (measured >= 4.5) {
        E(`${where}: ${ex.fg} on ${ex.bg} actually measures ${measured.toFixed(2)}:1 — that passes, so it is not an exception. Move it to contrast_pairs.`);
      }
    }
  }

  // ── the rest of the contract ─────────────────────────────────────────────────
  const t = dir.type;
  if (!t || typeof t !== 'object') E('type must be an object');
  else for (const key of ['display', 'body', 'mono']) {
    if (typeof t[key] !== 'string' || t[key].length === 0) E(`type.${key} must be a non-empty string`);
  }
  if (t && typeof t === 'object') {
    // design.md section 6 bans these as DISPLAY faces. Applying the ban to `body` too
    // would be stricter than the doctrine says, and an over-wide guard is its own defect
    // (scripts/design-brain/README.md: "a fix that adds a report can be wrong in a way a
    // fix that adds a write cannot"). So: display only, and the message says what it means.
    if (typeof t.display === 'string' && /\b(Inter|Roboto|Arial|Helvetica)\b/.test(t.display)) {
      E('type.display names a banned display face — design.md section 6 bans Inter / Roboto / Arial / Helvetica as display faces');
    }
  }

  const m = dir.motion;
  if (!m || typeof m !== 'object') E('motion must be an object');
  else {
    if (!Array.isArray(m.gate) || m.gate.length < 2 || !m.gate.includes('css') || !m.gate.includes('js')) {
      E('motion.gate must include BOTH "css" and "js" — a CSS-only gate misses what GSAP drives on a timer, a JS-only gate misses CSS transitions');
    }
    if (!Number.isInteger(m.signature_budget) || m.signature_budget < 0 || m.signature_budget > 2) {
      E('motion.signature_budget must be an integer 0..2 (design.md section 1.5)');
    }
    if (!m.easings || typeof m.easings !== 'object') E('motion.easings must be an object');
    if (!m.durations || typeof m.durations !== 'object') E('motion.durations must be an object');
  }

  const g = dir.glow;
  if (!g || typeof g !== 'object') E('glow must be an object');
  else {
    if (!['dual-button', 'none', 'flat-border'].includes(g.rule)) E(`glow.rule must be dual-button | none | flat-border, got ${JSON.stringify(g.rule)}`);
    for (const key of ['primary', 'accent']) {
      if (!g[key] || typeof g[key] !== 'object') { E(`glow.${key} must be an object`); continue; }
      for (const sub of ['bg', 'glow']) {
        if (typeof g[key][sub] !== 'string') { E(`glow.${key}.${sub} must be a role name string`); continue; }
        if (pal && typeof pal === 'object' && !(g[key][sub] in pal)) {
          E(`glow.${key}.${sub} "${g[key][sub]}" is not a role in this direction's palette`);
        }
      }
    }
  }

  const sig = dir.signature;
  if (!sig || typeof sig !== 'object') E('signature must be an object');
  else {
    if (typeof sig.name !== 'string' || sig.name.length < 3) E('signature.name is required — a direction without a signature is a palette, not a direction');
    if (typeof sig.device !== 'string' || sig.device.length < 20) E('signature.device must describe the actual device (>= 20 chars)');
  }

  if (!Array.isArray(dir.evidence) || dir.evidence.length === 0) {
    E('evidence must be non-empty — a direction with no built artifact is a proposal and must say so');
  }
  if (dir.match_terms !== undefined && !Array.isArray(dir.match_terms)) E('match_terms must be an array');
  if (dir.ground_inverts !== undefined && typeof dir.ground_inverts !== 'boolean') E('ground_inverts must be a boolean');

  return errors;
}

// ── Registry-wide checks ───────────────────────────────────────────────────────

export function validateRegistry({ registry, directions }) {
  const errors = [];
  const E = (msg) => errors.push(msg);

  if (registry.schema !== 'swan-direction-registry/1') E(`registry.schema must be "swan-direction-registry/1"`);
  const listed = Array.isArray(registry.directions) ? registry.directions : [];
  if (listed.length === 0) E('registry.directions must be a non-empty array');

  const listedById = new Map(listed.map((d) => [d.id, d]));
  const loadedById = new Map(directions.map((d) => [d.dir.id, d]));

  // registry <-> files must agree, both ways. Drift is the failure mode this catches.
  for (const [id, entry] of listedById) {
    const loaded = loadedById.get(id);
    if (!loaded) { E(`registry lists "${id}" but no ${id}.md was loaded`); continue; }
    if (entry.status !== loaded.dir.status) E(`registry says ${id}.status = ${entry.status}, the file says ${loaded.dir.status}`);
    if (entry.theme_id !== loaded.dir.theme_id) E(`registry says ${id}.theme_id = ${JSON.stringify(entry.theme_id)}, the file says ${JSON.stringify(loaded.dir.theme_id)}`);
    if (Boolean(entry.ground_inverts) !== Boolean(loaded.dir.ground_inverts)) E(`registry says ${id}.ground_inverts = ${entry.ground_inverts}, the file says ${loaded.dir.ground_inverts}`);
    const a = JSON.stringify(entry.scope || []);
    const b = JSON.stringify(loaded.dir.scope || []);
    if (a !== b) E(`registry says ${id}.scope = ${a}, the file says ${b}`);
    if (entry.signature !== loaded.dir.signature?.name) E(`registry says ${id}.signature = ${JSON.stringify(entry.signature)}, the file says ${JSON.stringify(loaded.dir.signature?.name)}`);
  }
  for (const id of loadedById.keys()) {
    if (!listedById.has(id)) E(`direction file ${id}.md exists but is not listed in registry.json`);
  }

  // match_terms must discriminate. A term in two directions makes selection ambiguous
  // and quietly collapses the registry back to one answer.
  const termOwner = new Map();
  for (const { dir } of directions) {
    for (const term of dir.match_terms || []) {
      if (termOwner.has(term)) {
        E(`match_terms collision: "${term}" is claimed by both "${termOwner.get(term)}" and "${dir.id}" — selection would be ambiguous`);
      } else {
        termOwner.set(term, dir.id);
      }
    }
  }

  // Breadth rule (directions/README.md section 6): a registry of dark-first directions
  // is breadth theater with extra steps. The threshold is 2+ SELECTABLE directions —
  // a single-direction registry makes no variety claim, so there is nothing to fail yet.
  const eligible = directions.filter((d) => d.dir.status !== 'quarantined');
  if (eligible.length >= 2 && !eligible.some((d) => d.dir.ground_inverts === true)) {
    E(`breadth rule: with ${eligible.length} selectable directions, at least one must invert the ground (ground_inverts: true). A registry of dark-first directions is breadth theater with extra steps.`);
  }

  // Signature devices must be distinct, or two directions differ only by hue.
  const sigOwner = new Map();
  for (const { dir } of directions) {
    const name = dir.signature?.name;
    if (!name) continue;
    if (sigOwner.has(name)) E(`two directions share the signature "${name}" (${sigOwner.get(name)} and ${dir.id}) — they differ only in hue, which is one direction, not two`);
    else sigOwner.set(name, dir.id);
  }

  // known_themes accounting must add up.
  const kt = registry.known_themes;
  if (kt && Array.isArray(kt.themes)) {
    const covered = kt.themes.filter((t) => t.direction).length;
    const uncovered = kt.themes.length - covered;
    if (kt.covered !== covered) E(`known_themes.covered says ${kt.covered}, the list has ${covered}`);
    if (kt.uncovered !== uncovered) E(`known_themes.uncovered says ${kt.uncovered}, the list has ${uncovered}`);
    for (const t of kt.themes) {
      if (t.direction && !listedById.has(t.direction)) E(`known_themes "${t.theme_id}" points at direction "${t.direction}" which is not in registry.directions`);
    }
    for (const [id, entry] of listedById) {
      if (entry.theme_id && !kt.themes.some((t) => t.theme_id === entry.theme_id)) {
        E(`direction "${id}" claims theme_id "${entry.theme_id}" which is not in known_themes`);
      }
    }
  }

  return errors;
}

// ── Load + run ─────────────────────────────────────────────────────────────────

export function loadRegistry({ dirs = DIRS } = {}) {
  const registryPath = path.join(dirs, 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const files = fs.readdirSync(dirs).filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'LEDGER.md' && f !== 'REVIEW-HANDOFF.md');
  const directions = [];
  const errors = [];
  for (const file of files) {
    const id = file.replace(/\.md$/, '');
    const markdown = fs.readFileSync(path.join(dirs, file), 'utf8');
    const extracted = extractDirectionBlock(markdown);
    if (!extracted.ok) { errors.push(`${file}: ${extracted.error}`); continue; }
    directions.push({ file, id, dir: extracted.value });
  }
  return { registry, directions, errors };
}

function main() {
  const asJson = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');

  const { registry, directions, errors: loadErrors } = loadRegistry();
  const errors = [...loadErrors];

  for (const { file, id, dir } of directions) {
    const errs = validateDirection(dir, id);
    for (const e of errs) errors.push(`${file}: ${e}`);
  }
  errors.push(...validateRegistry({ registry, directions }));

  const report = {
    directions: directions.map(({ id, dir }) => ({
      id,
      name: dir.name,
      status: dir.status,
      theme_id: dir.theme_id ?? null,
      ground_inverts: Boolean(dir.ground_inverts),
      pairs_measured: (dir.contrast_pairs || []).map((p) => ({
        pair: `${p.fg} on ${p.bg}`,
        role: p.role,
        min: p.min,
        measured: Number(contrastRatio(dir.palette[p.fg], dir.palette[p.bg]).toFixed(2)),
      })),
      exceptions: (dir.contrast_exceptions || []).map((x) => ({
        pair: `${x.fg} on ${x.bg}`,
        recorded: x.measured,
        computed: Number(contrastRatio(dir.palette[x.fg], dir.palette[x.bg]).toFixed(2)),
      })),
    })),
    theme_coverage: registry.known_themes
      ? { covered: registry.known_themes.covered, uncovered: registry.known_themes.uncovered, total: registry.known_themes.themes.length }
      : null,
    errors,
    ok: errors.length === 0,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(`\nDirection Registry — ${directions.length} direction(s) loaded\n`);
    for (const d of report.directions) {
      console.log(`  ${d.id}  [${d.status}]${d.theme_id ? `  theme=${d.theme_id}` : ''}${d.ground_inverts ? '  GROUND-INVERTING' : ''}`);
      for (const p of d.pairs_measured) {
        const flag = p.measured >= p.min ? 'ok  ' : 'FAIL';
        console.log(`      ${flag} ${p.pair.padEnd(34)} ${String(p.measured).padStart(6)}:1  (min ${p.min})  ${p.role}`);
      }
      for (const x of d.exceptions) {
        console.log(`      EXC  ${x.pair.padEnd(34)} ${String(x.computed).padStart(6)}:1  recorded ${x.recorded}`);
      }
    }
    if (report.theme_coverage) {
      const t = report.theme_coverage;
      console.log(`\n  Runtime theme coverage: ${t.covered}/${t.total} themes have a direction file (${t.uncovered} uncovered)`);
    }
    if (errors.length) {
      console.log(`\n  ${errors.length} error(s):\n`);
      for (const e of errors) console.log(`    - ${e}`);
      console.log('');
    } else {
      console.log('\n  All checks passed.\n');
    }
  }

  if (errors.length) process.exit(1);
  if (strict && report.theme_coverage && report.theme_coverage.uncovered > 0) {
    if (!asJson) console.log(`  --strict: ${report.theme_coverage.uncovered} runtime theme(s) still have no direction file.\n`);
    process.exit(2);
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
