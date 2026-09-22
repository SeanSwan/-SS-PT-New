/**
 * hostile-round18-probe.mjs — THE GPU-FACING SURFACE, attacked for the first time.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * Seventeen rounds have attacked the money gates, the licence gate, the record and the wire.
 * **None has touched `comfyuiLocal.mjs` or `comfyuiGraph.mjs`** — the lines that run first when
 * Sean starts the render box, on the machine where a mistake is most expensive. That is the same
 * shape as the round-16 gap where `provenance.mjs` had never been listed in the file table: a
 * surface nobody had asked a hostile question about.
 *
 * ── THE SIX DEFECTS THIS ROUND FOUND, ALL MEASURED BEFORE ANY FIX ─────────
 *
 *   1. **`verify()` reported `ok: true` for a configuration that cannot render anything.** Its
 *      template check was `existsSync`, so a file that is not JSON, and a GUI-format export that
 *      ComfyUI answers with a 400, both passed. `verify()` exists to be "the first command run on
 *      the render box, by whoever has not finished setting it up" — and it answered yes.
 *   2. **...and it never checked that the binding names a node the template DECLARES.** With a
 *      template containing only node `1` and `SWAN_COMFYUI_NODE_PROMPT=99`, `verify().ok` was
 *      `true` while every run throws `E_NO_NODE`. And `buildGraph` runs INSIDE `generate()`, which
 *      the queue reaches only after the quote was authorised and the job created — so the typo
 *      costs a job rather than a line of output.
 *   3. **Three prototype-chain lookups in `comfyuiGraph.mjs`.** `FIELD_CANDIDATES[slot]` returned
 *      `Object` for a slot named after an `Object.prototype` member and threw
 *      `(...).find is not a function`; `'constructor' in node.inputs` is TRUE on every node, so the
 *      guard whose whole job is DETECTION, NEVER CREATION would have "detected" an input that does
 *      not exist; and `graph[nodeId]` for such an id resolves to a FUNCTION, which the code then
 *      wrote to — creating `Object.inputs` on the global `Object` constructor. The same class as
 *      round 6's `VIDEO_PROVIDERS['constructor']` and round 13's `all.callers['__proto__']`.
 *   4. **`loadGraph` checked JSON *syntax* and never JSON *shape*.** A template containing `null`
 *      parsed, was returned, and made the next call throw `Object.keys(null)` — a raw TypeError
 *      where a named refusal belongs.
 *   5. **Eighteen adapter codes had no status anywhere, and the coverage gate that exists to catch
 *      exactly that had a module list omitting all four adapter files.** Round 7's check asks "of
 *      the codes the GATEWAY can raise, which have no defined status?" — and the gateway list did
 *      not include the modules that raise most of them. A green gate that is green because it never
 *      looked, for the third time in this lane.
 *   6. **The README's own file tables omitted the two files this round is about.** Round 16 found
 *      `provenance.mjs` missing from the provider-layer table; round 18 found `comfyuiLocal.mjs` and
 *      `comfyuiGraph.mjs` missing from it — the same gap, in the round whose whole subject they are,
 *      and nothing noticed either time. Under-claiming is a correctness problem (rule 75), so section
 *      G makes it an assertion: a module that exists in the lane and is absent from the document is
 *      a failing gate, with a mutation control so the assertion cannot pass on an empty README.
 *
 * ── WHAT THIS ROUND DISCLOSED, AND WHAT ROUND 19 DID WITH IT ──────────────
 * Round 18 disclosed that a GPU-side graph error was reported as `E_NO_OUTPUT`, with a message that
 * blamed the saver node, and was classified RETRYABLE — so a graph that failed on the GPU was
 * re-rendered at full cost. Section E proved all three parts through `generate()`.
 * **Round 19 closed the reporting half**: a failed run now raises `E_GRAPH_FAILED` carrying the node
 * and its own exception, decided by `comfyuiHistory.mjs`. Section E therefore asserts the FIXED
 * behaviour rather than the defect. The permanence half is still open and still a disclosure,
 * because `PERMANENT_CODES` lives in `backend/scripts/handlers/generateVideo.mjs` — the runner,
 * which is Sean's call. This is the "moving code is the trigger" rule in practice: a disclosure is a
 * promise to rewrite it when the code moves, and the two failing checks are what enforced it.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * The control for this round is this file replayed against the previous tree, where
 * `inspectBindings` and `BINDINGS` do not exist. A static named import of a missing export is an
 * ESM LINK error, so the control would die with a stack trace and prove nothing; the module is
 * therefore imported as a NAMESPACE and the new API is reached through guarded accessors, so the
 * control reports FAILURES with reasons instead of exiting on a syntax error.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * It does not enable a provider, make a live call, touch a GPU, or guess a model path. Every check
 * here is offline: a temp file, a fake `fetch`, and the modules themselves.
 */

import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generate, verify, resolveConfig, envSuffix, PROVIDER_ID,
} from '../shared/providers/video/comfyuiLocal.mjs';
import * as graphModule from '../shared/providers/video/comfyuiGraph.mjs';
import { STATUS_BY_CODE, statusFor } from './wire.mjs';
import { isPermanentCode } from '../backend/scripts/handlers/generateVideo.mjs';

