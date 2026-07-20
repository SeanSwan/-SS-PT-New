/**
 * clientRecord.mjs — durable per-client workout records, local-only.
 * ==================================================================
 *
 * BLUEPRINT
 * ---------
 * PURPOSE
 *   Turn parsed dictation into the thing Sean believed already existed: one markdown file per client,
 *   holding their workout history in date order, readable without any tool.
 *
 * PRIVACY MODEL — the load-bearing part (Rules 8 / 44 / 59)
 *   These files contain real client training data and possibly real names. They are Sean's local business
 *   records, so names are permitted — but the files must be structurally incapable of reaching anywhere
 *   they'd be exposed. Three mechanical guarantees, each enforced in `resolveRecordRoot()`:
 *     1. NEVER inside the git repo        → cannot be committed, cannot reach GitHub.
 *     2. NEVER inside the Hermes vault    → cannot be swept into `build_index` and become FTS-searchable
 *                                            by every MCP consumer (this is exactly the `--include-private`
 *                                            exposure class, avoided by construction rather than by flag).
 *     3. Explicit root, no silent default → refuses to write to a surprising location.
 *   A `.gitignore` containing `*` is written into the root on creation as belt-and-braces, so the directory
 *   stays untracked even if someone later relocates it under a repo.
 *
 * FORMAT
 *   Markdown with a YAML header. Append-only per session block. Chosen so the record survives this tooling:
 *   if every script here is deleted, the files remain readable and useful forever. The corpus is the asset.
 *
 * @module clientRecord
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';

/** Directory names that must never contain client records, checked against the resolved path. */
const FORBIDDEN_SEGMENTS = ['brain-vault', 'collections', 'node_modules', '.git'];

/**
 * Normalise any timestamp Hermes might hand us into an ISO string.
 * Hostile review 2026-07-20: Hermes' `messages.timestamp` is a UNIX EPOCH (the dry run printed
 * `[1784228678]` as a "date"), and the old code sliced it into a garbage `## 1784228678` day heading.
 * Accepts epoch seconds, epoch millis, or any Date-parsable string; throws on garbage rather than
 * silently misdating a client's training record.
 */
export function normalizeDateIso(input) {
  if (input == null || String(input).trim() === '') {
    throw new Error('client-notes: missing timestamp');
  }
  const s = String(input).trim();
  if (typeof input === 'number' || /^\d{9,13}(\.\d+)?$/.test(s)) {
    let n = Number(s);
    if (n < 1e12) n *= 1000; // epoch seconds → millis
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) throw new Error(`client-notes: unusable epoch timestamp "${s}"`);
    return d.toISOString();
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`client-notes: unusable timestamp "${s}"`);
  return d.toISOString();
}

/** Walk ancestors looking for a `.git` marker. `existsSync` follows symlinks/junctions, so a link
 *  that points back into a repo is caught here too. */
function hasGitAncestor(absPath) {
  let cur = resolve(absPath);
  for (;;) {
    if (existsSync(join(cur, '.git'))) return true;
    const parent = dirname(cur);
    if (parent === cur) return false;
    cur = parent;
  }
}

/** Real path of the deepest EXISTING ancestor, so symlinked roots are validated at their target. */
function realExistingPath(absPath) {
  let cur = resolve(absPath);
  while (!existsSync(cur)) {
    const parent = dirname(cur);
    if (parent === cur) return cur;
    cur = parent;
  }
  try { return realpathSync(cur); } catch { return cur; }
}

/** Shared segment/repo checks, applied to both the lexical path and its resolved real path. */
function assertPathSafe(abs, repo) {
  if (abs === repo || abs.startsWith(repo + sep)) {
    throw new Error(`client-notes: refusing to write client data inside the git repo (${abs})`);
  }
  const segments = abs.split(/[\\/]+/).map((s) => s.toLowerCase());
  for (const bad of FORBIDDEN_SEGMENTS) {
    if (segments.includes(bad)) {
      throw new Error(`client-notes: refusing to write under a "${bad}" path — it risks being indexed (${abs})`);
    }
  }
  if (hasGitAncestor(abs)) {
    throw new Error(`client-notes: refusing — a .git repository is an ancestor of ${abs}; client data must never be commitable`);
  }
}

