import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  createCollection, listCollections, getCollection, updateCollection,
  deleteCollection, addVideos, removeVideo, reorderVideos
} from '../controllers/videoCollectionController.mjs';

const router = Router();

router.use(protect, adminOnly);

router.post('/', createCollection);
router.get('/', listCollections);
router.get('/:id', getCollection);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);
router.post('/:id/videos', addVideos);
router.delete('/:id/videos/:videoId', removeVideo);
router.patch('/:id/reorder', reorderVideos);

export default router;
