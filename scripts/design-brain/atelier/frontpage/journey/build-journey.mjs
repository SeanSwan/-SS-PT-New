#!/usr/bin/env node
/**
 * build-journey.mjs — assemble the SwanJourney board (The Surface and the Depth).
 *
 * One direction, not variants. Structure locked by Sean's 2026-08-20 grill:
 * scroll-journey hero on the real Swans.mp4 frame · dark-chrome/warm-footage ·
 * community-first + trainer fast lane · map+groups+events · before/after chips ·
 * live CTA pair. Copy injected VERBATIM from copy-pack-full.json.
 *
 * Usage: node build-journey.mjs   (from anywhere; paths resolve to this file)
 * Then:  node ../../../render-check.mjs --dir <this dir> --widths 1440,414
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { css } from './journey-styles.mjs';
import * as S from './journey-sections.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(fs.readFileSync(path.join(here, '..', 'copy-pack-full.json'), 'utf8'));

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SwanStudios — The Surface and the Depth</title>
<style>${css}</style>
</head><body>
${S.hero(pack)}
<div class="depth">
${S.mission(pack)}
${S.community(pack)}
${S.services(pack)}
${S.programs(pack)}
${S.golf(pack)}
${S.proof(pack)}
${S.stats(pack)}
${S.about(pack)}
${S.trainers(pack)}
${S.cta(pack)}
</div>
</body></html>`;

const out = path.join(here, 'SwanJourney.dc.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
