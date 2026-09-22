/**
 * hostile-round25-probe.mjs — WHICH GRAPH FAILURES ARE WORTH ANOTHER FULL GPU RENDER?
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * Round 19 disclosed, in its own words, that `E_GRAPH_FAILED` and `E_NO_OUTPUT` are BOTH retryable
 * and named the cost: "a graph that fails identically every time is worth another full GPU render on
 * each attempt". Measured on this lane's render box during round 25's exit-gate run: **80.1s** for
 * the 4-step turbo graph, and **387.7s** for the long one. Three attempts is therefore 4 to 19
 * minutes of a 5090 spent reproducing an answer the graph already gave.
 *
 * The disclosure was filed as "PERMANENT_CODES lives in the runner — Sean's call". Round 25 makes
 * the call, and the call is that the OBVIOUS fix is wrong.
 *
 * ── THE OBVIOUS FIX IS WRONG, AND THIS LANE'S OWN FIXTURE SAYS SO ──────────
 * Adding `E_GRAPH_FAILED` to `PERMANENT_CODES` would be one line. It would also make
 * **`CUDA out of memory` permanent** — and OOM is the canonical `E_GRAPH_FAILED` in this lane,
 * sitting in round 18's own fixture. OOM is a fact about the MOMENT: another process may release
 * VRAM, fragmentation differs, a retry can genuinely succeed. `generateVideo.mjs`'s own header says
 * the inverse error is "just as bad": a wrongly-permanent code throws away a job that would have
 * succeeded.
 *
 * So `E_GRAPH_FAILED` is a **MIXED** code. It covers deterministic graph faults (a bad parameter, a
 * missing model) AND transient GPU faults (OOM, a device race), and no single boolean over the code
 * can express that. The information needed to separate them is in the node's own exception, which
 * the adapter already has in hand — so the classification belongs there, per INSTANCE, not in a set
 * keyed by code.
 *
 * `E_NO_OUTPUT` is the opposite: NOT mixed. It is reached only after `terminalState` says the graph
 * finished, so the same bytes reproduce it exactly. It belongs in the set, and it is now there.
 *
 * ── THE ASYMMETRY IS THE FINDING, AND BOTH HALVES ARE ASSERTED ─────────────
 * Two codes, one disclosure, two different mechanisms — and a reader who "finishes the job" by
 * adding `E_GRAPH_FAILED` to the set breaks the OOM case. This probe asserts both halves so that
 * neither can be closed by the other's mechanism, and asserts the DIRECTION of every guess.
 *
 * ── THE DIRECTION OF THE GUESS ─────────────────────────────────────────────
 * DEFAULT RETRYABLE. Only an explicitly-named deterministic type, with no transient marker in its
 * message, is called permanent. The two errors are not symmetric: a wrong "retryable" costs GPU
 * time; a wrong "permanent" throws away a job that would have succeeded. So an unrecognised
 * exception type keeps its retry, and the type list is closed.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No render, no job, no queue, no server, no network. This probe calls pure functions and one
 * adapter with a fake fetch.
 *
 * ── R3-5 (2026-09-21): THIS PROBE'S OWN E1 COULD BE REDDENED BY ANYONE'S SCRATCH ────────────
 * E1 derives the lane's change set and compares it to the count the document states. It used to
 * fold `git status --porcelain -uall` untracked files into the "added" set. The intent was right —
 * a lane file left untracked is invisible to `git diff` and was silently dropped from a patch
 * twice — but the consequence was that ANY untracked file an agent happened to leave in a lane
 * directory moved the number and turned this gate red without a line of the lane's code changing.
 * With two scratch files present this probe derived 84 against the document's 82 and failed.
 *
 * That is worse than a false positive. A gate any concurrent worker can redden by existing is a
 * gate that will eventually be "fixed" by deleting someone's evidence — and the tempting repair
 * was to edit the DOCUMENT's count, which would have been a FABRICATED correction: the document
 * was right and the derivation was wrong. (This was caught before it was acted on, which is the
 * only reason it is a note and not a mistake.)
 *
 * The derivation is now TRACKED ONLY, so it is a property of the commit rather than of the
 * moment. Untracked lane files are still REPORTED by name in E1's diagnostic — they are the
 * original defect and must stay visible — but they are a separate fact from the count, so a
 * reader can tell "the lane has an uncommitted file" from "the document's count is wrong".
 * E3 is the control, and it asserts both halves.
 *
 * ── THE CONTROL FOUND THE SAME DEFECT INSIDE ITSELF, WHICH IS WHY E3 IS WORTH READING ───────
 * E3's first fixture was `media-api/.r35-untracked-control.tmp`. It failed half (b) with an
 * unchanged total, which looked exactly like the fix having over-reached and silenced the
 * untracked report. It had not. `.gitignore:49` is `*.tmp`, so `git status --porcelain` never
 * listed the fixture at all and the control was asserting something about a file git could not
 * see — i.e. it was testing NOTHING while appearing to test the fix, and its "UNCHANGED" total was
 * true for entirely the wrong reason. Measured: `git check-ignore -v
 * media-api/.r35-untracked-control.tmp` -> `.gitignore:49:*.tmp`.
 *
 * That is this lane's recurring defect class — a check satisfied by never looking — appearing
 * INSIDE the control written to catch it. So E3 now verifies its own fixture is visible to git
 * BEFORE it measures anything, and fails loudly with the ignore rule if it is not. The fixture was
 * renamed to `.scratch`, which no rule matches.
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);

const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const histSrc = readSource('../shared/providers/video/comfyuiHistory.mjs');
const localSrc = readSource('../shared/providers/video/comfyuiLocal.mjs');

const hist = await import('../shared/providers/video/comfyuiHistory.mjs');
const { generate } = await import('../shared/providers/video/comfyuiLocal.mjs');
const { isPermanentCode } = await import('../backend/scripts/handlers/generateVideo.mjs');

const { failureIsDeterministic } = hist;

/**
 * Rebuild the classifier from the MODULE'S OWN SOURCE so the mutation controls below can attack the
 * real thing rather than a copy of it — the rule this lane has now filed four times. Every piece is
 * sliced out of the file: the two constants, the module's own `isObj`, and the function itself.
 */
const sliceConst = (src, name) => {
  const start = src.indexOf(`const ${name} = `);
  if (start < 0) return null;
  const end = src.indexOf(';', start);
  return end < 0 ? null : src.slice(start, end + 1);
};
const sliceFn = (src, name) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const end = src.indexOf('\n}\n', start);
  return end < 0 ? null : src.slice(start, end + 2);
};
const buildClassifier = (src) => {
  const parts = [
    sliceConst(src, 'TRANSIENT_MESSAGE'),
    sliceConst(src, 'DETERMINISTIC_TYPES'),
    sliceConst(src, 'isObj'),
    sliceFn(src, 'failureIsDeterministic'),
  ];
  if (parts.some((p) => p === null)) return null;
  // eslint-disable-next-line no-new-func
  return new Function(`${parts.join('\n')}\nreturn failureIsDeterministic;`)();
};

