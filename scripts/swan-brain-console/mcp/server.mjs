#!/usr/bin/env node
/**
 * Swan Brain Console — read-only MCP server (stdio).
 * @module scripts/swan-brain-console/mcp/server
 *
 * WHAT THIS IS
 * A stdio Model Context Protocol server that exposes the console's read-only tools to
 * an agent. It speaks JSON-RPC 2.0, one message per line, which is the MCP stdio
 * transport.
 *
 * ROUND 8 (2026-09-20): this line used to say "four read-only tools". It was correct when
 * written — S1 shipped four — and went stale when `swan_get_gate_health` moved in from S4
 * (ruled D17c), so the transport's own orientation text understated the surface. The count
 * is pinned in CODE by `tools.test.mjs` (`TOOL_NAMES.length === 5`) and was pinned in PROSE
 * nowhere, which is why it drifted. Rather than update the number and leave a second copy
 * to go stale again, the number is GONE: the list lives in `tools.mjs`, and prose that does
 * not restate a fact cannot contradict it. Same mechanism as round 7's startup banner.
 *
 * WHY IT DOES NOT NEED THE CONSOLE RUNNING (ruled D17a)
 * The tools import the console's reader modules directly, so this process has no
 * HTTP dependency at all. There is no port to be down, no second source of truth,
 * and no ordering requirement between the two surfaces.
 *
 * THE TWO PROPERTIES THAT MATTER
 *   1. It NEVER exits because a tool failed. A tool error is a JSON-RPC result with
 *      `isError: true` and a hint — not a crash. An agent that discovers a dead tool
 *      learns nothing; an agent that gets a correctable error learns the fix.
 *   2. It NEVER exposes a tool that writes. `tools/list` is built from the registry
 *      in `tools.mjs`, whose exported name list is pinned to an exact literal by
 *      `tools.test.mjs`. There is no path from a request to a mutation.
 *
 * BOUNDS: reads files under `docs/`, `.ai-workflow/` and the three-worlds tree. No network,
 * no DB, no .env, no writes. Speaks only over stdin/stdout.
 *
 * ROUND 8 (2026-09-20): this line omitted `.ai-workflow/`, which the server DOES read —
 * `swan_get_gate_health` → `gateHealth.mjs` reads `.ai-workflow/gate-mode.json`. `tools.mjs`
 * stated the bounds correctly and this copy did not, so the two files disagreed about a
 * security property. On a read-only surface the BOUNDS block IS the disclosure: a reviewer
 * auditing "what can this process touch?" reads it and no further. Understating it is a
 * false statement about the surface's reach, which is the one thing this console exists to
 * get right. Corrected to match `tools.mjs`; there is no exposure to disclose, only a wrong
 * disclosure.
 *
 * Register (Claude Code / any MCP client):
 *   { "mcpServers": { "swan-brain-console": {
 *       "command": "node",
 *       "args": ["scripts/swan-brain-console/mcp/server.mjs"] } } }
 *
 * Run standalone for a smoke test: node scripts/swan-brain-console/mcp/server.mjs
 */
import { createInterface } from 'node:readline';
import { TOOL_NAMES, TOOL_SPECS, callTool, FORBIDDEN_NAMES } from './tools.mjs';

const SERVER_NAME = 'swan-brain-console';
const SERVER_VERSION = '3.0.0';

/**
 * The protocol revisions this server actually implements.
 *
 * ROUND 8 (2026-09-20): `DEFAULT_PROTOCOL` used to be its own string literal, a second copy
 * of a fact this list now owns. Derived below so the default cannot name a revision the
 * server does not support.
 */
export const SUPPORTED_PROTOCOLS = Object.freeze(['2024-11-05']);

/** Derived, never a second literal. */
const DEFAULT_PROTOCOL = SUPPORTED_PROTOCOLS[0];

