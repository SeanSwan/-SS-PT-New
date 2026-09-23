/**
 * blueprint-master-evidence.regression.test.mjs — Round 2 order 4 / lane C2
 * ==========================================================================
 * This file MATERIALIZES ASTRA'S MATRIX A (Round 2 `09-tests.md`) — the fixture and cases are
 * reproduced as specified, because the cases are the acceptance evidence.
 *
 * What this harness does
 * ----------------------
 * It loads the SHIPPED checker (`blueprint-master-evidence.test.mjs`) into a `vm.SourceTextModule`
 * with synthetic module resolution, so that:
 *   - `node:fs`  is a virtual filesystem built from an in-memory map (nothing on disk is touched);
 *   - `node:child_process` throws on any call, proving the case never shells out to Git;
 *   - `node:test` is captured, so the checker's REAL registered callbacks can be invoked directly.
 *
 * It therefore exercises the checker's actual callback bodies — not a reimplementation and not a
 * helper — against artifacts whose hashes are all VALID. That is the point (R2-06): the question is
 * not whether the bytes match their hash, but whether the checker INTERPRETS them.
 *
 * "Renaming or disconnecting a callback is a setup/wiring failure, not a successful negative case."
 * `callbacks()` asserts every named callback exists before any case runs.
 *
 * Run: node --experimental-vm-modules --test scripts/blueprint-master-evidence.regression.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(
  new URL('./blueprint-master-evidence.test.mjs', import.meta.url), 'utf8');

const names = {
  run: 'admission: required behavior evidence',
  review: 'admission: ordered filed reviews',
  copies: 'preflight: preservation',
};
const sha = b => createHash('sha256').update(b).digest('hex');

function fixture() {
  const files = new Map();
  const base = path.resolve(tmpdir(), 'master-r2-virtual');
  const key = p => path.resolve(p);
  const store = (p, value) => {
    const b = Buffer.from(value);
    files.set(key(p), b);
    return { path: key(p), sha256: sha(b) };
  };
  const put = (name, value) => store(path.join(base, name), value);
  const json = (name, value) => put(name, JSON.stringify(value));

  const copyA = path.join(base, 'copy-a');
  const copyB = path.join(base, 'copy-b');
  store(path.join(copyA, 'a.txt'), 'preserved');
  store(path.join(copyB, 'a.txt'), 'preserved');

  const inventory = json('inventory.json', [
    { path: 'a.txt', sha256: sha(Buffer.from('preserved')) },
  ]);
  const copies = [
    { root: copyA, storageId: 'fixture-volume-a' },
    { root: copyB, storageId: 'fixture-volume-b' },
  ];
  const storageAttestation = json('storage.json', {
    schemaVersion: 1,
    sourceId: 'fixture-source',
    inventorySha256: inventory.sha256,
    copies,
  });
  const budgetRecord = json('budget.json', {
    policyId: 'fixture-policy', authorized: true, additionalSpend: 0,
  });
  const snapshot = {
    git: { root: path.join(base, 'source') },
    requiredTestIds: ['PRODUCT-01'],
    preservation: [{
      sourceId: 'fixture-source', inventory, storageAttestation, copies,
    }],
    reviewPolicy: {
      policyId: 'fixture-policy',
      authorityRefs: ['fixture-authority'],
      orderedSeats: ['fixture-seat'],
      finalAuthority: 'fixture-seat',
      budgetRecord,
    },
  };

  function archiveText(hash, verdict = 'CLEAN') {
    return [
      '---',
      'review_id: fixture-review',
      'date_local: 2026-09-20',
      'date_utc: 2026-09-20T00:00:00Z',
      'subject: synthetic regression fixture',
      'reviewer_agent: fixture-agent',
      'reviewer_seat: fixture-seat',
      'round: 1',
      'repo: fixture',
      `repo_path: ${JSON.stringify(snapshot.git.root)}`,
      'branch: fixture',
      `commit: ${'a'.repeat(40)}`,
      'scope: synthetic evidence validation only',
      `verdict: ${verdict}`,
      'defects: {"critical":0,"high":0,"medium":0,"low":0}',
      'unproven: 0',
      'supersedes: null',
      'superseded_by: null',
      'tags: [fixture]',
      'status: published',
      '---',
      `Snapshot-SHA256: ${hash}`,
      'Admission-Decision: APPROVE',
    ].join('\n');
  }

  function finish(kind) {
    if (kind === 'alias') copies[1].root = copies[0].root;

    // R2-10 fixture. The registry is a SEPARATE artifact from the snapshot, so it needs its own
    // document tree. Only the four shapes the registry check reads are emitted: a canonical package
    // path, one authority per lane, one document per lane, and the aliases array.
    if (kind && kind.startsWith('registry:')) {
      const variant = kind.slice('registry:'.length);
      const dirs = [
        'BLUEPRINT-cinematic-frontend-2026-09-19',
        'BLUEPRINT-coach-cc-ai-harness-2026-09-20',
        'BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14',
        'BLUEPRINT-social-bridge-completion-2026-09-19',
        'BLUEPRINT-speed-to-lead-email-2026-07-16',
        'BLUEPRINT-swan-brain-console-v3-merge-2026-09-18',
        'BLUEPRINT-swan-native-mobile-2026-07-13',
        'BLUEPRINT-theme-lens-2026-09-20',
      ];
      const base = 'docs/ai-workflow/AI-HANDOFF/';
      const lanes = [];
      dirs.forEach((dir, index) => {
        const i = index + 1;
        const canonical = `${base}${dir}`;
        store(path.join(snapshot.git.root, canonical, 'README.md'), `lane ${i}`);
        const authorityPath = `${canonical}/AUTHORITY.md`;
        store(path.join(snapshot.git.root, authorityPath), `authority ${i}`);
        // R2-10's second bypass is ONE document that is simultaneously cited as an authority AND
        // marked REJECTED, so in the rejected variant the document path IS the authority path.
        // A separate rejected-but-uncited document would test nothing.
        const rejectThis = variant === 'rejected' && i === 1;
        const docPath = rejectThis ? authorityPath : `${canonical}/DOC.md`;
        store(path.join(snapshot.git.root, docPath), `document ${i}`);
        // Hostile review round 3 (record 31) variants — each injects ONE bypass of the R2-10 repair.
        // `alias-of-rejected`: the authority's `aliasOf` names the REJECTED document, so the rejected
        //   document is cited as an authority through its alias. The first repair read `path` only.
        const aliasOfRejected = variant === 'alias-of-rejected' && i === 1;
        if (aliasOfRejected) {
          // The document is rejected AND reachable as the authority's alias target.
          store(path.join(snapshot.git.root, `${canonical}/DEAD.md`), 'rejected doc');
        }
        // `bad-precedence`: -1 and 0 pass Number.isInteger but are not an ordering.
        // `dup-precedence`: two authorities tie, which is not a total order.
        const precedence = variant === 'bad-precedence' && i === 1
          ? -1
          : (variant === 'dup-precedence' && i === 1 ? 1 : 1);
        lanes.push({
          id: `L${i}`,
          canonicalPackagePath: canonical,
          // The R2-10 bypasses, injected only in their named variant. `bare-alias` mirrors the SHIPPED
          // registry's shape (a historical bare directory name) and is a CONTROL: it must be accepted.
          // `path-alias` is path-shaped and must be REJECTED — mixing names with paths is what made
          // the original uniqueness check inert.
          aliases: variant === 'escape' && i === 1 ? ['../../unrelated']
            : variant === 'bare-alias' && i === 1 ? ['BLUEPRINT-coach-ai-harness-20260920']
              : variant === 'path-alias' && i === 1 ? ['docs/ai-workflow/AI-HANDOFF/somewhere-else']
                : [],
          authorities: [
            {
              path: authorityPath,
              scope: `lane ${i} product scope`,
              precedence,
              ...(aliasOfRejected ? { aliasOf: `${canonical}/DEAD.md` } : {}),
            },
            // `dup-precedence` needs a SECOND authority that ties with the first.
            ...(variant === 'dup-precedence' && i === 1 ? [{
              path: `${canonical}/AUTHORITY-2.md`,
              scope: `lane ${i} second scope`,
              precedence: 1,
            }] : []),
          ],
          documents: [
            {
              path: docPath,
              status: rejectThis ? 'REJECTED' : 'ACTIVE',
              permittedUse: 'fixture use',
            },
            ...(aliasOfRejected ? [{
              path: `${canonical}/DEAD.md`,
              status: 'REJECTED',
              permittedUse: 'none',
            }] : []),
          ],
        });
      });
      // A second authority declared by `dup-precedence` must exist on disk, or the failure would come
      // from `path exists` rather than from the precedence order — which would not test the order.
      if (variant === 'dup-precedence') {
        store(path.join(snapshot.git.root,
          'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/AUTHORITY-2.md'),
        'second authority');
      }
      // `masterPackagePath` must point at an existing directory for the registry's own base check.
      store(path.join(snapshot.git.root, 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-master-reconciliation-2026-09-20/README.md'), 'master');
      const registry = {
        schemaVersion: 1,
        masterPackagePath: 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-master-reconciliation-2026-09-20',
        lanes,
      };
      const registryRef = store(
        path.join(snapshot.git.root, 'docs/ai-workflow/AI-HANDOFF/package-registry.json'),
        JSON.stringify(registry));
      // `registryPath` must be REPOSITORY-RELATIVE (localFile rejects absolute paths and drive
      // letters). Derive it with the path module rather than string surgery on an absolute path.
      snapshot.registryPath = path.relative(
        snapshot.git.root,
        path.join(snapshot.git.root, 'docs/ai-workflow/AI-HANDOFF/package-registry.json'),
      ).split(path.sep).join('/');
      if (!snapshot.registryPath) snapshot.registryPath = registryRef.path;
    }

    const snapshotRef = json('snapshot.json', snapshot);
    const hash = snapshotRef.sha256;
    const report = {
      schemaVersion: 1, id: 'PRODUCT-01', command: 'fixture-command',
      snapshotSha256: hash, outcome: 'PASS', exitCode: 0,
    };
    const output = kind === 'garbage'
      ? put('run.json', 'not a test result')
      : json('run.json', report);

    const archive = store(
      path.resolve('Z:/HostileReviews/fixture-review.md'),
      archiveText(hash, kind === 'review' ? 'DEFECTS-FOUND' : 'CLEAN'));

    const receipt = {
      snapshot: snapshotRef,
      tests: [{ ...report, output }],
      reviews: [{
        reviewId: 'fixture-review', seat: 'fixture-seat',
        decision: 'APPROVE', snapshotSha256: hash, archive,
        terminalEvidence: json('terminal.json', {
          reviewId: 'fixture-review', seat: 'fixture-seat',
          snapshotSha256: hash, decision: 'APPROVE', terminal: true,
        }),
        identityEvidence: json('identity.json', {
          seat: 'fixture-seat', identityVerified: true,
          servedModel: 'synthetic-fixture',
        }),
      }],
      unresolvedFindings: [],
    };
    return json('receipt.json', receipt).path;
  }

  return { files, key, finish };
}

async function callbacks(kind) {
  const f = fixture();
  const receiptPath = f.finish(kind);
  const jobs = new Map();
  const context = vm.createContext({
    process: { env: { BLUEPRINT_RECEIPT: receiptPath } },
  });

  const children = p => {
    const prefix = f.key(p) + path.sep;
    return [...new Set([...f.files.keys()]
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length).split(path.sep)[0]))];
  };
  const isDir = p => children(p).length > 0;
  const fakeFs = {
    readFileSync(p, encoding) {
      const b = f.files.get(f.key(p));
      if (!b) throw new Error(`Fixture file missing: ${p}`);
      return encoding === 'utf8' ? b.toString('utf8') : b;
    },
    lstatSync(p) {
      if (!f.files.has(f.key(p)) && !isDir(p)) {
        throw new Error(`Fixture path missing: ${p}`);
      }
      return {
        isSymbolicLink: () => false,
        isFile: () => f.files.has(f.key(p)),
      };
    },
    readdirSync(p) {
      return children(p).map(name => {
        const full = path.join(p, name);
        return {
          name, isSymbolicLink: () => false,
          isDirectory: () => isDir(full),
          isFile: () => f.files.has(f.key(full)),
        };
      });
    },
  };
  const modules = {
    'node:test': { default: (name, fn) => jobs.set(name, fn) },
    'node:assert/strict': { default: assert },
    'node:fs': fakeFs,
    'node:path': path,
    'node:crypto': { createHash },
    'node:child_process': {
      spawnSync() { throw new Error('Unexpected Git/process call'); },
    },
  };
  const subject = new vm.SourceTextModule(source, { context });
  await subject.link(specifier => {
    const values = modules[specifier];
    if (!values) throw new Error(`Unexpected import: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) {
        this.setExport(name, value);
      }
    }, { context });
  });
  await subject.evaluate();
  for (const name of Object.values(names)) {
    assert.equal(typeof jobs.get(name), 'function', `Missing callback: ${name}`);
  }
  return jobs;
}

test('AT-01 valid synthetic evidence control', async () => {
  const jobs = await callbacks();
  for (const name of Object.values(names)) jobs.get(name)();
});

for (const [id, kind, check, code] of [
  ['AT-02', 'garbage', names.run, 'E_RUN_REPORT_INVALID'],
  ['AT-03', 'review', names.review, 'E_REVIEW_CONTENT'],
  ['AT-04', 'alias', names.copies, 'E_COPY_ALIAS'],
]) {
  test(`${id} rejects ${kind} for its designated reason`, async () => {
    const control = await callbacks();
    control.get(check)();
    const mutated = await callbacks(kind);
    assert.throws(mutated.get(check), error =>
      String(error?.message).includes(code));
  });
}

/* ---------------------------------------------------------------------------
 * R2-10 — A filesystem-generated registry is not an authority validator.
 *
 * Astra named two bypasses:
 *   1. "An alias such as `../../unrelated` can participate in the uniqueness comparison without
 *      being passed through `localFile()`."
 *   2. "An authority can be an existing but incorrect document."
 *
 * Each case below first runs the CONTROL in the same fixture shape (registry: clean) and requires
 * it to pass, so a failure cannot be produced by fixture breakage.
 * ------------------------------------------------------------------------- */
