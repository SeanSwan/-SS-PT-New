import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./panel-debate.mjs', import.meta.url), 'utf8');
const match = source.match(/function parseVerdict\(text\) \{[\s\S]*?\n\}\n\nconst seatOutPath/u);

test('parses a complete reviewer verdict without throwing', () => {
  assert.ok(match, 'parseVerdict function must remain locatable');
  const parseVerdict = new Function(`${match[0].replace(/\n\nconst seatOutPath$/u, '')}; return parseVerdict;`)();
  const input = [
    '=== VERDICT ===',
    'status: CONSENSUS',
    'confidence: 89',
    'findings: F1=MAJOR: packet evidence is incomplete',
    'rebuttals: (none)',
    'open: Q1=add source excerpts',
    'consensus_block: Add the missing evidence appendix.',
    '=== END-VERDICT ===',
  ].join('\n');
  const verdict = parseVerdict(input);

  assert.equal(verdict.status, 'CONSENSUS');
  assert.equal(verdict.confidence, 89);
  assert.deepEqual(verdict.findings, ['F1=MAJOR: packet evidence is incomplete']);
  assert.equal(verdict.block, 'Add the missing evidence appendix.');
});

test('bounds a silent seat so quorum can resolve a round', () => {
  assert.match(source, /--seat-timeout-sec/u);
  assert.match(source, /seatTimeoutMs/u);
  assert.doesNotMatch(source, /hung >1800s/u);
});

test('derives the debate subject from the packet instead of hard-coding another artifact', () => {
  assert.match(source, /const packetTitle = packet\.match\(\/\^#\\s\+\(\.\+\)\$\/mu\)/u);
  assert.doesNotMatch(source, /shadow-database seeder code packet/u);
  assert.match(source, /packaged SS-PT subject titled/u);
});

// ─────────────────────────────────────────────────────────────────────────────
// T-ROUND-01 — every seat gets a WHOLE-PACKET remit (Astra R2-A1-06 / prior A1-09)
//
// The defect this guards was in the PROMPT CONSTRUCTOR, so a test that reads the
// source for the word "whole" proves nothing — a comment could satisfy it. These
// tests reconstruct the real functions out of the source and call them, then assert
// on the STRING A SEAT ACTUALLY RECEIVES.
//
// The failure mode being prevented: an instruction that forbids a seat from
// reporting a defect outside its own lens. Two phrasings carried it ("do not
// drift", "Apply your stance to it"), so both are asserted absent.
// ─────────────────────────────────────────────────────────────────────────────

/** Rebuild sharedFrame + seatRemit from source, with the constants they close over. */
function loadPromptConstructors() {
  const frameMatch = source.match(/function sharedFrame\(round, state\) \{[\s\S]*?\n\}\n/u);
  const remitMatch = source.match(/function seatRemit\(name, round, state\) \{[\s\S]*?\n\}\n/u);
  assert.ok(frameMatch, 'sharedFrame must remain locatable');
  assert.ok(remitMatch, 'seatRemit must remain locatable');
  const seatsMatch = source.match(/^const SEATS = \{[\s\S]*?^\};/mu);
  // Anchored to line start (m flag) so the usage() string on an earlier line,
  // which also contains the literal text --max-rounds, is not matched instead.
  const maxRoundsMatch = source.match(/^const maxRounds = [^;]+;/mu);
  assert.ok(seatsMatch, 'SEATS must remain locatable');
  assert.ok(maxRoundsMatch, 'maxRounds must remain locatable');

  // NOTE: this body is a template literal, so it must contain NO backticks — the
  // injected source does (sharedFrame builds template strings), but our own stub
  // and comments must not, or they terminate the literal early.
  const factory = new Function(`
    // Stubs for module-scope bindings the constructors close over. arg() is the
    // CLI reader; the real one parses process.argv, which is irrelevant here — we
    // only need maxRounds to resolve to a number so the template literal renders.
    const arg = (name, fallback) => fallback;
    const packetTitle = 'Test Packet';
    // The GLM seat's env reads a module-scope glmKey (panel-debate.mjs:116). Stub it
    // empty — this harness exercises prompt construction, never a provider call.
    const glmKey = '';
    ${maxRoundsMatch[0]}
    ${seatsMatch[0]}
    ${frameMatch[0]}
    ${remitMatch[0]}
    return { sharedFrame, seatRemit, SEATS };
  `);
  return factory();
}

test('T-ROUND-01 gives every reviewer a whole packet remit', () => {
  const { sharedFrame } = loadPromptConstructors();
  const frame = sharedFrame(1, { roundsAnswered: 0, unresolved: [], consensusCandidate: null });

  // The positive requirement: coverage of the whole packet is stated as binding.
  assert.match(frame, /accountable for the WHOLE packet/u);
  // And a finding from outside the seat's lens is explicitly permitted.
  assert.match(frame, /Report any defect you can evidence, wherever it falls/u);

  // The prohibitions must be GONE. Both old phrasings, because either one alone
  // re-creates the defect.
  assert.doesNotMatch(frame, /do not drift to the other seats/u);
  assert.doesNotMatch(frame, /hold THAT lens/u);
});

test('T-ROUND-01 seat remits use the lens for emphasis, never as a prohibition', () => {
  const { seatRemit, SEATS } = loadPromptConstructors();
  const names = Object.keys(SEATS);
  assert.ok(names.length >= 2, 'at least two seats must exist for the debate to be meaningful');

  for (const name of names) {
    const remit = seatRemit(name, 1, { roundsAnswered: 0, unresolved: [], consensusCandidate: null });
    // The seat's own stance is still present — the lens was not deleted, it was
    // demoted from a fence to a priority.
    assert.match(remit, /SEAT REMIT/u);
    assert.equal(remit.includes(SEATS[name].stance), true, `${name} keeps its stance text`);
    // Emphasis, stated.
    assert.match(remit, /does not limit what you may report/u);
    // And the old filter phrasing must not survive anywhere in the assembled remit.
    assert.doesNotMatch(remit, /Apply your stance to it/u);
    assert.doesNotMatch(remit, /do not drift to the other seats/u);
  }
});

test('isolates output state and rejects stale state from a different packet', () => {
  assert.match(source, /arg\('--out-dir', dirname\(packetPath\)\)/u);
  assert.match(source, /packetFingerprint/u);
  assert.match(source, /state\.packetFingerprint !== packetFingerprint/u);
});