/**
 * Resolve and validate the record root. Throws rather than writing somewhere unsafe.
 *
 * Hostile review 2026-07-20 closed two holes in the original:
 *   1. The repo check compared against `repoRoot` (default cwd) only — run from a subdirectory, a
 *      target elsewhere INSIDE the same repo passed the jail. Now every ancestor is walked for `.git`,
 *      so "never inside ANY git repo" is enforced regardless of where the tool is invoked from.
 *   2. A symlink/junction root pointing back into a repo or the vault validated its lexical path only.
 *      The resolved real path is now validated with the same rules.
 *
 * @param {string} root       explicit destination (required — no silent default)
 * @param {string} repoRoot   additionally-asserted repo path (kept for callers/tests)
 */
export function resolveRecordRoot(root, repoRoot = process.cwd()) {
  if (!root || !String(root).trim()) {
    throw new Error('client-notes: record root is required (set SWAN_CLIENT_NOTES_ROOT or pass --root)');
  }
  const abs = resolve(String(root));
  const repo = resolve(String(repoRoot));

  assertPathSafe(abs, repo);
  const real = realExistingPath(abs);
  if (real !== abs) assertPathSafe(real, repo);

  return abs;
}

/** Create the root if needed and drop a `*` .gitignore so it can never become tracked. */
export function ensureRecordRoot(root, repoRoot = process.cwd()) {
  const abs = resolveRecordRoot(root, repoRoot);
  mkdirSync(abs, { recursive: true });
  const ignore = join(abs, '.gitignore');
  if (!existsSync(ignore)) {
    writeFileSync(ignore, '# Client training records — local only, never tracked.\n*\n');
  }
  return abs;
}

