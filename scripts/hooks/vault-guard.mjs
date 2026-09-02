#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/vault-guard.mjs
 * PURPOSE: PreToolUse hook — snapshot blueprint-class docs BEFORE any overwrite.
 * ADDED: 2026-09-01 (Sean: "when the AI overwrites a blueprint or creates a new
 *         one, the previous one is saved — 50, 100 versions back, so we can
 *         always go back just in case")
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
 *   - SYNCHRONOUS but tiny — one file copy, milliseconds. No detach needed.
 *   - DEDUPED by content hash — editing in rapid succession does not store
 *     identical snapshots twice.
 *   - PRUNED to VAULT_KEEP versions per file (default 100, Sean's number).
 *
 * WHAT IT VAULTS (blueprint-class only, not every file in the repo):
 *   - docs/ai-workflow/**\/*.md   (blueprints, wireframe specs, handoffs,
 *     brainstorms, references, design-brain — where the plans live)
 *   - *.mmd / *.mermaid anywhere  (mermaid diagrams)
 *   - root operating files: CLAUDE.md, AGENTS.md, SOUL.md, ACTIVE-INDEX.md
 *   - root SWAN-*-PACKET.md review/decision packets
 *   Excluded: generated/append-only files (CATALOG.md, learning-drops-ledger)
 *   — snapshotting a log on every append is churn, and generated files
 *   regenerate from source.
 *
 * WHERE: .ai-workflow/vault/<relpath with / → __>/<UTCstamp>-<sha8><ext>
 *   .ai-workflow/* is already gitignored, so the vault never bloats git.
 *   Restore = copy the snapshot back over the file. Browse = open the folder.
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
const KEEP = Math.max(1, Number(process.env.SWAN_VAULT_KEEP || 100));

function done() { process.exit(0); }

function isVaultClass(rel) {
  const r = rel.replace(/\\/g, '/');
  const base = path.posix.basename(r).toLowerCase();
  if (base === 'catalog.md' || base === 'catalog.local.md') return false;
  if (base === 'learning-drops-ledger.md') return false;
  if (r.startsWith('.ai-workflow/')) return false; // never vault the vault
  if (/\.(mmd|mermaid)$/i.test(r)) return true;
  if (r.startsWith('docs/ai-workflow/') && r.endsWith('.md')) return true;
  if (!r.includes('/')) {
    if (/^(claude|agents|soul|active-index)\.md$/i.test(base)) return true;
    if (/^swan-.*\.md$/i.test(base)) return true;
  }
  return false;
}

try {
  if (process.env.SWAN_VAULT_DISABLE === '1') done();

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { done(); }
  let payload;
  try { payload = JSON.parse(raw); } catch { done(); }

  const target = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path;
  if (!target) done();

  const abs = path.resolve(target);
  const rel = path.relative(REPO, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) done(); // outside repo
  if (!isVaultClass(rel)) done();
  if (!fs.existsSync(abs)) done(); // new file — nothing to preserve yet

  const content = fs.readFileSync(abs);
  const sha8 = crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
  const slot = path.join(VAULT, rel.replace(/\\/g, '/').replace(/\//g, '__'));
  fs.mkdirSync(slot, { recursive: true });

  // Dedupe: if this exact content is already snapshotted, do nothing.
  const existing = fs.readdirSync(slot).sort(); // UTC-stamp names sort chronologically
  if (existing.some((f) => f.includes(`-${sha8}`))) done();

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const ext = path.extname(abs) || '.md';
  fs.writeFileSync(path.join(slot, `${stamp}-${sha8}${ext}`), content);

  // Prune oldest beyond KEEP.
  const after = fs.readdirSync(slot).sort();
  for (const f of after.slice(0, Math.max(0, after.length - KEEP))) {
    try { fs.unlinkSync(path.join(slot, f)); } catch { /* best effort */ }
  }
  done();
} catch {
  // A vault problem must never become a work-stopping error.
  process.exit(0);
}
