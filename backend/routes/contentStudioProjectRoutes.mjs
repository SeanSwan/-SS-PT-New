/**
 * Content Studio project routes.
 * Admin-only persistence API for Creator Command Center project workflow.
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { getAllModels } from '../models/index.mjs';
import {
  ContentProjectValidationError,
  createContentProject,
  listContentProjects,
  updateContentProject,
} from '../services/contentStudioProjectService.mjs';

const router = Router();

router.use(protect, adminOnly);

function getContentProjectModel() {
  const { ContentProject } = getAllModels();
  if (!ContentProject) throw new Error('ContentProject model unavailable');
  return ContentProject;
}

function sendProjectError(res, err) {
  if (err instanceof ContentProjectValidationError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error('[ContentStudioProjects] Request failed:', err?.name || 'Error');
  return res.status(500).json({ success: false, message: 'Content project request failed.' });
}

router.get('/', async (req, res) => {
  try {
    const projects = await listContentProjects(getContentProjectModel(), req.query);
    return res.json({ success: true, data: { projects } });
  } catch (err) {
    return sendProjectError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const project = await createContentProject(getContentProjectModel(), req.body, req.user?.id);
    return res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    return sendProjectError(res, err);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const project = await updateContentProject(getContentProjectModel(), req.params.id, req.body, req.user?.id);
    return res.json({ success: true, data: { project } });
  } catch (err) {
    return sendProjectError(res, err);
  }
});

export default router;