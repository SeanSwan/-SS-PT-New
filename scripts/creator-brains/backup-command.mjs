#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/backup-command.mjs
 * PURPOSE: `backup`, `restore`, `verify-backup` and `rollback` — the operator
 *          surface for the durable archive (review HR25).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR25)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THESE ARE COMMANDS AND NOT AUTOMATIC BEHAVIOUR:
 *   A backup that runs itself on a schedule nobody configured is a backup nobody
 *   knows the location of. These are explicit, they print where they wrote, and
 *   `restore` refuses to touch a non-empty target — because the whole point of
 *   HR25 is that the previous rollback instruction destroyed the archive.
 *
 *   `rollback` is the corrected replacement for "delete the store". It
 *   unpublishes DERIVED output and cannot reach the transcripts. The command says
 *   so in its output, every time, so the next reader does not have to trust a
 *   comment.
 *
 * @module creator-brains/backup-command
 */

import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  backupStore, verifyBackup, restoreStore, rollbackDerived, listStoreFiles, MANIFEST_NAME,
} from './lib/backup.mjs';
import { paths } from './lib/paths.mjs';
import { EXIT } from './commands.mjs';

const out = (s) => process.stdout.write(`${s}\n`);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/** Remove a backup. Refuses unless the directory really is one. */
export function deleteBackup(dir) {
  if (!existsSync(join(dir, MANIFEST_NAME))) {
    return { ok: false, reason: `refusing to delete '${dir}': it has no backup manifest, so it is not a backup` };
  }
  writeFileSync(join(dir, 'DELETED.txt'), new Date().toISOString(), 'utf-8');
  rmSync(dir, { recursive: true, force: true });
  return { ok: true, deleted: dir };
}

export async function backupCommand({ r, args = [] }) {
  const dest = args.find((a) => !a.startsWith('--'));
  if (!dest) {
    out('usage: cli.mjs backup <destination-directory>');
    out('');
    out('Writes the DURABLE set only — transcripts, registry, state, reservations,');
    out('manifest. Derived output is rebuilt from those, so it is not copied.');
    return EXIT.REFUSED;
  }
  const { durable } = listStoreFiles(r);
  const total = durable.reduce((n, f) => n + f.bytes, 0);
  out(`backing up ${durable.length} durable file(s), ${mb(total)} -> ${dest}`);

  const res = backupStore({ r, dest, includeDerived: args.includes('--with-derived') });
  const verdict = verifyBackup(dest);
  out('');
  out(`wrote ${res.files.length} file(s); identity ${res.durableHash}`);
  out(`verify: ${verdict.ok ? 'OK' : 'FAILED'} (${verdict.checked}/${verdict.total} hashes match)`);
  for (const p of verdict.problems) out(`  ! ${p.rel}: ${p.problem}`);
  out('');
  out('A backup is a hypothesis until something is restored from it:');
  out(`  node scripts/creator-brains/cli.mjs restore "${dest}" <empty-target-dir>`);
  return verdict.ok ? EXIT.OK : EXIT.FAILED;
}

export async function verifyBackupCommand({ args = [] }) {
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) { out('usage: cli.mjs verify-backup <backup-directory>'); return EXIT.REFUSED; }
  const verdict = verifyBackup(dir);
  out(`verify: ${verdict.ok ? 'OK' : 'FAILED'} — ${verdict.checked}/${verdict.total} hashes match`);
  for (const p of verdict.problems) out(`  ! ${p.rel}: ${p.problem}`);
  return verdict.ok ? EXIT.OK : EXIT.FAILED;
}

export async function restoreCommand({ args = [] }) {
  const positional = args.filter((a) => !a.startsWith('--'));
  const [backupDir, target] = positional;
  if (!backupDir || !target) {
    out('usage: cli.mjs restore <backup-directory> <empty-target-directory>');
    out('');
    out('The target must be EMPTY. Restoring over a live store is the destructive');
    out('operation this command exists to prevent.');
    return EXIT.REFUSED;
  }
  const res = restoreStore({ backupDir, target, force: args.includes('--force') });
  if (!res.ok) {
    out(`REFUSED: ${res.reason}`);
    for (const p of res.problems || []) out(`  ! ${p.rel}: ${p.problem}`);
    return EXIT.REFUSED;
  }
  out(`restored ${res.restored} file(s) into ${res.target}`);
  out(`source identity ${res.sourceHash} — re-verified at the destination, all hashes match`);
  return EXIT.OK;
}

export async function rollbackCommand({ r, args = [] }) {
  const namespace = args.find((a) => !a.startsWith('--')) || null;
  const all = args.includes('--all');
  const res = rollbackDerived({ r, namespace, all });
  if (!res.ok) { out(`refused: ${res.reason}`); return EXIT.REFUSED; }
  out(`unpublished ${res.unpublished.length} brain(s):`);
  for (const p of res.unpublished) out(`  ${p.replace(paths(r).brainsDir, '')}`);
  out('');
  out('DURABLE OUTPUT IS UNTOUCHED. Transcript documents, the registry and the');
  out('reservation journal are exactly as they were — this is the corrected');
  out('replacement for the old "delete the store" instruction.');
  out('Re-run `build` to regenerate the brains from what remains.');
  return EXIT.OK;
}
