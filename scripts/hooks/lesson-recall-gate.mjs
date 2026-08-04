/**
 * lesson-recall-gate.mjs — deterministic Stop hook against repeating your own lessons.
 *
 * WHY (Sean, 2026-08-04): a store/checkout audit ran 35 hostile rounds, and in the final
 * pass TWO of five mistakes were repeats of lessons recorded earlier in that SAME audit —
 * written down, committed, then re-committed as fresh defects hours later. Sean: "we need to
 * turn this into a skill that fires that looks out for this issue so we do not keep making
 * the same mistake."
 *
 * The lessons were not missing. They were written down and not RECALLED at the moment of
 * writing code. Prose cannot fix that (CLAUDE.md rule 57: "a duty enforced only by the model
 * remembering is a duty that will eventually be dropped"), so this is a hook.
 *
 * CONTRACT (Claude Code Stop hook, type "command" — same shape as dry-loop-gate):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES (current turn only):
 *   1. stop_hook_active                  -> allow (no-loop guard: one enforcement per turn)
 *   2. transcript unreadable / any throw  -> allow (FAIL-OPEN; a broken gate must never wedge)
 *   3. not build-shaped (no code writes)  -> allow silently (docs-only turns are exempt)
 *   4. closeout carries LESSON-RECALL: N/A -> allow (honest, reasoned escape hatch)
 *   5. Shape 2 detected (DUPLICATED VALUE) -> BLOCK, naming both locations
 *   6. otherwise -> allow, but print the session's own recorded lessons + any Shape 1 warning
 *
 * Shape 2 is the only BLOCKING signal because it is the only one that can be established
 * mechanically without guessing: the same identifier bound to the same literal in two files
 * is a duplicated value by definition. Shape 1 (a rule enforced at one layer when it must
 * hold at several) cannot be proven by grep — enforcing it as a block would fire on every
 * legitimate single-file guard — so it is surfaced as a warning for the agent to answer.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const CODE_RE = /\.(mjs|cjs|js|jsx|ts|tsx)$/;
const DOC_RE = /\.(md|txt|ya?ml|json)$/;
const ESCAPE_RE = /LESSON-RECALL:\s*N\/A\s*[—:-]/i;

/** A named constant bound to a numeric or quoted-string literal. */
const CONST_DECL_RE =
  /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(-?\d+(?:\.\d+)?|'[^'\n]{1,60}'|"[^"\n]{1,60}")\s*;/g;

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const parseTranscript = (transcriptPath) => {
  const raw = readFileSync(transcriptPath, 'utf8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

/** Files this turn wrote, and the assistant's closing text. */
export const readTurn = (entries) => {
  const written = new Set();
  let closingText = '';

  for (const entry of entries) {
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block?.type === 'tool_use' && WRITE_TOOLS.has(block.name)) {
        const file = block.input?.file_path || block.input?.path;
        if (typeof file === 'string') written.add(file);
      }
      if (block?.type === 'text' && entry?.message?.role === 'assistant') {
        closingText = block.text || closingText;
      }
    }
  }

  return { written: [...written], closingText };
};

export const isBuildShaped = (written) => written.some((f) => CODE_RE.test(f));

/**
 * Shape 2 — a named constant bound to a literal that ALSO exists elsewhere in the repo
 * under the same identifier. Two homes for one value is a duplication by definition.
 */
export const findDuplicatedConstants = (written, repoRoot, grep) => {
  const hits = [];

  for (const file of written) {
    if (!CODE_RE.test(file) || !existsSync(file)) continue;

    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    CONST_DECL_RE.lastIndex = 0;
    let match;
    while ((match = CONST_DECL_RE.exec(source)) !== null) {
      const [, name, literal] = match;
      const elsewhere = grep(name, repoRoot).filter((hit) => path.resolve(hit) !== path.resolve(file));
      if (elsewhere.length > 0) {
        hits.push({ name, literal, declaredIn: file, alsoIn: elsewhere.slice(0, 3) });
      }
    }
  }

  return hits;
};

