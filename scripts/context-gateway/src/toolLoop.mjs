/**
 * toolLoop.mjs — bounded provider tool-calling loop (Phase 4 slice 2).
 * =====================================================================
 * Lets a tool-calling provider request MORE evidence mid-reasoning through the bounded, audited,
 * ceiling-screened tool session (tools.mjs). Every safety property already proven there holds
 * unchanged; this file only adds the ORCHESTRATION and its own two budgets:
 *   - iteration budget  — max provider round-trips (default 6), so the loop always terminates.
 *   - cumulative spend  — SWAN_CONTEXT_MAX_USD caps TOTAL cost across all turns (T8), checked
 *                         before each turn; the loop stops gracefully (not crashes) at the cap.
 * Tool arguments from the model are untrusted: each is JSON-parsed defensively and dispatched by an
 * allowlist (unknown tool / bad args → an error result the model sees, never a throw that aborts).
 * Tool RESULTS are already ceiling-screened + secret-redacted by the session, so nothing here
 * re-checks egress. The final answer is citation-audited against the packet (T7).
 *
 * The network turn lives in transport.callWithTools; pass fetchImpl for offline tests. $0 until a
 * real fetch + a set SWAN_CONTEXT_MAX_USD are both present.
 *
 * @module context-gateway/toolLoop
 */
import { assertSpend } from './providers.mjs';
import { buildPrompt, callWithTools } from './transport.mjs';

/** OpenAI/OpenRouter function-tool definitions exposed to the model. */
export const TOOL_SCHEMAS = [
  { type: 'function', function: { name: 'repo_search', description: 'Find tracked files containing a fixed-string query.', parameters: { type: 'object', properties: { query: { type: 'string' }, scope: { type: 'string', description: 'optional path prefix' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'repo_open', description: 'Read a 1-indexed line window of a tracked file (secret-redacted).', parameters: { type: 'object', properties: { path: { type: 'string' }, startLine: { type: 'integer' }, endLine: { type: 'integer' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'trace_symbol', description: 'Find definitions and references of an identifier.', parameters: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] } } },
  { type: 'function', function: { name: 'trace_api_path', description: 'Find the route mount/handler for a URL path.', parameters: { type: 'object', properties: { apiPath: { type: 'string' } }, required: ['apiPath'] } } },
  { type: 'function', function: { name: 'catalog_search', description: 'Search the decision catalog for pointer rows (open the source to confirm).', parameters: { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'] } } },
  { type: 'function', function: { name: 'git_context', description: 'Recent commit subjects touching given paths.', parameters: { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' } } }, required: ['paths'] } } },
];

const DISPATCH = {
  repo_search: (s, a) => s.repo_search(a.query, { scope: a.scope ?? null }),
  repo_open: (s, a) => s.repo_open(a.path, a.startLine, a.endLine),
  trace_symbol: (s, a) => s.trace_symbol(a.symbol),
  trace_api_path: (s, a) => s.trace_api_path(a.apiPath),
  catalog_search: (s, a) => s.catalog_search(a.topic),
  git_context: (s, a) => s.git_context(a.paths),
};

/** Execute one model-requested tool call, returning a JSON-string result the model can read. */
function runToolCall(session, call) {
  const name = call.function?.name;
  const fn = DISPATCH[name];
  if (!fn) return JSON.stringify({ error: `unknown tool: ${name}` });
  let args;
  try { args = JSON.parse(call.function.arguments || '{}'); }
  catch { return JSON.stringify({ error: 'arguments were not valid JSON' }); }
  try { return JSON.stringify(fn(session, args)); }
  catch (e) { return JSON.stringify({ error: e.code ?? 'TOOL_ERROR', message: String(e.message).slice(0, 200) }); }
}

/**
 * Run the bounded tool loop.
 * @param {object} opts
 * @param {object} opts.provider     from getProvider()
 * @param {object} opts.packet       compiled packet (for citation audit)
 * @param {object} opts.manifest     packet.finalize() result
 * @param {Array}  opts.evidence     packet.getEvidence()
 * @param {object} opts.session      createToolSession() bound to the same ceiling as the provider
 * @param {number} [opts.maxIterations=6]
 * @param {number} [opts.maxTokens=4000]
 * @param {function} [opts.fetchImpl]
 * @param {object} [opts.env]
 */
export async function runToolLoop({ provider, packet, manifest, evidence, session, maxIterations = 6, maxTokens = 4000, fetchImpl, env = process.env }) {
  const messages = [{ role: 'user', content: buildPrompt(provider, manifest, evidence) }];
  const trace = [];
  let totalCost = 0, iterations = 0, stopReason = 'answered';

  for (iterations = 1; iterations <= maxIterations; iterations += 1) {
    // Cumulative spend gate (T8): the per-turn estimate must fit under the REMAINING budget.
    const cap = Number(env.SWAN_CONTEXT_MAX_USD);
    assertSpend(provider, JSON.stringify(messages).length, maxTokens, env); // per-turn + fail-closed
    if (Number.isFinite(cap) && totalCost >= cap) { stopReason = 'spend_cap'; break; }

    const turn = await callWithTools(provider, messages, TOOL_SCHEMAS, { maxTokens, fetchImpl, env, manifest });
    totalCost += turn.cost;
    messages.push(turn.message);

    const calls = turn.message.tool_calls ?? [];
    if (!calls.length) { // final answer
      const audit = packet.auditAnswer(turn.message.content ?? '');
      return { answer: turn.message.content ?? '', audit, iterations, totalCost, toolTrace: trace, sessionAudit: session.getAudit(), stopReason };
    }
    for (const call of calls) {
      const result = runToolCall(session, call);
      trace.push({ iteration: iterations, tool: call.function?.name, ok: !result.includes('"error"') });
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  // ran out of iterations or budget without a final content answer
  return { answer: null, audit: null, iterations: iterations - 1, totalCost, toolTrace: trace, sessionAudit: session.getAudit(), stopReason: stopReason === 'answered' ? 'max_iterations' : stopReason };
}
