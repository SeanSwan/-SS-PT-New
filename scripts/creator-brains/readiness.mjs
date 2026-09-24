#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/readiness.mjs
 * PURPOSE: The SINGLE source of truth for the requirement-to-test mapping, and
 *          the generator for the readiness receipt + its markdown rendering.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR26)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 *   node scripts/creator-brains/readiness.mjs --check     # verify, write nothing
 *   node scripts/creator-brains/readiness.mjs --write     # regenerate JSON + table
 *
 * WHY A GENERATOR (review HR26):
 *   The finding's core complaint was that a receipt carried claims no reader could
 *   reconcile with the artifacts: a status that contradicted another status, a
 *   mutation count that did not match the mutation table, counts that were stale.
 *   A hand-maintained table drifts the moment a test is renamed. Here the mapping
 *   is DATA; the JSON receipt the readiness gate consumes and the markdown table in
 *   the blueprint are both rendered from it, and the evidence hashes are computed
 *   from the files on disk. `--write` cannot produce a receipt whose hashes are
 *   stale, and `readiness.test.mjs` fails if the committed rendering is out of date.
 *
 * WHAT IS *NOT* AUTOMATED, ON PURPOSE:
 *   Whether a mapping is HONEST. `T-OFFLINE` really does run the whole offline
 *   suite, but no script can decide that a finding is truly repaired. The gate's
 *   own output says the same thing: structure is not behaviour.
 *
 * RUNNING IT IN THE RIGHT ORDER:
 *   `--write` needs every evidence file to exist, and the gate's own log is one of
 *   them, so the sequence is: `--write` → run the gate (writes its log) → `--write`
 *   again so the log's hash is the current one → run the gate once more to confirm
 *   the receipt it now sees is the one that passes. The gate's output is a pure
 *   function of the receipt's structure, so the second and third runs produce
 *   identical bytes and the hashes stop moving.
 *
 * @module creator-brains/readiness
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const HANDOFF = join(REPO, 'docs', 'ai-workflow', 'AI-HANDOFF');
const RECEIPT_PATH = join(HANDOFF, 'CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json');
const TABLE_PATH = join(HANDOFF, 'CREATOR-BRAINS-REQUIREMENT-MAP-2026-09-13.md');

/** Evidence files, named once. Paths are relative to the receipt's directory.
 *
 *  NOTE ON THE REVIEW PACKET: the hostile-review packet lives OUTSIDE this
 *  checkout (a second working copy), and the readiness gate confines every
 *  evidence reference to the receipt's own root. The packet is therefore cited in
 *  `reviewIdentity` as a path string, and the EVIDENCE is the instrument output
 *  this tree produced by running it. */
export const EVIDENCE = {
  offline: 'CREATOR-BRAINS-EVIDENCE-OFFLINE-SUITE-2026-09-13.txt',
  live: 'CREATOR-BRAINS-HR23-LIVE-2026-09-13.txt',
  reproduce: 'CREATOR-BRAINS-EVIDENCE-REVIEWER-INSTRUMENTS-2026-09-13.txt',
  mutations: 'CREATOR-BRAINS-EVIDENCE-MUTATIONS-2026-09-13.txt',
  gate: 'CREATOR-BRAINS-EVIDENCE-READINESS-GATE-2026-09-13.txt',
  hr22red: 'CREATOR-BRAINS-HR22-RED-2026-09-13.txt',
  hr23red: 'CREATOR-BRAINS-HR23-RED-2026-09-13.txt',
  hashes: 'CREATOR-BRAINS-HR23-SOURCE-HASHES-2026-09-13.txt',
  record: 'CREATOR-BRAINS-REVIEW-REPAIR-RECORD-2026-09-13.md',
  blueprint: 'CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md',
  map: 'CREATOR-BRAINS-REQUIREMENT-MAP-2026-09-13.md',
};

/** Who reviewed, what they said, and what was done about it — stated, not implied.
 *  No past or missing review is recorded here as passed. */
export const REVIEW_IDENTITY = {
  packet: 'docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/ (canonical, in this repo since the R2/N9 repair)',
  verdict: 'REVISE',
  findings: 26,
  instruments: ['reproduce.mjs (20 invariant checks)', 'transport-probes.mjs (4 transport checks)'],
  intake: 'reproduced 20/20 and 4/4 against the reviewed revision before any repair',
  final: 'the same instruments report 0/20 and 0/4, exit 0, against this revision',
  adapted: 'TWO diagnostic call sites were adapted, each marked REPAIR-ADAPT with a header: HR09 (it read a display-name directory that HR07 correctly removed) and HR07 (it asserted equal slugs, which is now correctly true). Every other diagnostic runs unmodified.',
  adjudications: 'per-finding dispositions: repair record §0 table and §2.1',
  notClaimed: 'the review is NOT recorded as approved: no reviewer has re-reviewed the repairs, and none is recorded as passing them.',
};

