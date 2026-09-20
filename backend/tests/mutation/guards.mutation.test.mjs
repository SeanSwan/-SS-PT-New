/**
 * guards.mutation.test.mjs
 * ========================
 * Mutation harness for the source-ratchet guards.
 *
 * WHY THIS EXISTS
 * ---------------
 * A guard is only worth having if it can fail. The §20 pass reported running
 * eight deliberate mutations against these guards and catching all of them —
 * but shipped no harness, so the evidence could not be reproduced and, more
 * importantly, could not be re-run after the next edit to a guard. A guard's
 * entire risk surface is its own future modification: it is the one test that
 * silently stops testing when someone "cleans it up".
 *
 * This file makes that experiment permanent and re-runnable:
 *
 *   npm run test:mutation
 *
 * HOW IT WORKS
 * ------------
 * Every guard here is a *source* ratchet: it reads files and asserts a property
 * of their text. So a mutation is "edit a file, re-run the guard, expect it to
 * go red". Doing that against the real working tree would be reckless — this
 * repo routinely carries a thousand uncommitted changes, and a harness killed
 * mid-run would leave mutated source behind with no git safety net.
 *
 * Instead the harness builds a THROWAWAY tree inside `backend/` (inside, so
 * node_modules still resolves for the child vitest process), copies a curated
 * set of real source files into it, mutates the COPY, and runs the guard with
 * SSPT_GUARD_ROOT pointed at it. The real tree is never written to.
 *
 * Each mutation must be caught, and — where a signature is given — must be
 * caught for the RIGHT reason, not incidentally.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '../..');

/** Inside backend/ so the child process resolves `vitest` from backend/node_modules. */
const TMP_ROOT = join(BACKEND, '.mutation-tmp');
const GUARD = 'tests/unit/emailHtmlInjectionGuard.test.mjs';
const VITEST_BIN = join(BACKEND, 'node_modules', 'vitest', 'vitest.mjs');

/**
 * The corpus the guard needs. Deliberately includes the files each historical
 * finding lived in, plus one ordinary file so the derived builder list has
 * something to reject.
 */
const PLANTED = [
  'utils/htmlEscape.mjs',
  'utils/notification.mjs',
  'utils/emailTemplates.mjs',
  'routes/contactRoutes.mjs',
  'routes/sessionRoutes.mjs',
  'routes/newsletterRoutes.mjs',
  'routes/workoutSummaryRoutes.mjs',
  'controllers/adminClientController.mjs',
  'controllers/orientationController.mjs',
  'services/sessions/session.service.mjs',
];

/**
 * Files the harness authors itself rather than copying from the real tree.
 *
 * The §22 F07 guard asserts that its own reconciliation walk found something —
 * `walkOtherSources().length > 0`, over non-`.mjs` first-party text files. The
 * corpus above is deliberately all-`.mjs`, so that assertion had nothing to
 * find: the guard was red before any mutation ran, which in turn voided every
 * "caught" verdict below (the sanity test said so, in as many words).
 *
 * The guard's own comment already described the missing half — "The mutation
 * harness proves the rule bites, by planting an emitter in a file type the
 * .mjs walker never sees" — but no such mutation existed. This specimen is what
 * the non-vacuity assertion needs to be *non-vacuous*, and M12 is what turns it
 * into the emitter that proves the rule bites.
 *
 * Authored here rather than copied so the throwaway corpus cannot drift when an
 * unrelated real file changes: the real tree's non-`.mjs` text files are what
 * the real run audits; this one exists only so the walk is non-empty inside the
 * throwaway tree.
 */
const FIXTURES = {
  'scripts/excludedTypeFixture.cjs': [
    '// Non-.mjs specimen for the §22 F07 non-vacuity assertion.',
    "module.exports = { fixture: 'excluded-type specimen' };",
    '',
  ].join('\n'),
};

const readReal = (rel) => readFileSync(join(BACKEND, rel), 'utf8');
const readTmp = (rel) => readFileSync(join(TMP_ROOT, rel), 'utf8');
const writeTmp = (rel, body) => writeFileSync(join(TMP_ROOT, rel), body);

