#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-evidence.test.mjs
 * PURPOSE: Prove inactive lifecycle evidence remains byte and count bounded.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeBoundedEvidence } from './mcp-lifecycle-evidence.mjs';

test('inactive evidence rotates oldest records at the configured bound', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mcp-evidence-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let index = 0; index < 300; index += 1) {
    writeBoundedEvidence(root, `${String(index).padStart(3, '0')}.json`, { index }, 256);
  }
  const names = readdirSync(root).filter((name) => name.endsWith('.json'));
  assert.equal(names.length, 256);
  assert.equal(names.includes('000.json'), false);
  assert.equal(names.includes('299.json'), true);
});
