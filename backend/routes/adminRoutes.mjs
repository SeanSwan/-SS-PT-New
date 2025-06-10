// backend/routes/adminRoutes.mjs
import express from 'express';
import sequelize from '../database.mjs';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// User management endpoints that actually exist
router.get('/users', userManagementController.getAllUsers);
router.put('/users/:id', userManagementController.updateUser);
router.post('/promote-client', userManagementController.promoteToClient);
router.post('/promote-admin', userManagementController.promoteToAdmin);

// Contact management endpoints
router.get('/contacts', async (req, res) => {
  try {
    const getModels = await import('../models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    
    const contacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    res.json({
      success: true,
      contacts: contacts
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts' 
    });
  }
});

// DIAGNOSTIC ROUTE - TEMPORARY
router.get('/contacts/debug', async (req, res) => {
  try {
    console.log('🔍 DIAGNOSTIC: Starting contacts debug...');
    
    // Check if we can import models
    let models;
    try {
      const getModels = await import('../models/associations.mjs').then(m => m.default);
      models = await getModels();
      console.log('✅ Models imported successfully');
    } catch (importError) {
      return res.status(500).json({
        error: 'Model import failed',
        message: importError.message,
        step: 'import'
      });
    }
    
    // Check if Contact model exists
    if (!models.Contact) {
      return res.status(500).json({
        error: 'Contact model missing',
        availableModels: Object.keys(models),
        step: 'contact_check'
      });
    }
    
    // Test Contact query
    try {
      const contacts = await models.Contact.findAll({ limit: 1 });
      return res.json({
        success: true,
        message: 'Contact system working',
        contactCount: contacts.length,
        availableModels: Object.keys(models)
      });
    } catch (queryError) {
      return res.status(500).json({
        error: 'Contact query failed',
        message: queryError.message,
        step: 'query'
      });
    }
    
  } catch (error) {
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message
    });
  }
});

// Get recent contacts (for notifications)
router.get('/contacts/recent', async (req, res) => {
  try {
    const getModels = await import('../models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    
    // Get contacts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      contacts: recentContacts,
      count: recentContacts.length
    });
  } catch (error) {
    console.error('Error fetching recent contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch recent contacts' 
    });
  }
});

// Mark contact as viewed
router.patch('/contacts/:id/viewed', async (req, res) => {
  try {
    const getModels = await import('../models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }
    
    await contact.update({ viewedAt: new Date() });
    
    res.json({
      success: true,
      message: 'Contact marked as viewed'
    });
  } catch (error) {
    console.error('Error marking contact as viewed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark contact as viewed' 
    });
  }
});

// TODO: Add these endpoints if needed:
// router.get('/users/:id', userManagementController.getUserById);
// router.delete('/users/:id', userManagementController.deleteUser);
// router.post('/users/:id/reset-password', userManagementController.resetUserPassword);

export default router;
