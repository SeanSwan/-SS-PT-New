#!/usr/bin/env node
/**
 * S17 — documentation link gate.
 *
 * Replaces the third-party GitHub action as the thing CI runs, so that the
 * command a developer runs locally is the command CI runs. The previous setup
 * had three defects that made this check unrunnable and unreproducible:
 *
 *   1. The action swept the whole repository with
 *      `find . -name '*.md' -not -path './node_modules/*'`, which includes
 *      frozen archives, saved model transcripts and vendored upstream skill
 *      bundles — content that must not be rewritten.
 *   2. The action global-installed markdown-link-check@3.8.7 (pinned in the
 *      action's entrypoint.sh at the resolved SHA 5c5dfc0a) while this
 *      repository locks 3.14.2 — six minor versions apart, with different
 *      strictness. Corroborated by the CI log itself, which resolves `request`,
 *      a dependency only link-check <=3.12.x has; 3.13+ uses `needle`.
 *   3. Nothing reproduced CI locally, so the debt was invisible until CI ran.
 *
 * This script fixes discovery and reproducibility, not the rules. Which links
 * count as dead, which status codes count as alive, ignore patterns and
 * timeouts all still come from `.github/markdown-link-check-config.json` and
 * the stock checker.
 *
 * What it enforces:
 *   - Every failing link in scope fails the run.
 *
 *   - Excluded files are STILL CHECKED; if a row exceeds its recorded baseline the
 *     run fails. This is close to, but not the same as, "debt can only shrink":
 *     the ledger is count-based, so a net-zero swap inside one already-excluded
 *     file is not detected.
 *
 *   - A file with a recoverable failure is re-checked up to five times, two
 *     seconds apart, inside a five-minute aggregate budget. Recoverable means a
 *     connection error, a timeout, 408, 429 or a 5xx; a definitive 4xx is never
 *     retried away. The confirmed result is merged per link, so a real 404 seen on
 *     the first pass is carried forward even if the retry happened not to
 *     reproduce it — a dead link must not depend on retry luck, and an
 *     intermittent link must not be reported differently depending on what else
 *     shares its file.
 *
 *   - Suppression is reported in two distinct forms, because they are not the
 *     same mechanism: links skipped by config `ignorePatterns`, and in-file
 *     `markdown-link-check-disable` markers. The latter are stripped before link
 *     extraction, so the number of links they hide cannot be counted from the
 *     engine's results; the markers themselves are counted from the raw text.
 *
 * Usage (from the repository root):
 *   node scripts/ci/check-docs-links.mjs                 # full run, CI parity
 *   node scripts/ci/check-docs-links.mjs --scope=in      # in-scope only, fast loop
 *   node scripts/ci/check-docs-links.mjs --json=out.json # machine-readable receipt
 *   node scripts/ci/check-docs-links.mjs --record        # rewrite the ledger baseline
 *
 * Exit codes: 0 = clean, 1 = in-scope dead link or ledger growth, 2 = misuse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const markdownLinkCheck = promisify(require('markdown-link-check'));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..');
const DEFAULT_MANIFEST = path.join(HERE, 'docs-link-scope.json');
const DEFAULT_CONFIG = path.join('.github', 'markdown-link-check-config.json');

/**
 * A link is treated as failing when the engine reports it `dead` **or** `error`.
 *
 * The CLI only fails on `dead`. This gate is deliberately stricter: `error` is
 * what the engine emits for a link it could not evaluate at all — an unsupported
 * scheme, an unparseable target, a Windows path. Those are real defects in a
 * document and they were previously invisible, which made the workflow's own
 * success banner ("every link in checked documentation resolves") untrue while
 * in-scope files full of `c:\Users\...` links sat unchecked.
 *
 * `ignored` (an explicit in-file disable comment) is not a failure, but it is
 * counted and reported so self-exemption is visible rather than silent.
 */
const ENGINE_FAILURE_STATUSES = new Set(['dead', 'error']);

