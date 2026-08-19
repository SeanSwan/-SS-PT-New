#!/usr/bin/env node
/**
 * redact-urls.mjs — mechanical URL redaction for handoff docs (R2 ruling R-4).
 *
 * The D4 boundary is enforced by MECHANISM, not policy: task threads may hold
 * reference URLs while work is live, but when thread content is quoted into a
 * committed handoff doc, URLs must not ride along. This script strips them.
 *
 * Kept intact (never redacted):
 *   - swanstudios.com / sswanstudios.com (our own product)
 *   - claude.ai artifact links (our own published canvases)
 *   - github.com/SeanSwan (our own repos)
 *   - relative repo paths (not URLs)
 * Everything else `http(s)://...` becomes `[URL-REDACTED per D4 — see THIRD_PARTY_NOTICES.md for provenance]`.
 *
 * Usage: node scripts/redact-urls.mjs <file.md> [--write]
 *   default: prints redacted content to stdout + a count to stderr (dry run)
 *   --write: rewrites the file in place
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ALLOW = [
  /^https?:\/\/(www\.)?s?swanstudios\.com/i,
  /^https?:\/\/claude\.ai\//i,
  /^https?:\/\/github\.com\/SeanSwan/i,
];
const URL_RE = /https?:\/\/[^\s)\]>"'`]+/g;
const TOKEN = '[URL-REDACTED per D4 — see THIRD_PARTY_NOTICES.md for provenance]';

export function redact(text) {
  let count = 0;
  const out = text.replace(URL_RE, (u) => {
    if (ALLOW.some((re) => re.test(u))) return u;
    count += 1;
    return TOKEN;
  });
  return { out, count };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: redact-urls.mjs <file.md> [--write]'); process.exit(1); }
  const { out, count } = redact(readFileSync(file, 'utf8'));
  if (process.argv.includes('--write')) {
    writeFileSync(file, out);
    console.error(`[redact-urls] ${count} URL(s) redacted in place: ${file}`);
  } else {
    process.stdout.write(out);
    console.error(`[redact-urls] DRY RUN — ${count} URL(s) would be redacted`);
  }
}
