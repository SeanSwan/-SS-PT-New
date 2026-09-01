#!/usr/bin/env node
/**
 * spend-shapes.test.mjs — THE SHAPE CORPUS. One executable table of
 * "real bash line -> does it execute a paid seat", asserted end-to-end
 * through the real gate.
 * ============================================================================
 * GLM 5.3's round-6 ONE THING, and he made the case out of my own words. The
 * round-4 packet explained that `cmd /c` "regressed silently, because the sweep
 * lived in prose rather than a test" — and then the sweep stayed prose. Two
 * rounds later, backticks regressed the same way: a shape the ORIGINAL regex
 * caught, lost in the rewrite, invisible because nothing executed the list.
 *
 * A rewrite that can lose old coverage owes a proof of parser >= regex over the
 * old corpus. This is that proof, and it is the artefact the last three rounds
 * kept asking for in different words:
 *
 *   round 4  "39 shapes" recorded in a packet -> lost `cmd /c`
 *   round 5  the fail-closed inversion         -> lost backticks
 *   round 6  INERT_HEADS                       -> lost `find -exec`
 *
 * Every future fix adds a ROW here, not a paragraph somewhere. A row cannot rot
 * into prose, and a row that stops being true fails loudly.
 *
 * TWO COLUMNS, BOTH LOAD-BEARING. `BILLS` is the money direction: bash would run
 * a paid seat, so the gate must block. `INERT` is the cry-wolf direction, which
 * this workstream has repeatedly argued is the MORE corrosive failure — a guard
 * people learn to wave through protects nothing. A fix that turns a BILLS row
 * green by turning an INERT row red has not fixed anything.
 *
 * WHAT THIS IS NOT: a differential test against real bash. Both seats asked for
 * a shell oracle (flash round-6 MISSED 4) and they are right that it would have
 * caught shapes I hand-wrote wrongly. It is not built here because executing
 * these lines means executing paid seats; an oracle needs a harness that swaps
 * the seat for a no-op, which is its own slice. Recorded as a named gap rather
 * than implied to be covered — the same discipline as the O_EXCL walk-back.
 *
 * Run: node --test scripts/hooks/spend-shapes.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'spend-guard-gate.mjs');
const SEAT = 'scripts/consult-fable.mjs';

function run(command) {
  const dir = mkdtempSync(join(tmpdir(), 'swan-shapes-'));
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf-8',
    env: { ...process.env, SWAN_SPEND_DIR: dir },
  });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, stderr: r.stderr || '' };
}
const gate = (command) => run(command).code;

/**
 * BILLS — bash runs a paid seat on this line. The gate must not exit 0.
 * Each row names the round that found it, so the corpus doubles as the history
 * of what this guard has actually been wrong about.
 */
