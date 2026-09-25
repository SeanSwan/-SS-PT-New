/**
 * server-contract — drives the MCP stdio server end to end.
 * @module scripts/swan-brain-console/mcp/server.test
 *
 * WHY THIS IS A SEPARATE FILE FROM `tools.test.mjs`
 * Two reasons, one structural and one substantive. Structurally, `tools.test.mjs`
 * tests `tools.mjs` and this file tests `server.mjs` — one subject per suite, and both
 * stay inside the 300-line budget instead of one file carrying both. Substantively,
 * the handlers can be perfectly correct while the transport around them is broken: a
 * server that answers `tools/list` but dies on a malformed frame, or that reports a
 * correct refusal as a JSON-RPC protocol fault, passes every handler test and is still
 * unusable. Only a test that spawns the real process can see that.
 *
 * THE PROPERTY UNDER TEST
 * The process must outlive every message it is sent, including a malformed one, and it
 * must never expose a tool that writes. `spawnSync` closes stdin at the end, so a clean
 * exit code 0 is itself the evidence that the loop survived everything above it.
 *
 * Run: node --test scripts/swan-brain-console/mcp/server.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Kept as a LITERAL, on purpose — this is the pin, exactly like `EXPECTED_TOOLS` above.
 *
 * `mcp/server.mjs` is deliberately NOT imported here: it wires `readline` on `process.stdin`
 * and registers `rl.on('close', () => process.exit(0))` at module scope, so importing it
 * would attach a stdin reader to the test process and let it call `process.exit`. Every test
 * in this file therefore drives the real process through `spawnSync`. That is a stronger
 * test of the transport, but it means the expected values must be stated here rather than
 * read back out of the module — which is what a pin is for.
 */
const EXPECTED_PROTOCOLS = ['2024-11-05'];

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The allowed tool set. Kept as a literal, on purpose — this is the pin.
 *
 * Ruled D17(c): S1 shipped four; `swan_get_gate_health` moved to S4 and arrived with
 * `gateHealth.mjs`. When it landed, the two assertions that use this list failed on their
 * own — which is the RED for the transport layer, observed rather than assumed:
 *
 *     not ok 3 - tools/list returns exactly the four allowed tools
 *     not ok 8 - an unknown method is -32601 and lists what does exist
 */
const EXPECTED_TOOLS = [
  'swan_get_state',
  'swan_list_variants',
  'swan_get_engine_state',
  'swan_search_doctrine',
  'swan_get_gate_health',
];

const input = [
  JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }),
  JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
  JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'swan_get_engine_state', arguments: {} } }),
  'this line is not JSON at all',
  JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'promote_variant', arguments: {} } }),
  JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'no/such/method' }),
  JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'ping' }),
  /*
   * ROUND 8 (2026-09-20): a client asking for a protocol revision this server has never
   * implemented. The handshake used to echo it back unconditionally, which told the client
   * this server spoke "2099-01-01". It must answer with a revision it DOES support.
   */
  JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'initialize', params: { protocolVersion: '2099-01-01' } }),
].join('\n') + '\n';

const run = spawnSync(process.execPath, [join(HERE, 'server.mjs')], {
  input, encoding: 'utf8', timeout: 60_000,
});

/*
 * A CHILD THAT NEVER RAN MUST NOT MASQUERADE AS A SERVER DEFECT (round 18, 2026-09-24 — sable).
 *
 * This suite pipes JSON-RPC frames into the server's stdin, so a piped stdin is INTRINSIC to the
 * subject under test. Where that configuration is unavailable, `spawnSync` returns a structurally
 * valid result with every field empty — measured repeatedly: `status: null`, `stdout: undefined`,
 * `stderr: undefined`, `error: EBUSY`. Nothing throws at the call site, so the unguarded
 * `run.stdout.split('\n')` below threw a bare `TypeError` at MODULE TOP LEVEL — which aborted this
 * entire file before a single assertion ran, while the gate still counted the file as covered. A
 * crashed file and a failing file must not look the same.
 *
 * The claim here is CONFIGURATION-LEVEL and deliberately not causal: the failing configuration is a
 * piped stdin (Astra's round-18 adjudication rejected the stronger "the sandbox cannot create a
 * writable pipe into stdin" as unestablished mechanism — sandbox policy, runtime behaviour and an
 * interception layer are all consistent with the measurements).
 *
 * Throwing here gives the failure a NAME, so a reader — and the gate — can classify it as BLOCKED
 * rather than as a failing MCP server.
 */
if (run.error || run.status === null) {
  const cause = run.error?.code ?? (run.signal ? `killed by ${run.signal}` : 'status null');
  throw new Error(
    `SPAWN-UNAVAILABLE: the MCP server child process could not be started (${cause}). No `
    + 'assertion in this file was executed — this is an environment BLOCKER, not a defect in the '
    + 'server. Re-run where child processes can be created.',
  );
}

