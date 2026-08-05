/**
 * PainTrendService — per-episode severity trend facts
 * ===================================================
 * Pain-Chart Slice 4 (C5, PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04): no code
 * anywhere compared a client's painLevel across time for the same region —
 * the trainer prompt asked the model to "flag worsening patterns" while the
 * data layer never supplied any. This service computes them as FACTS so
 * prompts and dashboards consume computed deltas, never raw rows.
 *
 * Truthfulness rules (guards Kimi failure-mode 3 — quantified noise):
 *  - trends are per (region, side, episode) — NEVER across body parts
 *  - a delta requires >= 2 points; single-point episodes emit no delta
 *  - every fact carries its sample size so consumers can qualify claims
 *    ("+3 over 14d, based on 2 check-ins")
 *
 * Point sources: entry creation levels + the append-only revision timeline
 * (entries are updated in place, so revisions ARE the history).
 */
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
export const FLARE_DELTA = 3;
export const FLARE_WINDOW_DAYS = 30;

const toMs = (value) => {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Build per-episode severity timelines for one client.
 *
 * @param {number} userId
 * @returns {Promise<{ status: 'ok'|'unavailable', facts: Array<{
 *   episodeId: string|null, bodyRegion: string, side: string,
 *   latestLevel: number, isActive: boolean, points: number,
 *   firstLevel: number|null, delta: number|null, spanDays: number|null,
 *   direction: 'worsening'|'improving'|'stable'|null, flare: boolean,
 * }> }>}
 */
export async function getPainTrendFacts(userId) {
  try {
    const ClientPainEntry = getModel('ClientPainEntry');
    const PainEntryRevision = getModel('PainEntryRevision');

    const entries = (await ClientPainEntry.findAll({
      where: { userId },
      attributes: ['id', 'episodeId', 'bodyRegion', 'side', 'painLevel', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'ASC']],
      raw: true,
    })) || [];
    if (entries.length === 0) return { status: 'ok', facts: [] };

    const revisions = (await PainEntryRevision.findAll({
      where: { painEntryId: entries.map((e) => e.id) },
      attributes: ['painEntryId', 'changes', 'createdAt'],
      order: [['createdAt', 'ASC']],
      raw: true,
    })) || [];
    const revisionsByEntry = new Map();
    for (const rev of revisions) {
      const list = revisionsByEntry.get(rev.painEntryId) || [];
      list.push(rev);
      revisionsByEntry.set(rev.painEntryId, list);
    }

    // Group entries into episodes (legacy rows without episodeId group per
    // entry — no cross-entry inference without the linking hook's evidence).
    const episodes = new Map();
    for (const entry of entries) {
      const key = entry.episodeId || `entry-${entry.id}`;
      const group = episodes.get(key) || [];
      group.push(entry);
      episodes.set(key, group);
    }

    const facts = [];
    for (const [key, group] of episodes) {
      const points = [];
      for (const entry of group) {
        const revs = (revisionsByEntry.get(entry.id) || [])
          .map((rev) => ({ ...rev, painChange: rev.changes?.painLevel }))
          .filter((rev) => rev.painChange && Number.isFinite(Number(rev.painChange.to)));
        // Creation-time level: the first revision's `from` predates it;
        // otherwise the current level IS the creation level.
        const creationLevel = revs.length > 0 && Number.isFinite(Number(revs[0].painChange.from))
          ? Number(revs[0].painChange.from)
          : Number(entry.painLevel);
        const createdMs = toMs(entry.createdAt);
        if (createdMs !== null) points.push({ t: createdMs, level: creationLevel });
        for (const rev of revs) {
          const revMs = toMs(rev.createdAt);
          if (revMs !== null) points.push({ t: revMs, level: Number(rev.painChange.to) });
        }
      }
      points.sort((a, b) => a.t - b.t);
      if (points.length === 0) continue;

      const latestEntry = group[group.length - 1];
      const first = points[0];
      const last = points[points.length - 1];
      const hasDelta = points.length >= 2;
      const delta = hasDelta ? last.level - first.level : null;
      const spanDays = hasDelta ? Math.max(1, Math.round((last.t - first.t) / DAY_MS)) : null;
      const isActive = group.some((e) => e.isActive);
      const flare = Boolean(
        (hasDelta && delta >= FLARE_DELTA && spanDays !== null && spanDays <= FLARE_WINDOW_DAYS)
        || (group.length > 1 && Number(latestEntry.painLevel) >= 7)
      );

      facts.push({
        episodeId: latestEntry.episodeId || null,
        episodeKey: key,
        bodyRegion: latestEntry.bodyRegion,
        side: latestEntry.side || 'center',
        latestLevel: Number(latestEntry.painLevel),
        isActive,
        points: points.length,
        firstLevel: hasDelta ? first.level : null,
        delta,
        spanDays,
        direction: !hasDelta ? null : delta >= 2 ? 'worsening' : delta <= -2 ? 'improving' : 'stable',
        flare,
      });
    }

    // Active + multi-point episodes first — those are the coaching signals.
    facts.sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.points - a.points);
    return { status: 'ok', facts };
  } catch (error) {
    logger.warn('[PainTrendService] trend computation unavailable:', error?.message);
    return { status: 'unavailable', facts: [] };
  }
}

/**
 * Render trend facts as compact prompt lines (computed facts, never prose).
 * Only emits lines for active episodes; single-point episodes are skipped
 * (no delta to claim). Sample size is always stated.
 */
export function formatTrendFactsForPrompt(facts, { limit = 5 } = {}) {
  return (facts || [])
    .filter((f) => f.isActive && f.delta !== null)
    .slice(0, limit)
    .map((f) => `${f.bodyRegion}(${f.side}): ${f.direction} ${f.delta >= 0 ? '+' : ''}${f.delta} over ${f.spanDays}d (${f.points} data points), now ${f.latestLevel}/10${f.flare ? ' [FLARE]' : ''}`);
}

export default { getPainTrendFacts, formatTrendFactsForPrompt };