const SUITE = 'node --experimental-test-isolation=none --test scripts/creator-brains/test/*.test.mjs';

/**
 * The tests: a command, the requirements it covers, its status, and evidence.
 * `T-OFFLINE` is one entry rather than 25 because the suite is run as a unit and
 * its log is the evidence; the per-finding test ids are carried in `proves`.
 */
export const TESTS = [
  {
    id: 'T-OFFLINE',
    command: `${SUITE} (excluding live.test.mjs)`,
    status: 'PASS',
    requirements: ['HR01', 'HR02', 'HR03', 'HR04', 'HR05', 'HR06', 'HR07', 'HR08', 'HR09',
      'HR10', 'HR11', 'HR12', 'HR13', 'HR14', 'HR15', 'HR16', 'HR17', 'HR18', 'HR19',
      'HR20', 'HR21', 'HR22', 'HR23', 'HR24', 'HR25'],
    evidence: [EVIDENCE.offline, EVIDENCE.hr22red, EVIDENCE.hr23red],
    proves: '172/172 offline tests green; the HR22 and HR23 RED logs are the pre-repair runs of the same files',
  },
  {
    id: 'T-LIVE',
    command: 'CREATOR_BRAINS_LIVE=1 node --experimental-test-isolation=none --test scripts/creator-brains/test/live.test.mjs',
    status: 'PASS',
    requirements: ['HR19', 'HR22'],
    evidence: [EVIDENCE.live],
    proves: 'real yt-dlp: probe, subtitle fetch, multi-tab census, channel resolution — 6/6',
  },
  {
    id: 'T-REPRODUCE',
    command: 'REVIEW_SOURCE_ROOT=<this tree> node <packet>/reproduce.mjs',
    status: 'PASS',
    requirements: ['HR01', 'HR02', 'HR03', 'HR04', 'HR05', 'HR06', 'HR07', 'HR08', 'HR09',
      'HR10', 'HR11', 'HR12', 'HR13', 'HR14', 'HR15', 'HR16', 'HR17', 'HR18'],
    evidence: [EVIDENCE.reproduce],
    proves: "the reviewer's own instrument reports 0/20 invariant violations, exit 0",
  },
  {
    id: 'T-PROBES',
    command: 'REVIEW_SOURCE_ROOT=<this tree> node <packet>/transport-probes.mjs',
    status: 'PASS',
    requirements: ['HR19', 'HR20', 'HR21'],
    evidence: [EVIDENCE.reproduce],
    proves: "the reviewer's transport probes report 0/4, exit 0 — including the argv allowlist and cross-process run ids",
  },
  {
    id: 'T-MUTATIONS',
    command: 'node scripts/creator-brains/mutation-check.mjs',
    status: 'PASS',
    requirements: ['HR09', 'HR18', 'HR22', 'HR23', 'HR24', 'HR25', 'HR26', 'HR01'],
    evidence: [EVIDENCE.mutations],
    proves: '10/10 mutations killed by a named test, every file restored byte-for-byte; the six that survived the first run are the gaps this slice closed',
  },
  {
    id: 'T-GATE',
    command: 'node scripts/build-protocol/check-readiness.mjs <this receipt>',
    status: 'PASS',
    requirements: ['HR26'],
    evidence: [EVIDENCE.gate, EVIDENCE.map],
    proves: 'the installed readiness integrity gate reports structurallyReady with no errors against this receipt',
  },
];

