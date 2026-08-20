#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/gate-window-parity.test.mjs
 * PURPOSE: The four Stop gates each carry a byte-identical `isRealUserLine`.
 *          Prove (a) they stay identical, and (b) a gate can still see the turn
 *          it just judged after its own feedback lands in the transcript.
 * AUTHOR: Opus 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * WHY THIS EXISTS: a Stop hook's feedback is written back as a `user` entry. Each
 * gate windows the turn as "everything after the last real user line", so its own
 * complaint reset the window to the moment of complaining. After one fire the
 * window held only the post-feedback fragment: fileWrites 0, buildShaped false,
 * gate silently passing while enforcing nothing. Measured 2026-08-03 against a live
 * transcript — lastUserIdx landed on the gate's own feedback while the required
 * marker sat in the closeout directly above it.
 *
 * A guard that goes quiet after its first complaint is worse than no guard: it
 * reads as satisfied. Same class as the write-boundary payload-shape defect found
 * the same day — green, and dead.
 *
 * Run: node --test scripts/hooks/gate-window-parity.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATES = ['dry-loop-gate', 'dual-tier-gate', 'hermes-closeout-gate', 'linear-sync-gate'];

// Every gate carrying the inline predicate, closeout gate or not. privacy-boundary-gate
// (slice 2) windows the turn the same way to find the artifacts it must scan, so it
// inherits the same window bug and must be held to the same byte-identical copy.
const PARITY_GATES = [...GATES, 'privacy-boundary-gate'];

