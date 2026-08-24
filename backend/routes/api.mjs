import { Router } from 'express';
import workoutRoutes from './workoutRoutes.mjs';
import clientProgressRoutes from './clientProgressRoutes.mjs';
import exerciseRoutes from './exerciseRoutes.mjs';
import sessionRoutes from './sessionRoutes.mjs';
import testRoutes from './testRoutes.mjs';
import orientationRoutes from './orientationRoutes.mjs';
import testNotificationRoutes from './testNotificationRoutes.mjs';
import notificationSettingsRoutes from './notificationSettingsRoutes.mjs';
import notificationRoutes from './notificationRoutes.mjs';
import adminRoutes from './adminRoutes.mjs';
import contactRoutes from './contactRoutes.mjs';
import adminFinanceRoutes from './admin/adminFinanceRoutes.mjs';
import featureFlagRoutes from './featureFlagRoutes.mjs';
import atelierComposeRoutes from './atelierComposeRoutes.mjs';
import contentStudioRoutes from './contentStudioRoutes.mjs';
import renderAgentRoutes from './renderAgentRoutes.mjs';
import contentStudioProjectRoutes from './contentStudioProjectRoutes.mjs';
import bodyMapEvidenceRoutes from './bodyMapEvidenceRoutes.mjs';

const router = Router();

router.use('/workouts', workoutRoutes);
router.use('/client-progress', clientProgressRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/sessions', sessionRoutes);
// sessionPackageRoutes and v2PaymentRoutes are DELIBERATELY not registered here.
// Both are mounted directly in core/routes.mjs, which runs BEFORE the
// `app.use('/api', apiRoutes)` fallback that reaches this file — so a copy here
// never serves a request. It is worse than dead: an edit made to the shadowed
// copy looks applied and silently does nothing, on the payment path.
// Guarded by tests/api/moneyPathSingleMount.test.mjs.

if (process.env.NODE_ENV !== 'production') router.use('/test', testRoutes);

router.use('/orientation', orientationRoutes);

if (process.env.NODE_ENV !== 'production') router.use('/test-notifications', testNotificationRoutes);

router.use('/notification-settings', notificationSettingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/admin/finance', adminFinanceRoutes);
router.use('/feature-flags', featureFlagRoutes);
router.use('/body-map-evidence', bodyMapEvidenceRoutes);
router.use('/atelier/compose', atelierComposeRoutes);
router.use('/content-studio/projects', contentStudioProjectRoutes);
router.use('/content-studio', contentStudioRoutes);
// Worker-facing surface: agents PULL from here (see renderAgentRoutes header for why
// nothing is ever pushed to the worker's machine).
router.use('/render-agents', renderAgentRoutes);

export default router;
