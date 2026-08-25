/**
 * heredoc-escape-gate.test.mjs — pins the corpus's highest-count failure family at the
 * MECHANISM (shell expansion), plus every evasion and false-positive the PR #72 round-1
 * panel found (GLM 5.3 + Ox Alpha ×3, 2026-08-25). Each BLOCK is a shape that expands;
 * each ALLOW is a shape that is verbatim or is not a heredoc at all. A gate that cries
 * wolf is a gate people learn to wave through.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, expandedBodies, unquotedMask } from './heredoc-escape-gate.mjs';

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
test('R3 BLOCK: ruby -e / perl -e / deno eval with a double-quoted body are the same class', () => {
  block('ruby -e "puts ${HOME}"', 'ruby -e "..."');
  block('perl -e "print `ls`"', 'perl -e "..."');
  block('deno eval "console.log($(id))"', 'deno eval "..."');
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

// --- round-2 F1 (Grok): hatch strip must be SPAN excision, not content-equality removal --
// `split(text).join('')` removed every copy of a body's text; a body engineered to equal a
// fragment of the command line could glue "# HERE" + "DOC-OK: …" into a synthetic hatch,
// or erase a genuine hatch that shares text with a body.

test('R3 BLOCK: a body that equals a command-line fragment cannot mint a hatch by gluing', () => {
  // Body text "$xDOC" appears in the comment "# HERE$xDOC-OK: ..."; content-equality
  // removal would turn the comment into "# HERE-OK:" (no hatch) — fine — but the
  // reverse shape: comment "# HERE" + body "DOC-OK: reason…" adjacent after removal.
  // Simplest faithful check: the hatch regex is evaluated on the command with ONLY the
  // captured spans cut, so no text outside a body can be altered by a body's content.
  const cmd = 'echo "# HERE" <<EOF\n$xDOC-OK: twelvecharsxx\nEOF';
  const r = classify(cmd);
  assert.equal(r.hatch, false, 'no hatch may be synthesised from body content');
  assert.equal(r.block, true, 'the body expands ($x) and must block');
});

test('R3 ALLOW: a genuine hatch on the command line survives even if a body shares its text', () => {
  // The hatch text also appears verbatim inside the (unquoted) body. Span excision cuts
  // only the body; the command-line hatch remains and opens.
  const cmd = 'cat > x <<EOF # HEREDOC-OK: fixture, expansion intended here\n# HEREDOC-OK: fixture, expansion intended here\n${A}\nEOF';
  const r = classify(cmd);
  assert.equal(r.hatch, true, 'the real hatch must not be erased by a body that repeats it');
});

test('R3: every returned body carries a valid [start,end) span that reproduces its text', () => {
  const cmd = 'a <<U\nunq ${x}\nU\nnode -e "console.log(`${y}`)"\nread v <<<"${z}"\nread w <<<$HOME';
  for (const b of expandedBodies(cmd)) {
    assert.equal(cmd.slice(b.start, b.end), b.text, `span must reproduce body for ${b.kind}`);
  }
});

// --- round-2 F1 (GLM): terminators must be BASH-faithful, or the body ends early --------
// The round-1 loosening (any-indent terminator) overshot: a plain <<EOF only ends on EOF
// alone at column 0, and <<-EOF strips TABS only. A regex that terminates early leaves the
// rest of the (still-expanded) body uninspected — a silent false-ALLOW.

test('R3 BLOCK: for plain <<EOF an INDENTED look-alike line does not terminate — hazards after it are seen', () => {
  const cmd = 'cat > x <<EOF\nsafe line\n  EOF\nrest=${DANGER}\nEOF';
  const [b] = expandedBodies(cmd);
  assert.ok(b.text.includes('${DANGER}'), 'the body must run past the indented look-alike');
  block(cmd, 'hazard after an indented look-alike terminator');
});
test('R3 BLOCK: for <<-EOF a SPACE-indented look-alike does not terminate (bash strips tabs only)', () => {
  const cmd = 'cat > x <<-EOF\n\tsafe\n  EOF\n\trest=$(cmd)\n\tEOF';
  const [b] = expandedBodies(cmd);
  assert.ok(b.text.includes('$(cmd)'), 'space-indented EOF is not a terminator under <<-');
  block(cmd, '$(cmd) after a space-indented look-alike');
});
test('R3: for <<-EOF a TAB-indented terminator DOES terminate', () => {
  const cmd = 'cat > a <<-EOF\n\tplain\n\tEOF\ncat > b <<\'Q\'\n${literal}\nQ';
  const bodies = expandedBodies(cmd);
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].text.includes('literal'), false, 'terminated at the tab-indented EOF');
  allow(cmd, 'first body is plain, second is quoted');
});

// --- round-2 F3 (GLM): literal regions cannot carry the hatch ---------------------------

test("R3 BLOCK: a hatch inside a QUOTED heredoc body (<<'NOTE') does not open the hatch", () => {
  const cmd = "cat > n <<'NOTE'\n# HEREDOC-OK: hidden in a literal body, twelve+\nNOTE\ncat > x <<EOF\n${A}\nEOF";
  const r = classify(cmd);
  assert.equal(r.hatch, false, 'literal heredoc content is data, not an override');
  assert.equal(r.block, true);
});
test("R3 BLOCK: a hatch inside a single-quoted argument does not open the hatch", () => {
  const cmd = "echo '# HEREDOC-OK: quoted argument, twelve+ chars' && cat > x <<EOF\n${A}\nEOF";
  const r = classify(cmd);
  assert.equal(r.hatch, false);
  assert.equal(r.block, true);
});
test('R3 ALLOW: a hatch on the command line still opens when literal regions are present', () => {
  const cmd = "echo 'unrelated' && cat > x <<EOF # HEREDOC-OK: fixture, expansion intended here\n${A}\nEOF";
  assert.equal(classify(cmd).hatch, true);
});
test('R3: nested spans (a quoted arg inside an unquoted body) are merged, not double-cut', () => {
  // The hatch sits on the OPENING line. (First draft put it after `EOF` on the terminator
  // line — bash does not treat `EOF # comment` as a terminator either, so the gate was
  // right to keep it inside the body and the test was wrong.)
  const cmd = "cat > x <<EOF # HEREDOC-OK: command-line hatch, twelve+\necho 'inner' ${A}\nEOF";
  const r = classify(cmd);
  assert.equal(r.hatch, true, 'merging must leave the command-line hatch intact');
});
test('R3: a comment after the terminator word means the heredoc is NOT terminated (bash-faithful)', () => {
  const cmd = 'cat > x <<EOF\nplain\nEOF # not a terminator\n${A}\nEOF';
  const [b] = expandedBodies(cmd);
  assert.ok(b.text.includes('${A}'), 'body runs past "EOF # ..." to the real EOF');
  block(cmd, '${A} sits inside the still-open body');
});

// --- quote-aware operators: found by the gate blocking its own author -------------------
// A commit message mentioning "<<EOF" inside -m "..." was read as a heredoc opener. bash
// never recognises << inside quotes; the mask makes operators count only when unquoted.

test('R3 ALLOW: "<<EOF" mentioned inside a quoted argument is prose, not an operator', () => {
  allow('git commit -m "fix: plain <<EOF accepted an indented terminator; `x` and ${y} in prose"',
    'the whole -m string is quoted; no heredoc opens');
  allow("echo 'see <<<\"$x\" in docs'", "'<<<' inside single quotes is text");
});
test('R3 BLOCK: a real heredoc after a quoted argument is still caught', () => {
  block('echo "intro <<EOF text" && cat > x <<EOF\n${A}\nEOF', 'the second << is unquoted');
});
test('R3 ALLOW: an escaped quote does not confuse the mask', () => {
  allow('echo "he said \\"<<EOF\\" once"', 'escaped quotes inside "..." stay inside');
});
// --- round-3 self-attack: heredoc BODIES must not feed the quote-state machine ----------

test('R4 BLOCK: an apostrophe inside a heredoc body does not hide the NEXT heredoc', () => {
  // Pre-fix: `it's` flipped the mask into "single-quoted" for everything after it, so the
  // second `<<` was treated as text and its ${X} body went uninspected — a silent ALLOW.
  block("cat > a <<A\nit's fine\nA\ncat > b <<B\n${X}\nB", 'second heredoc still an operator');
});
test('R4 BLOCK: an apostrophe inside a QUOTED heredoc body does not hide the next heredoc either', () => {
  block("cat > a <<'A'\nit's literal\nA\ncat > b <<B\n$(cmd)\nB", 'quoted body is data too');
});
test('R4 ALLOW: an apostrophe in a heredoc body does not swallow a later hatch', () => {
  allow("cat > a <<A\nplain it's\nA\ncat > b <<B # HEREDOC-OK: fixture, expansion intended\n${X}\nB", 'hatch on the second opener');
});
test('R4: mask marks heredoc body positions as non-operator and resumes cleanly after the terminator', () => {
  const cmd = "cat <<A\nbody 'x\nA\necho done";
  const m = unquotedMask(cmd);
  const bodyIdx = cmd.indexOf("body");
  assert.equal(m[bodyIdx], false, 'body chars are not operator positions');
  assert.equal(m[cmd.indexOf('echo')], true, 'after the terminator the mask is unquoted again');
});

test('unquotedMask: basic states', () => {
  const m = unquotedMask('a "b c" d \'e\' f');
  assert.equal(m[0], true); assert.equal(m[3], false); assert.equal(m[8], true); assert.equal(m[11], false);
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
