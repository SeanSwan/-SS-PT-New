import { Router } from 'express';
import { getUsers } from '../controllers/userController.mjs';

const router = Router();

router.get('/users', getUsers);

export default router;