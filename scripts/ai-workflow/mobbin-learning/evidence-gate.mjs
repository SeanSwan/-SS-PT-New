/**
 * Blueprint: Governed writer for distilled external-reference evidence.
 * Rejects uninspected, unidentified, duplicated, over-budget, or sensitive records.
 * This module stores observations and principles only; never raw Mobbin content.
 */
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_TEXT = [
  'schema_version', 'evidence_id', 'run_id', 'actor_id', 'source_vendor',
  'source_type', 'source_ref', 'observed_at', 'query',
];

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function findDeniedFields(value, denied, path = '$', hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findDeniedFields(item, denied, `${path}[${index}]`, hits));
    return hits;
  }
  for (const [key, nested] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (denied.has(key.toLowerCase())) hits.push(childPath);
    findDeniedFields(nested, denied, childPath, hits);
  }
  return hits;
}

function rejectUnknownFields(value, allowed, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  Object.keys(value).filter((key) => !allowed.includes(key)).forEach((key) => {
    errors.push(`unknown field at ${path}.${key}`);
  });
}
function validateInspection(inspection, actorId, errors) {
  if (!inspection || typeof inspection !== 'object') {
    errors.push('inspection block is required');
    return;
  }
  if (inspection.inspected_by !== actorId) errors.push('inspection.inspected_by must match actor_id');
  if (!isText(inspection.inspected_at) || Number.isNaN(Date.parse(inspection.inspected_at))) {
    errors.push('inspection.inspected_at must be an ISO date');
  }
  if (!Number.isInteger(inspection.surfaces_opened) || inspection.surfaces_opened < 1) {
    errors.push('inspection.surfaces_opened must be at least 1');
  }
  if (!isText(inspection.notes) || inspection.notes.trim().length < 20) {
    errors.push('inspection.notes must contain substantive inspection notes');
  }
}

function validateObservations(observations, errors) {
  if (!Array.isArray(observations) || observations.length === 0) {
    errors.push('at least one distilled observation is required');
    return;
  }
  observations.forEach((observation, index) => {
    for (const field of ['design_question', 'principle', 'swan_translation']) {
      if (!isText(observation?.[field])) errors.push(`observations[${index}].${field} is required`);
    }
    if (typeof observation?.confidence !== 'number' || observation.confidence < 0 || observation.confidence > 1) {
      errors.push(`observations[${index}].confidence must be between 0 and 1`);
    }
  });
}

function validateBudgets(governance, caps, errors) {
  const usage = governance?.usage;
  if (!isText(governance?.week)) errors.push('governance.week is required');
  if (!usage || typeof usage !== 'object') {
    errors.push('governance.usage is required');
    return;
  }
  for (const [name, cap] of Object.entries(caps ?? {})) {
    const used = usage[name];
    if (!Number.isInteger(used) || used < 0) errors.push(`${name} usage must be a non-negative integer`);
    else if (used > cap) errors.push(`${name} cap exceeded: ${used}/${cap}`);
  }
}

function validateDedupe(dedupe, requiredKeys, existingKeys, errors) {
  const known = new Set(existingKeys ?? []);
  for (const key of requiredKeys) {
    const value = dedupe?.[key];
    if (!isText(value)) errors.push(`dedupe.${key} is required`);
    else if (known.has(`${key}:${value}`)) errors.push(`duplicate ${key}: ${value}`);
  }
}