const registry = 'preflight: registry';

test('AT-05 valid synthetic registry control', async () => {
  const jobs = await callbacks('registry:clean');
  jobs.get(registry)();
});

test('AT-06 rejects an alias that escapes the repository for its designated reason', async () => {
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:escape');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_ALIAS_INVALID'));
});

test('AT-07 rejects a REJECTED document cited as an authority for its designated reason', async () => {
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:rejected');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_AUTHORITY_UNBOUND'));
});

/* ---------------------------------------------------------------------------
 * HOSTILE REVIEW ROUND 3 (record 31) — attacks on the R2-10 repair ITSELF.
 *
 * AT-05/06/07 tested the two bypasses ASTRA had already named. These test the four the repair left
 * open, plus two controls that must NOT be rejected (a fix that breaks correct data is not a fix).
 *
 * Every negative case is paired with the control in the same fixture shape, so a failure cannot be
 * manufactured by fixture breakage.
 * ------------------------------------------------------------------------- */

test('AT-08 rejects an authority whose aliasOf names a REJECTED document', async () => {
  // H-01 — the guard read `a.path` and never followed `aliasOf`, so a rejected document could be
  // cited as an authority through a second name.
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:alias-of-rejected');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_AUTHORITY_UNBOUND'));
});

test('AT-09 rejects negative precedence for its designated reason', async () => {
  // H-02 — Number.isInteger(-1) is true, so -1 passed. R2-10 requires precedence be validated
  // against the applicable authority decision; a negative value orders nothing.
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:bad-precedence');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_PRECEDENCE_INVALID'));
});

test('AT-10 rejects a tied precedence, because a tie is not a total order', async () => {
  // H-02 (second form) — `unique` caught duplicates with a bare "Duplicate values", so the failure
  // was not attributable to precedence. It now names E_PRECEDENCE_INVALID and the colliding values.
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:dup-precedence');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_PRECEDENCE_INVALID'));
});

test('AT-11 accepts a historical bare-name alias (control for the shipped registry shape)', async () => {
  // H-05 CONTROL — the shipped registry records historical directory NAMES, and their targets were
  // later renamed, so they are supposed to be dead strings. A fix that rejected them would reject
  // correct data. This is the case that caught my first FIX-05.
  const jobs = await callbacks('registry:bare-alias');
  jobs.get(registry)();
});

test('AT-12 rejects a path-shaped alias, which made the uniqueness check inert', async () => {
  // H-05 — the real defect was admitting aliases into a PATH-collision set they could never enter,
  // so uniqueness reported success without testing its subject. Names and paths must not share one
  // collision space.
  const control = await callbacks('registry:clean');
  control.get(registry)();
  const mutated = await callbacks('registry:path-alias');
  assert.throws(mutated.get(registry), error =>
    String(error?.message).includes('E_ALIAS_INVALID'));
});
