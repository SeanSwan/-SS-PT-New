import express from 'express';
import friendshipsRoutes from './friendships.mjs';
import postsRoutes from './posts.mjs';
import challengesRoutes from './challenges.mjs';

const router = express.Router();

// Register social routes
router.use('/friendships', friendshipsRoutes);
router.use('/posts', postsRoutes);
router.use('/challenges', challengesRoutes);

export default router;