export function validateEvidence(record, { policy, registry, control, existingKeys = [] }) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['evidence must be a JSON object'] };
  }
  rejectUnknownFields(record, [
    'schema_version', 'evidence_id', 'run_id', 'actor_id', 'source_vendor',
    'source_type', 'source_ref', 'observed_at', 'query', 'inspection',
    'observations', 'dedupe', 'governance',
  ], '$', errors);
  rejectUnknownFields(record.inspection, ['inspected_by', 'inspected_at', 'surfaces_opened', 'notes'], '$.inspection', errors);
  record.observations?.forEach((item, index) => rejectUnknownFields(
    item, ['design_question', 'principle', 'swan_translation', 'confidence'], `$.observations[${index}]`, errors,
  ));
  rejectUnknownFields(record.dedupe, ['k1', 'k2', 'k3', 'k4', 'k5'], '$.dedupe', errors);
  rejectUnknownFields(record.governance, ['week', 'usage'], '$.governance', errors);
  rejectUnknownFields(record.governance?.usage, ['runs', 'reviewedResults', 'flowsOpened'], '$.governance.usage', errors);
  if (record.source_vendor !== 'mobbin') errors.push('source_vendor must be mobbin');
  if (!['screen', 'flow', 'section'].includes(record.source_type)) errors.push('source_type must be screen, flow, or section');
  if (control?.killSwitch === true) errors.push('learning kill switch is active');
  if (control?.mode !== 'manual') errors.push('P0 control mode must remain manual');
  if (record.schema_version !== policy?.schemaVersion) {
    errors.push(`schema_version must be ${policy?.schemaVersion ?? 'configured'}`);
  }
  REQUIRED_TEXT.forEach((field) => {
    if (!isText(record[field])) errors.push(`${field} is required`);
  });
  if (Number.isNaN(Date.parse(record.observed_at ?? ''))) {
    errors.push('observed_at must be an ISO date');
  }
  const actor = registry?.actors?.find((candidate) => candidate.id === record.actor_id && candidate.status === 'active');
  if (!actor) errors.push('actor_id must identify a registered active actor');
  else if (!actor.roles?.includes('researcher')) errors.push('actor_id must have the researcher role');
  validateInspection(record.inspection, record.actor_id, errors);
  validateObservations(record.observations, errors);
  validateDedupe(record.dedupe, policy?.requiredDedupeKeys ?? [], existingKeys, errors);
  validateBudgets(record.governance, control?.weeklyCaps, errors);
  const deniedHits = findDeniedFields(record, new Set((policy?.deniedFields ?? []).map((field) => field.toLowerCase())));
  deniedHits.forEach((hit) => errors.push(`denied field present: ${hit}`));
  return { ok: errors.length === 0, errors };
}

function auditRecord(record, decision, errors = []) {
  return {
    audited_at: new Date().toISOString(),
    decision,
    evidence_id: record?.evidence_id ?? null,
    run_id: record?.run_id ?? null,
    actor_id: record?.actor_id ?? null,
    source_vendor: record?.source_vendor ?? null,
    errors,
  };
}

export async function writeEvidence(record, options) {
  const validation = validateEvidence(record, options);
  await mkdir(dirname(options.auditPath), { recursive: true });
  if (!validation.ok) {
    await appendFile(options.auditPath, `${JSON.stringify(auditRecord(record, 'rejected', validation.errors))}\n`, 'utf8');
    return validation;
  }
  await mkdir(options.evidenceDir, { recursive: true });
  const safeId = record.evidence_id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const evidencePath = join(options.evidenceDir, `${safeId}.json`);
  await writeFile(evidencePath, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  if (options.ledgerPath) {
    await mkdir(dirname(options.ledgerPath), { recursive: true });
    const rows = Object.entries(record.dedupe).map(([key, value]) => ({
      recorded_at: new Date().toISOString(), key, value, evidence_id: record.evidence_id,
    }));
    await appendFile(options.ledgerPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  }
  await appendFile(options.auditPath, `${JSON.stringify(auditRecord(record, 'accepted'))}\n`, 'utf8');
  return { ok: true, errors: [], evidencePath };
}

async function loadJson(path) {
  return JSON.parse((await readFile(path, 'utf8')).replace(/^\\uFEFF/, ''));
}

async function runCli(args) {
  const values = Object.fromEntries(args.map((item) => item.split('=', 2)));
  const required = ['--input', '--evidence-dir', '--audit'];
  const missing = required.filter((key) => !values[key]);
  if (missing.length) throw new Error(`Missing arguments: ${missing.join(', ')}`);
  const base = new URL('.', import.meta.url);
  const [record, policy, registry, control] = await Promise.all([
    loadJson(values['--input']),
    loadJson(values['--policy'] ?? new URL('evidence-policy.json', base)),
    loadJson(values['--registry'] ?? new URL('identity-registry.json', base)),
    loadJson(values['--control'] ?? new URL('control.json', base)),
  ]);
  const existingKeys = values['--existing-keys'] ? (await loadJson(values['--existing-keys'])).keys ?? [] : [];
  const result = await writeEvidence(record, {
    policy, registry, control, existingKeys,
    evidenceDir: values['--evidence-dir'], auditPath: values['--audit'],
    ledgerPath: values['--dedupe-ledger'],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
