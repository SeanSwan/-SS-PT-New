#!/usr/bin/env node
/** Native Codex/Claude prompt adapter. Fixed local context; no input reads, state or network. */
import { readFileSync } from 'node:fs';

// A reminder on every prompt avoids keyword false negatives. The agent applies
// the semantic build/audit boundary; this script does not claim to classify it.
const context = readFileSync(new URL('./reminder.txt', import.meta.url), 'utf8').trim();
process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: context,
  },
})}\n`);
