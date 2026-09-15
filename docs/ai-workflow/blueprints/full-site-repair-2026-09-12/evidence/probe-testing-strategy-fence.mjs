#!/usr/bin/env node
/**
 * Throwaway diagnostic: does the unbalanced ``` fence at
 * ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md:565 make the checker blind
 * to `## Testing Strategy` (line 592), and is that why `#testing-strategy` is dead?
 *
 * Copies the file into ./tmp-fence-probe/, closes the orphan fence in the COPY,
 * re-runs the gate engine on both copies, and prints the verdicts. Writes
 * nothing outside ./tmp-fence-probe/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const markdownLinkCheck = promisify(require('markdown-link-check'));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PROBE_DIR = path.join(HERE, 'tmp-fence-probe');
const SRC = path.join(REPO_ROOT, 'docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md');

fs.rmSync(PROBE_DIR, { recursive: true, force: true });
fs.mkdirSync(PROBE_DIR, { recursive: true });

const original = fs.readFileSync(SRC, 'utf8');
const originalCopy = path.join(PROBE_DIR, 'original.md');
fs.writeFileSync(originalCopy, original);

// Close the orphan fence: the File Structure block opens at line 565 and is
// never closed, so the checker's removeCodeBlocks() swallows everything up to
// the next exactly-``` line (622). Insert a closing fence right after the block.
const lines = original.split('\n');
const patched = [...lines.slice(0, 588), '```', ...lines.slice(588)].join('\n');
const patchedCopy = path.join(PROBE_DIR, 'fence-closed.md');
fs.writeFileSync(patchedCopy, patched);

const config = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.github', 'markdown-link-check-config.json'), 'utf8'));

async function verdicts(file) {
  const markdown = fs.readFileSync(file, 'utf8');
  const results = await markdownLinkCheck(markdown, {
    ...config,
    ignorePatterns: [{ pattern: '^(?!#)' }],
    baseUrl: `file://${PROBE_DIR.replace(/\\/g, '/')}`,
    quiet: true,
  });
  return results.filter((r) => r.link === '#testing-strategy');
}

for (const [label, file] of [['original copy', originalCopy], ['fence closed at L589', patchedCopy]]) {
  const results = await verdicts(file);
  console.log(`${label}: #testing-strategy -> ${results.map((r) => r.status + ' (' + r.statusCode + ')').join(', ') || 'link not found'}`);
}
fs.rmSync(PROBE_DIR, { recursive: true, force: true });
