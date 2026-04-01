import express from 'express';
import { protect } from '../../middleware/authMiddleware.mjs';
import friendshipsRoutes from './friendships.mjs';
import postsRoutes from './posts.mjs';
import challengesRoutes from './challenges.mjs';
import hashtagsRoutes from './hashtags.mjs';
import factionsRoutes from './factions.mjs';
import partiesRoutes from './parties.mjs';

const router = express.Router();

// Register social routes
router.use('/friendships', friendshipsRoutes);
router.use('/posts', postsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/hashtags', hashtagsRoutes);
router.use('/factions', protect, factionsRoutes);
router.use('/parties', protect, partiesRoutes);

export default router;
