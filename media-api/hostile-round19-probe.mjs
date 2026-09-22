/**
 * hostile-round19-probe.mjs — WHAT A FAILED GPU RUN IS REPORTED AS.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * Round 18 named this defect and deliberately did not close it: a graph that ERRORS on the GPU is
 * reported as `E_NO_OUTPUT`, with a message that blames the saver node, and is classified retryable.
 * The permanence half is genuinely the runner's call (`PERMANENT_CODES` lives in
 * `backend/scripts/handlers/generateVideo.mjs`). The REPORTING half is not — it is this lane's own
 * file, and a report that names the wrong problem is the defect class this whole lane exists to
 * remove (round 18's finding 1, round 16's "a record must not state something it does not know").
 * So round 19 closes the reporting and keeps the permanence half as a named disclosure.
 *
 * ── THE DEFECTS, MEASURED BEFORE ANY FIX ───────────────────────────────────
 *
 *   1. **A failed graph is indistinguishable from a finished one.** ComfyUI reports an errored run
 *      as `outputs: {}` with `status_str: "error"`. `{}` is TRUTHY, so the poll loop's
 *      `entry?.status?.completed || entry?.outputs` breaks on it, `findOutputFile` finds no video,
 *      and the operator is told "ComfyUI reported completion but produced no video output. Check
 *      that the graph ends in a video-saving node." The node's own exception — measured as
 *      "CUDA out of memory" — is sitting in `status.messages` and is never read. Every part of the
 *      diagnosis is wrong, in the direction that costs another full render.
 *   2. **The break condition is a truthiness test on a CONTAINER, not a completion test.** `{}`,
 *      `[]`, and any non-empty object are all truthy, so an entry that is still EXECUTING is read as
 *      finished. The same `{}` that means "failed" also means "not started yet", and the loop cannot
 *      tell them apart because it never looks at `status_str`.
 *   3. **A `completed: true` entry that also carries an execution error is read as success.** The
 *      `||` short-circuits on the first operand, so the error branch is unreachable whenever ComfyUI
 *      sets the flag — the two facts are not mutually exclusive in the wire format.
 *   4. **`E_TIMEOUT` asserts "The job is still queued on the GPU" without knowing that.** When the
 *      history endpoint has no record of the prompt at all — ComfyUI restarted and lost the queue —
 *      the message states a fact the code never established. This is round 16's rule one file over:
 *      a report must not state something it does not know.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * The control for this round is this file replayed against the round-18 tree, where
 * `comfyuiHistory.mjs` does not exist. A static import of a missing file is an ESM LINK error, so
 * the control would die with a stack trace and prove nothing; the module is therefore reached
 * through a DYNAMIC import with guarded accessors, so the control reports FAILURES with reasons.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No provider is enabled, no live call is made, no GPU is touched and no model path is guessed.
 * Every check is offline: a temp file and a fake `fetch`.
 */

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../shared/providers/video/comfyuiLocal.mjs';
import { statusFor } from './wire.mjs';
import { isPermanentCode } from '../backend/scripts/handlers/generateVideo.mjs';

