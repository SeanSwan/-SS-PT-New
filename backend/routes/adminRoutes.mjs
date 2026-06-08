// backend/routes/adminRoutes.mjs
import express from 'express';
import sequelize from '../database.mjs';
import { Op } from 'sequelize';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';
import Contact from '../models/contact.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const toAdminRouteErrorMetadata = (error) => {
  const metadata = {
    name: error?.name || 'UnknownError'
  };

  if (error?.code) metadata.code = error.code;
  if (error?.statusCode || error?.status) metadata.statusCode = error.statusCode || error.status;
  if (error?.parent?.code) metadata.parentCode = error.parent.code;
  if (error?.original?.code) metadata.originalCode = error.original.code;

  return metadata;
};

const logAdminRouteError = (eventName, error) => {
  logger.error(eventName, toAdminRouteErrorMetadata(error));
};

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// Enhanced user management endpoints
router.get('/users', userManagementController.getAllUsers);
router.put('/users/:id', userManagementController.updateUser);
router.post('/promote-client', userManagementController.promoteToClient);
router.post('/promote-admin', userManagementController.promoteToAdmin);
router.get('/recent-signups', userManagementController.getRecentSignups);
router.get('/dashboard-stats', userManagementController.getDashboardStats);
router.get('/signups-list', userManagementController.getSignupsList);
router.get('/database-health', userManagementController.getDatabaseHealth);

// Trainer management endpoints
router.get('/trainers', async (req, res) => {
  try {
    console.log('Admin /trainers endpoint called');

    const trainers = await sequelize.models.User.findAll({
      where: { role: ['trainer', 'admin'] },
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });

    console.log(`Found ${trainers.length} trainers`);

    res.json({
      success: true,
      trainers
    });
  } catch (error) {
    logAdminRouteError('Error fetching trainers', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers'
    });
  }
});

// Import and mount client management routes (fix route conflict)
import adminClientRoutes from './adminClientRoutes.mjs';
router.use('/', adminClientRoutes); // Mount at root since routes already have /clients prefix

// Contact management endpoints
router.get('/contacts', async (req, res) => {
  try {
    console.log('Admin /contacts endpoint called');

    const contacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    console.log(`Found ${contacts.length} contacts`);

    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    logAdminRouteError('Error fetching contacts', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
});

// Get recent contacts for notifications.
router.get('/contacts/recent', async (req, res) => {
  try {
    console.log('Admin /contacts/recent endpoint called');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`Looking for contacts since: ${oneDayAgo.toISOString()}`);

    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${recentContacts.length} recent contacts`);

    res.json({
      success: true,
      contacts: recentContacts,
      count: recentContacts.length,
      since: oneDayAgo.toISOString()
    });
  } catch (error) {
    logAdminRouteError('Error fetching recent contacts', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent contacts'
    });
  }
});

// Mark contact as viewed
router.patch('/contacts/:id/viewed', async (req, res) => {
  try {
    console.log(`Marking contact ${req.params.id} as viewed`);

    const contact = await Contact.findByPk(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.update({ viewedAt: new Date() });

    console.log(`Contact ${req.params.id} marked as viewed`);

    res.json({
      success: true,
      message: 'Contact marked as viewed'
    });
  } catch (error) {
    logAdminRouteError('Error marking contact as viewed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark contact as viewed'
    });
  }
});

export default router;