/** JSON-RPC error codes we actually use. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function replyError(id, code, message, data) {
  const error = data === undefined ? { code, message } : { code, message, data };
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error })}\n`);
}

/**
 * The MCP handshake.
 *
 * ROUND 8 (2026-09-20): this used to echo the client's requested version UNCONDITIONALLY,
 * on the reasoning that "a version mismatch is the client's to decide, not ours". The
 * motivation was sound — do not break a client that is merely newer than this file — but the
 * mechanism asserted something false: replying `protocolVersion: "2099-01-01"` to a client
 * that asked for it tells that client this server speaks a revision it has never
 * implemented. MCP says a server that does not support the requested revision MUST answer
 * with one it DOES support and let the client decide whether to proceed — which is the same
 * permissiveness, achieved without a false claim.
 *
 * A client asking for a revision we support still gets exactly what it asked for, so the
 * ordinary path is unchanged.
 */
function handleInitialize(id, params) {
  const requested = params && typeof params.protocolVersion === 'string'
    ? params.protocolVersion
    : DEFAULT_PROTOCOL;
  const agreed = SUPPORTED_PROTOCOLS.includes(requested) ? requested : DEFAULT_PROTOCOL;
  reply(id, {
    protocolVersion: agreed,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  });
}

function handleToolsList(id) {
  reply(id, { tools: TOOL_SPECS });
}

/**
 * Run one tool and wrap the outcome as MCP content.
 *
 * A refusal or a failure is returned as a NORMAL result carrying `isError: true`,
 * never as a JSON-RPC error: JSON-RPC errors are for protocol faults, and a tool
 * that correctly refuses a forbidden name is working, not broken. Conflating the
 * two is what makes an agent retry a request that will never succeed.
 */
async function handleToolsCall(id, params) {
  const name = params && params.name;
  if (typeof name !== 'string') {
    replyError(id, INVALID_REQUEST, 'tools/call requires a string "name"');
    return;
  }
  const args = params && typeof params.arguments === 'object' && params.arguments !== null
    ? params.arguments
    : {};
  const outcome = await callTool(name, args);
  const failed = Boolean(outcome && typeof outcome === 'object' && 'error' in outcome);
  reply(id, {
    content: [{ type: 'text', text: JSON.stringify(outcome, null, 2) }],
    isError: failed,
  });
}

/** Route one parsed message. Returns nothing; every path writes its own reply. */
async function route(msg) {
  // A notification carries no id and MUST NOT be answered.
  const isNotification = msg.id === undefined || msg.id === null;
  const method = msg.method;

  if (typeof method !== 'string') {
    if (!isNotification) replyError(msg.id ?? null, INVALID_REQUEST, 'missing "method"');
    return;
  }
  if (isNotification) return; // notifications/initialized, notifications/cancelled, …

  switch (method) {
    case 'initialize':
      handleInitialize(msg.id, msg.params);
      return;
    case 'tools/list':
      handleToolsList(msg.id);
      return;
    case 'tools/call':
      await handleToolsCall(msg.id, msg.params);
      return;
    case 'ping':
      reply(msg.id, {});
      return;
    default:
      replyError(
        msg.id,
        METHOD_NOT_FOUND,
        `unknown method: ${method}`,
        { tools: TOOL_NAMES, forbidden: FORBIDDEN_NAMES },
      );
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const text = line.trim();
  if (!text) return;
  let msg;
  try {
    msg = JSON.parse(text);
  } catch (err) {
    // A malformed line is a bounded protocol error. It must not kill the loop:
    // a client that sends one bad frame should still be able to send a good one.
    replyError(null, PARSE_ERROR, 'invalid JSON', String(err && err.message));
    return;
  }
  // `route` is async and could reject if a future edit introduces a bug. Catching
  // here keeps property 1 — the process outlives any single bad request.
  Promise.resolve()
    .then(() => route(msg))
    .catch((err) => {
      if (msg && msg.id !== undefined && msg.id !== null) {
        replyError(msg.id, INTERNAL_ERROR, 'internal error', String(err && err.message));
      }
    });
});

rl.on('close', () => process.exit(0));

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
