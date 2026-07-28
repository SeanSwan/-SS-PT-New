/**
 * Blueprint: P0 Mobbin learning evidence-gate regression tests.
 * Verifies identity, inspection, privacy, dedupe, budget, kill switch, and audit behavior.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { validateEvidence, writeEvidence } from './evidence-gate.mjs';

const policy = {
  schemaVersion: 'evidence/2',
  deniedFields: ['connector_url', 'cookie', 'email', 'raw_content', 'screenshot', 'screenshot_url', 'token'],
  requiredDedupeKeys: ['k1', 'k2', 'k3', 'k4', 'k5'],
};
const registry = {
  actors: [{ id: 'codex-researcher', status: 'active', roles: ['researcher'] }],
};
const control = {
  killSwitch: false,
  mode: 'manual',
  weeklyCaps: { runs: 12, reviewedResults: 144, flowsOpened: 36 },
};

function validEvidence(overrides = {}) {
  return {
    schema_version: 'evidence/2',
    evidence_id: 'ev-2026-07-19-001',
    run_id: 'run-2026-w29-001',
    actor_id: 'codex-researcher',
    source_vendor: 'mobbin',
    source_type: 'flow',
    source_ref: 'opaque-reference-17',
    observed_at: '2026-07-19T12:00:00.000Z',
    query: 'fitness onboarding progress review',
    inspection: {
      inspected_by: 'codex-researcher',
      inspected_at: '2026-07-19T12:05:00.000Z',
      surfaces_opened: 3,
      notes: 'Opened the flow and checked sequence, hierarchy, and state transitions.',
    },
    observations: [{
      design_question: 'How is progress disclosed?',
      principle: 'Reveal the next milestone beside the current state.',
      swan_translation: 'Use a truthful next-action card beside real workout progress.',
      confidence: 0.78,
    }],
    dedupe: { k1: 'mobbin:opaque-reference-17', k2: 'mobbin:fitness:flow:onboarding:ios', k3: 'mobbin:onboarding:step-3:ios', k4: 'progress-review:flow:fitness:onboarding', k5: 'next-milestone:progress-review:client' },
    governance: { week: '2026-W29', usage: { runs: 1, reviewedResults: 3, flowsOpened: 1 } },
    ...overrides,
  };
}

function validate(record, options = {}) {
  return validateEvidence(record, { policy, registry, control, existingKeys: [], ...options });
}

describe('validateEvidence', () => {
  it('accepts inspected, distilled evidence from an active registered actor', () => {
    assert.deepEqual(validate(validEvidence()), { ok: true, errors: [] });
  });

  it('rejects records without a substantive inspection block', () => {
    const record = validEvidence({ inspection: { inspected_by: 'codex-researcher', surfaces_opened: 0, notes: '' } });
    const result = validate(record);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /inspection/i);
  });

  it('rejects recursively nested denied fields', () => {
    const record = validEvidence();
    record.observations[0].screenshot_url = 'https://private.example/screen';
    const result = validate(record);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /screenshot_url/);
  });

  it('rejects unknown fields so the writer matches the closed evidence/2 schema', () => {
    const result = validate(validEvidence({ unreviewed_payload: 'not part of the contract' }));
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /unknown field.*unreviewed_payload/i);
  });

  it('rejects non-Mobbin vendors and unsupported reference types', () => {
    assert.match(validate(validEvidence({ source_vendor: 'other' })).errors.join('\n'), /source_vendor/i);
    assert.match(validate(validEvidence({ source_type: 'article' })).errors.join('\n'), /source_type/i);
  });
  it('rejects unregistered actors and identity mismatches', () => {
    const result = validate(validEvidence({ actor_id: 'unknown-agent' }));
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /registered active actor/i);
  });

  it('rejects a duplicate when any K1-K5 identity key already exists', () => {
    const result = validate(validEvidence(), { existingKeys: ['k4:progress-review:flow:fitness:onboarding'] });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /duplicate k4/i);
  });

  it('rejects exhausted budgets and an active kill switch', () => {
    const overBudget = validEvidence();
    overBudget.governance.usage.runs = 13;
    assert.match(validate(overBudget).errors.join('\n'), /runs cap/i);
    assert.match(validate(validEvidence(), { control: { ...control, killSwitch: true } }).errors.join('\n'), /kill switch/i);
  });
});

describe('writeEvidence', () => {
  it('writes accepted evidence and an append-only audit receipt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mobbin-evidence-'));
    const result = await writeEvidence(validEvidence(), {
      policy, registry, control, existingKeys: [],
      evidenceDir: join(root, 'evidence'),
      auditPath: join(root, 'audit.jsonl'),
    });
    assert.equal(result.ok, true);
    assert.deepEqual(JSON.parse(await readFile(result.evidencePath, 'utf8')), validEvidence());
    const audit = JSON.parse((await readFile(join(root, 'audit.jsonl'), 'utf8')).trim());
    assert.equal(audit.decision, 'accepted');
    assert.equal(audit.evidence_id, 'ev-2026-07-19-001');
  });

  it('appends accepted K1-K5 values to the dedupe ledger', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mobbin-ledger-'));
    const ledgerPath = join(root, 'dedupe.jsonl');
    await writeEvidence(validEvidence(), {
      policy, registry, control, existingKeys: [], ledgerPath,
      evidenceDir: join(root, 'evidence'), auditPath: join(root, 'audit.jsonl'),
    });
    const rows = (await readFile(ledgerPath, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map((row) => row.key), ['k1', 'k2', 'k3', 'k4', 'k5']);
  });

  it('audits rejected writes without creating evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mobbin-reject-'));
    const result = await writeEvidence(validEvidence({ actor_id: 'unknown-agent' }), {
      policy, registry, control, existingKeys: [],
      evidenceDir: join(root, 'evidence'), auditPath: join(root, 'audit.jsonl'),
    });
    assert.equal(result.ok, false);
    const audit = JSON.parse((await readFile(join(root, 'audit.jsonl'), 'utf8')).trim());
    assert.equal(audit.decision, 'rejected');
  });
});

it('publishes an evidence/2 JSON Schema with inspection and observation contracts', async () => {
  const schema = JSON.parse(await readFile(new URL('./evidence-v2.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.$id, 'https://swanstudios.com/schemas/design-learning/evidence-2.json');
  assert.equal(schema.properties.schema_version.const, 'evidence/2');
  assert.ok(schema.required.includes('inspection'));
  assert.ok(schema.required.includes('observations'));
  assert.equal(schema.additionalProperties, false);
});

