#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/build-phase.mjs
 * PURPOSE: Render every enabled creator's brain behind the fidelity gate, and
 *          publish it as a new generation.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR08/09/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `pipeline.mjs` for the Rule 4 cap when the execution bounds landed
 * (HR23). The seam was already there: `pipeline.mjs` now owns the two phases that
 * talk to YouTube, and this owns the one phase that never touches the network.
 *
 * WHAT IT GUARANTEES:
 *   - the gate needs the SOURCE CORPUS, which is Lane B, so it is read here, used
 *     for comparison, and never handed onward;
 *   - a generation that fails the gate is QUARANTINED and the previous generation
 *     stays current;
 *   - a creator with no valid documents publishes an EMPTY generation rather than
 *     leaving yesterday's answers readable (review HR08).
 *
 * @module creator-brains/build-phase
 */

import { buildBrain } from './extract.mjs';
import { publishBrain, publishEmpty } from './render.mjs';
import { listDocsChecked } from './store.mjs';
import { redact } from './digest.mjs';

export function buildPhase({
  r, enabled, tick, notes = [], secrets = [], reconcile = null,
}) {
  if (!enabled.length) {
    return {
      ok: true, reason: 'no enabled creators', counts: { built: 0 }, built: [],
    };
  }
  const built = [];
  let failed = 0;
  let quarantined = 0;
  let emptied = 0;

  for (const creator of enabled) {
    try {
      const checked = listDocsChecked(r, creator.channelId);
      const rows = reconcile && reconcile.state
        ? Object.values(reconcile.state.videos).filter((v) => v.channelId === creator.channelId)
        : [];

      if (!checked.valid.length) {
        // Nothing readable: publish an EMPTY generation so the brain cannot keep
        // serving the previous one. This is the invalidation step the review
        // found missing (HR08).
        const res = publishEmpty(r, {
          channelId: creator.channelId,
          title: creator.title,
          slug: creator.slug || null,
          reason: checked.invalid.length
            ? `${checked.invalid.length} document(s) present but invalid`
            : 'no transcript documents',
          now: tick,
        });
        if (res.ok) { emptied += 1; built.push({ channelId: creator.channelId, empty: true }); } else quarantined += 1;
        continue;
      }

      const gaps = rows
        .filter((v) => !checked.valid.some((d) => d.videoId === v.videoId))
        .map((v) => ({
          videoId: v.videoId,
          state: v.state,
          reason: redact(v.lastError || 'no transcript'),
        }));

      const brain = buildBrain(creator, {
        docs: checked.valid,
        invalidDocs: checked.invalid,
        gaps,
        generatedAt: new Date(tick()).toISOString(),
      });

      const res = publishBrain(brain, {
        r,
        sources: checked.valid.map((d) => d.text),
        now: tick,
      });

      if (!res.ok) {
        quarantined += 1;
        notes.push(`brain for ${creator.title || creator.channelId} FAILED the fidelity gate (${res.failures[0].run} words vs limit ${res.failures[0].limit} in ${res.failures[0].name}) — previous generation kept`);
        continue;
      }
      built.push({
        channelId: creator.channelId,
        generation: res.generation,
        videos: brain.timeline.length,
        claims: brain.claims.length,
        doctrine: brain.doctrine.length,
        gaps: brain.gaps.length,
        invalidDocs: brain.invalidDocs.length,
      });
    } catch (e) {
      failed += 1;
      notes.push(`build failed for ${creator.title || creator.channelId}: ${redact(e.message, secrets)}`);
    }
  }

  return {
    ok: failed === 0 && quarantined === 0,
    reason: quarantined
      ? `${quarantined} brain(s) failed the fidelity gate`
      : (failed ? `build failed for ${failed} creator(s)` : null),
    counts: {
      built: built.filter((b) => !b.empty).length, emptied, quarantined, failed,
    },
    built,
  };
}
