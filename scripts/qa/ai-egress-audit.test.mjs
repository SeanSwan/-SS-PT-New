import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySurface, findFindings } from './ai-egress-audit.mjs';

test('classifies harness configuration and AI transport surfaces', () => {
  assert.equal(classifySurface('.mcp.json'), 'harness-config');
  assert.equal(classifySurface('scripts/consult-example.mjs'), 'ai-transport');
  assert.equal(classifySurface('scripts/consult-example.test.mjs'), 'test');
  assert.equal(classifySurface('backend/controllers/example.mjs'), 'other');
});

test('blocks repository snapshot upload instructions in harness config', () => {
  const findings = findFindings('.mcp.local.json', 'capture a repository snapshot and upload the workspace archive');
  assert.deepEqual(findings.map((item) => item.ruleId), ['repository-snapshot-upload', 'automatic-workspace-upload']);
  assert.equal(findings[0].file, '.mcp.local.json');
  assert.equal(findings[0].line, 1);
});

test('blocks repo wiki and file-context telemetry instructions', () => {
  const findings = findFindings('AGENTS.md', 'enable repo wiki sync\ntelemetry includes workspace files and prompt context');
  assert.deepEqual(findings.map((item) => item.ruleId), ['repository-wiki-upload', 'file-context-telemetry']);
});

test('blocks raw external transport in AI workflow source', () => {
  const findings = findFindings('scripts/consult-example.mjs', "await fetch('https://vendor.example.test/v1', { method: 'POST' });");
  assert.deepEqual(findings.map((item) => item.ruleId), ['raw-external-transport']);
});

test('allows the runtime chokepoint and local Ollama transport', () => {
  assert.deepEqual(
    findFindings('scripts/consult-example.mjs', "import { fetchForEgress } from './lib/redact-egress.mjs'; await fetchForEgress('https://vendor.example.test/v1', { body: '{}' });"),
    [],
  );
  assert.deepEqual(
    findFindings('scripts/consult-qwen.mjs', "await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST' });"),
    [],
  );
});

test('blocks protected-root reads even when transport is present', () => {
  const source = "import { fetchForEgress } from './lib/redact-egress.mjs'; const secret = readFileSync('.env', 'utf8'); await fetchForEgress('https://vendor.example.test/v1', { body: secret });";
  assert.deepEqual(findFindings('scripts/consult-example.mjs', source).map((item) => item.ruleId), ['protected-root-egress']);
});

test('blocks repository packaging plus external transport', () => {
  const source = "import archiver from 'archiver'; await fetchForEgress('https://vendor.example.test/v1', { body: bundle });";
  assert.deepEqual(findFindings('scripts/ai-workflow/provider.mjs', source).map((item) => item.ruleId), ['repository-bundle-egress']);
});

test('never echoes source text in findings', () => {
  const secret = 'private-client-record-123';
  const findings = findFindings('.mcp.json', `upload workspace\n${secret}`);
  assert.ok(findings.length > 0);
  assert.equal(JSON.stringify(findings).includes(secret), false);
});
