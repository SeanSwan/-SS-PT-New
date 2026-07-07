#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/hermes-inbox-reminder.mjs
 * PURPOSE: SessionStart hook — once-per-session reminder to use the Hermes Inbox
 *          (CLAUDE.md Rule 69). Injects a tiny line + the pending-memo count.
 * AUTHOR: Claude Opus 4.8 | CREATED: 2026-07-06
 * ============================================================================
 *
 * WHAT THIS FILE DOES: On session start the harness runs this and injects its
 * stdout into context. It (1) counts unread memos in
 * .ai-workflow/hermes-inbox/pending/ and (2) reminds the agent to drop a memo at
 * substantial task/session close for work done OUTSIDE Hermes (terminal Claude/
 * Codex, local Qwen, scripts) so that context reaches Hermes.
 *
 * WHY SessionStart, NOT Stop: SessionStart fires once per session; a Stop hook
 * fires every assistant turn and would be per-turn token-noise (violates Sean's
 * token-economy rule). Mirrors the continuity bridge's "read at session start".
 *
 * WHY A SCRIPT, NOT INLINE echo: cross-platform quoting is fragile; Node is
 * guaranteed present. Path is resolved from import.meta.url (not cwd) so it works
 * from any worktree.
 *
 * SAFETY: read-only, deterministic, no args/env consumed, no secrets, never
 * throws, exits 0. If the inbox dir is missing it degrades silently (count 0).
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let pending = 0;
try {
  const here = dirname(fileURLToPath(import.meta.url)); // scripts/hooks
  const pendingDir = join(here, '..', '..', '.ai-workflow', 'hermes-inbox', 'pending');
  pending = readdirSync(pendingDir).filter(
    (f) => f.endsWith('.md') && f !== 'ENTRY-TEMPLATE.md'
  ).length;
} catch {
  pending = 0;
}

const backlog = pending > 0
  ? `${pending} pending memo(s) await Hermes. `
  : 'No pending memos. ';

process.stdout.write(
  `[hermes-inbox] ${backlog}Rule 69: if you do substantial work OUTSIDE Hermes ` +
  '(terminal Claude/Codex, local Qwen, scripts), drop a short IDs-only memo in ' +
  '.ai-workflow/hermes-inbox/pending/ at task/session close (skill: hermes-inbox). ' +
  'Hermes reads + clears it. Protocol: .ai-workflow/hermes-inbox/README.md.'
);
process.exit(0);