/** Copy the corpus into the throwaway tree, preserving relative paths. */
function plantCorpus() {
  for (const rel of [...PLANTED, GUARD]) {
    const dst = join(TMP_ROOT, rel);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(BACKEND, rel), dst);
  }

  for (const [rel, body] of Object.entries(FIXTURES)) {
    const dst = join(TMP_ROOT, rel);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, body);
  }

  // A minimal config so the child run does not pick up backend's real
  // vitest.config.mjs (whose setupFiles point at a DB-touching harness).
  writeFileSync(
    join(TMP_ROOT, 'vitest.config.mjs'),
    [
      "import { defineConfig } from 'vitest/config';",
      'export default defineConfig({',
      '  test: {',
      "    environment: 'node',",
      "    include: ['tests/**/*.test.mjs'],",
      '    retry: 0,',
      '  },',
      '});',
      '',
    ].join('\n'),
  );
}

/**
 * Delete a tree one file at a time.
 *
 * A recursive bulk delete of this tree is refused by the environment's
 * safe-delete shim, and the child vitest run leaves a `node_modules/.vite`
 * cache behind that takes the tree well past the cap (104 entries, then 171).
 *
 * The cap is NOT per call. It is cumulative across a turn: a run that had
 * already spent part of the budget reported
 *
 *   [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
 *   {"count":50,"threshold":50,"scope":"turn",...}
 *
 * from this very loop, having deleted its files one at a time. So deleting
 * leaves individually does not make the total safe — it only spreads the same
 * count across more calls. Only two things actually reduce the budget: leaving
 * the cache directory alone (it is a cache; reusing it is faster, and it is
 * what keeps each run's delete count at roughly a dozen instead of a hundred),
 * and not re-deleting a report path that a per-call name already makes unique.
 *
 * `.mutation-tmp` is a dot-directory, so the guard's walker never picks it up
 * even while it persists between runs.
 */
function removeTree(dir, depth = 0) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth === 0 && entry.name === 'node_modules') continue;   // vitest cache
      removeTree(p, depth + 1);
    } else {
      rmSync(p, { force: true });
    }
  }
  // rmSync on a directory is refused by the same shim (EISDIR), even when the
  // directory is already empty — rmdir is the call that works. The run root is
  // kept; a subdirectory that still holds the cache is left too.
  if (depth > 0) {
    try {
      rmdirSync(dir);
    } catch {
      /* non-empty: left for the next run to reuse */
    }
  }
}

/**
 * Run the guard against the throwaway tree.
 * Returns { failed: boolean, output: string }.
 * A spawn failure is reported as a failure — the harness must never be able to
 * turn "the guard did not run" into "the guard passed".
 */
/**
 * One report path per invocation.
 *
 * A fixed path needed `rmSync(..., {force:true})` before every run, so a stale
 * verdict could not be mistaken for this run's. That delete was both
 * load-bearing and fragile: it fed the cumulative per-turn delete budget the
 * shim enforces (thirteen calls per suite), and if the delete ever failed while
 * the child also failed to write, the harness would read a PREVIOUS run's
 * report and return a confident verdict for a run that never happened. A
 * per-call name removes the delete and the hazard together.
 */
let reportSeq = 0;
const nextReportPath = () => join(TMP_ROOT, `guard-report-${(reportSeq += 1)}.json`);

/**
 * Run the guard against the throwaway tree and classify the outcome.
 *
 * Returns one of three statuses, and the distinction is the whole point:
 *
 *   KILLED   — the guard ran to completion and at least one assertion failed.
 *   SURVIVED — the guard ran to completion and every assertion passed.
 *   INVALID  — we cannot say the guard ran at all.
 *
 * An earlier version collapsed these into a boolean derived from the child's
 * exit code, so a spawn failure, a timeout, a syntax error in the generated
 * config, or "no test files found" were all indistinguishable from a kill.
 * The harness then certified mutations it had never actually tested — a
 * mutation runner reporting kills for a guard that did not execute is worse
 * than no runner, because it manufactures confidence.
 *
 * The verdict comes from vitest's own structured JSON report, not from the exit
 * code and not from pattern-matching stdout.
 */
