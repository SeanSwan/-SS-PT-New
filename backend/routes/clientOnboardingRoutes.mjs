import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  createQuestionnaire,
  getQuestionnaire,
  createMovementScreen,
} from '../controllers/clientOnboardingController.mjs';

const router = express.Router();

// Questionnaire endpoints
router.post('/:userId/questionnaire', protect, createQuestionnaire);
router.get('/:userId/questionnaire', protect, getQuestionnaire);

// NASM movement screen endpoint (admin/trainer enforced in controller)
router.post('/:userId/movement-screen', protect, createMovementScreen);

export default router;