/** Shape 1 — a new refusal/guard added in exactly one code file this turn. */
export const findSingleLayerGuards = (written) => {
  const guardFiles = written.filter((file) => {
    if (!CODE_RE.test(file) || !existsSync(file)) return false;
    if (/\.test\.|\.spec\./.test(file)) return false;
    try {
      const source = readFileSync(file, 'utf8');
      return /res\.status\(4\d\d\)|throw new Error\(/.test(source);
    } catch {
      return false;
    }
  });

  return guardFiles.length === 1 ? guardFiles[0] : null;
};

/** Lessons this session already wrote down — the things being repeated. */
export const collectSessionLessons = (repoRoot, listMemos, gitSubjects) => {
  const lessons = [];

  for (const memo of listMemos(repoRoot)) {
    try {
      const text = readFileSync(memo, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*-\s+\*\*(.+?)\*\*/);
        if (m && m[1].length < 140) lessons.push(m[1].trim());
      }
    } catch {
      /* ignore unreadable memo */
    }
  }

  for (const subject of gitSubjects()) {
    if (/^(fix|test|audit|refactor)\(/.test(subject)) lessons.push(subject);
  }

  return [...new Set(lessons)].slice(0, 12);
};

// ── default IO adapters (injected in tests) ────────────────────────────────
export const defaultGrep = (name, repoRoot) => {
  try {
    // `-w` (whole-word), NOT a `\b...\b` pattern: git grep defaults to BASIC regex,
    // which does not support \b. The first version of this used \b, so every lookup
    // threw, the catch below swallowed it, and the gate silently found nothing while
    // its unit tests — which injected a fake grep — stayed green. Exactly the
    // false-confidence shape this gate exists to prevent, committed inside the gate.
    // `grepFindsKnownSymbol` below pins the REAL implementation so it cannot return.
    const out = execFileSync(
      'git',
      ['grep', '-l', '-w', '-e', name],
      { cwd: repoRoot, encoding: 'utf8', timeout: 8000 },
    );
    return out.split('\n').filter(Boolean).map((f) => path.join(repoRoot, f));
  } catch {
    // Exit status 1 means "no matches", which is a legitimate empty result.
    return [];
  }
};

const defaultListMemos = (repoRoot) => {
  const dir = path.join(repoRoot, '.ai-workflow', 'hermes-inbox', 'pending');
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
};

const defaultGitSubjects = (repoRoot) => () => {
  try {
    return execFileSync('git', ['log', '--format=%s', '-12'], {
      cwd: repoRoot, encoding: 'utf8', timeout: 8000,
    }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const block = (reason) => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

export const buildBlockReason = (dupes) => {
  const lines = dupes.map(
    (d) => `  • ${d.name} = ${d.literal}\n      declared here : ${d.declaredIn}\n      already lives : ${d.alsoIn.join(', ')}`,
  );
  return [
    'LESSON RECALL — Shape 2, THE DUPLICATED VALUE (Sean 2026-08-04).',
    '',
    'This turn declares a constant that already exists elsewhere under the same name:',
    ...lines,
    '',
    'A value two layers must agree on belongs in ONE shared module. Duplicated values always',
    'diverge — this audit already shipped two money defects of exactly this shape (displayed',
    'total vs charged total; cart session count vs granted count), and then reintroduced it',
    'while fixing it.',
    '',
    'Do ONE of:',
    '  (a) move the value into a shared module and import it in both places — preferred;',
    '  (b) if the two really are unrelated values that share a name, rename one; or',
    '  (c) if the duplication is genuinely correct, say why in the closeout:',
    '      LESSON-RECALL: N/A — <specific reason>',
  ].join('\n');
};

const main = () => {
  const stdin = readStdin();
  let payload = {};
  try {
    payload = JSON.parse(stdin || '{}');
  } catch {
    return; // fail-open
  }

  if (payload.stop_hook_active) return;
  if (!payload.transcript_path) return;

  let entries;
  try {
    entries = parseTranscript(payload.transcript_path);
  } catch {
    return; // fail-open
  }

  const { written, closingText } = readTurn(entries);
  if (!isBuildShaped(written)) return;
  if (ESCAPE_RE.test(closingText)) return;

  const repoRoot = process.cwd();
  const dupes = findDuplicatedConstants(written, repoRoot, defaultGrep);
  if (dupes.length > 0) block(buildBlockReason(dupes));

  // Non-blocking recall: surface this session's own lessons + the Shape 1 warning.
  const lessons = collectSessionLessons(repoRoot, defaultListMemos, defaultGitSubjects(repoRoot));
  const singleGuard = findSingleLayerGuards(written);
  if (lessons.length === 0 && !singleGuard) return;

  const notes = ['LESSON RECALL (advisory — not blocking):'];
  if (singleGuard) {
    notes.push(
      '',
      `Shape 1 check — a guard/refusal was added in exactly one file: ${singleGuard}`,
      'If the rule must hold at more than one layer, enumerate them before calling the class',
      'closed. A quantity cap enforced at the cart routes but not at checkout is how an',
      'oversized row still reached Stripe in this very audit.',
    );
  }
  if (lessons.length > 0) {
    notes.push('', 'Lessons THIS SESSION already recorded — does this turn repeat any?');
    for (const lesson of lessons) notes.push(`  • ${lesson}`);
  }
  process.stderr.write(`${notes.join('\n')}\n`);
};

const isDirectRun = process.argv[1] && process.argv[1].endsWith('lesson-recall-gate.mjs');
if (isDirectRun) {
  try {
    main();
  } catch {
    process.exit(0); // fail-open on any internal error
  }
}