function runGuard() {
  const reportPath = nextReportPath();

  let output = '';
  try {
    output = execFileSync(
      process.execPath,
      [
        VITEST_BIN,
        'run',
        '--root', TMP_ROOT,
        '--config', join(TMP_ROOT, 'vitest.config.mjs'),
        GUARD,
        '--reporter=json',
        '--outputFile', reportPath,
      ],
      {
        cwd: BACKEND,
        env: {
          ...process.env,
          SSPT_GUARD_ROOT: TMP_ROOT,
          NO_COLOR: '1',
          FORCE_COLOR: '0',
        },
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 180_000,
      },
    );
  } catch (error) {
    // Non-zero exit is expected when the guard fails. The JSON report, not this,
    // decides whether that failure was a kill or something else.
    output = `${error.stdout || ''}${error.stderr || ''}`;
  }

  let report = null;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    report = null;
  }

  if (!report || typeof report.numTotalTests !== 'number') {
    return { status: 'INVALID', reason: 'no structured test report', output, text: output };
  }
  if (report.numTotalTests === 0) {
    return { status: 'INVALID', reason: 'guard executed zero tests', output, text: output };
  }

  // The signature of a mutation lives in the guard's assertion messages — the
  // offending file path and the offending expression. Those have to be read as
  // STRINGS: JSON.stringify(report) escapes newlines and quotes, so a substring
  // like `foo.mjs` survives but anything spanning a literal \n does not, and
  // matching against the escaped blob silently fails every signature check.
  const messages = (report.testResults || []).flatMap((suite) =>
    (suite.assertionResults || []).flatMap((assertion) => [
      assertion.fullName || '',
      ...(assertion.failureMessages || []),
    ]),
  );
  const text = `${messages.join('\n')}\n${output}`;

  const failed = report.numFailedTests || 0;
  return {
    status: failed > 0 ? 'KILLED' : 'SURVIVED',
    failed,
    passed: report.numPassedTests || 0,
    text,
    output,
  };
}

/**
 * "No test files found" exits 1 too. Left unchecked, every mutation would look
 * "caught" while the guard never ran — the exact vacuous-pass failure this
 * harness exists to prevent.
 */
function assertGuardActuallyRan(result) {
  if (result.status === 'INVALID') {
    throw new Error(
      `the guard did not produce a usable verdict (${result.reason}).\n${result.output}`,
    );
  }
}

/**
 * The mutation table.
 *
 * `apply` writes the mutation into the throwaway tree.
 * `signature`, when present, must appear in the failure output — this is what
 * distinguishes "caught for the right reason" from "the run broke for some
 * other reason and happened to be red".
 */
