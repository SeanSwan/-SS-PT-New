/**
 * archetype-index.test.mjs — routing positive-controls for the A7 recall layer.
 * R2 rulings 2026-08-18: router entry count == archetype section count;
 * fixture trigger phrases resolve to exactly one archetype; drift detectable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMonolith, generate, slug } from '../build-archetype-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SOURCE = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'website-archetypes.md');
const INDEX = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'archetypes', 'index.json');

const monolith = readFileSync(SOURCE, 'utf8');

test('router entry count == archetype section count in the monolith', () => {
  const { sections } = parseMonolith(monolith);
  const index = JSON.parse(readFileSync(INDEX, 'utf8'));
  assert.equal(index.archetypes.length, sections.length);
  assert.ok(sections.length >= 21, `expected >=21 archetypes, got ${sections.length}`);
});

test('committed index matches the current monolith hash (no rot)', () => {
  const { srcSha } = parseMonolith(monolith);
  const index = JSON.parse(readFileSync(INDEX, 'utf8'));
  assert.equal(index.source_sha, srcSha,
    'index.json is STALE against website-archetypes.md — run: node scripts/design-brain/build-archetype-index.mjs');
});

test('fixture briefs route to exactly one archetype via triggers', () => {
  const index = JSON.parse(readFileSync(INDEX, 'utf8'));
  const route = (brief) => {
    const words = brief.toLowerCase().split(/\s+/);
    const hits = index.archetypes
      .map(a => ({ a, score: a.triggers.filter(t => words.some(w => w.includes(t))).length }))
      .filter(h => h.score > 0)
      .sort((x, y) => y.score - x.score);
    // "exactly one" = a unique top scorer, not a tie.
    return hits.length && (hits.length === 1 || hits[0].score > hits[1].score) ? hits[0].a : null;
  };
  const fixtures = [
    ['a fitness coaching studio homepage', 'fitness-coaching-website'],
    ['docs and knowledge-base for the API', 'documentation-knowledge-base-site'],
    ['a waitlist page for the beta', 'waitlist-page'],
    ['pricing page for the tiers', 'pricing-page'],
  ];
  for (const [brief, expected] of fixtures) {
    const hit = route(brief);
    assert.ok(hit, `no route for: "${brief}"`);
    assert.equal(hit.id, expected, `"${brief}" routed to ${hit.id}, expected ${expected}`);
  }
});

test('POSITIVE CONTROL — a mutated monolith is detected as drift', () => {
  const { srcSha } = parseMonolith(monolith);
  const { srcSha: mutated } = parseMonolith(monolith + '\n<!-- mutation -->');
  assert.notEqual(srcSha, mutated, 'hash failed to change on mutation — drift check is dead');
});

test('POSITIVE CONTROL — generate() on a 2-section fixture yields 2 entries', () => {
  const fixture = '# X\n\n## 1. Alpha thing\n\n- **Use when:** first case. More.\n\n## 2. Beta thing\n\n- **Use when:** second case. More.\n\n## Closing rules\nend';
  const { files, index } = generate(fixture);
  assert.equal(files.length, 2);
  assert.equal(index.archetypes.length, 2);
  assert.equal(index.archetypes[0].thesis, 'first case');
});

test('slug: parenthetical qualifiers dropped, kebab, capped at 4 words', () => {
  assert.equal(slug('Hermes Agentic OS command center (Cyberforest mode — Sean-only)'), 'hermes-agentic-os-command');
  assert.equal(slug('Fitness / coaching website'), 'fitness-coaching-website');
});
