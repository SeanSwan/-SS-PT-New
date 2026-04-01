import express from 'express';
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
router.use('/factions', factionsRoutes);
router.use('/parties', partiesRoutes);

export default router;
