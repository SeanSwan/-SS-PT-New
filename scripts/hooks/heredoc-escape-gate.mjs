#!/usr/bin/env node
/**
 * heredoc-escape-gate.mjs — PreToolUse (Bash) gate, MECHANISM-PRECISE.
 *
 * WHY (corpus 2026-07-11 → 2026-08-25): SHELL/ESCAPING is the highest-count failure
 * family — 123 "Mistakes I made" bullets, 19 ledger rows, 63% recurrence AFTER
 * being written up. Prose did not hold. Syntax can be gated deterministically.
 *
 * THE MECHANISM (not the channel): the shell EXPANDS two kinds of body before the
 * interpreter sees them —
 *   1. an UNQUOTED heredoc (`<<EOF`, `<<-EOF`): `${x}`, `$x`, `$(cmd)` substitute,
 *      `` `cmd` `` executes, `\` escapes. A QUOTED delimiter (`<<'EOF'`, `<<"EOF"`,
 *      `<<\EOF`) is verbatim and SAFE — not blocked.
 *   2. a DOUBLE-QUOTED inline body (`node -e "..."`, `python -c "..."`) and an
 *      ANSI-C body (`$'...'`, backslash-processed). A SINGLE-QUOTED body is verbatim.
 *
 * ROUND-2 HARDENING (GLM 5.3 + Ox Alpha ×3, 2026-08-25, PR #72 round 1):
 *   - `<<<` here-strings were misparsed as `<<` + a heredoc named after the operand,
 *     never found a terminator, swallowed the rest of the command, and BLOCKED safe
 *     commands with a fabricated reason. Fixed: `<<` must not be preceded or followed
 *     by another `<`.
 *   - delimiters that do not start with a letter (`<<0`, `<<__X__`) were never
 *     inspected. Fixed: any non-space, non-quote, non-backslash token is a delimiter.
 *   - `<<-` terminators indented with tabs never matched. Fixed: terminator may be
 *     indented.
 *   - bare `$VAR` and `$(...)` — the MOST common expansion forms — were not in the
 *     hazard list. Fixed.
 *   - `node --input-type=module -e "..."`, `--eval="..."`, `-e"..."` (no space),
 *     `$'...'` all evaded the inline regex. Fixed: intervening flags tolerated,
 *     `=`/no-space accepted, ANSI-C bodies captured.
 *   - the `# HEREDOC-OK:` hatch is an in-command override (Ox ×2). RULING: kept —
 *     this repo's own lane guard uses the same greppable-hatch pattern by design,
 *     and a gate nobody can get past is a gate somebody disables — but it now
 *     requires a reason of ≥ 12 chars and is logged as `hatch:true` in the fire log,
 *     so hatch usage is a counted, auditable number, not a silent bypass.
 *
 * Escape hatch, greppable: `# HEREDOC-OK: <reason ≥ 12 chars>`.
 * INSTRUMENTED: every invocation appends one JSON line to
 * .ai-workflow/gates/fires.jsonl — {blocked, shadow, hatch, bodies, reasons} —
 * never the command text — so the fire rate has a denominator.
 * SHADOW: `SWAN_HEREDOC_GATE=shadow` logs what would block and allows; for measuring
 * a false-positive rate on real traffic. Default blocks.
 *
 * CONTRACT (matches exit-status-gate.mjs): stdin JSON `{tool_input:{command}}`;
 * exit 2 + stderr = block; exit 0 = allow; internal error = fail OPEN with a note.
 * Logic exported; stdin read only when run directly, so tests can import it.
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync, statSync, renameSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const EXPANDS = [
  { re: /\$\{/,             name: '${...} (shell expands it)' },
  { re: /\$[A-Za-z_]/,      name: '$VAR (shell expands it)' },
  { re: /\$[0-9@?$*#!-]/,   name: '$1/$?/$@/$$ positional or special parameter (shell expands it)' },
  { re: /\$\(/,             name: '$(...) (shell runs it)' },
  { re: /`/,                name: 'backtick (shell executes it)' },
  { re: /\\/,               name: 'backslash (shell escape-processes it)' },
];

/**
 * Which positions of the command line are OUTSIDE any quoted string. A `<<` or `<<<`
 * inside "..." or '...' is text, not an operator — bash never opens a heredoc there.
 * Found by the gate blocking its own author: a commit message (`-m "... plain <<EOF
 * accepted ..."`) was read as a heredoc opener. Tracks ' and " state and a backslash
 * escape inside "..."; it does NOT try to model heredoc bodies (which may contain any
 * quotes) — the body regexes handle those from an unquoted operator position.
 * @returns {boolean[]} unquoted[i] === true when cmd[i] is outside quotes
 */
