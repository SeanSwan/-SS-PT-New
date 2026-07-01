import express from 'express';
import { protect } from '../../middleware/authMiddleware.mjs';
import friendshipsRoutes from './friendships.mjs';
import feedEnrichmentRoutes from './feedEnrichment.mjs';
import postsRoutes from './posts.mjs';
import challengesRoutes from './challenges.mjs';
import hashtagsRoutes from './hashtags.mjs';
import factionsRoutes from './factions.mjs';
import partiesRoutes from './parties.mjs';
import eventsRoutes from './events.mjs';
import unityWeaverRoutes from '../unityWeaverRoutes.mjs';
import { unityWeaverSocialActionXPResponseMiddleware } from '../../services/unityWeaver/socialActionProsocialMiddleware.mjs';

const router = express.Router();

router.use('/friendships', friendshipsRoutes);
router.use('/feed-enrichment', protect, feedEnrichmentRoutes);
router.use('/posts', unityWeaverSocialActionXPResponseMiddleware, postsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/hashtags', hashtagsRoutes);
router.use('/factions', protect, factionsRoutes);
router.use('/parties', protect, partiesRoutes);
router.use('/events', protect, eventsRoutes);
router.use('/unity-weaver', unityWeaverRoutes);

export default router;
