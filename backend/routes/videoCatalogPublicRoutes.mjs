import { Router } from 'express';
import { optionalAuth } from '../middleware/optionalAuth.mjs';
import { rateLimiter } from '../middleware/authMiddleware.mjs';
import {
  browseVideos, watchVideo, refreshUrl,
  browseCollections, getCollection
} from '../controllers/videoCatalogPublicController.mjs';

const router = Router();

router.use(optionalAuth);

router.get('/', browseVideos);
router.get('/watch/:slug', watchVideo);
router.post('/:id/refresh-url', rateLimiter({ windowMs: 3600000, max: 10 }), refreshUrl);
router.get('/collections', browseCollections);
router.get('/collections/:slug', getCollection);

export default router;