/** The requirements: the 26 findings, each with its acceptance and its tests. */
export const REQUIREMENTS = [
  ['HR01', 'The rolling-hour transport budget is persistent across invocations, is counted in transport operations, and a tripped cap DEFERS with a reason rather than reporting a clean zero.', ['T-OFFLINE', 'T-REPRODUCE', 'T-MUTATIONS']],
  ['HR02', 'A creator selection is honoured exactly: naming one creator never widens into fetching everybody, and a disabled or unknown target is refused.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR03', 'Every command\u2019s exit code follows the run verdict (0 ok / 1 failed / 2 refused / 3 deferred), never the fact that a line was printed.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR04', 'A damaged state.json blocks the run and is never overwritten by a lenient default; direct callers hit the same refusal.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR05', 'A damaged registry.json blocks the run and cannot be replaced by `add`; the owner\u2019s enable/disable decisions are authoritative state.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR06', 'always/never keep OPPOSITE polarity and never merge into one doctrine; polarity is a first-class field.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR07', 'Two channels with the same display name never share a brain namespace or a generation, and no display-name directory exists.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR08', 'Reconciliation runs before scheduling: a `fetched` row with no valid document is re-queued, and a creator with no readable documents publishes an EMPTY generation instead of serving yesterday\u2019s.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR09', 'Every published generation passes the fidelity gate over its FINAL serialized bytes; a failing generation is quarantined and the previous one stays current.', ['T-OFFLINE', 'T-MUTATIONS', 'T-REPRODUCE']],
  ['HR10', 'The OAuth lane states its true status at every stage: exchange, consent and pagination are implemented and offline-tested; live authorization has NOT been performed and `sync` says so.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR11', 'A document revision is recorded when bytes change, an unchanged rewrite adds no revision, and a tampered document is detected rather than hashed clean.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR12', 'A walk that was not certified complete cannot confirm a deletion; a tab inside a title cannot drop a row; an empty-but-successful answer is inconclusive.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR13', 'Cue timings are validated at the engine boundary: finite, non-negative, ordered — a negative cue never becomes a citation.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR14', 'One writer per store: a cross-process lock refuses a second run with a recorded outcome, is never stolen on age alone, and temp names are unique per writer.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR15', 'A contradiction requires the SAME assertion with opposite polarity; compatible caution and directive labels do not conflict.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR16', 'Every outcome leaves a record: startup refusals, no-ops and lock-blocked runs write a run journal entry, a run record and a digest; last SUCCESS is tracked separately.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR17', 'An invalid document is a coverage GAP, never counted as covered, and gap rows are deduped by video id.', ['T-OFFLINE', 'T-REPRODUCE']],
  ['HR18', 'Authority is established from the authoritative records: the video\u2019s channel, the registry row and the enabled flag must agree with the named creator, and a mismatch costs no network call.', ['T-OFFLINE', 'T-MUTATIONS', 'T-REPRODUCE']],
  ['HR19', 'A probe that cannot be understood is a SHAPE ERROR (transient), never "no captions"; a machine-translated track is refused rather than attributed to the creator.', ['T-OFFLINE', 'T-LIVE', 'T-PROBES']],
  ['HR20', 'yt-dlp argv is CONSTRUCTED from an allowlist operation model; no caller passes flags, and every read-only operation carries --ignore-config, --no-config-locations and --skip-download.', ['T-OFFLINE', 'T-PROBES']],
  ['HR21', 'Run ids are unique across processes, and a saved run reports whether it overwrote an earlier record.', ['T-OFFLINE', 'T-PROBES']],
  ['HR22', 'Incremental discovery and a periodic AUTHORITATIVE census are separate modes; a census is resumable across runs through a per-channel checkpoint, walks every tab before it may judge, and is the only walk allowed to confirm a deletion.', ['T-OFFLINE', 'T-LIVE', 'T-MUTATIONS']],
  ['HR23', 'A run is bounded in work and time and cannot be set unbounded; a 429 or bot check opens a persisted cooldown every later invocation honours; the backlog is visible with age, projection and the repair action; the no-caption window is configurable and defaults to 48h.', ['T-OFFLINE', 'T-MUTATIONS']],
  ['HR24', 'rules.jsonl rows carry schema_version, doc_revision, the support window, explicit polarity, condition, extractor, `validation: candidate` and citation_status — and no surface claims a verified rule.', ['T-OFFLINE', 'T-MUTATIONS']],
  ['HR25', 'DURABLE input is separable from DERIVED output: backup copies and hashes, verify re-hashes, restore targets an isolated root, and derived rollback cannot reach the transcript archive.', ['T-OFFLINE', 'T-MUTATIONS']],
  ['HR26', 'One authoritative status and receipt, a complete requirement-to-test mapping, REPRODUCIBLE mutation definitions, exact source hashes, and no past or missing review recorded as passed.', ['T-GATE', 'T-MUTATIONS']],
];

/** Non-requirement sections the gate expects, each with its evidence. */
export const SECTIONS = {
  baseline: [EVIDENCE.record],
  requirements: [EVIDENCE.blueprint],
  blueprint: [EVIDENCE.blueprint],
  flowchart: [EVIDENCE.blueprint],
  contracts: [EVIDENCE.blueprint],
  tests: [EVIDENCE.offline, EVIDENCE.live],
  traceability: [EVIDENCE.record],
  slices: [EVIDENCE.blueprint],
  review: [EVIDENCE.reproduce, EVIDENCE.mutations],
  preservation: [EVIDENCE.hashes],
  wireframes: { status: 'N/A', reason: 'Headless CLI engine: there is no UI surface to wireframe (stated as N/A in the blueprint §3).' },
  state: [EVIDENCE.blueprint],
  sequence: [EVIDENCE.blueprint],
  erd: [EVIDENCE.blueprint],
  permissions: [EVIDENCE.blueprint],
  privacy: [EVIDENCE.record],
  operations: [EVIDENCE.record],
};

