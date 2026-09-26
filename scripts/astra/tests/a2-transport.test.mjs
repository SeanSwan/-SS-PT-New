/**
 * a2-transport.test.mjs — the stdio transport half of slice A2's tests.
 *
 * Split from `a2-mcp.test.mjs` to hold Rule 4 (300 lines). The seam is real rather
 * than arithmetic: `a2-mcp.test.mjs` covers what the surface IS (the registry, the
 * guarded write, the honesty properties) and this file covers how it SPEAKS
 * (JSON-RPC framing, handshake, error handling, and surviving bad input). The two
 * have different failure modes — a registry bug is a wrong answer, a transport bug
 * is a hung or dead process — and a reader debugging one should not have to scroll
 * past the other.
 *
 * These tests drive the REAL server as a child process over REAL stdio. A mocked
 * transport would not have caught the ordering behaviour below, because the
 * ordering comes from the async/sync split in the actual dispatcher.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { openSync, closeSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { ASTRA_ROOT } from '../core/paths.mjs';
import { TOOL_NAMES } from '../mcp/tools.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(ASTRA_ROOT, 'mcp', 'server.mjs');

/**
 * Run the server with the given stdin text and return the raw spawn result.
 *
 * STDIN COMES FROM A FILE DESCRIPTOR, NOT FROM `input:`. On this machine
 * `spawnSync(..., { input })` fails with EBUSY for EVERY stdio configuration —
 * measured with default stdio, with `['pipe','pipe','pipe']`, and with
 * `['ignore','pipe','pipe']`; only the no-`input` form succeeds. That is the third
 * face of one Windows/libuv trap this repo has now been bitten by three times (see
 * `a1-core.test.mjs`'s note on piped-but-unwritten stdin). An opened fd behaves
 * like a file, so the child reads to EOF and exits cleanly, and the test stays
 * synchronous.
 */
function runServer(stdinText) {
  const dir = mkdtempSync(join(tmpdir(), 'astra-mcp-'));
  const stdinPath = join(dir, 'in.jsonl');
  writeFileSync(stdinPath, stdinText);
  const fd = openSync(stdinPath, 'r');
  try {
    return spawnSync(process.execPath, [SERVER], { encoding: 'utf8', stdio: [fd, 'pipe', 'pipe'] });
  } finally {
    closeSync(fd);
    rmSync(dir, { recursive: true, force: true });
  }
}

function speak(messages) {
  const r = runServer(`${messages.map((m) => JSON.stringify(m)).join('\n')}\n`);
  assert.equal(r.error, undefined, `spawn failed: ${r.error?.message}`);
  return r.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/**
 * Match a response BY ID, never by position.
 *
 * JSON-RPC 2.0 lets a server answer in any order, and this one does: `tools/call`
 * is `await`ed while `ping` and `tools/list` reply synchronously, so a `ping` sent
 * AFTER a tool call comes back BEFORE it. A draft of T-A2-08 asserted
 * `lines[1].id === 7` and measured `8` — the server was right and the test was
 * reading a sequence where the protocol guarantees only a set.
 */
const byId = (responses, id) => responses.find((r) => r.id === id);

test('T-A2-07 the handshake, the tool list, and an unknown method', () => {
  const res = speak([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'nope/nope' },
  ]);
  assert.equal(byId(res, 1).result.protocolVersion, '2024-11-05');
  assert.equal(byId(res, 1).result.serverInfo.name, 'astra');
  assert.equal(byId(res, 2).result.tools.length, 9);
  assert.equal(byId(res, 3).error.code, -32601);
  assert.deepEqual(byId(res, 3).error.data.tools, TOOL_NAMES);
});

test('T-A2-07 an unsupported protocol version is answered with one we DO speak', () => {
  const res = speak([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2099-01-01' } },
  ]);
  assert.equal(byId(res, 1).result.protocolVersion, '2024-11-05',
    'echoing 2099 back would claim a revision this server has never implemented');
});

test('T-A2-08 the process survives malformed input, a notification, and a bad tool', () => {
  const input = [
    '{ this is not json',
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), // no id: must NOT be answered
    JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'brain.nope' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'ping' }),
  ].join('\n') + '\n';
  const r = runServer(input);
  assert.equal(r.error, undefined, `spawn failed: ${r.error?.message}`);
  assert.equal(r.status, 0, `the server must exit cleanly, stderr: ${r.stderr}`);
  const lines = r.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  // Three replies: the parse error, the bad tool, the pong. The notification gets
  // NONE — a notification carries no id and MUST NOT be answered.
  assert.equal(lines.length, 3, `expected 3 replies, got ${lines.length}`);
  const parseErr = lines.find((l) => l.id === null);
  assert.equal(parseErr.error.code, -32700, 'a malformed line is a bounded parse error');
  assert.equal(byId(lines, 7).result.isError, true,
    'a bad tool is a RESULT with isError, not a protocol error');
  assert.ok(byId(lines, 8), 'the process must still answer a good request after a bad one');
});

test('T-A2-09 tools/call without a name is an invalid request, not a crash', () => {
  const res = speak([{ jsonrpc: '2.0', id: 5, method: 'tools/call', params: {} }]);
  assert.equal(byId(res, 5).error.code, -32600);
});

test('T-A2-10 responses arrive keyed by id even when they interleave', () => {
  // The async/sync split means a later `ping` can beat an earlier `tools/call`.
  // This asserts the property a client actually depends on: every id gets exactly
  // one reply. It does NOT assert an order, because none is guaranteed.
  const res = speak([
    { jsonrpc: '2.0', id: 'a', method: 'tools/call', params: { name: 'brain.capabilities' } },
    { jsonrpc: '2.0', id: 'b', method: 'ping' },
    { jsonrpc: '2.0', id: 'c', method: 'tools/list' },
  ]);
  assert.equal(res.length, 3);
  assert.deepEqual(res.map((r) => r.id).sort(), ['a', 'b', 'c']);
  assert.equal(byId(res, 'b').result && typeof byId(res, 'b').result === 'object', true);
});

test('T-A2-11 an empty stdin line is ignored, and EOF exits 0', () => {
  const r = runServer('\n\n   \n');
  assert.equal(r.error, undefined, `spawn failed: ${r.error?.message}`);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '', 'blank lines must produce no replies');
});
