import { Router } from 'express';
import { getUsers } from '../controllers/userController.mjs';
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

const router = Router();

router.get('/users', getUsers);

// Mount workout routes
router.use('/workouts', workoutRoutes);

// Mount client progress routes
router.use('/client-progress', clientProgressRoutes);

// Mount exercise routes
router.use('/exercises', exerciseRoutes);

// Mount session routes
router.use('/sessions', sessionRoutes);

// Mount session package routes
router.use('/session-packages', sessionPackageRoutes);

// Mount test routes (development only)
if (process.env.NODE_ENV !== 'production') {
  router.use('/test', testRoutes);
}

// Mount orientation routes
router.use('/orientation', orientationRoutes);

// Mount test notification routes (development only)
if (process.env.NODE_ENV !== 'production') {
  router.use('/test-notifications', testNotificationRoutes);
}

// Mount notification settings routes
router.use('/notification-settings', notificationSettingsRoutes);

// Mount notification routes
router.use('/notifications', notificationRoutes);

export default router;