/** Index replies by id. NOT by position: handlers are async, so order is not a contract. */
const byId = new Map();
for (const line of run.stdout.split('\n')) {
  if (!line.trim()) continue;
  const msg = JSON.parse(line);
  byId.set(msg.id === undefined ? 'notification' : msg.id, msg);
}

describe('transport — the stdio server answers and survives bad input', () => {
  test('the process exited cleanly after every message, including the malformed one', () => {
    assert.equal(run.status, 0, `server exited ${run.status}; stderr: ${run.stderr}`);
  });

  test('the handshake answers with a protocol version and a tools capability', () => {
    const init = byId.get(1);
    assert.equal(init.result.protocolVersion, '2024-11-05');
    assert.ok(init.result.capabilities.tools);
    assert.equal(init.result.serverInfo.name, 'swan-brain-console');
  });

  test('tools/list returns exactly the five allowed tools', () => {
    assert.deepEqual(byId.get(2).result.tools.map((t) => t.name), EXPECTED_TOOLS);
  });

  test('every listed tool carries a description and an object input schema', () => {
    for (const tool of byId.get(2).result.tools) {
      assert.ok(tool.description.length > 30, `${tool.name} needs a real description`);
      assert.equal(tool.inputSchema.type, 'object');
    }
  });

  test('tools/call returns the engine state as MCP text content', () => {
    const msg = byId.get(3);
    assert.equal(msg.result.isError, false);
    const body = JSON.parse(msg.result.content[0].text);
    assert.ok(['DECLARED_BLOCKED', 'VERIFIED_BLOCKED', 'UNKNOWN'].includes(body.durableWrites));
  });

  test('a malformed frame is a bounded -32700 and the loop keeps going', () => {
    assert.equal(byId.get(null).error.code, -32700);
    // The proof the loop survived: a LATER request still received an answer.
    assert.ok(byId.has(5), 'the request after the malformed frame received no reply');
  });

  test('a forbidden tool is refused as a result with isError, not as a protocol error', () => {
    const msg = byId.get(4);
    assert.equal(msg.result.isError, true);
    assert.match(msg.result.content[0].text, /forbidden tool: promote_variant/);
    assert.equal(msg.error, undefined, 'a correct refusal is not a protocol fault');
  });

  test('an unknown method is -32601 and lists what does exist', () => {
    assert.equal(byId.get(5).error.code, -32601);
    assert.deepEqual(byId.get(5).error.data.tools, EXPECTED_TOOLS);
  });

  test('a notification is not answered', () => {
    assert.ok(!byId.has('notification'), 'a notification must not receive a reply');
  });

  test('ping answers', () => {
    assert.deepEqual(byId.get(6).result, {});
  });
});

/*
 * ROUND 8 (2026-09-20) — the handshake must not claim a protocol it does not implement.
 *
 * The old handler echoed whatever the client asked for, reasoning that "a version mismatch
 * is the client's to decide, not ours". The reasoning was fine; the mechanism asserted
 * something false. Answering `protocolVersion: "2099-01-01"` to a client that requested it
 * tells that client this server speaks a revision it has never implemented — a false claim
 * about capability, which is the one kind of error this console exists to prevent.
 *
 * MCP's rule: a server that does not support the requested revision MUST answer with one it
 * does support, and the client decides whether to proceed. Same permissiveness, no lie.
 */
describe('transport — the handshake answers with a protocol this server implements', () => {
  test('a requested version we support is echoed exactly', () => {
    assert.equal(byId.get(1).result.protocolVersion, '2024-11-05');
  });

  test('a requested version we do NOT support is answered with one we do, not echoed', () => {
    const reply = byId.get(7).result;
    assert.notEqual(
      reply.protocolVersion,
      '2099-01-01',
      'the server echoed a protocol revision it has never implemented',
    );
    assert.ok(
      EXPECTED_PROTOCOLS.includes(reply.protocolVersion),
      `answered with "${reply.protocolVersion}", which is not in EXPECTED_PROTOCOLS`,
    );
  });

  test('every handshake reply names a version this server actually implements', () => {
    for (const id of [1, 7]) {
      const v = byId.get(id).result.protocolVersion;
      assert.ok(EXPECTED_PROTOCOLS.includes(v), `reply ${id} named unsupported version "${v}"`);
    }
  });

  test('the supported-protocol pin is non-empty and date-shaped', () => {
    assert.ok(EXPECTED_PROTOCOLS.length > 0, 'a server supporting no protocol is not a server');
    for (const v of EXPECTED_PROTOCOLS) assert.match(v, /^\d{4}-\d{2}-\d{2}$/);
  });
});
