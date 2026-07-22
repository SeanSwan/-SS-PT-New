/**
 * toolLoop.test.mjs — bounded tool-calling loop (Phase 4 slice 2), fully offline via injected fetch.
 * Run: node --test scripts/context-gateway/tests/toolLoop.test.mjs
 *
 * Proves the loop terminates (iteration + spend budgets), tolerates untrusted/garbage tool calls,
 * keeps the ceiling on tools the model drives, and citation-audits the final answer — all with a
 * mock provider, so no network and $0.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gitTrackedFiles } from '../src/safeRead.mjs';
import { compileContext } from '../src/compile.mjs';
import { createToolSession } from '../src/tools.mjs';
import { getProvider } from '../src/providers.mjs';
import { runToolLoop } from '../src/toolLoop.mjs';

function fixtureRepo() {
  const root = join(mkdtempSync(join(tmpdir(), 'swan-loop-')), 'repo');
  mkdirSync(join(root, 'backend', 'middleware'), { recursive: true });
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(root, 'app.mjs'), 'export function saveWorkout(u){\n  return db.insert(u);\n}\n');
  writeFileSync(join(root, 'backend', 'middleware', 'authMiddleware.mjs'), 'export function requireAuth(){ return 1; }\n');
  git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fx');
  return { root, tracked: gitTrackedFiles(root) };
}

/** Mock fetch that replays a queue of assistant messages (OpenRouter shape) and records request bodies. */
function mockFetch(messagesQueue, usage = { prompt_tokens: 500, completion_tokens: 200 }) {
  const bodies = [];
  let i = 0;
  const fn = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    const message = messagesQueue[Math.min(i, messagesQueue.length - 1)];
    i += 1;
    return { ok: true, json: async () => ({ choices: [{ message }], usage }) };
  };
  fn.bodies = bodies;
  return fn;
}

const ENV = { SWAN_CONTEXT_MAX_USD: '5', OPENROUTER_API_KEY: 'test-key' };

function setup(ceiling = 'standard') {
  const { root, tracked } = fixtureRepo();
  const { packet, manifest } = compileContext({ root, question: 'trace saveWorkout', tracked, originatingModel: 'm' });
  const session = createToolSession({ root, tracked, ceiling });
  return { root, tracked, packet, manifest, evidence: packet.getEvidence(), session };
}

const toolCall = (name, args, id = 'c1') => ({ role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });

test('happy path: model calls a tool, then answers; answer is citation-audited', async () => {
  const s = setup();
  const cite = s.manifest.evidence[0] ? `[${s.manifest.evidence[0].id}:L${s.manifest.evidence[0].startLine}-L${s.manifest.evidence[0].endLine}]` : '[E001:L1-L2]';
  const fetch = mockFetch([toolCall('repo_search', { query: 'saveWorkout' }), { role: 'assistant', content: `Found it ${cite}` }]);
  const r = await runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: ENV });
  assert.equal(r.stopReason, 'answered');
  assert.equal(r.iterations, 2);
  assert.equal(r.toolTrace.length, 1);
  assert.equal(r.toolTrace[0].tool, 'repo_search');
  assert.ok(r.audit.valid >= 1 && r.audit.invalid.length === 0);
  // the second request must include the tool result message
  assert.ok(fetch.bodies[1].messages.some((m) => m.role === 'tool'));
});

test('iteration budget: a model that never stops calling tools terminates', async () => {
  const s = setup();
  const fetch = mockFetch([toolCall('repo_search', { query: 'db' })]); // always the same tool call
  const r = await runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: ENV, maxIterations: 3 });
  assert.equal(r.answer, null);
  assert.equal(r.stopReason, 'max_iterations');
  assert.equal(r.iterations, 3);
});

test('untrusted tool calls: unknown tool and bad JSON args become error results, loop continues', async () => {
  const s = setup();
  const badArgs = { role: 'assistant', content: null, tool_calls: [{ id: 'x', type: 'function', function: { name: 'repo_open', arguments: '{not json' } }] };
  const fetch = mockFetch([toolCall('nuke_repo', { all: true }), badArgs, { role: 'assistant', content: 'done, no citation' }]);
  const r = await runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: ENV });
  assert.equal(r.stopReason, 'answered');
  assert.ok(r.toolTrace.some((t) => t.tool === 'nuke_repo' && t.ok === false), 'unknown tool logged as failed');
  assert.equal(r.audit.uncited, true, 'uncited answer flagged');
});

test('spend cap: PRE-EMPTIVE — loop stops BEFORE exceeding the cap, never overshoots', async () => {
  const s = setup();
  // per-turn estimate is dominated by maxTokens output cost: sol $30/M out * 30000 = ~$0.90/turn.
  // cap $1.10 admits one turn's spend, then the next turn's estimate would breach → stop.
  const fetch = mockFetch([toolCall('repo_search', { query: 'db' })], { prompt_tokens: 2000, completion_tokens: 1000 });
  const r = await runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: { ...ENV, SWAN_CONTEXT_MAX_USD: '1.10' }, maxTokens: 30000, maxIterations: 10 });
  assert.equal(r.stopReason, 'spend_cap');
  assert.ok(r.totalCost <= 1.10, `no overshoot: spent ${r.totalCost} <= cap 1.10`);
  assert.ok(r.iterations < 10, 'stopped on spend, not iteration budget');
});

test('spend cap: single turn whose estimate exceeds the whole cap is refused up front', async () => {
  const s = setup();
  const fetch = mockFetch([{ role: 'assistant', content: 'x' }]);
  await assert.rejects(
    () => runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: { ...ENV, SWAN_CONTEXT_MAX_USD: '0.10' }, maxTokens: 30000 }),
    (e) => e.code === 'SPEND_CAP');
  assert.equal(fetch.bodies.length, 0, 'no network turn happened');
});

test('fail-closed: no SWAN_CONTEXT_MAX_USD → loop refuses before any network turn', async () => {
  const s = setup();
  const fetch = mockFetch([{ role: 'assistant', content: 'x' }]);
  await assert.rejects(() => runToolLoop({ provider: getProvider('sol'), ...s, fetchImpl: fetch, env: { OPENROUTER_API_KEY: 'k' } }), (e) => e.code === 'NO_CAP');
  assert.equal(fetch.bodies.length, 0, 'no request was sent');
});

test('ceiling holds inside the loop: design session refuses a sensitive repo_open the model requests', async () => {
  const s = setup('design'); // design-ceiling tool session
  const fetch = mockFetch([toolCall('repo_open', { path: 'backend/middleware/authMiddleware.mjs', startLine: 1, endLine: 1 }), { role: 'assistant', content: 'ok' }]);
  // kimi is the design provider; its packet must be non-sensitive (this fixture packet is)
  const r = await runToolLoop({ provider: getProvider('kimi'), ...s, fetchImpl: fetch, env: ENV });
  const toolMsg = fetch.bodies[1].messages.find((m) => m.role === 'tool');
  assert.ok(/CEILING/.test(toolMsg.content), 'sensitive repo_open refused as an error result to the model');
  assert.ok(!/requireAuth/.test(JSON.stringify(fetch.bodies)), 'sensitive file content never entered the transcript');
});
