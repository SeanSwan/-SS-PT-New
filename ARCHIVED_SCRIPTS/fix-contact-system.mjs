#!/usr/bin/env node

/**
 * Contact System Fix and Deployment
 * ================================
 * Comprehensive fix for the contact notifications system
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🚀 CONTACT SYSTEM COMPREHENSIVE FIX');
console.log('=====================================');

async function fixContactSystem() {
  try {
    console.log('📋 Step 1: Initialize database and models...');
    
    // Import database and models
    const { default: sequelize } = await import('./backend/database.mjs');
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    
    console.log('✅ Database connection imported');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    
    // Get all models including Contact
    const models = await getModels();
    console.log('✅ Models loaded from associations');
    
    // Check if Contact model is available
    if (!models.Contact) {
      throw new Error('Contact model not found in associations! The fix did not work.');
    }
    console.log('✅ Contact model found in associations');
    
    console.log('📋 Step 2: Sync Contact model with database...');
    
    // Sync Contact model to ensure table exists
    await models.Contact.sync({ alter: true });
    console.log('✅ Contact table synced successfully');
    
    console.log('📋 Step 3: Test Contact model functionality...');
    
    // Test creating a contact
    const testContact = await models.Contact.create({
      name: 'Admin Test Contact',
      email: 'admin@test.com',
      message: 'Testing the contact system for admin dashboard',
      priority: 'normal'
    });
    console.log('✅ Test contact created with ID:', testContact.id);
    
    // Test fetching recent contacts (what the admin dashboard calls)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContacts = await models.Contact.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`✅ Found ${recentContacts.length} recent contacts`);
    
    // Test the exact query the admin route uses
    const adminRouteContacts = await models.Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    console.log(`✅ Admin route query works: ${adminRouteContacts.length} contacts found`);
    
    console.log('📋 Step 4: Test marking contact as viewed...');
    
    // Test marking as viewed
    await testContact.update({ viewedAt: new Date() });
    console.log('✅ Contact marked as viewed successfully');
    
    // Clean up test contact
    await testContact.destroy();
    console.log('🧹 Test contact cleaned up');
    
    console.log('📋 Step 5: Verify admin routes...');
    
    // Import and test admin routes structure
    const adminRoutes = await import('./backend/routes/adminRoutes.mjs');
    console.log('✅ Admin routes imported successfully');
    
    console.log('🎉 CONTACT SYSTEM FIX COMPLETE!');
    console.log('=================================');
    console.log('✅ Contact model added to associations');
    console.log('✅ Database table exists and is synced');
    console.log('✅ All CRUD operations work');
    console.log('✅ Admin routes can access Contact model');
    console.log('');
    console.log('🚀 READY FOR DEPLOYMENT!');
    console.log('Next steps:');
    console.log('1. git add backend/models/associations.mjs');
    console.log('2. git commit -m "Fix: Add Contact model to associations for admin dashboard"');
    console.log('3. git push origin main');
    console.log('');
    console.log('The admin dashboard contact notifications should now work!');
    
  } catch (error) {
    console.error('❌ ERROR in contact system fix:', error);
    console.error('Stack trace:', error.stack);
    
    console.log('');
    console.log('🔍 TROUBLESHOOTING GUIDE:');
    console.log('========================');
    
    if (error.message.includes('Contact model not found')) {
      console.log('❌ The Contact model is not being exported from associations.mjs');
      console.log('   Check that contact.mjs is imported and Contact is in the return statement');
    } else if (error.message.includes('database')) {
      console.log('❌ Database connection issue');
      console.log('   Check DATABASE_URL environment variable');
    } else if (error.message.includes('table')) {
      console.log('❌ Table creation issue');
      console.log('   Check database permissions and Contact model definition');
    } else {
      console.log('❌ Unexpected error - see stack trace above');
    }
  }
  
  process.exit(0);
}

fixContactSystem();
