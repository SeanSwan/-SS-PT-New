/**
 * Coach gamification context helpers.
 *
 * Builds bounded, PII-safe badge summaries for the Swan Coach context engine.
 * Badge media URLs and free-form descriptions are intentionally excluded from
 * model-facing context; the AI only receives achievement metadata needed for
 * coaching motivation and milestone awareness.
 */

const BADGE_CONTEXT_LIMIT = 8;
const TEXT_FALLBACK = 'Badge';

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeText(value, fallback = TEXT_FALLBACK) {
  const text = String(value ?? fallback)
    .replace(/[\r\n|\\]+/g, ' ')
    .replace(/`/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || fallback).slice(0, 100);
}

function rewardPoints(rewards) {
  const points = Number(parseJsonObject(rewards).points || 0);
  return Number.isFinite(points) && points > 0 ? Math.round(points) : null;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function loadCoachBadgeRows(sequelize, replacements, queryType) {
  const sql = [
    'SELECT ub."earnedAt", ub."earningType",',
    '       b.name, b.category, b.difficulty, b.rewards,',
    '       bc.name AS "collectionName"',
    'FROM "UserBadges" ub',
    'JOIN "Badges" b ON ub."badgeId" = b.id',
    'LEFT JOIN "BadgeCollections" bc ON b."collectionId" = bc.id',
    'WHERE ub."userId" = :clientId',
    '  AND ub."isDisplayed" = true',
    '  AND b."isActive" = true',
    'ORDER BY ub."earnedAt" DESC',
    'LIMIT ' + BADGE_CONTEXT_LIMIT,
  ].join('\n');
  return sequelize.query(sql, { replacements, type: queryType });
}

export function summarizeCoachBadges(rows) {
  const badges = Array.isArray(rows) ? rows.slice(0, BADGE_CONTEXT_LIMIT) : [];
  return {
    displayedCount: badges.length,
    recent: badges.map((badge) => ({
      name: safeText(badge.name),
      category: safeText(badge.category, 'general'),
      difficulty: safeText(badge.difficulty, 'badge'),
      earningType: safeText(badge.earningType, 'earned'),
      collectionName: badge.collectionName ? safeText(badge.collectionName, 'Collection') : null,
      earnedAt: isoOrNull(badge.earnedAt),
      rewardPoints: rewardPoints(badge.rewards),
    })),
  };
}