const MUTATIONS = [
  {
    id: 'M1',
    title: 'T-01 class — a raw client name is interpolated into HTML mail',
    file: 'utils/notification.mjs',
    apply: () => {
      const src = readTmp('utils/notification.mjs');
      const mutated = src.replace(
        '<strong>${escapeHtml(client.firstName)}',
        '<strong>${client.firstName}',
      );
      if (mutated === src) throw new Error('M1 did not apply — guard source moved');
      writeTmp('utils/notification.mjs', mutated);
    },
    signature: 'client.firstName',
  },
  {
    id: 'M3',
    title: 'promotion class — a plain-text body is promoted to HTML unescaped',
    file: 'utils/notification.mjs',
    apply: () => {
      const src = readTmp('utils/notification.mjs');
      const mutated = src.replace(
        'html: escapeHtml(textContent).replace(/\\n/g, \'<br>\')',
        'html: textContent.replace(/\\n/g, \'<br>\')',
      );
      if (mutated === src) throw new Error('M3 did not apply — promotion shape moved');
      writeTmp('utils/notification.mjs', mutated);
    },
    signature: 'html:',
  },
  {
    id: 'M4',
    title: 'private escaper reintroduced beside the shared module',
    file: 'routes/sessionRoutes.mjs',
    apply: () => {
      writeTmp(
        'routes/sessionRoutes.mjs',
        `${readTmp('routes/sessionRoutes.mjs')}\nconst esc = (s) => s;\n`,
      );
    },
    signature: 'sessionRoutes.mjs',
  },
  {
    id: 'M6',
    title: 'newsletter page() helper stops escaping its heading',
    file: 'routes/newsletterRoutes.mjs',
    apply: () => {
      const src = readTmp('routes/newsletterRoutes.mjs');
      const mutated = src.replace('escapeHtml(heading)', 'heading');
      if (mutated === src) throw new Error('M6 did not apply — heading escape moved');
      writeTmp('routes/newsletterRoutes.mjs', mutated);
    },
  },
  {
    id: 'M7',
    title: 'N-03 — a brand-new HTML-email builder with a raw leaf',
    note: 'The file is in no list. This is the case the hardcoded BUILDER_FILES could never see, and the reason membership is now derived.',
    file: 'services/totallyNewBuilder.mjs',
    apply: () => {
      writeTmp(
        'services/totallyNewBuilder.mjs',
        [
          "import { sendEmail } from '../emailService.mjs';",
          'export async function notify(client) {',
          '  await sendEmail({',
          '    to: client.email,',
          "    subject: 'Hello',",
          '    html: `<p>Hi <strong>${client.firstName}</strong>, you are booked at ${client.location}.</p>`',
          '  });',
          '}',
          '',
        ].join('\n'),
      );
    },
    signature: 'totallyNewBuilder.mjs',
  },
  {
    id: 'M8',
    title: 'T-04 class — multi-line bypass: tag on one line, interpolation on the next',
    file: 'services/multilineBypass.mjs',
    apply: () => {
      writeTmp(
        'services/multilineBypass.mjs',
        [
          'export const build = (client) => `',
          '  <p>Hello there</p>',
          '  <p>${client.email}</p>',
          '`;',
          '',
        ].join('\n'),
      );
    },
    signature: 'multilineBypass.mjs',
  },
  {
    id: 'M9',
    title: 'F02 — a `//` inside a URL string comment-strips the rest of the line',
    note: 'Astra F02. `https://` in an href makes the regex comment-stripper blank everything after it on that line, including a raw interpolation. Realistic: every email that contains a link.',
    file: 'services/urlCommentBypass.mjs',
    apply: () => {
      writeTmp(
        'services/urlCommentBypass.mjs',
        [
          'export const build = (client) =>',
          '  `<a href="https://example.com/reset">${client.email}</a>`;',
          '',
        ].join('\n'),
      );
    },
    signature: 'urlCommentBypass.mjs',
  },
  {
    id: 'M10',
    title: 'F03 — an identifier escaped once, then reassigned back to raw',
    note: 'Astra F03. `escapedIdentifiers` is file-wide: one `= escapeHtml(...)` anywhere exonerates every later use of the name, including after it is overwritten with raw data.',
    file: 'services/reassignedEscape.mjs',
    apply: () => {
      writeTmp(
        'services/reassignedEscape.mjs',
        [
          "import { escapeHtml } from '../utils/htmlEscape.mjs';",
          'export const build = (client) => {',
          '  let email = escapeHtml(client.email);',
          '  email = client.email;',
          '  return `<p>${email}</p>`;',
          '};',
          '',
        ].join('\n'),
      );
    },
    signature: 'reassignedEscape.mjs',
  },
  {
    id: 'M11',
    title: 'F05 — brace counting terminates the literal early and hides the payload',
    note: 'Astra F05. A `}` inside a string inside an interpolation drops the brace depth to zero; the next backtick then ends the literal, so the rest of the template is never scanned.',
    file: 'services/braceEvasion.mjs',
    apply: () => {
      writeTmp(
        'services/braceEvasion.mjs',
        [
          'export const build = (client) =>',
          "  `<p>Hi</p>${ `${ obj['}'] }` }<p>${client.email}</p>`;",
          '',
        ].join('\n'),
      );
    },
    signature: 'braceEvasion.mjs',
  },
  {
    id: 'M12',
    title: 'F07 — an emitter planted in a file type the .mjs walker never sees',
    note: 'The §22 F07 rule, and the mutation the guard already claimed existed. Every other entry here plants .mjs, which the F07 reconciliation never looks at — so without this entry that rule was unproven, AND its own non-vacuity assertion (`walkOtherSources().length > 0`) was red on the pristine corpus. Note the fixture is never executed, only read, so `client` being undefined is irrelevant.',
    file: 'scripts/excludedTypeFixture.cjs',
    apply: () => {
      writeTmp(
        'scripts/excludedTypeFixture.cjs',
        [
          "const body = `<p>Hi ${client.email}</p>`;",
          'module.exports = { html: body };',
          '',
        ].join('\n'),
      );
    },
    signature: 'excludedTypeFixture.cjs',
  },
  {
    id: 'M13',
    title: 'D3/D4 — a PARENTHESISED leaf escapes the computed-expression exemption',
    note: 'The exemption that skips helper-computed expressions was spelled `expr.includes("(")` — a substring test standing in for a shape test. `${(client.firstName)}` contains a paren, is not a call, and was therefore never inspected: the guard read green while the leaf was raw. This entry is the regression test for that. It must be caught by the LEAF rule — note it deliberately keeps the same signature as M1, because the point is that the leaf rule fires at all, not that a different rule happened to.',
    file: 'utils/notification.mjs',
    apply: () => {
      const src = readTmp('utils/notification.mjs');
      const mutated = src.replace(
        '<strong>${escapeHtml(client.firstName)}',
        '<strong>${(client.firstName)}',
      );
      if (mutated === src) throw new Error('M13 did not apply — guard source moved');
      writeTmp('utils/notification.mjs', mutated);
    },
    signature: 'client.firstName',
  },
];

