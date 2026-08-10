#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-receipts.test.mjs
 * PURPOSE: Prove lifecycle receipts never report an audit as clean release.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizedReceipt } from './mcp-lifecycle-manager.mjs';

test('audit-only SessionEnd receipt names audit mode explicitly', () => {
  const receipt = sanitizedReceipt(
    { released: 0, incomplete: 0, auditOnly: true }, 2, 'tombstoned', 'removed', 3,
  );
  assert.match(receipt, /mode=audit/);
  assert.match(receipt, /released=0/);
  assert.match(receipt, /would-release=3/);
  assert.match(receipt, /protected=2/);
});
