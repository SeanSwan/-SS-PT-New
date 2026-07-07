#!/usr/bin/env node
/**
 * design-mirror-check.mjs — E6 custodial (G-13): design.md is CANONICAL and
 * design.html is its visual mirror; nothing diffed them, so the mirror rots
 * silently. This tiny T0-class checker extracts the canonical hex tokens from
 * design.md and requires EVERY one to appear in design.html — a canonical token
 * missing from the mirror = drift, exit 1. Extra hexes in the html are
 * presentation (gradients, shades) and are reported as a count, not drift.
 * Build tooling like registry-build.mjs — not a registered broker command.
 * Usage: node scripts/hermes/design-mirror-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BRAIN = path.join(HERE, '..', '..', 'docs', 'ai-workflow', 'design-brain');

const hexes = (text) => new Set([...String(text).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));

export function checkMirror(mdPath = path.join(BRAIN, 'design.md'), htmlPath = path.join(BRAIN, 'design.html')) {
  const md = hexes(fs.readFileSync(mdPath, 'utf8'));
  const html = hexes(fs.readFileSync(htmlPath, 'utf8'));
  const missing = [...md].filter((h) => !html.has(h)).sort();
  const extra = html.size - [...html].filter((h) => md.has(h)).length;
  return { ok: missing.length === 0, missing, canonical: md.size, extra };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const out = checkMirror();
  if (out.ok) console.log(`mirror in sync: all ${out.canonical} canonical design.md tokens present in design.html (${out.extra} presentation-only hexes ignored)`);
  else console.error(`MIRROR DRIFT: ${out.missing.length} canonical token(s) missing from design.html: ${out.missing.join(', ')} — design.md wins; update the mirror`);
  process.exit(out.ok ? 0 : 1);
}
