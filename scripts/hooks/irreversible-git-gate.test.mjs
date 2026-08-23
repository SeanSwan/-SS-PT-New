/**
 * irreversible-git-gate.test.mjs — coverage for the Rule 45 gate.
 * Run: node scripts/hooks/irreversible-git-gate.test.mjs
 *
 * The dangerous cases are easy to catch and the innocent ones are easy to catch WRONG.
 * push-blast-radius v2.1 shipped four false positives of exactly this shape — `git
 * commit -m "fix: push handling"` firing a push check, `git commit -m "try -f first"`
 * firing a force-push check — so the allow table below is the more important half.
 * A gate that blocks legitimate commits gets bypassed reflexively, and a reflexively
 * bypassed gate protects nothing.
 */
import assert from 'node:assert/strict';
import { decide, bareCommand } from './irreversible-git-gate.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

const BLOCKS = [
  ['git rebase -i main', 'git rebase -i main'],
  ['git rebase --onto', 'git rebase --onto main feature~3 feature'],
  ['git commit --amend', 'git commit --amend'],
  ['git commit --amend --no-edit', 'git commit --amend --no-edit'],
  ['git commit -m msg --amend (flag after message)', 'git commit -m "wip" --amend'],
  ['git push --force', 'git push --force origin main'],
  ['git push -f', 'git push -f origin main'],
  ['git push --force-with-lease', 'git push --force-with-lease origin main'],
  ['git reset --hard', 'git reset --hard HEAD~1'],
  ['git filter-branch', 'git filter-branch --tree-filter rm -rf secrets HEAD'],
  ['git filter-repo', 'git filter-repo --path secrets --invert-paths'],
  // GLM 5.3, panel 2026-08-23 — verified sailing through before this was added.
  ['git push --no-verify', 'git push --no-verify origin main'],
  ['git commit --no-verify', 'git commit --no-verify -m "skip"'],
  ['git commit -n shorthand', 'git commit -n -m "skip"'],
  ['-C <path> before the subcommand', 'git -C /some/repo rebase main'],
  ['chained after another command', 'npm test && git push --force origin main'],
];

const ALLOWS = [
  ['ordinary commit', 'git commit -m "feat: add thing"'],
  ['commit message merely mentions rebase', 'git commit -m "revert the rebase that broke CI"'],
  ['commit message merely mentions amend', 'git commit -m "amend the docs wording"'],
  ['commit message contains -f', 'git commit -m "try -f first, then fall back"'],
  ['git log searching for amend', 'git log --grep=amend'],
  ['git config reading a rebase key', 'git config --get rebase.autostash'],
  ['ordinary push', 'git push origin my-branch'],
  ['push -u', 'git push -u origin my-branch'],
  ['soft reset', 'git reset --soft HEAD~1'],
  ['plain reset of the index', 'git reset HEAD file.txt'],
  ['status', 'git status --short'],
  ['commit message merely mentions no-verify', 'git commit -m "no-verify was mentioned here"'],
  ['git log searching for no-verify', 'git log --grep=no-verify'],
  ['a non-git command', 'npm run build'],
  ['rebase mentioned only inside single quotes', "echo 'git rebase main'"],
];

for (const [name, cmd] of BLOCKS) {
  t(`BLOCK  ${name}`, () => {
    const r = decide(bash(cmd));
    assert.ok(r, `expected a block reason for: ${cmd}`);
    assert.match(r, /Rule 45/);
  });
}
for (const [name, cmd] of ALLOWS) {
  t(`allow  ${name}`, () => {
    assert.equal(decide(bash(cmd)), null, `expected allow for: ${cmd}`);
  });
}

t('the documented escape works', () => {
  assert.ok(decide(bash('git rebase main')), 'sanity: blocked without the marker');
  assert.equal(decide(bash('SWAN_RULE45_OK=1 git rebase main')), null);
});

t('non-Bash tools are not this gate\'s business', () => {
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: 'x' } }), null);
});

t('bareCommand strips both quote styles, including escaped quotes', () => {
  assert.equal(bareCommand('git commit -m "a \\" rebase"'), 'git commit -m ""');
  assert.equal(bareCommand("echo 'git rebase'"), "echo ''");
});

t('block reason points at the sanctioned alternative', () => {
  const r = decide(bash('git commit --amend'));
  assert.match(r, /normal follow-up commit/);
  assert.match(r, /SWAN_RULE45_OK=1/);
});

console.log(`\nirreversible-git-gate: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
