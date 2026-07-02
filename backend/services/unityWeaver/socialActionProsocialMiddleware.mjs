import { SocialPost } from '../../models/social/index.mjs';
import { awardUnityWeaverProsocialXP } from './prosocialXPService.mjs';
import logger from '../../utils/logger.mjs';

const PROGRESS_POST_TYPES = new Set(['workout', 'transformation', 'achievement', 'challenge']);
const ENCOURAGING_REACTIONS = new Set(['swan', 'heart']);

const SUPPORTIVE_COMMENT_PATTERNS = [
  /\b(you got this|keep going|proud of you|great job|amazing|strong work|lets go|let's go)\b/i,
  /\b(congrats|congratulations|inspiring|inspired|motivation|motivating)\b/i,
  /\b(beautiful progress|nice progress|big win|huge win|win)\b/i,
];

const GRATITUDE_COMMENT_PATTERNS = [
  /\b(thank you|thanks|appreciate you|appreciate this|grateful|gratitude)\b/i,
];

function summarizeUnityWeaverXP(result) {
  if (!result || result.error || result.success !== true) return null;

  return {
    awarded: Boolean(result.awarded),
    duplicate: Boolean(result.duplicate),
    status: result.status,
    eventId: result.event?.id,
    label: result.event?.label,
    pointsAwarded: result.pointsAwarded || 0,
    newBalance: result.newBalance,
    newLevel: result.newLevel,
    newTier: result.newTier,
    badgesEarned: result.badgesEarned || [],
    swanCoinsAwarded: result.swanCoinsAwarded || 0,
    swanCoinBalance: result.swanCoinBalance ?? null,
    currencyName: result.currencyName || 'SwanCoins',
    legacyField: result.legacyField || 'crystalBalance',
  };
}

function parsePostIdFromPath(path) {
  const match = String(path || '').match(/^\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const postId = Number(match[1]);
  return Number.isSafeInteger(postId) && postId > 0 ? postId : null;
}

function inferCommentEvent(content) {
  const text = String(content || '').trim();
  if (text.length < 8) return null;
  if (GRATITUDE_COMMENT_PATTERNS.some((pattern) => pattern.test(text))) return 'gratitude_given';
  if (SUPPORTIVE_COMMENT_PATTERNS.some((pattern) => pattern.test(text))) return 'encourage_friend';
  return null;
}

async function getPostOwnerId(postId) {
  const post = await SocialPost.findByPk(postId, { attributes: ['id', 'userId', 'type'] });
  if (!post) return null;
  return post.userId;
}

async function awardForPostCreate(req, body) {
  const post = body?.post;
  const postType = String(post?.type || req.body?.type || '').toLowerCase();
  if (!post?.id || !PROGRESS_POST_TYPES.has(postType)) return null;

  return awardUnityWeaverProsocialXP({
    actorUserId: req.user.id,
    eventId: 'positive_progress_post',
    contextType: 'post',
    contextId: post.id,
  });
}

async function awardForReaction(req, body) {
  const postId = parsePostIdFromPath(req.path);
  const reactionType = String(body?.reactionType || req.body?.reactionType || 'swan').toLowerCase();
  if (!postId || !ENCOURAGING_REACTIONS.has(reactionType)) return null;

  const postOwnerId = await getPostOwnerId(postId);
  if (!postOwnerId || String(postOwnerId) === String(req.user.id)) return null;

  return awardUnityWeaverProsocialXP({
    actorUserId: req.user.id,
    eventId: 'encourage_friend',
    targetUserId: postOwnerId,
    contextType: 'post',
    contextId: postId,
  });
}

async function awardForComment(req, body) {
  const postId = parsePostIdFromPath(req.path);
  const commentId = body?.comment?.id;
  const eventId = inferCommentEvent(req.body?.content);
  if (!postId || !commentId || !eventId) return null;

  const postOwnerId = await getPostOwnerId(postId);
  if (!postOwnerId || String(postOwnerId) === String(req.user.id)) return null;

  return awardUnityWeaverProsocialXP({
    actorUserId: req.user.id,
    eventId,
    targetUserId: postOwnerId,
    contextType: 'comment',
    contextId: commentId,
  });
}

async function maybeAwardForSocialAction(req, body, statusCode) {
  if (!req.user?.id || statusCode >= 400 || body?.success !== true) return null;
  if (req.method !== 'POST') return null;

  if (req.path === '/') return awardForPostCreate(req, body);
  if (/^\/\d+\/like$/.test(req.path)) return awardForReaction(req, body);
  if (/^\/\d+\/comments$/.test(req.path)) return awardForComment(req, body);

  return null;
}

/**
 * Backend-owned Unity Weaver XP orchestration for successful social actions.
 * This wraps the normal social post routes and appends a compact `unityWeaverXP`
 * result only after the original route has succeeded. It never blocks the real
 * social action if the optional prosocial XP side effect fails.
 */
export function unityWeaverSocialActionXPResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    Promise.resolve()
      .then(async () => {
        const result = await maybeAwardForSocialAction(req, body, res.statusCode);
        const summary = summarizeUnityWeaverXP(result);
        if (!summary) return body;
        return {
          ...body,
          unityWeaverXP: summary,
        };
      })
      .then((enrichedBody) => originalJson(enrichedBody))
      .catch((error) => {
        logger.warn('[UnityWeaver] Prosocial XP orchestration skipped', {
          userId: req.user?.id,
          method: req.method,
          path: req.path,
          error: error.message,
        });
        originalJson(body);
      });

    return res;
  };

  next();
}

export default unityWeaverSocialActionXPResponseMiddleware;
