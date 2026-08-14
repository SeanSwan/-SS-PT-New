/**
 * End-to-end dry preflight proof. This test must never have an OpenRouter key.
 * Run: node --test scripts/kimi-panel/tests/cli.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('CLI is dry by default and prints the complete zero-call allocation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kimi-panel-cli-'));
  const doc = join(dir, 'visualizer.md');
  writeFileSync(doc, '# visualizer evidence\nSafe design-only packet.');
  const runner = resolve('scripts/run-kimi-panel.mjs');
  const env = { ...process.env };
  delete env.OPENROUTER_API_KEY;
  delete env.OPEN_ROUTER_API_KEY;
  const output = execFileSync(process.execPath, [runner, '--document', doc,
    '--cap-usd', '3.2766', '--max-tokens', '8000'], {
    cwd: process.cwd(), env, encoding: 'utf8',
  });
  assert.match(output, /status=preflight-only/);
  assert.match(output, /model_calls_executed=0/);
  assert.match(output, /metered_calls=13/);
  assert.match(output, /google\/gemini-3\.7-flash/);
  assert.match(output, /tencent\/hy3-preview/);
  assert.match(output, /max_output_tokens=8000/);
  assert.match(output, /shared_cap_usd=3\.2766/);
});