/** The module this round ADDS. Reached dynamically so the pre-fix replay reports, not crashes. */
const historyModule = await import('../shared/providers/video/comfyuiHistory.mjs').catch(() => ({}));
const terminalState = (...a) => {
  if (typeof historyModule.terminalState !== 'function') throw new Error('terminalState is not exported');
  return historyModule.terminalState(...a);
};
const describeFailure = (...a) => {
  if (typeof historyModule.describeFailure !== 'function') throw new Error('describeFailure is not exported');
  return historyModule.describeFailure(...a);
};

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e.code || e.message; } };
const catchErr = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const safe = (fn) => { try { return fn(); } catch (e) { return `E_PROBE_THREW: ${e.message}`; } };
const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── fixtures ───────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'r19-probe-'));
const file = (name, contents) => {
  const p = join(dir, name);
  writeFileSync(p, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return p;
};
const GOOD = file('good.json', {
  1: { class_type: 'CLIPTextEncode', inputs: { text: 'template placeholder' } },
  9: { class_type: 'VHS_VideoCombine', inputs: {} },
});
const REQ = { prompt: 'a swan crossing still water at dawn', category: 'marketing', style: 'cinematic', duration: 5 };
const envFor = (path) => ({ SWAN_COMFYUI_WORKFLOW: path, SWAN_COMFYUI_NODE_PROMPT: '1' });

/** The fake ComfyUI. Mirrors the shape the registry suite's `fakeComfy` uses. */
const comfy = ({ entry = null, historyOk = true, historyBody = null } = {}) => async (url) => {
  const u = String(url);
  if (u.endsWith('/prompt')) return { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
  if (u.includes('/history/')) {
    if (!historyOk) return { ok: false, status: 404, text: async () => 'not found' };
    return { ok: true, status: 200, json: async () => (historyBody !== null ? historyBody : { 'pid-1': entry }) };
  }
  if (u.includes('/view')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('video-bytes') };
  throw new Error(`unexpected request to ${u}`);
};
const run = (fetchImpl, outPath, timeoutMs = 40) =>
  generate(REQ, { env: envFor(GOOD), fetchImpl, outPath, sleep: async () => {}, timeoutMs });

/** A graph that FAILED: `outputs` is an empty object, and the real error is in `status.messages`. */
const ERRORED = {
  outputs: {},
  status: {
    status_str: 'error', completed: false,
    messages: [
      ['execution_start', { prompt_id: 'pid-1' }],
      ['execution_error', {
        prompt_id: 'pid-1', node_id: 9, node_type: 'VHS_VideoCombine',
        exception_message: 'CUDA out of memory. Tried to allocate 2.00 GiB',
        exception_type: 'torch.cuda.OutOfMemoryError',
      }],
    ],
  },
};
/** The SAME failure with `completed` set — the two facts are not exclusive in the wire format. */
const ERRORED_COMPLETED = {
  outputs: {},
  status: { status_str: 'error', completed: true, messages: ERRORED.status.messages },
};
/** A run cancelled from the UI. An interruption is not a node exception and must not be reported as one. */
const INTERRUPTED = {
  outputs: {},
  status: {
    status_str: 'error', completed: false,
    messages: [['execution_interrupted', { node_id: 9, node_type: 'VHS_VideoCombine' }]],
  },
};
/** Still executing: the entry exists, `completed` is false, and `outputs` is present but empty. */
const MIDRUN = { status: { completed: false }, outputs: {} };
const DONE = {
  status: { completed: true },
  outputs: { 9: { videos: [{ filename: 'out.mp4', subfolder: '', type: 'output' }] } },
};
const DONE_NO_VIDEO = { status: { completed: true }, outputs: { 9: { images: [{ filename: 'p.png' }] } } };

async function main() {
  console.log('HOSTILE PROBE — ROUND 19: what a failed GPU run is reported as\n');

  const localSrc = stripComments(readSource('../shared/providers/video/comfyuiLocal.mjs'));

  // ══ A. a failed graph must not be reported as a finished one ═════════════
  section('A. a graph that ERRORED on the GPU was reported as "no output"');
  {
    const err = await catchErr(() => run(comfy({ entry: ERRORED }), join(dir, 'a.mp4')));
    check('A. a failed graph gets a code of its own, not E_NO_OUTPUT',
      err?.code === 'E_GRAPH_FAILED',
      `-> ${err?.code}. E_NO_OUTPUT asserts the graph FINISHED; it did not — it raised.`);
    check('A. ...and the message names the node that raised',
      /9/.test(err?.message || '') && /VHS_VideoCombine/.test(err?.message || ''),
      `-> ${JSON.stringify((err?.message || '').slice(0, 150))}`);
    check('A. ...and carries the node\'s OWN exception, which was being discarded',
      /CUDA out of memory/.test(err?.message || ''),
      'the exception was in `status.messages` the whole time and no code path read it, so the '
      + 'operator was sent to "check that the graph ends in a video-saving node".');
    check('A. ...and no longer blames the saver node',
      !/video-saving node/.test(err?.message || ''),
      `-> ${JSON.stringify((err?.message || '').slice(0, 150))}`);
    check('A. ...and names the prompt id, so the run is findable in the ComfyUI log',
      /pid-1/.test(err?.message || ''));
  }

  // ══ B. the break condition was a truthiness test on a container ══════════
  section('B. `entry?.outputs` is truthy for {}, so a RUNNING job read as finished');
  {
    const code = await throws(() => run(comfy({ entry: MIDRUN }), join(dir, 'b.mp4')));
    check('B. an entry that is still executing is not reported as a finished graph',
      code === 'E_TIMEOUT',
      `-> ${code}. Boolean({}) is ${Boolean({})}, so the loop broke on the first poll and the `
      + 'adapter concluded the graph had finished with no output.');
    const completedErr = await catchErr(() => run(comfy({ entry: ERRORED_COMPLETED }), join(dir, 'c.mp4')));
    check('B. `completed: true` alongside an execution error is still a FAILURE',
      completedErr?.code === 'E_GRAPH_FAILED',
      `-> ${completedErr?.code}. The two facts are not exclusive, and \`||\` short-circuits on the `
      + 'first operand, so the error branch was unreachable whenever the flag was set.');
    const interrupted = await catchErr(() => run(comfy({ entry: INTERRUPTED }), join(dir, 'd.mp4')));
    check('B. a cancelled run is named as interrupted, not as a node exception',
      interrupted?.code === 'E_GRAPH_FAILED' && /interrupt/i.test(interrupted?.message || ''),
      `-> ${interrupted?.code}: ${JSON.stringify((interrupted?.message || '').slice(0, 120))}`);
    check('B. the two states are distinguishable at the source, from the entry alone',
      safe(() => terminalState(ERRORED).state) === 'failed'
      && safe(() => terminalState(MIDRUN).state) === 'pending'
      && safe(() => terminalState(DONE).state) === 'done',
      `-> failed=${safe(() => terminalState(ERRORED).state)}, `
      + `pending=${safe(() => terminalState(MIDRUN).state)}, done=${safe(() => terminalState(DONE).state)}`);
  }

  // ══ C. a report must not state something it does not know ════════════════
  section('C. E_TIMEOUT asserted "still queued on the GPU" without knowing it');
  {
    const lost = await catchErr(() => run(comfy({ entry: null }), join(dir, 'e.mp4')));
    check('C. when ComfyUI has NO RECORD of the prompt, the message says so',
      lost?.code === 'E_TIMEOUT' && /no record|not in its history|never appeared/i.test(lost?.message || ''),
      `-> ${JSON.stringify((lost?.message || '').slice(0, 170))} — the prompt was never in the `
      + 'history at any poll, so "still queued on the GPU" is a fact the code never established.');
    const unreachable = await catchErr(() => run(comfy({ historyOk: false }), join(dir, 'f.mp4')));
    check('C. when the history endpoint is not answering, the message says that instead',
      unreachable?.code === 'E_TIMEOUT' && /history/i.test(unreachable?.message || '')
      && /no record|not answering|never appeared/i.test(unreachable?.message || ''),
      `-> ${JSON.stringify((unreachable?.message || '').slice(0, 170))}`);
    // The OTHER timeout: the entry is there and genuinely still running. That message must stay.
    const running = await catchErr(() => run(comfy({ entry: { status: { completed: false } } }), join(dir, 'g.mp4')));
    check('CONTROL: an entry that IS present and still running keeps the "still running" wording',
      running?.code === 'E_TIMEOUT' && !/no record/i.test(running?.message || ''),
      `-> ${JSON.stringify((running?.message || '').slice(0, 150))}`);
  }

  // ══ D. the new code must have a status, and the ratchet must say what is left ══
  section('D. the wire mapping, and the half that is still Sean\'s call');
  {
    const status = safe(() => statusFor('E_GRAPH_FAILED'));
    check('D. E_GRAPH_FAILED has a defined status on the wire',
      status === 502,
      `-> ${status}. Round 18 added 18 adapter codes for exactly this reason: a code with no status `
      + 'falls through to a bare 400, which tells a caller its request was malformed.');
    check('DISCLOSURE: the new code exists, has a status, and is still RETRYABLE — the permanence set is the runner\'s',
      status === 502 && isPermanentCode('E_GRAPH_FAILED') === false,
      'PERMANENT_CODES lives in backend/scripts/handlers/generateVideo.mjs. A graph that fails '
      + 'identically every time is worth another full GPU render on each attempt. This check FLIPS '
      + 'the day Sean adds it, which is when this disclosure must be rewritten — the round-13 idiom. '
      + 'It requires the code to EXIST as well as to be retryable: the first version asked only '
      + 'about `isPermanentCode`, which is false for every string the runner has never heard of, so '
      + 'it passed on the pre-fix tree where the code did not exist at all.');
    check('D. the reporting fix does not depend on the permanence decision',
      (await throws(() => run(comfy({ entry: ERRORED }), join(dir, 'h.mp4')))) === 'E_GRAPH_FAILED',
      'so the operator learns the truth on the FIRST attempt, whatever the queue then does.');
  }

  // ══ E. source assertions — the fix must live in the code, not in this fixture ══
  section('E. at the source, not just through the fixture');
  {
    check('E. the poll loop asks the history module what the entry MEANS',
      /terminalState\s*\(/.test(localSrc),
      'one predicate, one consumer — the same remedy as round 18\'s BINDINGS table.');
    // A mutation-based control, not an absence test: an absence assertion passes against a tree
    // where the string was never there (round 18's third vacuity), so the mutation is applied to a
    // source that DOES contain the text and the check requires the mutation to have changed it.
    const before = localSrc;
    const mutated = localSrc.replace(/terminalState\s*\(/, 'entry?.outputs /*');
    check('CONTROL: removing the call makes this check fail',
      mutated !== before && !/terminalState\s*\(/.test(mutated),
      'so the check above tests the source it names, and its mutation is not a no-op');
    // The first version of this check STRIPPED the string and asserted it was then absent — which
    // passes on the PRE-FIX tree, because the strip is what removed it. That is round 18's vacuity
    // again, one level down: a check that mutates its own subject and then asserts the mutation took
    // effect tests the mutation, not the code. The control has to run in the other direction —
    // RE-INTRODUCE the defect into a copy and require the assertion to fail on it.
    const hasTruthyBreak = (s) => /entry\?\.status\?\.completed\s*\|\|\s*entry\?\.outputs/.test(s);
    check('E. the truthiness break on `outputs` is gone from the loop',
      !hasTruthyBreak(localSrc),
      '`entry?.outputs` is truthy for {}, so it was never a completion test — it was a test for '
      + '"the key exists".');
    check('CONTROL: putting the truthiness break BACK makes that check fail',
      (() => {
        const reintroduced = localSrc.replace(
          /(let completed = false;)/,
          '$1 const probe = entry?.status?.completed || entry?.outputs;',
        );
        return reintroduced !== localSrc && hasTruthyBreak(reintroduced);
      })(),
      'so the check above can fail, and is not passing because the string was never there');
  }

  // ══ F. CONTROLS: the three behaviours the registry suite pins must not move ══
  section('F. the contracts the existing suites pin');
  {
    const ok = await run(comfy({ entry: DONE }), join(dir, 'i.mp4'));
    check('F. a genuinely completed graph still returns its artifact',
      ok.bytes > 0 && ok.outPath.endsWith('.mp4'), `-> ${ok.bytes} bytes`);
    check('F. completed with no VIDEO file is still E_NO_OUTPUT (registry:427)',
      await throws(() => run(comfy({ entry: DONE_NO_VIDEO }), join(dir, 'j.mp4'))) === 'E_NO_OUTPUT',
      'this one is genuinely finished, so blaming the graph\'s output node is now TRUE rather than '
      + 'a guess — which is what makes the two codes worth separating.');
    check('F. completed with an empty outputs object is still E_NO_OUTPUT (round-18 control)',
      await throws(() => run(comfy({ entry: { status: { completed: true }, outputs: {} } }), join(dir, 'k.mp4'))) === 'E_NO_OUTPUT');
    check('F. an entry that exists and never completes is still E_TIMEOUT, still retryable (registry:440)',
      await (async () => {
        const e = await catchErr(() => generate(REQ, {
          env: envFor(GOOD), outPath: join(dir, 'l.mp4'), sleep: async () => {}, timeoutMs: 1,
          fetchImpl: comfy({ entry: { status: { completed: false } } }),
        }));
        return e?.code === 'E_TIMEOUT' && isPermanentCode(e.code) === false;
      })());
    check('F. describeFailure never throws on a shape it has not seen',
      !String(safe(() => describeFailure(null, 'pid-1'))).startsWith('E_PROBE_THREW')
      && !String(safe(() => describeFailure({ messages: 'not an array' }, 'pid-1'))).startsWith('E_PROBE_THREW')
      && !String(safe(() => terminalState('a string'))).startsWith('E_PROBE_THREW')
      && !String(safe(() => terminalState(null))).startsWith('E_PROBE_THREW'),
      'a reporter that throws on an unexpected entry is a new defect, not a guard — and the entry '
      + 'is written by another program.');
  }

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
