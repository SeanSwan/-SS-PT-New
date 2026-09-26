#!/usr/bin/env node
/**
 * server.mjs — Astra's MCP server (stdio, JSON-RPC 2.0, one message per line).
 *
 * THE FOURTH CONSUMER. "One brain, three consumers" is the packet's framing for the
 * backend service, the Forge CLI and the MCP server. Astra is the fourth, and the
 * first one Sean can look at. This file is the transport only: every tool body
 * lives in `tools.mjs`, and every verdict lives in `core/`.
 *
 * TWO PROPERTIES THAT MATTER, both inherited from the console this replaces
 * (`02-BLUEPRINT.md` §7 says reuse the patterns, not the data):
 *
 *   1. IT NEVER EXITS BECAUSE A TOOL FAILED. A tool error is a JSON-RPC *result*
 *      carrying `isError: true`, never a JSON-RPC error. JSON-RPC errors are for
 *      protocol faults; a tool that correctly refuses a forbidden name is working,
 *      not broken. Conflating the two is what makes an agent retry a request that
 *      can never succeed. A malformed line is likewise bounded and does not kill
 *      the loop.
 *
 *   2. THE PROCESS OUTLIVES ANY SINGLE BAD REQUEST. `route` is async and could
 *      reject if a future edit introduces a bug; the rejection is caught at the
 *      readline boundary so property 1 survives edits to this file.
 *
 * WHY IT NEEDS NOTHING ELSE RUNNING. The tools import `core/` directly, so there is
 * no HTTP dependency, no port to be down, no second source of truth, and no
 * ordering requirement between the MCP server and the console surface.
 *
 * BOUNDS: reads `docs/`, `scripts/design-brain/config/` and the shared compiler. No
 * network, no DB, no `.env`, and exactly one write path (`brain.reject`, guarded by
 * `confirm: true`). It never writes `taste/` — that has one writer, the probe page.
 *
 * Register (Claude Code / any MCP client):
 *   { "mcpServers": { "astra": {
 *       "command": "node",
 *       "args": ["scripts/astra/mcp/server.mjs"] } } }
 *
 * List the surface without starting a transport:
 *   node scripts/astra/mcp/server.mjs --list-tools
 */

import { createInterface } from 'node:readline';
import { TOOL_NAMES, TOOL_SPECS, callTool, verifyToolRegistry, FORBIDDEN_NAMES } from './tools.mjs';

const SERVER_NAME = 'astra';
const SERVER_VERSION = '0.1.0';

/** The protocol revisions this server implements. */
export const SUPPORTED_PROTOCOLS = Object.freeze(['2024-11-05']);

/** Derived, never a second literal — the default cannot name a revision we lack. */
const DEFAULT_PROTOCOL = SUPPORTED_PROTOCOLS[0];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

const write = (payload) => process.stdout.write(`${JSON.stringify(payload)}\n`);
const reply = (id, result) => write({ jsonrpc: '2.0', id, result });
const replyError = (id, code, message, data) => {
  write(data === undefined
    ? { jsonrpc: '2.0', id, error: { code, message } }
    : { jsonrpc: '2.0', id, error: { code, message, data } });
};

/**
 * The handshake.
 *
 * A client asking for a revision we support gets exactly what it asked for. A
 * client asking for one we do NOT support is answered with one we do, and left to
 * decide whether to proceed — which is MCP's rule, and the only way to be
 * permissive without asserting something false. Echoing an unimplemented revision
 * back would tell the client this server speaks a protocol it has never had.
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

/** Wrap a tool outcome as MCP content. A refusal is a result, not a protocol error. */
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

/** Route one parsed message. Every path writes its own reply. */
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
    case 'initialize': handleInitialize(msg.id, msg.params); return;
    case 'tools/list': reply(msg.id, { tools: TOOL_SPECS }); return;
    case 'tools/call': await handleToolsCall(msg.id, msg.params); return;
    case 'ping': reply(msg.id, {}); return;
    default:
      replyError(msg.id, METHOD_NOT_FOUND, `unknown method: ${method}`, {
        tools: TOOL_NAMES, forbidden: FORBIDDEN_NAMES,
      });
  }
}

/**
 * `--list-tools`: print the surface and exit.
 *
 * This is the slice's exit criterion, and it is also the honest form of "what can
 * this thing do?" — the registry prints itself, so the answer cannot drift from
 * the implementation. Exit 1 if the registry is internally inconsistent, because a
 * spec with no handler is a tool that lists and then fails at dispatch.
 */
export function listTools() {
  const check = verifyToolRegistry();
  if (!check.ok) {
    process.stderr.write(`REGISTRY INCONSISTENT: ${JSON.stringify(check)}\n`);
    return 1;
  }
  process.stdout.write(`${SERVER_NAME} — ${check.count} tools (1 write: brain.reject, needs confirm)\n\n`);
  for (const t of TOOL_SPECS) {
    process.stdout.write(`  ${t.name}\n`);
    process.stdout.write(`      ${t.description.split(/(?<=\.)\s/)[0]}\n`);
  }
  return 0;
}

/* `import.meta.main` is not in Node; the argv check is the portable form. Guarded so
 * a test can import this module without it seizing stdin. */
const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('/scripts/astra/mcp/server.mjs');

if (invokedDirectly) {
  if (process.argv.includes('--list-tools')) {
    process.exit(listTools());
  } else {
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.on('line', (line) => {
      const text = line.trim();
      if (!text) return;
      let msg;
      try {
        msg = JSON.parse(text);
      } catch (err) {
        replyError(null, PARSE_ERROR, 'invalid JSON', String(err && err.message));
        return;
      }
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
  }
}