// ── fixtures: one per failure shape ─────────────────────────────────────────
const fail = (o) => ({
  kind: 'execution_error', interrupted: false, nodeId: 9, nodeType: 'VHS_VideoCombine',
  exceptionType: '', exceptionMessage: '', ...o,
});
const OOM = fail({ exceptionType: 'torch.OutOfMemoryError', exceptionMessage: 'CUDA out of memory. Tried to allocate 512.00 MiB' });
const VALUE = fail({ exceptionType: 'ValueError', exceptionMessage: 'height must be divisible by 32' });
const MISSING = fail({ exceptionType: 'FileNotFoundError', exceptionMessage: "No such file: 'minimax_h3_video_vae_fp16.safetensors'" });
const UNKNOWN = fail({ exceptionType: 'SomeVendorError', exceptionMessage: 'the node said no' });
const NOTYPE = fail({ exceptionType: '', exceptionMessage: '' });
const INTERRUPTED = fail({ kind: 'execution_interrupted', interrupted: true, exceptionType: 'ValueError', exceptionMessage: 'interrupted' });
// The nastiest shape: a node that WRAPS the OOM in a deterministic type. A type-only classifier
// calls this permanent and throws away a job that would have succeeded.
const WRAPPED_OOM = fail({ exceptionType: 'ValueError', exceptionMessage: 'failed to allocate: CUDA out of memory' });

const TMP = `${process.env.TEMP || 'C:/tmp'}`.replace(/\\/g, '/');
// The graph shape round 18 uses: node 1 carries a `text` input so the prompt binding resolves, and
// node 9 stands in for the saver. A fixture that cannot reach the code path under test is the
// round-20 defect ("the fixture never exercised the path it was written to test"), and this one
// failed that way on the probe's first run — E_NO_INPUT instead of E_GRAPH_FAILED.
const GRAPH = {
  1: { class_type: 'CLIPTextEncode', inputs: { text: 'template placeholder' } },
  9: { class_type: 'VHS_VideoCombine', inputs: {} },
};
const graphPath = `${TMP}/r25-graph.json`;
await import('node:fs').then((fs) => fs.writeFileSync(graphPath, JSON.stringify(GRAPH)));
const REQ = { prompt: 'a swan crossing still water at dawn' };
const env = { SWAN_COMFYUI_WORKFLOW: graphPath, SWAN_COMFYUI_NODE_PROMPT: '1' };

