/**
 * comfyuiHistory.mjs — what a ComfyUI history entry MEANS.
 *
 * Split out of `comfyuiLocal.mjs` when that file approached the 300-line cap (rule 4). The division
 * is the same real one that produced `comfyuiGraph.mjs`: that file is about the GRAPH we SEND, this
 * one is about the DOCUMENT we READ BACK, and the adapter between them is transport.
 *
 * ── ROUND 19: "THE GRAPH FINISHED" AND "THE GRAPH RAISED" ARE DIFFERENT FACTS ──
 * The adapter used to decide both with one truthiness test:
 *
 *     if (entry?.status?.completed || entry?.outputs) { completed = true; break; }
 *
 * ComfyUI reports an errored run as `outputs: {}` with `status_str: "error"`. `{}` is TRUTHY, so
 * the loop broke, `findOutputFile` found no video, and the operator was told "ComfyUI reported
 * completion but produced no video output. Check that the graph ends in a video-saving node." —
 * while the node's own exception ("CUDA out of memory") sat unread in `status.messages`.
 *
 * Three separate defects, all in that one line:
 *
 *   1. `entry?.outputs` is not a completion test. It is a test for "the key exists". `{}` is truthy,
 *      `[]` is truthy, and BOTH mean "nothing produced yet" as often as they mean "failed".
 *   2. `||` short-circuits, so the error branch was unreachable whenever `completed` was set. The
 *      two facts are not mutually exclusive in the wire format and ComfyUI does emit both.
 *   3. Nothing ever read `status_str`, the only field that separates "finished and produced
 *      nothing" from "failed before producing anything" — which are `{}` and `{}`.
 *
 * ── WHY THIS RETURNS A DESCRIPTOR INSTEAD OF THROWING ──────────────────────
 * Same reason `ceilingGate` and `licenceGate` do: the adapter owns the error CODE, and a module that
 * interprets a document should not decide what the caller is told. It also means the pre-fix replay
 * of a probe gets a REPORT rather than a stack trace.
 *
 * `status.messages` is written by ComfyUI, not by us, so nothing here may throw on a shape it has
 * not seen. Every field is read defensively and an unrecognised entry is `pending`, never `failed`
 * — the fail-safe direction is to keep waiting, because a false failure abandons a render that is
 * still running, and a false pending only costs the timeout that was already budgeted.
 */

/** A plain object. `Array` is excluded: `Object.keys([])` is `[]`, but `Object.keys('ab')` is not. */
const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** ComfyUI's two terminal spellings of `status.status_str`. */
const STATUS_ERROR = 'error';
const STATUS_SUCCESS = 'success';

/** The two `status.messages` kinds that mean the run did not produce an artifact. */
const FAILURE_KINDS = new Set(['execution_error', 'execution_interrupted']);

/**
 * IS THIS FAILURE ONE THE SAME BYTES WILL REPRODUCE?
 *
 * ── WHY THIS EXISTS (round 25) ─────────────────────────────────────────────
 * Round 19 disclosed that `E_GRAPH_FAILED` is retryable, and named the cost: a graph that fails
 * identically every time is worth another full GPU render on each attempt. Measured on this lane's
 * own render box: **80s** for the 4-step turbo graph and **387s** for the long one, so a
 * deterministic failure burns three of those before the job gives up.
 *
 * The obvious fix — add `E_GRAPH_FAILED` to `PERMANENT_CODES` — is WRONG, and the reason is in this
 * lane's own fixture: the canonical `E_GRAPH_FAILED` is `CUDA out of memory`, which is a fact about
 * the MOMENT. Another process may release VRAM; a retry can genuinely succeed. `generateVideo.mjs`'s
 * own header says the inverse error is "just as bad": marking a transient blip permanent throws away
 * a job that would have succeeded.
 *
 * So `E_GRAPH_FAILED` is a MIXED code — it covers deterministic graph faults and transient GPU
 * faults — and no single boolean over the code can express that. The information needed to separate
 * them is right here, in the node's own exception, so the decision is made here rather than by code.
 *
 * ── THE DIRECTION OF THE GUESS, WHICH IS THE WHOLE DESIGN ──────────────────
 * DEFAULT RETRYABLE. Only an explicitly-named deterministic type, with no transient marker in its
 * message, is called permanent. An unrecognised exception type keeps its retry, because the two
 * errors are not symmetric: a wrong "retryable" costs GPU time, while a wrong "permanent" throws
 * away a job that would have succeeded — and this lane has filed that defect before. The list below
 * is CLOSED and grows only on evidence.
 *
 * An INTERRUPTED run is NOT deterministic, deliberately. An interruption is an action taken by
 * somebody else, not a property of the graph — the same bytes succeed once whoever cancelled stops
 * cancelling. Calling it permanent would block the legitimate "cancel to free the GPU, retry later".
 */
const TRANSIENT_MESSAGE = /out of memory|OutOfMemoryError|CUDA_ERROR_OUT_OF_MEMORY|allocation of [\d.]+ ?[MG]iB failed|CUDA error: out of memory/i;

/** Exception types that describe the GRAPH. Closed set; everything else keeps its retry. */
const DETERMINISTIC_TYPES = new Set([
  'ValueError', 'TypeError', 'KeyError', 'IndexError', 'AttributeError', 'NameError',
  'NotImplementedError', 'FileNotFoundError', 'IsADirectoryError', 'PermissionError',
  'SafetensorError', 'safetensors_rust.SafetensorError',
]);

