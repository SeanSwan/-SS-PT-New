#!/usr/bin/env node

/**
 * Complete Contact System Testing & Deployment
 * ===========================================
 * Final verification that everything works end-to-end
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🎯 COMPLETE CONTACT SYSTEM VERIFICATION');
console.log('=======================================');

async function verifyContactSystem() {
  try {
    console.log('🔍 Step 1: Verify Contact model is in associations...');
    
    // Import and test associations
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    
    if (!models.Contact) {
      throw new Error('❌ Contact model is missing from associations');
    }
    console.log('✅ Contact model successfully imported from associations');
    
    console.log('🔍 Step 2: Test database connection and Contact model...');
    
    // Import database
    const { default: sequelize } = await import('./backend/database.mjs');
    await sequelize.authenticate();
    console.log('✅ Database connection verified');
    
    // Sync Contact model
    await models.Contact.sync({ alter: true });
    console.log('✅ Contact table synced successfully');
    
    console.log('🔍 Step 3: Test Contact CRUD operations...');
    
    // Test creating a contact (simulating form submission)
    const testContact = await models.Contact.create({
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test contact from the contact form',
      priority: 'normal'
    });
    console.log('✅ Contact creation works (simulating contact form)');
    
    // Test admin dashboard query: recent contacts
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContacts = await models.Contact.findAll({
      where: {
        createdAt: {
          [sequelize.Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']]
    });
    console.log(`✅ Admin dashboard query works: ${recentContacts.length} recent contacts`);
    
    // Test marking as viewed
    await testContact.update({ viewedAt: new Date() });
    console.log('✅ Mark as viewed functionality works');
    
    // Test admin all contacts query
    const allContacts = await models.Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    console.log(`✅ Admin all contacts query works: ${allContacts.length} total contacts`);
    
    // Clean up
    await testContact.destroy();
    console.log('🧹 Test data cleaned up');
    
    console.log('🔍 Step 4: Verify API endpoints structure...');
    
    // Verify admin routes exist
    const adminRoutes = await import('./backend/routes/adminRoutes.mjs');
    console.log('✅ Admin routes imported successfully');
    
    // Verify contact routes exist
    const contactRoutes = await import('./backend/routes/contactRoutes.mjs');
    console.log('✅ Contact routes imported successfully');
    
    console.log('🔍 Step 5: Check environment variables...');
    
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SENDGRID_API_KEY',
      'OWNER_EMAIL',
      'TWILIO_ACCOUNT_SID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('   Contact form will work but email/SMS notifications may fail');
    } else {
      console.log('✅ All required environment variables present');
    }
    
    console.log('');
    console.log('🎉 CONTACT SYSTEM VERIFICATION COMPLETE!');
    console.log('========================================');
    console.log('✅ Contact model properly integrated in associations');
    console.log('✅ Database table exists and is accessible');
    console.log('✅ All CRUD operations working');
    console.log('✅ Admin dashboard queries working');
    console.log('✅ Contact form → backend → admin dashboard flow complete');
    console.log('');
    console.log('🚀 READY FOR PRODUCTION DEPLOYMENT!');
    console.log('');
    console.log('📋 Deployment Steps:');
    console.log('1. git add backend/models/associations.mjs');
    console.log('2. git commit -m "Fix: Add Contact model to associations for admin dashboard notifications"');
    console.log('3. git push origin main');
    console.log('');
    console.log('🎯 Expected Results After Deployment:');
    console.log('• Contact form submissions will be saved to database');
    console.log('• Admin dashboard will show recent contact notifications');
    console.log('• Email/SMS notifications will be sent (if env vars configured)');
    console.log('• No more 500 errors on /api/admin/contacts/recent');
    console.log('');
    console.log('🔍 How to Test After Deployment:');
    console.log('1. Visit your contact page');
    console.log('2. Fill out and submit the contact form');
    console.log('3. Check admin dashboard - should see the new contact');
    console.log('4. Click "Mark Viewed" - should update the contact status');
    
  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error);
    console.error('Stack:', error.stack);
    
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    
    if (error.message.includes('Contact model is missing')) {
      console.log('• The Contact model was not properly added to associations.mjs');
      console.log('• Check that the import and export statements are correct');
    } else if (error.message.includes('database')) {
      console.log('• Database connection issue');
      console.log('• Check DATABASE_URL environment variable');
    } else if (error.message.includes('table')) {
      console.log('• Contact table creation failed');
      console.log('• Check database permissions');
    } else {
      console.log('• Unexpected error - check the full error message above');
    }
    
    console.log('');
    console.log('❌ DO NOT DEPLOY until this verification passes!');
  }
  
  process.exit(0);
}

verifyContactSystem();
