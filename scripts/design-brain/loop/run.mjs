#!/usr/bin/env node
/**
 * run.mjs — CLI entrypoint for the Design Brain loop (S1 walking skeleton).
 * =========================================================================
 * BLUEPRINT: DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md §S1 (SWA-185).
 *
 *   node scripts/design-brain/loop/run.mjs --brief scripts/design-brain/loop/briefs/storefront-hero.json
 *
 * Exit 0: loop closed, receipt written. Exit 2: HALT — the failing STATE and
 * its defects print; nothing downstream of the halt was produced. There is no
 * flag to skip a state. That absence is the feature.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runLoop, StateError } from './state-machine.mjs';
import { contentStage } from './stages/content.mjs';
import { structureStage } from './stages/structure.mjs';
import { materialsStage } from './stages/materials.mjs';
import { renderStage } from './stages/render.mjs';
import { inspectStage } from './stages/inspect.mjs';
import { critiqueStage } from './stages/critique.mjs';
import { reviseStage } from './stages/revise.mjs';
import { verifyStage } from './stages/verify.mjs';
import { learnStage } from './stages/learn.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_STAGES = {
  CONTENT: contentStage,
  STRUCTURE: structureStage,
  MATERIALS: materialsStage,
  RENDER: renderStage,
  INSPECT: inspectStage,
  CRITIQUE: critiqueStage,
  REVISE: reviseStage,
  VERIFY: verifyStage,
  LEARN: learnStage,
};

export function loadProfile(path = join(HERE, 'taste-profile.seed.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--brief');
  const briefPath = i >= 0 ? process.argv[i + 1] : null;
  if (!briefPath) { console.error('usage: run.mjs --brief <brief.json> [--profile <profile.json>]'); process.exit(1); }
  const p = process.argv.indexOf('--profile');
  const profile = loadProfile(p >= 0 ? process.argv[p + 1] : undefined);
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));

  try {
    const { receipt, ctx } = await runLoop({ brief, stages: DEFAULT_STAGES, profile, runRoot: join(HERE, 'runs') });
    const v = ctx.artifacts.verify;
    console.log(`[loop] CLOSED — run ${receipt.run_id}`);
    console.log(`[loop] skeleton: ${ctx.artifacts.ir.skeleton_id} · meters: ${v.meters_total} · all pass: ${v.all_meters_pass} · roundtrip: ${v.skeleton_roundtrip_ok}`);
    if (v.regressions.length) console.log(`[loop] carried regressions: ${v.regressions.map((r) => r.meter).join(', ')}`);
    console.log(`[loop] receipt: ${join(ctx.runDir, 'RECEIPT.json')}`);
    console.log(`[loop] render:  ${(ctx.artifacts.revise ?? ctx.artifacts.render).html_path}`);
    console.log('[loop] session appended as PENDING — Sean\'s pass resolves it (same brief_id supersedes).');
  } catch (err) {
    if (err instanceof StateError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}