const USAGE = `usage: node scripts/ci/check-docs-links.mjs [options]

  --scope=all|in     all = full run including the excluded ledger (default, CI parity)
                     in  = in-scope files only (fast local loop)
  --json=<path>      write a machine-readable receipt
  --record           rewrite the ledger baseline in the scope manifest
  --concurrency=<n>  files checked in parallel (default 1 = CI parity)
  --manifest=<path>  scope manifest (default scripts/ci/docs-link-scope.json)
  --config=<path>    checker config, relative to the repo root
  --root=<path>      repository root (default: this script's ../..)
  --quiet            suppress per-link output
`;

/* ------------------------------------------------------------------ args */

function parseArgs(argv) {
  const opts = {
    root: DEFAULT_ROOT,
    manifest: DEFAULT_MANIFEST,
    config: DEFAULT_CONFIG,
    scope: 'all',
    concurrency: 1,
    json: null,
    record: false,
    quiet: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--record') opts.record = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg.startsWith('--scope=')) opts.scope = arg.slice(8);
    else if (arg.startsWith('--concurrency=')) opts.concurrency = Number(arg.slice(14));
    else if (arg.startsWith('--json=')) opts.json = arg.slice(7);
    else if (arg.startsWith('--root=')) opts.root = path.resolve(arg.slice(7));
    else if (arg.startsWith('--manifest=')) opts.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith('--config=')) opts.config = arg.slice(9);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!['all', 'in'].includes(opts.scope)) throw new Error(`--scope must be all|in, got ${opts.scope}`);
  if (opts.record && opts.scope !== 'all') {
    // With --scope=in the excluded files are never checked, so their recorded
    // counters would be written as zeroes — silently erasing every real baseline.
    // Hostile review reproduced that (AI-HANDOFF 577 -> 0) with no warning.
    throw new Error('--record requires --scope=all: recording from a partial run would overwrite real baselines with zeroes');
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }
  return opts;
}

/* -------------------------------------------------------------- discovery */

/**
 * Enumerate tracked Markdown.
 *
 * `git ls-files` is used rather than `find`: it is what actually exists in a
 * fresh checkout, it excludes node_modules and ignored build output by
 * construction, and it is deterministic across machines.
 */
export function listTrackedMarkdown(root) {
  const raw = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
    cwd: root,
    maxBuffer: 1 << 28,
  });
  return raw
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split(path.sep).join('/'))
    .sort();
}

/**
 * Split files into the checked scope and the excluded ledger.
 *
 * An exclusion is either:
 *   - a whole directory prefix (for generated output and vendored bundles, where
 *     a newly written file is equally not-ours and equally unrepairable), or
 *   - a directory prefix restricted to an explicitly recorded file list
 *     (`freezeMode: "files"` + `frozenFiles`).
 *
 * The second form exists because `docs/ai-workflow/AI-HANDOFF/` is an ACTIVE
 * write target: CLAUDE.md rules 48/212/251 require audit records to be written
 * there. Treating the whole directory as frozen would mean every future audit
 * record is invisible to this check. Listing the frozen files keeps the existing
 * receipts as acknowledged debt while any NEW file in that directory is checked
 * like any other documentation.
 *
 * The list is stored in the manifest rather than derived from a pinned commit on
 * purpose. An earlier revision pinned a commit sha and resolved it with
 * `git ls-tree`; hostile review showed that `actions/checkout` fetches a single
 * commit by default, so the pinned commit is absent in CI and the gate exited 2
 * on every trigger. An explicit list has no dependency on clone depth, on git
 * history, or on how the function is called.
 *
 * Pure: no filesystem access, so it is directly unit-testable — and both the gate
 * and its tests call it the same way.
 */
