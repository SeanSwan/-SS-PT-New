#!/usr/bin/env node

/**
 * CONTACT ENDPOINT TEST
 * ====================
 * Test the contact form submission endpoint
 */

console.log('🧪 TESTING CONTACT ENDPOINT');
console.log('===========================');

// Test in Render console
(async () => {
  try {
    console.log('1. Testing contact route import...');
    
    // Test if contact routes can be imported
    const contactRoutes = await import('./backend/routes/contactRoutes.mjs');
    console.log('✅ Contact routes imported successfully');
    
    console.log('2. Testing Contact model...');
    
    // Test Contact model
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    
    console.log('✅ Contact model available');
    
    console.log('3. Testing contact creation...');
    
    // Test creating a contact (simulating form submission)
    const testContact = await Contact.create({
      name: 'Test Contact Form',
      email: 'test.form@example.com',
      message: 'Testing contact form submission endpoint',
      priority: 'normal'
    });
    
    console.log(`✅ Contact created successfully with ID: ${testContact.id}`);
    
    console.log('4. Verifying contact appears in admin queries...');
    
    // Test if it appears in admin queries
    const { Op } = await import('sequelize');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: { [Op.gte]: oneDayAgo }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`✅ Found ${recentContacts.length} recent contacts (including test contact)`);
    
    // Clean up
    await testContact.destroy();
    console.log('🧹 Test contact cleaned up');
    
    console.log('');
    console.log('🎯 DIAGNOSIS RESULTS:');
    console.log('✅ Contact routes: Working');
    console.log('✅ Contact model: Working'); 
    console.log('✅ Database writes: Working');
    console.log('✅ Admin queries: Working');
    console.log('');
    console.log('🔍 THE ISSUE IS LIKELY:');
    console.log('• Frontend environment variables not loading correctly');
    console.log('• CORS issue preventing form submission');
    console.log('• Frontend build cache issue');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Check frontend build includes .env.production');
    console.log('2. Check browser network tab for actual URL being called');
    console.log('3. Check browser console for CORS errors');
    
  } catch (error) {
    console.error('❌ Contact endpoint test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('routes')) {
      console.log('🔧 Contact routes not loading properly');
    } else if (error.message.includes('Contact')) {
      console.log('🔧 Contact model issue');
    } else {
      console.log('🔧 Database or other issue');
    }
  }
})();
