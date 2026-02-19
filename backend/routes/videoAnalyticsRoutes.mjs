import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  getOverview, getTopContent, getOutboundReport, listJobs
} from '../controllers/videoAnalyticsController.mjs';

const router = Router();

router.use(protect, adminOnly);

router.get('/overview', getOverview);
router.get('/top', getTopContent);
router.get('/outbound', getOutboundReport);
router.get('/jobs', listJobs);

export default router;
