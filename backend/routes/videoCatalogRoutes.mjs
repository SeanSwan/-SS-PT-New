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
// Registered BEFORE '/:id' on purpose: Express matches in registration order, so
// with '/:id' first this URL was handled by getVideo (id = 'job-queue-health') and
// the health handler was unreachable (doc 76, finding 4).
router.get('/job-queue-health', jobQueueHealth);
router.get('/:id', getVideo);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);
router.patch('/:id/publish', publishVideo);
router.post('/upload-url', requestUploadUrl);
router.post('/upload-complete', completeUpload);
router.post('/thumbnail-url', requestThumbnailUrl);

export default router;