/** Extract the predicate source so drift between the copies is detectable. */
function predicateSource(gate) {
  const src = readFileSync(join(HERE, `${gate}.mjs`), 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('const HOOK_FEEDBACK_RE');
  const from = start === -1 ? src.indexOf('export function isRealUserLine') : start;
  assert.notEqual(from, -1, `${gate}: predicate not found`);
  const end = src.indexOf('\n}\n', src.indexOf('export function isRealUserLine', from));
  assert.notEqual(end, -1, `${gate}: predicate end not found`);
  return src.slice(from, end + 3);
}

const userLine = (text) => ({ type: 'user', message: { content: [{ type: 'text', text }] } });
const toolResultLine = () => ({
  type: 'user',
  message: { content: [{ type: 'text', text: 'x' }, { type: 'tool_result', content: 'y' }] },
});

test('every gate carries a byte-identical predicate', () => {
  const [first, ...rest] = PARITY_GATES.map(predicateSource);
  for (let i = 0; i < rest.length; i += 1) {
    assert.equal(
      rest[i], first,
      `${PARITY_GATES[i + 1]} drifted from ${PARITY_GATES[0]} — the copies must stay in lockstep`,
    );
  }
});

test('no hook test reads a repo file by bare relative path', () => {
  // Found 2026-08-03 (R12): `hermes-closeout-gate.test.mjs` read `.claude/settings.json`
  // relatively and `drift-check-gate.test.mjs` read `AGENTS.md`/`CLAUDE.md` the same
  // way, so both suites failed outright from any cwd but the repo root — including
  // the suite whose own job is asserting the hook is cwd-independent. Anchor reads to
  // the file's own location. Static check: cheap, and it cannot rot the way a runtime
  // probe can.
  const offenders = [];
  for (const f of readdirSync(HERE).filter((n) => n.endsWith('.test.mjs'))) {
    const src = readFileSync(join(HERE, f), 'utf8');
    for (const m of src.matchAll(/readFileSync\(\s*'([^']+)'/g)) {
      const p = m[1];
      // Reported without re-embedding a matching call literal — the first draft of
      // this check matched its own error message and failed on itself.
      if (!/^[A-Za-z]:|^\//.test(p)) offenders.push(`${f} reads -> ${p}`);
    }
  }
  assert.deepEqual(offenders, [], 'anchor these to import.meta.url, not process.cwd()');
});

test('a hook-feedback line is NOT the user speaking', async () => {
  for (const gate of PARITY_GATES) {
    const m = await import(`./${gate}.mjs`);
    assert.equal(
      m.isRealUserLine(userLine('Stop hook feedback:\nDry-Loop Law (Sean 2026-07-21): ...')),
      false, `${gate}: treated its own feedback as a user turn`,
    );
    assert.equal(
      m.isRealUserLine(userLine('  Stop hook feedback: Linear board sync ...')),
      false, `${gate}: leading whitespace defeated the feedback check`,
    );
    assert.equal(
      m.isRealUserLine({ type: 'user', message: { content: 'Stop hook feedback: blah' } }),
      false, `${gate}: string-content feedback not filtered`,
    );
  }
});

test('genuine user turns and tool results keep their old meaning', async () => {
  for (const gate of PARITY_GATES) {
    const m = await import(`./${gate}.mjs`);
    assert.equal(m.isRealUserLine(userLine('Next slice: fix the P0')), true, `${gate}: real prompt`);
    assert.equal(m.isRealUserLine({ type: 'user', message: { content: 'go' } }), true, `${gate}: string prompt`);
    assert.equal(m.isRealUserLine(toolResultLine()), false, `${gate}: tool_result must not count`);
    assert.equal(m.isRealUserLine(userLine('   ')), false, `${gate}: blank must not count`);
    assert.equal(m.isRealUserLine(null), false, `${gate}: null`);
    assert.equal(m.isRealUserLine({ type: 'assistant' }), false, `${gate}: assistant`);
  }
});

test('THE BUG: a build-shaped turn stays visible after its own feedback lands', async () => {
  // Sean prompts -> agent writes 2 files and closes out with the marker -> the gate
  // fires and its feedback is appended. On the next evaluation the gate must still
  // see 2 file writes and the marker, not an empty post-feedback fragment.
  const closeout = [
    '## Plain English',
    'Did the thing.',
    '## Technical',
    'DRY-LOOP: CLEAN×2 (rounds: 7)',
    'LINEAR: SWA-70',
    // dry-loop-gate demands the marker AND a literal PROOF token (rule 73).
    'PROOF: node --test 189/189 pass, node --check clean — run this session.',
  ].join('\n');

  const transcript = [
    userLine('Next slice: fix the P0'),
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', name: 'Edit', input: { file_path: 'src/a.ts' } },
          { type: 'tool_use', name: 'Write', input: { file_path: 'src/b.ts' } },
          // Emission paths are excluded from fileWrites but satisfy hermes-closeout.
          {
            type: 'tool_use',
            name: 'Write',
            input: { file_path: '.ai-workflow/hermes-inbox/pending/20260803T000000Z-vs-claude-x.md' },
          },
        ],
      },
    },
    { type: 'assistant', message: { content: [{ type: 'text', text: closeout }] } },
    userLine('Stop hook feedback:\nDry-Loop Law (Sean 2026-07-21): this turn changed code...'),
    userLine('Stop hook feedback:\nLinear board sync (SWA-23): this turn changed code...'),
  ].map((e) => JSON.stringify(e)).join('\n');

  // Each gate names its "I can see the closeout" signal differently — assert the
  // real one per gate rather than a signal that only some of them have.
  const CLOSEOUT_SIGNAL = {
    'dry-loop-gate': (s) => s.markerSeen && s.proofSeen,
    'dual-tier-gate': (s) => s.plainSeen && s.techSeen && s.plainFirst,
    'hermes-closeout-gate': (s) => s.memoEmitted,
    'linear-sync-gate': (s) => s.markerSeen,
    // Not a closeout signal — the thing this gate would lose if the window reset
    // is the artifact list it exists to scan.
    'privacy-boundary-gate': (s) => s.artifacts.length === 1,
  };

  for (const gate of PARITY_GATES) {
    const m = await import(`./${gate}.mjs`);
    const s = m.analyzeTurn(m.parseTranscript(transcript));
    assert.equal(s.fileWrites, 2, `${gate}: lost sight of the file writes after its own feedback`);
    assert.equal(
      CLOSEOUT_SIGNAL[gate](s), true,
      `${gate}: lost sight of the closeout after its own feedback`,
    );
    assert.equal(
      m.decide({ stop_hook_active: false }, transcript), null,
      `${gate}: blocked a turn that carried everything it asked for`,
    );
  }
});
