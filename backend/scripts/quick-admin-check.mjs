/**
 * Simple Admin Role Check
 * =======================
 * Quick script to verify the admin user's role in the database
 */

import User from '../models/User.mjs';
import sequelize from '../database.mjs';

async function quickAdminCheck() {
  try {
    console.log('🔍 Checking admin user...');
    
    const admin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: "${admin.role}" (type: ${typeof admin.role})`);
    console.log(`   Is Admin: ${admin.role === 'admin'}`);
    console.log(`   Raw role value: ${JSON.stringify(admin.role)}`);
    
    // Test password
    const passwordValid = await admin.checkPassword('admin123');
    console.log(`   Password valid: ${passwordValid}`);
    
    // Check raw dataValues
    console.log('\n📊 Raw dataValues:');
    console.log(`   Role in dataValues: "${admin.dataValues.role}"`);
    console.log(`   Role comparison: ${admin.dataValues.role === 'admin'}`);
    
    return admin;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await sequelize.close();
  }
}

// Run the check
quickAdminCheck();
