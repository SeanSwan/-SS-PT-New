/**
 * FILE: encoding-scan.mjs
 * WHY:  The receipt's "Encoding" row used to cite a scan that existed only as an inline PowerShell
 *       pipeline, so a reader could see the NUMBERS but not reproduce them. That is the same defect
 *       class this packet kept finding in its own prose: a figure with no command behind it. This
 *       script is the command.
 *
 * WHAT IT DOES: enumerates every changed or untracked path (both classes, because rule 42's two
 * classes are the ones that reach a deploy), then validates each file as UTF-8 with a STRICT decoder
 * (`fatal: true`), which rejects overlong forms, lone surrogates and truncated sequences rather than
 * silently substituting U+FFFD. A file that is not valid UTF-8 is reported by name with the byte
 * offset and the surrounding bytes — a byte COUNT is not a diagnosis, which this packet learned the
 * expensive way when repairing a stray 0x97 also broke a legitimate `×` (`C3 97`) two bytes away.
 *
 * TWO CLASSES, NOT ONE, because "invalid UTF-8" and "binary asset" are different answers:
 *   INVALID  a text file whose bytes are not UTF-8 — always a defect to fix.
 *   BINARY   a file with a NUL byte in its first 8 KiB (an image, a zip, a source map). Not a defect,
 *            and NOT counted as text, so the totals cannot be read as "N files passed".
 * Anything else is TEXT and must decode cleanly.
 *
 * LIMITS, so the result is not over-read:
 *  - It checks ENCODING ONLY. A valid UTF-8 file can still be mojibake (the right bytes showing the
 *    wrong characters), which is why the packet's byte-repair story is recorded in the receipt with
 *    its sequence context rather than inferred from a pass here.
 *  - It does not decide whether a file SHOULD be text. It classifies what is there.
 *
 * Run from `backend/`: `node .mega-blueprints/artifacts/<id>/encoding-scan.mjs`
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Round 147: resolve the packet root by WALKING UP, not by assuming CWD is `backend/`.
// The former `path.resolve(process.cwd(), '..')` made this scan report `ENCODING_SCAN_OK` (exit 0) from
// any directory whose parent had no `backend/` — it enumerated ZERO files and, because the verdict was
// `invalid.length === 0`, an empty scan read as a clean one. A false PASS is worse than a false failure:
// it puts a green line in the receipt for bytes nobody read. The root is now found or the scan refuses.
function resolveRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, 'backend')) && existsSync(path.join(dir, '.mega-blueprints'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = resolveRoot(process.cwd());
if (!root) {
  console.log(`ENCODING_SCAN_FAILED: no packet root at or above ${process.cwd()}`);
  console.log('  a packet root holds BOTH backend/ and .mega-blueprints/');
  process.exit(1);
}
const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean)
  .map((line) => line.trim())
  // `git diff --name-only` can emit a quoted path when the name has non-ASCII bytes; unquote it so
  // the read below uses the real path rather than failing on the quotes.
  .map((line) => (line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1) : line));

const changed = [...new Set([
  ...git(['ls-files', '--others', '--exclude-standard']),
  ...git(['diff', '--name-only', 'HEAD']),
])];

const utf8 = new TextDecoder('utf-8', { fatal: true });
const text = [];
const binary = [];
const invalid = [];

for (const rel of changed) {
  const abs = path.join(root, rel);
  let bytes;
  try {
    bytes = readFileSync(abs);
  } catch {
    continue; // deleted-but-listed, or a path git knows and the walk does not
  }
  const head = bytes.subarray(0, 8192);
  if (head.includes(0)) {
    binary.push(rel);
    continue;
  }
  try {
    utf8.decode(bytes);
    text.push(rel);
  } catch (error) {
    // Locate the first byte the strict decoder rejects, with 4 bytes of context either side.
    let at = 0;
    for (let end = 1; end <= bytes.length; end += 1) {
      try {
        utf8.decode(bytes.subarray(0, end));
      } catch {
        at = end - 1;
        break;
      }
    }
    const from = Math.max(0, at - 4);
    const context = [...bytes.subarray(from, at + 4)]
      .map((b) => b.toString(16).padStart(2, '0')).join(' ');
    invalid.push({ rel, offset: at, context, reason: error.message });
  }
}

console.log(`changed/untracked paths : ${changed.length}`);
console.log(`text files (valid UTF-8): ${text.length}`);
console.log(`binary assets (excluded): ${binary.length}`);
console.log(`INVALID text files      : ${invalid.length}`);
for (const bad of invalid) {
  console.log(`  ${bad.rel}  first invalid byte at offset ${bad.offset}  [${bad.context}]  (${bad.reason})`);
}
if (binary.length > 0 && binary.length <= 12) {
  for (const b of binary) console.log(`  binary: ${b}`);
}

// Round 147 vacuity guard: `ok = invalid.length === 0` is trivially satisfied by a scan that read
// nothing, which is exactly how the wrong-root false pass survived. A scan that examined no bytes has
// verified nothing and must not print OK.
if (changed.length === 0 || text.length === 0) {
  console.log(`ENCODING_SCAN_FAILED: nothing was scanned — ${changed.length} changed/untracked paths, ${text.length} text files`);
  console.log('  an empty scan verifies no bytes, so it cannot report OK; check the root and the git state');
  process.exit(1);
}
const ok = invalid.length === 0;
console.log(ok ? 'ENCODING_SCAN_OK' : 'ENCODING_SCAN_FAILED');
process.exit(ok ? 0 : 1);
