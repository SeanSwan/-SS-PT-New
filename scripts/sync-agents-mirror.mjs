/**
 * sync-agents-mirror.mjs
 * ======================
 * AGENTS.md = Codex adapter header + a byte-exact UTF-8 mirror of CLAUDE.md.
 * Historically the mirror was pasted by hand and picked up cp1252 mojibake
 * (220 broken em-dashes by 2026-07-07). This script makes the mirror
 * mechanical:
 *
 *   node scripts/sync-agents-mirror.mjs          # regenerate the mirror body
 *   node scripts/sync-agents-mirror.mjs --check  # exit 1 if the mirror drifted
 *
 * The header (everything above the MIRROR_MARKER) is owned by AGENTS.md and
 * preserved verbatim; only the body below the marker is replaced with the
 * current CLAUDE.md, byte-for-byte.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_PATH = resolve(root, 'AGENTS.md');
const CLAUDE_PATH = resolve(root, 'CLAUDE.md');
const MIRROR_MARKER = '--- project-doc mirror from CLAUDE.md ---';

const sha = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);

const agents = readFileSync(AGENTS_PATH, 'utf8');
const claude = readFileSync(CLAUDE_PATH, 'utf8');

const markerIndex = agents.indexOf(MIRROR_MARKER);
if (markerIndex === -1) {
  console.error(`FAIL: AGENTS.md is missing the mirror marker "${MIRROR_MARKER}"`);
  process.exit(1);
}

const header = agents.slice(0, markerIndex + MIRROR_MARKER.length);
const currentBody = agents.slice(markerIndex + MIRROR_MARKER.length).replace(/^(?:\r?\n)+/, '');
const expectedBody = claude;

const inSync = currentBody === expectedBody;

if (process.argv.includes('--check')) {
  if (inSync) {
    console.log(`OK: AGENTS.md mirror matches CLAUDE.md (body sha ${sha(expectedBody)})`);
    process.exit(0);
  }
  console.error(
    `DRIFT: AGENTS.md mirror body (sha ${sha(currentBody)}) != CLAUDE.md (sha ${sha(expectedBody)}).` +
    ' Run: node scripts/sync-agents-mirror.mjs',
  );
  process.exit(1);
}

if (inSync) {
  console.log('AGENTS.md mirror already in sync — nothing written.');
  process.exit(0);
}

writeFileSync(AGENTS_PATH, `${header}\n\n${expectedBody}`, 'utf8');
console.log(`AGENTS.md mirror regenerated from CLAUDE.md (body sha ${sha(expectedBody)}).`);