/** Stable, filesystem-safe filename for a client reference. IDs preferred; names slugified. */
export function clientFileName(clientRef) {
  if (!clientRef) throw new Error('client-notes: clientRef is required');
  if (clientRef.kind === 'id') return `client-${clientRef.value}.md`;
  const slug = String(clientRef.value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (!slug) throw new Error('client-notes: client name produced an empty slug');
  return `client-name-${slug}.md`;
}

/** Render one exercise as a markdown bullet. Bodyweight prints without a load; trailing dictation
 *  captured as `note` ("felt heavy", "@ RPE 8") prints in parentheses — preserved, never dropped. */
export function formatExercise(ex) {
  const load = ex.weight == null ? '' : ` @ ${ex.weight}${ex.unit ?? ''}`;
  const note = ex.note ? ` (${ex.note})` : '';
  return `- ${ex.name} — ${ex.sets}×${ex.reps}${load}${note}`;
}

/**
 * Render one dictated session as an appendable markdown block.
 * `unparsed` lines are preserved verbatim as notes — never discarded.
 * The date is normalised (epoch or ISO) BEFORE rendering; a garbage timestamp throws rather than
 * writing a garbage day heading into a client's record.
 */
export function formatSessionBlock({ dateIso, exercises, unparsed = [], sourceRef = null }) {
  const day = normalizeDateIso(dateIso).slice(0, 10);
  const lines = [`\n## ${day}`, ''];
  for (const ex of exercises) lines.push(formatExercise(ex));
  if (unparsed.length) {
    lines.push('', '**Notes:**');
    for (const n of unparsed) lines.push(`- ${n}`);
  }
  if (sourceRef) lines.push('', `<sub>source: ${sourceRef}</sub>`);
  lines.push('');
  return lines.join('\n');
}

/** Header written once per client file. */
function fileHeader(clientRef) {
  const label = clientRef.kind === 'id' ? `Client ${clientRef.value}` : clientRef.value;
  return [
    '---',
    `client_ref: ${clientRef.kind}:${clientRef.value}`,
    'source: hermes-dictation',
    'privacy: LOCAL ONLY — never commit, never index, never send to a cloud model',
    '---',
    '',
    `# ${label} — training record`,
    '',
  ].join('\n');
}

/**
 * True when this exact source message has already been written into the client's record.
 * Idempotency key = the sourceRef line. Hostile review 2026-07-20: without this, re-running
 * export+ingest appended duplicate session blocks — the same double-award class the gamification
 * gotcha list warns about, applied to training records.
 */
export function sessionExists({ root, repoRoot = process.cwd(), clientRef, sourceRef }) {
  if (!sourceRef) return false;
  const abs = resolveRecordRoot(root, repoRoot);
  const file = join(abs, clientFileName(clientRef));
  if (!existsSync(file)) return false;
  return readFileSync(file, 'utf8').includes(`source: ${sourceRef}`);
}

/**
 * Append a dictated session to the client's record, creating the file on first write.
 * Skips silently-visibly (returns {file, skipped:true}) when the same sourceRef is already present.
 * Returns { file, skipped }.
 */
export function appendSession({ root, repoRoot = process.cwd(), clientRef, dateIso, exercises, unparsed, sourceRef }) {
  if (!exercises?.length) throw new Error('client-notes: refusing to write a session with no exercises');
  const abs = ensureRecordRoot(root, repoRoot);
  const file = join(abs, clientFileName(clientRef));
  if (sourceRef && existsSync(file) && readFileSync(file, 'utf8').includes(`source: ${sourceRef}`)) {
    return { file, skipped: true };
  }
  // Format BEFORE any write: a throwing timestamp must not leave an empty header-only record behind.
  const block = formatSessionBlock({ dateIso, exercises, unparsed, sourceRef });
  if (!existsSync(file)) writeFileSync(file, fileHeader(clientRef));
  appendFileSync(file, block);
  return { file, skipped: false };
}

/** Read a client's record back (for verification/inspection). Returns null when absent. */
export function readRecord({ root, repoRoot = process.cwd(), clientRef }) {
  const abs = resolveRecordRoot(root, repoRoot);
  const file = join(abs, clientFileName(clientRef));
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

const DAY_HEADING = /^## (\d{4}-\d{2}-\d{2})$/gm;

/**
 * Regenerate INDEX.md in the record root: one line per client — session count + last session date.
 * The index is a derived, regenerable VIEW; the client files are the asset (the Pass-D discipline).
 * Skips non-client files (`_review-needed.md`, INDEX.md itself, .gitignore).
 */
export function writeIndex({ root, repoRoot = process.cwd() }) {
  // ensure, not resolve: round-3 hostile review — an --apply with zero written sessions reached this
  // with a not-yet-created root and crashed ENOENT on the unconditional write below.
  const abs = ensureRecordRoot(root, repoRoot);
  const rows = [];
  for (const f of readdirSync(abs).sort()) {
    if (!f.startsWith('client-') || !f.endsWith('.md')) continue;
    const body = readFileSync(join(abs, f), 'utf8');
    const days = [...body.matchAll(DAY_HEADING)].map((m) => m[1]);
    rows.push({ file: f, sessions: days.length, last: days.length ? days.sort().at(-1) : '—' });
  }
  const lines = [
    '# Client records — index',
    '',
    '> Generated view — regenerate any time; the client files are the source of truth.',
    '',
    '| Client file | Sessions | Last session |',
    '|---|---|---|',
    ...rows.map((r) => `| ${r.file} | ${r.sessions} | ${r.last} |`),
    '',
  ];
  const file = join(abs, 'INDEX.md');
  writeFileSync(file, lines.join('\n'));
  return { file, clients: rows.length };
}