const { loadGraph, injectInput, buildGraph, findOutputFile, FIELD_CANDIDATES } = graphModule;

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e.code || e.message; } };
/** A call into an API the pre-fix tree does not have. Returns a sentinel, never throws. */
const safe = (fn) => { try { return fn(); } catch (e) { return `E_PROBE_THREW: ${e.message}`; } };
const inspectBindings = (...a) => {
  if (typeof graphModule.inspectBindings !== 'function') throw new Error('inspectBindings is not exported');
  return graphModule.inspectBindings(...a);
};
const BINDINGS = Array.isArray(graphModule.BINDINGS) ? graphModule.BINDINGS : [];
const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── fixtures ───────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'r18-probe-'));
const file = (name, contents) => {
  const p = join(dir, name);
  writeFileSync(p, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return p;
};
const GRAPH = {
  1: { class_type: 'CLIPTextEncode', inputs: { text: 'template placeholder' } },
  9: { class_type: 'VHS_VideoCombine', inputs: {} },
};
const GOOD = file('good.json', GRAPH);
const CORRUPT = file('corrupt.json', '{ this is not json');
const GUI = file('gui.json', { nodes: [{ id: 1, type: 'KSampler' }], links: [] });
const NULLDOC = file('null.json', 'null');
const ARRAYDOC = file('array.json', '[1,2,3]');
const SCALARDOC = file('scalar.json', '"a string"');
const REQ = { prompt: 'a swan crossing still water at dawn', category: 'marketing', style: 'cinematic', duration: 5 };

/** The fake ComfyUI. Mirrors the shape the registry suite's `fakeComfy` uses. */
const comfy = ({ submitStatus = 200, entry = null, downloadStatus = 200, bytes = Buffer.from('video-bytes') } = {}) =>
  async (url) => {
    const u = String(url);
    if (u.endsWith('/prompt')) {
      return submitStatus >= 400
        ? { ok: false, status: submitStatus, text: async () => 'graph rejected' }
        : { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
    }
    if (u.includes('/history/')) return { ok: true, status: 200, json: async () => ({ 'pid-1': entry }) };
    if (u.includes('/view')) {
      return downloadStatus >= 400
        ? { ok: false, status: downloadStatus, text: async () => 'nope' }
        : { ok: true, status: 200, arrayBuffer: async () => bytes };
    }
    if (u.endsWith('/system_stats')) return { ok: true, status: 200 };
    throw new Error(`unexpected request to ${u}`);
  };
const DONE = { status: { completed: true }, outputs: { 9: { videos: [{ filename: 'out.mp4', subfolder: '', type: 'output' }] } } };
const run = (env, fetchImpl, outPath) =>
  generate(REQ, { env, fetchImpl, outPath, sleep: async () => {}, timeoutMs: 5000 });
const envFor = (path, over = {}) => ({ SWAN_COMFYUI_WORKFLOW: path, SWAN_COMFYUI_NODE_PROMPT: '1', ...over });
const REACHABLE = { fetchImpl: comfy({}) };

async function main() {
  console.log('HOSTILE PROBE — ROUND 18: the ComfyUI adapter and graph, attacked for the first time\n');

  // The two sources under test, comment-stripped once, at the top: sections B, C, D and F all
  // assert against them, and an assertion against a source that is not the source is a check
  // that tests a copy of the code — round 17's lesson, twice in this lane.
  const localSrc = stripComments(readSource('../shared/providers/video/comfyuiLocal.mjs'));
  const graphSrc = stripComments(readSource('../shared/providers/video/comfyuiGraph.mjs'));

  // ══ A. verify() must answer about a configuration that can actually run ═══
  section('A. verify() answered "ok" about configurations that cannot render');
  {
    // 1. THE TEMPLATE CHECK WAS `existsSync`. Measured before the fix: both of these returned
    //    `verify().ok = true` with all three checks green.
    const corrupt = await verify(envFor(CORRUPT), REACHABLE);
    check('A. a template that is not JSON is not reported ok',
      corrupt.ok === false,
      `-> ok=${corrupt.ok}; template check: ${JSON.stringify(corrupt.checks[0].detail).slice(0, 140)}`);
    const gui = await verify(envFor(GUI), REACHABLE);
    check('A. a GUI-format export is not reported ok, and the detail names the fix',
      gui.ok === false && /API format/.test(gui.checks[0].detail),
      `-> ok=${gui.ok}; ${JSON.stringify(gui.checks[0].detail).slice(0, 160)}`);

    // 2. THE BINDING WAS NEVER CHECKED AGAINST THE TEMPLATE. `99` is not a node id in GRAPH.
    const missing = await verify(envFor(GOOD, { SWAN_COMFYUI_NODE_PROMPT: '99' }), REACHABLE);
    const missingDetail = (missing.checks.find(c => /binding/.test(c.name)) || {}).detail || '';
    check('A. a binding naming a node the template does not declare is not reported ok',
      missing.ok === false,
      `-> ok=${missing.ok}; ${JSON.stringify(missingDetail).slice(0, 170)}`);
    check('A. ...and the detail names the node, the ids that ARE present, and the env var',
      missingDetail.includes('99') && missingDetail.includes('1') && missingDetail.includes('9')
      && /SWAN_COMFYUI_NODE_PROMPT/.test(missingDetail),
      'the report is the first command run on the render box, so "no node 99" alone is not enough');
    // ...and a node that EXISTS but declares no prompt input is the same failure one step later.
    const wrongNode = await verify(envFor(GOOD, { SWAN_COMFYUI_NODE_PROMPT: '9' }), REACHABLE);
    check('A. a binding on a node with no prompt input is not reported ok either',
      wrongNode.ok === false,
      `-> ok=${wrongNode.ok}; node 9 is VHS_VideoCombine, which declares no text input`);

    // CONTROLS.
    const coherent = await verify(envFor(GOOD), REACHABLE);
    check('CONTROL: a coherent configuration is still reported ok',
      coherent.ok === true,
      `-> ${JSON.stringify(coherent.checks.map(c => [c.name, c.ok]))}`);
    // The backend suite pins these three messages; changing them is not this round's business.
    const bare = await verify({}, { fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
    const byName = Object.fromEntries(bare.checks.map(c => [c.name, c]));
    check('CONTROL: the three pinned messages still name what they always named',
      /SWAN_COMFYUI_WORKFLOW/.test(byName['workflow template'].detail)
      && /SWAN_COMFYUI_NODE_PROMPT/.test(byName['prompt node binding'].detail)
      && /is ComfyUI running/i.test(byName['comfyui reachable'].detail),
      'videoProviderRegistry.test.mjs asserts all three, and is not modified by this round');
    check('CONTROL: verify() still never throws, and still names every check it ran',
      bare.ok === false && bare.checks.length >= 4 && bare.provider === PROVIDER_ID,
      `-> ${bare.checks.length} checks: ${bare.checks.map(c => c.name).join(' | ')}`);

    // AT THE SOURCE, because a behaviour check cannot tell "loads the graph" from "happens to
    // reject these two files". Controlled against a mutated copy.
    check('A. verify() LOADS the template and INSPECTS the bindings, rather than testing existence',
      /loadGraph\(cfg\.templatePath\)/.test(localSrc) && /inspectBindings\(/.test(localSrc),
      `-> ${(localSrc.match(/[^\n]*loadGraph\(cfg\.templatePath\)[^\n]*/) || ['<not found>'])[0].trim()}`);
    const localMutated = localSrc.replace(/loadGraph\(cfg\.templatePath\)/g, 'null /* mutated */');
    check('CONTROL: that assertion FAILS against a source with the load removed',
      localMutated !== localSrc && !/loadGraph\(cfg\.templatePath\)/.test(localMutated),
      'The mutation is asserted to have CHANGED something, because the bare absence test is '
      + 'satisfied by a source that never had the string — and an absence assertion cannot tell '
      + '"removed" from "never there", which is the trap this lane has now walked into three times.');

    // ONE TABLE, TWO CONSUMERS. If `buildGraph` injects a binding the report does not know about,
    // `verify()` reports a configuration healthy that every run refuses — a completeness claim
    // that is a fabrication, which is round 16's lesson one level down.
    const graphSrc = stripComments(readSource('../shared/providers/video/comfyuiGraph.mjs'));
    const loops = (graphSrc.match(/for \(const \{[^}]*\} of BINDINGS\)/g) || []).length;    check('A. buildGraph and inspectBindings both iterate the SAME table',
      loops === 2,
      `-> ${loops} loop(s) over BINDINGS`);
    check('A. ...and that table is exactly the set of bindings resolveConfig reads',
      (() => {
        const read = Object.keys(resolveConfig({}, PROVIDER_ID).bindings).sort();
        const table = BINDINGS.map(b => b.key).sort();
        return table.length > 0 && JSON.stringify(read) === JSON.stringify(table);
      })(),
      `-> config: ${Object.keys(resolveConfig({}, PROVIDER_ID).bindings).sort().join(', ')} | `
      + `table: ${BINDINGS.map(b => b.key).sort().join(', ')} — a binding added to one and not the `
      + 'other is invisible in exactly the direction that matters');
  }

  // ══ B. prototype-chain property access ═══════════════════════════════════
  section('B. three lookups walked the prototype chain');
  {
    const PROTOTYPE_NAMES = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];

    // (a) `FIELD_CANDIDATES[slot] || [slot]` returned `Object` — a FUNCTION — and `.find` threw.
    const crashed = [];
    for (const slot of PROTOTYPE_NAMES) {
      const code = await throws(() => injectInput({ 1: { class_type: 'X', inputs: {} } }, '1', slot, 'v'));
      if (code !== 'E_NO_INPUT') crashed.push(`${slot} -> ${code}`);
    }
    check('B. a slot named after an Object.prototype member REFUSES rather than crashing',
      crashed.length === 0,
      crashed.length ? `-> ${crashed.join('; ')}` : `-> all ${PROTOTYPE_NAMES.length} now raise E_NO_INPUT`);

    // (b) `'constructor' in node.inputs` is TRUE on every node. That made the guard — whose whole
    //     job is DETECTION, NEVER CREATION — "detect" an input that does not exist, and write the
    //     prompt to a key ComfyUI ignores: full GPU cost, the template's placeholder rendered,
    //     success reported. The exact failure the comment above the guard describes.
    const graph = { 1: { class_type: 'X', inputs: {} } };
    const before = JSON.stringify(graph);
    const code = await throws(() => injectInput(graph, '1', 'constructor', 'INJECTED'));
    check('B. ...and the guard does not CREATE the phantom input it refused',
      code === 'E_NO_INPUT' && JSON.stringify(graph) === before,
      `-> ${code}; graph unchanged: ${JSON.stringify(graph) === before}. `
      + `'constructor' in {} is ${'constructor' in {}}, which is why \`in\` was the wrong test.`);

    // (c) `graph[nodeId]` for such an id resolves to a FUNCTION, and `node.inputs = node.inputs || {}`
    //     then WROTE to it. Measured before the fix: `Object.inputs` was created on the global
    //     `Object` constructor, from an operator-set environment variable.
    const hadOwn = Object.hasOwn(Object, 'inputs');
    const nodeCode = await throws(() => injectInput({ 1: { class_type: 'X', inputs: { text: 't' } } }, 'constructor', 'prompt', 'POLLUTED'));
    const polluted = !hadOwn && Object.hasOwn(Object, 'inputs');
    if (polluted) delete Object.inputs;
    check('B. a node id that resolves to a prototype member REFUSES, and pollutes nothing',
      nodeCode === 'E_NO_NODE' && !polluted,
      `-> ${nodeCode}; Object.inputs created on the global Object: ${polluted}`);

    // AT THE SOURCE, with a mutation control. The INPUTS test is the one that matters: `own()`
    // around the candidates is not enough if the `.find` predicate still uses `in`.
    check('B. the inputs test uses Object.hasOwn, not `in`',
      /find\(\(f\) => own\(inputs, f\)\)/.test(graphSrc) && !/f in (node\.)?inputs/.test(graphSrc),
      `-> ${(graphSrc.match(/[^\n]*find\(\(f\) => own\([^\n]*/) || ['<not found>'])[0].trim()}`);
    const graphMutated = graphSrc.replace(/own\(inputs, f\)/, 'f in inputs');
    check('CONTROL: that assertion FAILS against a source with the `in` test restored',
      graphMutated !== graphSrc && /f in inputs/.test(graphMutated),
      'Again the mutation is asserted to have changed the source. Without that, this control '
      + 'passed against the PRE-FIX tree for the wrong reason: the prototype-chain test was '
      + 'already there, so the regex matched the original defect rather than the mutation.');

    // CONTROLS: nothing legitimate moved.
    const real = { 1: { class_type: 'CLIPTextEncode', inputs: { text: 'placeholder' } } };
    check('CONTROL: a real node with a real input still injects, and reports the field',
      injectInput(real, '1', 'prompt', 'hello') === 'text' && real['1'].inputs.text === 'hello');
    const odd = { 1: { class_type: 'X', inputs: { mystery: 1 } } };
    check('CONTROL: an unknown slot still falls back to the slot name (no breaking change)',
      injectInput(odd, '1', 'mystery', 2) === 'mystery' && odd['1'].inputs.mystery === 2);
    check('CONTROL: a node that declares nothing still refuses',
      await throws(() => injectInput({ 1: { class_type: 'X', inputs: {} } }, '1', 'prompt', 'p')) === 'E_NO_INPUT');
    check('CONTROL: an absent node still refuses, naming the ids that exist',
      await throws(() => injectInput({ 1: { class_type: 'X', inputs: {} } }, '42', 'prompt', 'p')) === 'E_NO_NODE');
    check('CONTROL: FIELD_CANDIDATES is still the exported candidate table',
      Object.hasOwn(FIELD_CANDIDATES, 'prompt') && FIELD_CANDIDATES.prompt.includes('text'));
  }

  // ══ C. a JSON document is not necessarily a graph ════════════════════════
  section('C. loadGraph validated syntax and never shape');
  {
    // `JSON.parse('null')` succeeds. `loadGraph` returned it, and the next call ran
    // `Object.keys(null)` inside its own E_NO_NODE message — a raw TypeError where a named
    // refusal belongs, which is the "fails as the wrong answer" failure wire.mjs names.
    check('C. a template containing null is REFUSED with a named code',
      await throws(() => loadGraph(NULLDOC)) === 'E_BAD_WORKFLOW',
      `-> ${JSON.stringify(await throws(() => loadGraph(NULLDOC)))}`);
    check('C. ...and buildGraph refuses it too, rather than throwing Object.keys(null)',
      await throws(() => buildGraph(REQ, { templatePath: NULLDOC, bindings: { prompt: '1' } })) === 'E_BAD_WORKFLOW',
      `-> ${JSON.stringify(await throws(() => buildGraph(REQ, { templatePath: NULLDOC, bindings: { prompt: '1' } })))}`);
    check('C. a bare JSON array is refused as a workflow',
      await throws(() => loadGraph(ARRAYDOC)) === 'E_BAD_WORKFLOW');
    check('C. a scalar document is refused as a workflow',
      await throws(() => loadGraph(SCALARDOC)) === 'E_BAD_WORKFLOW');
    check('C. ...and verify() reports it rather than crashing',
      (await verify({ SWAN_COMFYUI_WORKFLOW: NULLDOC, SWAN_COMFYUI_NODE_PROMPT: '1' }, REACHABLE)).ok === false);

    // CONTROLS: the three shapes that are real, each keeping its own code.
    check('CONTROL: a valid API-format graph still loads',
      Object.keys(loadGraph(GOOD)).length === 2);
    check('CONTROL: a GUI-format export still gets its own, more specific code',
      await throws(() => loadGraph(GUI)) === 'E_GUI_FORMAT_WORKFLOW');
    check('CONTROL: a missing template still gets E_NO_WORKFLOW, not E_BAD_WORKFLOW',
      await throws(() => loadGraph(join(dir, 'nope.json'))) === 'E_NO_WORKFLOW');
    check('C. the shape test is in loadGraph, where the file is, not at the call site',
      /typeof parsed !== 'object'/.test(graphSrc),
      `-> ${(graphSrc.match(/[^\n]*typeof parsed !== 'object'[^\n]*/) || ['<not found>'])[0].trim()}`);
  }

  // ══ D. the coverage gate, and the eighteen codes it never saw ════════════
  section('D. eighteen adapter codes had no status, and the sweep did not look at them');
  {
    const ADAPTERS = [
      'shared/providers/video/comfyuiLocal.mjs', 'shared/providers/video/comfyuiGraph.mjs',
      'shared/providers/video/higgsfield.mjs', 'shared/providers/video/higgsfieldTransport.mjs',
    ];
    const swept = new Set();
    for (const rel of ADAPTERS) {
      const src = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
      for (const m of src.matchAll(/'(E_[A-Z0-9_]+)'/g)) swept.add(m[1]);
    }
    const unmapped = [...swept].filter((c) => !(c in STATUS_BY_CODE)).sort();
    check('CONTROL: the sweep found the adapter codes', swept.size >= 18, `${swept.size} code(s)`);
    check('D. no adapter code falls through to the default 400',
      unmapped.length === 0,
      unmapped.length ? `UNMAPPED: ${unmapped.join(', ')}` : `all ${swept.size} mapped`);

    // THE LAYER, per code, written out here rather than read back out of the table — a check that
    // compares the table with itself tests a copy of it.
    const EXPECTED = {
      // our provisioning, or our graph: 500. Retrying re-reads the same bytes.
      E_NOT_CONFIGURED: 500, E_NO_WORKFLOW: 500, E_BAD_WORKFLOW: 500, E_GUI_FORMAT_WORKFLOW: 500,
      E_NO_NODE: 500, E_NO_INPUT: 500, E_NO_OUTPUT_PATH: 500, E_SUBMIT_REJECTED: 500,
      // the provider failed, or broke its contract: 502
      E_SUBMIT_FAILED: 502, E_NO_PROMPT_ID: 502, E_NO_REQUEST_ID: 502, E_DOWNLOAD_FAILED: 502,
      E_EMPTY_ARTIFACT: 502, E_NO_OUTPUT: 502, E_GENERATION_FAILED: 502, E_CANCEL_FAILED: 502,
      // the provider timed out
      E_TIMEOUT: 504,
      // the provider refused the content, which is a judgement about the request
      E_NSFW: 422,
    };
    const wrong = Object.entries(EXPECTED).filter(([c, s]) => statusFor(c) !== s);
    check('D. every adapter code maps to the layer that actually refused',
      wrong.length === 0,
      wrong.length ? `-> ${wrong.map(([c, s]) => `${c}: want ${s} got ${statusFor(c)}`).join('; ')}`
        : `-> ${Object.keys(EXPECTED).length} codes: 8 provisioning (500), 8 provider (502), `
          + '1 timeout (504), 1 refusal (422)');
    check('D. NOT ONE of them is 400 — the caller\'s request was never the problem',
      Object.keys(EXPECTED).every((c) => statusFor(c) !== 400),
      'a 400 says "your request was malformed" about a graph the caller never wrote');

    // THE BOUNDARY the adapter's own comment draws, and the one place a wrong status would repeat
    // round 11's defect: a 4xx submit is OUR graph (permanent), a 5xx is the PROVIDER (transient).
    // Collapsing their CODES throws away jobs for a service blip; collapsing their STATUSES sends
    // the reader to the wrong layer.
    const rejected = await throws(() => run(envFor(GOOD), comfy({ submitStatus: 400 }), join(dir, 'a.mp4')));
    const failed = await throws(() => run(envFor(GOOD), comfy({ submitStatus: 503 }), join(dir, 'b.mp4')));
    check('D. a 4xx submit is OUR graph at 500; a 5xx is the PROVIDER at 502',
      rejected === 'E_SUBMIT_REJECTED' && statusFor(rejected) === 500
      && failed === 'E_SUBMIT_FAILED' && statusFor(failed) === 502,
      `-> ${rejected}:${statusFor(rejected)} (our graph, permanent) | ${failed}:${statusFor(failed)} `
      + '(the provider, retryable). 502 and not 500: round 11 is the round where "our data is wrong" '
      + 'and "the vendor is down" were collapsed, and it cost a real hunt.');

    check('CONTROL: an unmapped code still falls back to 400', statusFor('E_TOTALLY_MADE_UP') === 400);
    check('CONTROL: the table is still frozen', Object.isFrozen(STATUS_BY_CODE));

    // THE GATE ITSELF. Round 7 asks "of the codes the GATEWAY can raise, which have no defined
    // status?" — and its module list omitted all four adapter files, so it was green about the
    // modules it listed and silent about the ones that raise most of the codes.
    const r7 = stripComments(readSource('./hostile-round7-probe.mjs'));
    const stillMissing = ADAPTERS.filter((f) => !r7.includes(`'${f}'`));
    check('D. round 7\'s coverage sweep now names the adapter modules it was blind to',
      stillMissing.length === 0,
      stillMissing.length ? `-> still missing: ${stillMissing.join(', ')}`
        : `-> all ${ADAPTERS.length} named in the GATEWAY list`);
    const r7Mutated = r7.replace("'shared/providers/video/comfyuiLocal.mjs',", '');
    check('CONTROL: removing one adapter from that list makes the sweep blind again',
      r7Mutated !== r7 && !r7Mutated.includes("'shared/providers/video/comfyuiLocal.mjs'"),
      'so D is testing the SCOPE of the gate, not merely the presence of the table — and the '
      + 'mutation is asserted to have changed the source, so this control cannot pass by finding '
      + 'the string already absent.');

    // REACHABILITY, STATED RATHER THAN ASSUMED. An adapter refusal reaches a caller as
    // `job.error.code` on a 200 job fetch; `statusFor` is not on that path today. So mapping these
    // changes NO response — they are mapped for the reason E_BAD_SPEC is: the fallback is 400, the
    // catch in `routes.mjs` is generic, and a handler that awaited an adapter inline would silently
    // answer "your request was malformed".
    const server = stripComments(readSource('./server.mjs'));
    check('DISCLOSURE: an adapter refusal reaches the caller as job.error.code, not as a status',
      /error:\s*\{\s*code:\s*err\.code/.test(server) && !/statusFor/.test(server),
      `-> ${(server.match(/[^\n]*code:\s*err\.code[^\n]*/) || ['<not found>'])[0].trim()} — so the `
      + 'mapping is inert today, and correct for the day a handler awaits an adapter inline.');
  }

  // ══ E. the GPU-failure report — CLOSED BY ROUND 19 ═══════════════════════
  section('E. CLOSED BY ROUND 19: a failed graph is reported as a failed graph');
  {
    // WRITTEN AS A DISCLOSURE, NOW AN ASSERTION. Round 18 proved — through `generate()` — that a
    // graph which ERRORED on the GPU was reported as `E_NO_OUTPUT`, with a message that blamed the
    // saver node and discarded the node's own exception. Round 19 closed the REPORTING half
    // (`comfyuiHistory.mjs` decides what an entry means; a failed run raises `E_GRAPH_FAILED`), so
    // the disclosure checks would now be asserting a defect. They are rewritten to pin the FIXED
    // behaviour; `hostile-round19-probe.mjs` carries the full case. The PERMANENCE half stays open
    // and stays a disclosure, because `PERMANENT_CODES` lives in the runner.
    const errored = {
      outputs: {},
      status: {
        status_str: 'error', completed: false,
        messages: [['execution_error', { node_id: 9, node_type: 'VHS_VideoCombine', exception_message: 'CUDA out of memory' }]],
      },
    };
    const code = await throws(() => run(envFor(GOOD), comfy({ entry: errored }), join(dir, 'c.mp4')));
    check('E. a graph that ERRORED on the GPU is reported as E_GRAPH_FAILED, not E_NO_OUTPUT',
      code === 'E_GRAPH_FAILED',
      `-> ${code}. Round 18 measured E_NO_OUTPUT here: Boolean({}) is ${Boolean({})}, so `
      + '`entry.outputs` broke the loop and the adapter concluded the graph had finished.');
    const message = await (async () => {
      try { await run(envFor(GOOD), comfy({ entry: errored }), join(dir, 'd.mp4')); return ''; } catch (e) { return e.message; }
    })();
    check('E. ...and the message names the node AND carries its own exception',
      /out of memory/.test(message) && /9/.test(message) && !/video-saving node/.test(message),
      `-> ${JSON.stringify(message.slice(0, 130))} — round 18 measured the opposite: the message `
      + 'blamed the saver node while the exception sat unread in `status.messages`.');
    check('E. ...and the decision comes from a predicate that can tell failure from "not yet"',
      /terminalState\s*\(/.test(localSrc),
      'the break condition is no longer a truthiness test on a container, which is what made a '
      + 'failed run and a still-executing one — both `outputs: {}` — indistinguishable.');
    // ROUND 25 CLOSED THIS DISCLOSURE, AND IT IS REWRITTEN RATHER THAN LEFT STANDING.
    //
    // Round 19 disclosed that both codes are retryable and named the cost. Round 25 established that
    // the two do NOT share an excuse, so they are closed by two different mechanisms — and the check
    // below is the new truth, which is stronger than the one it replaces because it can now fail on
    // BOTH halves of the asymmetry rather than on a single boolean.
    //
    //   E_NO_OUTPUT    is NOT mixed — the run completed, so the same bytes reproduce it — and it is
    //                  now in PERMANENT_CODES, so `isPermanentCode` answers true.
    //   E_GRAPH_FAILED IS mixed: its canonical instance in this lane is `CUDA out of memory`, which
    //                  is a fact about the moment. It therefore stays OUT of the code-level set and
    //                  the adapter marks permanence per INSTANCE from the node's own exception.
    //
    // Asserting `isPermanentCode('E_GRAPH_FAILED') === false` is therefore not a disclosure any
    // more — it is the reason the per-instance mechanism has to exist, and if someone adds the code
    // to the set to "finish the job", this check fails and says why.
    check('E. the round-19 disclosure is CLOSED, by two different mechanisms — and neither is a blanket',
      isPermanentCode('E_NO_OUTPUT') === true
        && isPermanentCode('E_GRAPH_FAILED') === false
        && /failureIsDeterministic/.test(localSrc),
      '-> E_NO_OUTPUT: permanent at the code level (not mixed — the run finished). '
      + 'E_GRAPH_FAILED: still NOT in the set, deliberately, because it is mixed and a blanket entry '
      + 'would make `CUDA out of memory` permanent; the adapter classifies per instance instead. '
      + 'Both halves are asserted here so that neither can be "completed" by the other\'s mechanism.');

    // CONTROLS: the two shapes around it behave.
    check('CONTROL: a genuinely completed graph still returns its artifact',
      (await run(envFor(GOOD), comfy({ entry: DONE }), join(dir, 'e.mp4'))).bytes > 0);
    check('CONTROL: a graph that reports completed with NO outputs still gives E_NO_OUTPUT',
      await throws(() => run(envFor(GOOD), comfy({ entry: { status: { completed: true }, outputs: {} } }), join(dir, 'f.mp4'))) === 'E_NO_OUTPUT');
  }

  // ══ F. the adapter's settled contracts must not move ═════════════════════
  section('F. the adapter\'s contracts, unchanged');
  {
    const out = await run(envFor(GOOD), comfy({ entry: DONE }), join(dir, 'g.mp4'));
    check('F. a completed run still returns the named fields, not inferred ones',
      out.provider === PROVIDER_ID && out.promptId === 'pid-1' && out.bytes > 0
      && /^[0-9a-f]{64}$/.test(out.sha256) && Boolean(out.attribution),
      `-> ${Object.keys(out).join(', ')}`);
    // The artifact's REAL container is honoured: a webm saver must not be written to a .mp4 name.
    const webm = { status: { completed: true }, outputs: { 9: { gifs: [{ filename: 'out.webm', subfolder: '', type: 'output' }] } } };
    const webmOut = await run(envFor(GOOD), comfy({ entry: webm }), join(dir, 'h.mp4'));
    check('F. the artifact\'s real container still wins over the proposed path',
      webmOut.outPath.endsWith('.webm') && !/\.mp4$/.test(webmOut.outPath),
      `-> ${webmOut.outPath.split(/[\\/]/).pop()}`);
    check('F. findOutputFile still scans every output key and still ignores a png',
      findOutputFile(DONE)?.filename === 'out.mp4'
      && findOutputFile({ outputs: { 9: { images: [{ filename: 'preview.png' }] } } }) === null
      && findOutputFile(null) === null);
    check('F. a timeout is still a timeout, not "no output"',
      await throws(() => generate(REQ, {
        env: envFor(GOOD), outPath: join(dir, 'i.mp4'), sleep: async () => {}, timeoutMs: 1,
        fetchImpl: comfy({ entry: { status: { completed: false } } }),
      })) === 'E_TIMEOUT');
    check('F. an unconfigured provider still fabricates nothing',
      await throws(() => run({}, comfy({}), join(dir, 'j.mp4'))) === 'E_NOT_CONFIGURED');
    check('F. resolveConfig still falls back to the bare key and the default host',
      (() => {
        const cfg = resolveConfig({ SWAN_COMFYUI_WORKFLOW: GOOD, SWAN_COMFYUI_NODE_PROMPT: '1' }, PROVIDER_ID);
        const suffixed = resolveConfig(
          { SWAN_COMFYUI_WORKFLOW_WAN_2_2: 'x', SWAN_COMFYUI_WORKFLOW: GOOD, SWAN_COMFYUI_NODE_PROMPT: '1' },
          'comfyui/wan-2.2',
        );
        return cfg.host === 'http://127.0.0.1:8188' && cfg.configured === true && suffixed.templatePath === 'x';
      })());
    check('F. envSuffix is unchanged', envSuffix('comfyui/wan-2.2') === 'WAN_2_2');
    check('F. inspectBindings is pure: coherent config clean, unset bindings skipped, a null graph refused',
      safe(() => inspectBindings(loadGraph(GOOD), { prompt: '1' }).length) === 0
      && safe(() => inspectBindings(loadGraph(GOOD), {}).length) === 0
      && safe(() => inspectBindings(null, { prompt: '1' }).length) === 1,
      'the last one matters: a graph that could not be loaded must be reported, not silently passed');
  }

  // ══ G. the file table must name every module — because it did not, twice ═
  section('G. the file table, which has now omitted two modules across two rounds');
  {
    // Round 16 found `provenance.mjs` missing from the provider-layer table. Round 18 found
    // `comfyuiLocal.mjs` and `comfyuiGraph.mjs` missing from it — the same gap, in the round whose
    // whole subject they are. A table nobody checks drifts, and the drift is UNDER-claiming, which
    // Rule 75 names as a correctness problem rather than a cosmetic one. So it is an assertion now:
    // a module that exists in the lane and is absent from the document is a failing gate.
    const readme = readSource('../docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md');
    const modules = [];
    for (const d of ['shared/providers/video', 'media-api', 'backend/scripts/handlers']) {
      for (const name of readdirSync(new URL(`../${d}/`, import.meta.url))) {
        if (name.endsWith('.mjs')) modules.push(`${d}/${name}`);
      }
    }
    // A TABLE ROW, not a mention. The first version of this check asked whether the name appeared
    // anywhere in the document — and the round-17 README satisfied it for BOTH comfyui modules,
    // because round 17's own narrative lists them in a sentence about the adapters it scanned. So
    // the check passed for the two files whose absence was the defect, which is the same vacuity as
    // the absence controls above, one level up. A row begins `| \`name\``, and prose does not.
    const named = (text, m) => text.includes(`| \`${m.split('/').pop()}\``);
    // The handler table documents what THIS LANE CHANGED in that directory, not every file in it,
    // so a pre-existing handler the lane has never touched is legitimately absent — it is not in the
    // patch, which is the check's own evidence. Named with a reason rather than filtered out
    // silently, which is the idiom round 7's `NOT_A_WIRE_STATUS` uses, and a stale exemption FAILS,
    // so the list cannot outlive its reason.
    // ROUND 23 EMPTIED THIS MAP, and the reason it held is the finding. Its one entry read:
    //   'backend/scripts/handlers/completion.mjs' -> 'pre-existing queue-completion handler;
    //   this lane has never modified it (absent from the patch)'
    // That is a fact about the PATCH, not about the lane's dependency surface. `generateVideo.mjs`
    // imports `mimeForFilename` from that module, so every video job's r2Key, mime and operator log
    // line are built out of it — and round 23 attacked it, found three defects, and gave it a row
    // in the handler table. An exemption justified by "we never edited it" cannot tell a module
    // OUTSIDE the lane from a module the lane DEPENDS ON and never looked at, and that is how a
    // module with a prototype-lookup defect sat behind a formally-exempted file-table check for
    // twenty-two rounds. The mechanism stays — a named exemption with a reason is the right idiom —
    // but the list is now empty, and a redundant exemption FAILS below.
    const NOT_LANE_OWNED = {};
    const staleExemptions = Object.keys(NOT_LANE_OWNED).filter((m) => !modules.includes(m));
    check('CONTROL: no exemption is stale', staleExemptions.length === 0,
      staleExemptions.join(', ') || 'every exemption still names a module that exists');
    // §23.2's step 4, which is the one that gets skipped: an exemption must still BE an exemption.
    // A module that has since been documented must not stay parked in the exemption list, because
    // that is where uncomfortable findings go to stop being visible.
    const redundantExemptions = Object.keys(NOT_LANE_OWNED).filter((m) => named(readme, m));
    check('CONTROL: no exemption is redundant — an exempt module that HAS a row is not exempt',
      redundantExemptions.length === 0,
      redundantExemptions.length
        ? `-> ${redundantExemptions.join(', ')} is exempted AND documented; drop the exemption`
        : 'no module is both exempted and documented');
    const missing = modules.filter((m) => !named(readme, m) && !NOT_LANE_OWNED[m]);
    check('CONTROL: the table has modules to check', modules.length >= 45, `${modules.length} module(s)`);
    check('G. every module in the lane has a ROW in the README file tables',
      missing.length === 0,
      missing.length ? `-> NO ROW: ${missing.join(', ')}`
        : `-> all ${modules.length} have a row. Round 16 omitted provenance.mjs; round 18 omitted `
          + 'both comfyui modules, and the first version of this very check would have MISSED them '
          + 'because a sentence elsewhere in the document names them.');
    // THE CONTROL, and it has to be a mutation rather than an absence test: deleting one module's
    // ROW must make the check fail. Without this, G passes on any README, including an empty one.
    const stripped = readme.replace(/\| `comfyuiGraph\.mjs`/g, '| ``');
    check('CONTROL: stripping one module\'s row makes G fail',
      stripped !== readme && modules.some((m) => !named(stripped, m)),
      'so G is testing the table, not passing on any document at all');

    // ── THE COUNTS IN THE PROSE ───────────────────────────────────────────────
    // Round 20's close-out found TWO hand-written counts that had drifted, and neither had any
    // assertion over it. This is the file-table defect again, in the one place a reader goes to
    // reconcile the document against the artifact:
    //
    //   * the closing block said "the same **55**-file list" while the same paragraph said
    //     "**58 files**" twice. 55 dated from the round when the patch held 55 files and had
    //     survived three rounds (r18 was 57 files, r19 57, r20 58) because nothing read this prose.
    //   * the gate-16 section said "the assertion total is **936**" -- round 19's total -- while
    //     its own parenthetical summed to 968. The round-20 update corrected the total in two
    //     places and missed the third.
    //
    // Both are checkable WITHOUT git, and that is deliberate: the patch is generated after this
    // document and does not exist in the clone, so a git-derived count would be environment-
    // dependent -- green in the worktree, red in the receipt, which is the failure the whole
    // apply-to-a-fresh-base ritual exists to prevent. Self-consistency has no such problem.
    const block = readme.slice(readme.indexOf('Handover is a **patch**'));
    const statedTotal = block.match(/\*\*(\d+) files\*\*/);
    const split = block.match(/\((\d+) modified, (\d+) new\)/);
    const safetyNet = block.match(/The same (\d+) files are also materialised/);
    const tailCount = block.match(/the same (\d+)-file list/);
    const blockParsed = Boolean(statedTotal && split && safetyNet && tailCount);
    check('CONTROL: the closing block was found and parsed', blockParsed,
      blockParsed
        ? `-> total ${statedTotal[1]}, split ${split[1]}+${split[2]}, safety net ${safetyNet[1]}, `
          + `tail ${tailCount[1]}`
        : '-> the closing block did not parse; G2 and G3 below would be vacuous');

    const fileCounts = blockParsed ? [statedTotal[1], safetyNet[1], tailCount[1]] : [];
    check('G2. the closing block states ONE file count, three times',
      blockParsed && new Set(fileCounts).size === 1,
      !blockParsed ? '-> not parsed'
        : (new Set(fileCounts).size === 1
          ? `-> all three sentences say ${fileCounts[0]}`
          : `-> DISAGREEMENT: ${fileCounts.join(' vs ')} — round 20 found "55" surviving three rounds`));

    check('G3. the modified/new split adds up to the stated total',
      blockParsed && Number(split[1]) + Number(split[2]) === Number(statedTotal[1]),
      blockParsed
        ? `-> ${split[1]} + ${split[2]} = ${Number(split[1]) + Number(split[2])} `
          + `vs stated ${statedTotal[1]}`
        : '-> not parsed');

    // The mutation runs in the direction the round-19 lesson requires: RE-INTRODUCE the stale count
    // into a copy and require G2 to fail on it. An "is 55 absent" check would pass on the pre-fix
    // document for the trivial reason that the strip is what removed it -- and this control also
    // asserts the mutation CHANGED the source, so a no-op substitution cannot pass it.
    const staleBlock = block.replace(/the same \d+-file list/, 'the same 55-file list');
    const staleCounts = [statedTotal?.[1], safetyNet?.[1],
      staleBlock.match(/the same (\d+)-file list/)?.[1]].filter(Boolean);
    check('CONTROL: re-introducing a stale count makes G2 fail',
      staleBlock !== block && new Set(staleCounts).size > 1,
      'so G2 reads the block, rather than passing on any document at all');

    // And the assertion total, which drifted for one round in exactly the same way. It carries its
    // own arithmetic in the sentence, so the sum of the parts must equal the stated whole.
    const base = readme.match(/(\d+) when this section was written/);
    const claimedTotal = readme.match(/the assertion total is \*\*(\d+)\*\*/);
    // DERIVED, not a hand-written list of rounds. The first version hard-coded `round 18 … round 22`,
    // so adding round 23 made G4 fail on a document that was arithmetically CORRECT — and a check
    // that has to be extended by hand every round is a check that will one day be extended wrongly.
    // This lane has already paid for that lesson twice (§15.1's stale count, and round 21's five
    // hand-corrected places). Every `round N one gate and M` in the sentence is a part; the sum of
    // the parts is the whole. Round 23's own section E makes the same argument about the totals one
    // level up, and this is the local version of it.
    // Both phrasings, because round 18's own part reads "added its own gate and 66 checks" while
    // every later one reads "one gate and N". A single-form regex silently dropped the first part
    // and summed to 1030 against a stated 1096 — which is the same class of miss as the check this
    // replaced, one level down: the pattern was narrow and the failure looked like a document error.
    const gateParts = [...readme.matchAll(/round \d+(?: added its own gate and (\d+) checks| one gate and (\d+))/g)]
      .map((m) => Number(m[1] ?? m[2]));
    const sumParsed = Boolean(base && claimedTotal && gateParts.length);
    const summed = sumParsed ? Number(base[1]) + gateParts.reduce((a, b) => a + b, 0) : null;
    check('G4. the stated assertion total equals the sum of its own stated parts',
      sumParsed && summed === Number(claimedTotal[1]),
      sumParsed
        ? `-> ${base[1]} + ${gateParts.join(' + ')} = ${summed} vs stated ${claimedTotal[1]} `
          + `(${gateParts.length} per-round parts, derived from the sentence)`
        : '-> the gate-16 sentence did not parse');

    // ── G5: THE SAME COUNT, IN THE BLOCK G2 DOES NOT COVER ────────────────────
    // Round 20 asserted the CLOSING block (G2/G3) and the gate-16 sentence (G4). Round 21 then
    // had to correct the re-verification block BY HAND: it said 58 in three places while the
    // closing block said 59, and every gate was green. That is G2's own lesson one more time —
    // a hand-written count drifts wherever no assertion reads it, and asserting one block does
    // not cover the others. So this block is asserted too, against the SAME number.
    //
    // NARROWED IN ROUND 25, and the narrowing is a correction rather than a loosening. The block
    // contains TWO kinds of number. The quoted run (`#   63 files changed`, `wc -l -> 63`,
    // `-> 63/63`) is the PRINTED OUTPUT of one specific run against a patch generation that round
    // 23 established no longer exists on disk — a record, not a claim, and round 25 added a marker
    // in the block saying exactly that. The `The patch is now **N files**` sentence is the LIVE
    // claim, and it is what this check compares against the closing block's three. Comparing the
    // record to the claim forced the record to be falsified to stay green, which is the opposite
    // of what a record is for. The check still does round 21's job: if the live sentence drifts
    // from the closing block, G5 fails.
    //
    // ── R3-6: THE NARROWING WAS STILL MIXING THE TWO, IN THE OTHER DIRECTION ──
    //
    // Round 25 narrowed the RECORD out of the comparison. It then compared the live claim to
    // `statedTotal`, `safetyNet` and `tailCount` — but THOSE THREE ARE THEMSELVES A RECEIPT: they
    // are read from the handover paragraph, which the document labels in bold, two paragraphs on,
    // as "A HISTORICAL RECEIPT, AND ROUND 27 LABELS IT AS ONE. It is not a current claim, and
    // correcting its counts could never have made it one."
    //
    // So G5 required a receipt to track a claim — precisely the demand round 25's own entry (item
    // 25 in the NOT-proven table) forbids: "**a check must know which of the numbers it reads are
    // claims and which are receipts**, because the two drift in opposite directions — a claim is
    // wrong when it lags, a receipt is wrong when it is updated." The rule was written down and
    // then violated by the check that wrote it down.
    //
    // Measured 2026-09-21 (round 3): G5 read `88 vs 82 vs 82 vs 82` and went RED against a document
    // whose live claim, closing block and gate-28 derivation all agree on 88. The document was
    // RIGHT. The 82 is the receipt, correctly frozen at the snapshot it records (the round-12-era
    // patch), and updating it would falsify a record of what a command actually printed.
    //
    // THE FIX SPLITS THE TWO QUESTIONS, which is what the round-25 rule has always required:
    //   (a) the LIVE claim must equal the closing block — round 21's job, unchanged; and
    //   (b) the RECEIPT block must be internally SELF-consistent — its four statements agree with
    //       EACH OTHER — without being required to agree with the live claim.
    // A receipt is a coherent snapshot, not a current number. Splitting them is what makes both
    // assertions true rather than one of them aspirational.
    // ── G5a: WHAT IS ACTUALLY ASSERTED, STATED PRECISELY ─────────────────────
    //
    // The slice above holds a RECEIPT, not a claim. So this check must NOT compare the live claim
    // (88, stated with its own explanation of the six-file drift) against the receipt (82, frozen
    // at the snapshot it records). Doing that made the check fail on a CORRECT document and would
    // only have gone green by falsifying a record of what a command actually printed — the exact
    // demand round 25's rule forbids.
    //
    // What IS true regardless of which snapshot the receipt names: the live claim must be
    // internally sound — its split must sum to its own total. Its agreement with the FILESYSTEM is
    // gate 28's E1, which derives the number from git and compares. Asserting that here as well
    // would duplicate the derivation against a number this probe cannot derive, and would make the
    // two gates fail together for one cause.
    const vStated = readme.match(/The patch is now \*\*(\d+) files\*\*/);
    const vSplit = readme.match(/The patch is now \*\*\d+ files\*\*[^\n(]*\((\d+) modified, (\d+) new\)/);
    const liveParsed = Boolean(vStated && vSplit);
    const liveSum = liveParsed ? Number(vSplit[1]) + Number(vSplit[2]) : null;
    const liveSumOk = liveParsed && liveSum === Number(vStated[1]);
    check('G5a. the LIVE patch claim parses, and its split sums to its own total',
      liveParsed && liveSumOk,
      !liveParsed ? '-> the live patch sentence did not parse'
        : (liveSumOk
          ? `-> live claim ${vStated[1]} = ${vSplit[1]} modified + ${vSplit[2]} new. Its agreement `
            + 'with git is gate 28\'s E1, derived there rather than duplicated here — and the '
            + `receipt below is free to say 82, being a snapshot of an earlier run.`
          : `-> the live claim states ${vStated[1]} but its own split is ${vSplit[1]} + ${vSplit[2]} `
            + `= ${liveSum}. A claim whose parts do not sum to its total is wrong on its face, with `
            + 'no artifact and no git needed to see it.'));

    // (b) The receipt's OWN internal consistency. `statedTotal`/`safetyNet`/`tailCount` all come
    // from the frozen handover paragraph, so they must agree with each other and are allowed to
    // differ from the live claim above. This is the half round 25 wrote the rule for and did not
    // implement.
    const rCounts = [statedTotal, safetyNet, tailCount].filter(Boolean).map((m) => m[1]);
    const receiptParsed = rCounts.length === 3;
    check('G5b. the handover RECEIPT block is internally self-consistent (and free to differ from the live claim)',
      receiptParsed && new Set(rCounts).size === 1,
      !receiptParsed ? '-> the receipt block did not parse'
        : (new Set(rCounts).size === 1
          ? `-> the receipt's ${rCounts.length} statements all say ${rCounts[0]}`
            + (vStated && rCounts[0] !== vStated[1]
              ? `, while the live claim says ${vStated[1]} — allowed, and expected: a receipt records`
                + ' a snapshot and is wrong when it is UPDATED, not when it lags.'
              : '')
          : `-> RECEIPT INTERNALLY INCONSISTENT: ${rCounts.join(' vs ')} — a frozen block whose own`
            + ' statements disagree is not a record of anything.'));

    // The G5a control must FAIL THE SAME PREDICATE the check uses. Mutating the live total alone
    // leaves the split summing correctly, so it does not exercise G5a — it would only have tested
    // the old cross-block comparison this check no longer makes. So the control mutates the SPLIT
    // instead, which is the thing G5a actually asserts, and the mutation is verified to have
    // changed the source before it is believed.
    const staleSplit = readme.replace(
      /The patch is now (\*\*\d+ files\*\*[^\n(]*)\(\d+ modified, \d+ new\)/,
      'The patch is now $1(9 modified, 999 new)');
    const staleLive = staleSplit.match(/The patch is now \*\*(\d+) files\*\*/);
    const staleSplitPair = staleSplit.match(/The patch is now \*\*\d+ files\*\*[^\n(]*\((\d+) modified, (\d+) new\)/);
    const staleSum = staleSplitPair
      ? Number(staleSplitPair[1]) + Number(staleSplitPair[2]) : null;
    check('CONTROL: a live claim whose split does not sum to its total makes G5a fail',
      staleSplit !== readme && Boolean(staleLive && staleSplitPair)
        && staleSum !== Number(staleLive[1]),
      'so G5a reads the live claim and its split, rather than passing on any document at all');

    // The receipt half needs its OWN control: perturb one of its three statements and G5b must fail.
    // Without this, G5b could pass on a document whose receipt half never parsed at all.
    const staleReceipt = readme.replace(/The same (\d+) files are also materialised/,
      'The same 999 files are also materialised');
    const rMut = [statedTotal?.[1],
      staleReceipt.match(/The same (\d+) files are also materialised/)?.[1],
      tailCount?.[1]].filter(Boolean);
    check('CONTROL: perturbing the RECEIPT block makes G5b fail',
      staleReceipt !== readme && rMut.length === 3 && new Set(rMut).size > 1,
      'so G5b reads the receipt, and a frozen block that stops agreeing with itself is caught');
  }

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
