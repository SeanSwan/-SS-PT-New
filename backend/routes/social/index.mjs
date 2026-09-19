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
import coachSignalRoutes from './coachSignalRoutes.mjs';
import proofCardRoutes from './proofCardRoutes.mjs';
import spotlightReadRoutes from './spotlightReadRoutes.mjs';
import promptOfTheDayRoutes from './promptOfTheDayRoutes.mjs';
import comebackRoutes from './comebackRoutes.mjs';

const router = express.Router();

// Register social routes
router.use('/friendships', friendshipsRoutes);
router.use('/feed-enrichment', protect, feedEnrichmentRoutes);
router.use('/posts', postsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/hashtags', hashtagsRoutes);
router.use('/factions', protect, factionsRoutes);
router.use('/parties', protect, partiesRoutes);
router.use('/events', protect, eventsRoutes);
// S1 Coach Signal: protect is applied inside the router (POST + GET /received).
router.use('/coach-signals', coachSignalRoutes);
// S2 Proof Card: protect applied inside the router; own-stats only (blueprint §4.4).
router.use('/proof-card', proofCardRoutes);
// S3 Spotlight rail read path (editorial, flag-gated; no likes/comments by design).
router.use('/spotlights', spotlightReadRoutes);
// S4 composer nudge + shame-free comeback recognition.
router.use('/prompt-of-the-day', promptOfTheDayRoutes);
router.use('/comeback', comebackRoutes);

export default router;
