import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(import.meta.dirname, '..', '..');
const launcherPath = join(root, 'scripts', 'ai-workflow', 'run-top-ai-panel.ps1');

test('generic panel derives reviewer remits from the supplied packet instead of a product-specific assignment', () => {
  const launcher = readFileSync(launcherPath, 'utf8');

  assert.match(launcher, /Review the supplied packet as Opus 5/i);
  assert.match(launcher, /Review the supplied packet as Kimi K3/i);
  assert.match(launcher, /Review the supplied packet as Tencent HY3/i);
  assert.match(launcher, /consult-opus5\.mjs/);
  assert.match(launcher, /consult-kimi\.mjs/);
  assert.match(launcher, /consult-hy3-design\.mjs/);
  assert.doesNotMatch(launcher, /Swan Guard Newsroom/i);
});