export function unquotedMask(cmd) {
  const mask = new Array(cmd.length).fill(true);
  let q = null; // null | "'" | '"'
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q === null) {
      if (c === '\\') { mask[i] = true; i++; if (i < cmd.length) mask[i] = false; continue; }
      if (c === "'" || c === '"') { q = c; mask[i] = false; continue; }
      mask[i] = true;
    } else {
      mask[i] = false;
      if (q === '"' && c === '\\') { i++; if (i < cmd.length) mask[i] = false; continue; }
      if (c === q) q = null;
    }
  }
  return mask;
}

/**
 * Bodies the shell will EXPAND before the interpreter sees them.
 * Quoted heredocs and single-quoted inline bodies are verbatim and are not returned.
 * Operators are honoured only at UNQUOTED positions of the command line.
 */
export function expandedBodies(cmd) {
  const out = [];
  let m;
  const mask = unquotedMask(cmd);
  const unq = (i) => mask[i] === true;
  // Unquoted heredoc. `(?<![<])<<(?!<)` rejects here-strings (`<<<`). `-?` allows the
  // tab-stripping form. Delimiter = any run of chars that is not whitespace, a quote,
  // a backslash, or `<` — so `<<'EOF'`, `<<"EOF"`, `<<\EOF` do NOT match (verbatim) and
  // `<<0`, `<<__X__` DO. Terminator may be indented (tabs are legal under `<<-`; agents
  // indent under `<<` too, and the shell then never terminates — which is its own bug,
  // but the body is still shell-expanded, so it is still ours to inspect).
  // Every body carries its SPAN [start, end) in cmd, not just its text: the hatch check
  // excises spans. A content-equality strip (`split(text).join('')`) removed every copy
  // of the text anywhere in the command and could glue a near-miss comment into a
  // synthetic hatch, or erase a real one (Grok r2 F1).
  // Terminators are BASH-FAITHFUL (GLM r2 F1 — the round-1 loosening overshot): plain
  // `<<DELIM` ends only on DELIM alone at column 0; `<<-DELIM` ends on DELIM preceded by
  // TABS only (bash strips leading tabs, never spaces). A terminator regex looser than
  // bash stops the body EARLY on an indented look-alike line, and everything after it —
  // still shell-expanded in reality — goes uninspected: a silent false-ALLOW. Two
  // patterns rather than one, because the dash changes the terminator grammar.
  const hdPlain = /(?<!<)<<(?!-)[ \t]*([^\s'"\\<]+)[^\n]*\n([\s\S]*?)(?:\n\1[ \t]*(?:\n|$)|$)/g;
  const hdDash = /(?<!<)<<-[ \t]*([^\s'"\\<]+)[^\n]*\n([\s\S]*?)(?:\n\t*\1[ \t]*(?:\n|$)|$)/g;
  for (const hd of [hdPlain, hdDash]) {
    while ((m = hd.exec(cmd))) {
      if (!unq(m.index)) { hd.lastIndex = m.index + 2; continue; } // "<<" inside quotes is text
      const start = m.index + m[0].indexOf(m[2], m[0].indexOf('\n'));
      out.push({ kind: `unquoted heredoc <<${m[1]}`, text: m[2], start, end: start + m[2].length });
    }
  }
  // Inline interpreter, shell-expanded body forms only:
  //   double-quoted  "..."      ANSI-C  $'...'
  // Interpreter may carry other flags first (`--input-type=module`), the eval flag may
  // be joined with `=` or no space (`-e"..."`, `--eval="..."`). Single-quoted bodies are
  // verbatim and deliberately not captured.
  // Interpreter: node / python / python3 / python3.12 (versioned binaries — Grok r1 F4).
  // Between the eval flag and the body, other flags may sit (`-e --input-type=module
  // "..."`): tolerate `--flag` / `--flag=value` / `-x` runs before the quoted body.
  // `sh -c "..."` / `bash -c "..."` / `zsh -c` are the SAME hazard class as node -e: a
  // double-quoted body the outer shell expands before the inner shell sees it.
  const inl = /\b(node|python3?(?:\.\d+)?|sh|bash|zsh|ruby|perl|bun|deno)\b[^\n|;&]*?\s(?:-e|--eval|-p|--print|-c|eval)(?:=|[ \t]*(?:--?[\w-]+(?:=\S+)?[ \t]+)*)("(?:[^"\\]|\\.)*"|\$'(?:[^'\\]|\\.)*')/g;
  while ((m = inl.exec(cmd))) {
    if (!unq(m.index)) continue; // interpreter name inside quotes is text, not a command
    const q = m[2];
    const inner = q.startsWith('$') ? 2 : 1;
    const body = q.slice(inner, -1);
    const start = m.index + m[0].lastIndexOf(q) + inner;
    out.push({ kind: `${m[1]} inline ${q.startsWith('$') ? "$'...'" : '"..."'} body`, text: body, start, end: start + body.length });
  }
  // Double-quoted HERE-STRING: `cmd <<<"..."` is shell-expanded like any "..."; a
  // single-quoted or bare-word here-string is verbatim (round-1 Ox F3).
  const hs = /<<<[ \t]*"((?:[^"\\]|\\.)*)"/g;
  while ((m = hs.exec(cmd))) {
    if (!unq(m.index)) continue; // "<<<" inside quotes is text
    const start = m.index + m[0].indexOf('"') + 1;
    out.push({ kind: 'double-quoted here-string <<<"..."', text: m[1], start, end: start + m[1].length });
  }
  // UNQUOTED here-string operand (`<<<$x`, `<<<$(cmd)`, `<<<${x}`): also shell-expanded.
  // A bare word (`<<< input.txt`) is literal and is not returned; `<<<'...'` is verbatim.
  const hsu = /<<<[ \t]*(\$[^\s'"|;&]*)/g;
  while ((m = hsu.exec(cmd))) {
    if (!unq(m.index)) continue; // "<<<" inside quotes is text
    const start = m.index + m[0].indexOf('$');
    out.push({ kind: 'unquoted here-string <<<$…', text: m[1], start, end: start + m[1].length });
  }
  return out;
}

/**
 * LITERAL spans — regions that are verbatim (not hazards) but must still be excluded
 * from the hatch scan (GLM r2 F3): a quoted-delimiter heredoc body (`<<'NOTE' … NOTE`)
 * or a single-quoted argument (`echo '# HEREDOC-OK: …'`) is data, and data must not
 * be able to carry the override key. Returned as [start,end) spans only.
 */
export function literalSpans(cmd) {
  const spans = [];
  let m;
  // Quoted-delimiter heredocs: <<'X', <<"X", <<\X (with optional -). Body is literal.
  const qhd = /(?<!<)<<-?[ \t]*(?:'([^'\n]+)'|"([^"\n]+)"|\\([^\s'"\\<]+))[^\n]*\n([\s\S]*?)(?:\n[ \t]*(?:\1|\2|\3)[ \t]*(?:\n|$)|$)/g;
  while ((m = qhd.exec(cmd))) {
    const body = m[4];
    const start = m.index + m[0].indexOf(body, m[0].indexOf('\n'));
    spans.push({ start, end: start + body.length });
  }
  // Single-quoted arguments outside heredocs: '...' (no escapes possible inside).
  const sq = /'([^'\n]*)'/g;
  while ((m = sq.exec(cmd))) spans.push({ start: m.index + 1, end: m.index + 1 + m[1].length });
  return spans;
}

