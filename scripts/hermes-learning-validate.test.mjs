/**
 * Contract tests for the strict-YAML conformance warning.
 *
 * The defect this guards is subtle: the corpus can satisfy its own validator while being
 * unreadable to every standard consumer, because parseFrontmatter is deliberately naive.
 * The second, worse failure mode is a check that silently does nothing when its optional parser
 * is missing — "not checked" must never be indistinguishable from "checked and clean".
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strictYamlIssue, validatePacket } from './hermes-learning-validate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs/ai-workflow/hermes-learning-packets/_schema.json'), 'utf8'),
);

// A real parser, if present. These tests must not hard-depend on it either.
let yamlLoad = null;
try { yamlLoad = (await import('js-yaml')).default.load; } catch { /* optional */ }

const WELL_FORMED = `---
title: fine
originating_model: claude-opus-5
tier_basis: designation
date: 2026-08-18
decision: something
status: draft
privacy: x
models_used:
  - model: claude-opus-5
    role: builder
skills_touched:
  - name: x
    change: created
---

## Mistakes I made
- x

## External-model calibration
- none
`;

// The exact shape that broke 12 files: a colon-space inside an unquoted plain scalar.
const COLON_SPACE = WELL_FORMED.replace('decision: something', 'decision: CORRECTED 2026-08-16: topic left in place');

test('strictYamlIssue reports "unavailable" rather than "clean" when no parser is given', () => {
  const r = strictYamlIssue(WELL_FORMED, undefined);
  assert.equal(r?.unavailable, true, 'must be distinguishable from a clean result (null)');
  assert.notEqual(r, null, 'a missing parser must NEVER look like a pass');
});

test('strictYamlIssue passes well-formed frontmatter', { skip: !yamlLoad }, () => {
  assert.equal(strictYamlIssue(WELL_FORMED, yamlLoad), null);
});

test('strictYamlIssue catches a colon-space in an unquoted scalar', { skip: !yamlLoad }, () => {
  const r = strictYamlIssue(COLON_SPACE, yamlLoad);
  assert.ok(r?.message, 'the defect that broke 12 packets must be caught');
});

test('the naive validator ACCEPTS what the strict check rejects (the whole point)', { skip: !yamlLoad }, () => {
  // Without the strict parser: no errors, no strict warning -> looks perfect.
  const naive = validatePacket('2026-08-18-x.md', COLON_SPACE, schema);
  assert.equal(naive.errors.length, 0, 'naive parser sees nothing wrong');
  assert.equal(naive.warnings.filter((w) => /standards-compliant/.test(w)).length, 0);

  // With it: same zero errors, but now a warning exists. This gap is the finding.
  const strict = validatePacket('2026-08-18-x.md', COLON_SPACE, schema, yamlLoad);
  assert.equal(strict.errors.length, 0, 'strict yaml must WARN, never gate');
  assert.equal(strict.warnings.filter((w) => /standards-compliant/.test(w)).length, 1);
});

test('strict yaml never turns a warning into an error', { skip: !yamlLoad }, () => {
  const r = validatePacket('2026-08-18-x.md', COLON_SPACE, schema, yamlLoad);
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.length > 0);
});

test('schema can switch the strict check off', { skip: !yamlLoad }, () => {
  const off = { ...schema, warnings: { ...schema.warnings, strict_yaml: false } };
  const r = validatePacket('2026-08-18-x.md', COLON_SPACE, off, yamlLoad);
  assert.equal(r.warnings.filter((w) => /standards-compliant/.test(w)).length, 0);
});

test('schema declares strict_yaml and records why in the changelog', () => {
  assert.equal(schema.warnings.strict_yaml, true);
  const entry = schema.changelog.find((c) => c.version === schema.schema_version);
  assert.ok(entry, `changelog must carry an entry for ${schema.schema_version}`);
  assert.match(entry.why, /strict_yaml/i);
});
