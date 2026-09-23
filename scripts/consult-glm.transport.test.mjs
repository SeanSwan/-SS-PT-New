import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const frame = (value) => `data: ${JSON.stringify(value)}\n\n`;
function good(model = 'glm-5.3', completionTokens = 4, totalTokens = 12) {
  return frame({ model, choices: [{ delta: { content: 'SYNTHETIC_OK' }, finish_reason: null }] })
    + frame({ model, choices: [{ delta: {}, finish_reason: 'stop' }], usage: {
      prompt_tokens: 8, completion_tokens: completionTokens, total_tokens: totalTokens,
    } }) + 'data: [DONE]\n\n';
}

// This preloader replaces all fetches before the actual CLI loads. It never
// connects to any host; the runtime key and guard directories are synthetic.
const preload = `
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(process.env.GLM_TEST_FIXTURE,'utf8'));
globalThis.fetch=async(url,init)=>{
 const request=JSON.parse(init.body);
 if(url!=='https://api.z.ai/api/coding/paas/v4/chat/completions')throw Error('WRONG_ENDPOINT');
 if(request.model!==fixture.model||request.stream!==true)throw Error('WRONG_REQUEST');
 if(fixture.providerDefault ? Object.prototype.hasOwnProperty.call(request,'max_tokens') : request.max_tokens!==64)throw Error('WRONG_REQUEST');
 if(init.headers.Authorization!=='Bearer synthetic-test-only')throw Error('WRONG_TEST_KEY');
 if(fixture.networkError)throw Error('sensitive-provider-error synthetic network failure');
 if(fixture.httpStatus)return new Response('sensitive-provider-error',{status:fixture.httpStatus});
 if(fixture.hang)return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('FIXTURE_WATCHDOG')),3000);
   init.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(init.signal.reason);},{once:true});
 });
 const bytes=new TextEncoder().encode(fixture.sse);let offset=0;
 return new Response(new ReadableStream({pull(controller){
  if(offset===bytes.length){controller.close();return;}
  controller.enqueue(bytes.slice(offset,offset+7));offset=Math.min(offset+7,bytes.length);
 }}),{status:200});
};`;

function run(t, fixture = {}, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'glm-transport-fixture-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const document = join(dir, 'packet.md');
  const out = join(dir, 'review.md');
  const loader = join(dir, 'preload.mjs');
  const fixturePath = join(dir, 'fixture.json');
  writeFileSync(document, 'Synthetic test: return SYNTHETIC_OK. No private information.');
  writeFileSync(loader, preload);
  writeFileSync(fixturePath, JSON.stringify({ model: options.flash ? 'glm-5.3-flash' : 'glm-5.3', sse: good(), providerDefault: Boolean(options.providerDefault), ...fixture }));
  if (options.existing) writeFileSync(out, 'KEEP ORIGINAL');
  if (options.locked) {
    mkdirSync(join(dir, 'SwanAI'));
    writeFileSync(join(dir, 'SwanAI', 'glm-call.lock'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  }
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(loader).href,
    join(root, 'scripts', options.flash ? 'consult-ox.mjs' : 'consult-glm.mjs'),
    '--document', document, '--out', out,
    '--max-tokens', options.providerDefault ? 'provider-default' : '64',
    ...(options.args ?? []),
  ], { cwd: root, encoding: 'utf8', timeout: 5000, env: {
    ...process.env, ZAI_API_KEY: 'synthetic-test-only', LOCALAPPDATA: dir,
    SWAN_GLM_REVIEW_ROUND_ID: 'synthetic_round_01', GLM_TEST_FIXTURE: fixturePath,
    // The Flash child must use the same fake transport, never real fetch.
    NODE_OPTIONS: `--import=${pathToFileURL(loader).href}`,
  } });
  assert.doesNotMatch(result.stderr ?? '', /ERR_UNSUPPORTED_ESM|ERR_MODULE_NOT_FOUND|WRONG_ENDPOINT|WRONG_REQUEST|WRONG_TEST_KEY/);
  const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
  return { ...result, report: read(out), receipt: read(`${out}.receipt.json`),
    ledger: read(join(dir, 'SwanAI', 'glm-usage.jsonl')),
    lock: read(join(dir, 'SwanAI', 'glm-call.lock')) };
}

