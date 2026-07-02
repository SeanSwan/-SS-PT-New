import { Router } from 'express';
import workoutRoutes from './workoutRoutes.mjs';
import clientProgressRoutes from './clientProgressRoutes.mjs';
import exerciseRoutes from './exerciseRoutes.mjs';
import sessionRoutes from './sessionRoutes.mjs';
import sessionPackageRoutes from './sessionPackageRoutes.mjs';
import testRoutes from './testRoutes.mjs';
import orientationRoutes from './orientationRoutes.mjs';
import testNotificationRoutes from './testNotificationRoutes.mjs';
import notificationSettingsRoutes from './notificationSettingsRoutes.mjs';
import notificationRoutes from './notificationRoutes.mjs';
import adminRoutes from './adminRoutes.mjs';
import contactRoutes from './contactRoutes.mjs';
import v2PaymentRoutes from './v2PaymentRoutes.mjs';
import adminFinanceRoutes from './admin/adminFinanceRoutes.mjs';
import featureFlagRoutes from './featureFlagRoutes.mjs';
import contentStudioRoutes from './contentStudioRoutes.mjs';
import contentStudioProjectRoutes from './contentStudioProjectRoutes.mjs';
import bodyMapEvidenceRoutes from './bodyMapEvidenceRoutes.mjs';

const router = Router();

router.use('/workouts', workoutRoutes);
router.use('/client-progress', clientProgressRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/sessions', sessionRoutes);
router.use('/session-packages', sessionPackageRoutes);

if (process.env.NODE_ENV !== 'production') router.use('/test', testRoutes);

router.use('/orientation', orientationRoutes);

if (process.env.NODE_ENV !== 'production') router.use('/test-notifications', testNotificationRoutes);

router.use('/notification-settings', notificationSettingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/v2/payments', v2PaymentRoutes);
router.use('/admin/finance', adminFinanceRoutes);
router.use('/feature-flags', featureFlagRoutes);
router.use('/body-map-evidence', bodyMapEvidenceRoutes);
router.use('/content-studio/projects', contentStudioProjectRoutes);
router.use('/content-studio', contentStudioRoutes);

export default router;
