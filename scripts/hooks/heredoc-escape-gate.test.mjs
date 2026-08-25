/**
 * heredoc-escape-gate.test.mjs — pins the corpus's highest-count failure family at the
 * MECHANISM (shell expansion), plus every evasion and false-positive the PR #72 round-1
 * panel found (GLM 5.3 + Ox Alpha ×3, 2026-08-25). Each BLOCK is a shape that expands;
 * each ALLOW is a shape that is verbatim or is not a heredoc at all. A gate that cries
 * wolf is a gate people learn to wave through.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, expandedBodies } from './heredoc-escape-gate.mjs';

const block = (cmd, why) => assert.equal(classify(cmd).block, true, `must BLOCK: ${why}\n${cmd}`);
const allow = (cmd, why) => assert.equal(classify(cmd).block, false, `must ALLOW: ${why}\n${cmd}`);

// --- the mechanism ----------------------------------------------------------------

test('BLOCK: unquoted heredoc with ${} and backtick (the identity-test mangle)', () => {
  block('cat > x.mjs <<EOF\nconst s = `**Reviewer:** ${OX}`;\nEOF', 'unquoted <<EOF');
});
test('BLOCK: unquoted heredoc with a backslash escape', () => {
  block('cat > x.txt <<EOF\nline one\\nline two\nEOF', 'backslash expands');
});
test('BLOCK: <<- tab-stripping form is still unquoted', () => {
  block('cat > x <<-EOF\n\tvalue=${HOME}\nEOF', '<<-EOF');
});
test('BLOCK: unterminated unquoted heredoc is still inspected', () => {
  block('cat > x <<EOF\nconst t = `never closed`;', 'no terminator');
});

// --- round-1 F1 (Ox): bare $VAR and $(...) are the MOST common expansions ------------

test('R2 BLOCK: bare $VAR in an unquoted heredoc', () => {
  block('cat > .env.example <<EOF\nDATABASE_URL=$DB_URL\nEOF', '$VAR expands');
});
test('R2 BLOCK: $(cmd) substitution in an unquoted heredoc', () => {
  block('cat > v.txt <<EOF\nbuilt=$(date)\nEOF', '$(...) runs');
});
test('R2 BLOCK: bare $VAR in a double-quoted node -e body', () => {
  block('node -e "console.log(process.env.$NAME)"', '$VAR in "..." expands');
});

// --- round-1 F2 (Ox ×3): inline-interpreter invocation shapes that evaded -----------

test('R2 BLOCK: node with intervening flags before -e', () => {
  block('node --input-type=module -e "await import(`./${f}`)"', '--input-type=module -e "..."');
});
test('R2 BLOCK: --eval= joined form', () => {
  block('node --eval="console.log(`${x}`)"', '--eval="..."');
});
test('R2 BLOCK: no space between flag and quote', () => {
  block('node -e"console.log(`${x}`)"', '-e"..."');
  block('python3 -c"print(\\"a\\tb\\")"', 'python3 -c"..."');
});
test('R2 BLOCK: versioned interpreter binary (python3.12) is still an interpreter', () => {
  block('python3.12 -c "print(f\\"${X}\\")"', 'python3.12 -c "..." (Grok r1 F4)');
});
test('R2 BLOCK: a flag AFTER the eval flag, before the body', () => {
  block('node -e --input-type=module "await import(`./${f}`)"', '-e then a flag then the body (Grok r1 F4)');
});
test("R2 BLOCK: ANSI-C $'...' body is backslash-processed by the shell", () => {
  block("node -e $'console.log(\\x41)'", "$'...' expands escapes");
});

// --- round-1 F1 (GLM): here-strings and odd delimiters ------------------------------

test('R2 ALLOW: a here-string <<< is NOT a heredoc and must not swallow the rest', () => {
  // Pre-fix: `<<<` matched as `<<` + delimiter "input.txt", found no terminator,
  // swallowed the QUOTED heredoc below and blocked with a fabricated reason.
  allow("grep foo <<< input.txt\ncat > t <<'EOF'\ntpl: `${name}`\nEOF", '<<< is a here-string');
});
test('R2 BLOCK: a delimiter that does not start with a letter is still a heredoc', () => {
  block('cat > x <<0\nval=${A}\n0', '<<0');
  block('cat > x <<__X__\n`cmd`\n__X__', '<<__X__');
});
test('R2 BLOCK: <<- with a TAB-indented terminator still terminates and is inspected', () => {
  const cmd = 'cat > a <<-EOF\n\tx=${A}\n\tEOF\ncat > b <<\'Q\'\nverbatim `${b}`\nQ';
  const bodies = expandedBodies(cmd);
  assert.equal(bodies.length, 1, 'only the unquoted one is returned');
  assert.equal(bodies[0].text.includes('verbatim'), false, 'tab-indented EOF terminated it; did not swallow the quoted heredoc');
  block(cmd, 'the unquoted body has ${A}');
});

// --- verbatim channels must stay SILENT --------------------------------------------

test("ALLOW: single-QUOTED heredoc with the exact hazardous content (the FIX)", () => {
  allow("cat > x.mjs <<'EOF'\nconst s = `**Reviewer:** ${OX}`;\nEOF", "<<'EOF' is verbatim");
});
test('ALLOW: double-quoted and backslash-quoted delimiters are verbatim', () => {
  allow('cat > x <<"EOF"\n${not expanded} `nor this`\nEOF', '<<"EOF"');
  allow('cat > x <<\\EOF\n${not expanded}\nEOF', '<<\\EOF');
  allow("cat > x << 'EOF'\n${no}\nEOF", "<< 'EOF' with a space");
});
test('ALLOW: single-quoted inline bodies are verbatim', () => {
  allow("node -e 'console.log(`ok ${x}`)'", "node -e '...'");
  allow("python3 -c 'print(\"a\\tb\")'", "python3 -c '...' — a python-level escape, not a shell one");
});
test('ALLOW: unquoted heredoc with NO expansion characters', () => {
  allow('git commit -F - <<MSG\nfix(x): plain words only\nMSG', 'nothing to expand');
  allow('cat > cfg.json <<EOF\n{ "a": 1, "b": [2, 3] }\nEOF', 'plain JSON');
});
test('ALLOW: markdown table pipes are not a hazard', () => {
  allow('cat > t.md <<EOF\n| a | b |\n|---|---|\nEOF', 'pipes do not expand');
});
test('ALLOW: hazard characters outside any expanded body', () => {
  allow('grep -n "`" file.md', 'grep pattern');
  allow('echo "see ${HOME}"', 'normal command line is meant to expand');
  allow('echo $(date)', 'top-level substitution is intended');
});
test('ALLOW: two heredocs, both quoted, do not cross-contaminate', () => {
  allow("cat > a <<'A'\n`x`\nA\ncat > b <<'B'\n${y}\nB", 'both verbatim');
});

// --- round-1 F3 (Ox): here-strings — double-quoted expands, single/bare is verbatim ----

test('R2 BLOCK: double-quoted here-string expands', () => {
  block('node - <<<"console.log(`${x}`)"', '<<<"..." is shell-expanded');
  block('python3 - <<< "print($(whoami))"', '<<< "..." with $(...)');
});
test('R2 ALLOW: single-quoted and bare-word here-strings are verbatim / not bodies', () => {
  allow("node - <<<'console.log(`${x}`)'", "<<<'...' is verbatim");
  allow('grep foo <<< input.txt', 'bare-word here-string');
});

// --- round-2 self-attack: special params, other shells, unquoted here-string operands ---

test('R3 BLOCK: positional/special parameters expand in an unquoted heredoc', () => {
  block('cat > run.sh <<EOF\necho $1 $@ $?\nEOF', '$1 $@ $? expand');
  block('cat > pid <<EOF\n$$\nEOF', '$$ expands');
});
test('R3 BLOCK: sh -c / bash -c with a double-quoted body is the same hazard class', () => {
  block('sh -c "echo ${HOME}"', 'sh -c "..."');
  block('bash -c "cat `ls`"', 'bash -c "..."');
});
test("R3 ALLOW: sh -c with a single-quoted body is verbatim", () => {
  allow("sh -c 'echo ${HOME}'", "sh -c '...'");
});
test('R3 BLOCK: unquoted here-string operand expands', () => {
  block('read x <<<$HOME', '<<<$HOME');
  block('node - <<<$(cat gen.js)', '<<<$(...)');
});
test("R3 ALLOW: single-quoted or bare-word here-string operands are literal", () => {
  allow("read x <<<'$HOME'", "<<<'...'");
  allow('read x <<< literal-word', 'bare word');
});

// --- round-1 F3 (GLM): the hatch must be OUTSIDE the body — a payload cannot carry its key

test('R2 BLOCK: a "# HEREDOC-OK:" inside the heredoc BODY does not open the hatch', () => {
  const r = classify('cat > x <<EOF\n# HEREDOC-OK: this reason lives inside the body\nval=${A}\nEOF');
  assert.equal(r.block, true, 'hatch text inside the expanded body must not count');
  assert.equal(r.hatch, false);
});

// --- the hatch: kept, but audited ------------------------------------------------------

test('hatch: requires a reason of at least 12 chars and is reported as hatch:true', () => {
  const short = classify('cat > x <<EOF # HEREDOC-OK: yes\n${A}\nEOF');
  assert.equal(short.block, true, 'a 3-char reason is not a hatch');
  const ok = classify('cat > x <<EOF # HEREDOC-OK: fixture, expansion is the point here\n${A}\nEOF');
  assert.equal(ok.block, false); assert.equal(ok.hatch, true);
  assert.match(ok.reasons[0], /^hatch: /);
});

test('empty / non-string input fails open', () => {
  allow('', 'empty'); assert.equal(classify(undefined).block, false); assert.equal(classify(42).block, false);
});
