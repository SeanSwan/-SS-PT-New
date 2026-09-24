#!/usr/bin/env node
/** Read-only conservative guard: disk=HEAD plus index divergence may be stale index.
 * Exit 0: no suspicion, 1: inspect staged paths, 2: cannot establish a result.
 * Never resyncs an index; legitimate staged reversions may need manual review.
 */
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function inspectIndex(repo = process.cwd()) {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' };
  const git = (args) => {
    const r = spawnSync('git', ['-C', repo, ...args], { env, timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
    if (r.error || r.signal || r.status !== 0) throw new Error(`Git ${args[0]} failed (exit ${r.status ?? 'unavailable'}).`);
    return r.stdout;
  };
  // No explicit HEAD argument: Git also supports staged files before the first commit.
  const args = ['diff', '--cached', '--raw', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', '--abbrev=64'];
  const snapshot = git(args);
  const records = snapshot.toString('utf8').split('\0');
  const rows = [];
  for (let i = 0; i < records.length - 1; i += 2) {
    const match = records[i].match(/^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])$/);
    if (!match || !records[i + 1]) throw new Error('Malformed staged Git record.');
    const [, oldMode, newMode, oldOid, newOid, status] = match;
    const path = records[i + 1];
    if (status === 'U') throw new Error('Unmerged index needs conflict resolution.');
    const row = { status, path, kind: 'staged-change' };
    rows.push(row);
    if (/^0+$/.test(oldOid) || oldOid === newOid) continue; // addition or mode-only
    if (oldMode === '160000' || newMode === '160000') throw new Error('Changed submodule requires manual index review.');
    let disk;
    try {
      const full = join(repo, path);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) disk = Buffer.from(readlinkSync(full));
      else if (stat.isFile()) disk = readFileSync(full);
      else throw new Error('Changed path is not a regular file or symlink.');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const head = git(['cat-file', 'blob', oldOid]);
    const textEqual = !head.includes(0) && !disk.includes(0)
      && head.toString('latin1').replace(/\r\n/g, '\n') === disk.toString('latin1').replace(/\r\n/g, '\n');
    if (head.equals(disk) || textEqual) row.kind = status === 'D' ? 'suspected-stale-deletion' : 'suspected-stale-reversion';
  }
  // A changing HEAD/index must not turn a stale snapshot into a green receipt.
  if (!snapshot.equals(git(args))) throw new Error('HEAD or index changed during inspection; retry after writers finish.');
  return { staged: rows.length, hazards: rows.filter(r => r.kind.startsWith('suspected-')).length, rows };
}

export function main(argv = process.argv.slice(2)) {
  try {
    let repo = process.cwd(); let json = false;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--json') json = true;
      else if (argv[i] === '--repo' && argv[i + 1] && !argv[i + 1].startsWith('--')) repo = resolve(argv[++i]);
      else throw new Error('Usage: index-drift-guard.mjs [--repo path] [--json]');
    }
    const report = inspectIndex(repo);
    if (json) console.log(JSON.stringify(report));
    else {
      console.log(`[index-drift] staged=${report.staged}, suspicious=${report.hazards}`);
      for (const row of report.rows.filter(r => r.kind.startsWith('suspected-'))) console.error(`  ${row.status} ${JSON.stringify(row.path)}: disk matches HEAD; review selected index before committing.`);
    }
    return report.hazards ? 1 : 0;
  } catch (error) {
    // Do not print raw Git output or file contents.
    console.error(`[index-drift] check failed: ${error.code || error.message}`);
    return 2;
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = main();
