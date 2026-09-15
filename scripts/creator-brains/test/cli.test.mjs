#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/cli.test.mjs
 * PURPOSE: Tests T-19, T-20 and T-20b — the command surface and its argv
 *          parsing.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THESE LIVE IN THEIR OWN FILE:
 *   They are the only tests that drive `cli.mjs` end to end and read the report
 *   the user would actually see, and both assertions below exist because a LIVE
 *   smoke run found real bugs that the entire rest of the suite passed straight
 *   through:
 *     - `fetch --per-hour=2` reported "no matching enabled creator" while two
 *       creators sat enabled in the registry, because the flag was handed to
 *       `resolveTarget` as if it were a creator reference.
 *     - `query "mask"` reported "a query is required", because
 *       `args.indexOf('--creator')` returns -1 when the flag is absent and the
 *       resulting `-1 + 1 === 0` filtered out the FIRST positional term.
 *   Library-level tests cannot see argv handling at all, so this surface gets
 *   its own file rather than a footnote in the system suite.
 *
 * RUN: node --test scripts/creator-brains/test/cli.test.mjs
 * @module creator-brains/test/cli
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';

import { fakeDeps, makeClock, tempRoot, uploadRow, fixtureDoc } from './helpers.mjs';

/** A creator row as the registry stores it. */
function creatorRow(channelId, title = 'Creator') {
  return {
    channelId, title, handle: '@creator', url: `https://www.youtube.com/channel/${channelId}/videos`, enabled: true,
  };
}

async function seedRegistry(r, creators) {
  const { loadRegistry, saveRegistry, upsertCreator } = await import('../lib/store.mjs');
  const reg = loadRegistry(r);
  for (const c of creators) upsertCreator(reg, c);
  saveRegistry(reg, r);
}

function depsWithUploads(channelId, n) {
  return fakeDeps({
    listUploads: () => Array.from({ length: n }, (_, i) => uploadRow(i, { id: `v${String(i).padStart(10, '0')}`.slice(0, 11) })),
    resolveCreator: () => ({ channelId, title: 'Creator', url: 'https://x' }),
  });
}

/** Capture what a command writes to stdout, so assertions read the report the
 *  user would actually see rather than a return value nobody prints. */
async function capture(fn) {
  const chunks = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(String(s)); return true; };
  try {
    const code = await fn();
    return { code, text: chunks.join('') };
  } finally {
    process.stdout.write = original;
  }
}

// ── T-19 — the command surface exists ───────────────────────────────────────

test('T-19 the CLI module exposes the documented commands', async () => {
  const cli = await import('../cli.mjs');
  for (const cmd of ['add', 'list', 'discover', 'fetch', 'build', 'query', 'daily', 'status', 'sync', 'canary']) {
    assert.equal(typeof cli.COMMANDS?.[cmd], 'function', `command '${cmd}' is implemented`);
  }
});

test('T-19b the CLI ENTRY POINT works, not just the exported table', async () => {
  // Every other test here calls `COMMANDS.<name>(...)` directly, which is why a
  // refactor could leave `main()` referencing an unbound `COMMANDS` while the
  // whole suite stayed green: `export … from` re-exports a name without creating
  // a local binding. A user runs the ENTRY POINT, so one test must too.
  const cli = await import('../cli.mjs');
  assert.equal(typeof cli.main, 'function', 'main() is exported');

  const r = tempRoot('cb-t19b');
  const { text, code } = await capture(() => cli.main(['--help']));
  assert.equal(code, 0, 'help is not an error');
  assert.match(text, /creator-brains/, 'and prints the usage banner');

  // A real command through the real entry point, against an empty store.
  const prev = process.env.CREATOR_BRAINS_ROOT;
  process.env.CREATOR_BRAINS_ROOT = r;
  try {
    const listed = await capture(() => cli.main(['list']));
    assert.equal(listed.code, 0, `list exited ${listed.code}: ${listed.text}`);
    assert.match(listed.text, /no creators yet|creator\(s\)/);
  } finally {
    if (prev === undefined) delete process.env.CREATOR_BRAINS_ROOT;
    else process.env.CREATOR_BRAINS_ROOT = prev;
  }
});

test('T-21 authorize and sync are wired and report BLOCKED without a credential', async () => {
  const cli = await import('../cli.mjs');
  const r = tempRoot('cb-t21oauth');
  const cred = join(r, 'absent-client.json');
  const tok = join(r, 'token.json');

  // `authorize` with no credential: refuses, names the reason, prints the steps,
  // and does NOT open a browser or touch the network.
  const auth = await capture(() => cli.COMMANDS.authorize({
    args: ['--credential', cred, '--token', tok],
  }));
  assert.equal(auth.code, 2, 'a refusal is exit 2, not a crash and not a success');
  assert.match(auth.text, /oauth_credentials_absent/);
  assert.match(auth.text, /Desktop app/, 'the unblock path is spelled out');
  assert.ok(!/Opening your browser/.test(auth.text), 'and it never got as far as consent');

  // `sync` for the same store: also blocked, also named.
  const sync = await capture(() => cli.COMMANDS.sync({ r }));
  assert.equal(sync.code, 2);
  assert.match(sync.text, /BLOCKED.*oauth_credentials_absent/s);
});

// ── T-20 — argv parsing ─────────────────────────────────────────────────────

test('T-20 a FLAG is never mistaken for a creator reference', async () => {
  const cli = await import('../cli.mjs');
  const r = tempRoot('cb-t20');
  const ch = `UC${'h'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const state = loadState(r);
  state.videos.vvvvvvvvvvv = newVideoState('vvvvvvvvvvv', ch, { now: makeClock().iso() });
  saveState(state, r);

  const { code, text } = await capture(() => cli.COMMANDS.fetch({
    args: ['--per-hour=2'], r, deps: depsWithUploads(ch, 0), clock: null,
  }));
  assert.ok(!/no matching enabled creator/.test(text), `a flag was read as a creator ref: ${text}`);
  assert.equal(code, 0);
  assert.match(text, /fetched \d+/, 'the fetch phase actually reported');
});

test('T-20b the first query term is not swallowed', async () => {
  const cli = await import('../cli.mjs');
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { writeDoc } = await import('../lib/store.mjs');

  const r = tempRoot('cb-t20b');
  const ch = `UC${'i'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);
  writeDoc(r, fixtureDoc({ channelId: ch, videoId: 'zzz99999999' }));
  renderBrain(buildBrain(r, { channelId: ch, title: 'Creator' }), { r, now: makeClock() });

  const { code, text } = await capture(() => cli.COMMANDS.query({ args: ['trough'], r }));
  assert.ok(!/a query is required/.test(text), `the first term was swallowed: ${text}`);
  assert.equal(code, 0, 'a match was found');
  assert.match(text, /trough/i);

  const narrowed = await capture(() => cli.COMMANDS.query({ args: ['trough', '--creator', ch], r }));
  assert.equal(narrowed.code, 0, '--creator does not eat the term before it');
});
