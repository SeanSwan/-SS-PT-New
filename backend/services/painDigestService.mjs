/**
 * PainDigestService — the trainer's pain command surface
 * ======================================================
 * Pain-Chart Slice 5 (#7, PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04): the only
 * trainer-visible pain alert used to be the admin-only platform-wide list.
 * This digest is ROSTER-SCOPED (active assignments only, fail-closed) and
 * answers the coaching questions directly:
 *   - who is WORSENING (computed per-episode facts, sample size stated)
 *   - which severe entries are STALE and need re-confirmation
 *   - which severe entries sit in UNMAPPED regions (no machine protection)
 *
 * Names are intentionally id+firstName only — the digest renders inside
 * authed trainer dashboards, never inside LLM prompts.
 */
import { Op } from 'sequelize';
import { getModel } from '../models/index.mjs';
import { getPainTrendFacts } from './painTrendService.mjs';
import { registryMusclesForRegion } from './training-cortex/ontology/regionMuscleMap.mjs';
import logger from '../utils/logger.mjs';

const STALE_DAYS = 30;
const SEVERE = 7;
const ROSTER_CAP = 100;

export async function getTrainerPainDigest(trainerId, { role = 'trainer' } = {}) {
  try {
    const ClientPainEntry = getModel('ClientPainEntry');
    const User = getModel('User');

    // Roster: active assignments for trainers; admins see the platform.
    let clientIds = null;
    if (role !== 'admin') {
      const ClientTrainerAssignment = getModel('ClientTrainerAssignment');
      const roster = await ClientTrainerAssignment.findAll({
        where: { trainerId, status: 'active' },
        attributes: ['clientId'],
        limit: ROSTER_CAP,
        raw: true,
      });
      clientIds = roster.map((r) => r.clientId).filter(Boolean);
      if (clientIds.length === 0) {
        return { status: 'ok', rosterSize: 0, worsening: [], staleSevere: [], unmappedSevere: [] };
      }
    }

    const where = { isActive: true, ...(clientIds ? { userId: { [Op.in]: clientIds } } : {}) };
    const activeEntries = await ClientPainEntry.findAll({
      where,
      attributes: ['id', 'userId', 'bodyRegion', 'side', 'painLevel', 'lastConfirmedAt', 'updatedAt', 'createdAt'],
      include: [{ model: User, as: 'client', attributes: ['id', 'firstName'] }],
      order: [['painLevel', 'DESC']],
      raw: false,
    });

    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const staleSevere = [];
    const unmappedSevere = [];
    const clientIdsWithPain = new Set();

    for (const entry of activeEntries) {
      clientIdsWithPain.add(entry.userId);
      if (Number(entry.painLevel) < SEVERE) continue;
      const anchor = entry.lastConfirmedAt || entry.updatedAt || entry.createdAt;
      const item = {
        entryId: entry.id,
        clientId: entry.userId,
        clientFirstName: entry.client?.firstName ?? null,
        bodyRegion: entry.bodyRegion,
        side: entry.side,
        painLevel: entry.painLevel,
        lastConfirmedAt: anchor ? new Date(anchor).toISOString() : null,
      };
      if (anchor && new Date(anchor) < staleCutoff) staleSevere.push(item);
      if (registryMusclesForRegion(entry.bodyRegion).length === 0) unmappedSevere.push(item);
    }

    // Worsening: computed per-episode facts per client with active pain.
    const worsening = [];
    for (const clientId of clientIdsWithPain) {
      const { facts } = await getPainTrendFacts(clientId);
      for (const fact of facts) {
        if (fact.isActive && fact.direction === 'worsening') {
          const named = activeEntries.find((e) => e.userId === clientId);
          worsening.push({
            clientId,
            clientFirstName: named?.client?.firstName ?? null,
            bodyRegion: fact.bodyRegion,
            side: fact.side,
            delta: fact.delta,
            spanDays: fact.spanDays,
            points: fact.points,
            latestLevel: fact.latestLevel,
            flare: fact.flare,
          });
        }
      }
    }
    worsening.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

    return {
      status: 'ok',
      rosterSize: clientIds ? clientIds.length : null,
      worsening,
      staleSevere,
      unmappedSevere,
    };
  } catch (error) {
    logger.warn('[PainDigest] digest unavailable:', error?.message);
    return { status: 'unavailable', rosterSize: null, worsening: [], staleSevere: [], unmappedSevere: [] };
  }
}

export default { getTrainerPainDigest };