const BILLS = [
  ['r1  plain invocation',            `node ${SEAT} --document plan.md`],
  ['r1  absolute interpreter',        `/usr/bin/node ${SEAT} --document plan.md`],
  ['r1  sh -c wrapper',               `sh -c "node ${SEAT} --document plan.md"`],
  ['r1  bash -lc wrapper',            `bash -lc 'node ${SEAT} --document plan.md'`],
  ['r1  newline separator',           `cd /repo\nnode ${SEAT} --document plan.md`],
  ['r1  tab before interpreter',      `cd /repo &&\tnode ${SEAT} --document plan.md`],
  ['r2  pipe inside a quoted arg',    `node --require "a|b" ${SEAT} --document plan.md`],
  ['r2  semicolon in a quoted arg',   `node --require "a;b" ${SEAT} --document plan.md`],
  ['r2  invocation in 2nd command',   `npm run build && node ${SEAT} --document plan.md`],
  ['r3  two paid seats, one line',    `node scripts/consult-kimi.mjs --document p.md && node ${SEAT} --document p.md`],
  ['r4  --check AFTER the script',    `node ${SEAT} --document x --check`],
  ['r4  --version in a sibling cmd',  `node --version && node ${SEAT} --document x`],
  ['r4  quoted span behind cd',       `bash -c "cd /srv/app && node ${SEAT} --document x"`],
  ['r4  quoted script path',          `node "${SEAT}" --document x`],
  ['r4  exec inside sh -c',           `sh -c "exec node ${SEAT}"`],
  ['r4  shebang direct execution',    `./${SEAT} --document x`],
  ['r5  redirect before the script',  `node >out.mjs ${SEAT} --document plan.md`],
  ['r5  fd-prefixed redirect first',  `2>err.mjs node ${SEAT} --document plan.md`],
  ['r5  wrapper with its own flags',  `stdbuf -oL node ${SEAT} --document plan.md`],
  ['r5  env -i',                      `env -i node ${SEAT} --document plan.md`],
  ['r5  backslash escape in path',    'node scripts/consult\\-fable.mjs --document plan.md'],
  ['r5  quoted argv[0]',              `"./${SEAT}" --document plan.md`],
  ['r5  --require space form',        `node --require ./prelude.js ${SEAT} --doc x`],
  ['r5  --import space form',         `node --import ./setup.mjs ${SEAT} --doc x`],
  ['r5  boolean node flag',           `node --trace-warnings ${SEAT}`],
  ['r5  unknown node flag',           `node --foo ${SEAT}`],
  ['r5  seat AS a loader value',      'node --require scripts/consult-fable.mjs other.mjs'],
  ['r5  runner eval mode',            `node -e "import('./${SEAT}')"`],
  ['r5  xargs',                       `xargs node ${SEAT}`],
  ['r5  sudo',                        `sudo node ${SEAT} --document x`],
  ['r5  cmd /c',                      `cmd /c node ${SEAT} --document x`],
  ['r5  nodejs (a real binary)',      `nodejs ${SEAT} --document x`],
  ['r5  unrecognised head + seat',    `node-foo ${SEAT} --document x`],
  ['r6  find -exec',                  `find . -maxdepth 0 -exec node ${SEAT} --document plan.md \\;`],
  ['r6  sed e (GNU shells out)',      `sed 'e node ${SEAT}' file.txt`],
  ['r6  vim -c',                      `vim -c '!node ${SEAT}' -c qa f`],
  ['r6  start (launcher)',            `start node ${SEAT}`],
  ['r6  backticks',                   `echo \`node ${SEAT} --document plan.md\``],
  ['r6  backticks in an assignment',  `OUT=\`node ${SEAT} --document plan.md\``],
  ['r6  backticks in double quotes',  `echo "r: \`node ${SEAT} --document plan.md\`"`],
  ['r6  $() substitution',            `echo $(node ${SEAT} --document plan.md)`],
  ['r6  stdin redirect',              `node --input-type=module < ${SEAT} --document plan.md`],
  ['r6  stdin pipe',                  `cat ${SEAT} | node --input-type=module --document plan.md`],
  ['r6  --import= equals form',       `node --import=./setup.mjs ${SEAT} --document plan.md`],
  ['r6  --require= equals form',      `node --require=./prelude.js ${SEAT} --document plan.md`],
  ['r6  -r= equals form',             `node -r=./prelude.js ${SEAT} --document plan.md`],
  ['r6  env -S quoted body',          `env -S "node ${SEAT} --document x"`],
  ['r6  eval beside a positional',    `node ${SEAT} --document x -e '1'`],
  ['r6  uppercase extension',         'node scripts/consult-fable.MJS --document x'],
  // Round 7. All three share one root: an exec hatch fired correctly and then the
  // block condition still demanded a token that ENDS in `.mjs` or IS a runner, which
  // a fused token never satisfies. The hatch was decorative — behaviour identical to
  // having no row at all, which is how flash proved it.
  ['r7  awk system()',                `awk '{system("node ${SEAT}")}' file.txt`],
  ['r7  awk print into a command',    `awk '{print | "node ${SEAT}"}' f.txt`],
  ['r7  git -c alias shell-out',      `git -c alias.x='!node ${SEAT} --document plan.md' x`],
  ['r7  sort --compress-program',     `sort --compress-program='node ${SEAT}' big.txt`],
  ['r7  >( ) process substitution',   `node >(echo "import(process.cwd() + '/${SEAT}')")`],
  ['r7  <( ) process substitution',   `node <(echo "import('./${SEAT}')")`],
  // Round 8, found solo. A NUL is built here with String.fromCharCode rather than
  // embedded as a literal — a literal control character in a fixture is invisible in
  // review, and a tool silently writing one is exactly how this bug was created.
  ['r8  NUL between args',            `node ${SEAT}${String.fromCharCode(0)} --document x`],
  ['r8  NUL inside the path',         `node scripts/consult-fable${String.fromCharCode(0)}.mjs --doc x`],
  ['r8  vim -c silent !',             `vim -c 'silent !node ${SEAT}' -c qa f`],
  ['r8  vim -c :! form',              `vim -c ':!node ${SEAT}' f`],
  ['r8  awk exec by shebang',         `awk '{system("./${SEAT}")}' f.txt`],
];

