#!/usr/bin/env node

/**
 * CONTACT FIX VERIFICATION
 * Tests both contact routes to ensure they're working
 */

console.log('🧪 TESTING CONTACT SYSTEM AFTER FIX...\n');

async function testContactSystem() {
  try {
    // Test 1: Direct Contact import (both routes now use this)
    console.log('📝 TEST 1: Contact model import test');
    const Contact = await import('./backend/models/contact.mjs').then(m => m.default);
    console.log('✅ Contact model imported successfully');
    console.log('📊 Model name:', Contact.name);
    console.log('📊 Table name:', Contact.tableName);
    
    // Test 2: Op import test
    console.log('\n📝 TEST 2: Sequelize Op import test');
    const { Op } = await import('sequelize');
    console.log('✅ Sequelize Op imported successfully');
    console.log('📊 Op.gte available:', typeof Op.gte);
    
    // Test 3: Simulate admin route query
    console.log('\n📝 TEST 3: Admin route query simulation');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('✅ Admin route query successful!');
    console.log(`📊 Found ${recentContacts.length} recent contacts`);
    
    // Test 4: Basic contact query
    console.log('\n📝 TEST 4: Basic contact operations');
    const allContacts = await Contact.findAll({ limit: 3 });
    console.log(`📊 Total contacts found: ${allContacts.length}`);
    
    if (allContacts.length > 0) {
      console.log('📊 Sample contact:', {
        id: allContacts[0].id,
        name: allContacts[0].name,
        email: allContacts[0].email,
        createdAt: allContacts[0].createdAt
      });
    }
    
    console.log('\n🎉 ALL TESTS PASSED! Contact system should now work correctly.');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy the fixed adminRoutes.mjs');
    console.log('2. Test admin dashboard at /admin');
    console.log('3. Submit a contact form to verify end-to-end flow');
    
  } catch (error) {
    console.error('❌ Contact system test failed:', error.message);
    console.error('📊 Error type:', error.constructor.name);
    console.error('📊 Stack:', error.stack);
  }
}

testContactSystem();
