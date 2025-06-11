#!/usr/bin/env node

/**
 * Contact Table Diagnostic Tool
 * ============================
 * Checks if the contacts table exists and its structure
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkContactsTable() {
  try {
    console.log('🔍 Checking contacts table structure...');
    
    // Import database and models
    const { default: sequelize } = await import('./backend/database.mjs');
    const Contact = await import('./backend/models/contact.mjs').then(m => m.default);
    
    console.log('✅ Database connection established');
    console.log('✅ Contact model imported');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    
    // Check if contacts table exists
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contacts' 
      ORDER BY ordinal_position;
    `);
    
    if (results.length === 0) {
      console.log('❌ Contacts table does not exist!');
      console.log('📝 Need to create/sync the table');
      
      // Try to sync the model
      console.log('🔧 Attempting to sync Contact model...');
      await Contact.sync({ force: false });
      console.log('✅ Contact model synced successfully');
      
      // Check again
      const [newResults] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        ORDER BY ordinal_position;
      `);
      
      if (newResults.length > 0) {
        console.log('✅ Contacts table created successfully!');
        console.log('📋 Table structure:');
        newResults.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      } else {
        console.log('❌ Failed to create contacts table');
      }
    } else {
      console.log('✅ Contacts table exists!');
      console.log('📋 Current table structure:');
      results.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Test inserting a sample contact
    console.log('🧪 Testing contact creation...');
    const testContact = await Contact.create({
      name: 'Test Contact',
      email: 'test@example.com',
      message: 'This is a test contact message',
      priority: 'normal'
    });
    
    console.log('✅ Test contact created:', testContact.id);
    
    // Test fetching contacts
    console.log('🧪 Testing contact fetching...');
    const contacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`✅ Found ${contacts.length} contacts in database`);
    
    // Clean up test contact
    await testContact.destroy();
    console.log('🧹 Test contact cleaned up');
    
    console.log('🎉 All contact table checks passed!');
    
  } catch (error) {
    console.error('❌ Error checking contacts table:', error);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

checkContactsTable();