/** @returns {{block:boolean, reasons:string[], hatch:boolean}} */
export function classify(cmd) {
  if (typeof cmd !== 'string' || !cmd) return { block: false, reasons: [], hatch: false };
  const bodies = expandedBodies(cmd);
  // The hatch must sit OUTSIDE every expanded body (round-1 GLM F3): a heredoc whose
  // BODY contains "# HEREDOC-OK: ..." would otherwise carry its own key. Strip the
  // bodies, then look for the hatch in what remains — the command line itself.
  // SPAN excision, not content-equality removal (Grok r2 F1): `split(text).join('')`
  // removed every copy of a body's text anywhere in the command, so a body chosen to
  // equal a fragment of the command line could glue "# HERE" + "DOC-OK: …" into a
  // synthetic hatch, or delete a genuine one. Cutting exactly the captured [start,end)
  // spans, from the back so earlier offsets stay valid, cannot do either.
  // Excise BOTH expanded bodies and literal regions (quoted heredocs, '...' args) before
  // looking for the hatch: neither data channel may carry the override key (GLM r2 F3).
  // Spans can NEST (a '...' inside a heredoc body). Cutting a nested span first and then
  // its parent with stale offsets would over-cut past the parent's end — so MERGE
  // overlapping/nested intervals first, then cut from the back.
  let outside = cmd;
  const raw = [...bodies, ...literalSpans(cmd)]
    .filter((b) => Number.isInteger(b.start) && Number.isInteger(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ start: s.start, end: s.end });
  }
  for (const s of merged.reverse()) outside = outside.slice(0, s.start) + outside.slice(s.end);
  const hatch = outside.match(/#\s*HEREDOC-OK:\s*(.{12,})/i);
  if (hatch) return { block: false, reasons: [`hatch: ${hatch[1].trim().slice(0, 80)}`], hatch: true };
  const reasons = [];
  for (const b of bodies) {
    const hit = EXPANDS.filter((h) => h.re.test(b.text)).map((h) => h.name);
    if (hit.length) reasons.push(`${b.kind} contains ${hit.join(', ')}`);
  }
  return { block: reasons.length > 0, reasons, hatch: false };
}

