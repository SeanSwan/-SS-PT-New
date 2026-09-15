/**
 * Round-4 MAJOR 3 regression check, with a real HTTP server reproducing the
 * reviewer's scenario:
 *   A: one file holding a real 404 AND an intermittent 500-then-200 link
 *   B: the same intermittent link alone
 * Before the fix, A reported the intermittent link as dead while B reported it
 * alive â€” the same link, two answers, depending only on what shared its file.
 *
 * Expected after the fix, both runs:
 *   A -> exit 1, exactly one dead link (the 404); the flaky link is NOT reported.
 *   B -> exit 0, no dead links.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execFile as execFileRaw } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFileRaw);

const BIND = '127.0.0.1';

let flakyHits = 0;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/flaky')) {
    flakyHits += 1;
    res.statusCode = flakyHits % 3 === 0 ? 200 : 500;
    res.end(res.statusCode === 200 ? 'ok' : 'boom');
    return;
  }
  if (req.url.startsWith('/dead404')) {
    res.statusCode = 404;
    res.end('nope');
    return;
  }
  res.statusCode = 200;
  res.end('ok');
});

await new Promise((r) => server.listen(0, BIND, r));
const port = server.address().port;
const base = `http://${BIND}:${port}`;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 's17-flaky-'));

fs.mkdirSync(path.join(root, 'scripts', 'ci'), { recursive: true });
fs.mkdirSync(path.join(root, '.github'), { recursive: true });
const here = process.cwd();
fs.copyFileSync(path.join(here, 'scripts/ci/check-docs-links.mjs'), path.join(root, 'scripts/ci/check-docs-links.mjs'));

// The real config, with ONLY the loopback ignorePatterns removed. Those patterns
// would match this harness's server and skip every link before it is checked,
// which would make the probe vacuous. Nothing else about the config differs, and
// ignorePatterns have no bearing on what is being tested here (transient
// classification and the per-link merge on retry).
const realConfig = JSON.parse(fs.readFileSync(path.join(here, '.github/markdown-link-check-config.json'), 'utf8'));
realConfig.ignorePatterns = realConfig.ignorePatterns.filter(
  (p) => !/localhost|127\.0\.0\.1/.test(String(p.pattern)),
);
fs.writeFileSync(
  path.join(root, '.github/markdown-link-check-config.json'),
  JSON.stringify(realConfig, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(root, 'scripts/ci/docs-link-scope.json'),
  JSON.stringify({ purpose: 'flaky-harness', toolVersion: '3.14.2', excludedPaths: [] }, null, 2) + '\n',
);
// Link the real dependency tree in. NOTE: remove it with `rmdir`, never
// `Remove-Item -Recurse` â€” PowerShell follows a junction and empties the target.
// The .gitignore must exist BEFORE the first `git add`, or the harness tracks the
// whole dependency tree and the run sweeps thousands of files instead of one doc.
execFileSync('cmd', ['/c', 'mklink', '/J', path.join(root, 'node_modules'), path.join(here, 'node_modules')], {
  stdio: 'ignore',
});
fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');

execFileSync('git', ['init', '-q'], { cwd: root });
execFileSync('git', ['add', '-A'], { cwd: root });
execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x'], { cwd: root });

const run = async (doc) => {
  fs.writeFileSync(path.join(root, 'doc.md'), doc);
  execFileSync('git', ['add', '-A'], { cwd: root });
  flakyHits = 0;
  // MUST be async. spawnSync blocks this process's event loop, so the harness's
  // own HTTP server could not accept a connection while the gate ran â€” every link
  // came back as a connection error and the probe measured nothing.
  try {
    const { stdout, stderr } = await execFileP('node', ['scripts/ci/check-docs-links.mjs'], { cwd: root });
    return { code: 0, out: `${stdout}${stderr}`, hits: flakyHits };
  } catch (err) {
    return { code: err.code, out: `${err.stdout || ''}${err.stderr || ''}`, hits: flakyHits };
  }
};

const both = await run(`# A\n\n- [real 404](${base}/dead404)\n- [flaky](${base}/flaky)\n`);
const alone = await run(`# B\n\n- [flaky](${base}/flaky)\n`);

console.log('--- raw output A ---');
console.log(both.out.slice(0, 1200));
console.log('--- raw output B ---');
console.log(alone.out.slice(0, 800));

const deadIn = (r) => (r.out.match(/dead link\(s\) IN SCOPE/g) || []).length;
const reports404 = /dead404/.test(both.out);
const reportsFlaky = /\/flaky/.test(both.out);

console.log('SCENARIO A (404 + flaky in one file)');
console.log('  exit       :', both.code, '(expect 1)');
console.log('  reports 404:', reports404, '(expect true)');
console.log('  reports flaky as dead:', reportsFlaky, '(expect FALSE after the fix)');
console.log('  flaky hits :', both.hits);
console.log('SCENARIO B (flaky alone)');
console.log('  exit       :', alone.code, '(expect 0)');
console.log('  reports flaky as dead:', /\/flaky/.test(alone.out), '(expect false)');
console.log('  flaky hits :', alone.hits);

const pass =
  both.code === 1 && reports404 && !reportsFlaky && alone.code === 0 && !/\/flaky/.test(alone.out);
console.log(`\n${pass ? 'PASS' : 'FAIL'} â€” consistent labelling across both scenarios`);
server.close();
try {
  execFileSync('cmd', ['/c', 'rmdir', path.join(root, 'node_modules')], { stdio: 'ignore' });
} catch {
  /* best effort */
}
fs.rmSync(root, { recursive: true, force: true });
process.exit(pass ? 0 : 1);

