/**
 * Profile Routes
 * ==============
 *
 * Purpose: Define API endpoints for user profile management
 *
 * Endpoints:
 * - POST /api/profile/upload-photo - Upload a new profile photo
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadProfilePhoto } from '../controllers/profileController.mjs';
import { protect } from '../middleware/auth.mjs';

// Multer config for profile photos
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'avatars');
    // Ensure directory exists
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = req.user.id + '-' + Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${extension}`);
  },
});

const avatarFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const router = Router();

// Upload profile photo
router.post('/upload-photo', protect, uploadAvatar.single('profile_photo'), uploadProfilePhoto);

export default router;