/**
 * INERT — no money moves. The gate must exit 0.
 *
 * These matter as much as the rows above. Every one is a line somebody types on
 * an ordinary day, and several were BROKEN by a careless fix for a BILLS row
 * during the very rounds that produced this file: `find -name`, `sed -n`,
 * `node -c`, and a `for` loop over test files all cried wolf within minutes of a
 * new rule landing.
 */
const INERT = [
  ['mention: cat',                    `cat ${SEAT}`],
  ['mention: grep',                   `grep -n INVOCATION ${SEAT}`],
  ['mention: git grep',               `git grep "node ${SEAT}" docs`],
  ['mention: echo',                   `echo node ${SEAT}`],
  ['mention: which',                  'which node'],
  ['mention in single quotes',        `echo 'see \`node ${SEAT}\` in the docs'`],
  ['seat name as a --seed VALUE',     `node scripts/consult-gemini.mjs --document p.md --seed ${SEAT}`],
  ['seat name in quoted data',        `node scripts/format-docs.mjs --text "see ${SEAT}"`],
  ['parse-only --check',              `node --check ${SEAT}`],
  ['parse-only -c',                   `node -c ${SEAT}`],
  ['a free seat',                     'node scripts/consult-gemini.mjs --document plan.md'],
  ['a cheap seat',                    'node scripts/consult-sol.mjs --document plan.md'],
  ['a cheap compound',                'node scripts/consult-kimi.mjs --doc a && node scripts/consult-hy3-design.mjs --doc b'],
  ['find -name',                      'find . -name "*.mjs"'],
  ['sed -n print',                    `sed -n '1,5p' ${SEAT}`],
  ['a test-runner loop',              'for f in a.test.mjs b.test.mjs; do node --test "$f"; done'],
  ['a while loop',                    'while read l; do echo $l; done'],
  ['an if statement',                 'if [ -f x ]; then echo yes; fi'],
  ['eval naming no script',           `node -e 'console.log(1)'`],
  ['ordinary --import= on a build',   'node --import=./setup.mjs build.mjs'],
  ['env assignment',                  'env FOO=bar node build.mjs'],
  ['data on stdin, not a program',    'node build.mjs < input.txt'],
  ['a pipe into grep',                'cat notes.md | grep node'],
  ['npm',                             'npm run build'],
  // Round 7's cry-wolf side. Each of these shares a HEAD with a BILLS row above, which
  // is the whole point of per-head exec hatches: `git grep` and `git -c alias='!…'` are
  // the same binary, and only one of them shells out.
  ['git log',                         'git log --oneline -5'],
  ['awk ordinary',                    `awk '{print $1}' file.txt`],
  ['sort ordinary',                   'sort -u file.txt'],
  // Round 8's cry-wolf side. The vim hatch now fires on a `!` ANYWHERE in an editor
  // payload, which is a deliberately wide rule — these pin what it must not catch.
  ['vim -c set nu on the seat',       `vim -c 'set nu' ${SEAT}`],
  ['vim plain on the seat',           `vim ${SEAT}`],
  ['vim -c substitute',               `vim -c 's/a/b/g' notes.txt`],
  ['diff of two process subs',        'diff <(sort a.txt) <(sort b.txt)'],
  ['a tab-separated command',         'cd /repo\t&& echo hi'],
];

