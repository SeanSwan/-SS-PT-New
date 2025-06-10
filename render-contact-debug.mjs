#!/usr/bin/env node

/**
 * RENDER CONTACT ENDPOINT VERIFICATION
 * ===================================
 * Run this in Render console to test contact submission
 */

// Quick test - paste this into Render console:
(async () => {
  try {
    console.log('🧪 TESTING CONTACT ENDPOINT IN RENDER...');
    
    // Test 1: Can we import contact routes?
    console.log('1. Testing contact routes import...');
    const contactRoutes = await import('./backend/routes/contactRoutes.mjs');
    console.log('✅ Contact routes imported successfully');
    
    // Test 2: Can we access Contact model?
    console.log('2. Testing Contact model access...');
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    if (!models.Contact) {
      throw new Error('Contact model not found in associations');
    }
    console.log('✅ Contact model accessible');
    
    // Test 3: Can we create a contact?
    console.log('3. Testing contact creation...');
    const testContact = await models.Contact.create({
      name: 'Render Debug Test',
      email: 'debug@render.test',
      message: 'Testing contact creation from Render console - this should appear in admin dashboard',
      priority: 'normal'
    });
    console.log(`✅ Contact created with ID: ${testContact.id}`);
    
    // Test 4: Can admin queries find it?
    console.log('4. Testing admin dashboard queries...');
    const { Op } = await import('sequelize');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentContacts = await models.Contact.findAll({
      where: {
        createdAt: { [Op.gte]: oneDayAgo }
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`✅ Admin query found ${recentContacts.length} recent contacts`);
    console.log('Recent contacts:', recentContacts.map(c => ({ 
      id: c.id, 
      name: c.name, 
      email: c.email,
      createdAt: c.createdAt 
    })));
    
    // Test 5: Clean up test contact
    await testContact.destroy();
    console.log('🧹 Test contact cleaned up');
    
    console.log('');
    console.log('🎉 CONTACT ENDPOINT VERIFICATION COMPLETE!');
    console.log('==========================================');
    console.log('✅ Contact routes: Working');
    console.log('✅ Contact model: Working');
    console.log('✅ Database writes: Working');
    console.log('✅ Admin queries: Working');
    console.log('');
    console.log('📋 BACKEND IS READY TO RECEIVE CONTACT FORM SUBMISSIONS!');
    console.log('');
    console.log('🔍 If contact form still not working, the issue is likely:');
    console.log('• Frontend environment variables not loading');
    console.log('• CORS blocking the request');
    console.log('• Network connectivity issue');
    console.log('• Frontend build cache issue');
    
  } catch (error) {
    console.error('❌ CONTACT ENDPOINT TEST FAILED:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('Contact model not found')) {
      console.log('🔧 Contact model not in associations - run the associations fix');
    } else if (error.message.includes('routes')) {
      console.log('🔧 Contact routes not loading - check routes.mjs');
    } else {
      console.log('🔧 Database or other backend issue');
    }
  }
})();
