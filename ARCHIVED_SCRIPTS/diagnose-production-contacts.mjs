#!/usr/bin/env node

/**
 * Production Contact System Diagnostic
 * ===================================
 * Debug what's happening with contacts in production
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function diagnoseProductionIssue() {
  console.log('🔍 PRODUCTION CONTACT SYSTEM DIAGNOSTIC');
  console.log('======================================');
  
  try {
    console.log('Step 1: Check associations...');
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    
    console.log('Available models:', Object.keys(models));
    
    if (!models.Contact) {
      console.log('❌ CRITICAL: Contact model still missing from associations!');
      console.log('The deployment may have failed or been overwritten.');
      return;
    }
    console.log('✅ Contact model found in associations');
    
    console.log('Step 2: Check database connection...');
    const { default: sequelize } = await import('./backend/database.mjs');
    
    // Try to connect
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('Step 3: Check if contacts table exists...');
    
    // Check if table exists
    const tableExists = await sequelize.getQueryInterface().showAllTables()
      .then(tables => tables.includes('contacts'));
    
    if (!tableExists) {
      console.log('❌ CRITICAL: contacts table does not exist in database!');
      console.log('Need to create the table...');
      
      // Try to sync the Contact model
      await models.Contact.sync({ force: false });
      console.log('✅ Contact table created');
    } else {
      console.log('✅ Contacts table exists');
    }
    
    console.log('Step 4: Check table structure...');
    
    // Check table structure
    const describe = await sequelize.getQueryInterface().describeTable('contacts');
    console.log('Table columns:', Object.keys(describe));
    
    console.log('Step 5: Test the exact query from admin routes...');
    
    // Test the exact query that the admin route uses
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    try {
      const recentContacts = await models.Contact.findAll({
        where: {
          createdAt: {
            [sequelize.Op.gte]: oneDayAgo
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`✅ Admin query works: Found ${recentContacts.length} recent contacts`);
      
      // Test the other admin query
      const allContacts = await models.Contact.findAll({
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      console.log(`✅ Admin all contacts query works: Found ${allContacts.length} total contacts`);
      
    } catch (queryError) {
      console.log('❌ QUERY ERROR:', queryError.message);
      console.log('Full error:', queryError);
    }
    
    console.log('Step 6: Test creating a contact...');
    
    try {
      const testContact = await models.Contact.create({
        name: 'Diagnostic Test',
        email: 'diagnostic@test.com',
        message: 'Testing contact creation',
        priority: 'normal'
      });
      
      console.log('✅ Contact creation works');
      
      // Clean up
      await testContact.destroy();
      console.log('✅ Test contact cleaned up');
      
    } catch (createError) {
      console.log('❌ CREATE ERROR:', createError.message);
      console.log('Full error:', createError);
    }
    
    console.log('');
    console.log('🎉 DIAGNOSTIC COMPLETE');
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error.message);
    console.error('Full error:', error);
    console.error('Stack:', error.stack);
    
    console.log('');
    console.log('🔧 LIKELY ISSUES:');
    
    if (error.message.includes('database')) {
      console.log('• Database connection issue in production');
      console.log('• Check DATABASE_URL environment variable in Render');
    } else if (error.message.includes('table')) {
      console.log('• Contacts table missing in production database');
      console.log('• May need to run database migration');
    } else if (error.message.includes('Contact')) {
      console.log('• Contact model still not properly integrated');
      console.log('• Check if deployment actually updated the code');
    } else {
      console.log('• Unknown issue - check full error above');
    }
  }
  
  process.exit(0);
}

diagnoseProductionIssue();
