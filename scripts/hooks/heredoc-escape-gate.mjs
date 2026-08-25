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
 * Bodies the shell will EXPAND before the interpreter sees them.
 * Quoted heredocs and single-quoted inline bodies are verbatim and are not returned.
 */
export function expandedBodies(cmd) {
  const out = [];
  let m;
  // Unquoted heredoc. `(?<![<])<<(?!<)` rejects here-strings (`<<<`). `-?` allows the
  // tab-stripping form. Delimiter = any run of chars that is not whitespace, a quote,
  // a backslash, or `<` — so `<<'EOF'`, `<<"EOF"`, `<<\EOF` do NOT match (verbatim) and
  // `<<0`, `<<__X__` DO. Terminator may be indented (tabs are legal under `<<-`; agents
  // indent under `<<` too, and the shell then never terminates — which is its own bug,
  // but the body is still shell-expanded, so it is still ours to inspect).
  const hd = /(?<!<)<<-?[ \t]*([^\s'"\\<]+)[^\n]*\n([\s\S]*?)(?:\n[ \t]*\1[ \t]*(?:\n|$)|$)/g;
  while ((m = hd.exec(cmd))) out.push({ kind: `unquoted heredoc <<${m[1]}`, text: m[2] });
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
  const inl = /\b(node|python3?(?:\.\d+)?|sh|bash|zsh)\b[^\n|;&]*?\s(?:-e|--eval|-p|--print|-c)(?:=|[ \t]*(?:--?[\w-]+(?:=\S+)?[ \t]+)*)("(?:[^"\\]|\\.)*"|\$'(?:[^'\\]|\\.)*')/g;
  while ((m = inl.exec(cmd))) {
    const q = m[2];
    const body = q.startsWith('$') ? q.slice(2, -1) : q.slice(1, -1);
    out.push({ kind: `${m[1]} inline ${q.startsWith('$') ? "$'...'" : '"..."'} body`, text: body });
  }
  // Double-quoted HERE-STRING: `cmd <<<"..."` is shell-expanded like any "..."; a
  // single-quoted or bare-word here-string is verbatim (round-1 Ox F3).
  const hs = /<<<[ \t]*"((?:[^"\\]|\\.)*)"/g;
  while ((m = hs.exec(cmd))) out.push({ kind: 'double-quoted here-string <<<"..."', text: m[1] });
  // UNQUOTED here-string operand (`<<<$x`, `<<<$(cmd)`, `<<<${x}`): also shell-expanded.
  // A bare word (`<<< input.txt`) is literal and is not returned; `<<<'...'` is verbatim.
  const hsu = /<<<[ \t]*(\$[^\s'"|;&]*)/g;
  while ((m = hsu.exec(cmd))) out.push({ kind: 'unquoted here-string <<<$…', text: m[1] });
  return out;
}

/** @returns {{block:boolean, reasons:string[], hatch:boolean}} */
export function classify(cmd) {
  if (typeof cmd !== 'string' || !cmd) return { block: false, reasons: [], hatch: false };
  const bodies = expandedBodies(cmd);
  // The hatch must sit OUTSIDE every expanded body (round-1 GLM F3): a heredoc whose
  // BODY contains "# HEREDOC-OK: ..." would otherwise carry its own key. Strip the
  // bodies, then look for the hatch in what remains — the command line itself.
  let outside = cmd;
  for (const b of bodies) if (b.text) outside = outside.split(b.text).join('');
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
