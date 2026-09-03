#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/vault-guard.mjs
 * PURPOSE: PreToolUse hook — snapshot blueprint-class docs BEFORE any overwrite.
 * ADDED: 2026-09-01 (Sean: "when the AI overwrites a blueprint or creates a new
 *         one, the previous one is saved — 50, 100 versions back, so we can
 *         always go back just in case")
 * HARDENED: 2026-09-03 after a GLM-5.3 hostile review (SWA-230) — see FINDINGS.
 * ============================================================================
 *
 * WHY THIS EXISTS WHEN GIT EXISTS: git preserves every COMMITTED version
 * forever, and backup-after-work.mjs bundles the whole repo off-machine. The
 * gap is the overwrites that happen BETWEEN commits — an agent rewriting a
 * blueprint five times in one session commits only the last state; the four
 * intermediate versions are gone. This hook catches every one of them.
 *
 * DESIGN — same ethos as backup-after-work.mjs, NOT the blocking gates:
 *   - NEVER blocks. Exits 0 on every path including its own failure. A backup
 *     mechanism that interrupts work gets disabled, and then there is no backup.
 *   - SYNCHRONOUS but tiny — one file copy, milliseconds.
 *   - DEDUPED by content hash — rapid successive edits don't store duplicates.
 *   - PRUNED to VAULT_KEEP versions per file (default 100, Sean's number).
 *   - FAIL-OPEN BUT NOT FAIL-SILENT (F3): every swallowed error is appended to
 *     .ai-workflow/vault/ERRORS.log and echoed to stderr. Exit code stays 0, so
 *     work continues, but a vault that has gone dark is discoverable instead of
 *     quietly protecting nothing.
 *
 * FINDINGS ADDRESSED (GLM-5.3 hostile review, 2026-09-03):
 *   F3  fail-silent catch          -> ERRORS.log + stderr, still exit 0
 *   F5  lexicographic prune order  -> prune by mtime; KEEP validated (NaN was
 *                                     silently disabling prune entirely)
 *   F6  slot-name collision        -> nested slot dirs, no `/`->`__` flattening
 *   F7  classification misses      -> case-insensitive prefixes, realpath, and
 *                                     node_modules/dist excluded; CLAUDE.local.md
 *                                     + nested AGENTS.md + .mdx/.markdown added;
 *                                     the generated-file exclusions are anchored
 *                                     to their real paths, not matched by
 *                                     basename everywhere
 *   F8  junk files ate the quota   -> only well-formed snapshot names count
 *   F9  8-hex dedupe collision     -> 12 hex
 *
 *   F1  Bash writes bypassed it   -> this hook now also accepts a Bash payload
 *                                     and snapshots every vault-class path the
 *                                     command mentions (over-approximating on
 *                                     purpose) BEFORE it runs. Requires `Bash`
 *                                     in the settings.json matcher to fire.
 *
 * KNOWN, DELIBERATE LIMITS (do not mistake for oversights):
 *   - Non-Claude agents (Codex etc.) run no Claude Code hooks at all.
 *   - F2: the vault lives under gitignored `.ai-workflow/`, so `git bundle --all`
 *     (backup-repo.mjs) does NOT carry it off-machine. Verified 2026-09-03.
 *
 * WHERE: .ai-workflow/vault/<relative path>/<UTCstamp>-<sha12><ext>
 * Restore = copy the snapshot back over the file.
 *
 * ENV: SWAN_VAULT_DISABLE=1 (skip), SWAN_VAULT_KEEP (per-file cap, default 100)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const VAULT = path.join(REPO, '.ai-workflow', 'vault');

// F5: `Number('abc')` is NaN, and `Math.max(1, NaN)` is NaN — which made
// `slice(0, length - NaN)` return [] and disabled pruning permanently and
// silently. Validate explicitly instead.
const keepRaw = Number(process.env.SWAN_VAULT_KEEP);
const KEEP = Number.isFinite(keepRaw) && keepRaw >= 1 ? Math.floor(keepRaw) : 100;

// F8: only names this hook wrote may occupy a retention slot. `Thumbs.db` sorts
// after a digit-leading stamp, so it used to survive prune while a real snapshot
// was deleted.
const SNAP_RE = /^\d{8}T\d{6}Z-[0-9a-f]{8,}\./;

function done() { process.exit(0); }

// F3: fail-open must not mean fail-invisible.
function note(rel, err) {
  const line = `${new Date().toISOString()}\t${rel}\t${err && err.message ? err.message : String(err)}\n`;
  try {
    fs.mkdirSync(VAULT, { recursive: true });
    fs.appendFileSync(path.join(VAULT, 'ERRORS.log'), line);
  } catch { /* the log itself is best-effort */ }
  try { process.stderr.write(`[vault] snapshot skipped: ${line}`); } catch { /* ignore */ }
}

export function isVaultClass(rel) {
  const r = rel.replace(/\\/g, '/');
  const lower = r.toLowerCase();                       // F7: case-insensitive FS
  const base = path.posix.basename(lower);

  // Never vault the vault, dependency trees, or build output (F7 over-capture:
  // node_modules ships .mmd diagrams).
  if (lower.startsWith('.ai-workflow/')) return false;
  if (lower.startsWith('node_modules/') || lower.includes('/node_modules/')) return false;
  if (lower.startsWith('dist/') || lower.startsWith('build/') || lower.startsWith('coverage/')) return false;

  // Generated / append-only files: anchored to their real paths so a
  // hand-written doc that merely shares a basename stays protected (F7).
  if (lower === 'docs/ai-workflow/catalog.md') return false;
  if (lower === 'docs/ai-workflow/learning-drops-ledger.md') return false;

  if (/\.(mmd|mermaid)$/.test(lower)) return true;
  if (lower.startsWith('docs/ai-workflow/') && /\.(md|mdx|markdown)$/.test(lower)) return true;

  // Operating files: CLAUDE.md / CLAUDE.local.md / AGENTS.md / SOUL.md /
  // ACTIVE-INDEX.md at the root, plus root SWAN-*.md packets. AGENTS.md is also
  // vaulted when nested (per-directory constitutions are real in this repo).
  if (base === 'agents.md') return true;
  if (!lower.includes('/')) {
    if (/^(claude(\.local)?|soul|active-index)\.md$/.test(base)) return true;
    if (/^swan-.*\.md$/.test(base)) return true;
  }
  return false;
}

function snapshot(absInput) {
  let abs = path.resolve(absInput);
  // F7: a symlinked repo root made path.relative() emit `../…` and the file was
  // silently skipped. Resolve both sides through realpath when possible.
  let repo = REPO;
  try { abs = fs.realpathSync(abs); } catch { /* file may be new; keep resolved */ }
  try { repo = fs.realpathSync(REPO); } catch { /* keep as-is */ }

  const rel = path.relative(repo, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return;   // outside repo
  if (!isVaultClass(rel)) return;
  if (!fs.existsSync(abs)) return;                                    // new file: nothing to preserve

  try {
    const content = fs.readFileSync(abs);
    const sha = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12); // F9
    // F6: keep the real hierarchy. Flattening `/`->`__` was not injective, so
    // `a/b.md` and `a__b.md` shared one slot and one retention budget.
    const slot = path.join(VAULT, rel.replace(/\\/g, '/'));
    fs.mkdirSync(slot, { recursive: true });

    const names = fs.readdirSync(slot).filter((f) => SNAP_RE.test(f));
    if (names.some((f) => f.includes(`-${sha}`))) return;              // already stored

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const ext = path.extname(abs) || '.md';
    fs.writeFileSync(path.join(slot, `${stamp}-${sha}${ext}`), content);

    // F5: prune oldest by real mtime, not by name — a backward clock correction
    // used to make the NEWEST snapshots sort first and get deleted first.
    const entries = fs.readdirSync(slot)
      .filter((f) => SNAP_RE.test(f))
      .map((f) => {
        let m = 0;
        try { m = fs.statSync(path.join(slot, f)).mtimeMs; } catch { /* treat as oldest */ }
        return { f, m };
      })
      .sort((a, b) => (a.m - b.m) || a.f.localeCompare(b.f));
    for (const { f } of entries.slice(0, Math.max(0, entries.length - KEEP))) {
      try { fs.unlinkSync(path.join(slot, f)); } catch { /* best effort */ }
    }
  } catch (err) {
    note(rel, err);
  }
}

/**
/**
 * F1: a Bash command can destroy a blueprint just as thoroughly as an Edit
 * (`sed -i`, `> file`, `mv`, `cp`, `prettier --write`, `git checkout --`), and
 * none of those fire a Write/Edit hook. Confirmed empirically 2026-09-03: a
 * `sed -i` on a real blueprint produced zero snapshots.
 *
 * The parse is deliberately DUMB and over-approximating. Snapshotting a file
 * that was never going to be touched costs one deduped copy; missing one costs
 * the version forever. So: pull every token that looks like a path, plus every
 * blueprint under a mentioned docs directory, and snapshot what is vault-class.
 * Only paths that ALREADY EXIST are considered, so noise tokens cost a stat().
 */
const SCAN_CAP = 400; // a formatter aimed at a whole tree must not stall the turn
const QUOTED = /["'`]([^"'`\n]{2,300})["'`]/g;
const BARE = /[A-Za-z0-9_./-]{2,300}/g;

export function pathsFromCommand(command) {
  if (typeof command !== 'string' || !command) return [];
  const tokens = new Set();
  for (const m of command.matchAll(QUOTED)) tokens.add(m[1]);
  for (const m of command.matchAll(BARE)) tokens.add(m[0]);

  const files = new Set();
  for (const raw of tokens) {
    if (files.size >= SCAN_CAP) break;
    const tok = raw.replace(/^["'`]|["'`]$/g, '').replace(/[),;:]+$/, '');
    if (!tok || tok.startsWith('-')) continue;

    let abs;
    try { abs = path.resolve(REPO, tok); } catch { continue; }
    let st;
    try { st = fs.statSync(abs); } catch { continue; } // only real, existing paths
    if (st.isFile()) { files.add(abs); continue; }
    if (!st.isDirectory()) continue;

    // A directory mention (`prettier --write docs/ai-workflow/`) endangers every
    // blueprint underneath it. Bound the walk to docs/ so `rm -rf node_modules`
    // does not turn into a filesystem crawl.
    const rel = path.relative(REPO, abs).split(String.fromCharCode(92)).join('/').toLowerCase();
    if (!rel || rel.startsWith('..')) continue;
    if (!(rel === 'docs' || rel.startsWith('docs/'))) continue;
    const stack = [abs];
    while (stack.length && files.size < SCAN_CAP) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (files.size >= SCAN_CAP) break;
        const child = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(child); else files.add(child);
      }
    }
  }
  return [...files].slice(0, SCAN_CAP);
}

// Only run the hook body when invoked as a hook — the test suite imports
// isVaultClass/snapshot directly.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  try {
    if (process.env.SWAN_VAULT_DISABLE === '1') done();

    let raw = '';
    try { raw = fs.readFileSync(0, 'utf8'); } catch { done(); }
    let payload;
    try { payload = JSON.parse(raw); } catch { done(); }

    const target = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path;
    if (target) { snapshot(target); done(); }

    // F1: Bash can overwrite a blueprint with no Write/Edit event at all.
    const command = payload?.tool_input?.command;
    if (command) { for (const f of pathsFromCommand(command)) snapshot(f); }
    done();
  } catch (err) {
    note('(hook)', err);
    process.exit(0);
  }
}

export { snapshot, KEEP, VAULT };