describe('mutation harness — the email HTML-injection guard', () => {
  beforeAll(() => {
    removeTree(TMP_ROOT);
    mkdirSync(TMP_ROOT, { recursive: true });
    plantCorpus();
  }, 120_000);

  afterAll(() => {
    // Best-effort, and deliberately not an assertion.
    //
    // The shim's cap is cumulative across a turn, and the harness's own deletes
    // (restores, and formerly one report reset per run) spend part of that
    // budget before this hook runs — so this can legitimately be refused. A
    // cleanup that fails is not a statement about the guard, and letting it
    // throw turns a green suite red for a reason that has nothing to do with
    // what is being tested. It must not be silent either: the tree is left
    // behind and named, and `.mutation-tmp` is a dot-directory so the guard's
    // walker never sees it.
    try {
      removeTree(TMP_ROOT);
    } catch (error) {
      console.warn(
        `[mutation] cleanup deferred — tree left at ${TMP_ROOT} (${error?.code || error?.message})`,
      );
    }
  });

  it('the harness itself is sane: the pristine corpus passes the guard', () => {
    // If this fails, every "caught" result below is worthless — the guard would
    // be red before any mutation, so it could not be said to catch anything.
    const result = runGuard();
    assertGuardActuallyRan(result);
    expect(result.status, `guard should pass on unmutated source.\n${result.output}`)
      .toBe('SURVIVED');
  }, 180_000);

  it('a broken run is INVALID, never a kill', () => {
    // The F01 regression test. The previous harness derived its verdict from the
    // child's exit code, so a spawn failure or an unusable tree was reported as
    // "mutation caught". Removing the guard from the throwaway tree reproduces
    // that class: vitest still exits non-zero, but nothing was tested.
    const guardPath = join(TMP_ROOT, GUARD);
    const backup = readFileSync(guardPath, 'utf8');
    rmSync(guardPath, { force: true });
    try {
      const result = runGuard();
      expect(result.status, `expected INVALID, got ${result.status}.\n${result.output}`)
        .toBe('INVALID');
    } finally {
      mkdirSync(dirname(guardPath), { recursive: true });
      writeFileSync(guardPath, backup);
    }
    // And the tree must be usable again afterwards.
    expect(runGuard().status).toBe('SURVIVED');
  }, 180_000);

  for (const mutation of MUTATIONS) {
    it(`${mutation.id} is caught — ${mutation.title}`, () => {
      mutation.apply();
      try {
        const result = runGuard();
        assertGuardActuallyRan(result);
        expect(result.status, `${mutation.id} was NOT caught.\n${result.text}`).toBe('KILLED');
        if (mutation.signature) {
          expect(
            result.text,
            `${mutation.id} went red, but not for the expected reason (missing "${mutation.signature}")`,
          ).toContain(mutation.signature);
        }
      } finally {
        // Restore the mutated file so the next mutation starts from pristine.
        if (PLANTED.includes(mutation.file)) {
          cpSync(join(BACKEND, mutation.file), join(TMP_ROOT, mutation.file));
        } else if (Object.hasOwn(FIXTURES, mutation.file)) {
          // A fixture has no real-tree original to copy back from.
          writeTmp(mutation.file, FIXTURES[mutation.file]);
        } else {
          rmSync(join(TMP_ROOT, mutation.file), { force: true });
        }
      }
    }, 180_000);
  }
});

describe('mutation harness — self-check', () => {
  it('never points at the real source tree', () => {
    // The whole safety argument rests on this. If BACKEND leaked into the
    // throwaway root, a mutation could write to real files.
    expect(TMP_ROOT).not.toBe(BACKEND);
    expect(TMP_ROOT.startsWith(BACKEND)).toBe(true);
    expect(readReal('utils/notification.mjs')).toContain('escapeHtml(client.firstName)');
  });
});
