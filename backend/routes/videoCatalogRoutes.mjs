import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  createVideo, listVideos, getVideo, updateVideo, deleteVideo,
  publishVideo, requestUploadUrl, completeUpload, requestThumbnailUrl,
  jobQueueHealth,
} from '../controllers/videoCatalogController.mjs';

const router = Router();

router.use(protect, adminOnly); // All routes require admin

router.post('/', createVideo);
router.get('/', listVideos);
router.get('/:id', getVideo);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);
router.patch('/:id/publish', publishVideo);
router.post('/upload-url', requestUploadUrl);
router.post('/upload-complete', completeUpload);
router.post('/thumbnail-url', requestThumbnailUrl);
router.get('/job-queue-health', jobQueueHealth);

export default router;