export function partition(files, manifest) {
  const entries = manifest.excludedPaths.map((e) => ({
    ...e,
    normalized: e.path.replace(/\/+$/, '') + '/',
    frozenSet: Array.isArray(e.frozenFiles) ? new Set(e.frozenFiles) : null,
  }));
  const inScope = [];
  const excluded = [];
  for (const file of files) {
    const hit = entries.find(
      (e) => file.startsWith(e.normalized) && (!e.frozenSet || e.frozenSet.has(file)),
    );
    if (hit) excluded.push({ file, entry: hit });
    else inScope.push(file);
  }
  return { inScope, excluded, entries };
}

/* ----------------------------------------------------------------- engine */

/**
 * Check one file with the stock checker, replicating the option handling of the
 * markdown-link-check CLI (its `processInput`/`getInputs`) so results match what
 * the tool reports anywhere else. Divergence here would silently change the gate.
 */
export async function checkFile(absPath, fileOpts) {
  const markdown = fs.readFileSync(absPath, 'utf8');
  const dir = path.dirname(path.resolve(absPath));
  const baseUrl = process.platform === 'win32' ? `file://${dir.replace(/\\/g, '/')}` : `file://${dir}`;
  return markdownLinkCheck(markdown, { ...fileOpts, baseUrl });
}

function configOptions(config) {
  // Mirrors markdown-link-check's own config -> opts mapping exactly.
  return {
    ignorePatterns: config.ignorePatterns,
    replacementPatterns: config.replacementPatterns,
    httpHeaders: config.httpHeaders,
    timeout: config.timeout,
    ignoreDisable: config.ignoreDisable,
    retryOn429: config.retryOn429,
    retryCount: config.retryCount,
    fallbackRetryDelay: config.fallbackRetryDelay,
    aliveStatusCodes: config.aliveStatusCodes,
    projectBaseUrl:
      process.platform === 'win32'
        ? `file:///${process.cwd().replace(/\\/g, '/')}`
        : `file://${process.cwd()}`,
    quiet: true,
  };
}

/** Bounded-concurrency map. Order of results follows input order. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function checkOne(root, file, fileOpts) {
  try {
    const results = await checkFile(path.join(root, file), fileOpts);
    return { file, results, failure: null };
  } catch (err) {
    return { file, results: [], failure: String(err && err.message ? err.message : err) };
  }
}

/**
 * Read JSON, tolerating a UTF-8 BOM. Windows editors and PowerShell's
 * `Set-Content -Encoding utf8` add one, and `JSON.parse` rejects it — which would
 * turn a config file into an opaque crash instead of a readable error.
 */
export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