test('T1: exact complete stream succeeds and emits measured identity receipt', (t) => {
  const r = run(t);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.report, /SYNTHETIC_OK/);
  assert.equal(JSON.parse(r.receipt || '{}').status, 'complete');
  assert.equal(JSON.parse(r.receipt).servedModel, 'glm-5.3');
  assert.equal(JSON.parse(r.receipt).usage.completion_tokens, 4);
  assert.equal(r.lock, '');
});

test('T1: provider-default omits request cap and accepts positive usage above numeric ceiling', (t) => {
  const r = run(t, { sse: good('glm-5.3', 34_001, 34_009) }, { providerDefault: true });
  assert.equal(r.status, 0, r.stderr);
  const receipt = JSON.parse(r.receipt || '{}');
  assert.equal(receipt.status, 'complete');
  assert.equal(receipt.maxTokens, null);
  assert.equal(receipt.tokenPolicy, 'provider-default');
  assert.equal(receipt.usage.completion_tokens, 34_001);
  assert.match(r.ledger, /"maxTokens":null/);
  assert.match(r.ledger, /"tokenPolicy":"provider-default"/);
});

for (const [name, sse] of [
  ['empty', frame({ model: 'glm-5.3', choices: [{ delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n'],
  ['substitution', good('glm-5.2')],
  ['unreported model', good().replaceAll('"model":"glm-5.3",', '')],
  ['missing stop', frame({ model: 'glm-5.3', choices: [{ delta: { content: 'partial' } }] })],
  ['missing usage', good().replace(/,"usage":\{[^}]+\}/g, '')],
  ['malformed frame', 'data: {invalid}\n\n' + good()],
  ['truncated', good().replace('"stop"', '"length"')],
]) test(`T1: ${name} never succeeds`, (t) => {
  const r = run(t, { sse });
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.ledger, /"result":"complete"/);
});

test('T1: terminal line without final newline is retained', (t) => {
  const r = run(t, { sse: good().trimEnd() });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.receipt || '{}').sawDone, true);
});

test('T3: prior artifact is never replaced or dispatched', (t) => {
  const r = run(t, {}, { existing: true });
  assert.notEqual(r.status, 0);
  assert.equal(r.report, 'KEEP ORIGINAL');
  assert.equal(r.ledger, '');
});

test('T2: active guard remains blocking with no call started', (t) => {
  const r = run(t, {}, { locked: true });
  assert.equal(r.status, 2);
  assert.equal(r.ledger, '');
  assert.ok(r.lock);
});

test('T4: ambiguous network failure retains unresolved guard', (t) => {
  const r = run(t, { networkError: true });
  assert.notEqual(r.status, 0);
  assert.equal(JSON.parse(r.lock || '{}').state, 'unresolved');
  assert.equal(JSON.parse(r.receipt || '{}').status, 'unknown');
  assert.doesNotMatch(r.stderr + r.receipt + r.report, /sensitive-provider-error/);
});

test('T4: bounded timeout aborts and retains unknown execution', (t) => {
  const r = run(t, { hang: true }, { args: ['--timeout-ms', '50'] });
  assert.notEqual(r.status, 0);
  assert.equal(JSON.parse(r.receipt || '{}').reason, 'deadline');
  assert.equal(JSON.parse(r.lock || '{}').state, 'unresolved');
});

test('T3: HTTP error has safe diagnostics and no raw provider body', (t) => {
  const r = run(t, { httpStatus: 429 });
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.stderr, /sensitive-provider-error/);
  assert.equal(JSON.parse(r.receipt || '{}').httpStatus, 429);
  assert.equal(r.lock, '');
});

test('T5: Flash wrapper preserves exact pinned served identity', (t) => {
  const r = run(t, { sse: good('glm-5.3-flash') }, { flash: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.receipt || '{}').servedModel, 'glm-5.3-flash');
});
