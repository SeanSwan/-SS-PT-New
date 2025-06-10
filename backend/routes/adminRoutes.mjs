// backend/routes/adminRoutes.mjs
import express from 'express';
import sequelize from '../database.mjs';
import { Op } from 'sequelize';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';
import Contact from '../models/contact.mjs'; // FIXED: Use direct import like contactRoutes.mjs

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
    console.log('🔍 Admin /contacts endpoint called');
    
    const contacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    console.log(`📊 Found ${contacts.length} contacts`);
    
    res.json({
      success: true,
      contacts: contacts
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
});

// DIAGNOSTIC ROUTE - TEMPORARY FOR DEBUGGING
router.get('/contacts/debug', async (req, res) => {
  try {
    console.log('🔍 DIAGNOSTIC: Starting contacts debug...');
    
    // Test Contact model availability
    if (!Contact) {
      return res.status(500).json({
        error: 'Contact model not available',
        step: 'model_check'
      });
    }
    
    console.log('✅ Contact model available');
    
    // Test basic query
    try {
      const testContact = await Contact.findOne({ order: [['createdAt', 'DESC']] });
      console.log('✅ Contact query successful');
      
      const allContacts = await Contact.findAll({ limit: 5 });
      console.log(`📊 Found ${allContacts.length} total contacts`);
      
      return res.json({
        success: true,
        message: 'Contact system fully operational',
        contactCount: allContacts.length,
        latestContact: testContact ? {
          id: testContact.id,
          name: testContact.name,
          createdAt: testContact.createdAt
        } : null
      });
    } catch (queryError) {
      console.error('❌ Contact query failed:', queryError);
      return res.status(500).json({
        error: 'Contact query failed',
        message: queryError.message,
        step: 'query_test'
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message
    });
  }
});

// Get recent contacts (for notifications) - FIXED VERSION
router.get('/contacts/recent', async (req, res) => {
  try {
    console.log('🔍 Admin /contacts/recent endpoint called');
    
    // Get contacts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log(`📅 Looking for contacts since: ${oneDayAgo.toISOString()}`);
    
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo // FIXED: Now using properly imported Op
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Found ${recentContacts.length} recent contacts`);
    
    res.json({
      success: true,
      contacts: recentContacts,
      count: recentContacts.length,
      since: oneDayAgo.toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching recent contacts:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch recent contacts',
      error: error.message,
      errorType: error.name
    });
  }
});

// Mark contact as viewed
router.patch('/contacts/:id/viewed', async (req, res) => {
  try {
    console.log(`🔍 Marking contact ${req.params.id} as viewed`);
    
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }
    
    await contact.update({ viewedAt: new Date() });
    
    console.log(`✅ Contact ${req.params.id} marked as viewed`);
    
    res.json({
      success: true,
      message: 'Contact marked as viewed'
    });
  } catch (error) {
    console.error('❌ Error marking contact as viewed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark contact as viewed',
      error: error.message
    });
  }
});

export default router;
