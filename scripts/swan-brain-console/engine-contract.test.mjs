/**
 * engine-contract — locks in honest reporting of the Design Brain engine state.
 * @module scripts/swan-brain-console/engine-contract.test
 *
 * WHY THIS FILE IS SEPARATE FROM THE APP'S VITEST SUITE
 * `engineState.mjs` is a repo-level Node module, not frontend code, so it is tested
 * with `node --test` and needs no bundler. The fleet's build contract (structure,
 * divergence, copy) lives in the app's vitest suite instead, because those modules
 * import React and styled-components and cannot be loaded by bare Node.
 *
 * THIS SUITE IS GREEN FROM THE START, ON PURPOSE. It is not RED-then-GREEN: the
 * engine is already fail-closed, so the behaviour under test already exists. What
 * this guards is that the console can never quietly start claiming durable writes
 * it does not have. It fails if someone later populates `writeControls` or drops
 * the gate reason, which are the two ways this surface could start lying.
 *
 * Run: node --test scripts/swan-brain-console/engine-contract.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const ENGINE_STATE = join(HERE, 'engineState.mjs');
const ENGINE_README = join(REPO, 'scripts/design-brain/README.md');

const mod = await import(pathToFileURL(ENGINE_STATE).href);
const state = mod.readEngineState(REPO);

describe('R7 — the console reports the engine honestly', () => {
  test('reports the gate as DECLARED, never as a bare verified BLOCKED', () => {
    // The word "BLOCKED" alone was an unsupported claim: this console is GET-only and
    // cannot TEST a write gate, so it may not speak as though it had. It reports that
    // the engine DECLARES the gate, which is what it can actually observe.
    assert.equal(state.durableWrites, 'DECLARED_BLOCKED');
    assert.notEqual(state.durableWrites, 'BLOCKED');
    assert.notEqual(state.durableWrites, 'VERIFIED_BLOCKED'); // needs a probe that does not exist
  });

  test('exposes no write control whatsoever', () => {
    assert.deepEqual(state.writeControls, []);
  });

  test('states a real gate reason rather than a placeholder', () => {
    assert.match(state.reason, /fail-closed|source-classification/i);
    assert.ok(state.reason.length > 40, 'reason must be a quotation, not a stub');
    assert.ok(state.reason.length <= 600, 'reason must be quoted, not the whole README');
  });

  test('quotes the matched clause as evidence, not just a verdict', () => {
    assert.ok(typeof state.declaration === 'string' && state.declaration.length > 20);
    assert.match(state.declaration, /fail-closed/i);
  });

  test('quotes the engine README instead of paraphrasing it', () => {
    const readme = readFileSync(ENGINE_README, 'utf8');
    assert.ok(readme.includes('fail-closed'), 'engine README no longer states fail-closed — re-review');
    assert.ok(
      state.reason.toLowerCase().includes('fail-closed'),
      'console reason must echo the engine README wording',
    );
  });

  test('reports real counts read at call time, not transcribed constants', () => {
    assert.ok(state.sourceFiles > 0, 'expected engine source modules');
    assert.ok(state.testFiles > 0, 'expected engine test files');
    assert.equal(state.readmePresent, true);
    assert.ok(state.archetypes >= 20, 'expected the archetype routing table');
    const again = mod.readEngineState(REPO);
    assert.equal(again.sourceFiles, state.sourceFiles);
    assert.equal(again.durableWrites, state.durableWrites);
  });

  test('the engine really is present, so the verdict means gated and not merely missing', () => {
    assert.ok(
      existsSync(join(REPO, 'scripts/design-brain/src')),
      'engine src missing — the verdict would then be a false description',
    );
    assert.ok(existsSync(ENGINE_README), 'engine README missing');
  });
});

/**
 * FALSIFIABILITY — added after a hostile review (glm-5.3, F5) caught the previous
 * version returning a hardcoded `durableWrites: 'BLOCKED'`. That made the console
 * structurally incapable of noticing the engine being unblocked: it would have said
 * BLOCKED forever, with a reason string quietly asking for re-review.
 *
 * These tests assert the verdict is DERIVED from a checkable input, by driving the
 * real function against synthetic READMEs. If someone reinstates a literal, the
 * "same input, same verdict" test below stops being meaningful and the change test
 * fails outright.
 */
describe('R7 — the verdict is derived, not asserted', () => {
  /** Build a throwaway repo whose only relevant file is the engine README. */
  function fixtureRepo(readmeText) {
    const dir = mkdtempSync(join(tmpdir(), 'engine-contract-'));
    mkdirSync(join(dir, 'scripts/design-brain'), { recursive: true });
    writeFileSync(join(dir, 'scripts/design-brain/README.md'), readmeText, 'utf8');
    return dir;
  }

  test('reports DECLARED_BLOCKED when the README declares the gate', () => {
    const repo = fixtureRepo(
      'Writes remain fail-closed until the signed source-classification authority '
      + 'adapter has production keys, trusted time, and revocation state.',
    );
    const s = mod.readEngineState(repo);
    assert.equal(s.durableWrites, 'DECLARED_BLOCKED');
    assert.equal(s.gateDeclared, true);
  });

  /**
   * THE NEGATION REGRESSION. Both GLM seats and Fable flagged this class independently:
   * a README saying the gate must GO still contains the phrase, so a plain `includes()`
   * reported maximum confidence that the gate was PRESENT at the exact moment the
   * document said it was gone. The clause is now read for negation.
   */
  test('reports UNKNOWN when the README NEGATES the gate', () => {
    const repo = fixtureRepo('Writes must no longer remain fail-closed as of this release.');
    const s = mod.readEngineState(repo);
    assert.equal(s.durableWrites, 'UNKNOWN');
    assert.equal(s.gateDeclared, false);
    assert.match(s.reason, /negates it|UNKNOWN/i);
  });

  test('reports UNKNOWN — never a false all-clear — when the declaration is gone', () => {
    const repo = fixtureRepo('Everything is fine. Writes are available now.');
    const s = mod.readEngineState(repo);
    assert.equal(s.durableWrites, 'UNKNOWN');
    assert.equal(s.gateDeclared, false);
    assert.match(s.reason, /UNKNOWN|re-review/i);
    // The critical property: no input may produce an "unblocked" verdict.
    assert.notEqual(s.durableWrites, 'AVAILABLE');
    assert.notEqual(s.durableWrites, 'OK');
    assert.notEqual(s.durableWrites, 'BLOCKED');
  });

  test('reports UNKNOWN when the README is absent entirely', () => {
    const repo = mkdtempSync(join(tmpdir(), 'engine-contract-empty-'));
    const s = mod.readEngineState(repo);
    assert.equal(s.durableWrites, 'UNKNOWN');
    assert.equal(s.readmePresent, false);
  });

  test('the real repo currently declares the gate (guards against silent drift)', () => {
    assert.equal(state.gateDeclared, true);
    assert.equal(state.durableWrites, 'DECLARED_BLOCKED');
  });
});
