#!/usr/bin/env node
/**
 * heredoc-escape-gate.mjs — PreToolUse (Bash) gate, MECHANISM-PRECISE.
 *
 * WHY (corpus 2026-07-11 → 2026-08-25): SHELL/ESCAPING is the highest-count failure
 * family — 123 "Mistakes I made" bullets, 19 ledger rows, 63% recurrence AFTER
 * being written up. Prose did not hold. Syntax can be gated deterministically.
 *
 * NARROWED after panel review (DeepSeek F2, HY3 F2, 2026-08-25): the first draft
 * blocked ANY heredoc carrying a backtick/`${`/pipe. That attacked the delivery
 * channel, not the mechanism, and would have false-positived on legitimate quoted
 * heredocs. The actual mangle mechanism is narrower and exact:
 *
 *   1. An UNQUOTED heredoc (`<<EOF`, `<<-EOF`) is subject to shell expansion:
 *      `${x}` is substituted, `` `cmd` `` is executed, `\` is an escape. Content
 *      that carries those literally — a JS template literal, a Makefile, a JSON
 *      with `${}` placeholders — is silently rewritten. A QUOTED heredoc
 *      (`<<'EOF'` or `<<"EOF"`) is passed verbatim and is SAFE. Not blocked.
 *   2. A DOUBLE-QUOTED inline body (`node -e "..."`, `python -c "..."`) is subject
 *      to the same expansion plus `\` processing. A SINGLE-QUOTED body is verbatim
 *      except that it cannot contain a single quote — and the corpus's inline
 *      failures were exactly that: quote-heavy code stuffed into one shell line.
 *
 * So: block unquoted heredocs and double-quoted inline bodies that contain `${`,
 * a backtick, or a backslash. Allow everything else. No table-pipe rule (pipes do
 * not expand; the earlier "table broke my heredoc" incident was a delimiter typo).
 *
 * Escape hatch, greppable: `# HEREDOC-OK: <reason>` anywhere in the command.
 * INSTRUMENTED: every block appends one JSON line to .ai-workflow/gates/fires.jsonl
 * so the gate's fire rate is measurable (HY3 F8 / DeepSeek E6: no measurement plan).
 *
 * CONTRACT (matches exit-status-gate.mjs): stdin JSON `{tool_input:{command}}`;
 * exit 2 + stderr = block; exit 0 = allow; internal error = fail OPEN with a note.
 * Logic exported; stdin read only when run directly, so tests can import it.
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const EXPANDS = [
  { re: /\$\{/,  name: '${...} (shell expands it)' },
  { re: /`/,     name: 'backtick (shell executes it)' },
  { re: /\\/,    name: 'backslash (shell escape-processes it)' },
];

/**
 * Bodies the shell will EXPAND before the interpreter sees them.
 * Quoted heredocs and single-quoted inline bodies are verbatim and are not returned.
 */
export function expandedBodies(cmd) {
  const out = [];
  let m;
  // Heredoc with an UNQUOTED delimiter: <<EOF or <<-EOF (not <<'EOF' / <<"EOF").
  const hd = /<<-?\s*([A-Za-z_][A-Za-z0-9_]*)\b[^\n]*\n([\s\S]*?)(?:\n\1\s*(?:\n|$)|$)/g;
  while ((m = hd.exec(cmd))) out.push({ kind: `unquoted heredoc <<${m[1]}`, text: m[2] });
  // Inline interpreter with a DOUBLE-quoted body.
  const inl = /\b(node\s+(?:-e|--eval|-p)|python3?\s+-c)\s+"((?:[^"\\]|\\.)*)"/g;
  while ((m = inl.exec(cmd))) out.push({ kind: `${m[1].replace(/\s+/g, ' ')} "..."`, text: m[2] });
  return out;
}

/** @returns {{block:boolean, reasons:string[]}} */
export function classify(cmd) {
  if (typeof cmd !== 'string' || !cmd) return { block: false, reasons: [] };
  if (/#\s*HEREDOC-OK:/i.test(cmd)) return { block: false, reasons: ['escape hatch present'] };
  const reasons = [];
  for (const b of expandedBodies(cmd)) {
    const hit = EXPANDS.filter((h) => h.re.test(b.text)).map((h) => h.name);
    if (hit.length) reasons.push(`${b.kind} contains ${hit.join(', ')}`);
  }
  return { block: reasons.length > 0, reasons };
}

/**
 * One JSON line per INVOCATION — blocked or not — so the fire rate has a denominator
 * (Grok E10: "family-3 bullets per 100 Bash calls, pre/post, 14 days"). Only the
 * evaluated-body count and the verdict are recorded, never the command text.
 */
export function logFire({ blocked, shadow, reasons, bodies }, root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  try {
    const dir = join(root, '.ai-workflow', 'gates');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'fires.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), gate: 'heredoc-escape', blocked, shadow, bodies, reasons }) + '\n');
  } catch { /* logging must never affect the verdict */ }
}

/**
 * SHADOW MODE (Grok E2): `SWAN_HEREDOC_GATE=shadow` logs what WOULD block and allows
 * the command. Use it to measure a false-positive rate on real traffic before trusting
 * the block; the default is to block, because the narrowed predicate (unquoted heredoc
 * or double-quoted -e body containing ${ ` or \) has no legitimate-work false positive
 * that a quoted delimiter does not cure.
 */
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
  logFire({ blocked: verdict.block && !shadow, shadow, reasons: verdict.reasons, bodies });
  if (!verdict.block) process.exit(0);
  if (shadow) {
    console.error(`[heredoc-escape] SHADOW — would block: ${verdict.reasons.join('; ')}`);
    process.exit(0);
  }
  console.error(
    '\n  HEREDOC-ESCAPE GATE — the shell will rewrite this content before it lands.\n\n' +
    verdict.reasons.map((r) => `    • ${r}`).join('\n') + '\n\n' +
    '  An UNQUOTED heredoc (<<EOF) and a double-quoted inline body ("...") are shell-\n' +
    '  expanded: ${x} is substituted, `cmd` is executed, \\ is an escape. The write\n' +
    '  succeeds and the file is wrong. 123 corpus incidents; prose did not hold.\n\n' +
    "  FIX — pick one:\n" +
    "    quote the delimiter     <<'EOF'   (verbatim; no expansion)\n" +
    '    use the Write tool      for any file with backticks, ${}, or backslashes\n' +
    '    # HEREDOC-OK: <reason>  deliberate exception, greppable afterwards\n\n' +
    '  Nothing was run.\n'
  );
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
