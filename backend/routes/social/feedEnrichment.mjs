import express from 'express';
import {
  buildFeedEnrichmentItems,
  clearFeedEnrichmentCache,
  getFeedEnrichmentLimit,
  makeCuratedFeedEnrichmentItems,
  moderateEnrichmentItem,
} from '../../services/social/feedEnrichmentService.mjs';

const router = express.Router();

export {
  buildFeedEnrichmentItems,
  clearFeedEnrichmentCache,
  moderateEnrichmentItem,
};

router.get('/', async (req, res) => {
  try {
    const result = await buildFeedEnrichmentItems({
      limit: req.query.limit,
      env: process.env,
    });
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      items: result.items,
      cacheStatus: result.cacheStatus,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Feed enrichment failed:', error);
    const fallbackItems = makeCuratedFeedEnrichmentItems(Date.now())
      .slice(0, getFeedEnrichmentLimit(req.query.limit));
    res.status(200).json({
      items: fallbackItems,
      cacheStatus: 'fallback',
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;