test('CORPUS: every shape that bills is blocked', () => {
  const escaped = [];
  for (const [name, cmd] of BILLS) {
    if (gate(cmd) !== 2) escaped.push(name);
  }
  assert.deepEqual(escaped, [], [
    '',
    'These command shapes run a PAID SEAT and the gate let them through:',
    ...escaped.map((n) => `    ${n}`),
    '',
    'Each row is a shape some round already found. A row going green->red here is a',
    'REGRESSION, not a new discovery — which is the whole reason this table exists:',
    '`cmd /c` and backticks were both caught once, recorded in prose, and lost.',
  ].join('\n'));
});

test('CORPUS: every inert shape stays quiet', () => {
  const wolves = [];
  for (const [name, cmd] of INERT) {
    if (gate(cmd) !== 0) wolves.push(name);
  }
  assert.deepEqual(wolves, [], [
    '',
    'These command shapes spend nothing and the gate refused them:',
    ...wolves.map((n) => `    ${n}`),
    '',
    'Cry-wolf is the more corrosive failure — a guard people learn to wave through',
    'protects nothing. A fix that turns a BILLS row green by turning one of these red',
    'has not fixed anything.',
  ].join('\n'));
});

/**
 * WRAPPERS — the cross product. GLM 5.3's round-7 ONE THING, and his diagnosis of why
 * the corpus alone was not enough: **"you tested points, not the product."**
 *
 * Both of his round-7 blockers were CROSSES of rows the corpus already had:
 *   `xargs` (r5 row) x `bash -c` (r1 row)
 *   the `for`-loop cry-wolf fix x `if <cmd>`
 * A list of points cannot find a composition, by construction. This can.
 *
 * Every wrapper below is already a row or a named constant elsewhere in the system, so
 * this adds no new claims about the world — it asserts that the claims already made
 * still hold when they compose. That is the property the last four rounds kept losing.
 */
const EXEC_WRAPPERS = [
  ['bare', (b) => b],
  ['sudo', (b) => `sudo ${b}`],
  ['xargs', (b) => `xargs ${b}`],
  ['nohup', (b) => `nohup ${b}`],
  ['command', (b) => `command ${b}`],
  ['env -i', (b) => `env -i ${b}`],
  ['if-condition', (b) => `if ${b}; then echo ok; fi`],
  ['while-condition', (b) => `while ${b}; do sleep 1; done`],
  ['sh -c', (b) => `sh -c '${b}'`],
  ['bash -c dq', (b) => `bash -c "${b}"`],
  ['backticks', (b) => `echo \`${b}\``],
  ['$( )', (b) => `echo $(${b})`],
  ['&& tail', (b) => `${b} && echo done`],
  ['head &&', (b) => `echo start && ${b}`],
];

/** A representative slice of BILLS — one per mechanism, not all 55, to stay near budget. */
const CROSS_BODIES = [
  `node ${SEAT} --document plan.md`,
  `node "${SEAT}" --document x`,
  `node --trace-warnings ${SEAT}`,
  `node --import=./setup.mjs ${SEAT}`,
  `./${SEAT} --document x`,
];

test('CROSS: every exec wrapper x every body still blocks', () => {
  // The composition space, which is where both round-7 blockers came from. If a
  // wrapper and a body are each handled correctly on their own, the pair must be too —
  // and twice now it was not.
  const escaped = [];
  for (const [wname, wrap] of EXEC_WRAPPERS) {
    for (const body of CROSS_BODIES) {
      const cmd = wrap(body);
      if (gate(cmd) !== 2) escaped.push(`${wname} x ${body}`);
    }
  }
  assert.deepEqual(escaped, [], [
    '',
    'These WRAPPER x BODY compositions ran a paid seat:',
    ...escaped.map((n) => `    ${n}`),
    '',
    'Both round-7 blockers were compositions of rows this corpus already had as',
    'separate points. A list of points cannot find a composition, by construction.',
  ].join('\n'));
});

