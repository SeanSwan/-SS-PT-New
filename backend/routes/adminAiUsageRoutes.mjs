/**
 * ============================================================================
 * FILE: adminAiUsageRoutes.mjs
 * PURPOSE: Admin endpoints for AI usage monitoring + health status
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-05
 * ============================================================================
 *
 * Sean's watchtower — monitors AI usage costs and flags anomalies.
 * No hard caps on users. Just visibility for the admin.
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

// ─────────────────────────────────────────────────────────────
// GET /api/admin/ai-usage — AI usage stats for admin dashboard
// ─────────────────────────────────────────────────────────────
router.get('/ai-usage', protect, adminOnly, async (req, res) => {
  try {
    const User = (await import('../models/User.mjs')).default;
    const Subscription = (await import('../models/Subscription.mjs')).default;
    const { Op } = (await import('sequelize'));

    // Top 20 AI users this month
    const topUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'subscriptionTier',
        'aiMessagesUsedThisMonth', 'aiGenerationsUsedThisMonth'],
      where: {
        [Op.or]: [
          { aiMessagesUsedThisMonth: { [Op.gt]: 0 } },
          { aiGenerationsUsedThisMonth: { [Op.gt]: 0 } },
        ],
      },
      order: [['aiMessagesUsedThisMonth', 'DESC']],
      limit: 20,
    });

    // Totals
    const totals = await User.findOne({
      attributes: [
        [User.sequelize.fn('SUM', User.sequelize.col('aiMessagesUsedThisMonth')), 'totalMessages'],
        [User.sequelize.fn('SUM', User.sequelize.col('aiGenerationsUsedThisMonth')), 'totalGenerations'],
        [User.sequelize.fn('COUNT', User.sequelize.literal('CASE WHEN "aiMessagesUsedThisMonth" > 0 THEN 1 END')), 'activeAiUsers'],
      ],
      raw: true,
    });

    const totalMessages = parseInt(totals?.totalMessages || '0', 10);
    const totalGenerations = parseInt(totals?.totalGenerations || '0', 10);
    const activeAiUsers = parseInt(totals?.activeAiUsers || '0', 10);

    // Estimated cost (Flash-Lite: ~$0.0002/msg, ~$0.004/gen)
    const estimatedCost = (totalMessages * 0.0002) + (totalGenerations * 0.004);

    // Flagged users (100+ msgs or 20+ gens this month — just for awareness, not punishment)
    const flagged = topUsers.filter(u => {
      const msgs = u.aiMessagesUsedThisMonth || 0;
      const gens = u.aiGenerationsUsedThisMonth || 0;
      return msgs > 100 || gens > 20;
    }).map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      role: u.role,
      tier: u.subscriptionTier,
      messages: u.aiMessagesUsedThisMonth || 0,
      generations: u.aiGenerationsUsedThisMonth || 0,
      flagLevel: (u.aiMessagesUsedThisMonth || 0) > 500 ? 'red' : 'yellow',
    }));

    // Subscription revenue this month
    const activeSubscriptions = await Subscription.count({
      where: { status: 'active', tier: { [Op.ne]: 'free' } },
    });

    res.json({
      success: true,
      data: {
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
        totals: {
          messages: totalMessages,
          generations: totalGenerations,
          activeAiUsers,
          estimatedCostUSD: Math.round(estimatedCost * 100) / 100,
        },
        topUsers: topUsers.map(u => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          role: u.role,
          tier: u.subscriptionTier,
          messages: u.aiMessagesUsedThisMonth || 0,
          generations: u.aiGenerationsUsedThisMonth || 0,
        })),
        flaggedUsers: flagged,
        revenue: { activeSubscriptions },
      },
    });
  } catch (error) {
    logger.error('[AdminAiUsage] Error fetching AI usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI usage stats' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/health — Server health check for admin dashboard
// ─────────────────────────────────────────────────────────────
router.get('/health', protect, adminOnly, async (req, res) => {
  const start = Date.now();

  try {
    // DB ping
    const { default: sequelize } = await import('../models/index.mjs');
    await sequelize.authenticate();
    const dbLatency = Date.now() - start;

    // Memory usage
    const mem = process.memoryUsage();
    const memUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const memPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    // Uptime
    const uptimeSeconds = Math.round(process.uptime());

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      database: { connected: true, latencyMs: dbLatency },
      memory: { usedMB: memUsedMB, totalMB: memTotalMB, percentage: memPct },
      uptime: uptimeSeconds,
    });
  } catch (error) {
    logger.error('[AdminAiUsage] Admin health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      database: { connected: false },
      memory: { usedMB: 0, totalMB: 0, percentage: 0 },
    });
  }
});

export default router;