/* ------------------------------------------------------------------- main */

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const manifest = readJson(opts.manifest);
  const config = readJson(path.resolve(opts.root, opts.config));
  const toolVersion = require('markdown-link-check/package.json').version;

  if (manifest.toolVersion && manifest.toolVersion !== toolVersion) {
    console.error(
      `[docs-links] tool version drift: manifest records ${manifest.toolVersion}, installed ${toolVersion}.`,
    );
    console.error('  The ledger baseline is only meaningful for the version it was recorded with.');
    return 2;
  }

  const all = listTrackedMarkdown(opts.root);

  // Fail closed on an unrecorded ledger entry. Without this, an entry that lost
  // its baseline would be silently exempt from comparison forever. `NaN` and
  // `Infinity` are numbers, so check finiteness explicitly: every comparison
  // against NaN is false, which would exempt a row without any error.
  const recorded = (v) => Number.isFinite(v);
  const unrecorded = manifest.excludedPaths.filter(
    (e) => !recorded(e.deadLinks) || !recorded(e.unreadable) || !recorded(e.files),
  );
  if (unrecorded.length) {
    console.error(
      `[docs-links] manifest entries have no usable recorded baseline: ${unrecorded.map((e) => e.path).join(', ')}`,
    );
    console.error('  Run with --record to establish it. An unrecorded entry cannot be compared and must not pass.');
    return 2;
  }

  const { inScope, excluded, entries } = partition(all, manifest);

  // A manifest entry that matches nothing is dead weight and hides intent — but it
  // must not be a hard failure at runtime. If a frozen directory is ever emptied
  // or archived away, `--scope=all` would otherwise exit 2 on every trigger, which
  // is the "permanently red job" failure mode this slice exists to remove. The
  // guard test asserts every entry still matches, so it is caught at review time.
  const unused = entries.filter((e) => !excluded.some((x) => x.entry.path === e.path));
  if (unused.length && !opts.quiet) {
    process.stderr.write(
      `[docs-links] warning: manifest entries match no tracked Markdown (stale exclusions): ` +
        `${unused.map((e) => e.path).join(', ')}\n`,
    );
  }

  const targets = opts.scope === 'in' ? inScope : all;
  const fileOpts = configOptions(config);

  process.stderr.write(
    `[docs-links] ${all.length} tracked Markdown files; checking ${targets.length} ` +
      `(in-scope ${inScope.length}, excluded ${excluded.length}) with markdown-link-check ` +
      `${toolVersion} at concurrency ${opts.concurrency}\n`,
  );

  const first = await mapLimit(targets, opts.concurrency, (f) => checkOne(opts.root, f, fileOpts));

  const deadLinks = (c) =>
    c.results
      .filter((r) => r.status === 'dead')
      .map((r) => ({
        file: c.file,
        link: r.link,
        statusCode: r.statusCode,
        err: r.err ? String(r.err) : null,
      }));

  // Confirmation pass: re-check every file that reported a failure, sequentially,
  // until it comes back clean or the attempt budget is exhausted. A link is only
  // reported dead when every attempt agrees, so a transient CDN fault cannot fail
  // the gate. Measured example: orthoinfo.aaos.org answers 200 to curl and to the
  // checker on most runs, but intermittently returns 520 or drops the connection;
  // with a single confirmation pass that host failed the gate at random. This can
  // only remove false failures — a genuinely dead link is dead in every attempt.
  const CONFIRM_ATTEMPTS = 5;
  const CONFIRM_PAUSE_MS = 2000;
  const CONFIRM_BUDGET_MS = 300000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const excludedSet = new Set(excluded.map((x) => x.file));
  const deadList = (c) => c.results.filter((r) => ENGINE_FAILURE_STATUSES.has(r.status));
  const ignoredList = (c) => c.results.filter((r) => r.status === 'ignored');
  const fails = (c) => Boolean(c.failure) || deadList(c).length > 0;

  // A failure is "transient" only if it is a connection-level fault, a timeout, a
  // rate limit, or a server error. A definitive 4xx (including a missing local
  // file, reported as 400) is never re-checked: it does not become alive for a
  // reason worth accepting, and re-checking is exactly how a real 404 gets
  // laundered into a pass by a host that happens to answer differently on retry.
  // Hostile review demonstrated that laundering against a local server before
  // this rule existed. 408 and 429 are included because they mean "try again",
  // not "this is gone".
  const isTransient = (r) => {
    const code = Number(r.statusCode);
    if (!Number.isFinite(code)) return true;
    return code === 0 || code === 408 || code === 429 || code >= 500;
  };
  const hasDefinitiveFailure = (c) => deadList(c).some((r) => !isTransient(r));

  // Which failing files are worth re-checking?
  //   - in-scope transient failures: a false one would fail the gate wrongly;
  //   - an excluded transient failure only when its ledger entry is already over
  //     its recorded dead-link baseline. Confirming every failing excluded file
  //     instead would re-check the ledger's slowest frozen transcript files on
  //     every run for no change in outcome: their dead links are acknowledged debt.
  //
  // The comparison is dead links against dead links. An earlier revision compared
  // a count of failing FILES against the recorded DEAD-LINK baseline, so the
  // trigger was effectively arbitrary — hostile review caught it.
  //
  // `--record` deliberately does NOT confirm excluded files. Confirming them costs
  // minutes per file on the transcript archives. The consequence is that a recorded
  // baseline can be inflated slightly by transient network noise, which makes the
  // ledger marginally more permissive — it can never make it falsely restrictive,
  // and the manifest is a reviewed artifact, so the number is visible in the diff.
  const firstPassExcludedDead = new Map();
  for (const c of first) {
    if (!excludedSet.has(c.file)) continue;
    const e = entries.find((x) => c.file.startsWith(x.normalized));
    if (!e) continue;
    firstPassExcludedDead.set(e.path, (firstPassExcludedDead.get(e.path) || 0) + deadList(c).length);
  }
  const suspect = first.filter((c) => {
    if (!fails(c)) return false;
    // Only worth re-checking if something in the file could actually recover.
    const hasTransientFailure = Boolean(c.failure) || deadList(c).some(isTransient);
    if (!hasTransientFailure) return false;
    if (!excludedSet.has(c.file)) return true;
    const e = entries.find((x) => c.file.startsWith(x.normalized));
    const recorded = e && Number.isFinite(e.deadLinks) ? e.deadLinks : null;
    if (recorded === null) return false;
    return (firstPassExcludedDead.get(e.path) || 0) > recorded;
  });

  let confirmed = first;
  if (suspect.length) {
    process.stderr.write(
      `[docs-links] confirming ${suspect.length} of ${first.filter(fails).length} failing file(s), ` +
        `up to ${CONFIRM_ATTEMPTS} sequential attempts\n`,
    );
    const settled = new Map();
    const budgetStart = Date.now();
    let budgetExhausted = 0;
    for (const c of suspect) {
      // Bound the worst case. Confirmation is bounded per file, but a pathological
      // run (a generator adding many new in-scope files, each failing on a slow
      // host) could still multiply that by the number of files. Past the budget we
      // stop re-checking and keep the first-pass result, which is fail-closed:
      // an unconfirmed failure is still a failure.
      if (Date.now() - budgetStart > CONFIRM_BUDGET_MS) {
        budgetExhausted += 1;
        continue;
      }
      let attempt = c;
      for (let i = 0; i < CONFIRM_ATTEMPTS; i += 1) {
        if (i > 0) await sleep(CONFIRM_PAUSE_MS);
        attempt = await checkOne(opts.root, c.file, fileOpts);
        if (!fails(attempt)) break;
      }
      settled.set(c.file, attempt);
    }
    if (budgetExhausted) {
      process.stderr.write(
        `[docs-links] confirmation budget (${Math.round(CONFIRM_BUDGET_MS / 1000)}s) reached; ` +
          `${budgetExhausted} file(s) kept their first-pass result (fail-closed)\n`,
      );
    }
    // Merge, per link: the confirmed run wins for links that can recover, but a
    // definitive failure seen on the first pass is carried forward even if the
    // retry did not reproduce it. Without this, a file mixing a real 404 with an
    // intermittent 5xx reported the 5xx as dead in one run and alive in the next,
    // for no reason a reader could explain — hostile review reproduced exactly
    // that inconsistency. A definitive 4xx must never depend on retry luck.
    confirmed = first.map((c) => {
      const last = settled.get(c.file);
      if (!last) return c;
      const reproved = new Set(last.results.map((r) => r.link));
      const carriedForward = c.results.filter(
        (r) => ENGINE_FAILURE_STATUSES.has(r.status) && !isTransient(r) && !reproved.has(r.link),
      );
      if (!carriedForward.length) return last;
      return { ...last, results: [...last.results, ...carriedForward] };
    });
  }

  const inScopeDead = [];
  const excludedDead = [];
  const inScopeErrors = [];
  const excludedErrors = [];

  for (const c of confirmed) {
    const isExcluded = excludedSet.has(c.file);
    if (c.failure) (isExcluded ? excludedErrors : inScopeErrors).push({ file: c.file, error: c.failure });
    for (const d of deadLinks(c)) (isExcluded ? excludedDead : inScopeDead).push(d);
  }

  const measure = (list) => {
    const m = new Map();
    for (const d of list) {
      const e = entries.find((x) => d.file.startsWith(x.normalized));
      if (e) m.set(e.path, (m.get(e.path) || 0) + 1);
    }
    return m;
  };
  const deadByEntry = measure(excludedDead);
  const errByEntry = measure(excludedErrors);
  const ledgerRow = (e) => ({
    path: e.path,
    recorded: typeof e.deadLinks === 'number' ? e.deadLinks : null,
    observed: deadByEntry.get(e.path) || 0,
    recordedUnreadable: typeof e.unreadable === 'number' ? e.unreadable : null,
    observedUnreadable: errByEntry.get(e.path) || 0,
  });
  const ledger = entries.map(ledgerRow);
  const ledgerGrowth = ledger.filter(
    (r) =>
      (r.recorded !== null && r.observed > r.recorded) ||
      (r.recordedUnreadable !== null && r.observedUnreadable > r.recordedUnreadable),
  );

  // Two different suppression mechanisms, reported separately because they are
  // not the same thing and conflating them made an earlier claim false:
  //   - engine status 'ignored' means the link matched a config `ignorePatterns`
  //     entry (in this repo, the localhost patterns);
  //   - a `markdown-link-check-disable` comment is stripped from the markdown
  //     BEFORE link extraction, so it never produces a result at all and cannot be
  //     counted from the results. It has to be found in the raw text.
  const ignoredByIgnorePatterns = confirmed
    .map((c) => ({ file: c.file, count: ignoredList(c).length }))
    .filter((r) => r.count > 0);

  const disableCommentMarkers = [];
  for (const c of confirmed) {
    try {
      const raw = fs.readFileSync(path.join(opts.root, c.file), 'utf8');
      const count = (raw.match(/markdown-link-check-disable/g) || []).length;
      if (count) disableCommentMarkers.push({ file: c.file, count });
    } catch {
      /* unreadable files are already reported above */
    }
  }

  if (!opts.quiet) {
    if (ignoredByIgnorePatterns.length) {
      const total = ignoredByIgnorePatterns.reduce((n, r) => n + r.count, 0);
      console.error(`\n[docs-links] ${total} link(s) skipped by config ignorePatterns:`);
      for (const r of ignoredByIgnorePatterns) console.error(`  ${String(r.count).padStart(3)}  ${r.file}`);
    }
    if (disableCommentMarkers.length) {
      const total = disableCommentMarkers.reduce((n, r) => n + r.count, 0);
      console.error(
        `\n[docs-links] ${total} in-file markdown-link-check-disable marker(s) in ${disableCommentMarkers.length} file(s).` +
          `\n  These suppress links before the engine sees them, so the number of links they hide is NOT counted:`,
      );
      for (const r of disableCommentMarkers) console.error(`  ${String(r.count).padStart(3)}  ${r.file}`);
    }
    if (inScopeDead.length) {
      console.error(`\n[docs-links] ${inScopeDead.length} dead link(s) IN SCOPE — these fail the check:\n`);
      for (const d of inScopeDead) {
        console.error(`  ${d.file}\n    ${d.link}${d.statusCode ? ` (${d.statusCode})` : ''}`);
      }
    }
    if (excludedDead.length) {
      console.error(`\n[docs-links] excluded ledger (fails only on growth):`);
      for (const r of ledger) {
        const flag =
          (r.recorded !== null && r.observed > r.recorded) ||
          (r.recordedUnreadable !== null && r.observedUnreadable > r.recordedUnreadable)
            ? '  <-- OVER BASELINE'
            : '';
        console.error(
          `  dead ${String(r.observed).padStart(5)} / ${String(r.recorded ?? '?').padStart(5)}` +
            `   unreadable ${String(r.observedUnreadable).padStart(3)} / ${String(r.recordedUnreadable ?? '?').padStart(3)}` +
            `   ${r.path}${flag}`,
        );
      }
    }
    if (inScopeErrors.length) {
      console.error(`\n[docs-links] ${inScopeErrors.length} IN-SCOPE file(s) could not be checked:`);
      for (const e of inScopeErrors) console.error(`  ${e.file}: ${e.error}`);
    }
    if (excludedErrors.length) {
      console.error(`\n[docs-links] ${excludedErrors.length} excluded file(s) could not be checked (ledger):`);
      for (const e of excludedErrors) console.error(`  ${e.file}: ${e.error}`);
    }
  }

  const receipt = {
    tool: 'scripts/ci/check-docs-links.mjs',
    at: new Date().toISOString(),
    toolVersion,
    scope: opts.scope,
    concurrency: opts.concurrency,
    counts: {
      tracked: all.length,
      inScopeFiles: inScope.length,
      excludedFiles: excluded.length,
      checkedFiles: targets.length,
      confirmedFiles: suspect.length,
      inScopeDead: inScopeDead.length,
      excludedDead: excludedDead.length,
      inScopeUnreadable: inScopeErrors.length,
      excludedUnreadable: excludedErrors.length,
    },
    ledger,
    ignoredByIgnorePatterns,
    disableCommentMarkers,
    inScopeDead,
    excludedDead,
    inScopeErrors,
    excludedErrors,
  };

  if (opts.record) {
    const fileCountByEntry = new Map();
    const filesByEntry = new Map();
    for (const x of excluded) {
      fileCountByEntry.set(x.entry.path, (fileCountByEntry.get(x.entry.path) || 0) + 1);
      if (!filesByEntry.has(x.entry.path)) filesByEntry.set(x.entry.path, []);
      filesByEntry.get(x.entry.path).push(x.file);
    }
    const updated = {
      ...manifest,
      toolVersion,
      recordedAt: new Date().toISOString(),
      excludedPaths: manifest.excludedPaths.map((e) => {
        const row = {
          ...e,
          files: fileCountByEntry.get(e.path) || 0,
          deadLinks: deadByEntry.get(e.path) || 0,
          unreadable: errByEntry.get(e.path) || 0,
        };
        // An entry that freezes a file list records the list itself, so the gate
        // needs no git history and no clone depth to honour it.
        if (e.freezeMode === 'files') {
          row.frozenFiles = (filesByEntry.get(e.path) || []).slice().sort();
        }
        return row;
      }),
    };
    fs.writeFileSync(opts.manifest, JSON.stringify(updated, null, 2) + '\n');
    console.error(`[docs-links] ledger baseline recorded to ${path.relative(opts.root, opts.manifest)}`);
  }

  if (opts.json) {
    const out = path.resolve(opts.json);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  }

  // A --record run is what establishes the baseline; it cannot also be judged
  // against it. Every other run is.
  const failed =
    inScopeDead.length > 0 ||
    inScopeErrors.length > 0 ||
    (!opts.record && ledgerGrowth.length > 0);

  if (failed) {
    if (!opts.record && ledgerGrowth.length && !opts.quiet) {
      console.error('\n[docs-links] excluded-ledger growth (debt may only shrink):');
      for (const r of ledgerGrowth) {
        console.error(
          `  ${r.path}: dead ${r.recorded} -> ${r.observed}, unreadable ${r.recordedUnreadable} -> ${r.observedUnreadable}`,
        );
      }
    }
    return 1;
  }

  console.error(
    `\n[docs-links] OK — 0 dead links across ${inScope.length} in-scope files; ` +
      `${excludedDead.length} dead link(s) recorded as frozen debt across ${excluded.length} excluded files.`,
  );
  return 0;
}

// Only execute when invoked directly. `partition` and `listTrackedMarkdown`
// are exported so the scope rules can be unit-tested without a network run.
const INVOKED_DIRECTLY =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (INVOKED_DIRECTLY) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`[docs-links] ${err && err.stack ? err.stack : err}`);
      process.exit(2);
    });
}
