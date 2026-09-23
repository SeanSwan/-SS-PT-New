/**
 * sync-agents-mirror.mjs
 * ======================
 * Regenerates the agent-surface mirrors from the single source of truth.
 *
 * Each mirror file = <adapter header> + MIRROR_MARKER + a byte-exact UTF-8 mirror
 * of CLAUDE.md. Historically the mirrors were pasted by hand and picked up cp1252
 * mojibake (220 broken em-dashes by 2026-07-07). This script makes the mirror
 * mechanical:
 *
 *   node scripts/sync-agents-mirror.mjs          # regenerate every mirror body
 *   node scripts/sync-agents-mirror.mjs --check  # exit 1 if any mirror drifted
 *
 * The header (everything above the MIRROR_MARKER) is owned by each target file and
 * preserved verbatim; only the body below the marker is replaced with the current
 * CLAUDE.md, byte-for-byte.
 *
 * Mirrors maintained:
 *   AGENTS.md    - Codex surface (also the rule source for the OpenCode seat)
 *   CODEBUDDY.md - WorkBuddy surface (added 2026-09-19; WorkBuddy reads CODEBUDDY.md
 *                  in preference to AGENTS.md, so a WorkBuddy-specific instruction
 *                  must live in that file or WorkBuddy stops seeing it)
 *   GEMINI.md    - Gemini CLI surface (added 2026-09-20; the file did not exist
 *                  before, so a Gemini session loaded NO project rules at all)
 *
 * A target that does not exist is skipped, not created - the adapter header is a
 * human-owned artifact and must be written deliberately. `--check` reports a
 * missing target as a finding rather than passing it silently.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_PATH = resolve(root, 'CLAUDE.md');
const MIRROR_MARKER = '--- project-doc mirror from CLAUDE.md ---';

const MIRRORS = [
  { file: 'AGENTS.md', label: 'Codex' },
  { file: 'CODEBUDDY.md', label: 'WorkBuddy' },
  { file: 'GEMINI.md', label: 'Gemini CLI' },
];

const sha = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);

const claude = readFileSync(CLAUDE_PATH, 'utf8');
const checkOnly = process.argv.includes('--check');

let failures = 0;
let written = 0;
let skipped = 0;

for (const { file, label } of MIRRORS) {
  const targetPath = resolve(root, file);

  if (!existsSync(targetPath)) {
    if (checkOnly) {
      console.error(`MISSING: ${file} (${label} mirror) does not exist.`);
      failures += 1;
    } else {
      console.log(`SKIP: ${file} not present - adapter header is human-owned, not auto-created.`);
      skipped += 1;
    }
    continue;
  }

  const target = readFileSync(targetPath, 'utf8');
  const markerIndex = target.indexOf(MIRROR_MARKER);
  if (markerIndex === -1) {
    console.error(`FAIL: ${file} is missing the mirror marker "${MIRROR_MARKER}"`);
    failures += 1;
    continue;
  }

  const header = target.slice(0, markerIndex + MIRROR_MARKER.length);
  const currentBody = target.slice(markerIndex + MIRROR_MARKER.length).replace(/^(?:\r?\n)+/, '');
  const expectedBody = claude;

  if (currentBody === expectedBody) {
    console.log(`OK: ${file} (${label}) mirror matches CLAUDE.md (body sha ${sha(expectedBody)})`);
    continue;
  }

  if (checkOnly) {
    console.error(
      `DRIFT: ${file} (${label}) mirror body (sha ${sha(currentBody)}) != CLAUDE.md ` +
      `(sha ${sha(expectedBody)}). Run: node scripts/sync-agents-mirror.mjs`,
    );
    failures += 1;
    continue;
  }

  // The seam must use the SAME line ending as the body. Writing a bare '\n\n'
  // between a CRLF header and a CRLF body leaves two stray LF-only lines, and
  // CLAUDE.md is CRLF on this repo — so a mirror rebuilt after an editor
  // normalised it would come back byte-different from its neighbours.
  const eol = expectedBody.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(targetPath, `${header}${eol}${eol}${expectedBody}`, 'utf8');
  console.log(`${file} (${label}) mirror regenerated from CLAUDE.md (body sha ${sha(expectedBody)}).`);
  written += 1;
}

if (checkOnly) {
  process.exit(failures > 0 ? 1 : 0);
}

if (written === 0 && skipped === 0) {
  console.log('All mirrors already in sync - nothing written.');
}
