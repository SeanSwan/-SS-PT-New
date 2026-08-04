/**
 * Skill Registry Contract Tests
 * ==============================
 * Protects the portable workflow skills and deterministic inventory gate.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSkillRegistryReport } from './validate-skill-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const portable = ['wayfinder', 'goal-contract', 'worktree-isolation', 'guided-setup'];

test('registry validator accepts the current filesystem inventory', () => {
  const report = buildSkillRegistryReport();
  assert.deepEqual(report.errors, []);
  for (const name of portable) assert.ok(report.shared.includes(name), `${name} must exist on both skill surfaces`);
});

test('registry descriptions and canonical names are meaningful', () => {
  const report = buildSkillRegistryReport();
  for (const entries of Object.values(report.roots)) {
    for (const entry of entries) {
      assert.equal(entry.name, entry.folder, `${entry.path} must match its canonical folder`);
      assert.doesNotMatch(entry.description, /^[>|][+-]?$/);
      assert.ok(entry.description.length > 8, `${entry.path} description is not meaningful`);
    }
  }
});

test('portable workflow skill bodies stay byte-identical across agents', () => {
  for (const name of portable) {
    const claude = readFileSync(resolve(repoRoot, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
    const codex = readFileSync(resolve(repoRoot, '.agents', 'skills', name, 'SKILL.md'), 'utf8');
    assert.equal(codex, claude, `${name} drifted between .agents and .claude`);
    assert.doesNotMatch(codex, /TODO|\[TODO/, `${name} contains an unfinished template marker`);
  }
});

test('portable skill metadata names the skill in the default prompt', () => {
  for (const name of portable) {
    const yaml = readFileSync(resolve(repoRoot, '.agents', 'skills', name, 'agents', 'openai.yaml'), 'utf8');
    assert.match(yaml, /display_name: "[^"]+"/);
    assert.match(yaml, /short_description: "[^"]+"/);
    assert.ok(yaml.includes(`$${name}`), `${name} default_prompt must include $${name}`);
  }
});

test('routing contracts preserve the safety exits', () => {
  const wayfinder = readFileSync(resolve(repoRoot, '.agents', 'skills', 'wayfinder', 'SKILL.md'), 'utf8');
  const goal = readFileSync(resolve(repoRoot, '.agents', 'skills', 'goal-contract', 'SKILL.md'), 'utf8');
  const worktree = readFileSync(resolve(repoRoot, '.agents', 'skills', 'worktree-isolation', 'SKILL.md'), 'utf8');
  const setup = readFileSync(resolve(repoRoot, '.agents', 'skills', 'guided-setup', 'SKILL.md'), 'utf8');
  assert.match(wayfinder, /Use Wayfinder only when both conditions are true/);
  assert.match(wayfinder, /The frontier is exactly.*`open`.*unresolved blocker.*unclaimed/);
  assert.match(wayfinder, /Produce a spec only when the destination or project rules require one/);
  assert.match(wayfinder, /do not build a second local implementation backlog/);
  assert.match(wayfinder, /external issue tracker only when the user explicitly authorizes external writes/);
  assert.match(wayfinder, /current session, names the tracker/);
  assert.match(wayfinder, /downgrade the clarified mechanical slice to `goal-contract`/);
  assert.match(wayfinder, /Delegated agents inherit/);
  assert.match(goal, /Only call `create_goal` when the user explicitly requests a goal/);
  assert.match(goal, /verified baseline and acceptance criteria are immutable/);
  assert.match(goal, /append-only evidence-log entry/);
  assert.match(goal, /Anti-Reward-Hacking Rules/);
  assert.match(worktree, /Do not copy `.env`/);
  assert.match(worktree, /Worktree creation does not authorize cleanup/);
  assert.match(worktree, /A path that cleanup will destroy is not durable evidence/);
  assert.match(setup, /Show only one actionable current step/);
  assert.match(setup, /explicit human confirmation signal/);
  assert.match(setup, /Verification commands must be read-only/);
});

test('operating docs do not regress to stale skill counts or missing split adapters', () => {
  const files = ['CLAUDE.md', 'ACTIVE-INDEX.md', 'docs/ai-workflow/references/SKILLS-REFERENCE.md'];
  const combined = files.map((file) => readFileSync(resolve(repoRoot, file), 'utf8')).join('\n');
  assert.doesNotMatch(combined, /seedance-swan-(?:workout|cinematic)-video/);
  assert.doesNotMatch(combined, /contains exactly \*\*\d+\*\* default-exposed|Default-exposed `\.claude\/skills\/`: \d+|documented count = \d+/);
  assert.match(combined, /validate-skill-registry\.mjs/);
});

test('mode classification precedes intent extraction without conflicting first-step claims', () => {
  const router = readFileSync(resolve(repoRoot, 'docs', 'ai-workflow', 'references', 'AGENT-WORKFLOW-ROUTER.md'), 'utf8');
  const claude = readFileSync(resolve(repoRoot, 'CLAUDE.md'), 'utf8');
  const preflight = router.indexOf('### Pass 1 - Environment preflight');
  const selection = router.indexOf('### Pass 2 - Select the smallest execution mode');
  const classification = router.indexOf('-> mode classification (Rule 78)');
  const grill = router.indexOf('-> grill-me (when intent is missing)');
  assert.ok(preflight !== -1 && selection !== -1 && preflight < selection);
  assert.ok(classification !== -1 && grill !== -1 && classification < grill);
  assert.doesNotMatch(claude, /Runs FIRST for net-new|grill-me first/i);
  assert.match(claude, /both multi-session and materially foggy uses `wayfinder`/);
  assert.match(claude, /Pass 1, environment preflight, always precedes mutation/);
});

test('active workflow consumers preserve preflight, tracker authority, and one decision source', () => {
  const grill = readFileSync(resolve(repoRoot, '.claude', 'skills', 'grill-me', 'SKILL.md'), 'utf8');
  const closeout = readFileSync(resolve(repoRoot, '.claude', 'skills', 'closeout-evidence-lock', 'SKILL.md'), 'utf8');
  const linear = readFileSync(resolve(repoRoot, '.claude', 'skills', 'linear-todo', 'SKILL.md'), 'utf8');
  assert.match(grill, /Before creating or appending a brainstorm, complete Rule 78 environment preflight/);
  assert.match(grill, /never create the file before preflight/);
  assert.doesNotMatch(grill, /This is the front door for net-new building/);
  assert.match(closeout, /SECTION 6\.25 - Canonical Decision Source/);
  assert.doesNotMatch(closeout, /SECTION 6\.25 - Decision and Uncertainty Register/);
  assert.match(closeout, /Current-session Linear authorization recorded/);
  assert.match(closeout, /If not authorized: do not write externally/);
  assert.match(linear, /Standing workflow preference does not silently grant tracker authority/);
});

test('instruction mirror remains generated from CLAUDE.md', () => {
  const marker = '--- project-doc mirror from CLAUDE.md ---';
  const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8');
  const claude = readFileSync(resolve(repoRoot, 'CLAUDE.md'), 'utf8');
  const markerIndex = agents.indexOf(marker);
  assert.notEqual(markerIndex, -1, 'AGENTS.md mirror marker is missing');
  const body = agents.slice(markerIndex + marker.length).replace(/^(?:\r?\n)+/, '');
  assert.equal(body, claude);
});
