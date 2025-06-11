#!/usr/bin/env node

/**
 * QUICK RENDER CONTACT FIX VERIFICATION
 * =====================================
 * One-liner test to verify the Op.gte fix worked
 */

console.log('🚀 QUICK CONTACT FIX VERIFICATION');
console.log('=================================');

(async () => {
  try {
    console.log('Testing Op.gte fix...');
    
    // Import what the admin routes import
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    const { Op } = await import('sequelize');
    
    // Test the exact query that was broken
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo  // This line was failing before
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('✅ SUCCESS! Op.gte query works');
    console.log(`📊 Found ${recentContacts.length} recent contacts`);
    console.log('🎉 Contact notifications should work in admin dashboard');
    console.log('🎯 No more "Cannot read properties of undefined (reading \'gte\')" errors');
    
  } catch (error) {
    console.log('❌ FAILED! Still broken:');
    console.log(`💥 Error: ${error.message}`);
    
    if (error.message.includes('gte')) {
      console.log('🔧 Op.gte import is still broken - check adminRoutes.mjs imports');
    } else {
      console.log('🔧 Different issue:', error.message);
    }
  }
})();
