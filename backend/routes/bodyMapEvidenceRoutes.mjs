import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import {
  createBodyMapEvidence,
  listBodyMapEvidence,
  analyzeBodyMapEvidence,
  reviewBodyMapEvidence,
  deleteBodyMapEvidence,
} from '../controllers/bodyMapEvidenceController.mjs';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

router.use(protect);

router.get('/:userId/:entryId', verifyClientAccessByUserId({ paramName: 'userId' }), listBodyMapEvidence);
router.post('/:userId/:entryId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), upload.single('media'), createBodyMapEvidence);
router.post('/:userId/:entryId/:mediaId/analyze', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' }), analyzeBodyMapEvidence);
router.put('/:userId/:entryId/:mediaId/review', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' }), reviewBodyMapEvidence);
router.delete('/:userId/:entryId/:mediaId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), deleteBodyMapEvidence);

export default router;
