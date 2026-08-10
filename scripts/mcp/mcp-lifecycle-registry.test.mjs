#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-registry.test.mjs
 * PURPOSE: Lock the data registry and code-owned mutation authority boundary.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Rejects registry data that could broaden kill authority.
 * HOW IT FITS IN THE APP: Registry -> core classifier and release planner.
 * KEY DECISIONS: Exact argv data classifies; executable code authorizes mutation.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

async function registryModule() {
  return import('./mcp-lifecycle-registry.mjs').catch(() => ({}));
}

test('registry exact grammar classifies Playwright and rejects lookalikes', async () => {
  const registry = await registryModule();
  assert.equal(typeof registry.classifyRegistryProcess, 'function');
  assert.equal(registry.classifyRegistryProcess(
    'cmd /c npx -y @playwright/mcp@latest', 'cmd.exe',
  ), 'playwright');
  assert.equal(registry.classifyRegistryProcess(
    'cmd /c npx -y @playwright/mcp@latest --help', 'cmd.exe',
  ), null);
});

test('registry data cannot grant mutation authority', async () => {
  const registry = await registryModule();
  assert.equal(registry.canMutateLabel('playwright'), true);
  assert.equal(registry.canMutateLabel('future-server'), false);
  const exact = { label: 'future-server', processNames: ['node.exe'], argv: ['node', 'server.mjs'] };
  assert.deepEqual(registry.validateRegistry([exact]), [exact]);
  assert.throws(() => registry.validateRegistry([{ ...exact, mutation: true }]), /registry entry/i);
  assert.throws(() => registry.validateRegistry([exact, exact]), /duplicate/i);
  assert.throws(() => registry.validateRegistry([{ ...exact, label: 'bad', argv: [/mcp/] }]), /registry entry/i);
});
