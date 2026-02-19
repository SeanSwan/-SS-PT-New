import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  memberVideos, saveProgress, getHistory, trackView, trackOutboundClick
} from '../controllers/videoCatalogMemberController.mjs';

const router = Router();

router.use(protect);

router.get('/members', memberVideos);
router.post('/:id/progress', saveProgress);
router.get('/history', getHistory);
router.post('/:id/track', trackView);
router.post('/:id/outbound-click', trackOutboundClick);

export default router;
