/**
 * heredoc-escape-gate.test.mjs — pins the corpus's highest-count failure family,
 * at the MECHANISM: shell expansion of unquoted heredocs and double-quoted inline
 * bodies. Quoted heredocs and single-quoted bodies are verbatim and must stay
 * silent — a gate that cries wolf is a gate people learn to wave through
 * (DeepSeek F2 / HY3 F2 on the first, over-broad draft).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, expandedBodies } from './heredoc-escape-gate.mjs';

const block = (cmd, why) => assert.equal(classify(cmd).block, true, `must BLOCK: ${why}\n${cmd}`);
const allow = (cmd, why) => assert.equal(classify(cmd).block, false, `must ALLOW: ${why}\n${cmd}`);

// --- the mechanism: unquoted heredoc + expansion characters -----------------------

test('BLOCK: UNQUOTED heredoc carrying a JS template literal (${} would be substituted)', () => {
  block('cat > x.mjs <<EOF\nconst s = `**Reviewer:** ${OX}`;\nEOF', 'unquoted <<EOF with ${} and backtick');
});

test('BLOCK: unquoted heredoc with a backslash escape (shell escape-processes it)', () => {
  block('cat > x.txt <<EOF\nline one\\nline two\nEOF', 'backslash in unquoted heredoc');
});

test('BLOCK: unquoted heredoc with <<- (tab-stripping variant)', () => {
  block('cat > x <<-EOF\n\tvalue=${HOME}\nEOF', '<<-EOF is still unquoted');
});

test('BLOCK: double-quoted node -e body with backticks', () => {
  block('node -e "console.log(`x ${y}`)"', 'double-quoted inline body expands');
});

test('BLOCK: double-quoted python -c with an escape sequence', () => {
  block('python -c "print(\\"a\\tb\\")"', 'backslash in double-quoted inline body');
});

test('BLOCK: unterminated unquoted heredoc is still inspected', () => {
  block('cat > x <<EOF\nconst t = `never closed`;', 'no terminator, still expands');
});

// --- verbatim channels must stay SILENT ---------------------------------------------

test('ALLOW: single-QUOTED heredoc with the exact same hazardous content', () => {
  allow("cat > x.mjs <<'EOF'\nconst s = `**Reviewer:** ${OX}`;\nEOF", "<<'EOF' is verbatim — this is the FIX the gate recommends");
});

test('ALLOW: double-QUOTED delimiter heredoc is also verbatim', () => {
  allow('cat > x <<"EOF"\n${not expanded} `nor this`\nEOF', '<<"EOF" is verbatim');
});

test('ALLOW: single-quoted inline body (verbatim)', () => {
  allow("node -e 'console.log(`ok`)'", 'single-quoted inline body does not expand');
});

test('ALLOW: unquoted heredoc with NO expansion characters (plain prose / JSON)', () => {
  allow('git commit -F - <<MSG\nfix(x): plain words only\nMSG', 'nothing to expand');
  allow('cat > cfg.json <<EOF\n{ "a": 1, "b": [2, 3] }\nEOF', 'plain JSON, no ${ ` or backslash');
});

test('ALLOW: markdown table pipes are NOT a hazard (pipes do not expand)', () => {
  allow('cat > t.md <<EOF\n| a | b |\n|---|---|\n| 1 | 2 |\nEOF', 'the first draft wrongly blocked this');
});

test('ALLOW: hazard characters outside any expanded body', () => {
  allow('grep -n "`" file.md', 'a grep pattern is not a heredoc');
  allow('echo "see ${HOME}"', 'a normal command line is meant to expand');
});

test('ALLOW: the escape hatch, greppable', () => {
  allow('cat > x <<EOF # HEREDOC-OK: fixture, expansion intended\n${TEMPLATE}\nEOF', 'explicit hatch');
});

test('ALLOW: empty / non-string input fails open', () => {
  allow('', 'empty'); assert.equal(classify(undefined).block, false); assert.equal(classify(42).block, false);
});

// --- extractor sanity: only EXPANDED bodies are returned ---------------------------

test('expandedBodies returns unquoted heredocs and double-quoted inline bodies only', () => {
  const cmd = "a <<'Q'\nquoted\nQ\nb <<U\nunquoted\nU\nnode -e 'single'\nnode -e \"double\"\npython3 -c \"py\"";
  assert.deepEqual(expandedBodies(cmd).map((b) => b.text), ['unquoted', 'double', 'py']);
});