// E3 (2026-09-24): hash LF-NORMALIZED bytes, matching check-readiness.mjs. Raw
// bytes pinned the author's checkout line endings — a receipt generated on a
// CRLF checkout failed every LF checkout (readiness.test R1/R2, measured).
const sha256 = (path) => createHash('sha256').update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const evidenceRef = (name) => ({
  path: name,
  sha256: sha256(join(HANDOFF, name)),
});

export function buildReceipt() {
  return {
    schemaVersion: 1,
    phase: 'implementation',
    ui: false,
    project: 'creator-brains (SS-PT acquisition engine)',
    revision: {
      note: 'The engine is UNCOMMITTED working-tree state. This hash manifest is the revision marker.',
      manifest: EVIDENCE.hashes,
      manifestSha256: sha256(join(HANDOFF, EVIDENCE.hashes)),
    },
    reviewIdentity: REVIEW_IDENTITY,
    blockers: [],
    nextSlice: 'HR10 live authorization (owner action: create the Desktop OAuth client, set the '
      + 'consent screen to In production, run `cli.mjs authorize`, then `cli.mjs sync`), and the '
      + 'deferred semantic-retrieval work, which is NOT claimed anywhere in this receipt.',
    scope: {
      implemented: ['acquisition', 'storage', 'publication', 'query', 'export', 'candidate extraction', 'OAuth adapter/consent/pagination (offline-tested)'],
      partial: ['candidate extraction is labelled candidate, never verified'],
      deferred: ['semantic retrieval (lexical search only)'],
      notBuilt: [],
      notRun: ['live OAuth authorization', 'vault copy to the headless machine (owner-run)'],
      unreconciled: ['Creator_Brains_History_and_Build_Spec.md is MISSING; nothing here supersedes it'],
    },
    sections: Object.fromEntries(Object.entries(SECTIONS).map(([id, value]) => {
      if (Array.isArray(value)) return [id, { status: 'COMPLETE', evidence: value.map(evidenceRef) }];
      return [id, { status: value.status, reason: value.reason }];
    })),
    requirements: REQUIREMENTS.map(([id, acceptance, tests]) => ({ id, acceptance, tests })),
    tests: TESTS.map((t) => ({
      id: t.id,
      command: t.command,
      requirements: t.requirements,
      status: t.status,
      proves: t.proves,
      evidence: t.evidence.map(evidenceRef),
    })),
  };
}

/** The markdown rendering of the SAME data, for the blueprint. */
export function renderTable() {
  const lines = [
    '<!-- GENERATED by scripts/creator-brains/readiness.mjs --write. Do not hand-edit. -->',
    '',
    `**Status: ${TESTS.length} test entries · ${REQUIREMENTS.length} requirements · every finding HR01–HR26 mapped.**`,
    'The receipt the readiness gate consumes is',
    '[`CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json`](CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json);',
    'this table is rendered from the same source, so the two cannot disagree.',
    '',
    '| Finding | Acceptance (what is asserted) | Tests |',
    '|---|---|---|',
    ...REQUIREMENTS.map(([id, acceptance, tests]) => `| **${id}** | ${acceptance} | ${tests.join(', ')} |`),
    '',
    '| Test | Command | Status | Evidence |',
    '|---|---|---|---|',
    ...TESTS.map((t) => `| **${t.id}** | \`${t.command}\` | ${t.status} | ${t.evidence.join('<br>')} |`),
    '',
    'Each test entry names the file its log lives in. `T-OFFLINE` covers the whole offline',
    'suite as one command because that is how it is run, and the per-finding test ids are in',
    'the repair record §0 and §3.',
    '',
  ];
  return `${lines.join('\n')}`;
}

const args = process.argv.slice(2);

if (args.includes('--write')) {
  // ORDER MATTERS: the table is evidence of the receipt, so it must exist (and be
  // final) before the receipt hashes it.
  writeFileSync(TABLE_PATH, renderTable(), 'utf8');
  const receipt = buildReceipt();
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  process.stdout.write(`wrote ${relative(REPO, TABLE_PATH)}\nwrote ${relative(REPO, RECEIPT_PATH)}\n`);
} else {
  const receipt = buildReceipt();
  process.stdout.write(`${JSON.stringify({
    requirements: receipt.requirements.length,
    tests: receipt.tests.length,
    evidenceFiles: new Set(receipt.tests.flatMap((t) => t.evidence.map((e) => e.path))).size,
  }, null, 2)}\n--check only: nothing written. Use --write to regenerate.\n`);
}