export function logFire({ blocked, shadow, hatch, reasons, bodies }, root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  try {
    const dir = join(root, '.ai-workflow', 'gates');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = join(dir, 'fires.jsonl');
    // Rotation (round-1 Ox F5): this runs on EVERY Bash call. Keep one previous
    // generation; at ~1 MB (~5k rows) roll over. Two files is enough history for a
    // 14-day rate and bounded forever. A failed rename falls through to append.
    try { if (existsSync(file) && statSync(file).size > 1_048_576) renameSync(file, join(dir, 'fires.1.jsonl')); } catch { /* keep appending */ }
    appendFileSync(file,
      JSON.stringify({ ts: new Date().toISOString(), gate: 'heredoc-escape', blocked, shadow, hatch, bodies, reasons }) + '\n');
  } catch { /* logging must never affect the verdict */ }
}

export const isShadow = () => /^(shadow|log|warn)$/i.test(process.env.SWAN_HEREDOC_GATE || '');

export function main() {
  let cmd = '';
  try {
    cmd = JSON.parse(readFileSync(0, 'utf8') || '{}')?.tool_input?.command || '';
  } catch (err) {
    console.error(`[heredoc-escape] could not read hook input, failing open: ${err?.message}`);
    process.exit(0);
  }
  let verdict, bodies = 0;
  try { verdict = classify(cmd); bodies = expandedBodies(cmd).length; } catch (err) {
    console.error(`[heredoc-escape] gate error, failing open: ${err?.message}`);
    process.exit(0);
  }
  const shadow = isShadow();
  logFire({ blocked: verdict.block && !shadow, shadow, hatch: verdict.hatch, reasons: verdict.reasons, bodies });
  if (!verdict.block) process.exit(0);
  if (shadow) {
    console.error(`[heredoc-escape] SHADOW — would block: ${verdict.reasons.join('; ')}`);
    process.exit(0);
  }
  console.error(
    '\n  HEREDOC-ESCAPE GATE — the shell will rewrite this content before it lands.\n\n' +
    verdict.reasons.map((r) => `    • ${r}`).join('\n') + '\n\n' +
    '  An UNQUOTED heredoc (<<EOF) and a double-quoted or $\'...\' inline body are shell-\n' +
    '  expanded: ${x} / $x / $(cmd) are substituted, `cmd` is executed, \\ is an escape.\n' +
    '  The write succeeds and the file is wrong. 123 corpus incidents; prose did not hold.\n\n' +
    "  FIX — pick one:\n" +
    "    quote the delimiter     <<'EOF'   (verbatim; no expansion)\n" +
    '    use the Write tool      for any file with backticks, $, or backslashes\n' +
    '    # HEREDOC-OK: <reason>  deliberate exception (≥ 12 chars), logged and greppable\n\n' +
    '  Nothing was run.\n'
  );
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