export function failureIsDeterministic(failure) {
  const f = isObj(failure) ? failure : {};
  // An external cancellation is a fact about the moment, not about the graph.
  if (f.interrupted) return false;
  const type = String(f.exceptionType || '');
  const msg = String(f.exceptionMessage || '');
  // A transient marker wins over the type: `RuntimeError: CUDA out of memory` must stay retryable,
  // and a node that wraps OOM in a ValueError must not become permanent by its wrapper.
  if (TRANSIENT_MESSAGE.test(msg) || TRANSIENT_MESSAGE.test(type)) return false;
  // No type at all is the `status_str: 'error'` shape with no message we recognise — unknown, so
  // retryable. Assuming it permanent would let a ComfyUI quirk cost jobs.
  if (!type) return false;
  return DETERMINISTIC_TYPES.has(type);
}

/**
 * The last failure in `status.messages`, or null.
 *
 * LAST, not first: a node pack can catch, retry and raise again, and the final entry is the one that
 * ended the run. The payload shape is `['execution_error', { node_id, node_type, exception_message,
 * exception_type }]`, and every field is optional as far as we are concerned.
 */
function readFailure(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!Array.isArray(m) || m.length < 2 || !FAILURE_KINDS.has(m[0])) continue;
    const p = isObj(m[1]) ? m[1] : {};
    return {
      kind: m[0],
      interrupted: m[0] === 'execution_interrupted',
      // `??` not `||`: node id 0 is a real node id, and `0 || null` would erase it.
      nodeId: p.node_id ?? null,
      nodeType: typeof p.node_type === 'string' ? p.node_type : '',
      exceptionType: typeof p.exception_type === 'string' ? p.exception_type : '',
      exceptionMessage: typeof p.exception_message === 'string' ? p.exception_message : '',
    };
  }
  return null;
}

/**
 * `{ state: 'pending' | 'done' | 'failed', failure? }` for one history entry.
 *
 * Order matters and is the whole fix: an explicit failure is decided BEFORE `completed`, and both
 * are decided before `outputs` is consulted at all.
 */
export function terminalState(entry) {
  if (!isObj(entry)) return { state: 'pending' };
  const status = isObj(entry.status) ? entry.status : {};

  const failure = readFailure(status.messages);
  if (failure) return { state: 'failed', failure };
  // `status_str` with no message we recognise. Still a failure: the alternative is to fall through
  // to `outputs`, which is `{}` for exactly this case, and report a finished graph.
  if (status.status_str === STATUS_ERROR) {
    return { state: 'failed', failure: { kind: 'execution_error', interrupted: false, nodeId: null, nodeType: '', exceptionType: '', exceptionMessage: '' } };
  }

  if (status.completed === true || status.status_str === STATUS_SUCCESS) return { state: 'done' };
  // Any node that reported an output is evidence the graph reached the end of its execution.
  if (isObj(entry.outputs) && Object.keys(entry.outputs).length > 0) return { state: 'done' };
  return { state: 'pending' };
}

/**
 * The operator-facing sentence for a failed run. Names WHAT failed and quotes the cause.
 *
 * `describeFailure(null, ...)` is safe and says so rather than inventing a node.
 */
export function describeFailure(failure, promptId) {
  const f = isObj(failure) ? failure : {};
  const where = f.nodeId != null
    ? `node ${f.nodeId}${f.nodeType ? ` (${f.nodeType})` : ''}`
    : 'a node ComfyUI did not name';
  const id = promptId ? ` (prompt ${promptId})` : '';
  const type = f.exceptionType ? ` [${f.exceptionType}]` : '';

  if (f.interrupted) {
    // ROUND 25: this sentence used to end "a re-run will be cancelled again". That is a PREDICTION
    // the code cannot make — whoever cancelled may have been freeing the GPU for one run, or may
    // have stopped. It is the same defect as round 16's fabricated provenance field: a report
    // asserting something it never established. The classification agrees with the corrected
    // sentence rather than the old one: an interruption is NOT deterministic, so it keeps its retry.
    return `ComfyUI could not execute the graph${id}: the run was INTERRUPTED at ${where}. `
      + 'Nothing in the graph raised — something outside it asked ComfyUI to cancel. Find out what '
      + 'did before re-running: if that actor is still active, the next attempt will be cancelled too.';
  }
  const cause = f.exceptionMessage
    ? `it raised: ${f.exceptionMessage}${type}`
    : 'it raised, and ComfyUI reported no message for it';
  return `ComfyUI could not execute the graph${id}: ${where} failed — ${cause}. `
    + 'This is the node\'s own error, quoted verbatim; read it before changing the graph.';
}

/**
 * The timeout sentence, which must not assert a cause it did not observe.
 *
 * The old message said "The job is still queued on the GPU" unconditionally. When the history
 * endpoint never answered, or never held the prompt at all, that is a fact the code never
 * established — the same defect as round 16's fabricated provenance field, one file over.
 */
export function describeTimeout({ promptId, timeoutMs, historyOk = 0, sawEntry = false } = {}) {
  // Sub-second budgets are the test path; "within 0s" reads as a broken message rather than a
  // short one, and this line is read by whoever is diagnosing the failure.
  const budget = timeoutMs >= 1000 ? `${Math.round(timeoutMs / 1000)}s` : `${timeoutMs}ms`;
  const head = `ComfyUI did not finish within ${budget} (prompt ${promptId}).`;

  if (historyOk === 0) {
    return `${head} Its history endpoint never answered a single poll, so there is NO record of `
      + 'this prompt: the queued job may have been lost. Check that ComfyUI is still running, and '
      + 'look for the prompt id in its log, before retrying.';
  }
  if (!sawEntry) {
    return `${head} ComfyUI has NO record of this prompt in ${historyOk} history poll(s) — it was `
      + 'never queued, or the server restarted and dropped it. Do not re-run blindly: check the '
      + 'ComfyUI log for this prompt id first.';
  }
  return `${head} The job is still queued on the GPU; this attempt gave up waiting.`;
}
