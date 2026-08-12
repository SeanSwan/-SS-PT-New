/**
 * yt-scout-lib.test.mjs — unit tests for the YouTube scout backend.
 * Run: node --test scripts/swan-scout/yt-scout-lib.test.mjs
 *
 * ZERO network, ZERO subprocesses — every test here exercises pure parsing and
 * validation. These lock the behaviors that would silently corrupt context or
 * let caller input reach a subprocess unvalidated:
 *   - id/handle validation (the argv-injection guard)
 *   - json3 parsing + auto-caption dedupe (transcript fidelity)
 *   - timestamped excerpt search (the token-saving path)
 *   - cache-path refusal on invalid ids (no writes outside the cache dir)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, utimesSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isVideoId, videoIdFrom, channelUrlFrom, parsePrintRows, clampOpt, YtScoutError,
} from './yt-scout-lib.mjs';
import {
  parseJson3, fmtTimestamp, searchTranscript, cachePath, pruneCache, estimateTokens,
  effectivePruneDays, CACHE_TTL_DAYS, fetchTranscript, langCachePaths, textToken,
} from './yt-scout-transcript.mjs';
import { capText, HARD_TEXT_CAP, TOOLS } from '../mcp/swan-scout-server.mjs';

test('isVideoId accepts exactly 11 legal chars and nothing else', () => {
  assert.equal(isVideoId('7xTGNNLPyMI'), true);
  assert.equal(isVideoId('7xTGNNLPyM'), false, '10 chars must fail');
  assert.equal(isVideoId('7xTGNNLPyMIx'), false, '12 chars must fail');
  assert.equal(isVideoId('7xTGNNLPyM!'), false, 'illegal char must fail');
  assert.equal(isVideoId(''), false);
  assert.equal(isVideoId(null), false);
});

test('videoIdFrom extracts the id from every URL shape we actually see', () => {
  const id = '7xTGNNLPyMI';
  assert.equal(videoIdFrom(id), id);
  assert.equal(videoIdFrom(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(videoIdFrom(`https://www.youtube.com/watch?v=${id}&t=42s`), id);
  assert.equal(videoIdFrom(`https://youtu.be/${id}`), id);
  assert.equal(videoIdFrom(`https://youtu.be/${id}?t=10`), id);
  assert.equal(videoIdFrom(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(videoIdFrom(`https://www.youtube.com/embed/${id}`), id);
  assert.equal(videoIdFrom(`https://www.youtube.com/live/${id}`), id);
  assert.equal(videoIdFrom('  ' + id + '  '), id, 'whitespace is trimmed');
});

test('videoIdFrom returns null rather than passing junk through to a subprocess', () => {
  assert.equal(videoIdFrom('not a video'), null);
  assert.equal(videoIdFrom('https://example.com/watch?v=short'), null);
  assert.equal(videoIdFrom('; rm -rf /'), null);
  assert.equal(videoIdFrom(undefined), null);
});

test('channelUrlFrom canonicalizes handles and ids, and rejects topic phrases', () => {
  assert.equal(channelUrlFrom('@AndrejKarpathy'), 'https://www.youtube.com/@AndrejKarpathy/videos');
  assert.equal(
    channelUrlFrom('https://www.youtube.com/@AndrejKarpathy'),
    'https://www.youtube.com/@AndrejKarpathy/videos',
  );
  const ucid = 'UCPk8mSyzYbLpuAqrCE_hqPQ';
  assert.equal(channelUrlFrom(ucid), `https://www.youtube.com/channel/${ucid}/videos`);
  assert.equal(
    channelUrlFrom(`https://www.youtube.com/channel/${ucid}/featured`),
    `https://www.youtube.com/channel/${ucid}/videos`,
  );
  // A search phrase is NOT a creator ref — it must be rejected so the caller is
  // pushed to searchYouTube instead of silently getting a 404 from yt-dlp.
  assert.equal(channelUrlFrom('best fitness coach'), null);
  assert.equal(channelUrlFrom(''), null);
});

test('parseJson3 joins segments and drops the rolling auto-caption duplicates', () => {
  const doc = {
    events: [
      { tStartMs: 0, segs: [{ utf8: 'hello ' }, { utf8: 'there' }] },
      // auto-captions repeat the previous line with an addition — must be dropped
      { tStartMs: 900, segs: [{ utf8: 'hello there' }] },
      { tStartMs: 1500, segs: [{ utf8: 'second line' }] },
      { tStartMs: 2000, segs: [{ utf8: '  ' }] }, // whitespace-only — dropped
      { tStartMs: 2500 }, // no segs at all — dropped
    ],
  };
  const { text, cues } = parseJson3(doc);
  assert.equal(cues.length, 2);
  assert.equal(text, 'hello there second line');
  assert.equal(cues[0].ms, 0);
  assert.equal(cues[1].ms, 1500);
});

test('parseJson3 throws a typed error on malformed input', () => {
  assert.throws(() => parseJson3('{not json'), YtScoutError);
});

test('fmtTimestamp renders M:SS under an hour and H:MM:SS above it', () => {
  assert.equal(fmtTimestamp(0), '0:00');
  assert.equal(fmtTimestamp(9_000), '0:09');
  assert.equal(fmtTimestamp(65_000), '1:05');
  assert.equal(fmtTimestamp(3_600_000), '1:00:00');
  assert.equal(fmtTimestamp(3_725_000), '1:02:05');
  assert.equal(fmtTimestamp(-5), '0:00', 'negative clamps rather than throwing');
});

const CUES = [
  { ms: 0, text: 'welcome to the talk' },
  { ms: 5_000, text: 'today we discuss the context' },
  { ms: 10_000, text: 'window and how it fills up' },
  { ms: 15_000, text: 'which matters a great deal' },
  { ms: 20_000, text: 'now something entirely different' },
  { ms: 25_000, text: 'and here is the context window again' },
];

test('searchTranscript finds a phrase that straddles a cue boundary', () => {
  // "context window" spans cue[1] → cue[2]; a naive per-cue scan would miss it.
  const hits = searchTranscript(CUES, 'context window', { context: 1, videoId: '7xTGNNLPyMI' });
  assert.ok(hits.length >= 1, 'boundary-spanning phrase must be found');
  assert.match(hits[0].excerpt, /context/);
});

// RENAMED: this used to be called "stamps a jump-to URL at the excerpt start",
// which described the defect. With context:0 the two coincide, so the old test
// passed either way and locked nothing — the context>0 case below is the real lock.
test('searchTranscript stamps the jump-to URL at the MATCH cue', () => {
  const [hit] = searchTranscript(CUES, 'entirely different', { context: 0, videoId: '7xTGNNLPyMI' });
  assert.equal(hit.timestamp, '0:20');
  assert.equal(hit.url, 'https://www.youtube.com/watch?v=7xTGNNLPyMI&t=20s');
});

test('searchTranscript omits the URL when no videoId is supplied', () => {
  const [hit] = searchTranscript(CUES, 'welcome', { context: 0 });
  assert.equal(hit.url, undefined);
});

test('searchTranscript is case-insensitive and honours the limit', () => {
  assert.equal(searchTranscript(CUES, 'CONTEXT', { context: 0 }).length > 0, true);
  assert.equal(searchTranscript(CUES, 'the', { context: 0, limit: 1 }).length, 1);
});

test('searchTranscript returns empty rather than throwing on a miss', () => {
  assert.deepEqual(searchTranscript(CUES, 'zzz-not-present', {}), []);
});

test('searchTranscript rejects an empty query', () => {
  assert.throws(() => searchTranscript(CUES, '   ', {}), YtScoutError);
});

test('parsePrintRows maps tab rows and drops partial lines', () => {
  const out = 'abc\tTitle One\tChan\n\nbroken-row\ndef\tTitle Two\tChan2\n';
  const rows = parsePrintRows(out, ['id', 'title', 'channel']);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: 'abc', title: 'Title One', channel: 'Chan' });
  assert.equal(rows[1].channel, 'Chan2');
});

test('cachePath refuses an invalid id so nothing can be written outside the cache', () => {
  const root = mkdtempSync(join(tmpdir(), 'scout-'));
  try {
    assert.throws(() => cachePath(root, '../../etc/passwd'), YtScoutError);
    assert.throws(() => cachePath(root, 'short'), YtScoutError);
    const p = cachePath(root, '7xTGNNLPyMI');
    assert.match(p, /7xTGNNLPyMI\.txt$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pruneCache removes stale files and keeps fresh ones', () => {
  const root = mkdtempSync(join(tmpdir(), 'scout-'));
  try {
    const dir = join(root, '.ai-workflow', 'scout-cache');
    cachePath(root, '7xTGNNLPyMI'); // creates the dir
    // These must be filenames the module actually CREATES (11-char video ids).
    // The original fixtures were `stale.txt` / `fresh.txt`, which prune now
    // deliberately refuses to touch — see the "only delete files it created"
    // regression below. Asserting deletion of a name this code can never write
    // was testing a case that cannot occur.
    const stale = join(dir, 'aaaaaaaaaaa.txt');
    const fresh = join(dir, 'bbbbbbbbbbb.txt');
    writeFileSync(stale, 'old');
    writeFileSync(fresh, 'new');
    // Backdate one file by 60 days.
    const old = new Date(Date.now() - 60 * 86_400_000);
    utimesSync(stale, old, old);

    const removed = pruneCache(root, { days: 30 });
    assert.equal(removed, 1);
    assert.equal(existsSync(stale), false);
    assert.equal(existsSync(fresh), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('estimateTokens approximates 4 chars per token', () => {
  assert.equal(estimateTokens('a'.repeat(400)), 100);
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
});

// ── Regressions for defects caught by this suite's own hostile pass ──────────

test('REGRESSION: clampOpt preserves a legitimate 0 instead of falling back', () => {
  // `Number(0) || 2` is 2 — that bug silently turned context:0 into context:2,
  // making "just the matching line" return five lines and a wrong timestamp.
  assert.equal(clampOpt(0, 2, 0, 10), 0);
  assert.equal(clampOpt(undefined, 2, 0, 10), 2, 'undefined still falls back');
  assert.equal(clampOpt('abc', 2, 0, 10), 2, 'non-numeric falls back');
  assert.equal(clampOpt(99, 2, 0, 10), 10, 'clamps to max');
  assert.equal(clampOpt(-5, 2, 0, 10), 0, 'clamps to min');
  assert.equal(clampOpt(null, 8, 1, 50), 8, 'null falls back, not Number(null)=0');
});

test('REGRESSION: context:0 returns exactly the matching cue with its own timestamp', () => {
  const [hit] = searchTranscript(CUES, 'entirely different', { context: 0, videoId: '7xTGNNLPyMI' });
  assert.equal(hit.excerpt, 'now something entirely different', 'no neighbouring cues leak in');
  assert.equal(hit.timestamp, '0:20', 'timestamp is the matching cue, not two cues earlier');
});

test('REGRESSION: parsePrintRows turns yt-dlp\'s literal "NA" into null', () => {
  // Flat listings leave upload_date unpopulated; yt-dlp prints "NA", which then
  // rendered as a bogus-looking date in the results table.
  const [row] = parsePrintRows('abc\tTitle\tChan\t120\tNA\t900', ['id', 'title', 'channel', 'duration', 'upload_date', 'view_count']);
  assert.equal(row.upload_date, null);
  assert.equal(row.duration, '120', 'real values are untouched');
});

test('capText enforces a hard ceiling so one tool call cannot flood the window', () => {
  const short = 'x'.repeat(100);
  assert.equal(capText(short), short, 'under the cap passes through unchanged');
  const huge = 'y'.repeat(HARD_TEXT_CAP + 5_000);
  const out = capText(huge);
  assert.ok(out.length < huge.length, 'over the cap is truncated');
  assert.match(out, /TRUNCATED at/, 'truncation is announced, never silent');
  assert.match(out, /yt_find_in_video/, 'points the caller at the cheap path');
});
// ─────────────────────────────────────────────────────────────────────────────
// REGRESSIONS from the 2026-08-12 hostile review of this module. All three were
// reproduced empirically before being fixed; each assertion below fails against
// the previous revision.
// ─────────────────────────────────────────────────────────────────────────────

test('REGRESSION: a lowercase-expanding char must not desync cue offsets', () => {
  // 'İ' (U+0130) lowercases to TWO code units. Offsets were measured on the
  // original-case text while the haystack was lowercased, so every offset after
  // such a char drifted and the match walked to the wrong cue — returning a
  // confident excerpt, timestamp and jump-to URL for the WRONG moment.
  const cues = [
    { ms: 0, text: 'İ'.repeat(40) },
    { ms: 10_000, text: 'alpha' },
    { ms: 20_000, text: 'beta' },
    { ms: 30_000, text: 'SIGNAL' },
    { ms: 40_000, text: 'gamma' },
    { ms: 50_000, text: 'delta' },
    { ms: 60_000, text: 'epsilon' },
  ];
  const hits = searchTranscript(cues, 'SIGNAL', { context: 0, limit: 3, videoId: 'aaaaaaaaaaa' });
  assert.equal(hits.length, 1, 'the phrase is present exactly once');
  assert.equal(hits[0].ms, 30_000, 'the timestamp must point at the cue the phrase is in');
  assert.equal(hits[0].excerpt, 'SIGNAL', 'the excerpt must be the matching cue, not a later one');
  assert.match(hits[0].url, /&t=30s$/, 'the jump-to URL must agree with the timestamp');
});

test('REGRESSION: case-insensitive matching still works after the offset fix', () => {
  const cues = [{ ms: 0, text: 'The Context Window Is Large' }, { ms: 5_000, text: 'tail' }];
  const hits = searchTranscript(cues, 'CONTEXT window', { context: 0, videoId: 'aaaaaaaaaaa' });
  assert.equal(hits.length, 1, 'matching remains case-insensitive across the fix');
  assert.equal(hits[0].ms, 0);
});

test('REGRESSION: days:null must mean "the default", not "reap everything"', () => {
  // Number(null) === 0 is finite, so a finite-check on the raw value read an
  // absent field as zero, set cutoff = now, and deleted the whole cache.
  assert.equal(effectivePruneDays(null), CACHE_TTL_DAYS, 'null means not-supplied');
  assert.equal(effectivePruneDays(undefined), CACHE_TTL_DAYS, 'undefined means not-supplied');
  assert.equal(effectivePruneDays(''), CACHE_TTL_DAYS, 'empty string means not-supplied');
  assert.equal(effectivePruneDays(7), 7, 'a real value passes through');
  // RE-ANCHORED: the floor was 0, so `days: 0` (and negatives clamping up to 0)
  // meant "cutoff = now" = reap everything. Closing the null hole left that open
  // to any caller that COMPUTED the value. The floor is now 1 and a full reap
  // requires an explicit all:true, so 0 no longer expresses "delete everything".
  assert.equal(effectivePruneDays(0), 1, 'an explicit 0 no longer means "reap all" — floor is 1');
  assert.equal(effectivePruneDays(-5), 1, 'negatives clamp to the floor of 1, not 0');
});

test('REGRESSION: a full cache reap requires all:true, not arithmetic', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scout-all-'));
  const cache = join(dir, '.ai-workflow', 'scout-cache');
  cachePath(dir, 'aaaaaaaaaaa');
  // Written NOW, so no age-based prune should ever touch them.
  for (const n of ['aaaaaaaaaaa.en.txt', 'bbbbbbbbbbb.en.txt']) writeFileSync(join(cache, n), 'fresh');

  assert.equal(pruneCache(dir, { days: 0 }), 0, 'days:0 must NOT reap fresh files any more');
  assert.equal(pruneCache(dir, { days: -30 }), 0, 'a negative must NOT reap fresh files');
  assert.equal(readdirSync(cache).length, 2, 'both files survive age-based pruning');

  assert.equal(pruneCache(dir, { all: true }), 2, 'all:true reaps regardless of age');
  assert.equal(readdirSync(cache).length, 0, 'and the cache is empty only when asked explicitly');
  rmSync(dir, { recursive: true, force: true });
});

test('REGRESSION: prune must only delete files it created', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scout-prune-'));
  const cache = join(dir, '.ai-workflow', 'scout-cache');
  cachePath(dir, 'aaaaaaaaaaa'); // creates the cache dir
  const old = new Date(Date.now() - 90 * 86_400_000);
  const mk = (name) => { const p = join(cache, name); writeFileSync(p, 'x'); utimesSync(p, old, old); return p; };

  const mine = mk('aaaaaaaaaaa.txt');
  const mineCues = mk('bbbbbbbbbbb.cues.json');
  const theirs = mk('IMPORTANT-not-a-transcript.md');
  const alsoTheirs = mk('notes.txt');

  const removed = pruneCache(dir, { days: 30 });

  assert.equal(existsSync(mine), false, 'our stale transcript is reaped');
  assert.equal(existsSync(mineCues), false, 'our stale cue file is reaped');
  assert.equal(existsSync(theirs), true, 'a foreign file is NOT ours to delete');
  assert.equal(existsSync(alsoTheirs), true, 'a non-id .txt is NOT ours either');
  assert.equal(removed, 2, 'only the two files we created are counted');
  rmSync(dir, { recursive: true, force: true });
});

test('REGRESSION: a corrupt cues cache self-heals instead of failing forever', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scout-corrupt-'));
  // RE-ANCHORED to the lang-keyed filenames. Cache paths are now `<id>.<lang>.*`
  // because keying on the id alone served the first-fetched language for every
  // later language request. With the old names this test planted files
  // fetchTranscript never looks at, so it proved nothing.
  const { txtPath: txt, cuesPath: cues } = langCachePaths(dir, 'aaaaaaaaaaa', 'en');
  writeFileSync(txt, 'some transcript text');
  writeFileSync(cues, '[{"ms":0,"text":"trunca');  // killed mid-write

  // Previously this threw a raw SyntaxError from JSON.parse. It must now treat
  // the corrupt cache as a MISS — which, with no yt-dlp reachable in this test,
  // surfaces as a YtScoutError rather than an opaque SyntaxError.
  let err;
  try { fetchTranscript('aaaaaaaaaaa', { root: dir }); } catch (e) { err = e; }
  assert.ok(err, 'it does not silently return a corrupt cache');
  assert.notEqual(err.name, 'SyntaxError', 'the failure must not be a raw JSON parse error');
  assert.equal(existsSync(cues), false, 'the corrupt cue file is discarded so the next call is clean');
  rmSync(dir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSIONS from the Kimi K3 packet-8 review (2026-08-12). Every finding below
// was reproduced against the prior revision before being fixed.
// ─────────────────────────────────────────────────────────────────────────────

test('KIMI F1: the timestamp points at the match cue, NOT the context start', () => {
  // Previously stamped cues[cueIdx - context], putting the deep link `context`
  // cues early — 20s at the default, up to a minute at the permitted context:10.
  // "he says X at 1:23:45" pointing somewhere he wasn't is the core threat here.
  const [hit] = searchTranscript(CUES, 'entirely different', { context: 2, videoId: '7xTGNNLPyMI' });
  assert.equal(hit.ms, 20_000, 'ms is the cue containing the phrase');
  assert.equal(hit.timestamp, '0:20');
  assert.match(hit.url, /&t=20s$/, 'the deep link agrees with the timestamp');
  assert.equal(hit.excerptStartMs, 10_000, 'the window head is exposed separately, not as the timestamp');
  assert.match(hit.excerpt, /window and how it fills up/, 'the excerpt still spans the context window');
});

test('KIMI F4: a query with collapsed-whitespace variance still matches', () => {
  // The haystack collapses \s+ per cue; the needle did not, so a double space or
  // a newline — routine in pasted text — produced a confident false "No match".
  assert.equal(searchTranscript(CUES, 'the  context', { context: 0 }).length,
    searchTranscript(CUES, 'the context', { context: 0 }).length,
    'a double space matches exactly like a single space');
  assert.ok(searchTranscript(CUES, 'context\nwindow', { context: 0 }).length > 0, 'a newline in the query still matches');
  assert.ok(searchTranscript(CUES, '  entirely   different  ', { context: 0 }).length > 0, 'ragged whitespace still matches');
});

test('KIMI F2: cache paths are keyed by language, not just video id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scout-lang-'));
  const en = langCachePaths(dir, 'aaaaaaaaaaa', 'en');
  const fr = langCachePaths(dir, 'aaaaaaaaaaa', 'fr');
  assert.notEqual(en.txtPath, fr.txtPath, 'two languages cannot share one text cache');
  assert.notEqual(en.cuesPath, fr.cuesPath, 'two languages cannot share one cue cache');
  assert.match(en.txtPath, /aaaaaaaaaaa\.en\.txt$/);
  rmSync(dir, { recursive: true, force: true });
});

test('KIMI F3: cues bound to a stale generation are rejected, not served', () => {
  // The killer case: a refresh killed between the two writes leaves a NEW txt with
  // the PREVIOUS cues — valid JSON, correct shape, so no structural check catches
  // it. Excerpts and timestamps would come from the old generation while the
  // receipt reported the new size. The token binds cues to the text they describe.
  const a = textToken('the original transcript text');
  const b = textToken('a DIFFERENT generation of the transcript');
  assert.notEqual(a, b, 'different text yields a different token');
  assert.equal(a, textToken('the original transcript text'), 'the token is deterministic');

  const dir = mkdtempSync(join(tmpdir(), 'scout-gen-'));
  const { txtPath, cuesPath } = langCachePaths(dir, 'aaaaaaaaaaa', 'en');
  writeFileSync(txtPath, 'a DIFFERENT generation of the transcript');
  // Well-formed cues, but carrying the token of the PREVIOUS text.
  writeFileSync(cuesPath, JSON.stringify({ token: a, lang: 'en', cues: [{ ms: 0, text: 'stale cue' }] }));
  let err;
  try { fetchTranscript('aaaaaaaaaaa', { root: dir }); } catch (e) { err = e; }
  assert.ok(err, 'a generation mismatch must not be served as truth');
  assert.equal(existsSync(cuesPath), false, 'the mismatched cues are discarded');
  rmSync(dir, { recursive: true, force: true });
});

test('KIMI F17: malformed cues throw instead of reporting "No match" forever', () => {
  // [1,2,3] is valid JSON and passes Array.isArray, but every .text is undefined,
  // so the haystack is empty and EVERY search silently missed — permanently,
  // because the entry was never re-fetched.
  assert.throws(() => searchTranscript([1, 2, 3], 'anything', {}), YtScoutError);
  assert.throws(() => searchTranscript([{ ms: 'x', text: 'y' }], 'anything', {}), YtScoutError);
  assert.throws(() => searchTranscript([{ ms: 0 }], 'anything', {}), YtScoutError);
  assert.throws(() => searchTranscript(null, 'anything', {}), YtScoutError);
});

test('KIMI F14: an inherited property name is not a tool', () => {
  // TOOLS[name] resolved built-ins, so name:"constructor" was truthy, bypassed the
  // unknown-tool error, and failed down the wrong path.
  for (const name of ['constructor', 'hasOwnProperty', '__proto__', 'toString']) {
    assert.equal(Object.hasOwn(TOOLS, name), false, `${name} must not resolve as a tool`);
  }
  assert.equal(Object.hasOwn(TOOLS, 'yt_search'), true, 'real tools still resolve');
});

test('KIMI F16: a fractional limit is truncated before it reaches an argv slot', () => {
  assert.equal(clampOpt(7.5, 8, 1, 50), 7, 'floats truncate — `ytsearch7.5:` is an opaque yt-dlp failure');
  assert.equal(clampOpt(0.4, 8, 1, 50), 1, 'truncation happens after clamping, so it cannot fall below min');
  assert.equal(clampOpt(50.9, 8, 1, 50), 50, 'nor above max');
  assert.equal(Number.isInteger(clampOpt(2.7, 8, 0, 10)), true);
});

test('KIMI F8: a row that cannot be aligned is dropped, not misaligned', () => {
  // A literal TAB in a title shifted channel/duration/date/views one field right,
  // so the channel rendered as the tail of the title — a wrong attribution as fact.
  const fields = ['id', 'title', 'channel'];
  assert.equal(parsePrintRows('abc\tTi\ttle\tChan', fields).length, 0, 'too many fields is untrustworthy');
  assert.equal(parsePrintRows('abc\tTitle\tChan', fields).length, 1, 'an exact row is still kept');
  assert.equal(parsePrintRows('abc\tTitle', fields).length, 0, 'too few is still dropped');
});

test('KIMI F13: a non-YouTube host carrying a v= param is rejected', () => {
  const id = '7xTGNNLPyMI';
  assert.equal(videoIdFrom(`https://evil.com/watch?v=${id}`), null);
  assert.equal(videoIdFrom(`https://youtube.com.evil.io/watch?v=${id}`), null, 'a suffix impostor is not YouTube');
  // Everything legitimate still resolves.
  assert.equal(videoIdFrom(`https://m.youtube.com/watch?v=${id}`), id);
  assert.equal(videoIdFrom(`https://www.youtube-nocookie.com/embed/${id}`), id);
  assert.equal(videoIdFrom(`youtube.com/watch?v=${id}`), id, 'a scheme-less host still works');
});