/** A fake ComfyUI whose history entry is whatever the caller wants it to be. */
const comfy = (entry) => async (url) => {
  const u = String(url);
  if (u.endsWith('/prompt')) return { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
  if (u.includes('/history/')) return { ok: true, status: 200, json: async () => ({ 'pid-1': entry }) };
  if (u.includes('/view')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('x'.repeat(60000)) };
  return { ok: true, status: 200 };
};
const erroredEntry = (failure) => ({
  outputs: {},
  status: { status_str: 'error', completed: false, messages: [['execution_error', {
    node_id: failure.nodeId, node_type: failure.nodeType,
    exception_type: failure.exceptionType, exception_message: failure.exceptionMessage,
  }]] },
});
/** Run the adapter and return the thrown error (never throws). */
const runErr = async (entry) => {
  try {
    await generate(REQ, { env, fetchImpl: comfy(entry), outPath: `${TMP}/r25.mp4`, sleep: async () => {}, timeoutMs: 5000 });
    return null;
  } catch (e) { return e; }
};

async function main() {
  console.log('HOSTILE PROBE — ROUND 25: which graph failures are worth another full GPU render?\n');

  // ══ A. the classifier, as a pure function ═════════════════════════════════
  section('A. failureIsDeterministic() — the decision, in isolation');
  check('A1. a CUDA out-of-memory failure is NOT deterministic',
    failureIsDeterministic(OOM) === false,
    '-> false. OOM is the canonical E_GRAPH_FAILED in this lane (round 18\'s own fixture) and it is '
    + 'a fact about the MOMENT: another process may release VRAM, so a retry can genuinely succeed. '
    + 'This single check is why E_GRAPH_FAILED cannot simply be added to the runner\'s set.');
  check('A2. a ValueError about the graph IS deterministic',
    failureIsDeterministic(VALUE) === true,
    '-> true. `height must be divisible by 32` is a fact about the REQUEST: the same graph raises it '
    + 'identically on every attempt, so each retry is a full render spent re-asking a settled question.');
  check('A3. a missing model file IS deterministic',
    failureIsDeterministic(MISSING) === true,
    '-> true. Nothing about the moment changes whether the file exists.');
  check('A4. an UNRECOGNISED exception type is NOT deterministic — the safe direction',
    failureIsDeterministic(UNKNOWN) === false && failureIsDeterministic(NOTYPE) === false,
    '-> false and false. The two errors are not symmetric: a wrong "retryable" costs GPU time, a '
    + 'wrong "permanent" throws away a job that would have succeeded. So the default is retryable '
    + 'and the type list is closed, which means it can only be wrong in the cheap direction.');
  check('A5. an INTERRUPTED run is NOT deterministic',
    failureIsDeterministic(INTERRUPTED) === false,
    '-> false, deliberately. An interruption is an action taken by somebody ELSE, not a property of '
    + 'the graph — the same bytes succeed once whoever cancelled stops cancelling. Calling it '
    + 'permanent would block the legitimate "cancel to free the GPU, retry later".');
  check('A6. a transient marker WINS over a deterministic type',
    failureIsDeterministic(WRAPPED_OOM) === false,
    '-> false. A node that wraps `CUDA out of memory` in a ValueError must not become permanent by '
    + 'its wrapper. A type-only classifier calls this permanent and loses the job — this is the '
    + 'sharpest single check in the round, and the control C2 below removes the rule and requires '
    + 'this check to fail.');

  // ── A7. the list is closed AND total, read from the source so it cannot drift ─────────────
  const typesSrc = sliceConst(histSrc, 'DETERMINISTIC_TYPES');
  const members = typesSrc ? [...typesSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  const allDeterministic = members.length > 0
    && members.every((t) => failureIsDeterministic(fail({ exceptionType: t, exceptionMessage: 'nope' })) === true);
  check('A7. every member of the closed type list classifies deterministic',
    allDeterministic,
    `-> ${members.length} type(s) read out of the module's own source: ${members.join(', ')}. `
    + 'Deriving the list from the source rather than writing it out here means a type added to the '
    + 'set is covered by this check without anyone remembering to update it.');
  // The marker list is read from the source too, and the cross-product is taken against it. A
  // hand-picked (type, message) pair proves one case; this proves the RULE for every pair.
  const transientSrc = sliceConst(histSrc, 'TRANSIENT_MESSAGE');
  const markers = transientSrc ? transientSrc.slice(transientSrc.indexOf('/') + 1, transientSrc.lastIndexOf('/')) : '';
  const markerRx = markers ? new RegExp(markers, 'i') : null;
  const SAMPLES = ['CUDA out of memory', 'OutOfMemoryError', 'CUDA_ERROR_OUT_OF_MEMORY',
    'allocation of 512.00 MiB failed', 'CUDA error: out of memory'];
  const samplesRecognised = Boolean(markerRx) && SAMPLES.every((s) => markerRx.test(s));
  const crossProduct = members.length > 0 && SAMPLES.every((s) =>
    members.every((t) => failureIsDeterministic(fail({ exceptionType: t, exceptionMessage: s })) === false));
  check('A8. a transient message defeats EVERY deterministic type, not just the pair we picked',
    samplesRecognised && crossProduct,
    `-> ${markers ? 'the marker list was read from the module' : 'THE MARKER LIST COULD NOT BE READ'} `
    + `and recognises all ${SAMPLES.length} sample(s); the full cross-product against all `
    + `${members.length} deterministic type(s) is retryable. Deriving both sides from the source means `
    + 'a marker or a type added later is covered without anyone remembering to update this check.');

  // ══ B. the adapter, per instance ══════════════════════════════════════════
  section('B. the ADAPTER marks permanence per instance — the code itself does not move');
  const oomErr = await runErr(erroredEntry(OOM));
  const valErr = await runErr(erroredEntry(VALUE));
  check('B1. an OOM graph failure is thrown RETRYABLE',
    oomErr?.code === 'E_GRAPH_FAILED' && oomErr.permanent !== true,
    `-> ${oomErr?.code}, permanent=${oomErr?.permanent}. The job keeps its attempts, which is what `
    + 'makes a transient GPU fault survivable.');
  check('B2. a deterministic graph failure is thrown PERMANENT',
    valErr?.code === 'E_GRAPH_FAILED' && valErr.permanent === true,
    `-> ${valErr?.code}, permanent=${valErr?.permanent}. The job stops after ONE render instead of `
    + 'three, which is the cost the round-19 disclosure named.');
  check('B3. the ERROR CODE is unchanged in both cases — no contract change',
    oomErr?.code === valErr?.code && oomErr?.code === 'E_GRAPH_FAILED',
    '-> both E_GRAPH_FAILED. Permanence is carried by `permanent`, which the public envelope already '
    + 'projects as `retryable`; no new code enters the vocabulary and no status mapping moves. That '
    + 'is why this fix needed no change to wire.mjs or the round-7 coverage sweep.');
  check('B4. the message still quotes the node\'s own exception verbatim in both cases',
    /out of memory/.test(oomErr?.message || '') && /divisible by 32/.test(valErr?.message || ''),
    `-> OOM: ${JSON.stringify((oomErr?.message || '').slice(0, 80))} | ValueError: `
    + `${JSON.stringify((valErr?.message || '').slice(0, 80))}. Round 18\'s finding was a message `
    + 'that blamed the saver node; classifying the failure must not cost the reader the cause.');

  // ══ C. the runner's set, and why the two mechanisms compose ═══════════════
  section('C. the runner\'s set — one code closed, the other deliberately still absent');
  check('C1. E_NO_OUTPUT is now PERMANENT at the code level',
    isPermanentCode('E_NO_OUTPUT') === true,
    '-> true. It is NOT mixed: it is reached only after `terminalState` says the graph FINISHED, so '
    + 'the same bytes reproduce it exactly. This is the half round 19 left open that could be closed '
    + 'by the set.');
  check('C2. E_GRAPH_FAILED is still NOT in the set — and that absence is now load-bearing',
    isPermanentCode('E_GRAPH_FAILED') === false,
    '-> false, deliberately. Adding it would make `CUDA out of memory` permanent. Its absence is no '
    + 'longer a disclosure; it is the reason the per-instance mechanism exists, and round 18\'s '
    + 'section E now fails if someone adds it to "finish the job".');
  const markFn = sliceFn(readSource('../backend/scripts/handlers/generateVideo.mjs'), 'markPermanence');
  check('C3. markPermanence SETS but never CLEARS `permanent`, so the adapter\'s flag survives it',
    Boolean(markFn) && /permanent\s*=\s*true/.test(markFn) && !/permanent\s*=\s*false/.test(markFn),
    `-> ${JSON.stringify((markFn || '').replace(/\s+/g, ' ').slice(0, 96))}. If the runner cleared the `
    + 'flag for codes it does not know, the adapter\'s classification would be silently discarded and '
    + 'this whole round would be inert. Asserted from the runner\'s source, not assumed.');

  // ══ D. controls — re-introduce each mechanism and require a failure ═══════
  section('D. mutation controls — remove each rule and require the check above to fail');
  const shipped = buildClassifier(histSrc);
  check('D0. CONTROL: the rebuilt classifier agrees with the shipped one (so D1–D3 test the real thing)',
    Boolean(shipped) && [OOM, VALUE, MISSING, UNKNOWN, NOTYPE, INTERRUPTED, WRAPPED_OOM]
      .every((f) => shipped(f) === failureIsDeterministic(f)),
    '-> the mutation controls below run a classifier rebuilt from the module\'s own source, so this '
    + 'check proves the rebuild is faithful before any of them is believed. A control against a '
    + 'different function than the shipped one tests nothing.');

  // D1. "A graph failed, so it is permanent" — the one-line fix this round exists to REJECT. It is
  // modelled as making the classifier's verdict unconditional, which is what adding E_GRAPH_FAILED to
  // PERMANENT_CODES amounts to. Note the first draft of this control removed the transient-marker
  // line instead, and it did NOT fire — because OOM's exception TYPE is not in the deterministic list
  // either, so two rules were holding OOM retryable and removing one of them changed nothing. That is
  // the "a control that cannot fail is not a control" trap, and it caught this probe's author.
  // D1. HOW MANY RULES HOLD OOM RETRYABLE? The first two drafts of this control removed one rule at a
  // time and NEITHER fired — because OOM's exception TYPE is not in the deterministic list either, so
  // the marker rule and the type-list gate each independently keep it retryable. A control that
  // cannot fire is not a control, and this is the third time in this lane that a mutation control
  // failed on its own first run for exactly that reason. So the check asserts the redundancy
  // directly: neither rule alone is load-bearing, both together are, and removing both flips it.
  const noMarkerOnly = histSrc.replace(
    /if \(TRANSIENT_MESSAGE\.test\(msg\) \|\| TRANSIENT_MESSAGE\.test\(type\)\) return false;/,
    'if (false) return false;');
  const noTypeGateOnly = histSrc.replace('return DETERMINISTIC_TYPES.has(type);', 'return true;');
  const neitherRule = noMarkerOnly.replace('return DETERMINISTIC_TYPES.has(type);', 'return true;');
  const bNoMarker = buildClassifier(noMarkerOnly);
  const bNoGate = buildClassifier(noTypeGateOnly);
  const bNeither = buildClassifier(neitherRule);
  check('D1. CONTROL: OOM is held retryable by TWO independent rules, and only removing both flips it',
    Boolean(bNoMarker) && Boolean(bNoGate) && Boolean(bNeither)
      && bNoMarker(OOM) === false && bNoGate(OOM) === false && bNeither(OOM) === true,
    '-> marker rule removed: OOM still retryable. Type-list gate removed: OOM still retryable. BOTH '
    + 'removed: OOM becomes PERMANENT, so A1 and B1 can fail. The redundancy is the finding — a '
    + 'single-line "fix" cannot turn a transient GPU fault into a lost job, and this control says so '
    + 'by measuring it rather than by asserting it.');

  // D4. the blanket fix the round REJECTS lives in the ADAPTER, not the classifier — so it needs its
  // own control. Asserted against the adapter's source: the assignment must be guarded, and removing
  // the guard must be detectable.
  const guard = 'if (failureIsDeterministic(state.failure)) err.permanent = true;';
  const unguarded = localSrc.replace(guard, 'err.permanent = true;');
  check('D4. CONTROL: the blanket "every graph failure is permanent" fix is DETECTED in the adapter',
    localSrc.includes(guard) && unguarded !== localSrc && !unguarded.includes(guard),
    '-> the adapter\'s assignment is guarded by the classifier, and removing that guard is a '
    + 'source-detectable mutation. This is the one-line fix this round exists to reject — adding '
    + 'E_GRAPH_FAILED to PERMANENT_CODES, or dropping this guard, are the same act — and it is '
    + 'asserted where it would actually be made rather than only in the classifier.');

  const noMarkerSrc = histSrc.replace(
    /if \(TRANSIENT_MESSAGE\.test\(msg\) \|\| TRANSIENT_MESSAGE\.test\(type\)\) return false;/,
    'if (false) return false;');
  const noMarker = buildClassifier(noMarkerSrc);
  check('D2. CONTROL: removing the marker-beats-type precedence is DETECTED',
    Boolean(noMarker) && noMarkerSrc !== histSrc && noMarker(WRAPPED_OOM) === true,
    '-> with the precedence gone, a ValueError wrapping an OOM becomes PERMANENT — the job is lost. '
    + 'A6 asserts the shipped code does not do this; this control proves A6 can fail.');

  // D3. The realistic way to lose the conservative default: keep a closed list but stop requiring the
  // type to be IN it — "any named exception is a graph fault". UNKNOWN then becomes permanent, which
  // is the direction this round refuses to guess in.
  const openSrc = histSrc.replace('return DETERMINISTIC_TYPES.has(type);', 'return Boolean(type);');
  const openList = buildClassifier(openSrc);
  check('D3. CONTROL: opening the closed type list is DETECTED',
    Boolean(openList) && openSrc !== histSrc && openList(UNKNOWN) === true,
    '-> with the list opened to any named type, `SomeVendorError` classifies PERMANENT, so A4 can '
    + 'fail. Assuming an unrecognised failure is the graph\'s fault lets a vendor or ComfyUI quirk '
    + 'cost jobs, which is the direction this round refuses to guess in.');

  // ── E. the FILE COUNT — the last derived number this document states and nothing compares ─────
  // Round 23 made the DEFECT TOTAL arithmetic (its E3). Round 24 made the MODULE COUNT arithmetic
  // (its A2). This is the third number of that shape and it was still pure prose: the handover
  // paragraph states "**N files** (X modified, Y new)" and no gate read it. Git derives 80 (9
  // modified, 71 new) against the documented base; the document said 63 (9 modified, 54 new).
  // Rounds 18–24 added sixteen files and never moved the number — which is precisely the drift
  // round 24's own commit message records the first four occurrences of this class being "fixed" by.
  //
  // The base is READ OUT OF THE DOCUMENT, so a wrong base fails rather than silently comparing
  // something else. The set is restricted to the lane's own directories, and that restriction is
  // load-bearing: this worktree is a SPARSE checkout, so an unfiltered diff against the base
  // reports ~13,000 paths as deleted that are simply not checked out.
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const laneDirs = [
    'media-api/',
    'shared/providers/video/',
    'backend/scripts/handlers/',
    'docs/ai-workflow/blueprints/swan-media-api-2026-09-18/',
  ];
  const docSrc = readSource('../docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md');
  const baseSha = (docSrc.match(/base = ([0-9a-f]{7,40})/) || [])[1];
  // `media-api/` is declared as a lane DIRECTORY but the paths inside it are counted as FILE names.
  // An explicit list, not a fourth prefix: a prefix allowlist for a directory that already matches
  // everything would exempt any future `media-api/*.tmp` by default, which is the shape of hole
  // R3-3 had to be narrowed for. This list is empty by default and grows only on purpose.
  const untrackedFileAllowlist = [
    // NONE. If a scratch file must be exempt from the stale-count derivation, it goes here by name.
  ];
  // The untracked REPORT deliberately uses `inLane` alone — no allowlist, no narrowing. It is the
  // one place whose job is to name everything in a lane directory that `git diff` cannot see.
  const inLane = (p) => laneDirs.some((d) => p.startsWith(d));
  // ── R3-5: THE DERIVATION MUST NOT COUNT TRANSIENT SCRATCH ────────────────────
  //
  // E1 originally folded `git status --porcelain -uall` untracked files into the "added" set. The
  // intent was right — a lane file left untracked is invisible to `git diff` and was silently
  // dropped from the patch twice, which is a real defect this lane has fixed twice. But measured
  // 2026-09-21 (round 3, R3-5), the consequence is that **any** untracked file an agent happens to
  // leave in a lane directory changes the number and turns this gate RED without a line of the
  // lane's code changing. With two scratch files present the probe derived 84 and failed; with them
  // moved out it derived 82 and passed, against the document's own 82.
  //
  // That is worse than a false positive. A gate that any concurrent worker can redden by existing
  // is a gate that will eventually be "fixed" by deleting someone's evidence — and the tempting
  // repair is to edit the DOCUMENT's count, which would have been a fabricated correction here: the
  // document was right and the derivation was wrong.
  //
  // So the change set is now derived from TRACKED state only, which makes it a property of the
  // commit rather than of the moment. Untracked lane files are still REPORTED — they are the
  // original defect and must stay visible — but they are reported as a separate fact with their own
  // names, so a reader can tell "the lane has an uncommitted file" from "the document's count is
  // wrong". `tracked` is what E1 compares; `untracked` is what a human acts on.
  // ── WHY THE DERIVATION CARRIES ITS OWN FAILURE REASON ───────────────────────────────────────
  // This function used to end in `catch { return null; }`, and E1 then reported the null as "git or
  // the base is unavailable". On 2026-09-21 that sentence was FALSE in the way this lane files: the
  // base commit was present (`git cat-file -t 2b3e7a62a` -> `commit`) and the real cause was that the
  // repository's object store is INCOMPLETE — `git fsck` reports 37 missing trees, 4 missing commits
  // and 218 missing blobs, so `git diff <base>` dies on `fatal: unable to read 08db7607a9...` before
  // it produces a line. A diagnostic that names a plausible cause it never checked is the same defect
  // as `default:` denying its own code (R3-1): the reader is told the base is missing and goes looking
  // for the wrong thing. So the failure reason is now CAPTURED and REPORTED VERBATIM.
  //
  // The null is still the right RETURN — an underivable count must fail, not pass — but it is no
  // longer an unexplained one. Note what is deliberately NOT done here: the probe does not attempt a
  // fallback derivation (e.g. untracked-only, or index-vs-worktree) to manufacture a green E1. A
  // number recovered by a different question is not the number the document claims.
  const gitRun = (args) => execFileSync('git', args, {
    cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', maxBuffer: 1 << 28,
  });
  const deriveChangeSet = () => {
    if (!baseSha) return null;
    try {
      // TRACKED ONLY. `diff --name-status <base>` reports the committed tree against the base and
      // says nothing about scratch, so this number is stable across concurrent sessions.
      const rows = gitRun(['diff', '--name-status', baseSha]).split('\n').filter(Boolean)
        .map((l) => { const p = l.split('\t'); return { s: p[0][0], f: p[p.length - 1] }; })
        .filter((r) => inLane(r.f));
      // Reported, never folded into `total`. A lane file that is untracked IS a defect the patch
      // generator drops — the diagnosis just belongs to the reader, not to this arithmetic.
      const untracked = gitRun(['status', '--porcelain', '-uall']).split('\n')
        .filter((l) => l.startsWith('??')).map((l) => l.slice(3).trim()).filter(inLane);
      const added = new Set(rows.filter((r) => r.s === 'A').map((r) => r.f));
      const modified = new Set(rows.filter((r) => r.s === 'M').map((r) => r.f));
      return {
        total: new Set([...added, ...modified]).size,
        mod: modified.size,
        add: added.size,
        untracked,
      };
    } catch (e) {
      // The reason is attached to the null rather than discarded. `e.stderr` is where git puts
      // `fatal: unable to read <sha>`; `e.message` covers a missing binary or a bad cwd.
      const stderr = String((e && e.stderr) || '').split('\n')
        .filter((l) => l.trim() && !/^warning: in the working copy/.test(l))
        .join(' | ')
        .slice(0, 300);
      return {
        derivable: false,
        reason: stderr || String((e && e.message) || e).slice(0, 300),
        baseType: (() => { try { return gitRun(['cat-file', '-t', baseSha]).trim(); } catch { return null; } })(),
      };
    }
  };
  const changeSet = deriveChangeSet();
  // NARROWED to the LIVE claims, and the narrowing is the whole difficulty. The document carries
  // eight bolded file counts; five are historical — round 11's 23 and 37, a later regeneration's 35,
  // and two quotations of round 20's 58 — and a check that fires on those is the trap round 23's E4
  // already had to be narrowed for. A claim about the CURRENT change set says so, in one of exactly
  // two ways: "The patch is now **N files**", or a total paired with the (modified, new) split.
  // Quoted script output (`#   63 files changed`, `-> 63/63`) is not matched either: it records a
  // run, not a claim.
  // ── R3-6: THE NARROWING LET A HISTORICAL RECEIPT THROUGH, THE CLASS THIS FILE KEEPS FILING ──
  //
  // The second pattern below was `\*\*(\d+) files[^(]{0,60}?\((\d+) modified, (\d+) new\)`. Its
  // "not-a-claim" guard, `[^(]{0,60}?`, excludes `(` but NOT a newline — and a NEGATED character
  // class matches line breaks like any other character. So the pattern ran from the HANDOVER receipt
  // (`Handover is a **patch** … **82 files**` on line 1500) straight across the newline and glued it
  // to the pair on line 1501, `(9 modified, 73 new)`.
  //
  // Measured 2026-09-21 (round 3): `liveTotals` came back `[88, 88, 82, 88]` against a derived 88, so
  // E1 failed and named THE DOCUMENT. The document was RIGHT — the live claim is 88 in all three
  // places — and the probe was wrong. The 82 is a historical receipt that the paragraph immediately
  // below line 1503 already labels as one (round 27's F6: "THAT PARAGRAPH IS A HISTORICAL RECEIPT,
  // AND ROUND 27 LABELS IT AS ONE").
  //
  // This is the same shape as round 23's E4 and this file's own E1 narrowing: a scanner whose
  // exclusion lets through the very thing it was narrowed to exclude. Ninth appearance of the
  // count-drift class, fourth of the "narrowing that does not narrow" subclass.
  //
  // THE FIX IS LINE-SCOPED, not another regex tweak, because the fact being asserted is a property
  // of a LINE: a live claim states its total AND its split together. Measured across the document,
  // exactly one line carries both (line 384, `88 files (9 modified, 79 new)`); every other `**N
  // files**` — 23, 35, 58, 63, 82 — sits on a line with no pair and is a quotation or a receipt. A
  // pattern that spans lines cannot express "on the same line"; a per-line scan states it directly.
  const CLAIM_LINE = /^\s*.*?\*\*(\d+) files\*\*(?:(?!\n)[^(])*?\((\d+) modified, (\d+) new\)/;
  const liveTotals = [];
  const statedPairs = [];
  for (const line of docSrc.split(/\r?\n/)) {
    if (!/\*\*\d+ files\*\*/.test(line)) continue;
    const m = line.match(CLAIM_LINE);
    // A total with no split on its own line is not a live claim and is not read. Quoted history and
    // labelled receipts are excluded by that fact alone — the same reasoning round 23's E4 used when
    // it required a table ROW rather than a bare name, which prose cannot satisfy.
    if (!m) continue;
    liveTotals.push(Number(m[1]));
    statedPairs.push({ mod: Number(m[2]), add: Number(m[3]) });
  }
  // The `The patch is now **N files**` form is kept as a separate reading because it is the one
  // phrasing this document uses for a LIVE total even when the split is stated elsewhere.
  liveTotals.push(...[...docSrc.matchAll(/The patch is now \*\*(\d+) files/g)].map((m) => Number(m[1])));
  // `Boolean(changeSet)` is NOT used as the derivability test: the failure branch returns an object
  // too (so the reason travels with it), and a plain truthiness test would then treat
  // `changeSet.total === undefined` as a real number and compare `undefined === undefined`, which is
  // true — a green E1 produced by never having derived anything. That is the same tautology shape as
  // a reachability predicate satisfied by a sibling (R3-2), so the predicate is explicit.
  const derivedOk = (cs) => Boolean(cs) && cs.derivable !== false && typeof cs.total === 'number';
  const claimsAgree = (totals, pairs) => derivedOk(changeSet) && totals.length >= 1
    && totals.every((t) => t === changeSet.total)
    && pairs.length >= 1
    && pairs.every((p) => p.mod === changeSet.mod && p.add === changeSet.add);
  check('E1. every LIVE file count equals the change set git derives against the documented base',
    claimsAgree(liveTotals, statedPairs),
    `-> git derives ${derivedOk(changeSet) ? `${changeSet.total} TRACKED file(s) — ${changeSet.mod} modified, ${changeSet.add} new` : 'NOTHING (a failure, not a pass)'} against base ${baseSha || '(unreadable)'}; the document states ${liveTotals.length ? liveTotals.join(' and ') : '(none)'} live total(s) and ${statedPairs.length ? statedPairs.map((p) => `${p.mod} modified / ${p.add} new`).join(' and ') : '(none)'}. A count asserted in prose and derived nowhere is how 63 outlived the sixteen files rounds 18–24 added.`
    // WHY IT COULD NOT BE DERIVED, QUOTED FROM GIT. The earlier text asserted "git or the base is
    // unavailable" without checking either; on 2026-09-21 the base was present and the store was not.
    //
    // The two cases are now stated SEPARATELY, because the same sentence was wrong in the opposite
    // direction on the next run: when the base really is absent (`fatal: not a git repository`), the
    // fixed text still said "so this is NOT 'the base is missing'", which is the same defect one
    // layer out — a diagnostic that asserts a fact it read from the previous failure. The branch is
    // on `baseType`, which is measured in the same call as the reason.
    + (!derivedOk(changeSet) && changeSet && changeSet.reason
      ? ` UNDERLYING GIT FAILURE (verbatim): "${changeSet.reason}". The base commit object is `
        + `${changeSet.baseType ? `PRESENT (\`git cat-file -t\` -> \`${changeSet.baseType}\`)` : 'ABSENT'}. `
        + (changeSet.baseType
          ? 'Since the base IS present, this is NOT "the base is missing" — read the quoted line before '
            + 'concluding anything about the document. An incomplete object store (missing trees/blobs) '
            + 'fails this check the same way a wrong number does, and only the reason tells them apart.'
          : 'Since the base is ABSENT, the repository itself could not be read at all — which is a '
            + 'different failure from a wrong count, and is checked before the document is blamed. A '
            + 'concurrent repack or a lost worktree registration both read this way.')
      : '')
    // R3-5: untracked lane files are REPORTED here and deliberately NOT counted above. They were
    // folded into the total until round 3 measured that any agent's scratch file turns this gate
    // red — and the tempting repair is then to edit the document, which would have been a
    // fabricated correction. A lane file left untracked IS a real defect (the patch generator drops
    // it), so it is named rather than hidden — it just does not belong in this arithmetic.
    + (derivedOk(changeSet) && changeSet.untracked.length
      ? ` NOTE (R3-5): ${changeSet.untracked.length} UNTRACKED lane file(s) are present and NOT counted `
        + `in the derived total — they are invisible to \`git diff\` and would be dropped from a patch: `
        + `${changeSet.untracked.map((f) => `\`${f}\``).join(', ')}. Stage or remove them; do not change `
        + 'the document\'s count to match them.'
      : ''));

  // E2. CONTROL. A check that cannot fail is not a check: bump a live total and require E1's own
  // predicate to reject it.
  //
  // ── THIS CONTROL WAS READING A DIFFERENT SET THAN E1 ──────────────────────────────────────────
  // Measured 2026-09-21: `bumpedTotals` came back with FIVE entries against E1's TWO, so
  // `bumpedTotals.length === liveTotals.length` was false and E2 failed — while the mutation it
  // describes had worked perfectly. The cause is that it re-implemented the reader with the OLD
  // multi-line regexes instead of the line-scoped `CLAIM_LINE` that E1 was just narrowed to. A
  // control that reads a superset containing the historical `82 files` receipt cannot prove
  // anything about E1, which deliberately does not read it: the two were not asking the same
  // question. This is round 23's E4 shape ("a scanner whose exclusion lets through the very thing
  // it was narrowed to exclude") appearing INSIDE the control written to prove E1 can fail — the
  // tenth appearance of this class and the fifth of the narrowing subclass.
  //
  // The fix is structural, not another regex tweak: the mutated document is fed through THE SAME
  // reader, extracted into a function, so the two cannot diverge again. If someone narrows E1's
  // reader later, this control follows it automatically — which is the property a control needs.
  const readLiveClaims = (src) => {
    const totals = [];
    const pairs = [];
    for (const line of src.split(/\r?\n/)) {
      if (!/\*\*\d+ files\*\*/.test(line)) continue;
      const m = line.match(CLAIM_LINE);
      if (!m) continue;
      totals.push(Number(m[1]));
      pairs.push({ mod: Number(m[2]), add: Number(m[3]) });
    }
    totals.push(...[...src.matchAll(/The patch is now \*\*(\d+) files/g)].map((m) => Number(m[1])));
    return { totals, pairs };
  };
  // SETUP ASSERTION: the reader above must reproduce E1's own reading of the unmutated document.
  // Without this, a divergence is invisible and E2 quietly tests nothing — which is exactly what
  // happened. Re-checked on every run rather than argued once.
  const reread = readLiveClaims(docSrc);
  const readerAgrees =
    reread.totals.length === liveTotals.length
    && reread.totals.every((t, i) => t === liveTotals[i])
    && reread.pairs.length === statedPairs.length
    && reread.pairs.every((p, i) => p.mod === statedPairs[i].mod && p.add === statedPairs[i].add);

  const bumped = docSrc.replace(/The patch is now \*\*(\d+) files/,
    (m, n) => `The patch is now **${Number(n) + 1} files`);
  const bumpedClaims = readLiveClaims(bumped);
  const bumpedTotals = bumpedClaims.totals;
  check('E2. CONTROL: incrementing a LIVE stated file count is DETECTED',
    readerAgrees && bumped !== docSrc && bumpedTotals.length === liveTotals.length
      && !claimsAgree(bumpedTotals, bumpedClaims.pairs),
    !readerAgrees
      ? `-> THE CONTROL'S READER DISAGREES WITH E1'S OWN READING, so it cannot prove anything about `
        + `E1 and fails here instead of passing vacuously. E1 read [${liveTotals.join(', ')}] with `
        + `[${statedPairs.map((p) => `${p.mod}/${p.add}`).join(', ')}]; this re-read got `
        + `[${reread.totals.join(', ')}] with [${reread.pairs.map((p) => `${p.mod}/${p.add}`).join(', ')}]. `
        + 'Both must be the same scan of the same document. The earlier version of this control '
        + 're-implemented the reader with the pre-narrowing multi-line regexes and therefore counted '
        + 'the historical `82 files` receipt that E1 deliberately excludes — five entries against '
        + 'E1\'s two.'
      : `-> the mutated document states ${bumpedTotals.join(', ') || '(none)'} live against ${derivedOk(changeSet) ? changeSet.total : '?'} derived, so E1 can fail. Without this, E1 would be satisfiable by the sentence agreeing with itself — the shape of vacuity this lane has filed four times.`);

  // ── E3. CONTROL for R3-5: an UNTRACKED lane file must NOT change the derived count ──
  //
  // The finding was that folding untracked files into the total made this gate red for any agent's
  // scratch — 84 derived against the document's 82, measured 2026-09-21 — and the tempting repair
  // was to edit the DOCUMENT, which would have been a fabricated correction of a number that was
  // right. The fix derives from tracked state only.
  //
  // This control asserts the fix from BOTH sides, because either alone is satisfiable vacuously:
  //   (a) a REAL untracked file placed in a lane directory does not move `changeSet.total`, and
  //   (b) that same file is still REPORTED by name, so the original untracked-file defect stays
  //       visible rather than being silenced by the fix.
  // A fix that made E1 ignore untracked files entirely would satisfy (a) and fail (b) — and (b) is
  // the entire reason untracked files were in the derivation to begin with.
  //
  // ── THE FIXTURE NAME IS PART OF THE CONTROL, AND THIS CONTROL FOUND THAT OUT THE HARD WAY ────
  // The first version of this check used `media-api/.r35-untracked-control.tmp` as its fixture. It
  // failed half (b) with an unchanged total — looking exactly like the R3-5 fix had over-reached
  // and silenced the untracked report. It had not. `.gitignore:49` is `*.tmp`, so `git status
  // --porcelain` never listed the fixture at all: the control was asserting something about a file
  // git could not see, i.e. it was testing NOTHING while appearing to test the fix. Measured with
  // `git check-ignore -v media-api/.r35-untracked-control.tmp` -> `.gitignore:49:*.tmp`.
  // So the check now VERIFIES ITS OWN FIXTURE IS VISIBLE TO GIT before it measures anything. A
  // control whose setup is invisible is the same shape as `default:` denying its own code (R3-1)
  // and as a reachability predicate satisfied by a sibling (R3-2) — this lane's recurring defect,
  // appearing here inside the control written to catch it.
  // ── THE CLEANUP IS ASSERTED, NOT ASSUMED — BECAUSE THE FIRST VERSION LEAKED ──────────────
  // A `finally { try { unlinkSync(abs); } catch {} }` was believed to be sufficient. It is not:
  // observed on the 2026-09-21 gate run, `media-api/.r35-untracked-control.scratch` was left
  // behind in the working tree after this probe exited. A `finally` runs on normal exit and on
  // throw, but NOT when the process is killed — and a gate suite that runs this probe alongside
  // 32 others is exactly where a kill happens. The swallow (`catch { /* already gone */ }`) then
  // hid it: the comment asserted a cleanup the code had not performed, which is this lane's
  // recurring defect for the SIXTH time, now in the cleanup path.
  //
  // A self-creating check that can leave litter in the tree it is auditing is also a check that
  // can fail its own neighbours on a re-run. So `leftBehind` is measured after the unlink and is
  // asserted below, and the probe deletes the file it names rather than trusting that it did.
  const untrackedProbe = (() => {
    // ── R4-2 SECOND HALF: THE FIXTURE NAME IS UNIQUE PER INVOCATION ─────────────────────────
    // `wx` alone (above) turns a clobber into a refusal, which is the right direction but leaves a
    // control that can be PERMANENTLY REFUSING because of a leftover: observed live, when a run
    // died on EPERM before its cleanup and every subsequent run then reported "a file already
    // exists". A control that refuses forever because of someone else's stale file is a control
    // that stops testing, quietly, which is the failure this file keeps having to be repaired for.
    //
    // A unique name removes the class rather than handling it: two concurrent invocations cannot
    // collide, a crashed run cannot block the next, and there is no path for this check to destroy
    // a file it did not author. `process.pid` plus a counter is enough — this is a per-process
    // probe, not a distributed one.
    // ── R4-2 THIRD HALF: THE NAME IS UNIQUE AND SELF-IDENTIFYING ────────────────────────────
    // The prefix here was `.r35-untracked-control-`, which is ALSO the prefix any human or agent
    // reaches for when debugging this check. Observed live: a leftover carrying a DIFFERENT payload
    // (`x`, from a one-off reproduction) and a leftover from an unrelated earlier process were both
    // read as this control's leak, and the probe was "fixed" for a defect it did not have. The
    // measurement that settled it was purging the directory and running the probe twice — 0
    // leftovers, twice. A probe whose litter is indistinguishable from a diagnostician's litter
    // will be misdiagnosed, so the fixture now names its author AND its payload is asserted.
    const rel = `media-api/.r35-untracked-control-${process.pid}-${Date.now()}.scratch`;
    const FIXTURE_BODY = '// R3-5 control fixture — created and removed by this check\n';
    const abs = fileURLToPath(new URL(`../${rel}`, import.meta.url));
    const git = (args) => execFileSync('git', args, {
      cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', maxBuffer: 1 << 28,
    });
    const exists = () => { try { readFileSync(abs); return true; } catch { return false; } };
    let result = null;
    // The file is still created with `wx`: with a unique name it should NOT exist, so `EEXIST` is a
    // genuine anomaly worth refusing on rather than an expected condition to work around.
    let created = false;
    try {
      writeFileSync(abs, '// R3-5 control fixture — created and removed by this check\n', { flag: 'wx' });
      created = true;
      // SETUP ASSERTION. If git ignores this path, the measurement below is meaningless, so we say
      // so and fail instead of reporting a tidy "UNCHANGED" that proves nothing.
      const visible = git(['status', '--porcelain', '-uall', '--', rel]).trim().startsWith('??');
      if (!visible) {
        result = { setupFailed: true, ignoreRule: (() => {
          try { return git(['check-ignore', '-v', rel]).trim(); } catch { return '(no rule matched)'; }
        })() };
      } else {
        const derived = deriveChangeSet();
        // BOTH derivations must be real. `Boolean(changeSet) && derived.total === changeSet.total`
        // would pass when BOTH are failures (undefined === undefined), so the control would report
        // "the untracked file did not move the count" while nothing had been counted at all —
        // a control satisfied by never looking, which is the defect this file exists to catch.
        const bothDerived = derivedOk(changeSet) && derivedOk(derived);
        const totalUnchanged = bothDerived && derived.total === changeSet.total;
        const reported = derivedOk(derived) && derived.untracked.includes(rel);
        result = {
          setupFailed: false,
          totalUnchanged,
          reported,
          total: derivedOk(derived) ? derived.total : null,
          derivationFailed: !bothDerived,
          rel,
        };
      }
    } catch (e) {
      // `wx` refused because the path already exists. That is a REFUSAL, not a measurement, and it
      // must not be reported as "could not create the fixture" — those are different facts and only
      // one of them means somebody else's file is sitting there.
      if (e && e.code === 'EEXIST') return { preexisting: true };
      // ── A FAILURE AFTER CREATION IS NOT A CREATION FAILURE ────────────────────────────────────
      // This used to `return null`, and E3 rendered a null as "COULD NOT CREATE THE FIXTURE" —
      // which was FALSE whenever the real failure was the `git status` call inside the block
      // (observed live: concurrent GitKraken/repack activity made git return
      // `fatal: not a git repository: (NULL)`). The fixture had been created fine and then removed
      // by the `finally` below. Blaming the filesystem sends the reader to the wrong subsystem,
      // which is the same misattribution E1's old "git or the base is unavailable" made.
      //
      // So the two cases are separated by whether the write had already succeeded.
      const stderr = String((e && e.stderr) || '').split('\n')
        .filter((l) => l.trim() && !/^warning: in the working copy/.test(l)).join(' | ').slice(0, 200);
      return {
        threw: true,
        created,
        reason: stderr || String((e && e.message) || e).slice(0, 200),
      };
    } finally {
      // ONLY what this invocation created. An unconditional unlink here would delete a file the
      // check did not author — Astra round 4's R4-2.
      if (created) {
        // PROVENANCE. Before removing anything, confirm the thing at this path is OURS. With a
        // unique name this should always hold; the assertion exists because "the path exists" and
        // "the path holds my fixture" are different facts, and only the second one licenses a
        // delete. If the content is not ours, we must NOT unlink — we report it instead.
        const ours = (() => {
          try { return readFileSync(abs, 'utf8') === FIXTURE_BODY; } catch { return false; }
        })();
        if (!ours) {
          result = { ...result, foreignAtPath: true, rel };
        } else {
          try { unlinkSync(abs); } catch { /* fall through to the verification below */ }
        }
      }
    }
    return { ...result, leftBehind: created && exists() };
  })();
  check('E3. CONTROL: an UNTRACKED lane file is REPORTED but does NOT change the derived count (R3-5)',
    untrackedProbe !== null && !untrackedProbe.threw && !untrackedProbe.preexisting
      && !untrackedProbe.setupFailed && !untrackedProbe.derivationFailed
      && untrackedProbe.totalUnchanged && untrackedProbe.reported && !untrackedProbe.leftBehind
      && !untrackedProbe.foreignAtPath,
    untrackedProbe === null
      ? '-> THE CONTROL RETURNED NOTHING AT ALL, which no branch is supposed to do. Treated as a '
        + 'failure rather than a skip because an unexercised control is not evidence.'
      : untrackedProbe.threw
        ? `-> THE CONTROL THREW, and ${untrackedProbe.created
            ? 'the FIXTURE HAD ALREADY BEEN CREATED — so this is NOT a filesystem failure, and saying '
              + '"could not create the fixture" would send the reader to the wrong subsystem'
            : 'the fixture was never created'}. Cause, quoted: "${untrackedProbe.reason}". A transient `
          + 'git failure (a concurrent repack or an unreadable worktree) fails this control honestly '
          + 'rather than reporting a tidy result it did not measure.'
        : untrackedProbe.preexisting
        ? '-> A FILE ALREADY EXISTS AT THE FIXTURE PATH, so this check REFUSED to run rather than '
          + 'overwrite it. It is created with the `wx` flag for exactly this reason (R4-2): a fixed '
          + 'filename plus an unconditional write would destroy a leftover from a crashed run, or '
          + 'another agent\'s scratch, and a control has to own its path before it mutates it.'
        : untrackedProbe.setupFailed
          ? '-> THE FIXTURE IS INVISIBLE TO GIT, so nothing below it would have been measured. '
            + `It is ignored by \`${untrackedProbe.ignoreRule}\`, which means \`git status --porcelain\` `
            + 'never lists it and the "UNCHANGED" total would have been true for the wrong reason. '
            + 'This is the vacuity the check exists to reject, found inside the check itself.'
          : untrackedProbe.derivationFailed
          ? '-> THE CHANGE SET COULD NOT BE DERIVED, so this control measured nothing and fails '
            + 'rather than passing on `undefined === undefined`. A control that reports "the count did '
            + 'not move" when there was no count is the same "satisfied by never looking" shape as '
            + 'the gitignored fixture above.'
          : untrackedProbe.foreignAtPath
          ? '-> A FOREIGN FILE IS SITTING AT THE FIXTURE PATH. It was NOT deleted: "the path exists" '
            + 'and "the path holds my fixture" are different facts, and only the second licenses a '
            + 'delete. This is R4-2 one layer out — the check refused to destroy something it did not '
            + 'author, and says so rather than silently cleaning up after somebody else.'
          : untrackedProbe.leftBehind
          ? '-> THE FIXTURE WAS LEFT BEHIND. The measurement passed, but a check that litters the '
            + 'tree it audits is a check that can fail its own neighbours on a re-run — and this one '
            + 'did, on the 2026-09-21 gate run. The `finally` unlink is not sufficient under a kill, '
            + 'so cleanliness is now asserted instead of assumed.'
          : `-> with a unique untracked fixture present (\`${untrackedProbe.rel}\`), the derived total is `
            + `${untrackedProbe.total} (${untrackedProbe.totalUnchanged ? 'UNCHANGED' : 'CHANGED — the R3-5 defect is back'}) `
            + `and the file is ${untrackedProbe.reported ? 'NAMED in the untracked report' : 'NOT reported — the fix silenced the original defect'}. `
            + 'Both halves are required: ignoring untracked files entirely would pass the first and '
            + 'fail the second, and the second is why they were in the derivation at all. The fixture '
            + 'is verified REMOVED, because an earlier version of this check leaked it, and its name '
            + 'is unique per invocation because a fixed one let a crashed run block every run after it.');

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
