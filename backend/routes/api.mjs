import { Router } from 'express';
import { getUsers } from '../controllers/userController.mjs';
import workoutRoutes from './workoutRoutes.mjs';
import clientProgressRoutes from './clientProgressRoutes.mjs';
import exerciseRoutes from './exerciseRoutes.mjs';
import sessionRoutes from './sessionRoutes.mjs';
import sessionPackageRoutes from './sessionPackageRoutes.mjs';
import testRoutes from './testRoutes.mjs';

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

export default router;