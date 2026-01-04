import express from 'express';
import goalController from '../controllers/goalController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// All goal routes are protected
router.use(protect);

router.route('/')
  .get(goalController.getGoalsForUser)
  .post(goalController.createGoal);

router.route('/:goalId')
  .put(goalController.updateGoal)
  .delete(goalController.deleteGoal);

export default router;