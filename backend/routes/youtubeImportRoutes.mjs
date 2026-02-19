import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  importSingleVideo, importPlaylist, searchYouTube, syncMetadata
} from '../controllers/youtubeImportController.mjs';

const router = Router();

router.use(protect, adminOnly);

router.post('/import', importSingleVideo);
router.post('/import-playlist', importPlaylist);
router.get('/search', searchYouTube);
router.post('/sync/:id', syncMetadata);

export default router;