test('CROSS: inert heads crossed with a runner MENTION stay quiet', () => {
  // The cry-wolf half of the product, and the harder half: these heads all take a
  // token that looks exactly like an invocation, and none of them runs it.
  const wolves = [];
  const MENTIONS = [
    `cat ${SEAT}`,
    `echo node ${SEAT}`,
    `grep -n "node ${SEAT}" docs/notes.md`,
    `git grep "node ${SEAT}" docs`,
    `git -c color.ui=always status`,
    `vim -c 'set nu' ${SEAT}`,
    `awk '{print $1}' ${SEAT}`,
    `sort -u ${SEAT}`,
    'man bash',
    'which node',
    `wc -l ${SEAT}`,
    `head -20 ${SEAT}`,
  ];
  for (const cmd of MENTIONS) {
    if (gate(cmd) !== 0) wolves.push(cmd);
  }
  assert.deepEqual(wolves, [], [
    '',
    'These lines spend nothing and were refused:',
    ...wolves.map((n) => `    ${n}`),
    '',
    'Each shares a HEAD with a BILLS row — which is the point of per-head exec hatches.',
    '`git grep` and `git -c core.editor=...` are the same binary; only one shells out.',
  ].join('\n'));
});

test('CORPUS: a plainly-visible seat is PRICED, not merely refused as unreadable', () => {
  // GLM 5.3 round-7 MISSED 3, demonstrated live while mutation-testing his B1 fix:
  // **the corpus asserts exit codes only.** Reverting the condition-stripping fix
  // produced ZERO reds — because the fail-closed unknown-head rule caught `if <seat>`
  // anyway, as an unattributable execution rather than a $1.06 Fable call. Both block,
  // so a verdict-only assertion cannot tell them apart, and the mechanism can rot
  // underneath while the table stays green.
  //
  // That is the fourth distinct meaning of "zero reds" in this workstream, and the one
  // this file was supposed to prevent. Shapes where the seat is plainly visible must
  // resolve to a PRICE — falling back to "cannot read" is a silent downgrade.
  const PRICED = [
    `node ${SEAT} --document plan.md`,
    `if node ${SEAT} --document plan.md; then echo ok; fi`,
    `while node ${SEAT} --document plan.md; do sleep 1; done`,
    `sh -c "node ${SEAT} --document plan.md"`,
    `node "${SEAT}" --document x`,
    `nohup node ${SEAT} --document x`,
  ];
  const downgraded = [];
  for (const cmd of PRICED) {
    const r = run(cmd);
    if (r.code !== 2 || !/worst case\s+\$1\.06/.test(r.stderr) || /cannot read/.test(r.stderr)) {
      downgraded.push(cmd);
    }
  }
  assert.deepEqual(downgraded, [], [
    '',
    'These lines name a seat plainly and must be PRICED, not refused as unreadable:',
    ...downgraded.map((n) => `    ${n}`),
    '',
    'Blocking for the wrong reason still blocks — which is why a verdict-only',
    'assertion hid the mechanism rotting. The refusal Sean reads should say what the',
    'call costs, not that the gate could not parse his command.',
  ].join('\n'));
});

test('CORPUS: the table itself is non-trivial and the instrument works', () => {
  // A corpus test that silently ran zero rows would report perfect coverage, which
  // is the instrument-blindness this workstream has now hit four separate times.
  assert.ok(BILLS.length >= 60, `the BILLS corpus shrank to ${BILLS.length} — rows are not deleted, they are fixed`);
  assert.ok(INERT.length >= 32, `the INERT corpus shrank to ${INERT.length}`);
  // And the harness really distinguishes the two directions.
  assert.equal(gate(`node ${SEAT} --document plan.md`), 2, 'control: the canonical paid call blocks');
  assert.equal(gate(`cat ${SEAT}`), 0, 'control: the canonical mention does not');
});
