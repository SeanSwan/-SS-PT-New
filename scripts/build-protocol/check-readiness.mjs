#!/usr/bin/env node
/** Mega Blueprints receipt integrity gate. No writes, models or network.
 * Checks completeness, phase and source hashes; humans/agents still review
 * the evidence. A valid manifest cannot prove that claimed test results are true.
 */
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = ['baseline', 'requirements', 'blueprint', 'flowchart', 'contracts',
  'tests', 'traceability', 'slices', 'review', 'preservation'];
const CONDITIONAL = ['wireframes', 'state', 'sequence', 'erd', 'permissions', 'privacy', 'operations'];
const nonempty = x => typeof x === 'string' && Boolean(x.trim());
const hash = x => createHash('sha256').update(x).digest('hex');
function confined(root, file) {
  const rel = relative(root, file);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function validateReceipt(packet, root) {
  const errors = [];
  if (!packet || typeof packet !== 'object') return ['Receipt must be an object.'];
  if (packet.schemaVersion !== 1) errors.push('Unsupported schemaVersion.');
  if (!['plan', 'implementation'].includes(packet.phase)) errors.push('Invalid phase.');
  if (typeof packet.ui !== 'boolean') errors.push('ui must explicitly be true or false.');
  if (!Array.isArray(packet.blockers) || packet.blockers.length) errors.push('Open or unspecified blockers.');
  if (!nonempty(packet.nextSlice)) errors.push('Missing nextSlice.');
  const base = realpathSync(root);
  function evidence(items, label) {
    if (!Array.isArray(items) || !items.length) { errors.push(`${label}: missing evidence.`); return; }
    for (const item of items) {
      if (!item || !nonempty(item.path) || isAbsolute(item.path) || !/^[a-f0-9]{64}$/.test(item.sha256 || '')) {
        errors.push(`${label}: invalid evidence reference.`); continue;
      }
      const target = resolve(base, item.path);
      try {
        if (!confined(base, target) || !confined(base, realpathSync(target))) throw Error('outside packet root');
        const stat = statSync(target);
        if (!stat.isFile() || stat.size === 0 || stat.size > 32 * 1024 * 1024) throw Error('invalid evidence file');
        if (hash(readFileSync(target)) !== item.sha256) throw Error('stale hash');
      } catch (e) { errors.push(`${label}: ${item.path}: ${e.message}`); }
    }
  }
  for (const id of [...CORE, ...CONDITIONAL]) {
    const entry = packet.sections?.[id];
    if (entry?.status === 'N/A' && CONDITIONAL.includes(id) && !(id === 'wireframes' && packet.ui)) {
      if (!nonempty(entry.reason)) errors.push(`${id}: N/A requires a reason.`);
    } else if (entry?.status === 'COMPLETE') evidence(entry.evidence, id);
    else errors.push(`${id}: required category is not complete.`);
  }
  const requirements = Array.isArray(packet.requirements) ? packet.requirements : [];
  const tests = Array.isArray(packet.tests) ? packet.tests : [];
  if (!requirements.length) errors.push('No requirements.');
  if (!tests.length) errors.push('No tests.');
  const reqIds = new Set(requirements.map(x => x?.id));
  const testIds = new Set(tests.map(x => x?.id));
  if (reqIds.size !== requirements.length || testIds.size !== tests.length) errors.push('Duplicate IDs.');
  for (const req of requirements) {
    if (!nonempty(req?.id) || !nonempty(req?.acceptance)) errors.push('Requirement needs ID and acceptance.');
    if (!Array.isArray(req?.tests) || !req.tests.length || req.tests.some(id => !testIds.has(id))) {
      errors.push(`${req?.id}: missing or unresolved tests.`);
    }
  }
  for (const t of tests) {
    if (!nonempty(t?.id) || !nonempty(t?.command)) errors.push('Test needs ID and command/procedure.');
    if (!Array.isArray(t?.requirements) || !t.requirements.length || t.requirements.some(id => !reqIds.has(id))) {
      errors.push(`${t?.id}: orphan test.`);
    }
    if (!['PASS', 'EXPECTED RED', 'NOT RUN', 'BLOCKED', 'FAIL'].includes(t?.status)) errors.push(`${t?.id}: invalid status.`);
    if (t?.status === 'FAIL' || t?.status === 'BLOCKED') errors.push(`${t.id}: unresolved ${t.status}.`);
    if (packet.phase === 'implementation' && t?.status !== 'PASS') errors.push(`${t?.id}: implementation test is not PASS.`);
    if (t?.status === 'NOT RUN') {
      if (!nonempty(t.reason)) errors.push(`${t.id}: NOT RUN requires a reason.`);
    } else evidence(t?.evidence, t?.id);
    if (t?.status === 'EXPECTED RED' && !nonempty(t.reason)) errors.push(`${t.id}: expected failure reason missing.`);
  }
  for (const req of requirements) for (const id of req?.tests || []) {
    if (!tests.find(t => t?.id === id)?.requirements?.includes(req.id)) errors.push(`${req.id}/${id}: traceability mismatch.`);
  }
  for (const t of tests) for (const id of t?.requirements || []) {
    if (!requirements.find(r => r?.id === id)?.tests?.includes(t.id)) errors.push(`${id}/${t.id}: traceability mismatch.`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw Error('Usage: node check-readiness.mjs RECEIPT.json [EVIDENCE_ROOT]');
    const path = resolve(process.argv[2]);
    const errors = validateReceipt(JSON.parse(readFileSync(path, 'utf8')), resolve(process.argv[3] || dirname(path)));
    process.stdout.write(`${JSON.stringify({ structurallyReady: !errors.length, errors,
      limitation: 'Reference integrity only; inspect evidence and behavior before readiness or completion claims.' }, null, 2)}\n`);
    process.exitCode = errors.length ? 1 : 0;
  } catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }
}
